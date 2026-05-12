// User-related types
export type UserProfile = {
  id: string
  email: string
  plan: "free" | "starter" | "premium"
  created_at?: string
  updated_at?: string
}

// Debt type definition
export type Debt = {
  id?: string
  user_id?: string
  name: string
  balance: number
  interest_rate: number
  minimum_payment?: number
  due_date?: string
  created_at?: string
  updated_at?: string
}

// Bill type definition
export type Bill = {
  id?: string
  user_id?: string
  name: string
  amount: number
  due_date?: string
  frequency?: "monthly" | "weekly" | "yearly"
  created_at?: string
  updated_at?: string
}

// Asset type definition
export type Asset = {
  id?: string
  user_id?: string
  name: string
  value: number
  created_at?: string
  updated_at?: string
}

// Paycheck type definition
export type Paycheck = {
  id?: string
  user_id?: string
  amount: number
  date: string
  frequency: "weekly" | "biweekly" | "monthly"
  created_at?: string
}

// Subscription type
export type Subscription = {
  id?: string
  user_id?: string
  stripe_customer_id?: string
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete" | null
  plan: "free" | "starter" | "premium"
  created_at?: string
  updated_at?: string
}

// API Response types
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Form event types
export type FormEvent = React.FormEvent<HTMLFormElement>
export type ChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
export type SubmitEvent = React.FormEvent<HTMLFormElement>

// Component props types
export interface AddDebtFormProps {
  addDebt: (debt: Debt) => Promise<void>
}

export interface AddAssetFormProps {
  refresh: () => Promise<void>
}

export interface BillsListProps {
  bills: Bill[]
}

export interface DebtsListProps {
  debts: Debt[]
}

// Financial calculation types
export type DebtPayoffPlan = {
  debt: Debt
  monthlyPayment: number
  monthsToPayoff: number
  totalInterest: number
  payoffDate: string
}

export type BudgetBreakdown = {
  income: number
  debts: number
  bills: number
  remaining: number
}

export type FinancialSummary = {
  totalDebt: number
  totalAssets: number
  netWorth: number
  monthlyDebts: number
  monthlyBills: number
}
