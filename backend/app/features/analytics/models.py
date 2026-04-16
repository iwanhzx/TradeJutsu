from pydantic import BaseModel


class AtrSummaryResponse(BaseModel):
    symbol: str
    interval: str
    period_days: int
    atr_wilder: float | None = None
    atr_pct_wilder: float | None = None
    atr_with_open: float | None = None
    atr_pct_with_open: float | None = None
    atr_exclude_open: float | None = None
    atr_pct_exclude_open: float | None = None
    calculated_at: str | None = None


class TurnoverResponse(BaseModel):
    symbol: str
    avg_turnover: float | None
    period_days: int


class WtdReportItem(BaseModel):
    symbol: str
    is_worth_trade_daily: bool
    turnover_1w: float | None = None
    turnover_2w: float | None = None
    atr_1h_1w_pass: bool = False
    atr_1h_2w_pass: bool = False
    atr_daily_1w_pass: bool = False
    atr_daily_2w_pass: bool = False
    atr_conditions_met: int = 0
