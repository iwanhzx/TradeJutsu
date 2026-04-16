# WanTrade — Full Project Analysis Report

## 1. PROJECT OVERVIEW

**WanTrade** is a local-first market data research platform focused on the **Indonesian Stock Exchange (IDX)**. It ingests OHLCV price data, computes analytics (ATR, turnover, worth-trade flags), and runs a VectorBT-based backtesting engine for an intraday mean-reversion strategy called "LogicSet1."

- **80 Python files** across the codebase
- **8 Streamlit pages** for UI
- **~21 API endpoints** via FastAPI
- **5 database tables** in DuckDB (+ 1 legacy `scenario_runs` may still exist in .duckdb file)
- **1 backtesting engine** (VectorBT — single-run + bulk sweep)
- **365 Indonesian stocks** (.JK suffix) pre-configured for bulk import

---

## 2. ARCHITECTURE

```
User Browser
    |
+----------------+     HTTP (port 8080)     +--------------------+
|  Streamlit     |  ----------------------> |    FastAPI          |
|  (ui/app.py)   |  <- ui/client/ wrappers  |  (api/main.py)     |
+-------+--------+                          +---------+----------+
        |                                             |
        | Direct import                               | Background tasks
        | (VBT only -- Rule #3)                       | (worker/tasks.py)
        v                                             v
+--------------------------------------------------------------+
|                   DuckDB (file-based)                         |
|               database/market.duckdb                          |
|     Write-serialized via threading.Lock                       |
+--------------------------------------------------------------+
```

### Key Architectural Decisions

1. **Streamlit writes go through FastAPI** — all DB writes from UI use `ui/client/` HTTP wrappers. Exception: VBT backtest reads engine directly (JIT-compiled `vbt.Portfolio` objects can't serialize over HTTP).

2. **DuckDB single-writer lock** — `database/connection.py` wraps every connection in a `threading.Lock()` + explicit `BEGIN/COMMIT/ROLLBACK`. No concurrent write races.

3. **Background job pattern** — Fetch endpoints return HTTP 202 with a `pending` job. Work runs in `FastAPI.BackgroundTasks`. Status: `pending -> running -> done/failed`. Clients poll `GET /jobs/{job_id}`.

4. **Schema-on-startup** — Each module exposes `init_schema()` called during FastAPI lifespan. Uses `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` for migrations.

5. **No auth, no CORS, no middleware** — purely local/developer-facing.

---

## 3. TECH STACK

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Language | Python | 3.11+ | |
| API | FastAPI | >=0.111.0 | Async, BackgroundTasks |
| Database | DuckDB | >=0.10.0 | File-based, single-writer lock |
| UI | Streamlit | >=1.35.0 | 8 pages, wide layout |
| Market data | yfinance | >=0.2.40 | Daily (1y) + intraday (60d) |
| Backtesting | vectorbt | ==0.28.5 (pinned) | JIT-compiled via numba >=0.60 |
| Validation | Pydantic | >=2.7.0 | Request/response models |
| Viz | Plotly | >=5.22.0 | VBT equity curves |
| HTTP client | requests | >=2.32.0 | Streamlit->FastAPI calls |
| Other | pandas >=2.2, numpy >=1.26, scipy, matplotlib, anthropic >=0.28, httpx >=0.27 | |

---

## 4. DATABASE SCHEMA (5 Active Tables)

### 4.1 `symbols`
| Column | Type | Notes |
|---|---|---|
| `symbol` | VARCHAR PK | Uppercased ticker (e.g., BBCA.JK) |
| `name`, `sector`, `currency` | VARCHAR | From yfinance metadata |
| `is_active` | BOOLEAN DEFAULT TRUE | Soft-disable flag |
| `is_worth_trade_daily` | BOOLEAN DEFAULT FALSE | Computed by WTD check |
| `latest_price` | DOUBLE | Updated on each daily fetch |
| `latest_price_date` | DATE | |
| `added_at` | TIMESTAMP | |

### 4.2 `prices_daily`
| Column | Type | Notes |
|---|---|---|
| `symbol` + `date` | Composite PK | |
| `open`, `high`, `low`, `close` | DOUBLE | auto_adjust=True from yfinance |
| `volume` | BIGINT | Raw shares (display divides by 100 for lots) |
| `truerange` | DOUBLE | `high - low` (simple, no prev close) |
| `truerangepct` | DOUBLE | `(high-low)/close*100`, 4 decimals |
| `turnover` | DOUBLE | `volume * close` |

### 4.3 `prices_intraday`
| Column | Type | Notes |
|---|---|---|
| `symbol` + `datetime` + `interval` | Composite PK | interval in {15min, 30min, 1hour} |
| OHLCV + truerange/truerangepct/turnover | | Same shape as daily |
| `truerange` | DOUBLE | **3-way calculation**: max(H-L, |H-prevC|, |L-prevC|) |

### 4.4 `atr_summary`
| Column | Type | Notes |
|---|---|---|
| `symbol` + `interval` + `range_days` | Composite PK | range_days in {1, 7, 14, 30, 90, 180} |
| `atr_w_ob` / `atr_pct_w_ob` | DOUBLE | ATR with opening bar |
| `atr_wo_ob` / `atr_pct_wo_ob` | DOUBLE | ATR excluding first bar of day |
| `last_price_update`, `calculated_at` | TIMESTAMP | |

### 4.5 `vbt_bulk_results`
| Column | Type | Notes |
|---|---|---|
| `run_id` + `symbol` + 5 params | Composite PK (7 cols) | ON CONFLICT DO NOTHING |
| `iteration_id` | INTEGER | 1-indexed within run |
| `last_trade_date` | DATE | |
| `num_trading_days` | INTEGER | |
| `total_return` | DOUBLE | |
| `sharpe` | DOUBLE | |
| `max_drawdown` | DOUBLE | |
| `total_trades` | INTEGER | |
| `win_rate` | DOUBLE | |
| `final_capital` | DOUBLE | |
| `initial_capital` | DOUBLE | |
| `bar_interval` | VARCHAR | |
| `entry_bar` | INTEGER | |
| `eod_exit_time` | VARCHAR | |
| `created_at` | TIMESTAMP | |

### 4.6 `jobs`
| Column | Type | Notes |
|---|---|---|
| `job_id` | VARCHAR PK | UUID v4 |
| `symbol` | VARCHAR NOT NULL | |
| `status` | VARCHAR | pending -> running -> done/failed |
| `created_at`, `updated_at` | TIMESTAMP | |
| `error` | VARCHAR | Populated on failure |

---

## 5. API ENDPOINTS (Complete)

### Symbols & Prices
| Method | Path | Status | Description |
|---|---|---|---|
| POST | `/symbols` | 201 | Register symbol + fetch yfinance metadata |
| DELETE | `/symbols/{symbol}` | 204 | Permanent delete + cascade price purge |
| PATCH | `/symbols/{symbol}/disable` | 200 | Soft-disable |
| PATCH | `/symbols/{symbol}/enable` | 200 | Re-enable |
| GET | `/symbols` | 200 | List all symbols |
| POST | `/symbols/{symbol}/fetch/daily` | 202 | Queue daily fetch (background) |
| POST | `/symbols/{symbol}/fetch/{15min\|30min\|1hour}` | 202 | Queue intraday fetch |
| POST | `/symbols/fetch-all/{interval}` | 202 | Bulk fetch all symbols |
| POST | `/symbols/check-worth-trade-daily` | 200 | Evaluate WTD flag for all symbols |
| GET | `/prices/daily/{symbol}` | 200 | Daily OHLCV (default last 30 days) |
| GET | `/prices/intraday/{symbol}` | 200 | Intraday OHLCV by interval |

### ATR
| Method | Path | Status | Description |
|---|---|---|---|
| GET | `/atr/summary` | 200 | ATR summary rows (optional interval filter) |
| POST | `/atr/calculate/{1hour\|daily}` | 200 | Recompute ATR for all active symbols |
| GET | `/atr/turnover` | 200 | Daily turnover in date range |

### VBT Backtest
| Method | Path | Status | Description |
|---|---|---|---|
| POST | `/vbt/bulk_sweep` | 202 | Queue bulk VBT sweep (background) |
| GET | `/vbt/bulk_sweep/runs` | 200 | List recent bulk sweeps |
| GET | `/vbt/bulk_sweep/{run_id}` | 200 | Filtered/sorted results for a run |

### Jobs
| Method | Path | Status | Description |
|---|---|---|---|
| GET | `/jobs` | 200 | All jobs newest first |
| GET | `/jobs/{job_id}` | 200 | Single job by ID |
| GET | `/health` | 200 | Liveness check |

---

## 6. THE TRADING STRATEGY — LogicSet1

This is the **only strategy** implemented. It's an intraday mean-reversion system for IDX stocks. Defined in `modules/vbt_backtest/engine/config.py`.

### 6.1 Parameters (5 tunable)
| Param | Default | Description |
|---|---|---|
| `lookback_days` | 5 | Trading days for ATR averaging |
| `buffer_factor` | 0.0 | Blend: `entry_target = atr_1h + (atr_1d - atr_1h) * buffer_factor` |
| `buy_factor` | 1.0 | Entry depth: `buying_price = price_pref * (1 - entry_target_pct/100 * buy_factor)` |
| `tp_factor` | 1.0 | Take-profit: `tp = buying_price + (price_pref - buying_price) * tp_factor` |
| `sl_factor` | 1.0 | Stop-loss: `sl = buying_price * (1 - atr_1h/100 * sl_factor)` |

### 6.2 Signal Computation Flow
1. Compute `atr_1h` = mean of daily-averaged 1H true range % over `lookback_days`
2. Compute `atr_1d` = mean of daily true range % over `lookback_days`
3. `price_preference` = open of 2nd 30-min bar (~09:30 WIB)
4. `entry_target_pct` = blended ATR
5. `buying_price` = price_pref dipped by entry_target * buy_factor, tick-rounded down
6. `tp` = buying_price + entry_gap * tp_factor, tick-rounded
7. `sl` = buying_price * (1 - atr_1h/100 * sl_factor), tick-rounded

### 6.3 Execution Rules
- **Entry**: First 30-min bar (after entry_bar) where `low <= buying_price`
- **Exit**: VBT's `from_signals` with sl_stop/tp_stop; EOD bar forces close
- **Position sizing**: VBT `size=1.0 (100% cash)`, `size_granularity=100` (IDX lot)
- **One trade per day**, all capital committed
- **Force-close at EOD** (configurable, default 15:30 WIB)

### 6.4 IDX Market Constants
| Constant | Value |
|---|---|
| LOT_SIZE | 100 shares |
| BUY_FEE | 0.15% of notional |
| SELL_FEE | 0.25% of notional |
| Market hours | 09:00-16:00 WIB (02:00-09:00 UTC) |
| EOD force-close | 15:30 WIB (08:30 UTC) default |

### 6.5 IDX Tick Size Table
| Price Range | Tick Size |
|---|---|
| < 200 | Rp 1 |
| 200-499 | Rp 2 |
| 500-1999 | Rp 5 |
| 2000-4999 | Rp 25 |
| >= 5000 | Rp 25 |

---

## 7. VBT BACKTESTING ENGINE (`modules/vbt_backtest/engine/`)

### 7.1 Single-Run VBT Backtest (`runner.py`)

**`run_vbt_backtest(symbol, last_trade_date, num_trading_days, params, initial_capital, eod_exit_time, entry_bar, bar_interval) -> VbtBacktestResult`**

**VbtBacktestResult dataclass:**
- `portfolio`: live `vbt.Portfolio` (numba-backed, cannot serialize)
- `signal_df`: one row per trading day (skip_reason, ATR values, entry/exit levels)
- `vbt_df`: all 30-min bars + entry/exit signal columns
- `stats`: `pf.stats()` coerced to plain Python dict
- `symbol`, `last_trade_date`, `num_trading_days`, `start_date`, `end_date`
- `params`: `LogicSet1Params`
- `initial_capital`, `eod_exit_time`, `entry_bar`, `bar_interval`
- `warnings`: list of computation warnings

**Execution Flow:**
1. Calendar buffer: `max(num_trading_days * 2, num_trading_days + 14)` days lookback
2. Call `build_signal_arrays()` -> per-day entry/exit signal computation
3. Tail `signal_df` to requested `num_trading_days`, trim `vbt_df`
4. Build per-bar fees array: `BUY_FEE` on entries, `SELL_FEE` elsewhere
5. `vbt.Portfolio.from_signals(close, open, high, low, entries, exits, price, sl_stop, tp_stop, fees, size=1.0, size_type="percent", size_granularity=100, init_cash, freq)`
6. Extract stats, return `VbtBacktestResult`

### 7.2 Signal Array Builder (`signals.py`)

**`build_signal_arrays(symbol, start, end, params, eod_exit_time, entry_bar, bar_interval) -> (vbt_df, signal_df, warnings)`**

**Trading Day Calendar**: Uses reference symbol (`BBCA.JK`) 30-min data to determine valid trading days.

**Per-Day Signal Generation (7 skip codes):**
- `_SKIP_NO_DATA`: no intraday data for symbol on this day
- `_SKIP_LB_1H`: insufficient 1-hour bars for ATR lookback
- `_SKIP_LB_DAILY`: insufficient daily bars for ATR lookback
- `_SKIP_NAN_ATR`: computed ATR is NaN
- `_SKIP_FEW_BARS`: fewer than (entry_bar + 2) bars
- `_SKIP_PRICE_NOT_REACHED`: low never touches buying_price
- `_SKIP_NONE`: valid entry day

**ATR Calculation (per day, identical to LogicSet1 formula):**
- `atr_1h` = mean of daily-averaged 1H truerangepct over lookback window
- `atr_1d` = mean of daily truerangepct over lookback window

**Entry/Exit Bar Logic:**
- Entry scan: bars from `entry_bar` to `exit_bar_idx` (exclusive)
- Exit bar: last bar at or before `eod_exit_utc`
- Fill when `low <= buying_price`

**Output:**
- `signal_df`: one row per trading day — date, entries (bool), skip_reason, daily OHLC, entry_price, sl_pct, tp_pct, ATR values
- `vbt_df`: one row per 30-min bar — datetime, OHLC, entries/exits (bool), entry_price, sl_pct, tp_pct

### 7.3 Bulk Sweep System (`engine/bulk/`)

**Purpose**: Run thousands-millions of parameter combos through vectorized 2D signal matrices in a single `vbt.Portfolio.from_signals` call.

#### Parameter Grid (`bulk/grid.py`)
- `PARAM_DTYPE`: numpy structured array with 5 LogicSet1 fields
- `build_param_grid(lookback_days, buffer_factor, buy_factor, tp_factor, sl_factor, mode, random_n)` -> structured numpy array
- `mode="grid"`: all combinations via `itertools.product`
- `mode="random"`: random sample of `random_n` combos

#### Bulk Data Cache (`bulk/data_cache.py`)
- `BulkDataCache`: batches daily + intraday + ATR reads per symbol
- `resolve_trading_days()`: uses BBCA.JK reference to find valid trading days
- Pre-computes ATR for all unique lookback_days values

#### Bulk Signal Arrays (`bulk/signals.py`)
- `BulkArrays` dataclass: holds 2D arrays of shape `(n_bars, n_combos)`
- `build_bulk_arrays()`: vectorized entry computation across all combos simultaneously
- Hit matrix scan: `scan_lows[:, None] <= buying_price_c[None, :]` -> `(k, n_combos)` bool matrix
- Vectorized tick flooring via `_floor_to_tick_vec()`

#### Bulk Runner (`bulk/runner.py`)
- `run_vbt_bulk(symbol, last_trade_date, num_trading_days, params_grid, initial_capital, chunk_size, ...)` -> DataFrame
- Processes params in chunks (default 10,000 combos per VBT call)
- Per chunk: build 2D signal matrices -> `vbt.Portfolio.from_signals` with 2D DataFrames -> extract per-column stats
- Output columns: `lookback_days, buffer_factor, buy_factor, tp_factor, sl_factor, total_return, sharpe, max_drawdown, total_trades, win_rate, final_capital`

### 7.4 VBT Config (`engine/config.py`)

Single source of truth for all IDX constants and VBT settings:

| Category | Constants |
|---|---|
| **IDX** | `LOT_SIZE=100`, `IDX_TICK_SIZES`, `round_to_tick()`, `BUY_FEE=0.0015`, `SELL_FEE=0.0025` |
| **Market hours** | `IDX_MARKET_CLOSE_UTC=09:00`, `EOD_OFFSET_MINUTES=30`, `EOD_BAR_START_SECS=30600` |
| **LogicSet1 defaults** | `DEFAULT_INITIAL_CAPITAL=100M`, `DEFAULT_LOOKBACK_DAYS=5`, `DEFAULT_*_FACTOR` |
| **LogicSet1Params** | Dataclass with 5 fields: lookback_days, buffer_factor, buy_factor, tp_factor, sl_factor |
| **VBT engine** | `VBT_TRADING_DAY_REFERENCE_SYMBOL="BBCA.JK"`, `VBT_SIZE=1.0`, `VBT_FREQ="30min"` |
| **Single-run UI** | `VBT_DEFAULT_TRADING_DAYS=20`, `VBT_DEFAULT_EOD_EXIT_WIB=(15,30)`, `VBT_DEFAULT_ENTRY_BAR=1` |
| **Bulk UI** | `VBT_BULK_DEFAULT_CHUNK_SIZE=10000`, default param ranges, `VBT_BULK_DEFAULT_INITIAL_CAPITAL=100M` |

---

## 8. DATA FLOW & ANALYTICS

### 8.1 Data Ingestion
1. **yfinance daily**: `yf.download(symbol, period="1y", auto_adjust=True)` -> compute truerange (H-L) / turnover -> upsert `prices_daily` + update `symbols.latest_price`
2. **yfinance intraday**: `yf.download(symbol, period="60d", interval=<15m|30m|60m>)` -> UTC conversion -> filter flat bars -> 3-way true range -> upsert `prices_intraday`
3. **Alternative**: `scripts/fetch_itick.py` fetches from itick.org API (IDX data with auth token)

### 8.2 ATR Computation
- **Method**: Simple mean (not exponential/Wilder's)
- **Periods**: [1, 7, 14, 30, 90, 180] days
- **1-Hour ATR**: Two variants — with and without opening bar (first bar of each day excluded for "wo_ob")
- **Daily ATR**: Single variant (w_ob == wo_ob since one bar per day)
- **Output**: `atr_summary` table, one row per (symbol, interval, range_days)

### 8.3 Worth-Trade-Daily Evaluation
Criteria (all must pass):
- **Turnover**: avg daily turnover >= 50B IDR for both 1W and 2W periods
- **ATR**: >=3 of 4 conditions:
  - 1H ATR 1W: atr_wo_ob >= 5 AND atr_pct_wo_ob >= 2%
  - 1H ATR 2W: atr_wo_ob >= 5 AND atr_pct_wo_ob >= 2%
  - Daily ATR 1W: atr_pct_wo_ob >= 8%
  - Daily ATR 2W: atr_pct_wo_ob >= 8%

---

## 9. UI PAGES (8 Streamlit Views)

| # | Page | Purpose | Key Features |
|---|---|---|---|
| 1 | **Symbol Management** | CRUD for symbols | Add/disable/enable/delete with confirmation dialogs |
| 2 | **Symbol Report** | Price data viewer | Daily/intraday tabs, time range presets (1M-All), fetch buttons, ATR metrics |
| 3 | **ATR Analytical** | Multi-period ATR tables | 1H vs Daily interval tabs, with/without opening bar, 6 period columns |
| 4 | **Daily Turnover** | Average turnover per symbol | 5 period columns (1W-6M), WTD symbols highlighted |
| 5 | **WTD Report** | Worth-Trade-Daily criteria | Bulk fetch/calculate buttons, color-coded pass/fail criteria table |
| 6 | **Jobs** | Background job tracker | Status icons, auto-refresh, error display |
| 7 | **VBT Backtest** | Single VBT run | 3 tabs (Stats/Equity/Trade Detail), Plotly equity curve, bar-detail modal dialog, preset URL linking |
| 8 | **VBT Bulk** | VBT parameter sweep | Range notation input (1:5:0.5), sort/filter controls, "Open in VBT" links, CSV download |

### Navigation
- Sidebar radio buttons with URL query param sync (`?page=`, `?symbol=`, `?tab=`, `?range=`, `?interval=`)
- Default landing page: VBT Backtest
- VBT Bulk results link directly to VBT Backtest via preset query params

### Charts
- **VBT Backtest**: Plotly via `portfolio.plot()` (equity + entry/exit markers), fallback to `st.line_chart()`
- No other charts in the current build

### UI Detail — VBT Backtest Page

**Settings Expander (3 columns):**
- Col 1: Symbol, Last Trade Date, Trading Days (1-500), Initial Capital (1M-10B), Bar Interval (15min/30min), EOD Force Sell (dynamic), Entry Bar (dynamic)
- Col 2: ATR Lookback (1-60), Buffer/Buy/TP/SL Factor sliders (0-5, step 0.05)
- Col 3: "How It Works" info box

**After Run — Headline Metrics (6 cols):** Total Return %, Sharpe, Max Drawdown %, Win Rate %, Total Trades, Profit Factor

**3 Tabs:**
1. **Portfolio Stats** — Two-column Metric/Value table from `pf.stats()`
2. **Equity & Drawdown** — Plotly chart from `portfolio.plot()`, fallback to line chart
3. **Trade Detail** — Per-day signal table with color-coded rows (green=win, red=loss), selectable rows that open a bar-detail modal dialog showing 30-min bars for that day

### UI Detail — VBT Bulk Page

**Configuration:** Symbol, date, trading days, parameter ranges (comma list or `start:stop:step` notation), grid/random mode, chunk size, bar/calendar settings

**Results:** Sortable/filterable table with "Open in VBT" link column (builds preset URL to seed VBT Backtest page), CSV download

### UI Detail — Symbol Report Page

**Layout:** Left panel = symbol radio list, Right panel = report content

**Tabs:** Daily | 15min | 30min | 1Hour — each with time range presets and data table showing OHLC, Volume (Lot), Turnover, TrueRange, TrueRange%

**Fetch buttons** per interval + metrics (ATR, ATR%) displayed above each table

### UI Detail — WTD Report Page

**Left panel:** Bulk fetch buttons (4 intervals), Calculate ATR buttons (1H/Daily), Check Worth Trade Daily button with criteria description

**Right panel:** Two tabs (Worth Trade / Not Worth Trade) with color-coded cells (green=pass, red=fail, grey=missing) for: Turnover 1W/2W, 1H ATR 1W/2W, Daily ATR 1W/2W

---

## 10. COMPLETE DATA LAYER REFERENCE

### Query Functions — `modules/symbols/data/queries.py`

| Function | Type | Description |
|---|---|---|
| `get_symbols()` | Read | All symbols ordered by symbol |
| `get_symbol(symbol)` | Read | Single symbol lookup |
| `get_daily(symbol, start, end)` | Read | Daily OHLCV with TR/turnover |
| `get_intraday(symbol, interval, start, end)` | Read | Intraday bars by interval |
| `get_atr_summary(interval?)` | Read | ATR stats, optional interval filter |
| `get_atr_worth_trade()` | Read | Filtered ATR (1h & daily 7/14 only) |
| `get_daily_turnover_all(start, end, active_only?)` | Read | Turnover across symbols |
| `disable_symbol(symbol)` | Write | Set is_active = FALSE |
| `enable_symbol(symbol)` | Write | Set is_active = TRUE |
| `upsert_atr_summary(rows)` | Write | Upsert ATR rows |
| `update_worth_trade_daily(results)` | Write | Bulk update WTD flag |

### Fetcher Functions — `modules/symbols/data/fetcher.py`

| Function | Type | Description |
|---|---|---|
| `add_symbol(symbol)` | Write | Insert symbol with yfinance metadata (upsert) |
| `remove_symbol(symbol)` | Write | Cascade delete: prices_daily, prices_intraday, atr_summary, symbols |
| `fetch_daily(symbol, period="1y")` | Write | yfinance daily -> prices_daily, update latest_price |
| `fetch_intraday(symbol, interval)` | Write | yfinance intraday -> prices_intraday (60d lookback) |

### Analytics — `modules/symbols/data/analytics.py`

| Function | Description |
|---|---|
| `calculate_atr_1hour()` | 1H ATR for all active symbols, periods [1,7,14,30,90,180] |
| `calculate_atr_daily()` | Daily ATR for all active symbols, same periods |

### VBT Queries — `modules/vbt_backtest/data/queries.py`

| Function | Type | Description |
|---|---|---|
| `save_vbt_bulk_results(run_id, symbol, ...)` | Write | Bulk insert sweep results |
| `get_vbt_bulk_results(run_id, limit, sort_by, ...)` | Read | Filtered/sorted results with multiple optional filters |
| `list_vbt_bulk_runs(limit=50)` | Read | Summary per (run_id, symbol) |

### Worker Queries — `worker/data/queries.py`

| Function | Type | Description |
|---|---|---|
| `create_job(symbol)` | Write | Insert pending job with UUID |
| `update_job(job_id, status, error?)` | Write | Update status + timestamp |
| `get_jobs()` | Read | All jobs newest first |
| `get_job(job_id)` | Read | Single job |

---

## 11. PYDANTIC MODELS

### `SymbolRequest` / `SymbolResponse`
```python
SymbolRequest:  symbol: str (stripped, uppercased)
SymbolResponse: symbol, name?, sector?, currency?, is_active?, is_worth_trade_daily?,
                latest_price?, latest_price_date?, added_at?
```

### `PriceResponse` / `IntradayPriceResponse`
```python
PriceResponse:        symbol, date, open?, high?, low?, close?, volume?, truerange?, truerangepct?, turnover?
IntradayPriceResponse: symbol, datetime?, open?, high?, low?, close?, volume?, interval?, truerange?, truerangepct?, turnover?
```

### `VbtBulkSweepRequest`
```python
symbol, last_trade_date, num_trading_days=60,
lookback_days=[5], buffer_factor=[0.0], buy_factor=[1.0], tp_factor=[1.0], sl_factor=[1.0],
mode="grid"|"random", random_n=100, chunk_size=2000,
initial_capital=100_000_000, bar_interval?, entry_bar?, eod_exit_time?
```

### `JobResponse`
```python
job_id, symbol, status ("pending"|"running"|"done"|"failed"), created_at?, updated_at?, error?
```

---

## 12. UI CLIENT LAYER (`ui/client/`)

### Base (`_base.py`)
- `BASE_URL = "http://localhost:8080"`, `_TIMEOUT = 10`
- `_get(path, **params)`, `_post(path, body?)`, `_patch(path)`, `_delete(path)`

### `symbols.py` (12 functions)
- `get_symbols`, `add_symbol`, `disable_symbol`, `enable_symbol`, `delete_symbol`
- `get_atr_summary`, `calculate_atr`, `check_worth_trade_daily`
- `fetch_all_prices`, `fetch_prices`, `get_daily_prices`, `get_intraday_prices`, `get_daily_turnover`

### `vbt_backtest.py` (3 functions)
- `start_vbt_bulk_sweep`, `get_vbt_bulk_results`, `list_vbt_bulk_runs`

### `worker.py` (2 functions)
- `get_jobs`, `get_job`

---

## 13. BACKGROUND TASKS (`worker/tasks.py`)

| Function | Trigger | Description |
|---|---|---|
| `do_daily(job_id, symbol)` | POST `/symbols/{symbol}/fetch/daily` | Calls `fetch_daily(symbol)` |
| `do_intraday(job_id, symbol, yf_interval)` | POST `/symbols/{symbol}/fetch/{interval}` | Calls `fetch_intraday(symbol, yf_interval)` |
| `do_fetch_all(job_id, fetch_fn)` | POST `/symbols/fetch-all/{interval}` | Loops all symbols with 0.5-2s random delay |
| `do_vbt_bulk_sweep(job_id, run_id, ...)` | POST `/vbt/bulk_sweep` | Builds param grid, runs `run_vbt_bulk`, saves results |

**In-memory tracking:** `vbt_bulk_jobs` dict (keyed by run_id) — status, completed, total, error. Lost on server restart.

---

## 14. SCRIPTS

| Script | Purpose |
|---|---|
| `scripts/bulk_add_fetch.py` | Bulk import 365 IDX stocks (.JK) with daily + 1hour fetch |
| `scripts/fetch_itick.py` | Alternative data source from itick.org API |
| `scripts/test_api.py` | E2E API test (BBCA.JK) — 10 test sections |
| `scripts/test_data.py` | Data module smoke test (AAPL, direct library calls) |
| `scripts/verify_vbt_log.py` | Manual VBT result verification (re-implements LogicSet1 in pure Python) |

---

## 15. DuckDB WRITE-LOCK MECHANISM

```python
# database/connection.py
_write_lock = threading.Lock()

@contextmanager
def get_connection():
    with _write_lock:           # Serialize all writers
        conn = duckdb.connect(DB_PATH)
        conn.begin()            # Explicit transaction
        try:
            yield conn
            conn.commit()
        except:
            conn.rollback()
            raise
        finally:
            conn.close()
```

- Module-level global lock, entire connection lifecycle
- Ensures DuckDB single-writer constraint across all background threads
- Every caller gets ACID semantics automatically

---

## 16. FILE-BY-FILE REFERENCE

```
WanTrade/
|-- api/
|   +-- main.py                          # FastAPI app, lifespan (3 schema inits), 5 router mounts
|-- database/
|   +-- connection.py                    # DuckDB get_connection() + threading.Lock
|-- modules/
|   |-- symbols/
|   |   |-- data/
|   |   |   |-- schema.py                # symbols, prices_daily, prices_intraday, atr_summary tables
|   |   |   |-- fetcher.py               # add_symbol, remove_symbol, fetch_daily, fetch_intraday
|   |   |   |-- queries.py               # 11 query functions (get_*, disable_*, upsert_*, update_*)
|   |   |   +-- analytics.py             # calculate_atr_1hour, calculate_atr_daily
|   |   |-- api/
|   |   |   |-- models.py                # SymbolRequest/Response, PriceResponse, IntradayPriceResponse
|   |   |   +-- routers/
|   |   |       |-- symbols.py           # 14 endpoints (CRUD + fetch triggers + WTD check)
|   |   |       |-- prices.py            # 2 endpoints (daily + intraday reads)
|   |   |       +-- atr.py               # 4 endpoints (summary, calculate, turnover)
|   |   +-- ui/views/
|   |       |-- symbol_management.py     # Add/disable/enable/delete symbols
|   |       |-- symbol_report.py         # Price tables with fetch buttons
|   |       |-- atr_analytical.py        # Multi-period ATR summary tables
|   |       |-- daily_turnover.py        # Average turnover per symbol
|   |       +-- wtd_report.py            # Worth-Trade-Daily criteria display
|   +-- vbt_backtest/
|       |-- data/
|       |   |-- schema.py                # vbt_bulk_results table
|       |   +-- queries.py               # save/get/list vbt bulk results
|       |-- engine/
|       |   |-- config.py                # IDX constants + LogicSet1Params + VBT settings (SINGLE SOURCE OF TRUTH)
|       |   |-- compat.py                # VBT_AVAILABLE flag
|       |   |-- runner.py                # run_vbt_backtest() -> VbtBacktestResult
|       |   |-- signals.py               # build_signal_arrays() per-day
|       |   |-- __init__.py              # Re-exports
|       |   +-- bulk/
|       |       |-- grid.py              # build_param_grid() structured numpy arrays
|       |       |-- signals.py           # build_bulk_arrays() -> 2D matrices
|       |       |-- data_cache.py        # BulkDataCache + trading day resolution
|       |       |-- runner.py            # run_vbt_bulk() chunked sweep
|       |       +-- __init__.py          # Re-exports
|       |-- api/router.py               # 3 endpoints (bulk sweep start/runs/results)
|       +-- ui/views/
|           |-- vbt_backtest.py          # Single VBT run with Plotly + trade detail modal
|           +-- vbt_bulk.py              # Bulk sweep config + results with "Open in VBT" links
|-- worker/
|   |-- data/
|   |   |-- schema.py                    # jobs table
|   |   +-- queries.py                   # create_job, update_job, get_jobs, get_job
|   |-- api/
|   |   |-- models.py                    # JobResponse
|   |   +-- router.py                    # 2 endpoints (list + get job)
|   +-- tasks.py                         # do_daily, do_intraday, do_fetch_all, do_vbt_bulk_sweep
|-- ui/
|   |-- app.py                           # Streamlit entry -- 8-page navigation
|   |-- client/
|   |   |-- _base.py                     # HTTP helpers -> localhost:8080
|   |   |-- symbols.py                   # 12 symbol/price/atr client functions
|   |   |-- vbt_backtest.py              # 3 VBT bulk client functions
|   |   +-- worker.py                    # 2 job client functions
|   +-- views/jobs.py                    # Cross-cutting job list view
|-- scripts/
|   |-- bulk_add_fetch.py                # Bulk import 365 IDX stocks
|   |-- fetch_itick.py                   # Alternative data from itick.org
|   |-- test_api.py                      # E2E API test (BBCA.JK)
|   |-- test_data.py                     # Data module smoke test (AAPL)
|   +-- verify_vbt_log.py               # Manual VBT result verification
|-- tests/
|   |-- unit/vbt_backtest/               # Unit tests for grid, runner helpers
|   +-- integration/vbt_backtest/        # Parity tests: single vs bulk, VBT vs oracle
|-- logs/
|   |-- vbt_backtest/                    # VBT run logs (JSON)
|   +-- worker/                          # Worker logs
|-- requirements.txt
+-- CLAUDE.md
```

---

## 17. KNOWN ISSUES & IMPROVEMENT OPPORTUNITIES

### Architecture
1. **No authentication/authorization** — fully open API
2. **No CORS configuration** — won't work if frontend served from different origin
3. **No retry logic** in yfinance fetching — network failures silently return 0 rows
4. **In-memory sweep tracking** (`vbt_bulk_jobs` dict) — lost on server restart
5. **HTTP client timeout** is only 10 seconds — long operations may timeout
6. **No connection pooling** in UI client — creates new connection per request
7. **No WebSocket/SSE** for real-time progress — UI polls with sleep loops

### Data
8. **Daily true range uses simple H-L** (not proper 3-way with prev close) — inconsistent with intraday
9. **ATR uses simple mean**, not Wilder's exponential smoothing (industry standard)
10. **yfinance rate limiting** handled only with random sleep (0.5-2s)

### Engine
11. **VBT 0.28.5 is pinned** and quite old — newer versions may have improvements
12. **No slippage model** — all fills assumed at exact price
13. **No commission model beyond flat %** — no minimum fee, no tiered pricing

### UI
14. **No error boundaries** — API failures show raw Python tracebacks
15. **Polling loops** (sleep-based) are fragile
16. **No responsive design** — fixed table heights (1085px), wide layout only
17. **No caching** of API responses in Streamlit (every interaction re-fetches)

### Missing Features
18. **No multi-strategy support** — only LogicSet1
19. **No portfolio-level analysis** (multi-symbol allocation, correlation)
20. **No live/paper trading** integration
21. **No alerting/notifications**
22. **No data export** (except VBT Bulk CSV)
23. **No automated test suite** (only manual scripts + 2 integration tests)

---

## 18. COMMANDS

```bash
pip install -r requirements.txt          # Install deps
uvicorn api.main:app --reload            # Start API (default port 8000)
streamlit run ui/app.py                  # Start UI
python scripts/bulk_add_fetch.py         # Bulk import IDX stocks
python scripts/test_api.py              # E2E API test
python scripts/fetch_itick.py BBCA --save  # Fetch from itick.org
pytest tests/                            # Run test suite
```
