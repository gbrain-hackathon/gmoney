# Financial Planner

Thesis-driven investment basket builder. The user submits a worldview, six agents (analyst / quant / macro → PM → risk) work in concert to produce a basket with rationale and a red-team critique.

## Setup

```bash
bun install
cp .env.local.example .env.local
# add ANTHROPIC_API_KEY=sk-ant-...
bun run dev
```

Open <http://localhost:3000>.

## Project layout

```
app/
├── page.tsx                  # thesis intake form
├── thesis/[id]/page.tsx      # report view (polls /api/thesis/[id])
└── api/thesis/
    ├── route.ts              # POST: create thesis + kick off pipeline
    └── [id]/route.ts         # GET: read current state

lib/
├── agents/
│   ├── base.ts               # shared LLM caller — loads skill, hits Anthropic API
│   ├── orchestrator.ts       # fan-out + synthesize + critique
│   ├── analyst.ts / quant.ts / macro.ts
│   ├── pm.ts                 # structured-output basket builder
│   └── risk.ts
├── tools/                    # market-data stubs (TODOs)
├── store.ts                  # filesystem JSON persistence
└── types.ts

skills/
├── analyst.md                # fat-markdown prompt for each agent
├── quant.md
├── macro.md
├── pm.md
└── risk.md

data/theses/                  # gitignored, one JSON per thesis
```

## How the pipeline runs

1. `POST /api/thesis` writes a `pending` thesis JSON file and fires `runPipeline(id)` without awaiting. Returns the ID immediately.
2. The orchestrator marks `analyzing` and fans out analyst/quant/macro in parallel.
3. When all three return, marks `synthesizing` and calls the PM agent. PM returns structured JSON via `output_config.format` → typed `Basket`.
4. Marks `reviewing` and calls the risk agent with the thesis + basket.
5. Marks `complete`.
6. The report page polls `/api/thesis/[id]` every 3s until status is terminal.

Errors at any stage write `status: 'error'` + `error: <message>` and stop polling.

## What's stubbed

- `lib/tools/*` — all market data fetchers are `throw new Error('not implemented')`. The agents work without them by reasoning from their training data, which is fine for a hackathon demo but obviously a real product needs real data. Pick providers, fill in.
- No backtesting yet. The diagram has it; it's a follow-on once tools work.
- No tracker. Same.

## Tuning the agents

Edit `skills/*.md`. No code changes needed — the base agent re-reads the markdown each cold start (and caches in-memory per process). Most quality work will live in these files.

## Deployment notes

The orchestrator uses fire-and-forget `Promise` from the API route. This works on local dev and on a long-lived Node host (Railway, Render, Fly). **On Vercel**, the function will exit when the response is sent and kill the in-flight pipeline — wrap the call in `waitUntil` from `next/server` if deploying there, or move the pipeline to a queue.

Skills (`skills/*.md`) are read from `process.cwd()` at runtime, so they must be present in the deployed bundle. Bundlers that exclude non-imported files will drop them — either move into `public/` or import as strings.
