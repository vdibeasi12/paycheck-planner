import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ConnectedBankAccounts from "@/components/ConnectedBankAccounts"
import { CreditCard } from "lucide-react"

export default async function BankAccountsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <CreditCard size={28} className="text-emerald-500" />
        <div>
          <h1 className="text-3xl font-bold text-white">Credit Cards</h1>
          <p className="mt-1 text-gray-400">
            Connect a credit card to track its balance automatically.
          </p>
        </div>
      </div>

      <ConnectedBankAccounts />
    </div>
  )
}