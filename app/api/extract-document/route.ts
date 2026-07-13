import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"

const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

const BILL_INSTRUCTIONS = `Look at this photo of a bill or invoice. Extract these fields as JSON only, no other text:
{
  "name": string or null,        // vendor/company name, e.g. "Commonwealth Edison"
  "amount": number or null,      // the amount due, digits only, no currency symbol
  "dueDate": string or null      // the due date in YYYY-MM-DD format if visible, else null
}
If a field isn't visible or you aren't confident, use null for that field rather than guessing. Respond with ONLY the JSON object, no markdown fences, no commentary.`

const DEBT_INSTRUCTIONS = `Look at this photo of a credit card or loan statement. Extract these fields as JSON only, no other text:
{
  "name": string or null,             // creditor/lender name, e.g. "Chase Sapphire"
  "balance": number or null,          // current balance owed, digits only
  "interest_rate": number or null,    // APR as a percent, e.g. 22.99 (not 0.2299)
  "minimum_payment": number or null   // minimum payment due, digits only
}
If a field isn't visible or you aren't confident, use null for that field rather than guessing. Respond with ONLY the JSON object, no markdown fences, no commentary.`

const INCOME_INSTRUCTIONS = `Look at this photo of a paycheck stub or direct deposit notice. Extract these fields as JSON only, no other text:
{
  "name": string or null,        // employer/company name, e.g. "Acme Corp"
  "amount": number or null,      // the NET pay amount for this one paycheck (take-home, after deductions), digits only. If only gross pay is visible, use that instead and do not guess a net figure.
  "frequency": string or null    // one of exactly: "weekly", "biweekly", "monthly", "quarterly", "annual" -- infer from the pay period start/end dates shown (e.g. a 14-day span is "biweekly"). Use null if the pay period isn't shown or doesn't clearly match one of these.
}
If a field isn't visible or you aren't confident, use null for that field rather than guessing. Respond with ONLY the JSON object, no markdown fences, no commentary.`

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

    const instructions =
      docType === "bill" ? BILL_INSTRUCTIONS : docType === "debt" ? DEBT_INSTRUCTIONS : INCOME_INSTRUCTIONS

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
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

    let fields: Record<string, unknown> | null = null
    try {
      // Model is instructed to return raw JSON, but strip fences defensively
      // in case it wraps the response anyway.
      const cleaned = text.replace(/^```json\s*|^```\s*|```$/gm, "").trim()
      fields = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error("extract-document: failed to parse model output:", text)
      return NextResponse.json(
        { success: false, error: "Couldn't read the details clearly. Please enter them manually." },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, fields })
  } catch (err) {
    console.error("extract-document error:", err)
    return NextResponse.json({ success: false, error: "Something went wrong reading that photo." }, { status: 500 })
  }
}
