import { useMemo, useState, useCallback, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAtrSummary, useCalculateAtr } from "./hooks";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";
import type { AtrSummaryResponse } from "../../shared/types/api";
import "./atr-table.css";

type TabMode = "pct" | "raw";
type MetricCode = "w" | "o" | "x";

const PERIODS = ["1day", "1week", "2week", "1month", "3month"] as const;
const PERIOD_LABELS: Record<string, string> = { "1day": "1D", "1week": "1W", "2week": "2W", "1month": "1M", "3month": "3M" };
const METRICS: { code: MetricCode; pctLabel: string; rawLabel: string; pctField: keyof AtrSummaryResponse; rawField: keyof AtrSummaryResponse }[] = [
  { code: "w", pctLabel: "W%", rawLabel: "W", pctField: "atr_pct_wilder", rawField: "atr_wilder" },
  { code: "o", pctLabel: "O%", rawLabel: "O", pctField: "atr_pct_with_open", rawField: "atr_with_open" },
  { code: "x", pctLabel: "X%", rawLabel: "X", pctField: "atr_pct_exclude_open", rawField: "atr_exclude_open" },
];
const INTERVALS = ["1hour", "daily"] as const;
const INTERVAL_LABELS: Record<string, string> = { "1hour": "1H", daily: "1D" };

// Build a lookup key for the pivot map
function cellKey(period: string, interval: string, metricCode: MetricCode): string {
  return `${period}_${interval}_${metricCode}`;
}

interface PivotRow {
  symbol: string;
  cells: Map<string, number | null>;
}

function buildPivotRows(data: AtrSummaryResponse[], tab: TabMode): PivotRow[] {
  const bySymbol = new Map<string, Map<string, number | null>>();

  for (const row of data) {
    if (!bySymbol.has(row.symbol)) bySymbol.set(row.symbol, new Map());
    const cells = bySymbol.get(row.symbol)!;
    for (const m of METRICS) {
      const field = tab === "pct" ? m.pctField : m.rawField;
      const key = cellKey(row.period_days, row.interval, m.code);
      cells.set(key, row[field] as number | null);
    }
  }

  return Array.from(bySymbol.entries())
    .map(([symbol, cells]) => ({ symbol, cells }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function formatVal(val: number | null): string {
  if (val == null) return "-";
  return val.toFixed(2);
}

export function AtrPage() {
  const { data, isLoading, error } = useAtrSummary();
  const calcMutation = useCalculateAtr();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabMode>("pct");

  const pivotRows = useMemo(() => (data ? buildPivotRows(data, tab) : []), [data, tab]);

  // Hover highlight: track which metric code + row is hovered
  const handleMouseOver = useCallback((e: MouseEvent<HTMLTableSectionElement>) => {
    const td = (e.target as HTMLElement).closest<HTMLElement>("td[data-m]");
    if (!td) return;
    const row = td.closest("tr");
    if (!row) return;
    const m = td.dataset.m;
    row.querySelector<HTMLElement>("td.atr-symbol")?.classList.add("atr-highlight");
    row.querySelectorAll<HTMLElement>(`td[data-m="${m}"]`).forEach((c) => c.classList.add("atr-highlight"));
  }, []);

  const handleMouseOut = useCallback((e: MouseEvent<HTMLTableSectionElement>) => {
    const td = (e.target as HTMLElement).closest<HTMLElement>("td[data-m]");
    if (!td) return;
    const tbody = td.closest("tbody");
    tbody?.querySelectorAll<HTMLElement>(".atr-highlight").forEach((c) => c.classList.remove("atr-highlight"));
  }, []);

  return (
    <div>
      {/* Header with buttons */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">ATR Analysis</h2>
        <button
          onClick={() => calcMutation.mutate()}
          disabled={calcMutation.isPending}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Calculate ATR
        </button>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <p className="text-red-400 mt-4">Failed to load ATR data: {(error as Error).message}</p>}
      {data && data.length === 0 && (
        <p className="text-slate-400 mt-4">No ATR data yet. Click a Calculate button above to generate.</p>
      )}

      {data && data.length > 0 && (
        <>
          {/* Tabs */}
          <div className="flex mb-0">
            <button
              onClick={() => setTab("pct")}
              className={`px-5 py-2 text-sm rounded-t-md border ${
                tab === "pct"
                  ? "bg-slate-800 text-blue-400 border-slate-600 border-b-2 border-b-blue-500 font-semibold"
                  : "bg-slate-900 text-slate-500 border-slate-800 border-b border-b-slate-600"
              }`}
            >
              ATR%
            </button>
            <button
              onClick={() => setTab("raw")}
              className={`px-5 py-2 text-sm rounded-t-md border ${
                tab === "raw"
                  ? "bg-slate-800 text-blue-400 border-slate-600 border-b-2 border-b-blue-500 font-semibold"
                  : "bg-slate-900 text-slate-500 border-slate-800 border-b border-b-slate-600"
              }`}
            >
              ATR
            </button>
            <div className="flex-1 border-b border-slate-600" />
          </div>

          {/* Table */}
          <div className="atr-table-wrap">
            <table className="atr-table">
              <thead>
                {/* Row 1: Periods */}
                <tr>
                  <th className="atr-symbol-hdr" rowSpan={3}>Symbol</th>
                  {PERIODS.map((p, i) => (
                    <th
                      key={p}
                      className={`atr-period ${i < PERIODS.length - 1 ? "atr-psep" : "atr-last"}`}
                      colSpan={6}
                    >
                      {PERIOD_LABELS[p]}
                    </th>
                  ))}
                </tr>
                {/* Row 2: Metrics */}
                <tr>
                  {PERIODS.map((p, pi) =>
                    METRICS.map((m, mi) => (
                      <th
                        key={`${p}-${m.code}`}
                        className={`atr-metric atr-metric-${m.code} ${
                          mi < METRICS.length - 1 ? "atr-msep" : pi < PERIODS.length - 1 ? "atr-psep" : "atr-last"
                        }`}
                        colSpan={2}
                      >
                        {tab === "pct" ? m.pctLabel : m.rawLabel}
                      </th>
                    ))
                  )}
                </tr>
                {/* Row 3: Intervals */}
                <tr>
                  {PERIODS.map((p, pi) =>
                    METRICS.map((m, mi) =>
                      INTERVALS.map((intv, ii) => (
                        <th
                          key={`${p}-${m.code}-${intv}`}
                          className={`atr-interval ${
                            ii === INTERVALS.length - 1
                              ? mi < METRICS.length - 1
                                ? "atr-msep"
                                : pi < PERIODS.length - 1
                                  ? "atr-psep"
                                  : "atr-last"
                              : ""
                          }`}
                        >
                          {INTERVAL_LABELS[intv]}
                        </th>
                      ))
                    )
                  )}
                </tr>
              </thead>
              <tbody onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>
                {pivotRows.map((row) => (
                  <tr key={row.symbol}>
                    <td
                      className="atr-symbol atr-symbol-link"
                      onClick={() => navigate(`/prices/${row.symbol}`)}
                    >
                      {row.symbol.replace(/\.JK$/i, "")}
                    </td>
                    {PERIODS.map((p, pi) =>
                      METRICS.map((m, mi) =>
                        INTERVALS.map((intv, ii) => {
                          const key = cellKey(p, intv, m.code);
                          const val = row.cells.get(key) ?? null;
                          const isNa = val == null;
                          const borderClass =
                            ii === INTERVALS.length - 1
                              ? mi < METRICS.length - 1
                                ? "atr-msep"
                                : pi < PERIODS.length - 1
                                  ? "atr-psep"
                                  : "atr-last"
                              : "";
                          return (
                            <td
                              key={`${p}-${m.code}-${intv}`}
                              data-m={m.code}
                              className={`${borderClass} ${isNa ? "atr-na" : ""}`}
                            >
                              {formatVal(val)}
                            </td>
                          );
                        })
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-3 text-xs text-slate-500">
            <span className="font-semibold">W</span> = Wilder &nbsp;|&nbsp;{" "}
            <span className="font-semibold">O</span> = w/ Open &nbsp;|&nbsp;{" "}
            <span className="font-semibold">X</span> = excl Open
            &nbsp;&nbsp;&mdash;&nbsp;&nbsp;Periods are based on calendar days, not trading days (1M = 1 calendar month)
          </div>
        </>
      )}
    </div>
  );
}
