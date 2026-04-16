"""Background task helpers with WebSocket + job integration."""

import logging
from typing import Any

from app.core.websocket import ws_manager

logger = logging.getLogger(__name__)


async def notify_job_started(job_id: str, job_type: str, symbol: str | None = None) -> None:
    msg: dict[str, Any] = {"type": "job:started", "job_id": job_id, "job_type": job_type}
    if symbol:
        msg["symbol"] = symbol
    await ws_manager.broadcast(msg)


async def notify_job_progress(
    job_id: str, completed: int, total: int, symbol: str | None = None
) -> None:
    msg: dict[str, Any] = {
        "type": "job:progress",
        "job_id": job_id,
        "completed": completed,
        "total": total,
    }
    if symbol:
        msg["symbol"] = symbol
    await ws_manager.broadcast(msg)


async def notify_job_complete(job_id: str) -> None:
    await ws_manager.broadcast({"type": "job:complete", "job_id": job_id, "status": "done"})


async def notify_job_error(job_id: str, error: str) -> None:
    await ws_manager.broadcast({"type": "job:error", "job_id": job_id, "error": error})


async def notify_data_updated(table: str, symbol: str | None = None) -> None:
    msg: dict[str, Any] = {"type": "data:updated", "table": table}
    if symbol:
        msg["symbol"] = symbol
    await ws_manager.broadcast(msg)
