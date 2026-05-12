import { Debt, calculatePayoffTimeline } from "./financeEngine"

export function calculateDebtFreeDate(
  debts: Debt[] = [],
  strategy: "snowball" | "avalanche" = "avalanche"
): string {

  const timeline = calculatePayoffTimeline(debts, strategy)

  if (timeline.length === 0) {
    return "No debts"
  }

  const months = timeline[timeline.length - 1].month

  const today = new Date()
  const futureDate = new Date(
    today.getFullYear(),
    today.getMonth() + months,
    1
  )

  return futureDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  })
}

export function calculateTotalInterestPaid(
  debts: Debt[] = []
): number {

  if (!debts || debts.length === 0) return 0

  let totalInterest = 0

  debts.forEach(debt => {
    const monthlyRate = debt.interest_rate / 100 / 12
    const months = 60 // simple estimate

    totalInterest += debt.balance * monthlyRate * months
  })

  return Math.round(totalInterest)
}

export function calculatePotentialSavings(
  debts: Debt[] = [],
  extraPayment: number = 100
): number {

  if (!debts || debts.length === 0) return 0

  let savings = 0

  debts.forEach(debt => {
    const monthlyRate = debt.interest_rate / 100 / 12

    savings += monthlyRate * extraPayment * 12
  })

  return Math.round(savings)
}