"use client"

import { useState } from "react"

export interface Debt {
  id: number
  name: string
  balance: number
  interest: number
  minimum: number
}

interface Props {
  debts?: Debt[]
}

export default function DebtTable({ debts = [] }: Props) {

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editedDebt, setEditedDebt] = useState<Debt | null>(null)

  const deleteDebt = (id: number) => {

    const stored = localStorage.getItem("debts")
    if (!stored) return

    const current = JSON.parse(stored)
    const updated = current.filter((d: Debt) => d.id !== id)

    localStorage.setItem("debts", JSON.stringify(updated))

    window.location.reload()
  }

  const startEdit = (debt: Debt) => {
    setEditingId(debt.id)
    setEditedDebt({ ...debt })
  }

  const saveEdit = () => {

    const stored = localStorage.getItem("debts")
    if (!stored || !editedDebt) return

    const current = JSON.parse(stored)

    const updated = current.map((d: Debt) =>
      d.id === editedDebt.id ? editedDebt : d
    )

    localStorage.setItem("debts", JSON.stringify(updated))

    setEditingId(null)
    setEditedDebt(null)

    window.location.reload()
  }

  const handleChange = (
    field: keyof Debt,
    value: string | number
  ) => {

    if (!editedDebt) return

    setEditedDebt({
      ...editedDebt,
      [field]: value
    })
  }

  if (debts.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow">
        <p className="text-gray-500">
          No debts added yet.
        </p>
      </div>
    )
  }

  return (

    <div className="bg-white p-6 rounded-xl shadow overflow-x-auto">

      <h2 className="text-xl font-semibold mb-4">
        Your Debts
      </h2>

      <table className="w-full text-left">

        <thead>
          <tr className="border-b">
            <th className="py-2">Debt</th>
            <th>Balance</th>
            <th>Interest %</th>
            <th>Minimum</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          {debts.map((debt) => {

            const isEditing = editingId === debt.id

            return (

              <tr key={debt.id} className="border-b">

                <td className="py-3">
                  {isEditing ? (
                    <input
                      className="border px-2 py-1 rounded"
                      value={editedDebt?.name}
                      onChange={(e) =>
                        handleChange("name", e.target.value)
                      }
                    />
                  ) : (
                    debt.name
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      className="border px-2 py-1 rounded"
                      value={editedDebt?.balance}
                      onChange={(e) =>
                        handleChange(
                          "balance",
                          Number(e.target.value)
                        )
                      }
                    />
                  ) : (
                    `$${debt.balance.toLocaleString()}`
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      className="border px-2 py-1 rounded"
                      value={editedDebt?.interest}
                      onChange={(e) =>
                        handleChange(
                          "interest",
                          Number(e.target.value)
                        )
                      }
                    />
                  ) : (
                    `${debt.interest}%`
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      className="border px-2 py-1 rounded"
                      value={editedDebt?.minimum}
                      onChange={(e) =>
                        handleChange(
                          "minimum",
                          Number(e.target.value)
                        )
                      }
                    />
                  ) : (
                    `$${debt.minimum}`
                  )}
                </td>

                <td className="flex gap-2 py-3">

                  {isEditing ? (
                    <>
                      <button
                        onClick={saveEdit}
                        className="bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Save
                      </button>

                      <button
                        onClick={() => setEditingId(null)}
                        className="border px-3 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(debt)}
                        className="bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteDebt(debt.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </>
                  )}

                </td>

              </tr>

            )

          })}

        </tbody>

      </table>

    </div>

  )
}