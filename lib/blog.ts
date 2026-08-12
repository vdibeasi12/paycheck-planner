// lib/blog.ts
// Typed, version-controlled blog content -- no CMS needed. Add a new post by
// appending to POSTS below; the listing page, individual post pages, and the
// sitemap all pick it up automatically.

export type BlogCategory =
  | "Paychecks"
  | "Budgeting"
  | "Debt"
  | "Saving"
  | "Credit"
  | "Financial Freedom"

export type BlogPost = {
  slug: string
  title: string
  category: BlogCategory
  excerpt: string
  // ISO date string (YYYY-MM-DD). Used for display and for sitemap lastmod.
  // Posts with a future date are queued -- they stay out of the listing,
  // sitemap, and their own page 404s -- until that date arrives. No redeploy
  // needed when a queued post goes live; the date check runs per request.
  publishedAt: string
  // Markdown. Rendered to HTML at request time via `marked`.
  content: string
}

export const POSTS: BlogPost[] = [
  {
    slug: "debt-snowball-vs-debt-avalanche",
    title: "Debt Snowball vs. Debt Avalanche: Which Pays Off Debt Faster?",
    category: "Debt",
    excerpt:
      "Two proven strategies, two very different psychological approaches. Here's exactly how each one works, with real numbers.",
    publishedAt: "2026-08-10",
    content: `Paying off multiple debts at once raises an obvious question: which one do you attack first? Two strategies dominate the conversation, and they optimize for genuinely different things.

## The Debt Avalanche

List every debt by **interest rate**, highest to lowest. Pay minimums on everything except the highest-rate debt, and throw every extra dollar at that one until it's gone. Then move to the next-highest rate.

This is the mathematically optimal approach -- it minimizes the total interest you pay over the life of every debt, full stop. If you owe $2,800 at 25.99% and $14,000 at 8.25%, the avalanche has you crushing the 25.99% balance first, even though it's the smaller number.

## The Debt Snowball

List every debt by **balance**, smallest to largest, ignoring interest rate entirely. Pay minimums on everything except the smallest balance, and throw every extra dollar at that one until it's gone.

This is not the mathematically optimal approach. It will, in almost every case, cost you more in total interest than the avalanche. But it has one major advantage: you eliminate an entire debt, completely, faster. That first "paid in full" moment is a real psychological win, and for a lot of people, that early momentum is the difference between sticking with a payoff plan and abandoning it three months in.

## So which one is actually faster?

"Faster" depends on what you're measuring:

- **Total time debt-free:** nearly identical between the two methods in most cases -- the order you pay things off in doesn't change how much total money is going toward debt each month.
- **Total interest paid:** avalanche wins, sometimes by a meaningful margin if you're carrying a high-rate balance like a credit card alongside lower-rate debt like a car loan or student loan.
- **Time to your first debt being fully gone:** snowball wins, often by months, since it targets your smallest balance regardless of rate.

## There's no wrong answer here

If you're confident you'll stay disciplined either way, the avalanche saves you real money. If you've started and stopped debt payoff before, the snowball's early wins might be what actually gets you to the finish line. Both are dramatically better than no plan at all.

Paycheck Planner runs both strategies side by side against your actual debts, so you can see your real payoff date and real total interest under each approach before you commit to one.`,
  },
  {
    slug: "how-long-to-pay-off-credit-card-debt",
    title: "How Long Will It Take to Pay Off My Credit Card Debt?",
    category: "Credit",
    excerpt:
      "The honest answer depends on three numbers -- your balance, your rate, and your monthly payment. Here's exactly how they interact.",
    publishedAt: "2026-08-24",
    content: `Three numbers decide how long you'll be carrying a credit card balance: how much you owe, your interest rate, and how much you pay each month. Change any one of them and the timeline changes -- often dramatically.

## Why minimum payments are a trap

Credit card minimum payments are usually calculated as a small percentage of your balance (often 1-3%), which means as your balance drops, your minimum payment drops too. That sounds convenient. It's actually what keeps you in debt for years.

Take a $5,000 balance at 22% APR with a minimum payment formula common among major issuers (roughly 1% of the balance plus that month's interest). Paying only the minimum every month, it takes **about 19 years** to pay off, and you'll pay **over $8,000 in interest** -- more than the original balance itself. The minimum payment isn't designed to get you out of debt quickly -- it's designed to keep the balance (and the interest) alive as long as possible.

## The three levers you actually control

**1. Your balance.** Obviously the starting point, but also the one thing a payoff calculator can't change for you.

**2. Your interest rate.** Sometimes you can lower this -- a balance transfer to a 0% intro APR card, a hardship program with your issuer, or simply paying off the highest-rate card first if you're juggling several (see: the debt avalanche method). Even a few points of rate reduction meaningfully shortens the timeline.

**3. Your monthly payment.** This is the lever with the most immediate impact, and it's fully in your control starting today.

## A real example

$5,000 balance, 22% APR:

- Minimum payments only (~1% of balance + interest): **about 19 years**, total interest around **$8,100**
- $150/month fixed: **~4.3 years**, total interest around **$2,800**
- $250/month fixed: **~2.2 years**, total interest around **$1,300**

The jump from "minimum" to "$150 fixed" is the single biggest change you can make -- it cuts the timeline from nearly two decades to about four years, and the total interest by roughly two-thirds.

## Where to actually start

1. Find your real interest rate and current balance (your statement has both).
2. Decide on a fixed monthly amount you can commit to -- more than the minimum, even by $50, changes the math meaningfully.
3. If you're carrying more than one card, decide whether you're going avalanche (highest rate first) or snowball (smallest balance first).

Paycheck Planner's payoff calculator does this math for you against your real balances and rates, so you can see your actual payoff date -- not a rough estimate -- before you commit to a monthly number.`,
  },
  {
    slug: "50-30-20-budget-rule-explained",
    title: "The 50/30/20 Budget Rule, Explained (With a Real Paycheck Example)",
    category: "Budgeting",
    excerpt:
      "One of the simplest budgeting frameworks that exists -- here's how the split actually works against a real paycheck.",
    publishedAt: "2026-09-07",
    content: `The 50/30/20 rule is popular because it's simple enough to do in your head: split your after-tax income into three buckets -- 50% needs, 30% wants, 20% savings and debt paydown.

## The three buckets

**50% â€” Needs.** Rent or mortgage, utilities, groceries, minimum debt payments, insurance, transportation to work. Not "things you want to keep" -- things you genuinely cannot skip without a real consequence this month.

**30% â€” Wants.** Dining out, subscriptions, hobbies, upgraded versions of things you already have a cheaper option for (the difference between store-brand and name-brand groceries lives here, not in "needs").

**20% â€” Savings and extra debt payments.** Emergency fund contributions, retirement savings, and -- importantly -- anything beyond the *minimum* payment on your debts. Minimum debt payments are a "need"; extra principal payments are what this 20% is for.

## A real paycheck example

Take a $3,200 monthly take-home paycheck:

- **Needs (50%): $1,600** -- rent, utilities, groceries, car payment, minimum debt payments, insurance
- **Wants (30%): $960** -- eating out, streaming subscriptions, hobbies, non-essential shopping
- **Savings/extra debt payoff (20%): $640** -- split between an emergency fund and extra payments on whichever debt you're targeting

That $640 is the number worth paying attention to. If you're currently paying only minimums and putting $0 extra toward debt, redirecting even half of that 20% -- $320/month -- toward your highest-rate balance can cut years off a payoff timeline (see the credit card payoff math above).

## Where this rule breaks down

It's a starting point, not a law. A few common situations where the split needs adjusting:

- **High cost-of-living areas** where rent alone eats well past 50% -- the ratios shift, and that's fine, the *categories* still matter even if the percentages don't fit perfectly.
- **Aggressive debt payoff** -- if you're intentionally attacking debt hard, it's common to shrink the "wants" bucket temporarily and push more into the 20% category.
- **Irregular income** -- freelance or commission-based paychecks make a fixed percentage split harder; budgeting off an average or your lowest realistic month works better.

## Making it actually stick

The rule only works if you know what's actually landing in each bucket, paycheck to paycheck -- not as a rough monthly guess. Paycheck Planner breaks down each paycheck as it comes in, so you can see in real numbers whether you're actually hitting your 50/30/20 split or just estimating it.`,
  },
]

export function getAllPosts(): BlogPost[] {
  const now = new Date()
  return [...POSTS]
    .filter((p) => new Date(p.publishedAt + "T00:00:00") <= now)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  // Uses the same date filter as getAllPosts, so a queued post's URL isn't
  // reachable early even if someone guesses the slug -- consistent behavior
  // everywhere instead of "hidden from the list but the page still works."
  return getAllPosts().find((p) => p.slug === slug)
}
