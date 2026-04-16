import asyncio
import logging
from datetime import datetime

from app.features.cron_jobs import repo, service

logger = logging.getLogger(__name__)


async def start_scheduler() -> None:
    logger.info("Cron scheduler started")
    while True:
        await asyncio.sleep(60)
        try:
            await _check_and_run()
        except Exception:
            logger.exception("Cron scheduler tick failed")


async def _check_and_run() -> None:
    now = datetime.now()
    for s in await repo.get_all():
        if not s["enabled"]:
            continue
        h, m = map(int, s["run_time"].split(":"))
        if now.hour == h and now.minute == m:
            if s["last_run_at"] and s["last_run_at"][:10] == now.date().isoformat():
                continue
            logger.info("Cron triggering %s", s["action_id"])
            try:
                job_id = await service.trigger_action(s["action_id"])
                logger.info("Cron triggered %s -> job %s", s["action_id"], job_id)
            except Exception:
                logger.exception("Cron trigger failed for %s", s["action_id"])
