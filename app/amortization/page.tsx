import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

import AmortizationSchedule from "@/app/components/AmortizationSchedule"
import PaywallOverlay from "@/app/components/PaywallOverlay"
import InfoHint from "@/app/components/InfoHint"
import { CalendarClock } from "lucide-react"

export default async function AmortizationPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, onboarded")
    .eq("id", user.id)
    .maybeSingle()


  let plan = "free"
  if (profile?.plan) {
    plan = profile.plan
  }

  // Tier gate for the payoff (amortization) schedule.
  // Default: Starter and Premium - a low-cost, high-value win that makes the
  // Starter tier worth paying for, leaving Premium differentiated by AI and
  // advanced analytics.
  // To make it Premium-only: set this to (plan === "premium") and change the
  //   PaywallOverlay priceId below to the Premium Monthly price
  //   (price_1TO2SSFv1EcTs6LYVswF0AwU) plus matching copy.
  // To make it free for everyone: set this to true.
  const canUseAmortization = plan === "starter" || plan === "premium" || plan === "connected"

  const { data: debtsData } = await supabase
    .from("debts")
    .select("id, name, balance, interest_rate, minimum_payment")
    .eq("user_id", user.id)

  const debts = (Array.isArray(debtsData) ? debtsData : []).map((d) => ({
    id: String(d.id),
    name: String(d.name || "Debt"),
    balance: Number(d.balance) || 0,
    interest_rate: Number(d.interest_rate) || 0,
    minimum_payment: Number(d.minimum_payment) || 0,
  }))

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div>
        <div className="flex items-center gap-2">
          <CalendarClock size={26} className="text-emerald-400" />
          <h1 className="text-3xl font-bold">Payoff Plan</h1>
          <InfoHint
            label="About the Payoff Plan"
            text="A month-by-month amortization schedule showing how your debts get paid down with the Snowball or Avalanche strategy. Add an extra monthly payment to see how much faster you reach debt-free, then export the full schedule to CSV."
          />
        </div>
        <p className="mt-1 text-gray-400">
          See exactly when each debt is paid off, and export the schedule.
        </p>
      </div>

      {!canUseAmortization ? (
        <div className="relative min-h-[260px] overflow-hidden rounded-xl border border-gray-700 bg-[#0f172a] p-6">
          <div className="pointer-events-none opacity-40">
            <p className="text-gray-300">
              Your full month-by-month payoff schedule, Snowball vs Avalanche, with CSV export.
            </p>
          </div>
          <PaywallOverlay
            priceId="price_1TO2RmFv1EcTs6LYp5OOlvOK"
            title="Unlock your Payoff Plan"
            description="Upgrade to Starter to view and export your full amortization schedule."
          />
        </div>
      ) : debts.length === 0 ? (
        <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-8 text-center">
          <CalendarClock size={28} className="mx-auto text-emerald-400" />
          <h2 className="mt-3 text-lg font-semibold text-white">No debts to schedule yet</h2>
          <p className="mt-1 text-gray-400">
            Add your debts and we will build a full month-by-month payoff schedule you can export.
          </p>
          <a
            href="/debts"
            className="mt-4 inline-block rounded-lg bg-green-500 px-5 py-2 font-medium text-black transition hover:bg-green-600"
          >
            Add debts
          </a>
        </div>
      ) : (
        <AmortizationSchedule debts={debts} />
      )}
    </div>
  )
}
