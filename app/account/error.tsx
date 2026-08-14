"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

// Next.js route-level error boundary (special file convention: any render
// error thrown inside app/account/** that isn't caught by a more specific
// boundary lands here instead of taking down the whole app). This is the
// backstop behind SectionErrorBoundary -- if that catches everything as
// intended, this should rarely fire. If the account page is still "getting
// stuck then crashing" after that fix, whatever shows up here is the real,
// previously-invisible cause.
export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[account] page-level crash:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#020617] p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-rose-800 bg-[#0f172a] p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-500" />
            <h1 className="text-lg font-semibold text-white">
              Something went wrong loading this page
            </h1>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            Please try again. If it keeps happening, taking a screenshot of the message
            below and sending it in helps track down the cause.
          </p>
          <p className="mt-2 break-words rounded-lg bg-[#020617] p-2 font-mono text-xs text-rose-400">
            {error.message || String(error)}
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
