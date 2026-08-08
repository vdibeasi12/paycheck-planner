# Marketing attribution part 1
[Environment]::CurrentDirectory = (Get-Location).Path
$ErrorActionPreference = "Stop"
$global:anyFail = $false

$f_app_components_AttributionCapture_tsx = @'
"use client"

import { useEffect } from "react"

const COOKIE_NAME = "pp_attr"
const COOKIE_DAYS = 30

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

// Friendly-name known referrer hostnames so "how they found the app" is
// still useful even when a link isn't UTM-tagged (e.g. an organic Google
// result, or someone pasting a YouTube video link with no tracking params).
function classifyReferrer(hostname: string): string {
  const host = hostname.toLowerCase()
  if (host.includes("google")) return "google"
  if (host.includes("youtube") || host.includes("youtu.be")) return "youtube"
  if (host.includes("facebook") || host.includes("fb.com") || host.includes("fb.me")) return "facebook"
  if (host.includes("instagram")) return "instagram"
  if (host.includes("tiktok")) return "tiktok"
  if (host.includes("twitter") || host.includes("x.com") || host.includes("t.co")) return "twitter"
  if (host.includes("reddit")) return "reddit"
  if (host.includes("linkedin")) return "linkedin"
  if (host.includes("bing")) return "bing"
  if (host.includes("duckduckgo")) return "duckduckgo"
  if (host.includes("pinterest")) return "pinterest"
  return host
}

// Captures where a visitor first arrived from -- UTM params if present,
// otherwise a classified referrer, otherwise "direct" -- into a first-party
// cookie. Read later at signup time (app/auth/callback/route.ts) to attach
// real marketing attribution to new accounts. Fires once per device: the
// first visit wins and is never overwritten by later visits.
export default function AttributionCapture() {
  useEffect(() => {
    if (getCookie(COOKIE_NAME)) return

    try {
      const params = new URLSearchParams(window.location.search)
      const utmSource = params.get("utm_source")
      const utmMedium = params.get("utm_medium")
      const utmCampaign = params.get("utm_campaign")

      let source = utmSource
      if (!source && document.referrer) {
        try {
          const refHost = new URL(document.referrer).hostname
          if (refHost && refHost !== window.location.hostname) {
            source = classifyReferrer(refHost)
          }
        } catch {
          // malformed referrer URL -- ignore, falls through to "direct"
        }
      }
      if (!source) source = "direct"

      const medium = utmMedium || (utmSource ? "unknown" : document.referrer ? "referral" : "none")

      const attribution = {
        source,
        medium,
        campaign: utmCampaign || null,
        referrer: document.referrer || null,
      }

      setCookie(COOKIE_NAME, JSON.stringify(attribution), COOKIE_DAYS)
    } catch {
      // Attribution is a nice-to-have -- never let it throw in the app shell.
    }
  }, [])

  return null
}

'@
$dir_f_app_components_AttributionCapture_tsx = Split-Path "app/components/AttributionCapture.tsx" -Parent
if ($dir_f_app_components_AttributionCapture_tsx -and -not (Test-Path $dir_f_app_components_AttributionCapture_tsx)) { New-Item -ItemType Directory -Path $dir_f_app_components_AttributionCapture_tsx -Force | Out-Null }
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/components/AttributionCapture.tsx"), $f_app_components_AttributionCapture_tsx, (New-Object System.Text.UTF8Encoding($false)))
$c_f_app_components_AttributionCapture_tsx = Select-String -Path "app/components/AttributionCapture.tsx" -Pattern "AttributionCapture" -SimpleMatch
if ($c_f_app_components_AttributionCapture_tsx) { Write-Host "OK   app/components/AttributionCapture.tsx" -ForegroundColor Green } else { Write-Host "FAIL app/components/AttributionCapture.tsx" -ForegroundColor Red; $global:anyFail = $true }

$f_app_layout_tsx = @'
import "./globals.css"
import Link from "next/link"
import Logo from "./components/Logo"
import Footer from "./components/Footer"
import NativeInit from "./components/NativeInit"
import AttributionCapture from "./components/AttributionCapture"
import AppNav from "./components/AppNav"
import Sidebar from "./components/Sidebar"
import FloatingChat from "./components/FloatingChat"
import FeedbackWidget from "./components/FeedbackWidget"
import LocaleCurrencySelector from "./components/LocaleCurrencySelector"
import { LocaleProvider } from "@/lib/i18n/LocaleProvider"
import type { LocaleCode, CurrencyCode } from "@/lib/i18n/config"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "Paycheck Planner - Debt Payoff & Financial Planning Tools",
  description: "Free AI-powered financial planning tools to eliminate debt, track bills, and achieve financial freedom. Compare debt payoff strategies and get personalized recommendations.",
  keywords: ["debt payoff", "financial planning", "debt calculator", "bill tracker", "AI financial advisor"],
  authors: [{ name: "DiBeasi Global Investment LLC" }],
  creator: "DiBeasi Global Investment LLC",
  openGraph: {
    title: "Paycheck Planner - Take Control of Your Finances",
    description: "Free AI-powered financial planning tools to eliminate debt and achieve financial freedom.",
    url: "https://paycheckplanner.ai",
    siteName: "Paycheck Planner",
    images: [
      {
        url: "/logo.png",
        width: 200,
        height: 200,
        alt: "Paycheck Planner Logo",
      },
    ],
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // lets content extend under the notch; we pad with safe-area insets
  themeColor: "#020617",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user: any = null
  let locale: LocaleCode | undefined
  let currency: CurrencyCode | undefined

  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data?.user || null

    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("locale, display_currency")
        .eq("id", user.id)
        .single()
      locale = (prof?.locale as LocaleCode) || undefined
      currency = (prof?.display_currency as CurrencyCode) || undefined
    }
  } catch (error) {
    // Supabase not configured or error - continue without auth
    user = null
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#020617" />
      </head>
      <body className="bg-[#020617] text-white">
        <LocaleProvider initialLocale={locale} initialCurrency={currency}>
          <NativeInit />
          <AttributionCapture />

          {/* Logged-in users get the left sidebar (desktop) + mobile drawer. */}
          {user && <Sidebar />}

          {/* Content column. Shifted right of the fixed sidebar on desktop. */}
          <div className={`flex min-h-screen flex-col ${user ? "md:pl-64" : ""}`}>

            {/* Logged-out visitors keep the original marketing top bar. */}
            {!user && (
              <header className="border-b border-gray-800 bg-[#020617]/95 backdrop-blur sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                <div className="w-full px-6 py-4 flex flex-wrap gap-y-3 justify-between items-center">
                  <Link href="/" className="flex items-center hover:opacity-80 transition">
                    <Logo size="md" />
                  </Link>

                  <div className="flex items-center gap-4">
                    <LocaleCurrencySelector inline />
                    <AppNav loggedIn={false} />
                  </div>
                </div>
              </header>
            )}

            <main className="flex-1">
              {children}
            </main>

            <Footer />
          </div>

          {user && <FloatingChat />}
          {user && <FeedbackWidget />}
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  )
}
'@
$dir_f_app_layout_tsx = Split-Path "app/layout.tsx" -Parent
if ($dir_f_app_layout_tsx -and -not (Test-Path $dir_f_app_layout_tsx)) { New-Item -ItemType Directory -Path $dir_f_app_layout_tsx -Force | Out-Null }
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/layout.tsx"), $f_app_layout_tsx, (New-Object System.Text.UTF8Encoding($false)))
$c_f_app_layout_tsx = Select-String -Path "app/layout.tsx" -Pattern "AttributionCapture" -SimpleMatch
if ($c_f_app_layout_tsx) { Write-Host "OK   app/layout.tsx" -ForegroundColor Green } else { Write-Host "FAIL app/layout.tsx" -ForegroundColor Red; $global:anyFail = $true }

$f_app_auth_callback_route_ts = @'
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

// Reads the first-touch attribution cookie set by AttributionCapture
// (app/components/AttributionCapture.tsx) and attaches it to the profile,
// but only for a genuinely fresh signup -- never overwrites an existing
// user's attribution just because they logged back in via Google.
async function attachAttributionIfFreshSignup(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) return

    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at, utm_source")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile || profile.utm_source) return

    const isFreshSignup =
      profile.created_at &&
      Date.now() - new Date(profile.created_at).getTime() < 10 * 60 * 1000
    if (!isFreshSignup) return

    const cookieStore = await cookies()
    const raw = cookieStore.get("pp_attr")?.value
    if (!raw) return

    const attr = JSON.parse(decodeURIComponent(raw)) as {
      source?: string
      medium?: string
      campaign?: string | null
      referrer?: string | null
    }

    await supabase
      .from("profiles")
      .update({
        utm_source: attr.source || null,
        utm_medium: attr.medium || null,
        utm_campaign: attr.campaign || null,
        signup_referrer: attr.referrer || null,
      })
      .eq("id", user.id)
  } catch {
    // Attribution is a nice-to-have -- never block a real login over it.
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Surface the real reason instead of silently bouncing home.
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  await attachAttributionIfFreshSignup(supabase)

  // On Vercel the incoming request host can be an internal address. Trust the
  // forwarded host so the just-set session cookie (scoped to the public
  // domain) is actually sent on the redirect to /dashboard.
  const forwardedHost = request.headers.get("x-forwarded-host")
  const isLocal = process.env.NODE_ENV === "development"
  const base = isLocal
    ? origin
    : forwardedHost
    ? `https://${forwardedHost}`
    : origin

  return NextResponse.redirect(`${base}${next}`)
}

'@
$dir_f_app_auth_callback_route_ts = Split-Path "app/auth/callback/route.ts" -Parent
if ($dir_f_app_auth_callback_route_ts -and -not (Test-Path $dir_f_app_auth_callback_route_ts)) { New-Item -ItemType Directory -Path $dir_f_app_auth_callback_route_ts -Force | Out-Null }
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/auth/callback/route.ts"), $f_app_auth_callback_route_ts, (New-Object System.Text.UTF8Encoding($false)))
$c_f_app_auth_callback_route_ts = Select-String -Path "app/auth/callback/route.ts" -Pattern "attachAttributionIfFreshSignup" -SimpleMatch
if ($c_f_app_auth_callback_route_ts) { Write-Host "OK   app/auth/callback/route.ts" -ForegroundColor Green } else { Write-Host "FAIL app/auth/callback/route.ts" -ForegroundColor Red; $global:anyFail = $true }

$f_app_api_admin_users_route_ts = @'
import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, logAdminAction } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

function monthlyValue(tier: string | null, planType: string | null) {
  const monthly =
    tier === "connected" ? 11.99 : tier === "premium" ? 6.99 : tier === "starter" ? 3.99 : 0;
  const annual =
    tier === "connected" ? 119.99 : tier === "premium" ? 69.99 : tier === "starter" ? 39.99 : 0;
  const isAnnual = planType === "annual" || planType === "yearly";
  return isAnnual ? annual / 12 : monthly;
}

const ASSIGNABLE_PLANS = ["free", "starter", "premium", "connected"];

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const q = (new URL(req.url).searchParams.get("q") || "").toLowerCase();
  const sb = serviceClient();

  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = list?.users || [];

  const [{ data: profiles }, { data: subs }] = await Promise.all([
    sb.from("profiles").select("id, plan, is_admin, signup_source, utm_source, utm_medium, utm_campaign"),
    sb.from("subscriptions").select("user_id, tier, status, plan_type, current_period_end"),
  ]);

  const pMap = new Map((profiles || []).map((p) => [p.id, p]));
  const sMap = new Map<string, any>();
  (subs || []).forEach((s) => {
    if (!sMap.has(s.user_id)) sMap.set(s.user_id, s);
  });

  let rows = authUsers.map((u) => {
    const p = pMap.get(u.id);
    const s = sMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "(no email)",
      created_at: u.created_at,
      plan: p?.plan ?? "free",
      is_admin: !!p?.is_admin,
      signup_source: p?.signup_source ?? null,
      utm_source: p?.utm_source ?? null,
      utm_medium: p?.utm_medium ?? null,
      utm_campaign: p?.utm_campaign ?? null,
      sub_tier: s?.tier ?? null,
      sub_status: s?.status ?? null,
      sub_plan_type: s?.plan_type ?? null,
    };
  });

  if (q) rows = rows.filter((r) => r.email.toLowerCase().includes(q));
  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const now = Date.now();
  const signups30 = authUsers.filter(
    (u) => now - new Date(u.created_at).getTime() < 30 * 864e5
  ).length;
  const activeSubs = (subs || []).filter(
    (s) => s.status === "active" || s.status === "trialing"
  );
  const mrr = activeSubs.reduce((sum, s) => sum + monthlyValue(s.tier, s.plan_type), 0);

  const signupSources: Record<string, number> = {};
  (profiles || []).forEach((p) => {
    const src = ((p.signup_source as string | null) || "").trim() || "unknown";
    signupSources[src] = (signupSources[src] || 0) + 1;
  });

  // Auto-captured traffic attribution (UTM param or classified referrer),
  // separate from the self-reported "How did you hear about us?" dropdown
  // above -- this one is populated automatically for every new signup.
  const utmSources: Record<string, number> = {};
  (profiles || []).forEach((p) => {
    const src = ((p.utm_source as string | null) || "").trim() || "unknown";
    utmSources[src] = (utmSources[src] || 0) + 1;
  });

  // Plan mix across every user (no profile row -> counts as free).
  const planCounts: Record<string, number> = { free: 0, starter: 0, premium: 0, connected: 0 };
  authUsers.forEach((u) => {
    const plan = ((pMap.get(u.id)?.plan as string) || "free");
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  });
  const totalUsers = authUsers.length;
  const paidUsers = totalUsers - (planCounts.free || 0);
  const conversion = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;
  const canceledSubs = (subs || []).filter(
    (s) => s.status === "canceled" || s.status === "cancelled"
  ).length;

  return NextResponse.json({
    metrics: {
      totalUsers,
      signups30,
      activeSubs: activeSubs.length,
      mrr: Math.round(mrr * 100) / 100,
      signupSources,
      utmSources,
      planCounts,
      paidUsers,
      conversion: Math.round(conversion * 10) / 10,
      canceledSubs,
    },
    users: rows,
  });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  if (!body?.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Don't let an admin remove their own admin and lock themselves out.
  if (body.userId === gate.userId && body.is_admin === false) {
    return NextResponse.json({ error: "You can't remove your own admin access." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.plan === "string" && ASSIGNABLE_PLANS.includes(body.plan)) {
    update.plan = body.plan;
  }
  if (typeof body.is_admin === "boolean") update.is_admin = body.is_admin;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing valid to update" }, { status: 400 });
  }

  const sb = serviceClient();
  const { error } = await sb.from("profiles").update(update).eq("id", body.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit: resolve target email once for readable logs, then write one row per
  // distinct change (plan vs admin-grant/revoke).
  const { data: got } = await sb.auth.admin.getUserById(body.userId);
  const targetEmail = got?.user?.email ?? null;
  if (typeof update.plan === "string") {
    await logAdminAction({
      actorId: gate.userId,
      actorEmail: gate.userEmail,
      action: "plan_change",
      targetId: body.userId,
      targetEmail,
      metadata: { plan: update.plan },
    });
  }
  if (typeof update.is_admin === "boolean") {
    await logAdminAction({
      actorId: gate.userId,
      actorEmail: gate.userEmail,
      action: update.is_admin ? "grant_admin" : "revoke_admin",
      targetId: body.userId,
      targetEmail,
    });
  }

  return NextResponse.json({ ok: true });
}

// Permanently delete a user and purge all of their data. Guards: cannot delete
// yourself, cannot delete another admin (demote first), and the caller must pass
// the exact confirmEmail. Data purge runs in one transaction via the
// app_admin_purge_user function; then the auth user is removed.
export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const userId = body?.userId;
  const confirmEmail = body?.confirmEmail;

  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (userId === gate.userId) {
    return NextResponse.json({ error: "You can't delete your own account from here." }, { status: 400 });
  }

  const sb = serviceClient();

  const { data: got } = await sb.auth.admin.getUserById(userId);
  const email = got?.user?.email;
  if (!email) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (typeof confirmEmail !== "string" || confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Confirmation email does not match." }, { status: 400 });
  }

  const { data: prof } = await sb
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (prof?.is_admin) {
    return NextResponse.json(
      { error: "This user is an admin. Remove their admin access before deleting." },
      { status: 400 }
    );
  }

  // 1) Purge all app data in one transaction.
  //    (Plaid /item/remove will be called here once Plaid Phase 0 ships.)
  const { error: purgeErr } = await sb.rpc("app_admin_purge_user", { p_uid: userId });
  if (purgeErr) {
    return NextResponse.json({ error: "Data purge failed: " + purgeErr.message }, { status: 500 });
  }

  // 2) Remove the auth user (also revokes their sessions).
  const { error: authErr } = await sb.auth.admin.deleteUser(userId);
  if (authErr) {
    return NextResponse.json({ error: "Auth deletion failed: " + authErr.message }, { status: 500 });
  }

  await logAdminAction({
    actorId: gate.userId,
    actorEmail: gate.userEmail,
    action: "delete_user",
    targetId: userId,
    targetEmail: email,
  });

  return NextResponse.json({ ok: true, email });
}
'@
$dir_f_app_api_admin_users_route_ts = Split-Path "app/api/admin/users/route.ts" -Parent
if ($dir_f_app_api_admin_users_route_ts -and -not (Test-Path $dir_f_app_api_admin_users_route_ts)) { New-Item -ItemType Directory -Path $dir_f_app_api_admin_users_route_ts -Force | Out-Null }
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/api/admin/users/route.ts"), $f_app_api_admin_users_route_ts, (New-Object System.Text.UTF8Encoding($false)))
$c_f_app_api_admin_users_route_ts = Select-String -Path "app/api/admin/users/route.ts" -Pattern "utmSources" -SimpleMatch
if ($c_f_app_api_admin_users_route_ts) { Write-Host "OK   app/api/admin/users/route.ts" -ForegroundColor Green } else { Write-Host "FAIL app/api/admin/users/route.ts" -ForegroundColor Red; $global:anyFail = $true }

if ($global:anyFail) {
    Write-Host ""
    Write-Host "One or more files failed. Fix before running part 2." -ForegroundColor Red
} else {
    Write-Host ""
    Write-Host "Part 1 done. Now run attribution_part2.ps1" -ForegroundColor Cyan
}