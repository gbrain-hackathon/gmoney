---
name: basket-builder
title: gmoney — Investment Basket Builder (Orchestrator)
description: "Drive the full thesis → basket pipeline: analyst + quant + macro research, PM synthesis, risk red-team."
version: 0.1.0
author: gmoney
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [Finance, Pipeline, Orchestrator, Basket, Thesis, Investment]
    category: gmoney
    related_skills: [analyst, quant, macro, pm, risk]
    requires_toolsets: [skills, web, todo, gbrain, filesystem]
---

# gmoney — Investment Basket Builder

Use this skill when a user submits an **investment thesis** and wants a tradeable long-only basket, a red-team critique, and a final confidence-scored recommendation. It orchestrates five sub-skills end-to-end:

1. `gmoney:analyst` — name companies and catalysts tied to the thesis
2. `gmoney:quant` — factor mapping and screened candidates
3. `gmoney:macro` — regime fit and sector/FX/rate expression
4. `gmoney:pm` — synthesize the three reports into a JSON basket
5. `gmoney:risk` — red-team the basket

A `gmoney:hedger` phase exists but is currently disabled — see Phase 3.

## When to invoke

The user has given (or is about to give) a specific investment thesis — a worldview they think is underpriced, with some timeline. Examples:
- "Power grid investment will accelerate over the next 5 years driven by data center demand."
- "Japanese small caps are mispriced as governance reform compounds."
- "Long-duration Treasuries will outperform once rate cuts begin."

If the user message is **not** a concrete thesis (e.g., "what stocks should I buy?", "thoughts on the market?"), ask one clarifying question to surface their thesis before invoking this skill.

## How to run the pipeline

Track progress with the `todo` toolset so the user can see where you are. The phases below run in order; the three research sub-skills inside Phase 1 run **in parallel**, and Phase 3 (hedging) is currently **disabled**. Do not skip ahead past any required phase.

Persistence: at every phase you write the artifact to GBrain via the `gbrain` toolset. Schemas live at `docs/gbrain/schemas/`. The wiring rationale is in `docs/gbrain/wiring.md` and `docs/gbrain/agent_io.md`. Read those if you are uncertain about field names or page layout.

### Run setup — slug and run id

Before Phase 0, derive a stable slug from the thesis (kebab-case, ≤6 words, lowercase, hyphens for spaces) and a run id of the form `YYYY-MM-DDTHHMMSSZ` (UTC). Hold both in working state — every persisted page uses them.

Check if a prior thesis page exists:

```
gbrain.get(slug=f"theses/{slug}")
```

If it exists, this is a re-run. Read the prior compiled truth and tell the user verbatim: "I have a prior version of this thesis in the brain from `<created date>`. The compiled truth says: `<one-line summary>`. Should I update it in place, or start a new thesis with a different slug?" Wait for explicit user response. If they say "new thesis", change the slug (append `-v2` or similar) and proceed as if no prior exists.

### Phase 0 — Capture the thesis and framing
Restate the thesis back to the user in one sentence and confirm. Persist the canonical thesis string; every sub-skill receives it verbatim.

Then ask the user to confirm **one framing question** before running research:

> "Is this a **sector trade** (you believe the sector broadly wins, and the index is a fine vehicle) or a **company-specific trade** (you believe specific names have disproportionate upside vs. the sector because they haven't yet realized what the thesis predicts, while peers already have)?"

If company-specific: ask which companies, if any, the user already has in mind as candidate laggards. Add these as `tickers_of_interest` in the thesis page.

This answer shapes how every sub-skill frames its output: the analyst will look for peer benchmarks and disproportionate candidates; the quant will compute per-name price targets vs. the index; the PM will justify the basket vs. IGV; and the risk officer will check whether the upside is truly company-specific or just sector-beta.

If the user explicitly says "sector trade," the pipeline still runs fully — but the PM should lean toward recommending the index ETF as the primary vehicle unless the analyst and quant find compelling single-name concentration.

Then persist the thesis to GBrain. Render the page using the template at `docs/gbrain/schemas/thesis.template.md`. Fill in `slug`, `horizon`, `sectors`, `tickers_of_interest`, `disconfirming_signals`. Set `status: active`, `last_pm_run: null`, `last_risk_run: null`. Write the canonical thesis sentence into the `title` field and the "Compiled truth" body section.

```
gbrain.put(slug=f"theses/{slug}", content=<rendered thesis page>)
```

If you read a prior thesis page in Run setup and the user said "update in place", **do NOT overwrite the timeline section** — keep all prior dated entries. Append exactly one new timeline entry: `- <YYYY-MM-DD>: run <run_id> started`.

### Phase 1 — Research (analyst, quant, macro) — run in parallel

The three research sub-skills are independent and **must run concurrently**, not one after another. They hand off via the filesystem — large inline returns were truncating under parallel dispatch, so each worker writes its report to a known path and returns only that path.

1. Ensure the run's research directory exists: `~/.hermes/state/gmoney/<slug>/<run_id>/`. The three output paths are `<that dir>/analyst.md`, `<that dir>/quant.md`, and `<that dir>/macro.md`.
2. Dispatch `gmoney:analyst`, `gmoney:quant`, and `gmoney:macro` as three parallel worker invocations in a single tool-call batch — do not await one before starting the next. Each worker loads its skill via `skill_view`, receives the canonical thesis verbatim AND its assigned `output_path`, writes the full report to that path, and replies with just the path.
3. After all three workers return their paths, read each file via the `filesystem` toolset to recover the report bodies.
4. Emit the three report bodies together in a single message under labeled headings (`### ANALYST report`, `### QUANT report`, `### MACRO report`) so the user sees the research block at once.

If a sub-skill cannot answer a section confidently from training data, it should say so in that section rather than fabricating — the PM and risk steps depend on honest signal. If a worker returns something that isn't a path to an existing readable file, treat that worker as failed and re-dispatch it once before falling back to a partial research block.

After emitting the three reports to the user, persist each as a separate GBrain page using the template at `docs/gbrain/schemas/research_report.template.md`. For each agent in `[analyst, quant, macro]`, prepend frontmatter (`type: research_report`, `thesis_slug`, `run_id`, `agent`, `created`, `tickers_mentioned` extracted from the report body, `sources_count` = number of URLs cited in the report) to the unmodified skill output, then:

```
gbrain.put(slug=f"research/{slug}/{run_id}/{agent}", content=<frontmatter + report body>)
```

GBrain's auto-link extractor will create or update `companies/<TICKER>` pages from every cashtag in the reports on each put — you do not handle that.

### Phase 2 — Synthesis (portfolio manager)
Load `gmoney:pm` via `skill_view`. Pass it:
- The canonical thesis
- All three analyst reports concatenated, each prefixed with `### <AGENT> report`

The `gmoney:pm` skill returns a single fenced JSON code block (positions + narrative). Parse it. If parsing fails or weights don't sum to 100, ask the PM to repair its own output once before falling back to a plain-text basket.

Persist the basket and run the citation gate **before showing the basket to the user**. Render the basket page using `docs/gbrain/schemas/basket.template.md` — frontmatter (`type: basket`, `thesis_slug`, `run_id`, `created`, `basket_mode` from the PM JSON, `basket_count` = number of positions in the PM JSON, `tickers`, `total_weight`, `cash_weight`, `narrative_excerpt`, `gate_overridden: false`), then a rendered markdown table (Ticker / Name / Weight), then for each of the 3 positions a full rendered memo (all six memo fields as separate subsections), then the PM JSON verbatim inside a fenced ```json block, then the PM narrative as prose.

```
gbrain.put(slug=f"baskets/{slug}/{run_id}", content=<rendered basket page>)
```

Then run the citation gate. For each `position.ticker` in the PM JSON, verify it appears in at least one of the three research reports for this run:

```
for position in basket.positions:
    hits = gbrain.query(query=position.ticker,
                        filters={"type": "research_report", "thesis_slug": slug, "run_id": run_id})
    if not hits:
        record gate_failure(position.ticker)
```

If the gate fails, **do NOT show the basket to the user yet**. Present the failing tickers and ask the user to choose:

- (a) Drop the unsupported tickers and reweight (PM repairs the basket). Re-run the gate.
- (b) Re-run the affected research skill with a hint about the ticker.
- (c) Override and show anyway. Persist the basket page again with `gate_overridden: true` in frontmatter and a banner in the rendered output noting which positions are unsupported.

Default recommendation when asking is (a). After the gate passes (or is overridden), render the basket to the user as follows:
1. A summary table: Ticker | Name | Weight
2. For each of the 3 positions, a full investment memo under a heading `### Idea N — [Ticker] [Name] ([Weight]%)`, with subsections for each memo field: Thesis Fit, Fundamental Case, Quant Signals, Macro Context, Catalysts, Key Risks.
3. The PM narrative under `## Basket narrative`.

Do not truncate or summarize the memo fields — emit them verbatim from the PM JSON.

### Phase 3 — Hedging (prediction-market hedger) — DISABLED

This phase is currently **disabled**. Kalshi / Polymarket access via the `web` toolset isn't reliable enough to produce trustworthy hedge memos, so skip Phase 3 entirely and proceed to Phase 4. Do not load `gmoney:hedger`, do not emit a `## Hedge memo` heading, do not persist a `hedge_memos/<slug>/<run_id>` page in GBrain, and do not mention hedging in the Final Recommendation block.

To re-enable, restore the previous Phase 3 dispatch logic from git history and re-thread the hedge memo input back through Phase 4 (risk) and Phase 6 (final summary).

### Phase 4 — Critique (risk officer)
Load `gmoney:risk` via `skill_view`. Pass it the canonical thesis and the basket (narrative + position list). Phase 3 is disabled, so do not pass a hedge memo — the risk skill reasons about gross unhedged risk. Emit its markdown report verbatim under a `## Risk critique` heading.

Persist the critique to GBrain using `docs/gbrain/schemas/critique.template.md`. Parse the verdict from the final paragraph by regex matching `\b(Strong|Questionable|Weak)\b`; if none matches, default to `Questionable` and surface the parse failure as a note in the final summary. Prepend frontmatter (`type: critique`, `thesis_slug`, `run_id`, `created`, `basket_ref: baskets/<slug>/<run_id>`, `verdict`, `flags_count` if you can count them) to the unmodified skill output, then:

```
gbrain.put(slug=f"critiques/{slug}/{run_id}", content=<frontmatter + critique body>)
```

### Phase 5 — Confidence Score

After the risk critique is in hand, compute a **Confidence Score** out of 100 by scoring five components. Score each component yourself based on the actual outputs from Phases 1–4. The Risk component reflects gross unhedged risk because Phase 3 is disabled; there is no separate hedge component:

| Component | Max pts | How to score |
|---|---|---|
| Analyst research quality | 25 | Sourcing depth, specificity of company exposures, number of verified catalysts. 20–25 = multiple primary sources, specific financials cited; 10–19 = some gaps or estimates; 0–9 = thin, generic, or mostly unverified |
| Quant factor alignment | 20 | How cleanly the top positions fit the factor screen. 16–20 = strong multi-factor fit, reasonable valuations; 8–15 = mixed signals or stretched multiples; 0–7 = factors contradict the thesis or data is thin |
| Macro tailwinds | 20 | How supportive the current regime is. 16–20 = rate path, growth regime, and sector rotation all align; 8–15 = mixed — some headwinds; 0–7 = macro regime is outright hostile to the thesis |
| Basket coherence | 15 | Distinct sub-themes, appropriate concentration, no obvious redundancy. 12–15 = three clearly differentiated ideas; 6–11 = some overlap or construction issues; 0–5 = basket is poorly constructed for the thesis |
| Risk verdict | 20 | Copy directly from the `Risk Score: XX/20` line in the risk report (gross unhedged risk, since Phase 3 is disabled) |

Sum all five components. Then:

- **75–100**: **HIGH CONVICTION — BUY**
- **55–74**: **MODERATE CONVICTION — CAUTIOUS BUY**
- **35–54**: **LOW CONVICTION — WATCH**
- **0–34**: **INSUFFICIENT EVIDENCE — PASS**

### Phase 6 — Final summary

If the new evidence materially shifts the thesis itself (not just sizing), rewrite the **Compiled truth** section of `theses/<slug>` and re-put the page. Always append exactly one timeline entry to that page:

```
- <YYYY-MM-DD>: run <run_id> → basket <N> names, risk verdict <Strong|Questionable|Weak>, confidence <score>/100, links [[baskets/<slug>/<run_id>]] [[critiques/<slug>/<run_id>]]
```

Close with the **Final Recommendation block** — this is the last thing the user sees:

```
## Final Recommendation

**[RATING] — [score]/100**

**Thesis**: [one sentence]
**Basket**: [Ticker1] ([weight]%), [Ticker2] ([weight]%), [Ticker3] ([weight]%)
**Risk verdict**: [Strong | Questionable | Weak]

**Why this score**: [2–3 sentences: what drove the score up, what held it back]
**Key watch item**: [the single most important thing to monitor that could change this rating]
```

Nothing else after this block. Do not add caveats, disclaimers, or additional commentary.

## Style guidelines

- The five active sub-skills do the thinking. Your job is sequencing, hand-off, and presentation — do not paraphrase their output or inject your own analysis.
- Preserve every section heading from each sub-skill report. Users may scan, not read.
- If any phase produces obviously thin output (one sentence per section, generic platitudes), say so in the final summary rather than dressing it up.
- This is a long-only equity portfolio. Never suggest a short position, a pair trade, or an inverse ETF in the equity basket. (Prediction-market overlays via `gmoney:hedger` were previously in scope but Phase 3 is currently disabled.)
- The Final Recommendation block is the one place you give a direct rating. Be crisp and honest — a LOW CONVICTION or PASS is not a failure, it is useful information.
