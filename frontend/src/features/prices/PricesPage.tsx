import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSymbols } from "../symbols/hooks";
import { useDailyPrices, useFetchPrices } from "./hooks";
import { PriceChart } from "./PriceChart";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";

export function PricesPage() {
  const queryClient = useQueryClient();
  const { data: symbols } = useSymbols();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const { data: prices, isLoading, isError, error } = useDailyPrices(selectedSymbol);
  const fetchPrices = useFetchPrices();

  const handleFetch = () => {
    if (!selectedSymbol) return;
    fetchPrices.mutate(
      { symbol: selectedSymbol, interval: "daily" },
      { onSuccess: () => {
          setTimeout(() => queryClient.invalidateQueries({ queryKey: ["prices", "daily", selectedSymbol] }), 3000);
        },
      },
    );
  };

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
        {selectedSymbol && (
          <button onClick={handleFetch} disabled={fetchPrices.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 rounded text-white text-sm">
            {fetchPrices.isPending ? "Fetching..." : "Fetch Daily Prices"}
          </button>
        )}
      </div>
      {isLoading && <LoadingSpinner />}
      {isError && (
        <p className="text-red-400">Error loading prices: {(error as Error).message}</p>
      )}
      {prices && prices.length > 0 && <PriceChart data={prices} />}
      {prices && prices.length === 0 && selectedSymbol && (
        <p className="text-slate-400">No price data for {selectedSymbol}. Click "Fetch Daily Prices" to download.</p>
      )}
    </div>
  );
}
