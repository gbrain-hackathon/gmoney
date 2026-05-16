---
type: basket
thesis_slug: ai-compresses-bpo-margins
run_id: 2026-05-16T143000Z
created: 2026-05-16T14:42:00Z
basket_count: 7                       # number of non-cash positions
tickers: [ACN, IBM, INFY, WIT, EXLS]  # auto-extracted from positions
total_weight: 100                     # must equal 100 exactly
cash_weight: 15
narrative_excerpt: "Underweight legacy BPO, overweight AI-services beneficiaries with 15% cash cushion against macro stress."
gate_overridden: false                # set true only when user chose option (c) at the citation gate
tags: [basket]
---

# Headline

One-sentence basket call — the orchestrator can lift this directly from the PM's narrative.

# Positions

| Ticker | Name | Weight | Rationale |
|---|---|---:|---|
| ACN | Accenture | 18 | Pure-play BPO; analyst flagged Q3 scope reductions ([[research/<slug>/<run_id>/analyst]]) and quant screen showed P/E compression below 5y avg. |
| ... | ... | ... | ... |
| CASH | Cash | 15 | Macro regime tag `growth-deceleration` ([[research/<slug>/<run_id>/macro]]) argues for cushion. |

# PM JSON (canonical)

The PM emits this verbatim. Persist it inside a fenced JSON block; do not edit.

```json
{
  "positions": [
    {
      "ticker": "ACN",
      "name": "Accenture",
      "weight": 18,
      "rationale": "Pure-play BPO incumbent. The analyst report calls out Q3 services revenue declining on AI-driven scope reductions; the quant screen shows P/E at 18x vs 5y average of 22x, consistent with the thesis pricing in margin pressure."
    }
  ],
  "narrative": "Basket expresses the thesis through underweight to legacy BPO incumbents..."
}
```

# Narrative

Render the PM's `narrative` field as plain prose here for readability.

# Citation gate result

- Status: PASS / FAIL / OVERRIDDEN
- Tickers checked: <list>
- Unsupported: <list, if any>
- Action taken: dropped | re-ran research | overridden

---

- 2026-05-16: Basket built by gmoney-pm for run 2026-05-16T143000Z. Citation gate passed.
