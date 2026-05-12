import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const userId = body.userId

    if (!userId) {
      return NextResponse.json({
        isActive: false,
        status: null,
      })
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error || !data) {
      return NextResponse.json({
        isActive: false,
        status: null,
      })
    }

    const isActive =
      data.status === "active" || data.status === "trialing"

    return NextResponse.json({
      isActive,
      status: data.status,
    })

  } catch (err) {
    console.error("Subscription API error:", err)

    return NextResponse.json({
      isActive: false,
      status: null,
    })
  }
}