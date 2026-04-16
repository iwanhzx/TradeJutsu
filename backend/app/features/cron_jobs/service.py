import asyncio
import json
import logging
from datetime import datetime, timedelta

from app.core.sqlite import get_db
from app.features.cron_jobs import repo
from app.features.cron_jobs.models import CronScheduleResponse, CronScheduleUpdate
from app.features.jobs import service as jobs_service

logger = logging.getLogger(__name__)


def _compute_next_run(enabled: bool, run_time: str, last_run_at: str | None) -> str | None:
    if not enabled:
        return None
    now = datetime.now()
    h, m = map(int, run_time.split(":"))
    today_run = now.replace(hour=h, minute=m, second=0, microsecond=0)
    already_ran_today = (
        last_run_at is not None and last_run_at[:10] == now.date().isoformat()
    )
    if now < today_run and not already_ran_today:
        return today_run.isoformat()
    return (today_run + timedelta(days=1)).isoformat()


def _row_to_response(row: dict) -> CronScheduleResponse:
    enabled = bool(row["enabled"])
    return CronScheduleResponse(
        action_id=row["action_id"],
        label=row["label"],
        enabled=enabled,
        run_time=row["run_time"],
        last_run_at=row["last_run_at"],
        last_job_id=row["last_job_id"],
        next_run_at=_compute_next_run(enabled, row["run_time"], row["last_run_at"]),
    )


async def get_schedules() -> list[CronScheduleResponse]:
    rows = await repo.get_all()
    return [_row_to_response(r) for r in rows]


async def update_schedule(action_id: str, update: CronScheduleUpdate) -> CronScheduleResponse:
    await repo.update(action_id, enabled=update.enabled, run_time=update.run_time)
    row = await repo.get_by_id(action_id)
    return _row_to_response(row)


async def trigger_action(action_id: str) -> str:
    registry = {
        "atr_calculate": _run_atr_calculate,
        "wtd_check": _run_wtd_check,
        "fetch_daily": lambda: _run_fetch_all("daily"),
        "fetch_1hour": lambda: _run_fetch_all("1hour"),
        "fetch_30min": lambda: _run_fetch_all("30min"),
        "fetch_15min": lambda: _run_fetch_all("15min"),
    }
    runner = registry.get(action_id)
    if runner is None:
        raise ValueError(f"Unknown action: {action_id}")
    job_id = await runner()
    await repo.mark_run(action_id, job_id)
    return job_id


async def _run_fetch_all(interval: str) -> str:
    from app.features.prices import service as prices_service

    job_id = await jobs_service.create_job(f"fetch_all_{interval}")
    asyncio.create_task(prices_service.fetch_all_background(interval, job_id))
    return job_id


async def _run_atr_calculate() -> str:
    from app.features.analytics import atr_service

    job_id = await jobs_service.create_job("atr_calc_all")
    asyncio.create_task(atr_service.calculate_all_atr_background(job_id))
    return job_id


async def _run_wtd_check() -> str:
    from app.features.analytics import wtd_service
    from app.features.analytics.models import WtdSettings

    # Load WTD settings (same logic as analytics router)
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT value FROM app_config WHERE key = ?", ("wtd_settings",)
        )
        row = await cursor.fetchone()
        settings = WtdSettings(**json.loads(row[0])) if row else WtdSettings()

    job_id = await jobs_service.create_job("wtd_check")
    asyncio.create_task(wtd_service.evaluate_wtd_background(job_id, settings))
    return job_id
