import polars as pl
import pytest


def test_compute_true_range_daily():
    """3-way true range: max(H-L, |H-prevC|, |L-prevC|), pct = TR/prevC*100"""
    from app.features.prices.service import compute_true_range

    df = pl.DataFrame({
        "high": [110.0, 115.0, 108.0],
        "low": [100.0, 105.0, 95.0],
        "close": [105.0, 110.0, 100.0],
    })

    result = compute_true_range(df)

    # Row 0: no prev_close, TR = H-L = 10, pct = 10/105*100
    assert result["true_range"][0] == pytest.approx(10.0)
    assert result["true_range_pct"][0] == pytest.approx(10.0 / 105.0 * 100, rel=1e-4)

    # Row 1: prev_close=105, H-L=10, |H-prevC|=10, |L-prevC|=0 -> TR=10
    assert result["true_range"][1] == pytest.approx(10.0)
    assert result["true_range_pct"][1] == pytest.approx(10.0 / 105.0 * 100, rel=1e-4)

    # Row 2: prev_close=110, H-L=13, |H-prevC|=2, |L-prevC|=15 -> TR=15
    assert result["true_range"][2] == pytest.approx(15.0)
    assert result["true_range_pct"][2] == pytest.approx(15.0 / 110.0 * 100, rel=1e-4)


@pytest.mark.anyio
async def test_fetch_daily_creates_job(client):
    await client.post("/api/v1/symbols", json={"symbol": "TEST.JK"})
    response = await client.post("/api/v1/prices/TEST.JK/fetch/daily")
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "pending"


@pytest.mark.anyio
async def test_get_daily_empty(client):
    await client.post("/api/v1/symbols", json={"symbol": "TEST.JK"})
    response = await client.get("/api/v1/prices/daily/TEST.JK")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.anyio
async def test_fetch_unknown_symbol_404(client):
    response = await client.post("/api/v1/prices/NOPE.JK/fetch/daily")
    assert response.status_code == 404
