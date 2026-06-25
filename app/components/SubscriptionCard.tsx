"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useIsNativeApp } from "@/lib/platform";
import { CreditCard, Loader2 } from "lucide-react";

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  starter: "Momentum",
  premium: "Accelerate",
  connected: "Autopilot",
};

export default function SubscriptionCard() {
  const native = useIsNativeApp();
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      if (active) {
        setPlan((data?.plan as string) ?? "free");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function manage() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/billing", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.url) {
        setErr(body?.error || "Could not open the billing portal.");
        return;
      }
      window.location.href = body.url;
    } catch {
      setErr("Could not open the billing portal.");
    } finally {
      setBusy(false);
    }
  }

  const isPaid = plan !== null && plan !== "free";
  const planName = plan ? PLAN_NAMES[plan] ?? plan : "Free";

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <CreditCard size={20} className="text-emerald-500" />
        <h2 className="text-lg font-semibold text-white">Subscription</h2>
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Loading...
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-300">
            Current plan:{" "}
            <span className="font-semibold text-white">{planName}</span>
          </p>

          {native === false ? (
            isPaid ? (
              <>
                <button
                  type="button"
                  onClick={manage}
                  disabled={busy}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-600 disabled:opacity-60"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                  Manage subscription
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  Opens the secure Stripe portal to change plan, update payment,
                  or cancel.
                </p>
              </>
            ) : (
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-600"
              >
                Upgrade plan
              </Link>
            )
          ) : native === true ? (
            <p className="mt-4 text-sm text-gray-400">
              {isPaid
                ? "Manage your subscription in the App Store or Google Play."
                : "Upgrade from the web app at paycheckplanner.ai."}
            </p>
          ) : null}

          {err && <p className="mt-3 text-sm text-rose-500">{err}</p>}
        </>
      )}
    </div>
  );
}