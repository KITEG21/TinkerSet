import re
import shutil
from pathlib import Path
from typing import List, Optional
from ..models.job import Action, Filter


def _get_unique_path(dest_path: Path) -> Path:
    """Ensure destination path is unique to avoid overwrites."""
    if not dest_path.exists():
        return dest_path
    base = dest_path.stem
    ext = dest_path.suffix
    parent = dest_path.parent
    counter = 1
    while True:
        new_path = parent / f"{base} ({counter}){ext}"
        if not new_path.exists():
            return new_path
        counter += 1


def _build_renamed_filename(template: str, current_path: Path, match: Optional[re.Match]) -> str:
    """Build a file name from a user template.

    Supported placeholders:
    - {name} or {stem}: current file name without extension
    - {ext}: extension without dot
    - {suffix}: extension with dot
    - {1}, {2}, ...: regex capture groups when name_regex is present
    """
    new_name = template

    if match:
        for i, group in enumerate(match.groups(), 1):
            new_name = new_name.replace(f"{{{i}}}", group)

    stem = current_path.stem
    suffix = current_path.suffix
    new_name = (
        new_name
        .replace("{name}", stem)
        .replace("{stem}", stem)
        .replace("{ext}", suffix.lstrip("."))
        .replace("{suffix}", suffix)
    )

    # Preserve extension unless the template already includes one.
    if not Path(new_name).suffix:
        new_name = f"{new_name}{suffix}"

    return new_name


def _build_replaced_filename(current_path: Path, find: str, replace: str) -> str:
    """Replace part of the current file stem while keeping the extension."""
    stem = current_path.stem
    suffix = current_path.suffix
    find_text = str(find or "")
    replace_text = str(replace or "")

    if not find_text:
        new_stem = replace_text or stem
    elif stem.startswith(find_text):
        new_stem = f"{replace_text}{stem[len(find_text):]}"
    else:
        new_stem = stem.replace(find_text, replace_text, 1)

    if not new_stem:
        return current_path.name

    return f"{new_stem}{suffix}"


def _plan_rename(current_path: Path, action: Action, file_index: Optional[int], name_regex: Optional[str] = None) -> str:
    rename_mode = getattr(action, "renameMode", None) or "replace"

    if rename_mode == "number_sequential":
        if file_index is None:
            raise ValueError("number_sequential rename requires file_index parameter")

        start_num = int(str(action.value or "1").strip())
        padding = getattr(action, "padding", None) or 0
        prefix = getattr(action, "prefix", None) or ""
        suffix_text = getattr(action, "suffix", None) or ""

        new_number = start_num + file_index
        num_str = str(new_number).zfill(padding) if padding > 0 else str(new_number)
        file_ext = current_path.suffix if current_path.is_file() else ""
        return f"{prefix}{num_str}{suffix_text}{file_ext}"

    if rename_mode == "template":
        template = str(action.value or "").strip()
        if not template:
            return current_path.name

        match = re.search(name_regex, current_path.name) if name_regex else None
        if name_regex and not match and any(token in template for token in ["{1}", "{2}", "{3}"]):
            return current_path.name

        return _build_renamed_filename(template, current_path, match)

    return _build_replaced_filename(current_path, getattr(action, "find", None) or "", getattr(action, "replace", None) or "")


def preview_actions(file: Path, actions: List[Action], filters: List[Filter], file_index: Optional[int] = None, file_count: Optional[int] = None) -> Path:
    """Compute the final path for a file without changing the filesystem."""
    current_path = file
    name_regex = None
    for f in filters:
        if f.type == "name_regex":
            name_regex = f.value
            break

    for action in actions:
        if action.type == "rename":
            rename_mode = getattr(action, "renameMode", None) or "replace"

            if rename_mode == "number_sequential":
                new_name = _plan_rename(current_path, action, file_index, name_regex)
            elif rename_mode == "template":
                template = str(action.value or "").strip()
                if not template:
                    continue

                match = re.search(name_regex, current_path.name) if name_regex else None
                if name_regex and not match and any(token in template for token in ["{1}", "{2}", "{3}"]):
                    continue

                new_name = _build_renamed_filename(template, current_path, match)
            else:
                new_name = _build_replaced_filename(current_path, getattr(action, "find", None) or "", getattr(action, "replace", None) or "")

            current_path = current_path.parent / new_name

        elif action.type == "move":
            dest_dir = Path(action.value)
            current_path = dest_dir / current_path.name

        elif action.type == "copy":
            dest_dir = Path(action.value)
            current_path = dest_dir / current_path.name

        elif action.type == "delete":
            break

    return current_path


def apply_actions(file: Path, actions: List[Action], filters: List[Filter], file_index: Optional[int] = None, file_count: Optional[int] = None) -> Path:
    """Apply a sequence of actions to a file.
    
    Args:
        file: The file to process
        actions: List of actions to apply
        filters: List of filters (used for regex matching)
        file_index: For sequential numbering, the 0-based index of this file in the sorted list
        file_count: For sequential numbering, the total count of files being processed
    """
    current_path = file
    name_regex = None
    for f in filters:
        if f.type == "name_regex":
            name_regex = f.value
            break

    for action in actions:
        if action.type == "rename":
            new_name = _plan_rename(current_path, action, file_index, name_regex)

            new_path = current_path.parent / new_name
            new_path = _get_unique_path(new_path)
            current_path.rename(new_path)
            current_path = new_path

        elif action.type == "move":
            dest_dir = Path(action.value)
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest_path = dest_dir / current_path.name
            dest_path = _get_unique_path(dest_path)
            shutil.move(str(current_path), str(dest_path))
            current_path = dest_path

        elif action.type == "copy":
            dest_dir = Path(action.value)
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest_path = dest_dir / current_path.name
            dest_path = _get_unique_path(dest_path)
            shutil.copy2(str(current_path), str(dest_path))
            # Note: current_path stays the same for copy (original remains)

        elif action.type == "delete":
            if current_path.exists():
                current_path.unlink()
            # Return the deleted path as reference (file no longer exists)

    return current_path
