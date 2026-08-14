import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

// Same Bearer-token session pattern as app/api/blog/subscribe/route.ts --
// this route is called from inside the Capacitor native shell, which has no
// browser cookie jar, so the client passes its Supabase access token
// explicitly instead of relying on a cookie-based server client.
async function getSessionUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization")
  if (!auth || !auth.startsWith("Bearer ")) return null
  const token = auth.slice("Bearer ".length)
  const db = adminDb()
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

// Registers (or refreshes) a device's push token for the signed-in user.
// Called once per app launch from PushNotificationsInit.tsx after Capacitor
// hands back a registration token -- upsert so re-registering the same
// token (e.g. every launch) is a no-op update, not a growing list of
// duplicate rows.
export async function POST(req: Request) {
  const userId = await getSessionUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  let body: { token?: string; platform?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const token = (body.token || "").trim()
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 })
  }
  const platform = body.platform === "ios" || body.platform === "android" ? body.platform : "unknown"

  const db = adminDb()
  const { error } = await db
    .from("push_tokens")
    .upsert(
      { user_id: userId, token, platform, updated_at: new Date().toISOString() },
      { onConflict: "user_id,token" }
    )

  if (error) {
    return NextResponse.json({ error: "Could not save token" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// Called on sign-out from a native session so a shared/reset device stops
// receiving another account's pushes.
export async function DELETE(req: Request) {
  const userId = await getSessionUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const db = adminDb()
  let query = db.from("push_tokens").delete().eq("user_id", userId)
  if (body.token) query = query.eq("token", body.token)
  const { error } = await query

  if (error) {
    return NextResponse.json({ error: "Could not remove token" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
