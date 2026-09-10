// lib/monthlyDebtCapacity.ts
//
// "What can I safely pay extra toward debt, every month?"
//
// Sep 10 2026, Vince: "create a section in safe to spend to show what you can
// safely pay extra towards debt per month basis."
//
// This is deliberately NOT the same question lib/debtPayoffSafety.ts answers,
// and conflating the two would be the most expensive mistake this file could
// make. computeDebtPayoffAffordability's maxSafeToPayoff is a ONE-TIME lump
// sum: "if I send this much today, does the rest of my plan still hold." On
// Vince's real 53rd Checking that number is $2,606.63 -- money that genuinely
// is free right now, because it's sitting in the account.
//
// A RECURRING monthly payment is limited by something else entirely: not what
// is in the account, but what the account actually clears each month. 53rd
// takes in about $3,596.67/mo and owes about $3,324.97/mo against the
// mortgage, the car and the personal loan -- so roughly $271.70/mo is what it
// genuinely throws off. Sending $2,606.63 every month would empty it inside
// two months. Sending $271.70 every month can run indefinitely.
//
// So there are two independent ceilings and the answer is the lower of them:
//
//   1. STRUCTURAL SURPLUS -- monthly income minus monthly obligations, taken
//      straight from computeMonthlySafeToSpend (the same figure the "This
//      Month" card calls Financially Free Money). Send more than this every
//      month and the balance trends down forever, no matter how healthy it
//      looks today. See the note at its call site for why this is NOT
//      averaged out of the projected timeline -- averaging is subtly wrong at
//      the horizon boundary, and wrong in the overstating direction.
//
//   2. TIMING CUSHION -- even a payment inside the structural surplus can
//      overdraw the account if it lands before the money to cover it does.
//      After k monthly payments of M, the projected balance at any moment t
//      is balance(t) - k*M, and that has to stay at or above the reserve. So
//      M <= (balance(t) - reserve) / k for every t with k >= 1, and the
//      binding one is the minimum. Closed form, evaluated at every event --
//      no binary search, no sampling error.
//
// Both are computed off the same projectBalanceTimeline (lib/paycheckCycles.ts)
// that Safe to Spend itself uses, so this can't drift from the number sitting
// next to it on the page -- the same guarantee lib/debtPayoffSafety.ts gets by
// delegating to computeSafeToSpend.

import {
  projectBalanceTimeline,
  toISODate,
  type CycleIncome,
  type CycleBill,
  type CycleDebt,
} from "./paycheckCycles"
import { computeMonthlySafeToSpend } from "./monthlySafeToSpend"
import { DEFAULT_PAYOFF_RESERVE } from "./debtPayoffSafety"

// A full year, so every recurring shape this app models occurs at least twice
// -- monthly, bimonthly, biweekly pay, and a mortgage whose grace period
// pushes its effective date into the following month. Shorter horizons
// systematically OVERSTATE a recurring payment, because a plan that's quietly
// running down only reveals it over time: at 62 days a structural deficit
// still looks like a healthy buffer.
export const CAPACITY_HORIZON_MONTHS = 12

export type MonthlyDebtCapacity = {
  // The headline: the largest amount that can go to debt every month without
  // the projected balance ever dropping under `reserve`. Floored at 0 --
  // never negative, since "you must pay debt -$40/month" is not a thing.
  monthlyExtra: number
  reserve: number
  // Averages over the horizon, from real projected occurrences.
  monthlyIncome: number
  monthlyObligations: number
  // monthlyIncome - monthlyObligations. Ceiling 1 above.
  structuralSurplus: number
  // Ceiling 2 above. Infinity is impossible in practice but the field is a
  // real number; when nothing constrains it, it equals structuralSurplus.
  timingCap: number
  // Which ceiling actually decided monthlyExtra, so the UI can say why
  // instead of presenting a bare number.
  bindingConstraint: "surplus" | "cushion" | "none"
  // The date the cushion would be tightest under this payment -- only
  // meaningful when bindingConstraint is "cushion".
  bindingDate: string | null
  // When the first of these payments would go out (the 1st of next month).
  firstPaymentDate: string | null
  horizonEndISO: string
  // True when the account is ALREADY projected below the reserve before any
  // extra payment exists. That's a pre-existing condition, not something an
  // extra payment causes, so it deliberately does not zero out the number
  // above -- but the UI must say so, because "send $1,192/month to debt" next
  // to an account that bottoms out at $3.77 this week would be absurd advice
  // without that context.
  alreadyBelowReserve: boolean
  lowestBeforeAnyPayment: number
}

// Floors to the cent so the number is never rounded UP into money that isn't
// there. The epsilon absorbs binary-float representation error: 271.70 is
// stored as 271.699999..., and a naive floor would report $271.69 and quietly
// lose a cent every time.
function floorCents(n: number): number {
  return Math.floor(n * 100 + 1e-6) / 100
}

// The 1st of each month, starting with the first one strictly after today,
// through the horizon. The 1st is deliberate and conservative: it's the
// earliest a month's payment could leave, so it faces the balance at its
// thinnest point in that month's cycle rather than after a paycheck has
// topped it up.
function monthlyPaymentDates(today: Date, months: number): string[] {
  const out: string[] = []
  for (let i = 1; i <= months; i++) {
    out.push(toISODate(new Date(today.getFullYear(), today.getMonth() + i, 1)))
  }
  return out
}

export function computeMonthlyDebtCapacity(input: {
  startingCash: number
  startingCashAsOf?: string | null
  income: CycleIncome[]
  bills: (CycleBill & { name?: string | null })[]
  debts: (CycleDebt & { name?: string | null })[]
  lastPaycheckDate?: string | null
  today?: Date
  reserve?: number
}): MonthlyDebtCapacity {
  const today = input.today ?? new Date()
  const todayISO = toISODate(today)
  const reserve = input.reserve ?? DEFAULT_PAYOFF_RESERVE
  const horizonEnd = new Date(today.getFullYear(), today.getMonth() + CAPACITY_HORIZON_MONTHS, today.getDate())
  const horizonEndISO = toISODate(horizonEnd)

  const timeline = projectBalanceTimeline({
    startingBalance: input.startingCash,
    fromISO: todayISO,
    toISO: horizonEndISO,
    pastDueFromISO: input.lastPaycheckDate ?? null,
    balanceAsOfISO: input.startingCashAsOf ?? null,
    income: input.income,
    bills: input.bills,
    debts: input.debts,
  })

  const empty: MonthlyDebtCapacity = {
    monthlyExtra: 0,
    reserve,
    monthlyIncome: 0,
    monthlyObligations: 0,
    structuralSurplus: 0,
    timingCap: 0,
    bindingConstraint: "none",
    bindingDate: null,
    firstPaymentDate: null,
    horizonEndISO,
    alreadyBelowReserve: false,
    lowestBeforeAnyPayment: input.startingCash,
  }
  if (timeline.events.length === 0) return empty

  // Ceiling 1: what the plan actually throws off each month.
  //
  // Deliberately computed by computeMonthlySafeToSpend (lib/monthlyFactor.ts's
  // canonical frequency multipliers) rather than by averaging the timeline's
  // own occurrences over the horizon. Averaging looks more principled and is
  // in fact WRONG at the edges: a 12-month window ending Sep 10 2027 contains
  // only 11 occurrences of a mortgage whose 15-day grace period lands it on
  // the 16th, because the twelfth falls six days past the boundary. On 53rd's
  // real numbers that understated monthly obligations by $186 and inflated
  // this ceiling from $271.70 to $457.08 -- an overstatement, which is the
  // one direction this number must never err in.
  //
  // Reusing it also means this section can never contradict the "This Month"
  // card sitting on the same page: financiallyFreeMoney IS this ceiling.
  const monthly = computeMonthlySafeToSpend({
    income: input.income,
    bills: input.bills,
    // name is optional-and-nullable here but optional-and-undefined there;
    // it's only used for the transfer-covered display list either way.
    debts: input.debts.map((d) => ({ ...d, name: d.name ?? undefined })),
    goals: [],
    today,
  })
  const monthlyIncome = monthly.monthlyIncome
  const monthlyObligations = monthly.committedMoney
  const structuralSurplus = monthly.financiallyFreeMoney

  // Ceiling 2: the cushion. Walk every event alongside the payment schedule,
  // tracking how many payments have gone out by that point, and solve
  // balance(t) - k*M >= reserve for M at each one.
  const paymentDates = monthlyPaymentDates(today, CAPACITY_HORIZON_MONTHS).filter((d) => d <= horizonEndISO)
  let timingCap = Number.POSITIVE_INFINITY
  let bindingDate: string | null = null
  let lowestBeforeAnyPayment = input.startingCash

  // Merge points: every event, plus every payment date (the balance in effect
  // at that instant still has to clear the payment about to leave it).
  type Point = { date: string; balance: number }
  const points: Point[] = []
  let running = input.startingCash
  let eventIdx = 0
  const allDates = Array.from(new Set([...timeline.events.map((e) => e.date), ...paymentDates])).sort()
  for (const date of allDates) {
    while (eventIdx < timeline.events.length && timeline.events[eventIdx].date <= date) {
      running = timeline.events[eventIdx].balanceAfter
      eventIdx++
    }
    points.push({ date, balance: running })
  }

  for (const p of points) {
    const k = paymentDates.filter((d) => d <= p.date).length
    if (k === 0) {
      lowestBeforeAnyPayment = Math.min(lowestBeforeAnyPayment, p.balance)
      continue
    }
    const cap = (p.balance - reserve) / k
    if (cap < timingCap) {
      timingCap = cap
      bindingDate = p.date
    }
  }
  if (!Number.isFinite(timingCap)) {
    timingCap = structuralSurplus
    bindingDate = null
  }

  const monthlyExtra = Math.max(0, floorCents(Math.min(structuralSurplus, timingCap)))
  let bindingConstraint: MonthlyDebtCapacity["bindingConstraint"] = "none"
  if (monthlyExtra > 0) {
    bindingConstraint = timingCap < structuralSurplus ? "cushion" : "surplus"
  } else {
    // Nothing is available. Name whichever ceiling is responsible so the UI
    // can explain it: a plan with no surplus needs different advice than a
    // plan with surplus but no cushion yet.
    bindingConstraint = structuralSurplus <= 0 ? "surplus" : "cushion"
  }

  return {
    monthlyExtra,
    reserve,
    monthlyIncome: Math.round(monthlyIncome * 100) / 100,
    monthlyObligations: Math.round(monthlyObligations * 100) / 100,
    // Floored, not rounded, and deliberately the SAME floor the headline
    // uses. $1,660 biweekly is $3,596.6666.../month, so the true surplus on
    // 53rd is $271.6966... -- rounding this to $271.70 while the headline
    // floors to $271.69 would put a one-cent contradiction inside a single
    // card, between a number and the arithmetic printed directly beneath it.
    // Vince audits these by hand; a penny that doesn't add up costs more
    // trust than a penny of precision is worth.
    structuralSurplus: floorCents(structuralSurplus),
    timingCap: Math.round(timingCap * 100) / 100,
    bindingConstraint,
    bindingDate: bindingConstraint === "cushion" ? bindingDate : null,
    firstPaymentDate: paymentDates[0] ?? null,
    horizonEndISO,
    alreadyBelowReserve: lowestBeforeAnyPayment < reserve,
    lowestBeforeAnyPayment: Math.round(lowestBeforeAnyPayment * 100) / 100,
  }
}
