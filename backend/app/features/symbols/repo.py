from datetime import datetime, timezone
from app.core.sqlite import get_db


async def get_all() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM symbols ORDER BY symbol")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_one(symbol: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM symbols WHERE symbol = ?", (symbol,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def insert(symbol: str, name: str | None, sector: str | None, currency: str | None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            """INSERT INTO symbols (symbol, name, sector, currency, added_at)
               VALUES (?, ?, ?, ?, ?)""",
            (symbol, name, sector, currency, now),
        )
        await db.commit()
    return await get_one(symbol)


async def exists(symbol: str) -> bool:
    async with get_db() as db:
        cursor = await db.execute("SELECT 1 FROM symbols WHERE symbol = ?", (symbol,))
        return await cursor.fetchone() is not None


async def set_active(symbol: str, is_active: bool) -> dict | None:
    async with get_db() as db:
        await db.execute(
            "UPDATE symbols SET is_active = ? WHERE symbol = ?",
            (1 if is_active else 0, symbol),
        )
        await db.commit()
    return await get_one(symbol)


async def update_price(symbol: str, price: float, date: str) -> None:
    async with get_db() as db:
        await db.execute(
            "UPDATE symbols SET latest_price = ?, latest_price_date = ? WHERE symbol = ?",
            (price, date, symbol),
        )
        await db.commit()


async def update_wtd(symbol: str, is_worth_trade: bool) -> None:
    async with get_db() as db:
        await db.execute(
            "UPDATE symbols SET is_worth_trade_daily = ? WHERE symbol = ?",
            (1 if is_worth_trade else 0, symbol),
        )
        await db.commit()


async def delete(symbol: str) -> None:
    async with get_db() as db:
        await db.execute("DELETE FROM symbols WHERE symbol = ?", (symbol,))
        await db.commit()
