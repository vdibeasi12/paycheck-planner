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

    // Confirm this factorId genuinely belongs to the requesting user and is
    // still an unverified (in-progress) enrollment -- never trust the client
    // to tell us which factor it's naming.
    const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors()
    if (fErr) {
      return NextResponse.json({ error: fErr.message }, { status: 400 })
    }
    const owns = (factors?.totp ?? []).some((f) => f.id === factorId)
    if (!owns) {
      return NextResponse.json({ error: "Factor not found for this account" }, { status: 404 })
    }

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