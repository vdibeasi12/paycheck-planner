'use client'

import { useState, useEffect } from 'react'
import { X, Trophy, Zap, Heart, Star } from 'lucide-react'

interface Confetti {
  id: number
  left: number
  delay: number
  duration: number
}

interface CelebrationProps {
  goalName: string
  onDismiss: () => void
  milestoneType?: 'goal_complete' | 'first_goal' | 'debt_paid' | 'milestone'
}

export default function GoalCelebration({
  goalName,
  onDismiss,
  milestoneType = 'goal_complete',
}: CelebrationProps) {
  const [confetti, setConfetti] = useState<Confetti[]>([])

  useEffect(() => {
    // Generate confetti pieces
    const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1,
    }))
    setConfetti(confettiPieces)

    // Play sound effect if available
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()

      oscillator.connect(gain)
      gain.connect(audioContext.destination)

      oscillator.frequency.value = 800
      gain.gain.setValueAtTime(0.3, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (e) {
      // Audio not available, no worries
    }
  }, [])

  const celebrations = {
    goal_complete: {
      title: '🎉 Goal Completed!',
      message: `You crushed "${goalName}"! Amazing work!`,
      icon: Trophy,
      color: 'from-purple-600 to-pink-600',
      emoji: '✨',
    },
    first_goal: {
      title: '🌟 First Goal Done!',
      message: `Welcome to the winners circle! You completed "${goalName}"!`,
      icon: Star,
      color: 'from-yellow-600 to-orange-600',
      emoji: '🚀',
    },
    debt_paid: {
      title: '💰 Debt Eliminated!',
      message: `One less debt! You're crushing "${goalName}"!`,
      icon: Zap,
      color: 'from-green-600 to-emerald-600',
      emoji: '💪',
    },
    milestone: {
      title: '🏆 Milestone Reached!',
      message: `Look at you go! "${goalName}" is now in the books!`,
      icon: Heart,
      color: 'from-red-600 to-rose-600',
      emoji: '❤️',
    },
  }

  const celebration = celebrations[milestoneType]
  const IconComponent = celebration.icon

  return (
    <>
      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="fixed pointer-events-none"
          style={{
            left: `${piece.left}%`,
            top: '-10px',
            animation: `fall ${piece.duration}s ease-in forwards`,
            animationDelay: `${piece.delay}s`,
          }}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              ['bg-yellow-300', 'bg-blue-300', 'bg-pink-300', 'bg-green-300', 'bg-purple-300'][
                Math.floor(Math.random() * 5)
              ]
            }`}
          />
        </div>
      ))}

      {/* Celebration Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onDismiss}
        />

        {/* Celebration Card */}
        <div className="relative bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-bounce">
          {/* Close Button */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X size={24} />
          </button>

          {/* Content */}
          <div className="text-center">
            {/* Animated Icon */}
            <div className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br ${celebration.color} flex items-center justify-center text-white animate-spin`} style={{animationDuration: '2s'}}>
              <IconComponent size={40} />
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {celebration.title}
            </h2>

            {/* Message */}
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
              {celebration.message}
            </p>

            {/* Celebration Messages */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6 border border-blue-200">
              <p className="text-sm text-slate-700 font-medium mb-2">
                Here's what's amazing about this:
              </p>
              <ul className="text-xs text-slate-600 space-y-1 text-left">
                <li>✅ You're taking control of your finances</li>
                <li>✅ Every goal completed = financial freedom</li>
                <li>✅ Keep this momentum going!</li>
              </ul>
            </div>

            {/* Fun Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-blue-100 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-600">1</p>
                <p className="text-xs text-blue-700">Goal Done</p>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-600">📈</p>
                <p className="text-xs text-green-700">Progress</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-3">
                <p className="text-2xl font-bold text-purple-600">🎯</p>
                <p className="text-xs text-purple-700">On Track</p>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={onDismiss}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/50 text-lg"
            >
              {celebration.emoji} Awesome! Let's Keep Going!
            </button>

            {/* Encouragement */}
            <p className="text-xs text-slate-500 mt-4">
              You're building better financial habits every day. We believe in you! 💪
            </p>
          </div>
        </div>
      </div>

      {/* Keyframe Animation */}
      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotateZ(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}
