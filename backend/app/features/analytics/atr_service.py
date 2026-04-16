"""ATR computation service using Wilder's smoothing and simple mean.

Wilder's:
  ATR[0] = mean(TR[0:N])
  ATR[i] = ATR[i-1] * (N-1)/N + TR[i]/N
"""

import logging
from datetime import datetime, timezone

import polars as pl

from app.features.analytics import repo
from app.features.symbols import repo as symbols_repo
from app.features.jobs import service as jobs_service
from app.core.background import notify_data_updated

logger = logging.getLogger(__name__)

ATR_PERIODS = [1, 7, 14, 30, 90, 180]


def compute_wilder_atr(true_ranges: list[float], period: int) -> list[float]:
    """Compute Wilder's exponentially smoothed ATR.

    Returns list of ATR values. Length = len(true_ranges) - period + 1,
    or empty if insufficient data.
    """
    if len(true_ranges) < period:
        return []

    seed = sum(true_ranges[:period]) / period
    result = [seed]

    for i in range(period, len(true_ranges)):
        prev = result[-1]
        atr = prev * (period - 1) / period + true_ranges[i] / period
        result.append(atr)

    return result


async def calculate_atr(interval: str) -> None:
    symbols = await symbols_repo.get_all()
    active = [s for s in symbols if s.get("is_active", True)]
    logger.info("Calculating ATR for interval=%s across %d symbols", interval, len(active))
    now = datetime.now(timezone.utc).isoformat()

    results = []

    for sym in active:
        symbol = sym["symbol"]
        try:
            prices = await repo.get_prices_for_atr(symbol, interval, max(ATR_PERIODS) + 10)

            if len(prices) == 0:
                continue

            if "date" in prices.columns:
                prices = prices.sort("date")
            else:
                prices = prices.sort("datetime")

            tr_values = prices["true_range"].drop_nulls().to_list()
            tr_pct_values = prices["true_range_pct"].drop_nulls().to_list()

            for period in ATR_PERIODS:
                if len(tr_values) < period:
                    continue

                wilder_values = compute_wilder_atr(tr_values, period)
                wilder_pct_values = compute_wilder_atr(tr_pct_values, period)
                atr_wilder = wilder_values[-1] if wilder_values else None
                atr_pct_wilder = wilder_pct_values[-1] if wilder_pct_values else None

                recent_tr = tr_values[-period:]
                recent_tr_pct = tr_pct_values[-period:]
                atr_with_open = sum(recent_tr) / len(recent_tr)
                atr_pct_with_open = sum(recent_tr_pct) / len(recent_tr_pct)

                atr_exclude_open = atr_with_open
                atr_pct_exclude_open = atr_pct_with_open

                if interval != "daily" and "datetime" in prices.columns:
                    prices_with_date = prices.with_columns(
                        pl.col("datetime").cast(pl.Date).alias("_date")
                    )
                    first_bars = prices_with_date.group_by("_date").agg(
                        pl.col("datetime").min().alias("first_dt")
                    )
                    first_dts = set(first_bars["first_dt"].to_list())
                    mask = [dt not in first_dts for dt in prices["datetime"].to_list()]
                    filtered = prices.filter(pl.Series(mask))

                    if len(filtered) >= period:
                        tr_no_ob = filtered["true_range"].drop_nulls().to_list()[-period:]
                        tr_pct_no_ob = filtered["true_range_pct"].drop_nulls().to_list()[-period:]
                        if tr_no_ob:
                            atr_exclude_open = sum(tr_no_ob) / len(tr_no_ob)
                            atr_pct_exclude_open = sum(tr_pct_no_ob) / len(tr_pct_no_ob)

                results.append({
                    "symbol": symbol,
                    "interval": interval if interval != "daily" else "daily",
                    "period_days": period,
                    "atr_wilder": round(atr_wilder, 4) if atr_wilder else None,
                    "atr_pct_wilder": round(atr_pct_wilder, 4) if atr_pct_wilder else None,
                    "atr_with_open": round(atr_with_open, 4),
                    "atr_pct_with_open": round(atr_pct_with_open, 4),
                    "atr_exclude_open": round(atr_exclude_open, 4),
                    "atr_pct_exclude_open": round(atr_pct_exclude_open, 4),
                    "last_price_update": sym.get("latest_price_date"),
                    "calculated_at": now,
                })

        except Exception as e:
            logger.warning(f"ATR calculation failed for {symbol}: {e}")

    if results:
        df = pl.DataFrame(results)
        await repo.upsert_atr_summary(df)
        logger.info("ATR calculation complete: %d results stored", len(results))
        await notify_data_updated("atr_summary")


async def calculate_atr_background(interval: str, job_id: str) -> None:
    try:
        await jobs_service.update_progress(job_id, 0, 1)
        await calculate_atr(interval)
        await jobs_service.complete_job(job_id)
    except Exception as e:
        logger.exception(f"ATR calculation failed for {interval}")
        await jobs_service.fail_job(job_id, str(e))
