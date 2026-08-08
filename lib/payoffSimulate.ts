// Shared debt-payoff simulation engine.
// Used by both the full Payoff Plan page/schedule (AmortizationSchedule.tsx)
// and any compact widgets (e.g. the quick summary on the Debts page) so the
// numbers can never drift apart between the two.

export type Debt = {
  id: string
  name: string
  balance: number
  interest_rate: number
  minimum_payment: number
}

export type Strategy = "snowball" | "avalanche"

export type DebtRow = {
  month: number
  label: string
  debtId: string
  debtName: string
  startBalance: number
  payment: number
  interest: number
  principal: number
  endBalance: number
}

export type MonthRow = {
  month: number
  label: string
  startBalance: number
  payment: number
  interest: number
  principal: number
  endBalance: number
}

export type PerDebt = {
  id: string
  name: string
  payoffMonth: number
  payoffLabel: string
  totalInterest: number
}

export type Sim = {
  monthlyRows: MonthRow[]
  debtRows: DebtRow[]
  perDebt: PerDebt[]
  months: number
  totalInterest: number
  totalPaid: number
  capped: boolean
  nonAmortizing: boolean
}

const MAX_MONTHS = 600

export const round2 = (n: number) => Math.round(n * 100) / 100

// Snowball (smallest balance first) and Avalanche (highest rate first) only
// ever produce different numbers when they disagree on the payoff order.
// With a small number of debts it's common for balance rank and rate rank
// to happen to line up -- in that case both strategies are mathematically
// forced to produce identical results, at any extra-payment amount. This
// lets the UI say so explicitly instead of silently showing the same
// numbers twice, which looks like a bug even though it's correct.
export function strategiesTie(debts: Debt[]): boolean {
  const active = debts.filter((d) => (Number(d.balance) || 0) > 0)
  if (active.length < 2) return true

  const byBalance = [...active].sort(
    (a, b) => (Number(a.balance) || 0) - (Number(b.balance) || 0)
  )
  const byRate = [...active].sort(
    (a, b) => (Number(b.interest_rate) || 0) - (Number(a.interest_rate) || 0)
  )

  return byBalance.every((d, i) => d.id === byRate[i].id)
}

// The single source of truth for "what order does this strategy tackle debts
// in" -- Snowball is smallest balance first, Avalanche is highest rate
// first. Used to visually order both the Debts page list and the Payoff
// Plan page's "Payoff order" section, so they always agree with each other.
// Deliberately NOT the same as "the order debts actually reach zero in the
// simulation" -- that can differ when a high-rate debt's minimum payment
// barely covers its own interest, causing it to amortize slower in wall-
// clock time than its strategy priority would suggest. This function always
// reflects the strategy's stated priority, not simulation timing.
export function strategyOrder<T extends Debt>(debts: T[], strategy: Strategy): T[] {
  const copy = [...debts]
  if (strategy === "snowball") {
    copy.sort((a, b) => (Number(a.balance) || 0) - (Number(b.balance) || 0))
  } else {
    copy.sort((a, b) => (Number(b.interest_rate) || 0) - (Number(a.interest_rate) || 0))
  }
  return copy
}

export function monthLabel(start: Date, offset: number): string {
  const d = new Date(start.getFullYear(), start.getMonth() + offset, 1)
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export function simulate(debts: Debt[], strategy: Strategy, extra: number, start: Date): Sim {
  // Working copy of each debt, cents-safe.
  // interest_rate is treated as an annual percentage (e.g. 19.99 = 19.99% APR).
  const working = debts
    .map((d) => ({
      id: d.id,
      name: d.name || "Debt",
      balance: round2(Math.max(0, Number(d.balance) || 0)),
      monthlyRate: Math.max(0, Number(d.interest_rate) || 0) / 100 / 12,
      min: round2(Math.max(0, Number(d.minimum_payment) || 0)),
      totalInterest: 0,
      payoffMonth: 0,
    }))
    .filter((d) => d.balance > 0)

  const budget = round2(working.reduce((s, d) => s + d.min, 0) + Math.max(0, extra))

  const monthlyRows: MonthRow[] = []
  const debtRows: DebtRow[] = []

  let nonAmortizing = false
  let capped = false
  let totalInterest = 0
  let totalPaid = 0
  let month = 0

  const active = () => working.filter((d) => d.balance > 0.005)

  // If the constant budget cannot cover the first month's total interest,
  // balances never fall and there is no payoff.
  const firstInterest = working.reduce((s, d) => s + d.balance * d.monthlyRate, 0)
  if (budget <= round2(firstInterest)) {
    nonAmortizing = true
  }

  while (!nonAmortizing && active().length > 0 && month < MAX_MONTHS) {
    month += 1
    const label = monthLabel(start, month - 1)

    const order =
      strategy === "snowball"
        ? [...active()].sort((a, b) => a.balance - b.balance)
        : [...active()].sort((a, b) => b.monthlyRate - a.monthlyRate)

    // 1) Accrue interest on every active debt.
    const monthStart: Record<string, number> = {}
    const monthInterest: Record<string, number> = {}
    const monthPaid: Record<string, number> = {}
    for (const d of active()) {
      monthStart[d.id] = d.balance
      const interest = round2(d.balance * d.monthlyRate)
      monthInterest[d.id] = interest
      d.balance = round2(d.balance + interest)
      d.totalInterest = round2(d.totalInterest + interest)
      totalInterest = round2(totalInterest + interest)
    }

    // 2) Pay minimums on all active debts to stay current.
    let available = budget
    for (const d of active()) {
      const pay = round2(Math.min(d.min, d.balance, available))
      d.balance = round2(d.balance - pay)
      available = round2(available - pay)
      monthPaid[d.id] = round2((monthPaid[d.id] || 0) + pay)
    }

    // 3) Direct the remaining budget at debts in strategy order (the snowball).
    for (const d of order) {
      if (available <= 0) break
      if (d.balance <= 0) continue
      const pay = round2(Math.min(available, d.balance))
      d.balance = round2(d.balance - pay)
      available = round2(available - pay)
      monthPaid[d.id] = round2((monthPaid[d.id] || 0) + pay)
    }

    // 4) Record per-debt rows for debts touched this month + combined totals.
    let mStart = 0
    let mPay = 0
    let mInt = 0
    let mEnd = 0
    for (const d of working) {
      const sBal = monthStart[d.id]
      if (sBal === undefined) continue
      const pay = round2(monthPaid[d.id] || 0)
      const interest = round2(monthInterest[d.id] || 0)
      const rawEnd = round2(d.balance)
      const end = rawEnd < 0.005 ? 0 : rawEnd
      const principal = round2(pay - interest)
      debtRows.push({
        month,
        label,
        debtId: d.id,
        debtName: d.name,
        startBalance: sBal,
        payment: pay,
        interest,
        principal,
        endBalance: end,
      })
      mStart = round2(mStart + sBal)
      mPay = round2(mPay + pay)
      mInt = round2(mInt + interest)
      mEnd = round2(mEnd + end)
      totalPaid = round2(totalPaid + pay)
      if (d.balance <= 0.005 && d.payoffMonth === 0) {
        d.payoffMonth = month
      }
    }

    monthlyRows.push({
      month,
      label,
      startBalance: mStart,
      payment: mPay,
      interest: mInt,
      principal: round2(mPay - mInt),
      endBalance: mEnd,
    })
  }

  if (active().length > 0 && month >= MAX_MONTHS) {
    capped = true
  }

  const perDebt: PerDebt[] = working.map((d) => ({
    id: d.id,
    name: d.name,
    payoffMonth: d.payoffMonth,
    payoffLabel: d.payoffMonth > 0 ? monthLabel(start, d.payoffMonth - 1) : "-",
    totalInterest: round2(d.totalInterest),
  }))

  return {
    monthlyRows,
    debtRows,
    perDebt,
    months: month,
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    capped,
    nonAmortizing,
  }
}
