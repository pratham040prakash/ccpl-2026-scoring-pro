"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-[40vh] flex items-center justify-center p-8">
            <div className="glass-card p-8 text-center max-w-md">
              <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
              <p className="text-slate-500 mb-4">Please refresh the page or try again later.</p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
