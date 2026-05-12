"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Debt = {
id: string
name: string
balance: number
interest_rate: number
minimum_payment: number
}

export default function AIDebtAttackPlan() {
const [debts, setDebts] = useState<Debt[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
loadDebts()
}, [])

async function loadDebts() {
setLoading(true)

```
const { data, error } = await supabase
  .from("debts")
  .select("*")

if (!error && data) {
  const ordered = [...data].sort(
    (a, b) => b.interest_rate - a.interest_rate
  )

  setDebts(ordered)
}

setLoading(false)
```

}

if (loading) {
return ( <div className="bg-white rounded-xl shadow p-6"> <p className="text-gray-500">
AI analyzing optimal payoff order... </p> </div>
)
}

if (!debts.length) {
return ( <div className="bg-white rounded-xl shadow p-6"> <p className="text-gray-500">
Add debts to generate your attack plan. </p> </div>
)
}

return ( <div className="bg-white rounded-xl shadow p-6 space-y-4">

```
  <h2 className="text-xl font-semibold">
    AI Debt Attack Plan
  </h2>

  <div className="space-y-3">

    {debts.map((debt, index) => (
      <div
        key={debt.id}
        className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
      >

        <div className="flex items-center space-x-4">

          <div className="text-lg font-bold text-blue-600">
            #{index + 1}
          </div>

          <div>
            <p className="font-semibold">
              {debt.name}
            </p>

            <p className="text-sm text-gray-500">
              {debt.interest_rate}% interest
            </p>
          </div>

        </div>

        <div className="text-right">

          <p className="font-semibold">
            ${Number(debt.balance).toFixed(0)}
          </p>

          <p className="text-sm text-gray-500">
            balance
          </p>

        </div>

      </div>
    ))}

  </div>

  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">

    <p className="text-sm text-gray-700">
      Your debts are ordered using the avalanche strategy —
      highest interest first — which minimizes total interest
      and accelerates payoff.
    </p>

  </div>

</div>
```

)
}
