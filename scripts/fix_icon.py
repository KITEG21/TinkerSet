#!/usr/bin/env python3
"""Fix or regenerate the Tauri icon file."""
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ICON_PATH = PROJECT_ROOT / "frontend" / "src-tauri" / "icons" / "icon.ico"


def main() -> None:
    if ICON_PATH.exists():
        print(f"Icon already exists: {ICON_PATH}")
        return

    print(
        "Icon file not found. Use one of the icon helper scripts in scripts/ to regenerate it."
    )


if __name__ == "__main__":
    main()
