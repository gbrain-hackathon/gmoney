# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The **gmoney** skill bundle for [Hermes Agent](https://github.com/NousResearch/hermes-agent), under `skills/gmoney/`. No application code, no package manager, no build step — except a small Python install script. Every skill is markdown plus a YAML profile sidecar. The Hermes deployment is consumed downstream (see README for installation).

## Layout

```
hermes.yaml                 # bundle manifest (canonical descriptor)
scripts/install.py          # installer — wires skills_root into a Hermes config
skills/gmoney/
  DESCRIPTION.md            # category descriptor
  <skill>/
    SKILL.md                # frontmatter + prompt body (the actual skill)
    profile.yaml            # per-role tuning knobs (model, reasoning, etc.)
```

## Skill structure

Hermes skills are directory bundles, not flat files.

- `SKILL.md` — YAML frontmatter (`name`, `title`, `description`, `version`, `metadata.hermes.{tags, category, related_skills, requires_toolsets}`) followed by the prompt body.
- `profile.yaml` — sidecar with `model`, `provider`, `reasoning_effort`, `max_tokens`, `toolsets`, `notes`. Hermes does NOT currently apply these per-skill; they document intent and are surfaced by `scripts/install.py --print-profiles`. Treat them as the recommended runtime settings for each role.
- Category dirs (`skills/gmoney/`) have a `DESCRIPTION.md` with just a `description` field.

## The pipeline

- `gmoney-analyst`, `gmoney-quant`, `gmoney-macro` — three independent research roles, each producing a markdown report from a thesis.
- `gmoney-pm` — receives all three reports plus the thesis; emits a single fenced JSON code block (positions + narrative). The schema is in `gmoney-pm/SKILL.md`.
- `gmoney-risk` — receives the thesis and the basket; emits a markdown critique ending in a Strong / Questionable / Weak verdict.
- `gmoney-basket-builder` — meta-skill the agent loads first; sequences the other five and tracks progress via the `todo` toolset.

## Working in this repo

- **Editing a skill's behavior is editing `SKILL.md`.** Preserve the frontmatter — `name` must match the leaf directory, and `related_skills` cross-references should stay consistent across the bundle.
- **Tuning a skill's runtime settings is editing `profile.yaml`.** Keep these separate from `SKILL.md` so the prompt and the tuning knobs evolve independently.
- **Adding a skill** means a new `skills/gmoney/gmoney-<name>/SKILL.md` + `profile.yaml`, an entry in `hermes.yaml`, an update to `gmoney-basket-builder/SKILL.md` if the new skill is part of the pipeline, and updates to every other skill's `related_skills`.
- **`hermes.yaml`** is the manifest. It's read by `scripts/install.py` and serves as the canonical pipeline / install descriptor. Hermes itself does not read it.
- **No tests / no lint / no build.** Validation is running `python3 scripts/install.py --print-profiles` (smoke-tests YAML parsing) plus running the bundle through Hermes.
- **Naming**: every skill in this bundle is prefixed `gmoney-` so it's unambiguous when the agent searches across categories. Leaf directory name must equal `metadata.hermes.name`.

## What's no longer here

Earlier git history has a Next.js orchestrator that called Anthropic directly via `lib/agents/*` and persisted theses to `data/theses/*.json`. That entire stack was removed once Hermes became the only consumer — git history is the recovery path if it's needed again.
