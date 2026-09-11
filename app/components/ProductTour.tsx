"use client"

import { useEffect, useRef } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { isNativeApp } from "@/lib/platform"

type TourStep = { element?: string; title: string; description: string }

// REBUILT (Sep 11 2026, Vince: "take a quick tour doesn't work anymore, it
// should go down the list"). Two things were wrong.
//
// 1. Two steps pointed at elements that no longer exist. The separate Bills
//    and Debts pages were merged into one Bills & Debts page, so
//    [data-tour="nav-bills"] and [data-tour="nav-debts"] match nothing --
//    and runTour() below silently DROPS any step whose element is missing
//    (so the tour can't crash on a hidden nav item). Silent dropping is the
//    right behavior and also the reason this rotted invisibly: nothing ever
//    complained, the tour just quietly got shorter.
//
// 2. The order had drifted badly from the sidebar. It opened on Account and
//    Sign out, jumped to the dashboard, then to Calendar, Debts, Payoff Plan,
//    Bills -- nothing like the top-to-bottom list a person is looking at.
//
// REVISED again same day (Vince: "it should start from top to bottom so it
// doesn't bounce around"). Getting Started renders ABOVE Dashboard in the
// sidebar, so putting its step near the end sent the highlight from the
// bottom of the nav back up to the top. The order is now literally the order
// things appear down the screen: Getting Started, then Sidebar.tsx's LINKS
// top to bottom, then Feedback at the foot of the nav, and only then the
// top-right Account/Sign out widget, which is a separate cluster. Safe to Spend, Survival Mode and
// Bills & Debts are covered for the first time -- Safe to Spend is the page
// people open most and the old tour never mentioned it at all.
//
// If a nav item is added to Sidebar.tsx, add it here in the same position.
// The selector is generated there as "nav-" + href with slashes stripped, so
// /plan-drift is [data-tour="nav-plan-drift"]. Admin is deliberately
// excluded -- admin-only, and it carries no data-tour attribute.
const STEPS: TourStep[] = [
  { title: "Welcome to Paycheck Planner", description: "Here's a quick tour of where everything lives. It takes about a minute." },
  { element: '[data-tour="nav-getting-started"]', title: "Getting Started checklist", description: "Reopen this anytime to see what's left to set up -- and to replay this tour." },
  { element: '[data-tour="nav-dashboard"]', title: "Your dashboard", description: "Your money at a glance - what's safe to spend, your balances, and what to do with anything left over." },
  { element: '[data-tour="nav-safe-to-spend"]', title: "Safe to Spend", description: "The number most people come here for: what you can spend today without missing a bill. Start on Simple, switch to Detailed when you want the reasoning." },
  { element: '[data-tour="nav-survival-mode"]', title: "Survival Mode", description: "A tighter, day-by-day view for when money is short before the next paycheck." },
  { element: '[data-tour="nav-bills-debts"]', title: "Bills & debts", description: "Every recurring bill and debt in one place - amounts, due dates, and which account each is paid from. Mark anything paid as you go." },
  { element: '[data-tour="nav-calendar"]', title: "Your calendar", description: "Bills, debts, and income in one month view, with your next 30 days always visible alongside it." },
  { element: '[data-tour="nav-income"]', title: "Add your income", description: "Enter each paycheck and how often it arrives - everything else is built on this." },
  { element: '[data-tour="nav-amortization"]', title: "Your Payoff Plan", description: "See your debt-free date and the order we'll knock out each balance. Download a PDF summary anytime." },
  { element: '[data-tour="nav-paycheck-shield"]', title: "Paycheck Shield", description: "Stress-test your plan against real-life surprises and see which upcoming paycheck has the least room." },
  { element: '[data-tour="nav-paycheck-autopilot"]', title: "Plan Autopilot", description: "A few days before payday, Autopilot drafts what that paycheck needs to cover -- included with the Autopilot plan." },
  { element: '[data-tour="nav-plan-drift"]', title: "Plan Drift", description: "See whether you're still following the plan you started this pay period with -- and what's shifted if not." },
  { element: '[data-tour="nav-goals"]', title: "Set your goals", description: "Create savings targets and other financial goals to work toward." },
  { element: '[data-tour="nav-achievements"]', title: "Achievements", description: "Milestones you unlock as you build better money habits." },
  { element: '[data-tour="nav-money-score"]', title: "The Money Quiz", description: "A free 2-minute quiz on your money habits -- get an instant, shareable score." },
  { element: '[data-tour="nav-insights"]', title: "Insights", description: "A closer look at your spending and progress trends." },
  { element: '[data-tour="nav-analytics"]', title: "Analytics", description: "Deeper charts and breakdowns of your finances, plus your Financial Health Score." },
  { element: '[data-tour="nav-blog"]', title: "Financial Hub", description: "Articles, free calculators, and the 30-Day Challenge live here." },
  { element: '[data-tour="nav-university"]', title: "Paycheck Planner University", description: "Short lessons on budgeting, paychecks, debt payoff, saving, credit, and financial freedom. Finish a course to unlock the next one." },
  { element: '[data-tour="nav-ai-chat"]', title: "AI insights", description: "Ask questions about your numbers in plain English. Included with Accelerate and Autopilot." },
  { element: '[data-tour="nav-feedback"]', title: "Send feedback", description: "Tell us what's working, or a feature you'd like to see next." },
  { element: '[data-tour="nav-account"]', title: "Account settings", description: "Manage your plan, security (2FA), notifications, and connected credit cards." },
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

      // CRITICAL FIX (Sep 11 2026, Vince: "the sign out tour is not pointing
      // to the sign out it's showing on the opposite side of the screen").
      //
      // Sidebar.tsx renders Account and Sign out TWICE -- once in the mobile
      // header and again in the desktop top-right widget -- so
      // [data-tour="nav-sign-out"] matches two elements. document.querySelector
      // returns the FIRST, which on a desktop screen is the mobile copy sitting
      // at display:none. driver.js was then asked to highlight a zero-size
      // hidden node, so the popover had nothing to anchor to and landed on the
      // wrong side of the screen.
      //
      // Resolving to the first VISIBLE match fixes that one step and immunizes
      // every other step against the same duplicate-render trap, which is easy
      // to reintroduce any time a control is rendered once per breakpoint.
      // Note offsetParent is NOT usable here: it is null for position:fixed
      // elements, and the desktop widget is fixed.
      function firstVisible(selector: string): HTMLElement | null {
        for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
          const r = el.getBoundingClientRect()
          if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el
        }
        return null
      }

      const steps = STEPS.map((s) => ({
        step: s,
        el: !mobile && s.element ? firstVisible(s.element) : null,
      }))
        .filter(({ step, el }) => mobile || !step.element || el)
        .map(({ step, el }) => ({
          element: mobile ? undefined : el ?? undefined,
          popover: { title: step.title, description: step.description },
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