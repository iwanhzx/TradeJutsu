import { api } from "../../shared/lib/httpClient";
import type { AtrSummaryResponse, TurnoverItem, WtdReportItem, JobCreated } from "../../shared/types/api";

export const analyticsApi = {
  getAtrSummary: (interval?: string, symbol?: string) => {
    const params = new URLSearchParams();
    if (interval) params.set("interval", interval);
    if (symbol) params.set("symbol", symbol);
    const qs = params.toString();
    return api.get<AtrSummaryResponse[]>(`/analytics/atr/summary${qs ? `?${qs}` : ""}`);
  },
  calculateAtr: (interval: string) => api.post<JobCreated>(`/analytics/atr/calculate/${interval}`),
  getTurnover: (days = 7, symbol?: string) => {
    const params = new URLSearchParams({ days: String(days) });
    if (symbol) params.set("symbol", symbol);
    return api.get<TurnoverItem[]>(`/analytics/turnover?${params}`);
  },
  getWtdReport: () => api.get<WtdReportItem[]>("/analytics/wtd/report"),
  checkWtd: () => api.post<JobCreated>("/analytics/wtd/check"),
};
