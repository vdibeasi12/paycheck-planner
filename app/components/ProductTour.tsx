"use client"

import { useEffect, useRef } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { isNativeApp } from "@/lib/platform"

type TourStep = { element?: string; title: string; description: string }

// Order matches the sidebar's top-to-bottom order exactly (Dashboard,
// Getting Started, Calendar, Debts, Payoff Plan, Bills, Income, Paycheck
// Shield, Plan Autopilot, Plan Drift, Goals, Achievements, Insights,
// Analytics, Money Quiz, University, Financial Hub, AI Chat, Account,
// Feedback, Sign out) so the highlight walks straight down the nav instead
// of jumping around. Admin is intentionally excluded -- it's only shown to
// admin accounts and has no data-tour attribute. Paycheck Shield, Plan
// Autopilot, and Plan Drift were added Aug 26 2026 -- Shield existed before
// this tour did and had been missed; Survival Mode is still missing the
// same way and hasn't been added here.
const STEPS: TourStep[] = [
  { title: "Welcome to Paycheck Planner", description: "Here's a quick tour of where everything lives. It takes about a minute." },
  { element: '[data-tour="dash-title"]', title: "Your dashboard", description: "Your money at a glance - safe-to-spend, balances, progress, and what to do with any leftover money all live here." },
  { element: '[data-tour="nav-getting-started"]', title: "Getting Started checklist", description: "Reopen this anytime to see what's left to set up for your plan." },
  { element: '[data-tour="nav-calendar"]', title: "Your calendar", description: "Bills, debts, and income all in one month view, with your next 30 days always visible alongside it." },
  { element: '[data-tour="nav-debts"]', title: "Add your debts", description: "Balances, interest rates (APR), and minimum payments power your payoff plan." },
  { element: '[data-tour="nav-amortization"]', title: "Your Payoff Plan", description: "See your debt-free date and the order we'll knock out each balance. Download a PDF summary anytime from this page." },
  { element: '[data-tour="nav-bills"]', title: "Track your bills", description: "Add recurring bills so nothing slips through the cracks." },
  { element: '[data-tour="nav-income"]', title: "Add your income", description: "Start here. Enter each paycheck and how often it arrives so the budget math is right." },
  { element: '[data-tour="nav-paycheck-shield"]', title: "Paycheck Shield", description: "Stress-test your plan against real-life surprises and see which upcoming paycheck has the least room." },
  { element: '[data-tour="nav-paycheck-autopilot"]', title: "Plan Autopilot", description: "A few days before payday, Autopilot drafts what that paycheck needs to cover -- included with the Autopilot plan." },
  { element: '[data-tour="nav-plan-drift"]', title: "Plan Drift", description: "See whether you're still following the plan you started this pay period with -- and what's shifted if not." },
  { element: '[data-tour="nav-goals"]', title: "Set your goals", description: "Create savings targets and other financial goals to work toward." },
  { element: '[data-tour="nav-achievements"]', title: "Achievements", description: "Milestones you unlock as you build better money habits." },
  { element: '[data-tour="nav-insights"]', title: "Insights", description: "A closer look at your spending and progress trends." },
  { element: '[data-tour="nav-analytics"]', title: "Analytics", description: "Deeper charts and breakdowns of your finances, plus your Financial Health Score." },
  { element: '[data-tour="nav-money-score"]', title: "The Money Quiz", description: "A free 2-minute quiz on your money habits -- get an instant, shareable score." },
  { element: '[data-tour="nav-university"]', title: "Paycheck Planner University", description: "Short lessons on budgeting, paychecks, debt payoff, saving, credit, and financial freedom. Finish a course to unlock the next one." },
  { element: '[data-tour="nav-blog"]', title: "Financial Hub", description: "Articles, free calculators, and the 30-Day Challenge live here." },
  { element: '[data-tour="nav-ai-chat"]', title: "AI insights", description: "Ask questions about your numbers in plain English. Included with Accelerate and Autopilot." },
  { element: '[data-tour="nav-account"]', title: "Account settings", description: "Manage your plan, security (2FA), notifications, and connected credit cards." },
  { element: '[data-tour="nav-feedback"]', title: "Send feedback", description: "Tell us what's working or what you'd like to see next." },
  { element: '[data-tour="nav-sign-out"]', title: "Sign out", description: "Sign out of your account from here anytime." },
  { title: "You're all set", description: "Add your income and debts to see your payoff date. You can reopen this tour anytime from Getting Started." },
]

export default function ProductTour() {
  const running = useRef(false)

  useEffect(() => {
    function runTour() {
      if (running.current) return
      running.current = true

      // Below the sidebar's own mobile breakpoint (see Sidebar.tsx's
      // md:hidden/md:flex split) there's no persistently-visible sidebar to
      // highlight, and there isn't room on screen for a popover pinned to a
      // corner near a nav item -- it was landing off in the top right with
      // no way to comfortably read it or reach Next. The native app is
      // always this narrow. Drop the `element` on every step in that case:
      // driver.js already renders a centered, un-highlighted popover for
      // steps with no element (that's how the Welcome/You're-all-set steps
      // above already work), so this just reuses that existing behavior for
      // every step instead of highlighting the sidebar.
      const mobile = isNativeApp() || window.innerWidth < 768

      const steps = STEPS.filter(
        (s) => mobile || !s.element || document.querySelector(s.element)
      ).map((s) => ({
        element: mobile ? undefined : s.element,
        popover: { title: s.title, description: s.description },
      }))

      const d = driver({
        showProgress: true,
        allowClose: true,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        steps,
        onDestroyed: () => {
          running.current = false
          const url = new URL(window.location.href)
          url.searchParams.delete("tour")
          window.history.replaceState({}, "", url.toString())
        },
      })
      d.drive()
    }

    const onStart = () => runTour()
    window.addEventListener("pp:start-tour", onStart)

    let t: ReturnType<typeof setTimeout> | undefined
    if (new URLSearchParams(window.location.search).get("tour") === "1") {
      t = setTimeout(runTour, 400)
    }

    return () => {
      window.removeEventListener("pp:start-tour", onStart)
      if (t) clearTimeout(t)
    }
  }, [])

  return null
}