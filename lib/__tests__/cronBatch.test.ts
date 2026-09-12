// lib/__tests__/cronBatch.test.ts
//
// Sep 12 2026. lib/cronBatch.ts is shared by four daily cron routes, and the
// bugs it exists to prevent are all invisible in production: a run that
// processes 1000 of 4000 users returns the same cheerful 200 as one that
// processed all of them. There is no user-facing symptom to notice, so the
// only place these guarantees can be checked is here.
//
// The properties that actually matter, and what breaks if each regresses:
//
//   fetchAllRows must return EVERY row, not one PostgREST page. A regression
//   here silently stops reminding everyone past the first page.
//
//   fetchAllRows must distinguish a short final page (normal) from the
//   MAX_ROWS ceiling (truncated: true). Conflating them turns a circuit
//   breaker back into a silent drop.
//
//   forEachWithBudget must report `skipped` accurately. The routes set
//   ok:false off it, so an undercount is worse than useless -- it would
//   claim success on a run that missed people.
//
//   One throwing item must not cost every item after it its reminder.
//
// Run with: npx tsx lib/__tests__/cronBatch.test.ts

import { fetchAllRows, forEachWithBudget, overBudget } from "../cronBatch"

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
  assertTrue(actual === expected, `${label} (got ${actual}, expected ${expected})`)
}

// A fake table of `total` rows that answers .range(from, to) the way
// PostgREST does: an inclusive slice, short on the last page.
function fakeTable(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }))
  let calls = 0
  return {
    get calls() {
      return calls
    },
    page(from: number, to: number) {
      calls++
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null })
    },
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  console.log("\nTest 1 -- fetchAllRows reads every row, across page boundaries")
  {
    // 1 is the trivial case; 1000 is the exact-page-boundary case that a
    // naive "stop when the page is empty" loop gets wrong by one request, and
    // that a naive "stop when short" loop gets right only if it then asks for
    // the empty page. 2500 spans three pages.
    for (const total of [0, 1, 999, 1000, 1001, 2500]) {
      const t = fakeTable(total)
      const { rows, error, truncated } = await fetchAllRows<{ id: number }>("test", t.page)
      assertTrue(
        rows.length === total && !error && !truncated,
        `${total} rows read back in full (got ${rows.length}, truncated=${truncated})`
      )
    }
  }

  console.log("\nTest 2 -- rows come back in order with nothing dropped or duplicated")
  {
    const t = fakeTable(2500)
    const { rows } = await fetchAllRows<{ id: number }>("test", t.page)
    const contiguous = rows.every((r, i) => r.id === i)
    assertTrue(contiguous, "ids are 0..2499 with no gaps or repeats")
    assertEqual(new Set(rows.map((r) => r.id)).size, 2500, "no duplicates across page boundaries")
  }

  console.log("\nTest 3 -- an exact multiple of the page size does not stop one page early")
  {
    // The failure this pins: 1000 rows arriving as one full page. If the loop
    // treats "full page" as "there must be more" it makes a second request
    // and gets zero -- fine. If it treats a full page as the end, it returns
    // 1000 and would return 1000 for 4000 rows too. Both must give 1000 here
    // AND 2000 for 2000, which Test 1 covers; this pins the request count so
    // the loop cannot silently become O(1) page.
    const t = fakeTable(1000)
    const { rows } = await fetchAllRows<{ id: number }>("test", t.page)
    assertEqual(rows.length, 1000, "all 1000 returned")
    assertTrue(t.calls >= 2, `asked for the page after the full one (calls=${t.calls})`)
  }

  console.log("\nTest 4 -- a failed page returns the error and the rows read so far")
  {
    let calls = 0
    const { rows, error, truncated } = await fetchAllRows<{ id: number }>("test", (from, to) => {
      calls++
      if (calls === 2) return Promise.resolve({ data: null, error: { message: "boom" } })
      return Promise.resolve({
        data: Array.from({ length: to - from + 1 }, (_, i) => ({ id: from + i })),
        error: null,
      })
    })
    assertTrue(!!error, "the error is surfaced, not swallowed")
    assertEqual(rows.length, 1000, "the first page's rows are still returned")
    assertTrue(!truncated, "an error is reported as an error, not as truncation")
  }

  console.log("\nTest 5 -- forEachWithBudget processes everything when there is time")
  {
    const seen: number[] = []
    const r = await forEachWithBudget(
      [1, 2, 3, 4, 5],
      async (n) => {
        seen.push(n)
      },
      { startedAt: Date.now(), label: "test" }
    )
    assertEqual(r.processed, 5, "processed all five")
    assertEqual(r.skipped, 0, "nothing skipped")
    assertEqual(r.failed, 0, "nothing failed")
    assertTrue(seen.join(",") === "1,2,3,4,5", "serial order preserved at concurrency 1")
  }

  console.log("\nTest 6 -- an empty list returns immediately rather than hanging")
  {
    const r = await forEachWithBudget([], async () => {}, { startedAt: Date.now(), label: "test" })
    assertEqual(r.processed, 0, "processed 0")
    assertEqual(r.skipped, 0, "skipped 0")
  }

  console.log("\nTest 7 -- the time budget stops the run and reports the miss honestly")
  {
    // Ten items at 20ms each against a 50ms budget: a handful get done and
    // the rest must be reported, because the routes turn `skipped` into
    // ok:false. processed + skipped must always equal the input length --
    // that identity is what makes the number trustworthy.
    const r = await forEachWithBudget(
      Array.from({ length: 10 }, (_, i) => i),
      async () => {
        await sleep(20)
      },
      { startedAt: Date.now(), label: "test", budgetMs: 50 }
    )
    assertTrue(r.skipped > 0, `stopped early rather than running to completion (skipped=${r.skipped})`)
    assertTrue(r.processed < 10, `did not process all ten (processed=${r.processed})`)
    assertEqual(r.processed + r.skipped, 10, "processed + skipped accounts for every item")
  }

  console.log("\nTest 8 -- one throwing item does not cost the rest their turn")
  {
    const seen: number[] = []
    const r = await forEachWithBudget(
      [1, 2, 3, 4, 5],
      async (n) => {
        if (n === 3) throw new Error("bad row")
        seen.push(n)
      },
      { startedAt: Date.now(), label: "test" }
    )
    assertEqual(r.failed, 1, "the failure is counted")
    assertEqual(r.processed, 5, "every item was still attempted")
    assertEqual(r.skipped, 0, "a thrown item is attempted, not skipped")
    assertTrue(seen.join(",") === "1,2,4,5", "the items after the bad one still ran")
  }

  console.log("\nTest 9 -- concurrency runs items in parallel without losing or repeating any")
  {
    const seen: number[] = []
    let inFlight = 0
    let peak = 0
    const items = Array.from({ length: 12 }, (_, i) => i)
    const r = await forEachWithBudget(
      items,
      async (n) => {
        inFlight++
        peak = Math.max(peak, inFlight)
        await sleep(5)
        seen.push(n)
        inFlight--
      },
      { startedAt: Date.now(), label: "test", concurrency: 4 }
    )
    assertEqual(r.processed, 12, "all twelve processed")
    assertEqual(new Set(seen).size, 12, "each item ran exactly once")
    assertTrue(peak > 1, `work actually overlapped (peak in flight = ${peak})`)
    assertTrue(peak <= 4, `never exceeded the concurrency limit (peak = ${peak})`)
  }

  console.log("\nTest 10 -- overBudget is false at the start and true past the budget")
  {
    assertTrue(!overBudget(Date.now(), 1000), "not over budget immediately")
    assertTrue(overBudget(Date.now() - 5000, 1000), "over budget after the window has passed")
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
