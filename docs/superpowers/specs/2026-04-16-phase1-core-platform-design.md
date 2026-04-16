# TradeJutsu Phase 1 — Core Platform & Data Foundation

## Overview

TradeJutsu is a personal stock trading and investment analytics web app focused on the Indonesian Stock Exchange (IDX). It replaces the old WanTrade app (Python/FastAPI/Streamlit/DuckDB/VectorBT) with a modern full-stack architecture.

This spec covers **Phase 1: Core Platform & Data Foundation** — the project skeleton, databases, market data ingestion, symbol management, analytics (ATR, turnover, WTD), and the React frontend.

**User**: Solo trader, no auth needed.
**Market**: IDX only (365 stocks, .JK suffix).

### Phases (full roadmap)

| Phase | Scope |
|-------|-------|
| **1 (this spec)** | Core platform, database, market data ingestion, analytics, React frontend |
| 2 | Pluggable backtesting engine, LogicSet1 port with correctness fixes |
| 3 | External data collection (news, YouTube, social media, macro data) |
| 4 | AI analytics layer (Claude API reasoning + ML price prediction) |
| 5 | AI strategy discovery + portfolio optimization |

---

## Architecture: Feature Modules (Vertical Slices)

Each feature is a self-contained module with its own router, models, service, and repo. Frontend mirrors backend structure.

### Why Feature Modules

- The old WanTrade already had this natural shape (`modules/symbols/`, `modules/vbt_backtest/`)
- Phase 2 backtesting drops in as `features/backtest/` without restructuring existing code
- Frontend-backend alignment: work on "analytics" = one folder on each side

---

## Tech Stack

### Backend
| Component | Technology | Notes |
|-----------|-----------|-------|
| API | FastAPI | Async, BackgroundTasks, WebSocket |
| Market DB | DuckDB | Columnar analytics, Arrow/Polars interop |
| App DB | SQLite (aiosqlite) | WAL mode, transactional CRUD |
| Data processing | Polars | Heavy analytics; Pandas only where libraries require it |
| Market data | yfinance | Daily (1y) + intraday (60d) |
| HTTP client | httpx | Async, connection pooling, 30s timeout, retry with backoff |
| Validation | Pydantic v2 | Request/response models |

### Frontend
| Component | Technology | Notes |
|-----------|-----------|-------|
| Framework | React + TypeScript | Via Vite |
| Data fetching | TanStack Query | Caching, stale-while-revalidate, WS-triggered invalidation |
| Routing | React Router | URL-based navigation |
| Tables | AG Grid | Virtual scrolling for 365+ stock rows |
| Price charts | TradingView Lightweight Charts | Candlestick + OHLCV |
| Analytics charts | Apache ECharts | ATR comparisons, turnover bars |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, consistent look |

---

## Database Schema

### DuckDB — Market Data (`backend/database/market.duckdb`)

Columnar engine. Fast range scans, aggregations, millions of rows.

**prices_daily**
```
symbol VARCHAR + date DATE → PK
open, high, low, close DOUBLE
volume BIGINT
true_range DOUBLE        -- 3-way: max(H-L, |H-prevC|, |L-prevC|)  [FIX from WanTrade]
true_range_pct DOUBLE    -- TR/prev_close*100  [FIX: was TR/close, now consistent with 3-way formula]
turnover DOUBLE          -- volume * close
```

**prices_intraday**
```
symbol + datetime TIMESTAMP + interval VARCHAR → PK
open, high, low, close DOUBLE
volume BIGINT
true_range DOUBLE        -- 3-way: max(H-L, |H-prevC|, |L-prevC|)
true_range_pct DOUBLE    -- TR/prev_close*100
turnover DOUBLE          -- volume * close
-- intervals: 15min, 30min, 1hour
```

**atr_summary**
```
symbol + interval + period_days → PK   -- period_days: [1, 7, 14, 30, 90, 180]
atr_wilder DOUBLE             -- Wilder's exponential smoothing  [NEW]
atr_pct_wilder DOUBLE         -- [NEW]
atr_with_open DOUBLE          -- simple mean, including opening bar
atr_pct_with_open DOUBLE
atr_exclude_open DOUBLE       -- simple mean, excluding opening bar
atr_pct_exclude_open DOUBLE
last_price_update TIMESTAMP
calculated_at TIMESTAMP
```

### SQLite — App State (`backend/database/app.sqlite`)

WAL mode. Frequent small writes, CRUD.

**symbols**
```
symbol TEXT PK            -- e.g. BBCA.JK
name, sector, currency TEXT
is_active INTEGER DEFAULT 1
is_worth_trade_daily INTEGER DEFAULT 0
latest_price REAL
latest_price_date TEXT
added_at TEXT             -- ISO timestamp
```

**jobs**
```
job_id TEXT PK            -- UUID
job_type TEXT             -- fetch_daily, fetch_intraday, atr_calc, wtd_check
symbol TEXT               -- nullable (bulk jobs have no single symbol)
status TEXT               -- pending, running, done, failed
progress INTEGER          -- 0-100  [NEW: for WebSocket]
total_items INTEGER       -- e.g. 365 for bulk fetch  [NEW]
completed_items INTEGER   -- [NEW]
error TEXT
created_at TEXT
updated_at TEXT
```

**app_config**
```
key TEXT PK
value TEXT                -- JSON-serialized
updated_at TEXT
-- Stores: default_capital, watchlist, UI preferences
```

### Key changes from WanTrade
- Daily `true_range` now uses proper 3-way formula (was simple H-L)
- `true_range_pct` now uses `TR / prev_close * 100` (was `TR / close * 100`)
- ATR adds Wilder's exponential smoothing alongside simple mean
- `symbols` table moved from DuckDB to SQLite (it's CRUD, not analytics)
- `jobs` table gains progress tracking fields for WebSocket
- `app_config` is new — key-value store for user preferences
- `vbt_bulk_results` deferred to Phase 2

---

## API Design

### REST Endpoints

**features/symbols/** — Symbol CRUD
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/symbols | Register symbol + fetch yfinance metadata |
| GET | /api/v1/symbols | List all symbols |
| GET | /api/v1/symbols/{symbol} | Single symbol detail |
| PATCH | /api/v1/symbols/{symbol}/disable | Soft-disable |
| PATCH | /api/v1/symbols/{symbol}/enable | Re-enable |
| DELETE | /api/v1/symbols/{symbol} | Permanent delete + cascade price purge |

**features/prices/** — Data ingestion + queries
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/prices/daily/{symbol} | Daily OHLCV (query params: start, end) |
| GET | /api/v1/prices/intraday/{symbol} | Intraday bars (query params: interval, start, end) |
| POST | /api/v1/prices/{symbol}/fetch/{interval} | Fetch price data (returns job_id) |
| POST | /api/v1/prices/fetch-all/{interval} | Bulk fetch all active symbols (returns job_id) |

**features/analytics/** — ATR, turnover, WTD
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/analytics/atr/summary | ATR summary (query params: interval, symbol) |
| POST | /api/v1/analytics/atr/calculate/{interval} | Recompute ATR (Wilder's + simple) |
| GET | /api/v1/analytics/turnover | Daily turnover in date range |
| GET | /api/v1/analytics/wtd/report | Worth-Trade-Daily report |
| POST | /api/v1/analytics/wtd/check | Run WTD evaluation for all active symbols |

**features/jobs/** — Job tracking
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/jobs | All jobs, newest first |
| GET | /api/v1/jobs/{job_id} | Single job status |

**core**
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/health | Liveness check |
| WS | /api/v1/ws | WebSocket endpoint |

### WebSocket Design

Single endpoint at `/api/v1/ws`. Server pushes typed JSON messages. Frontend connects once on app mount, auto-reconnects on disconnect.

**Message types:**
```json
{"type": "job:started",  "job_id": "...", "job_type": "fetch_daily", "symbol": "BBCA.JK"}
{"type": "job:progress", "job_id": "...", "completed": 45, "total": 365, "symbol": "BBCA.JK"}
{"type": "job:complete", "job_id": "...", "status": "done"}
{"type": "job:error",    "job_id": "...", "error": "yfinance timeout"}
{"type": "data:updated", "table": "prices_daily", "symbol": "BBCA.JK"}
```

**Backend**: `WebSocketManager` class in `core/websocket.py` tracks active connections. Background tasks call `manager.broadcast(message)`.

**Frontend**: `useWebSocket` hook connects on mount, parses messages, dispatches to TanStack Query cache invalidation. `data:updated` triggers targeted refetch of affected queries.

---

## Backend Architecture

### Connection Management

**DuckDB:**
- `asyncio.Lock` for write serialization (replaces old `threading.Lock`)
- Arrow-based read path: `conn.execute(...).fetch_arrow_table()` → `pl.from_arrow()` for Polars interop
- Reads don't need the write lock (DuckDB supports concurrent readers)
- Don't hold the write lock during Polars computation — read data, release lock, compute, acquire lock, write results

**SQLite:**
- `aiosqlite` for async compatibility with FastAPI
- WAL mode enabled on startup
- Connection-per-request pattern (fine at this scale)

**httpx (yfinance):**
- `httpx.AsyncClient` with connection pooling
- 30-second timeout (was 10s in WanTrade)
- Retry with exponential backoff for transient failures

### Background Tasks

FastAPI `BackgroundTasks` for long-running operations:
- Price fetching (single symbol or bulk 365 stocks)
- ATR calculation
- WTD evaluation

Each background task:
1. Creates a job record (status: pending)
2. Broadcasts `job:started` via WebSocket
3. Does work, broadcasting `job:progress` periodically
4. Updates job record + broadcasts `job:complete` or `job:error`

### ATR Computation (fixing WanTrade bugs)

**True Range (3-way formula, both daily and intraday):**
```
TR = max(high - low, abs(high - prev_close), abs(low - prev_close))
```

**Wilder's Exponential Smoothing:**
```
ATR[0] = simple_mean(TR[0:N])          # first value: simple mean of first N periods
ATR[i] = ATR[i-1] * (N-1)/N + TR[i]/N  # subsequent: exponential smoothing
```

Computed via Polars for performance. Both Wilder's and simple mean stored for comparison.

### Worth-Trade-Daily Criteria (unchanged from WanTrade)

All must pass:
- **Turnover**: avg daily turnover >= 50B IDR for both 1W and 2W periods
- **ATR**: >=3 of 4 conditions:
  - 1H ATR 1W: atr_exclude_open >= 5 AND atr_pct_exclude_open >= 2%
  - 1H ATR 2W: atr_exclude_open >= 5 AND atr_pct_exclude_open >= 2%
  - Daily ATR 1W: atr_pct_exclude_open >= 8%
  - Daily ATR 2W: atr_pct_exclude_open >= 8%

### IDX Market Constants (from WanTrade, unchanged)

| Constant | Value |
|----------|-------|
| LOT_SIZE | 100 shares |
| BUY_FEE | 0.15% |
| SELL_FEE | 0.25% |
| Market hours | 09:00-16:00 WIB (02:00-09:00 UTC) |

**Tick sizes:**
| Price Range | Tick |
|-------------|------|
| < 200 | Rp 1 |
| 200-499 | Rp 2 |
| 500-1999 | Rp 5 |
| 2000-4999 | Rp 25 |
| >= 5000 | Rp 25 |

---

## Frontend Architecture

### Layout

Sidebar navigation grouped by domain:
- **Market Data**: Symbol Management, Price Explorer
- **Analytics**: ATR Analysis, Turnover, Worth Trade Screening
- **Backtesting**: Single Run, Bulk Sweep (greyed out — Phase 2)
- **System**: Jobs & Tasks

WebSocket connection status indicator in the top bar.

### Pages (6 views)

| # | Page | Key Components |
|---|------|---------------|
| 1 | Symbol Management | AG Grid table, add/enable/disable/delete, bulk fetch triggers |
| 2 | Price Explorer | TradingView candlestick chart, daily/intraday tabs, interval picker |
| 3 | ATR Analysis | AG Grid multi-period ATR table, with/without opening bar toggle |
| 4 | Turnover | AG Grid turnover table across 5 periods, WTD-flagged highlighting |
| 5 | Worth Trade Screening | Color-coded pass/fail criteria, worth/not-worth tabs |
| 6 | Jobs & Tasks | Live WebSocket-driven progress bars, status, error display |

### Data Flow

1. TanStack Query hooks fetch from REST API with caching
2. WebSocket `data:updated` messages trigger targeted query invalidation
3. Components re-render with fresh data automatically
4. Error boundaries per page prevent cascading crashes

### Frontend File Structure

```
frontend/src/
  app/App.tsx, router.tsx
  features/
    symbols/   — SymbolsPage, SymbolTable, api, hooks
    prices/    — PricesPage, PriceChart, api, hooks
    analytics/ — AtrPage, TurnoverPage, WtdPage, api, hooks
    jobs/      — JobsPanel, api, hooks
  shared/
    components/ — Layout, Sidebar, ErrorBoundary, LoadingSpinner
    hooks/      — useWebSocket
    lib/        — wsClient.ts, httpClient.ts
    types/      — TypeScript interfaces matching backend models
```

---

## Project Structure

```
TradeJutsu/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── core/
│   │   │   ├── duckdb.py          — connection manager, async write lock
│   │   │   ├── sqlite.py          — aiosqlite, WAL mode
│   │   │   ├── websocket.py       — WebSocketManager
│   │   │   ├── background.py      — background task helpers
│   │   │   ├── idx.py             — tick sizes, fees, market hours
│   │   │   └── errors.py          — custom exception hierarchy
│   │   └── features/
│   │       ├── symbols/           — router, models, service, repo
│   │       ├── prices/            — router, models, service, repo
│   │       ├── analytics/         — router, models, atr_service, wtd_service, repo
│   │       └── jobs/              — router, models, service, repo
│   ├── tests/
│   │   ├── conftest.py            — test DB fixtures
│   │   ├── test_symbols.py
│   │   ├── test_prices.py
│   │   ├── test_analytics.py
│   │   └── test_jobs.py
│   ├── scripts/
│   │   ├── bulk_add_fetch.py
│   │   └── seed_data.py
│   ├── database/                  — DuckDB + SQLite files (.gitignored)
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   ├── src/                       — (see Frontend File Structure above)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.ts
├── docs/superpowers/specs/        — design documents
├── .gitignore
├── Makefile
└── README.md
```

---

## Dev Infrastructure

### Commands (Makefile)

| Command | Description |
|---------|-------------|
| `make dev` | Start backend + frontend concurrently |
| `make backend` | uvicorn with --reload |
| `make frontend` | vite dev server |
| `make test` | pytest + vitest |
| `make test-backend` | pytest only |
| `make test-frontend` | vitest only |
| `make lint` | ruff + eslint |
| `make format` | ruff format + prettier |
| `make seed` | Bulk import 365 IDX stocks |
| `make clean` | Remove DB files + caches |

### Testing

- **Backend**: pytest + httpx TestClient, in-memory DuckDB + temp SQLite per test
- **Frontend**: vitest + React Testing Library
- **ATR tests**: verify Wilder's smoothing against hand-calculated known values
- **WebSocket tests**: test message broadcasting and client connection lifecycle

### Frontend → Backend Connection

Vite dev server proxies `/api` requests to `http://localhost:8000` (uvicorn). Configured in `vite.config.ts`:
```ts
server: { proxy: { '/api': 'http://localhost:8000' } }
```
WebSocket connects directly to `ws://localhost:8000/api/v1/ws`.

### Key Dependencies

**Backend**: fastapi, uvicorn[standard], duckdb, aiosqlite, polars, pandas, yfinance, httpx, pydantic
**Frontend**: react, vite, typescript, @tanstack/react-query, react-router-dom, ag-grid-react, lightweight-charts, echarts, tailwindcss

---

## Verification Plan

### Backend
1. Start API: `make backend`
2. `GET /api/v1/health` returns 200
3. `POST /api/v1/symbols` with `{"symbol": "BBCA.JK"}` creates symbol in SQLite
4. `POST /api/v1/prices/BBCA.JK/fetch/daily` returns job_id, WebSocket receives progress messages
5. `GET /api/v1/prices/daily/BBCA.JK` returns OHLCV data with correct 3-way true_range
6. `POST /api/v1/analytics/atr/calculate/1hour` computes Wilder's ATR
7. `GET /api/v1/analytics/atr/summary?symbol=BBCA.JK` returns ATR with both wilder and simple values
8. `POST /api/v1/analytics/wtd/check` evaluates WTD criteria for all active symbols

### Frontend
1. Start app: `make frontend`
2. Symbol Management page loads, AG Grid renders symbol list
3. Add symbol → appears in table
4. Trigger "Fetch All Daily" → WebSocket progress bar shows live updates
5. Price Explorer → TradingView chart renders candlesticks for selected symbol
6. ATR Analysis → AG Grid shows multi-period ATR values
7. Jobs page → shows completed/running jobs with real-time status

### Integration
1. `make dev` starts both backend and frontend
2. Full workflow: add symbol → fetch prices → calculate ATR → check WTD → verify all data flows through
3. WebSocket reconnects automatically after backend restart
