import polars as pl
from app.core import duckdb as db


async def get_daily(symbol: str, start: str | None = None, end: str | None = None) -> pl.DataFrame:
    query = "SELECT * FROM prices_daily WHERE symbol = ?"
    params = [symbol]
    if start:
        query += " AND date >= ?"
        params.append(start)
    if end:
        query += " AND date <= ?"
        params.append(end)
    query += " ORDER BY date"
    return await db.read_polars(query, params)


async def get_intraday(
    symbol: str, interval: str, start: str | None = None, end: str | None = None
) -> pl.DataFrame:
    query = "SELECT * FROM prices_intraday WHERE symbol = ? AND interval = ?"
    params = [symbol, interval]
    if start:
        query += " AND datetime >= ?"
        params.append(start)
    if end:
        query += " AND datetime <= ?"
        params.append(end)
    query += " ORDER BY datetime"
    return await db.read_polars(query, params)


async def upsert_daily(df: pl.DataFrame) -> None:
    await db.write_polars("prices_daily", df)


async def upsert_intraday(df: pl.DataFrame) -> None:
    await db.write_polars("prices_intraday", df)
