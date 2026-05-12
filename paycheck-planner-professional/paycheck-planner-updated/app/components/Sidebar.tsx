"use client"

import Link from "next/link"

export default function Sidebar() {

  return (

    <div className="w-64 bg-white border-r min-h-screen p-6">

      <h1 className="text-2xl font-bold mb-8">
        Paycheck Planner
      </h1>

      <nav className="space-y-4">

        <Link href="/dashboard" className="block text-gray-700 hover:text-blue-600">
          Dashboard
        </Link>

        <Link href="/debts" className="block text-gray-700 hover:text-blue-600">
          Debts
        </Link>

        <Link href="/analytics" className="block text-gray-700 hover:text-blue-600">
          Analytics
        </Link>

        <Link href="/disclaimer" className="block text-gray-700 hover:text-blue-600">
          Disclaimer
        </Link>

      </nav>

    </div>

  )
}