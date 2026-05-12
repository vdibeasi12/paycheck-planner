import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const debts = body.debts || []

    if (!debts || debts.length === 0) {
      return NextResponse.json({
        advice: "Add debts to receive financial insights.",
      })
    }

    const totalDebt = debts.reduce(
      (sum: number, d: any) => sum + Number(d.balance || 0),
      0
    )

    const avgInterest =
      debts.reduce(
        (sum: number, d: any) =>
          sum + Number(d.interest_rate || 0),
        0
      ) / debts.length

    // 🔥 SIMPLE AI LOGIC (fast + reliable)
    let advice = ""

    if (avgInterest > 15) {
      advice =
        "Your average interest rate is high. Focus on paying off high-interest debt first (avalanche method) to save money."
    } else {
      advice =
        "Your interest rates are manageable. Consider the snowball method to build momentum and stay motivated."
    }

    if (totalDebt > 20000) {
      advice +=
        " You have a large debt load. Increasing monthly payments slightly can significantly reduce payoff time."
    }

    return NextResponse.json({ advice })

  } catch (err) {
    console.error("AI error:", err)

    return NextResponse.json({
      advice: "Unable to generate advice right now.",
    })
  }
}