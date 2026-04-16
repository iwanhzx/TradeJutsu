# Phase 1 Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the TradeJutsu React frontend with 6 pages (symbols, prices, ATR, turnover, WTD, jobs), TradingView charts, AG Grid tables, and real-time WebSocket updates.

**Architecture:** Feature-aligned folder structure mirroring the backend. TanStack Query manages all server state with WebSocket-triggered cache invalidation. Sidebar navigation with React Router.

**Tech Stack:** Vite, React 18, TypeScript, TanStack Query, React Router, AG Grid, TradingView Lightweight Charts, Apache ECharts, Tailwind CSS, shadcn/ui

**Backend API:** 15 REST endpoints + 1 WebSocket at `http://localhost:8000/api/v1`. Vite dev server proxies `/api` to backend.

---

## File Structure

```
frontend/
├── src/
│   ├── main.tsx                          — React entry point
│   ├── index.css                         — Tailwind imports + global styles
│   ├── app/
│   │   ├── App.tsx                       — QueryClient + Router + WebSocket providers
│   │   └── router.tsx                    — Route definitions
│   ├── shared/
│   │   ├── types/
│   │   │   └── api.ts                    — TypeScript interfaces matching backend models
│   │   ├── lib/
│   │   │   ├── httpClient.ts             — fetch wrapper for API calls
│   │   │   └── wsClient.ts              — WebSocket connection + auto-reconnect
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts           — React hook for WS messages + query invalidation
│   │   └── components/
│   │       ├── Layout.tsx                — Sidebar + main content shell
│   │       ├── Sidebar.tsx               — Navigation sidebar
│   │       ├── ErrorBoundary.tsx         — Per-page crash isolation
│   │       ├── LoadingSpinner.tsx        — Loading state component
│   │       └── WsStatus.tsx             — WebSocket connection indicator
│   └── features/
│       ├── symbols/
│       │   ├── SymbolsPage.tsx           — Symbol management page
│       │   ├── SymbolTable.tsx           — AG Grid symbol table
│       │   ├── AddSymbolDialog.tsx       — Add symbol form
│       │   ├── api.ts                    — Fetch wrappers for /symbols
│       │   └── hooks.ts                  — TanStack Query hooks
│       ├── prices/
│       │   ├── PricesPage.tsx            — Price explorer page
│       │   ├── PriceChart.tsx            — TradingView Lightweight Chart
│       │   ├── api.ts                    — Fetch wrappers for /prices
│       │   └── hooks.ts                  — TanStack Query hooks
│       ├── analytics/
│       │   ├── AtrPage.tsx               — ATR analysis page
│       │   ├── TurnoverPage.tsx          — Turnover page
│       │   ├── WtdPage.tsx               — Worth Trade Screening page
│       │   ├── api.ts                    — Fetch wrappers for /analytics
│       │   └── hooks.ts                  — TanStack Query hooks
│       └── jobs/
│           ├── JobsPage.tsx              — Jobs & Tasks page
│           ├── JobProgressBar.tsx        — Individual job progress bar
│           ├── api.ts                    — Fetch wrappers for /jobs
│           └── hooks.ts                  — TanStack Query hooks
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.js
└── index.html
```

---

## Task 1: Vite + React + TypeScript Scaffold

**Files:**
- Create: `frontend/` directory via `npm create vite@latest`
- Modify: `frontend/package.json` (add dependencies)
- Create: `frontend/vite.config.ts` (add proxy)
- Create: `frontend/tailwind.config.ts`, `frontend/postcss.config.js`
- Modify: `frontend/src/index.css`
- Modify: `Makefile` (add frontend commands)

- [ ] **Step 1: Scaffold Vite project**

```bash
cd D:/TradeJutsu
npm create vite@latest frontend -- --template react-ts
```

- [ ] **Step 2: Install dependencies**

```bash
cd D:/TradeJutsu/frontend
npm install @tanstack/react-query react-router-dom ag-grid-react ag-grid-community lightweight-charts echarts echarts-for-react
npm install -D tailwindcss @tailwindcss/postcss postcss autoprefixer
```

- [ ] **Step 3: Configure Vite with API proxy**

Replace `frontend/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: Configure Tailwind CSS**

Create `frontend/postcss.config.js`:

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

Create `frontend/tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

Replace `frontend/src/index.css`:

```css
@import "tailwindcss";

:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --accent: #3b82f6;
  --success: #22c55e;
  --danger: #ef4444;
  --warning: #f59e0b;
}

body {
  margin: 0;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: Inter, system-ui, sans-serif;
}
```

- [ ] **Step 5: Update Makefile**

Add to `Makefile`:

```makefile
frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) backend & $(MAKE) frontend

test-frontend:
	cd frontend && npm test

test: test-backend test-frontend
```

- [ ] **Step 6: Verify frontend starts**

```bash
cd D:/TradeJutsu/frontend && npm run dev
```

Expected: Vite dev server at http://localhost:5173

- [ ] **Step 7: Commit**

```bash
cd D:/TradeJutsu
git add frontend/ Makefile
git commit -m "feat: Vite + React + TypeScript scaffold with Tailwind and API proxy"
```

---

## Task 2: TypeScript Types + HTTP Client

**Files:**
- Create: `frontend/src/shared/types/api.ts`
- Create: `frontend/src/shared/lib/httpClient.ts`

- [ ] **Step 1: Create API types**

Create `frontend/src/shared/types/api.ts`:

```ts
// === Symbols ===

export interface SymbolCreate {
  symbol: string;
}

export interface SymbolResponse {
  symbol: string;
  name: string | null;
  sector: string | null;
  currency: string | null;
  is_active: boolean;
  is_worth_trade_daily: boolean;
  latest_price: number | null;
  latest_price_date: string | null;
  added_at: string | null;
}

// === Prices ===

export interface PriceDailyResponse {
  symbol: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  true_range: number | null;
  true_range_pct: number | null;
  turnover: number | null;
}

export interface PriceIntradayResponse {
  symbol: string;
  datetime: string;
  interval: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  true_range: number | null;
  true_range_pct: number | null;
  turnover: number | null;
}

export interface FetchResponse {
  job_id: string;
  status: string;
}

// === Jobs ===

export interface JobResponse {
  job_id: string;
  job_type: string;
  symbol: string | null;
  status: string;
  progress: number;
  total_items: number;
  completed_items: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobCreated {
  job_id: string;
  status: string;
}

// === Analytics ===

export interface AtrSummaryResponse {
  symbol: string;
  interval: string;
  period_days: number;
  atr_wilder: number | null;
  atr_pct_wilder: number | null;
  atr_with_open: number | null;
  atr_pct_with_open: number | null;
  atr_exclude_open: number | null;
  atr_pct_exclude_open: number | null;
  calculated_at: string | null;
}

export interface TurnoverItem {
  symbol: string;
  avg_turnover: number | null;
  period_days: number;
}

export interface WtdReportItem {
  symbol: string;
  is_worth_trade_daily: boolean;
  turnover_1w: number | null;
  turnover_2w: number | null;
  atr_1h_1w_pass: boolean;
  atr_1h_2w_pass: boolean;
  atr_daily_1w_pass: boolean;
  atr_daily_2w_pass: boolean;
  atr_conditions_met: number;
}

// === WebSocket Messages ===

export type WsMessage =
  | { type: "job:started"; job_id: string; job_type: string; symbol?: string }
  | { type: "job:progress"; job_id: string; completed: number; total: number; symbol?: string }
  | { type: "job:complete"; job_id: string; status: string }
  | { type: "job:error"; job_id: string; error: string }
  | { type: "data:updated"; table: string; symbol?: string };
```

- [ ] **Step 2: Create HTTP client**

Create `frontend/src/shared/lib/httpClient.ts`:

```ts
const API_BASE = "/api/v1";

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(response.status, body.detail || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string) => request<T>(path, { method: "PATCH" }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export { ApiError };
```

- [ ] **Step 3: Commit**

```bash
cd D:/TradeJutsu
git add frontend/src/shared/
git commit -m "feat: TypeScript API types and HTTP client"
```

---

## Task 3: WebSocket Hook + App Shell

**Files:**
- Create: `frontend/src/shared/lib/wsClient.ts`
- Create: `frontend/src/shared/hooks/useWebSocket.ts`
- Create: `frontend/src/shared/components/Layout.tsx`
- Create: `frontend/src/shared/components/Sidebar.tsx`
- Create: `frontend/src/shared/components/ErrorBoundary.tsx`
- Create: `frontend/src/shared/components/LoadingSpinner.tsx`
- Create: `frontend/src/shared/components/WsStatus.tsx`
- Create: `frontend/src/app/router.tsx`
- Modify: `frontend/src/app/App.tsx` (or create)
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create WebSocket client**

Create `frontend/src/shared/lib/wsClient.ts`:

```ts
import type { WsMessage } from "../types/api";

type MessageHandler = (message: WsMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private _isConnected = false;
  private _statusListeners: Set<(connected: boolean) => void> = new Set();

  get isConnected() {
    return this._isConnected;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // In dev, WebSocket goes directly to backend (not through Vite proxy)
    const host = import.meta.env.DEV ? "localhost:8000" : window.location.host;
    this.ws = new WebSocket(`${protocol}//${host}/api/v1/ws`);

    this.ws.onopen = () => {
      this._isConnected = true;
      this._notifyStatus();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);
        this.handlers.forEach((handler) => handler(message));
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this._isConnected = false;
      this._notifyStatus();
      this._scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.ws?.close();
    this.ws = null;
    this._isConnected = false;
    this._notifyStatus();
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStatusChange(listener: (connected: boolean) => void): () => void {
    this._statusListeners.add(listener);
    return () => this._statusListeners.delete(listener);
  }

  private _notifyStatus() {
    this._statusListeners.forEach((l) => l(this._isConnected));
  }

  private _scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 3000);
  }
}

export const wsClient = new WebSocketClient();
```

- [ ] **Step 2: Create useWebSocket hook**

Create `frontend/src/shared/hooks/useWebSocket.ts`:

```ts
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsClient } from "../lib/wsClient";
import type { WsMessage } from "../types/api";

export function useWebSocket() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(wsClient.isConnected);

  useEffect(() => {
    wsClient.connect();

    const unsubStatus = wsClient.onStatusChange(setIsConnected);

    const unsubMessages = wsClient.subscribe((message: WsMessage) => {
      switch (message.type) {
        case "job:started":
        case "job:progress":
        case "job:complete":
        case "job:error":
          queryClient.invalidateQueries({ queryKey: ["jobs"] });
          break;
        case "data:updated":
          // Invalidate queries based on which table was updated
          if (message.table === "prices_daily" || message.table === "prices_intraday") {
            queryClient.invalidateQueries({ queryKey: ["prices"] });
          }
          if (message.table === "atr_summary") {
            queryClient.invalidateQueries({ queryKey: ["atr"] });
          }
          if (message.table === "symbols") {
            queryClient.invalidateQueries({ queryKey: ["symbols"] });
          }
          break;
      }
    });

    return () => {
      unsubStatus();
      unsubMessages();
    };
  }, [queryClient]);

  return { isConnected };
}
```

- [ ] **Step 3: Create shared components**

Create `frontend/src/shared/components/LoadingSpinner.tsx`:

```tsx
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}
```

Create `frontend/src/shared/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-lg bg-red-900/20 border border-red-800 p-6 m-4">
            <h3 className="text-red-400 font-semibold mb-2">Something went wrong</h3>
            <p className="text-sm text-slate-400">{this.state.error?.message}</p>
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

Create `frontend/src/shared/components/WsStatus.tsx`:

```tsx
interface Props {
  isConnected: boolean;
}

export function WsStatus({ isConnected }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
      />
      <span className="text-slate-400">
        {isConnected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}
```

Create `frontend/src/shared/components/Sidebar.tsx`:

```tsx
import { NavLink } from "react-router-dom";

interface NavItem {
  label: string;
  path: string;
  disabled?: boolean;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Market Data",
    items: [
      { label: "Symbol Management", path: "/symbols" },
      { label: "Price Explorer", path: "/prices" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "ATR Analysis", path: "/analytics/atr" },
      { label: "Turnover", path: "/analytics/turnover" },
      { label: "Worth Trade Screening", path: "/analytics/wtd" },
    ],
  },
  {
    title: "Backtesting",
    items: [
      { label: "Single Run", path: "/backtest", disabled: true },
      { label: "Bulk Sweep", path: "/backtest/bulk", disabled: true },
    ],
  },
  {
    title: "System",
    items: [{ label: "Jobs & Tasks", path: "/jobs" }],
  },
];

export function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 border-r border-slate-700 bg-slate-900 p-4 overflow-y-auto">
      <div className="text-lg font-bold mb-6 pb-3 border-b border-slate-700">
        TradeJutsu
      </div>
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="mb-5">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
            {section.title}
          </div>
          {section.items.map((item) =>
            item.disabled ? (
              <div
                key={item.path}
                className="block px-3 py-1.5 rounded text-sm text-slate-600 cursor-not-allowed"
              >
                {item.label} <span className="text-xs">(Phase 2)</span>
              </div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `block px-3 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-slate-300 hover:bg-slate-800"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
        </div>
      ))}
    </aside>
  );
}
```

Create `frontend/src/shared/components/Layout.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { WsStatus } from "./WsStatus";
import { useWebSocket } from "../hooks/useWebSocket";
import { ErrorBoundary } from "./ErrorBoundary";

export function Layout() {
  const { isConnected } = useWebSocket();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-end px-6 py-3 border-b border-slate-700 bg-slate-900/50">
          <WsStatus isConnected={isConnected} />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create router and App**

Create `frontend/src/app/router.tsx`:

```tsx
import { createBrowserRouter } from "react-router-dom";
import { Layout } from "../shared/components/Layout";

// Lazy load pages
import { SymbolsPage } from "../features/symbols/SymbolsPage";
import { PricesPage } from "../features/prices/PricesPage";
import { AtrPage } from "../features/analytics/AtrPage";
import { TurnoverPage } from "../features/analytics/TurnoverPage";
import { WtdPage } from "../features/analytics/WtdPage";
import { JobsPage } from "../features/jobs/JobsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <SymbolsPage /> },
      { path: "symbols", element: <SymbolsPage /> },
      { path: "prices", element: <PricesPage /> },
      { path: "analytics/atr", element: <AtrPage /> },
      { path: "analytics/turnover", element: <TurnoverPage /> },
      { path: "analytics/wtd", element: <WtdPage /> },
      { path: "jobs", element: <JobsPage /> },
    ],
  },
]);
```

Create `frontend/src/app/App.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

Replace `frontend/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Create placeholder pages**

Each page file is a minimal placeholder so the router works. They'll be fleshed out in subsequent tasks.

Create `frontend/src/features/symbols/SymbolsPage.tsx`:
```tsx
export function SymbolsPage() {
  return <div><h2 className="text-xl font-semibold">Symbol Management</h2><p className="text-slate-400 mt-2">Loading...</p></div>;
}
```

Create `frontend/src/features/prices/PricesPage.tsx`:
```tsx
export function PricesPage() {
  return <div><h2 className="text-xl font-semibold">Price Explorer</h2><p className="text-slate-400 mt-2">Loading...</p></div>;
}
```

Create `frontend/src/features/analytics/AtrPage.tsx`:
```tsx
export function AtrPage() {
  return <div><h2 className="text-xl font-semibold">ATR Analysis</h2><p className="text-slate-400 mt-2">Loading...</p></div>;
}
```

Create `frontend/src/features/analytics/TurnoverPage.tsx`:
```tsx
export function TurnoverPage() {
  return <div><h2 className="text-xl font-semibold">Turnover</h2><p className="text-slate-400 mt-2">Loading...</p></div>;
}
```

Create `frontend/src/features/analytics/WtdPage.tsx`:
```tsx
export function WtdPage() {
  return <div><h2 className="text-xl font-semibold">Worth Trade Screening</h2><p className="text-slate-400 mt-2">Loading...</p></div>;
}
```

Create `frontend/src/features/jobs/JobsPage.tsx`:
```tsx
export function JobsPage() {
  return <div><h2 className="text-xl font-semibold">Jobs & Tasks</h2><p className="text-slate-400 mt-2">Loading...</p></div>;
}
```

- [ ] **Step 6: Delete Vite boilerplate**

Remove the files Vite scaffolded that we don't need:
- `frontend/src/App.tsx` (replaced by `app/App.tsx`)
- `frontend/src/App.css`
- `frontend/src/assets/` (if exists)

- [ ] **Step 7: Verify app loads**

```bash
cd D:/TradeJutsu/frontend && npm run dev
```

Open http://localhost:5173 — should see sidebar with navigation and placeholder pages.

- [ ] **Step 8: Commit**

```bash
cd D:/TradeJutsu
git add frontend/
git commit -m "feat: app shell with sidebar, router, WebSocket hook, shared components"
```

---

## Task 4: Feature API Layers + TanStack Query Hooks

**Files:**
- Create: `frontend/src/features/symbols/api.ts` + `hooks.ts`
- Create: `frontend/src/features/prices/api.ts` + `hooks.ts`
- Create: `frontend/src/features/analytics/api.ts` + `hooks.ts`
- Create: `frontend/src/features/jobs/api.ts` + `hooks.ts`

- [ ] **Step 1: Symbols API + hooks**

Create `frontend/src/features/symbols/api.ts`:

```ts
import { api } from "../../shared/lib/httpClient";
import type { SymbolResponse, SymbolCreate } from "../../shared/types/api";

export const symbolsApi = {
  list: () => api.get<SymbolResponse[]>("/symbols"),
  get: (symbol: string) => api.get<SymbolResponse>(`/symbols/${symbol}`),
  add: (body: SymbolCreate) => api.post<SymbolResponse>("/symbols", body),
  disable: (symbol: string) => api.patch<SymbolResponse>(`/symbols/${symbol}/disable`),
  enable: (symbol: string) => api.patch<SymbolResponse>(`/symbols/${symbol}/enable`),
  delete: (symbol: string) => api.delete<void>(`/symbols/${symbol}`),
};
```

Create `frontend/src/features/symbols/hooks.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { symbolsApi } from "./api";
import type { SymbolCreate } from "../../shared/types/api";

export function useSymbols() {
  return useQuery({ queryKey: ["symbols"], queryFn: symbolsApi.list });
}

export function useAddSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SymbolCreate) => symbolsApi.add(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["symbols"] }),
  });
}

export function useToggleSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ symbol, active }: { symbol: string; active: boolean }) =>
      active ? symbolsApi.enable(symbol) : symbolsApi.disable(symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["symbols"] }),
  });
}

export function useDeleteSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => symbolsApi.delete(symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["symbols"] }),
  });
}
```

- [ ] **Step 2: Prices API + hooks**

Create `frontend/src/features/prices/api.ts`:

```ts
import { api } from "../../shared/lib/httpClient";
import type {
  PriceDailyResponse,
  PriceIntradayResponse,
  FetchResponse,
} from "../../shared/types/api";

export const pricesApi = {
  getDaily: (symbol: string, start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const qs = params.toString();
    return api.get<PriceDailyResponse[]>(`/prices/daily/${symbol}${qs ? `?${qs}` : ""}`);
  },
  getIntraday: (symbol: string, interval = "30min", start?: string, end?: string) => {
    const params = new URLSearchParams({ interval });
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return api.get<PriceIntradayResponse[]>(`/prices/intraday/${symbol}?${params}`);
  },
  fetchPrices: (symbol: string, interval: string) =>
    api.post<FetchResponse>(`/prices/${symbol}/fetch/${interval}`),
  fetchAll: (interval: string) => api.post<FetchResponse>(`/prices/fetch-all/${interval}`),
};
```

Create `frontend/src/features/prices/hooks.ts`:

```ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { pricesApi } from "./api";

export function useDailyPrices(symbol: string | null) {
  return useQuery({
    queryKey: ["prices", "daily", symbol],
    queryFn: () => pricesApi.getDaily(symbol!),
    enabled: !!symbol,
  });
}

export function useIntradayPrices(symbol: string | null, interval = "30min") {
  return useQuery({
    queryKey: ["prices", "intraday", symbol, interval],
    queryFn: () => pricesApi.getIntraday(symbol!, interval),
    enabled: !!symbol,
  });
}

export function useFetchPrices() {
  return useMutation({
    mutationFn: ({ symbol, interval }: { symbol: string; interval: string }) =>
      pricesApi.fetchPrices(symbol, interval),
  });
}

export function useFetchAllPrices() {
  return useMutation({
    mutationFn: (interval: string) => pricesApi.fetchAll(interval),
  });
}
```

- [ ] **Step 3: Analytics API + hooks**

Create `frontend/src/features/analytics/api.ts`:

```ts
import { api } from "../../shared/lib/httpClient";
import type {
  AtrSummaryResponse,
  TurnoverItem,
  WtdReportItem,
  JobCreated,
} from "../../shared/types/api";

export const analyticsApi = {
  getAtrSummary: (interval?: string, symbol?: string) => {
    const params = new URLSearchParams();
    if (interval) params.set("interval", interval);
    if (symbol) params.set("symbol", symbol);
    const qs = params.toString();
    return api.get<AtrSummaryResponse[]>(`/analytics/atr/summary${qs ? `?${qs}` : ""}`);
  },
  calculateAtr: (interval: string) =>
    api.post<JobCreated>(`/analytics/atr/calculate/${interval}`),
  getTurnover: (days = 7, symbol?: string) => {
    const params = new URLSearchParams({ days: String(days) });
    if (symbol) params.set("symbol", symbol);
    return api.get<TurnoverItem[]>(`/analytics/turnover?${params}`);
  },
  getWtdReport: () => api.get<WtdReportItem[]>("/analytics/wtd/report"),
  checkWtd: () => api.post<JobCreated>("/analytics/wtd/check"),
};
```

Create `frontend/src/features/analytics/hooks.ts`:

```ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { analyticsApi } from "./api";

export function useAtrSummary(interval?: string, symbol?: string) {
  return useQuery({
    queryKey: ["atr", interval, symbol],
    queryFn: () => analyticsApi.getAtrSummary(interval, symbol),
  });
}

export function useCalculateAtr() {
  return useMutation({
    mutationFn: (interval: string) => analyticsApi.calculateAtr(interval),
  });
}

export function useTurnover(days = 7) {
  return useQuery({
    queryKey: ["turnover", days],
    queryFn: () => analyticsApi.getTurnover(days),
  });
}

export function useWtdReport() {
  return useQuery({
    queryKey: ["wtd"],
    queryFn: analyticsApi.getWtdReport,
  });
}

export function useCheckWtd() {
  return useMutation({ mutationFn: analyticsApi.checkWtd });
}
```

- [ ] **Step 4: Jobs API + hooks**

Create `frontend/src/features/jobs/api.ts`:

```ts
import { api } from "../../shared/lib/httpClient";
import type { JobResponse } from "../../shared/types/api";

export const jobsApi = {
  list: () => api.get<JobResponse[]>("/jobs"),
  get: (jobId: string) => api.get<JobResponse>(`/jobs/${jobId}`),
};
```

Create `frontend/src/features/jobs/hooks.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "./api";

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: jobsApi.list,
    refetchInterval: 5000,
  });
}
```

- [ ] **Step 5: Commit**

```bash
cd D:/TradeJutsu
git add frontend/src/features/
git commit -m "feat: API layers and TanStack Query hooks for all features"
```

---

## Task 5: Symbol Management Page

**Files:**
- Replace: `frontend/src/features/symbols/SymbolsPage.tsx`
- Create: `frontend/src/features/symbols/SymbolTable.tsx`
- Create: `frontend/src/features/symbols/AddSymbolDialog.tsx`

- [ ] **Step 1: Create AddSymbolDialog**

Create `frontend/src/features/symbols/AddSymbolDialog.tsx`:

```tsx
import { useState } from "react";
import { useAddSymbol } from "./hooks";

interface Props {
  onClose: () => void;
}

export function AddSymbolDialog({ onClose }: Props) {
  const [symbol, setSymbol] = useState("");
  const addMutation = useAddSymbol();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    addMutation.mutate({ symbol: symbol.trim().toUpperCase() }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-96 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Add Symbol</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. BBCA.JK"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 mb-4"
            autoFocus
          />
          {addMutation.error && (
            <p className="text-red-400 text-sm mb-3">{String(addMutation.error)}</p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {addMutation.isPending ? "Adding..." : "Add Symbol"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SymbolTable with AG Grid**

Create `frontend/src/features/symbols/SymbolTable.tsx`:

```tsx
import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { SymbolResponse } from "../../shared/types/api";
import { useToggleSymbol, useDeleteSymbol } from "./hooks";
import { useFetchPrices, useFetchAllPrices } from "../prices/hooks";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  symbols: SymbolResponse[];
}

export function SymbolTable({ symbols }: Props) {
  const toggleMutation = useToggleSymbol();
  const deleteMutation = useDeleteSymbol();
  const fetchMutation = useFetchPrices();
  const fetchAllMutation = useFetchAllPrices();

  const columnDefs = useMemo<ColDef<SymbolResponse>[]>(
    () => [
      { field: "symbol", width: 120, sortable: true, filter: true },
      { field: "name", flex: 1, sortable: true, filter: true },
      { field: "sector", width: 130, sortable: true, filter: true },
      {
        field: "latest_price",
        headerName: "Price",
        width: 110,
        valueFormatter: (p) => (p.value != null ? p.value.toLocaleString() : "-"),
      },
      {
        field: "is_active",
        headerName: "Active",
        width: 90,
        cellRenderer: (p: { data: SymbolResponse }) => (
          <button
            onClick={() =>
              toggleMutation.mutate({ symbol: p.data.symbol, active: !p.data.is_active })
            }
            className={`px-2 py-0.5 rounded text-xs ${
              p.data.is_active ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
            }`}
          >
            {p.data.is_active ? "Active" : "Disabled"}
          </button>
        ),
      },
      {
        field: "is_worth_trade_daily",
        headerName: "WTD",
        width: 80,
        cellRenderer: (p: { data: SymbolResponse }) => (
          <span className={p.data.is_worth_trade_daily ? "text-green-400" : "text-slate-500"}>
            {p.data.is_worth_trade_daily ? "Yes" : "No"}
          </span>
        ),
      },
      {
        headerName: "Actions",
        width: 180,
        cellRenderer: (p: { data: SymbolResponse }) => (
          <div className="flex gap-2 items-center h-full">
            <button
              onClick={() => fetchMutation.mutate({ symbol: p.data.symbol, interval: "daily" })}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Fetch
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete ${p.data.symbol}?`)) deleteMutation.mutate(p.data.symbol);
              }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [toggleMutation, deleteMutation, fetchMutation],
  );

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => fetchAllMutation.mutate("daily")}
          disabled={fetchAllMutation.isPending}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {fetchAllMutation.isPending ? "Fetching..." : "Fetch All Daily"}
        </button>
        <button
          onClick={() => fetchAllMutation.mutate("1hour")}
          disabled={fetchAllMutation.isPending}
          className="px-3 py-1.5 bg-slate-600 text-white rounded text-sm hover:bg-slate-500 disabled:opacity-50"
        >
          Fetch All 1H
        </button>
      </div>
      <div className="ag-theme-alpine-dark" style={{ height: 600 }}>
        <AgGridReact<SymbolResponse>
          rowData={symbols}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true }}
          animateRows
          getRowId={(p) => p.data.symbol}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace SymbolsPage**

Replace `frontend/src/features/symbols/SymbolsPage.tsx`:

```tsx
import { useState } from "react";
import { useSymbols } from "./hooks";
import { SymbolTable } from "./SymbolTable";
import { AddSymbolDialog } from "./AddSymbolDialog";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";

export function SymbolsPage() {
  const { data: symbols, isLoading, error } = useSymbols();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Symbol Management</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          + Add Symbol
        </button>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <p className="text-red-400">Failed to load symbols: {String(error)}</p>}
      {symbols && <SymbolTable symbols={symbols} />}
      {showAdd && <AddSymbolDialog onClose={() => setShowAdd(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: Verify page works**

Start backend + frontend: `make dev`
Open http://localhost:5173/symbols — should see AG Grid table, "Add Symbol" button.

- [ ] **Step 5: Commit**

```bash
cd D:/TradeJutsu
git add frontend/src/features/symbols/
git commit -m "feat: symbol management page with AG Grid table and add dialog"
```

---

## Task 6: Price Explorer Page

**Files:**
- Replace: `frontend/src/features/prices/PricesPage.tsx`
- Create: `frontend/src/features/prices/PriceChart.tsx`

- [ ] **Step 1: Create PriceChart with TradingView Lightweight Charts**

Create `frontend/src/features/prices/PriceChart.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type CandlestickData, type Time } from "lightweight-charts";
import type { PriceDailyResponse } from "../../shared/types/api";

interface Props {
  data: PriceDailyResponse[];
}

export function PriceChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: "#1e293b" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#334155" },
        horzLines: { color: "#334155" },
      },
      crosshair: { mode: 0 },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const candles: CandlestickData<Time>[] = data
      .filter((d) => d.open != null && d.high != null && d.low != null && d.close != null)
      .map((d) => ({
        time: d.date as Time,
        open: d.open!,
        high: d.high!,
        low: d.low!,
        close: d.close!,
      }));

    candleSeries.setData(candles);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  return <div ref={containerRef} className="rounded-lg overflow-hidden" />;
}
```

- [ ] **Step 2: Replace PricesPage**

Replace `frontend/src/features/prices/PricesPage.tsx`:

```tsx
import { useState } from "react";
import { useSymbols } from "../symbols/hooks";
import { useDailyPrices } from "./hooks";
import { PriceChart } from "./PriceChart";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";

export function PricesPage() {
  const { data: symbols } = useSymbols();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const { data: prices, isLoading } = useDailyPrices(selectedSymbol);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Price Explorer</h2>

      <div className="flex gap-4 mb-4">
        <select
          value={selectedSymbol || ""}
          onChange={(e) => setSelectedSymbol(e.target.value || null)}
          className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
        >
          <option value="">Select symbol...</option>
          {symbols?.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol} {s.name ? `- ${s.name}` : ""}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingSpinner />}
      {prices && prices.length > 0 && <PriceChart data={prices} />}
      {prices && prices.length === 0 && selectedSymbol && (
        <p className="text-slate-400">No price data for {selectedSymbol}. Fetch daily prices first.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd D:/TradeJutsu
git add frontend/src/features/prices/
git commit -m "feat: price explorer with TradingView candlestick chart"
```

---

## Task 7: Analytics Pages (ATR, Turnover, WTD)

**Files:**
- Replace: `frontend/src/features/analytics/AtrPage.tsx`
- Replace: `frontend/src/features/analytics/TurnoverPage.tsx`
- Replace: `frontend/src/features/analytics/WtdPage.tsx`

- [ ] **Step 1: Replace AtrPage**

Replace `frontend/src/features/analytics/AtrPage.tsx`:

```tsx
import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { useAtrSummary, useCalculateAtr } from "./hooks";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";
import type { AtrSummaryResponse } from "../../shared/types/api";

ModuleRegistry.registerModules([AllCommunityModule]);

export function AtrPage() {
  const { data, isLoading } = useAtrSummary();
  const calcMutation = useCalculateAtr();

  const columnDefs = useMemo<ColDef<AtrSummaryResponse>[]>(
    () => [
      { field: "symbol", width: 120, sortable: true, filter: true },
      { field: "interval", width: 100, sortable: true, filter: true },
      { field: "period_days", headerName: "Period", width: 90, sortable: true },
      { field: "atr_wilder", headerName: "ATR (Wilder)", width: 120, valueFormatter: (p) => p.value?.toFixed(2) ?? "-" },
      { field: "atr_pct_wilder", headerName: "ATR% (Wilder)", width: 130, valueFormatter: (p) => p.value?.toFixed(2) ?? "-" },
      { field: "atr_with_open", headerName: "ATR (w/ Open)", width: 120, valueFormatter: (p) => p.value?.toFixed(2) ?? "-" },
      { field: "atr_exclude_open", headerName: "ATR (excl Open)", width: 130, valueFormatter: (p) => p.value?.toFixed(2) ?? "-" },
      { field: "atr_pct_exclude_open", headerName: "ATR% (excl Open)", width: 140, valueFormatter: (p) => p.value?.toFixed(2) ?? "-" },
    ],
    [],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">ATR Analysis</h2>
        <div className="flex gap-2">
          <button
            onClick={() => calcMutation.mutate("1hour")}
            disabled={calcMutation.isPending}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Calculate 1H ATR
          </button>
          <button
            onClick={() => calcMutation.mutate("daily")}
            disabled={calcMutation.isPending}
            className="px-3 py-1.5 bg-slate-600 text-white rounded text-sm hover:bg-slate-500 disabled:opacity-50"
          >
            Calculate Daily ATR
          </button>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {data && (
        <div className="ag-theme-alpine-dark" style={{ height: 600 }}>
          <AgGridReact<AtrSummaryResponse>
            rowData={data}
            columnDefs={columnDefs}
            defaultColDef={{ resizable: true }}
            animateRows
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace TurnoverPage**

Replace `frontend/src/features/analytics/TurnoverPage.tsx`:

```tsx
import { useState, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { useTurnover } from "./hooks";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";
import type { TurnoverItem } from "../../shared/types/api";

ModuleRegistry.registerModules([AllCommunityModule]);

const PERIOD_OPTIONS = [
  { label: "1W", days: 5 },
  { label: "2W", days: 10 },
  { label: "1M", days: 22 },
  { label: "3M", days: 66 },
  { label: "6M", days: 132 },
];

export function TurnoverPage() {
  const [days, setDays] = useState(5);
  const { data, isLoading } = useTurnover(days);

  const columnDefs = useMemo<ColDef<TurnoverItem>[]>(
    () => [
      { field: "symbol", width: 120, sortable: true, filter: true },
      {
        field: "avg_turnover",
        headerName: "Avg Daily Turnover (IDR)",
        flex: 1,
        sortable: true,
        valueFormatter: (p) =>
          p.value != null ? `Rp ${(p.value / 1_000_000_000).toFixed(1)}B` : "-",
      },
    ],
    [],
  );

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Daily Turnover</h2>

      <div className="flex gap-2 mb-4">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => setDays(opt.days)}
            className={`px-3 py-1.5 rounded text-sm ${
              days === opt.days
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && <LoadingSpinner />}
      {data && (
        <div className="ag-theme-alpine-dark" style={{ height: 600 }}>
          <AgGridReact<TurnoverItem>
            rowData={data}
            columnDefs={columnDefs}
            defaultColDef={{ resizable: true }}
            animateRows
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Replace WtdPage**

Replace `frontend/src/features/analytics/WtdPage.tsx`:

```tsx
import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { useWtdReport, useCheckWtd } from "./hooks";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";
import type { WtdReportItem } from "../../shared/types/api";

ModuleRegistry.registerModules([AllCommunityModule]);

export function WtdPage() {
  const { data, isLoading } = useWtdReport();
  const checkMutation = useCheckWtd();

  const columnDefs = useMemo<ColDef<WtdReportItem>[]>(
    () => [
      { field: "symbol", width: 120, sortable: true, filter: true },
      {
        field: "is_worth_trade_daily",
        headerName: "WTD",
        width: 80,
        cellStyle: (p) => ({
          color: p.value ? "#22c55e" : "#ef4444",
          fontWeight: 600,
        }),
        valueFormatter: (p) => (p.value ? "PASS" : "FAIL"),
      },
      {
        field: "turnover_1w",
        headerName: "Turnover 1W",
        width: 130,
        valueFormatter: (p) =>
          p.value != null ? `${(p.value / 1e9).toFixed(1)}B` : "-",
      },
      {
        field: "turnover_2w",
        headerName: "Turnover 2W",
        width: 130,
        valueFormatter: (p) =>
          p.value != null ? `${(p.value / 1e9).toFixed(1)}B` : "-",
      },
      {
        field: "atr_1h_1w_pass",
        headerName: "1H ATR 1W",
        width: 100,
        cellStyle: (p) => ({ color: p.value ? "#22c55e" : "#ef4444" }),
        valueFormatter: (p) => (p.value ? "Pass" : "Fail"),
      },
      {
        field: "atr_1h_2w_pass",
        headerName: "1H ATR 2W",
        width: 100,
        cellStyle: (p) => ({ color: p.value ? "#22c55e" : "#ef4444" }),
        valueFormatter: (p) => (p.value ? "Pass" : "Fail"),
      },
      {
        field: "atr_daily_1w_pass",
        headerName: "D ATR 1W",
        width: 100,
        cellStyle: (p) => ({ color: p.value ? "#22c55e" : "#ef4444" }),
        valueFormatter: (p) => (p.value ? "Pass" : "Fail"),
      },
      {
        field: "atr_daily_2w_pass",
        headerName: "D ATR 2W",
        width: 100,
        cellStyle: (p) => ({ color: p.value ? "#22c55e" : "#ef4444" }),
        valueFormatter: (p) => (p.value ? "Pass" : "Fail"),
      },
      {
        field: "atr_conditions_met",
        headerName: "Conditions",
        width: 100,
        valueFormatter: (p) => `${p.value}/4`,
      },
    ],
    [],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Worth Trade Screening</h2>
        <button
          onClick={() => checkMutation.mutate()}
          disabled={checkMutation.isPending}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {checkMutation.isPending ? "Checking..." : "Run WTD Check"}
        </button>
      </div>

      {isLoading && <LoadingSpinner />}
      {data && (
        <div className="ag-theme-alpine-dark" style={{ height: 600 }}>
          <AgGridReact<WtdReportItem>
            rowData={data}
            columnDefs={columnDefs}
            defaultColDef={{ resizable: true }}
            animateRows
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd D:/TradeJutsu
git add frontend/src/features/analytics/
git commit -m "feat: ATR, turnover, and WTD screening pages with AG Grid"
```

---

## Task 8: Jobs Page

**Files:**
- Replace: `frontend/src/features/jobs/JobsPage.tsx`
- Create: `frontend/src/features/jobs/JobProgressBar.tsx`

- [ ] **Step 1: Create JobProgressBar**

Create `frontend/src/features/jobs/JobProgressBar.tsx`:

```tsx
import type { JobResponse } from "../../shared/types/api";

interface Props {
  job: JobResponse;
}

export function JobProgressBar({ job }: Props) {
  const statusColor = {
    pending: "bg-yellow-600",
    running: "bg-blue-600",
    done: "bg-green-600",
    failed: "bg-red-600",
  }[job.status] || "bg-slate-600";

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-xs text-white ${statusColor}`}>
            {job.status.toUpperCase()}
          </span>
          <span className="text-sm font-medium">{job.job_type}</span>
          {job.symbol && <span className="text-sm text-slate-400">{job.symbol}</span>}
        </div>
        <span className="text-xs text-slate-500">
          {new Date(job.created_at).toLocaleTimeString()}
        </span>
      </div>

      {job.status === "running" && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>
              {job.completed_items} / {job.total_items}
            </span>
            <span>{job.progress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )}

      {job.error && <p className="mt-2 text-sm text-red-400">{job.error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Replace JobsPage**

Replace `frontend/src/features/jobs/JobsPage.tsx`:

```tsx
import { useJobs } from "./hooks";
import { JobProgressBar } from "./JobProgressBar";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";

export function JobsPage() {
  const { data: jobs, isLoading } = useJobs();

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Jobs & Tasks</h2>

      {isLoading && <LoadingSpinner />}

      {jobs && jobs.length === 0 && (
        <p className="text-slate-400">No jobs yet. Trigger a fetch or calculation to see jobs here.</p>
      )}

      <div className="space-y-3">
        {jobs?.map((job) => (
          <JobProgressBar key={job.job_id} job={job} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd D:/TradeJutsu
git add frontend/src/features/jobs/
git commit -m "feat: jobs page with live progress bars"
```

---

## Task 9: Final Cleanup + TypeCheck

**Files:**
- Clean up any unused Vite boilerplate files
- Verify TypeScript compiles

- [ ] **Step 1: Remove Vite boilerplate**

Delete these if they still exist:
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/assets/react.svg`
- `frontend/public/vite.svg`

- [ ] **Step 2: TypeScript check**

```bash
cd D:/TradeJutsu/frontend && npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 3: Verify full app works**

```bash
# Terminal 1
make backend

# Terminal 2
make frontend
```

Open http://localhost:5173:
1. Symbols page loads with AG Grid
2. Add a symbol (e.g., BBCA.JK) — appears in table
3. Click "Fetch All Daily" — job appears on Jobs page with progress
4. Price Explorer — select BBCA.JK, candlestick chart renders
5. ATR Analysis — click "Calculate 1H ATR"
6. WebSocket status shows green "Connected"

- [ ] **Step 4: Commit**

```bash
cd D:/TradeJutsu
git add -A
git commit -m "feat: complete Phase 1 frontend with all 6 pages"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 6 pages from spec implemented (Symbol Management, Price Explorer, ATR Analysis, Turnover, WTD Screening, Jobs). Sidebar with domain grouping. WebSocket status indicator. Error boundaries. TanStack Query with WS-triggered invalidation.
- [x] **Placeholder scan:** No TBD/TODO. All code blocks are complete.
- [x] **Type consistency:** TypeScript interfaces in `api.ts` match backend Pydantic models exactly. Field names verified: `atr_exclude_open`, `atr_pct_exclude_open`, `true_range_pct` etc.
- [x] **Frontend-backend alignment:** API paths match backend routers. Query params match. Response types match.
