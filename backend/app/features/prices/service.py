"""Price data ingestion service.

Fetches OHLCV from yfinance, computes 3-way true range,
stores in DuckDB via background tasks with WebSocket progress.
"""

import asyncio
import logging
from datetime import datetime, timezone

import pandas as pd
import polars as pl
import yfinance as yf

from app.core.background import notify_data_updated
from app.features.prices import repo
from app.features.symbols import repo as symbols_repo
from app.features.jobs import service as jobs_service

logger = logging.getLogger(__name__)

INTERVAL_MAP = {
    "daily": "1d",
    "15min": "15m",
    "30min": "30m",
    "1hour": "1h",
}


def compute_true_range(df: pl.DataFrame) -> pl.DataFrame:
    """Compute 3-way true range and true_range_pct.

    TR = max(H-L, |H-prevC|, |L-prevC|)
    TR% = TR / prev_close * 100  (first row: TR / close * 100)
    """
    prev_close = df["close"].shift(1)
    h_l = df["high"] - df["low"]
    h_pc = (df["high"] - prev_close).abs()
    l_pc = (df["low"] - prev_close).abs()

    tr = pl.max_horizontal(h_l, h_pc, l_pc).fill_null(h_l)

    denom = prev_close.fill_null(df["close"])
    tr_pct = (tr / denom * 100).round(4)

    return df.with_columns([
        tr.alias("true_range"),
        tr_pct.alias("true_range_pct"),
    ])


def _fetch_yfinance_daily(symbol: str) -> pd.DataFrame:
    return yf.download(symbol, period="1y", auto_adjust=True, progress=False)


def _fetch_yfinance_intraday(symbol: str, interval: str) -> pd.DataFrame:
    yf_interval = INTERVAL_MAP.get(interval, interval)
    return yf.download(symbol, period="60d", interval=yf_interval, auto_adjust=True, progress=False)


async def fetch_daily(symbol: str) -> None:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(None, _fetch_yfinance_daily, symbol)

    if raw.empty:
        logger.warning(f"No daily data returned for {symbol}")
        return

    raw = raw.reset_index()
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = [col[0] if col[1] == "" else col[0] for col in raw.columns]

    df = pl.from_pandas(raw)

    col_map = {}
    for col in df.columns:
        lower = col.lower()
        if lower in ("date", "open", "high", "low", "close", "volume"):
            col_map[col] = lower
    df = df.rename(col_map)

    df = df.with_columns(pl.lit(symbol).alias("symbol"))
    df = df.with_columns((df["volume"].cast(pl.Float64) * df["close"]).alias("turnover"))
    df = compute_true_range(df)

    if df["date"].dtype != pl.Date:
        df = df.with_columns(pl.col("date").cast(pl.Date))

    df = df.select([
        "symbol", "date", "open", "high", "low", "close",
        pl.col("volume").cast(pl.Int64),
        "true_range", "true_range_pct", "turnover",
    ])

    await repo.upsert_daily(df)

    last_row = df.tail(1)
    if len(last_row) > 0:
        await symbols_repo.update_price(
            symbol,
            float(last_row["close"][0]),
            str(last_row["date"][0]),
        )

    await notify_data_updated("prices_daily", symbol)


async def fetch_intraday(symbol: str, interval: str) -> None:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(None, _fetch_yfinance_intraday, symbol, interval)

    if raw.empty:
        logger.warning(f"No intraday data returned for {symbol} ({interval})")
        return

    raw = raw.reset_index()
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = [col[0] if col[1] == "" else col[0] for col in raw.columns]

    df = pl.from_pandas(raw)

    col_map = {}
    for col in df.columns:
        lower = col.lower()
        if lower in ("datetime", "open", "high", "low", "close", "volume"):
            col_map[col] = lower
    df = df.rename(col_map)

    df = df.with_columns([
        pl.lit(symbol).alias("symbol"),
        pl.lit(interval).alias("interval"),
    ])
    df = df.with_columns((df["volume"].cast(pl.Float64) * df["close"]).alias("turnover"))
    df = compute_true_range(df)

    if "datetime" not in df.columns and "Datetime" in df.columns:
        df = df.rename({"Datetime": "datetime"})
    if df["datetime"].dtype != pl.Datetime:
        df = df.with_columns(pl.col("datetime").cast(pl.Datetime("us")))

    df = df.select([
        "symbol", "datetime", "interval", "open", "high", "low", "close",
        pl.col("volume").cast(pl.Int64),
        "true_range", "true_range_pct", "turnover",
    ])

    await repo.upsert_intraday(df)
    await notify_data_updated("prices_intraday", symbol)


async def fetch_daily_background(symbol: str, job_id: str) -> None:
    try:
        await jobs_service.update_progress(job_id, 0, 1, symbol)
        await fetch_daily(symbol)
        await jobs_service.update_progress(job_id, 1, 1, symbol)
        await jobs_service.complete_job(job_id)
    except Exception as e:
        logger.exception(f"Failed to fetch daily data for {symbol}")
        await jobs_service.fail_job(job_id, str(e))


async def fetch_intraday_background(symbol: str, interval: str, job_id: str) -> None:
    try:
        await jobs_service.update_progress(job_id, 0, 1, symbol)
        await fetch_intraday(symbol, interval)
        await jobs_service.update_progress(job_id, 1, 1, symbol)
        await jobs_service.complete_job(job_id)
    except Exception as e:
        logger.exception(f"Failed to fetch {interval} data for {symbol}")
        await jobs_service.fail_job(job_id, str(e))


async def fetch_all_background(interval: str, job_id: str) -> None:
    try:
        symbols = await symbols_repo.get_all()
        active = [s for s in symbols if s.get("is_active", True)]
        total = len(active)

        for i, sym in enumerate(active):
            symbol = sym["symbol"]
            try:
                if interval == "daily":
                    await fetch_daily(symbol)
                else:
                    await fetch_intraday(symbol, interval)
            except Exception as e:
                logger.warning(f"Failed to fetch {interval} for {symbol}: {e}")

            await jobs_service.update_progress(job_id, i + 1, total, symbol)

        await jobs_service.complete_job(job_id)
    except Exception as e:
        logger.exception(f"Bulk fetch failed for interval {interval}")
        await jobs_service.fail_job(job_id, str(e))
