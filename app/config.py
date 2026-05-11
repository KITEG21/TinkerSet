"""Centralized application configuration."""

from __future__ import annotations

import os
from pathlib import Path

# Load .env file from project root (so config values can be set via .env)
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())


def _parse_int(value: str | None, default: int) -> int:
    try:
        return int(value) if value is not None else default
    except ValueError:
        return default


BACKEND_HOST = os.getenv("AFM_API_HOST", "127.0.0.1")
BACKEND_PORT = _parse_int(os.getenv("AFM_API_PORT"), 8000)
FRONTEND_PORT = _parse_int(os.getenv("VITE_FRONTEND_PORT") or os.getenv("VITE_PORT"), 5173)

CORS_ORIGINS = [
    f"http://localhost:{FRONTEND_PORT}",
    f"http://127.0.0.1:{FRONTEND_PORT}",
]