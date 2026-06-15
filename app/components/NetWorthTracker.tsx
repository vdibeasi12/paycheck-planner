"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function NetWorthTracker() {
  const [netWorth, setNetWorth] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();

    const { data: assets } = await supabase
      .from("assets")
      .select("value");

    const { data: debts } = await supabase
      .from("debts")
      .select("balance");

    const totalAssets =
      assets?.reduce((sum, item) => sum + Number(item.value), 0) ?? 0;

    const totalDebts =
      debts?.reduce((sum, item) => sum + Number(item.balance), 0) ?? 0;

    setNetWorth(totalAssets - totalDebts);
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold mb-2">
        Net Worth
      </h3>

      <p className="text-2xl font-bold">
        ${netWorth.toLocaleString()}
      </p>
    </div>
  );
}