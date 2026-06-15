// app/api/stripe/checkout/route.ts
import Stripe from "stripe"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-02-25.clover",
})

export async function POST(req: Request) {
  try {
    // Body is optional; UpgradeButton sends nothing, PaywallOverlay sends { priceId }.
    let priceId: string | undefined
    try {
      const body = await req.json()
      priceId = body?.priceId
    } catch {
      priceId = undefined
    }

    // Default to Premium monthly when no price is specified.
    priceId =
      priceId || process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY || undefined

    if (!priceId) {
      return NextResponse.json(
        { error: "No price configured" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000"

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error("Checkout error:", err)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
