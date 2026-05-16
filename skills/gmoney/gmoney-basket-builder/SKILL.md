---
name: gmoney-basket-builder
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
    related_skills: [gmoney-analyst, gmoney-quant, gmoney-macro, gmoney-pm, gmoney-risk]
    requires_toolsets: [skills, web, todo]
---

# gmoney — Investment Basket Builder

Use this skill when a user submits an **investment thesis** and wants a tradeable basket plus a red-team critique. It orchestrates five sub-skills end-to-end:

1. `gmoney-analyst` — name companies and catalysts tied to the thesis
2. `gmoney-quant` — factor mapping and screened candidates
3. `gmoney-macro` — regime fit and sector/FX/rate expression
4. `gmoney-pm` — synthesize the three reports into a JSON basket
5. `gmoney-risk` — red-team the basket

## When to invoke

The user has given (or is about to give) a specific investment thesis — a worldview they think is underpriced, with some timeline. Examples:
- "Power grid investment will accelerate over the next 5 years driven by data center demand."
- "Japanese small caps are mispriced as governance reform compounds."
- "Long-duration Treasuries will outperform once rate cuts begin."

If the user message is **not** a concrete thesis (e.g., "what stocks should I buy?", "thoughts on the market?"), ask one clarifying question to surface their thesis before invoking this skill.

## How to run the pipeline

Track progress with the `todo` toolset so the user can see where you are. The five phases below are sequential — do not skip ahead.

### Phase 0 — Capture the thesis
Restate the thesis back to the user in one sentence and confirm. Persist the canonical thesis string; every sub-skill receives it verbatim.

### Phase 1 — Research (analyst, quant, macro)
For each of `gmoney-analyst`, `gmoney-quant`, `gmoney-macro`:
1. Load the skill via `skill_view`.
2. Follow its instructions for the canonical thesis.
3. Capture the full markdown output. Label it clearly (e.g., `### ANALYST report`).

You may run these conceptually in parallel, but emit the three reports in a single message so the user sees the research block at once. If you cannot answer a section confidently from training data, say so in that section rather than fabricating — the PM and risk steps depend on honest signal.

### Phase 2 — Synthesis (portfolio manager)
Load `gmoney-pm` via `skill_view`. Pass it:
- The canonical thesis
- All three analyst reports concatenated, each prefixed with `### <AGENT> report`

The `gmoney-pm` skill returns a single fenced JSON code block (positions + narrative). Parse it. If parsing fails or weights don't sum to 100, ask the PM to repair its own output once before falling back to a plain-text basket.

Render the basket to the user as a markdown table (Ticker / Name / Weight / Rationale) followed by the narrative.

### Phase 3 — Critique (risk officer)
Load `gmoney-risk` via `skill_view`. Pass it the canonical thesis plus the basket (narrative + position list). Emit its markdown report verbatim under a `## Risk critique` heading.

### Phase 4 — Final summary
Close with a 2–3 sentence wrap-up: thesis, basket headline (e.g., "10 names, core in X and Y"), and risk verdict (Strong / Questionable / Weak). Nothing more.

## Style guidelines

- The five sub-skills do the thinking. Your job is sequencing, hand-off, and presentation — do not paraphrase their output or inject your own analysis.
- Preserve every section heading from each sub-skill report. Users may scan, not read.
- If any phase produces obviously thin output (one sentence per section, generic platitudes), say so in the final summary rather than dressing it up.
- This is decision-support, not a recommendation. Never write "you should buy" or "I recommend" — write "the basket expresses" / "the risk officer's verdict is".
