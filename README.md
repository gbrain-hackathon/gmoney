# gmoney — Hermes skill bundle

[![Hermes skill bundle](https://img.shields.io/badge/Hermes-skill%20bundle-D4AF37?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTEyIDJMMyA3djEwbDkgNSA5LTVWN3oiLz48L3N2Zz4=)](#installing-into-a-hermes-deployment)
[![Install: scripts/install.py](https://img.shields.io/badge/install-python3%20scripts%2Finstall.py-5b21b6)](scripts/install.py)

Thesis-driven investment basket builder, packaged as [Hermes Agent](https://github.com/NousResearch/hermes-agent) skills. The user submits a worldview; the agent orchestrates analyst, quant, and macro researchers, a portfolio manager that builds a basket, and a risk officer that red-teams it.

## What's in here

```
hermes.yaml                              # bundle manifest (skills, profiles, install hints)
scripts/install.py                       # one-shot installer into a Hermes config
skills/gmoney/
├── DESCRIPTION.md                       # category descriptor
├── gmoney-basket-builder/
│   ├── SKILL.md                         # meta-skill: drives the full pipeline
│   └── profile.yaml                     # role-specific config knobs
├── gmoney-analyst/{SKILL.md,profile.yaml}    # names companies + catalysts
├── gmoney-quant/{SKILL.md,profile.yaml}      # factor mapping + screen
├── gmoney-macro/{SKILL.md,profile.yaml}      # regime / sectors / FX / rates
├── gmoney-pm/{SKILL.md,profile.yaml}         # synthesizes JSON basket
└── gmoney-risk/{SKILL.md,profile.yaml}       # red-teams the basket
```

There is no application code. Each `SKILL.md` is a Hermes skill bundle (frontmatter + body); each `profile.yaml` captures refinement knobs for that role. The agent loads skills on demand via the `skills` toolset.

## Installing into a Hermes deployment

### One-shot (recommended)

```bash
git clone https://github.com/gbrain-hackathon/money.git gmoney
cd gmoney
python3 scripts/install.py
```

`install.py` reads `hermes.yaml`, finds the Hermes config at one of the default paths (`/data/.hermes/config.yaml` on Railway, `~/.hermes/config.yaml` locally), and appends this repo's `skills/gmoney` to `skills.external_dirs`. Idempotent — running twice is a no-op. Pass `--config PATH` to target a different config, `--dry-run` to preview, `--print-profiles` to see the per-skill recommendation table.

Restart the Hermes gateway afterwards.

### Manual

Add the path to `~/.hermes/config.yaml` (or `/data/.hermes/config.yaml` on the Railway template):

```yaml
skills:
  external_dirs:
    - /absolute/path/to/gmoney/skills/gmoney
```

External dirs are read-only; new skills the agent creates always land in `~/.hermes/skills/`.

## Profiles

Each skill has a `profile.yaml` alongside its `SKILL.md` capturing the recommended model, reasoning effort, output cap, and toolsets for that role. These are documentation today — Hermes does not yet apply per-skill model overrides natively — but they are the canonical record of intent and can be applied manually with `/model` and `/reasoning` when invoking each skill, or read by a future bootstrap if Hermes gains native support.

Quick view of the current recommendations:

```bash
python3 scripts/install.py --print-profiles
```

Refining a profile is just editing the YAML. Frontmatter changes (toolset requirements, related skills) belong in `SKILL.md`; tuning knobs (model, reasoning level, max tokens) belong in `profile.yaml`.

## Using it

Once the bundle is installed and the `skills` toolset is enabled, invoke the pipeline by giving the agent a concrete investment thesis. Example:

> "Power grid investment will accelerate over the next 5 years driven by data center demand and aging infrastructure. The market is pricing utilities like rate-capped legacy businesses, missing the capex-cycle upside in transmission, transformers, and grid software."

The agent should pick up `gmoney-basket-builder`, which drives `gmoney-analyst` → `gmoney-quant` → `gmoney-macro` → `gmoney-pm` → `gmoney-risk` and emits the basket plus critique.

## Tuning

- `SKILL.md` body — the system prompt for that role. Edit the markdown, keep the frontmatter intact.
- `profile.yaml` — model, reasoning effort, max tokens, toolsets for that role.
- `hermes.yaml` — bundle-level metadata (pipeline order, default install paths). Edit when adding or removing a skill from the pipeline.

`gmoney-basket-builder/SKILL.md` controls orchestration. It currently runs the three research skills sequentially; if Hermes adds parallel skill execution, that's the place to update.
