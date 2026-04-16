import uuid
from datetime import datetime, timezone

from app.core.sqlite import get_db


async def create_job(job_type: str, symbol: str | None = None) -> str:
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            """INSERT INTO jobs (job_id, job_type, symbol, status, created_at, updated_at)
               VALUES (?, ?, ?, 'pending', ?, ?)""",
            (job_id, job_type, symbol, now, now),
        )
        await db.commit()
    return job_id


async def update_job(
    job_id: str,
    status: str | None = None,
    progress: int | None = None,
    total_items: int | None = None,
    completed_items: int | None = None,
    error: str | None = None,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    updates = ["updated_at = ?"]
    params: list = [now]

    if status is not None:
        updates.append("status = ?")
        params.append(status)
        if status in ("done", "failed"):
            updates.append("completed_at = ?")
            params.append(now)
    if progress is not None:
        updates.append("progress = ?")
        params.append(progress)
    if total_items is not None:
        updates.append("total_items = ?")
        params.append(total_items)
    if completed_items is not None:
        updates.append("completed_items = ?")
        params.append(completed_items)
    if error is not None:
        updates.append("error = ?")
        params.append(error)

    params.append(job_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE jobs SET {', '.join(updates)} WHERE job_id = ?",
            params,
        )
        await db.commit()


async def get_job(job_id: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,))
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)


async def get_jobs(limit: int = 30) -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
