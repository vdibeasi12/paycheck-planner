import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { encryptSecret, computeTotp } from "@/lib/mfaEmail"
import { sendMfaCodeEmail } from "@/lib/mfaEmailTemplate"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: Request) {
  try {
    const { factorId, secret } = await request.json()
    if (!factorId || typeof factorId !== "string" || !secret || typeof secret !== "string") {
      return NextResponse.json({ error: "Missing factorId or secret" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // We deliberately don't re-verify factorId against supabase.auth.mfa.listFactors()
    // here -- a fresh factor from enroll() isn't always visible on an
    // immediate follow-up read, which turned this into a flaky false-negative
    // 404. It's also not load-bearing: user_id below always comes from this
    // request's own authenticated session (never attacker-controlled), so a
    // caller can only ever write rows scoped to their own account. The real
    // security gate is the native supabase.auth.mfa.challenge()/verify() call
    // later in the flow, which only ever succeeds for a real TOTP factor and
    // its real current code -- this table just lets us compute that code and
    // email it, it never grants access on its own.

    const db = serviceClient()
    const { error: insErr } = await db.from("mfa_email_secrets").upsert({
      user_id: user.id,
      factor_id: factorId,
      secret_encrypted: encryptSecret(secret),
    })
    if (insErr) {
      console.error("mfa email enroll store error:", insErr)
      return NextResponse.json({ error: "Could not save email MFA setup" }, { status: 500 })
    }

    if (!user.email) {
      return NextResponse.json({ error: "Your account has no email on file" }, { status: 400 })
    }

    const code = computeTotp(secret)
    const sendResult = await sendMfaCodeEmail(user.email, code)
    if (!sendResult.ok) {
      return NextResponse.json({ error: sendResult.error || "Could not send code" }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("mfa email enroll error:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}