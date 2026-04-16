import { useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

const ROW_HEIGHT = 33;
const DEFAULT_COL_WIDTH = 150;

interface Props<T> {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  height?: number;
  pinnedColumns?: string[];
}

export function DataTable<T>({ data, columns, height = 600, pinnedColumns = [] }: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();
  const headerGroups = table.getHeaderGroups();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  return (
    <div ref={containerRef} className="rounded-lg border border-slate-700 overflow-auto" style={{ height }}>
      {/* Header */}
      <div className="sticky top-0 z-10">
        {headerGroups.map((hg) => (
          <div key={hg.id} className="flex bg-slate-800 border-b border-slate-700">
            {hg.headers.map((header) => {
              const w = header.column.columnDef.size || DEFAULT_COL_WIDTH;
              const isPinned = pinnedColumns.includes(header.column.id);
              return (
                <div
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={`shrink-0 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap select-none ${
                    (header.column.columnDef.meta as Record<string, unknown>)?.align === "right" ? "text-right" : "text-left"
                  } ${header.column.getCanSort() ? "cursor-pointer hover:text-slate-200" : ""
                  } ${isPinned ? "sticky left-0 z-20 bg-slate-800" : ""}`}
                  style={{ width: w, minWidth: w }}
                >
                  <div className={`flex items-center gap-1 ${
                    (header.column.columnDef.meta as Record<string, unknown>)?.align === "right" ? "justify-end" : ""
                  }`}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ?? ""}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {rows.length === 0 && (
          <div className="px-3 py-8 text-center text-slate-500 text-sm">No data</div>
        )}
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={row.id}
              className="flex border-b border-slate-700/50 hover:bg-slate-800/50 text-sm text-slate-200"
              style={{
                height: ROW_HEIGHT,
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.getVisibleCells().map((cell) => {
                const w = cell.column.columnDef.size || DEFAULT_COL_WIDTH;
                const isPinned = pinnedColumns.includes(cell.column.id);
                return (
                  <div
                    key={cell.id}
                    className={`shrink-0 px-3 py-1.5 whitespace-nowrap ${
                      (cell.column.columnDef.meta as Record<string, unknown>)?.align === "right" ? "text-right" : "text-left"
                    } ${isPinned ? "sticky left-0 z-10 bg-slate-900" : ""}`}
                    style={{ width: w, minWidth: w }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
