import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { plaid, PLAID_ENABLED, syncLiabilitiesForItem } from "@/lib/plaid"
import { importJWK, jwtVerify, decodeProtectedHeader } from "jose"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )
}

// Verify the Plaid-Verification JWT (ES256) and that its body hash matches the
// raw request body. See https://plaid.com/docs/api/webhooks/webhook-verification
async function verifyPlaidWebhook(req: Request, rawBody: string): Promise<boolean> {
  try {
    const token = req.headers.get("plaid-verification")
    if (!token) return false

    const { kid, alg } = decodeProtectedHeader(token)
    if (alg !== "ES256" || !kid) return false

    const res = await plaid.webhookVerificationKeyGet({ key_id: kid })
    const jwk = res.data.key as any
    const key = await importJWK(jwk, "ES256")

    // Verifies signature + rejects tokens older than 5 minutes (replay guard).
    const { payload } = await jwtVerify(token, key, { maxTokenAge: "5 min" })

    const expected = String((payload as any).request_body_sha256 || "")
    const actual = crypto.createHash("sha256").update(rawBody, "utf8").digest("hex")
    if (expected.length !== actual.length) return false
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  } catch (e) {
    console.error("Plaid webhook verification failed:", e)
    return false
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()

  // Only enforce verification when Plaid is live (creds present).
  if (PLAID_ENABLED) {
    const ok = await verifyPlaidWebhook(req, rawBody)
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 })
    }
  }

  let body: any = {}
  try {
    body = JSON.parse(rawBody)
  } catch {
    /* keep empty */
  }

  const type = body?.webhook_type
  const code = body?.webhook_code
  const itemId = body?.item_id

  if (itemId) {
    const sb = serviceClient()
    const { data: item } = await sb
      .from("plaid_items")
      .select("user_id, access_token")
      .eq("item_id", itemId)
      .maybeSingle()

    if (item) {
      try {
        if (type === "LIABILITIES" && code === "DEFAULT_UPDATE") {
          await syncLiabilitiesForItem(sb, item.user_id, item.access_token, itemId)
        } else if (
          type === "ITEM" &&
          (code === "ERROR" ||
            code === "PENDING_EXPIRATION" ||
            code === "USER_PERMISSION_REVOKED")
        ) {
          const status = code === "ERROR" ? "error" : code.toLowerCase()
          await sb
            .from("plaid_items")
            .update({ status, updated_at: new Date().toISOString() })
            .eq("item_id", itemId)
        }
      } catch (e) {
        console.error("Plaid webhook handling error:", e)
      }
    }
  }

  // Always 200 so Plaid does not retry-storm on transient issues.
  return NextResponse.json({ ok: true })
}