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
    slug: "budgeting-biweekly-paycheck-monthly-bills",
    title: "How to Budget on a Biweekly Paycheck When All Your Bills Are Monthly",
    category: "Paychecks",
    excerpt:
      "Getting paid every two weeks doesn't split evenly into monthly bills -- here's how to build a budget that actually matches your pay schedule.",
    publishedAt: "2026-09-21",
    content: `Roughly 1 in 3 working Americans gets paid biweekly. Almost every bill they owe -- rent, utilities, insurance, subscriptions -- is due monthly. That mismatch is the actual source of a lot of "I don't know where my money went" budgeting confusion, and it has nothing to do with spending too much.

## The math nobody explains

Biweekly means 26 pay periods a year, not 24. Twenty-six divided by two is 13, not 12 -- so twice a year, you get a paycheck that a monthly budget doesn't have a "slot" for. Most months you get two paychecks; two months a year you get three.

If you build your budget assuming every month looks like a normal two-paycheck month, those two three-paycheck months feel like a windfall. If you build your budget assuming every month looks like a three-paycheck month, the other ten months come up short. Both mistakes are common, and both are avoidable once you see the actual pattern.

## Build your baseline off the low month, not the average

The fix: budget your fixed monthly bills (rent, insurance, subscriptions, minimum debt payments) against your **two-paycheck months**, not an average of all 26 checks. That's the number that has to work every single month, because it's the floor.

**Example:** you're paid $1,600 every other Friday.

- Two-paycheck month: $3,200 -- this is your real monthly floor
- Three-paycheck month: $4,800 -- this happens twice a year

Build your entire fixed-bills budget to fit inside $3,200. Whatever's left after bills and normal spending in a two-paycheck month is genuinely your discretionary/savings money. Nothing about your baseline budget should assume the extra $1,600 shows up.

## What to actually do with the "extra" paycheck

When a three-paycheck month arrives, that whole third check is money your baseline budget doesn't need for bills -- which makes it one of the highest-leverage windfalls you'll get all year, because it's completely predictable. Common uses, in rough order of priority:

1. **Top off or start an emergency fund** if you don't have one yet.
2. **Extra principal payment** on whichever debt you're targeting (avalanche or snowball).
3. **Pre-fund next month's known expense** -- an annual insurance premium, a holiday season, a car registration.

The mistake to avoid is treating it like normal spending money just because it landed in the account like every other paycheck does.

## Find your own three-paycheck months

They're not the same for everyone -- it depends on which Friday (or other day) your pay cycle lands on. Look at your last 12-14 pay dates and count forward; the months with three will repeat every year unless your pay schedule changes.

Paycheck Planner maps your actual pay dates against your bills automatically, so you can see which months are two-paycheck and which are three-paycheck months before they arrive -- not after you've already spent the extra check.`,
  },
  {
    slug: "emergency-fund-how-much",
    title: "How Big Should Your Emergency Fund Actually Be?",
    category: "Saving",
    excerpt:
      "\"3 to 6 months of expenses\" is the standard advice -- but the right number depends on your situation more than that range suggests.",
    publishedAt: "2026-10-05",
    content: `"Save 3 to 6 months of expenses" is the most common piece of financial advice there is, and it's a reasonable starting range. But treating it as a fixed rule ignores that the right number is genuinely different depending on your situation -- and chasing the wrong number can actually work against you.

## Where "3 to 6 months" comes from

The idea is simple: if you lost your income today, how many months could you cover your essential expenses (not your whole lifestyle -- rent, groceries, utilities, insurance, minimum debt payments) before you're in real trouble? Three to six months is roughly how long an average job search takes for a lot of people, so it became the standard benchmark.

## Why the range is so wide

**Lean toward 3 months if:**
- You have dual income in your household (a partner's income is a backstop)
- Your job/industry has low layoff risk or you have in-demand skills
- You don't have dependents relying solely on your income

**Lean toward 6+ months if:**
- You're the sole income for your household
- You're self-employed, commission-based, or in a volatile industry
- You have dependents (kids, an aging parent) whose expenses don't pause if your income does
- Your job search would realistically take longer than average (specialized field, relocating required, etc.)

There's no penalty for landing between these -- 4 or 5 months is a completely reasonable target for a lot of people.

## The tension with debt payoff

Here's the part most advice skips: if you're carrying high-interest debt, is it smarter to fully fund 6 months of expenses first, or attack the debt first?

A common middle ground that works well in practice:

1. **Starter emergency fund: $1,000.** Enough to cover a real surprise (car repair, medical bill) without reaching for a credit card.
2. **Attack high-interest debt** (anything above roughly 7-8%) aggressively while the starter fund sits untouched.
3. **Build the full 3-6 month fund** once high-interest debt is gone.

The logic: a $1,000 buffer stops most emergencies from becoming new debt, and the interest you're paying on high-rate debt while "fully funding" a 6-month emergency fund first usually costs more than the peace of mind is worth. Low-interest debt (most mortgages, some student loans) doesn't carry the same urgency -- building savings alongside those is reasonable.

## A concrete example

Monthly essential expenses: $2,800.

- 3-month fund: $8,400
- 6-month fund: $16,800

If you're saving $300/month toward this after the $1,000 starter fund, that's roughly 25 months to a 3-month fund, or just over 4 years to a full 6-month fund. Seeing the real timeline -- not just the target number -- is often what makes the plan feel achievable instead of abstract.

Paycheck Planner's goals feature tracks progress toward a specific emergency fund target against your real paychecks, so "3 to 6 months" becomes an actual dollar number and date instead of a vague guideline.`,
  },
  {
    slug: "what-does-financial-freedom-cost",
    title: "What Does \"Financial Freedom\" Actually Cost? A Realistic Number, Not $1 Million",
    category: "Financial Freedom",
    excerpt:
      "The flat $1 million target gets repeated everywhere. It's not wrong for everyone -- but it's not right for most people either. Here's the actual math.",
    publishedAt: "2026-10-19",
    content: `"You need a million dollars to retire" gets repeated so often it's treated as a fact. It's not one -- it's a coincidence that works for some people and is way off for most others, because the real number depends entirely on how much you actually spend, not a round number that sounds big.

## The rule that actually matters: 25x

The commonly used shorthand (often called the "4% rule," from a 1994 study on safe withdrawal rates) is this: you need roughly **25 times your annual expenses** invested to sustain withdrawals indefinitely, historically speaking. Not 25x your income -- 25x what you actually spend in a year.

That distinction matters enormously, because two people earning the same income can have wildly different expenses.

## Running the actual numbers

- Annual expenses of **$40,000/year** → target is **$1,000,000**
- Annual expenses of **$60,000/year** → target is **$1,500,000**
- Annual expenses of **$80,000/year** → target is **$2,000,000**
- Annual expenses of **$30,000/year** → target is **$750,000**

The person spending $40k/year does land close to the famous $1 million -- that's likely where the popular number came from. But someone with lower expenses needs meaningfully less, and someone with higher expenses needs meaningfully more. The flat number was never really the point; the ratio is.

## Debt payoff moves this number twice, not once

This is the part that rarely gets mentioned: eliminating debt doesn't just free up cash flow today -- it lowers your required "financial freedom" number too, because it lowers your future annual expenses.

**Example:** you're carrying $400/month in debt payments ($4,800/year) as part of your current expenses.

- Pay it off, and your annual expenses used in the 25x calculation drop by $4,800/year
- That alone lowers your financial freedom target by **$120,000** ($4,800 × 25)

Debt payoff is functionally a double win toward this goal: money that used to go to a creditor can now go toward investing, *and* the target you're investing toward gets smaller at the same time.

## This isn't just a retirement number

"Financial freedom" doesn't have to mean full retirement. The same 25x math applies to smaller, more flexible goals -- covering your expenses with investment income so a job becomes optional rather than mandatory, being able to take a lower-paying but more fulfilling role, or simply not being one missed paycheck away from a crisis.

## Where to actually start

1. Get a real number for your current annual essential expenses -- not income, expenses.
2. Multiply by 25 for a full-freedom target, or by a smaller multiple (like 10-15x) for a partial-freedom cushion.
3. Attack high-interest debt first -- it lowers the target and frees up the cash to invest toward it, simultaneously.

Paycheck Planner tracks your real spending and debt payoff progress together, so you can see both halves of this equation moving at once instead of guessing at a number that was never really about you in the first place.`,
  },
  {
    slug: "credit-utilization-ratio-explained",
    title: "Credit Utilization Ratio, Explained: Why 30% Is a Myth",
    category: "Credit",
    excerpt:
      "\"Keep utilization under 30%\" is repeated everywhere -- but it's not the target that actually gets you the best credit score.",
    publishedAt: "2026-11-02",
    content: `Credit utilization -- how much of your available credit you're actually using -- is one of the biggest factors in your credit score, second only to payment history. The "keep it under 30%" advice is repeated so often it's treated as the target. It isn't. It's closer to the *danger line*.

## What utilization actually is

Utilization = your credit card balances ÷ your total credit limits, expressed as a percentage.

**Example:** you have two cards with a combined $10,000 limit. Your combined balance is $2,500. Your utilization is 25%.

There are two versions of this number that both matter:

- **Overall utilization** -- all your balances against all your limits combined.
- **Per-card utilization** -- each individual card's balance against its own limit.

Scoring models look at both. A single maxed-out card can hurt your score even if your overall utilization looks fine, because per-card utilization is checked separately.

## Why 30% is the wrong target

30% is roughly the point where utilization starts noticeably hurting your score -- it's a ceiling to stay under, not a target to aim for. The people with the highest credit scores are typically sitting well below that, commonly in the **1-10% range**. Some of the very best scores belong to people using single-digit percentages, not people bumping right up against 30%.

Rough guide (real impact varies by scoring model and individual credit history):

- **Under 10%:** best range for score impact
- **10-30%:** fine, but not optimal
- **30-50%:** starts meaningfully dragging the score down
- **50%+:** significant negative impact

## The timing trick almost nobody knows

Utilization is typically calculated from your **statement closing date** balance -- not your due date, and not "whatever it is right now." You can pay your card off in full every month (avoiding all interest) and still show high utilization, if your statement happened to close right after a big purchase.

**The fix:** pay down your balance *before* the statement closing date, not just before the due date. Most issuers show this date in your account, often labeled separately from the payment due date. Paying early relative to that date is what actually lowers the utilization number that gets reported.

## A real example

$8,000 total limit across your cards, $2,000 current balance = 25% utilization.

Paying down to $500 before your statement closes drops that to about 6% -- a meaningful jump into the best-scoring range, achievable with a single well-timed payment, no new debt payoff required.

## Where debt payoff and utilization overlap

Paying down credit card balances helps in two ways at once: it reduces the interest you're paying (see the debt avalanche/snowball math), and it lowers utilization, which can improve your score -- which in turn can qualify you for better rates on future credit. It's one of the few places in personal finance where a single action compounds in two directions simultaneously.

Paycheck Planner's debt tools show your real balances against your real limits, so you can see your utilization moving alongside your actual payoff progress.`,
  },
  {
    slug: "debt-consolidation-when-it-works",
    title: "Debt Consolidation: When It Actually Saves You Money (and When It Doesn't)",
    category: "Debt",
    excerpt:
      "Consolidation can genuinely help -- or quietly cost you more while feeling like progress. Here's how to tell which one you're looking at.",
    publishedAt: "2026-11-16",
    content: `Debt consolidation gets pitched as a clean fix: combine several debts into one, simplify your life, maybe lower your rate. Sometimes that's exactly what happens. Other times it extends your timeline, adds fees, and quietly costs more overall while feeling like progress because there's only one payment to think about now.

## What consolidation actually is

Most commonly, one of two things:

- **A personal loan** used to pay off multiple credit cards, leaving you with one fixed-rate, fixed-term loan instead of several revolving balances.
- **A balance transfer** to a card offering a 0% (or low) introductory APR, moving existing balances there to pause interest temporarily.

Both replace "several debts" with "one debt." That's the whole appeal. Whether it's actually a good deal depends entirely on the math underneath it.

## When it genuinely helps

**1. Your blended interest rate drops meaningfully.** If your average rate across existing debts is 24% and a consolidation loan offers 12%, that's a real, direct savings -- assuming the term doesn't stretch out so far that the lower rate gets erased (see below).

**2. You have multiple high-rate cards and good enough credit to qualify for a much lower personal loan rate.** The gap between credit card APRs (often 20%+) and personal loan APRs (often single digits to mid-teens for good credit) can be large enough to matter a lot.

**3. A 0% intro balance transfer, paid off before the promo period ends.** If you can realistically clear the balance within the intro window (commonly 12-21 months), this can mean paying close to zero interest during that stretch -- a real, calculable win, as long as the transfer fee (commonly 3-5% of the balance moved) is smaller than the interest you'd have paid otherwise.

## When it doesn't help

**1. The term gets longer, and total interest goes up despite a lower rate.** A lower rate stretched over a much longer term can cost more in total interest than a higher rate paid off faster. Always compare total interest paid, not just the monthly payment or the headline rate.

**2. You don't change the spending pattern that created the debt.** This is the most common failure mode: consolidate the cards, feel like a fresh start, then run the now-empty cards back up -- ending with the consolidation loan *and* new card debt. Consolidation doesn't fix the underlying cash flow gap; it just resets the clock once.

**3. The balance transfer fee outweighs the savings, or the balance isn't paid off before the promo rate expires.** A 5% transfer fee on $6,000 is $300 upfront. If the promo period ends before the balance is clear, the rate can jump to a standard (often high) APR on whatever's left.

## A real comparison

$9,000 in credit card debt at a blended 23% APR, paying $300/month:

- **No consolidation:** roughly 3.5 years, about $3,200 in total interest
- **Consolidated into a 5-year personal loan at 13%:** lower monthly payment, but roughly $3,300 in total interest over the longer term -- essentially a wash, despite the much lower rate, because the term nearly doubled
- **Consolidated into a 3-year personal loan at 13%:** roughly $1,900 in total interest -- a real, meaningful improvement, because the rate dropped *and* the term didn't stretch out

The lower rate only wins if the term doesn't quietly cancel it out. That's the one number worth checking before signing anything.

## The one question that actually matters

Before consolidating anything: "Will my total interest paid, start to finish, actually go down -- not just my monthly payment?" If yes, it's likely a real win. If you're not sure, that's the calculation to run before deciding.

Paycheck Planner runs your existing payoff timeline against a proposed consolidation side by side, so you can see the real total-interest comparison instead of just the monthly payment difference.`,
  },
  {
    slug: "zero-based-budgeting-explained",
    title: "Zero-Based Budgeting Explained: Give Every Dollar a Job",
    category: "Budgeting",
    excerpt:
      "Unlike percentage-based rules like 50/30/20, zero-based budgeting assigns every single dollar a purpose before the month starts. Here's how it actually works.",
    publishedAt: "2026-11-30",
    content: `Zero-based budgeting works differently from percentage-based frameworks like the 50/30/20 rule. Instead of splitting income into broad buckets, every single dollar of income gets assigned a specific job -- rent, groceries, debt payoff, savings, fun money -- until income minus all assignments equals zero. Not "spend less than zero." Exactly zero, on purpose.

## The core idea

"Zero" doesn't mean you have no money left over with nothing to show for it -- it means every dollar has already been *assigned* somewhere, including savings and debt payoff, before the month starts. If income minus assigned categories equals zero, every dollar has a job. Money "left over" and unassigned isn't a bonus -- it's a sign the budget isn't finished yet.

## How it's different from 50/30/20

50/30/20 says: roughly 50% to needs, 30% to wants, 20% to savings -- broad percentage targets, decided once and reused.

Zero-based budgeting says: list every category you actually spend in, assign a specific dollar amount to each one based on your real bills and real goals, and rebuild the list every month since real expenses change month to month (a car registration in one month, a holiday season in another).

Neither is "more correct" -- percentage rules are faster to set up and maintain; zero-based budgets take more upfront effort but give more precise control, especially useful when you're actively working toward a specific goal like debt payoff or a big purchase.

## Building one, step by step

**1. Start with your real monthly take-home income.** Not gross pay -- what actually lands in your account.

**2. List every expense category, not just the big ones.** Rent, utilities, groceries, minimum debt payments, subscriptions, gas, the $40/month you spend on coffee -- if it's a real recurring expense, it gets a line.

**3. Assign every dollar until income minus categories equals zero.** This includes savings and extra debt payments as their own line items, not an afterthought of whatever's left.

**4. Track actual spending against each category through the month.** This is where zero-based budgeting earns its reputation for precision -- overspending in one category has to come from underspending in another, which makes tradeoffs visible in real time instead of only at month's end.

## A real example

$3,400 monthly take-home:

- Rent: $1,200
- Utilities: $180
- Groceries: $450
- Car payment + insurance: $380
- Minimum debt payments: $150
- Extra debt payoff: $400
- Subscriptions: $45
- Dining out: $200
- Emergency fund: $250
- Miscellaneous/fun money: $145

Total: $3,400. Zero left unassigned -- and critically, the $400 extra debt payment and $250 emergency fund contribution are treated as required line items, not optional leftovers that only happen if nothing else came up.

## Why this matters most during debt payoff

The biggest advantage of zero-based budgeting during an active debt payoff push: extra debt payments get a guaranteed line item every single month instead of competing with discretionary spending for whatever happens to be left. That's the difference between "I'll throw extra at debt if there's anything left" (which often means nothing extra happens) and a specific dollar amount decided in advance.

Paycheck Planner lets you build this category-by-category against your real paychecks, so every dollar -- including what goes toward debt -- has a job before the month gets away from you.`,
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

**50% -- Needs.** Rent or mortgage, utilities, groceries, minimum debt payments, insurance, transportation to work. Not "things you want to keep" -- things you genuinely cannot skip without a real consequence this month.

**30% -- Wants.** Dining out, subscriptions, hobbies, upgraded versions of things you already have a cheaper option for (the difference between store-brand and name-brand groceries lives here, not in "needs").

**20% -- Savings and extra debt payments.** Emergency fund contributions, retirement savings, and -- importantly -- anything beyond the *minimum* payment on your debts. Minimum debt payments are a "need"; extra principal payments are what this 20% is for.

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
