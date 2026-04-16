import asyncio
import logging

import yfinance as yf

from app.core.errors import SymbolNotFoundError, SymbolAlreadyExistsError
from app.core import duckdb as duckdb_manager
from app.features.symbols import repo

logger = logging.getLogger(__name__)


def _fetch_yfinance_info(symbol: str) -> dict:
    """Fetch symbol metadata from yfinance. Synchronous — call via executor."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        return {
            "name": info.get("longName") or info.get("shortName"),
            "sector": info.get("sector"),
            "currency": info.get("currency"),
        }
    except Exception as e:
        logger.warning(f"yfinance metadata fetch failed for {symbol}: {e}")
        return {"name": None, "sector": None, "currency": None}


async def add_symbol(symbol: str) -> dict:
    if await repo.exists(symbol):
        raise SymbolAlreadyExistsError(symbol)
    logger.info("Adding symbol %s", symbol)
    loop = asyncio.get_running_loop()
    info = await loop.run_in_executor(None, _fetch_yfinance_info, symbol)
    result = await repo.insert(symbol, info["name"], info["sector"], info["currency"])
    logger.info("Symbol %s added (name=%s)", symbol, info["name"])
    return result


async def get_symbol(symbol: str) -> dict:
    result = await repo.get_one(symbol)
    if result is None:
        raise SymbolNotFoundError(symbol)
    return result


async def get_symbols() -> list[dict]:
    return await repo.get_all()


async def disable_symbol(symbol: str) -> dict:
    await get_symbol(symbol)
    return await repo.set_active(symbol, False)


async def enable_symbol(symbol: str) -> dict:
    await get_symbol(symbol)
    return await repo.set_active(symbol, True)


async def delete_symbol(symbol: str) -> None:
    logger.info("Deleting symbol %s and all associated data", symbol)
    await get_symbol(symbol)
    await duckdb_manager.write("DELETE FROM prices_daily WHERE symbol = ?", [symbol])
    await duckdb_manager.write("DELETE FROM prices_intraday WHERE symbol = ?", [symbol])
    await duckdb_manager.write("DELETE FROM atr_summary WHERE symbol = ?", [symbol])
    await repo.delete(symbol)
