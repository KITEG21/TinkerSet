"""Smoke test for core app imports and preview logic."""
from pathlib import Path
import json
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


def main() -> None:
    try:
        from app.models.job import Job
        from app.services.processor import process_job
        print("[OK] Core imports successful")

        job_path = PROJECT_ROOT / "job.json"
        if job_path.exists():
            with job_path.open("r", encoding="utf-8") as f:
                job_data = json.load(f)
            job = Job(**job_data)
            print(f"[OK] Job loaded: {job.path}, {len(job.filters)} filters, {len(job.actions)} actions")

            results = process_job(job, dry_run=True)
            print(f"[OK] Preview successful: {len(results)} files matched")
        else:
            print("[WARN] job.json not found, skipping job test")
    except Exception as exc:
        print(f"[ERROR] Error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
