import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

const PRICE = 9

export async function GET() {
  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")

    const subs = data || []

    const active = subs.filter(
      (s) => s.status === "active" || s.status === "trialing"
    )

    const canceled = subs.filter(
      (s) => s.status === "canceled"
    )

    const mrr = active.length * PRICE

    // 💰 LTV ESTIMATE
    const avgLifetimeMonths = 4 // placeholder
    const ltv = PRICE * avgLifetimeMonths

    // 📊 Cohorts (simple by month)
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

    return NextResponse.json({
      mrr: 0,
      activeUsers: 0,
      churnedUsers: 0,
      ltv: 0,
      cohorts: {},
    })
  }
}