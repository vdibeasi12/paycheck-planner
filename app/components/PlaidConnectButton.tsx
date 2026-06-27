"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Landmark, Loader2 } from "lucide-react";

// Renders nothing unless the user is eligible (Autopilot + Plaid enabled):
// the link-token endpoint returns 403/503 for everyone else, so no token ->
// no button.
export default function PlaidConnectButton({ onLinked }: { onLinked?: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/plaid/link-token", { method: "POST" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (active && data?.link_token) setLinkToken(data.link_token);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const exchange = useCallback(
    async (publicToken: string) => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data?.error || "Could not link your bank.");
          return;
        }
        onLinked?.();
      } catch {
        setErr("Could not link your bank.");
      } finally {
        setBusy(false);
      }
    },
    [onLinked]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken) => exchange(publicToken),
  });

  if (!linkToken) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => open()}
        disabled={!ready || busy}
        className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-600 disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Landmark size={16} />}
        Connect bank
      </button>
      {err && <p className="mt-2 text-sm text-rose-500">{err}</p>}
    </div>
  );
}