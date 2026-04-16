import pytest
from httpx import ASGITransport, AsyncClient

from app.core import duckdb as duckdb_manager
from app.core import sqlite as sqlite_manager


@pytest.fixture(params=["asyncio"])
def anyio_backend(request):
    return request.param


@pytest.fixture(autouse=True)
def test_databases(tmp_path):
    """Use temporary databases for each test."""
    duckdb_path = str(tmp_path / "test_market.duckdb")
    sqlite_path = str(tmp_path / "test_app.sqlite")

    duckdb_manager.override_db_path(duckdb_path)
    sqlite_manager.override_db_path(sqlite_path)

    duckdb_manager.init_schema()

    yield


@pytest.fixture
async def init_sqlite():
    """Initialize SQLite schema for tests that need it."""
    await sqlite_manager.init_schema()


@pytest.fixture
async def client(init_sqlite):
    from app.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
