// app/api/extract-statement/route.ts
// PDF bank-statement import. Extends the existing SmartCapture extraction
// pipeline (app/api/extract-document) rather than duplicating it: same
// auth/rate-limit/Anthropic-call shape, but the input is every page of a
// statement (not one photo) and the output is an ARRAY of transactions
// (not one flat object), matching lib/csvImport.ts's ParsedTransaction type
// exactly so the result can flow into the same categorize/dedupe/recurring-
// detection pipeline the CSV importer already uses -- see
// lib/csvImport.ts's analyzeTransactions() and app/import/page.tsx.
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { canUseCsvImport } from "@/lib/permissions"

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"

const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

// Per-page ceiling mirrors extract-document's single-image limit; the page
// count ceiling mirrors lib/pdfToImages.ts's MAX_STATEMENT_PAGES so the
// client can't be out of sync with what the server will actually accept.
const MAX_BASE64_LENGTH_PER_PAGE = 11_000_000
const MAX_PAGES = 12

const STATEMENT_INSTRUCTIONS = `You are looking at ${"{{PAGE_COUNT}}"} page(s), in order, of a bank or credit card statement. Extract every individual transaction line across all pages as a JSON array, no other text:
[
  {
    "date": string,        // YYYY-MM-DD -- the posted or transaction date shown on that line
    "description": string, // the merchant/payee/memo text as printed, verbatim
    "amount": number       // positive for deposits/credits/income, negative for withdrawals/purchases/debits/fees
  }
]
Include every transaction line you can find, not just ones that look like a bill or paycheck -- everyday purchases and one-time transactions matter too, they'll be kept as spending history. Do NOT include subtotals, running/ending balances, page headers or footers, or any summary row that isn't an individual transaction. If a page has no transactions on it (e.g. a cover page or disclosures), skip it. If you can't find any transactions anywhere, return an empty array []. Respond with ONLY the JSON array, no markdown fences, no commentary.`

type RawTransaction = { date?: unknown; description?: unknown; amount?: unknown }

function isValidRawTransaction(t: unknown): t is { date: string; description: string; amount: number } {
  if (!t || typeof t !== "object") return false
  const r = t as RawTransaction
  return (
    typeof r.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    typeof r.description === "string" &&
    r.description.trim().length > 0 &&
    typeof r.amount === "number" &&
    Number.isFinite(r.amount)
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { pages } = body ?? {}

    if (!Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ success: false, error: "No statement pages provided." }, { status: 400 })
    }
    if (pages.length > MAX_PAGES) {
      return NextResponse.json(
        { success: false, error: `That statement has too many pages (max ${MAX_PAGES}). Try a shorter date range.` },
        { status: 400 }
      )
    }
    for (const p of pages) {
      if (!p || typeof p !== "object" || typeof p.data !== "string" || typeof p.mediaType !== "string") {
        return NextResponse.json({ success: false, error: "Malformed statement page data." }, { status: 400 })
      }
      if (!ALLOWED_MEDIA_TYPES.has(p.mediaType)) {
        return NextResponse.json({ success: false, error: "Unsupported page image type." }, { status: 400 })
      }
      if (p.data.length > MAX_BASE64_LENGTH_PER_PAGE) {
        return NextResponse.json(
          { success: false, error: "One of the statement pages is too large. Try a lower-resolution scan." },
          { status: 413 }
        )
      }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Please log in to import a statement." }, { status: 401 })
    }

    // Same Accelerate-and-up tier as CSV import -- this is the PDF path of
    // the same "bank statement import" feature, not a separate product.
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, is_admin")
      .eq("id", user.id)
      .maybeSingle()
    const effectivePlan = profile?.is_admin ? "connected" : profile?.plan ?? "free"
    if (!canUseCsvImport(effectivePlan)) {
      return NextResponse.json({ success: false, error: "Bank statement import is an Accelerate feature." }, { status: 403 })
    }

    // A multi-page statement is a materially bigger/costlier request than a
    // single receipt photo (extract-document's "extract" bucket), so it gets
    // its own, stricter bucket -- see the matching branch added to
    // check_and_increment_rate_limit in
    // supabase/migrations/20260815160000_add_extract_statement_rate_limit.sql.
    const { data: underLimit } = await supabase.rpc("check_and_increment_rate_limit", {
      p_bucket: "extract_statement",
    })
    if (underLimit === false) {
      return NextResponse.json(
        { success: false, error: "You've reached the statement-import limit for now. Please try again a bit later." },
        { status: 429 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set")
      return NextResponse.json({ success: false, error: "Statement import isn't configured yet." }, { status: 500 })
    }

    const instructions = STATEMENT_INSTRUCTIONS.replace(
      "{{PAGE_COUNT}}",
      String(pages.length)
    )

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              ...pages.map((p: { data: string; mediaType: string }) => ({
                type: "image",
                source: { type: "base64", media_type: p.mediaType, data: p.data },
              })),
              { type: "text", text: instructions },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error("Anthropic API error (extract-statement):", res.status, detail)
      return NextResponse.json({ success: false, error: "Couldn't read that statement. Please try again." }, { status: 502 })
    }

    const data = await res.json()
    const text: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: any) => b?.type === "text")
          .map((b: any) => b.text)
          .join("")
          .trim()
      : ""

    let parsed: unknown
    try {
      const cleaned = text.replace(/^```json\s*|^```\s*|```$/gm, "").trim()
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error("extract-statement: failed to parse model output:", text)
      return NextResponse.json(
        { success: false, error: "Couldn't read the statement clearly. Please try a clearer scan." },
        { status: 502 }
      )
    }

    if (!Array.isArray(parsed)) {
      console.error("extract-statement: model output was not an array:", parsed)
      return NextResponse.json(
        { success: false, error: "Couldn't read the statement clearly. Please try a clearer scan." },
        { status: 502 }
      )
    }

    // Defense in depth: only hand back rows shaped the way
    // lib/csvImport.ts's ParsedTransaction expects. Anything malformed is
    // silently dropped rather than surfacing an error, since a statement
    // with e.g. 90 good rows and 2 malformed ones should still succeed.
    const transactions = parsed.filter(isValidRawTransaction)

    return NextResponse.json({ success: true, transactions })
  } catch (err) {
    console.error("extract-statement error:", err)
    return NextResponse.json({ success: false, error: "Something went wrong reading that statement." }, { status: 500 })
  }
}
