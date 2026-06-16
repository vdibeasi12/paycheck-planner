import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const debts = Array.isArray(body?.debts) ? body.debts : []

    if (debts.length === 0) {
      return NextResponse.json({ advice: "Add debts to receive personalized AI insights." })
    }

    // Auth + plan gate (matches the dashboard: AI insight is Premium).
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ advice: "Log in to see AI insights." })
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle()
    if (profile?.plan !== "premium") {
      return NextResponse.json({
        advice: "Upgrade to Premium to unlock personalized AI insights on your debts.",
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set")
      return NextResponse.json({ advice: "AI insights aren't configured yet." })
    }

    // Compact the debts into a short, model-friendly summary.
    const lines = debts
      .map((d: any) => {
        const name = d.name ?? d.creditor ?? "Debt"
        const bal = Number(d.balance ?? 0)
        const rate = Number(d.interest_rate ?? d.apr ?? 0)
        const min = Number(d.minimum_payment ?? d.min_payment ?? 0)
        return `- ${name}: balance $${bal}, APR ${rate}%, min payment $${min}`
      })
      .join("\n")

    const prompt = `Here are the user's debts:
${lines}

Give a short, specific insight (3-5 sentences, no preamble). Recommend snowball or avalanche based on these numbers, name which debt to target first and why, and give one concrete next step. Be encouraging and concrete. This is general educational information, not licensed financial advice.`

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system:
          "You are a concise personal-finance assistant inside the Paycheck Planner app. You give general educational guidance on debt payoff, not licensed financial advice.",
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error("Anthropic API error (ai):", res.status, detail)
      return NextResponse.json({ advice: "Unable to generate advice right now." })
    }

    const data = await res.json()
    const text: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: any) => b?.type === "text")
          .map((b: any) => b.text)
          .join("\n")
          .trim()
      : ""

    return NextResponse.json({ advice: text || "Unable to generate advice right now." })
  } catch (err) {
    console.error("AI error:", err)
    return NextResponse.json({ advice: "Unable to generate advice right now." })
  }
}
