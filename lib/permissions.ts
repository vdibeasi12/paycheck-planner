// lib/permissions.ts
// Plan gating helpers. "connected" (Autopilot) is the top tier: it includes
// everything Premium has, plus Plaid bank sync, so it must satisfy every
// premium-level check here.

export function canUseSnowball(plan: string): boolean {
  return plan === 'premium' || plan === 'starter' || plan === 'connected'
}

export function canUseAvalanche(plan: string): boolean {
  return plan === 'premium' || plan === 'connected'
}

export function canUseAI(plan: string): boolean {
  return plan === 'premium' || plan === 'connected'
}

export function canUseAdvancedAnalytics(plan: string): boolean {
  return plan === 'premium' || plan === 'connected'
}

export function getMaxDebts(plan: string): number {
  switch (plan) {
    case 'free':
      return 3
    case 'starter':
      return 10
    case 'premium':
      return 999999
    case 'connected':
      return 999999
    default:
      return 3
  }
}

export function isPremium(plan: string): boolean {
  return plan === 'premium' || plan === 'connected'
}