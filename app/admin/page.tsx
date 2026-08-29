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
  History,
  RefreshCw,
  ShieldAlert,
  Activity,
  Percent,
  Eye,
  MousePointerClick,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import AdminFeedback from "@/app/components/AdminFeedback";
import { downloadMarketingReportCsv, downloadMarketingReportPdf, type MarketingReportData } from "@/lib/generateMarketingReport";

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  plan: string;
  is_admin: boolean;
  signup_source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
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
  utmSources: Record<string, number>;
  planCounts: Record<string, number>;
  paidUsers: number;
  conversion: number;
  canceledSubs: number;
};

type AuditRow = {
  id: string;
  created_at: string;
  actor_id: string;
  actor_email: string | null;
  action: string;
  target_id: string | null;
  target_email: string | null;
  metadata: Record<string, unknown> | null;
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  plan_change: "Plan change",
  grant_admin: "Granted admin",
  revoke_admin: "Revoked admin",
  reset_password: "Password reset link",
  reset_mfa: "2FA reset",
  delete_user: "Deleted user",
  feedback_status_change: "Feedback status change",
  feedback_delete: "Feedback deleted",
};

const EVENT_LABELS: Record<string, string> = {
  signup_completed: "Signups",
  onboarding_completed: "Onboarding completed",
  checkout_started: "Checkout started",
  subscription_started: "Subscriptions started",
  subscription_canceled: "Subscriptions canceled",
  bank_connected: "Credit cards connected (Autopilot)",
  money_score_completed: "Money Quiz completed",
  money_score_plan_unlocked: "Money Quiz plans unlocked",
  lead_magnet_subscribed: "Lead magnet signups",
  referral_completed: "Referrals completed",
  referral_click: "Referral link clicks",
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
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [auditStatus, setAuditStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [events, setEvents] = useState<{
    totals: Record<string, number>;
    last30: Record<string, number>;
    recent: { id: string; created_at: string; event_name: string; user_id: string | null; metadata: Record<string, unknown> | null }[];
  } | null>(null);
  const [funnels, setFunnels] = useState<{
    signupToPaid: { signups: number; paid: number; ratePct: number | null };
    moneyScoreToUnlock: { completed: number; unlocked: number; ratePct: number | null };
    bankConnectedTotal: number;
    referralsCompletedTotal: number;
    bySource: Record<string, { signups: number; activated: number; paid: number }>;
    byCampaign: Record<string, { signups: number; activated: number; paid: number }>;
    topReferrers: { email: string; count: number }[];
    referralRevenueMonthly: number;
    productFunnel: {
      signups: number;
      onboarded: number;
      activated: number;
      checkoutStarted: number;
      paid: number;
      returning: number;
    } | null;
  } | null>(null);
  const [visitors, setVisitors] = useState<{
    uniqueVisitors: { today: number; last7: number; last30: number };
    pageViews: { today: number; last7: number; last30: number; allTime: number };
    bySource: Record<string, number>;
    ctaClicks: Record<string, number>;
  } | null>(null);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [security, setSecurity] = useState<{
    admins: { id: string; email: string; hasVerifiedFactor: boolean; factorCount: number }[];
    rateLimitBlocks24h: { bucket: string; ip: string; count: number; window_start: string }[];
  } | null>(null);
  const [securityStatus, setSecurityStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => {
    load();
    loadEvents();
    loadFunnels();
    loadVisitors();
  }, []);

  async function loadEvents() {
    try {
      const res = await fetch("/api/admin/events");
      if (!res.ok) return;
      const data = await res.json();
      setEvents({ totals: data.totals || {}, last30: data.last30 || {}, recent: data.recent || [] });
    } catch {
      /* non-fatal -- the rest of the dashboard still works */
    }
  }

  async function loadFunnels() {
    try {
      const res = await fetch("/api/admin/funnels");
      if (!res.ok) return;
      const data = await res.json();
      setFunnels(data);
    } catch {
      /* non-fatal -- the rest of the dashboard still works */
    }
  }

  async function loadVisitors() {
    try {
      const res = await fetch("/api/admin/visitors");
      if (!res.ok) return;
      const data = await res.json();
      setVisitors(data);
    } catch {
      /* non-fatal -- the rest of the dashboard still works */
    }
  }

  async function loadSecurity() {
    setSecurityStatus("loading");
    try {
      const res = await fetch("/api/admin/security");
      if (!res.ok) {
        setSecurityStatus("error");
        return;
      }
      const data = await res.json();
      setSecurity({ admins: data.admins || [], rateLimitBlocks24h: data.rateLimitBlocks24h || [] });
      setSecurityStatus("ok");
    } catch {
      setSecurityStatus("error");
    }
  }

  function toggleSecurity() {
    const next = !securityOpen;
    setSecurityOpen(next);
    if (next && securityStatus === "idle") loadSecurity();
  }

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

  async function loadAudit() {
    setAuditStatus("loading");
    try {
      const res = await fetch("/api/admin/audit?limit=100");
      if (!res.ok) {
        setAuditStatus("error");
        return;
      }
      const data = await res.json();
      setAuditLog(Array.isArray(data.log) ? data.log : []);
      setAuditStatus("ok");
    } catch {
      setAuditStatus("error");
    }
  }

  function toggleAudit() {
    const next = !auditOpen;
    setAuditOpen(next);
    if (next && auditStatus === "idle") loadAudit();
  }

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

  const utmSources = useMemo(() => {
    const entries = Object.entries(metrics?.utmSources ?? {});
    entries.sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
    return { entries, total };
  }, [metrics]);

  const visitorSources = useMemo(() => {
    const entries = Object.entries(visitors?.bySource ?? {});
    entries.sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
    return { entries, total };
  }, [visitors]);

  const ctaClicks = useMemo(() => {
    const entries = Object.entries(visitors?.ctaClicks ?? {});
    entries.sort((a, b) => b[1] - a[1]);
    return entries;
  }, [visitors]);

  // The named product funnel from ChatGPT's Aug 23 2026 homepage review:
  // Visitors -> Start Free -> Sign Up -> Complete Onboarding -> Create
  // First Paycheck -> Checkout Started -> Paid, with Returning shown
  // alongside rather than as a linear step (a user can come back before or
  // after paying). The first two steps are last-30-day, anonymous/session
  // counts (page_view / cta_clicked); everything from Signed Up onward is
  // an all-time cohort of the same non-admin profiles from
  // /api/admin/funnels, so those step-to-step rates are exact, not
  // estimated -- the jump from "Start Free clicks" to "Signed Up" is the
  // one directional comparison in this list (different time windows,
  // anonymous vs. account-based).
  const productFunnelSteps = useMemo(() => {
    const startFreeClicks = Object.entries(visitors?.ctaClicks ?? {})
      .filter(([cta]) => cta.startsWith("get_started"))
      .reduce((sum, [, n]) => sum + n, 0);
    const pf = funnels?.productFunnel;
    const steps = [
      { key: "visitors", label: "Visitors (30d)", count: visitors?.uniqueVisitors.last30 ?? null },
      { key: "start_free", label: "Start Free clicked (30d)", count: visitors ? startFreeClicks : null },
      { key: "signed_up", label: "Signed up", count: pf?.signups ?? null },
      { key: "onboarded", label: "Completed onboarding", count: pf?.onboarded ?? null },
      { key: "activated", label: "Created first paycheck", count: pf?.activated ?? null },
      { key: "checkout_started", label: "Started checkout", count: pf?.checkoutStarted ?? null },
      { key: "paid", label: "Paid", count: pf?.paid ?? null },
    ];
    return steps.map((s, i) => {
      const prev = i > 0 ? steps[i - 1].count : null;
      const pct =
        prev !== null && prev > 0 && s.count !== null ? Math.round((s.count / prev) * 1000) / 10 : null;
      return { ...s, pctOfPrev: i === 0 ? null : pct };
    });
  }, [visitors, funnels]);

  // Visitors -> Signups -> Activated -> Paid, per traffic source. Visitors is
  // last-30-days (from the same page_view-derived bySource the "Visitors by
  // source" card above uses); signups/activated/paid are all-time cohort
  // counts from app/api/admin/funnels, joined by the same source key
  // AttributionCapture assigns everywhere else (utm_source, or "direct").
  // The two halves aren't the same time window -- that's called out in the
  // table caption rather than implied as a single clean ratio.
  const sourceFunnel = useMemo(() => {
    const keys = new Set([
      ...Object.keys(visitors?.bySource ?? {}),
      ...Object.keys(funnels?.bySource ?? {}),
    ]);
    const rows = Array.from(keys).map((src) => {
      const v = visitors?.bySource?.[src] ?? 0;
      const f = funnels?.bySource?.[src] ?? { signups: 0, activated: 0, paid: 0 };
      const conversionPct = f.signups > 0 ? Math.round((f.paid / f.signups) * 1000) / 10 : null;
      return { source: src, visitors: v, signups: f.signups, activated: f.activated, paid: f.paid, conversionPct };
    });
    rows.sort((a, b) => b.paid - a.paid || b.signups - a.signups || b.visitors - a.visitors);
    return rows;
  }, [visitors, funnels]);

  // Same shape one level more granular -- by campaign, or "campaign •
  // content" when a video/ad id was tagged (utm_content). This is what
  // answers "which specific video converted" rather than just "which
  // platform" -- e.g. youtube • debt_payoff • video_047. Top 10 by paid,
  // then signups, so the table stays readable as campaign count grows.
  const campaignFunnel = useMemo(() => {
    const entries = Object.entries(funnels?.byCampaign ?? {});
    const rows = entries.map(([campaign, f]) => ({
      campaign,
      signups: f.signups,
      activated: f.activated,
      paid: f.paid,
      conversionPct: f.signups > 0 ? Math.round((f.paid / f.signups) * 1000) / 10 : null,
    }));
    rows.sort((a, b) => b.paid - a.paid || b.signups - a.signups);
    return rows.slice(0, 10);
  }, [funnels]);

  // Single source of truth for both export formats -- built from the exact
  // same derived values already rendered on this page, so the CSV/PDF can
  // never show a different number than the dashboard itself.
  const reportData: MarketingReportData = useMemo(() => {
    const planTotalForReport =
      PLAN_ORDER.reduce((s, k) => s + (metrics?.planCounts?.[k] ?? 0), 0) || 1;
    const marketingEvents =
      events && Object.keys(events.totals).length > 0
        ? Object.keys(EVENT_LABELS).map((key) => ({
            label: EVENT_LABELS[key],
            last30: events.last30[key] ?? 0,
            allTime: events.totals[key] ?? 0,
          }))
        : [];
    return {
      generatedAt: new Date(),
      overview: {
        totalUsers: metrics?.totalUsers ?? 0,
        signups30: metrics?.signups30 ?? 0,
        activeSubs: metrics?.activeSubs ?? 0,
        mrr: metrics?.mrr ?? 0,
        paidUsers: metrics?.paidUsers ?? 0,
        conversionPct: metrics?.conversion ?? 0,
        canceledSubs: metrics?.canceledSubs ?? 0,
      },
      cost: {
        gross: cost.gross,
        stripeFees: cost.stripeFees,
        plaidCost: cost.plaidCost,
        net: cost.net,
        marginPct: cost.margin,
        activeConnected: cost.activeConnected,
      },
      planMix: PLAN_ORDER.map((k) => {
        const n = metrics?.planCounts?.[k] ?? 0;
        return { label: PLAN_LABELS[k], count: n, pct: (n / planTotalForReport) * 100 };
      }),
      signupSources: sources.entries.map(([label, count]) => ({
        label,
        count,
        pct: (count / sources.total) * 100,
      })),
      utmSources: utmSources.entries.map(([label, count]) => ({
        label,
        count,
        pct: (count / utmSources.total) * 100,
      })),
      visitorTraffic: visitors
        ? {
            visitorsToday: visitors.uniqueVisitors.today,
            visitors7d: visitors.uniqueVisitors.last7,
            visitors30d: visitors.uniqueVisitors.last30,
            pageViews30d: visitors.pageViews.last30,
            pageViewsAllTime: visitors.pageViews.allTime,
          }
        : null,
      visitorSources: visitorSources.entries.map(([label, count]) => ({
        label,
        count,
        pct: (count / visitorSources.total) * 100,
      })),
      ctaClicks: ctaClicks.map(([cta, count]) => ({ cta, count })),
      marketingEvents,
      productFunnel: productFunnelSteps.map((s) => ({
        label: s.label,
        count: s.count,
        pctOfPrev: s.pctOfPrev,
      })),
      sourceFunnel,
      campaignFunnel,
      referrals: {
        topReferrers: funnels?.topReferrers ?? [],
        completedTotal: funnels?.referralsCompletedTotal ?? 0,
        monthlyRevenue: funnels?.referralRevenueMonthly ?? 0,
      },
    };
  }, [metrics, cost, sources, utmSources, visitors, visitorSources, ctaClicks, events, productFunnelSteps, funnels, sourceFunnel, campaignFunnel]);

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

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-700 bg-[#0f172a] p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Marketing report</h2>
            <p className="mt-1 text-xs text-gray-500">
              Export everything on this page -- signups, traffic, funnels, campaigns, referrals -- as a CSV or a formatted PDF.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadMarketingReportCsv(reportData)}
              disabled={status !== "ok"}
              className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-[#1a233a] disabled:opacity-50"
            >
              <FileSpreadsheet size={15} /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => downloadMarketingReportPdf(reportData)}
              disabled={status !== "ok"}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <FileText size={15} /> Export PDF
            </button>
          </div>
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

          <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Traffic source (auto-detected)</h2>
            <p className="mt-1 text-xs text-gray-500">
              Captured automatically from UTM links or referrer on each visitor&apos;s first visit -- no self-report needed.
            </p>
            {utmSources.entries.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No data yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {utmSources.entries.map(([src, n]) => (
                  <li key={src} className="text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span className="capitalize">{src}</span>
                      <span className="text-gray-400">{n} ({Math.round((n / utmSources.total) * 100)}%)</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-800">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${(n / utmSources.total) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {visitors && (
          <div className="mt-4 rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-emerald-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Visitor traffic
              </h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Anonymous + logged-in page views, counted by a first-party visitor cookie (not an
              account). This is top-of-funnel: everyone who landed on the site, not just people who
              signed up -- compare against "Traffic source" below to see visitor -&gt; signup
              conversion per channel.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-800 px-3 py-2">
                <p className="text-xs text-gray-500">Visitors today</p>
                <p className="mt-1 text-lg font-semibold text-white">{visitors.uniqueVisitors.today}</p>
              </div>
              <div className="rounded-xl border border-gray-800 px-3 py-2">
                <p className="text-xs text-gray-500">Visitors (7d)</p>
                <p className="mt-1 text-lg font-semibold text-white">{visitors.uniqueVisitors.last7}</p>
              </div>
              <div className="rounded-xl border border-gray-800 px-3 py-2">
                <p className="text-xs text-gray-500">Visitors (30d)</p>
                <p className="mt-1 text-lg font-semibold text-white">{visitors.uniqueVisitors.last30}</p>
              </div>
              <div className="rounded-xl border border-gray-800 px-3 py-2">
                <p className="text-xs text-gray-500">Page views (30d)</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {visitors.pageViews.last30}
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    / {visitors.pageViews.allTime} all-time
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Visitors by source (30d)
                </p>
                {visitorSources.entries.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-400">No data yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {visitorSources.entries.map(([src, n]) => (
                      <li key={src} className="text-sm">
                        <div className="flex justify-between text-gray-300">
                          <span className="capitalize">{src}</span>
                          <span className="text-gray-400">
                            {n} ({Math.round((n / visitorSources.total) * 100)}%)
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-800">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${(n / visitorSources.total) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <MousePointerClick size={13} /> Top CTA clicks (30d)
                </p>
                {ctaClicks.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-400">No clicks tracked yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {ctaClicks.map(([cta, n]) => (
                      <li key={cta} className="flex items-center justify-between text-gray-300">
                        <span>{cta}</span>
                        <span className="text-gray-400">{n}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {funnels?.productFunnel && (
          <div className="mt-4 rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Product funnel
              </h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Visitor &rarr; Start Free &rarr; Sign Up &rarr; Onboarded &rarr; First Paycheck &rarr;
              Checkout &rarr; Paid. The first two steps are last-30-day anonymous traffic;
              everything from "Signed up" onward is an all-time cohort of the same accounts, so
              those step-to-step rates are exact conversions, not estimates.
            </p>
            <div className="mt-4 space-y-2.5">
              {productFunnelSteps.map((s) => {
                const max = productFunnelSteps[0]?.count || 1;
                const widthPct = s.count !== null ? Math.max(2, Math.round((s.count / max) * 100)) : 0;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="w-44 shrink-0 text-xs text-gray-400">{s.label}</div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <div className="w-16 shrink-0 text-right text-sm font-semibold text-white">
                      {s.count === null ? (
                        <span className="text-xs font-normal text-gray-500">--</span>
                      ) : (
                        s.count
                      )}
                    </div>
                    <div className="w-14 shrink-0 text-right text-xs text-gray-500">
                      {s.pctOfPrev === null ? "" : `${s.pctOfPrev}%`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-3 text-sm">
              <span className="text-gray-400">Returning (active on a later calendar day)</span>
              <span className="font-semibold text-white">
                {funnels.productFunnel.returning}
                <span className="ml-1 text-xs font-normal text-gray-500">
                  of {funnels.productFunnel.signups} signups
                </span>
              </span>
            </div>
          </div>
        )}

        {events && (Object.keys(events.totals).length > 0 ? (
          <div className="mt-4 rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Marketing &amp; product events (last 30 days / all-time)
              </h2>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.keys(EVENT_LABELS).map((key) => (
                <div key={key} className="rounded-xl border border-gray-800 px-3 py-2">
                  <p className="text-xs text-gray-500">{EVENT_LABELS[key]}</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {events.last30[key] ?? 0}
                    <span className="ml-1 text-xs font-normal text-gray-500">
                      / {events.totals[key] ?? 0} all-time
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {events.recent.length > 0 && (
              <div className="mt-4 border-t border-gray-800 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Recent activity
                </p>
                <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-sm">
                  {events.recent.slice(0, 10).map((e) => (
                    <li key={e.id} className="flex items-center justify-between text-gray-400">
                      <span className="text-gray-300">{EVENT_LABELS[e.event_name] || e.event_name}</span>
                      <span className="text-xs">{new Date(e.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null)}

        {funnels && (
          <div className="mt-4 rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Percent size={16} className="text-emerald-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Conversion funnels
              </h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Cohort-based, not simple ratios -- signup-to-paid only counts users tracked since
              events went live. Rates are directional until there's more volume.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-800 px-3 py-2">
                <p className="text-xs text-gray-500">Signup &rarr; paid subscription</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {funnels.signupToPaid.ratePct === null ? (
                    <span className="text-sm font-normal text-gray-500">Not enough data yet</span>
                  ) : (
                    <>
                      {funnels.signupToPaid.ratePct}%
                      <span className="ml-1 text-xs font-normal text-gray-500">
                        ({funnels.signupToPaid.paid} of {funnels.signupToPaid.signups})
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-gray-800 px-3 py-2">
                <p className="text-xs text-gray-500">Money Quiz &rarr; plan unlocked</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {funnels.moneyScoreToUnlock.ratePct === null ? (
                    <span className="text-sm font-normal text-gray-500">Not enough data yet</span>
                  ) : (
                    <>
                      {funnels.moneyScoreToUnlock.ratePct}%
                      <span className="ml-1 text-xs font-normal text-gray-500">
                        ({funnels.moneyScoreToUnlock.unlocked} of {funnels.moneyScoreToUnlock.completed})
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-gray-800 px-3 py-2">
                <p className="text-xs text-gray-500">Credit cards connected (Autopilot), all-time</p>
                <p className="mt-1 text-lg font-semibold text-white">{funnels.bankConnectedTotal}</p>
              </div>
              <div className="rounded-xl border border-gray-800 px-3 py-2">
                <p className="text-xs text-gray-500">Referrals completed, all-time</p>
                <p className="mt-1 text-lg font-semibold text-white">{funnels.referralsCompletedTotal}</p>
              </div>
              <div className="rounded-xl border border-gray-800 px-3 py-2">
                <p className="text-xs text-gray-500">Est. revenue from referrals (monthly)</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  ${funnels.referralRevenueMonthly.toFixed(2)}
                </p>
              </div>
            </div>

            {funnels.topReferrers.length > 0 && (
              <div className="mt-4 border-t border-gray-800 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Top referrers
                </p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {funnels.topReferrers.map((r) => (
                    <li key={r.email} className="flex items-center justify-between text-gray-300">
                      <span className="truncate">{r.email}</span>
                      <span className="text-gray-400">{r.count} completed</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {sourceFunnel.length > 0 && (
          <div className="mt-4 rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Conversion by source
              </h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Visitors is last 30 days (top-of-funnel traffic); Signups/Activated/Paid are
              all-time, joined by the same source. "Activated" means the account added its first
              paycheck. Conversion is Paid &divide; Signups.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4">Visitors (30d)</th>
                    <th className="py-2 pr-4">Signups</th>
                    <th className="py-2 pr-4">Activated</th>
                    <th className="py-2 pr-4">Paid</th>
                    <th className="py-2 pr-4">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sourceFunnel.map((row) => (
                    <tr key={row.source}>
                      <td className="py-2 pr-4 capitalize text-gray-200">{row.source}</td>
                      <td className="py-2 pr-4 text-gray-300">{row.visitors}</td>
                      <td className="py-2 pr-4 text-gray-300">{row.signups}</td>
                      <td className="py-2 pr-4 text-gray-300">{row.activated}</td>
                      <td className="py-2 pr-4 text-gray-300">{row.paid}</td>
                      <td className="py-2 pr-4 font-semibold text-white">
                        {row.conversionPct === null ? (
                          <span className="font-normal text-gray-500">--</span>
                        ) : (
                          `${row.conversionPct}%`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {campaignFunnel.length > 0 && (
          <div className="mt-4 rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Top campaigns
              </h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Only signups tagged with a utm_campaign link show up here -- this is where a
              specific video or ad (utm_content) shows up as its own row, e.g.
              "debt_payoff • video_047". Top 10 by paid, all-time.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="py-2 pr-4">Campaign</th>
                    <th className="py-2 pr-4">Signups</th>
                    <th className="py-2 pr-4">Activated</th>
                    <th className="py-2 pr-4">Paid</th>
                    <th className="py-2 pr-4">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {campaignFunnel.map((row) => (
                    <tr key={row.campaign}>
                      <td className="py-2 pr-4 text-gray-200">{row.campaign}</td>
                      <td className="py-2 pr-4 text-gray-300">{row.signups}</td>
                      <td className="py-2 pr-4 text-gray-300">{row.activated}</td>
                      <td className="py-2 pr-4 text-gray-300">{row.paid}</td>
                      <td className="py-2 pr-4 font-semibold text-white">
                        {row.conversionPct === null ? (
                          <span className="font-normal text-gray-500">--</span>
                        ) : (
                          `${row.conversionPct}%`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                    {u.utm_source && (
                      <span className="mt-0.5 block text-xs capitalize text-blue-400">
                        {u.utm_source}
                        {u.utm_campaign ? ` • ${u.utm_campaign}` : ""}
                        {u.utm_content ? ` • ${u.utm_content}` : ""}
                      </span>
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

        <div className="mt-6 rounded-2xl border border-gray-700 bg-[#0f172a] shadow-sm">
          <button
            type="button"
            onClick={toggleAudit}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
              <History size={16} /> Admin audit log
            </span>
            <span className="text-xs text-gray-500">{auditOpen ? "Hide" : "Show"}</span>
          </button>

          {auditOpen && (
            <div className="border-t border-gray-700 px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">Most recent 100 admin actions (newest first).</p>
                <button
                  type="button"
                  onClick={loadAudit}
                  disabled={auditStatus === "loading"}
                  className="flex items-center gap-1 rounded-lg border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-[#1a233a] disabled:opacity-50"
                >
                  <RefreshCw size={12} className={auditStatus === "loading" ? "animate-spin" : ""} /> Refresh
                </button>
              </div>

              {auditStatus === "loading" && (
                <p className="py-6 text-center text-sm text-gray-400">Loading...</p>
              )}
              {auditStatus === "error" && (
                <p className="py-6 text-center text-sm text-rose-300">Could not load the audit log.</p>
              )}
              {auditStatus === "ok" && auditLog.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">No admin actions recorded yet.</p>
              )}
              {auditStatus === "ok" && auditLog.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="px-3 py-2">When</th>
                        <th className="px-3 py-2">Action</th>
                        <th className="px-3 py-2">Target</th>
                        <th className="px-3 py-2">By</th>
                        <th className="px-3 py-2">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {auditLog.map((row) => (
                        <tr key={row.id}>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-400">
                            {new Date(row.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-[#1a233a] px-2 py-0.5 text-xs font-medium text-gray-200">
                              {AUDIT_ACTION_LABELS[row.action] || row.action}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-300">{row.target_email || row.target_id || "-"}</td>
                          <td className="px-3 py-2 text-gray-400">{row.actor_email || row.actor_id}</td>
                          <td className="px-3 py-2 text-gray-500">
                            {row.metadata && Object.keys(row.metadata).length > 0
                              ? JSON.stringify(row.metadata)
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-gray-700 bg-[#0f172a] shadow-sm">
          <button
            type="button"
            onClick={toggleSecurity}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
              <ShieldAlert size={16} /> Security
            </span>
            <span className="text-xs text-gray-500">{securityOpen ? "Hide" : "Show"}</span>
          </button>

          {securityOpen && (
            <div className="border-t border-gray-700 px-5 py-4 space-y-6">
              {securityStatus === "loading" && (
                <p className="py-6 text-center text-sm text-gray-400">Loading...</p>
              )}
              {securityStatus === "error" && (
                <p className="py-6 text-center text-sm text-rose-300">Could not load security data.</p>
              )}
              {securityStatus === "ok" && security && (
                <>
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Admin accounts &amp; 2FA
                    </h3>
                    <ul className="mt-2 divide-y divide-gray-800">
                      {security.admins.map((a) => (
                        <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                          <span className="text-gray-200">{a.email}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              a.hasVerifiedFactor
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-500/10 text-rose-300"
                            }`}
                          >
                            {a.hasVerifiedFactor ? "2FA verified" : "No verified 2FA"}
                          </span>
                        </li>
                      ))}
                      {security.admins.length === 0 && (
                        <li className="py-2 text-sm text-gray-400">No admin accounts found.</li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Rate-limit blocks, last 24h
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      IPs that exceeded 5 requests/hour on a public subscribe form -- an early signal of
                      bot or scraper traffic.
                    </p>
                    {security.rateLimitBlocks24h.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-400">No rate-limit blocks in the last 24 hours.</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-gray-800">
                        {security.rateLimitBlocks24h.map((r, i) => (
                          <li key={i} className="flex items-center justify-between py-2 text-sm">
                            <span className="text-gray-300">
                              {r.bucket} <span className="text-gray-500">from</span> {r.ip}
                            </span>
                            <span className="text-gray-400">{r.count} requests</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
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