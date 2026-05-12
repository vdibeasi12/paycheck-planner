'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle, Zap, Target } from 'lucide-react'

interface ReminderProps {
  taskName: string
  daysOverdue?: number
  onDismiss: () => void
  onComplete: () => void
}

export default function FriendlyReminder({
  taskName,
  daysOverdue = 0,
  onDismiss,
  onComplete,
}: ReminderProps) {
  const [isAnimating, setIsAnimating] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const messages = [
    `Hey! Don't forget about "${taskName}" 🎯`,
    `Quick reminder: "${taskName}" is waiting for you! ⏰`,
    `You've got this! Time to tackle "${taskName}" 💪`,
    `Your future self will thank you for completing "${taskName}" 🌟`,
    `Let's crush "${taskName}" together! 🚀`,
  ]

  const randomMessage = messages[Math.floor(Math.random() * messages.length)]

  return (
    <div
      className={`fixed bottom-20 right-6 max-w-xs transform transition-all duration-500 z-30 ${
        isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-2xl p-4 border border-blue-500">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 flex-shrink-0 text-yellow-300" />
            <span className="font-bold text-sm">Friendly Reminder!</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-blue-100 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm mb-4 leading-relaxed">{randomMessage}</p>

        {daysOverdue > 0 && (
          <p className="text-xs text-blue-100 mb-4">
            💭 It's been {daysOverdue} day{daysOverdue > 1 ? 's' : ''} since you started this...
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onComplete}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <CheckCircle size={16} />
            Mark Done!
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all duration-200 text-sm"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
