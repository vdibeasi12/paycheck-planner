// lib/cronBatch.ts
//
// Shared guardrails for the daily cron routes. Written Sep 12 2026 after the
// audit found the same three defects in four of them
// (bank-balance-refresh, bill-reminders, payday-reminder,
// paycheck-autopilot):
//
//   1. The driving SELECT had no .limit() and no pagination. Supabase/PostgREST
//      caps a response at max-rows anyway (1000 by default), so "no limit" did
//      not mean "every row" -- it meant "the first 1000, silently." Past that
//      point users simply stopped being processed, with nothing in the response
//      distinguishing "1000 users, all handled" from "1000 of 4000."
//
//   2. No maxDuration. The routes ran at the platform default, which is far
//      shorter than a serial walk over every user takes. Vercel kills the
//      function mid-user: no JSON comes back, no totals, and the per-item error
//      handling inside the loop never runs.
//
//   3. Nothing bounded the response body. Every one of them accumulated a
//      `results` row per user and returned all of them.
//
// The distinction that shapes this file: bank-balance-refresh may safely defer
// work (a balance a day stale is fine, and it rotates least-recently-synced
// first, so nothing starves). The reminder crons may NOT. A bill reminder
// skipped today is not sent late -- tomorrow's run targets a different due
// day, so it is never sent at all. So these helpers page through EVERY row
// rather than truncating, and when the clock beats them they report exactly
// how many users were missed instead of returning a cheerful ok:true.

// NOTE on maxDuration: each route declares `export const maxDuration = 300`
// as a bare literal rather than importing a shared constant from here. Next.js
// route-segment config is read by static analysis at build time, so an
// imported value is not guaranteed to be picked up -- it would silently fall
// back to the platform default, which is the exact failure this is meant to
// prevent. 300 is Vercel Pro's ceiling for a standard Node function.

// Stop STARTING new work at this point. The 60s of headroom is what lets the
// route return a real summary rather than being killed: a run that reports
// "skipped: 240" is a page you can act on, a run that vanishes is not.
export const CRON_TIME_BUDGET_MS = 240_000

// PostgREST's default max-rows. Pages are requested at exactly this size so a
// short page reliably means "last page."
const PAGE_SIZE = 1000

// Absolute ceiling across all pages. Not a target -- a circuit breaker, so a
// runaway table cannot turn one cron run into an unbounded read. Hitting it is
// reported, never silent.
const MAX_ROWS = 20_000

// Cap on the per-user detail returned in the response body. Totals stay exact;
// only the row-by-row listing is trimmed.
export const CRON_MAX_RESULT_ROWS = 200

export function overBudget(startedAt: number, budgetMs: number = CRON_TIME_BUDGET_MS): boolean {
  return Date.now() - startedAt > budgetMs
}

/**
 * Read every row a query matches, one PAGE_SIZE page at a time.
 *
 * `page` receives an inclusive [from, to] range to hand to Supabase's
 * .range(). Written as a callback rather than taking a table name and filters
 * because each caller's filters differ enough (.or(), .eq(), column lists)
 * that a generic wrapper would be more indirection than it saves.
 *
 * Returns `truncated: true` only if MAX_ROWS was reached -- distinct from
 * `error`, and distinct from an ordinary short final page.
 */
export async function fetchAllRows<T>(
  label: string,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<{ rows: T[]; error: unknown; truncated: boolean }> {
  const rows: T[] = []
  let from = 0

  for (;;) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error(`[cron:${label}] page ${from}-${from + PAGE_SIZE - 1} failed:`, error)
      return { rows, error, truncated: false }
    }

    const batch = Array.isArray(data) ? data : []
    rows.push(...batch)

    // A short page is the last page.
    if (batch.length < PAGE_SIZE) return { rows, error: null, truncated: false }

    if (rows.length >= MAX_ROWS) {
      console.warn(`[cron:${label}] hit the ${MAX_ROWS}-row ceiling; remaining rows were not read`)
      return { rows, error: null, truncated: true }
    }
    from += PAGE_SIZE
  }
}

/**
 * Run `worker` over `items`, stopping cleanly once the time budget is spent.
 *
 * Serial by default (concurrency 1), which is deliberate for anything that
 * sends email: Resend rate-limits per second, and a 429 on a real user's bill
 * reminder is a worse outcome than a slower run. Raise concurrency only for
 * work that is purely database/push -- and if an email cron ever does need it,
 * the number to check first is the Resend plan's requests-per-second.
 *
 * A worker that throws is logged and counted, never fatal: one user's bad row
 * must not cost every user after them their reminder.
 */
export async function forEachWithBudget<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  opts: { startedAt: number; label: string; concurrency?: number; budgetMs?: number }
): Promise<{ processed: number; skipped: number; failed: number }> {
  const concurrency = Math.max(1, opts.concurrency ?? 1)
  const budgetMs = opts.budgetMs ?? CRON_TIME_BUDGET_MS

  let next = 0
  let processed = 0
  let failed = 0

  async function drain(): Promise<void> {
    for (;;) {
      if (overBudget(opts.startedAt, budgetMs)) return
      const i = next++
      if (i >= items.length) return
      try {
        await worker(items[i], i)
      } catch (e) {
        failed++
        console.error(`[cron:${opts.label}] item ${i} threw:`, e)
      }
      processed++
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => drain()))

  // `next` can overshoot by up to `concurrency` when workers claim an index
  // and then find themselves past the deadline, so derive skipped from what
  // actually completed rather than from the cursor.
  const skipped = Math.max(0, items.length - processed)
  if (skipped > 0) {
    console.warn(
      `[cron:${opts.label}] time budget reached after ${processed} of ${items.length}; ${skipped} not processed`
    )
  }
  return { processed, skipped, failed }
}
