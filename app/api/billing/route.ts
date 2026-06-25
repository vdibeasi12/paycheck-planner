// app/api/billing/route.ts
import Stripe from "stripe"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-02-25.clover",
})

export async function POST(req: Request) {
  try {
    // Authenticate the caller and derive the Stripe customer from THIS
    // user's own profile -- never from the request body. That closes the
    // hole where any caller could pass an arbitrary customerId and open a
    // billing portal for someone else's subscription.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (error || !profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription to manage" },
        { status: 400 }
      )
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000"

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error("Billing portal error:", err)
    return NextResponse.json(
      { error: "Failed to create billing session" },
      { status: 500 }
    )
  }
}