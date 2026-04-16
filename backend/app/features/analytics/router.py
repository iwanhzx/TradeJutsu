from fastapi import APIRouter, BackgroundTasks

from app.config import settings
from app.features.analytics import repo, atr_service, wtd_service
from app.features.analytics.models import AtrSummaryResponse, WtdReportItem
from app.features.jobs import service as jobs_service
from app.features.jobs.models import JobCreated

router = APIRouter(prefix=f"{settings.api_prefix}/analytics", tags=["analytics"])


@router.get("/atr/summary", response_model=list[AtrSummaryResponse])
async def get_atr_summary(interval: str | None = None, symbol: str | None = None):
    df = await repo.get_atr_summary(interval, symbol.upper() if symbol else None)
    return df.to_dicts()


@router.post("/atr/calculate/{interval}", response_model=JobCreated, status_code=202)
async def calculate_atr(interval: str, background_tasks: BackgroundTasks):
    job_id = await jobs_service.create_job(f"atr_calc_{interval}")
    background_tasks.add_task(atr_service.calculate_atr_background, interval, job_id)
    return JobCreated(job_id=job_id)


@router.get("/turnover")
async def get_turnover(symbol: str | None = None, days: int = 7):
    if symbol:
        avg = await repo.get_daily_turnover(symbol.upper(), days)
        return [{"symbol": symbol.upper(), "avg_turnover": avg, "period_days": days}]

    from app.features.symbols import repo as sym_repo
    symbols = await sym_repo.get_all()
    results = []
    for sym in symbols:
        if sym.get("is_active", True):
            avg = await repo.get_daily_turnover(sym["symbol"], days)
            results.append({
                "symbol": sym["symbol"],
                "avg_turnover": avg,
                "period_days": days,
            })
    return results


@router.get("/wtd/report", response_model=list[WtdReportItem])
async def get_wtd_report():
    return await wtd_service.evaluate_wtd()


@router.post("/wtd/check", response_model=JobCreated, status_code=202)
async def check_wtd(background_tasks: BackgroundTasks):
    job_id = await jobs_service.create_job("wtd_check")
    background_tasks.add_task(wtd_service.evaluate_wtd_background, job_id)
    return JobCreated(job_id=job_id)
