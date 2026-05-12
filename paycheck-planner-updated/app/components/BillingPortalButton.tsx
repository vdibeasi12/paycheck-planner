"use client"

import { useState } from "react"

export default function BillingPortalButton() {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    try {
      setLoading(true)

      const res = await fetch("/api/portal", {
        method: "POST",
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert("Unable to open billing portal")
      }
    } catch (err) {
      console.error(err)
      alert("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg text-sm"
      disabled={loading}
    >
      {loading ? "Loading..." : "Manage Billing"}
    </button>
  )
}