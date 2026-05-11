#!/usr/bin/env python3
"""Convert the source PNG icon into the Tauri icon.ico file."""
from pathlib import Path
import subprocess
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ICON = PROJECT_ROOT / "frontend" / "src-tauri" / "icons" / "128x128.png"
TARGET_ICON = PROJECT_ROOT / "frontend" / "src-tauri" / "icons" / "icon.ico"


def convert_icon() -> None:
    try:
        from PIL import Image
    except ImportError:
        print("Installing Pillow...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
        from PIL import Image

    img = Image.open(SOURCE_ICON)

    if img.mode == "RGBA":
        rgb_img = Image.new("RGB", img.size, (255, 255, 255))
        rgb_img.paste(img, mask=img.split()[3])
        img = rgb_img

    img.save(TARGET_ICON, sizes=[(128, 128)])
    print(f"Created {TARGET_ICON.name} from {SOURCE_ICON.name}")


if __name__ == "__main__":
    convert_icon()
