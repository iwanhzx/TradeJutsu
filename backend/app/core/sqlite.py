"""SQLite connection manager for app state (symbols, jobs, config).

Uses aiosqlite for async compatibility with FastAPI.
WAL mode enabled for concurrent read/write.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import aiosqlite

from app.config import settings


_db_path: str = str(settings.sqlite_path)


@asynccontextmanager
async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    settings.database_dir.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(_db_path)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_schema() -> None:
    async with get_db() as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA busy_timeout=5000")

        await db.execute("""
            CREATE TABLE IF NOT EXISTS symbols (
                symbol TEXT PRIMARY KEY,
                name TEXT,
                sector TEXT,
                currency TEXT,
                is_active INTEGER DEFAULT 1,
                is_worth_trade_daily INTEGER DEFAULT 0,
                latest_price REAL,
                latest_price_date TEXT,
                added_at TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                job_type TEXT NOT NULL,
                symbol TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                progress INTEGER DEFAULT 0,
                total_items INTEGER DEFAULT 0,
                completed_items INTEGER DEFAULT 0,
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS app_config (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT NOT NULL
            )
        """)

        await db.commit()


def override_db_path(path: str) -> None:
    global _db_path
    _db_path = path
