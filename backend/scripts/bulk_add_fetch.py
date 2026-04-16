"""Bulk import 365 IDX stocks. Run with: python -m scripts.bulk_add_fetch"""

import asyncio
import httpx

API_URL = "http://localhost:8000/api/v1"

# Top IDX stocks by liquidity (subset - extend as needed)
IDX_SYMBOLS = [
    "BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK",
    "BBNI.JK", "UNVR.JK", "HMSP.JK", "ICBP.JK", "KLBF.JK",
    "INDF.JK", "SMGR.JK", "PGAS.JK", "ADRO.JK", "ANTM.JK",
    "PTBA.JK", "INCO.JK", "ITMG.JK", "MDKA.JK", "EXCL.JK",
]


async def main():
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(f"{API_URL}/health")
        assert r.status_code == 200, f"API not running: {r.text}"
        print(f"API healthy. Adding {len(IDX_SYMBOLS)} symbols...")

        added = 0
        for symbol in IDX_SYMBOLS:
            r = await client.post(f"{API_URL}/symbols", json={"symbol": symbol})
            if r.status_code == 201:
                added += 1
                print(f"  [{added}/{len(IDX_SYMBOLS)}] Added {symbol}")
            elif r.status_code == 409:
                print(f"  {symbol} already exists")

        print(f"\n{added} symbols added.")


if __name__ == "__main__":
    asyncio.run(main())
