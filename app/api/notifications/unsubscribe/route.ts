import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

// "bills"/"payday" turn off just that one reminder. "all" (also the
// fallback for a missing/unrecognized type, so a malformed link still does
// something safe) turns off every email_* toggle on the row -- push
// preferences are left untouched either way, this route only ever affects
// email.
const TYPE_LABELS: Record<string, string> = {
  bills: "bill reminder emails",
  payday: "payday reminder emails",
  all: "all Paycheck Planner emails",
}

const TYPE_COLUMNS: Record<string, Record<string, boolean>> = {
  bills: { email_bill_reminders: false },
  payday: { email_payday_reminder: false },
  all: {
    email_bill_reminders: false,
    email_payday_reminder: false,
    email_weekly_summary: false,
    email_product_updates: false,
    email_new_posts: false,
  },
}

function page(title: string, message: string): string {
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
    title +
    '</title></head><body style="font-family:Arial,Helvetica,sans-serif;background:#020617;color:#e5e7eb;' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">' +
    '<div style="text-align:center;max-width:420px;padding:24px;">' +
    '<h1 style="color:#34d399;font-size:22px;">' +
    title +
    "</h1><p>" +
    message +
    '</p><p><a href="/account" style="color:#34d399;">Manage all email preferences</a></p>' +
    "</div></body></html>"
  )
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token") || ""
  const type = (url.searchParams.get("type") || "all").toLowerCase()
  const updates = TYPE_COLUMNS[type] || TYPE_COLUMNS.all

  if (!token) {
    return new NextResponse(page("Unsubscribe", "Missing or invalid link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    })
  }

  const db = adminDb()
  const { data, error } = await db
    .from("notification_preferences")
    .update(updates)
    .eq("unsubscribe_token", token)
    .select("user_id")
    .maybeSingle()

  if (error || !data) {
    return new NextResponse(
      page("Unsubscribe", "This link is no longer valid -- you may already be unsubscribed."),
      { status: 404, headers: { "Content-Type": "text/html" } }
    )
  }

  return new NextResponse(
    page(
      "You're unsubscribed",
      "You won't get any more " + (TYPE_LABELS[type] || TYPE_LABELS.all) + "."
    ),
    { status: 200, headers: { "Content-Type": "text/html" } }
  )
}
