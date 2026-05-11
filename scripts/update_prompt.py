#!/usr/bin/env python3
"""Helper to update the system prompt in app/services/llm_service.py."""
from pathlib import Path
import re

PROJECT_ROOT = Path(__file__).resolve().parents[1]
LLM_SERVICE_PATH = PROJECT_ROOT / "app" / "services" / "llm_service.py"

NEW_PROMPT_FUNC = '''def _build_system_prompt(base_path: str) -> str:
    return f"""You are a JSON generator. ONLY return valid JSON, no explanations.

SCHEMA:
{{"path": ".", "filters": [...], "actions": [...]}}

CRITICAL:
1. NEVER add extra fields. Only "type" and "value"
2. Placeholders are DOUBLE BRACES: {{1}}, {{2}}, {{3}}
3. Paths are relative: ".", "./folder" NOT absolute
4. Delete: {{"type": "delete"}} with NO value
5. NO renameMode, find, replace, field, operator, etc

FILTERS:
- extension: [".mp4"]
- name_regex: "pattern_(\\\\d+)"
- name_contains: "substring"
- size_gt: 1048576
- size_lt: 1048576
- date_gt: "2024-01-01"
- date_lt: "2024-01-01"

ACTIONS:
- rename: value="new_{{1}}"
- move: value="./folder"
- copy: value="./folder"
- delete: no value

Example: Rename One Piece (\\d+) to 7_{{1}}
{{"path": ".", "filters": [{{"type": "name_regex", "value": "One Piece (\\\\d+)"}}], "actions": [{{"type": "rename", "value": "7_{{1}}"}}]}}

Base: {base_path!r}
"""'''


def main() -> None:
    content = LLM_SERVICE_PATH.read_text(encoding="utf-8")
    pattern = r"def _build_system_prompt\(base_path: str\) -> str:.*?(?=\n\ndef _build_user_prompt)"
    new_content = re.sub(pattern, NEW_PROMPT_FUNC.rstrip() + "\n", content, flags=re.DOTALL)
    LLM_SERVICE_PATH.write_text(new_content, encoding="utf-8")
    print("System prompt updated")


if __name__ == "__main__":
    main()
