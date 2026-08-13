"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePlaidLink } from "react-plaid-link";
import { Landmark, RefreshCw, Loader2, ShieldCheck } from "lucide-react";
import { trackCta } from "@/lib/trackClient";

type Props = {
  onLinked?: () => void;
  itemId?: string; // when set, launches UPDATE MODE for this existing item
  label?: string;  // optional override for the button text
  purpose?: "debt" | "bank"; // product to request for a brand-new link
};

// Renders nothing unless a link_token was obtained: the link-token endpoint
// returns 403/503 for ineligible tiers or a disabled feature, so no token ->
// no button.
export default function PlaidConnectButton({ onLinked, itemId, label, purpose = "debt" }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState<"setup" | "step_up" | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/plaid/link-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemId ? { item_id: itemId } : { purpose }),
        });
        if (!res.ok) {
          // Every other ineligibility (wrong tier, feature disabled) stays
          // silent by design -- no token, no button, nothing to act on. MFA
          // is the one case worth surfacing: the user IS on Autopilot, they
          // just need one more step, so tell them what it is.
          const data = await res.json().catch(() => null);
          if (active && data?.code === "mfa_setup_required") setMfaRequired("setup");
          if (active && data?.code === "mfa_step_up_required") setMfaRequired("step_up");
          return;
        }
        const data = await res.json().catch(() => null);
        if (active && data?.link_token) setLinkToken(data.link_token);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [itemId, purpose]);

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
            body: JSON.stringify({ public_token: publicToken, purpose }),
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
    [onLinked, itemId, purpose]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken) => exchange(publicToken),
  });

  if (mfaRequired) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-amber-400" />
        <div>
          <p className="text-amber-200">
            {mfaRequired === "setup"
              ? "Autopilot requires two-factor authentication. Set it up to connect your bank."
              : "Verify your two-factor code, then come back to connect your bank."}
          </p>
          <Link
            href={mfaRequired === "setup" ? "/mfa/setup" : "/mfa"}
            className="mt-1 inline-block font-semibold text-amber-300 hover:underline"
          >
            {mfaRequired === "setup" ? "Set up two-factor →" : "Verify now →"}
          </Link>
        </div>
      </div>
    );
  }

  if (!linkToken) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          trackCta(itemId ? "reconnect_bank" : "connect_bank");
          open();
        }}
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