// lib/achievements.ts
// Badge catalog + pure award evaluation. The /api/achievements/check route
// gathers stats from the database and calls earnedFromStats() to decide which
// badges are earned. "trackable: false" badges render in the UI as coming soon
// until their signal exists (streaks need user_activity; autopilot needs Plaid).

export type BadgeKey =
  | "first_dollar"
  | "debt_tracker"
  | "bill_organizer"
  | "all_set"
  | "first_month_budgeted"
  | "debt_slayer"
  | "debt_free"
  | "goal_getter"
  | "halfway_there"
  | "on_a_roll"
  | "streak_master"
  | "autopilot_on";

export type Badge = {
  key: BadgeKey;
  title: string;
  description: string;
  icon: string; // lucide-react icon name, resolved in the UI layer
  trackable: boolean;
};

export const BADGES: Badge[] = [
  { key: "first_dollar", title: "First Dollar", description: "Added your first income source.", icon: "DollarSign", trackable: true },
  { key: "debt_tracker", title: "Debt Tracker", description: "Logged your first debt.", icon: "ListChecks", trackable: true },
  { key: "bill_organizer", title: "Bill Organizer", description: "Added your first bill.", icon: "Receipt", trackable: true },
  { key: "all_set", title: "All Set", description: "Completed income, debts, and bills setup.", icon: "CheckCircle2", trackable: true },
  { key: "first_month_budgeted", title: "First Month Budgeted", description: "Income and bills are both in place.", icon: "CalendarCheck", trackable: true },
  { key: "debt_slayer", title: "Debt Slayer", description: "Knocked a debt down to zero.", icon: "Swords", trackable: true },
  { key: "debt_free", title: "Debt Free", description: "Cleared every debt you tracked.", icon: "PartyPopper", trackable: true },
  { key: "goal_getter", title: "Goal Getter", description: "Set your first savings goal.", icon: "Target", trackable: true },
  { key: "halfway_there", title: "Halfway There", description: "Paid down 50 percent of a debt.", icon: "TrendingDown", trackable: false },
  { key: "on_a_roll", title: "On a Roll", description: "Seven day activity streak.", icon: "Flame", trackable: false },
  { key: "streak_master", title: "Streak Master", description: "Thirty day activity streak.", icon: "Award", trackable: false },
  { key: "autopilot_on", title: "Autopilot On", description: "Connected your bank with Plaid.", icon: "Plane", trackable: false },
];

export type Stats = {
  incomeCount: number;
  debtsCount: number;
  billsCount: number;
  goalsCount: number;
  anyDebtCleared: boolean;
  allDebtsCleared: boolean;
};

// Pure: given stats, return the trackable badge keys that are earned.
export function earnedFromStats(s: Stats): BadgeKey[] {
  const earned: BadgeKey[] = [];
  if (s.incomeCount > 0) earned.push("first_dollar");
  if (s.debtsCount > 0) earned.push("debt_tracker");
  if (s.billsCount > 0) earned.push("bill_organizer");
  if (s.incomeCount > 0 && s.debtsCount > 0 && s.billsCount > 0) earned.push("all_set");
  if (s.incomeCount > 0 && s.billsCount > 0) earned.push("first_month_budgeted");
  if (s.anyDebtCleared) earned.push("debt_slayer");
  if (s.allDebtsCleared) earned.push("debt_free");
  if (s.goalsCount > 0) earned.push("goal_getter");
  return earned;
}