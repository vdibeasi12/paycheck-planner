// Bills and Debts were consolidated into one "Bills & Debts" page (Sept
// 2026) organized by due date and paycheck instead of the old
// bill/debt accounting split. This route now just forwards anyone who
// still has the old link bookmarked or linked from an old email.
import { redirect } from "next/navigation"

export default function DebtsRedirect() {
  redirect("/bills-debts")
}
