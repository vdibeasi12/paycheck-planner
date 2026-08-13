# Paycheck Planner — Handoff (v3)

_Last updated: 2026-08-14. This supersedes the old HANDOFF.md (dated June 14) and the various handoff notes referenced inside past sessions. Written so a brand-new chat can pick up this project with zero prior context and not repeat mistakes already made and fixed._

---

## 0. What this is

**Paycheck Planner** — a personal-finance SaaS: paycheck-based budgeting, debt payoff planning, AI guidance, optional bank sync. Vince is the sole developer, infosec officer, and admin — solo-built.

- **Stack:** Next.js 16 (App Router, Turbopack) · React · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + RLS) · Stripe · Plaid · Resend (email) · Capacitor (iOS/Android wrapper)
- **Company:** DiBeasi Global Investment LLC
- **Domain:** paycheckplanner.ai
- **GitHub:** `vdibeasi12/paycheck-planner` (public)
- **Vercel project:** `prj_xDm0OJOckVVE24SRQ8HueehQvLBM`, team `team_dpgf1dxygj6zGmeT7rjCWpHD`
- **Supabase project:** `smozaweywvhtkecqqyau` (Pro, daily backups)
- **Android app ID:** `com.dibeasi.paycheckplanner`
- **Admin account:** security@paycheckplanner.ai (`is_admin=true`)
- **Pricing tiers:** Free / Momentum / Accelerate / Autopilot (internal codes `free`/`starter`/`premium`/`connected`). Annual pricing = "2 months free."
- **Local repo:** `C:\Users\Test-Laptop\paycheck-planner-UPDATED\paycheck-planner` on Vince's machine (device name "personal-lap"). A stale, unused `paycheck-planner-flat` folder also exists — ignore it.

---

## 1. How work actually gets done here — READ THIS FIRST

This is the single most important section. Getting this wrong wastes a full round-trip and frustrates Vince.

1. **Delivery mechanism (current, as of this session):** Claude runs in a Cowork/cloud session with **device-bridge access** to Vince's local repo folder (`mcp__remote-devices__*` tools). Claude reads real files from his machine (`device_stage_files`), edits them locally, verifies them, and **writes finished files directly back onto his machine** (`device_commit_files`) — not just as chat attachments.
2. **git commands cannot be run remotely** — there's no git credential access from this sandbox. So every round of file changes must **also** end with a `commit-and-push.ps1` script (git add / commit / push / status) that Vince runs himself in PowerShell on his machine. This is a **standing requirement** — always deliver it automatically, never wait to be asked.
3. **`*.ps1` is gitignored in this repo.** The many `apply-*.ps1` / `*-fix.ps1` files visible in a directory listing are local-only delivery scratch files from past sessions, not tracked in git. Don't assume they reflect current app state.
4. **Vince wants the script pasted as literal text in the chat reply**, in addition to being sent as a file and written directly to his machine. He got frustrated (Aug 14) when this only arrived as a downloadable attachment — treat "paste the script inline" as a hard requirement, not optional politeness.
5. **When a round touches multiple files, send them all together, git commands only at the very end, no narrative breaks mid-sequence.** (Feedback given after an earlier session interleaved scripts and commentary.)
6. **CRLF vs LF:** not every file in the repo shares one line-ending convention. Some files are LF (most recently-touched app/lib files), some are CRLF (older files, most config files like `tailwind.config.js`). **Always check a file's actual line endings before editing it** (`grep -c $'\r' file`), strip CRLF before using string-based edits if present, and reapply CRLF on delivery only if the file was originally CRLF. Verify with `od -c` that no double-CRLF corruption was introduced.
7. **Verify before delivering, for real, not just "looks right":** for any nontrivial TypeScript/React change, set up an isolated `/tmp` project with the actual dependency versions installed (`next`, `react`, `@supabase/ssr`, etc.) and run a real `tsc -p tsconfig.json`. For Tailwind config changes, run a real isolated Tailwind build and inspect the compiled CSS output — don't just trust the config syntax. This standard was raised explicitly after an assumption-based fix (see §3, the University 404) turned out to be wrong.
8. **After Vince says something is live, re-check it yourself** — use the Vercel MCP tools (`list_deployments` then `get_deployment_build_logs` with `errorsOnly: true` — a top-level READY state does not guarantee a clean build) and `WebFetch` the actual production URLs. **`WebFetch` has its own ~15-minute cache** — if you fetched a URL earlier in the same conversation and need a fresh read after a new deploy, append a cache-busting query string (`?v=2`) or you'll get stale results and draw the wrong conclusion.
9. Two duplicate config files exist: root `tailwind.config.js` (active — has the `@tailwindcss/typography` plugin) and `app/tailwind.config.js` (probably dead, but kept in sync defensively "just in case"). Same pattern for `postcss.config.js` (not yet fully investigated).

---

## 2. Current platform status

- **Web:** live at paycheckplanner.ai, actively developed, this is the primary product surface.
- **Android:** submitted to Google Play Production track, AAB version code 7 / v1.0.5 as of the last version bump noted. IARC rating live. Play Store Organization account conversion done.
- **iOS:** native Capacitor platform added and builds/runs in Simulator (Google sign-in + MFA confirmed working there), but **blocked on Apple Developer Program enrollment**, which has been stuck "under review" for roughly a month (support case ID 20000119965504). A refurbished M1 MacBook Air was ordered for Xcode Cloud setup — check whether it arrived and whether Apple approval has come through before resuming iOS work.
- **Compliance:** Plaid security questionnaire approved (3/3). Access Controls / Information Security / Data Retention policy docs generated.

---

## 3. This session's work in detail (Aug 13–14, 2026)

This was one continuous Cowork session. In order:

**Report page collapsed into Payoff Plan.** Vince: "collapse Report into just being a download PDF action on the Payoff Plan page." `/report` now just `redirect("/amortization")`. The Report nav link was removed from Sidebar. The previously-orphaned `DownloadSummaryButton` (+ `lib/generateSummaryPdf.ts`) is now wired into `/amortization`'s header, gated behind that page's existing Accelerate-tier check (`canUseAmortization`). This silently raised the effective tier for that PDF export from Momentum to Accelerate — `lib/plans.ts`'s public `FEATURE_GROUPS` "PDF reports & export" row was updated to `starter:false` to keep the pricing page honest. `canUseReports()` was removed from `lib/permissions.ts` (dead code after the collapse).

**Calendar + "Upcoming (30 days)" merged into one page.** There used to be two separate things: a sidebar drawer (`CalendarPeek.tsx`, only pulled debts+income, missing bills) and the full `/calendar` page (only pulled bills+income, missing debts) — meaning **neither view was ever complete and they could disagree with each other.** Fixed by rebuilding `/calendar` as a 2-column layout (month grid + agenda on the left, an always-visible "Upcoming (30 days)" panel on the right) that pulls bills+debts+income consistently for both halves. `CalendarPeek.tsx` is now orphaned/unused (no delete capability via the device bridge, so it's still sitting in the repo — safe to manually delete).

**Sidebar decluttered.** Vince: "the financial hub already has these tools so the sidebar can be cleaned up ... don't want the sidebar too cluttered." Removed `/calculators` and `/challenge` from the sidebar (both already surfaced as cards on Financial Hub / `/blog`). Kept `/university` in the sidebar since it isn't a Financial Hub card and has its own per-user progress tracking.

**Payoff Plan Download button was covered by the fixed language/currency widget.** Sidebar.tsx renders a `fixed top-4 right-4` widget (desktop only) that floats over whatever's at the top-right of the viewport. Nothing reserved space for it, so the new `DownloadSummaryButton` sat underneath it. Fixed **once, in the shared root layout** (`app/layout.tsx`, `md:pt-20` on `<main>` for logged-in users) instead of patching it page-by-page, so the same bug can't recur on some other page later.

**University 404 — the real bug, found the hard way.** Vince reported `/university/budgeting` still 404ing across *multiple* rounds. The first (wrong) theory was that PowerShell's glob handling of `git add app/university/[course]` was silently dropping those files from commits. That was disproven this session by pulling the actual Vercel build logs (the routes were present and built) and fetching the files straight from GitHub (they were genuinely committed). **The real bug:** both `app/university/[course]/page.tsx` and `.../[lesson]/page.tsx` destructured `params` synchronously (`{ params }: { params: { course: string } }`). This repo runs **Next.js 16.3.0**, where `params` became a `Promise` in Server Components starting with Next 15 — so `params.course` was always `undefined`, `getCourse(undefined)` returned nothing, and `notFound()` fired on every request. Fixed both files to `async function` + `await params`, matching the already-correct pattern in `app/calculators/[slug]/page.tsx` in the same repo. **Lesson: when something "should be committed" keeps 404ing, check the actual runtime behavior/build output before assuming it's a delivery problem.**

**University content + sequential unlock (new feature, not just a bugfix).** Vince: "content should be add to all" + "complete budgeting then paychecks unlocks... complete paychecks then debt payoff unlocks, etc." `lib/university.ts` was rewritten: all 6 courses (Budgeting, Paychecks, Debt Payoff, Saving, Credit, Financial Freedom) now have **real** lesson content — 30 lessons total, no more "this is a placeholder" text, `comingSoon` is `false` everywhere. New helpers `isCourseFullyComplete` / `getUnlockedMap` / `isCourseUnlocked` compare a signed-in user's `university_progress` rows against each course's lesson keys. Budgeting is always open; every later course unlocks only once **every lesson** in the course immediately before it is marked complete. This is enforced in two places: the catalog (`app/university/page.tsx`, shows "Complete X first" / "Sign in to unlock" instead of a generic badge) and the course detail page (`app/university/[course]/page.tsx`, shows a real locked state server-side too, so typing a locked course's URL directly doesn't skip the gate). **Explicitly not built:** lesson-by-lesson ordering *within* a course — only course-level gating was requested. Vince mentioned that once all 6 courses have been reviewed by users, a future batch of additional courses may be added.

**Font/typography, three rounds of feedback:**
1. "font should be a little lighter throughout the app so it doesn't look too dark" → added `theme.extend.fontWeight` to both `tailwind.config.js` files (`semibold: 500, bold: 600, extrabold: 700`), remapping every existing `font-semibold`/`font-bold`/`font-extrabold` usage app-wide with zero per-component changes.
2. "font still hasn't changed much, should be a little whiter" (a color complaint, not weight) → added `theme.extend.colors.gray` override: `400` remapped to the old `300` hex, `500` to the old `400` hex.
3. "can you make the font a little more white" → pushed one more step: `300`/`400` now render as the old `200` hex (`#e5e7eb`), `500` as the old `300` hex (`#d1d5db`).
Borders (`gray-700`/`800`) were deliberately left untouched through all three rounds so panels don't wash out. Each pass was verified against a real compiled Tailwind CSS build before delivery — **Vince said "it's better now we'll leave as it is" after round 3, so don't push this further unless he asks again.**

All of the above landed in production. Confirmed via Vercel deployment `dpl_2a6niU6se7f3qUnomJyzkTbjJi65` (commit `2cb4eab`), clean build, and live spot-checks: `/university/budgeting` loads with all 5 real lessons, the catalog correctly shows "Sign in to unlock" on locked courses, and hitting a locked course URL directly shows the real locked-state page.

---

## 4. Broader feature inventory (everything shipped before this session, for context)

- **Core:** debt payoff simulation engine (`lib/payoffSimulate.ts` — the canonical one; `lib/financeEngine.ts` is now a thin shim delegating to it), Snowball/Avalanche comparison, Payoff Plan PDF + CSV export, dashboard charts, AI chat/insights.
- **Bank sync:** Plaid integration (Liabilities product only — Auth/Transactions explicitly declined for cost; checking-only banks with no card/loan remain unconnectable, an accepted tradeoff), bank balance sync mirrored into `assets` for net worth.
- **i18n:** language + currency selectors, 7 non-English locales + en-AU/en-GB, most-but-not-all pages translated (~37 of ~40 pages were still untranslated as of the last check — verify current status before assuming full coverage).
- **Marketing/growth:** Financial Hub (blog, URL stays `/blog` for SEO equity, 15 posts queued through 2027-02-22), referral program (3-referral → free→starter bump), `/worksheet` lead magnet + 6-email drip, 6 free calculators at `/calculators/[slug]`, 30-Day Challenge + drip, Money Score quiz (`/money-score`), 4 daily Vercel crons (bill-reminders, blog-notify, lead-magnet-drip, challenge-drip).
- **Admin:** visitor/traffic tracking (page views, CTA clicks, visitor-by-source), conversion funnels, recent activity feed, UTM/referrer attribution capture.
- **Security:** MFA (TOTP or email code, optional except hard-gated on the Autopilot bank-connect flow), custom Supabase auth domain, various RLS lockdowns from an Aug 13 full security audit (all fixed same day).

---

## 5. Known open items / things to check on pickup

- **Verify University is actually live and behaving** as described in §3 if a meaningful amount of time has passed — don't assume it's still fine without re-checking (use fresh `WebFetch` with a cache-busting query param).
- **`CalendarPeek.tsx`** is orphaned/dead code, still sitting in the repo. Ask Vince to delete it, or do it yourself if you have shell/git access in a future session.
- **`app/api/bills/create`** still lacks real type validation (low risk, RLS-scoped, flagged in the Aug 13 security audit, not yet fixed).
- **Blog posts don't cross-link the other lead-gen pages** (worksheet, challenge, calculators) — flagged, not fixed.
- **Referral program is only visible on `/account`**, never surfaced on public marketing pages.
- **All 4 subscriber tables (blog/lead-magnet/challenge/university-waitlist) were still at 0 real rows** as of the last audit — worth checking whether that's changed.
- **iOS is blocked purely on Apple Developer Program review** — check status before resuming any iOS-specific work.
- **~37 of ~40 pages were still not fully translated** into the 7 non-English locales as of the last i18n check.
- **Two duplicate `tailwind.config.js`/`postcss.config.js` file pairs exist** — the root ones are confirmed active; the `app/` ones are kept in sync defensively but their actual usage was never conclusively proven either way.

---

## 6. Technical gotchas worth remembering

- `prevent_self_privilege_escalation` trigger requires `select set_config('request.jwt.claim.role','service_role',true)` before a manual `UPDATE profiles.plan` via Supabase MCP.
- Supabase MCP `execute_sql`/`apply_migration` run as the service role and bypass RLS — can't be used to simulate anon-role user experience. Schema changes via `apply_migration` must also be committed as `.sql` files under `supabase/migrations/`.
- The real server-side Supabase client is `@/lib/supabase/server` (cookie-based, works in Server Components/Route Handlers). `@/lib/supabase/client` is localStorage-only and only valid in Client Components — mixing these up previously caused a 23-file bug where pages silently returned zero rows under RLS.
- Granting `EXECUTE` on a Postgres function via a migration can get silently re-granted to `anon`/`authenticated` by Supabase's default privileges the next time the function is (re)created — always re-verify with `has_function_privilege` after any function migration that's supposed to restrict access.
- A persistent "middleware → proxy" deprecation warning appears in every Vercel build log and is safe to ignore.

---

_If picking this up fresh: read §1 first, it's the process that avoids repeating this session's friction. Then skim §3 for the most recent state of the app. §5 is the actual to-do list._
