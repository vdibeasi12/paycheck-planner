import { NextResponse } from "next/server"
import { createClient as createUserClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { plaid, PLAID_ENABLED, planCanUsePlaid } from "@/lib/plaid"
import { checkAal2Status } from "@/lib/adminGuard"
import { CountryCode, Products } from "plaid"

export const dynamic = "force-dynamic"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )
}

// POST {}: creates a link_token for a brand-new bank connection.
// POST { item_id }: creates a link_token in UPDATE MODE for an existing,
// broken connection (expired login, revoked permission, etc). Update mode
// reuses the Item's existing access_token -- no new exchange is needed on
// success, see /api/plaid/reconnect.
export async function POST(req: Request) {
  if (!PLAID_ENABLED) {
    return NextResponse.json(
      { error: "Bank linking is not available yet." },
      { status: 503 }
    )
  }

  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single()
  if (!planCanUsePlaid(profile?.plan)) {
    return NextResponse.json(
      { error: "Bank sync is an Autopilot feature." },
      { status: 403 }
    )
  }

  // Autopilot requires MFA to be enrolled -- not just optional, and not just
  // step-up-if-you-have-it. Connecting a bank account is the single most
  // sensitive action in the app, so this is the gate, regardless of which
  // page/flow got the user here.
  const aal2 = await checkAal2Status(supabase)
  if (aal2 !== "verified") {
    return NextResponse.json(
      {
        error:
          aal2 === "not_enrolled"
            ? "Autopilot requires two-factor authentication. Set it up to connect your bank."
            : "Please verify your two-factor code, then try connecting your bank again.",
        code: aal2 === "not_enrolled" ? "mfa_setup_required" : "mfa_step_up_required",
      },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => null)
  const itemId = typeof body?.item_id === "string" ? body.item_id : ""
  const purpose = body?.purpose === "bank" ? "bank" : "debt"

  let accessToken = ""
  if (itemId) {
    const sb = serviceClient()
    const { data: item } = await sb
      .from("plaid_items")
      .select("access_token")
      .eq("item_id", itemId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!item) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 })
    }
    accessToken = item.access_token
  }

  try {
    const params: Record<string, unknown> = {
      user: { client_user_id: user.id },
      client_name: "Paycheck Planner",
      country_codes: [CountryCode.Us],
      language: "en",
      webhook: process.env.PLAID_WEBHOOK_URL || undefined,
    }
    if (accessToken) {
      params.access_token = accessToken
    } else if (purpose === "bank") {
      // REVERTED (Aug 14): this briefly requested Products.Auth so plain
      // checking/savings accounts (no liability product) wouldn't get
      // rejected by Link with "No liability accounts" -- Auth was never
      // used for account/routing numbers or money movement, only as a
      // Link-gating trick plus free Balance data riding along with it.
      // Plaid denied Auth for Production ("ineligible use case," which
      // tracks -- we have no money-movement use case to justify it), so
      // requesting it now just makes linkTokenCreate fail for this purpose.
      // Falling back to Liabilities-only restores the pre-Aug-13, already-
      // accepted tradeoff: checking/savings-only banks (no card/loan) stay
      // unconnectable until Transactions is requested and approved instead
      // (a much better fit for a read-only budgeting use case than Auth
      // ever was) -- see /areas/paycheck-planner.md for the reapplication
      // plan. Kept as its own branch (identical to "debt" below for now)
      // so swapping in Products.Transactions later is a one-line change.
      params.products = [Products.Liabilities]
    } else {
      params.products = [Products.Liabilities]
    }

    const res = await plaid.linkTokenCreate(params as any)
    return NextResponse.json({ link_token: res.data.link_token })
  } catch (err) {
    console.error("Plaid link-token error:", (err as any)?.response?.data || (err as any)?.message || err)
    return NextResponse.json(
      { error: "Could not start bank linking." },
      { status: 500 }
    )
  }
}