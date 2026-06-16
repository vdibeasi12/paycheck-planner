// app/api/stripe/checkout/route.ts
import Stripe from "stripe"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { planForPriceId } from "@/lib/plans"

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
      // This is almost always a missing env var in the deploy, which is why
      // the button looked like it "did nothing." Make it loud in the logs.
      console.error(
        "Checkout: no priceId in body and NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY is unset"
      )
      return NextResponse.json({ error: "No price configured" }, { status: 400 })
    }

    // Resolve the plan now so the webhook never has to guess later.
    // (Unknown price -> null; we still let checkout proceed and let the
    // webhook fall back to reading the price off the subscription.)
    const plan = planForPriceId(priceId)

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

    // Stripe metadata values must be strings; only include plan when known.
    const metadata: Record<string, string> = {
      userId: user.id,
      priceId,
    }
    if (plan) metadata.plan = plan

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata,
      subscription_data: { metadata },
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
