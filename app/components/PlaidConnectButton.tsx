"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Landmark, RefreshCw, Loader2 } from "lucide-react";

type Props = {
  onLinked?: () => void;
  itemId?: string; // when set, launches UPDATE MODE for this existing item
  label?: string;  // optional override for the button text
};

// Renders nothing unless a link_token was obtained: the link-token endpoint
// returns 403/503 for ineligible tiers or a disabled feature, so no token ->
// no button.
export default function PlaidConnectButton({ onLinked, itemId, label }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/plaid/link-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemId ? { item_id: itemId } : {}),
        });
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
  }, [itemId]);

  const exchange = useCallback(
    async (publicToken: string) => {
      setBusy(true);
      setErr(null);
      try {
        if (itemId) {
          // Update mode: the existing access_token is still valid, nothing
          // to exchange. Just clear the item's error status.
          const res = await fetch("/api/plaid/reconnect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: itemId }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setErr(data?.error || "Could not refresh this connection.");
            return;
          }
        } else {
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
        }
        onLinked?.();
      } catch {
        setErr(itemId ? "Could not refresh this connection." : "Could not link your bank.");
      } finally {
        setBusy(false);
      }
    },
    [onLinked, itemId]
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
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : itemId ? (
          <RefreshCw size={16} />
        ) : (
          <Landmark size={16} />
        )}
        {label || (itemId ? "Reconnect" : "Connect bank")}
      </button>
      {err && <p className="mt-2 text-sm text-rose-500">{err}</p>}
    </div>
  );
}