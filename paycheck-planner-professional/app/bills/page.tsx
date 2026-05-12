"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function BillsPage() {

  const [bills, setBills] = useState([])
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDay, setDueDay] = useState("")

  async function loadBills() {
    const { data } = await supabase.from("bills").select("*")
    if (data) setBills(data)
  }

  useEffect(() => {
    loadBills()
  }, [])

  async function addBill() {

    const { data: user } = await supabase.auth.getUser()

    await supabase.from("bills").insert({
      user_id: user.user.id,
      name,
      amount: Number(amount),
      due_day: Number(dueDay)
    })

    setName("")
    setAmount("")
    setDueDay("")

    loadBills()
  }

  async function deleteBill(id:any) {

    await supabase
      .from("bills")
      .delete()
      .eq("id", id)

    loadBills()
  }

  return (

    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Manage Bills
      </h1>

      <div className="space-y-2 mb-10">

        <input
          placeholder="Bill Name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          className="border p-2 w-full"
        />

        <input
          placeholder="Amount"
          value={amount}
          onChange={(e)=>setAmount(e.target.value)}
          className="border p-2 w-full"
        />

        <input
          placeholder="Due Day (1-31)"
          value={dueDay}
          onChange={(e)=>setDueDay(e.target.value)}
          className="border p-2 w-full"
        />

        <button
          onClick={addBill}
          className="bg-blue-600 text-white px-4 py-2"
        >
          Add Bill
        </button>

      </div>

      <h2 className="text-xl font-bold mb-4">
        Your Bills
      </h2>

      {bills.map((bill:any)=>(
        <div
          key={bill.id}
          className="flex justify-between border-b py-2"
        >

          <div>

            <div className="font-semibold">
              {bill.name}
            </div>

            <div>
              ${bill.amount} • Due Day {bill.due_day}
            </div>

          </div>

          <button
            onClick={()=>deleteBill(bill.id)}
            className="text-red-600"
          >
            Delete
          </button>

        </div>
      ))}

    </div>

  )
}