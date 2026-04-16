from app.features.jobs import repo
from app.core.background import (
    notify_job_started,
    notify_job_progress,
    notify_job_complete,
    notify_job_error,
)


async def create_job(job_type: str, symbol: str | None = None) -> str:
    job_id = await repo.create_job(job_type, symbol)
    await notify_job_started(job_id, job_type, symbol)
    return job_id


async def update_progress(job_id: str, completed: int, total: int, symbol: str | None = None):
    progress = int((completed / total) * 100) if total > 0 else 0
    await repo.update_job(
        job_id, status="running", progress=progress,
        total_items=total, completed_items=completed,
    )
    await notify_job_progress(job_id, completed, total, symbol)


async def complete_job(job_id: str):
    await repo.update_job(job_id, status="done", progress=100)
    await notify_job_complete(job_id)


async def fail_job(job_id: str, error: str):
    await repo.update_job(job_id, status="failed", error=error)
    await notify_job_error(job_id, error)


async def get_job(job_id: str) -> dict | None:
    return await repo.get_job(job_id)


async def get_jobs(limit: int = 50) -> list[dict]:
    return await repo.get_jobs(limit)
