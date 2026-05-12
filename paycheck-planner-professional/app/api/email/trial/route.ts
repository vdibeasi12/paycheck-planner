import { NextResponse } from "next/server"
import { resend } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = body.email

    if (!email) {
      return NextResponse.json({ error: "Missing email" })
    }

    await resend.emails.send({
      from: "onboarding@yourapp.com",
      to: email,
      subject: "Your trial is ending soon",
      html: `
        <h1>Your trial is almost over</h1>
        <p>Upgrade now to continue your debt-free journey.</p>
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