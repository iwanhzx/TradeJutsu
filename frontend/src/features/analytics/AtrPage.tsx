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

  const columnDefs = useMemo<ColDef<AtrSummaryResponse>[]>(() => [
    { field: "symbol", width: 120, sortable: true, filter: true },
    { field: "interval", width: 100, sortable: true, filter: true },
    { field: "period_days", headerName: "Period", width: 90, sortable: true },
    { field: "atr_wilder", headerName: "ATR (Wilder)", width: 120, valueFormatter: (p) => p.value?.toFixed(2) ?? "-" },
    { field: "atr_pct_wilder", headerName: "ATR% (Wilder)", width: 130, valueFormatter: (p) => p.value?.toFixed(2) ?? "-" },
    { field: "atr_with_open", headerName: "ATR (w/ Open)", width: 120, valueFormatter: (p) => p.value?.toFixed(2) ?? "-" },
    { field: "atr_exclude_open", headerName: "ATR (excl Open)", width: 130, valueFormatter: (p) => p.value?.toFixed(2) ?? "-" },
    { field: "atr_pct_exclude_open", headerName: "ATR% (excl Open)", width: 140, valueFormatter: (p) => p.value?.toFixed(2) ?? "-" },
  ], []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">ATR Analysis</h2>
        <div className="flex gap-2">
          <button onClick={() => calcMutation.mutate("1hour")} disabled={calcMutation.isPending}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">Calculate 1H ATR</button>
          <button onClick={() => calcMutation.mutate("daily")} disabled={calcMutation.isPending}
            className="px-3 py-1.5 bg-slate-600 text-white rounded text-sm hover:bg-slate-500 disabled:opacity-50">Calculate Daily ATR</button>
        </div>
      </div>
      {isLoading && <LoadingSpinner />}
      {data && (
        <div className="ag-theme-alpine-dark" style={{ height: 600 }}>
          <AgGridReact<AtrSummaryResponse> rowData={data} columnDefs={columnDefs} defaultColDef={{ resizable: true }} animateRows />
        </div>
      )}
    </div>
  );
}
