import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { canUseAI } from "@/lib/permissions"

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"

const SYSTEM_PROMPT = `You are the AI financial assistant inside Paycheck Planner, a debt-payoff and budgeting app.
Help users with personal finance: debt payoff (snowball vs. avalanche), budgeting, saving, emergency funds, and managing bills and paychecks.
Be friendly, encouraging, specific, and concise. Use plain language, give concrete actionable steps, and keep answers focused on the user's question.
Where useful, point users to Paycheck Planner's own tools (the Debt Payoff Calculator, the Bills tracker, and the Dashboard).
Guardrails: you provide general educational information, not licensed financial, investment, tax, or legal advice. Never recommend specific securities or guarantee returns. For personalized investment, tax, or legal decisions, tell the user to consult a qualified professional.`

type ChatMsg = { role: "user" | "assistant"; content: string }

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ response: "Please enter a question." }, { status: 400 })
    }

    // Auth + plan gate: the AI assistant is a Premium feature, and this also
    // protects the API budget from anonymous / free usage.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { response: "Please log in to use the AI assistant." },
        { status: 401 }
      )
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, is_admin")
      .eq("id", user.id)
      .maybeSingle()
    const effectivePlan = profile?.is_admin ? "connected" : (profile?.plan || "free")
    if (!canUseAI(effectivePlan)) {
      return NextResponse.json({
        response:
          "The AI assistant is an Accelerate feature. Upgrade to Accelerate to chat with your financial assistant any time.",
      })
    }

    // Per-user rate limit, DB-backed so it holds across serverless instances.
    const { data: underLimit } = await supabase.rpc("check_and_increment_rate_limit", {
      p_bucket: "chat",
    })
    if (underLimit === false) {
      return NextResponse.json(
        {
          response:
            "You have reached the usage limit for the AI assistant for now. Please try again in a little while.",
        },
        { status: 429 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set")
      return NextResponse.json(
        { response: "The AI assistant isn't configured yet. Please try again later." },
        { status: 500 }
      )
    }

    // Build the conversation: prior turns (sent by the UI) + this message.
    // Anthropic requires the list to start with a user turn, so drop any
    // leading assistant turns (e.g. the greeting bubble) and cap the context.
    let prior: ChatMsg[] = Array.isArray(history)
      ? history
          .filter(
            (m: any) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string" &&
              m.content.trim().length > 0
          )
          .slice(-10)
      : []
    while (prior.length && prior[0].role === "assistant") prior.shift()

    const messages: ChatMsg[] = [...prior, { role: "user", content: message }]

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error("Anthropic API error:", res.status, detail)
      return NextResponse.json(
        { response: "Sorry, the assistant is having trouble right now. Please try again in a moment." },
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

    return NextResponse.json({
      response: text || "I'm not sure how to answer that—could you rephrase?",
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ response: "Error processing your request." }, { status: 500 })
  }
}
