import { useState, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { useTurnover } from "./hooks";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";
import type { TurnoverItem } from "../../shared/types/api";

ModuleRegistry.registerModules([AllCommunityModule]);

const PERIOD_OPTIONS = [
  { label: "1W", days: 5 }, { label: "2W", days: 10 },
  { label: "1M", days: 22 }, { label: "3M", days: 66 }, { label: "6M", days: 132 },
];

export function TurnoverPage() {
  const [days, setDays] = useState(5);
  const { data, isLoading } = useTurnover(days);

  const columnDefs = useMemo<ColDef<TurnoverItem>[]>(() => [
    { field: "symbol", width: 120, sortable: true, filter: true },
    { field: "avg_turnover", headerName: "Avg Daily Turnover (IDR)", flex: 1, sortable: true,
      valueFormatter: (p) => p.value != null ? `Rp ${(Number(p.value) / 1_000_000_000).toFixed(1)}B` : "-" },
  ], []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Daily Turnover</h2>
      <div className="flex gap-2 mb-4">
        {PERIOD_OPTIONS.map((opt) => (
          <button key={opt.days} onClick={() => setDays(opt.days)}
            className={`px-3 py-1.5 rounded text-sm ${days === opt.days ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
            {opt.label}
          </button>
        ))}
      </div>
      {isLoading && <LoadingSpinner />}
      {data && (
        <div className="ag-theme-alpine-dark" style={{ height: 600 }}>
          <AgGridReact<TurnoverItem> rowData={data} columnDefs={columnDefs} defaultColDef={{ resizable: true }} animateRows />
        </div>
      )}
    </div>
  );
}
