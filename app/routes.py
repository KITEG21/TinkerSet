from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from .models.job import Job
from .services.processor import process_job
from .services.llm_service import interpret_prompt

router = APIRouter()


class InterpretRequest(BaseModel):
    prompt: str
    path: str | None = None
    provider: str | None = None
    model: str | None = None


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/preview")
def preview(job: Job):
    return process_job(job, dry_run=True)


@router.post("/execute")
def execute(job: Job):
    return process_job(job, dry_run=False)


@router.post("/ai/interpret")
def interpret(payload: InterpretRequest):
    try:
        job_dict = interpret_prompt(
            prompt=payload.prompt,
            path=payload.path,
            provider=payload.provider,
            model=payload.model,
        )
        job = Job.model_validate(job_dict)
        return job.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
