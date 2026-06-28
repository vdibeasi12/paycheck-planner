"use client"

// Guided product tour over the real UI. Launches when the dashboard is opened
// with ?tour=1 (the "Take a quick tour" button in Getting Started does this).
// Steps whose target isn't on screen (e.g. the sidebar on mobile) are dropped
// automatically, so the tour always has a sensible beginning and end.

import { useEffect } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"

type TourStep = { element?: string; title: string; description: string }

const STEPS: TourStep[] = [
  {
    title: "Welcome to Paycheck Planner",
    description:
      "Here's a quick tour of where everything lives. It takes about a minute.",
  },
  {
    element: '[data-tour="dash-title"]',
    title: "Your dashboard",
    description:
      "Your money at a glance - safe-to-spend, balances, and progress all live here.",
  },
  {
    element: '[data-tour="nav-income"]',
    title: "Add your income",
    description:
      "Start here. Enter each paycheck and how often it arrives so the budget math is right.",
  },
  {
    element: '[data-tour="nav-debts"]',
    title: "Add your debts",
    description:
      "Balances, interest rates (APR), and minimum payments power your payoff plan.",
  },
  {
    element: '[data-tour="nav-bills"]',
    title: "Track your bills",
    description: "Add recurring bills so nothing slips through the cracks.",
  },
  {
    element: '[data-tour="nav-amortization"]',
    title: "Your Payoff Plan",
    description:
      "See your debt-free date and the order we'll knock out each balance.",
  },
  {
    element: '[data-tour="nav-ai-chat"]',
    title: "AI insights",
    description:
      "Ask questions about your numbers in plain English. Included with Accelerate and Autopilot.",
  },
  {
    title: "You're all set",
    description:
      "Add your income and debts to see your payoff date. You can reopen this tour anytime from Getting Started.",
  },
]

export default function ProductTour() {
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get("tour") !== "1") return

    const steps = STEPS.filter(
      (s) => !s.element || document.querySelector(s.element)
    ).map((s) => ({
      element: s.element,
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
        const url = new URL(window.location.href)
        url.searchParams.delete("tour")
        window.history.replaceState({}, "", url.toString())
      },
    })

    const t = setTimeout(() => d.drive(), 350)
    return () => clearTimeout(t)
  }, [])

  return null
}