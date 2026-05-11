import re
from datetime import datetime
from pathlib import Path
from ..models.job import Filter

def apply_filters(file, filters):
    for f in filters:
        filter_type = getattr(f, "type", None)
        field = getattr(f, "field", None) or filter_type
        operator = getattr(f, "operator", None)
        value = f.value

        if filter_type == "file_type":
            # file_type filter: "files", "folders", or "both"
            value_str = str(value).lower().strip()
            is_file = file.is_file()
            is_folder = file.is_dir()
            
            if value_str == "files" and not is_file:
                return False
            elif value_str == "folders" and not is_folder:
                return False
            elif value_str == "both":
                pass  # Accept both files and folders
        elif field == "extension" or filter_type == "extension" or field == "type":
            values = value if isinstance(value, list) else [v.strip() for v in str(value).split(",") if v.strip()]
            normalized = [v if str(v).startswith(".") else f".{v}" for v in values]
            if file.suffix.lower() not in {v.lower() for v in normalized}:
                return False
        elif field == "name" or filter_type in {"name_regex", "name_contains"}:
            if operator in {"regex", "name_regex"} or filter_type == "name_regex":
                if not re.search(str(value), file.name):
                    return False
            elif operator == "contains" or filter_type == "name_contains":
                if str(value).lower() not in file.name.lower():
                    return False
            else:
                if file.name != str(value):
                    return False
        elif field == "size" or filter_type in {"size_gt", "size_lt"}:
            size = file.stat().st_size
            try:
                threshold = int(value)
            except (TypeError, ValueError):
                threshold = 0

            if operator in {"<", "lt", "size_lt"} or filter_type == "size_lt":
                if size >= threshold:
                    return False
            else:
                if size <= threshold:
                    return False
        elif field == "date" or filter_type in {"date_gt", "date_lt"}:
            try:
                timestamp = datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
            except ValueError:
                continue

            modified = file.stat().st_mtime
            if operator in {"<", "before", "date_lt"} or filter_type == "date_lt":
                if modified >= timestamp:
                    return False
            else:
                if modified <= timestamp:
                    return False
    return True
