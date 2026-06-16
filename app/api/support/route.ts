import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
// Defaults to your working chat model; set ANTHROPIC_SUPPORT_MODEL to a cheaper
// model (e.g. a Haiku) to cut cost on high-volume support traffic.
const MODEL =
  process.env.ANTHROPIC_SUPPORT_MODEL ||
  process.env.ANTHROPIC_MODEL ||
  "claude-sonnet-4-6"

const SYSTEM_PROMPT = `You are the in-app help assistant for Paycheck Planner, a debt-payoff and budgeting web + mobile app.
Your job is to help people USE the app, get set up, and answer general personal-finance questions.

Where things are (refer to these nav items by name):
- Dashboard: overview of net worth, total debt, monthly payments, and the debt list.
- Debts: add and manage debts (balance, APR, minimum payment).
- Bills: add and track bills and paychecks.
- Goals: set savings/payoff goals and track progress.
- Insights: charts and analytics (Starter/Premium).
- AI Chat: the deeper AI financial advisor (Premium).
- Account: security, two-factor authentication, change password.
- Pricing: the Free, Starter, and Premium plans.

Getting started (share these steps when someone seems lost or new):
1) Open Debts and add your debts. 2) Add your bills and paychecks under Bills.
3) Set a goal under Goals. 4) Check the Dashboard and Insights to see your payoff picture.

Style: warm, brief, concrete, step-by-step. For finance questions give general educational
info only (snowball = smallest balance first; avalanche = highest APR first) and note it is not
licensed financial advice. If someone needs a human, suggest emailing support@paycheckplanner.ai.`

type Msg = { role: "user" | "assistant"; content: string }

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json()
    if (!message || typeof message !== "string") {
      return NextResponse.json({ response: "What can I help you with?" }, { status: 400 })
    }

    // Any logged-in user can use support (it drives activation + conversion),
    // but require auth so the endpoint isn't open to anonymous abuse.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { response: "Please log in and I can help you get set up." },
        { status: 401 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set")
      return NextResponse.json({
        response:
          "I can't reach the assistant right now. For help, email support@paycheckplanner.ai.",
      })
    }

    let prior: Msg[] = Array.isArray(history)
      ? history
          .filter(
            (m: any) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string" &&
              m.content.trim().length > 0
          )
          .slice(-8)
      : []
    while (prior.length && prior[0].role === "assistant") prior.shift()
    const messages: Msg[] = [...prior, { role: "user", content: message }]

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error("Support API error:", res.status, detail)
      return NextResponse.json(
        { response: "Sorry, I'm having trouble right now. Please try again in a moment." },
        { status: 502 }
      )
    }

    const data = await res.json()
    const text: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: any) => b?.type === "text")
          .map((b: any) => b.text)
          .join("\n")
          .trim()
      : ""
    return NextResponse.json({ response: text || "Could you rephrase that?" })
  } catch (err) {
    console.error("Support API error:", err)
    return NextResponse.json({ response: "Something went wrong. Please try again." }, { status: 500 })
  }
}
