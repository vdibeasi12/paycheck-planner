import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

function page(title: string, message: string): string {
  return (
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>" +
    title +
    "</title></head><body style=\"font-family:Arial,Helvetica,sans-serif;background:#020617;color:#e5e7eb;" +
    "display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;\">" +
    "<div style=\"text-align:center;max-width:420px;padding:24px;\">" +
    "<h1 style=\"color:#34d399;font-size:22px;\">" +
    title +
    "</h1><p>" +
    message +
    "</p><p><a href=\"/worksheet\" style=\"color:#34d399;\">Back to the worksheet</a></p>" +
    "</div></body></html>"
  )
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token") || ""

  if (!token) {
    return new NextResponse(page("Unsubscribe", "Missing or invalid link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    })
  }

  const db = adminDb()
  const { data, error } = await db
    .from("lead_magnet_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle()

  if (error || !data) {
    return new NextResponse(
      page("Unsubscribe", "This link is no longer valid -- you may already be unsubscribed."),
      { status: 404, headers: { "Content-Type": "text/html" } }
    )
  }

  return new NextResponse(
    page("You're unsubscribed", "You won't get any more emails in this series."),
    { status: 200, headers: { "Content-Type": "text/html" } }
  )
}
