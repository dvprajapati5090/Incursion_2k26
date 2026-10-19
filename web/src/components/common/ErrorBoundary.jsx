import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application render error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0D1B2A] text-[#E0E1DD] flex items-center justify-center p-6">
          <div className="max-w-xl w-full p-8 rounded-2xl bg-[#1B263B] border border-rose-500/40 shadow-2xl space-y-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/40">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Application Encountered an Issue
              </h2>
              <p className="text-xs text-[#778DA9]">
                An unexpected error occurred while rendering the page. Your underlying data is safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3.5 rounded-xl bg-[#0D1B2A] border border-[#415A77]/40 text-left font-mono text-xs text-rose-300 break-words max-h-40 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#415A77] hover:bg-[#778DA9] text-white text-xs font-bold transition cursor-pointer shadow-lg"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B263B] hover:bg-[#415A77]/30 border border-[#415A77]/60 text-[#E0E1DD] text-xs font-semibold transition cursor-pointer"
              >
                <Home className="h-3.5 w-3.5 text-[#778DA9]" />
                Return to Intake
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
