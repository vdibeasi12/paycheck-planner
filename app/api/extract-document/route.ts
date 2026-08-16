import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"

const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

// ~8MB decoded (Anthropic's own image limit is 5MB per image; this is a
// generous ceiling that rejects obviously-oversized payloads before they
// reach the API call, protecting cost and latency).
const MAX_BASE64_LENGTH = 11_000_000

const DETECTED_TYPES = new Set(["bill", "debt", "income", "statement", "unknown"])

const HINT_LABEL: Record<string, string> = {
  bill: "a bill",
  debt: "a debt/credit statement",
  income: "a paycheck stub",
}

// QA fix (Aug 15 2026): "make sure the app reads the imported docs and
// places it in the correct location -- if Netflix is uploaded into Debt it
// should populate in Bills, if a credit card statement is uploaded in
// Bills it should move to Debt... OCR needs to understand what is being
// captured." Previously this endpoint trusted docType (which page/button
// the user clicked) completely and picked its extraction schema from that
// alone -- a Netflix receipt scanned from the Debts page got run through
// the DEBT schema (balance/APR/minimum payment), which doesn't exist on a
// subscription receipt, so it silently came back mostly null. There was no
// way for the model to say "this isn't what you think it is."
//
// Now the model always classifies the document FOR ITSELF first, using
// docType only as a hint/prior (the label doesn't override what's actually
// printed on the page), and extracts whichever schema matches what it
// actually found. The caller (SmartCapture.tsx) compares detectedType
// against the docType it asked for: a match fills the current page's form
// exactly as before; a mismatch routes the user to the correct page with
// the fields pre-filled there instead (lib/capturePrefill.ts). A detected
// "statement" (a full transaction history, not one bill/debt/paycheck)
// points the user at the dedicated multi-page importer (app/import)
// instead of trying to force it through the single-document schema.
function buildInstructions(docTypeHint: string): string {
  const hintLabel = HINT_LABEL[docTypeHint] || "a financial document"
  return `Look at this photo or document. The user selected "${docTypeHint}" when uploading (expecting ${hintLabel}), but decide for yourself what kind of document this actually is, based only on what's printed on it -- the user's label is a hint, not the answer, and people scan the wrong page by mistake.

Choose exactly one detectedType:
- "bill": a recurring or one-time invoice/bill with an amount due and usually a due date -- utilities, phone, internet, insurance, rent, a subscription receipt (Netflix, Spotify, etc.). No interest rate and no running balance.
- "debt": a credit card or loan statement -- shows a balance owed, an APR/interest rate, and a minimum payment due.
- "income": a paycheck stub or direct deposit notice showing gross/net pay from an employer.
- "statement": a bank or card statement listing many individual transactions (a transaction history spanning a date range), rather than a single bill amount, a single balance, or a single paycheck.
- "unknown": you genuinely cannot tell which of the above this is.

Respond with ONLY this JSON object, no other text:
{
  "detectedType": "bill" | "debt" | "income" | "statement" | "unknown",
  "fields": <see below, or null if detectedType is "statement" or "unknown">
}

If detectedType is "bill", fields is:
{ "name": string or null, "amount": number or null, "dueDate": string in YYYY-MM-DD format or null }

If detectedType is "debt", fields is:
{ "name": string or null, "balance": number or null, "interest_rate": number or null (APR as a percent, e.g. 22.99, not 0.2299), "minimum_payment": number or null }

If detectedType is "income", fields is:
{
  "name": string or null,
  "amount": number or null,
  "frequency": one of exactly "weekly" | "biweekly" | "monthly" | "quarterly" | "annual", or null if the pay period isn't clearly one of these,
  "details": {
    "grossPay": number or null,
    "federalTax": number or null,
    "stateTax": number or null,
    "socialSecurity": number or null,
    "medicare": number or null,
    "retirement401k": number or null,
    "healthInsurance": number or null,
    "otherDeductions": number or null,
    "netPay": number or null
  }
}
"amount" should be the NET pay for one paycheck (take-home, after deductions); if only gross pay is visible, use that instead and do not guess a net figure. Only include a "details" value that is actually printed -- use null for anything not shown, and never estimate or infer a deduction that isn't visible.

For any field: if it isn't visible or you aren't confident, use null rather than guessing. Respond with ONLY the JSON object, no markdown fences, no commentary.`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { image, mediaType, docType } = body ?? {}

    if (typeof image !== "string" || !image) {
      return NextResponse.json({ success: false, error: "No image provided." }, { status: 400 })
    }
    if (typeof mediaType !== "string" || !ALLOWED_MEDIA_TYPES.has(mediaType)) {
      return NextResponse.json({ success: false, error: "Unsupported image type." }, { status: 400 })
    }
    if (image.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { success: false, error: "That photo is too large. Please try a smaller image." },
        { status: 413 }
      )
    }
    if (docType !== "bill" && docType !== "debt" && docType !== "income") {
      return NextResponse.json({ success: false, error: "Invalid document type." }, { status: 400 })
    }

    // Auth required. This isn't gated to a paid tier -- it's an entry-speed
    // aid, not a premium insight -- but it does need a real logged-in user
    // both for the rate limit and to avoid burning API budget on anonymous
    // traffic.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Please log in to use photo capture." }, { status: 401 })
    }

    // Per-user rate limit, DB-backed so it holds across serverless instances.
    // Falls back to the function's default bucket limit (20/hour) since
    // "extract" has no dedicated tier configured in the migration.
    const { data: underLimit } = await supabase.rpc("check_and_increment_rate_limit", {
      p_bucket: "extract",
    })
    if (underLimit === false) {
      return NextResponse.json(
        { success: false, error: "You've reached the photo-scan limit for now. Please try again a bit later." },
        { status: 429 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set")
      return NextResponse.json({ success: false, error: "Photo scan isn't configured yet." }, { status: 500 })
    }

    const instructions = buildInstructions(docType)

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: image },
              },
              { type: "text", text: instructions },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error("Anthropic API error (extract-document):", res.status, detail)
      return NextResponse.json({ success: false, error: "Couldn't read that photo. Please try again." }, { status: 502 })
    }

    const data = await res.json()
    const text: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: any) => b?.type === "text")
          .map((b: any) => b.text)
          .join("")
          .trim()
      : ""

    let parsed: Record<string, unknown> | null = null
    try {
      // Model is instructed to return raw JSON, but strip fences defensively
      // in case it wraps the response anyway.
      const cleaned = text.replace(/^```json\s*|^```\s*|```$/gm, "").trim()
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error("extract-document: failed to parse model output:", text)
      return NextResponse.json(
        { success: false, error: "Couldn't read the details clearly. Please enter them manually." },
        { status: 502 }
      )
    }

    const detectedType = typeof parsed?.detectedType === "string" ? parsed.detectedType : null
    if (!detectedType || !DETECTED_TYPES.has(detectedType)) {
      console.error("extract-document: model returned an invalid detectedType:", parsed)
      return NextResponse.json(
        { success: false, error: "Couldn't read the details clearly. Please enter them manually." },
        { status: 502 }
      )
    }

    // fields is null (by design) for "statement" and "unknown" -- there's
    // nothing to prefill for either, the client shows guidance instead.
    const fields = detectedType === "statement" || detectedType === "unknown" ? null : parsed?.fields ?? null

    return NextResponse.json({ success: true, detectedType, requestedType: docType, fields })
  } catch (err) {
    console.error("extract-document error:", err)
    return NextResponse.json({ success: false, error: "Something went wrong reading that photo." }, { status: 500 })
  }
}
