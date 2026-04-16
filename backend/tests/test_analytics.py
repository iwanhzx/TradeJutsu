import polars as pl
import pytest


def test_wilder_atr():
    from app.features.analytics.atr_service import compute_wilder_atr

    true_ranges = [10.0, 12.0, 8.0, 11.0, 9.0, 14.0, 7.0, 13.0]
    period = 5

    result = compute_wilder_atr(true_ranges, period)

    assert result[0] == pytest.approx(10.0)
    assert result[1] == pytest.approx(10.8)
    assert result[2] == pytest.approx(10.04)
    assert result[3] == pytest.approx(10.632)


def test_wilder_atr_insufficient_data():
    from app.features.analytics.atr_service import compute_wilder_atr

    result = compute_wilder_atr([10.0, 12.0], period=5)
    assert result == []


@pytest.mark.anyio
async def test_atr_summary_empty(client):
    response = await client.get("/api/v1/analytics/atr/summary")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.anyio
async def test_wtd_report_empty(client):
    response = await client.get("/api/v1/analytics/wtd/report")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.anyio
async def test_calculate_atr_returns_job(client):
    response = await client.post("/api/v1/analytics/atr/calculate/daily")
    assert response.status_code == 202
    assert "job_id" in response.json()


@pytest.mark.anyio
async def test_wtd_check_returns_job(client):
    response = await client.post("/api/v1/analytics/wtd/check")
    assert response.status_code == 202
    assert "job_id" in response.json()
