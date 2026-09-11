// lib/__tests__/dstSafety.test.ts
//
// Sep 11 2026. A full-codebase audit found that weekly/biweekly recurrence and
// addDays() both stepped dates by adding 86,400,000 ms. A local calendar day
// is 23 or 25 hours on the two days a year the clocks change, so those steps
// drifted off local midnight and, once drifted, an occurrence could fail a
// <= monthEnd comparison and be dropped outright. A whole biweekly PAYCHECK
// disappeared from July 2026 and Safe to Spend reported a shortfall that did
// not exist.
//
// Every other suite in this repo ran green through all of it, and always
// would have: CI and the dev container both run in UTC, which has no DST, so
// the bug was invisible to them by construction. This file exists to close
// that specific blind spot -- it pins the process timezone to one that
// observes DST BEFORE importing anything, so the date helpers are built
// against a DST-observing clock.
//
// Run with: npx tsx lib/__tests__/dstSafety.test.ts
//
// The timezone is set BEFORE the dynamic imports below, and the imports are
// dynamic for exactly that reason: a static `import` is hoisted and would
// evaluate the date helpers before this line ran. tsx compiles this file to
// CommonJS, which has no top-level await, so the whole suite runs inside
// main().
process.env.TZ = "America/New_York"

let passed = 0
let failed = 0

function assertTrue(cond: boolean, label: string) {
  if (cond) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failed++
    console.error(`  FAIL  ${label}`)
  }
}

function assertEqual(actual: number, expected: number, label: string) {
  assertTrue(Math.abs(actual - expected) < 0.005, `${label} (got ${actual}, expected ${expected})`)
}

async function main() {
const { occurrencesInMonth } = await import("../schedule")
const { addDays, toISODate, daysBetween } = await import("../paycheckCycles")
const { computeSafeToSpend } = await import("../safeToSpend")

console.log("Running in TZ =", Intl.DateTimeFormat().resolvedOptions().timeZone)

console.log("\nTest 1 -- addDays moves exactly one calendar day across both DST changes")
{
  // Nov 1 2026 is the US fall-back date; Mar 8 2026 is spring-forward.
  // Before the fix: addDays("2026-11-01", 1) returned 2026-11-01 (no movement
  // at all) and addDays("2026-03-09", -1) returned 2026-03-07 (skipped two).
  const cases: [string, number, string][] = [
    ["2026-11-01", 1, "2026-11-02"],
    ["2026-10-31", 1, "2026-11-01"],
    ["2026-11-02", -1, "2026-11-01"],
    ["2026-03-08", 1, "2026-03-09"],
    ["2026-03-09", -1, "2026-03-08"],
    ["2026-03-07", 1, "2026-03-08"],
  ]
  for (const [from, n, want] of cases) {
    const got = toISODate(addDays(new Date(from + "T00:00:00"), n))
    assertTrue(got === want, `addDays(${from}, ${n}) = ${want} (got ${got})`)
  }
  // The grace-period case this actually broke: a mortgage nominally due the
  // 1st with 15 days of grace, across the fall-back boundary.
  const effective = toISODate(addDays(new Date("2026-11-01T00:00:00"), 15))
  assertTrue(effective === "2026-11-16", `a 15-day grace period from Nov 1 lands on Nov 16 (got ${effective})`)
}

console.log("\nTest 2 -- a biweekly paycheck is never dropped from a month")
{
  // Anchored Jan 2 2026, the true series reaches 2026-07-31. Before the fix
  // the accumulated drift put it at 23:00 on 07-30, which failed the
  // `current <= monthEnd` test against local midnight, so July returned only
  // two paychecks instead of three.
  const july = occurrencesInMonth("2026-01-02", "biweekly", 2026, 6)
  assertTrue(
    JSON.stringify(july) === JSON.stringify(["2026-07-03", "2026-07-17", "2026-07-31"]),
    `July 2026 keeps all three paychecks (got ${JSON.stringify(july)})`
  )

  // Every occurrence across a full year must land on the anchor's weekday --
  // a drifted step shows up as a weekday change.
  const anchorDow = new Date("2026-01-02T00:00:00").getDay()
  let checked = 0
  const drifted: string[] = []
  for (let m = 0; m < 12; m++) {
    for (const d of occurrencesInMonth("2026-01-02", "biweekly", 2026, m)) {
      checked++
      if (new Date(d + "T00:00:00").getDay() !== anchorDow) drifted.push(d)
    }
  }
  assertTrue(drifted.length === 0, `no occurrence drifts off the anchor's weekday (drifted: ${JSON.stringify(drifted)})`)
  assertTrue(checked === 26, `a full year of biweekly pay is exactly 26 dates (got ${checked})`)

  // Two rows describing the SAME real schedule from different anchors must
  // agree, including after both have stepped through a clock change.
  // 2026-10-09 is genuinely on the Jan-2 series (Jan 2 + 20 steps of 14 days);
  // 2026-10-16 is NOT -- it is a week offset and a different series, so those
  // two are expected to differ and would not test anything.
  const fromJan = occurrencesInMonth("2026-01-02", "biweekly", 2026, 10)
  const fromOct = occurrencesInMonth("2026-10-09", "biweekly", 2026, 10)
  assertTrue(
    JSON.stringify(fromJan) === JSON.stringify(fromOct),
    `two anchors on one series agree in November (${JSON.stringify(fromJan)} vs ${JSON.stringify(fromOct)})`
  )
}

console.log("\nTest 3 -- Safe to Spend doesn't invent a shortfall from a lost paycheck")
{
  // The end-to-end shape of the live bug: $1,660 biweekly, one $1,500 bill,
  // $800 on hand, read in July. The missing 07-31 paycheck made this report
  // -$700 with the next paycheck two weeks later than it really was.
  const r = computeSafeToSpend({
    income: [{ amount: 1660, frequency: "biweekly", next_pay_date: "2026-01-02", income_type: null }],
    bills: [{ amount: 1500, due_date: 1 }],
    debts: [],
    goals: [],
    today: new Date("2026-07-20T00:00:00"),
    startingCash: 800,
    startingCashAsOf: "2026-07-20",
  })
  assertTrue(r.nextPaycheckDate === "2026-07-31", `next paycheck is July 31, not mid-August (got ${r.nextPaycheckDate})`)
  assertTrue(r.safeToSpend >= 0, `no phantom shortfall (safeToSpend ${r.safeToSpend})`)
}

console.log("\nTest 4 -- daysBetween stays whole across a clock change")
{
  assertEqual(daysBetween("2026-10-31", "2026-11-02"), 2, "Oct 31 -> Nov 2 is 2 days")
  assertEqual(daysBetween("2026-03-07", "2026-03-09"), 2, "Mar 7 -> Mar 9 is 2 days")
  assertEqual(daysBetween("2026-01-01", "2026-12-31"), 364, "a full year of days")
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
}

main()
