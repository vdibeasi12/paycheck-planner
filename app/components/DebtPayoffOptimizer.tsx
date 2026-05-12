"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Debt = {
  balance: number;
  interest_rate: number;
  minimum_payment: number;
};

export default function DebtPayoffOptimizer() {
  const [monthsSaved, setMonthsSaved] = useState<number | null>(null);
  const [interestSaved, setInterestSaved] = useState<number | null>(null);

  useEffect(() => {
    optimize();
  }, []);

  async function optimize() {
    const supabase = createClient();

    const { data } = await supabase
      .from("debts")
      .select("balance, interest_rate, minimum_payment");

    if (!data || data.length === 0) {
      return;
    }

    const debts: Debt[] = data.map((d) => ({
      balance: Number(d.balance),
      interest_rate: Number(d.interest_rate),
      minimum_payment: Number(d.minimum_payment),
    }));

    const baseline = simulate(debts, 0);
    const optimized = simulate(debts, 100);

    setMonthsSaved(baseline.months - optimized.months);
    setInterestSaved(Math.round(baseline.interest - optimized.interest));
  }

  function simulate(debts: Debt[], extraPayment: number) {
    let balances = debts.map((d) => d.balance);
    const rates = debts.map((d) => d.interest_rate);
    const payments = debts.map((d) => d.minimum_payment);

    let months = 0;
    let interestPaid = 0;

    while (balances.some((b) => b > 0) && months < 600) {
      balances = balances.map((balance, i) => {
        if (balance <= 0) return 0;

        const interest = balance * (rates[i] / 100 / 12);
        interestPaid += interest;

        let payment = payments[i];

        if (i === 0) {
          payment += extraPayment;
        }

        const newBalance = balance + interest - payment;

        return newBalance > 0 ? newBalance : 0;
      });

      months++;
    }

    return { months, interest: interestPaid };
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold mb-3">
        Debt Payoff Optimizer
      </h3>

      {monthsSaved === null ? (
        <p className="text-gray-600">
          Add debts to analyze payoff strategies.
        </p>
      ) : (
        <>
          <p className="text-gray-700">
            Pay an extra <strong>$100/month</strong> toward your highest
            interest debt.
          </p>

          <p className="mt-3 text-green-600 font-semibold">
            {monthsSaved} months faster payoff
          </p>

          <p className="text-green-600">
            ${interestSaved?.toLocaleString()} interest saved
          </p>
        </>
      )}
    </div>
  );
}