"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

export default function DeleteAccount() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email || "");
    });
    return () => {
      active = false;
    };
  }, []);

  const matches =
    typed.trim().length > 0 &&
    typed.trim().toLowerCase() === email.toLowerCase();

  async function deleteAccount() {
    setErr(null);
    if (!matches) {
      setErr("Type your account email exactly to confirm.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: typed.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Could not delete your account. Please try again.");
        setBusy(false);
        return;
      }
      // Account is gone server-side; clear the local session and leave.
      await supabase.auth.signOut();
      router.replace("/?deleted=1");
    } catch {
      setErr("Could not delete your account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-rose-800 bg-[#0f172a] p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle size={20} className="text-rose-500" />
        <h2 className="text-lg font-semibold text-white">Delete account</h2>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        This permanently deletes your account and all of your data: income,
        debts, bills, goals, documents, notification settings, and history. It
        cannot be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setErr(null);
          }}
          className="mt-4 flex items-center gap-2 rounded-lg border border-rose-700 px-4 py-2 text-sm font-semibold text-rose-400 hover:bg-[#241018]"
        >
          <Trash2 size={16} /> Delete my account
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-gray-300">
            Type your email{" "}
            <span className="font-semibold text-white">{email || "..."}</span> to
            confirm:
          </label>
          <input
            type="email"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={email}
            autoComplete="off"
            className="w-full rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-rose-400"
          />
          {err && <p className="text-sm text-rose-500">{err}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={deleteAccount}
              disabled={busy || !matches}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Permanently delete
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
                setErr(null);
              }}
              disabled={busy}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#1a233a] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}