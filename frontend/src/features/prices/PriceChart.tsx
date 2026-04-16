import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, LineSeries, type IChartApi, type CandlestickData, type LineData, type Time } from "lightweight-charts";
import type { PriceDailyResponse, PriceIntradayResponse } from "../../shared/types/api";

interface Props {
  data: PriceDailyResponse[] | PriceIntradayResponse[];
  isDaily?: boolean;
}

const DAILY_RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: 0 },
];

const INTRADAY_RANGES = [
  { label: "1D", days: 1 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

export function PriceChart({ data, isDaily = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [activeRange, setActiveRange] = useState("All");

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth, height: 400,
      layout: { background: { color: "#1e293b" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "#334155" }, horzLines: { color: "#334155" } },
      crosshair: { mode: 0 },
    });

    const validData = data.filter((d) => d.close != null);

    if (isDaily) {
      const lineSeries = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
      });
      const lineData: LineData<Time>[] = validData.map((d) => ({
        time: (d as PriceDailyResponse).date as Time,
        value: d.close!,
      }));
      lineSeries.setData(lineData);
    } else {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e", downColor: "#ef4444",
        borderUpColor: "#22c55e", borderDownColor: "#ef4444",
        wickUpColor: "#22c55e", wickDownColor: "#ef4444",
      });
      const candles: CandlestickData<Time>[] = validData
        .filter((d) => d.open != null && d.high != null && d.low != null)
        .map((d) => ({
          time: Math.floor(new Date((d as PriceIntradayResponse).datetime).getTime() / 1000) as Time,
          open: d.open!, high: d.high!, low: d.low!, close: d.close!,
        }));
      candleSeries.setData(candles);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;
    setActiveRange("All");

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [data, isDaily]);

  const handleRange = (label: string, days: number) => {
    setActiveRange(label);
    const chart = chartRef.current;
    if (!chart) return;

    if (days === 0) {
      chart.timeScale().fitContent();
      return;
    }

    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    if (isDaily) {
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = now.toISOString().slice(0, 10);
      chart.timeScale().setVisibleRange({ from: fromStr as Time, to: toStr as Time });
    } else {
      const fromTs = Math.floor(from.getTime() / 1000);
      const toTs = Math.floor(now.getTime() / 1000);
      chart.timeScale().setVisibleRange({ from: fromTs as Time, to: toTs as Time });
    }
  };

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {(isDaily ? DAILY_RANGES : INTRADAY_RANGES).map((r) => (
          <button
            key={r.label}
            onClick={() => handleRange(r.label, r.days)}
            className={`px-3 py-1 text-xs rounded ${
              activeRange === r.label
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="rounded-lg overflow-hidden" />
    </div>
  );
}
