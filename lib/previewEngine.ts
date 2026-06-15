// lib/previewEngine.ts
// Headline numbers used by the paywall/preview card.

import { simulatePayoff } from "./financeEngine"
import type { Debt } from "./financeEngine"

export interface DebtSummary {
  months: number
  monthlyInterest: number
  totalBalance: number
}

export function getDebtSummary(debts: Debt[] | null | undefined): DebtSummary {
  const list = Array.isArray(debts) ? debts : []

  const monthlyInterest = Math.round(
    list.reduce((acc, d) => {
      const bal = Number(d?.balance) || 0
      const rate = (Number(d?.interest_rate) || 0) / 100 / 12
      return acc + bal * rate
    }, 0)
  )

  const totalBalance = Math.round(
    list.reduce((acc, d) => acc + (Number(d?.balance) || 0), 0)
  )

  const months = simulatePayoff(list, "avalanche", 0).months

  return { months, monthlyInterest, totalBalance }
}
