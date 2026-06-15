# Paycheck Planner — Project Handoff (v2)

_Last updated: 2026-06-14. This supersedes the previous HANDOFF.md. It captures everything done in this session so work can continue in a new chat without losing context._

---

## 0. TL;DR — what changed this session

1. **The app now builds.** It previously did not. `next build` completes cleanly: **47/47 routes, TypeScript passes, production build green.**
2. **Built all missing modules** (the headline blocker) with real, validated finance math — not stubs.
3. **Fixed several build-breakers the prior handoff didn't know about** (broken Stripe route, deprecated Supabase imports, missing `createClient` exports, a Suspense error, type errors).
4. **Decision made on Apple + Stripe:** Stripe stays on the **web**; it is **platform-gated out of the native app** so the App Store has no in-app purchase to reject. Implemented this session.
5. **Fixed the mobile viewport / iOS safe-area** handling.

Outstanding before store submission: Google sign-in in the webview, native features for Apple Guideline 4.2, and the actual iOS/Android project generation. Details in §6–§8.

---

## 1. What this is

**Paycheck Planner** — a personal-finance web app (debt payoff, paycheck budgeting, goals) being prepared for iOS/Android.

- **Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind · Supabase (auth + Postgres + storage) · Stripe (web only) · recharts · jsPDF.
- **Company:** DiBeasi Global Investment LLC · support email: support@paycheckplanner.ai
- **GitHub:** https://github.com/vdibeasi12/paycheck-planner
- **Vercel:** https://paycheckplanner-snowy.vercel.app
- **Mobile plan:** Capacitor shell loading the live Vercel URL (remote-URL webview, not a static export — the app relies on API routes, middleware, and server-side auth). See `MOBILE_SETUP.md`.

---

## 2. Built and validated THIS session

### 2a. Missing modules — created with real math (not placeholders)

The original codebase imported 9 modules/components that never existed; nothing built until these were created. All consumers were read first to derive exact exports/signatures.

- **`lib/financeEngine.ts`** — the core. One month-by-month amortization simulator (`simulatePayoff`) with correct snowball/avalanche ordering and the freed-minimum rollover ("snowball") effect. Exports `Debt`, `Strategy`, `TimelinePoint`, `PayoffResult`, `simulatePayoff`, `calculatePayoffTimeline`, `calculateDebtFreeMonths`. Has a 1200-month safety cap and a `paidOff` flag for the negative-amortization case (minimums don't cover interest).
- **`lib/payoffEngine.ts`** — thin wrapper over `financeEngine` so both share identical math + `Debt` shape. Exports `calculatePayoff`, `calculateDebtFreeTimeline`.
- **`lib/previewEngine.ts`** — `getDebtSummary` (months, monthlyInterest, totalBalance) for the paywall card.
- **`lib/financeInsights.ts`** — `calculateDebtFreeDate` (returns a readable date string, or "Not on track"), `calculateTotalInterestPaid`, `calculatePotentialSavings`.
- **`lib/safeArray.ts`** — `safeArray()` (named + default export).
- **`lib/useSafeArray.ts`** — `useSafeArray()` memoized hook.
- **`lib/referral.ts`** — `generateReferralCode(userId)` (deterministic, stable per user).
- **`lib/email.ts`** — lazy, fail-safe Resend client. (The naive version threw at build time when `RESEND_API_KEY` was missing — would also crash those routes in production. Now no-ops gracefully if unconfigured.)
- **`app/components/AIPayoffStrategy.tsx`** — self-fetching component using the real engine; shows debt-free time, total interest, snowball<->avalanche comparison, and the ordered payoff plan.

**Math validation run this session:**
- $1,000 @ 0% APR, $100/mo min -> exactly **10 months, $0 interest**
- Extra $200/mo correctly shortens the timeline
- Avalanche total interest <= Snowball

### 2b. Build-breakers fixed (not in the prior handoff)

- **`@/lib/supabase` and `@/lib/supabase/client`** were imported with `{ createClient }` but never exported it -> added a `createClient()` export to both (returns the shared singleton, no duplicate GoTrue instances).
- **`/report`** used the deprecated `createClientComponentClient` from `@supabase/auth-helpers-nextjs` -> switched to the browser client.
- **Broken Stripe checkout route:** `app/stripe/checkout/route.ts` was an incomplete fragment (referenced undefined `stripe`, `priceId`, `user`; not even a valid module) and sat at the **wrong path**. The frontend posts to `/api/stripe/checkout`, which didn't exist. -> Removed the broken file; wrote a proper `app/api/stripe/checkout/route.ts` (auth check, default price, returns `{ url }`).
- **`/login`** used `useSearchParams()` without a Suspense boundary -> hard Next 16 build failure. Wrapped in `<Suspense>`.
- **Stripe `apiVersion`** mismatch (`"2024-06-20"` vs the installed SDK's expected version) in `billing` + `webhook` routes -> updated.
- Type errors fixed: `analytics` setState string/number, `admin/users` map typing, `PieCard` recharts formatter, `layout.tsx` user typing, `PaywallCard` passing `user` to a propless `UpgradeButton`, `DebtStrategyRace`/`DebtProgress` required-prop usage (made optional), `ScenarioSimulator` (was misusing a component import; now uses `simulatePayoff`), and removed unused `@ts-expect-error` directives in `generateSummaryPdf`.
- **Dashboard** now fetches real debts and passes `totalDebt` / `monthlyPayments` to `SummaryCards` + `DebtList` (was rendering them propless and failing typecheck).

### 2c. Mobile viewport / iOS safe area

- `app/layout.tsx`: moved `viewport` out of the deprecated `metadata` field into a proper `export const viewport` with `viewportFit: "cover"` + `themeColor`. (This also cleared ~20 build warnings.)
- Added `env(safe-area-inset-top)` padding to the sticky header so it clears the iPhone notch/Dynamic Island, and bottom safe-area padding in `globals.css` for the home indicator.

---

## 3. Apple + Stripe decision (IMPORTANT — read before re-adding payments)

**Goal:** ship on both Apple App Store and Google Play with the least approval risk.

**Decision: keep Stripe on the web, gate it OUT of the native app for v1.** Stripe was **not deleted** from the repo (that would also kill working web revenue). Instead the purchase UI is hidden whenever the app runs inside the Capacitor shell.

### Why (2026 context — verify before relying on it; this area is in active litigation)
- Since the **April 2025 Epic v. Apple** ruling, US apps **can** include external payment links commission-free — but the link **must open the system browser (Safari), not the in-app webview**, and requires Apple's External Purchase Link entitlement + a disclosure sheet.
- **December 2025:** the Ninth Circuit said Apple may eventually charge a "reasonable" fee; the case continues (possible Supreme Court review). The commission-free window is real today but uncertain.
- Apple **Guideline 3.1.1** still bans selling digital subscriptions via a non-Apple flow *inside* the app (e.g. Stripe checkout in a webview).
- Apple **Guideline 4.2** (minimum functionality) is a *separate* risk for any thin web-wrapper, independent of payments.
- Google Play has analogous rules (Play Billing; User Choice Billing at a reduced fee) but is generally more lenient toward webview wrappers.

Net: the fastest path to approval on both stores is **no in-app purchase action in v1**. Monetize on the web now; choose a mobile monetization path later (§8).

### What was implemented this session
- **`lib/platform.ts`** — `isNativeApp()` (event-handler safe) + `useIsNativeApp()` (mount-safe hook; returns `null` until known, then `true`/`false`).
- Gated all four purchase entry points so they never present a buy action in the native app:
  - `app/components/UpgradeButton.tsx` — renders nothing on native.
  - `app/components/UpgradeModel.tsx` — renders nothing on native.
  - `app/components/PaywallOverlay.tsx` — keeps the "locked feature" UI but replaces the buy button with a neutral "Manage your plan at paycheckplanner.ai" note.
  - `app/pricing/page.tsx` — paid-tier CTAs route to `/signup` instead of initiating checkout on native. **Also fixed a real bug here:** it was POSTing to `/api/checkout` (nonexistent) instead of `/api/stripe/checkout`.
- Detection works in a remote-URL webview because Capacitor injects `window.Capacitor` into the page.

**To verify the gate after wrapping:** load the app on a device/simulator and confirm no upgrade buttons appear and the pricing page CTAs go to signup. On the web, everything is unchanged.

---

## 4. Supabase project (unchanged from prior handoff)

- **Project ref:** `smozaweywvhtkecqqyau` (name: `Paycheck_Planner_ai`)
- **URL:** `https://smozaweywvhtkecqqyau.supabase.co`
- **Postgres 17**, 18+ tables (profiles, debts, bills, assets, income, subscriptions, financial_goals, documents, etc.)

Changes already applied to the DB in earlier sessions (still in place): `on_auth_user_created` trigger auto-creates a `profiles` row per signup; `is_admin boolean` on `profiles`; repaired the `premium-demo@paycheckplanner.ai` account (premium + admin); `documents` table + private `documents` storage bucket with per-user RLS; per-user RLS on `financial_goals`.

**Still to verify:** that the `debts` table columns match what the engine expects — the code reads `balance`, `interest_rate`, `minimum_payment`, `name`, `user_id`. Confirm these exist and are populated.

---

## 5. Environment / config

`.env.local` (project root) must contain — **do not commit this file**:
```
NEXT_PUBLIC_SUPABASE_URL=https://smozaweywvhtkecqqyau.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<legacy anon key, eyJ...>      # Settings > API Keys > Legacy tab
SUPABASE_SERVICE_ROLE_KEY=<legacy service_role key, eyJ...>  # server only, secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_STARTER_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_STARTER_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY=price_...
NEXT_PUBLIC_APP_URL=https://paycheckplanner-snowy.vercel.app   # used for Stripe redirect URLs
RESEND_API_KEY=re_...     # optional; product emails no-op gracefully if absent
OPENAI_API_KEY=...        # optional; only for a future true-AI checklist
```
Set the same vars in **Vercel -> Project -> Settings -> Environment Variables** so the deployed app (and therefore the wrapped mobile app) works.

### Security to-dos (carried over — still worth doing)
- Rotate any OpenAI key that was ever committed to `app/.env`; `git rm --cached app/.env`; keep secrets in `.env.local` / Vercel only.
- If `Move90daysnorec@*` was a reused personal password, change it (it was exposed in earlier screen-sharing).

### Google OAuth (still outstanding from before)
Provider was misconfigured (domain pasted as Client ID, a password as the secret). Create an OAuth client in Google Cloud (project `paycheckplanner-3fea9`), **Web application** type:
- Authorized redirect URI: `https://smozaweywvhtkecqqyau.supabase.co/auth/v1/callback`
- JS origins: `http://localhost:3000` + the Vercel URL
Paste the real Client ID + `GOCSPX-` secret into Supabase -> Auth -> Providers -> Google. **See §6 for the webview caveat.**

---

## 6. Mobile: what still needs doing before submission

### 6a. Google sign-in will likely FAIL in the webview
Google blocks OAuth inside embedded webviews (`disallowed_useragent`). The current login does `supabase.auth.signInWithOAuth({ provider: "google", ... })`, which navigates inside the webview. In the native app this will probably error.
**Fix:** use `@capacitor/browser` to open the OAuth URL in the **system browser**, then deep-link back into the app. Pattern: get the provider URL from Supabase with `skipBrowserRedirect: true`, open it with `Browser.open`, and handle the callback via a custom URL scheme / App Links + `@capacitor/app`'s `appUrlOpen` listener, exchanging the code for a session. Email/password login is unaffected and works today.

### 6b. Apple Guideline 4.2 (minimum functionality)
A pure remote-URL webview risks rejection. Add native touches so it doesn't read as "just a website":
- Push notifications (bill reminders, payoff milestones) — strong fit for this app.
- Native splash screen + status bar styling (`@capacitor/splash-screen`, `@capacitor/status-bar` are installed but not initialized in code yet).
- Biometric app lock (Face ID / fingerprint) — appropriate for a finance app.
- Native camera for the document/bill capture instead of the web file input (`@capacitor/camera`).
- Haptics, offline handling beyond the static `www/index.html`.
- Android hardware back-button handling (`@capacitor/app` back-button listener).

None of these are wired into the app code yet (no `@capacitor/*` runtime imports in `app/` or `lib/`).

### 6c. Generate the native projects (on a Mac for iOS)
The `ios/` and `android/` folders don't exist yet. On a Mac with Xcode + Android Studio:
```
npm install
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios       # or: npx cap open android
```
`capacitor.config.ts` is set: `appId: com.dibeasi.paycheckplanner`, `appName: Paycheck Planner`, `server.url` -> the Vercel URL, `webDir: www` (offline fallback only). **The `appId` becomes the permanent iOS Bundle ID / Android applicationId — confirm it before first submission.**

### 6d. Deploy flow reminder
Because the shell loads the live Vercel URL, **any app change must be pushed + redeployed to Vercel** to appear in the wrapped app. Only native-shell changes (icons, plugins, config) require a new store build.

---

## 7. Known remaining issues / cleanup (non-blocking; app builds and runs)

- **Paywall copy is inconsistent:** `app/components/PaywallCard.tsx` hardcodes "$9/month" and "7-day free trial", but the real tiers in `lib/plans.ts` are Starter $3/mo·$33/yr and Premium $6/mo·$66/yr. Make `plans.ts` the single source of truth everywhere.
- **Two different `Debt` shapes exist** in older components (`{interest, minimum}` vs the engine's `{interest_rate, minimum_payment}`). The engine and its direct consumers are consistent; some legacy components (e.g. `ScenarioSimulator`, `DebtProgress`) use the short field names and are mapped where needed. Worth unifying eventually.
- **`middleware.ts`**: Next 16 warns "middleware is deprecated, use proxy." Functional today; rename to `proxy.ts` when convenient.
- **Empty states:** several dashboard widgets show "..." or zeros before data loads. Fine, but a small loading/empty polish pass would improve first-run UX.
- **`/api/finance`, `/api/ai`, `/api/chat`** exist but weren't audited this session.

---

## 8. Mobile monetization — pick later (after v1 is approved)

When ready to charge on mobile, choose one:
- **(A) External payment link (US):** open the system browser to the Stripe checkout. Currently commission-free in the US but requires Apple's External Purchase Link entitlement + disclosure sheet, and the legal situation may change. Keeps one Stripe backend for web + mobile.
- **(B) Native IAP:** Apple StoreKit + Google Play Billing. Fully compliant everywhere; 15% under Apple's Small Business Program (<$1M/yr) and after year one; most native work; needs server-side receipt validation wired into the `subscriptions` table.

The platform gate from §3 makes either path additive — flip the gate to show the appropriate flow on native without touching the web.

---

## 9. How to run / build / deploy

```
# Local dev
npm install
# create .env.local per §5
npm run dev            # http://localhost:3000

# Production build (run this to confirm nothing is broken)
npm run build          # currently: 47/47 routes, green

# Deploy: push to GitHub -> Vercel auto-deploys (or `vercel --prod`)

# Wrap for mobile (Mac for iOS), after deploying:
npx cap add ios && npx cap add android
npx cap sync
npx cap open ios   # / android
```

Test login: `premium-demo@paycheckplanner.ai` (premium + admin). Password unknown — try `DemoPassword123!`, else use Forgot Password, or sign up fresh and have an admin promote it.

Routes worth reviewing: `/pricing`, `/goals`, `/documents`, `/insights`, `/account`, `/admin`, `/dashboard`, `/debts`, `/report`.

---

## 10. File-change manifest for this session

New files:
- `lib/financeEngine.ts`, `lib/payoffEngine.ts`, `lib/previewEngine.ts`, `lib/financeInsights.ts`
- `lib/safeArray.ts`, `lib/useSafeArray.ts`, `lib/referral.ts`
- `lib/email.ts` (lazy Resend), `lib/platform.ts` (native detection)
- `app/components/AIPayoffStrategy.tsx`
- `app/api/stripe/checkout/route.ts`

Edited:
- `lib/supabase.ts`, `lib/supabase/client.ts` (added `createClient`)
- `app/layout.tsx` (viewport export, safe area, user typing), `app/globals.css` (safe-area CSS)
- `app/login/page.tsx` (Suspense), `app/report/page.tsx` (supabase import)
- `app/api/billing/route.ts`, `app/api/webhook/route.ts` (Stripe apiVersion)
- `app/analytics/page.tsx`, `app/api/admin/users/route.ts`, `app/components/charts/PieCard.tsx`
- `app/components/PaywallCard.tsx`, `app/components/DebtStrategyRace.tsx`, `app/components/DebtProgress.tsx`, `app/components/ScenarioSimulator.tsx`
- `app/dashboard/page.tsx` (fetch + pass debt data)
- `lib/generateSummaryPdf.ts` (ts directives)
- Gating: `app/components/UpgradeButton.tsx`, `UpgradeModel.tsx`, `PaywallOverlay.tsx`, `app/pricing/page.tsx`

Removed:
- `app/stripe/checkout/route.ts` (broken fragment; replaced by `app/api/stripe/checkout/route.ts`)
