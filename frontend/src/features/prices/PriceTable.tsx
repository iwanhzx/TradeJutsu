import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "../../shared/components/DataTable";
import type { PriceDailyResponse, PriceIntradayResponse } from "../../shared/types/api";

type PriceRow = PriceDailyResponse | PriceIntradayResponse;

interface Props {
  data: PriceRow[];
  isDaily: boolean;
}

const fmtNum = (v: number | null) => (v != null ? v.toLocaleString() : "-");
const fmtPct = (v: number | null) => (v != null ? `${v.toFixed(2)}%` : "-");
const fmtCompact = (v: number | null) => {
  if (v == null) return "-";
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}T`;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
};

const fmtDatetime = (v: string) => {
  const d = new Date(v);
  const date = v.slice(0, 10);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${date} ${String(h12).padStart(2, "0")}:${m}${ampm}`;
};

const col = createColumnHelper<PriceRow>();

export function PriceTable({ data, isDaily }: Props) {
  const rowData = useMemo(() => {
    const sorted = [...data];
    if (isDaily) {
      sorted.sort((a, b) => (b as PriceDailyResponse).date.localeCompare((a as PriceDailyResponse).date));
    } else {
      sorted.sort((a, b) => {
        const dtA = (a as PriceIntradayResponse).datetime;
        const dtB = (b as PriceIntradayResponse).datetime;
        const dateA = dtA.slice(0, 10);
        const dateB = dtB.slice(0, 10);
        if (dateA !== dateB) return dateB.localeCompare(dateA); // date desc
        return dtA.localeCompare(dtB); // time asc within same date
      });
    }
    return sorted;
  }, [data, isDaily]);

  const columns = useMemo(() => [
    isDaily
      ? col.accessor((r) => (r as PriceDailyResponse).date, { id: "date", header: "Date", size: 120 })
      : col.accessor((r) => (r as PriceIntradayResponse).datetime, {
          id: "datetime", header: "Datetime", size: 210,
          cell: (c) => fmtDatetime(c.getValue()),
        }),
    col.accessor("open", { header: "Open", size: 100, meta: { align: "right" }, cell: (c) => fmtNum(c.getValue()) }),
    col.accessor("high", { header: "High", size: 100, meta: { align: "right" }, cell: (c) => fmtNum(c.getValue()) }),
    col.accessor("low", { header: "Low", size: 100, meta: { align: "right" }, cell: (c) => fmtNum(c.getValue()) }),
    col.accessor("close", {
      header: "Close", size: 100, meta: { align: "right" },
      cell: (c) => {
        const close = c.getValue();
        const open = c.row.original.open;
        let color = "";
        if (close != null && open != null) {
          if (close > open) color = "text-green-400";
          else if (close < open) color = "text-red-400";
        }
        return <span className={color}>{fmtNum(close)}</span>;
      },
    }),
    col.accessor("volume", { header: "Volume", size: 110, meta: { align: "right" }, cell: (c) => fmtCompact(c.getValue()) }),
    col.accessor("true_range", { header: "TR", size: 90, meta: { align: "right" }, cell: (c) => fmtNum(c.getValue()) }),
    col.accessor("true_range_pct", { header: "TR%", size: 90, meta: { align: "right" }, cell: (c) => fmtPct(c.getValue()) }),
    col.accessor("turnover", { header: "Turnover", size: 110, meta: { align: "right" }, cell: (c) => fmtCompact(c.getValue()) }),
  ], [isDaily]);

  return <DataTable data={rowData} columns={columns} height={400} pinnedColumns={[isDaily ? "date" : "datetime"]} />;
}
