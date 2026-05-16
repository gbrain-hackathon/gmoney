# gmoney — Hermes plugin

[![Install with Hermes](https://img.shields.io/badge/hermes%20plugins%20install-gbrain--hackathon%2Fgmoney-D4AF37?style=for-the-badge&logo=github)](#install)

Thesis-driven investment basket builder, packaged as a [Hermes Agent](https://github.com/NousResearch/hermes-agent) plugin. The user submits a worldview; the agent orchestrates analyst, quant, and macro researchers, a portfolio manager that builds a basket, and a risk officer that red-teams it.

## What's in here

```
plugin.yaml                              # Hermes plugin manifest
__init__.py                              # registers six skills under the gmoney: namespace
skills/
├── basket-builder/SKILL.md              # orchestrator — drives the full pipeline
├── analyst/SKILL.md                     # names companies + catalysts
├── quant/SKILL.md                       # factor mapping + screen
├── macro/SKILL.md                       # regime / sectors / FX / rates
├── pm/SKILL.md                          # synthesizes JSON basket
└── risk/SKILL.md                        # red-teams the basket
```

No application code. Each `SKILL.md` is a Hermes skill (frontmatter + body). The plugin's `__init__.py` registers them all under the `gmoney:` namespace via `ctx.register_skill`, so the agent invokes them as `gmoney:analyst`, `gmoney:basket-builder`, etc.

## Install

```bash
hermes plugins install https://github.com/gbrain-hackathon/gmoney.git
```

Hermes shallow-clones the repo into `~/.hermes/plugins/gmoney/`, runs `register(ctx)`, and the six skills become available via `skill_view`.

## Updating

```bash
hermes plugins update gmoney
```

Runs `git pull --ff-only` in the installed plugin directory. Prompt-body edits land on the next skill invocation automatically — Hermes re-reads `SKILL.md` per call. If you've added or removed a skill, follow with `/reload-skills` so the new structure is registered.

## Using it

Once the plugin is installed and the `skills` toolset is enabled, give the agent a concrete investment thesis. Example:

> "Power grid investment will accelerate over the next 5 years driven by data center demand and aging infrastructure. The market is pricing utilities like rate-capped legacy businesses, missing the capex-cycle upside in transmission, transformers, and grid software."

The agent picks up `gmoney:basket-builder`, which drives `gmoney:analyst` → `gmoney:quant` → `gmoney:macro` → `gmoney:pm` → `gmoney:risk` and emits the basket plus critique.

## Tuning

- `SKILL.md` body — the system prompt for that role. Edit the markdown; keep the frontmatter intact.
- `SKILL.md` frontmatter — `requires_toolsets`, `related_skills`, `tags`. Update when toolset needs change or you reorganize the pipeline.
- `__init__.py` — only touched when adding or removing a skill (append the leaf name to `SKILLS`).
- `plugin.yaml` — bump `version` on releases.

`skills/basket-builder/SKILL.md` controls orchestration. It currently runs the three research skills sequentially; if Hermes adds parallel skill execution, that's the place to update.
