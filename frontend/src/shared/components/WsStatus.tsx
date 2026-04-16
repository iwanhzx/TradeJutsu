interface Props { isConnected: boolean; }
export function WsStatus({ isConnected }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
      <span className="text-slate-400">{isConnected ? "Connected" : "Disconnected"}</span>
    </div>
  );
}
