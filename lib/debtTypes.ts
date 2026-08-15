// lib/debtTypes.ts
// Single source of truth for the debt_type value/label pairs. Previously
// this list was only defined inline in app/debts/page.tsx -- the Debt
// Analytics page needed the same labels (to show a "Mortgage" / "Auto loan"
// badge next to each debt) and would otherwise have had to re-type them,
// which is exactly the kind of copy-drift this project has been bitten by
// before (see lib/monthlyFactor.ts).
export type DebtType = 'mortgage' | 'auto' | 'credit_card' | 'student_loan' | 'personal' | 'other' | ''

export const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: '', label: 'Not set' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'auto', label: 'Auto loan' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'student_loan', label: 'Student loan' },
  { value: 'personal', label: 'Personal loan' },
  { value: 'other', label: 'Other' },
]

const LABELS: Record<string, string> = Object.fromEntries(DEBT_TYPES.map((t) => [t.value, t.label]))

export function debtTypeLabel(type?: string | null): string {
  return LABELS[type || ''] || 'Not set'
}
