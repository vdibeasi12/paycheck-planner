import { NextResponse } from "next/server"
import { createClient as createUserClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { plaid, PLAID_ENABLED } from "@/lib/plaid"

export const dynamic = "force-dynamic"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )
}

// POST { item_id? }: disconnect one linked bank, or all of the user's banks
// when no item_id is given. Always revokes at Plaid first (best-effort), then
// removes local rows (accounts + liabilities cascade from plaid_items).
export async function POST(req: Request) {
  const userClient = await createUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const itemId: string | undefined = body?.item_id

  const sb = serviceClient()

  let read = sb
    .from("plaid_items")
    .select("item_id, access_token")
    .eq("user_id", user.id)
  if (itemId) read = read.eq("item_id", itemId)
  const { data: items, error } = await read
  if (error) {
    return NextResponse.json({ error: "Could not load linked banks." }, { status: 500 })
  }

  for (const it of items ?? []) {
    if (PLAID_ENABLED) {
      try {
        await plaid.itemRemove({ access_token: it.access_token })
      } catch (e) {
        console.error("Plaid itemRemove failed for", it.item_id, e)
      }
    }
  }

  let del = sb.from("plaid_items").delete().eq("user_id", user.id)
  if (itemId) del = del.eq("item_id", itemId)
  const { error: delErr } = await del
  if (delErr) {
    return NextResponse.json({ error: "Could not disconnect." }, { status: 500 })
  }

  return NextResponse.json({ ok: true, removed: (items ?? []).length })
}