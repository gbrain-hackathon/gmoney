# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The **gmoney** skill bundle for [Hermes Agent](https://github.com/NousResearch/hermes-agent), under `skills/gmoney/`. No application code, no package manager, no build step. Every file is markdown. The Hermes deployment is consumed downstream (see README for installation).

## Skill structure

Hermes skills are directory bundles, not flat files. Each leaf directory has a `SKILL.md` with YAML frontmatter (`name`, `title`, `description`, `version`, `metadata.hermes.tags`, `metadata.hermes.related_skills`, `metadata.hermes.requires_toolsets`) followed by the prompt body. Categories (`skills/gmoney/`) have a `DESCRIPTION.md` with just a `description` field.

The pipeline:

- `gmoney-analyst`, `gmoney-quant`, `gmoney-macro` — three independent research roles, each producing a markdown report from a thesis.
- `gmoney-pm` — receives all three reports plus the thesis; emits a single fenced JSON code block (positions + narrative). The schema is in `gmoney-pm/SKILL.md`.
- `gmoney-risk` — receives the thesis and the basket; emits a markdown critique ending in a Strong / Questionable / Weak verdict.
- `gmoney-basket-builder` — meta-skill the agent loads first; sequences the other five and tracks progress via the `todo` toolset.

## Working in this repo

- **Editing a skill is editing the markdown body.** Preserve the frontmatter — `name` must match the leaf directory, and `related_skills` cross-references should stay consistent across the bundle.
- **Adding a skill** means a new `skills/gmoney/gmoney-<name>/SKILL.md` plus an update to `gmoney-basket-builder/SKILL.md` if the new skill is part of the pipeline, plus updates to every other skill's `related_skills`.
- **No tests / no lint / no build.** Validation is by running the bundle through Hermes (or eyeballing the YAML).
- **Naming**: every skill in this bundle is prefixed `gmoney-` so it's unambiguous when the agent searches across categories. Leaf directory name must equal `metadata.hermes.name`.

## What's no longer here

Earlier git history has a Next.js orchestrator that called Anthropic directly via `lib/agents/*` and persisted theses to `data/theses/*.json`. That entire stack was removed once Hermes became the only consumer — git history is the recovery path if it's needed again.
