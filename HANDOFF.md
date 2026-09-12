# Paycheck Planner — Handoff (v4)

_Last updated: 2026-09-06. This supersedes v3 (dated 2026-08-14, preserved below in §7 for anything not carried forward). Written so a brand-new chat can pick up this project with zero prior context and not repeat mistakes already made and fixed._

---

## 0. What this is

**Paycheck Planner** — a personal-finance SaaS: paycheck-based budgeting, debt payoff planning, AI guidance, optional bank sync. Vince is the sole developer, infosec officer, and admin — solo-built.

- **Stack:** Next.js 16 (App Router, Turbopack) · React · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + RLS) · Stripe · Plaid · Resend (email) · Capacitor (iOS/Android wrapper)
- **Company:** DiBeasi Global Investments LLC
- **Domain:** paycheckplanner.ai
- **GitHub:** `vdibeasi12/paycheck-planner` (public)
- **Vercel project:** `prj_xDm0OJOckVVE24SRQ8HueehQvLBM`, team `team_dpgf1dxygj6zGmeT7rjCWpHD`
- **Supabase project:** `smozaweywvhtkecqqyau` (Pro, daily backups). Vince's own `user_id`: `2ca0a790-1c6b-44dd-a3ba-ca28e6ca105e`.
- **Android app ID:** `com.dibeasi.paycheckplanner`
- **Admin account:** security@paycheckplanner.ai (`is_admin=true`)
- **Pricing tiers:** Free / Momentum / Accelerate / Autopilot (internal codes `free`/`starter`/`premium`/`connected`). Annual pricing = "2 months free."
- **Vince's machine:** Windows, device name `personal-lap`, connected folder `C:\Users\Test-Laptop\paycheck-planner-UPDATED\paycheck-planner`. A stale, unused `paycheck-planner-flat` folder also exists — ignore it.
- **Cloud-side work location:** git worktree at `/tmp/pp-check` (this session's environment, not Vince's machine).

---

## 1. How work actually gets done here — READ THIS FIRST

The delivery mechanism has **changed since v3** — the device bridge on Vince's current desktop does **not** expose `device_bash`. Confirm this at the start of a new session (check whether `mcp__remote-devices__device_bash` resolves via ToolSearch); if it's back, §1 of v3 above may apply again. As of this writing, assume it is absent and follow this instead:

1. **All code editing happens in the cloud workspace** (`/tmp/pp-check`), never directly on Vince's machine — there is no shell on his machine reachable from here.
2. **Before starting any new round of edits**: `git fetch origin && git reset --mixed origin/main` in `/tmp/pp-check`. Vince runs delivered `.ps1` scripts on his own machine asynchronously and often has already pushed since your last check — this has been true almost every round.
3. **Verify before delivering, for real:** `npx tsc --noEmit -p tsconfig.json; echo "TSC:$?"` plus the relevant `npx tsx lib/__tests__/*.test.ts` suites (see §3 for current counts). Deterministic hand-rolled harnesses (`assertEqual`/`assertTrue`, `process.exit(1)` on failure) — this is the established test style in `lib/__tests__/`, keep using it rather than introducing a new framework.
4. **Delivery path**: `SendUserFile` (display: "attach") the changed files → `mcp__remote-devices__device_commit_files` with `expectedMtimeMs` from a fresh `device_list_dir` call for any file that already exists on his machine (omit `expectedMtimeMs` only for brand-new files) → deliver a `push-*.ps1` script (full commit message + `git push`) the same way.
5. **`git commands cannot be run remotely`** — no git credential access from this sandbox. Every round of file changes must end with a script Vince runs himself. This is a standing requirement — always deliver it automatically, never wait to be asked.
6. **`*.ps1` is gitignored in this repo.** Past `apply-*.ps1` / `push-*.ps1` files visible in a directory listing are local-only delivery scratch, not tracked in git.
7. **PowerShell script safety — verify every single script before delivery, no exceptions:**
   - Dollar signs inside the commit message: backtick-dollar escape (`` `$ ``), never backslash.
   - Never use a backtick as an informal quote mark — it's an escape character before `t`/`n`/`r` in PowerShell. Use single quotes for emphasis instead.
   - No line may start with `<` immediately followed by a letter — a reproducible paste-corruption bug in Vince's PowerShell console silently drops such lines from large pastes. Workaround if truly needed: build the character as `[char]60 + 'a'`.
   - Always prepend `[Environment]::CurrentDirectory=(Get-Location).Path` to file-writing PowerShell blocks.
   - Never split `if/elseif/else` across multiple interactive console lines — the console executes each brace-balanced block immediately, orphaning later branches.
   - Verify commands before sending: `grep -n '`[^$]' file.ps1` (expect empty), `grep -n '^<[a-zA-Z]' file.ps1` (expect empty), `grep -c '`\ file.ps1` (sanity count of escaped dollars).
8. **CRLF vs LF:** not every file in the repo shares one line-ending convention (most recently-touched app/lib files are LF; some config files are CRLF). Check before editing (`grep -c $'\r' file`), strip CRLF before string-based edits if present, reapply only if the file was originally CRLF.
9. **After Vince says something is live, re-check it yourself** — Vercel MCP tools (`list_deployments` then `get_deployment_build_logs` with `errorsOnly: true`; a top-level READY state does not guarantee a clean build) and `WebFetch`/browser the actual production URLs. `WebFetch` caches for ~15 minutes — append a cache-busting query string (`?v=2`) if you need a fresh read after a new deploy in the same conversation.
10. **Deliver code as copy-paste-ready, 100% ASCII, no pseudocode/placeholders/demo stubs.** Full-file overwrites are the standard pattern; for surgical patches to large files use `.Replace()` with verified exact anchors and an abort guard.
11. **Always provide the exact git add/commit/push commands after every delivery**, not just on request — this applies to any delivery method, not just PowerShell scripts.
12. Supabase MCP tools (`execute_sql` etc.) were used this engagement **exclusively for read-only verification** against live production data — never to mutate data. Keep that boundary unless Vince explicitly asks otherwise.

## 1b. Vince's standing product/process directives

- **Root-cause first, prove it with data, never just declare something "fixed."** He does his own hand arithmetic against live screenshots and will call out discrepancies directly — treat that as a serious signal, not something to reassure away.
- Read the actual live repo and database before writing any code.
- **One shared calculation engine** across all obligation/financial displays — he has explicitly said he does not want two competing financial-calculation systems, and has caught and called out exactly this kind of drift before (see §3).
- Distinguish debt *balance* vs. *minimum payment* explicitly wherever both could be confused.
- Use `AskUserQuestion` for genuine product/policy calls only he can make (e.g., "how should the app treat an unconfirmed already-due bill") — implement his exact choice, don't guess.

---

## 2. Current platform status (last confirmed 2026-08-14, re-verify anything time-sensitive)

- **Web:** live at paycheckplanner.ai, actively developed, primary product surface.
- **Android:** submitted to Google Play Production track, AAB version code 7 / v1.0.5 as of last check. IARC rating live.
- **iOS:** native Capacitor platform builds/runs in Simulator (Google sign-in + MFA confirmed working), but **blocked on Apple Developer Program enrollment** (was stuck "under review," support case ID 20000119965504). Check current status before resuming iOS work.
- **Compliance:** Plaid security questionnaire approved (3/3). Access Controls / Information Security / Data Retention policy docs generated.

---

## 3. Financial calculation engine — status: FROZEN as of 2026-09-06, all shipped and confirmed run

**Do not touch the calculation engine again unless Vince explicitly reopens it.** His instruction: "freeze the financial calculation, then move to the visual redesign." Confirmed shipped and running in production (`git log origin/main`):

1. **Commit `10e605e`** — Root-caused a real, live bug: Safe to Spend showed **$3,377.77** with a required **$596.50** debt payment (Capital One Auto) silently missing from the reservation. Cause: `covered_by_transfer` was trusted with **zero** corroborating transfer-income rows on file. Fix: `lib/paycheckCycles.ts`'s `excludeTransferCoveredDebts()` now requires at least one real `income_type: "transfer"` row before honoring the flag at all (evidence-gated, not a full internal-vs-external-transfer-destination model — that harder problem is explicitly documented as an open, currently-unverifiable limitation in code comments and a dedicated test). Also unified "Next 7 Days" (Bills & Debts page) onto the same shared obligation engine via a new shared primitive, `nextItemOccurrence()` — replacing an ad hoc `statusOf()` in `app/bills-debts/page.tsx` that never checked `paid_through`/`bimonthly_parity` and had let Bills & Debts silently disagree with Safe to Spend about whether an item (Onity Mortgage) was settled.
2. **Commit `eb2e3a2`** — Two follow-ups from Vince's own hand arithmetic on a live screenshot:
   - *"Is Safe to Spend overstated by the $124.99 already-due bucket?"* — Confirmed real (Vince verified those 3 items — BitDefender, DiBeasi Global Investments, Meijer Mastercard — are "Still unpaid"). This is a genuine, inherent trust-boundary limit of a no-bank-feed app (it assumes a manually-entered balance already reflects cleared payments), not a math bug. Per Vince's explicit choice via `AskUserQuestion` ("add a warning, no math change"): no formula change; `PaycheckCountdown.tsx` and `SurvivalModeView.tsx` now show a plain amber warning banner naming the exact dollar amount whenever this bucket is nonzero.
   - *"Safe to Spend ends Sep 16, but 'Then what' jumps to Sep 30 — missing paycheck?"* — Confirmed NOT a bug (Sep 16 is the real next paycheck; "Then what" deliberately starts at the cycle after it, which Safe to Spend already covers). Fixed the display-only gap: added `windowStart` to `UpcomingCycleForecast` (`lib/planResilience.ts`) plus a range label ("Sep 16 → Sep 30") and caption in `PaycheckLookahead.tsx` making the continuation explicit instead of something to reverse-engineer.
3. **Commit `2e19b18`** — Found and fixed a serious, previously-unknown bug in `lib/debtPayoffSafety.ts`'s `computeDebtPayoffAffordability()` ("Can I pay this off?"), discovered specifically because Vince's separate "redefine Safe to Spend" critique (see below) prompted testing this *existing* feature rather than building a duplicate one. The function compared projected `runningBalance` across future paycheck cycles only against each other, **never against `input.startingCash`** — so when the very next paycheck comfortably covered near-term bills, every projected balance could read higher than today's actual cash, letting the function recommend paying off more debt than the user currently has. Live numbers: recommended **$5,159.67** against a real **$3,678.30** balance. Fix: `startingCash` is now itself a checkpoint in the tightest-point comparison. Corrected result: **$3,528.30** (`$3,678.30 - $150` reserve), `tightestDate: null` correctly meaning "today's own balance is the binding constraint," not a black box.

**Test suite counts after all three rounds** (run via `npx tsx lib/__tests__/<name>.test.ts`): `safeToSpend` 33/33, `cashBalance` 10/10, `planResilience` 13/13, `debtPayoffSafety` 15/15. All passing, `tsc` clean as of last verification.

**Separately raised, not a bug report — Vince's "redefine Safe to Spend" critique (2026-09-05/06):** He compared a $4,248.51/month combined bills+debts total against his $2,578.40 biweekly paycheck and argued Safe to Spend ($2,781.27) is "mathematically correct but financially misleading," proposing a three-number replacement (Current Balance / Committed Money / Financially Free Money) plus a prominent "Extra Debt Payment" figure. Response given: validated the underlying concern as correct but argued **against** renaming/redefining Safe to Spend itself (it's answering a different, also-valid question — "is this paycheck cycle covered," not "what's my monthly cash-flow reality"); this is what led to testing "Can I pay this off?" and finding the real bug in point 3 above, which already answers his actual underlying question once fixed. **Open, explicitly-deferred decision (his, not decided unilaterally):** whether/how to surface "Can I pay this off?" more prominently on the Dashboard (his "Extra Debt Payment" hero-number idea) — left for the visual redesign phase.

**Not started:** the full visual/UI redesign (light theme, "Money Already Committed" restructuring split into Bills/Debt Payments, "How we calculated this" expandable, Safe to Spend as hero). Explicitly frozen pending the above; this is next once Vince confirms he's satisfied with the calculation work.

---

## 4. Google Search Console audit — completed 2026-09-06, no code changes needed

Vince asked to "check google search console and fix the errors" (already open in his Chrome — Browser 1 / Windows, deviceId `d5990c88-96b7-4a3d-9001-dddfbbb03a8d`, selected via `mcp__claude-in-chrome__select_browser` after `AskUserQuestion` since multiple Chrome browsers were connected). Investigated via Claude in Chrome browser automation.

**Search Console UI quirks worth knowing if this needs revisiting:** row clicks in the "Why pages aren't indexed" table sometimes just select/highlight instead of navigating on the first click — use `find` to get a fresh `ref` for the exact row text and click that (`ref`s go stale after any navigation, so re-`find` every time); the drilldown pages' pagination arrows are unreliable via raw coordinates because a side detail panel shifts the layout — prefer scrolling to find the actual `<`/`>` glyphs fresh each time, or increase "Rows per page." `get_page_text` on this SPA often returns stale/cached content (the Overview table) instead of the current drilldown — use `screenshot` to actually read the current view.

**Finding: nothing is technically broken.** Live-tested `/pricing` via Search Console's own "Test Live URL" — crawl allowed, page fetch successful, indexing allowed, canonical correct. Full breakdown, 41 indexed / 58 not indexed:

- **7 pages, correctly excluded by design** (no action taken, none needed): `/ai-chat` and the `http://` (non-HTTPS) homepage URL both 30x-redirect exactly as intended — `/ai-chat` is in `middleware.ts`'s `PROTECTED` list, so an unauthenticated Googlebot request correctly bounces to `/login`. The `auth.paycheckplanner.ai` 404 is the Supabase Auth custom subdomain (confirmed via `grep` — nothing in the codebase links to it); it correctly has no page to serve at its root. 3 "alternate page with proper canonical tag" + 1 "duplicate without user-selected canonical" are UTM-tagged/query-param URLs (`?ref=betalist`, `?from=AppAgg.com&...`, `/login?redirectTo=/ai-chat`) correctly folding into their clean canonical.
- **31 pages, pure crawl-budget backlog** ("Discovered — currently not indexed"), not a bug: sitemap (`app/sitemap.ts`, generates `/sitemap.xml`) grew to 91 URLs, submitted Aug 10 2026, last read by Google Aug 31 2026. Every one of these 31 shows "Last crawled: N/A" in Search Console — Google has not yet fetched them at all, purely a queue-pacing artifact of a newly-expanded sitemap on a site with a lot of pages. Resolves with time on its own.
- **20 pages, "Crawled — currently not indexed."** 5 are correctly excluded (`/login`, `/signup`, `/privacy`, `/terms`, `/disclaimer` — nobody wants these ranking). The other **15 are legitimately important pages Google crawled successfully but has not yet chosen to index**: `/pricing`, `/features`, `/compare` + `/compare/ynab` + `/compare/everydollar` + `/compare/rocket-money`, `/calculators` + `/calculators/paycheck` + `/calculators/debt-payoff`, `/money-score`, `/budget-by-salary`, `/best-budgeting-apps-paycheck-to-paycheck`, `/blog/how-long-to-pay-off-credit-card-debt` (the exact post Search Console's own Overview page flags for a **2,400% impressions spike** — worth noting the apparent tension between "getting impressions" and "not indexed," most likely a reporting-lag artifact rather than two contradictory live states), and 1 university lesson (`/university/financial-freedom/turning-a-vague-goal-into-a-number-and-a-date`). This bucket's trend chart jumped from 0→20 in roughly the two weeks before this audit, coinciding with the sitemap's growth — reads as Google still evaluating a large recently-added batch, not a technical block.

**Action taken:** requested priority indexing (Search Console → URL Inspection → "Request Indexing," which auto-runs a live test first) on 11 of the 15 legitimately-important pages: `/pricing`, `/features`, `/compare`, `/compare/ynab`, `/compare/everydollar`, `/compare/rocket-money`, `/calculators`, `/money-score`, `/budget-by-salary`, `/best-budgeting-apps-paycheck-to-paycheck`, `/blog/how-long-to-pay-off-credit-card-debt`. Stopped there (effective daily manual-request quota in the Search Console UI is roughly 10-12).

**Not yet done, worth doing if this thread continues:**
- Request indexing on the remaining 3: `/calculators/paycheck`, `/calculators/debt-payoff`, `/university/financial-freedom/turning-a-vague-goal-into-a-number-and-a-date`.
- Re-check indexing status in ~1-2 weeks. If the 15 legitimate pages are *still* sitting in "Crawled — currently not indexed" after the priority-crawl requests and normal re-evaluation time, the next real hypothesis to test is content thinness/near-duplication — the salary pages (`/budget-on-30000-salary` through `-150000-salary`, 11 near-identical templated pages) and debt-payoff-amount pages (`/payoff-plan-for-1000-in-debt` through `-100000-in-debt`, 10 near-identical) and `/compare/*` (4 comparison pages, same template with the competitor name swapped) are the prime suspects for exactly this kind of quality signal — not something a technical fix resolves, would need genuinely differentiated content per page.
- **One minor, optional, NOT-yet-fixed finding:** `app/sitemap.ts` stamps every static/programmatic page (~89 of 91 URLs) with the exact same `lastModified` timestamp — `const now = new Date()` computed once at the top of the function and reused for every entry except blog posts (which correctly use `post.publishedAt`). This is a legitimate best-practice nit (Google may weight an obviously-fake freshness signal less) but was explicitly **not** identified as the cause of the non-indexing above, and fixing it properly would mean either sourcing a real per-page last-updated date (none of the underlying content in `lib/university.ts`, `lib/calculators.ts`, `lib/pseoPages.ts`, `lib/comparisons.ts` currently carries one) or using git-log-based dates (fragile in a serverless build environment, adds a build-time dependency on `.git` being present). Flagged to Vince as optional and low-priority — his call whether it's worth doing.

---

## 5. Broader feature inventory (context, mostly unchanged since v3 — re-verify anything load-bearing)

- **Core:** debt payoff simulation engine (`lib/payoffSimulate.ts` — canonical; `lib/financeEngine.ts` is a thin shim delegating to it), Snowball/Avalanche comparison, Payoff Plan PDF + CSV export, dashboard charts, AI chat/insights (`/ai-chat`, auth-gated).
- **Bank sync:** Plaid integration (Liabilities product only — Auth/Transactions declined for cost; checking-only banks with no card/loan remain unconnectable, accepted tradeoff), bank balance sync mirrored into `assets` for net worth.
- **i18n:** language + currency selectors, 7 non-English locales + en-AU/en-GB; ~37 of ~40 pages were still untranslated as of the last check (Aug 2026) — verify current status before assuming full coverage.
- **Marketing/growth:** Financial Hub (blog, URL stays `/blog` for SEO equity), referral program (3-referral → free→starter bump), `/worksheet` lead magnet + 6-email drip, free calculators at `/calculators/[slug]`, 30-Day Challenge + drip, Money Score quiz (`/money-score`), extensive `/university` course content (6 courses, 30 lessons, sequential unlock — see v3 §3 for the build details), programmatic salary/debt-payoff landing pages (`/budget-on-*-salary`, `/payoff-plan-for-*-in-debt`), comparison pages (`/compare/*`), and 13 daily Vercel crons (bill-reminders, blog-notify, lead-magnet-drip, challenge-drip, payday-reminder, paycheck-autopilot, debt-reminder, savings-milestone, inactivity-nudge, abandoned-signup-recovery, referral-reward-expiry, bank-balance-refresh, onboarding-drip — see `vercel.json`).
- **Admin:** visitor/traffic tracking, conversion funnels, recent activity feed, UTM/referrer attribution capture.
- **Security:** MFA (TOTP or email code; hard-gated only on bank-connect, per `middleware.ts` comments — not enforced page-by-page elsewhere by design), custom Supabase auth domain (`auth.paycheckplanner.ai` — see §4, correctly 404s at its root), RLS lockdowns from an Aug 13 2026 security audit (fixed same day per v3).

---

## 6. Known open items / things to check on pickup

- Confirm whether `device_bash` has become available on Vince's desktop again — changes the delivery workflow back toward v3's §1 if so.
- **`CalendarPeek.tsx`** was orphaned/dead code as of v3 — confirm whether it's since been deleted.
- **`app/api/bills/create`** lacked real type validation as of the Aug 13 security audit (low risk, RLS-scoped) — confirm current status.
- Blog posts didn't cross-link other lead-gen pages (worksheet/challenge/calculators) as of v3 — still true?
- Referral program was only visible on `/account`, never surfaced on public marketing pages, as of v3.
- All 4 subscriber tables (blog/lead-magnet/challenge/university-waitlist) were at 0 real rows as of the last audit — worth checking whether that's changed.
- iOS blocked purely on Apple Developer Program review as of v3 — check status before resuming iOS work.
- Two duplicate `tailwind.config.js`/`postcss.config.js` file pairs exist (root confirmed active, `app/` ones kept in sync defensively) — never conclusively resolved either way.
- Uncommitted local state in `/tmp/pp-check` as of this handoff: `redesign-mockup.html` (untracked scratch file from earlier redesign discussion, not part of shipped work). Working tree otherwise clean at `origin/main` commit `2e19b18` as of 2026-09-06 — **re-run `git fetch && git reset --mixed origin/main` in a new session regardless**, Vince may have pushed more since.

---

## 7. Technical gotchas worth remembering (carried forward from v3)

- `prevent_self_privilege_escalation` trigger requires `select set_config('request.jwt.claim.role','service_role',true)` before a manual `UPDATE profiles.plan` via Supabase MCP.
- Supabase MCP `execute_sql`/`apply_migration` run as the service role and bypass RLS — can't be used to simulate anon-role user experience. Schema changes via `apply_migration` must also be committed as `.sql` files under `supabase/migrations/`.
- The real server-side Supabase client is `@/lib/supabase/server` (cookie-based, works in Server Components/Route Handlers). `@/lib/supabase/client` is localStorage-only and only valid in Client Components — mixing these up previously caused a 23-file bug where pages silently returned zero rows under RLS.
- Granting `EXECUTE` on a Postgres function via a migration can get silently re-granted to `anon`/`authenticated` by Supabase's default privileges the next time the function is (re)created — always re-verify with `has_function_privilege` after any function migration that's supposed to restrict access.
- A persistent "middleware → proxy" deprecation warning appears in every Vercel build log and is safe to ignore.
- This repo runs Next.js 16.3.0, where `params` is a `Promise` in Server Components (since Next 15) — a synchronous `{ params }: { params: { course: string } }` destructure silently returns `undefined` and can cause a page to 404 on every request even though it's genuinely committed and deployed. Always `async function` + `await params`.

---

_If picking this up fresh: read §1/§1b first (process + standing directives — avoids repeating friction already resolved). §3 and §4 are the two most recent completed workstreams and their exact status. §6 is the actual to-do list. §7 is technical trivia worth not re-discovering the hard way._
