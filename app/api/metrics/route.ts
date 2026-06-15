import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient as createUserClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const PRICE = 9

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
    const subs = data || []

    const active = subs.filter(
      (s) => s.status === "active" || s.status === "trialing"
    )
    const canceled = subs.filter((s) => s.status === "canceled")

    const mrr = active.length * PRICE
    const avgLifetimeMonths = 4 // placeholder
    const ltv = PRICE * avgLifetimeMonths

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
