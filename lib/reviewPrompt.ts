// lib/reviewPrompt.ts
// Pure trigger logic for Task #23 (native in-app review prompt). Kept
// separate from lib/achievements.ts (badges) because this only ever needs
// a single yes/no answer, evaluated by app/components/ReviewPromptInit.tsx.
//
// "3 paycheck plans created" = 3+ rows in income (a user with a second job
// or a spouse's paycheck added counts too, same as anyone who just entered
// 3 pay sources). "A savings goal hit" = any financial_goals row reaching
// 100% funded -- the same current_amount >= target_amount check
// app/api/cron/savings-milestone uses for its 100% push notification.

export type ReviewPromptStats = {
  incomeCount: number
  anyGoalCompleted: boolean
}

export function hasHitReviewMoment(s: ReviewPromptStats): boolean {
  return s.incomeCount >= 3 || s.anyGoalCompleted
}
