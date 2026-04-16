import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { createLogger } from "../shared/lib/logger";

const log = createLogger("queryClient");

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      log.error("Query failed [%s]:", query.queryKey, error);
    },
  }),
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: {
      onError: (error) => {
        log.error("Mutation failed:", error);
      },
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
