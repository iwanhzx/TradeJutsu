"""SQLite connection manager for app state (symbols, jobs, config).

Uses aiosqlite for async compatibility with FastAPI.
WAL mode enabled for concurrent read/write.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

import aiosqlite

from app.config import settings

logger = logging.getLogger(__name__)


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
    logger.info("Initializing SQLite schema at %s (WAL mode)", _db_path)
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
                updated_at TEXT NOT NULL,
                completed_at TEXT
            )
        """)

        # Migration: add completed_at to existing jobs table
        cursor = await db.execute("PRAGMA table_info(jobs)")
        cols = {row[1] for row in await cursor.fetchall()}
        if "completed_at" not in cols:
            await db.execute("ALTER TABLE jobs ADD COLUMN completed_at TEXT")

        await db.execute("""
            CREATE TABLE IF NOT EXISTS app_config (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS cron_schedules (
                action_id   TEXT PRIMARY KEY,
                label       TEXT NOT NULL,
                enabled     INTEGER DEFAULT 0,
                run_time    TEXT NOT NULL,
                last_run_at TEXT,
                last_job_id TEXT,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            )
        """)

        # Seed default cron schedules
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT OR IGNORE INTO cron_schedules (action_id, label, enabled, run_time, created_at, updated_at) "
            "VALUES (?, ?, 0, '06:00', ?, ?)",
            ("atr_calculate", "Calculate ATR", now, now),
        )
        await db.execute(
            "INSERT OR IGNORE INTO cron_schedules (action_id, label, enabled, run_time, created_at, updated_at) "
            "VALUES (?, ?, 0, '06:00', ?, ?)",
            ("wtd_check", "WTD Check", now, now),
        )
        await db.execute(
            "INSERT OR IGNORE INTO cron_schedules (action_id, label, enabled, run_time, created_at, updated_at) "
            "VALUES (?, ?, 0, '07:00', ?, ?)",
            ("fetch_daily", "Fetch All Daily", now, now),
        )
        await db.execute(
            "INSERT OR IGNORE INTO cron_schedules (action_id, label, enabled, run_time, created_at, updated_at) "
            "VALUES (?, ?, 0, '07:00', ?, ?)",
            ("fetch_1hour", "Fetch All 1H", now, now),
        )
        await db.execute(
            "INSERT OR IGNORE INTO cron_schedules (action_id, label, enabled, run_time, created_at, updated_at) "
            "VALUES (?, ?, 0, '07:00', ?, ?)",
            ("fetch_30min", "Fetch All 30M", now, now),
        )
        await db.execute(
            "INSERT OR IGNORE INTO cron_schedules (action_id, label, enabled, run_time, created_at, updated_at) "
            "VALUES (?, ?, 0, '07:00', ?, ?)",
            ("fetch_15min", "Fetch All 15M", now, now),
        )

        await db.commit()


def override_db_path(path: str) -> None:
    global _db_path
    _db_path = path
