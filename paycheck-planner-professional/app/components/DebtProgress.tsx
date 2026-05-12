interface Debt {
  id: string
  name: string
  balance: number
  interest: number
  minimum: number
}

interface Props {
  debts: Debt[]
}

export default function DebtProgress({ debts }: Props) {

  if (!debts || debts.length === 0) {
    return null
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)

  const percentPaid = 0

  return (

    <div className="bg-white p-6 rounded-xl shadow">

      <h2 className="text-lg font-semibold mb-4">
        Debt Progress
      </h2>

      <div className="w-full bg-gray-200 rounded-full h-6">

        <div
          className="bg-green-600 h-6 rounded-full text-white text-sm flex items-center justify-center"
          style={{ width: `${percentPaid}%` }}
        >
          {percentPaid}%
        </div>

      </div>

      <p className="text-sm text-gray-500 mt-2">
        Remaining Debt: ${totalDebt.toLocaleString()}
      </p>

    </div>

  )

}