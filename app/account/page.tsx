"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import MfaSetup from "@/components/MfaSetup";
import { KeyRound, LogOut, Loader2, Eye, EyeOff } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function changePassword() {
    setMsg(null);
    if (password.length < 8) {
      setMsg({ kind: "err", text: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setMsg({ kind: "err", text: "Passwords don't match." });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMsg({ kind: "err", text: error.message });
        return;
      }
      setPassword("");
      setConfirm("");
      setMsg({ kind: "ok", text: "Password updated." });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#020617] p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Account & security</h1>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#1a233a]"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>

        {/* Two-factor */}
        <MfaSetup />

        {/* Change password */}
        <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <KeyRound size={20} className="text-emerald-500" />
            <h2 className="text-lg font-semibold text-white">Change password</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full rounded-lg border border-gray-700 px-3 py-2 pr-10 text-sm outline-none focus:border-emerald-400 bg-[#0f172a] text-white placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-lg border border-gray-700 px-3 py-2 pr-10 text-sm outline-none focus:border-emerald-400 bg-[#0f172a] text-white placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {msg && (
            <p className={`mt-3 text-sm ${msg.kind === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
              {msg.text}
            </p>
          )}
          <button
            type="button"
            onClick={changePassword}
            disabled={busy}
            className="mt-4 flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-600 disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            Update password
          </button>
        </div>
      </div>
    </div>
  );
}
