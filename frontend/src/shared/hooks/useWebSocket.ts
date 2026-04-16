import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsClient } from "../lib/wsClient";
import type { WsMessage } from "../types/api";

export function useWebSocket() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(wsClient.isConnected);

  useEffect(() => {
    wsClient.connect();
    const unsubStatus = wsClient.onStatusChange(setIsConnected);
    const unsubMessages = wsClient.subscribe((message: WsMessage) => {
      switch (message.type) {
        case "job:started":
        case "job:progress":
        case "job:complete":
        case "job:error":
          queryClient.invalidateQueries({ queryKey: ["jobs"] });
          break;
        case "data:updated":
          if (message.table === "prices_daily" || message.table === "prices_intraday") {
            queryClient.invalidateQueries({ queryKey: ["prices"] });
          }
          if (message.table === "atr_summary") {
            queryClient.invalidateQueries({ queryKey: ["atr"] });
          }
          if (message.table === "symbols") {
            queryClient.invalidateQueries({ queryKey: ["symbols"] });
          }
          break;
      }
    });
    return () => { unsubStatus(); unsubMessages(); };
  }, [queryClient]);

  return { isConnected };
}
