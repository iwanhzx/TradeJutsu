from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.config import settings
from app.core.errors import SymbolNotFoundError
from app.features.prices import service, repo
from app.features.prices.models import PriceDailyResponse, PriceIntradayResponse, FetchResponse
from app.features.symbols import service as symbols_service
from app.features.jobs import service as jobs_service

router = APIRouter(prefix=f"{settings.api_prefix}/prices", tags=["prices"])


@router.get("/daily/{symbol}", response_model=list[PriceDailyResponse])
async def get_daily(symbol: str, start: str | None = None, end: str | None = None):
    symbol = symbol.upper()
    df = await repo.get_daily(symbol, start, end)
    return df.to_dicts()


@router.get("/intraday/{symbol}", response_model=list[PriceIntradayResponse])
async def get_intraday(
    symbol: str, interval: str = "30min", start: str | None = None, end: str | None = None
):
    symbol = symbol.upper()
    df = await repo.get_intraday(symbol, interval, start, end)
    return df.to_dicts()


@router.post("/{symbol}/fetch/{interval}", response_model=FetchResponse, status_code=202)
async def fetch_prices(symbol: str, interval: str, background_tasks: BackgroundTasks):
    symbol = symbol.upper()
    try:
        await symbols_service.get_symbol(symbol)
    except SymbolNotFoundError:
        raise HTTPException(status_code=404, detail=f"Symbol not found: {symbol}")

    job_id = await jobs_service.create_job(f"fetch_{interval}", symbol)

    if interval == "daily":
        background_tasks.add_task(service.fetch_daily_background, symbol, job_id)
    else:
        background_tasks.add_task(service.fetch_intraday_background, symbol, interval, job_id)

    return FetchResponse(job_id=job_id)


@router.post("/fetch-all/{interval}", response_model=FetchResponse, status_code=202)
async def fetch_all(interval: str, background_tasks: BackgroundTasks):
    job_id = await jobs_service.create_job(f"fetch_all_{interval}")
    background_tasks.add_task(service.fetch_all_background, interval, job_id)
    return FetchResponse(job_id=job_id)
