# TradeJutsu

## Route-to-Feature Map

When a user mentions a URL path, go directly to the matching feature folder:

| Route               | Frontend feature                    | Backend feature                     |
|---------------------|-------------------------------------|-------------------------------------|
| `/` `/symbols`      | `frontend/src/features/symbols/`    | `backend/app/features/symbols/`     |
| `/prices`           | `frontend/src/features/prices/`     | `backend/app/features/prices/`      |
| `/analytics/atr`    | `frontend/src/features/analytics/`  | `backend/app/features/analytics/`   |
| `/analytics/turnover` | `frontend/src/features/analytics/` | `backend/app/features/analytics/`   |
| `/analytics/wtd`    | `frontend/src/features/analytics/`  | `backend/app/features/analytics/`   |
| `/jobs`             | `frontend/src/features/jobs/`       | `backend/app/features/jobs/`        |

## Feature folder conventions

Each feature follows the same file structure:

**Frontend** (`frontend/src/features/<name>/`):
- `*Page.tsx` — page component (entry point)
- `api.ts` — HTTP calls to backend
- `hooks.ts` — React Query hooks
- Other `*.tsx` — sub-components (tables, dialogs, charts)

**Backend** (`backend/app/features/<name>/`):
- `router.py` — FastAPI endpoints
- `service.py` — business logic
- `repo.py` — database queries (DuckDB/SQLite)
- `models.py` — Pydantic schemas

**Tests**: `backend/tests/test_<name>.py`

## Shared code

- `frontend/src/shared/` — Layout, Sidebar, ErrorBoundary, WsStatus, httpClient, wsClient
- `backend/app/core/` — duckdb, sqlite, websocket, background tasks, IDX client, error handling
- Router: `frontend/src/app/router.tsx`

## Tech stack

- **Backend**: Python, FastAPI, DuckDB (market data), SQLite (app state)
- **Frontend**: React, Vite, TypeScript, TradingView Lightweight Charts, AG Grid
- **Communication**: REST + WebSocket for live job progress

## Commands

- `npm run dev` — starts both frontend (5173) and backend (8000) via concurrently
- `cd backend && pytest` — run backend tests
- `cd frontend && npm run build` — type-check + build frontend
