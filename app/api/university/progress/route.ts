import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isValidLessonKey } from "@/lib/university"

// GET: the current user's completed lesson keys. Anonymous visitors (or
// anyone browsing without an account) just get an empty list back -- lesson
// content itself is public, only progress tracking requires auth.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ completed: [] })
  }

  const { data, error } = await supabase
    .from("university_progress")
    .select("lesson_key")
    .eq("user_id", user.id)

  if (error) {
    console.error("university progress fetch failed:", error.message)
    return NextResponse.json({ completed: [] }, { status: 500 })
  }

  return NextResponse.json({ completed: (data || []).map((r: any) => r.lesson_key) })
}

// POST { lessonKey, completed?: boolean } -- mark a lesson complete
// (default) or, with completed: false, un-mark it. Requires auth.
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in to track your progress." }, { status: 401 })
  }

  const body = await req.json().catch(() => ({} as any))
  const lessonKey = typeof body?.lessonKey === "string" ? body.lessonKey.slice(0, 200) : ""
  const completed = body?.completed !== false

  if (!lessonKey || !isValidLessonKey(lessonKey)) {
    return NextResponse.json({ error: "Unknown lesson." }, { status: 400 })
  }

  if (completed) {
    const { error } = await supabase
      .from("university_progress")
      .upsert({ user_id: user.id, lesson_key: lessonKey }, { onConflict: "user_id,lesson_key" })
    if (error) {
      console.error("university progress upsert failed:", error.message)
      return NextResponse.json({ error: "Could not save progress." }, { status: 500 })
    }
  } else {
    const { error } = await supabase
      .from("university_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("lesson_key", lessonKey)
    if (error) {
      console.error("university progress delete failed:", error.message)
      return NextResponse.json({ error: "Could not save progress." }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
