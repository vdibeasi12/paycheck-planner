"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ShieldCheck, ShieldPlus, Trash2, Loader2 } from "lucide-react";

type Factor = { id: string; friendly_name: string | null; status: string };

export default function MfaSetup() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // enrollment state
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadFactors();
  }, []);

  async function loadFactors() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    // verified TOTP factors
    setFactors((data?.totp ?? []) as Factor[]);
    setLoading(false);
  }

  async function startEnroll() {
    setError(null);
    setBusy(true);
    try {
      const { data, error: e } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16)}`,
      });
      if (e) {
        setError(e.message);
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setEnrolling(true);
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    if (!factorId || code.length < 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (cErr) {
        setError(cErr.message);
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) {
        setError(vErr.message);
        return;
      }
      // success — reset and reload
      cancelEnroll();
      await loadFactors();
    } finally {
      setBusy(false);
    }
  }

  function cancelEnroll() {
    setEnrolling(false);
    setQr(null);
    setSecret(null);
    setFactorId(null);
    setCode("");
  }

  async function removeFactor(id: string) {
    await supabase.auth.mfa.unenroll({ factorId: id });
    await loadFactors();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Loader2 size={16} className="animate-spin" /> Checking your security settings…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-emerald-500" />
        <h2 className="text-lg font-semibold text-white">Two-factor authentication</h2>
      </div>
      <p className="mt-1 text-sm text-gray-400">
        Add a one-time code from an authenticator app for an extra layer of security at sign-in.
      </p>

      {/* Existing factors */}
      {factors.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100">
          {factors.map((f) => (
            <li key={f.id} className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-sm text-gray-200">
                <ShieldCheck size={16} className="text-emerald-500" />
                {f.friendly_name || "Authenticator app"}
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Active
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeFactor(f.id)}
                className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                aria-label="Remove"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Enrollment */}
      {enrolling ? (
        <div className="mt-5 rounded-xl border border-gray-700 bg-[#0f172a] p-5">
          <p className="text-sm font-medium text-gray-200">
            1. Scan this QR code in your authenticator app (Google Authenticator, Authy, 1Password).
          </p>
          {qr && (
            <div
              className="mt-3 inline-block rounded-lg bg-[#0f172a] p-3"
              // Supabase returns the QR as an SVG string
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          )}
          {secret && (
            <p className="mt-2 text-xs text-gray-400">
              Can&apos;t scan? Enter this key manually:{" "}
              <code className="rounded bg-[#1a233a] px-1.5 py-0.5 font-mono text-gray-200">
                {secret}
              </code>
            </p>
          )}

          <p className="mt-4 text-sm font-medium text-gray-200">
            2. Enter the 6-digit code it shows:
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="123456"
              className="w-32 rounded-lg border border-gray-700 px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-emerald-400 bg-[#0f172a] text-white placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={confirmEnroll}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Verify & enable
            </button>
            <button
              type="button"
              onClick={cancelEnroll}
              className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-[#1a233a]"
            >
              Cancel
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </div>
      ) : (
        <div className="mt-5">
          {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
          <button
            type="button"
            onClick={startEnroll}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-[#1a233a] disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldPlus size={16} />}
            {factors.length > 0 ? "Add another device" : "Set up two-factor authentication"}
          </button>
        </div>
      )}
    </div>
  );
}
