---
type: thesis
title: TBD — full thesis statement, one sentence
slug: ai-compresses-bpo-margins             # kebab-case; this is the page filename under brain/theses/
horizon: 6-12mo                              # short | 6-12mo | multi-year
sectors: [tech-services, business-process-outsourcing]
tickers_of_interest: [ACN, IBM, INFY, WIT, GLOB, EXLS, WNS]
disconfirming_signals:
  - BPO incumbents grow EPS faster than consensus 2 quarters in a row
  - AI agent vendors announce >50% gross-margin compression on labor-replacement products
  - Major BPO renewals close above prior pricing without AI-driven scope cuts
status: active                                # draft | active | retired
created: 2026-05-16
last_pm_run: null                             # YYYY-MM-DDTHHMMSSZ, set by orchestrator after first PM run
last_risk_run: null
benchmark: SPY                                # or sector ETF like XLK
underperformance_threshold_bps: -300          # vs benchmark, 30-day rolling cumulative return
tags: [thesis, ai, services]
---

# Compiled truth

One paragraph, plain English, the current best statement of the worldview. This gets *rewritten* (not appended to) every time `gmoney:pm` decides the thesis itself needs updating. The fact that it gets overwritten is the point — it's the live distillation, not a log.

Edge framing: this is a **worldview synthesis** edge, not an informational edge. We don't have faster access to data than anyone else. We claim that a disciplined, multi-agent reading of public evidence against a stated thesis produces a better-calibrated read than a generalist LLM with web search.

Constraints: long-only, no leverage, no options, no shorts. Hedging is via worldview calibration and cash weight (target cash floor 10%).

# Active basket

This section is filled by the orchestrator at the end of Phase 2. It's a one-line pointer:

Latest: `[[baskets/<slug>/<run_id>]]` — N names, basket headline.

# Active critique

Filled at the end of Phase 3. One-line pointer to the latest critique page plus the verdict.

Latest: `[[critiques/<slug>/<run_id>]]` — Strong | Questionable | Weak.

---

- 2026-05-16: Thesis created by Robin + Libbey for GStack hackathon demo run
<!-- Append-only timeline. The orchestrator adds one entry per run with the basket page, critique page, and risk verdict. Never edit prior entries — write a new dated entry instead. -->
