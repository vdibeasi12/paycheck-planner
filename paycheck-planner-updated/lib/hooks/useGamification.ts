import { useState, useCallback, useEffect } from 'react'

export interface GamificationEvent {
  id: string
  type: 'reminder' | 'celebration'
  taskName: string
  daysOverdue?: number
  milestoneType?: 'goal_complete' | 'first_goal' | 'debt_paid' | 'milestone'
  timestamp: number
}

export function useGamification() {
  const [events, setEvents] = useState<GamificationEvent[]>([])
  const [streak, setStreak] = useState(0)
  const [totalCompleted, setTotalCompleted] = useState(0)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('gamification')
      if (stored) {
        const data = JSON.parse(stored)
        setStreak(data.streak || 0)
        setTotalCompleted(data.totalCompleted || 0)
      }
    } catch (e) {
      console.error('Failed to load gamification data:', e)
    }
  }, [])

  // Save to localStorage whenever values change
  useEffect(() => {
    try {
      localStorage.setItem(
        'gamification',
        JSON.stringify({
          streak,
          totalCompleted,
          lastUpdate: new Date().toISOString(),
        })
      )
    } catch (e) {
      console.error('Failed to save gamification data:', e)
    }
  }, [streak, totalCompleted])

  const showReminder = useCallback((taskName: string, daysOverdue?: number) => {
    const id = `reminder-${Date.now()}`
    setEvents((prev) => [
      ...prev,
      {
        id,
        type: 'reminder',
        taskName,
        daysOverdue,
        timestamp: Date.now(),
      },
    ])

    // Auto-remove after 8 seconds
    setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== id))
    }, 8000)
  }, [])

  const showCelebration = useCallback(
    (goalName: string, milestoneType: GamificationEvent['milestoneType'] = 'goal_complete') => {
      const id = `celebration-${Date.now()}`
      setEvents((prev) => [
        ...prev,
        {
          id,
          type: 'celebration',
          taskName: goalName,
          milestoneType,
          timestamp: Date.now(),
        },
      ])

      // Increment streak and total
      setTotalCompleted((prev) => prev + 1)
      setStreak((prev) => prev + 1)

      // Keep celebration visible for 5 seconds
      setTimeout(() => {
        setEvents((prev) => prev.filter((e) => e.id !== id))
      }, 5000)
    },
    []
  )

  const dismissEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const completeTask = useCallback((taskName: string) => {
    showCelebration(taskName, 'goal_complete')
  }, [showCelebration])

  const resetStreak = useCallback(() => {
    setStreak(0)
  }, [])

  return {
    events,
    streak,
    totalCompleted,
    showReminder,
    showCelebration,
    dismissEvent,
    completeTask,
    resetStreak,
  }
}

// Custom hook for getting motivational quotes
export function useMotivationalQuotes() {
  const quotes = [
    "Every dollar saved is a step towards freedom! 💚",
    "You're not just paying off debt, you're building a better future! 🚀",
    "Small progress is still progress. Keep going! 💪",
    "Your financial goals are within reach! 🎯",
    "Believe in yourself - you've got this! ✨",
    "Financial freedom starts with one decision. You made it! 🌟",
    "Celebrate the small wins - they lead to big changes! 🎉",
    "You're stronger than your debt! 💪",
    "Every goal completed is proof you can do hard things! 🏆",
    "Your future self will be so grateful! 💝",
  ]

  const getRandomQuote = useCallback(() => {
    return quotes[Math.floor(Math.random() * quotes.length)]
  }, [])

  const getQuoteForMilestone = useCallback((completed: number) => {
    if (completed === 1) return "First goal down! Look at you go! 🌟"
    if (completed === 5) return "5 goals crushed! You're a champion! 🏆"
    if (completed === 10) return "10 goals completed! You're unstoppable! 🚀"
    if (completed % 5 === 0) return `${completed} goals done! You're amazing! 💪`
    return getRandomQuote()
  }, [getRandomQuote])

  return {
    getRandomQuote,
    getQuoteForMilestone,
  }
}

// Helper to schedule reminders
export function useReminderScheduler() {
  const { showReminder } = useGamification()

  const scheduleReminder = useCallback(
    (taskName: string, daysSinceStarted: number) => {
      // Show reminder if task has been pending for more than 3 days
      if (daysSinceStarted > 3) {
        showReminder(taskName, daysSinceStarted)
      }
    },
    [showReminder]
  )

  return { scheduleReminder }
}
