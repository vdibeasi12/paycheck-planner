import { Info } from 'lucide-react'

// QA fix (Aug 15 2026): "Bill & Expenses and Debts, how can a user know
// where to put their info because they can move their mortgage to Bill &
// Expenses because it is a monthly payment" -- the app already warns AFTER
// the fact when a bill and a debt look like the same payment
// (lib/billDebtOverlap.ts), but nothing ever explained the rule UP FRONT.
// This is that explanation, shown on both pages so whichever one someone
// lands on first, they get the same answer.
//
// The rule: it's a Debt if there's a balance shrinking over time as you pay
// it (credit card, auto loan, student loan, mortgage) -- Debts unlocks
// interest tracking and a real payoff date. It's a Bill if it's a recurring
// cost with no balance to eliminate (rent, utilities, insurance premiums,
// subscriptions). Either way the monthly amount counts exactly the same
// toward Safe-to-Spend -- the only thing that goes wrong is entering the
// SAME payment in both places, which double-counts it.
export default function BillsVsDebtsHint({ page }: { page: 'bills' | 'debts' }) {
  const primary =
    page === 'debts'
      ? "Add something here if it has a balance that shrinks over time as you pay it -- a credit card, auto loan, student loan, or mortgage. That unlocks interest tracking and a real payoff date on the Payoff Plan page."
      : 'Add something here if it’s a recurring cost with no balance to pay off -- rent, utilities, insurance premiums, subscriptions.'

  const secondary =
    page === 'debts'
      ? 'Recurring costs with no balance to eliminate (rent, utilities, subscriptions) belong on the Bills & Expenses page instead.'
      : 'Has a balance you’re paying down -- credit card, auto loan, student loan, mortgage? Add it under Debts instead so we can track interest and payoff progress.'

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
      <Info size={18} className="mt-0.5 shrink-0 text-blue-300" />
      <div className="space-y-1">
        <p>
          <span className="font-semibold">Bills vs. Debts:</span> {primary}
        </p>
        <p className="text-blue-200/80">{secondary}</p>
        <p className="text-blue-200/80">
          Either way, the monthly amount counts the same toward your Safe-to-Spend total -- just enter each real-world
          payment once, not in both places.
        </p>
      </div>
    </div>
  )
}
