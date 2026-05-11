import argparse
import json
from pathlib import Path  # add this for path handling if needed
from .services.llm_service import interpret_prompt
from .models.job import Job  # relative import for app.models.job
from .services.processor import process_job  # relative import for app.services.processor


def load_job(job_file: str) -> Job:
    job_path = Path(job_file).resolve()
    with job_path.open("r", encoding="utf-8") as f:
        job_data = json.load(f)
    return Job(**job_data)

def main():
    parser = argparse.ArgumentParser(description="Intelligent File Organizer CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Preview command
    preview_parser = subparsers.add_parser("preview", help="Preview job changes (dry run)")
    preview_parser.add_argument("job_file", type=str, help="Path to JSON job file")

    # Execute command
    execute_parser = subparsers.add_parser("execute", help="Execute job changes")
    execute_parser.add_argument("job_file", type=str, help="Path to JSON job file")

    # AI command (optional)
    ai_parser = subparsers.add_parser("ai", help="Interpret natural language prompt via LLM")
    ai_parser.add_argument("prompt", type=str, help="Natural language prompt")
    ai_parser.add_argument("--path", type=str, default=None, help="Target folder path")
    ai_parser.add_argument("--provider", type=str, default=None, choices=["ollama", "groq"], help="LLM provider")
    ai_parser.add_argument("--model", type=str, default=None, help="Model name")

    args = parser.parse_args()

    if args.command == "preview":
        job = load_job(args.job_file)
        results = process_job(job, dry_run=True)
        print(json.dumps(results, indent=2))
    elif args.command == "execute":
        job = load_job(args.job_file)
        confirm = input("Apply changes? (y/n): ")
        if confirm.lower() == "y":
            results = process_job(job, dry_run=False)
            print(json.dumps(results, indent=2))
        else:
            print("Execution cancelled")
    elif args.command == "ai":
        result = interpret_prompt(args.prompt, args.path, args.provider, args.model)
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
