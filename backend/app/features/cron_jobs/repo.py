from datetime import datetime, timezone

from app.core.sqlite import get_db


async def get_all() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM cron_schedules ORDER BY action_id"
        )
        return [dict(row) for row in await cursor.fetchall()]


async def get_by_id(action_id: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM cron_schedules WHERE action_id = ?", (action_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def update(action_id: str, enabled: bool | None = None, run_time: str | None = None) -> None:
    now = datetime.now(timezone.utc).isoformat()
    updates = ["updated_at = ?"]
    params: list = [now]

    if enabled is not None:
        updates.append("enabled = ?")
        params.append(1 if enabled else 0)
    if run_time is not None:
        updates.append("run_time = ?")
        params.append(run_time)

    params.append(action_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE cron_schedules SET {', '.join(updates)} WHERE action_id = ?",
            params,
        )
        await db.commit()


async def mark_run(action_id: str, job_id: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            "UPDATE cron_schedules SET last_run_at = ?, last_job_id = ?, updated_at = ? WHERE action_id = ?",
            (now, job_id, now, action_id),
        )
        await db.commit()
