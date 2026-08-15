// lib/csvImport.ts
// Phase 1 of the Autopilot data-strategy pivot (Aug 14-15, 2026): CSV bank-
// transaction import, built with zero Plaid dependency so it doesn't wait
// on Production approval or add per-item cost. See
// /areas/paycheck-planner.md for the background -- Plaid denied Auth, and
// rather than re-fight that, Autopilot gets a data-ingestion layer that
// works today (CSV now, Smart Capture statement scanning later, Plaid
// Transactions later still once there's revenue to justify it).
//
// Pure, deterministic, no network calls -- runs entirely client-side so a
// user's raw bank export never has to leave their browser except as the
// normalized rows they explicitly confirm in the "Review & Import" step
// (see app/import/page.tsx). Every function here is unit-testable in
// isolation.

import Papa from "papaparse"

export type ParsedTransaction = {
  date: string // ISO yyyy-mm-dd
  description: string
  amount: number // positive = inflow/credit, negative = outflow/debit
}

export type CategorizedTransaction = ParsedTransaction & { category: string }

export type RecurringFrequency = "weekly" | "biweekly" | "monthly"

export type RecurringGroup = {
  key: string // stable normalized identity -- used as bills/income.recurring_group_key
  label: string
  kind: "income" | "bill"
  amount: number
  frequency: RecurringFrequency
  occurrences: number
  lastDate: string
  category: string
}

export type ImportAnalysis = {
  transactions: CategorizedTransaction[]
  recurringGroups: RecurringGroup[]
  skippedRows: number // rows Papa/mapping couldn't make sense of
}

// ---------------------------------------------------------------------------
// 1) Parse + column mapping
// ---------------------------------------------------------------------------

const DATE_HEADER_RE = /^(date|posted date|transaction date|post date)$/i
const DESC_HEADER_RE = /^(description|merchant|payee|name|memo)$/i
const AMOUNT_HEADER_RE = /^(amount)$/i
const DEBIT_HEADER_RE = /^(debit|withdrawal)$/i
const CREDIT_HEADER_RE = /^(credit|deposit)$/i

function findHeader(headers: string[], re: RegExp): number {
  return headers.findIndex((h) => re.test(h.trim()))
}

function parseAmount(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null
  const cleaned = raw.replace(/[$,]/g, "").trim()
  if (!cleaned) return null
  // Some exports wrap negatives in parens, e.g. "(45.00)".
  const negParens = /^\((.*)\)$/.exec(cleaned)
  const n = Number(negParens ? "-" + negParens[1] : cleaned)
  return Number.isFinite(n) ? n : null
}

function parseDate(raw: string | undefined): string | null {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

/**
 * Parses a raw CSV string from any typical bank export into normalized
 * transactions. Accepts either a single signed "Amount" column or separate
 * Debit/Credit columns. Case-insensitive on headers; unrecognized columns
 * (balance, check number, etc.) are ignored. Rows that can't be mapped to a
 * date/description/amount are dropped and counted in skippedRows rather
 * than thrown away silently.
 */
export function parseBankCsv(csvText: string): { rows: ParsedTransaction[]; skippedRows: number } {
  const result = Papa.parse<string[]>(csvText.trim(), { skipEmptyLines: true })
  const data = result.data || []
  if (data.length === 0) return { rows: [], skippedRows: 0 }

  const headers = data[0].map((h) => String(h ?? ""))
  const dateIdx = findHeader(headers, DATE_HEADER_RE)
  const descIdx = findHeader(headers, DESC_HEADER_RE)
  const amountIdx = findHeader(headers, AMOUNT_HEADER_RE)
  const debitIdx = findHeader(headers, DEBIT_HEADER_RE)
  const creditIdx = findHeader(headers, CREDIT_HEADER_RE)

  const rows: ParsedTransaction[] = []
  let skippedRows = 0

  for (const line of data.slice(1)) {
    const date = dateIdx >= 0 ? parseDate(line[dateIdx]) : null
    const description = descIdx >= 0 ? String(line[descIdx] ?? "").trim() : ""

    let amount: number | null = null
    if (amountIdx >= 0) {
      amount = parseAmount(line[amountIdx])
    } else if (debitIdx >= 0 || creditIdx >= 0) {
      const debit = debitIdx >= 0 ? parseAmount(line[debitIdx]) ?? 0 : 0
      const credit = creditIdx >= 0 ? parseAmount(line[creditIdx]) ?? 0 : 0
      amount = credit - Math.abs(debit)
    }

    if (!date || !description || amount === null) {
      skippedRows++
      continue
    }
    rows.push({ date, description, amount })
  }

  return { rows, skippedRows }
}

/** Drops exact date+description+amount duplicates (common with pending/posted pairs in the same export). */
export function dedupeTransactions(rows: ParsedTransaction[]): ParsedTransaction[] {
  const seen = new Set<string>()
  const out: ParsedTransaction[] = []
  for (const r of rows) {
    const key = r.date + "|" + r.description.toLowerCase().trim() + "|" + r.amount.toFixed(2)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

// ---------------------------------------------------------------------------
// 2) Categorization -- first-pass keyword taxonomy. Free-text on bills.category
// already (no DB check constraint), so this can evolve without a migration.
// ---------------------------------------------------------------------------

const CATEGORY_RULES: Array<{ re: RegExp; category: string }> = [
  // Money moving between the user's OWN accounts (e.g. "Transfer from Chime
  // Checking Account") is neither income nor a bill from the household's
  // perspective. This must be checked before the generic Income/Other
  // fallback below -- otherwise a recurring, positive-amount transfer gets
  // miscategorized as "Income" and offered up in Review & Import as a
  // confirmable paycheck (a real bug found in QA: a recurring $210.38
  // "Transfer from Chime" got confirmed as income and inflated a user's
  // dashboard income total by 26/12x). See detectRecurring() below, which
  // excludes this category from recurring suggestions entirely.
  { re: /\btransfer(s)? (from|to)\b|internal transfer|account transfer|\bxfer\b/i, category: "Transfer" },
  { re: /netflix|hulu|disney\+|spotify|apple\.com\/bill|hbo|paramount\+|peacock|youtube premium|icloud/i, category: "Subscriptions" },
  { re: /mortgage|rent payment|property mgmt/i, category: "Housing" },
  { re: /electric|power co|utility|water dept|gas company|pg&e|duke energy|comcast|xfinity|spectrum|internet/i, category: "Utilities" },
  { re: /kroger|walmart|target|aldi|publix|safeway|whole foods|trader joe|grocery/i, category: "Groceries" },
  { re: /doordash|ubereats|grubhub|starbucks|mcdonald|chipotle|restaurant|chick-fil-a/i, category: "Dining" },
  { re: /uber \*|uber trip|lyft|shell oil|chevron|exxon|conoco|circle k fuel|gas station/i, category: "Transportation" },
  { re: /insurance|geico|progressive|allstate|state farm/i, category: "Insurance" },
  { re: /payroll|direct dep|salary|paycheck/i, category: "Income" },
  { re: /card payment|autopay|thank you.*payment|payment.*thank you|credit card pmt/i, category: "Debt Payment" },
]

export function categorizeTransaction(t: ParsedTransaction): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(t.description)) return rule.category
  }
  return t.amount > 0 ? "Income" : "Other"
}

// ---------------------------------------------------------------------------
// 3) Recurring detection
// ---------------------------------------------------------------------------

/** Lowercases, strips digits/store IDs/POS prefixes so the same merchant groups together across occurrences. */
export function normalizeMerchantKey(description: string): string {
  return description
    .toLowerCase()
    .replace(/^(sq \*|pos |pmt\*|tst\*)/, "")
    .replace(/#?\d{3,}/g, "") // strip long numeric store/reference IDs
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function frequencyFromGapDays(gap: number): RecurringFrequency | null {
  if (gap >= 5 && gap <= 9) return "weekly"
  if (gap >= 12 && gap <= 16) return "biweekly"
  if (gap >= 26 && gap <= 34) return "monthly"
  return null
}

/**
 * Groups categorized transactions by normalized merchant, and flags groups
 * that occur 2+ times with a consistent amount (within 15%) at a
 * weekly/biweekly/monthly cadence as recurring. A single CSV export is
 * often only 1-3 months, so this deliberately doesn't require 3+
 * occurrences -- two hits at a plausible cadence is enough to surface as a
 * suggestion; the user still confirms it in "Review & Import" before it
 * becomes a real bill/income row.
 */
export function detectRecurring(transactions: CategorizedTransaction[]): RecurringGroup[] {
  const groups = new Map<string, CategorizedTransaction[]>()
  for (const t of transactions) {
    const key = normalizeMerchantKey(t.description)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }

  const recurring: RecurringGroup[] = []

  for (const [key, group] of groups) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date))

    // Never suggest an internal account transfer as a recurring bill/income
    // -- it doesn't represent money entering or leaving the household.
    if (sorted[sorted.length - 1].category === "Transfer") continue

    const amounts = sorted.map((t) => Math.abs(t.amount))
    const avgAmount = amounts.reduce((s, n) => s + n, 0) / amounts.length
    const withinTolerance = amounts.every((a) => Math.abs(a - avgAmount) / avgAmount <= 0.15)
    if (!withinTolerance || avgAmount === 0) continue

    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const days = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000
      gaps.push(days)
    }
    const frequency = frequencyFromGapDays(median(gaps))
    if (!frequency) continue

    const last = sorted[sorted.length - 1]
    recurring.push({
      key,
      label: last.description,
      kind: last.amount > 0 ? "income" : "bill",
      amount: Math.round(avgAmount * 100) / 100,
      frequency,
      occurrences: sorted.length,
      lastDate: last.date,
      category: last.category,
    })
  }

  return recurring.sort((a, b) => b.occurrences - a.occurrences)
}

// ---------------------------------------------------------------------------
// 4) Orchestration
// ---------------------------------------------------------------------------

export function analyzeCsv(csvText: string): ImportAnalysis {
  const { rows, skippedRows } = parseBankCsv(csvText)
  const deduped = dedupeTransactions(rows)
  const transactions: CategorizedTransaction[] = deduped.map((t) => ({
    ...t,
    category: categorizeTransaction(t),
  }))
  const recurringGroups = detectRecurring(transactions)
  return { transactions, recurringGroups, skippedRows }
}
