// lib/referral.ts
// Deterministic, stable referral code derived from a user id.

export function generateReferralCode(userId?: string | null): string {
  if (!userId) {
    return Math.random().toString(36).slice(2, 8).toUpperCase()
  }
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return hash.toString(36).toUpperCase().padStart(6, "0").slice(0, 8)
}
