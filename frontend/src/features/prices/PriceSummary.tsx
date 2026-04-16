import type { PriceDailyResponse, PriceIntradayResponse } from "../../shared/types/api";

interface Props {
  data: PriceDailyResponse[] | PriceIntradayResponse[];
  isDaily: boolean;
}

export function PriceSummary({ data, isDaily }: Props) {
  if (data.length === 0) return null;

  const latest = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : null;

  const latestClose = latest.close;
  const changePct =
    latestClose != null && prev?.close != null && prev.close !== 0
      ? ((latestClose - prev.close) / prev.close) * 100
      : null;

  const stats = [
    { label: "Latest Close", value: latestClose != null ? latestClose.toLocaleString() : "-" },
    {
      label: "Change",
      value: changePct != null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%` : "-",
      color: changePct != null ? (changePct >= 0 ? "text-green-400" : "text-red-400") : undefined,
    },
    {
      label: "Volume",
      value: latest.volume != null ? formatCompact(latest.volume) : "-",
    },
    {
      label: "True Range %",
      value: latest.true_range_pct != null ? `${latest.true_range_pct.toFixed(2)}%` : "-",
    },
    {
      label: "Turnover",
      value: latest.turnover != null ? formatCompact(latest.turnover) : "-",
    },
  ];

  return (
    <div
      className={`flex flex-wrap gap-6 bg-slate-800 rounded-lg px-5 py-3 border-l-[3px] ${
        isDaily ? "border-l-blue-500" : "border-l-amber-500"
      }`}
    >
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-slate-500 text-[10px] uppercase tracking-wider">{s.label}</div>
          <div className={`text-lg font-bold mt-0.5 ${s.color ?? "text-slate-100"}`}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
