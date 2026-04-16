import pytest


@pytest.mark.anyio
async def test_list_jobs_empty(client):
    response = await client.get("/api/v1/jobs")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.anyio
async def test_get_job_not_found(client):
    response = await client.get("/api/v1/jobs/nonexistent-id")
    assert response.status_code == 404
