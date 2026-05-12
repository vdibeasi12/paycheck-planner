import { createClient } from "@supabase/supabase-js"

// --- TYPES ---
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | null

export type SubscriptionResult = {
  isActive: boolean
  status: SubscriptionStatus
}

// --- SUPABASE CLIENT (SERVER SAFE) ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

// --- CORE FUNCTION ---
export async function getUserSubscription(
  userId: string
): Promise<SubscriptionResult> {

  if (!userId) {
    return {
      isActive: false,
      status: null,
    }
  }

  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .single()

    if (error || !data) {
      return {
        isActive: false,
        status: null,
      }
    }

    const activeStatuses = ["active", "trialing"]

    return {
      isActive: activeStatuses.includes(data.status),
      status: data.status as SubscriptionStatus,
    }

  } catch (err) {
    console.error("Subscription check failed:", err)

    return {
      isActive: false,
      status: null,
    }
  }
}