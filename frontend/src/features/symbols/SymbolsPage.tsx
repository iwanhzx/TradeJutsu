import { useState } from "react";
import { useSymbols } from "./hooks";
import { SymbolTable } from "./SymbolTable";
import { AddSymbolDialog } from "./AddSymbolDialog";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";

export function SymbolsPage() {
  const { data: symbols, isLoading, error } = useSymbols();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Symbol Management</h2>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">+ Add Symbol</button>
      </div>
      {isLoading && <LoadingSpinner />}
      {error && <p className="text-red-400">Failed to load symbols: {String(error)}</p>}
      {symbols && <SymbolTable symbols={symbols} />}
      {showAdd && <AddSymbolDialog onClose={() => setShowAdd(false)} />}
    </div>
  );
}
