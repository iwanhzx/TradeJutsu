import { useState } from "react";
import { useAddSymbol } from "./hooks";

interface Props { onClose: () => void; }

export function AddSymbolDialog({ onClose }: Props) {
  const [symbol, setSymbol] = useState("");
  const addMutation = useAddSymbol();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    addMutation.mutate({ symbol: symbol.trim().toUpperCase() }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-96 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Add Symbol</h3>
        <form onSubmit={handleSubmit}>
          <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. BBCA.JK"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 mb-4" autoFocus />
          {addMutation.error && <p className="text-red-400 text-sm mb-3">{String(addMutation.error)}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={addMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {addMutation.isPending ? "Adding..." : "Add Symbol"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
