import { api } from "../../shared/lib/httpClient";
import type { SymbolResponse, SymbolCreate } from "../../shared/types/api";

export const symbolsApi = {
  list: () => api.get<SymbolResponse[]>("/symbols"),
  get: (symbol: string) => api.get<SymbolResponse>(`/symbols/${symbol}`),
  add: (body: SymbolCreate) => api.post<SymbolResponse>("/symbols", body),
  disable: (symbol: string) => api.patch<SymbolResponse>(`/symbols/${symbol}/disable`),
  enable: (symbol: string) => api.patch<SymbolResponse>(`/symbols/${symbol}/enable`),
  delete: (symbol: string) => api.delete<void>(`/symbols/${symbol}`),
};
