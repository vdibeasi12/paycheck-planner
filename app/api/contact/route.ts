import { NextResponse } from "next/server"
import { resend } from "@/lib/email"
import { checkAnonRateLimit, getClientIp } from "@/lib/anonRateLimit"
import { track } from "@/lib/track"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LENGTH = 200
const MAX_MESSAGE_LENGTH = 5000

const SUPPORT_INBOX = "support@paycheckplanner.ai"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function POST(req: Request) {
  let body: { name?: string; email?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const name = (body.name || "").trim()
  const email = (body.email || "").trim().toLowerCase()
  const message = (body.message || "").trim()

  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "Enter your name" }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 })
  }
  if (!message) {
    return NextResponse.json({ error: "Enter a message" }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` },
      { status: 400 }
    )
  }

  const underLimit = await checkAnonRateLimit("contact-form", getClientIp(req))
  if (!underLimit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later, or email " + SUPPORT_INBOX },
      { status: 429 }
    )
  }

  const from = process.env.EMAIL_FROM
  if (!from) {
    console.error("EMAIL_FROM not set -- contact form cannot deliver")
    return NextResponse.json(
      { error: "Message could not be sent right now. Please email " + SUPPORT_INBOX + " directly." },
      { status: 500 }
    )
  }

  const result = await resend.emails.send({
    from,
    to: SUPPORT_INBOX,
    replyTo: email,
    subject: `Contact form: ${name}`,
    html: `
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
    `,
  })

  if (result && (result as any).error) {
    console.error("Contact form email failed:", (result as any).error)
    return NextResponse.json(
      { error: "Message could not be sent right now. Please email " + SUPPORT_INBOX + " directly." },
      { status: 502 }
    )
  }

  await track("contact_form_submitted")

  return NextResponse.json({ ok: true })
}
