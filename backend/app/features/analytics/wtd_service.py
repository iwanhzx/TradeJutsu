"""Worth-Trade-Daily evaluation service.

Criteria (all must pass):
- Turnover: avg daily turnover >= 50B IDR for both 1W and 2W
- ATR: >= 3 of 4 conditions:
  - 1H ATR 1W: atr_exclude_open >= 5 AND atr_pct_exclude_open >= 2%
  - 1H ATR 2W: atr_exclude_open >= 5 AND atr_pct_exclude_open >= 2%
  - Daily ATR 1W: atr_pct_exclude_open >= 8%
  - Daily ATR 2W: atr_pct_exclude_open >= 8%
"""

import logging

from app.features.analytics import repo
from app.features.symbols import repo as symbols_repo
from app.features.jobs import service as jobs_service
from app.core.background import notify_data_updated

logger = logging.getLogger(__name__)

TURNOVER_THRESHOLD = 50_000_000_000


async def evaluate_wtd() -> list[dict]:
    symbols = await symbols_repo.get_all()
    active = [s for s in symbols if s.get("is_active", True)]

    atr_df = await repo.get_atr_summary()
    results = []

    for sym in active:
        symbol = sym["symbol"]

        turnover_1w = await repo.get_daily_turnover(symbol, 5)
        turnover_2w = await repo.get_daily_turnover(symbol, 10)
        turnover_pass = (
            turnover_1w is not None
            and turnover_2w is not None
            and turnover_1w >= TURNOVER_THRESHOLD
            and turnover_2w >= TURNOVER_THRESHOLD
        )

        def _get_atr(interval: str, period: int) -> dict | None:
            if len(atr_df) == 0:
                return None
            filtered = atr_df.filter(
                (atr_df["symbol"] == symbol)
                & (atr_df["interval"] == interval)
                & (atr_df["period_days"] == period)
            )
            if len(filtered) == 0:
                return None
            return filtered.to_dicts()[0]

        atr_1h_1w = _get_atr("1hour", 7)
        atr_1h_2w = _get_atr("1hour", 14)
        atr_daily_1w = _get_atr("daily", 7)
        atr_daily_2w = _get_atr("daily", 14)

        c1 = (
            atr_1h_1w is not None
            and (atr_1h_1w.get("atr_exclude_open") or 0) >= 5
            and (atr_1h_1w.get("atr_pct_exclude_open") or 0) >= 2
        )
        c2 = (
            atr_1h_2w is not None
            and (atr_1h_2w.get("atr_exclude_open") or 0) >= 5
            and (atr_1h_2w.get("atr_pct_exclude_open") or 0) >= 2
        )
        c3 = (
            atr_daily_1w is not None
            and (atr_daily_1w.get("atr_pct_exclude_open") or 0) >= 8
        )
        c4 = (
            atr_daily_2w is not None
            and (atr_daily_2w.get("atr_pct_exclude_open") or 0) >= 8
        )
        conditions = sum([c1, c2, c3, c4])

        is_wtd = turnover_pass and conditions >= 3
        await symbols_repo.update_wtd(symbol, is_wtd)

        results.append({
            "symbol": symbol,
            "is_worth_trade_daily": is_wtd,
            "turnover_1w": turnover_1w,
            "turnover_2w": turnover_2w,
            "atr_1h_1w_pass": c1,
            "atr_1h_2w_pass": c2,
            "atr_daily_1w_pass": c3,
            "atr_daily_2w_pass": c4,
            "atr_conditions_met": conditions,
        })

    await notify_data_updated("symbols")
    return results


async def evaluate_wtd_background(job_id: str) -> None:
    try:
        await jobs_service.update_progress(job_id, 0, 1)
        await evaluate_wtd()
        await jobs_service.complete_job(job_id)
    except Exception as e:
        logger.exception("WTD evaluation failed")
        await jobs_service.fail_job(job_id, str(e))
