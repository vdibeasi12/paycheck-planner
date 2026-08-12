// lib/challenge-days.ts
// The 30-Day Paycheck Planner Challenge -- matches the day-by-day table in
// 30-day-challenge-content-plan.md. Each day is short by design: one task,
// one reason it matters, and an optional link to the relevant tool. This
// is the single source of truth the drip emails are generated from.

export type ChallengeDay = {
  day: number
  phase: string
  title: string
  task: string
  whyItMatters: string
  cta?: { label: string; href: string }
}

export const CHALLENGE_DAYS: ChallengeDay[] = [
  { day: 1, phase: "Foundation", title: "Know where your money goes", task: "Track every dollar you spend for the next 24 hours -- write it down as it happens, no exceptions.", whyItMatters: "You can't fix a leak you haven't found. Most people underestimate their spending by a wide margin until they actually track it." },
  { day: 2, phase: "Foundation", title: "List every bill", task: "Write down every bill you pay: name, amount, and due date.", whyItMatters: "This list is the foundation for everything else in the next 29 days." },
  { day: 3, phase: "Foundation", title: "Needs vs. wants", task: "Go through yesterday's bill list and mark each one 'need' or 'want.'", whyItMatters: "This is the first real decision point in a budget -- not to eliminate wants, but to see them clearly." },
  { day: 4, phase: "Foundation", title: "Find one unnecessary expense", task: "Find one recurring expense you don't need and cancel or reduce it today.", whyItMatters: "One cut is proof the process works. It's easier to find a second one once you've found the first." },
  { day: 5, phase: "Foundation", title: "Build your first paycheck budget", task: "Using your bill list, build a simple budget for your very next paycheck.", whyItMatters: "A budget for one paycheck is a project you can actually finish today, unlike 'budget the whole month.'", cta: { label: "Try the 50/30/20 calculator", href: "/calculators/50-30-20-budget" } },
  { day: 6, phase: "Paycheck Mechanics", title: "Map bills to paychecks", task: "Next to each bill, write which specific paycheck will cover it.", whyItMatters: "This single change is what turns a budget into something you can actually follow payday to payday." },
  { day: 7, phase: "Paycheck Mechanics", title: "Calculate your true take-home pay", task: "Find your actual take-home amount per paycheck, after taxes and deductions.", whyItMatters: "Budgeting off your salary instead of your take-home pay is one of the most common budget-breaking mistakes.", cta: { label: "Try the paycheck calculator", href: "/calculators/paycheck" } },
  { day: 8, phase: "Paycheck Mechanics", title: "Set up a tracking system", task: "Pick one place to track bills going forward -- an app, a spreadsheet, or a calendar.", whyItMatters: "A system beats memory. This is the last day you have to hold all of this in your head." },
  { day: 9, phase: "Paycheck Mechanics", title: "Automate one bill", task: "Set up autopay for one bill you currently pay manually.", whyItMatters: "Every bill on autopay is one fewer thing that can slip and turn into a late fee." },
  { day: 10, phase: "Paycheck Mechanics", title: "Check in", task: "Review the last 9 days. What's sticking? What isn't? Adjust one thing.", whyItMatters: "A plan that never gets revised isn't a real plan -- it's a guess you made on day one." },
  { day: 11, phase: "Debt", title: "List every debt", task: "Write down every debt: balance, interest rate, and minimum payment.", whyItMatters: "You can't build a payoff plan for debt you haven't fully listed out in one place." },
  { day: 12, phase: "Debt", title: "Choose your method", task: "Pick snowball (smallest balance first) or avalanche (highest interest first).", whyItMatters: "The math favors avalanche, but the method you'll actually finish beats the mathematically perfect one you abandon.", cta: { label: "Read snowball vs. avalanche", href: "/blog/debt-snowball-vs-debt-avalanche" } },
  { day: 13, phase: "Debt", title: "Calculate your debt-free date", task: "At your current payment, find out how many months until you're debt-free.", whyItMatters: "A real date turns debt from an open-ended weight into a project with an end.", cta: { label: "Try the debt payoff calculator", href: "/calculators/debt-payoff" } },
  { day: 14, phase: "Debt", title: "Find $20 extra", task: "Find $20 this month to add to your debt payment beyond the minimum.", whyItMatters: "Extra payments go straight to principal -- even a small one measurably moves your payoff date." },
  { day: 15, phase: "Debt", title: "Automate your minimums", task: "Set up autopay for at least the minimum payment on every debt.", whyItMatters: "A missed minimum payment can trigger a penalty rate -- autopay is the cheapest insurance against that." },
  { day: 16, phase: "Saving", title: "Set a savings goal", task: "Pick one specific savings goal: an amount and what it's for.", whyItMatters: "\"Save more\" isn't a goal. A number and a reason is." },
  { day: 17, phase: "Saving", title: "Separate your savings", task: "Open or designate a savings account that's separate from checking.", whyItMatters: "Money that's harder to see is money that's harder to accidentally spend." },
  { day: 18, phase: "Saving", title: "Automate a transfer", task: "Set up an automatic transfer to savings -- even $5 per paycheck counts.", whyItMatters: "Automatic saving happens before you can talk yourself out of it. That's the whole trick." },
  { day: 19, phase: "Saving", title: "Set a mini emergency fund target", task: "Set a target of $500 for a starter emergency fund, separate from other goals.", whyItMatters: "$500 covers most small emergencies that would otherwise go on a credit card.", cta: { label: "Try the savings goal calculator", href: "/calculators/savings-goal" } },
  { day: 20, phase: "Saving", title: "Check in", task: "Review the last 9 days. What's sticking? What isn't? Adjust one thing.", whyItMatters: "Same as day 10 -- a plan gets revised, not just written once and forgotten." },
  { day: 21, phase: "Trim & Automate", title: "Review your subscriptions", task: "List every subscription you pay for and decide, on purpose, to keep or cancel each one.", whyItMatters: "Subscriptions are the easiest expenses to lose track of because they never ask permission again after the first time." },
  { day: 22, phase: "Trim & Automate", title: "Meal plan for the week", task: "Plan this week's meals in advance to cut food costs.", whyItMatters: "Food is one of the few 'need' categories with real room to move without feeling like a sacrifice." },
  { day: 23, phase: "Trim & Automate", title: "Find one more expense to trim", task: "Find one more expense you can reduce or cut.", whyItMatters: "By day 23 the easy cuts are gone -- this one takes real attention, and it counts more because of that." },
  { day: 24, phase: "Trim & Automate", title: "Increase one automation", task: "Increase one automated savings transfer or debt payment, even by a small amount.", whyItMatters: "Small increases compound the same way small starts do -- this is how the plan grows without a big, unsustainable jump." },
  { day: 25, phase: "Trim & Automate", title: "Set a cooling-off rule", task: "Set a personal rule: wait 24-48 hours before any non-essential purchase over a set amount.", whyItMatters: "Most impulse purchases don't survive a day of thinking about it." },
  { day: 26, phase: "Review & Plan Forward", title: "Review this month's plan against reality", task: "Compare your paycheck budget from day 5 to what actually happened this month.", whyItMatters: "The gap between plan and reality is the most useful data you'll get all month." },
  { day: 27, phase: "Review & Plan Forward", title: "Check your buffer", task: "Check how much cushion you've built in checking beyond your bills.", whyItMatters: "A buffer is what keeps a bill landing a day early from turning into an overdraft." },
  { day: 28, phase: "Review & Plan Forward", title: "Update your bill list", task: "Update your bill list for next month -- add anything new, remove anything that ended.", whyItMatters: "A bill list is only useful if it's current. This is the maintenance step most budgets skip." },
  { day: 29, phase: "Review & Plan Forward", title: "Set next month's goals", task: "Set a specific savings goal and debt payoff target for next month.", whyItMatters: "A goal set in advance is a decision. A goal figured out mid-month is a scramble." },
  { day: 30, phase: "Review & Plan Forward", title: "Build next month's plan", task: "Put everything from the last 29 days together into a full plan for next month.", whyItMatters: "You just did by hand, over 30 days, everything Paycheck Planner keeps updated automatically.", cta: { label: "Put it on autopilot with Paycheck Planner", href: "/signup" } },
]

export function getChallengeDay(day: number): ChallengeDay | undefined {
  return CHALLENGE_DAYS.find((d) => d.day === day)
}
