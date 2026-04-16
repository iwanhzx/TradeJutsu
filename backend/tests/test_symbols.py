import pytest


@pytest.mark.anyio
async def test_list_symbols_empty(client):
    response = await client.get("/api/v1/symbols")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.anyio
async def test_add_symbol(client):
    response = await client.post("/api/v1/symbols", json={"symbol": "TEST.JK"})
    assert response.status_code == 201
    data = response.json()
    assert data["symbol"] == "TEST.JK"
    assert data["is_active"] is True


@pytest.mark.anyio
async def test_add_duplicate_symbol(client):
    await client.post("/api/v1/symbols", json={"symbol": "TEST.JK"})
    response = await client.post("/api/v1/symbols", json={"symbol": "TEST.JK"})
    assert response.status_code == 409


@pytest.mark.anyio
async def test_get_symbol(client):
    await client.post("/api/v1/symbols", json={"symbol": "TEST.JK"})
    response = await client.get("/api/v1/symbols/TEST.JK")
    assert response.status_code == 200
    assert response.json()["symbol"] == "TEST.JK"


@pytest.mark.anyio
async def test_get_symbol_not_found(client):
    response = await client.get("/api/v1/symbols/NOPE.JK")
    assert response.status_code == 404


@pytest.mark.anyio
async def test_disable_enable_symbol(client):
    await client.post("/api/v1/symbols", json={"symbol": "TEST.JK"})
    response = await client.patch("/api/v1/symbols/TEST.JK/disable")
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    response = await client.patch("/api/v1/symbols/TEST.JK/enable")
    assert response.status_code == 200
    assert response.json()["is_active"] is True


@pytest.mark.anyio
async def test_delete_symbol(client):
    await client.post("/api/v1/symbols", json={"symbol": "TEST.JK"})
    response = await client.delete("/api/v1/symbols/TEST.JK")
    assert response.status_code == 204

    response = await client.get("/api/v1/symbols/TEST.JK")
    assert response.status_code == 404
