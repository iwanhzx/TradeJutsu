import { useMemo, useState, useEffect } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "../../shared/components/DataTable";
import { useWtdReport, useCheckWtd, useWtdSettings, useSaveWtdSettings } from "./hooks";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";
import type { WtdReportItem, WtdSettings } from "../../shared/types/api";

const col = createColumnHelper<WtdReportItem>();

const passFail = (value: boolean) => (
  <span className={value ? "text-green-400" : "text-red-400"}>{value ? "Pass" : "Fail"}</span>
);

function SettingsPanel({ settings, onSave, isSaving }: {
  settings: WtdSettings;
  onSave: (s: WtdSettings) => void;
  isSaving: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<WtdSettings>(settings);

  useEffect(() => { setForm(settings); }, [settings]);

  const dirty = JSON.stringify(form) !== JSON.stringify(settings);

  const set = (key: keyof WtdSettings, raw: string) => {
    const v = Number(raw.replace(/,/g, ""));
    if (!isNaN(v)) setForm((f) => ({ ...f, [key]: v }));
  };

  const fmtNum = (v: number) => v.toLocaleString("en-US");

  const fields: { label: string; key: keyof WtdSettings; hint?: string; fmt?: boolean }[] = [
    { label: "Min Turnover (IDR)", key: "turnover_min", hint: "Minimum Average Daily Turnover", fmt: true },
    { label: "1W X Daily", key: "min_1w_o_daily", hint: "Average Daily ATR for 1 Week" },
    { label: "1W X% 1H (%)", key: "min_1w_opct_1h", hint: "Average Hourly Interval ATR% Without First Bar for 1 Week" },
    { label: "1W X% Daily (%)", key: "min_1w_opct_daily", hint: "Average Daily Interval ATR% for 1 Week" },
    { label: "2W X% 1H (%)", key: "min_2w_opct_1h", hint: "Average Hourly Interval ATR% Without First Bar for 2 Weeks" },
    { label: "2W X% Daily (%)", key: "min_2w_opct_daily", hint: "Average Daily Interval ATR% for 2 Weeks" },
    { label: "Conditions to Pass", key: "conditions_to_pass", hint: "Total 5 conditions" },
  ];

  return (
    <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/50">
      <button onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white">
        <span>Settings</span>
        <span className="text-xs text-slate-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-700 px-4 py-3">
          <div className="flex flex-col gap-2">
            {fields.map(({ label, key, hint, fmt }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-40 shrink-0">{label}:</span>
                <input
                  type={fmt ? "text" : "number"}
                  value={fmt ? fmtNum(form[key]) : form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-[15%] rounded bg-slate-900 border border-slate-600 px-2 py-1 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                />
                {hint && <span className="text-xs text-slate-500 italic">{hint}</span>}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => onSave(form)}
              disabled={!dirty || isSaving}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-40">
              {isSaving ? "Saving..." : "Save"}
            </button>
            {dirty && (
              <button onClick={() => setForm(settings)}
                className="px-3 py-1 text-slate-400 hover:text-white text-sm">
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function WtdPage() {
  const { data, isLoading } = useWtdReport();
  const checkMutation = useCheckWtd();
  const { data: settings } = useWtdSettings();
  const saveMutation = useSaveWtdSettings();

  const columns = useMemo(() => [
    col.accessor("symbol", { header: "Symbol", size: 120 }),
    col.accessor("is_worth_trade_daily", {
      header: "WTD", size: 80,
      cell: (c) => (
        <span className={`font-semibold ${c.getValue() ? "text-green-400" : "text-red-400"}`}>
          {c.getValue() ? "PASS" : "FAIL"}
        </span>
      ),
    }),
    col.accessor("turnover_1w", {
      header: "Turnover 1W", size: 130, meta: { align: "right" },
      cell: (c) => c.getValue() != null ? `${(Number(c.getValue()) / 1e9).toFixed(1)}B` : "-",
    }),
    col.accessor("turnover_2w", {
      header: "Turnover 2W", size: 130, meta: { align: "right" },
      cell: (c) => c.getValue() != null ? `${(Number(c.getValue()) / 1e9).toFixed(1)}B` : "-",
    }),
    col.accessor("c_1w_o_daily", { header: "1W X D", size: 90, cell: (c) => passFail(c.getValue()) }),
    col.accessor("c_1w_opct_1h", { header: "1W X% 1H", size: 100, cell: (c) => passFail(c.getValue()) }),
    col.accessor("c_1w_opct_daily", { header: "1W X% D", size: 100, cell: (c) => passFail(c.getValue()) }),
    col.accessor("c_2w_opct_1h", { header: "2W X% 1H", size: 100, cell: (c) => passFail(c.getValue()) }),
    col.accessor("c_2w_opct_daily", { header: "2W X% D", size: 100, cell: (c) => passFail(c.getValue()) }),
    col.accessor("atr_conditions_met", {
      header: "Conditions", size: 100,
      cell: (c) => `${c.getValue()}/5`,
    }),
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
      {settings && (
        <SettingsPanel
          settings={settings}
          onSave={(s) => saveMutation.mutate(s)}
          isSaving={saveMutation.isPending}
        />
      )}
      {isLoading && <LoadingSpinner />}
      {data && <DataTable data={data} columns={columns} />}
    </div>
  );
}
