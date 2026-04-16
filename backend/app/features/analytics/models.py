from datetime import datetime

from pydantic import BaseModel


class AtrSummaryResponse(BaseModel):
    symbol: str
    interval: str
    period_days: str
    atr_wilder: float | None = None
    atr_pct_wilder: float | None = None
    atr_with_open: float | None = None
    atr_pct_with_open: float | None = None
    atr_exclude_open: float | None = None
    atr_pct_exclude_open: float | None = None
    last_price_update: datetime | None = None
    calculated_at: datetime | None = None


class TurnoverResponse(BaseModel):
    symbol: str
    avg_turnover: float | None
    period_days: str


class TurnoverTableRow(BaseModel):
    symbol: str
    daily_values: dict[str, float | None]
    avg_1w: float | None = None
    avg_2w: float | None = None
    avg_1m: float | None = None
    avg_3m: float | None = None
    avg_6m: float | None = None


class TurnoverTableResponse(BaseModel):
    trade_dates: list[str]
    rows: list[TurnoverTableRow]


class WtdReportItem(BaseModel):
    symbol: str
    is_worth_trade_daily: bool
    turnover_1w: float | None = None
    turnover_2w: float | None = None
    c_1w_o_daily: bool = False
    c_1w_opct_1h: bool = False
    c_1w_opct_daily: bool = False
    c_2w_opct_1h: bool = False
    c_2w_opct_daily: bool = False
    atr_conditions_met: int = 0


class WtdSettings(BaseModel):
    turnover_min: float = 50_000_000_000
    min_1w_o_daily: float = 5
    min_1w_opct_1h: float = 2
    min_1w_opct_daily: float = 8
    min_2w_opct_1h: float = 2
    min_2w_opct_daily: float = 8
    conditions_to_pass: int = 3
