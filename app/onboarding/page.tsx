import { redirect } from "next/navigation"

// The first-run checklist now lives in the tier-aware Getting Started modal,
// which opens automatically on the dashboard for new users. This standalone
// page is retired so the dashboard is always the full overview.
export default function OnboardingPage() {
  redirect("/dashboard")
}