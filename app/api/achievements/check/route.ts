import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { earnedFromStats, BADGES, type Stats, type Badge } from "@/lib/achievements";
import { resend } from "@/lib/email";
import { badgeEarnedHtml, badgeEarnedSubject } from "@/lib/badgeEmail";

const badgeByKey = (k: string): Badge | undefined => BADGES.find((b) => b.key === k);

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

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

  // Pull debt balances to derive cleared / debt-free / halfway_there.
  const { data: debtRows } = await supabase
    .from("debts")
    .select("balance, original_balance")
    .eq("user_id", uid);
  const debts = debtRows || [];
  const debtsCount = debts.length;
  const anyDebtCleared = debts.some((d: any) => Number(d.balance) <= 0);
  const allDebtsCleared = debtsCount > 0 && debts.every((d: any) => Number(d.balance) <= 0);
  // "Paid down 50 percent of a debt" -- only debts with a real
  // original_balance on file count (older debts predating that field are
  // left out rather than treated as 0% progress, same reasoning as the
  // Dashboard's Debt Progress stat). A debt paid all the way to zero is
  // still >= 50% paid off, so debt_free/debt_slayer debts count here too.
  const debtHalfwayPaid = debts.some((d: any) => {
    const original = Number(d.original_balance) || 0;
    if (original <= 0) return false;
    const balance = Number(d.balance) || 0;
    return (original - balance) / original >= 0.5;
  });

  // Longest-ever activity streak (lib/activityStreak.ts bumps this on every
  // dashboard load). Uses longest_streak, not current_streak, so a streak
  // badge earned once stays earned even after the current streak resets.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name, longest_streak")
    .eq("id", uid)
    .maybeSingle();
  const longestStreak = Number(profileRow?.longest_streak) || 0;

  // At least one still-active Plaid connection. plaid_items has RLS enabled
  // with no policy granting the signed-in user's own client any access at
  // all (see app/api/plaid/items/route.ts, which reads it the same way) --
  // so this has to go through the service-role client, manually scoped to
  // this user's id, rather than the regular `supabase` client used above.
  const { count: plaidActiveCount } = await serviceClient()
    .from("plaid_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("status", "active");
  const plaidConnected = (plaidActiveCount || 0) > 0;

  const stats: Stats = {
    incomeCount,
    debtsCount,
    billsCount,
    goalsCount,
    anyDebtCleared,
    allDebtsCleared,
    debtHalfwayPaid,
    longestStreak,
    plaidConnected,
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

  // Badge-earned emails -- same "claim before send, roll back on failure"
  // pattern as lib/sendWelcomeEmail.ts, deduped via achievements.email_sent_at
  // so a retry or a race (e.g. two tabs both calling this route) never
  // double-sends. Best-effort: a failed/unconfigured send should never break
  // the badge itself, which is already awarded above.
  if (toInsert.length > 0) {
    const from = process.env.EMAIL_FROM;
    const to = user.email;
    if (from && to) {
      const { data: claimed } = await supabase
        .from("achievements")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("user_id", uid)
        .in("badge_key", toInsert)
        .is("email_sent_at", null)
        .select("badge_key");

      const name = (profileRow?.full_name as string) || "";
      for (const row of claimed || []) {
        const badge = badgeByKey((row as any).badge_key);
        if (!badge) continue
        try {
          const r = await resend.emails.send({
            from,
            to,
            subject: badgeEarnedSubject(badge),
            html: badgeEarnedHtml(name, badge),
          });
          if (r && (r as any).error) throw new Error((r as any).error.message || "send error");
        } catch (e) {
          await supabase
            .from("achievements")
            .update({ email_sent_at: null })
            .eq("user_id", uid)
            .eq("badge_key", badge.key);
          console.error("badge email send failed:", badge.key, e);
        }
      }
    }
  }

  return NextResponse.json({ earned, newlyEarned: toInsert });
}
