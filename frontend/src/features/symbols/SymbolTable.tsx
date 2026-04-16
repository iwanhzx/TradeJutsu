import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "../../shared/components/DataTable";
import type { SymbolResponse } from "../../shared/types/api";
import { useToggleSymbol, useDeleteSymbol } from "./hooks";
import { useFetchAllIntervals, useFetchAllPrices } from "../prices/hooks";

interface Props { symbols: SymbolResponse[]; }

const col = createColumnHelper<SymbolResponse>();

export function SymbolTable({ symbols }: Props) {
  const toggleMutation = useToggleSymbol();
  const deleteMutation = useDeleteSymbol();
  const fetchMutation = useFetchAllIntervals();
  const fetchAllMutation = useFetchAllPrices();

  const columns = useMemo(() => [
    col.accessor("symbol", { header: "Symbol", size: 120 }),
    col.accessor("name", { header: "Name", size: 200 }),
    col.accessor("sector", { header: "Sector", size: 130 }),
    col.accessor("latest_price", {
      header: "Price", size: 110, meta: { align: "right" },
      cell: (c) => c.getValue() != null ? Number(c.getValue()).toLocaleString() : "-",
    }),
    col.accessor("is_active", {
      header: "Active", size: 90,
      cell: (c) => (
        <button
          onClick={() => toggleMutation.mutate({ symbol: c.row.original.symbol, active: !c.getValue() })}
          className={`px-2 py-0.5 rounded text-xs ${c.getValue() ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"}`}
        >
          {c.getValue() ? "Active" : "Disabled"}
        </button>
      ),
    }),
    col.accessor("is_worth_trade_daily", {
      header: "WTD", size: 80,
      cell: (c) => (
        <span className={c.getValue() ? "text-green-400" : "text-slate-500"}>
          {c.getValue() ? "Yes" : "No"}
        </span>
      ),
    }),
    col.display({
      id: "actions",
      header: "Actions",
      size: 180,
      cell: (c) => (
        <div className="flex gap-2 items-center">
          <button onClick={() => fetchMutation.mutate(c.row.original.symbol)}
            className="text-xs text-blue-400 hover:text-blue-300">Fetch</button>
          <button onClick={() => { if (confirm(`Delete ${c.row.original.symbol}?`)) deleteMutation.mutate(c.row.original.symbol); }}
            className="text-xs text-red-400 hover:text-red-300">Delete</button>
        </div>
      ),
    }),
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
        <button onClick={() => fetchAllMutation.mutate("15min")} disabled={fetchAllMutation.isPending}
          className="px-3 py-1.5 bg-slate-600 text-white rounded text-sm hover:bg-slate-500 disabled:opacity-50">
          Fetch All 15M
        </button>
      </div>
      <DataTable data={symbols} columns={columns} />
    </div>
  );
}
