import { NextResponse } from "next/server"
import { createClient as createUserClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { plaid, PLAID_ENABLED, planCanUsePlaid } from "@/lib/plaid"
import { CountryCode } from "plaid"

export const dynamic = "force-dynamic"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )
}

export async function POST(req: Request) {
  if (!PLAID_ENABLED) {
    return NextResponse.json(
      { error: "Bank linking is not available yet." },
      { status: 503 }
    )
  }

  const userClient = await createUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: profile } = await userClient
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

  const body = await req.json().catch(() => null)
  const publicToken = body?.public_token
  if (typeof publicToken !== "string") {
    return NextResponse.json({ error: "Missing public_token" }, { status: 400 })
  }

  const sb = serviceClient()

  try {
    // 1) Exchange the public token for an access token + item id.
    const exchange = await plaid.itemPublicTokenExchange({
      public_token: publicToken,
    })
    const accessToken = exchange.data.access_token
    const itemId = exchange.data.item_id

    // 2) Institution (best-effort, for display only).
    let institutionId: string | null = null
    let institutionName: string | null = null
    try {
      const itemRes = await plaid.itemGet({ access_token: accessToken })
      institutionId = itemRes.data.item.institution_id ?? null
      if (institutionId) {
        const inst = await plaid.institutionsGetById({
          institution_id: institutionId,
          country_codes: [CountryCode.Us],
        })
        institutionName = inst.data.institution.name ?? null
      }
    } catch {
      /* non-fatal */
    }

    // 3) Persist the item. Service role only -- the access token never leaves
    //    the server and is unreadable by any client (RLS-locked table).
    const { error: itemErr } = await sb.from("plaid_items").upsert(
      {
        user_id: user.id,
        item_id: itemId,
        access_token: accessToken,
        institution_id: institutionId,
        institution_name: institutionName,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "item_id" }
    )
    if (itemErr) throw new Error("store item: " + itemErr.message)

    // 4) Pull liabilities (the response also carries the accounts).
    const liab = await plaid.liabilitiesGet({ access_token: accessToken })
    const accounts = liab.data.accounts
    const liabilities = liab.data.liabilities

    const balanceFor = (accountId: string) =>
      accounts.find((x) => x.account_id === accountId)?.balances?.current ?? null

    // 5) Upsert accounts.
    for (const a of accounts) {
      await sb.from("plaid_accounts").upsert(
        {
          user_id: user.id,
          item_id: itemId,
          account_id: a.account_id,
          name: a.name,
          official_name: a.official_name ?? null,
          mask: a.mask ?? null,
          type: a.type ?? null,
          subtype: a.subtype ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id" }
      )
    }

    // 6) Build liability rows (credit cards + student + mortgage).
    const rows: Record<string, unknown>[] = []
    for (const c of liabilities?.credit ?? []) {
      if (!c.account_id) continue
      rows.push({
        user_id: user.id,
        account_id: c.account_id,
        liability_type: "credit",
        last_statement_balance: c.last_statement_balance ?? null,
        current_balance: balanceFor(c.account_id),
        apr_percentage: c.aprs?.[0]?.apr_percentage ?? null,
        minimum_payment: c.minimum_payment_amount ?? null,
        next_payment_due_date: c.next_payment_due_date ?? null,
        origination_date: null,
        updated_at: new Date().toISOString(),
      })
    }
    for (const s of liabilities?.student ?? []) {
      if (!s.account_id) continue
      rows.push({
        user_id: user.id,
        account_id: s.account_id,
        liability_type: "student",
        last_statement_balance: s.last_statement_balance ?? null,
        current_balance: balanceFor(s.account_id),
        apr_percentage: s.interest_rate_percentage ?? null,
        minimum_payment: s.minimum_payment_amount ?? null,
        next_payment_due_date: s.next_payment_due_date ?? null,
        origination_date: s.origination_date ?? null,
        updated_at: new Date().toISOString(),
      })
    }
    for (const m of liabilities?.mortgage ?? []) {
      if (!m.account_id) continue
      rows.push({
        user_id: user.id,
        account_id: m.account_id,
        liability_type: "mortgage",
        last_statement_balance: null,
        current_balance: balanceFor(m.account_id),
        apr_percentage: m.interest_rate?.percentage ?? null,
        minimum_payment: m.next_monthly_payment ?? null,
        next_payment_due_date: m.next_payment_due_date ?? null,
        origination_date: m.origination_date ?? null,
        updated_at: new Date().toISOString(),
      })
    }

    // Replace prior liability rows for these accounts, then insert fresh.
    const accountIds = accounts.map((a) => a.account_id)
    if (accountIds.length > 0) {
      await sb.from("plaid_liabilities").delete().in("account_id", accountIds)
    }
    if (rows.length > 0) {
      const { error: liErr } = await sb.from("plaid_liabilities").insert(rows)
      if (liErr) throw new Error("store liabilities: " + liErr.message)
    }

    return NextResponse.json({
      ok: true,
      institution: institutionName,
      accounts: accounts.length,
      liabilities: rows.length,
    })
  } catch (err) {
    console.error("Plaid exchange error:", err)
    return NextResponse.json({ error: "Could not link your bank." }, { status: 500 })
  }
}