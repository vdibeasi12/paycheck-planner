import { Debt, calculateDebtFreeMonths } from "./financeEngine"
import { calculatePayoff } from "./payoffEngine"

export function getDebtSummary(debts: Debt[] = []) {
  if (!debts || debts.length === 0) {
    return {
      months: 0,
      totalInterest: 0,
      monthlyInterest: 0,
    }
  }

  const months = calculateDebtFreeMonths(debts)
  const payoff = calculatePayoff(debts)

  const totalInterest = payoff.totalInterest

  const monthlyInterest =
    months > 0 ? totalInterest / months : 0

  return {
    months,
    totalInterest: Math.round(totalInterest),
    monthlyInterest: Math.round(monthlyInterest),
  }
}