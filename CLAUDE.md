# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The **gmoney** plugin for [Hermes Agent](https://github.com/NousResearch/hermes-agent). Seven investment-research skills registered under the `gmoney:` namespace. No application code, no package manager, no build step — just markdown skills and a thin Python `register()` hook.

## Layout

```
plugin.yaml             # Hermes plugin manifest (name, version, kind)
__init__.py             # def register(ctx) — calls ctx.register_skill for each skill
skills/
  <skill>/
    SKILL.md            # YAML frontmatter + prompt body
```

## Plugin contract

Hermes plugins live at `~/.hermes/plugins/<plugin_name>/` once installed (`hermes plugins install <repo>`). Hermes imports `__init__.py`, calls `register(ctx)`, and each `ctx.register_skill(name, path, description)` exposes the skill as `gmoney:<name>` via `skill_view`.

- `plugin.yaml` — `name`, `version`, `description`, `author`, `kind`, `platforms`. Loaded by the plugin manager.
- `__init__.py` — registers seven skills (`analyst`, `quant`, `macro`, `pm`, `hedger`, `risk`, `basket-builder`). Descriptions are pulled out of each `SKILL.md` frontmatter so there's a single source of truth.
- `SKILL.md` — YAML frontmatter (`name`, `title`, `description`, `version`, `metadata.hermes.{tags, category, related_skills, requires_toolsets}`) followed by the prompt body. `name` is the unqualified half of `gmoney:<name>`.

## The pipeline

- `gmoney:analyst`, `gmoney:quant`, `gmoney:macro` — three independent research roles, each producing a markdown report from a thesis. The orchestrator dispatches them **in parallel**.
- `gmoney:pm` — receives all three reports plus the thesis; emits a single fenced JSON code block (positions + narrative). Schema is in `skills/pm/SKILL.md`.
- `gmoney:hedger` — **optional** phase. Receives the thesis and basket; queries Kalshi / Polymarket and returns a markdown hedge memo. The orchestrator may skip it (user opted out, or single-name idiosyncratic thesis with no hedge surface).
- `gmoney:risk` — receives the thesis and the basket, plus the hedge memo *only if* the hedger phase ran; emits a markdown critique ending in a Strong / Questionable / Weak verdict.
- `gmoney:basket-builder` — orchestrator the agent loads first; sequences the other six and tracks progress via the `todo` toolset.

## Working in this repo

- **Editing a skill is editing `SKILL.md`.** Preserve the frontmatter — `name` must match the leaf directory. Keep `related_skills` consistent across the bundle.
- **Adding a skill** means a new `skills/<name>/SKILL.md`, appending the name to the `SKILLS` list in `__init__.py`, updating `basket-builder/SKILL.md` if the new skill belongs in the pipeline, and updating every other skill's `related_skills`.
- **Pushing updates to a live install**: `hermes plugins update gmoney` runs `git pull --ff-only` in `~/.hermes/plugins/gmoney/`. Hermes re-reads `SKILL.md` on each invocation, so prompt-body edits land on the next call. New or removed skills require `/reload-skills` (and a plugin reload for the `__init__.py` change to take effect).
- **No tests / no lint / no build.** Validation is `python3 -c "import sys; sys.path.insert(0, '.'); import __init__"` to confirm the module imports, plus running the plugin through Hermes.
- **Naming**: skills are namespaced as `gmoney:<name>`. Leaf directory name must equal the `name:` in `SKILL.md` frontmatter and the entry in `__init__.py`'s `SKILLS` list.

## What's no longer here

- The pre-plugin layout had `hermes.yaml` (bundle manifest), `scripts/install.py` (external_dirs installer), `skills/gmoney/DESCRIPTION.md` (category descriptor), and a `profile.yaml` per skill capturing recommended model / reasoning / toolsets. Hermes didn't apply per-skill profiles, so they were doc-only and have been removed — git history has them if needed.
- Earlier git history has a Next.js orchestrator that called Anthropic directly via `lib/agents/*` and persisted theses to `data/theses/*.json`. Removed once Hermes became the only consumer.
