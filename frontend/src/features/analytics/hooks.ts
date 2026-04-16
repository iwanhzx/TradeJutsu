import { useQuery, useMutation } from "@tanstack/react-query";
import { analyticsApi } from "./api";

export function useAtrSummary(interval?: string, symbol?: string) {
  return useQuery({ queryKey: ["atr", interval, symbol], queryFn: () => analyticsApi.getAtrSummary(interval, symbol) });
}
export function useCalculateAtr() {
  return useMutation({ mutationFn: (interval: string) => analyticsApi.calculateAtr(interval) });
}
export function useTurnover(days = 7) {
  return useQuery({ queryKey: ["turnover", days], queryFn: () => analyticsApi.getTurnover(days) });
}
export function useWtdReport() {
  return useQuery({ queryKey: ["wtd"], queryFn: analyticsApi.getWtdReport });
}
export function useCheckWtd() {
  return useMutation({ mutationFn: analyticsApi.checkWtd });
}
