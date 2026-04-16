import { Component, type ErrorInfo, type ReactNode } from "react";
import { createLogger } from "../lib/logger";

const log = createLogger("ErrorBoundary");

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error("React render error:", error.message, errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="rounded-lg bg-red-900/20 border border-red-800 p-6 m-4">
          <h3 className="text-red-400 font-semibold mb-2">Something went wrong</h3>
          <p className="text-sm text-slate-400">{this.state.error?.message}</p>
          <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            onClick={() => this.setState({ hasError: false, error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
