import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { planForPriceId, type TierId } from "@/lib/plans"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Update a profile's plan. Prefer matching by auth user id (stable);
// fall back to email. Runs with the service role, so RLS is bypassed.
async function setPlan(
  plan: TierId,
  { userId, email }: { userId?: string | null; email?: string | null }
) {
  if (userId) {
    const { error } = await supabase
      .from("profiles")
      .update({ plan })
      .eq("id", userId)
    if (!error) return
    console.error("setPlan by id failed, falling back to email:", error.message)
  }
  if (email) {
    const { error } = await supabase
      .from("profiles")
      .update({ plan })
      .eq("email", email)
    if (error) console.error("setPlan by email failed:", error.message)
    return
  }
  console.error("setPlan: no userId or email available to match a profile")
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        const userId = session.metadata?.userId ?? session.client_reference_id
        const email =
          session.customer_details?.email ?? session.customer_email ?? null

        // Resolve the plan in priority order:
        // 1) the plan we stamped onto the session at checkout,
        // 2) map the priceId we stamped on,
        // 3) last resort: read the price off the subscription itself.
        let plan: TierId | null =
          (session.metadata?.plan as TierId | undefined) ??
          planForPriceId(session.metadata?.priceId)

        if (!plan && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          plan = planForPriceId(sub.items.data[0]?.price?.id)
        }

        if (!plan) {
          console.error("checkout.session.completed: could not resolve plan", {
            userId,
            email,
            metadata: session.metadata,
          })
          break
        }

        await setPlan(plan, { userId, email })
        break
      }

      // Plan changes (e.g. Starter -> Premium) keep the profile in sync.
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const plan = planForPriceId(sub.items.data[0]?.price?.id)
        if (plan) await setPlan(plan, { userId: sub.metadata?.userId })
        break
      }

      // Cancellation / expiry drops the user back to free.
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        await setPlan("free", { userId: sub.metadata?.userId })
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error("Webhook handler error:", err)
    return NextResponse.json({ error: "Handler error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
