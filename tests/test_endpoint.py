"""Test script for the /ai/interpret endpoint using a mock provider."""
from pathlib import Path
import json
import sys

import requests

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    url = "http://127.0.0.1:8000/ai/interpret"
    payload = {
        "prompt": "organiza capítulos de One Piece",
        "provider": "mock",
    }

    try:
        response = requests.post(url, json=payload, timeout=5)
        print(f"Status: {response.status_code}")
        print("Response:")
        print(json.dumps(response.json(), indent=2))
    except Exception as exc:
        print(f"Error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
