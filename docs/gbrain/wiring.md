# Wiring: proposed orchestrator changes

This is the **delta** to apply to `skills/basket-builder/SKILL.md` once you want the orchestrator to persist to GBrain automatically. Until then, follow `operational.md` (manual writes between phases).

This file does not modify any skills. It documents the change so you can apply it cleanly when ready.

## Prereqs

- GBrain installed and `gbrain serve` exposed to Hermes via MCP (see `README.md`).
- `gbrain` MCP namespace available to skills via the `requires_toolsets: [..., gbrain]` declaration.

## Frontmatter change

In `skills/basket-builder/SKILL.md`, change:

```yaml
requires_toolsets: [skills, web, todo]
```

to:

```yaml
requires_toolsets: [skills, web, todo, gbrain]
```

This is the only frontmatter edit needed.

## Body additions

The current SKILL.md has five numbered phases. Add a persistence step at the end of each, plus a setup step before Phase 0. Do *not* rewrite the phases — only append.

### New "Run setup" block (insert immediately before "Phase 0 — Capture the thesis")

```markdown
### Run setup — slug and run id

Before Phase 0, derive a stable slug from the thesis (kebab-case, ≤6 words) and a run id (`YYYY-MM-DDTHHMMSSZ`, UTC). Hold these in working state — every persisted page uses them.

Check if a prior thesis page exists:

  gbrain.get(slug=f"theses/{slug}")

If it exists, this is a re-run. Read the prior compiled truth and tell the user: "I have a prior version of this thesis in the brain from <date>. The compiled truth says: <one-line summary>. Should I update it in place, or start a new thesis with a different slug?" Wait for the user. If new, change the slug.
```

### Phase 0 addendum

After "Persist the canonical thesis string", append:

```markdown
Write the canonical thesis to GBrain using the template at `docs/gbrain/schemas/thesis.template.md`. Fill in `slug`, `horizon`, `sectors`, `tickers_of_interest`, `disconfirming_signals`. Set `status: active`, `last_pm_run: null`, `last_risk_run: null`.

  gbrain.put(slug=f"theses/{slug}", content=<rendered thesis page>)

If you read a prior thesis page in Run setup, do NOT overwrite the timeline section. Append one timeline entry: `- <date>: run <run_id> started`.
```

### Phase 1 addendum

After "emit the three reports in a single message", append:

```markdown
Persist each report as a separate GBrain page. For each of analyst/quant/macro:

  gbrain.put(slug=f"research/{slug}/{run_id}/{agent}",
             content=<frontmatter (type: research_report, thesis_slug, run_id, agent, created)>
                     + <report body>)

GBrain's auto-link extractor will create or update `companies/<ticker>` pages from the cashtags in your reports — you don't do anything for that to happen.
```

### Phase 2 addendum

After "Render the basket to the user as a markdown table", insert (BEFORE the user sees the basket):

```markdown
Persist the basket and run the citation gate:

  gbrain.put(slug=f"baskets/{slug}/{run_id}", content=<basket page per schemas/basket.template.md>)

Then run the citation gate by checking each position's ticker:

  for position in basket.positions:
      hits = gbrain.query(query=position.ticker, data_source="research", filters={"thesis_slug": slug, "run_id": run_id})
      if not hits:
          raise CitationGateFailure(position.ticker)

If the gate fails, do NOT show the basket. Tell the user which ticker is unsupported and ask whether to (a) drop it and reweight, (b) re-run the affected research skill with a hint about that ticker, or (c) override and show anyway with a flagged caveat.
```

### Phase 3 addendum

After "Emit its markdown report verbatim under a `## Risk critique` heading", append:

```markdown
Persist the critique:

  gbrain.put(slug=f"critiques/{slug}/{run_id}",
             content=<frontmatter (type: critique, thesis_slug, run_id, verdict, recommendation_ref)>
                     + <critique body>)

Extract the verdict (Strong / Questionable / Weak) from the last paragraph and put it in the frontmatter `verdict` field.
```

### Phase 4 addendum

Replace the existing "Phase 4 — Final summary" body's second sentence ("Nothing more.") with:

```markdown
If the new evidence materially shifts the thesis itself (not just sizing), rewrite the **Compiled truth** section of `theses/{slug}` and re-put the page. Always append a timeline entry:

  - <date>: run <run_id> → basket <N> names, risk verdict <Strong|Questionable|Weak>, link [[baskets/{slug}/{run_id}]] [[critiques/{slug}/{run_id}]]

Then close with the 2–3 sentence wrap-up (thesis, basket headline, risk verdict). Nothing more.
```

## Verification checklist after applying

1. `gbrain serve` is running.
2. `gbrain.put` calls show up in Hermes' tool-call log during a run.
3. After a successful run, the brain has these pages:
   - `theses/<slug>`
   - `research/<slug>/<run_id>/analyst`
   - `research/<slug>/<run_id>/quant`
   - `research/<slug>/<run_id>/macro`
   - `baskets/<slug>/<run_id>`
   - `critiques/<slug>/<run_id>`
   - `companies/<ticker>` for every cashtag in the research (auto)
4. `gbrain query "<thesis sentence>"` returns the thesis page first.
5. The citation gate ran and either passed or surfaced the failure to the user.

If any of those is missing, the wiring is incomplete — diagnose at the phase that failed.
