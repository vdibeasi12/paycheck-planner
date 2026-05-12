import { NextResponse } from "next/server"
import { resend } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = body.email

    await resend.emails.send({
      from: "growth@yourapp.com",
      to: email,
      subject: "You’re leaving money on the table",
      html: `
        <h1>You're paying unnecessary interest</h1>
        <p>Unlock your payoff strategy and start saving today.</p>
      `,
    })

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error(err)

    return NextResponse.json(
      { error: "Email failed" },
      { status: 500 }
    )
  }
}