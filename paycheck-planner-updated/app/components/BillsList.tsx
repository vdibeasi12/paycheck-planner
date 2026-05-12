"use client"

import { safeArray } from "@/lib/safeArray"

type Bill = {
  id: string
  name: string
  amount: number
  due_day: number
}

type Props = {
  bills?: Bill[] | null
}

export default function BillsList({ bills }: Props) {
  const safeBills = safeArray(bills)

  if (safeBills.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold mb-2">Bills</h2>
        <p className="text-gray-500">No bills added yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="font-semibold mb-4">Bills</h2>

      <div className="space-y-3">
        {safeBills.map((bill) => (
          <div
            key={bill.id}
            className="flex justify-between items-center border-b pb-2"
          >
            <div>
              <p className="font-medium">{bill.name}</p>
              <p className="text-sm text-gray-500">
                Due day: {bill.due_day}
              </p>
            </div>

            <p className="font-semibold">
              ${bill.amount.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}