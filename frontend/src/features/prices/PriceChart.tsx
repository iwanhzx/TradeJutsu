import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type CandlestickData, type Time } from "lightweight-charts";
import type { PriceDailyResponse } from "../../shared/types/api";

interface Props { data: PriceDailyResponse[]; }

export function PriceChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth, height: 400,
      layout: { background: { color: "#1e293b" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "#334155" }, horzLines: { color: "#334155" } },
      crosshair: { mode: 0 },
    });
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    const candles: CandlestickData<Time>[] = data
      .filter((d) => d.open != null && d.high != null && d.low != null && d.close != null)
      .map((d) => ({ time: d.date as Time, open: d.open!, high: d.high!, low: d.low!, close: d.close! }));
    candleSeries.setData(candles);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [data]);

  return <div ref={containerRef} className="rounded-lg overflow-hidden" />;
}
