"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { PieCard, type Slice } from "./PieCard";

export default function DebtPieChart() {
  const [data, setData] = useState<Slice[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("debts").select("name, balance, status");
      const slices = (data || [])
        .filter((d) => Number(d.balance) > 0 && d.status !== "paid_off")
        .map((d) => ({ name: d.name || "Debt", value: Number(d.balance) }));
      setData(slices);
    })();
  }, []);

  return <PieCard title="Debt by balance" data={data} emptyHint="Add debts to see the breakdown." />;
}
