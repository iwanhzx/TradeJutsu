import { useState } from "react";
import { useSymbols } from "../symbols/hooks";
import { useDailyPrices } from "./hooks";
import { PriceChart } from "./PriceChart";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";

export function PricesPage() {
  const { data: symbols } = useSymbols();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const { data: prices, isLoading } = useDailyPrices(selectedSymbol);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Price Explorer</h2>
      <div className="flex gap-4 mb-4">
        <select value={selectedSymbol || ""} onChange={(e) => setSelectedSymbol(e.target.value || null)}
          className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white">
          <option value="">Select symbol...</option>
          {symbols?.map((s) => (
            <option key={s.symbol} value={s.symbol}>{s.symbol} {s.name ? `- ${s.name}` : ""}</option>
          ))}
        </select>
      </div>
      {isLoading && <LoadingSpinner />}
      {prices && prices.length > 0 && <PriceChart data={prices} />}
      {prices && prices.length === 0 && selectedSymbol && (
        <p className="text-slate-400">No price data for {selectedSymbol}. Fetch daily prices first.</p>
      )}
    </div>
  );
}
