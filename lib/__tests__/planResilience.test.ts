// lib/__tests__/planResilience.test.ts
//
// Deterministic tests for buildUpcomingForecast ("Then what" -- the
// look-ahead panel under Safe to Spend). Run with:
//
//   npx tsx lib/__tests__/planResilience.test.ts
//
// Sep 4 2026, Vince: "if I have this much then how will I be able to pay my
// mortgage Oct 1, car payment Sept 15, and personal loan sept 22nd." Safe to
// Spend only ever shows the window through the very next paycheck, so none
// of those three showed up on screen together anywhere -- these tests lock
// in the exact live numbers from that conversation: the car payment lands
// in the current cycle (already reserved), the personal loan lands in the
// cycle after that (covered by the paycheck arriving before it), and the
// mortgage -- thanks to its 15-day grace period -- doesn't land until the
// cycle after THAT.

import { projectPaycheckCycles, type CycleBill, type CycleDebt, type CycleIncome, type CycleGoal } from "../paycheckCycles"
import { buildUpcomingForecast } from "../planResilience"

let passed = 0
let failed = 0

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const ok =
    typeof actual === "number" && typeof expected === "number"
      ? Math.abs(actual - expected) < 0.005
      : actual === expected
  if (ok) {
    passed++
    console.log(`  PASS  ${label} (${actual})`)
  } else {
    failed++
    console.error(`  FAIL  ${label} -- expected ${expected}, got ${actual}`)
  }
}

// Vince's real Sep 4 2026 data (see lib/__tests__/safeToSpend.test.ts and
// cashBalance.test.ts for the same numbers used elsewhere).
type NamedBill = CycleBill & { name: string }
type NamedDebt = CycleDebt & { name: string }

const bills: NamedBill[] = [
  { name: "BitDefender Mobile", amount: 24.99, due_date: 1, frequency: "monthly" },
  { name: "Netflix", amount: 8.99, due_date: 6, frequency: "monthly" },
  { name: "Anthropic", amount: 20.0, due_date: 7, frequency: "monthly" },
  { name: "Addison Water Bill", amount: 201.54, due_date: 11, frequency: "bimonthly", bimonthly_parity: "odd" },
  { name: "Vercel - Pro", amount: 20.0, due_date: 14, frequency: "monthly" },
  { name: "Xfinity - Internet", amount: 96.31, due_date: 22, frequency: "monthly" },
  { name: "Nicor", amount: 85.0, due_date: 25, frequency: "bimonthly", bimonthly_parity: "odd" },
  { name: "Philo", amount: 25.0, due_date: 27, frequency: "monthly" },
  { name: "ComEd", amount: 120.0, due_date: 27, frequency: "monthly" },
  { name: "Xfinity - Mobile", amount: 142.71, due_date: 28, frequency: "monthly" },
]

const debts: NamedDebt[] = [
  // Nominal due-1, 15-day grace -- effectively due the 16th, per the
  // "mortgage due the 1st but not late until the 16th" fix already shipped.
  { name: "Onity Mortgage", minimum_payment: 2220.86, due_date: 1, grace_period_days: 15, paid_through: "2026-09-01" },
  { name: "PayPal Credit", minimum_payment: 0, due_date: 1 },
  { name: "DiBeasi Global Investments", minimum_payment: 50, due_date: 2 },
  { name: "Meijer Mastercard", minimum_payment: 50, due_date: 4 },
  { name: "Signature Visa", minimum_payment: 50, due_date: 14 },
  { name: "Capital One Auto", minimum_payment: 596.5, due_date: 15 }, // car payment, Sep 15
  { name: "Home Depot Credit Card", minimum_payment: 29, due_date: 22 },
  { name: "Avant", minimum_payment: 507.61, due_date: 22 }, // personal loan, Sep 22
]

const income: CycleIncome[] = [{ amount: 2578.4, frequency: "biweekly", next_pay_date: "2026-09-16" }]
const goals: CycleGoal[] = []

const startingCash = 3678.3 // 53rd Checking + Chime Checking, Sep 4 2026
const today = new Date("2026-09-04T00:00:00")

const cycles = projectPaycheckCycles({ income, bills, debts, goals, today, monthsForward: 3, startingCash })
// cycles[0] is the current cycle (through Sep 16) -- that's what Safe to
// Spend itself already shows. The look-ahead is everything after it.
const forecast = buildUpcomingForecast(
  cycles.slice(1),
  bills,
  debts.map((d) => ({ ...d, amount: d.minimum_payment }))
)

console.log(`Projected ${cycles.length} cycles; forecasting ${forecast.length} beyond the current one`)
console.log(forecast.map((f) => `  ${f.date}: ${f.items.map((i) => i.name).join(", ")} -- ${f.verdict}`).join("\n"))

console.log("\nTest 1 -- the personal loan (Avant, Sep 22) shows up in the FIRST forecasted")
console.log("  cycle (the one covered by the Sep 16 paycheck), not the current one")
{
  const cycle1 = forecast[0]
  assertEqual(cycle1.date, "2026-09-30", "first forecasted cycle is the Sep 30 paycheck")
  const avant = cycle1.items.find((i) => i.name === "Avant")
  assertEqual(!!avant, true, "Avant appears in this cycle's item list")
  assertEqual(avant?.occurrenceDate ?? "", "2026-09-22", "Avant's occurrence date is Sep 22, exactly as Vince asked about")
  assertEqual(cycle1.verdict !== "breaks", true, "this cycle does not break -- the personal loan is covered")
}

console.log("\nTest 2 -- the mortgage (Onity, nominal Oct 1) does NOT land in that same")
console.log("  cycle -- its 15-day grace period pushes its effective date to Oct 16, past")
console.log("  the Sep 30 paycheck's window (which ends Oct 14, not Oct 16)")
{
  const cycle1 = forecast[0]
  const mortgageInCycle1 = cycle1.items.find((i) => i.name === "Onity Mortgage")
  assertEqual(mortgageInCycle1, undefined, "mortgage is not in the Sep 30 cycle's item list")
}

console.log("\nTest 2b -- it doesn't land in the Oct 14 cycle either -- that window ALSO ends")
console.log("  (at Oct 14) before the grace-adjusted Oct 16 date, so this is the cycle a")
console.log("  naive 'due the 1st' read would have wrongly flagged, and doesn't")
{
  const cycle2 = forecast[1]
  assertEqual(cycle2.date, "2026-10-14", "second forecasted cycle is the Oct 14 paycheck")
  const mortgageInCycle2 = cycle2.items.find((i) => i.name === "Onity Mortgage")
  assertEqual(mortgageInCycle2, undefined, "mortgage is not in the Oct 14 cycle's item list either")
}

console.log("\nTest 3 -- the mortgage shows up in the cycle after THAT (Oct 28 paycheck) --")
console.log("  the first window whose end date (Oct 28) actually reaches its grace-adjusted")
console.log("  Oct 16 due date -- and Vince's plan still covers it")
{
  const cycle3 = forecast[2]
  assertEqual(cycle3.date, "2026-10-28", "third forecasted cycle is the Oct 28 paycheck")
  const mortgage = cycle3.items.find((i) => i.name === "Onity Mortgage")
  assertEqual(!!mortgage, true, "mortgage appears in this cycle's item list")
  assertEqual(mortgage?.amount ?? 0, 2220.86, "mortgage amount is the full payment (2220.86)")
  assertEqual(cycle3.verdict !== "breaks", true, "this cycle does not break -- the mortgage is covered")
}

console.log("\nTest 4 -- an empty cycle list forecasts to an empty array (no crash on a plan")
console.log("  with no projectable cycles)")
{
  const empty = buildUpcomingForecast([], bills, debts.map((d) => ({ ...d, amount: d.minimum_payment })))
  assertEqual(empty.length, 0, "no cycles in, no forecast entries out")
}

console.log("\nTest 5 (regression) -- the first forecasted cycle's windowStart is the Sep 16")
console.log("  paycheck -- the exact one Safe to Spend's own window already ends at. Sep 4")
console.log("  2026, Vince: \"your Safe to Spend window ends September 16, but Then what")
console.log("  shows September 30 -- what happened to the paycheck in between?\" Nothing did:")
console.log("  cycles.slice(1) deliberately skips the Sep 16 cycle because Safe to Spend")
console.log("  already answers for it, so this proves there's no missing paycheck, just one")
console.log("  intentionally not repeated")
{
  const cycle1 = forecast[0]
  assertEqual(cycle1.windowStart, "2026-09-16", "the Sep 30 forecast picks up exactly where the Sep 16 paycheck (already shown above) leaves off")
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
