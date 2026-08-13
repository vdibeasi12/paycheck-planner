"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { lessonKey } from "@/lib/university"

export default function LessonComplete({
  courseSlug,
  lessonSlug,
}: {
  courseSlug: string
  lessonSlug: string
}) {
  const key = lessonKey(courseSlug, lessonSlug)
  const [done, setDone] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signedIn, setSignedIn] = useState(true)

  useEffect(() => {
    let active = true
    fetch("/api/university/progress")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        setDone(Array.isArray(data?.completed) && data.completed.includes(key))
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [key])

  async function toggle() {
    if (saving) return
    setSaving(true)
    setSignedIn(true)
    const nextDone = !done
    try {
      const res = await fetch("/api/university/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonKey: key, completed: nextDone }),
      })
      if (res.status === 401) {
        setSignedIn(false)
        return
      }
      if (res.ok) setDone(nextDone)
    } catch {
      // Silently ignore -- this is a nice-to-have progress toggle, not a critical action.
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return null

  return (
    <div>
      <button
        onClick={toggle}
        disabled={saving}
        className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
          done
            ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
            : "bg-emerald-500 text-black hover:bg-emerald-400"
        }`}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        {done ? "Completed" : "Mark as complete"}
      </button>
      {!signedIn && (
        <p className="mt-2 text-sm text-gray-400">
          <a href="/login" className="text-emerald-400 hover:underline">
            Sign in
          </a>{" "}
          to save your progress.
        </p>
      )}
    </div>
  )
}
