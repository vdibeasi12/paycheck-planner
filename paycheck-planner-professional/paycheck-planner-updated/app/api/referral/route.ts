import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { referrerId, newUserId } = body

    if (!referrerId || !newUserId) {
      return NextResponse.json({ error: "Missing data" })
    }

    await supabase.from("referrals").insert({
      referrer_user_id: referrerId,
      referred_user_id: newUserId,
    })

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error(err)

    return NextResponse.json(
      { error: "Referral failed" },
      { status: 500 }
    )
  }
}