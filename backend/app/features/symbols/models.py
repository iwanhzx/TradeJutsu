from pydantic import BaseModel, field_validator


class SymbolCreate(BaseModel):
    symbol: str

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, v: str) -> str:
        return v.strip().upper()


class SymbolResponse(BaseModel):
    symbol: str
    name: str | None = None
    sector: str | None = None
    currency: str | None = None
    is_active: bool = True
    is_worth_trade_daily: bool = False
    latest_price: float | None = None
    latest_price_date: str | None = None
    added_at: str | None = None
