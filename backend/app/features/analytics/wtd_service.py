"""Worth-Trade-Daily evaluation service.

Criteria (all must pass):
- Turnover: avg daily turnover >= threshold for both 1W and 2W
- ATR: >= conditions_to_pass of 5 conditions (each compares an ATR value to its threshold):
  - 1W X  Daily: atr_exclude_open (raw) >= min_1w_o_daily
  - 1W X% 1H:    atr_pct_exclude_open   >= min_1w_opct_1h
  - 1W X% Daily: atr_pct_exclude_open   >= min_1w_opct_daily
  - 2W X% 1H:    atr_pct_exclude_open   >= min_2w_opct_1h
  - 2W X% Daily: atr_pct_exclude_open   >= min_2w_opct_daily
"""

import logging

from app.features.analytics import repo
from app.features.analytics.models import WtdSettings
from app.features.symbols import repo as symbols_repo
from app.features.jobs import service as jobs_service
from app.core.background import notify_data_updated

logger = logging.getLogger(__name__)


async def evaluate_wtd(settings: WtdSettings | None = None) -> list[dict]:
    s = settings or WtdSettings()
    symbols = await symbols_repo.get_all()
    active = [s_row for s_row in symbols if s_row.get("is_active", True)]
    logger.info("Evaluating WTD for %d active symbols", len(active))

    atr_df = await repo.get_atr_summary()
    results = []

    for sym in active:
        symbol = sym["symbol"]

        turnover_1w = await repo.get_daily_turnover(symbol, 5)
        turnover_2w = await repo.get_daily_turnover(symbol, 10)
        turnover_pass = (
            turnover_1w is not None
            and turnover_2w is not None
            and turnover_1w >= s.turnover_min
            and turnover_2w >= s.turnover_min
        )

        def _get_atr(interval: str, period: str) -> dict | None:
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

        atr_1h_1w = _get_atr("1hour", "1week")
        atr_daily_1w = _get_atr("daily", "1week")
        atr_1h_2w = _get_atr("1hour", "2week")
        atr_daily_2w = _get_atr("daily", "2week")

        c1 = (
            atr_daily_1w is not None
            and (atr_daily_1w.get("atr_exclude_open") or 0) >= s.min_1w_o_daily
        )
        c2 = (
            atr_1h_1w is not None
            and (atr_1h_1w.get("atr_pct_exclude_open") or 0) >= s.min_1w_opct_1h
        )
        c3 = (
            atr_daily_1w is not None
            and (atr_daily_1w.get("atr_pct_exclude_open") or 0) >= s.min_1w_opct_daily
        )
        c4 = (
            atr_1h_2w is not None
            and (atr_1h_2w.get("atr_pct_exclude_open") or 0) >= s.min_2w_opct_1h
        )
        c5 = (
            atr_daily_2w is not None
            and (atr_daily_2w.get("atr_pct_exclude_open") or 0) >= s.min_2w_opct_daily
        )
        conditions = sum([c1, c2, c3, c4, c5])

        is_wtd = turnover_pass and conditions >= s.conditions_to_pass
        await symbols_repo.update_wtd(symbol, is_wtd)

        results.append({
            "symbol": symbol,
            "is_worth_trade_daily": is_wtd,
            "turnover_1w": turnover_1w,
            "turnover_2w": turnover_2w,
            "c_1w_o_daily": c1,
            "c_1w_opct_1h": c2,
            "c_1w_opct_daily": c3,
            "c_2w_opct_1h": c4,
            "c_2w_opct_daily": c5,
            "atr_conditions_met": conditions,
        })

    wtd_count = sum(1 for r in results if r["is_worth_trade_daily"])
    logger.info("WTD evaluation complete: %d/%d symbols qualified", wtd_count, len(results))
    await notify_data_updated("symbols")
    return results


async def evaluate_wtd_background(job_id: str, settings: WtdSettings | None = None) -> None:
    try:
        await jobs_service.update_progress(job_id, 0, 1)
        await evaluate_wtd(settings)
        await jobs_service.complete_job(job_id)
    except Exception as e:
        logger.exception("WTD evaluation failed")
        await jobs_service.fail_job(job_id, str(e))
