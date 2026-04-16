import json
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks

from app.config import settings
from app.core.sqlite import get_db
from app.features.analytics import repo, atr_service, wtd_service
from app.features.analytics.models import (
    AtrSummaryResponse,
    TurnoverTableResponse,
    TurnoverTableRow,
    WtdReportItem,
    WtdSettings,
)
from app.features.jobs import service as jobs_service
from app.features.jobs.models import JobCreated

router = APIRouter(prefix=f"{settings.api_prefix}/analytics", tags=["analytics"])


@router.get("/atr/summary", response_model=list[AtrSummaryResponse])
async def get_atr_summary(interval: str | None = None, symbol: str | None = None):
    df = await repo.get_atr_summary(interval, symbol.upper() if symbol else None)
    return df.to_dicts()


@router.post("/atr/calculate", response_model=JobCreated, status_code=202)
async def calculate_atr(background_tasks: BackgroundTasks):
    job_id = await jobs_service.create_job("atr_calc_all")
    background_tasks.add_task(atr_service.calculate_all_atr_background, job_id)
    return JobCreated(job_id=job_id)


@router.get("/turnover", response_model=TurnoverTableResponse)
async def get_turnover():
    from app.features.symbols import repo as sym_repo

    symbols = await sym_repo.get_all()
    active_symbols = [s["symbol"] for s in symbols if s.get("is_active", True)]
    if not active_symbols:
        return TurnoverTableResponse(trade_dates=[], rows=[])

    df = await repo.get_turnover_table(active_symbols)
    if df.is_empty():
        return TurnoverTableResponse(trade_dates=[], rows=[])

    # Last 10 trade dates across all symbols (oldest first)
    all_dates = df["date"].unique().sort(descending=True).head(10).sort()
    trade_dates_str = [d.strftime("%d-%m-%y") for d in all_dates.to_list()]
    all_dates_set = set(all_dates.to_list())

    # Build per-symbol rows
    avg_periods = {"avg_1w": 5, "avg_2w": 10, "avg_1m": 22, "avg_3m": 66, "avg_6m": 132}
    rows: list[TurnoverTableRow] = []

    for symbol in sorted(active_symbols):
        sym_df = df.filter(df["symbol"] == symbol).sort("date", descending=True)
        if sym_df.is_empty():
            rows.append(TurnoverTableRow(symbol=symbol, daily_values={}))
            continue

        # Daily values for the 10 trade dates
        daily_values: dict[str, float | None] = {}
        for row in sym_df.iter_rows(named=True):
            if row["date"] in all_dates_set:
                daily_values[row["date"].strftime("%d-%m-%y")] = row["turnover"]

        # Rolling averages
        turnovers = sym_df["turnover"]
        avgs = {}
        for key, n in avg_periods.items():
            head = turnovers.head(n).drop_nulls()
            avgs[key] = head.mean() if len(head) > 0 else None

        rows.append(TurnoverTableRow(symbol=symbol, daily_values=daily_values, **avgs))

    return TurnoverTableResponse(trade_dates=trade_dates_str, rows=rows)


WTD_SETTINGS_KEY = "wtd_settings"


async def _load_wtd_settings() -> WtdSettings:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT value FROM app_config WHERE key = ?", (WTD_SETTINGS_KEY,)
        )
        row = await cursor.fetchone()
        if row:
            return WtdSettings(**json.loads(row[0]))
        return WtdSettings()


@router.get("/wtd/settings", response_model=WtdSettings)
async def get_wtd_settings():
    return await _load_wtd_settings()


@router.put("/wtd/settings", response_model=WtdSettings)
async def update_wtd_settings(body: WtdSettings):
    async with get_db() as db:
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            (WTD_SETTINGS_KEY, body.model_dump_json(), now),
        )
        await db.commit()
    return body


@router.get("/wtd/report", response_model=list[WtdReportItem])
async def get_wtd_report():
    s = await _load_wtd_settings()
    return await wtd_service.evaluate_wtd(s)


@router.post("/wtd/check", response_model=JobCreated, status_code=202)
async def check_wtd(background_tasks: BackgroundTasks):
    s = await _load_wtd_settings()
    job_id = await jobs_service.create_job("wtd_check")
    background_tasks.add_task(wtd_service.evaluate_wtd_background, job_id, s)
    return JobCreated(job_id=job_id)
