import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { decryptSecret, computeTotp } from "@/lib/mfaEmail"
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
    const { factorId } = await request.json()
    if (!factorId || typeof factorId !== "string") {
      return NextResponse.json({ error: "Missing factorId" }, { status: 400 })
    }

    // Auth check only -- this route is reachable while still at aal1 (that's
    // the whole point: it's how a user without their authenticator app in
    // hand gets to aal2), so we can't require aal2 here. We do still require
    // a real logged-in session, and we only ever act on rows already scoped
    // to that user's own id below.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const db = serviceClient()
    let { data: row } = await db
      .from("mfa_email_secrets")
      .select("factor_id, secret_encrypted")
      .eq("user_id", user.id)
      .eq("factor_id", factorId)
      .maybeSingle()

    // QA fix (Aug 16 2026): the challenge screen (app/mfa/page.tsx) picks
    // whichever verified TOTP factor happens to come back first from
    // listFactors() as its default/"primary" factorId -- for an account
    // with an authenticator factor AND a separately-enrolled email-backup
    // factor (two distinct Supabase TOTP factors), that's often the
    // authenticator one. Matching only on the exact factorId the client
    // sent would then never find this user's email secret at all, even
    // though they genuinely have email backup configured -- it would just
    // always claim "not set up." Since a user only ever has one email
    // backup in practice, fall back to any row on their account before
    // giving up.
    if (!row) {
      const fallback = await db
        .from("mfa_email_secrets")
        .select("factor_id, secret_encrypted")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle()
      row = fallback.data
    }

    // Not an email-registered factor (e.g. a normal authenticator-app TOTP
    // factor) -- quietly no-op so the caller can fall back to the generic
    // "enter the code from your app" copy.
    if (!row) {
      return NextResponse.json({ sent: false })
    }

    // Per-user rate limit, DB-backed. These are security codes, not casual
    // API calls, so the bucket below is intentionally tight (5/hour).
    const { data: underLimit } = await supabase.rpc("check_and_increment_rate_limit", {
      p_bucket: "mfa-email",
    })
    if (underLimit === false) {
      return NextResponse.json(
        { error: "Too many code requests. Please wait a while before trying again." },
        { status: 429 }
      )
    }

    if (!user.email) {
      return NextResponse.json({ error: "Your account has no email on file" }, { status: 400 })
    }

    const secret = decryptSecret(row.secret_encrypted)
    const code = computeTotp(secret)
    const sendResult = await sendMfaCodeEmail(user.email, code)
    if (!sendResult.ok) {
      return NextResponse.json({ error: sendResult.error || "Could not send code" }, { status: 502 })
    }

    // Hand back the factor this code actually belongs to -- it may differ
    // from the factorId the client sent (see the fallback lookup above), and
    // the client's subsequent challenge()/verify() call MUST target this
    // exact factor, since the code is only valid for it.
    return NextResponse.json({ sent: true, factorId: row.factor_id })
  } catch (err) {
    console.error("mfa email send error:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}