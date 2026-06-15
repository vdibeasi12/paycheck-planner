"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function DebtFreedomCountdown() {
  const [monthsRemaining, setMonthsRemaining] = useState<number | null>(null);

  useEffect(() => {
    calculateCountdown();
  }, []);

  async function calculateCountdown() {
    const supabase = createClient();

    const { data } = await supabase
      .from("debts")
      .select("balance, interest_rate, minimum_payment");

    if (!data || data.length === 0) {
      setMonthsRemaining(null);
      return;
    }

    let balances = data.map((d) => Number(d.balance));
    const interestRates = data.map((d) => Number(d.interest_rate));
    const payments = data.map((d) => Number(d.minimum_payment));

    let months = 0;

    while (balances.some((b) => b > 0) && months < 600) {
      balances = balances.map((balance, i) => {
        if (balance <= 0) return 0;

        const interest = balance * (interestRates[i] / 100 / 12);
        const payment = payments[i];

        const newBalance = balance + interest - payment;

        return newBalance > 0 ? newBalance : 0;
      });

      months++;
    }

    setMonthsRemaining(months);
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold mb-3">
        Debt Freedom Countdown
      </h3>

      {monthsRemaining === null ? (
        <p className="text-gray-600">
          Add debts to estimate your payoff timeline.
        </p>
      ) : (
        <p className="text-2xl font-bold">
          {monthsRemaining} months remaining
        </p>
      )}
    </div>
  );
}