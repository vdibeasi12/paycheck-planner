export type Debt = {
  id: string
  name: string
  balance: number
  interest_rate: number
  minimum_payment: number
}

// --- SAFETY HELPERS ---
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

// --- CORE PAYOFF ENGINE ---
export function calculatePayoff(debts: Debt[] = []) {
  if (!debts || debts.length === 0) {
    return {
      months: 0,
      totalInterest: 0,
    }
  }

  const workingDebts = debts.map((d) => {
    const clean = sanitizeDebt(d)

    return {
      balance: clean.balance,
      rate: clean.interest_rate / 100 / 12,
      payment: clean.minimum_payment,
    }
  })

  let totalInterest = 0
  let months = 0

  while (workingDebts.some((d) => d.balance > 0) && months < 600) {
    months++

    workingDebts.forEach((debt) => {
      if (debt.balance <= 0) return

      const interest = debt.balance * debt.rate
      totalInterest += interest

      debt.balance += interest
      debt.balance -= debt.payment

      if (debt.balance < 0) {
        debt.balance = 0
      }
    })
  }

  return {
    months,
    totalInterest: Number(totalInterest.toFixed(2)),
  }
}