// lib/blog.ts
// Typed, version-controlled blog content -- no CMS needed. Add a new post by
// appending to POSTS below; the listing page, individual post pages, and the
// sitemap all pick it up automatically.

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  // ISO date string (YYYY-MM-DD). Used for display and for sitemap lastmod.
  publishedAt: string
  // Markdown. Rendered to HTML at request time via `marked`.
  content: string
}

export const POSTS: BlogPost[] = [
  {
    slug: "debt-snowball-vs-debt-avalanche",
    title: "Debt Snowball vs. Debt Avalanche: Which Pays Off Debt Faster?",
    excerpt:
      "Two proven strategies, two very different psychological approaches. Here's exactly how each one works, with real numbers.",
    publishedAt: "2026-08-10",
    content: `Paying off multiple debts at once raises an obvious question: which one do you attack first? Two strategies dominate the conversation, and they optimize for genuinely different things.

## The Debt Avalanche

List every debt by **interest rate**, highest to lowest. Pay minimums on everything except the highest-rate debt, and throw every extra dollar at that one until it's gone. Then move to the next-highest rate.

This is the mathematically optimal approach -- it minimizes the total interest you pay over the life of every debt, full stop. If you owe $4,200 at 22.99% and $12,750 at 6.5%, the avalanche has you crushing the 22.99% balance first, even though it's the smaller number.

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
]

export function getAllPosts(): BlogPost[] {
  return [...POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug)
}
