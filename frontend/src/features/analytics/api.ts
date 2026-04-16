import { api } from "../../shared/lib/httpClient";
import type { AtrSummaryResponse, TurnoverTableResponse, WtdReportItem, WtdSettings, JobCreated } from "../../shared/types/api";

export const analyticsApi = {
  getAtrSummary: (interval?: string, symbol?: string) => {
    const params = new URLSearchParams();
    if (interval) params.set("interval", interval);
    if (symbol) params.set("symbol", symbol);
    const qs = params.toString();
    return api.get<AtrSummaryResponse[]>(`/analytics/atr/summary${qs ? `?${qs}` : ""}`);
  },
  calculateAtr: () => api.post<JobCreated>("/analytics/atr/calculate"),
  getTurnoverTable: () => api.get<TurnoverTableResponse>("/analytics/turnover"),
  getWtdReport: () => api.get<WtdReportItem[]>("/analytics/wtd/report"),
  checkWtd: () => api.post<JobCreated>("/analytics/wtd/check"),
  getWtdSettings: () => api.get<WtdSettings>("/analytics/wtd/settings"),
  saveWtdSettings: (settings: WtdSettings) => api.put<WtdSettings>("/analytics/wtd/settings", settings),
};
