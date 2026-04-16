import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { SymbolResponse } from "../../shared/types/api";
import { useToggleSymbol, useDeleteSymbol } from "./hooks";
import { useFetchAllIntervals, useFetchAllPrices } from "../prices/hooks";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props { symbols: SymbolResponse[]; }

export function SymbolTable({ symbols }: Props) {
  const toggleMutation = useToggleSymbol();
  const deleteMutation = useDeleteSymbol();
  const fetchMutation = useFetchAllIntervals();
  const fetchAllMutation = useFetchAllPrices();

  const columnDefs = useMemo<ColDef<SymbolResponse>[]>(() => [
    { field: "symbol", width: 120, sortable: true, filter: true },
    { field: "name", flex: 1, sortable: true, filter: true },
    { field: "sector", width: 130, sortable: true, filter: true },
    { field: "latest_price", headerName: "Price", width: 110,
      valueFormatter: (p) => (p.value != null ? Number(p.value).toLocaleString() : "-") },
    { field: "is_active", headerName: "Active", width: 90,
      cellRenderer: (p: { data: SymbolResponse }) => (
        <button onClick={() => toggleMutation.mutate({ symbol: p.data.symbol, active: !p.data.is_active })}
          className={`px-2 py-0.5 rounded text-xs ${p.data.is_active ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"}`}>
          {p.data.is_active ? "Active" : "Disabled"}
        </button>
      )},
    { field: "is_worth_trade_daily", headerName: "WTD", width: 80,
      cellRenderer: (p: { data: SymbolResponse }) => (
        <span className={p.data.is_worth_trade_daily ? "text-green-400" : "text-slate-500"}>
          {p.data.is_worth_trade_daily ? "Yes" : "No"}
        </span>
      )},
    { headerName: "Actions", width: 180,
      cellRenderer: (p: { data: SymbolResponse }) => (
        <div className="flex gap-2 items-center h-full">
          <button onClick={() => fetchMutation.mutate(p.data.symbol)}
            className="text-xs text-blue-400 hover:text-blue-300">Fetch</button>
          <button onClick={() => { if (confirm(`Delete ${p.data.symbol}?`)) deleteMutation.mutate(p.data.symbol); }}
            className="text-xs text-red-400 hover:text-red-300">Delete</button>
        </div>
      )},
  ], [toggleMutation, deleteMutation, fetchMutation]);

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button onClick={() => fetchAllMutation.mutate("daily")} disabled={fetchAllMutation.isPending}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
          {fetchAllMutation.isPending ? "Fetching..." : "Fetch All Daily"}
        </button>
        <button onClick={() => fetchAllMutation.mutate("1hour")} disabled={fetchAllMutation.isPending}
          className="px-3 py-1.5 bg-slate-600 text-white rounded text-sm hover:bg-slate-500 disabled:opacity-50">
          Fetch All 1H
        </button>
        <button onClick={() => fetchAllMutation.mutate("30min")} disabled={fetchAllMutation.isPending}
          className="px-3 py-1.5 bg-slate-600 text-white rounded text-sm hover:bg-slate-500 disabled:opacity-50">
          Fetch All 30M
        </button>
      </div>
      <div className="ag-theme-alpine-dark" style={{ height: 600 }}>
        <AgGridReact<SymbolResponse> rowData={symbols} columnDefs={columnDefs}
          defaultColDef={{ resizable: true }} animateRows getRowId={(p) => p.data.symbol} />
      </div>
    </div>
  );
}
