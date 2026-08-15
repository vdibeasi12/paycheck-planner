// lib/billDebtOverlap.ts
// QA-reported confusion (Aug 15 2026): nothing tells a user that a mortgage,
// auto loan, or student loan being tracked in Debts also shouldn't be
// re-entered as a recurring Bill -- both pages independently ask for "name +
// amount + how often," so there's no visual cue that they represent
// different things. Entering it twice doesn't corrupt any single number
// (Bills and Debts are summed separately everywhere today), but it does mean
// the same monthly obligation gets counted twice in any total that adds
// bills + debt payments together (e.g. Safe-to-Spend), and it's genuinely
// unclear to a new user which page a mortgage payment belongs in.
//
// This is a lightweight, name-based heuristic -- not a data-integrity
// guarantee. It flags likely duplicates for a human to glance at; it
// deliberately never blocks or auto-merges anything.

export type NamedThing = { id?: string; name: string }

const STOPWORDS = new Set([
  "the", "inc", "llc", "corp", "co", "company", "payment", "payments",
  "loan", "monthly", "bill", "account", "acct", "card", "of", "and",
])

/** Lowercases, strips punctuation, and drops generic filler words so two
 * differently-worded names for the same thing ("Onity Mortgage" vs "Onity
 * Mortgage Payment") still compare as equal or overlapping. */
function significantTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
}

export type BillDebtOverlap = {
  bill: NamedThing
  debt: NamedThing
  sharedTokens: string[]
}

/**
 * Flags bill/debt pairs whose names share at least one distinctive word
 * (4+ letters, not a generic filler like "payment" or "loan") -- e.g. a
 * "Mortgage" bill against an "Onity Mortgage" debt, or a "Capital One" bill
 * against a "Capital One Auto" debt. Intentionally simple: this won't catch
 * synonyms ("Car Payment" bill vs "Auto Loan" debt), only shared wording.
 */
export function findBillDebtOverlaps(
  bills: NamedThing[],
  debts: NamedThing[]
): BillDebtOverlap[] {
  const debtTokens = debts.map((d) => ({ debt: d, tokens: significantTokens(d.name) }))
  const overlaps: BillDebtOverlap[] = []

  for (const bill of bills) {
    const billTokens = significantTokens(bill.name)
    if (billTokens.length === 0) continue

    for (const { debt, tokens } of debtTokens) {
      const shared = billTokens.filter((t) => tokens.includes(t))
      if (shared.length > 0) {
        overlaps.push({ bill, debt, sharedTokens: shared })
      }
    }
  }

  return overlaps
}
