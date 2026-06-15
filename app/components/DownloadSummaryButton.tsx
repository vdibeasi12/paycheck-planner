"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { generateSummaryPdf } from "@/lib/generateSummaryPdf";

export default function DownloadSummaryButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setBusy(true);
        try {
          await generateSummaryPdf();
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {busy ? "Building PDF…" : "Download PDF summary"}
    </button>
  );
}
