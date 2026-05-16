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
