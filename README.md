# gmoney — Hermes skill bundle

Thesis-driven investment basket builder, packaged as [Hermes Agent](https://github.com/NousResearch/hermes-agent) skills. The user submits a worldview; the agent orchestrates analyst, quant, and macro researchers, a portfolio manager that builds a basket, and a risk officer that red-teams it.

## What's in here

```
skills/gmoney/
├── DESCRIPTION.md                       # category descriptor
├── gmoney-basket-builder/SKILL.md       # meta-skill: drives the full pipeline
├── gmoney-analyst/SKILL.md              # names companies + catalysts
├── gmoney-quant/SKILL.md                # factor mapping + screen
├── gmoney-macro/SKILL.md                # regime / sectors / FX / rates
├── gmoney-pm/SKILL.md                   # synthesizes JSON basket
└── gmoney-risk/SKILL.md                 # red-teams the basket
```

There is no application code. Each `SKILL.md` is a Hermes skill bundle (frontmatter + body). The agent loads them on demand via the `skills` toolset.

## Installing into a Hermes deployment

Point Hermes at this directory through `skills.external_dirs` in `~/.hermes/config.yaml`:

```yaml
skills:
  external_dirs:
    - /path/to/gmoney/skills
```

For the [hermes-agent-template](https://github.com/praveen-ks-2001/hermes-agent-template) on Railway, the equivalent is a startup step that clones this repo into `/data/.hermes/external-skills/` and writes the same `external_dirs` entry into the generated `config.yaml`. External dirs are read-only; new skills the agent creates always land in `~/.hermes/skills/`.

## Using it

Once the bundle is installed and the `skills` toolset is enabled, invoke the pipeline by giving the agent a concrete investment thesis. Example:

> "Power grid investment will accelerate over the next 5 years driven by data center demand and aging infrastructure. The market is pricing utilities like rate-capped legacy businesses, missing the capex-cycle upside in transmission, transformers, and grid software."

The agent should pick up `gmoney-basket-builder`, which drives `gmoney-analyst` → `gmoney-quant` → `gmoney-macro` → `gmoney-pm` → `gmoney-risk` and emits the basket plus critique.

## Tuning

Each `SKILL.md` is the system prompt for that role. Edit the markdown body, keep the frontmatter intact, redeploy (or re-pull on the Hermes side) — no code changes needed.

`gmoney-basket-builder/SKILL.md` controls the orchestration. It currently runs the three research skills sequentially; if Hermes adds parallel skill execution, that's the place to update.
