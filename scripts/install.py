#!/usr/bin/env python3
"""Wire the gmoney skill bundle into a Hermes config.

Reads hermes.yaml in the repo root, resolves the absolute path to the skill
root, and adds it to `skills.external_dirs` in the target Hermes config.yaml.
The operation is idempotent — running twice is a no-op.

Usage:
    python scripts/install.py                       # auto-detect config path
    python scripts/install.py --config PATH         # explicit target
    python scripts/install.py --print-profiles      # show profile table, no write
    python scripts/install.py --dry-run             # show what would change

Designed to run on the Railway template (config at /data/.hermes/config.yaml)
as well as a local CLI install (~/.hermes/config.yaml).
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML required: pip install pyyaml")

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "hermes.yaml"


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        sys.exit(f"manifest not found: {MANIFEST_PATH}")
    with MANIFEST_PATH.open() as f:
        return yaml.safe_load(f)


def resolve_config_path(manifest: dict, override: str | None) -> Path:
    if override:
        return Path(override).expanduser().resolve()
    for candidate in manifest.get("install", {}).get("default_config_paths", []):
        path = Path(os.path.expandvars(candidate)).expanduser()
        if path.exists():
            return path.resolve()
    sys.exit(
        "no Hermes config.yaml found at default paths. "
        "Pass --config PATH to specify one explicitly."
    )


def load_config(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open() as f:
        data = yaml.safe_load(f) or {}
    if not isinstance(data, dict):
        sys.exit(f"config at {path} is not a YAML mapping")
    return data


def install(config: dict, skills_root: Path) -> bool:
    """Add skills_root to config['skills']['external_dirs']. Returns True if changed."""
    skills = config.setdefault("skills", {})
    dirs = skills.setdefault("external_dirs", []) or []
    target = str(skills_root)
    if target in dirs:
        return False
    dirs.append(target)
    skills["external_dirs"] = dirs
    return True


def print_profile_table(manifest: dict) -> None:
    print("gmoney profiles")
    print("─" * 72)
    headers = ("skill", "model", "reasoning", "max_tokens", "toolsets")
    rows: list[tuple[str, ...]] = []
    for name, descriptor in manifest.get("skills", {}).items():
        profile_path = REPO_ROOT / descriptor["profile"]
        if not profile_path.exists():
            rows.append((name, "(missing)", "-", "-", "-"))
            continue
        with profile_path.open() as f:
            profile = yaml.safe_load(f) or {}
        rows.append(
            (
                name,
                str(profile.get("model", "-")),
                str(profile.get("reasoning_effort", "-")),
                str(profile.get("max_tokens", "-")),
                ",".join(profile.get("toolsets") or []) or "-",
            )
        )
    widths = [max(len(r[i]) for r in (headers, *rows)) for i in range(len(headers))]
    fmt = "  ".join(f"{{:<{w}}}" for w in widths)
    print(fmt.format(*headers))
    print(fmt.format(*("-" * w for w in widths)))
    for row in rows:
        print(fmt.format(*row))
    print()
    print(
        "Hermes does not currently apply per-skill model / reasoning overrides.\n"
        "These values are the recommended settings for each role — apply manually\n"
        "via /model and /reasoning when invoking each skill, or wait for native\n"
        "per-skill support."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--config",
        help="Path to Hermes config.yaml (default: auto-detect from manifest)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without writing",
    )
    parser.add_argument(
        "--print-profiles",
        action="store_true",
        help="Print a table of recommended per-skill settings and exit",
    )
    args = parser.parse_args()

    manifest = load_manifest()

    if args.print_profiles:
        print_profile_table(manifest)
        return 0

    skills_root = (REPO_ROOT / manifest["skills_root"]).resolve()
    if not skills_root.exists():
        sys.exit(f"skills_root does not exist: {skills_root}")

    config_path = resolve_config_path(manifest, args.config)
    config = load_config(config_path)

    changed = install(config, skills_root)

    if not changed:
        print(f"already installed: {skills_root} is in {config_path}")
        return 0

    if args.dry_run:
        print(f"DRY RUN — would add {skills_root} to {config_path}")
        print(f"  resulting skills.external_dirs:")
        for entry in config["skills"]["external_dirs"]:
            print(f"    - {entry}")
        return 0

    config_path.parent.mkdir(parents=True, exist_ok=True)
    with config_path.open("w") as f:
        yaml.safe_dump(config, f, sort_keys=False)
    print(f"installed: added {skills_root} to {config_path}")
    print("restart the Hermes gateway for the new skill bundle to be picked up.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
