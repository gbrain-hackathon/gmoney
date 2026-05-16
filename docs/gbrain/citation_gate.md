# Citation gate

A small Python script that verifies every basket position is supported by at least one research report in the brain. Run after the PM emits the basket, before showing it to the user.

## What it checks

For a given `baskets/<slug>/<run_id>` page:

1. Parse the fenced JSON inside the basket page.
2. For each `position.ticker`, run `gbrain query <ticker>` filtered to `type: research_report`, `thesis_slug: <slug>`, `run_id: <run_id>`.
3. If any ticker has zero hits in *any* of the three research reports for that run, fail the gate.
4. Optional stricter mode: require at least one *typed link* from `companies/<TICKER>` to one of the run's research reports.

## Why this is the gate, not "every claim has a footnote"

Your PM's JSON has free-form `rationale` text. Asserting every sentence has a `[ref:...]` token would require changing the PM's output schema, which violates "don't touch your skills." The ticker-level gate captures the most important invariant — "no position appears that no analyst named" — without changing any skill.

If you later upgrade the PM to emit `rationale_refs: ["research/.../analyst", ...]` per position, swap this gate for the stricter per-claim version.

## Script

Save as `docs/gbrain/citation_gate.py`.

```python
#!/usr/bin/env python3
"""Verify every basket position is supported by at least one research report in GBrain.

Usage:
    python docs/gbrain/citation_gate.py baskets/<slug>/<run_id>

Exits 0 on pass, 1 on fail. Prints the failing tickers to stderr.
"""
import json
import re
import subprocess
import sys
from typing import Any


def gbrain_get(slug: str) -> str:
    """Return the markdown body of a brain page, or raise if missing."""
    result = subprocess.run(
        ["gbrain", "get", slug],
        capture_output=True, text=True, check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"gbrain get {slug!r} failed: {result.stderr.strip()}")
    return result.stdout


def parse_basket(page: str) -> dict[str, Any]:
    """Extract the first fenced ```json ... ``` block from the basket page."""
    match = re.search(r"```json\s*\n(.*?)\n```", page, re.DOTALL)
    if not match:
        raise ValueError("no fenced JSON block found in basket page")
    return json.loads(match.group(1))


def parse_frontmatter(page: str) -> dict[str, str]:
    """Lightweight YAML-ish frontmatter parse — sufficient for the keys we read."""
    match = re.match(r"---\n(.*?)\n---\n", page, re.DOTALL)
    if not match:
        return {}
    fm: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            fm[key.strip()] = value.strip()
    return fm


def main(basket_slug: str) -> int:
    page = gbrain_get(basket_slug)
    fm = parse_frontmatter(page)
    basket = parse_basket(page)
    thesis_slug = fm.get("thesis_slug")
    run_id = fm.get("run_id")
    if not (thesis_slug and run_id):
        print("basket page missing thesis_slug or run_id in frontmatter", file=sys.stderr)
        return 1

    research_pages = [
        f"research/{thesis_slug}/{run_id}/analyst",
        f"research/{thesis_slug}/{run_id}/quant",
        f"research/{thesis_slug}/{run_id}/macro",
    ]
    research_blobs = []
    for slug in research_pages:
        try:
            research_blobs.append((slug, gbrain_get(slug)))
        except RuntimeError as e:
            print(f"WARN: {slug} not found ({e})", file=sys.stderr)

    if not research_blobs:
        print("FAIL: no research reports found in brain for this run", file=sys.stderr)
        return 1

    failures = []
    for position in basket.get("positions", []):
        ticker = position.get("ticker", "").upper()
        if not ticker:
            failures.append(("<missing ticker>", "position has no ticker"))
            continue
        pattern = re.compile(rf"\b{re.escape(ticker)}\b")
        found_in = [
            slug for slug, blob in research_blobs if pattern.search(blob)
        ]
        if not found_in:
            failures.append((ticker, "ticker not mentioned in any research report"))

    if failures:
        print("CITATION GATE FAILED:", file=sys.stderr)
        for ticker, reason in failures:
            print(f"  {ticker}: {reason}", file=sys.stderr)
        return 1

    print(f"citation gate passed: {len(basket.get('positions', []))} positions, all supported")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
```

## How to invoke

From the orchestrator after Phase 2 persistence (see `wiring.md` Phase 2 addendum):

```bash
python docs/gbrain/citation_gate.py baskets/$SLUG/$RUN_ID
```

From a skill body, it's cleaner to call `gbrain.query` directly via MCP and skip the script. The script exists for the manual flow in `operational.md`.

## What to do when the gate fails

The orchestrator presents three options to the user:

- **(a) Drop the unsupported ticker and reweight.** Re-render the basket without it and re-run the gate.
- **(b) Re-run the affected research skill with a hint about the ticker.** This is the high-effort fix — useful when the user is sure the ticker belongs but the analyst missed it.
- **(c) Override and show anyway.** The basket is shown with a banner: "1 position is not supported by any research report and was kept at user direction." The basket page is persisted with `gate_overridden: true` in frontmatter so future runs can tell.

Default is (a). Do not silently retry — the failure is exactly the kind of signal the doc's citation-discipline rule is meant to surface.
