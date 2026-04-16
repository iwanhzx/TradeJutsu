import polars as pl
from app.core import duckdb as db


async def get_atr_summary(
    interval: str | None = None, symbol: str | None = None
) -> pl.DataFrame:
    query = "SELECT * FROM atr_summary WHERE 1=1"
    params = []
    if interval:
        query += " AND interval = ?"
        params.append(interval)
    if symbol:
        query += " AND symbol = ?"
        params.append(symbol)
    query += " ORDER BY symbol, interval, period_days"
    return await db.read_polars(query, params if params else None)


async def upsert_atr_summary(df: pl.DataFrame) -> None:
    await db.write_polars("atr_summary", df)


async def get_daily_turnover(symbol: str, days: int) -> float | None:
    rows = await db.read(
        """SELECT AVG(turnover) as avg_turnover
           FROM (SELECT turnover FROM prices_daily
                 WHERE symbol = ? ORDER BY date DESC LIMIT ?)""",
        [symbol, days],
    )
    if rows and rows[0][0] is not None:
        return float(rows[0][0])
    return None


async def get_prices_for_atr(
    symbol: str, interval: str, limit_days: int
) -> pl.DataFrame:
    if interval == "daily":
        return await db.read_polars(
            """SELECT date, open, high, low, close, true_range, true_range_pct
               FROM prices_daily WHERE symbol = ?
               ORDER BY date DESC LIMIT ?""",
            [symbol, limit_days],
        )
    else:
        return await db.read_polars(
            """SELECT datetime, open, high, low, close, true_range, true_range_pct
               FROM prices_intraday WHERE symbol = ? AND interval = ?
               ORDER BY datetime DESC LIMIT ?""",
            [symbol, interval, limit_days * 20],
        )
