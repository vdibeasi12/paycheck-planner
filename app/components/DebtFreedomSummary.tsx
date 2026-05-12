"use client"

import { Debt } from "@/lib/financeEngine"
import {
  calculateDebtFreeDate,
  calculateTotalInterestPaid,
  calculatePotentialSavings
} from "@/lib/financeInsights"

interface Props {
  debts?: Debt[]
}

export default function DebtFreedomSummary({ debts = [] }: Props) {

  const debtFreeDate = calculateDebtFreeDate(debts, "avalanche")

  const interestPaid = calculateTotalInterestPaid(debts)

  const savings = calculatePotentialSavings(debts, 150)

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-4">

      <h2 className="text-lg font-semibold">
        Debt Freedom Summary
      </h2>

      <div className="text-2xl font-bold text-green-600">
        {debtFreeDate}
      </div>

      <div className="text-sm text-gray-500">
        Estimated Debt Free Date
      </div>

      <div className="pt-4 border-t">

        <div className="flex justify-between">
          <span>Total Interest</span>
          <span>${interestPaid}</span>
        </div>

        <div className="flex justify-between">
          <span>Potential Savings</span>
          <span className="text-green-600">
            ${savings}
          </span>
        </div>

      </div>

    </div>
  )
}