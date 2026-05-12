"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Debt = {
  balance: number;
  interest_rate: number;
  minimum_payment: number;
};

export default function DebtScenarioSimulator() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    loadDebts();
  }, []);

  async function loadDebts() {
    const supabase = createClient();

    const { data } = await supabase
      .from("debts")
      .select("balance, interest_rate, minimum_payment");

    if (!data) return;

    const formatted: Debt[] = data.map((d) => ({
      balance: Number(d.balance),
      interest_rate: Number(d.interest_rate),
      minimum_payment: Number(d.minimum_payment),
    }));

    setDebts(formatted);
  }

  function simulate(extraPayment: number) {
    if (debts.length === 0) return;

    let balances = debts.map((d) => d.balance);
    const rates = debts.map((d) => d.interest_rate);
    const payments = debts.map((d) => d.minimum_payment);

    let months = 0;

    while (balances.some((b) => b > 0) && months < 600) {
      balances = balances.map((balance, i) => {
        if (balance <= 0) return 0;

        const interest = balance * (rates[i] / 100 / 12);

        let payment = payments[i];

        if (i === 0) {
          payment += extraPayment;
        }

        const newBalance = balance + interest - payment;

        return newBalance > 0 ? newBalance : 0;
      });

      months++;
    }

    setResult(months);
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">

      <h3 className="text-lg font-semibold mb-4">
        Debt Scenario Simulator
      </h3>

      <div className="flex gap-3 flex-wrap mb-4">

        <button
          className="px-4 py-2 bg-gray-200 rounded"
          onClick={() => simulate(50)}
        >
          +$50
        </button>

        <button
          className="px-4 py-2 bg-gray-200 rounded"
          onClick={() => simulate(100)}
        >
          +$100
        </button>

        <button
          className="px-4 py-2 bg-gray-200 rounded"
          onClick={() => simulate(250)}
        >
          +$250
        </button>

        <button
          className="px-4 py-2 bg-gray-200 rounded"
          onClick={() => simulate(500)}
        >
          +$500
        </button>

      </div>

      {result && (
        <p className="text-gray-700">
          Debt free in <strong>{result} months</strong>
        </p>
      )}

    </div>
  );
}