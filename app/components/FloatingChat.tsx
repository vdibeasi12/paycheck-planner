"use client"

import { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send } from "lucide-react"

interface Msg {
  role: "user" | "assistant"
  content: string
}

export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        'Hi! Need a hand getting set up? Ask me anything — like "How do I add a debt?"',
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const next: Msg[] = [...messages, { role: "user", content: text }]
    setMessages(next)
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json().catch(() => null)
      setMessages([
        ...next,
        { role: "assistant", content: data?.response || "Sorry, please try again." },
      ])
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Sorry, I couldn't reach support. Please try again." },
      ])
    } finally {
      setLoading(false)
    }
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
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user" ? "bg-green-500 text-black" : "bg-gray-700 text-white"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
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
                  send()
                }
              }}
              placeholder="Ask for help…"
              disabled={loading}
              className="flex-1 bg-[#1a233a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
            <button
              onClick={send}
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
