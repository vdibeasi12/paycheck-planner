// lib/__tests__/monthlyDebtCapacity.test.ts
//
// Sep 10 2026, Vince: "create a section in safe to spend to show what you can
// safely pay extra towards debt per month basis."
//
// The thing most worth testing here isn't a specific dollar figure, it's the
// PROPERTY: send monthlyExtra every month and the projected balance must never
// drop under the reserve -- and that has to hold against a real simulation,
// not just against the closed-form solve that produced it. Test 5 below does
// exactly that, and Test 6 proves the number is tight (one cent more breaks
// it) so it can't quietly drift down into uselessly conservative territory
// either.
//
// Run with: npx tsx lib/__tests__/monthlyDebtCapacity.test.ts

import { computeMonthlyDebtCapacity } from "../monthlyDebtCapacity"
import { computeMonthlySafeToSpend } from "../monthlySafeToSpend"
import { computeDebtPayoffAffordability, DEFAULT_PAYOFF_RESERVE } from "../debtPayoffSafety"
import { projectBalanceTimeline, toISODate, type CycleIncome, type CycleBill, type CycleDebt } from "../paycheckCycles"

let passed = 0
let failed = 0

function assertEqual(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) < 0.005) {
    passed++
    console.log(`  PASS  ${label} (${actual})`)
  } else {
    failed++
    console.error(`  FAIL  ${label} -- expected ${expected}, got ${actual}`)
  }
}

function assertTrue(cond: boolean, label: string) {
  if (cond) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failed++
    console.error(`  FAIL  ${label}`)
  }
}

// Vince's real 53rd Checking, Sep 10 2026: $1,660 biweekly in, and the three
// large obligations he keeps that account for. Nothing else is linked to it.
const today = new Date("2026-09-10T00:00:00")
const income53: CycleIncome[] = [{ amount: 1660, frequency: "biweekly", next_pay_date: "2026-09-16" }]
const debts53: (CycleDebt & { name: string })[] = [
  { name: "Onity Mortgage", minimum_payment: 2220.86, due_date: 1, grace_period_days: 15, paid_through: "2026-09-01" },
  { name: "Capital One Auto", minimum_payment: 596.5, due_date: 15 },
  { name: "Avant", minimum_payment: 507.61, due_date: 22 },
]
const balance53 = 3353.13
const asOf53 = "2026-09-10"

// Replays the projection with k monthly payments of `monthly` removed by the
// time of each event -- the same schedule computeMonthlyDebtCapacity solves
// against (the 1st of each month, starting next month). Returns the lowest
// balance reached. This is an INDEPENDENT simulation: it does not reuse the
// closed form, so agreeing with it is real evidence, not a tautology.
function lowestUnderMonthlyPayment(input: {
  startingCash: number
  startingCashAsOf?: string | null
  income: CycleIncome[]
  bills: CycleBill[]
  debts: CycleDebt[]
  monthly: number
  months?: number
}): number {
  const months = input.months ?? 12
  const horizonEnd = toISODate(new Date(today.getFullYear(), today.getMonth() + months, today.getDate()))
  const timeline = projectBalanceTimeline({
    startingBalance: input.startingCash,
    fromISO: toISODate(today),
    toISO: horizonEnd,
    balanceAsOfISO: input.startingCashAsOf ?? null,
    income: input.income,
    bills: input.bills,
    debts: input.debts,
  })
  const paymentDates: string[] = []
  for (let i = 1; i <= months; i++) {
    const d = toISODate(new Date(today.getFullYear(), today.getMonth() + i, 1))
    if (d <= horizonEnd) paymentDates.push(d)
  }

  let lowest = Number.POSITIVE_INFINITY
  let running = input.startingCash
  let idx = 0
  const dates = Array.from(new Set([...timeline.events.map((e) => e.date), ...paymentDates])).sort()
  for (const date of dates) {
    while (idx < timeline.events.length && timeline.events[idx].date <= date) {
      running = timeline.events[idx].balanceAfter
      idx++
    }
    const k = paymentDates.filter((d) => d <= date).length
    if (k > 0) lowest = Math.min(lowest, running - k * input.monthly)
  }
  return lowest
}

// Vince's real Chime: plenty of structural room ($1,989.87 in vs $724.27
// out) but only $73.77 on hand, bottoming out at $3.77 on Sep 14.
const incomeChime: CycleIncome[] = [{ amount: 918.4, frequency: "biweekly", next_pay_date: "2026-09-16" }]
const billsChime: (CycleBill & { name: string })[] = [
  { name: "Addison Water Bill", amount: 201.54, due_date: 11, frequency: "bimonthly", bimonthly_parity: "odd", paid_through: "2026-09-11" },
  { name: "Anthropic", amount: 20, due_date: 7, frequency: "monthly" },
  { name: "BitDefender Mobile", amount: 24.99, due_date: 1, frequency: "monthly" },
  { name: "ComEd", amount: 120, due_date: 27, frequency: "monthly" },
  { name: "Netflix", amount: 8.99, due_date: 6, frequency: "monthly" },
  { name: "Nicor", amount: 85, due_date: 25, frequency: "bimonthly", bimonthly_parity: "odd" },
  { name: "Philo", amount: 25, due_date: 27, frequency: "monthly" },
  { name: "Vercel - Pro", amount: 20, due_date: 14, frequency: "monthly" },
  { name: "Xfinity - Internet", amount: 96.31, due_date: 22, frequency: "monthly" },
  { name: "Xfinity - Mobile", amount: 142.71, due_date: 28, frequency: "monthly" },
]
const debtsChime: (CycleDebt & { name: string })[] = [
  { name: "DiBeasi Global Investments", minimum_payment: 15, due_date: 2 },
  { name: "Meijer Mastercard", minimum_payment: 29, due_date: 4 },
  { name: "The Home Depot Card", minimum_payment: 29, due_date: 22 },
  { name: "PREFERRED CASH REWARDS VISA", minimum_payment: 50, due_date: 14 },
]

// Bundled so Test 3 and Test 6 provably exercise the same shape.
const CHIME = {
  income: incomeChime,
  bills: billsChime,
  debts: debtsChime,
  startingCash: 73.77,
  startingCashAsOf: "2026-09-09",
}

console.log("Test 1 -- the recurring number and the one-time number are different questions,")
console.log("  and on Vince's real 53rd Checking they differ by nearly 10x")
{
  const cap = computeMonthlyDebtCapacity({
    startingCash: balance53,
    startingCashAsOf: asOf53,
    income: income53,
    bills: [],
    debts: debts53,
    today,
  })
  const oneTime = computeDebtPayoffAffordability({
    startingCash: balance53,
    startingCashAsOf: asOf53,
    income: income53,
    bills: [],
    debts: debts53,
    goals: [],
    today,
  })

  assertEqual(oneTime.maxSafeToPayoff, 2606.63, "one-time: $2,606.63 is genuinely free out of the current balance")
  // $271.69, not $271.70: $1,660 biweekly is $3,596.6666.../month, so the
  // real surplus is $271.6966... and this floors rather than rounds. Never
  // recommend a cent that isn't there.
  assertEqual(cap.monthlyExtra, 271.69, "recurring: only $271.69/month is free out of what the account actually clears")
  assertTrue(
    cap.monthlyExtra < oneTime.maxSafeToPayoff,
    "the recurring figure is far smaller -- conflating the two would empty this account inside two months"
  )
}

console.log("\nTest 2 -- the monthly ceiling is income minus obligations, taken from the same")
console.log("  function the 'This Month' card uses, so the two can never disagree on screen")
{
  const cap = computeMonthlyDebtCapacity({
    startingCash: balance53,
    startingCashAsOf: asOf53,
    income: income53,
    bills: [],
    debts: debts53,
    today,
  })
  const monthly = computeMonthlySafeToSpend({ income: income53, bills: [], debts: debts53, goals: [], today })

  assertEqual(cap.monthlyIncome, 3596.67, "$1,660 biweekly = $3,596.67/month (26/12, the canonical monthlyFactor)")
  assertEqual(cap.monthlyObligations, 3324.97, "mortgage + car + personal loan = $3,324.97/month")
  assertEqual(cap.structuralSurplus, 271.69, "leaving $271.69/month")
  assertTrue(
    Math.abs(cap.structuralSurplus - monthly.financiallyFreeMoney) < 0.01,
    "matches This Month's Financially Free Money to the cent, by construction -- it IS that number, floored"
  )
  assertEqual(cap.structuralSurplus, cap.monthlyExtra, "and when the surplus binds, the card's arithmetic line equals its own headline exactly")
  assertTrue(cap.bindingConstraint === "surplus", `and the surplus is what binds here, not the cushion (got ${cap.bindingConstraint})`)

  // The specific bug this guards against: deriving the monthly rate by
  // averaging occurrences over a 12-month window instead. That window ends
  // Sep 10 2027 and so contains only 11 mortgage payments -- the twelfth
  // lands Sep 16 2027, six days past the edge -- which understates
  // obligations by ~$186/month and inflates this number to ~$457. Wrong in
  // the one direction that matters.
  assertTrue(cap.monthlyExtra < 400, `no horizon-boundary inflation -- $457-ish would mean the averaging bug is back (got ${cap.monthlyExtra})`)
}

console.log("\nTest 3 -- a thin balance caps the payment below what the account clears, and")
console.log("  says so, rather than quietly recommending money that isn't there yet")
{
  const cap = computeMonthlyDebtCapacity({ ...CHIME, today })

  // $1,265.59 rather than $1,265.60 -- same floor-don't-round rule as 53rd:
  // $918.40 biweekly is $1,989.8666.../month, so the surplus is $1,265.5966...
  assertEqual(cap.structuralSurplus, 1265.59, "structurally this account clears $1,265.59/month")
  assertTrue(cap.monthlyExtra < cap.structuralSurplus, `but the recommendation is held below that (got ${cap.monthlyExtra})`)
  assertTrue(cap.bindingConstraint === "cushion", `because the cushion binds, not the surplus (got ${cap.bindingConstraint})`)
  assertTrue(cap.bindingDate !== null, "and the date that cushion would bite is named, not left implicit")
  // Separately true and separately surfaced: this account is thin RIGHT NOW,
  // before any extra payment exists. The card has to say that out loud or it
  // reads as "you have money" next to a Safe to Spend number saying $3.77.
  assertTrue(cap.alreadyBelowReserve, "the near-term squeeze is flagged independently of the recurring figure")
  assertEqual(cap.lowestBeforeAnyPayment, 3.77, "and quantified -- the same $3.77 low point Safe to Spend shows")
}

console.log("\nTest 4 -- an account with no monthly room returns zero, never a negative")
console.log("  'recommendation', and explains which ceiling is the problem")
{
  const tight: CycleDebt[] = [{ minimum_payment: 3600, due_date: 15 }]
  const cap = computeMonthlyDebtCapacity({
    startingCash: 5000,
    startingCashAsOf: asOf53,
    income: income53,
    bills: [],
    debts: tight,
    today,
  })
  assertTrue(cap.structuralSurplus < 0, `obligations exceed income (surplus ${cap.structuralSurplus})`)
  assertEqual(cap.monthlyExtra, 0, "so nothing recurring is safe -- floored at zero, not shown as a negative payment")
  assertTrue(cap.bindingConstraint === "surplus", "and the surplus is correctly named as the blocker")
}

console.log("\nTest 5 (the real one) -- actually SEND the recommended amount every month and")
console.log("  simulate it: the balance must never fall under the reserve, on either account")
{
  const cap53 = computeMonthlyDebtCapacity({
    startingCash: balance53,
    startingCashAsOf: asOf53,
    income: income53,
    bills: [],
    debts: debts53,
    today,
  })
  const lowest53 = lowestUnderMonthlyPayment({
    startingCash: balance53,
    startingCashAsOf: asOf53,
    income: income53,
    bills: [],
    debts: debts53,
    monthly: cap53.monthlyExtra,
  })
  assertTrue(
    lowest53 >= DEFAULT_PAYOFF_RESERVE - 0.005,
    `53rd survives 12 months of $${cap53.monthlyExtra}/month -- lowest projected balance ${lowest53.toFixed(2)} stays at or above the $${DEFAULT_PAYOFF_RESERVE} reserve`
  )

  // And the surplus-bound case is genuinely sustainable rather than merely
  // surviving the horizon: the balance should not be trending toward zero.
  assertTrue(
    lowest53 > balance53 - 12 * cap53.monthlyExtra,
    "the account isn't just being drained at exactly the payment rate -- income is carrying it"
  )
}

console.log("\nTest 6 -- and the number is TIGHT: one cent more per month breaks the cushion")
console.log("  in the case where the cushion is what's binding")
{
  // Uses Vince's real Chime shape, which is genuinely cushion-bound (large
  // monthly surplus, almost nothing on hand). An invented fixture is easy to
  // get wrong here: give it a healthy starting balance and the SURPLUS ends
  // up binding instead, and the test silently stops testing what it claims.
  const { income, bills, debts, startingCash, startingCashAsOf } = CHIME
  const cap = computeMonthlyDebtCapacity({ startingCash, startingCashAsOf, income, bills, debts, today })
  assertTrue(cap.bindingConstraint === "cushion", `this fixture is cushion-bound as intended (got ${cap.bindingConstraint})`)

  const atLimit = lowestUnderMonthlyPayment({ startingCash, startingCashAsOf, income, bills, debts, monthly: cap.monthlyExtra })
  const overLimit = lowestUnderMonthlyPayment({ startingCash, startingCashAsOf, income, bills, debts, monthly: cap.monthlyExtra + 0.01 })

  assertTrue(atLimit >= DEFAULT_PAYOFF_RESERVE - 0.005, `at the recommended amount the cushion holds (${atLimit.toFixed(2)})`)
  assertTrue(overLimit < DEFAULT_PAYOFF_RESERVE, `one cent more and it doesn't (${overLimit.toFixed(2)}) -- the figure is the true maximum, not a guess`)
}

console.log("\nTest 7 -- the recurring figure can never exceed what the account clears monthly,")
console.log("  for any shape of plan (the invariant that keeps this from ever being a trap)")
{
  const shapes: { label: string; startingCash: number; income: CycleIncome[]; debts: CycleDebt[] }[] = [
    { label: "huge balance, thin surplus", startingCash: 50000, income: income53, debts: debts53 },
    { label: "thin balance, huge surplus", startingCash: 200, income: [{ amount: 5000, frequency: "monthly", next_pay_date: "2026-09-20" }], debts: [{ minimum_payment: 100, due_date: 5 }] },
    { label: "balanced", startingCash: 3000, income: [{ amount: 3000, frequency: "monthly", next_pay_date: "2026-09-20" }], debts: [{ minimum_payment: 1500, due_date: 12 }] },
  ]
  for (const shape of shapes) {
    const cap = computeMonthlyDebtCapacity({
      startingCash: shape.startingCash,
      startingCashAsOf: asOf53,
      income: shape.income,
      bills: [],
      debts: shape.debts,
      today,
    })
    assertTrue(
      cap.monthlyExtra <= Math.max(0, cap.structuralSurplus) + 0.005,
      `${shape.label}: $${cap.monthlyExtra}/month never exceeds the $${cap.structuralSurplus}/month the plan clears`
    )
    const lowest = lowestUnderMonthlyPayment({
      startingCash: shape.startingCash,
      startingCashAsOf: asOf53,
      income: shape.income,
      bills: [],
      debts: shape.debts,
      monthly: cap.monthlyExtra,
    })
    assertTrue(
      cap.monthlyExtra === 0 || lowest >= DEFAULT_PAYOFF_RESERVE - 0.005,
      `${shape.label}: simulating it for 12 months keeps the reserve intact (${lowest.toFixed(2)})`
    )
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
