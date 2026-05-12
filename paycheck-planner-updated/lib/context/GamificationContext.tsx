'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import FriendlyReminder from '@/app/components/FriendlyReminder'
import GoalCelebration from '@/app/components/GoalCelebration'

export interface GamificationContextType {
  showReminder: (taskName: string, daysOverdue?: number) => void
  showCelebration: (goalName: string, milestoneType?: 'goal_complete' | 'first_goal' | 'debt_paid' | 'milestone') => void
  streak: number
  totalCompleted: number
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined)

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [reminders, setReminders] = useState<Array<{ id: string; taskName: string; daysOverdue?: number }>>([])
  const [celebrations, setCelebrations] = useState<Array<{ id: string; goalName: string; milestoneType: 'goal_complete' | 'first_goal' | 'debt_paid' | 'milestone' }>>([])
  const [streak, setStreak] = useState(0)
  const [totalCompleted, setTotalCompleted] = useState(0)

  const showReminder = useCallback((taskName: string, daysOverdue?: number) => {
    const id = `reminder-${Date.now()}`
    setReminders((prev) => [...prev, { id, taskName, daysOverdue }])

    // Auto-remove after 8 seconds
    setTimeout(() => {
      setReminders((prev) => prev.filter((r) => r.id !== id))
    }, 8000)
  }, [])

  const showCelebration = useCallback(
    (goalName: string, milestoneType: 'goal_complete' | 'first_goal' | 'debt_paid' | 'milestone' = 'goal_complete') => {
      const id = `celebration-${Date.now()}`
      setCelebrations((prev) => [...prev, { id, goalName, milestoneType }])

      // Increment counters
      setTotalCompleted((prev) => prev + 1)
      setStreak((prev) => prev + 1)

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setCelebrations((prev) => prev.filter((c) => c.id !== id))
      }, 5000)
    },
    []
  )

  const dismissReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const dismissCelebration = useCallback((id: string) => {
    setCelebrations((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const completeTask = useCallback((taskName: string) => {
    showCelebration(taskName, 'goal_complete')
  }, [showCelebration])

  return (
    <GamificationContext.Provider value={{ showReminder, showCelebration, streak, totalCompleted }}>
      {children}

      {/* Reminders */}
      {reminders.map((reminder) => (
        <div key={reminder.id} className="pointer-events-auto">
          <FriendlyReminder
            taskName={reminder.taskName}
            daysOverdue={reminder.daysOverdue}
            onDismiss={() => dismissReminder(reminder.id)}
            onComplete={() => {
              completeTask(reminder.taskName)
              dismissReminder(reminder.id)
            }}
          />
        </div>
      ))}

      {/* Celebrations */}
      {celebrations.map((celebration) => (
        <div key={celebration.id} className="pointer-events-auto">
          <GoalCelebration
            goalName={celebration.goalName}
            milestoneType={celebration.milestoneType}
            onDismiss={() => dismissCelebration(celebration.id)}
          />
        </div>
      ))}
    </GamificationContext.Provider>
  )
}

// Hook to use gamification context
export function useGamificationContext() {
  const context = useContext(GamificationContext)
  if (!context) {
    throw new Error('useGamificationContext must be used within GamificationProvider')
  }
  return context
}

// Hook for easier access with default values
export function useGamification() {
  const context = useContext(GamificationContext)
  return {
    showReminder: context?.showReminder || (() => {}),
    showCelebration: context?.showCelebration || (() => {}),
    streak: context?.streak || 0,
    totalCompleted: context?.totalCompleted || 0,
  }
}
