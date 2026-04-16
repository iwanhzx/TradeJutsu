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

  const columnDefs = useMemo<ColDef<WtdReportItem>[]>(() => [
    { field: "symbol", width: 120, sortable: true, filter: true },
    { field: "is_worth_trade_daily", headerName: "WTD", width: 80,
      cellStyle: (p) => ({ color: p.value ? "#22c55e" : "#ef4444", fontWeight: 600 }),
      valueFormatter: (p) => (p.value ? "PASS" : "FAIL") },
    { field: "turnover_1w", headerName: "Turnover 1W", width: 130,
      valueFormatter: (p) => p.value != null ? `${(Number(p.value) / 1e9).toFixed(1)}B` : "-" },
    { field: "turnover_2w", headerName: "Turnover 2W", width: 130,
      valueFormatter: (p) => p.value != null ? `${(Number(p.value) / 1e9).toFixed(1)}B` : "-" },
    { field: "atr_1h_1w_pass", headerName: "1H ATR 1W", width: 100,
      cellStyle: (p) => ({ color: p.value ? "#22c55e" : "#ef4444" }), valueFormatter: (p) => (p.value ? "Pass" : "Fail") },
    { field: "atr_1h_2w_pass", headerName: "1H ATR 2W", width: 100,
      cellStyle: (p) => ({ color: p.value ? "#22c55e" : "#ef4444" }), valueFormatter: (p) => (p.value ? "Pass" : "Fail") },
    { field: "atr_daily_1w_pass", headerName: "D ATR 1W", width: 100,
      cellStyle: (p) => ({ color: p.value ? "#22c55e" : "#ef4444" }), valueFormatter: (p) => (p.value ? "Pass" : "Fail") },
    { field: "atr_daily_2w_pass", headerName: "D ATR 2W", width: 100,
      cellStyle: (p) => ({ color: p.value ? "#22c55e" : "#ef4444" }), valueFormatter: (p) => (p.value ? "Pass" : "Fail") },
    { field: "atr_conditions_met", headerName: "Conditions", width: 100,
      valueFormatter: (p) => `${p.value}/4` },
  ], []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Worth Trade Screening</h2>
        <button onClick={() => checkMutation.mutate()} disabled={checkMutation.isPending}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
          {checkMutation.isPending ? "Checking..." : "Run WTD Check"}
        </button>
      </div>
      {isLoading && <LoadingSpinner />}
      {data && (
        <div className="ag-theme-alpine-dark" style={{ height: 600 }}>
          <AgGridReact<WtdReportItem> rowData={data} columnDefs={columnDefs} defaultColDef={{ resizable: true }} animateRows />
        </div>
      )}
    </div>
  );
}
