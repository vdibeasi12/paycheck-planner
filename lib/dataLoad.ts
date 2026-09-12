// lib/dataLoad.ts
//
// CRITICAL FIX (Sep 11 2026, found in a full-codebase audit): every
// money-critical query on the Dashboard and Safe to Spend pages was written
// as
//
//   const { data: billsData } = await supabase.from("bills")...
//   const bills = Array.isArray(billsData) ? billsData : []
//
// -- the `error` field was never destructured, let alone checked. A
// transient failure on `bills` or `debts` therefore did not surface as an
// error. It produced an EMPTY OBLIGATION LIST, which was then fed straight
// into computeSafeToSpend.
//
// That is the single worst direction this app can fail in. An empty
// obligation list does not render a zero or a blank -- it renders a LARGER
// Safe to Spend than the truth, because Safe to Spend is cash minus what is
// owed and "what is owed" just silently became nothing. The user is told
// they have more money than they do, by an app whose entire job is to stop
// exactly that, and nothing anywhere on the page indicates a problem.
//
// The rule this file enforces: a query that fails is never quietly treated
// as "no rows." It is recorded, and the page shows an honest error instead
// of numbers it cannot stand behind. Returning nothing is always better than
// returning a number that is wrong in the dangerous direction.

export type LoadTracker = { failed: string[] }

export function newLoadTracker(): LoadTracker {
  return { failed: [] }
}

// Wrap a Supabase select whose rows feed a financial calculation. `label` is
// what the user sees named in the error state, so use plain words ("bills",
// "debts"), not table names, where they differ.
//
// Note the deliberate asymmetry with a null/empty `data`: a successful query
// that legitimately returns no rows is NOT a failure -- a new user really
// does have no bills yet. Only a non-null `error` counts.
export function rowsOrFail<T>(
  tracker: LoadTracker,
  label: string,
  result: { data: T[] | null; error: unknown | null }
): T[] {
  if (result.error) {
    // Server-rendered pages have no client console; this is the only place
    // the underlying cause is recoverable from.
    console.error(`[dataLoad] failed to load ${label}:`, result.error)
    if (!tracker.failed.includes(label)) tracker.failed.push(label)
    return []
  }
  return Array.isArray(result.data) ? result.data : []
}

export function didAnyLoadFail(tracker: LoadTracker): boolean {
  return tracker.failed.length > 0
}
