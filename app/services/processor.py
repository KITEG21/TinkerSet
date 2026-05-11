from pathlib import Path
from ..models.job import Job
from .filter_engine import apply_filters
from .action_engine import apply_actions, preview_actions

def process_job(job, dry_run=True):
    base_path = Path(job.path)
    if not base_path.exists() or not base_path.is_dir():
        return [{
            "original": str(base_path),
            "status": "path_not_found",
        }]

    # Check if any filter specifies file_type
    has_file_type_filter = any(
        getattr(f, "type", None) == "file_type"
        for f in job.filters
    )
    
    # If file_type filter is present, include both files and folders; otherwise only files
    if has_file_type_filter:
        items = sorted(
            (path for path in base_path.rglob("*")),
            key=lambda path: str(path).lower(),
        )
    else:
        items = sorted(
            (path for path in base_path.rglob("*") if path.is_file()),
            key=lambda path: str(path).lower(),
        )
    results = []

    # Check if any action uses number_sequential mode
    has_number_sequential = any(
        action.type == "rename" and getattr(action, "renameMode", None) == "number_sequential"
        for action in job.actions
    )

    # For number_sequential, we need to collect and sort matched items first
    if has_number_sequential:
        matched_items = []
        for item in items:
            if apply_filters(item, job.filters):
                matched_items.append(item)
        
        # matched_items are already sorted from the main items list
        total_matched = len(matched_items)
        
        for index, item in enumerate(matched_items):
            if dry_run:
                results.append({
                    "original": str(item.relative_to(base_path)),
                    "result": str(preview_actions(item, job.actions, job.filters, file_index=index, file_count=total_matched)),
                    "status": "matched"
                })
            else:
                result = apply_actions(item, job.actions, job.filters, file_index=index, file_count=total_matched)
                results.append({
                    "original": str(item.relative_to(base_path)),
                    "result": str(result)
                })
    else:
        # Original behavior for non-sequential actions
        for item in items:
            if not apply_filters(item, job.filters):
                continue
            if dry_run:
                results.append({
                    "original": str(item.relative_to(base_path)),
                    "result": str(preview_actions(item, job.actions, job.filters)),
                    "status": "matched"
                })
            else:
                result = apply_actions(item, job.actions, job.filters)
                results.append({
                    "original": str(item.relative_to(base_path)),
                    "result": str(result)
                })
    return results
