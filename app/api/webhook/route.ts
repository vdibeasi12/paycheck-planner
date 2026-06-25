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

type ProfilePatch = {
  plan: TierId
  stripe_customer_id?: string | null
  subscription_status?: string | null
}

// Update a profile's plan (and, when known, Stripe customer id + status).
// Prefer matching by auth user id (stable); fall back to email. Runs with the
// service role, so RLS is bypassed.
async function setPlan(
  patch: ProfilePatch,
  { userId, email }: { userId?: string | null; email?: string | null }
) {
  const update: ProfilePatch = { plan: patch.plan }
  if (patch.stripe_customer_id !== undefined)
    update.stripe_customer_id = patch.stripe_customer_id
  if (patch.subscription_status !== undefined)
    update.subscription_status = patch.subscription_status

  if (userId) {
    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", userId)
      .select("id")
    // Supabase reports no error when zero rows match, so check the row count
    // and only treat a matched-and-updated row as success.
    if (!error && data && data.length > 0) return
    if (error) {
      console.error("setPlan by id failed, falling back to email:", error.message)
    } else {
      console.error("setPlan by id matched 0 rows, falling back to email")
    }
  }

  if (email) {
    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("email", email)
    if (error) console.error("setPlan by email failed:", error.message)
    return
  }

  console.error("setPlan: no userId or email available to match a profile")
}

// Mirror a Stripe subscription into the `subscriptions` table (one row per
// user, keyed on user_id). This is what the admin metrics/MRR endpoints read,
// so it must stay in sync with the live subscription.
async function upsertSubscription(
  sub: Stripe.Subscription,
  fallbackUserId?: string | null
) {
  const userId = sub.metadata?.userId ?? fallbackUserId ?? null
  if (!userId) {
    console.error("upsertSubscription: no userId for subscription", sub.id)
    return
  }

  const item = sub.items.data[0]
  const tier = planForPriceId(item?.price?.id)
  const interval = item?.price?.recurring?.interval
  const planType =
    interval === "year" ? "yearly" : interval === "month" ? "monthly" : null

  // Recent Stripe API versions carry the period on the subscription item;
  // fall back to the subscription object for older shapes.
  const itemAny = item as unknown as Record<string, number | undefined>
  const subAny = sub as unknown as Record<string, number | undefined>
  const periodStart = itemAny?.current_period_start ?? subAny?.current_period_start
  const periodEnd = itemAny?.current_period_end ?? subAny?.current_period_end

  const row = {
    user_id: userId,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : null,
    stripe_subscription_id: sub.id,
    tier,
    status: sub.status,
    plan_type: planType,
    current_period_start: periodStart
      ? new Date(periodStart * 1000).toISOString()
      : null,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(row, { onConflict: "user_id" })
  if (error) console.error("upsertSubscription failed:", error.message)
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
        const customerId =
          typeof session.customer === "string" ? session.customer : null

        // Retrieve the subscription so we can resolve the plan AND mirror the
        // full subscription row in one place.
        let sub: Stripe.Subscription | null = null
        if (session.subscription) {
          sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
        }

        const plan: TierId | null =
          (session.metadata?.plan as TierId | undefined) ??
          planForPriceId(session.metadata?.priceId) ??
          (sub ? planForPriceId(sub.items.data[0]?.price?.id) : null)

        if (!plan) {
          console.error("checkout.session.completed: could not resolve plan", {
            userId,
            email,
            metadata: session.metadata,
          })
          break
        }

        await setPlan(
          {
            plan,
            stripe_customer_id: customerId,
            subscription_status: sub?.status ?? "active",
          },
          { userId, email }
        )
        if (sub) await upsertSubscription(sub, userId)
        break
      }

      // Plan changes (e.g. Momentum -> Accelerate) keep both stores in sync.
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const plan = planForPriceId(sub.items.data[0]?.price?.id)
        const customerId =
          typeof sub.customer === "string" ? sub.customer : null
        if (plan)
          await setPlan(
            {
              plan,
              stripe_customer_id: customerId,
              subscription_status: sub.status,
            },
            { userId: sub.metadata?.userId, email: null }
          )
        await upsertSubscription(sub)
        break
      }

      // Cancellation / expiry drops the user back to free; the subscriptions
      // row stays for history with status "canceled".
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === "string" ? sub.customer : null
        await setPlan(
          {
            plan: "free",
            stripe_customer_id: customerId,
            subscription_status: "canceled",
          },
          { userId: sub.metadata?.userId, email: null }
        )
        await upsertSubscription(sub)
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