import { api } from "../../shared/lib/httpClient";
import type { PriceDailyResponse, PriceIntradayResponse, FetchResponse } from "../../shared/types/api";

export const pricesApi = {
  getDaily: (symbol: string, start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const qs = params.toString();
    return api.get<PriceDailyResponse[]>(`/prices/daily/${symbol}${qs ? `?${qs}` : ""}`);
  },
  getIntraday: (symbol: string, interval = "30min", start?: string, end?: string) => {
    const params = new URLSearchParams({ interval });
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return api.get<PriceIntradayResponse[]>(`/prices/intraday/${symbol}?${params}`);
  },
  fetchPrices: (symbol: string, interval: string) =>
    api.post<FetchResponse>(`/prices/${symbol}/fetch/${interval}`),
  fetchAllIntervals: (symbol: string) =>
    api.post<FetchResponse>(`/prices/${symbol}/fetch-all-intervals`),
  fetchAll: (interval: string) => api.post<FetchResponse>(`/prices/fetch-all/${interval}`),
};
