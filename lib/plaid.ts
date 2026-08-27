// lib/plaid.ts
// Server-only Plaid client. Never import into a client component -- it reads
// PLAID_SECRET. Bank sync is gated to the Autopilot (connected) tier and only
// goes live when PLAID_ENABLED is "true".
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid"

export const PLAID_ENABLED =
  process.env.PLAID_ENABLED === "true" &&
  !!process.env.PLAID_CLIENT_ID &&
  !!process.env.PLAID_SECRET

const env = (process.env.PLAID_ENV || "sandbox") as keyof typeof PlaidEnvironments

export const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[env] ?? PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID ?? "",
        "PLAID-SECRET": process.env.PLAID_SECRET ?? "",
      },
    },
  })
)

// Only the Autopilot (connected) tier may link a bank.
export function planCanUsePlaid(plan: string | null | undefined): boolean {
  return plan === "connected"
}

// ---------------------------------------------------------------------------
// Shared liabilities sync. Used by the manual /api/plaid/sync route and the
// Plaid webhook. Refreshes plaid_accounts + plaid_liabilities for one item AND
// mirrors each liability into the user's `debts` table (source = "plaid",
// keyed by plaid_account_id) so synced debts appear everywhere manual debts do.
// `sb` must be a service-role Supabase client.
// ---------------------------------------------------------------------------
export async function syncLiabilitiesForItem(
  sb: any,
  userId: string,
  accessToken: string,
  itemId: string
): Promise<{ accounts: number; liabilities: number; debts: number }> {
  const liab = await plaid.liabilitiesGet({ access_token: accessToken })
  const accounts = liab.data.accounts
  const liabilities = liab.data.liabilities
  const now = new Date().toISOString()

  const acct = (id: string) => accounts.find((x: any) => x.account_id === id)
  const balanceFor = (id: string) => acct(id)?.balances?.current ?? null
  const nameFor = (id: string) => acct(id)?.name || acct(id)?.official_name || "Account"

  // 1) Accounts
  for (const a of accounts) {
    await sb.from("plaid_accounts").upsert(
      {
        user_id: userId,
        item_id: itemId,
        account_id: a.account_id,
        name: a.name,
        official_name: a.official_name ?? null,
        mask: a.mask ?? null,
        type: a.type ?? null,
        subtype: a.subtype ?? null,
        updated_at: now,
      },
      { onConflict: "account_id" }
    )
  }

  // 2) Build liability rows + debt specs
  const rows: Record<string, unknown>[] = []
  type Spec = {
    account_id: string
    debt_type: string
    balance: number
    apr: number | null
    min: number | null
    due: string | null
  }
  const specs: Spec[] = []

  for (const c of liabilities?.credit ?? []) {
    if (!c.account_id) continue
    rows.push({
      user_id: userId,
      account_id: c.account_id,
      liability_type: "credit",
      last_statement_balance: c.last_statement_balance ?? null,
      current_balance: balanceFor(c.account_id),
      apr_percentage: c.aprs?.[0]?.apr_percentage ?? null,
      minimum_payment: c.minimum_payment_amount ?? null,
      next_payment_due_date: c.next_payment_due_date ?? null,
      origination_date: null,
      updated_at: now,
    })
    specs.push({
      account_id: c.account_id,
      // "credit_card" to match lib/debtTypes.ts's canonical DEBT_TYPES value
      // -- this used to be the bare Plaid liability_type "credit", which
      // isn't in DEBT_TYPES at all, so every Plaid-synced credit card's
      // badge silently fell back to showing the literal word "credit"
      // instead of "Credit card" anywhere debtTypeLabel()/DEBT_TYPES.find()
      // looked it up (Debts page, Dashboard). Fixed 2026-08-27.
      debt_type: "credit_card",
      balance: Number(balanceFor(c.account_id) ?? c.last_statement_balance ?? 0),
      apr: c.aprs?.[0]?.apr_percentage ?? null,
      min: c.minimum_payment_amount ?? null,
      due: c.next_payment_due_date ?? null,
    })
  }
  for (const s of liabilities?.student ?? []) {
    if (!s.account_id) continue
    rows.push({
      user_id: userId,
      account_id: s.account_id,
      liability_type: "student",
      last_statement_balance: s.last_statement_balance ?? null,
      current_balance: balanceFor(s.account_id),
      apr_percentage: s.interest_rate_percentage ?? null,
      minimum_payment: s.minimum_payment_amount ?? null,
      next_payment_due_date: s.next_payment_due_date ?? null,
      origination_date: s.origination_date ?? null,
      updated_at: now,
    })
    specs.push({
      account_id: s.account_id,
      // "student_loan" to match lib/debtTypes.ts -- same fix as credit_card
      // above, was the bare Plaid liability_type "student".
      debt_type: "student_loan",
      balance: Number(balanceFor(s.account_id) ?? s.last_statement_balance ?? 0),
      apr: s.interest_rate_percentage ?? null,
      min: s.minimum_payment_amount ?? null,
      due: s.next_payment_due_date ?? null,
    })
  }
  for (const m of liabilities?.mortgage ?? []) {
    if (!m.account_id) continue
    rows.push({
      user_id: userId,
      account_id: m.account_id,
      liability_type: "mortgage",
      last_statement_balance: null,
      current_balance: balanceFor(m.account_id),
      apr_percentage: m.interest_rate?.percentage ?? null,
      minimum_payment: m.next_monthly_payment ?? null,
      next_payment_due_date: m.next_payment_due_date ?? null,
      origination_date: m.origination_date ?? null,
      updated_at: now,
    })
    specs.push({
      account_id: m.account_id,
      debt_type: "mortgage",
      balance: Number(balanceFor(m.account_id) ?? 0),
      apr: m.interest_rate?.percentage ?? null,
      min: m.next_monthly_payment ?? null,
      due: m.next_payment_due_date ?? null,
    })
  }

  // 3) Replace plaid_liabilities for these accounts
  const accountIds = accounts.map((a: any) => a.account_id)
  if (accountIds.length > 0) {
    await sb.from("plaid_liabilities").delete().in("account_id", accountIds)
  }
  if (rows.length > 0) {
    await sb.from("plaid_liabilities").insert(rows)
  }

  // 4) Mirror into `debts`. Update in place by plaid_account_id (preserving
  //    original_balance); insert if new.
  //
  // QA fix (Aug 27 2026): a real production bug found while chasing "I
  // edited the APR/minimum payment and it's not sticking" -- this update
  // used to unconditionally overwrite interest_rate/minimum_payment with
  // whatever Plaid returned, INCLUDING null/0 when Plaid simply doesn't
  // have that data for an account yet (common right after connecting,
  // before a statement posts -- see the "credit_card"/"student_loan" note
  // above, same underlying accounts). That meant every automated sync (this
  // daily cron, the webhook, or even the user's own "Refresh from bank"
  // click) would silently blank back out any value the user had just typed
  // in manually on the Debts page, or any real number Plaid had provided on
  // a previous sync. Fixed: Plaid's data still wins whenever Plaid actually
  // has it (a real improvement worth applying), but a null APR or a $0/null
  // minimum payment from Plaid now leaves whatever's already on the debt
  // row untouched -- whether that's a prior good Plaid value or something
  // the user entered by hand. balance/name/due date still always sync from
  // Plaid since those are reliably reported.
  let debtCount = 0
  for (const sp of specs) {
    const dueDay = sp.due ? new Date(sp.due).getUTCDate() : null
    const { data: existing } = await sb
      .from("debts")
      .select("id, interest_rate, minimum_payment")
      .eq("user_id", userId)
      .eq("plaid_account_id", sp.account_id)
      .maybeSingle()

    if (existing?.id) {
      const existingRate = existing.interest_rate != null ? Number(existing.interest_rate) : null
      const existingMin = existing.minimum_payment != null ? Number(existing.minimum_payment) : null
      const nextRate = sp.apr != null ? sp.apr : existingRate
      const nextMin = sp.min != null && sp.min > 0 ? sp.min : existingMin
      await sb
        .from("debts")
        .update({
          name: nameFor(sp.account_id),
          balance: sp.balance,
          interest_rate: nextRate,
          minimum_payment: nextMin,
          due_date: dueDay,
          debt_type: sp.debt_type,
          source: "plaid",
          updated_at: now,
        })
        .eq("id", existing.id)
    } else {
      await sb.from("debts").insert({
        user_id: userId,
        name: nameFor(sp.account_id),
        balance: sp.balance,
        original_balance: sp.balance,
        interest_rate: sp.apr,
        minimum_payment: sp.min,
        due_date: dueDay,
        debt_type: sp.debt_type,
        status: "active",
        source: "plaid",
        plaid_account_id: sp.account_id,
      })
    }
    debtCount++
  }

  await sb
    .from("plaid_items")
    .update({ status: "active", updated_at: now })
    .eq("item_id", itemId)

  return { accounts: accounts.length, liabilities: rows.length, debts: debtCount }
}

// Shared upsert logic for both balance-sync modes below. `accounts` should
// already be filtered to depository (checking/savings) accounts.
async function applyBalanceSync(
  sb: any,
  userId: string,
  itemId: string,
  accounts: any[]
): Promise<{ accounts: number; assets: number }> {
  const now = new Date().toISOString()

  let assetCount = 0
  for (const a of accounts) {
    await sb.from("plaid_accounts").upsert(
      {
        user_id: userId,
        item_id: itemId,
        account_id: a.account_id,
        name: a.name,
        official_name: a.official_name ?? null,
        mask: a.mask ?? null,
        type: a.type ?? null,
        subtype: a.subtype ?? null,
        updated_at: now,
      },
      { onConflict: "account_id" }
    )

    const balance = a.balances?.available ?? a.balances?.current ?? 0
    const name = a.official_name || a.name || "Credit card account"

    const { data: existing } = await sb
      .from("assets")
      .select("id")
      .eq("user_id", userId)
      .eq("plaid_account_id", a.account_id)
      .maybeSingle()

    if (existing?.id) {
      await sb
        .from("assets")
        .update({
          name,
          asset_type: a.subtype || "cash",
          value: balance,
          source: "plaid",
          updated_at: now,
        })
        .eq("id", existing.id)
    } else {
      await sb.from("assets").insert({
        user_id: userId,
        name,
        asset_type: a.subtype || "cash",
        value: balance,
        source: "plaid",
        plaid_account_id: a.account_id,
      })
    }
    assetCount++
  }

  await sb
    .from("plaid_items")
    .update({ status: "active", updated_at: now })
    .eq("item_id", itemId)

  return { accounts: accounts.length, assets: assetCount }
}

// Paid, real-time balance pull (/accounts/balance/get -- billed per call).
// Reserved for low-frequency, high-value moments only: the initial bank
// connection (exchange/route.ts) and the user's own manual "Refresh from
// bank" click (sync/route.ts). Never call this from an automated/scheduled
// job -- see syncCachedBalancesForItem below for that.
export async function syncBalancesForItem(
  sb: any,
  userId: string,
  accessToken: string,
  itemId: string
): Promise<{ accounts: number; assets: number }> {
  const bal = await plaid.accountsBalanceGet({ access_token: accessToken })
  const accounts = bal.data.accounts.filter((a: any) => a.type === "depository")
  return applyBalanceSync(sb, userId, itemId, accounts)
}

// Free, cached balance pull (/accounts/get -- no per-call charge). Plaid
// refreshes this cache in the background roughly daily for Items that carry
// a "regularly updating" product (Liabilities, Transactions, Investments) --
// which covers every credit card/loan/mortgage this app already syncs --
// but NOT for Auth-only items (plain checking/savings), where the cache can
// go stale between refreshes. That's the deliberate tradeoff: this is what
// the daily bank-balance-refresh cron uses, so the automated refresh costs
// nothing per user per day. Checking/savings balances stay accurate as of
// the last connection or manual "Refresh from bank" click (which uses the
// paid, real-time syncBalancesForItem above) rather than guaranteed same-day
// fresh from this cron alone.
export async function syncCachedBalancesForItem(
  sb: any,
  userId: string,
  accessToken: string,
  itemId: string
): Promise<{ accounts: number; assets: number }> {
  const res = await plaid.accountsGet({ access_token: accessToken })
  const accounts = res.data.accounts.filter((a: any) => a.type === "depository")
  return applyBalanceSync(sb, userId, itemId, accounts)
}