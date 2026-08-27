import { NextResponse } from "next/server"
import { createClient as createUserClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { plaid, PLAID_ENABLED, planCanUsePlaid, syncBalancesForItem, syncLiabilitiesForItem } from "@/lib/plaid"
import { checkAal2Status } from "@/lib/adminGuard"
import { CountryCode } from "plaid"
import { track } from "@/lib/track"

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

  // Same MFA-required gate as /api/plaid/link-token -- belt and suspenders,
  // since a stale link_token issued before enrollment could otherwise still
  // be exchanged after the fact.
  const aal2 = await checkAal2Status(userClient)
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
  const publicToken = body?.public_token
  const purpose = body?.purpose === "bank" ? "bank" : "debt"
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

    // 2.5) Reject a duplicate link to a bank this user already has connected.
    // The Item above is already live and billable at Plaid the moment
    // itemPublicTokenExchange succeeded -- Plaid hands back a brand-new
    // item_id every time Link completes, even for the exact same
    // institution/login, so nothing before this point could have caught
    // it. QA fix (Aug 15 2026): remove the just-created duplicate Item at
    // Plaid immediately (best-effort) and tell the user, instead of
    // silently persisting a second billable connection to the same bank.
    // A unique index on (user_id, institution_id) backstops the race where
    // two link attempts land here at the same instant -- caught below by
    // Postgres error 23505 on the upsert itself.
    if (institutionId) {
      const { data: existing } = await sb
        .from("plaid_items")
        .select("item_id")
        .eq("user_id", user.id)
        .eq("institution_id", institutionId)
        .neq("item_id", itemId)
        .maybeSingle()
      if (existing) {
        try {
          await plaid.itemRemove({ access_token: accessToken })
        } catch (e) {
          console.error(
            "Plaid itemRemove failed while rejecting a duplicate link:",
            (e as any)?.response?.data || (e as any)?.message || e
          )
        }
        return NextResponse.json(
          {
            error: `${institutionName || "This bank"} is already connected. Disconnect it first if you want to relink it.`,
          },
          { status: 409 }
        )
      }
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
        product: "combined",
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "item_id" }
    )
    if (itemErr) {
      // 23505 = unique_violation -- the (user_id, institution_id) index caught
      // a race that the pre-check above missed (two simultaneous link
      // attempts for the same bank). Same handling: drop the duplicate Item
      // at Plaid and tell the user, rather than surfacing a raw DB error.
      if ((itemErr as any).code === "23505") {
        try {
          await plaid.itemRemove({ access_token: accessToken })
        } catch (e) {
          console.error(
            "Plaid itemRemove failed while rejecting a racing duplicate link:",
            (e as any)?.response?.data || (e as any)?.message || e
          )
        }
        return NextResponse.json(
          {
            error: `${institutionName || "This bank"} is already connected. Disconnect it first if you want to relink it.`,
          },
          { status: 409 }
        )
      }
      throw new Error("store item: " + itemErr.message)
    }

    // 4) Mirror accounts + liabilities + debts for this item using the SAME
    // shared helper the manual "Refresh from bank" button (/api/plaid/sync)
    // and the Plaid webhook already use (syncLiabilitiesForItem in
    // lib/plaid.ts). Previously this route re-implemented its own inline
    // version of this pull that wrote plaid_accounts + plaid_liabilities but
    // never mirrored into the `debts` table -- so a brand-new bank
    // connection's cards/loans never showed up on the Debts page or
    // Dashboard until the user manually clicked "Refresh from bank" (or
    // Plaid's LIABILITIES webhook eventually fired, often hours later).
    // Bug fixed 2026-08-27: call the shared helper here too so newly
    // connected debts appear immediately, matching sync/webhook behavior.
    //
    // Not every connected account supports Liabilities -- a plain checking/
    // savings-only bank connected via the "bank" (balance-only) purpose
    // won't -- so this is still best-effort: liabilitiesGet throwing inside
    // syncLiabilitiesForItem just means there's nothing to mirror into
    // debts for this item, which is expected. syncBalancesForItem below
    // still runs regardless and picks up any depository (checking/savings)
    // accounts either way.
    let accountCount = 0
    let liabilityCount = 0
    let debtCount = 0
    try {
      const r = await syncLiabilitiesForItem(sb, user.id, accessToken, itemId)
      accountCount = r.accounts
      liabilityCount = r.liabilities
      debtCount = r.debts
    } catch (liabErr) {
      console.error(
        "Plaid liabilities not available for this item (expected for balance-only accounts):",
        (liabErr as any)?.response?.data || (liabErr as any)?.message || liabErr
      )
    }

    let assetCount = 0
    try {
      const balResult = await syncBalancesForItem(sb, user.id, accessToken, itemId)
      assetCount = balResult.assets
      accountCount = Math.max(accountCount, balResult.accounts)
    } catch (balErr) {
      console.error(
        "Plaid balance sync error:",
        (balErr as any)?.response?.data || (balErr as any)?.message || balErr
      )
    }

    await track("bank_connected", {
      userId: user.id,
      metadata: { purpose, institution: institutionName, accounts: accountCount },
    })

    return NextResponse.json({
      ok: true,
      institution: institutionName,
      accounts: accountCount,
      liabilities: liabilityCount,
      debts: debtCount,
      assets: assetCount,
    })
  } catch (err) {
    console.error("Plaid exchange error:", (err as any)?.response?.data || (err as any)?.message || err)
    return NextResponse.json({ error: "Could not link your bank." }, { status: 500 })
  }
}