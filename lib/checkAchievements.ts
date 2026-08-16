// lib/checkAchievements.ts
// Shared "re-evaluate badges, celebrate anything new" call. This exact
// five-line pattern was already duplicated in app/achievements/page.tsx and
// app/components/AchievementsStrip.tsx, but only ran when the user happened
// to land on the dashboard or Achievements page -- so adding your first
// income/bill/debt/goal on its own page never celebrated anything until a
// later, unrelated page load. Pulling it out here so every action page can
// call it right at the moment the accomplishment actually happens.
import { celebrate } from "./confetti";

export async function checkAchievementsAndCelebrate(): Promise<void> {
  try {
    const res = await fetch("/api/achievements/check", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (Array.isArray(json?.newlyEarned) && json.newlyEarned.length > 0) celebrate();
  } catch {
    // Best-effort -- badges/confetti are a delight layer, never block the
    // action that triggered this check.
  }
}
