"use client"

import { useEffect, useState } from "react"

export default function AdminPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/metrics")
      const json = await res.json()
      setData(json)
    }

    load()
  }, [])

  if (!data) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">SaaS Metrics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="bg-white p-4 rounded shadow">
          <p>MRR</p>
          <h2>${data.mrr}</h2>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p>Active</p>
          <h2>{data.activeUsers}</h2>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p>Churned</p>
          <h2>{data.churnedUsers}</h2>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p>LTV</p>
          <h2>${data.ltv}</h2>
        </div>

      </div>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="mb-2 font-semibold">Cohorts</h2>

        {Object.entries(data.cohorts).map(([month, count]) => (
          <p key={month}>
            {month}: {count} users
          </p>
        ))}
      </div>
    </div>
  )
}