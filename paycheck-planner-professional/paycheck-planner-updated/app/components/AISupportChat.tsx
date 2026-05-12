'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, X, MessageCircle } from 'lucide-react'

interface Message {
  role: 'user' | 'ai'
  text: string
}

export default function AISupportChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setLoading(true)

    try {
      const response = await fetch('/api/ai-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })

      const data = await response.json()
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'ai', text: data.response }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: 'I had trouble understanding that. Please email support@paycheckplanner.ai for detailed help!' 
        }])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: '😞 Sorry, I encountered an error. Please email support@paycheckplanner.ai' 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full p-4 shadow-lg hover:shadow-green-500/50 z-40 flex items-center gap-2 transition-all duration-200 animate-bounce"
          aria-label="Open AI Support Chat"
        >
          <MessageCircle size={24} />
          <span className="hidden sm:inline font-semibold">AI Help</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-full sm:w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col h-96 sm:h-[500px] animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-t-xl flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Paycheck Planner AI</h3>
              <p className="text-xs text-green-100">Always here to help 🤖</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-green-700 p-1 rounded transition-colors"
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="text-3xl mb-3">👋</div>
                <p className="font-semibold text-white mb-3">Welcome to Paycheck Planner!</p>
                <p className="text-sm text-slate-400 mb-4">I'm here to help you with:</p>
                <ul className="text-xs text-slate-500 space-y-2 bg-slate-800 p-3 rounded-lg w-full">
                  <li>💰 <span className="text-slate-300">Pricing & plan selection</span></li>
                  <li>📚 <span className="text-slate-300">How to use features</span></li>
                  <li>🎯 <span className="text-slate-300">Debt payoff strategies</span></li>
                  <li>🔐 <span className="text-slate-300">Account & billing questions</span></li>
                  <li>✨ <span className="text-slate-300">Getting started tips</span></li>
                </ul>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs p-3 rounded-lg text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-green-600 text-white rounded-br-none'
                      : 'bg-slate-700 text-slate-100 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-100 p-3 rounded-lg rounded-bl-none">
                  <span className="animate-pulse">Thinking... ✨</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-700 p-3 bg-slate-800 rounded-b-xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg p-2 transition-colors"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              💬 Powered by AI | 📧{' '}
              <a href="mailto:support@paycheckplanner.ai" className="text-green-400 hover:text-green-300">
                support@paycheckplanner.ai
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
