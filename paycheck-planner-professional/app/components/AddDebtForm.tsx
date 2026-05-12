"use client"

import { useState } from "react"

interface Debt {
  id: number
  name: string
  balance: number
  interest: number
  minimum: number
}

interface Props {
  addDebt: (debt: Debt) => void
}

export default function AddDebtForm({ addDebt }: Props) {

  const [name,setName] = useState("")
  const [balance,setBalance] = useState("")
  const [interest,setInterest] = useState("")
  const [minimum,setMinimum] = useState("")

  const handleSubmit = (e:any) => {

    e.preventDefault()

    if(!name || !balance || !interest || !minimum){
      return
    }

    const newDebt:Debt = {
      id: Date.now(),
      name,
      balance: Number(balance),
      interest: Number(interest),
      minimum: Number(minimum)
    }

    addDebt(newDebt)

    setName("")
    setBalance("")
    setInterest("")
    setMinimum("")
  }

  return (

    <div className="bg-white p-6 rounded-xl shadow">

      <h2 className="text-xl font-semibold mb-4">
        Add Debt
      </h2>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">

        <input
          placeholder="Debt Name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Balance"
          value={balance}
          onChange={(e)=>setBalance(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Interest %"
          value={interest}
          onChange={(e)=>setInterest(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Minimum Payment"
          value={minimum}
          onChange={(e)=>setMinimum(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded col-span-full md:col-span-1"
        >
          Add
        </button>

      </form>

    </div>

  )
}