"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Users, TrendingUp, CreditCard, Search, Loader2 } from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  plan: string;
  is_admin: boolean;
  sub_tier: string | null;
  sub_status: string | null;
  sub_plan_type: string | null;
};

type Metrics = { totalUsers: number; signups30: number; activeSubs: number; mrr: number };

export default function AdminPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "denied" | "error">("loading");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const filtered = useMemo(
    () => users.filter((u) => u.email.toLowerCase().includes(query.toLowerCase())),
    [users, query]
  );

  if (status === "loading")
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (status === "denied")
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
        <p className="mt-2 text-slate-500">This area is for administrators only.</p>
      </div>
    );

  if (status === "error")
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-slate-500">Couldn&apos;t load the admin data. Try again shortly.</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-emerald-500" />
          <h1 className="text-2xl font-bold text-slate-900">Admin portal</h1>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric icon={<Users size={16} />} label="Total users" value={metrics?.totalUsers ?? 0} />
          <Metric icon={<TrendingUp size={16} />} label="New (30 days)" value={metrics?.signups30 ?? 0} />
          <Metric icon={<CreditCard size={16} />} label="Active subs" value={metrics?.activeSubs ?? 0} />
          <Metric icon={<TrendingUp size={16} />} label="MRR" value={`$${(metrics?.mrr ?? 0).toLocaleString()}`} />
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email"
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{u.email}</span>
                    {savingId === u.id && (
                      <Loader2 size={12} className="ml-2 inline animate-spin text-slate-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.plan}
                      onChange={(e) => patch(u.id, { plan: e.target.value })}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="premium">Premium</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.sub_tier ? (
                      <span className="capitalize">
                        {u.sub_tier}
                        {u.sub_plan_type ? ` · ${u.sub_plan_type}` : ""}
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                            u.sub_status === "active" || u.sub_status === "trialing"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {u.sub_status || "—"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => patch(u.id, { is_admin: !u.is_admin })}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        u.is_admin
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {u.is_admin ? "Admin" : "Make admin"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No users match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
