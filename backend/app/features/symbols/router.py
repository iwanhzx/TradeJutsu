from fastapi import APIRouter, HTTPException, Response

from app.config import settings
from app.core.errors import SymbolNotFoundError, SymbolAlreadyExistsError
from app.features.symbols import service
from app.features.symbols.models import SymbolCreate, SymbolResponse

router = APIRouter(prefix=f"{settings.api_prefix}/symbols", tags=["symbols"])


@router.get("", response_model=list[SymbolResponse])
async def list_symbols():
    symbols = await service.get_symbols()
    return [_to_response(s) for s in symbols]


@router.get("/{symbol}", response_model=SymbolResponse)
async def get_symbol(symbol: str):
    try:
        s = await service.get_symbol(symbol.upper())
    except SymbolNotFoundError:
        raise HTTPException(status_code=404, detail=f"Symbol not found: {symbol}")
    return _to_response(s)


@router.post("", response_model=SymbolResponse, status_code=201)
async def add_symbol(body: SymbolCreate):
    try:
        s = await service.add_symbol(body.symbol)
    except SymbolAlreadyExistsError:
        raise HTTPException(status_code=409, detail=f"Symbol already exists: {body.symbol}")
    return _to_response(s)


@router.patch("/{symbol}/disable", response_model=SymbolResponse)
async def disable_symbol(symbol: str):
    try:
        s = await service.disable_symbol(symbol.upper())
    except SymbolNotFoundError:
        raise HTTPException(status_code=404, detail=f"Symbol not found: {symbol}")
    return _to_response(s)


@router.patch("/{symbol}/enable", response_model=SymbolResponse)
async def enable_symbol(symbol: str):
    try:
        s = await service.enable_symbol(symbol.upper())
    except SymbolNotFoundError:
        raise HTTPException(status_code=404, detail=f"Symbol not found: {symbol}")
    return _to_response(s)


@router.delete("/{symbol}", status_code=204)
async def delete_symbol(symbol: str):
    try:
        await service.delete_symbol(symbol.upper())
    except SymbolNotFoundError:
        raise HTTPException(status_code=404, detail=f"Symbol not found: {symbol}")
    return Response(status_code=204)


def _to_response(row: dict) -> SymbolResponse:
    return SymbolResponse(
        symbol=row["symbol"],
        name=row.get("name"),
        sector=row.get("sector"),
        currency=row.get("currency"),
        is_active=bool(row.get("is_active", 1)),
        is_worth_trade_daily=bool(row.get("is_worth_trade_daily", 0)),
        latest_price=row.get("latest_price"),
        latest_price_date=row.get("latest_price_date"),
        added_at=row.get("added_at"),
    )
