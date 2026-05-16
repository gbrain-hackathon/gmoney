# GBrain wiring for gmoney

How to persist gmoney runs into [GBrain](https://github.com/garrytan/gbrain) so:

- Thesis state survives across runs and can be **updated in place** instead of regenerated.
- Every basket position carries a real, file-backed citation to the research that supports it.
- `companies/<ticker>` and `themes/<slug>` pages get auto-created and auto-linked by GBrain's entity extractor as you run more theses.
- The doc's "what changed since last week" pattern is free: each run is a dated page under `runs/<thesis>/<run_id>`.

This subtree **does not modify** the skill bundle under `../../skills/gmoney/`. It is additive:

- Operational: there are two ways to use it. Manual (`operational.md`) is what works *today* without touching any skill. Automatic (`wiring.md`) is a proposed diff to `gmoney-basket-builder/SKILL.md` that you apply when you're ready to have the orchestrator persist by itself.
- Schemas: page templates the orchestrator writes (or you write manually) at each phase.
- Citation gate: a tiny Python check that verifies every basket position has at least one supporting research page in the brain. Hard-fail before the basket is shown.

## Install GBrain in this repo (one-time, ~5 min)

```bash
# 1. Clone gbrain and link the CLI globally (NOT bun install -g — that breaks)
git clone https://github.com/garrytan/gbrain.git ~/code/gbrain
cd ~/code/gbrain && bun install && bun link

# 2. Initialize a brain inside this repo
cd ~/code/money
gbrain init                              # PGLite, ready in 2 seconds
mkdir -p brain                           # source of truth as markdown
echo "brain/.gbrain/" >> .gitignore      # local index dirs out of git
```

The `brain/` directory becomes the system of record. `gbrain` indexes it. Human edits any markdown file → `gbrain sync` picks it up.

## Expose GBrain to Hermes as an MCP server

`gbrain serve` exposes 30+ tools over stdio. Add this to your Hermes MCP config:

```json
{
  "mcpServers": {
    "gbrain": { "command": "gbrain", "args": ["serve"] }
  }
}
```

After this, the orchestrator and any skill can call `gbrain.put`, `gbrain.get`, `gbrain.query`, `gbrain.graph-query`.

## What lives where

```
docs/gbrain/
├── README.md              ← this file
├── operational.md         ← run a thesis end-to-end TODAY (no skill changes)
├── wiring.md              ← proposed orchestrator diff for automatic persistence
├── agent_io.md            ← what each existing skill produces, what gets persisted
├── citation_gate.md       ← Python check; rejects baskets with unsupported tickers
└── schemas/
    ├── thesis.template.md            ← brain/theses/<slug>.md
    ├── research_report.template.md   ← brain/research/<slug>/<run_id>/{analyst,quant,macro}.md
    ├── basket.template.md            ← brain/baskets/<slug>/<run_id>.md
    ├── critique.template.md          ← brain/critiques/<slug>/<run_id>.md
    └── company.template.md           ← brain/companies/<ticker>.md (auto-created)
```

## Why this is worth the 30 min to wire

Without GBrain, every run regenerates from scratch. The hackathon doc explicitly names the "update thesis instead of regenerate" pattern as why GBrain belongs in the architecture. Concrete wins you get for free once theses live in the brain:

- `gbrain query "AI compresses BPO margins"` returns the live thesis page plus every research report and basket that ever touched it, ranked by relevance — without you indexing anything.
- The graph layer auto-wires `companies/ACN` → every research report that mentioned ACN. `gbrain graph-query companies/ACN --type cited_in` gives you everything the brain knows about ACN across all theses.
- The citation gate (`citation_gate.md`) is enforceable: it just walks `gbrain get` on every page slug referenced in the basket and fails the run if any miss.
- Re-running the same thesis a week later: instead of three fresh research reports, you can pull last week's via `gbrain get` and prompt the analyst with "what's new since 2026-05-16?" — true delta thinking, which is the doc's stretch goal "Update thesis mode."

If you skip GBrain, you still ship a demo. You lose the demo's actual moat story.
