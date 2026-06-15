"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { PieCard, type Slice } from "./PieCard";

export default function SpendingPieChart() {
  const [data, setData] = useState<Slice[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("bills").select("category, amount");
      const totals: Record<string, number> = {};
      (data || []).forEach((b) => {
        const key = b.category || "Other";
        totals[key] = (totals[key] || 0) + Number(b.amount || 0);
      });
      setData(Object.entries(totals).map(([name, value]) => ({ name, value })));
    })();
  }, []);

  return (
    <PieCard title="Bills by category" data={data} emptyHint="Add bills to see where money goes." />
  );
}
