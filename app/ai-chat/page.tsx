'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI Financial Advisor. I can help you with debt strategies, budgeting tips, savings goals, and personalized financial advice. What would you like to know?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        })
      })

      const data = await response.json()

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response || 'I\'m processing your request. Please try again.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-800">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">AI Financial Advisor</h1>
          <p className="text-gray-400">Get personalized financial advice powered by AI</p>
        </div>
      </div>

      {/* Main Content - Fixed Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-2xl mx-auto px-6 w-full flex-1 flex flex-col">
          {/* Messages Container - Fixed height with internal scroll */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto my-6 space-y-4 bg-[#0f172a] rounded-lg p-6 border border-gray-700 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800"
          >
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-sm px-4 py-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-green-500 text-black'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <span className={`text-xs mt-1 block ${
                    message.type === 'user' ? 'text-black/70' : 'text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-white px-4 py-3 rounded-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Fixed at bottom */}
          <div className="pb-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setInput('Help me create a debt payoff plan')
                  setTimeout(() => formRef.current?.dispatchEvent(new Event('submit', { bubbles: true })), 0)
                }}
                className="text-xs bg-[#1a233a] hover:bg-[#2a3f5f] border border-gray-700 rounded px-3 py-2 transition cursor-pointer font-medium"
              >
                Debt Plan
              </button>
              <button
                type="button"
                onClick={() => {
                  setInput('How can I save more money?')
                  setTimeout(() => formRef.current?.dispatchEvent(new Event('submit', { bubbles: true })), 0)
                }}
                className="text-xs bg-[#1a233a] hover:bg-[#2a3f5f] border border-gray-700 rounded px-3 py-2 transition cursor-pointer font-medium"
              >
                Save More
              </button>
              <button
                type="button"
                onClick={() => {
                  setInput('What\'s the best debt payoff strategy?')
                  setTimeout(() => formRef.current?.dispatchEvent(new Event('submit', { bubbles: true })), 0)
                }}
                className="text-xs bg-[#1a233a] hover:bg-[#2a3f5f] border border-gray-700 rounded px-3 py-2 transition cursor-pointer font-medium"
              >
                Best Strategy
              </button>
              <button
                type="button"
                onClick={() => {
                  setInput('How do I improve my financial health?')
                  setTimeout(() => formRef.current?.dispatchEvent(new Event('submit', { bubbles: true })), 0)
                }}
                className="text-xs bg-[#1a233a] hover:bg-[#2a3f5f] border border-gray-700 rounded px-3 py-2 transition cursor-pointer font-medium"
              >
                Financial Health
              </button>
            </div>

            {/* Input Form */}
            <form ref={formRef} onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me about debt, budgeting, savings, or financial strategies..."
                className="flex-1 bg-[#1a233a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold px-6 py-3 rounded-lg transition flex items-center gap-2"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
