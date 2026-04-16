# Phase 1 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the TradeJutsu FastAPI backend with DuckDB + SQLite databases, WebSocket real-time updates, and 4 feature modules (symbols, prices, analytics, jobs) for IDX stock market data.

**Architecture:** Feature Modules (vertical slices). Each feature has router, models, service, repo. Core infrastructure provides DuckDB/SQLite connections, WebSocket manager, and background task helpers. DuckDB is synchronous — all DB calls wrapped in `run_in_executor`.

**Tech Stack:** Python 3.11+, FastAPI, DuckDB, aiosqlite, Polars, yfinance, Pydantic v2, pytest, httpx (test client)

**Spec:** `docs/superpowers/specs/2026-04-16-phase1-core-platform-design.md`
**Old app reference:** `docs/legacy/PROJECT_ANALYSIS.md`

---

## File Structure

```
TradeJutsu/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                         — FastAPI app, lifespan, router mounts
│   │   ├── config.py                       — Settings via Pydantic BaseSettings
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── duckdb.py                   — DuckDB connection manager (sync, run_in_executor)
│   │   │   ├── sqlite.py                   — aiosqlite connection manager, WAL mode
│   │   │   ├── websocket.py                — WebSocketManager (connect, disconnect, broadcast)
│   │   │   ├── background.py               — BackgroundTaskRunner with WS + job integration
│   │   │   ├── idx.py                      — IDX constants (tick sizes, fees, lot size, hours)
│   │   │   └── errors.py                   — Custom exceptions
│   │   └── features/
│   │       ├── __init__.py
│   │       ├── symbols/
│   │       │   ├── __init__.py
│   │       │   ├── router.py               — 6 REST endpoints
│   │       │   ├── models.py               — SymbolCreate, SymbolResponse
│   │       │   ├── service.py              — add_symbol (yfinance metadata), toggle, delete
│   │       │   └── repo.py                 — SQLite CRUD
│   │       ├── prices/
│   │       │   ├── __init__.py
│   │       │   ├── router.py               — 4 REST endpoints
│   │       │   ├── models.py               — PriceDaily, PriceIntraday responses
│   │       │   ├── service.py              — yfinance fetcher, 3-way TR, background ingestion
│   │       │   └── repo.py                 — DuckDB read/write for prices tables
│   │       ├── analytics/
│   │       │   ├── __init__.py
│   │       │   ├── router.py               — 5 REST endpoints
│   │       │   ├── models.py               — ATR, Turnover, WTD response models
│   │       │   ├── atr_service.py          — Wilder's + simple ATR via Polars
│   │       │   ├── wtd_service.py          — Worth-Trade-Daily evaluation
│   │       │   └── repo.py                 — DuckDB read/write for atr_summary
│   │       └── jobs/
│   │           ├── __init__.py
│   │           ├── router.py               — 2 REST + 1 WebSocket endpoint
│   │           ├── models.py               — JobResponse, WSMessage
│   │           ├── service.py              — Job lifecycle (create, update, get)
│   │           └── repo.py                 — SQLite CRUD for jobs table
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                     — Fixtures: test DBs, FastAPI TestClient
│   │   ├── test_idx.py                     — IDX constants and tick rounding
│   │   ├── test_symbols.py                 — Symbol CRUD via API
│   │   ├── test_prices.py                  — Price ingestion + true range
│   │   ├── test_analytics.py               — Wilder's ATR + WTD evaluation
│   │   └── test_jobs.py                    — Job lifecycle + WebSocket
│   ├── scripts/
│   │   ├── bulk_add_fetch.py               — Import 365 IDX stocks
│   │   └── seed_data.py                    — Dev seed with sample data
│   ├── database/                           — .gitignored runtime DB files
│   │   └── .gitkeep
│   ├── pyproject.toml
│   └── requirements.txt
├── .gitignore
├── Makefile
└── README.md
```

---

## Task 1: Git Init + Project Skeleton

**Files:**
- Create: `.gitignore`, `Makefile`, `backend/pyproject.toml`, `backend/requirements.txt`
- Create: `backend/app/__init__.py`, `backend/app/main.py`, `backend/app/config.py`
- Create: `backend/database/.gitkeep`, `backend/tests/__init__.py`, `backend/scripts/`

- [ ] **Step 1: Initialize git repo**

```bash
cd D:/TradeJutsu
git init
```

- [ ] **Step 2: Create .gitignore**

Create file `.gitignore`:

```gitignore
# Python
__pycache__/
*.py[cod]
*.egg-info/
dist/
.venv/
venv/

# Database files
backend/database/*.duckdb
backend/database/*.duckdb.wal
backend/database/*.sqlite
backend/database/*.sqlite-wal
backend/database/*.sqlite-shm

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Node (for frontend later)
node_modules/
frontend/dist/

# Brainstorm artifacts
.superpowers/

# Env
.env
.env.local
```

- [ ] **Step 3: Create Makefile**

Create file `Makefile`:

```makefile
.PHONY: dev backend test test-backend lint format seed clean

backend:
	cd backend && uvicorn app.main:app --reload --port 8000

test: test-backend

test-backend:
	cd backend && python -m pytest tests/ -v

lint:
	cd backend && ruff check .

format:
	cd backend && ruff format .

seed:
	cd backend && python -m scripts.seed_data

clean:
	rm -f backend/database/*.duckdb backend/database/*.duckdb.wal
	rm -f backend/database/*.sqlite backend/database/*.sqlite-wal backend/database/*.sqlite-shm
```

- [ ] **Step 4: Create backend/requirements.txt**

Create file `backend/requirements.txt`:

```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
duckdb>=1.1.0
aiosqlite>=0.20.0
polars>=1.0.0
pandas>=2.2.0
yfinance>=0.2.40
pydantic>=2.7.0
pydantic-settings>=2.4.0
pytest>=8.0.0
httpx>=0.27.0
ruff>=0.6.0
```

- [ ] **Step 5: Create backend/pyproject.toml**

Create file `backend/pyproject.toml`:

```toml
[project]
name = "tradejutsu-backend"
version = "0.1.0"
requires-python = ">=3.11"

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.ruff]
line-length = 100
target-version = "py311"
```

- [ ] **Step 6: Create backend/app/config.py**

Create file `backend/app/config.py`:

```python
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "TradeJutsu"
    debug: bool = True

    # Database paths
    database_dir: Path = Path(__file__).parent.parent / "database"
    duckdb_path: Path = Path(__file__).parent.parent / "database" / "market.duckdb"
    sqlite_path: Path = Path(__file__).parent.parent / "database" / "app.sqlite"

    # API
    api_prefix: str = "/api/v1"

    # yfinance
    yfinance_timeout: int = 30
    yfinance_max_retries: int = 3

    class Config:
        env_prefix = "TRADEJUTSU_"


settings = Settings()
```

- [ ] **Step 7: Create backend/app/main.py (minimal shell)**

Create file `backend/app/main.py`:

```python
from fastapi import FastAPI
from app.config import settings


app = FastAPI(title=settings.app_name)


@app.get(f"{settings.api_prefix}/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 8: Create empty __init__.py files and database/.gitkeep**

Create these empty files:
- `backend/app/__init__.py`
- `backend/app/core/__init__.py`
- `backend/app/features/__init__.py`
- `backend/app/features/symbols/__init__.py`
- `backend/app/features/prices/__init__.py`
- `backend/app/features/analytics/__init__.py`
- `backend/app/features/jobs/__init__.py`
- `backend/tests/__init__.py`
- `backend/database/.gitkeep`

- [ ] **Step 9: Install dependencies and verify**

```bash
cd backend
pip install -r requirements.txt
```

- [ ] **Step 10: Write health check test**

Create file `backend/tests/conftest.py`:

```python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

Create file `backend/tests/test_health.py`:

```python
import pytest


@pytest.mark.anyio
async def test_health(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 11: Run test to verify it passes**

```bash
cd backend && python -m pytest tests/test_health.py -v
```

Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: project skeleton with FastAPI health endpoint"
```

---

## Task 2: IDX Constants + Errors

**Files:**
- Create: `backend/app/core/idx.py`
- Create: `backend/app/core/errors.py`
- Test: `backend/tests/test_idx.py`

- [ ] **Step 1: Write failing test for tick rounding**

Create file `backend/tests/test_idx.py`:

```python
from app.core.idx import round_to_tick, LOT_SIZE, BUY_FEE, SELL_FEE


def test_constants():
    assert LOT_SIZE == 100
    assert BUY_FEE == 0.0015
    assert SELL_FEE == 0.0025


def test_round_to_tick_below_200():
    # Tick = 1, so any price stays as-is
    assert round_to_tick(150.7) == 150.0
    assert round_to_tick(199.9) == 199.0


def test_round_to_tick_200_to_499():
    # Tick = 2
    assert round_to_tick(201.0) == 200.0
    assert round_to_tick(203.0) == 202.0
    assert round_to_tick(499.0) == 498.0


def test_round_to_tick_500_to_1999():
    # Tick = 5
    assert round_to_tick(503.0) == 500.0
    assert round_to_tick(1997.0) == 1995.0


def test_round_to_tick_2000_plus():
    # Tick = 25
    assert round_to_tick(2010.0) == 2000.0
    assert round_to_tick(5030.0) == 5025.0
    assert round_to_tick(10049.0) == 10025.0
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_idx.py -v
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement IDX constants**

Create file `backend/app/core/idx.py`:

```python
"""IDX (Indonesia Stock Exchange) market constants."""

LOT_SIZE: int = 100
BUY_FEE: float = 0.0015  # 0.15%
SELL_FEE: float = 0.0025  # 0.25%

# Market hours in WIB (UTC+7)
MARKET_OPEN_WIB = (9, 0)   # 09:00 WIB = 02:00 UTC
MARKET_CLOSE_WIB = (16, 0)  # 16:00 WIB = 09:00 UTC
EOD_EXIT_WIB = (15, 30)     # Default force-close time

# Tick size table: (price_threshold, tick_size)
# Price is rounded DOWN to nearest tick
TICK_TABLE: list[tuple[float, float]] = [
    (5000.0, 25.0),
    (2000.0, 25.0),
    (500.0, 5.0),
    (200.0, 2.0),
    (0.0, 1.0),
]


def round_to_tick(price: float) -> float:
    """Round price DOWN to nearest IDX tick size."""
    for threshold, tick in TICK_TABLE:
        if price >= threshold:
            return float(int(price / tick) * tick)
    return float(int(price))
```

- [ ] **Step 4: Create errors module**

Create file `backend/app/core/errors.py`:

```python
"""Custom exception hierarchy for TradeJutsu."""


class TradeJutsuError(Exception):
    """Base exception for all TradeJutsu errors."""
    pass


class SymbolNotFoundError(TradeJutsuError):
    """Raised when a symbol doesn't exist in the database."""
    def __init__(self, symbol: str):
        self.symbol = symbol
        super().__init__(f"Symbol not found: {symbol}")


class SymbolAlreadyExistsError(TradeJutsuError):
    """Raised when trying to add a symbol that already exists."""
    def __init__(self, symbol: str):
        self.symbol = symbol
        super().__init__(f"Symbol already exists: {symbol}")


class DataFetchError(TradeJutsuError):
    """Raised when external data fetching fails."""
    pass


class InsufficientDataError(TradeJutsuError):
    """Raised when there isn't enough data for a computation."""
    pass
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_idx.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/core/idx.py backend/app/core/errors.py backend/tests/test_idx.py
git commit -m "feat: IDX constants with tick rounding + error hierarchy"
```

---

## Task 3: DuckDB Connection Manager

**Files:**
- Create: `backend/app/core/duckdb.py`
- Modify: `backend/tests/conftest.py` (add DuckDB fixture)

- [ ] **Step 1: Implement DuckDB connection manager**

Create file `backend/app/core/duckdb.py`:

```python
"""DuckDB connection manager for market data.

DuckDB is synchronous. All calls must be wrapped in run_in_executor
when used from async FastAPI handlers. Reads are concurrent-safe.
Writes are serialized via asyncio.Lock.
"""

import asyncio
from functools import partial
from pathlib import Path
from typing import Any

import duckdb
import polars as pl

from app.config import settings


_write_lock = asyncio.Lock()
_db_path: str = str(settings.duckdb_path)


def _get_connection() -> duckdb.DuckDBPyConnection:
    """Create a new DuckDB connection. Each call = fresh connection."""
    settings.database_dir.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(_db_path)


def _execute_read(query: str, params: list | None = None) -> list[tuple]:
    """Execute a read query synchronously. Returns list of tuples."""
    conn = _get_connection()
    try:
        if params:
            return conn.execute(query, params).fetchall()
        return conn.execute(query).fetchall()
    finally:
        conn.close()


def _execute_read_polars(query: str, params: list | None = None) -> pl.DataFrame:
    """Execute a read query, return as Polars DataFrame."""
    conn = _get_connection()
    try:
        if params:
            result = conn.execute(query, params)
        else:
            result = conn.execute(query)
        return result.pl()
    finally:
        conn.close()


def _execute_write(query: str, params: list | None = None) -> None:
    """Execute a write query synchronously."""
    conn = _get_connection()
    try:
        conn.begin()
        if params:
            conn.execute(query, params)
        else:
            conn.execute(query)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _execute_write_many(query: str, params_list: list[list]) -> None:
    """Execute many write queries in a single transaction."""
    conn = _get_connection()
    try:
        conn.begin()
        conn.executemany(query, params_list)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _execute_write_from_polars(table: str, df: pl.DataFrame) -> None:
    """Insert a Polars DataFrame into a DuckDB table."""
    conn = _get_connection()
    try:
        conn.begin()
        # Register the DataFrame and insert
        conn.register("df_to_insert", df.to_arrow())
        conn.execute(f"INSERT OR REPLACE INTO {table} SELECT * FROM df_to_insert")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


async def read(query: str, params: list | None = None) -> list[tuple]:
    """Async read from DuckDB. No lock needed — reads are concurrent-safe."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, partial(_execute_read, query, params))


async def read_polars(query: str, params: list | None = None) -> pl.DataFrame:
    """Async read from DuckDB, returns Polars DataFrame."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, partial(_execute_read_polars, query, params))


async def write(query: str, params: list | None = None) -> None:
    """Async write to DuckDB. Acquires write lock."""
    async with _write_lock:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, partial(_execute_write, query, params))


async def write_many(query: str, params_list: list[list]) -> None:
    """Async batch write to DuckDB. Acquires write lock."""
    async with _write_lock:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, partial(_execute_write_many, query, params_list))


async def write_polars(table: str, df: pl.DataFrame) -> None:
    """Async insert Polars DataFrame into DuckDB. Acquires write lock."""
    async with _write_lock:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, partial(_execute_write_from_polars, table, df))


def init_schema() -> None:
    """Create DuckDB tables if they don't exist. Called at startup."""
    conn = _get_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS prices_daily (
                symbol VARCHAR NOT NULL,
                date DATE NOT NULL,
                open DOUBLE,
                high DOUBLE,
                low DOUBLE,
                close DOUBLE,
                volume BIGINT,
                true_range DOUBLE,
                true_range_pct DOUBLE,
                turnover DOUBLE,
                PRIMARY KEY (symbol, date)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS prices_intraday (
                symbol VARCHAR NOT NULL,
                datetime TIMESTAMP NOT NULL,
                interval VARCHAR NOT NULL,
                open DOUBLE,
                high DOUBLE,
                low DOUBLE,
                close DOUBLE,
                volume BIGINT,
                true_range DOUBLE,
                true_range_pct DOUBLE,
                turnover DOUBLE,
                PRIMARY KEY (symbol, datetime, interval)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS atr_summary (
                symbol VARCHAR NOT NULL,
                interval VARCHAR NOT NULL,
                period_days INTEGER NOT NULL,
                atr_wilder DOUBLE,
                atr_pct_wilder DOUBLE,
                atr_with_open DOUBLE,
                atr_pct_with_open DOUBLE,
                atr_exclude_open DOUBLE,
                atr_pct_exclude_open DOUBLE,
                last_price_update TIMESTAMP,
                calculated_at TIMESTAMP,
                PRIMARY KEY (symbol, interval, period_days)
            )
        """)
    finally:
        conn.close()


def override_db_path(path: str) -> None:
    """Override the database path. Used for testing."""
    global _db_path
    _db_path = path
```

- [ ] **Step 2: Run existing tests to verify nothing broke**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/duckdb.py
git commit -m "feat: DuckDB connection manager with async wrappers and schema init"
```

---

## Task 4: SQLite Connection Manager

**Files:**
- Create: `backend/app/core/sqlite.py`

- [ ] **Step 1: Implement SQLite connection manager**

Create file `backend/app/core/sqlite.py`:

```python
"""SQLite connection manager for app state (symbols, jobs, config).

Uses aiosqlite for async compatibility with FastAPI.
WAL mode enabled for concurrent read/write.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import aiosqlite

from app.config import settings


_db_path: str = str(settings.sqlite_path)


@asynccontextmanager
async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Get an async SQLite connection with WAL mode."""
    settings.database_dir.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(_db_path)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_schema() -> None:
    """Create SQLite tables if they don't exist. Called at startup."""
    async with get_db() as db:
        # Enable WAL mode
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA busy_timeout=5000")

        await db.execute("""
            CREATE TABLE IF NOT EXISTS symbols (
                symbol TEXT PRIMARY KEY,
                name TEXT,
                sector TEXT,
                currency TEXT,
                is_active INTEGER DEFAULT 1,
                is_worth_trade_daily INTEGER DEFAULT 0,
                latest_price REAL,
                latest_price_date TEXT,
                added_at TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                job_type TEXT NOT NULL,
                symbol TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                progress INTEGER DEFAULT 0,
                total_items INTEGER DEFAULT 0,
                completed_items INTEGER DEFAULT 0,
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS app_config (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT NOT NULL
            )
        """)

        await db.commit()


def override_db_path(path: str) -> None:
    """Override the database path. Used for testing."""
    global _db_path
    _db_path = path
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/sqlite.py
git commit -m "feat: SQLite connection manager with WAL mode and schema init"
```

---

## Task 5: WebSocket Manager

**Files:**
- Create: `backend/app/core/websocket.py`

- [ ] **Step 1: Implement WebSocket manager**

Create file `backend/app/core/websocket.py`:

```python
"""WebSocket connection manager for real-time progress updates.

Single WebSocket endpoint. Background tasks broadcast typed JSON messages.
Frontend connects once on app mount, auto-reconnects on disconnect.
"""

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections and broadcasts messages."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast a JSON message to all connected clients."""
        text = json.dumps(message)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(text)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.active_connections.remove(conn)


# Singleton instance — shared across the app
ws_manager = WebSocketManager()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/websocket.py
git commit -m "feat: WebSocket manager for real-time broadcast"
```

---

## Task 6: Background Task Helper

**Files:**
- Create: `backend/app/core/background.py`

- [ ] **Step 1: Implement background task runner**

Create file `backend/app/core/background.py`:

```python
"""Background task helpers with WebSocket + job integration.

Provides a standard pattern for long-running tasks:
1. Create job record (pending)
2. Broadcast job:started
3. Do work, broadcasting job:progress periodically
4. Update job + broadcast job:complete or job:error
"""

import logging
import traceback
from typing import Any, Callable, Coroutine

from app.core.websocket import ws_manager

logger = logging.getLogger(__name__)


async def notify_job_started(job_id: str, job_type: str, symbol: str | None = None) -> None:
    """Broadcast job:started message."""
    msg: dict[str, Any] = {"type": "job:started", "job_id": job_id, "job_type": job_type}
    if symbol:
        msg["symbol"] = symbol
    await ws_manager.broadcast(msg)


async def notify_job_progress(
    job_id: str, completed: int, total: int, symbol: str | None = None
) -> None:
    """Broadcast job:progress message."""
    msg: dict[str, Any] = {
        "type": "job:progress",
        "job_id": job_id,
        "completed": completed,
        "total": total,
    }
    if symbol:
        msg["symbol"] = symbol
    await ws_manager.broadcast(msg)


async def notify_job_complete(job_id: str) -> None:
    """Broadcast job:complete message."""
    await ws_manager.broadcast({"type": "job:complete", "job_id": job_id, "status": "done"})


async def notify_job_error(job_id: str, error: str) -> None:
    """Broadcast job:error message."""
    await ws_manager.broadcast({"type": "job:error", "job_id": job_id, "error": error})


async def notify_data_updated(table: str, symbol: str | None = None) -> None:
    """Broadcast data:updated message to trigger frontend cache invalidation."""
    msg: dict[str, Any] = {"type": "data:updated", "table": table}
    if symbol:
        msg["symbol"] = symbol
    await ws_manager.broadcast(msg)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/background.py
git commit -m "feat: background task notification helpers for WebSocket"
```

---

## Task 7: Wire Up FastAPI App with Lifespan

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/tests/conftest.py`

- [ ] **Step 1: Update main.py with lifespan and schema init**

Replace `backend/app/main.py`:

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core import duckdb as duckdb_manager
from app.core import sqlite as sqlite_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize databases on startup."""
    duckdb_manager.init_schema()
    await sqlite_manager.init_schema()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# CORS — allow all origins for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(f"{settings.api_prefix}/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 2: Update conftest.py with test database isolation**

Replace `backend/tests/conftest.py`:

```python
import os
import tempfile
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.core import duckdb as duckdb_manager
from app.core import sqlite as sqlite_manager


@pytest.fixture(autouse=True)
def test_databases(tmp_path):
    """Use temporary databases for each test."""
    duckdb_path = str(tmp_path / "test_market.duckdb")
    sqlite_path = str(tmp_path / "test_app.sqlite")

    duckdb_manager.override_db_path(duckdb_path)
    sqlite_manager.override_db_path(sqlite_path)

    # Initialize schemas
    duckdb_manager.init_schema()

    yield

    # Cleanup happens automatically via tmp_path


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
```

- [ ] **Step 3: Run tests to verify setup works**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/main.py backend/tests/conftest.py
git commit -m "feat: FastAPI lifespan with DuckDB + SQLite schema init, test isolation"
```

---

## Task 8: Jobs Feature (needed by all other features)

**Files:**
- Create: `backend/app/features/jobs/models.py`
- Create: `backend/app/features/jobs/repo.py`
- Create: `backend/app/features/jobs/service.py`
- Create: `backend/app/features/jobs/router.py`
- Create: `backend/tests/test_jobs.py`

- [ ] **Step 1: Write failing test for job creation**

Create file `backend/tests/test_jobs.py`:

```python
import pytest


@pytest.mark.anyio
async def test_create_and_get_job(client):
    """Jobs are created by fetch/calculate endpoints, but we can list them."""
    response = await client.get("/api/v1/jobs")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.anyio
async def test_get_job_not_found(client):
    response = await client.get("/api/v1/jobs/nonexistent-id")
    assert response.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_jobs.py -v
```

Expected: FAIL (404 on /api/v1/jobs)

- [ ] **Step 3: Implement jobs models**

Create file `backend/app/features/jobs/models.py`:

```python
from datetime import datetime
from pydantic import BaseModel


class JobResponse(BaseModel):
    job_id: str
    job_type: str
    symbol: str | None = None
    status: str  # pending, running, done, failed
    progress: int = 0
    total_items: int = 0
    completed_items: int = 0
    error: str | None = None
    created_at: str
    updated_at: str


class JobCreated(BaseModel):
    job_id: str
    status: str = "pending"
```

- [ ] **Step 4: Implement jobs repo**

Create file `backend/app/features/jobs/repo.py`:

```python
import uuid
from datetime import datetime, timezone

from app.core.sqlite import get_db


async def create_job(job_type: str, symbol: str | None = None) -> str:
    """Create a new pending job. Returns job_id."""
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            """INSERT INTO jobs (job_id, job_type, symbol, status, created_at, updated_at)
               VALUES (?, ?, ?, 'pending', ?, ?)""",
            (job_id, job_type, symbol, now, now),
        )
        await db.commit()
    return job_id


async def update_job(
    job_id: str,
    status: str | None = None,
    progress: int | None = None,
    total_items: int | None = None,
    completed_items: int | None = None,
    error: str | None = None,
) -> None:
    """Update job fields. Only provided fields are updated."""
    now = datetime.now(timezone.utc).isoformat()
    updates = ["updated_at = ?"]
    params: list = [now]

    if status is not None:
        updates.append("status = ?")
        params.append(status)
    if progress is not None:
        updates.append("progress = ?")
        params.append(progress)
    if total_items is not None:
        updates.append("total_items = ?")
        params.append(total_items)
    if completed_items is not None:
        updates.append("completed_items = ?")
        params.append(completed_items)
    if error is not None:
        updates.append("error = ?")
        params.append(error)

    params.append(job_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE jobs SET {', '.join(updates)} WHERE job_id = ?",
            params,
        )
        await db.commit()


async def get_job(job_id: str) -> dict | None:
    """Get a single job by ID."""
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,))
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)


async def get_jobs(limit: int = 50) -> list[dict]:
    """Get all jobs, newest first."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
```

- [ ] **Step 5: Implement jobs service**

Create file `backend/app/features/jobs/service.py`:

```python
from app.features.jobs import repo
from app.features.jobs.models import JobResponse
from app.core.background import (
    notify_job_started,
    notify_job_progress,
    notify_job_complete,
    notify_job_error,
)


async def create_job(job_type: str, symbol: str | None = None) -> str:
    """Create a job and broadcast started notification."""
    job_id = await repo.create_job(job_type, symbol)
    await notify_job_started(job_id, job_type, symbol)
    return job_id


async def update_progress(job_id: str, completed: int, total: int, symbol: str | None = None):
    """Update job progress and broadcast."""
    progress = int((completed / total) * 100) if total > 0 else 0
    await repo.update_job(
        job_id, status="running", progress=progress,
        total_items=total, completed_items=completed,
    )
    await notify_job_progress(job_id, completed, total, symbol)


async def complete_job(job_id: str):
    """Mark job done and broadcast."""
    await repo.update_job(job_id, status="done", progress=100)
    await notify_job_complete(job_id)


async def fail_job(job_id: str, error: str):
    """Mark job failed and broadcast."""
    await repo.update_job(job_id, status="failed", error=error)
    await notify_job_error(job_id, error)


async def get_job(job_id: str) -> dict | None:
    return await repo.get_job(job_id)


async def get_jobs(limit: int = 50) -> list[dict]:
    return await repo.get_jobs(limit)
```

- [ ] **Step 6: Implement jobs router with WebSocket**

Create file `backend/app/features/jobs/router.py`:

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from app.config import settings
from app.core.websocket import ws_manager
from app.features.jobs import service
from app.features.jobs.models import JobResponse

router = APIRouter(prefix=f"{settings.api_prefix}/jobs", tags=["jobs"])


@router.get("", response_model=list[JobResponse])
async def list_jobs():
    """List all jobs, newest first."""
    return await service.get_jobs()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """Get a single job by ID."""
    job = await service.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return job


# WebSocket endpoint — mounted separately in main.py
ws_router = APIRouter()


@ws_router.websocket(f"{settings.api_prefix}/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive — client sends pings, we just listen
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
```

- [ ] **Step 7: Mount jobs router in main.py**

Update `backend/app/main.py` — add after CORS middleware:

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core import duckdb as duckdb_manager
from app.core import sqlite as sqlite_manager
from app.features.jobs.router import router as jobs_router, ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize databases on startup."""
    duckdb_manager.init_schema()
    await sqlite_manager.init_schema()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(jobs_router)
app.include_router(ws_router)


@app.get(f"{settings.api_prefix}/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: all PASS

- [ ] **Step 9: Commit**

```bash
git add backend/app/features/jobs/ backend/app/main.py backend/tests/test_jobs.py
git commit -m "feat: jobs feature with CRUD, WebSocket endpoint, progress notifications"
```

---

## Task 9: Symbols Feature

**Files:**
- Create: `backend/app/features/symbols/models.py`
- Create: `backend/app/features/symbols/repo.py`
- Create: `backend/app/features/symbols/service.py`
- Create: `backend/app/features/symbols/router.py`
- Create: `backend/tests/test_symbols.py`
- Modify: `backend/app/main.py` (mount router)

- [ ] **Step 1: Write failing tests for symbols**

Create file `backend/tests/test_symbols.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_symbols.py -v
```

Expected: FAIL (404 on /api/v1/symbols)

- [ ] **Step 3: Implement symbols models**

Create file `backend/app/features/symbols/models.py`:

```python
from pydantic import BaseModel, field_validator


class SymbolCreate(BaseModel):
    symbol: str

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, v: str) -> str:
        return v.strip().upper()


class SymbolResponse(BaseModel):
    symbol: str
    name: str | None = None
    sector: str | None = None
    currency: str | None = None
    is_active: bool = True
    is_worth_trade_daily: bool = False
    latest_price: float | None = None
    latest_price_date: str | None = None
    added_at: str | None = None
```

- [ ] **Step 4: Implement symbols repo**

Create file `backend/app/features/symbols/repo.py`:

```python
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
        cursor = await db.execute(
            "SELECT 1 FROM symbols WHERE symbol = ?", (symbol,)
        )
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
    """Delete symbol from SQLite. Price data cascade is handled by the service."""
    async with get_db() as db:
        await db.execute("DELETE FROM symbols WHERE symbol = ?", (symbol,))
        await db.commit()
```

- [ ] **Step 5: Implement symbols service**

Create file `backend/app/features/symbols/service.py`:

```python
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
    """Add a new symbol with yfinance metadata."""
    if await repo.exists(symbol):
        raise SymbolAlreadyExistsError(symbol)

    # Fetch metadata in executor (yfinance is sync)
    loop = asyncio.get_running_loop()
    info = await loop.run_in_executor(None, _fetch_yfinance_info, symbol)

    result = await repo.insert(symbol, info["name"], info["sector"], info["currency"])
    return result


async def get_symbol(symbol: str) -> dict:
    result = await repo.get_one(symbol)
    if result is None:
        raise SymbolNotFoundError(symbol)
    return result


async def get_symbols() -> list[dict]:
    return await repo.get_all()


async def disable_symbol(symbol: str) -> dict:
    await get_symbol(symbol)  # raises if not found
    return await repo.set_active(symbol, False)


async def enable_symbol(symbol: str) -> dict:
    await get_symbol(symbol)  # raises if not found
    return await repo.set_active(symbol, True)


async def delete_symbol(symbol: str) -> None:
    """Delete symbol and cascade-delete price data from DuckDB."""
    await get_symbol(symbol)  # raises if not found

    # Delete price data from DuckDB
    await duckdb_manager.write(
        "DELETE FROM prices_daily WHERE symbol = ?", [symbol]
    )
    await duckdb_manager.write(
        "DELETE FROM prices_intraday WHERE symbol = ?", [symbol]
    )
    await duckdb_manager.write(
        "DELETE FROM atr_summary WHERE symbol = ?", [symbol]
    )

    # Delete symbol from SQLite
    await repo.delete(symbol)
```

- [ ] **Step 6: Implement symbols router**

Create file `backend/app/features/symbols/router.py`:

```python
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
```

- [ ] **Step 7: Mount symbols router in main.py**

Add to `backend/app/main.py` imports and router includes:

```python
from app.features.symbols.router import router as symbols_router
```

Add after jobs router:
```python
app.include_router(symbols_router)
```

- [ ] **Step 8: Run tests**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: all PASS

- [ ] **Step 9: Commit**

```bash
git add backend/app/features/symbols/ backend/app/main.py backend/tests/test_symbols.py
git commit -m "feat: symbols feature with CRUD, yfinance metadata, cascade delete"
```

---

## Task 10: Prices Feature — Repo + Models

**Files:**
- Create: `backend/app/features/prices/models.py`
- Create: `backend/app/features/prices/repo.py`

- [ ] **Step 1: Implement price models**

Create file `backend/app/features/prices/models.py`:

```python
from pydantic import BaseModel


class PriceDailyResponse(BaseModel):
    symbol: str
    date: str
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: int | None = None
    true_range: float | None = None
    true_range_pct: float | None = None
    turnover: float | None = None


class PriceIntradayResponse(BaseModel):
    symbol: str
    datetime: str
    interval: str
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: int | None = None
    true_range: float | None = None
    true_range_pct: float | None = None
    turnover: float | None = None


class FetchResponse(BaseModel):
    job_id: str
    status: str = "pending"
```

- [ ] **Step 2: Implement prices repo**

Create file `backend/app/features/prices/repo.py`:

```python
import polars as pl

from app.core import duckdb as db


async def get_daily(symbol: str, start: str | None = None, end: str | None = None) -> pl.DataFrame:
    """Get daily prices for a symbol."""
    query = "SELECT * FROM prices_daily WHERE symbol = ?"
    params = [symbol]
    if start:
        query += " AND date >= ?"
        params.append(start)
    if end:
        query += " AND date <= ?"
        params.append(end)
    query += " ORDER BY date"
    return await db.read_polars(query, params)


async def get_intraday(
    symbol: str, interval: str, start: str | None = None, end: str | None = None
) -> pl.DataFrame:
    """Get intraday prices for a symbol."""
    query = "SELECT * FROM prices_intraday WHERE symbol = ? AND interval = ?"
    params = [symbol, interval]
    if start:
        query += " AND datetime >= ?"
        params.append(start)
    if end:
        query += " AND datetime <= ?"
        params.append(end)
    query += " ORDER BY datetime"
    return await db.read_polars(query, params)


async def upsert_daily(df: pl.DataFrame) -> None:
    """Insert or replace daily price data."""
    await db.write_polars("prices_daily", df)


async def upsert_intraday(df: pl.DataFrame) -> None:
    """Insert or replace intraday price data."""
    await db.write_polars("prices_intraday", df)


async def delete_by_symbol(symbol: str) -> None:
    """Delete all price data for a symbol."""
    await db.write("DELETE FROM prices_daily WHERE symbol = ?", [symbol])
    await db.write("DELETE FROM prices_intraday WHERE symbol = ?", [symbol])
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/features/prices/models.py backend/app/features/prices/repo.py
git commit -m "feat: prices models and DuckDB repo"
```

---

## Task 11: Prices Feature — Service (yfinance + True Range)

**Files:**
- Create: `backend/app/features/prices/service.py`
- Create: `backend/tests/test_prices.py`

- [ ] **Step 1: Write failing test for true range calculation**

Create file `backend/tests/test_prices.py`:

```python
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

    # Row 0: no prev_close, TR = H-L = 10, pct = 10/105*100 (use close as fallback)
    assert result["true_range"][0] == pytest.approx(10.0)
    assert result["true_range_pct"][0] == pytest.approx(10.0 / 105.0 * 100, rel=1e-4)

    # Row 1: prev_close=105, H-L=10, |H-prevC|=|115-105|=10, |L-prevC|=|105-105|=0
    # TR = max(10, 10, 0) = 10, pct = 10/105*100
    assert result["true_range"][1] == pytest.approx(10.0)
    assert result["true_range_pct"][1] == pytest.approx(10.0 / 105.0 * 100, rel=1e-4)

    # Row 2: prev_close=110, H-L=13, |H-prevC|=|108-110|=2, |L-prevC|=|95-110|=15
    # TR = max(13, 2, 15) = 15, pct = 15/110*100
    assert result["true_range"][2] == pytest.approx(15.0)
    assert result["true_range_pct"][2] == pytest.approx(15.0 / 110.0 * 100, rel=1e-4)


@pytest.mark.anyio
async def test_fetch_daily_creates_job(client):
    """Fetching daily prices should create a background job."""
    # First add a symbol
    await client.post("/api/v1/symbols", json={"symbol": "TEST.JK"})

    response = await client.post("/api/v1/prices/TEST.JK/fetch/daily")
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "pending"


@pytest.mark.anyio
async def test_get_daily_empty(client):
    """Getting daily prices for a symbol with no data returns empty list."""
    await client.post("/api/v1/symbols", json={"symbol": "TEST.JK"})
    response = await client.get("/api/v1/prices/daily/TEST.JK")
    assert response.status_code == 200
    assert response.json() == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_prices.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement prices service**

Create file `backend/app/features/prices/service.py`:

```python
"""Price data ingestion service.

Fetches OHLCV from yfinance, computes 3-way true range,
stores in DuckDB via background tasks with WebSocket progress.
"""

import asyncio
import logging
from datetime import datetime, timezone

import pandas as pd
import polars as pl
import yfinance as yf

from app.core.background import notify_data_updated
from app.features.prices import repo
from app.features.symbols import repo as symbols_repo
from app.features.jobs import service as jobs_service

logger = logging.getLogger(__name__)

# Interval mapping: our names -> yfinance names
INTERVAL_MAP = {
    "daily": "1d",
    "15min": "15m",
    "30min": "30m",
    "1hour": "1h",
}

# yfinance period by interval
PERIOD_MAP = {
    "daily": "1y",
    "15min": "60d",
    "30min": "60d",
    "1hour": "60d",
}


def compute_true_range(df: pl.DataFrame) -> pl.DataFrame:
    """Compute 3-way true range and true_range_pct on a DataFrame with high, low, close columns.

    TR = max(H-L, |H-prevC|, |L-prevC|)
    TR% = TR / prev_close * 100  (first row: TR / close * 100)
    """
    prev_close = df["close"].shift(1)
    h_l = df["high"] - df["low"]
    h_pc = (df["high"] - prev_close).abs()
    l_pc = (df["low"] - prev_close).abs()

    # For first row, h_pc and l_pc are null due to shift. Use h_l only.
    tr = pl.max_horizontal(h_l, h_pc, l_pc).fill_null(h_l)

    # Percentage: TR / prev_close * 100 (fallback to close for first row)
    denom = prev_close.fill_null(df["close"])
    tr_pct = (tr / denom * 100).round(4)

    return df.with_columns([
        tr.alias("true_range"),
        tr_pct.alias("true_range_pct"),
    ])


def _fetch_yfinance_daily(symbol: str) -> pd.DataFrame:
    """Fetch daily OHLCV from yfinance. Synchronous."""
    return yf.download(symbol, period="1y", auto_adjust=True, progress=False)


def _fetch_yfinance_intraday(symbol: str, interval: str) -> pd.DataFrame:
    """Fetch intraday OHLCV from yfinance. Synchronous."""
    yf_interval = INTERVAL_MAP.get(interval, interval)
    return yf.download(symbol, period="60d", interval=yf_interval, auto_adjust=True, progress=False)


async def fetch_daily(symbol: str) -> None:
    """Fetch daily prices for a symbol and store in DuckDB."""
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(None, _fetch_yfinance_daily, symbol)

    if raw.empty:
        logger.warning(f"No daily data returned for {symbol}")
        return

    # Convert pandas -> polars
    raw = raw.reset_index()
    # Handle multi-level columns from yfinance
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = [col[0] if col[1] == "" else col[0] for col in raw.columns]

    df = pl.from_pandas(raw)

    # Normalize column names
    col_map = {}
    for col in df.columns:
        lower = col.lower()
        if lower in ("date", "open", "high", "low", "close", "volume"):
            col_map[col] = lower
    df = df.rename(col_map)

    # Add symbol, compute derived columns
    df = df.with_columns(pl.lit(symbol).alias("symbol"))
    df = df.with_columns((df["volume"].cast(pl.Float64) * df["close"]).alias("turnover"))
    df = compute_true_range(df)

    # Cast date column
    if df["date"].dtype != pl.Date:
        df = df.with_columns(pl.col("date").cast(pl.Date))

    # Select final columns in schema order
    df = df.select([
        "symbol", "date", "open", "high", "low", "close",
        pl.col("volume").cast(pl.Int64),
        "true_range", "true_range_pct", "turnover",
    ])

    await repo.upsert_daily(df)

    # Update latest price on symbol
    last_row = df.tail(1)
    if len(last_row) > 0:
        await symbols_repo.update_price(
            symbol,
            float(last_row["close"][0]),
            str(last_row["date"][0]),
        )

    await notify_data_updated("prices_daily", symbol)


async def fetch_intraday(symbol: str, interval: str) -> None:
    """Fetch intraday prices for a symbol and store in DuckDB."""
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(None, _fetch_yfinance_intraday, symbol, interval)

    if raw.empty:
        logger.warning(f"No intraday data returned for {symbol} ({interval})")
        return

    raw = raw.reset_index()
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = [col[0] if col[1] == "" else col[0] for col in raw.columns]

    df = pl.from_pandas(raw)

    # Normalize column names
    col_map = {}
    for col in df.columns:
        lower = col.lower()
        if lower in ("datetime", "open", "high", "low", "close", "volume"):
            col_map[col] = lower
    df = df.rename(col_map)

    # Add symbol + interval
    df = df.with_columns([
        pl.lit(symbol).alias("symbol"),
        pl.lit(interval).alias("interval"),
    ])
    df = df.with_columns((df["volume"].cast(pl.Float64) * df["close"]).alias("turnover"))
    df = compute_true_range(df)

    # Cast datetime
    if "datetime" not in df.columns and "Datetime" in df.columns:
        df = df.rename({"Datetime": "datetime"})
    if df["datetime"].dtype != pl.Datetime:
        df = df.with_columns(pl.col("datetime").cast(pl.Datetime("us")))

    df = df.select([
        "symbol", "datetime", "interval", "open", "high", "low", "close",
        pl.col("volume").cast(pl.Int64),
        "true_range", "true_range_pct", "turnover",
    ])

    await repo.upsert_intraday(df)
    await notify_data_updated("prices_intraday", symbol)


async def fetch_daily_background(symbol: str, job_id: str) -> None:
    """Background task: fetch daily data for a single symbol."""
    try:
        await jobs_service.update_progress(job_id, 0, 1, symbol)
        await fetch_daily(symbol)
        await jobs_service.update_progress(job_id, 1, 1, symbol)
        await jobs_service.complete_job(job_id)
    except Exception as e:
        logger.exception(f"Failed to fetch daily data for {symbol}")
        await jobs_service.fail_job(job_id, str(e))


async def fetch_all_background(interval: str, job_id: str) -> None:
    """Background task: fetch data for all active symbols."""
    from app.features.symbols import repo as sym_repo

    try:
        symbols = await sym_repo.get_all()
        active = [s for s in symbols if s.get("is_active", True)]
        total = len(active)

        for i, sym in enumerate(active):
            symbol = sym["symbol"]
            try:
                if interval == "daily":
                    await fetch_daily(symbol)
                else:
                    await fetch_intraday(symbol, interval)
            except Exception as e:
                logger.warning(f"Failed to fetch {interval} for {symbol}: {e}")

            await jobs_service.update_progress(job_id, i + 1, total, symbol)

        await jobs_service.complete_job(job_id)
    except Exception as e:
        logger.exception(f"Bulk fetch failed for interval {interval}")
        await jobs_service.fail_job(job_id, str(e))
```

- [ ] **Step 4: Implement prices router**

Create file `backend/app/features/prices/router.py`:

```python
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.config import settings
from app.core.errors import SymbolNotFoundError
from app.features.prices import service
from app.features.prices.models import PriceDailyResponse, PriceIntradayResponse, FetchResponse
from app.features.symbols import service as symbols_service
from app.features.jobs import service as jobs_service

router = APIRouter(prefix=f"{settings.api_prefix}/prices", tags=["prices"])


@router.get("/daily/{symbol}", response_model=list[PriceDailyResponse])
async def get_daily(symbol: str, start: str | None = None, end: str | None = None):
    symbol = symbol.upper()
    df = await service.repo.get_daily(symbol, start, end)
    return df.to_dicts()


@router.get("/intraday/{symbol}", response_model=list[PriceIntradayResponse])
async def get_intraday(
    symbol: str, interval: str = "30min", start: str | None = None, end: str | None = None
):
    symbol = symbol.upper()
    df = await service.repo.get_intraday(symbol, interval, start, end)
    return df.to_dicts()


@router.post("/{symbol}/fetch/{interval}", response_model=FetchResponse, status_code=202)
async def fetch_prices(symbol: str, interval: str, background_tasks: BackgroundTasks):
    symbol = symbol.upper()
    try:
        await symbols_service.get_symbol(symbol)
    except SymbolNotFoundError:
        raise HTTPException(status_code=404, detail=f"Symbol not found: {symbol}")

    job_id = await jobs_service.create_job(f"fetch_{interval}", symbol)

    if interval == "daily":
        background_tasks.add_task(service.fetch_daily_background, symbol, job_id)
    else:
        background_tasks.add_task(
            service.fetch_intraday, symbol, interval
        )
        # For single-symbol intraday, complete immediately after task
        background_tasks.add_task(jobs_service.complete_job, job_id)

    return FetchResponse(job_id=job_id)


@router.post("/fetch-all/{interval}", response_model=FetchResponse, status_code=202)
async def fetch_all(interval: str, background_tasks: BackgroundTasks):
    job_id = await jobs_service.create_job(f"fetch_all_{interval}")
    background_tasks.add_task(service.fetch_all_background, interval, job_id)
    return FetchResponse(job_id=job_id)
```

- [ ] **Step 5: Mount prices router in main.py**

Add to `backend/app/main.py`:

```python
from app.features.prices.router import router as prices_router
```

And:
```python
app.include_router(prices_router)
```

- [ ] **Step 6: Run tests**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/features/prices/ backend/app/main.py backend/tests/test_prices.py
git commit -m "feat: prices feature with yfinance fetcher, 3-way true range, background jobs"
```

---

## Task 12: Analytics Feature — ATR Service (Wilder's)

**Files:**
- Create: `backend/app/features/analytics/models.py`
- Create: `backend/app/features/analytics/repo.py`
- Create: `backend/app/features/analytics/atr_service.py`
- Create: `backend/tests/test_analytics.py`

- [ ] **Step 1: Write failing test for Wilder's ATR**

Create file `backend/tests/test_analytics.py`:

```python
import polars as pl
import pytest


def test_wilder_atr():
    """Wilder's smoothing: ATR[0] = mean(TR[0:N]), ATR[i] = ATR[i-1]*(N-1)/N + TR[i]/N"""
    from app.features.analytics.atr_service import compute_wilder_atr

    true_ranges = [10.0, 12.0, 8.0, 11.0, 9.0, 14.0, 7.0, 13.0]
    period = 5

    result = compute_wilder_atr(true_ranges, period)

    # First ATR = mean of first 5: (10+12+8+11+9)/5 = 10.0
    assert result[0] == pytest.approx(10.0)

    # ATR[1] = 10.0 * 4/5 + 14.0/5 = 8.0 + 2.8 = 10.8
    assert result[1] == pytest.approx(10.8)

    # ATR[2] = 10.8 * 4/5 + 7.0/5 = 8.64 + 1.4 = 10.04
    assert result[2] == pytest.approx(10.04)

    # ATR[3] = 10.04 * 4/5 + 13.0/5 = 8.032 + 2.6 = 10.632
    assert result[3] == pytest.approx(10.632)


def test_wilder_atr_insufficient_data():
    """With fewer data points than period, return empty list."""
    from app.features.analytics.atr_service import compute_wilder_atr

    result = compute_wilder_atr([10.0, 12.0], period=5)
    assert result == []
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_analytics.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement analytics models**

Create file `backend/app/features/analytics/models.py`:

```python
from pydantic import BaseModel


class AtrSummaryResponse(BaseModel):
    symbol: str
    interval: str
    period_days: int
    atr_wilder: float | None = None
    atr_pct_wilder: float | None = None
    atr_with_open: float | None = None
    atr_pct_with_open: float | None = None
    atr_exclude_open: float | None = None
    atr_pct_exclude_open: float | None = None
    calculated_at: str | None = None


class TurnoverResponse(BaseModel):
    symbol: str
    avg_turnover: float
    period_days: int


class WtdReportItem(BaseModel):
    symbol: str
    is_worth_trade_daily: bool
    turnover_1w: float | None = None
    turnover_2w: float | None = None
    atr_1h_1w_pass: bool = False
    atr_1h_2w_pass: bool = False
    atr_daily_1w_pass: bool = False
    atr_daily_2w_pass: bool = False
    atr_conditions_met: int = 0
```

- [ ] **Step 4: Implement analytics repo**

Create file `backend/app/features/analytics/repo.py`:

```python
import polars as pl
from datetime import datetime, timezone

from app.core import duckdb as db


async def get_atr_summary(
    interval: str | None = None, symbol: str | None = None
) -> pl.DataFrame:
    query = "SELECT * FROM atr_summary WHERE 1=1"
    params = []
    if interval:
        query += " AND interval = ?"
        params.append(interval)
    if symbol:
        query += " AND symbol = ?"
        params.append(symbol)
    query += " ORDER BY symbol, interval, period_days"
    return await db.read_polars(query, params if params else None)


async def upsert_atr_summary(df: pl.DataFrame) -> None:
    await db.write_polars("atr_summary", df)


async def get_daily_turnover(symbol: str, days: int) -> float | None:
    """Get average daily turnover for a symbol over the last N days."""
    rows = await db.read(
        """SELECT AVG(turnover) as avg_turnover
           FROM (SELECT turnover FROM prices_daily
                 WHERE symbol = ? ORDER BY date DESC LIMIT ?)""",
        [symbol, days],
    )
    if rows and rows[0][0] is not None:
        return float(rows[0][0])
    return None


async def get_prices_for_atr(
    symbol: str, interval: str, limit_days: int
) -> pl.DataFrame:
    """Get price data needed for ATR computation."""
    if interval == "daily":
        return await db.read_polars(
            """SELECT date, open, high, low, close, true_range, true_range_pct
               FROM prices_daily WHERE symbol = ?
               ORDER BY date DESC LIMIT ?""",
            [symbol, limit_days],
        )
    else:
        return await db.read_polars(
            """SELECT datetime, open, high, low, close, true_range, true_range_pct
               FROM prices_intraday WHERE symbol = ? AND interval = ?
               ORDER BY datetime DESC LIMIT ?""",
            [symbol, interval, limit_days * 20],  # ~20 bars per day
        )
```

- [ ] **Step 5: Implement ATR service with Wilder's smoothing**

Create file `backend/app/features/analytics/atr_service.py`:

```python
"""ATR computation service using Wilder's smoothing and simple mean.

Wilder's:
  ATR[0] = mean(TR[0:N])
  ATR[i] = ATR[i-1] * (N-1)/N + TR[i]/N

Both with-opening-bar and exclude-opening-bar variants computed for intraday.
"""

import logging
from datetime import datetime, timezone

import polars as pl

from app.features.analytics import repo
from app.features.symbols import repo as symbols_repo
from app.features.jobs import service as jobs_service
from app.core.background import notify_data_updated

logger = logging.getLogger(__name__)

ATR_PERIODS = [1, 7, 14, 30, 90, 180]


def compute_wilder_atr(true_ranges: list[float], period: int) -> list[float]:
    """Compute Wilder's exponentially smoothed ATR.

    Args:
        true_ranges: List of true range values, oldest first.
        period: Lookback period (N).

    Returns:
        List of ATR values, one per period after the initial seed.
        Length = len(true_ranges) - period + 1, or empty if insufficient data.
    """
    if len(true_ranges) < period:
        return []

    # Seed: simple mean of first N values
    seed = sum(true_ranges[:period]) / period
    result = [seed]

    # Smooth subsequent values
    for i in range(period, len(true_ranges)):
        prev = result[-1]
        atr = prev * (period - 1) / period + true_ranges[i] / period
        result.append(atr)

    return result


async def calculate_atr(interval: str) -> None:
    """Calculate ATR for all active symbols at the given interval."""
    symbols = await symbols_repo.get_all()
    active = [s for s in symbols if s.get("is_active", True)]
    now = datetime.now(timezone.utc).isoformat()

    results = []

    for sym in active:
        symbol = sym["symbol"]
        try:
            prices = await repo.get_prices_for_atr(symbol, interval, max(ATR_PERIODS) + 10)

            if len(prices) == 0:
                continue

            # Sort oldest first for ATR computation
            if "date" in prices.columns:
                prices = prices.sort("date")
            else:
                prices = prices.sort("datetime")

            tr_values = prices["true_range"].drop_nulls().to_list()
            tr_pct_values = prices["true_range_pct"].drop_nulls().to_list()

            for period in ATR_PERIODS:
                if len(tr_values) < period:
                    continue

                # Wilder's ATR
                wilder_values = compute_wilder_atr(tr_values, period)
                wilder_pct_values = compute_wilder_atr(tr_pct_values, period)
                atr_wilder = wilder_values[-1] if wilder_values else None
                atr_pct_wilder = wilder_pct_values[-1] if wilder_pct_values else None

                # Simple mean (with opening bar = all bars)
                recent_tr = tr_values[-period:]
                recent_tr_pct = tr_pct_values[-period:]
                atr_with_open = sum(recent_tr) / len(recent_tr)
                atr_pct_with_open = sum(recent_tr_pct) / len(recent_tr_pct)

                # Exclude opening bar: for intraday, skip first bar of each day
                # For daily, same as with_open (one bar per day)
                atr_exclude_open = atr_with_open
                atr_pct_exclude_open = atr_pct_with_open

                if interval != "daily" and "datetime" in prices.columns:
                    # Filter out first bar of each day
                    prices_with_date = prices.with_columns(
                        pl.col("datetime").cast(pl.Date).alias("_date")
                    )
                    first_bars = prices_with_date.group_by("_date").agg(
                        pl.col("datetime").min().alias("first_dt")
                    )
                    first_dts = set(first_bars["first_dt"].to_list())
                    mask = [dt not in first_dts for dt in prices["datetime"].to_list()]
                    filtered = prices.filter(pl.Series(mask))

                    if len(filtered) >= period:
                        tr_no_ob = filtered["true_range"].drop_nulls().to_list()[-period:]
                        tr_pct_no_ob = filtered["true_range_pct"].drop_nulls().to_list()[-period:]
                        if tr_no_ob:
                            atr_exclude_open = sum(tr_no_ob) / len(tr_no_ob)
                            atr_pct_exclude_open = sum(tr_pct_no_ob) / len(tr_pct_no_ob)

                results.append({
                    "symbol": symbol,
                    "interval": interval if interval != "daily" else "daily",
                    "period_days": period,
                    "atr_wilder": round(atr_wilder, 4) if atr_wilder else None,
                    "atr_pct_wilder": round(atr_pct_wilder, 4) if atr_pct_wilder else None,
                    "atr_with_open": round(atr_with_open, 4),
                    "atr_pct_with_open": round(atr_pct_with_open, 4),
                    "atr_exclude_open": round(atr_exclude_open, 4),
                    "atr_pct_exclude_open": round(atr_pct_exclude_open, 4),
                    "last_price_update": sym.get("latest_price_date"),
                    "calculated_at": now,
                })

        except Exception as e:
            logger.warning(f"ATR calculation failed for {symbol}: {e}")

    if results:
        df = pl.DataFrame(results)
        await repo.upsert_atr_summary(df)
        await notify_data_updated("atr_summary")


async def calculate_atr_background(interval: str, job_id: str) -> None:
    """Background task wrapper for ATR calculation."""
    try:
        await jobs_service.update_progress(job_id, 0, 1)
        await calculate_atr(interval)
        await jobs_service.complete_job(job_id)
    except Exception as e:
        logger.exception(f"ATR calculation failed for {interval}")
        await jobs_service.fail_job(job_id, str(e))
```

- [ ] **Step 6: Run tests**

```bash
cd backend && python -m pytest tests/test_analytics.py -v
```

Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/features/analytics/
git commit -m "feat: analytics ATR service with Wilder's smoothing via Polars"
```

---

## Task 13: Analytics Feature — WTD Service + Router

**Files:**
- Create: `backend/app/features/analytics/wtd_service.py`
- Create: `backend/app/features/analytics/router.py`
- Modify: `backend/app/main.py` (mount router)

- [ ] **Step 1: Add WTD test**

Append to `backend/tests/test_analytics.py`:

```python
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
```

- [ ] **Step 2: Implement WTD service**

Create file `backend/app/features/analytics/wtd_service.py`:

```python
"""Worth-Trade-Daily evaluation service.

Criteria (all must pass):
- Turnover: avg daily turnover >= 50B IDR for both 1W and 2W
- ATR: >= 3 of 4 conditions:
  - 1H ATR 1W: atr_exclude_open >= 5 AND atr_pct_exclude_open >= 2%
  - 1H ATR 2W: atr_exclude_open >= 5 AND atr_pct_exclude_open >= 2%
  - Daily ATR 1W: atr_pct_exclude_open >= 8%
  - Daily ATR 2W: atr_pct_exclude_open >= 8%
"""

import logging

from app.features.analytics import repo
from app.features.symbols import repo as symbols_repo
from app.features.jobs import service as jobs_service
from app.core.background import notify_data_updated

logger = logging.getLogger(__name__)

TURNOVER_THRESHOLD = 50_000_000_000  # 50B IDR


async def evaluate_wtd() -> list[dict]:
    """Evaluate WTD criteria for all active symbols. Returns report items."""
    symbols = await symbols_repo.get_all()
    active = [s for s in symbols if s.get("is_active", True)]

    atr_df = await repo.get_atr_summary()
    results = []

    for sym in active:
        symbol = sym["symbol"]

        # Turnover check
        turnover_1w = await repo.get_daily_turnover(symbol, 5)
        turnover_2w = await repo.get_daily_turnover(symbol, 10)
        turnover_pass = (
            turnover_1w is not None
            and turnover_2w is not None
            and turnover_1w >= TURNOVER_THRESHOLD
            and turnover_2w >= TURNOVER_THRESHOLD
        )

        # ATR conditions
        def _get_atr(interval: str, period: int) -> dict | None:
            if len(atr_df) == 0:
                return None
            filtered = atr_df.filter(
                (atr_df["symbol"] == symbol)
                & (atr_df["interval"] == interval)
                & (atr_df["period_days"] == period)
            )
            if len(filtered) == 0:
                return None
            return filtered.to_dicts()[0]

        atr_1h_1w = _get_atr("1hour", 7)
        atr_1h_2w = _get_atr("1hour", 14)
        atr_daily_1w = _get_atr("daily", 7)
        atr_daily_2w = _get_atr("daily", 14)

        conditions = 0
        c1 = (
            atr_1h_1w is not None
            and (atr_1h_1w.get("atr_exclude_open") or 0) >= 5
            and (atr_1h_1w.get("atr_pct_exclude_open") or 0) >= 2
        )
        c2 = (
            atr_1h_2w is not None
            and (atr_1h_2w.get("atr_exclude_open") or 0) >= 5
            and (atr_1h_2w.get("atr_pct_exclude_open") or 0) >= 2
        )
        c3 = (
            atr_daily_1w is not None
            and (atr_daily_1w.get("atr_pct_exclude_open") or 0) >= 8
        )
        c4 = (
            atr_daily_2w is not None
            and (atr_daily_2w.get("atr_pct_exclude_open") or 0) >= 8
        )
        conditions = sum([c1, c2, c3, c4])

        is_wtd = turnover_pass and conditions >= 3

        # Update symbol in DB
        await symbols_repo.update_wtd(symbol, is_wtd)

        results.append({
            "symbol": symbol,
            "is_worth_trade_daily": is_wtd,
            "turnover_1w": turnover_1w,
            "turnover_2w": turnover_2w,
            "atr_1h_1w_pass": c1,
            "atr_1h_2w_pass": c2,
            "atr_daily_1w_pass": c3,
            "atr_daily_2w_pass": c4,
            "atr_conditions_met": conditions,
        })

    await notify_data_updated("symbols")
    return results


async def evaluate_wtd_background(job_id: str) -> None:
    """Background task wrapper for WTD evaluation."""
    try:
        await jobs_service.update_progress(job_id, 0, 1)
        await evaluate_wtd()
        await jobs_service.complete_job(job_id)
    except Exception as e:
        logger.exception("WTD evaluation failed")
        await jobs_service.fail_job(job_id, str(e))
```

- [ ] **Step 3: Implement analytics router**

Create file `backend/app/features/analytics/router.py`:

```python
from fastapi import APIRouter, BackgroundTasks

from app.config import settings
from app.features.analytics import repo, atr_service, wtd_service
from app.features.analytics.models import AtrSummaryResponse, WtdReportItem
from app.features.jobs import service as jobs_service
from app.features.jobs.models import JobCreated

router = APIRouter(prefix=f"{settings.api_prefix}/analytics", tags=["analytics"])


@router.get("/atr/summary", response_model=list[AtrSummaryResponse])
async def get_atr_summary(interval: str | None = None, symbol: str | None = None):
    df = await repo.get_atr_summary(interval, symbol.upper() if symbol else None)
    return df.to_dicts()


@router.post("/atr/calculate/{interval}", response_model=JobCreated, status_code=202)
async def calculate_atr(interval: str, background_tasks: BackgroundTasks):
    job_id = await jobs_service.create_job(f"atr_calc_{interval}")
    background_tasks.add_task(atr_service.calculate_atr_background, interval, job_id)
    return JobCreated(job_id=job_id)


@router.get("/turnover")
async def get_turnover(symbol: str | None = None, days: int = 7):
    """Get average daily turnover. If no symbol, returns all active symbols."""
    if symbol:
        avg = await repo.get_daily_turnover(symbol.upper(), days)
        return [{"symbol": symbol.upper(), "avg_turnover": avg, "period_days": days}]

    from app.features.symbols import repo as sym_repo
    symbols = await sym_repo.get_all()
    results = []
    for sym in symbols:
        if sym.get("is_active", True):
            avg = await repo.get_daily_turnover(sym["symbol"], days)
            results.append({
                "symbol": sym["symbol"],
                "avg_turnover": avg,
                "period_days": days,
            })
    return results


@router.get("/wtd/report", response_model=list[WtdReportItem])
async def get_wtd_report():
    """Get the latest WTD evaluation results."""
    return await wtd_service.evaluate_wtd()


@router.post("/wtd/check", response_model=JobCreated, status_code=202)
async def check_wtd(background_tasks: BackgroundTasks):
    job_id = await jobs_service.create_job("wtd_check")
    background_tasks.add_task(wtd_service.evaluate_wtd_background, job_id)
    return JobCreated(job_id=job_id)
```

- [ ] **Step 4: Mount analytics router in main.py**

Add to `backend/app/main.py`:

```python
from app.features.analytics.router import router as analytics_router
```

And:
```python
app.include_router(analytics_router)
```

- [ ] **Step 5: Run all tests**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/features/analytics/ backend/app/main.py backend/tests/test_analytics.py
git commit -m "feat: analytics feature with Wilder's ATR, WTD evaluation, turnover"
```

---

## Task 14: Final Backend Integration

**Files:**
- Verify: `backend/app/main.py` has all routers mounted
- Create: `backend/scripts/seed_data.py`

- [ ] **Step 1: Verify main.py has all routers**

Final `backend/app/main.py` should look like:

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core import duckdb as duckdb_manager
from app.core import sqlite as sqlite_manager
from app.features.jobs.router import router as jobs_router, ws_router
from app.features.symbols.router import router as symbols_router
from app.features.prices.router import router as prices_router
from app.features.analytics.router import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize databases on startup."""
    duckdb_manager.init_schema()
    await sqlite_manager.init_schema()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Feature routers
app.include_router(jobs_router)
app.include_router(ws_router)
app.include_router(symbols_router)
app.include_router(prices_router)
app.include_router(analytics_router)


@app.get(f"{settings.api_prefix}/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 2: Create seed script**

Create file `backend/scripts/__init__.py` (empty).

Create file `backend/scripts/seed_data.py`:

```python
"""Seed the database with sample IDX stocks for development."""

import asyncio
import httpx

API_URL = "http://localhost:8000/api/v1"

# Top IDX stocks by market cap
SEED_SYMBOLS = [
    "BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK",
    "BBNI.JK", "UNVR.JK", "HMSP.JK", "ICBP.JK", "KLBF.JK",
]


async def main():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Check health
        r = await client.get(f"{API_URL}/health")
        assert r.status_code == 200, f"API not running: {r.text}"
        print("API is healthy")

        # Add symbols
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
```

- [ ] **Step 3: Run full test suite**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: all tests PASS

- [ ] **Step 4: Manual verification**

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

In another terminal:
```bash
curl http://localhost:8000/api/v1/health
# Expected: {"status":"ok"}

curl http://localhost:8000/docs
# Expected: Swagger UI loads with all endpoints
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py backend/scripts/
git commit -m "feat: complete Phase 1 backend with all features wired up"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All Phase 1 backend requirements covered — DuckDB schema, SQLite schema, 4 features (symbols, prices, analytics, jobs), WebSocket, all 18 REST endpoints, background tasks.
- [x] **Placeholder scan:** No TBD, TODO, or vague steps. All code blocks are complete.
- [x] **Type consistency:** `JobResponse`, `SymbolResponse`, `AtrSummaryResponse` etc. are consistent across models, repos, services, and routers. `compute_wilder_atr` signature matches test. `compute_true_range` signature matches test.
- [x] **DuckDB pattern:** All calls use `run_in_executor` via the `duckdb.py` async wrappers. Write lock via `asyncio.Lock`.
- [x] **yfinance:** Wrapped in `run_in_executor` (synchronous library).
- [x] **True range:** 3-way formula in `compute_true_range`. `true_range_pct = TR / prev_close * 100`.
- [x] **ATR:** Wilder's smoothing in `compute_wilder_atr` with correct formula, tested against hand-calculated values.
