// lib/plaid.ts
// Server-only Plaid client. Never import into a client component -- it reads
// PLAID_SECRET. Bank sync is gated to the Autopilot (connected) tier and only
// goes live when PLAID_ENABLED is "true".
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid"

export const PLAID_ENABLED =
  process.env.PLAID_ENABLED === "true" &&
  !!process.env.PLAID_CLIENT_ID &&
  !!process.env.PLAID_SECRET

const env = (process.env.PLAID_ENV || "sandbox") as keyof typeof PlaidEnvironments

export const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[env] ?? PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID ?? "",
        "PLAID-SECRET": process.env.PLAID_SECRET ?? "",
      },
    },
  })
)

// Only the Autopilot (connected) tier may link a bank.
export function planCanUsePlaid(plan: string | null | undefined): boolean {
  return plan === "connected"
}