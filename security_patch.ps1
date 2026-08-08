[Environment]::CurrentDirectory=(Get-Location).Path
$global:anyFail = $false

# ---- app/api/support/route.ts ----
$support_route = @'
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
// Defaults to your working chat model; set ANTHROPIC_SUPPORT_MODEL to a cheaper
// model (e.g. a Haiku) to cut cost on high-volume support traffic.
const MODEL =
  process.env.ANTHROPIC_SUPPORT_MODEL ||
  process.env.ANTHROPIC_MODEL ||
  "claude-sonnet-4-6"

// Caps a single message's length before it goes to Anthropic. This isn't a
// UX limit (nobody types a legit support question this long) -- it's a cost
// ceiling so one request can't balloon input tokens.
const MAX_MESSAGE_LENGTH = 4000

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
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { response: "That message is too long. Please shorten it and try again." },
        { status: 413 }
      )
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

    // Per-user rate limit, DB-backed so it holds across serverless instances.
    // This route isn't plan-gated (any logged-in user can use it), which
    // makes the rate limit the only thing standing between it and unlimited
    // Anthropic API calls on your key -- so it's not optional here. Falls
    // back to the function's default bucket limit (20/hour) since "support"
    // has no dedicated tier configured in the migration.
    const { data: underLimit } = await supabase.rpc("check_and_increment_rate_limit", {
      p_bucket: "support",
    })
    if (underLimit === false) {
      return NextResponse.json(
        {
          response:
            "You've reached the help assistant's usage limit for now. Please try again a bit later, or email support@paycheckplanner.ai.",
        },
        { status: 429 }
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
              m.content.trim().length > 0 &&
              m.content.length <= MAX_MESSAGE_LENGTH
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

'@
$targetPath_support_route = "app/api/support/route.ts"
$dir_support_route = Split-Path $targetPath_support_route -Parent
if ($dir_support_route -and -not (Test-Path $dir_support_route)) { New-Item -ItemType Directory -Path $dir_support_route -Force | Out-Null }
[System.IO.File]::WriteAllText($targetPath_support_route, $support_route, (New-Object System.Text.UTF8Encoding($false)))
$check_support_route = Select-String -Path $targetPath_support_route -Pattern 'p_bucket: "support"' -SimpleMatch
if (-not $check_support_route) { Write-Host "FAIL: app/api/support/route.ts did not contain expected content" -ForegroundColor Red; $global:anyFail = $true } else { Write-Host "OK: app/api/support/route.ts verified" -ForegroundColor Green }

# ---- app/api/chat/route.ts ----
$chat_route = @'
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { canUseAI } from "@/lib/permissions"

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"

// Caps a single message's length before it goes to Anthropic. This isn't a
// UX limit -- it's a cost ceiling so one request can't balloon input tokens.
const MAX_MESSAGE_LENGTH = 4000

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
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { response: "That message is too long. Please shorten it and try again." },
        { status: 413 }
      )
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
              m.content.trim().length > 0 &&
              m.content.length <= MAX_MESSAGE_LENGTH
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
      response: text || "I'm not sure how to answer that - could you rephrase?",
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ response: "Error processing your request." }, { status: 500 })
  }
}

'@
$targetPath_chat_route = "app/api/chat/route.ts"
$dir_chat_route = Split-Path $targetPath_chat_route -Parent
if ($dir_chat_route -and -not (Test-Path $dir_chat_route)) { New-Item -ItemType Directory -Path $dir_chat_route -Force | Out-Null }
[System.IO.File]::WriteAllText($targetPath_chat_route, $chat_route, (New-Object System.Text.UTF8Encoding($false)))
$check_chat_route = Select-String -Path $targetPath_chat_route -Pattern 'MAX_MESSAGE_LENGTH' -SimpleMatch
if (-not $check_chat_route) { Write-Host "FAIL: app/api/chat/route.ts did not contain expected content" -ForegroundColor Red; $global:anyFail = $true } else { Write-Host "OK: app/api/chat/route.ts verified" -ForegroundColor Green }

# ---- app/api/ai/route.ts ----
$ai_route = @'
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { canUseAI } from "@/lib/permissions"

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"

// This route takes "debts" straight from the client body (not a DB read),
// so it's an unbounded-input vector like the chat routes -- cap the array
// size and each name's length before they go into the prompt.
const MAX_DEBTS = 100
const MAX_NAME_LENGTH = 200

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const debts = Array.isArray(body?.debts) ? body.debts.slice(0, MAX_DEBTS) : []

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
      .select("plan, is_admin")
      .eq("id", user.id)
      .maybeSingle()
    const effectivePlan = profile?.is_admin ? "connected" : (profile?.plan || "free")
    if (!canUseAI(effectivePlan)) {
      return NextResponse.json({
        advice: "Upgrade to Accelerate to unlock personalized AI insights on your debts.",
      })
    }

    // Per-user rate limit, DB-backed so it holds across serverless instances.
    // Protects the Anthropic budget from a single account hammering the route.
    const { data: underLimit } = await supabase.rpc("check_and_increment_rate_limit", {
      p_bucket: "ai",
    })
    if (underLimit === false) {
      return NextResponse.json({
        advice: "You have reached the AI insight limit for now. Please try again a bit later.",
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
        const rawName = String(d.name ?? d.creditor ?? "Debt")
        const name = rawName.length > MAX_NAME_LENGTH ? rawName.slice(0, MAX_NAME_LENGTH) : rawName
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

'@
$targetPath_ai_route = "app/api/ai/route.ts"
$dir_ai_route = Split-Path $targetPath_ai_route -Parent
if ($dir_ai_route -and -not (Test-Path $dir_ai_route)) { New-Item -ItemType Directory -Path $dir_ai_route -Force | Out-Null }
[System.IO.File]::WriteAllText($targetPath_ai_route, $ai_route, (New-Object System.Text.UTF8Encoding($false)))
$check_ai_route = Select-String -Path $targetPath_ai_route -Pattern 'MAX_DEBTS' -SimpleMatch
if (-not $check_ai_route) { Write-Host "FAIL: app/api/ai/route.ts did not contain expected content" -ForegroundColor Red; $global:anyFail = $true } else { Write-Host "OK: app/api/ai/route.ts verified" -ForegroundColor Green }

if ($global:anyFail) {
    Write-Host "One or more files failed verification in Security patch. Stopping before git." -ForegroundColor Red
    exit 1
}

git add -A
git commit -m "Secure AI routes: rate-limit /api/support, cap message/debt input length"
git push
Write-Host "Done - pushed to main." -ForegroundColor Cyan