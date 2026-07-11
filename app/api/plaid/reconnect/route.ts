import { NextResponse } from "next/server"
import { createClient as createUserClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )
}

// POST { item_id }: called after a successful UPDATE MODE Link session
// (see /api/plaid/link-token) to clear an Item's error / pending_expiration
// / user_permission_revoked status. Update mode reuses the existing
// access_token, so there is nothing to exchange here -- just mark the
// connection healthy again.
export async function POST(req: Request) {
  const userClient = await createUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const itemId = typeof body?.item_id === "string" ? body.item_id : ""
  if (!itemId) {
    return NextResponse.json({ error: "item_id is required" }, { status: 400 })
  }

  const sb = serviceClient()
  const { error } = await sb
    .from("plaid_items")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("item_id", itemId)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: "Could not update connection status." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}