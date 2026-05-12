export interface Debt {
  id: string
  name: string
  balance: number
  interest: number
  minimum: number
}

export function calculateStrategy(
  debts: Debt[],
  strategy: "snowball" | "avalanche"
) {

  if (!debts) return []

  const sorted = [...debts]

  if (strategy === "snowball") {
    sorted.sort((a, b) => a.balance - b.balance)
  }

  if (strategy === "avalanche") {
    sorted.sort((a, b) => b.interest - a.interest)
  }

  return sorted
}