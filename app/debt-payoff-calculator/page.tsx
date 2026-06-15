'use client'

import { useState } from 'react'
import { Plus, Trash2, Download, BarChart3 } from 'lucide-react'
import Link from 'next/link'

interface Debt {
  id: string
  name: string
  balance: number
  interestRate: number
  minimumPayment: number
}

interface PayoffResult {
  strategy: 'snowball' | 'avalanche'
  monthsToPayoff: number
  totalInterestPaid: number
  monthlyTimeline: Array<{
    month: number
    remainingBalance: number
    interest: number
    principal: number
  }>
}

export default function DebtPayoffCalculator() {
  const [debts, setDebts] = useState<Debt[]>([
    { id: '1', name: 'Credit Card', balance: 5000, interestRate: 18.5, minimumPayment: 150 },
  ])
  const [extraPayment, setExtraPayment] = useState(0)
  const [snowballResult, setSnowballResult] = useState<PayoffResult | null>(null)
  const [avalancheResult, setAvalancheResult] = useState<PayoffResult | null>(null)

  // Calculate payoff timeline
  const calculatePayoff = (strategy: 'snowball' | 'avalanche'): PayoffResult => {
    const workingDebts = debts.map(d => ({ ...d }))
    
    // Sort based on strategy
    if (strategy === 'snowball') {
      workingDebts.sort((a, b) => a.balance - b.balance)
    } else {
      workingDebts.sort((a, b) => b.interestRate - a.interestRate)
    }

    const timeline: PayoffResult['monthlyTimeline'] = []
    let month = 0
    let totalInterestPaid = 0

    while (workingDebts.some(d => d.balance > 0) && month < 600) {
      month++
      let extraPaymentThisMonth = extraPayment

      // Calculate interest and apply payments
      workingDebts.forEach((debt, index) => {
        if (debt.balance <= 0) return

        const monthlyInterest = (debt.balance * (debt.interestRate / 100)) / 12
        debt.balance += monthlyInterest
        totalInterestPaid += monthlyInterest

        let payment = debt.minimumPayment
        if (index === 0) {
          payment += extraPaymentThisMonth
          extraPaymentThisMonth = 0
        }

        debt.balance -= payment
        if (debt.balance < 0) {
          debt.balance = 0
        }
      })

      const totalRemaining = workingDebts.reduce((sum, d) => sum + d.balance, 0)
      timeline.push({
        month,
        remainingBalance: totalRemaining,
        interest: 0,
        principal: 0,
      })
    }

    return {
      strategy,
      monthsToPayoff: month,
      totalInterestPaid,
      monthlyTimeline: timeline,
    }
  }

  const handleCalculate = () => {
    const snowball = calculatePayoff('snowball')
    const avalanche = calculatePayoff('avalanche')
    setSnowballResult(snowball)
    setAvalancheResult(avalanche)
  }

  const handleAddDebt = () => {
    setDebts([
      ...debts,
      {
        id: Date.now().toString(),
        name: 'New Debt',
        balance: 1000,
        interestRate: 10,
        minimumPayment: 100,
      },
    ])
  }

  const handleDeleteDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id))
  }

  const handleUpdateDebt = (id: string, field: keyof Debt, value: any) => {
    setDebts(debts.map(d => (d.id === id ? { ...d, [field]: value } : d)))
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const totalMinimum = debts.reduce((sum, d) => sum + d.minimumPayment, 0)

  const downloadResults = () => {
    if (!snowballResult || !avalancheResult) return

    const csv = `Debt Payoff Comparison Report
Generated: ${new Date().toLocaleDateString()}

SNOWBALL STRATEGY (Pay smallest balance first):
Months to Debt Freedom: ${snowballResult.monthsToPayoff}
Total Interest Paid: $${snowballResult.totalInterestPaid.toFixed(2)}
Monthly Payments: $${(totalMinimum + extraPayment).toFixed(2)}

AVALANCHE STRATEGY (Pay highest interest first):
Months to Debt Freedom: ${avalancheResult.monthsToPayoff}
Total Interest Paid: $${avalancheResult.totalInterestPaid.toFixed(2)}
Monthly Payments: $${(totalMinimum + extraPayment).toFixed(2)}

SAVINGS WITH ${avalancheResult.totalInterestPaid < snowballResult.totalInterestPaid ? 'AVALANCHE' : 'SNOWBALL'}:
Interest Saved: $${Math.abs(snowballResult.totalInterestPaid - avalancheResult.totalInterestPaid).toFixed(2)}
Time Saved: ${Math.abs(snowballResult.monthsToPayoff - avalancheResult.monthsToPayoff)} months

DEBTS:
${debts.map(d => `${d.name}: $${d.balance.toFixed(2)} @ ${d.interestRate}% APR`).join('\n')}

Extra Monthly Payment: $${extraPayment.toFixed(2)}
`

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv))
    element.setAttribute('download', 'debt-payoff-comparison.csv')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="text-green-500" size={32} />
            <h1 className="text-4xl font-bold">Debt Payoff Calculator</h1>
          </div>
          <p className="text-gray-300">
            Compare Snowball vs Avalanche strategies to find your fastest path to debt freedom
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6 sticky top-6">
              <h2 className="text-2xl font-bold mb-6">Your Debts</h2>

              {/* Debt List */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {debts.map((debt) => (
                  <div key={debt.id} className="bg-[#1a233a] p-4 rounded-lg border border-gray-700">
                    <input
                      type="text"
                      value={debt.name}
                      onChange={(e) => handleUpdateDebt(debt.id, 'name', e.target.value)}
                      className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 mb-2 text-white text-sm"
                      placeholder="Debt name"
                    />
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <label className="text-gray-400">Balance</label>
                        <input
                          type="number"
                          value={debt.balance}
                          onChange={(e) => handleUpdateDebt(debt.id, 'balance', Number(e.target.value))}
                          className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="text-gray-400">Interest Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={debt.interestRate}
                          onChange={(e) => handleUpdateDebt(debt.id, 'interestRate', Number(e.target.value))}
                          className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="text-gray-400">Minimum Payment</label>
                        <input
                          type="number"
                          value={debt.minimumPayment}
                          onChange={(e) => handleUpdateDebt(debt.id, 'minimumPayment', Number(e.target.value))}
                          className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-white"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="w-full mt-2 text-red-400 hover:text-red-300 transition text-sm flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Debt Button */}
              <button
                onClick={handleAddDebt}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg transition mb-6 flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Add Debt
              </button>

              {/* Extra Payment */}
              <div className="bg-[#1a233a] p-4 rounded-lg border border-gray-700 mb-6">
                <label className="text-gray-400 text-sm">Extra Monthly Payment</label>
                <input
                  type="number"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(Number(e.target.value))}
                  className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-white mt-1"
                />
                <p className="text-gray-500 text-xs mt-2">Amount above minimum payments</p>
              </div>

              {/* Calculate Button */}
              <button
                onClick={handleCalculate}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition"
              >
                Calculate Payoff Plans
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {snowballResult && avalancheResult ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
                  <h3 className="text-2xl font-bold mb-6">Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Total Debt</p>
                      <p className="text-2xl font-bold text-green-400">${totalDebt.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Monthly Payment</p>
                      <p className="text-2xl font-bold text-blue-400">${(totalMinimum + extraPayment).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Snowball Strategy */}
                <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-orange-400">🎾 Snowball Strategy</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Pay off smallest balance first for quick wins
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Debt Freedom In</p>
                      <p className="text-3xl font-bold text-orange-400">
                        {snowballResult.monthsToPayoff} months
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        (~{(snowballResult.monthsToPayoff / 12).toFixed(1)} years)
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Interest Paid</p>
                      <p className="text-3xl font-bold text-orange-400">
                        ${snowballResult.totalInterestPaid.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Avalanche Strategy */}
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-blue-400">⚡ Avalanche Strategy</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Pay off highest interest first to save money
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Debt Freedom In</p>
                      <p className="text-3xl font-bold text-blue-400">
                        {avalancheResult.monthsToPayoff} months
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        (~{(avalancheResult.monthsToPayoff / 12).toFixed(1)} years)
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Interest Paid</p>
                      <p className="text-3xl font-bold text-blue-400">
                        ${avalancheResult.totalInterestPaid.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comparison */}
                <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Comparison</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Time Difference</span>
                      <span className="font-bold text-green-400">
                        {Math.abs(snowballResult.monthsToPayoff - avalancheResult.monthsToPayoff)} months
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Interest Savings</span>
                      <span className="font-bold text-green-400">
                        ${Math.abs(snowballResult.totalInterestPaid - avalancheResult.totalInterestPaid).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Better Strategy</span>
                      <span className="font-bold">
                        {avalancheResult.totalInterestPaid < snowballResult.totalInterestPaid ? (
                          <span className="text-blue-400">⚡ Avalanche</span>
                        ) : (
                          <span className="text-orange-400">🎾 Snowball</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Export Button */}
                <button
                  onClick={downloadResults}
                  className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Download size={20} /> Download Comparison Report
                </button>
              </div>
            ) : (
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-12 text-center">
                <BarChart3 className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">
                  Enter your debts and click "Calculate Payoff Plans" to see results
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-[#0f172a] border border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Which Strategy is Right for You?</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-orange-400 mb-2">🎾 Choose Snowball if:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>✓ You need motivation from quick wins</li>
                <li>✓ You want psychological momentum</li>
                <li>✓ You have many small debts</li>
                <li>✓ You struggle with motivation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">⚡ Choose Avalanche if:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>✓ You want to save the most money</li>
                <li>✓ You have high-interest debts</li>
                <li>✓ You're mathematically motivated</li>
                <li>✓ Long-term savings matter to you</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
