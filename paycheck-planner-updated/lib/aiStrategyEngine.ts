"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { generateAIStrategy } from "@/lib/aiStrategyEngine"

type Debt = {
id: string
name: string
balance: number
interest_rate: number
minimum_payment: number
}

type Strategy = {
recommendedDebt: string
recommendedExtraPayment: number
monthsSaved: number
interestSaved: number
explanation: string
}

export default function AIPayoffStrategy() {
const [debts, setDebts] = useState<Debt[]>([])
const [strategy, setStrategy] = useState<Strategy | null>(null)
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
  setDebts(data)

  const result = generateAIStrategy(data)

  if (result) {
    setStrategy(result)
  }
}

setLoading(false)
```

}

if (loading) {
return ( <div className="bg-white rounded-xl shadow p-6"> <p className="text-gray-500">Analyzing your debts...</p> </div>
)
}

if (!strategy) {
return ( <div className="bg-white rounded-xl shadow p-6"> <p className="text-gray-500">Add debts to receive AI strategy.</p> </div>
)
}

return ( <div className="bg-white rounded-xl shadow p-6 space-y-4">

```
  <h2 className="text-xl font-semibold">
    AI Payoff Strategy
  </h2>

  <div className="grid grid-cols-2 gap-4">

    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-500">
        Attack This Debt
      </p>
      <p className="text-lg font-semibold">
        {strategy.recommendedDebt}
      </p>
    </div>

    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-500">
        Extra Payment
      </p>
      <p className="text-lg font-semibold">
        ${strategy.recommendedExtraPayment}/mo
      </p>
    </div>

    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-500">
        Months Saved
      </p>
      <p className="text-lg font-semibold">
        {strategy.monthsSaved}
      </p>
    </div>

    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-500">
        Interest Saved
      </p>
      <p className="text-lg font-semibold">
        ${strategy.interestSaved.toFixed(0)}
      </p>
    </div>

  </div>

  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <p className="text-sm text-gray-700">
      {strategy.explanation}
    </p>
  </div>

</div>
```

)
}
