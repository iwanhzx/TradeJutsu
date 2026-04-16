import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "./api";

export function useAtrSummary(interval?: string, symbol?: string) {
  return useQuery({ queryKey: ["atr", interval, symbol], queryFn: () => analyticsApi.getAtrSummary(interval, symbol) });
}
export function useCalculateAtr() {
  return useMutation({ mutationFn: () => analyticsApi.calculateAtr() });
}
export function useTurnoverTable() {
  return useQuery({ queryKey: ["turnover-table"], queryFn: analyticsApi.getTurnoverTable });
}
export function useWtdReport() {
  return useQuery({ queryKey: ["wtd"], queryFn: analyticsApi.getWtdReport });
}
export function useCheckWtd() {
  return useMutation({ mutationFn: analyticsApi.checkWtd });
}
export function useWtdSettings() {
  return useQuery({ queryKey: ["wtd-settings"], queryFn: analyticsApi.getWtdSettings });
}
export function useSaveWtdSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: analyticsApi.saveWtdSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wtd-settings"] });
      qc.invalidateQueries({ queryKey: ["wtd"] });
    },
  });
}
