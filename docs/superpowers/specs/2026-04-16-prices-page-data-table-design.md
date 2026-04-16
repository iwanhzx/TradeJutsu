# Prices Page — Data Table & Timeframe Tabs

## Context

The prices page (`/prices/:symbol`) currently shows only a candlestick chart (OHLC) using lightweight-charts. The backend already returns additional fields — volume, true_range, true_range_pct, turnover — but none are displayed. The page also only uses the daily endpoint; intraday data (1H, 30M, 15M) is available but not exposed in the UI.

This design adds a full data table and timeframe switching to make all price information accessible.

## Design

### Layout (top to bottom)

1. **Symbol selector + Fetch button** (existing, unchanged)
2. **Timeframe tabs**: `Daily | 1 Hour | 30 Min | 15 Min` — horizontal tabs above the chart, active tab has a blue underline
3. **Candlestick chart** (existing PriceChart component, unchanged visually)
4. **Summary strip** — single row showing key stats from the latest bar: Latest Close, Change %, Volume, True Range %, Turnover. Blue left border accent for daily, amber for intraday.
5. **AG Grid data table** — all rows for the selected timeframe with all fields

### Timeframe Tabs

- Tabs: Daily, 1 Hour, 30 Min, 15 Min
- Switching tabs updates chart, summary strip, and table together
- Daily tab uses `useDailyPrices()` / `getDaily()` endpoint
- Intraday tabs use `useIntradayPrices(symbol, interval)` / `getIntraday()` endpoint
- Default tab: Daily

### Summary Strip

Displays values from the most recent row in the dataset:

| Field | Source |
|-------|--------|
| Latest Close | `close` of latest row |
| Change % | `(close - prev_close) / prev_close * 100` — computed from last two rows |
| Volume | `volume` of latest row |
| True Range % | `true_range_pct` of latest row |
| Turnover | `turnover` of latest row |

### Data Table

- **Component**: AG Grid (already a project dependency)
- **Columns**: Date/Datetime, Open, High, Low, Close, Volume, TR, TR%, Turnover
- **Daily tab**: first column is "Date", rows sorted **descending** (newest first)
- **Intraday tabs**: first column is "Datetime", rows sorted **ascending** (chronological, matching chart left-to-right)
- All numeric columns right-aligned
- Table scrolls independently; chart stays visible above

### Data Flow

No backend changes needed. All data is already returned by existing endpoints:
- `GET /prices/daily/{symbol}` → `PriceDailyResponse[]`
- `GET /prices/intraday/{symbol}?interval={interval}` → `PriceIntradayResponse[]`

Frontend changes only:
- `PricesPage.tsx` — add tab state, render tabs, conditionally use daily/intraday hook, add summary strip and table components
- New component: `PriceTable.tsx` — AG Grid table for price data
- New component: `PriceSummary.tsx` — summary strip
- `hooks.ts` — `useIntradayPrices` already exists, no changes needed

## Files to Modify

- `frontend/src/features/prices/PricesPage.tsx` — add tabs, summary strip, table
- `frontend/src/features/prices/PriceTable.tsx` — new: AG Grid table component
- `frontend/src/features/prices/PriceSummary.tsx` — new: summary strip component

## Verification

1. Run `npm run dev` to start both servers
2. Navigate to `/prices/BBCA.JK`
3. Click Fetch to load data
4. Verify Daily tab shows chart + summary strip + table (date descending)
5. Switch to 30 Min tab — verify chart updates, table shows datetime ascending
6. Switch between all tabs — verify data loads correctly
7. Run `cd frontend && npm run build` to verify no type errors
