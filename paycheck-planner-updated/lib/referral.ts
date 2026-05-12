export function generateReferralCode(userId: string) {
  return `ref_${userId.slice(0, 8)}`
}