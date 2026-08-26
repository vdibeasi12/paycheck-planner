import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SURPLUS_DECISIONS, type SurplusDecision } from "@/lib/paycheckSurplus"

const VALID_DECISIONS = new Set(SURPLUS_DECISIONS.map((d) => d.id))

/**
 * Applies the user's choice for a pending Paycheck Surplus decision.
 * "debt" and "goal" are the only two that touch real records (a debt's
 * balance, or a goal's current_amount) -- the other three are recorded
 * choices with no side effect, same "preview vs. real mutation" line drawn
 * elsewhere in the app (see StrengthenPaycheckPanel's doc comment). All
 * writes go through the request-scoped, cookie-authenticated client so RLS
 * enforces ownership the same way it does everywhere else a user edits
 * their own data -- no service-role client involved.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({} as any))
  const decisionId = typeof body?.decisionId === "string" ? body.decisionId : ""
  const decision = typeof body?.decision === "string" ? (body.decision as SurplusDecision) : null
  const targetDebtId = typeof body?.targetDebtId === "string" ? body.targetDebtId : null
  const targetGoalId = typeof body?.targetGoalId === "string" ? body.targetGoalId : null

  if (!decisionId || !decision || !VALID_DECISIONS.has(decision)) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
  }
  if (decision === "debt" && !targetDebtId) {
    return NextResponse.json({ ok: false, error: "A debt must be selected" }, { status: 400 })
  }
  if (decision === "goal" && !targetGoalId) {
    return NextResponse.json({ ok: false, error: "A goal must be selected" }, { status: 400 })
  }

  const { data: row, error: rowErr } = await supabase
    .from("paycheck_surplus_decisions")
    .select("id, user_id, surplus_amount, resolved")
    .eq("id", decisionId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (rowErr || !row) {
    return NextResponse.json({ ok: false, error: "Decision not found" }, { status: 404 })
  }
  if (row.resolved) {
    return NextResponse.json({ ok: false, error: "Already resolved" }, { status: 409 })
  }

  const surplusAmount = Number(row.surplus_amount) || 0
  let appliedAmount: number | null = null

  if (decision === "debt" && targetDebtId) {
    const { data: debt, error: debtErr } = await supabase
      .from("debts")
      .select("id, balance")
      .eq("id", targetDebtId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (debtErr || !debt) {
      return NextResponse.json({ ok: false, error: "Debt not found" }, { status: 404 })
    }
    const newBalance = Math.max(0, (Number(debt.balance) || 0) - surplusAmount)
    const { error: updateErr } = await supabase
      .from("debts")
      .update({ balance: newBalance })
      .eq("id", targetDebtId)
      .eq("user_id", user.id)
    if (updateErr) {
      return NextResponse.json({ ok: false, error: "Could not update debt" }, { status: 500 })
    }
    await supabase.from("debt_payments").insert({
      debt_id: targetDebtId,
      user_id: user.id,
      amount: surplusAmount,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: "paycheck_surplus",
      notes: "Applied from a Paycheck Surplus decision",
    })
    appliedAmount = surplusAmount
  } else if (decision === "goal" && targetGoalId) {
    const { data: goal, error: goalErr } = await supabase
      .from("financial_goals")
      .select("id, current_amount")
      .eq("id", targetGoalId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (goalErr || !goal) {
      return NextResponse.json({ ok: false, error: "Goal not found" }, { status: 404 })
    }
    const newCurrent = (Number(goal.current_amount) || 0) + surplusAmount
    const { error: updateErr } = await supabase
      .from("financial_goals")
      .update({ current_amount: newCurrent })
      .eq("id", targetGoalId)
      .eq("user_id", user.id)
    if (updateErr) {
      return NextResponse.json({ ok: false, error: "Could not update goal" }, { status: 500 })
    }
    appliedAmount = surplusAmount
  }

  const { error: resolveErr } = await supabase
    .from("paycheck_surplus_decisions")
    .update({
      decision,
      target_debt_id: decision === "debt" ? targetDebtId : null,
      target_goal_id: decision === "goal" ? targetGoalId : null,
      applied_amount: appliedAmount,
      resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", decisionId)
    .eq("user_id", user.id)

  if (resolveErr) {
    return NextResponse.json({ ok: false, error: "Could not save decision" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, appliedAmount })
}
