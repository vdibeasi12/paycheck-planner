import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import type { BillDebtOverlap } from "@/lib/billDebtOverlap"

type Props = {
  overlaps: BillDebtOverlap[]
}

// QA fix (Aug 15 2026): non-blocking heads-up when a Bill and a Debt look
// like the same real-world payment (e.g. a mortgage tracked in Debts that
// also got added as a recurring Bill). See lib/billDebtOverlap.ts for the
// (deliberately simple, name-based) matching logic. This never edits or
// removes anything -- it just points at the two entries so the user can
// decide which page it actually belongs in.
export default function BillDebtOverlapWarning({ overlaps }: Props) {
  if (overlaps.length === 0) return null

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
      <div className="space-y-1.5">
        <p className="font-medium text-amber-100">
          {overlaps.length === 1
            ? "A bill and a debt look like the same payment"
            : `${overlaps.length} bills and debts look like the same payment`}
        </p>
        <ul className="space-y-1">
          {overlaps.map((o, i) => (
            <li key={i}>
              &ldquo;{o.bill.name}&rdquo; and &ldquo;{o.debt.name}&rdquo; in{" "}
              <Link href="/bills-debts" className="underline hover:text-amber-50">
                Bills &amp; Debts
              </Link>{" "}
              look like the same monthly payment -- if so, it's being counted twice. Loans and
              mortgages should stay tagged as a Debt (they have a real payoff plan); use Bill
              for things like utilities, subscriptions, and rent that don't pay down a balance.
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
