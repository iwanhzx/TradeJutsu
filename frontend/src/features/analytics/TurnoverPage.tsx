import { useMemo } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../shared/components/DataTable";
import { useTurnoverTable } from "./hooks";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";

type TurnoverRow = Record<string, unknown>;

const fmtTurnover = (v: unknown) =>
  v != null ? `Rp ${(Number(v) / 1_000_000_000).toFixed(1)}B` : "-";

const col = createColumnHelper<TurnoverRow>();

export function TurnoverPage() {
  const { data, isLoading } = useTurnoverTable();

  const rowData = useMemo(() => {
    if (!data) return [];
    return data.rows.map((row) => ({
      symbol: row.symbol,
      ...row.daily_values,
      avg_1w: row.avg_1w,
      avg_2w: row.avg_2w,
      avg_1m: row.avg_1m,
      avg_3m: row.avg_3m,
      avg_6m: row.avg_6m,
    }));
  }, [data]);

  const columns = useMemo<ColumnDef<TurnoverRow, unknown>[]>(() => {
    if (!data) return [];

    const symbolCol = col.accessor("symbol", {
      header: "Symbol",
      size: 100,
      cell: (c) => {
        const val = c.getValue() as string;
        return (
          <span
            className="cursor-pointer text-blue-400 hover:text-blue-300"
            onClick={() => window.open(`/prices/${encodeURIComponent(val)}`, "_blank")}
          >
            {val ? String(val).replace(".JK", "") : ""}
          </span>
        );
      },
    });

    const dateColumns = [...data.trade_dates].reverse().map((dateStr) =>
      col.accessor(dateStr, {
        header: dateStr,
        size: 110,
        meta: { align: "right" },
        cell: (c) => fmtTurnover(c.getValue()),
      })
    );

    const avgFields = [
      { field: "avg_1w", header: "1W Avg" },
      { field: "avg_2w", header: "2W Avg" },
      { field: "avg_1m", header: "1M Avg" },
      { field: "avg_3m", header: "3M Avg" },
      { field: "avg_6m", header: "6M Avg" },
    ];
    const avgColumns = avgFields.map(({ field, header }) =>
      col.accessor(field, {
        header,
        size: 110,
        meta: { align: "right" },
        cell: (c) => fmtTurnover(c.getValue()),
      })
    );

    return [symbolCol, ...dateColumns, ...avgColumns];
  }, [data]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Daily Turnover</h2>
      {isLoading && <LoadingSpinner />}
      {data && <DataTable data={rowData} columns={columns} pinnedColumns={["symbol"]} />}
    </div>
  );
}
