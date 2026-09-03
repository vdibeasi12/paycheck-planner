// lib/goalAutoCalc.ts
// Auto-calculates progress for a goal that's linked to an imported-
// transaction account, instead of requiring the user to manually type
// "Add a contribution" every time they save something (the only mechanism
// that existed before this file: financial_goals.current_amount was a
// plain number nobody but the user ever touched).
//
// Built specifically because Plaid Auth (live bank balance) was denied for
// Production -- see lib/csvImport.ts's header comment -- so this app can
// never just ask Plaid "what's the balance." What it CAN do, using only
// Transactions data (Plaid Transactions later, CSV/PDF statement import
// today -- see app/import/page.tsx), is exactly what a bank statement
// itself proves: starting balance + every transaction since = current
// balance. No live balance call needed, just arithmetic over transaction
// history that's already sitting in the `transactions` table.
//
// financial_goals.current_amount is read directly (not recomputed on the
// fly) by lib/paycheckCycles.ts's goalContributionRate (-> Safe to Spend,
// Paycheck Shield), the Dashboard, Survival Mode, Plan Drift, the
// savings-milestone/achievements crons, and the PDF summary export -- so a
// linked goal's current_amount is written back to that column any time the
// underlying transactions change, rather than left to drift stale.
export async function recalcLinkedGoals(
  sb: any,
  userId: string,
  accountLabels?: string[]
): Promise<void> {
  let query = sb
    .from("financial_goals")
    .select("id, target_amount, starting_balance, linked_account_label, status")
    .eq("user_id", userId)
    .not("linked_account_label", "is", null)

  if (accountLabels && accountLabels.length > 0) {
    query = query.in("linked_account_label", accountLabels)
  }

  const { data: goals } = await query
  if (!goals || goals.length === 0) return

  const now = new Date().toISOString()

  for (const g of goals as any[]) {
    const { data: txns } = await sb
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("account_label", g.linked_account_label)

    const net = (txns ?? []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
    const current = Math.round((Number(g.starting_balance || 0) + net) * 100) / 100
    const completed = current >= Number(g.target_amount || 0)

    await sb
      .from("financial_goals")
      .update({
        current_amount: current,
        // Linked goals are fully automatic -- status always reflects the
        // computed number, not a status a user set by hand while unlinked.
        status: completed ? "completed" : "active",
        updated_at: now,
      })
      .eq("id", g.id)
  }
}
