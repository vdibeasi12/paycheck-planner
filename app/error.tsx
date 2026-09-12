"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

// App-wide route-level error boundary (Next.js special file). Found missing
// in the Sep 11 2026 audit: app/account/error.tsx was the ONLY error.tsx in
// the project, and SectionErrorBoundary was used only on /account. So a
// render error thrown by any single widget -- a chart, the Safe to Spend
// card, the surplus prompt -- took down the ENTIRE route it lived on, and
// /dashboard, /safe-to-spend, /bills-debts and /analytics all white-screened
// with nothing on screen to act on.
//
// This catches everything those routes throw. It is deliberately plain and
// self-contained: an error boundary that depends on the app's own providers
// or data layer can fail for the same reason the page did.
//
// Note this does NOT replace handling expected failures inline. A financial
// query that fails has a correct, specific answer (see lib/dataLoad.ts and
// DataLoadError) and should never reach this screen. This is the backstop
// for the genuinely unexpected.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] route-level crash:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#020617] p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-rose-800 bg-[#0f172a] p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-500" />
            <h1 className="text-lg font-semibold text-white">Something went wrong loading this page</h1>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            Your data is safe and nothing has changed. Try again, and if it keeps happening, a screenshot of the
            message below helps track down the cause.
          </p>
          <p className="mt-2 break-words rounded-lg bg-[#020617] p-2 font-mono text-xs text-rose-400">
            {error.message || String(error)}
            {error.digest ? ` (${error.digest})` : ""}
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-600"
            >
              Try again
            </button>
            <a
              href="/dashboard"
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#1a233a]"
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
