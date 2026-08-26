import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { canUseAutopilot } from "@/lib/permissions"

/**
 * Approve or dismiss a Plan Autopilot proposal. Deliberately just an
 * acknowledgment -- the proposed breakdown is already derived live from real
 * bills/debts/goals (lib/paycheckAutopilot.ts), so there's nothing separate
 * to "apply." Approving records that the user saw and accepted it; nothing
 * else in the app changes as a result, same reasoning as why
 * StrengthenPaycheckPanel's suggestions are preview-only.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, is_admin")
    .eq("id", user.id)
    .maybeSingle()
  const effectivePlan = profile?.is_admin ? "connected" : profile?.plan || "free"
  if (!canUseAutopilot(effectivePlan)) {
    return NextResponse.json({ ok: false, error: "Autopilot plan required" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const proposalId = typeof body?.proposalId === "string" ? body.proposalId : ""
  const status = body?.status === "approved" || body?.status === "dismissed" ? body.status : null

  if (!proposalId || !status) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
  }

  const { data: row, error: rowErr } = await supabase
    .from("paycheck_plan_proposals")
    .select("id, status")
    .eq("id", proposalId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (rowErr || !row) {
    return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 })
  }
  if (row.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Already decided" }, { status: 409 })
  }

  const { error: updateErr } = await supabase
    .from("paycheck_plan_proposals")
    .update({ status, decided_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("user_id", user.id)

  if (updateErr) {
    return NextResponse.json({ ok: false, error: "Could not save decision" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
