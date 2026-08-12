export type MoneyScoreCategory =
  | "budgeting"
  | "savings"
  | "debt"
  | "emergencyFund"
  | "spending"
  | "bills"
  | "goals";

export interface MoneyScoreOption {
  label: string;
  points: number;
}

export interface MoneyScoreQuestion {
  id: string;
  category: MoneyScoreCategory;
  prompt: string;
  options: MoneyScoreOption[];
}

export const CATEGORY_LABELS: Record<MoneyScoreCategory, string> = {
  budgeting: "Budgeting",
  savings: "Savings",
  debt: "Debt",
  emergencyFund: "Emergency Fund",
  spending: "Spending",
  bills: "Bills",
  goals: "Financial Goals",
};

export const MONEY_SCORE_QUESTIONS: MoneyScoreQuestion[] = [
  {
    id: "q1",
    category: "budgeting",
    prompt: "How do you manage your monthly budget?",
    options: [
      { label: "I don't have a budget", points: 0 },
      { label: "I have a rough idea but don't track it", points: 3 },
      { label: "I track spending but not against a formal budget", points: 7 },
      { label: "I follow a detailed budget every month", points: 10 },
    ],
  },
  {
    id: "q2",
    category: "budgeting",
    prompt: "How often do you review your spending against your budget?",
    options: [
      { label: "Never", points: 0 },
      { label: "Rarely, only when something feels off", points: 3 },
      { label: "Monthly", points: 7 },
      { label: "Weekly or more often", points: 10 },
    ],
  },
  {
    id: "q3",
    category: "savings",
    prompt: "What percentage of your income do you save each month?",
    options: [
      { label: "0%", points: 0 },
      { label: "1-5%", points: 3 },
      { label: "6-15%", points: 7 },
      { label: "15% or more", points: 10 },
    ],
  },
  {
    id: "q4",
    category: "debt",
    prompt: "How would you describe your debt situation?",
    options: [
      { label: "I have high-interest debt I'm not paying down", points: 0 },
      { label: "I make minimum payments only", points: 3 },
      { label: "I pay more than the minimum but don't have a clear plan", points: 7 },
      { label: "I have a clear payoff plan, or I'm debt-free", points: 10 },
    ],
  },
  {
    id: "q5",
    category: "debt",
    prompt: "What percentage of your monthly income goes toward debt payments?",
    options: [
      { label: "More than 40%", points: 0 },
      { label: "20-40%", points: 3 },
      { label: "10-20%", points: 7 },
      { label: "Less than 10%, or no debt", points: 10 },
    ],
  },
  {
    id: "q6",
    category: "emergencyFund",
    prompt: "How many months of expenses do you have saved for emergencies?",
    options: [
      { label: "None", points: 0 },
      { label: "Less than 1 month", points: 3 },
      { label: "1-3 months", points: 7 },
      { label: "3 or more months", points: 10 },
    ],
  },
  {
    id: "q7",
    category: "spending",
    prompt: "How often do you spend more than you planned to?",
    options: [
      { label: "Almost every month", points: 0 },
      { label: "Most months", points: 3 },
      { label: "Occasionally", points: 7 },
      { label: "Rarely or never", points: 10 },
    ],
  },
  {
    id: "q8",
    category: "bills",
    prompt: "Do you ever pay bills late or miss payments?",
    options: [
      { label: "Frequently", points: 0 },
      { label: "Sometimes", points: 3 },
      { label: "Rarely", points: 7 },
      { label: "Never", points: 10 },
    ],
  },
  {
    id: "q9",
    category: "goals",
    prompt: "Do you have specific financial goals with target dates?",
    options: [
      { label: "No goals set", points: 0 },
      { label: "Vague goals, no timeline", points: 3 },
      { label: "Clear goals with a loose timeline", points: 7 },
      { label: "Clear goals with target dates and a plan", points: 10 },
    ],
  },
  {
    id: "q10",
    category: "goals",
    prompt: "How confident are you that you're on track to reach your financial goals?",
    options: [
      { label: "Not confident at all", points: 0 },
      { label: "Somewhat unsure", points: 3 },
      { label: "Fairly confident", points: 7 },
      { label: "Very confident", points: 10 },
    ],
  },
];

export interface MoneyScoreCategoryResult {
  earned: number;
  max: number;
  percent: number;
}

export interface MoneyScoreCalculation {
  score: number;
  categoryScores: Record<MoneyScoreCategory, MoneyScoreCategoryResult>;
}

export function calculateMoneyScore(
  answers: Record<string, number>
): MoneyScoreCalculation {
  const totals: Record<string, { earned: number; max: number }> = {};

  for (const question of MONEY_SCORE_QUESTIONS) {
    const optionIndex = answers[question.id];
    const option = question.options[optionIndex];
    const earned = option ? option.points : 0;
    const max = Math.max(...question.options.map((o) => o.points));

    if (!totals[question.category]) {
      totals[question.category] = { earned: 0, max: 0 };
    }
    totals[question.category].earned += earned;
    totals[question.category].max += max;
  }

  const categoryScores = Object.fromEntries(
    Object.entries(totals).map(([category, { earned, max }]) => [
      category,
      { earned, max, percent: max > 0 ? Math.round((earned / max) * 100) : 0 },
    ])
  ) as Record<MoneyScoreCategory, MoneyScoreCategoryResult>;

  const totalEarned = Object.values(totals).reduce((sum, t) => sum + t.earned, 0);
  const totalMax = Object.values(totals).reduce((sum, t) => sum + t.max, 0);
  const score = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  return { score, categoryScores };
}

export interface ScoreBand {
  key: "excellent" | "good" | "needsImprovement" | "atRisk";
  label: string;
  color: string;
}

export function getScoreBand(score: number): ScoreBand {
  if (score >= 80) {
    return { key: "excellent", label: "Excellent", color: "#059669" };
  }
  if (score >= 60) {
    return { key: "good", label: "Good", color: "#10b981" };
  }
  if (score >= 40) {
    return { key: "needsImprovement", label: "Needs Improvement", color: "#f59e0b" };
  }
  return { key: "atRisk", label: "At Risk", color: "#dc2626" };
}

export function generateShareSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}