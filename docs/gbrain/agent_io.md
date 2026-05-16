# Agent I/O contracts (mapped to existing gmoney skills)

How each existing skill's output maps to a GBrain page. Read alongside `schemas/`. The skill bodies under `skills/` are unchanged — this doc describes what wraps them.

Inputs to every skill come from the orchestrator (`gmoney:basket-builder`). The canonical thesis sentence is passed verbatim to each.

---

## gmoney:basket-builder (orchestrator)

**What it does**: drives Phase 0 → Phase 4, persists each phase's artifact to GBrain (after `wiring.md` is applied), runs the citation gate before showing the basket.

**Reads from GBrain**:
- `theses/<slug>` (only if re-running an existing thesis)

**Writes to GBrain**:
- `theses/<slug>` — initial write in Phase 0, optional rewrite of compiled truth in Phase 4, timeline append on every run.

**Side responsibilities**:
- Holds the `slug` and `run_id` for the run.
- Surfaces citation-gate failures to the user.

---

## gmoney:analyst

**Skill output**: markdown report with 5 sections (thesis interpretation, candidate universe, catalysts, disclosure risks, notable absences). No frontmatter.

**Persisted as**: `research/<slug>/<run_id>/analyst` using `schemas/research_report.template.md`.

**Frontmatter the orchestrator adds**:
```yaml
type: research_report
thesis_slug: <slug>
run_id: <YYYY-MM-DDTHHMMSSZ>
agent: analyst
created: <iso8601>
tickers_mentioned: [<auto-extracted from "Candidate universe" section>]
```

**Auto-graph effects**:
- Each cashtag mentioned creates/links `companies/<ticker>` with a typed `cited_in` edge from the research page.

**No changes to the skill body.** The skill produces the same markdown it does today.

---

## gmoney:quant

**Skill output**: markdown report with 5 sections (factor mapping, screen results, technicals, quantitative risks, backtest sketch).

**Persisted as**: `research/<slug>/<run_id>/quant`.

**Frontmatter the orchestrator adds**:
```yaml
type: research_report
thesis_slug: <slug>
run_id: <run_id>
agent: quant
created: <iso8601>
tickers_mentioned: [<from screen results>]
factors: [<from factor mapping section, lightly parsed>]
```

---

## gmoney:macro

**Skill output**: markdown report with 5 sections (regime mapping, confirming indicators, sector/geo rotation, currency/rates, what breaks the thesis).

**Persisted as**: `research/<slug>/<run_id>/macro`.

**Frontmatter the orchestrator adds**:
```yaml
type: research_report
thesis_slug: <slug>
run_id: <run_id>
agent: macro
created: <iso8601>
regime_tags: [<one or two from: rising-rates, falling-rates, risk-on, risk-off, growth-acceleration, growth-deceleration>]
sector_etfs_mentioned: [<XLK, XLE, etc. — auto-extracted>]
```

The `regime_tags` field is what the PM should consult when sizing cash weight.

---

## gmoney:pm

**Skill output**: a single fenced JSON code block matching the schema in its own SKILL.md (`positions`, each with `ticker / name / weight / rationale`, plus `narrative`).

**Persisted as**: `baskets/<slug>/<run_id>` using `schemas/basket.template.md`.

The persisted page contains:
1. Frontmatter (type, thesis_slug, run_id, narrative_excerpt, basket_count, tickers, total_weight).
2. The full PM JSON inside a code fence (unchanged from skill output).
3. A rendered markdown table for human readability.
4. A timeline entry pointing back to the run.

**Citation requirement** (enforced by the gate, not the skill): every ticker in `positions` must appear in at least one of `research/<slug>/<run_id>/{analyst,quant,macro}`. The skill's own prompt already says "Don't include names not supported by at least one analyst report" — the gate is what makes that real.

**Hard rules already encoded in the skill**:
- 5–10 positions.
- Weights sum to exactly 100.
- No single position over 30% absent exceptional conviction noted in rationale.

---

## gmoney:risk

**Skill output**: markdown report with 6 sections, ending in a Strong / Questionable / Weak verdict with 2–3 sentence justification.

**Persisted as**: `critiques/<slug>/<run_id>` using `schemas/critique.template.md`.

**Frontmatter the orchestrator adds**:
```yaml
type: critique
thesis_slug: <slug>
run_id: <run_id>
verdict: Strong | Questionable | Weak
basket_ref: baskets/<slug>/<run_id>
created: <iso8601>
```

`verdict` is parsed from the final paragraph of the risk report by regex (`\b(Strong|Questionable|Weak)\b`). If the regex finds none, default to `Questionable` and surface the parse failure to the user.

---

## Auto-created entity pages

GBrain's auto-link extractor runs on every `gbrain.put`. After a single run you'll have:

- `companies/<TICKER>` — created the first time a cashtag appears in any research report. Each subsequent mention adds a typed link.
- `themes/<slug>` — *not* auto-created, but you can manually `gbrain put themes/ai-margin-compression` once and link theses to themes by hand. Useful for "what theses share the AI theme?"

You do not need to write these pages. They appear as the brain accumulates.

---

## What is NOT persisted

- Intermediate orchestrator chatter (todo updates, "loading next skill" messages).
- The PM's raw JSON if it failed parsing and was repaired — only the repaired version goes to the brain.
- Anything from a run where the citation gate failed and the user chose option (a) or (b) — only the final, gated-and-shown basket is persisted. Option (c) "override and show anyway" persists with `frontmatter.gate_overridden: true`.
