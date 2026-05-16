# Operational: running a thesis through GBrain *today*

This is the manual flow that works without modifying any of the gmoney skills. Use this for the hackathon demo. Once you have it working end-to-end, look at `wiring.md` to fold the writes into the orchestrator.

## One-time per repo

```bash
gbrain init                    # if you haven't
mkdir -p brain/theses brain/research brain/baskets brain/critiques
```

## Per-thesis flow

The orchestrator (`gmoney:basket-builder`) runs five phases. After each phase, you (or the operator running Hermes) run one `gbrain put` command to persist the output. This is the minimum-touch path.

### Setup: pick a slug

Slug is kebab-case from the thesis. Use it consistently across all writes.

```bash
SLUG="ai-compresses-bpo-margins"
RUN_ID=$(date -u +%Y-%m-%dT%H%M%SZ)
mkdir -p brain/research/$SLUG/$RUN_ID brain/baskets/$SLUG brain/critiques/$SLUG
```

### Phase 0 — Capture thesis

After the orchestrator confirms the canonical thesis sentence with the user, write it to a GBrain page:

```bash
# Fill in the template from schemas/thesis.template.md, then:
$EDITOR brain/theses/$SLUG.md           # paste the template, fill in fields
gbrain put theses/$SLUG < brain/theses/$SLUG.md
```

If the thesis already exists in the brain, *don't overwrite*. Read it first:

```bash
gbrain get theses/$SLUG                  # see prior compiled truth + timeline
```

Decide whether this is a re-run (use the existing page, append a timeline entry) or a new thesis with a fresh slug.

### Phase 1 — Three research reports

The orchestrator emits three reports in a single message under `### ANALYST report`, `### QUANT report`, `### MACRO report` headings. Split them into three files:

```bash
# Manually split the orchestrator output into three .md files, then:
gbrain put research/$SLUG/$RUN_ID/analyst < /tmp/analyst.md
gbrain put research/$SLUG/$RUN_ID/quant   < /tmp/quant.md
gbrain put research/$SLUG/$RUN_ID/macro   < /tmp/macro.md
```

Each report should carry frontmatter per `schemas/research_report.template.md`. The orchestrator does not produce frontmatter, so you (or a small shell wrapper) prepend it before piping to `gbrain put`. A 10-line bash helper is enough:

```bash
write_research() {
  local agent=$1 file=$2
  {
    echo "---"
    echo "type: research_report"
    echo "thesis_slug: $SLUG"
    echo "run_id: $RUN_ID"
    echo "agent: $agent"
    echo "created: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "---"
    echo ""
    cat "$file"
  } | gbrain put research/$SLUG/$RUN_ID/$agent
}
write_research analyst /tmp/analyst.md
write_research quant   /tmp/quant.md
write_research macro   /tmp/macro.md
```

After this point, GBrain's auto-link extractor has already created/updated `companies/<ticker>` for every cashtag mentioned in any of the three reports. You don't do anything — it just happens on `gbrain put`.

### Phase 2 — PM basket

The PM emits a fenced JSON block. Wrap it with frontmatter + a rendered table and store both:

```bash
$EDITOR brain/baskets/$SLUG/$RUN_ID.md   # see schemas/basket.template.md
gbrain put baskets/$SLUG/$RUN_ID < brain/baskets/$SLUG/$RUN_ID.md
```

**Run the citation gate** before showing the basket to the user (see `citation_gate.md`):

```bash
python docs/gbrain/citation_gate.py baskets/$SLUG/$RUN_ID
# Exit 0 = every position's ticker appears in at least one research report. Show basket.
# Exit 1 = at least one ticker is unsupported. Show the failure to the user.
```

### Phase 3 — Risk critique

```bash
$EDITOR brain/critiques/$SLUG/$RUN_ID.md
gbrain put critiques/$SLUG/$RUN_ID < brain/critiques/$SLUG/$RUN_ID.md
```

The risk report ends with a Strong / Questionable / Weak verdict — capture it in the frontmatter `verdict` field so `gbrain query` can filter by it later.

### Phase 4 — Update the thesis page

If the run materially shifted your view, the orchestrator can rewrite the *compiled truth* section of `theses/$SLUG.md` and append a new timeline entry. Re-`gbrain put` the page. Otherwise just append a timeline entry:

```bash
echo "" >> brain/theses/$SLUG.md
echo "- $(date -u +%Y-%m-%d): run $RUN_ID → basket $(jq -r '.positions | length' /tmp/basket.json) names, risk verdict $(grep -oE 'Strong|Questionable|Weak' brain/critiques/$SLUG/$RUN_ID.md | head -1)" >> brain/theses/$SLUG.md
gbrain put theses/$SLUG < brain/theses/$SLUG.md
```

## What you get out

- Search across all runs: `gbrain query "BPO margin compression"` returns every relevant page in the brain ranked by hybrid score.
- "What does the brain know about ACN?" — `gbrain get companies/ACN` shows every research report and basket that touched it.
- Graph traversal: `gbrain graph-query companies/ACN --type cited_in --depth 2` walks from ACN to its citing reports to the theses those reports belong to.
- Re-run a thesis next week with `gbrain get theses/$SLUG` first; feed the prior compiled truth into the orchestrator so research updates the existing view instead of regenerating it.

## Demo-day failure modes to avoid

- `gbrain put` with no frontmatter — works, but you lose `gbrain query --type research_report` filtering. Use the helper above.
- Forgetting `RUN_ID` and writing two runs to the same slug — they merge, you lose the diff. Always include the run id in the slug.
- Citation gate failing during the demo. Run it once on a dry-run thesis before the live demo so you see what success looks like.
- `gbrain serve` not running while Hermes is up — orchestrator calls will fail silently. Smoke-test with `gbrain jobs smoke` before the demo.
