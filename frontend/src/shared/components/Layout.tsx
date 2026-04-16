import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { WsStatus } from "./WsStatus";
import { useWebSocket } from "../hooks/useWebSocket";
import { ErrorBoundary } from "./ErrorBoundary";

export function Layout() {
  const { isConnected } = useWebSocket();
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-end px-6 py-3 border-b border-slate-700 bg-slate-900/50">
          <WsStatus isConnected={isConnected} />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary><Outlet /></ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
