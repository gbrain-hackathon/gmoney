"""gmoney — multi-agent investment-thesis analysis plugin.

Registers six skills under the `gmoney:` namespace. ``basket-builder`` is the
orchestrator; it sequences ``analyst``, ``quant``, ``macro``, ``pm``, ``risk``
end-to-end.
"""

from __future__ import annotations

import re
from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parent
SKILLS_DIR = PLUGIN_ROOT / "skills"

SKILLS = ["analyst", "quant", "macro", "pm", "risk", "basket-builder"]

# Pull the description from each SKILL.md's frontmatter so the plugin listing
# and the prompt body can never drift. Simple regex avoids a yaml import.
_DESCRIPTION_RE = re.compile(r'^description:\s*"?([^"\n]+?)"?\s*$', re.MULTILINE)


def _description(skill_md: Path) -> str:
    match = _DESCRIPTION_RE.search(skill_md.read_text())
    return match.group(1).strip() if match else ""


def register(ctx) -> None:
    for name in SKILLS:
        skill_md = SKILLS_DIR / name / "SKILL.md"
        ctx.register_skill(name, skill_md, _description(skill_md))
