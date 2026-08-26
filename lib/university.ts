// lib/university.ts
// Paycheck Planner University course catalog. Mirrors the lib/blog.ts /
// lib/challenge-days.ts pattern: a typed content array + lookup helpers,
// consumed by app/university/**/page.tsx.
//
// All 6 courses now have real lesson content (Aug 14). Courses unlock in
// order: Budgeting is always open; each following course unlocks once every
// lesson in the *previous* course has been marked complete by the signed-in
// user. isCourseFullyComplete() below is the single place that logic lives --
// app/university/page.tsx and app/university/[course]/page.tsx both call it
// against the user's completed lesson keys (from university_progress) to
// decide what to render. Category set mirrors lib/blog.ts's BlogCategory
// union on purpose, so a future post can link straight into the matching
// course.

export type UniversityLesson = {
  slug: string
  title: string
  summary: string
  content: string
}

export type UniversityCourse = {
  slug: string
  title: string
  shortTitle: string
  description: string
  seoDescription: string
  icon: string // lucide-react icon name, resolved in the UI layer
  comingSoon: boolean
  lessons: UniversityLesson[]
}

export const UNIVERSITY_COURSES: UniversityCourse[] = [
  {
    slug: "budgeting",
    title: "Budgeting",
    shortTitle: "Budgeting",
    description: "Build a paycheck-based budget that actually holds up month to month.",
    seoDescription:
      "Free course: build a paycheck-based budget that actually holds up -- needs vs. wants, mapping bills to paychecks, and adjusting when money is tight.",
    icon: "Wallet",
    comingSoon: false,
    lessons: [
      {
        slug: "why-paycheck-based-budgeting-works",
        title: "Why paycheck-based budgeting works",
        summary: "Budgeting by the month hides the real problem: which specific paycheck covers which bill.",
        content:
          "Monthly budgets look tidy on paper, but paychecks don't arrive monthly -- they arrive every week, every two weeks, or twice a month, and bills don't wait for your calendar to line up. A monthly budget can say you're \"fine\" for the month while a specific paycheck falls $200 short of what's due before the next one lands. That gap is where overdrafts, missed payments, and credit card balances actually come from.\n\nBudgeting by paycheck fixes this by asking a narrower question: does this paycheck cover what's due before the next one arrives? If a paycheck's take-home pay is $1,400 and $1,550 in bills are due before the next payday, you know that today -- not on the 30th, after it's already happened. The rest of this course builds that view step by step: sorting expenses, mapping bills to specific paychecks, and having a real plan for the paychecks that come up short.",
      },
      {
        slug: "needs-vs-wants-the-real-breakdown",
        title: "Needs vs. wants: the real breakdown",
        summary: "Sorting every expense into 'need' or 'want' is the first real decision point in a budget.",
        content:
          "Every budgeting method eventually asks you to sort spending into \"needs\" and \"wants,\" and most people get it wrong in both directions -- calling too much a \"need\" to avoid guilt, or writing off everything fun as a \"want\" to punish themselves. Neither actually helps.\n\nA better test: a need is something that keeps you housed, fed, employed, insured, and current on debt you already owe. Rent, groceries, minimum debt payments, utilities, and the gas to get to work are needs. A want is everything that improves your life without being required to maintain it -- streaming subscriptions, dining out, upgraded phone plans, a gym membership you use twice a month.\n\nThe goal isn't eliminating wants; a budget with zero wants rarely survives contact with real life. It's knowing the size of each category so you can make a deliberate trade -- not discover the trade after the money's already gone. Commonly misclassified: minimum payments (need) vs. extra debt payments (want, however important); a car payment on a car you need for work (need) vs. the upgraded trim you financed anyway (want).",
      },
      {
        slug: "building-your-first-paycheck-budget",
        title: "Building your first paycheck budget",
        summary: "A budget for one paycheck is a project you can finish today.",
        content:
          "You can build a budget for one paycheck in about fifteen minutes, and doing that once tells you more than a month of vague monthly tracking. Start with your take-home pay for that specific check -- not your salary, the number that actually lands in your account. Then list every bill due before your next payday, with amounts.\n\nSubtract bills from take-home pay. What's left is what that paycheck has for groceries, gas, and everything else until the next one arrives. If the number is negative before you've bought a single grocery, you've just found a real problem three weeks before it would have shown up as an overdraft.\n\nRun this same 15-minute exercise for your next paycheck too -- pay periods aren't identical, and a paycheck that covers everything easily can look very different from the one right after it. Use the 50/30/20 calculator to sanity-check your split between needs, wants, and savings once you have both paychecks mapped out.",
      },
      {
        slug: "mapping-bills-to-paychecks",
        title: "Mapping bills to paychecks",
        summary: "Assigning each bill to a specific paycheck is what turns a budget into something you can follow.",
        content:
          "Once you can budget a single paycheck, the next step is mapping a full month -- or, if you're paid biweekly, a full pay cycle -- so every bill has a specific paycheck assigned to pay it, not just a due date on a calendar.\n\nList every recurring bill with its due date, then go through your paychecks for the month in order and assign each bill to the paycheck that arrives before it's due, with room to spare. This is where biweekly pay gets tricky: most months have two paychecks, but two months a year have three, and that extra paycheck is either a windfall for savings or a trap if you've already mentally spent it on regular bills.\n\nWhen a bill doesn't line up cleanly -- due three days before payday, say -- you have three real options: ask the biller to move the due date (many will), pay it a cycle early once to shift it permanently, or flag that paycheck as tight every cycle and plan around it instead of being surprised by it.",
      },
      {
        slug: "adjusting-when-a-paycheck-falls-short",
        title: "Adjusting when a paycheck falls short",
        summary: "A real plan for the paychecks that don't cover everything, not just the ones that do.",
        content:
          "Every paycheck-based budget eventually runs into a paycheck that doesn't cover everything assigned to it. What separates a real plan from a stressful scramble is deciding your order of operations before that happens, not during it.\n\nA workable order: bills that protect housing, utilities, and employment come first, no exceptions. Minimum debt payments come next -- skipping them costs more later in fees and credit damage than almost any short-term fix. After that, look for spending you can delay or cut for one cycle: subscriptions, dining out, discretionary purchases. Only after those are trimmed should you consider moving money between paychecks or, as a last resort, a small buffer fund.\n\nThat buffer is worth building deliberately: even $300-$500 set aside specifically for tight paychecks turns \"which bill do I skip\" into \"I cover it from the buffer and refill it next paycheck.\" It's a smaller, faster version of an emergency fund, aimed at a problem that repeats far more often than a true emergency does. Reach for it instead of a credit card whenever you can -- a buffer you refill costs you nothing; a card balance costs interest.",
      },
    ],
  },
  {
    slug: "paychecks",
    title: "Paychecks",
    shortTitle: "Paychecks",
    description: "Understand your actual take-home pay and put it on autopilot.",
    seoDescription:
      "Free course on understanding your paycheck -- take-home pay, deductions, and automating bills and savings around when you actually get paid.",
    icon: "Banknote",
    comingSoon: false,
    lessons: [
      {
        slug: "what-actually-comes-out-of-your-paycheck",
        title: "What actually comes out of your paycheck",
        summary: "The gap between what you're paid and what you take home is bigger than most people expect -- and every piece of it is predictable.",
        content:
          "Your paycheck goes through several deductions before it reaches your bank account, and most of them are the same every pay period once your situation is set. Federal and state income tax withholding is the largest for most people, based on the W-4 you filed and your income level. FICA taxes -- Social Security and Medicare -- come out at a fixed 7.65% combined, with no way to opt out. Then come your elected deductions: health insurance premiums, 401(k) or retirement contributions, HSA/FSA contributions, and anything else you signed up for during open enrollment.\n\nNone of this is random, which means it's also predictable -- your take-home pay this period should be very close to last period's, minus any changes you made. If it swings unexpectedly, that's worth checking (a benefits change, a tax withholding adjustment, a raise that didn't show up the way you expected). The next lesson covers the one number that actually matters for budgeting: your net, not your gross.",
      },
      {
        slug: "gross-pay-vs-net-pay-the-number-that-matters",
        title: "Gross pay vs. net pay: the number that actually matters",
        summary: "Budgeting off your salary instead of your take-home pay is one of the most common reasons a budget doesn't hold up.",
        content:
          "When people say \"I make $55,000 a year,\" that's gross pay -- what your employer pays before any deductions. It's the number on offer letters and the number most people budget around, and it's also the number that leads to budgets that don't work, because it's not the money that ever touches your bank account.\n\nNet pay -- take-home pay -- is what's left after taxes, insurance, and retirement contributions. For most people, net pay lands somewhere between 70% and 85% of gross, depending on tax bracket, state, and how much they're contributing to benefits and retirement. A $55,000 salary might mean roughly $3,300-$3,600 a month in your account, not the $4,583 that gross pay divided by 12 would suggest.\n\nEvery budget in this course, and in Paycheck Planner itself, works off net pay for exactly this reason. If you've ever built a budget that looked fine on paper and never matched your bank account, this is very often why.",
      },
      {
        slug: "reading-your-pay-stub-without-getting-lost",
        title: "Reading your pay stub without getting lost",
        summary: "A pay stub looks like a wall of numbers, but it only has four sections that matter.",
        content:
          "Pay stubs vary by employer, but almost all of them break into the same four sections once you know what to look for. Earnings shows your gross pay for this period, plus year-to-date gross -- useful for checking you're being paid correctly and for tax planning. Taxes shows federal, state, and FICA withholding for this period and year-to-date. Deductions shows your elected benefits -- health insurance, retirement contributions, HSA/FSA -- also period and year-to-date. Net pay is what's left, and it should match what actually deposits into your account.\n\nThe single most useful habit: check your net pay against your bank deposit every pay period, at least for the first few months at a new job or after any benefits change. They should match exactly. If they don't, that's a payroll error working against you, and those don't fix themselves -- they need to be reported.\n\nYear-to-date figures are also worth glancing at around tax time and whenever you're deciding whether to adjust your withholding or retirement contribution percentage.",
      },
      {
        slug: "automating-bills-and-savings-around-your-pay-schedule",
        title: "Automating bills and savings around your pay schedule",
        summary: "The paycheck-mapping work from the Budgeting course turns directly into an automation plan.",
        content:
          "Once you know which paycheck covers which bills -- from the Budgeting course -- you can automate almost all of it, which removes the biggest source of budget failure: forgetting or a late manual transfer. Set bill due dates and autopay, where offered, to land a day or two after the paycheck that's meant to cover them, never before.\n\nFor savings, automate a transfer for the same day your paycheck lands, before you've had a chance to spend it -- \"pay yourself first\" isn't a cliché here, it's the entire mechanism. Even a small fixed amount, moved automatically every payday, builds faster than a \"whatever's left over\" approach that usually leaves nothing.\n\nIf your pay date shifts around holidays or weekends, check that your automations shift with it -- a bill scheduled for the 1st that lands on a Saturday and a paycheck that arrives the following Monday is exactly the kind of one-day gap that causes an overdraft. Paycheck Planner's calendar view is built to catch exactly this before it happens.",
      },
      {
        slug: "what-to-do-when-your-pay-changes",
        title: "What to do when your pay changes",
        summary: "A raise, a new job, or a switch to hourly work all mean the same thing: your whole paycheck-based budget needs rebuilding, not just adjusting.",
        content:
          "A pay change -- a raise, a job switch, a move from salary to hourly or the reverse -- feels like good news or bad news, but either way it means your existing paycheck budget is now based on a number that no longer applies. The fix isn't to guess; it's to redo the 15-minute single-paycheck exercise from the Budgeting course with your actual new net pay, as soon as you have one real pay stub to confirm it.\n\nFor a raise, decide deliberately where the extra money goes before it quietly disappears into slightly-higher everyday spending -- extra debt payments, savings, or an intentional lifestyle increase are all fine choices, but they should be choices. For hourly or variable pay, budget off your lowest realistic paycheck, not your average one, and treat anything above that as a bonus for savings or debt payoff rather than baseline spending.\n\nUpdate your bill-to-paycheck mapping and your automated transfers to match. An old automation still moving the old amount is one of the most common ways a pay increase or decrease goes unnoticed until it's already caused a problem.",
      },
    ],
  },
  {
    slug: "debt",
    title: "Debt Payoff",
    shortTitle: "Debt",
    description: "Pay off debt with a real plan, not just minimum payments.",
    seoDescription:
      "Free course on paying off debt -- snowball vs. avalanche, calculating your debt-free date, and finding extra money to pay down principal faster.",
    icon: "TrendingDown",
    comingSoon: false,
    lessons: [
      {
        slug: "why-minimum-payments-keep-you-in-debt-longer",
        title: "Why minimum payments keep you in debt longer than you think",
        summary: "Minimum payments are calculated to keep you paying for a long time -- that's not an accident.",
        content:
          "Credit card minimum payments are typically set at 1-3% of your balance, which sounds small and manageable -- and that's the point. On a $5,000 balance at 22% APR with a 2% minimum payment, paying only the minimum every month takes over 20 years to pay off and costs more in interest than the original balance itself.\n\nThe math works against you because as you pay down the balance, the minimum payment shrinks too, which stretches the payoff even further. It's not a fixed amount decreasing steadily -- it's a shrinking target that interest keeps pace with.\n\nThis isn't a case for panic; it's a case for intention. Even a fixed extra amount every month -- $50, $100, whatever you can commit to consistently -- breaks that cycle, because it doesn't shrink as the balance does. The next two lessons cover how to decide which debt to target first, and how to see your actual payoff date instead of an open-ended \"eventually.\"",
      },
      {
        slug: "debt-snowball-vs-debt-avalanche",
        title: "Debt snowball vs. debt avalanche: which one fits you",
        summary: "Both strategies work. The one that gets finished is the one that fits how you actually stay motivated.",
        content:
          "Once you're paying more than the minimum, the next decision is which debt gets the extra money first. Debt avalanche targets the highest interest rate debt first, while paying minimums on everything else -- mathematically, this saves the most money and time overall, since less of your payment goes to interest along the way.\n\nDebt snowball targets the smallest balance first, regardless of interest rate. It saves less money in interest, but the visible win of paying off an entire debt sooner is a real motivator for a lot of people, and a debt payoff plan that gets abandoned three months in saves nothing.\n\nThere's no wrong answer here -- pick avalanche if the math motivates you and you can stay consistent regardless of visible wins, pick snowball if quick wins are what keep you going. Paycheck Planner's Payoff Plan page lets you compare both side by side with your actual debts, including the real payoff date and total interest for each, so you're choosing based on your numbers, not a guess.",
      },
      {
        slug: "calculating-your-real-debt-free-date",
        title: "Calculating your real debt-free date",
        summary: "\"I'll be debt-free eventually\" isn't a plan. A specific date, recalculated as you go, is.",
        content:
          "A vague goal like \"pay off my credit cards\" is easy to deprioritize the first time money gets tight, because there's no specific date being protected. A calculated debt-free date changes that -- it's a real deadline, and it moves visibly when you add extra payments or when you skip one.\n\nYour real payoff date depends on three things for each debt: the current balance, the interest rate, and the payment amount, including any extra beyond the minimum. Change any one of those and the date shifts. This is genuinely hard to estimate by hand across multiple debts with different rates, which is exactly why Paycheck Planner's Payoff Plan runs the real month-by-month math for you -- balances, interest accrual, and payoff order, based on either avalanche or snowball.\n\nOnce you have a real date, treat it the way you'd treat any deadline that matters: check it periodically, notice when it moves in the wrong direction, and use it to decide whether a windfall (tax refund, bonus, extra paycheck month) is worth applying to debt instead of spending.",
      },
      {
        slug: "finding-extra-money-for-principal",
        title: "Finding extra money to put toward principal",
        summary: "You don't need a windfall to make real progress -- consistent small amounts beat occasional large ones.",
        content:
          "The fastest way to move a debt-free date up isn't usually a big one-time payment; it's a smaller amount added every single month, because it compounds against the interest the same way the debt's interest compounds against you.\n\nStart with the obvious sources: a subscription you don't use, a spending category you identified as a \"want\" during budgeting that you're willing to trim, or a raise you haven't already assigned elsewhere. Next, look at true windfalls when they happen -- tax refunds, work bonuses, the extra paycheck that shows up twice a year if you're paid biweekly -- and commit in advance to sending a fixed percentage of each toward debt before it becomes part of your regular spending.\n\nAvoid the trap of waiting for a large windfall before starting. $75 a month starting now, applied consistently to your avalanche or snowball target, will beat a single $900 payment made a year from now on nearly every debt-free-date calculation, because it's had far more time working against the interest.",
      },
      {
        slug: "staying-out-of-debt-once-youre-out",
        title: "Staying out of debt once you're out",
        summary: "The habits that get you out of debt and the habits that keep you out are related, but not identical.",
        content:
          "Paying off debt is a project with an end date. Staying out of debt is an ongoing practice, and it depends on the two things that usually caused the debt in the first place: no cushion for the unexpected, and no plan for irregular expenses.\n\nThe first fix is the emergency fund covered in the Saving course -- even a partial one dramatically cuts the odds of a car repair or medical bill becoming a new credit card balance. The second is planning for expenses that are predictable in category but not in timing: car maintenance, annual insurance premiums, holiday spending, gifts. Setting aside a small amount monthly for these turns them from \"emergencies\" into \"the fund I built for exactly this.\"\n\nKeep at least one line of credit open and lightly used after payoff -- it protects your credit history length and utilization ratio (covered in the Credit course) -- but treat it as a tool for building credit, not a fallback spending source. The habits that got you here are worth keeping even after the debt is gone.",
      },
    ],
  },
  {
    slug: "saving",
    title: "Saving",
    shortTitle: "Saving",
    description: "Build an emergency fund and real savings habits without derailing everything else.",
    seoDescription:
      "Free course on saving money -- starting an emergency fund, automating transfers, and setting savings goals you'll actually hit.",
    icon: "PiggyBank",
    comingSoon: false,
    lessons: [
      {
        slug: "why-you-need-an-emergency-fund-first",
        title: "Why you need an emergency fund before anything else",
        summary: "An emergency fund isn't competing with your other goals -- it's what protects them.",
        content:
          "It's tempting to skip the emergency fund and put every spare dollar toward debt or a bigger goal, since debt has a visible interest cost and a fund sitting in savings doesn't. But without one, the next car repair, medical bill, or period of reduced income becomes a new credit card balance -- undoing debt payoff progress or derailing a savings goal in one unplanned expense.\n\nAn emergency fund's job is narrow and specific: cover the gap between an unexpected expense and your next paycheck without new debt. It's not for planned expenses (that's a different kind of fund) and it's not your long-term savings. It's the layer that keeps a single bad month from becoming a bad year.\n\nEven a small one changes the math significantly -- most emergency expenses are in the few-hundred-dollar range, not the few-thousand-dollar range, so you don't need a fully-funded emergency fund before it starts protecting you. The next lesson covers how big is actually enough.",
      },
      {
        slug: "how-big-should-your-emergency-fund-be",
        title: "How big should your emergency fund actually be?",
        summary: "The common '3-6 months of expenses' advice is a good target, not a starting requirement.",
        content:
          "The standard advice -- 3 to 6 months of essential expenses -- is a reasonable long-term target, but treating it as the minimum before an emergency fund \"counts\" causes a lot of people to never start one at all, because the number feels out of reach.\n\nA more useful approach is in stages. Stage one: $500-$1,000, enough to cover most single unexpected expenses without a credit card. Stage two: one month of essential expenses (housing, utilities, groceries, minimum debt payments -- not your full lifestyle spending). Stage three: 3-6 months, which is genuinely valuable if your income is variable, you're the sole earner in your household, or your job market recovery time would be slow.\n\nWhich stage matters more than getting to six months fast: if you're also carrying high-interest debt, most people are better off building stage one, then shifting focus to debt payoff (the Debt Payoff course covers why), then returning to build out stage two and three once high-interest debt is gone.",
      },
      {
        slug: "automating-savings-so-its-not-a-decision",
        title: "Automating savings so it's not a decision",
        summary: "Savings that require a monthly decision compete with everything else you want to spend money on -- and usually lose.",
        content:
          "If saving money requires actively deciding, every month, to move money instead of spend it, it's competing against every other thing you could do with that money in the moment -- and in a tight month, saving usually loses that competition. Automation removes the decision entirely.\n\nSet up an automatic transfer to a separate savings account -- ideally at a different bank than your checking account, so it's slightly less convenient to raid on impulse -- scheduled for the same day your paycheck lands. This is the same \"pay yourself first\" principle from the Paychecks course, applied specifically to savings.\n\nStart with an amount you genuinely won't miss, even if it's small; a $25 automatic transfer you keep every paycheck beats a $200 goal you abandon after two months. You can increase it later, especially after a raise -- treat part of every raise as a savings-rate increase before it becomes part of your regular spending.",
      },
      {
        slug: "balancing-saving-with-paying-off-debt",
        title: "Balancing saving with paying off debt",
        summary: "This isn't usually an either/or decision -- it's a sequencing decision.",
        content:
          "A common question: should extra money go to savings or debt payoff? The honest answer depends on the debt's interest rate and where you are with your emergency fund, but a workable default order looks like this: build a starter emergency fund of $500-$1,000 first, then aggressively pay off any debt with a double-digit interest rate, then build your emergency fund out to 3-6 months, then split additional money between lower-interest debt and other savings goals based on your priorities.\n\nThe logic: a starter fund prevents new debt from unexpected expenses while you focus on payoff. High-interest debt (credit cards especially) almost always costs more in interest than any savings account earns, so paying it down first is close to a guaranteed return. Once that's gone, building out your full emergency fund protects the progress you just made.\n\nLower-interest debt (many mortgages, some auto loans, federal student loans) is more of a genuine toss-up with saving and investing goals -- there's no single right answer, and it depends on your risk tolerance and other goals.",
      },
      {
        slug: "setting-a-savings-goal-youll-actually-hit",
        title: "Setting a savings goal you'll actually hit",
        summary: "A savings goal without a number and a date is just a wish.",
        content:
          "\"I want to save more\" isn't a goal you can plan around or know when you've reached. A real savings goal has three parts: a specific amount, a specific purpose, and a target date -- \"$3,000 for a used car down payment by next June\" is something you can actually build a plan for.\n\nOnce you have those three parts, the math is simple: amount divided by months until your target date tells you the amount to automate each pay period. If that number doesn't fit your budget, you have two honest choices -- adjust the timeline or adjust the amount -- rather than setting a transfer you know you'll skip.\n\nKeep separate savings goals in separate places when you can, even if it's just labeled sub-accounts -- mixing your emergency fund, your car fund, and your vacation fund in one account makes it easy to accidentally spend \"emergency\" money on something that isn't one. Paycheck Planner's Goals feature is built to track exactly this: amount, purpose, and date, with progress visible every time you check your dashboard.",
      },
    ],
  },
  {
    slug: "credit",
    title: "Credit",
    shortTitle: "Credit",
    description: "Understand how credit actually works and how to build it on purpose.",
    seoDescription:
      "Free course on credit -- how credit scores are calculated, using credit responsibly, and building credit history without carrying debt.",
    icon: "CreditCard",
    comingSoon: false,
    lessons: [
      {
        slug: "what-actually-makes-up-your-credit-score",
        title: "What actually makes up your credit score",
        summary: "A credit score is built from five factors, and they're not weighted equally.",
        content:
          "A FICO credit score is calculated from five factors, in order of impact: payment history (about 35%), amounts owed / credit utilization (about 30%), length of credit history (about 15%), new credit (about 10%), and credit mix (about 10%). Knowing the weighting matters, because it tells you where effort actually moves the number.\n\nPayment history means exactly what it sounds like: paying at least the minimum, on time, every time, on every account. A single 30-day-late payment can meaningfully drop a score and stays on your credit report for up to seven years. This is the single highest-impact factor, and it's also the most within your control -- automating minimum payments (covered in the Paychecks course) protects this directly.\n\nUtilization -- how much of your available credit you're using -- is the second-biggest factor and one of the fastest to improve, since it reflects your current balances, not years of history. The next lesson covers it in detail, because it's the factor most people misunderstand.",
      },
      {
        slug: "credit-utilization-the-number-most-people-ignore",
        title: "Credit utilization: the number most people ignore",
        summary: "Utilization is the fastest lever you have to move your credit score -- and it resets every statement.",
        content:
          "Credit utilization is the percentage of your available credit you're currently using, both per card and across all your cards combined. Carrying a $2,000 balance on a card with a $10,000 limit is 20% utilization on that card. General guidance is to stay under 30%, and under 10% is even better for people optimizing for the highest possible score.\n\nThe part most people miss: utilization is typically calculated from your statement balance, not your balance right before it's due -- meaning even if you pay your card off in full every month, a high balance on your statement closing date can still show as high utilization and affect your score, even though you never carried interest.\n\nIf you're planning something that depends on your score soon -- a mortgage, a car loan -- pay down balances before the statement closing date, not just before the due date. This is one of the few credit factors that can improve within a single billing cycle, since it reflects your current balance rather than years of history like payment history does.",
      },
      {
        slug: "building-credit-without-carrying-a-balance",
        title: "Building credit without carrying a balance",
        summary: "Carrying a balance and paying interest does not build credit any faster than paying in full every month.",
        content:
          "A persistent myth: you need to carry a balance and pay interest to build credit. This isn't true, and it costs people real money. What actually builds credit is using a card and paying it on time -- whether you pay it in full or carry a balance makes no difference to your score, since utilization is based on your statement balance regardless of whether you pay it off before or after interest would apply.\n\nA simple approach that builds credit without paying interest: use a card for planned, budgeted purchases you'd make anyway (gas, groceries, a subscription), then pay the full statement balance every month before the due date. You get the credit-building benefit of on-time payments and moderate utilization, with zero interest cost.\n\nIf you're starting with no credit history or rebuilding after credit problems, a secured credit card -- backed by a cash deposit you control -- works the same way and reports to the credit bureaus the same way an unsecured card does. The deposit is just a starting safeguard, not a difference in how it builds your score.",
      },
      {
        slug: "reading-your-credit-report-for-errors",
        title: "Reading your credit report for errors",
        summary: "Credit report errors are common, and they don't fix themselves -- you have to catch and dispute them.",
        content:
          "You're entitled to a free copy of your credit report from each of the three major bureaus (Equifax, Experian, TransUnion) every week, permanently, through AnnualCreditReport.com -- the only site authorized for this by federal law. It's worth checking at least a few times a year, and definitely before applying for anything large like a mortgage.\n\nWhen you read it, check for: accounts you don't recognize (a potential sign of identity theft), incorrect late payments on accounts you actually paid on time, balances that don't match what you actually owe, and accounts that should have been closed but still show as open. Any of these can be actively hurting your score for no legitimate reason.\n\nIf you find an error, dispute it directly with the bureau reporting it, in writing, with any documentation you have. Bureaus are legally required to investigate disputes, typically within 30 days. This is worth doing even for a small discrepancy -- errors compound the same way legitimate factors do, and they cost you nothing to challenge.",
      },
      {
        slug: "when-to-and-not-to-open-new-credit",
        title: "When (and when not) to open new credit",
        summary: "Every new credit application has a real, if small, cost to your score -- so it should be a deliberate decision.",
        content:
          "Applying for new credit triggers a \"hard inquiry,\" which typically drops your score a few points temporarily and stays on your report for two years, though its effect fades well before that. One or two inquiries aren't a big deal; several in a short window is a real signal to lenders that you might be increasingly reliant on credit, and it's treated that way.\n\nGood reasons to open new credit: a genuine need (financing a car, a mortgage), building credit history if you have little to none, or a rewards card for spending you already do, paid in full monthly. A less good reason: opening a store card for a one-time discount on a purchase you'd have made anyway -- the discount is usually smaller than the long-term cost of the inquiry and the temptation of a new available balance.\n\nIf you're planning a major purchase that depends on your credit -- a mortgage especially -- avoid opening any new credit accounts in the 6-12 months beforehand. Lenders pull your report close to closing, and a new account or inquiry in that window can complicate or delay approval even if your overall credit is strong.",
      },
    ],
  },
  {
    slug: "financial-freedom",
    title: "Financial Freedom",
    shortTitle: "Fin. Freedom",
    description: "Turn vague money goals into ones you actually hit.",
    seoDescription:
      "Free course on long-term financial freedom -- setting concrete goals, building net worth, and what comes after debt-free.",
    icon: "Sparkles",
    comingSoon: false,
    lessons: [
      {
        slug: "what-financial-freedom-actually-means-for-you",
        title: "What \"financial freedom\" actually means for you",
        summary: "The phrase means something different for almost everyone who uses it -- which is exactly why it needs a personal definition before it can be a goal.",
        content:
          "\"Financial freedom\" gets used to mean retiring early, never worrying about money, working because you want to rather than because you have to, or simply not living paycheck to paycheck. None of these are wrong, but none of them are specific enough to build a plan around, either -- and a goal you can't plan around is a wish, not a plan.\n\nBefore you can build toward financial freedom, it needs a personal, specific definition: Is it a dollar amount that lets you cover expenses without working? A date you want to reach it by? A specific lifestyle change, like dropping to part-time or switching to lower-stress work you'd take a pay cut for? All are valid, but they lead to very different plans.\n\nSpend time on this before moving to the next lesson, which turns whatever you land on into an actual number and date. A vague sense that \"more money would fix this\" tends to lead to more money and the same feeling -- a specific target is what actually resolves it.",
      },
      {
        slug: "turning-a-vague-goal-into-a-number-and-a-date",
        title: "Turning a vague goal into a number and a date",
        summary: "Every version of financial freedom reduces to the same two things: a number, and a date you want to reach it by.",
        content:
          "Whatever your version of financial freedom looks like, it can be converted into a specific number and a target date, the same way a smaller savings goal works -- just at a larger scale. If it's \"cover my expenses without working,\" the number is your annual essential expenses multiplied by however many years of coverage feels right, or, for full financial independence, often 25x your annual expenses (a commonly used rule of thumb based on sustainable long-term withdrawal rates).\n\nIf it's a smaller, nearer-term version -- like \"have enough saved to take a 3-month career break\" -- the number is simply 3 months of expenses, and the date is however soon you want to be able to do it.\n\nOnce you have a number and a date, you can work backward to a monthly savings/investing rate the same way any goal works: (number minus current progress) divided by months remaining. If that monthly amount doesn't fit your current budget, the honest choices are the same as any goal -- extend the date, adjust the number, or find room in your budget -- not to leave it vague and hope it works out.",
      },
      {
        slug: "tracking-net-worth-instead-of-just-your-bank-balance",
        title: "Tracking net worth instead of just your bank balance",
        summary: "Your bank balance tells you what's spendable right now. Net worth tells you whether you're actually building toward something.",
        content:
          "A checking account balance answers \"what can I spend today,\" which is useful for day-to-day budgeting but tells you almost nothing about long-term progress -- it doesn't account for debt you're carrying, retirement accounts growing in the background, or an emergency fund sitting in a separate account.\n\nNet worth is simply everything you own minus everything you owe: bank accounts, retirement accounts, investments, and other assets, minus credit card balances, loans, and any other debt. It's a more honest single number for \"am I actually getting ahead,\" because paying off $500 of debt and losing $500 from checking moves net worth by zero -- correctly, since your financial position didn't actually improve or worsen.\n\nCheck it monthly or quarterly, not daily -- net worth changes slowly enough that daily tracking mostly just shows noise if you have investments. What matters is the trend over months and years: is it reliably moving in the direction you want. Paycheck Planner's dashboard tracks this automatically once your accounts and debts are connected, so you can see the trend without manual spreadsheet work.",
      },
      {
        slug: "what-changes-once-youre-debt-free",
        title: "What changes once you're debt-free",
        summary: "Becoming debt-free isn't the finish line -- it's the point where your plan needs a new focus.",
        content:
          "Reaching debt-free is a genuine milestone worth recognizing, but it's also the point where a lot of people lose momentum, because the specific goal that organized their financial decisions for months or years is suddenly gone. What replaces it matters as much as reaching it did.\n\nThe most common mistake: letting the money that was going to debt payments quietly absorb into regular spending instead of being redirected on purpose. If you were paying $400/month toward debt, that $400 doesn't have to become new spending -- it can become your new savings rate, retirement contribution increase, or the start of the financial freedom number from the earlier lessons in this course.\n\nThis is also the point to revisit your emergency fund (build it to the full 3-6 month target if you paused it during payoff), your credit -- since your utilization likely improved significantly and it's worth checking your score -- and your longer-term goals, now that they're not competing with debt payments for the same dollars. Redirect deliberately; don't just let the extra room in your budget disappear.",
      },
      {
        slug: "building-the-next-five-years-not-just-the-next-paycheck",
        title: "Building the next 5 years, not just the next paycheck",
        summary: "Everything else in this course lives paycheck to paycheck by design. Financial freedom means occasionally zooming out.",
        content:
          "Every other course here is deliberately focused on the near term -- this paycheck, this bill, this debt, this savings goal -- because that's where financial problems actually happen and get solved. But a plan that only ever looks at the next paycheck will keep you financially stable without ever moving you toward bigger, longer-term goals.\n\nOnce a quarter or so, it's worth deliberately zooming out: is your net worth trending the direction you want? Is your financial-freedom number and date (from earlier in this course) still realistic, or does it need adjusting based on a raise, a life change, or a shift in your investments? Are your goals in Paycheck Planner still the right goals, or has something changed?\n\nThis doesn't require a major overhaul each time -- most quarters, the answer is \"keep doing what you're doing.\" But the few times it isn't, catching it during a quarterly check-in is far better than catching it years later, when a course correction is a lot bigger than it needed to be. That's really what financial freedom becomes in practice: not a single moment you arrive at, but the ongoing habit of steering deliberately instead of drifting.",
      },
    ],
  },
]

export function getAllCourses(): UniversityCourse[] {
  return UNIVERSITY_COURSES
}

export function getCourse(slug: string): UniversityCourse | undefined {
  return UNIVERSITY_COURSES.find((c) => c.slug === slug)
}

export function getLesson(
  courseSlug: string,
  lessonSlug: string
): { course: UniversityCourse; lesson: UniversityLesson } | undefined {
  const course = getCourse(courseSlug)
  if (!course) return undefined
  const lesson = course.lessons.find((l) => l.slug === lessonSlug)
  if (!lesson) return undefined
  return { course, lesson }
}

// The stable key stored in public.university_progress -- "<course>.<lesson>".
export function lessonKey(courseSlug: string, lessonSlug: string): string {
  return `${courseSlug}.${lessonSlug}`
}

// True only for a lesson key that actually exists in the catalog above --
// the progress API uses this to reject arbitrary client-supplied keys.
export function isValidLessonKey(key: string): boolean {
  const [courseSlug, ...rest] = key.split(".")
  const lessonSlug = rest.join(".")
  return !!getLesson(courseSlug, lessonSlug)
}

export function totalLessonCount(): number {
  return UNIVERSITY_COURSES.reduce((sum, c) => sum + c.lessons.length, 0)
}

// A course counts as fully complete once every one of its lessons has a
// matching key in the user's completed set. A course with zero lessons is
// never "complete" (nothing to gate against would be a bug, not a pass).
export function isCourseFullyComplete(course: UniversityCourse, completedKeys: Set<string>): boolean {
  if (course.lessons.length === 0) return false
  return course.lessons.every((l) => completedKeys.has(lessonKey(course.slug, l.slug)))
}

// Courses unlock in catalog order: the first course is always unlocked: any
// later course unlocks once the course immediately before it is fully
// complete. Returns true/false for every course in UNIVERSITY_COURSES, in
// order, matched by index to getAllCourses().
export function getUnlockedMap(completedKeys: Set<string>): boolean[] {
  const unlocked: boolean[] = []
  UNIVERSITY_COURSES.forEach((course, i) => {
    if (i === 0) {
      unlocked.push(true)
      return
    }
    const prev = UNIVERSITY_COURSES[i - 1]
    unlocked.push(unlocked[i - 1] && isCourseFullyComplete(prev, completedKeys))
  })
  return unlocked
}

// Single-course convenience wrapper around getUnlockedMap, for pages that
// only need to check one course (the course detail page) rather than the
// whole catalog.
export function isCourseUnlocked(slug: string, completedKeys: Set<string>): boolean {
  const idx = UNIVERSITY_COURSES.findIndex((c) => c.slug === slug)
  if (idx === -1) return false
  return getUnlockedMap(completedKeys)[idx] ?? false
}

// Cross-links each lesson to the one Paycheck Planner calculator (lib/calculators.ts)
// that's most directly relevant, so every lesson page can offer a "Try it"
// link instead of dead-ending at prev/next-lesson navigation only. Reverse
// of CalculatorMeta.relatedLessons in lib/calculators.ts -- kept as a
// separate map (rather than a field on UniversityLesson) so it doesn't
// require touching all 30 lesson entries above. Credit-course lessons and a
// couple of Financial Freedom lessons are intentionally omitted -- there's
// no calculator that's a genuine topical match, and a forced link would be
// worse than none.
const LESSON_RELATED_CALCULATOR: Record<string, string> = {
  "budgeting.why-paycheck-based-budgeting-works": "50-30-20-budget",
  "budgeting.needs-vs-wants-the-real-breakdown": "50-30-20-budget",
  "budgeting.building-your-first-paycheck-budget": "50-30-20-budget",
  "budgeting.mapping-bills-to-paychecks": "biweekly-budget",
  "budgeting.adjusting-when-a-paycheck-falls-short": "emergency-fund",

  "paychecks.what-actually-comes-out-of-your-paycheck": "paycheck",
  "paychecks.gross-pay-vs-net-pay-the-number-that-matters": "paycheck",
  "paychecks.reading-your-pay-stub-without-getting-lost": "paycheck",
  "paychecks.automating-bills-and-savings-around-your-pay-schedule": "biweekly-budget",
  "paychecks.what-to-do-when-your-pay-changes": "monthly-budget",

  "debt.why-minimum-payments-keep-you-in-debt-longer": "debt-payoff",
  "debt.debt-snowball-vs-debt-avalanche": "debt-payoff",
  "debt.calculating-your-real-debt-free-date": "debt-payoff",
  "debt.finding-extra-money-for-principal": "monthly-budget",
  "debt.staying-out-of-debt-once-youre-out": "emergency-fund",

  "saving.why-you-need-an-emergency-fund-first": "emergency-fund",
  "saving.how-big-should-your-emergency-fund-be": "emergency-fund",
  "saving.automating-savings-so-its-not-a-decision": "biweekly-budget",
  "saving.balancing-saving-with-paying-off-debt": "savings-goal",
  "saving.setting-a-savings-goal-youll-actually-hit": "savings-goal",

  "financial-freedom.turning-a-vague-goal-into-a-number-and-a-date": "savings-goal",
  "financial-freedom.what-changes-once-youre-debt-free": "savings-goal",
  "financial-freedom.building-the-next-five-years-not-just-the-next-paycheck": "savings-goal",
}

export function getRelatedCalculatorSlug(courseSlug: string, lessonSlug: string): string | undefined {
  return LESSON_RELATED_CALCULATOR[lessonKey(courseSlug, lessonSlug)]
}
