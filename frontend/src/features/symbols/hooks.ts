import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { symbolsApi } from "./api";
import type { SymbolCreate } from "../../shared/types/api";

export function useSymbols() {
  return useQuery({ queryKey: ["symbols"], queryFn: symbolsApi.list });
}
export function useAddSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SymbolCreate) => symbolsApi.add(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["symbols"] }),
  });
}
export function useToggleSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ symbol, active }: { symbol: string; active: boolean }) =>
      active ? symbolsApi.enable(symbol) : symbolsApi.disable(symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["symbols"] }),
  });
}
export function useDeleteSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => symbolsApi.delete(symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["symbols"] }),
  });
}
