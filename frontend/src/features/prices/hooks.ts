import { useQuery, useMutation } from "@tanstack/react-query";
import { pricesApi } from "./api";

export function useDailyPrices(symbol: string | null) {
  return useQuery({
    queryKey: ["prices", "daily", symbol],
    queryFn: () => pricesApi.getDaily(symbol!),
    enabled: !!symbol,
  });
}
export function useIntradayPrices(symbol: string | null, interval = "30min") {
  return useQuery({
    queryKey: ["prices", "intraday", symbol, interval],
    queryFn: () => pricesApi.getIntraday(symbol!, interval),
    enabled: !!symbol,
  });
}
export function useFetchPrices() {
  return useMutation({
    mutationFn: ({ symbol, interval }: { symbol: string; interval: string }) =>
      pricesApi.fetchPrices(symbol, interval),
  });
}
export function useFetchAllPrices() {
  return useMutation({ mutationFn: (interval: string) => pricesApi.fetchAll(interval) });
}
