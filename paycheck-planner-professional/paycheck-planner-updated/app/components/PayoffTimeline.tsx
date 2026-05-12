export type Debt = {
  name: string
  balance: number
  interest_rate: number
  minimum_payment: number
}

export type TimelineResult = {
  month: number
  remainingBalance: number
}

export function calculatePayoffTimeline(
  debts: Debt[] = [],
  strategy: "snowball" | "avalanche" = "avalanche"
): TimelineResult[] {

  if (!debts || debts.length === 0) {
    return []
  }

  const workingDebts = debts.map(d => ({ ...d }))

  if (strategy === "snowball") {
    workingDebts.sort((a, b) => a.balance - b.balance)
  }

  if (strategy === "avalanche") {
    workingDebts.sort((a, b) => b.interest_rate - a.interest_rate)
  }

  let month = 0
  const timeline: TimelineResult[] = []

  while (workingDebts.some(d => d.balance > 0) && month < 600) {
    month++

    workingDebts.forEach(debt => {
      if (debt.balance <= 0) return

      const interest = (debt.balance * debt.interest_rate) / 100 / 12
      debt.balance += interest
      debt.balance -= debt.minimum_payment

      if (debt.balance < 0) debt.balance = 0
    })

    const remainingBalance = workingDebts.reduce(
      (sum, d) => sum + d.balance,
      0
    )

    timeline.push({
      month,
      remainingBalance
    })
  }

  return timeline
}