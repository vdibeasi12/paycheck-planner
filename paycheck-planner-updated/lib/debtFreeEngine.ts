type Debt = {
  name: string
  balance: number
  interest_rate: number
  minimum_payment: number
}

type Result = {
  months: number
  totalInterest: number
}

function simulatePayoff(debts: Debt[]): Result {
  let months = 0
  let totalInterest = 0

  // Deep copy (safe)
  let workingDebts = debts.map((d) => ({
    ...d,
    balance: Number(d.balance || 0),
    rate: Number(d.interest_rate || 0) / 100 / 12,
    payment: Number(d.minimum_payment || 0),
  }))

  while (workingDebts.some((d) => d.balance > 0) && months < 600) {
    months++

    // Apply interest
    workingDebts.forEach((d) => {
      if (d.balance > 0) {
        const interest = d.balance * d.rate
        d.balance += interest
        totalInterest += interest
      }
    })

    // Apply payments
    workingDebts.forEach((d) => {
      if (d.balance > 0) {
        const payment = Math.min(d.payment, d.balance)
        d.balance -= payment
      }
    })
  }

  return { months, totalInterest }
}

function simulateAvalanche(debts: Debt[]): Result {
  let months = 0
  let totalInterest = 0

  let workingDebts = debts
    .map((d) => ({
      ...d,
      balance: Number(d.balance || 0),
      rate: Number(d.interest_rate || 0) / 100 / 12,
      payment: Number(d.minimum_payment || 0),
    }))
    .sort((a, b) => b.rate - a.rate)

  const totalPayment = workingDebts.reduce((sum, d) => sum + d.payment, 0)

  while (workingDebts.some((d) => d.balance > 0) && months < 600) {
    months++

    // Apply interest
    workingDebts.forEach((d) => {
      if (d.balance > 0) {
        const interest = d.balance * d.rate
        d.balance += interest
        totalInterest += interest
      }
    })

    let remainingPayment = totalPayment

    for (let d of workingDebts) {
      if (d.balance <= 0) continue

      const payment = Math.min(remainingPayment, d.balance)
      d.balance -= payment
      remainingPayment -= payment

      if (remainingPayment <= 0) break
    }
  }

  return { months, totalInterest }
}

function addMonthsToDate(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() + months)

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  })
}

export function calculateDebtFreePlan(debts: Debt[]) {
  if (!debts || debts.length === 0) {
    return null
  }

  const current = simulatePayoff(debts)
  const optimized = simulateAvalanche(debts)

  return {
    currentMonths: current.months,
    optimizedMonths: optimized.months,
    monthsSaved: current.months - optimized.months,

    currentInterest: current.totalInterest,
    optimizedInterest: optimized.totalInterest,
    interestSaved: current.totalInterest - optimized.totalInterest,

    currentDate: addMonthsToDate(current.months),
    optimizedDate: addMonthsToDate(optimized.months),
  }
}