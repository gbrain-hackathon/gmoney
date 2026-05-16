# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **Bun** (see `bun install` in README), but scripts use `next` directly so `npm`/`pnpm` also work.

```bash
bun install
bun run dev         # next dev — http://localhost:3000
bun run build       # next build
bun run start       # next start (after build)
bun run typecheck   # tsc --noEmit
```

There is no test suite, no linter configured, and no formatter. `typecheck` is the only static check.

`.env.local` must contain `ANTHROPIC_API_KEY`. Copy from `.env.local.example`.

## Architecture

Thesis-in, basket-out pipeline. Six agents run in a fixed sequence orchestrated by `lib/agents/orchestrator.ts`:

1. `POST /api/thesis` (`app/api/thesis/route.ts`) creates a `pending` thesis JSON and **fire-and-forgets** `runPipeline(id)`, returning the ID immediately.
2. Orchestrator transitions through statuses (`analyzing` → `synthesizing` → `reviewing` → `complete`), persisting after each step.
3. analyst/quant/macro run in **parallel** (`Promise.all`), each calling Anthropic with its own skill prompt.
4. PM agent (`lib/agents/pm.ts`) synthesizes their reports into a typed `Basket` using `output_config.format` with a JSON schema — this is the only structured-output call.
5. Risk agent red-teams the basket.
6. Client (`app/thesis/[id]/page.tsx`) polls `GET /api/thesis/[id]` every 3s until status is `complete` or `error`.

Errors at any stage write `status: 'error'` + `error: <message>`; the catch is wired in `app/api/thesis/route.ts:27`.

### Agent prompts live in `skills/*.md`

`lib/agents/base.ts` loads the matching skill markdown at runtime from `process.cwd()/skills/<name>.md`, caches it in an in-process `Map`, and passes it as the `system` block (with `cache_control: ephemeral` for prompt caching). **Tuning agent behavior is a markdown edit, not a code change** — `analyst.ts`, `quant.ts`, `macro.ts` are thin wrappers around `runAgent()`.

Model is `claude-opus-4-7` (exported as `MODEL` from `base.ts`) with `thinking: { type: 'adaptive' }`.

### Persistence

Filesystem JSON only. `lib/store.ts` writes one file per thesis to `data/theses/<id>.json` (gitignored). There is no database, no queue, no cache layer. `Thesis` shape is defined in `lib/types.ts`.

### Tools are stubs

Every file in `lib/tools/` (prices, news, filings, tickers, macro) is `throw new Error('not implemented')`. Agents currently reason from training data alone. Wiring real providers is a known TODO.

## Important caveats

- **Vercel deployment will break the pipeline.** The fire-and-forget `Promise` in `app/api/thesis/route.ts` relies on the Node process staying alive past the response. On Vercel the function exits when the response is sent. To deploy, wrap the call in `waitUntil` from `next/server`, or move to a queue. README documents this.
- **Skills are filesystem reads, not imports.** Any bundler that strips non-imported files will drop `skills/*.md` from the deployed bundle. Move into `public/` or import as strings if this becomes a problem.
- **PM agent does not use `runAgent`.** It reads its skill directly and calls `client.messages.create` with `output_config.format` for structured JSON. If you change the `system` block or caching strategy in `base.ts`, mirror it in `pm.ts`.
- **Path alias `@/*` maps to repo root** (see `tsconfig.json`), so `@/lib/store` resolves to `./lib/store`.
- **Next.js 15 + React 19, App Router.** Dynamic route params are `Promise<{ id: string }>` and must be `await`ed (see `app/api/thesis/[id]/route.ts`, `app/thesis/[id]/page.tsx`).
