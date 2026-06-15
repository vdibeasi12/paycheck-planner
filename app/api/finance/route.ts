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
      return NextResponse.json(
        { debts: [], bills: [] },
        { status: 400 }
      )
    }

    const [debtsRes, billsRes] = await Promise.all([
      supabase.from("debts").select("*").eq("user_id", userId),
      supabase.from("bills").select("*").eq("user_id", userId),
    ])

    return NextResponse.json({
      debts: debtsRes.data || [],
      bills: billsRes.data || [],
    })

  } catch (err) {
    console.error("Finance API error:", err)

    return NextResponse.json(
      { debts: [], bills: [] },
      { status: 500 }
    )
  }
}