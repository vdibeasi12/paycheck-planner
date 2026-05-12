"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Debt = {
  name: string;
  balance: number;
  interest_rate: number;
  minimum_payment: number;
};

export default function AIDebtStrategyAdvisor() {
  const [strategy, setStrategy] = useState<string>("Analyzing debts...");

  useEffect(() => {
    analyzeDebts();
  }, []);

  async function analyzeDebts() {
    const supabase = createClient();

    const { data } = await supabase
      .from("debts")
      .select("name, balance, interest_rate, minimum_payment");

    if (!data || data.length === 0) {
      setStrategy("Add debts to receive AI payoff guidance.");
      return;
    }

    const debts: Debt[] = data.map((d) => ({
      name: d.name,
      balance: Number(d.balance),
      interest_rate: Number(d.interest_rate),
      minimum_payment: Number(d.minimum_payment),
    }));

    const highestInterest = debts.sort(
      (a, b) => b.interest_rate - a.interest_rate
    )[0];

    const monthlyInterest =
      highestInterest.balance *
      (highestInterest.interest_rate / 100 / 12);

    const suggestion =
      monthlyInterest > highestInterest.minimum_payment * 0.5
        ? `Focus on "${highestInterest.name}". Its ${highestInterest.interest_rate}% interest is costing you the most each month.`
        : `Start with "${highestInterest.name}" to accelerate your payoff strategy.`;

    setStrategy(suggestion);
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold mb-3">
        AI Debt Strategy Advisor
      </h3>

      <p className="text-gray-700">
        {strategy}
      </p>
    </div>
  );
}