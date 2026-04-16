"""Seed the database with sample IDX stocks for development."""

import asyncio
import httpx

API_URL = "http://localhost:8000/api/v1"

SEED_SYMBOLS = [
    "BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK",
    "BBNI.JK", "UNVR.JK", "HMSP.JK", "ICBP.JK", "KLBF.JK",
]


async def main():
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(f"{API_URL}/health")
        assert r.status_code == 200, f"API not running: {r.text}"
        print("API is healthy")

        for symbol in SEED_SYMBOLS:
            r = await client.post(f"{API_URL}/symbols", json={"symbol": symbol})
            if r.status_code == 201:
                print(f"  Added {symbol}")
            elif r.status_code == 409:
                print(f"  {symbol} already exists")
            else:
                print(f"  Failed to add {symbol}: {r.status_code} {r.text}")

        print(f"\nDone. {len(SEED_SYMBOLS)} symbols seeded.")
        print("Run 'POST /api/v1/prices/fetch-all/daily' to fetch price data.")


if __name__ == "__main__":
    asyncio.run(main())
