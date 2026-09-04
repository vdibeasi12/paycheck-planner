// lib/achievements.ts
// Badge catalog + pure award evaluation. The /api/achievements/check route
// gathers stats from the database and calls earnedFromStats() to decide which
// badges are earned.
//
// QA fix (Sep 4 2026, Vince): the last four badges (halfway_there, on_a_roll,
// streak_master, autopilot_on) shipped as permanent "coming soon"
// placeholders -- trackable: false forever, with no signal wired up to ever
// earn them. All four now have a real signal behind them (debt
// balance/original_balance for halfway_there; profiles.current_streak /
// longest_streak, bumped once per active day, for the streak badges;
// plaid_items.status for autopilot_on) and are trackable like every other
// badge. `accent` is a per-badge color used by BadgeCard/AchievementsStrip so
// the whole set doesn't read as a wall of identical emerald circles.

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
  accent: string; // hex color, shared across BadgeCard + AchievementsStrip
};

export const BADGES: Badge[] = [
  { key: "first_dollar", title: "First Dollar", description: "Added your first income source.", icon: "DollarSign", trackable: true, accent: "#10b981" },
  { key: "debt_tracker", title: "Debt Tracker", description: "Logged your first debt.", icon: "ListChecks", trackable: true, accent: "#38bdf8" },
  { key: "bill_organizer", title: "Bill Organizer", description: "Added your first bill.", icon: "Receipt", trackable: true, accent: "#f59e0b" },
  { key: "all_set", title: "All Set", description: "Completed income, debts, and bills setup.", icon: "CheckCircle2", trackable: true, accent: "#a855f7" },
  { key: "first_month_budgeted", title: "First Month Budgeted", description: "Income and bills are both in place.", icon: "CalendarCheck", trackable: true, accent: "#22d3ee" },
  { key: "debt_slayer", title: "Debt Slayer", description: "Knocked a debt down to zero.", icon: "Swords", trackable: true, accent: "#ef4444" },
  { key: "debt_free", title: "Debt Free", description: "Cleared every debt you tracked.", icon: "PartyPopper", trackable: true, accent: "#ec4899" },
  { key: "goal_getter", title: "Goal Getter", description: "Set your first savings goal.", icon: "Target", trackable: true, accent: "#6366f1" },
  { key: "halfway_there", title: "Halfway There", description: "Paid down 50 percent of a debt.", icon: "TrendingDown", trackable: true, accent: "#f97316" },
  { key: "on_a_roll", title: "On a Roll", description: "Seven day activity streak.", icon: "Flame", trackable: true, accent: "#f43f5e" },
  { key: "streak_master", title: "Streak Master", description: "Thirty day activity streak.", icon: "Award", trackable: true, accent: "#eab308" },
  { key: "autopilot_on", title: "Autopilot On", description: "Connected a bank account with Plaid.", icon: "Plane", trackable: true, accent: "#14b8a6" },
];

export type Stats = {
  incomeCount: number;
  debtsCount: number;
  billsCount: number;
  goalsCount: number;
  anyDebtCleared: boolean;
  allDebtsCleared: boolean;
  // Paid at least 50% off the original balance of any tracked debt --
  // includes a debt paid all the way to zero (100% is still >= 50%).
  debtHalfwayPaid: boolean;
  // Longest activity streak ever reached (profiles.longest_streak), not the
  // current one -- a streak badge earned once should stay earned even after
  // the current streak later resets to 0.
  longestStreak: number;
  // At least one Plaid-linked bank connection that's still active.
  plaidConnected: boolean;
};

const STREAK_ON_A_ROLL_DAYS = 7;
const STREAK_MASTER_DAYS = 30;

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
  if (s.debtHalfwayPaid) earned.push("halfway_there");
  if (s.longestStreak >= STREAK_ON_A_ROLL_DAYS) earned.push("on_a_roll");
  if (s.longestStreak >= STREAK_MASTER_DAYS) earned.push("streak_master");
  if (s.plaidConnected) earned.push("autopilot_on");
  return earned;
}
