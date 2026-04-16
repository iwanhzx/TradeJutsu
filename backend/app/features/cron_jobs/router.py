from fastapi import APIRouter, HTTPException

from app.config import settings
from app.features.cron_jobs import repo, service
from app.features.cron_jobs.models import CronScheduleResponse, CronScheduleUpdate
from app.features.jobs.models import JobCreated

router = APIRouter(prefix=f"{settings.api_prefix}/cron-jobs", tags=["cron-jobs"])


@router.get("", response_model=list[CronScheduleResponse])
async def list_schedules():
    return await service.get_schedules()


@router.patch("/{action_id}", response_model=CronScheduleResponse)
async def update_schedule(action_id: str, body: CronScheduleUpdate):
    existing = await repo.get_by_id(action_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Schedule '{action_id}' not found")
    return await service.update_schedule(action_id, body)


@router.post("/{action_id}/run", response_model=JobCreated, status_code=202)
async def trigger_schedule(action_id: str):
    existing = await repo.get_by_id(action_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Schedule '{action_id}' not found")
    job_id = await service.trigger_action(action_id)
    return JobCreated(job_id=job_id)
