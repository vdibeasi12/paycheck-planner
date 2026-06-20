"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Users,
  TrendingUp,
  CreditCard,
  Search,
  Loader2,
  KeyRound,
  ShieldOff,
  Trash2,
} from "lucide-react";
import AdminFeedback from "@/app/components/AdminFeedback";

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  plan: string;
  is_admin: boolean;
  signup_source: string | null;
  sub_tier: string | null;
  sub_status: string | null;
  sub_plan_type: string | null;
};

type Metrics = {
  totalUsers: number;
  signups30: number;
  activeSubs: number;
  mrr: number;
  signupSources: Record<string, number>;
  planCounts: Record<string, number>;
  paidUsers: number;
  conversion: number;
  canceledSubs: number;
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Momentum",
  premium: "Accelerate",
  connected: "Autopilot",
};

const PLAN_ORDER = ["free", "starter", "premium", "connected"];

export default function AdminPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "denied" | "error">("loading");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ kind: "ok" | "err"; text: string; link?: string } | null>(null);
  const [delTarget, setDelTarget] = useState<{ id: string; email: string } | null>(null);
  const [delConfirm, setDelConfirm] = useState("");
  const [delBusy, setDelBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 401 || res.status === 403) {
        setStatus("denied");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = await res.json();
      setMetrics(data.metrics);
      setUsers(data.users);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  async function patch(userId: string, changes: { plan?: string; is_admin?: boolean }) {
    setSavingId(userId);
    setUsers((us) => us.map((u) => (u.id === userId ? { ...u, ...changes } : u)));
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...changes }),
      });
      if (!res.ok) await load();
    } finally {
      setSavingId(null);
    }
  }

  async function resetMfa(userId: string, email: string) {
    if (!window.confirm(`Remove all 2FA factors for ${email}? They will sign in with their password only until they re-enroll.`)) return;
    setActionMsg(null);
    setActionBusyId(userId);
    try {
      const res = await fetch("/api/admin/reset-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ kind: "ok", text: `2FA cleared for ${email} (${data.removed ?? 0} factor(s) removed).` });
      } else {
        setActionMsg({ kind: "err", text: data.error || "Could not reset 2FA." });
      }
    } catch {
      setActionMsg({ kind: "err", text: "Could not reach the server." });
    } finally {
      setActionBusyId(null);
    }
  }

  async function resetPassword(userId: string, email: string) {
    setActionMsg(null);
    setActionBusyId(userId);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ kind: "ok", text: `Recovery link for ${email}:`, link: data.link });
      } else {
        setActionMsg({ kind: "err", text: data.error || "Could not generate a reset link." });
      }
    } catch {
      setActionMsg({ kind: "err", text: "Could not reach the server." });
    } finally {
      setActionBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setDelBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: delTarget.id, confirmEmail: delConfirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers((us) => us.filter((u) => u.id !== delTarget.id));
        setActionMsg({ kind: "ok", text: `Deleted ${delTarget.email} and purged all of their data.` });
        setDelTarget(null);
        setDelConfirm("");
      } else {
        setActionMsg({ kind: "err", text: data.error || "Could not delete the user." });
      }
    } catch {
      setActionMsg({ kind: "err", text: "Could not reach the server." });
    } finally {
      setDelBusy(false);
    }
  }

  const filtered = useMemo(
    () => users.filter((u) => u.email.toLowerCase().includes(query.toLowerCase())),
    [users, query]
  );

  const cost = useMemo(() => {
    const active = users.filter((u) => u.sub_status === "active" || u.sub_status === "trialing");
    const activeConnected = active.filter((u) => u.sub_tier === "connected").length;
    const gross = metrics?.mrr ?? 0;
    const stripeFees = gross * 0.029 + active.length * 0.3;
    const plaidCost = activeConnected * 2.5;
    const net = gross - stripeFees - plaidCost;
    const margin = gross > 0 ? (net / gross) * 100 : 0;
    return { gross, stripeFees, plaidCost, net, margin, activeConnected };
  }, [users, metrics]);

  const sources = useMemo(() => {
    const entries = Object.entries(metrics?.signupSources ?? {});
    entries.sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
    return { entries, total };
  }, [metrics]);

  if (status === "loading")
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (status === "denied")
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold text-white">Access denied</h1>
        <p className="mt-2 text-gray-400">This area is for administrators only.</p>
      </div>
    );

  if (status === "error")
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 text-gray-400">Couldn&apos;t load the admin data. Try again shortly.</p>
      </div>
    );

  const money = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const planTotal = metrics ? PLAN_ORDER.reduce((s, k) => s + (metrics.planCounts?.[k] ?? 0), 0) || 1 : 1;

  return (
    <div className="min-h-screen bg-[#020617] p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-emerald-500" />
          <h1 className="text-2xl font-bold text-white">Admin portal</h1>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric icon={<Users size={16} />} label="Total users" value={metrics?.totalUsers ?? 0} />
          <Metric icon={<TrendingUp size={16} />} label="New (30 days)" value={metrics?.signups30 ?? 0} />
          <Metric icon={<CreditCard size={16} />} label="Active subs" value={metrics?.activeSubs ?? 0} />
          <Metric icon={<TrendingUp size={16} />} label="MRR" value={money(metrics?.mrr ?? 0)} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric icon={<Users size={16} />} label="Paid users" value={metrics?.paidUsers ?? 0} />
          <Metric icon={<TrendingUp size={16} />} label="Free -> Paid" value={`${(metrics?.conversion ?? 0).toFixed(1)}%`} />
          <Metric icon={<CreditCard size={16} />} label="Active subs" value={metrics?.activeSubs ?? 0} />
          <Metric icon={<ShieldOff size={16} />} label="Canceled subs" value={metrics?.canceledSubs ?? 0} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Cost sheet (est. / mo)</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Line label="Gross MRR" value={money(cost.gross)} strong />
              <Line label="Stripe fees (~2.9% + $0.30/charge)" value={`- ${money(cost.stripeFees)}`} />
              <Line label={`Plaid (${cost.activeConnected} Autopilot x $2.50)`} value={`- ${money(cost.plaidCost)}`} />
              <div className="my-2 h-px bg-gray-700" />
              <Line label="Net" value={money(cost.net)} strong />
              <Line label="Net margin" value={`${cost.margin.toFixed(1)}%`} />
            </dl>
            <p className="mt-3 text-xs text-gray-500">Estimate. Stripe fees assume one charge per active sub per month.</p>
          </div>

          <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Plan mix</h2>
            <ul className="mt-3 space-y-2">
              {PLAN_ORDER.map((k) => {
                const n = metrics?.planCounts?.[k] ?? 0;
                const pctOf = Math.round((n / planTotal) * 100);
                return (
                  <li key={k} className="text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>{PLAN_LABELS[k]}</span>
                      <span className="text-gray-400">{n} ({pctOf}%)</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-800">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pctOf}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">How did you hear about us?</h2>
            {sources.entries.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No responses yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sources.entries.map(([src, n]) => (
                  <li key={src} className="text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span className="capitalize">{src}</span>
                      <span className="text-gray-400">{n} ({Math.round((n / sources.total) * 100)}%)</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-800">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(n / sources.total) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {actionMsg && (
          <div
            className={`mt-6 rounded-xl border p-4 text-sm ${
              actionMsg.kind === "ok"
                ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-200"
                : "border-rose-500/40 bg-rose-500/5 text-rose-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p>{actionMsg.text}</p>
                {actionMsg.link && (
                  <code className="mt-2 block overflow-x-auto rounded bg-[#020617] px-2 py-1 font-mono text-xs text-gray-200">
                    {actionMsg.link}
                  </code>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (actionMsg.link) navigator.clipboard?.writeText(actionMsg.link);
                  setActionMsg(null);
                }}
                className="shrink-0 rounded-lg border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-[#1a233a]"
              >
                {actionMsg.link ? "Copy & close" : "Dismiss"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 rounded-lg border border-gray-700 bg-[#0f172a] px-3">
          <Search size={16} className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email"
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-700 bg-[#0f172a] shadow-sm">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-[#0f172a]">
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">{u.email}</span>
                    {savingId === u.id && (
                      <Loader2 size={12} className="ml-2 inline animate-spin text-gray-400" />
                    )}
                    {u.signup_source && (
                      <span className="mt-0.5 block text-xs capitalize text-gray-500">via {u.signup_source}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.plan}
                      onChange={(e) => patch(u.id, { plan: e.target.value })}
                      className="rounded-lg border border-gray-700 bg-[#0f172a] px-2 py-1 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="free">Free</option>
                      <option value="starter">Momentum</option>
                      <option value="premium">Accelerate</option>
                      <option value="connected">Autopilot</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {u.sub_tier ? (
                      <span className="capitalize">
                        {u.sub_tier}
                        {u.sub_plan_type ? ` - ${u.sub_plan_type}` : ""}
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                            u.sub_status === "active" || u.sub_status === "trialing"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-[#1a233a] text-gray-400"
                          }`}
                        >
                          {u.sub_status || "-"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => patch(u.id, { is_admin: !u.is_admin })}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        u.is_admin
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-[#1a233a] text-gray-400 hover:bg-[#1a233a]"
                      }`}
                    >
                      {u.is_admin ? "Admin" : "Make admin"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => resetPassword(u.id, u.email)}
                        disabled={actionBusyId === u.id}
                        title="Generate password reset link"
                        className="flex items-center gap-1 rounded-lg border border-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-[#1a233a] disabled:opacity-50"
                      >
                        <KeyRound size={13} /> Reset pwd
                      </button>
                      <button
                        type="button"
                        onClick={() => resetMfa(u.id, u.email)}
                        disabled={actionBusyId === u.id}
                        title="Remove all 2FA factors (lost device)"
                        className="flex items-center gap-1 rounded-lg border border-gray-700 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        <ShieldOff size={13} /> Reset 2FA
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDelConfirm("");
                          setDelTarget({ id: u.id, email: u.email });
                        }}
                        disabled={u.is_admin}
                        title={u.is_admin ? "Remove admin access before deleting" : "Delete user and purge all data"}
                        className="flex items-center gap-1 rounded-lg border border-rose-500/40 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                      {actionBusyId === u.id && (
                        <Loader2 size={12} className="animate-spin text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No users match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminFeedback />
      </div>

      {delTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => (delBusy ? null : setDelTarget(null))}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#020617] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Delete user</h2>
            <p className="mt-2 text-sm text-gray-300">
              This permanently deletes{" "}
              <span className="font-semibold text-white">{delTarget.email}</span> and purges all of their
              data (debts, bills, income, goals, subscriptions, and more). This cannot be undone.
            </p>
            <p className="mt-3 text-xs text-gray-400">Type the email to confirm:</p>
            <input
              value={delConfirm}
              onChange={(e) => setDelConfirm(e.target.value)}
              placeholder={delTarget.email}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-2 text-sm outline-none focus:border-rose-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDelTarget(null)}
                disabled={delBusy}
                className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-[#1a233a] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={delBusy || delConfirm.trim().toLowerCase() !== delTarget.email.toLowerCase()}
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40"
              >
                {delBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-400">{label}</dt>
      <dd className={strong ? "font-semibold text-white" : "text-gray-300"}>{value}</dd>
    </div>
  );
}