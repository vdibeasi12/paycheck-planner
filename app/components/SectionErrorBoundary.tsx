"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode; label: string };
type State = { error: Error | null };

// Isolates one card on the account page (Subscription, Notifications, etc.)
// so a crash in one of them can't blank out the rest of the page. Without
// this, React unmounts the *entire* tree on any uncaught render error --
// which is what "the account section gets stuck then crashes" almost
// certainly is: some render-time error with no boundary anywhere above it
// to catch it. Shows the real error message so it can be screenshotted
// and reported instead of just going blank.
export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error(`[account:${this.props.label}] crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-amber-800 bg-[#0f172a] p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" />
            <h2 className="text-lg font-semibold text-white">{this.props.label}</h2>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            This section hit an error and couldn&apos;t load. The rest of the page still works.
          </p>
          <p className="mt-2 break-words rounded-lg bg-[#020617] p-2 font-mono text-xs text-rose-400">
            {this.state.error.message || String(this.state.error)}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-3 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-[#1a233a]"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
