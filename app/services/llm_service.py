from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen
from openai import OpenAI


DEFAULT_PROVIDER = os.getenv("AFM_LLM_PROVIDER", "ollama").strip().lower()
DEFAULT_OLLAMA_BASE_URL = os.getenv("AFM_OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
DEFAULT_OLLAMA_MODEL = os.getenv("AFM_OLLAMA_MODEL", "llama3.2")
DEFAULT_GROK_BASE_URL = os.getenv("AFM_GROK_BASE_URL", "https://api.x.ai/v1").rstrip("/")
DEFAULT_GROK_MODEL = os.getenv("AFM_GROK_MODEL", "grok-2-latest")
DEFAULT_GROQ_BASE_URL = os.getenv("AFM_GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
DEFAULT_GROQ_MODEL = os.getenv("AFM_GROQ_MODEL", "llama-3.3-70b-versatile")

_ALLOWED_FILTER_TYPES = {"extension", "name_regex", "name_contains", "size_gt", "size_lt", "date_gt", "date_lt", "file_type"}
_ALLOWED_ACTION_TYPES = {"rename", "move", "copy", "delete"}
_DESCRIPTIVE_WORDS = {
    "being",
    "their",
    "last",
    "numbers",
    "files",
    "file",
    "rename",
    "renameing",
    "to",
    "be",
    "the",
    "and",
}


def _detect_extensions(prompt: str) -> list[str]:
    prompt_lower = prompt.lower()

    if any(word in prompt_lower for word in ["image", "images", "photos", "pictures", "imagen", "imagenes", "foto", "fotos", "fotografia", "fotografias"]):
        return [".png", ".jpg", ".jpeg", ".gif", ".webp"]

    if any(word in prompt_lower for word in ["document", "documents", "text", "notes", "txt", "documento", "documentos", "texto", "notas"]):
        return [".txt", ".md", ".doc", ".docx", ".pdf"]

    matches = re.findall(r"\.[a-z0-9]{1,5}", prompt_lower)
    if matches:
        return sorted(set(matches))

    return []


def _detect_size_threshold(prompt: str) -> tuple[str, int] | None:
    match = re.search(r"(at least|more than|greater than|over|above)\s+(\d+)\s*(kb|mb|gb)?", prompt, re.IGNORECASE)
    if match:
        value = int(match.group(2))
        unit = (match.group(3) or "b").lower()
        multiplier = {"b": 1, "kb": 1024, "mb": 1024 * 1024, "gb": 1024 * 1024 * 1024}[unit]
        return ("size_gt", value * multiplier)

    match = re.search(r"(at most|less than|under|below)\s+(\d+)\s*(kb|mb|gb)?", prompt, re.IGNORECASE)
    if match:
        value = int(match.group(2))
        unit = (match.group(3) or "b").lower()
        multiplier = {"b": 1, "kb": 1024, "mb": 1024 * 1024, "gb": 1024 * 1024 * 1024}[unit]
        return ("size_lt", value * multiplier)

    return None


def _detect_name_match(prompt: str) -> tuple[str, str] | None:
    regex_match = re.search(r"name.*?(?:matches?|match|regex|regular expression)\s+['\"]?([^'\"]+)['\"]?", prompt, re.IGNORECASE)
    if regex_match:
        return ("name_regex", regex_match.group(1).strip())

    spanish_regex_match = re.search(r"nombre.*?(?:coincide|coinciden|regex|expresi[oó]n regular)\s+['\"]?([^'\"]+)['\"]?", prompt, re.IGNORECASE)
    if spanish_regex_match:
        return ("name_regex", spanish_regex_match.group(1).strip())

    contains_match = re.search(r"name.*?(?:contains|including|with)\s+['\"]?([^'\"]+)['\"]?", prompt, re.IGNORECASE)
    if contains_match:
        return ("name_contains", contains_match.group(1).strip())

    spanish_contains_match = re.search(r"nombre.*?(?:contiene|incluyendo|con)\s+['\"]?([^'\"]+)['\"]?", prompt, re.IGNORECASE)
    if spanish_contains_match:
        return ("name_contains", spanish_contains_match.group(1).strip())

    episode_cleanup_match = re.search(
        r"(?:episode|episodio|cap[ií]tulo).*(?:remove|remueve|quita|elimina|borra).*(?:text|texto).*(?:after|despu[eé]s|luego).*(?:number|n[uú]mero|episode number|n[uú]mero del episodio)",
        prompt,
        re.IGNORECASE,
    )
    if episode_cleanup_match:
        return ("name_regex", r".*?(\d+).*")

    return None


def _heuristic_translate(prompt: str, path: str | None = None) -> dict:
    normalized = prompt.strip()
    target_path = str(Path(path or "."))
    prompt_lower = normalized.lower()
    filters: list[dict] = []
    actions: list[dict] = []

    if (
        any(word in prompt_lower for word in ["episode", "episodio", "capitulo", "capítulo"])
        and any(word in prompt_lower for word in ["remove", "remueve", "quita", "elimina", "borra", "quitar", "eliminar"])
        and any(word in prompt_lower for word in ["text", "texto"])
        and any(word in prompt_lower for word in ["after", "despues", "después", "luego"])
        and any(word in prompt_lower for word in ["number", "numero", "número"])
    ):
        return {
            "path": target_path,
            "filters": [{"type": "name_regex", "value": r".*?(\d+).*"}],
            "actions": [{"type": "rename", "value": "{1}"}],
        }

    extensions = _detect_extensions(normalized)
    if extensions:
        filters.append({"type": "extension", "value": extensions})

    name_match = _detect_name_match(normalized)
    if name_match:
        filter_type, value = name_match
        filters.append({"type": filter_type, "value": value})

    size_match = _detect_size_threshold(normalized)
    if size_match:
        filter_type, value = size_match
        filters.append({"type": filter_type, "value": value})
    else:
        size_value = re.search(r"(\d+)\s*(kb|mb|gb)", normalized, re.IGNORECASE)
        if size_value:
            value = int(size_value.group(1))
            unit = size_value.group(2).lower()
            multiplier = {"kb": 1024, "mb": 1024 * 1024, "gb": 1024 * 1024 * 1024}[unit]
            filters.append({"type": "size_gt", "value": value * multiplier})

    date_match = re.search(r"(before|after)\s+(\d{4}-\d{2}-\d{2})", normalized, re.IGNORECASE)
    if date_match:
        filter_type = "date_lt" if date_match.group(1).lower() == "before" else "date_gt"
        filters.append({"type": filter_type, "value": date_match.group(2)})

    # Detect file_type filter: "files only", "folders only", "folders and files", etc.
    if any(word in prompt_lower for word in ["only files", "files only", "just files"]):
        filters.append({"type": "file_type", "value": "files"})
    elif any(word in prompt_lower for word in ["only folders", "folders only", "just folders", "directories only", "only directories"]):
        filters.append({"type": "file_type", "value": "folders"})
    elif any(word in prompt_lower for word in ["files and folders", "folders and files", "everything"]):
        filters.append({"type": "file_type", "value": "both"})

    if any(word in prompt_lower for word in ["rename", "renombra", "renombrar", "cambiar nombre"]):
        # Check for number_sequential pattern: "number the files" or "rename to numbers"
        number_match = re.search(r"(?:number|rename.*?to.*?(?:number|sequential|1[,\s]))", normalized, re.IGNORECASE)
        spanish_number_match = re.search(r"(?:numera|numerar|secuencial|consecutiv|1[,\s])", normalized, re.IGNORECASE)
        if number_match:
            # Detect padding if mentioned
            padding_match = re.search(r"(?:pad|zero[- ]?pad|leading zero).*?(\d+)", normalized, re.IGNORECASE)
            padding_value = int(padding_match.group(1)) if padding_match else 0
            
            action = {"type": "rename", "renameMode": "number_sequential", "value": "1"}
            if padding_value > 0:
                action["padding"] = padding_value
            actions.append(action)
        elif spanish_number_match:
            padding_match = re.search(r"(?:relleno|padding|cero[s]?|cero[s]? a la izquierda).*(\d+)", normalized, re.IGNORECASE)
            padding_value = int(padding_match.group(1)) if padding_match else 0
            action = {"type": "rename", "renameMode": "number_sequential", "value": "1"}
            if padding_value > 0:
                action["padding"] = padding_value
            actions.append(action)
        else:
            # Original template/replace logic
            template_match = re.search(r"rename.*?to\s+['\"]?([^'\"]+)['\"]?", normalized, re.IGNORECASE)
            if template_match:
                actions.append({"type": "rename", "renameMode": "template", "value": template_match.group(1).strip()})

            spanish_template_match = re.search(r"renombr[a-z]*.*?(?:a|como|como\s+['\"]?)\s+['\"]?([^'\"]+)['\"]?", normalized, re.IGNORECASE)
            if spanish_template_match and not template_match:
                actions.append({"type": "rename", "renameMode": "template", "value": spanish_template_match.group(1).strip()})

            replace_match = re.search(r"replace\s+['\"]?([^'\"]+)['\"]?\s+with\s+['\"]?([^'\"]+)['\"]?", normalized, re.IGNORECASE)
            if replace_match:
                actions.append(
                    {
                        "type": "rename",
                        "renameMode": "replace",
                        "find": replace_match.group(1).strip(),
                        "replace": replace_match.group(2).strip(),
                    }
                )

    if any(word in prompt_lower for word in ["move", "organize", "sort", "mueve", "organiza", "ordena", "mover", "organizar", "ordenar"]):
        move_match = re.search(r"(?:move|organize|sort).*?(?:to|into)\s+['\"]?([^'\"]+)['\"]?", normalized, re.IGNORECASE)
        spanish_move_match = re.search(r"(?:mueve|organiza|ordena|mover|organizar|ordenar).*?(?:a|en|dentro de|hacia)\s+['\"]?([^'\"]+)['\"]?", normalized, re.IGNORECASE)
        if move_match:
            actions.append({"type": "move", "value": move_match.group(1).strip()})
        elif spanish_move_match:
            actions.append({"type": "move", "value": spanish_move_match.group(1).strip()})

    if any(word in prompt_lower for word in ["copy", "copia", "copiar", "duplica", "duplicar"]):
        copy_match = re.search(r"copy.*?(?:to|into)\s+['\"]?([^'\"]+)['\"]?", normalized, re.IGNORECASE)
        spanish_copy_match = re.search(r"(?:copia|copiar|duplica|duplicar).*?(?:a|en|dentro de|hacia)\s+['\"]?([^'\"]+)['\"]?", normalized, re.IGNORECASE)
        if copy_match:
            actions.append({"type": "copy", "value": copy_match.group(1).strip()})
        elif spanish_copy_match:
            actions.append({"type": "copy", "value": spanish_copy_match.group(1).strip()})

    if any(word in prompt_lower for word in ["delete", "remove", "trash", "elimina", "borrar", "borra", "remueve", "quitar", "quita"]):
        actions.append({"type": "delete"})

    return {"path": target_path, "filters": filters, "actions": actions}


def _build_system_prompt(base_path: str) -> str:
    return f"""You are a translator from natural language into JSON for a file workflow engine.
Return ONLY valid JSON, with no markdown and no explanations.

TARGET SCHEMA:
{{"path": ".", "filters": [...], "actions": [...]}}

ALLOWED FILTER TYPES:
- extension: list of extensions (example: [".mp4", ".txt"])
- name_regex: regex string (example: "Season (\\d+)")
- name_contains: substring string
- size_gt, size_lt: integer bytes
- date_gt, date_lt: "YYYY-MM-DD"
- file_type: "files" | "folders" | "both"

ALLOWED ACTION TYPES:
- rename (template mode default): {{"type": "rename", "value": "ep_{{1}}_{{name}}"}}
- rename (number_sequential): {{"type": "rename", "renameMode": "number_sequential", "value": "1", "padding": 2, "prefix": "ep_", "suffix": "_v2"}}
- rename (replace mode): {{"type": "rename", "renameMode": "replace", "find": "old", "replace": "new"}}
- move: {{"type": "move", "value": "./folder"}}
- copy: {{"type": "copy", "value": "./folder"}}
- delete: {{"type": "delete"}}

SPANISH KEYWORDS:
- renombra / cambiar nombre -> rename
- mueve / organiza / ordena -> move
- copia / duplica -> copy
- elimina / borra / remueve / quita -> delete
- "remueve el texto luego del número del episodio" -> use a name_regex capture for the episode number and rename to "{{1}}" or "Episode {{1}}" depending on the requested style

DECISION POLICY (internal reasoning, but output only JSON):
1. Understand intent in plain language and infer the minimum filters needed.
2. Infer actions from verbs:
    - "rename", "number", "prefix/suffix" -> rename
    - "move", "organize into" -> move
    - "copy", "duplicate" -> copy
    - "delete", "remove", "trash" -> delete
3. Infer filters from constraints:
    - file kinds/extensions (images/docs/.mp4/etc.) -> extension
    - "files only" / "folders only" -> file_type
    - "contains" -> name_contains
    - explicit pattern/capture -> name_regex
    - size limits -> size_gt/size_lt (bytes)
    - date limits -> date_gt/date_lt
4. Action order:
    - If user gives an explicit order, keep it.
    - Otherwise use safe default order: rename first, then move/copy, delete last.
5. Safety and validity:
    - Never invent unsupported fields.
    - Do not produce delete unless user intent is explicit.
    - Keep "path" equal to the provided base path value.
    - Use relative destination paths like "./anime".

If the user asks to keep only the episode number and remove trailing text, prefer a name_regex that captures the number and a rename template that keeps only the capture.

RENAME TEMPLATE PLACEHOLDERS:
- Captures: {{1}}, {{2}}, ...
- Built-ins: {{name}}, {{ext}}, {{suffix}}

EXAMPLES:

1. "rename One Piece (\\d+) files to 7_{{1}}":
{{"path": ".", "filters": [{{"type": "name_regex", "value": "One Piece (\\\\d+)"}}], "actions": [{{"type": "rename", "value": "7_{{1}}"}}]}}

2. "number Dragon Ball folders with 2 digits":
{{"path": ".", "filters": [{{"type": "name_contains", "value": "Dragon Ball"}}, {{"type": "file_type", "value": "folders"}}], "actions": [{{"type": "rename", "renameMode": "number_sequential", "value": "1", "padding": 2}}]}}

3. "for mp4 files, rename then move to anime":
{{"path": ".", "filters": [{{"type": "extension", "value": [".mp4"]}}], "actions": [{{"type": "rename", "value": "episode_{{1}}"}}, {{"type": "move", "value": "./anime"}}]}}

4. "copy jpg and png files to backup":
{{"path": ".", "filters": [{{"type": "extension", "value": [".jpg", ".png"]}}], "actions": [{{"type": "copy", "value": "./backup"}}]}}

5. "delete files older than 2023-01-01":
{{"path": ".", "filters": [{{"type": "file_type", "value": "files"}}, {{"type": "date_lt", "value": "2023-01-01"}}], "actions": [{{"type": "delete"}}]}}

Base path: {base_path!r}
"""

def _build_user_prompt(prompt: str, base_path: str) -> str:
    return (
        f"Base path: {base_path}\n"
        f"User request: {prompt.strip()}\n"
        "Return JSON only with keys: path, filters, actions."
    )


def _post_json(url: str, payload: dict[str, Any], headers: dict[str, str] | None = None) -> dict[str, Any]:
    request = Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers or {}, method="POST")
    request.add_header("Content-Type", "application/json")

    try:
        with urlopen(request, timeout=120) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw)
    except Exception as e:
        # Try to extract error details from HTTP error responses
        if hasattr(e, 'fp') and e.fp:
            try:
                error_body = e.fp.read().decode("utf-8")
                print(f"API Error Response: {error_body}")
            except:
                pass
        raise


def _extract_json_text(content: str) -> str:
    cleaned = content.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    if cleaned.startswith("{") and cleaned.endswith("}"):
        return cleaned

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        return match.group(0)

    raise ValueError("The model did not return JSON.")


def _extract_text_from_grok_response(payload: dict[str, Any]) -> str:
    choices = payload.get("choices") or []
    if not choices:
        raise ValueError("Grok returned no choices.")

    message = choices[0].get("message") or {}
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise ValueError("Grok returned an empty response.")

    return content


def _extract_text_from_ollama_response(payload: dict[str, Any]) -> str:
    message = payload.get("message") or {}
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        content = payload.get("response")

    if not isinstance(content, str) or not content.strip():
        raise ValueError("Ollama returned an empty response.")

    return content


def _normalize_template(value: str) -> str:
    """Normalize template placeholders: convert {{N}} to {N} if needed."""
    # Handle double braces from LLM confusion: {{1}} -> {1}, {{name}} -> {name}
    return re.sub(r'\{\{(\d+|name|ext|suffix)\}\}', r'{\1}', value, flags=re.IGNORECASE)


def _validate_llm_payload(payload: dict[str, Any], base_path: str) -> dict:
    if payload.get("path") != base_path:
        payload["path"] = base_path

    filters = payload.get("filters")
    actions = payload.get("actions")

    if not isinstance(filters, list):
        raise ValueError("LLM output must include a filters array.")
    if not isinstance(actions, list):
        raise ValueError("LLM output must include an actions array.")

    # Clean and validate filters (only keep type and value)
    cleaned_filters = []
    for item in filters:
        if not isinstance(item, dict):
            raise ValueError("Each filter must be an object.")
        filter_type = item.get("type")
        if filter_type not in _ALLOWED_FILTER_TYPES:
            raise ValueError(f"Unsupported filter type: {filter_type}")
        # Only keep type and value, discard any extra fields like field, operator
        cleaned_filters.append({"type": filter_type, "value": item.get("value")})
    payload["filters"] = cleaned_filters

    # Clean and validate actions (only keep type and value)
    cleaned_actions = []
    for item in actions:
        if not isinstance(item, dict):
            raise ValueError("Each action must be an object.")

        action_type = item.get("type")
        if action_type not in _ALLOWED_ACTION_TYPES:
            raise ValueError(f"Unsupported action type: {action_type}")

        if action_type == "rename":
            rename_mode = item.get("renameMode", "template")
            value = str(item.get("value") or "").strip()
            
            if rename_mode == "number_sequential":
                # For sequential numbering, value should be a number (starting point)
                try:
                    int(value)
                except ValueError:
                    raise ValueError("number_sequential rename value must be a number (starting point).")
                
                padding = item.get("padding")
                if padding is not None:
                    padding = int(padding)
                    if padding < 0 or padding > 10:
                        raise ValueError("Padding must be between 0 and 10.")
                
                prefix = str(item.get("prefix") or "").strip()
                suffix_text = str(item.get("suffix") or "").strip()
                
                action_dict = {"type": "rename", "renameMode": "number_sequential", "value": value}
                if padding is not None:
                    action_dict["padding"] = padding
                if prefix:
                    action_dict["prefix"] = prefix
                if suffix_text:
                    action_dict["suffix"] = suffix_text
                cleaned_actions.append(action_dict)
            else:
                # Default template mode
                # Normalize double braces to single braces
                value = _normalize_template(value)
                
                if not value:
                    raise ValueError("Template rename requires a value.")
                
                lowered = value.lower()
                if any(word in lowered for word in _DESCRIPTIVE_WORDS):
                    raise ValueError("Template rename value contains descriptive text instead of a pattern.")
                
                if not re.search(r'\{\d+\}|\{name\}|\{ext\}|\{suffix\}', value, re.IGNORECASE):
                    raise ValueError("Template rename value must contain at least one placeholder like {1}, {name}, {ext}, or {suffix}.")
                
                cleaned_actions.append({"type": "rename", "value": value})
            
        elif action_type in ("move", "copy"):
            value = str(item.get("value") or "").strip()
            if not value:
                raise ValueError(f"{action_type} action requires a value.")
            cleaned_actions.append({"type": action_type, "value": value})
            
        elif action_type == "delete":
            cleaned_actions.append({"type": "delete"})
        
        else:
            raise ValueError(f"Unsupported action type: {action_type}")

    payload["actions"] = cleaned_actions
    return payload


def _translate_with_grok(prompt: str, path: str | None, model: str | None = None) -> dict:
    api_key = os.getenv("XAI_API_KEY") or os.getenv("GROK_API_KEY")
    if not api_key:
        raise RuntimeError("Missing XAI_API_KEY for Grok translation.")

    payload = {
        "model": model or DEFAULT_GROK_MODEL,
        "messages": [
            {"role": "system", "content": _build_system_prompt(str(Path(path or ".")))},
            {"role": "user", "content": _build_user_prompt(prompt, str(Path(path or ".")))},
        ],
        "temperature": 0.1,
    }

    response = _post_json(
        f"{DEFAULT_GROK_BASE_URL}/chat/completions",
        payload,
        headers={"Authorization": f"Bearer {api_key}"},
    )
    content = _extract_text_from_grok_response(response)
    return json.loads(_extract_json_text(content))


def _translate_with_groq(prompt: str, path: str | None, model: str | None = None) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GROQ_API_KEY for Groq translation.")

    client = OpenAI(api_key=api_key, base_url=DEFAULT_GROQ_BASE_URL)
    
    response = client.chat.completions.create(
        model=model or DEFAULT_GROQ_MODEL,
        messages=[
            {"role": "system", "content": _build_system_prompt(str(Path(path or ".")))},
            {"role": "user", "content": _build_user_prompt(prompt, str(Path(path or ".")))},
        ],
        temperature=0.1,
    )
    
    content = response.choices[0].message.content
    return json.loads(_extract_json_text(content))


def _translate_with_ollama(prompt: str, path: str | None, model: str | None = None) -> dict:
    payload = {
        "model": model or DEFAULT_OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": _build_system_prompt(str(Path(path or ".")))},
            {"role": "user", "content": _build_user_prompt(prompt, str(Path(path or ".")))},
        ],
        "stream": False,
        "options": {"temperature": 0.1},
    }

    response = _post_json(f"{DEFAULT_OLLAMA_BASE_URL}/api/chat", payload)
    content = _extract_text_from_ollama_response(response)
    return json.loads(_extract_json_text(content))


def interpret_prompt(prompt: str, path: str | None = None, provider: str | None = None, model: str | None = None) -> dict:
    """Translate a natural-language prompt into a file workflow job."""

    normalized_prompt = (prompt or "").strip()
    base_path = str(Path(path or "."))
    selected_provider = (provider or DEFAULT_PROVIDER or "ollama").strip().lower()

    if not normalized_prompt:
        raise ValueError("Prompt cannot be empty.")

    # Mock provider for testing prompts without LLM
    if selected_provider == "mock":
        payload = _mock_translate(normalized_prompt, base_path)
    else:
        try:
            if selected_provider == "grok":
                payload = _translate_with_grok(normalized_prompt, base_path, model)
            elif selected_provider == "groq":
                payload = _translate_with_groq(normalized_prompt, base_path, model)
            elif selected_provider == "ollama":
                payload = _translate_with_ollama(normalized_prompt, base_path, model)
            else:
                raise ValueError(f"Unsupported LLM provider: {selected_provider}")
        except Exception:
            # Fall back to heuristics when the model returns invalid JSON or unsupported content.
            payload = _heuristic_translate(normalized_prompt, base_path)

    if not isinstance(payload, dict):
        raise ValueError("The model returned an invalid payload.")

    payload.setdefault("filters", [])
    payload.setdefault("actions", [])
    try:
        return _validate_llm_payload(payload, base_path)
    except ValueError:
        if selected_provider != "mock":
            fallback_payload = _heuristic_translate(normalized_prompt, base_path)
            fallback_payload.setdefault("filters", [])
            fallback_payload.setdefault("actions", [])
            return _validate_llm_payload(fallback_payload, base_path)
        raise


def _mock_translate(prompt: str, base_path: str) -> dict:
    """Mock translation for testing the prompt format."""
    # Detect common patterns and return proper format
    prompt_lower = prompt.lower()
    
    if "one piece" in prompt_lower:
        return {
            "path": base_path,
            "filters": [
                {"type": "extension", "value": [".mp4", ".mkv", ".txt"]},
                {"type": "name_regex", "value": "7_(\\d+)"}
            ],
            "actions": [
                {"type": "rename", "value": "One Piece {1}"},
                {"type": "move", "value": "./anime"}
            ]
        }
    elif "organize" in prompt_lower or "sort" in prompt_lower:
        return {
            "path": base_path,
            "filters": [],
            "actions": []
        }
    else:
        return _heuristic_translate(prompt, base_path)
