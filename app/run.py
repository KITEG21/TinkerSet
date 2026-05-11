"""Run the FastAPI backend with configurable host and port."""

from __future__ import annotations

import uvicorn

from .config import BACKEND_HOST, BACKEND_PORT


def main() -> None:
    uvicorn.run("app.main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=True)


if __name__ == "__main__":
    main()