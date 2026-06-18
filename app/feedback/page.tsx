import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import FeedbackForm from "@/app/components/FeedbackForm"

export default async function FeedbackPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold text-white">Share your feedback</h1>
      <p className="mt-2 text-gray-400">
        Tell us what you like or what would make Paycheck Planner better. We read every note.
      </p>
      <div className="mt-8 rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
        <FeedbackForm />
      </div>
    </div>
  )
}