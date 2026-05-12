import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const { customerId } = await req.json()

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: "http://localhost:3000/dashboard",
  })

  return NextResponse.json({ url: session.url })
}