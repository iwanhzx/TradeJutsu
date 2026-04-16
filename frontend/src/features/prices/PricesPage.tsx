import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSymbols } from "../symbols/hooks";
import { useDailyPrices, useIntradayPrices, useFetchAllIntervals } from "./hooks";
import { PriceChart } from "./PriceChart";
import { PriceSummary } from "./PriceSummary";
import { PriceTable } from "./PriceTable";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";

type Interval = "daily" | "1hour" | "30min" | "15min";

const TABS: { value: Interval; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "1hour", label: "1 Hour" },
  { value: "30min", label: "30 Min" },
  { value: "15min", label: "15 Min" },
];

export function PricesPage() {
  const queryClient = useQueryClient();
  const { data: symbols } = useSymbols();
  const { symbol: urlSymbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(
    urlSymbol || null,
  );
  const [activeTab, setActiveTab] = useState<Interval>("daily");
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displaySymbol = (sym: string) => sym.replace(/\.JK$/i, "");

  const filteredSymbols = useMemo(() => {
    if (!symbols) return [];
    if (!searchTerm) return symbols;
    const q = searchTerm.toLowerCase();
    return symbols.filter(
      (s) =>
        displaySymbol(s.symbol).toLowerCase().includes(q) ||
        s.symbol.toLowerCase().includes(q) ||
        (s.name && s.name.toLowerCase().includes(q)),
    );
  }, [symbols, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDaily = activeTab === "daily";
  const dailyQuery = useDailyPrices(isDaily ? selectedSymbol : null);
  const intradayQuery = useIntradayPrices(!isDaily ? selectedSymbol : null, activeTab);
  const { data: prices, isLoading, isError, error } = isDaily ? dailyQuery : intradayQuery;

  const fetchMutation = useFetchAllIntervals();

  const handleFetch = () => {
    if (!selectedSymbol) return;
    fetchMutation.mutate(selectedSymbol, {
      onSuccess: () => {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["prices"] });
        }, 3000);
      },
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Price Explorer</h2>
      <div className="flex gap-4 mb-4">
        <div ref={comboRef} className="relative w-1/2">
          <input
            ref={inputRef}
            type="text"
            value={dropdownOpen ? searchTerm : (selectedSymbol ? displaySymbol(selectedSymbol) : "")}
            placeholder="Search symbol..."
            onFocus={() => {
              setSearchTerm("");
              setDropdownOpen(true);
            }}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setDropdownOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDropdownOpen(false);
                inputRef.current?.blur();
              }
            }}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white w-full"
          />
          {dropdownOpen && (
            <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-slate-700 border border-slate-600 rounded shadow-lg">
              {filteredSymbols.length === 0 && (
                <li className="px-3 py-2 text-slate-400 text-sm">No matches</li>
              )}
              {filteredSymbols.map((s) => (
                <li
                  key={s.symbol}
                  onMouseDown={() => {
                    setSelectedSymbol(s.symbol);
                    setSearchTerm("");
                    setDropdownOpen(false);
                    navigate(`/prices/${s.symbol}`, { replace: true });
                  }}
                  className={`px-3 py-2 cursor-pointer text-sm hover:bg-slate-600 ${
                    s.symbol === selectedSymbol ? "bg-slate-600 text-white" : "text-slate-200"
                  }`}
                >
                  {displaySymbol(s.symbol)}{s.name ? ` - ${s.name}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedSymbol && (
          <button onClick={handleFetch} disabled={fetchMutation.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 rounded text-white text-sm">
            {fetchMutation.isPending ? "Fetching..." : "Fetch"}
          </button>
        )}
      </div>

      {/* Timeframe tabs */}
      {selectedSymbol && (
        <div className="flex gap-0 mb-4 border-b-2 border-slate-700">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "text-white border-b-2 border-blue-500 -mb-[2px]"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {isError && (
        <p className="text-red-400">Error loading prices: {(error as Error).message}</p>
      )}
      {prices && prices.length > 0 && (
        <div className="flex flex-col gap-3">
          <PriceChart data={prices} isDaily={isDaily} />
          <PriceSummary data={prices} isDaily={isDaily} />
          <PriceTable data={prices} isDaily={isDaily} />
          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
            <p><span className="text-slate-400 font-medium">TR</span> = High − Low</p>
            <p><span className="text-slate-400 font-medium">TR%</span> = TR / Close × 100</p>
          </div>
        </div>
      )}
      {prices && prices.length === 0 && selectedSymbol && (
        <p className="text-slate-400">No price data for {selectedSymbol}. Click "Fetch" to download.</p>
      )}
    </div>
  );
}
