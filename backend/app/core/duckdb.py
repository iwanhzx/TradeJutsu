"""DuckDB connection manager for market data.

DuckDB is synchronous. All calls must be wrapped in run_in_executor
when used from async FastAPI handlers. Reads are concurrent-safe.
Writes are serialized via asyncio.Lock.
"""

import asyncio
from functools import partial
from pathlib import Path

import duckdb
import polars as pl

from app.config import settings


_write_lock = asyncio.Lock()
_db_path: str = str(settings.duckdb_path)


def _get_connection() -> duckdb.DuckDBPyConnection:
    settings.database_dir.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(_db_path)


def _execute_read(query: str, params: list | None = None) -> list[tuple]:
    conn = _get_connection()
    try:
        if params:
            return conn.execute(query, params).fetchall()
        return conn.execute(query).fetchall()
    finally:
        conn.close()


def _execute_read_polars(query: str, params: list | None = None) -> pl.DataFrame:
    conn = _get_connection()
    try:
        if params:
            result = conn.execute(query, params)
        else:
            result = conn.execute(query)
        try:
            return result.pl()
        except Exception:
            return pl.DataFrame()
    finally:
        conn.close()


def _execute_write(query: str, params: list | None = None) -> None:
    conn = _get_connection()
    try:
        conn.begin()
        if params:
            conn.execute(query, params)
        else:
            conn.execute(query)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _execute_write_many(query: str, params_list: list[list]) -> None:
    conn = _get_connection()
    try:
        conn.begin()
        conn.executemany(query, params_list)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _execute_write_from_polars(table: str, df: pl.DataFrame) -> None:
    conn = _get_connection()
    try:
        conn.begin()
        conn.register("df_to_insert", df.to_arrow())
        conn.execute(f"INSERT OR REPLACE INTO {table} SELECT * FROM df_to_insert")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


async def read(query: str, params: list | None = None) -> list[tuple]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, partial(_execute_read, query, params))


async def read_polars(query: str, params: list | None = None) -> pl.DataFrame:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, partial(_execute_read_polars, query, params))


async def write(query: str, params: list | None = None) -> None:
    async with _write_lock:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, partial(_execute_write, query, params))


async def write_many(query: str, params_list: list[list]) -> None:
    async with _write_lock:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, partial(_execute_write_many, query, params_list))


async def write_polars(table: str, df: pl.DataFrame) -> None:
    async with _write_lock:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, partial(_execute_write_from_polars, table, df))


def init_schema() -> None:
    conn = _get_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS prices_daily (
                symbol VARCHAR NOT NULL,
                date DATE NOT NULL,
                open DOUBLE,
                high DOUBLE,
                low DOUBLE,
                close DOUBLE,
                volume BIGINT,
                true_range DOUBLE,
                true_range_pct DOUBLE,
                turnover DOUBLE,
                PRIMARY KEY (symbol, date)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS prices_intraday (
                symbol VARCHAR NOT NULL,
                datetime TIMESTAMP NOT NULL,
                interval VARCHAR NOT NULL,
                open DOUBLE,
                high DOUBLE,
                low DOUBLE,
                close DOUBLE,
                volume BIGINT,
                true_range DOUBLE,
                true_range_pct DOUBLE,
                turnover DOUBLE,
                PRIMARY KEY (symbol, datetime, interval)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS atr_summary (
                symbol VARCHAR NOT NULL,
                interval VARCHAR NOT NULL,
                period_days INTEGER NOT NULL,
                atr_wilder DOUBLE,
                atr_pct_wilder DOUBLE,
                atr_with_open DOUBLE,
                atr_pct_with_open DOUBLE,
                atr_exclude_open DOUBLE,
                atr_pct_exclude_open DOUBLE,
                last_price_update TIMESTAMP,
                calculated_at TIMESTAMP,
                PRIMARY KEY (symbol, interval, period_days)
            )
        """)
    finally:
        conn.close()


def override_db_path(path: str) -> None:
    global _db_path
    _db_path = path
