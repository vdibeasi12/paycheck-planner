// lib/permissions.ts
// Plan gating helpers. "connected" (Autopilot) is the top tier: it includes
// everything Premium has, plus Plaid bank sync, so it must satisfy every
// premium-level check here.

export function canUseSnowball(plan: string): boolean {
  return plan === 'premium' || plan === 'connected'
}

export function canUseCharts(plan: string): boolean {
  return plan === 'starter' || plan === 'premium' || plan === 'connected'
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

// CSV bank-export import (Autopilot Phase 1, no Plaid dependency). Gated to
// Accelerate-and-up, same tier boundary as isPremium.
export function canUseCsvImport(plan: string): boolean {
  return plan === 'premium' || plan === 'connected'
}

// Plan Autopilot (Aug 26 2026): Autopilot-tier only, unlike the helpers
// above -- this isn't a Premium-and-up feature, it's the thing that makes
// the "connected" tier's own name literal, so it doesn't extend to premium.
export function canUseAutopilot(plan: string): boolean {
  return plan === 'connected'
}