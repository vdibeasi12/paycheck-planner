import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient as createUserClient } from "@/lib/supabase/server"
import { TIERS } from "@/lib/plans"

export const dynamic = "force-dynamic"

// QA fix (Aug 29 2026): this used to hardcode its own copy of each tier's
// price ($11.99/$119.99 for Autopilot) instead of reading lib/plans.ts,
// the single source of truth pricing/checkout actually uses. It had
// drifted -- Autopilot is really $12.99/mo, $129.99/yr -- so MRR was quietly
// under-counting every Autopilot subscriber. Deriving straight from TIERS
// means this can't drift again. Same fix applied to app/api/admin/users.
const priceByTier = new Map(TIERS.map((t) => [t.id, t]))

function monthlyValue(tier: string | null, planType: string | null) {
  const t = tier ? priceByTier.get(tier as (typeof TIERS)[number]["id"]) : undefined
  if (!t) return 0
  const isAnnual = planType === "annual" || planType === "yearly"
  return isAnnual ? t.priceAnnual / 12 : t.priceMonthly
}

export async function GET() {
  // 1) Identify the caller from their session cookie.
  const userClient = await createUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2) Only admins may read SaaS-wide metrics.
  const { data: profile } = await userClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // 3) Authorized. Now use the service-role client to aggregate.
  //    (Created here, not at module scope, so a missing env var doesn't
  //    break the build and the privileged key is only used after the gate.)
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  try {
    const { data } = await admin.from("subscriptions").select("*")
    // Only count rows Stripe's webhook actually wrote (stripe_subscription_id
    // set -- see upsertSubscription in app/api/webhook/route.ts). Rows without
    // it were inserted by hand for demo/test seeding and never represented
    // real revenue. Keeps this endpoint consistent with app/api/admin/users.
    const subs = (data || []).filter((s) => !!s.stripe_subscription_id)

    const active = subs.filter(
      (s) => s.status === "active" || s.status === "trialing"
    )
    const canceled = subs.filter((s) => s.status === "canceled")

    const mrr =
      Math.round(
        active.reduce((sum, s) => sum + monthlyValue(s.tier, s.plan_type), 0) * 100
      ) / 100
    const avgLifetimeMonths = 4 // placeholder
    const arpu = active.length > 0 ? mrr / active.length : 0
    const ltv = Math.round(arpu * avgLifetimeMonths * 100) / 100

    const cohorts: Record<string, number> = {}
    subs.forEach((sub) => {
      const date = new Date(sub.created_at || Date.now())
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`
      cohorts[key] = (cohorts[key] || 0) + 1
    })

    return NextResponse.json({
      mrr,
      activeUsers: active.length,
      churnedUsers: canceled.length,
      ltv,
      cohorts,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 })
  }
}