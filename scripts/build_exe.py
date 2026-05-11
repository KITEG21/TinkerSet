#!/usr/bin/env python3
"""Legacy Flet packaging helper kept for reference.

The current project uses Tauri + React + FastAPI, so this script is no longer
part of the main build flow.
"""


def build_exe() -> None:
    raise SystemExit(
        "This legacy Flet script is not used by the current Tauri application. "
        "Use npm run tauri:build instead."
    )


if __name__ == "__main__":
    build_exe()
