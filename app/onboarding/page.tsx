import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  CheckCircle2,
  Circle,
  CreditCard,
  Receipt,
  Target,
} from "lucide-react"
import OnboardingActions from "./OnboardingActions"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const countFor = async (table: string) => {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
    return count ?? 0
  }
  const [debtCount, billCount, goalCount] = await Promise.all([
    countFor("debts"),
    countFor("bills"),
    countFor("financial_goals"),
  ])

  const steps = [
    {
      done: debtCount > 0,
      href: "/debts",
      Icon: CreditCard,
      title: "Add your first debt",
      desc: "Enter a balance, interest rate (APR), and minimum payment so we can build your payoff plan.",
    },
    {
      done: billCount > 0,
      href: "/bills",
      Icon: Receipt,
      title: "Add a bill or paycheck",
      desc: "Track what's coming in and going out each month.",
    },
    {
      done: goalCount > 0,
      href: "/goals",
      Icon: Target,
      title: "Set a goal",
      desc: "Pick something to aim for and watch your progress add up.",
    },
  ]
  const completed = steps.filter((s) => s.done).length
  const pct = Math.round((completed / steps.length) * 100)

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold">Welcome to Paycheck Planner 🎉</h1>
        <p className="text-gray-400 mt-2">
          Let&apos;s get you set up. Three quick steps and you&apos;ll have a real
          payoff plan.
        </p>

        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>
              {completed} of {steps.length} done
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`flex items-start gap-4 rounded-xl border p-5 ${
                s.done
                  ? "border-green-500/40 bg-green-500/5"
                  : "border-gray-700 bg-[#0f172a]"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {s.done ? (
                  <CheckCircle2 className="text-green-400" size={24} />
                ) : (
                  <Circle className="text-gray-500" size={24} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <s.Icon size={18} className="text-gray-300 shrink-0" />
                  <h3 className="font-semibold">{s.title}</h3>
                </div>
                <p className="text-sm text-gray-400 mt-1">{s.desc}</p>
              </div>
              <Link
                href={s.href}
                className={`shrink-0 self-center text-sm font-semibold px-4 py-2 rounded-lg transition ${
                  s.done
                    ? "border border-gray-700 text-gray-300 hover:text-white"
                    : "bg-green-500 hover:bg-green-600 text-black"
                }`}
              >
                {s.done ? "Edit" : "Start"}
              </Link>
            </div>
          ))}
        </div>

        <OnboardingActions allDone={completed === steps.length} />
      </div>
    </div>
  )
}
