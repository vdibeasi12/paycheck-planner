import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { earnedFromStats, type Stats } from "@/lib/achievements";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ earned: [], newlyEarned: [] }, { status: 401 });
  }
  const uid = user.id;

  const countOf = async (table: string) => {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid);
    return count || 0;
  };

  const [incomeCount, billsCount, goalsCount] = await Promise.all([
    countOf("income"),
    countOf("bills"),
    countOf("financial_goals"),
  ]);

  // Pull debt balances to derive cleared / debt-free.
  const { data: debtRows } = await supabase
    .from("debts")
    .select("balance")
    .eq("user_id", uid);
  const debts = debtRows || [];
  const debtsCount = debts.length;
  const anyDebtCleared = debts.some((d: any) => Number(d.balance) <= 0);
  const allDebtsCleared = debtsCount > 0 && debts.every((d: any) => Number(d.balance) <= 0);

  const stats: Stats = {
    incomeCount,
    debtsCount,
    billsCount,
    goalsCount,
    anyDebtCleared,
    allDebtsCleared,
  };

  const earned = earnedFromStats(stats);

  const { data: existingRows } = await supabase
    .from("achievements")
    .select("badge_key")
    .eq("user_id", uid);
  const existing = new Set((existingRows || []).map((r: any) => r.badge_key));

  const toInsert = earned.filter((k) => !existing.has(k));
  if (toInsert.length > 0) {
    await supabase
      .from("achievements")
      .insert(toInsert.map((badge_key) => ({ user_id: uid, badge_key })));
  }

  return NextResponse.json({ earned, newlyEarned: toInsert });
}