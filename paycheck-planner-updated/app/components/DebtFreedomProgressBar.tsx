"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function DebtFreedomProgressBar() {
  const [totalDebt, setTotalDebt] = useState<number>(0);
  const [remainingDebt, setRemainingDebt] = useState<number>(0);

  useEffect(() => {
    loadDebts();
  }, []);

  async function loadDebts() {
    const supabase = createClient();

    const { data } = await supabase
      .from("debts")
      .select("balance");

    const total =
      data?.reduce((sum, d) => sum + Number(d.balance), 0) ?? 0;

    // For now remaining = total
    // Later we track original balances
    setTotalDebt(total);
    setRemainingDebt(total);
  }

  const paid = totalDebt - remainingDebt;
  const progress =
    totalDebt > 0 ? Math.round((paid / totalDebt) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold mb-4">
        Debt Freedom Progress
      </h3>

      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-green-500 h-4 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 text-sm text-gray-600">
        {progress}% of debt paid
      </div>
    </div>
  );
}