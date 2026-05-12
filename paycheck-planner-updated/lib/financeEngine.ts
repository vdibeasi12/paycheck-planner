export type Debt = {
  id: string
  name: string
  balance: number
  interest_rate: number
  minimum_payment: number
}

export type TimelineResult = {
  month: number
  remainingBalance: number
}

// --- INTERNAL SAFETY HELPERS ---
function safeNumber(value: any): number {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

function sanitizeDebt(debt: any): Debt {
  return {
    id: String(debt.id ?? crypto.randomUUID()),
    name: String(debt.name ?? "Unnamed Debt"),
    balance: safeNumber(debt.balance),
    interest_rate: safeNumber(debt.interest_rate),
    minimum_payment: safeNumber(debt.minimum_payment),
  }
}

// --- CORE ENGINE ---
export function calculatePayoffTimeline(
  debts: Debt[] = [],
  strategy: "snowball" | "avalanche" = "avalanche"
): TimelineResult[] {

  if (!debts || debts.length === 0) {
    return []
  }

  // SANITIZE INPUT (CRITICAL)
  const workingDebts = debts.map(d => sanitizeDebt(d))

  // SORT STRATEGY
  if (strategy === "snowball") {
    workingDebts.sort((a, b) => a.balance - b.balance)
  } else {
    workingDebts.sort((a, b) => b.interest_rate - a.interest_rate)
  }

  let month = 0
  const timeline: TimelineResult[] = []

  while (workingDebts.some(d => d.balance > 0) && month < 600) {
    month++

    workingDebts.forEach(debt => {
      if (debt.balance <= 0) return

      const interest =
        (debt.balance * debt.interest_rate) / 100 / 12

      debt.balance += interest
      debt.balance -= debt.minimum_payment

      if (debt.balance < 0) {
        debt.balance = 0
      }
    })

    const remainingBalance = workingDebts.reduce(
      (sum, d) => sum + d.balance,
      0
    )

    timeline.push({
      month,
      remainingBalance: Number(remainingBalance.toFixed(2)),
    })
  }

  return timeline
}

// --- TOTAL DEBT ---
export function calculateTotalDebt(debts: Debt[] = []): number {
  if (!debts || debts.length === 0) return 0

  return debts.reduce((sum, debt) => {
    return sum + safeNumber(debt.balance)
  }, 0)
}

// --- MONTHS TO FREEDOM ---
export function calculateDebtFreeMonths(
  debts: Debt[] = [],
  strategy: "snowball" | "avalanche" = "avalanche"
): number {

  const timeline = calculatePayoffTimeline(debts, strategy)

  if (timeline.length === 0) {
    return 0
  }

  return timeline[timeline.length - 1].month
}