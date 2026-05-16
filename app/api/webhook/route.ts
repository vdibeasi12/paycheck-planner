import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  // Check for stripe signature header
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 400 }
    )
  }

  if (event.type === "checkout.session.completed") {
    const session: any = event.data.object

    const email = session.customer_details?.email
    const priceId = session.metadata?.priceId

    // Validate email exists
    if (!email) {
      console.warn("Webhook: Missing email in session")
      return NextResponse.json({ received: true })
    }

    let plan = "free"

    if (
      priceId === "price_1TIwD3FNVPZvQT3GJ5vGJ4kR" ||
      priceId === "price_1TIyAEFNVPZvQT3GLjhBbiVy"
    ) {
      plan = "starter"
    }

    if (
      priceId === "price_1TIwE2FNVPZvQT3G1Wf7uVcb" ||
      priceId === "price_1TIy9dFNVPZvQT3GXT5XzHLV"
    ) {
      plan = "premium"
    }

    try {
      await supabase.from("profiles").update({ plan }).eq("email", email)
      console.log(`Updated user ${email} to plan: ${plan}`)
    } catch (dbError) {
      console.error("Database update error:", dbError)
      // Don't fail the webhook - Stripe needs a 200 response
    }
  }

  return NextResponse.json({ received: true })
}
