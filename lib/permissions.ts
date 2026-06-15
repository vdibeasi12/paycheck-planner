export function canUseSnowball(plan: string): boolean {
  return plan === 'premium' || plan === 'starter'
}

export function canUseAvalanche(plan: string): boolean {
  return plan === 'premium'
}

export function canUseAI(plan: string): boolean {
  return plan === 'premium'
}

export function canUseAdvancedAnalytics(plan: string): boolean {
  return plan === 'premium'
}

export function getMaxDebts(plan: string): number {
  switch (plan) {
    case 'free':
      return 3
    case 'starter':
      return 10
    case 'premium':
      return 999999
    default:
      return 3
  }
}

export function isPremium(plan: string): boolean {
  return plan === 'premium'
}
