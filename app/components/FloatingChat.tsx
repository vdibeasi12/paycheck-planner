"use client"

import { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send } from "lucide-react"

interface Msg {
  role: "user" | "assistant"
  content: string
}

type Faq = { keywords: string[]; answer: string }

// Built-in answers — no API, no cost. Add or tweak entries freely.
// First match wins, so keep more specific intents higher in the list.
const FAQS: Faq[] = [
  {
    keywords: ["get started", "getting started", "how do i start", "where do i start", "begin", "set up", "setup", "new here", "what do i do", "first step"],
    answer:
      "Welcome! Here's the quickest way to get going:\n1. Open Debts (top menu) and add your debts.\n2. Add your bills and paychecks under Bills.\n3. Set a target under Goals.\n4. Check your Dashboard and Insights to see your payoff picture.",
  },
  {
    keywords: ["add a debt", "add debt", "enter debt", "new debt", "input debt", "track debt", "my debts", "log a debt"],
    answer:
      "To add a debt, click Debts in the top menu, then enter each debt's balance, interest rate (APR), and minimum payment. It shows up on your Dashboard right away.",
  },
  {
    keywords: ["add a bill", "add bill", "bill", "bills", "paycheck", "paychecks", "income", "expense"],
    answer:
      "Head to Bills in the top menu to add your bills and paychecks — that's what powers your monthly view and payoff plan.",
  },
  {
    keywords: ["snowball", "avalanche", "payoff strategy", "pay off strategy", "best strategy", "which strategy", "pay off debt", "pay down debt"],
    answer:
      "Two popular approaches:\n\u2022 Snowball \u2014 pay your smallest balance first for quick wins and momentum.\n\u2022 Avalanche \u2014 pay your highest interest rate (APR) first to save the most on interest.\nThe app can run both for you (debt strategies are a Premium feature).",
  },
  {
    keywords: ["goal", "goals", "target", "save for", "saving for", "milestone"],
    answer:
      'Click Goals in the top menu, then "New goal" to set a target and track your progress toward it.',
  },
  {
    keywords: ["cancel", "refund", "billing", "charged", "payment failed", "card declined", "double charge", "invoice"],
    answer:
      "For anything billing-related \u2014 cancellations, refunds, or payment issues \u2014 email support@paycheckplanner.ai and the team will take care of it.",
  },
  {
    keywords: ["upgrade", "pricing", "price", "plan", "plans", "premium", "starter", "cost", "how much", "subscribe", "subscription"],
    answer:
      "See Pricing in the top menu. Free lets you track debts, bills, and goals; Starter unlocks charts; Premium unlocks debt-payoff strategies and the AI advisor.",
  },
  {
    keywords: ["chart", "charts", "insight", "insights", "analytics", "graph", "report"],
    answer:
      "Charts and analytics live under Insights in the top menu (available on the Momentum and Accelerate plans).",
  },
  {
    keywords: ["ai advisor", "ai chat", "ai financial", "financial advisor", "ai help"],
    answer:
      "The AI Financial Advisor (AI Chat in the menu) gives personalized, in-depth advice and is part of the Premium plan.",
  },
  {
    keywords: ["password", "log in", "login", "sign in", "2fa", "two-factor", "two factor", "security", "my account", "change email"],
    answer:
      "Open Account in the top menu to change your password or set up two-factor authentication.",
  },
  {
    keywords: ["contact", "human", "talk to", "speak to", "real person", "customer service", "reach you", "email you"],
    answer: "You can reach the team anytime at support@paycheckplanner.ai.",
  },
]

const FALLBACK =
  "I'm not sure about that one yet \u2014 I can help with getting started, adding debts and bills, goals, plans, and payoff strategies. For anything else, email support@paycheckplanner.ai and the team will help."

function answerFor(message: string): string {
  const m = message.toLowerCase()
  for (const faq of FAQS) {
    if (faq.keywords.some((k) => m.includes(k))) return faq.answer
  }
  return FALLBACK
}

const QUICK = [
  "How do I get started?",
  "How do I add a debt?",
  "Snowball vs avalanche?",
  "Plans & pricing",
]

export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        'Hi! I can help you find your way around Paycheck Planner. Ask me something \u2014 like "How do I add a debt?"',
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open, loading])

  const sendText = (raw: string) => {
    const text = raw.trim()
    if (!text || loading) return
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")
    setLoading(true)
    // Tiny delay so it reads like a reply rather than an instant lookup.
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: answerFor(text) }])
      setLoading(false)
    }, 350)
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open help chat"
          className="fixed bottom-6 right-6 z-[60] flex items-center justify-center w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-black shadow-lg transition"
        >
          <MessageCircle size={26} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-[60] w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] flex flex-col bg-[#0f172a] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#0b1220] border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="font-semibold text-white text-sm">Paycheck Planner Help</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close help chat"
              className="text-gray-400 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user" ? "bg-green-500 text-black" : "bg-gray-700 text-white"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendText(q)}
                    className="text-xs bg-[#1a233a] hover:bg-[#2a3f5f] border border-gray-700 text-gray-200 rounded-full px-3 py-1.5 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-white px-3 py-2 rounded-2xl">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-gray-800 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendText(input)
                }
              }}
              placeholder="Ask for help..."
              disabled={loading}
              className="flex-1 bg-[#1a233a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
            <button
              onClick={() => sendText(input)}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black px-3 rounded-lg transition flex items-center"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
