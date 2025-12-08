"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-red-400 mb-2">
                Something went wrong
              </h1>
              <p className="text-zinc-400">
                Pawkit encountered an error. This might be due to your browser&apos;s security settings.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-red-300 mb-2">Error:</p>
              <code className="text-xs text-zinc-400 break-all">
                {this.state.error?.message || "Unknown error"}
              </code>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 px-6 rounded-xl transition-colors"
              >
                Reload Page
              </button>

              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3 px-6 rounded-xl transition-colors"
              >
                Clear Data & Reload
              </button>
            </div>

            <p className="text-xs text-zinc-500 text-center">
              If this persists, try disabling browser extensions or security features.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
