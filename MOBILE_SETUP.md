# Paycheck Planner — iOS & Android (Capacitor) Setup

This wraps your existing Next.js web app in a native iOS and Android shell using
Capacitor. The shell loads your live Vercel deployment, so everything that needs
a server (server components, API routes, Supabase cookie auth, Stripe, AI) keeps
working exactly as it does on the web. You get real `.ipa` / `.apk` builds you
can run on a device and ship to TestFlight / Google Play internal testing.

---

## What I already changed for you

These files are in this updated project:

- **`capacitor.config.ts`** — points the native app at `https://paycheckplanner-snowy.vercel.app`. Change `appId` to your own reverse-domain if you have one (it's permanent once you submit to stores).
- **`www/index.html`** — an offline fallback page (Capacitor requires a `webDir`).
- **`package.json`** — added Capacitor dependencies and `cap:sync` / `ios` / `android` scripts.

You do **not** commit `ios/` or `android/` decisions yet — those folders get
generated in step 3 below.

---

## Prerequisites

- **Node.js 18+** and this project on your machine.
- **For iOS:** a **Mac** with **Xcode** (App Store, free) and **CocoaPods** (`sudo gem install cocoapods`). To run on a physical iPhone or use TestFlight you need an **Apple Developer account** ($99/yr). The Simulator and basic device testing work without it.
- **For Android:** **Android Studio** (free, any OS — Mac, Windows, Linux). To publish you need a **Google Play Developer account** ($25 one-time).

You can do Android entirely on Windows/Linux. iOS **requires** a Mac.

---

## Step 1 — Install dependencies

From the project root (`paycheck-planner-rebuild/`):

```bash
npm install
```

## Step 2 — Initialize Capacitor

This reads `capacitor.config.ts` (already created), so just confirm it:

```bash
npx cap init "Paycheck Planner" com.dibeasi.paycheckplanner --web-dir=www
```

If it says config already exists, that's fine — skip it.

## Step 3 — Add the native platforms

```bash
# Android (works on any OS)
npx cap add android

# iOS (Mac only)
npx cap add ios
```

This generates the `android/` and `ios/` project folders.

## Step 4 — Sync

Run this any time you change `capacitor.config.ts` or add plugins:

```bash
npm run cap:sync
```

## Step 5 — Run on a device or emulator

**Android:**

```bash
npm run android      # opens Android Studio
```

In Android Studio: pick an emulator or your plugged-in phone (USB debugging on),
then press **Run ▶**.

**iOS (Mac):**

```bash
npm run ios          # opens Xcode
```

In Xcode: select a Simulator or your connected iPhone, set your Team under
**Signing & Capabilities**, then press **Run ▶**.

Because the app loads your live Vercel URL, you'll see the full app — log in with
your account and (after the admin step below) every feature is unlocked.

---

## Unlock all features for your own account (no demo)

Feature gating is server-side on the `plan` column of your Supabase `profiles`
table. Set your account to `premium` in the Supabase SQL editor:

```sql
update profiles
set plan = 'premium'
where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
```

This unlocks charts, snowball/avalanche, AI insights, and unlimited debts in both
the web and the wrapped mobile app.

---

## Fix these BEFORE you rely on the wrapped app

The native shell loads the same code as the website, so it inherits the same
bugs. Two are worth fixing first:

1. **Login callback bug.** `app/auth/callback/route.ts` uses the browser Supabase
   client inside a server route, so the session cookie never gets set — Google /
   email-confirm logins silently fail. Switch it to `@/lib/supabase/server` and
   `await createClient()`.
2. **Leaked secret.** `app/.env` contains a real `OPENAI_API_KEY`. Rotate it in
   the OpenAI dashboard, move it to Vercel env vars only, and `git rm --cached
   app/.env`.

---

## Shipping to testers

- **Android internal testing:** in Android Studio, **Build > Generate Signed
  Bundle/APK**, upload the `.aab` to the Play Console's Internal testing track.
- **iOS TestFlight:** in Xcode, **Product > Archive**, then distribute to App
  Store Connect → TestFlight.

---

## Important store-review caveats (for public release, not testing)

- **Guideline 4.2 (Apple):** a pure "website in a webview" can be rejected for
  minimum functionality. The included native plugins (status bar, splash, app
  state) help; adding genuinely native touches (push notifications, biometric
  unlock, offline view) before public submission reduces risk.
- **Guideline 3.1.1 (Apple):** Apple generally requires **in-app purchase** for
  digital subscriptions. Your Stripe checkout could be rejected at public
  release. For internal/TestFlight testing it's fine. Plan for StoreKit/IAP (or a
  RevenueCat-style layer) before you submit the paid tiers publicly.

These do not block device testing or TestFlight — only public App Store release.
