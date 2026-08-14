"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/withTimeout";
import { ShieldCheck, ShieldPlus, Trash2, Loader2 } from "lucide-react";

type Factor = { id: string; friendly_name: string | null; status: string };

export default function MfaSetup({ onVerified }: { onVerified?: () => void } = {}) {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removeMsg, setRemoveMsg] = useState<string | null>(null);

  // enrollment state
  const [method, setMethod] = useState<"app" | "email" | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    loadFactors();
  }, []);

  async function loadFactors() {
    setLoading(true);
    try {
      const { data } = await withTimeout(supabase.auth.mfa.listFactors(), 8000, {
        data: { totp: [], phone: [] },
      } as any);
      // verified TOTP factors
      setFactors((data?.totp ?? []) as Factor[]);
    } catch {
      // Don't leave this section stuck on "Checking your security
      // settings..." forever on a network hiccup -- show it as if there
      // are no factors yet; the enroll buttons still work and a retry via
      // re-enrollment or a page refresh recovers cleanly.
      setFactors([]);
    } finally {
      setLoading(false);
    }
  }

  async function startEnroll(chosenMethod: "app" | "email") {
    setError(null);
    setBusy(true);
    try {
      const { data, error: e } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `${chosenMethod === "email" ? "Email" : "Authenticator"} ${new Date().toISOString().slice(0, 16)}`,
      });
      if (e) {
        setError(e.message);
        return;
      }
      setMethod(chosenMethod);
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setOtpauthUri(data.totp.uri);

      if (chosenMethod === "email") {
        const res = await fetch("/api/mfa/email/enroll", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ factorId: data.id, secret: data.totp.secret }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body?.error || "Could not send your code by email. Please try again.");
          setMethod(null);
          return;
        }
      }
      setEnrolling(true);
    } finally {
      setBusy(false);
    }
  }

  async function resendEmailCode() {
    if (!factorId) return;
    setResendMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/mfa/email/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ factorId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResendMsg(body?.error || "Could not resend the code. Please try again.");
        return;
      }
      setResendMsg("A new code is on its way to your inbox.");
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
      // success -- reset and reload
      cancelEnroll();
      await loadFactors();
      onVerified?.();
    } finally {
      setBusy(false);
    }
  }

  function cancelEnroll() {
    setEnrolling(false);
    setMethod(null);
    setQr(null);
    setSecret(null);
    setOtpauthUri(null);
    setFactorId(null);
    setCode("");
    setCopied(false);
    setResendMsg(null);
  }

  async function removeFactor(id: string) {
    setRemoveMsg(null); if (!window.confirm("Remove this authenticator? You will no longer be asked for a 6-digit code at sign-in until you set one up again.")) return; const { error: uErr } = await supabase.auth.mfa.unenroll({ factorId: id }); if (uErr) { setRemoveMsg(uErr.message || "Could not remove this device. Sign out and back in, complete the 6-digit verification, then try again."); return; }
    await loadFactors();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Loader2 size={16} className="animate-spin" /> Checking your security settings...
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

      {removeMsg && (<p className="mt-3 text-sm text-rose-400">{removeMsg}</p>)}
      {/* Enrollment */}
      {enrolling ? (
        <div className="mt-5 rounded-xl border border-gray-700 bg-[#0f172a] p-5">
          {method === "email" ? (
            <>
              <p className="text-sm font-medium text-gray-200">
                1. Check your email -- we sent a 6-digit code to your inbox.
              </p>
              <p className="mt-1.5 text-xs text-gray-500">
                Each code is only valid for a short time. If it expires before you enter it, request a new
                one below.
              </p>
              <button
                type="button"
                onClick={resendEmailCode}
                disabled={busy}
                className="mt-3 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-[#1a233a] disabled:opacity-60"
              >
                Resend code
              </button>
              {resendMsg && <p className="mt-2 text-xs text-emerald-400">{resendMsg}</p>}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-200">
                1. Add this to your authenticator app (Google Authenticator, Authy, 1Password).
              </p>

              {otpauthUri && (
                <a href={otpauthUri}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  <ShieldPlus size={16} />
                  Open in authenticator app
                </a>
              )}
              <p className="mt-1.5 text-xs text-gray-500">
                On a phone, this opens your authenticator app directly -- no scanning or typing needed. On a
                computer, scan the QR code below with your phone&apos;s authenticator app instead.
              </p>

              {qr && (
                <div
                  className="mt-4 inline-block rounded-lg bg-[#0f172a] p-3"
                  // Supabase returns the QR as an SVG string
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
              )}
              {secret && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <span>Can&apos;t scan or open the app? Enter this key manually:</span>
                  <code className="rounded bg-[#1a233a] px-1.5 py-0.5 font-mono text-gray-200">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(secret);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="rounded bg-[#1a233a] px-2 py-1 font-medium text-emerald-400 hover:bg-[#242f4a]"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </>
          )}

          <p className="mt-4 text-sm font-medium text-gray-200">
            2. Enter the 6-digit code {method === "email" ? "from the email" : "it shows"}:
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
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            {factors.length > 0 ? "Add another device" : "Choose how to receive your codes"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => startEnroll("app")}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-[#1a233a] disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldPlus size={16} />}
              Use an authenticator app
            </button>
            <button
              type="button"
              onClick={() => startEnroll("email")}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-[#1a233a] disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldPlus size={16} />}
              Email me a code instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
