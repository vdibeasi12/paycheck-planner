"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase"

export default function AddAssetForm({ refresh }: any) {

  const [name, setName] = useState("")
  const [value, setValue] = useState("")

  async function addAsset(e: any) {

    e.preventDefault()

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from("assets").insert({
      user_id: user.id,
      name,
      value
    })

    setName("")
    setValue("")

    refresh()
  }

  return (

    <form
      onSubmit={addAsset}
      className="flex gap-2 mb-4"
    >

      <input
        placeholder="Asset name"
        className="border p-2 rounded w-full"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="Value"
        type="number"
        className="border p-2 rounded w-full"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <button
        className="bg-blue-600 text-white px-4 rounded"
      >
        Add
      </button>

    </form>
  )
}