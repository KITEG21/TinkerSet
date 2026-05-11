#!/usr/bin/env python3
"""Create a minimal valid ICO file for Tauri Windows builds."""
import io
import struct
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
TARGET_ICON = PROJECT_ROOT / "frontend" / "src-tauri" / "icons" / "icon.ico"


def create_minimal_ico(output_path: Path) -> None:
    """Create a minimal 32x32 pink gradient ICO file."""
    data = io.BytesIO()
    data.write(struct.pack("<HHH", 0, 1, 1))
    data.write(
        struct.pack(
            "<BBBBHHII",
            32,
            32,
            0,
            0,
            1,
            32,
            16 * 16 * 4,
            22,
        )
    )

    pixels = []
    for y in range(16):
        for x in range(16):
            r = min(255, (x * 255) // 16)
            g = min(200, (y * 200) // 16)
            b = 220
            a = 255
            pixels.append(struct.pack("<BBBB", b, g, r, a))

    for pixel in pixels:
        data.write(pixel)

    with output_path.open("wb") as f:
        f.write(data.getvalue())

    print(f"Created minimal ICO file: {output_path} ({len(data.getvalue())} bytes)")


if __name__ == "__main__":
    create_minimal_ico(TARGET_ICON)
