import datetime

from pydantic import BaseModel


class PriceDailyResponse(BaseModel):
    symbol: str
    date: datetime.date
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: int | None = None
    true_range: float | None = None
    true_range_pct: float | None = None
    turnover: float | None = None


class PriceIntradayResponse(BaseModel):
    symbol: str
    datetime: datetime.datetime
    interval: str
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: int | None = None
    true_range: float | None = None
    true_range_pct: float | None = None
    turnover: float | None = None


class FetchResponse(BaseModel):
    job_id: str
    status: str = "pending"
