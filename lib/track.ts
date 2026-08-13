import { createClient as createServiceClient } from "@supabase/supabase-js";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

// Best-effort product/marketing event logging (see
// supabase/migrations/20260813080000_events_table.sql). Never throws -- a
// tracking failure must never break the request that triggered it. Writes
// go through the service role because public.events has RLS on with no
// policies, same posture as lib/adminGuard.ts's logAdminAction.
//
// Deliberately not called from the client -- every call site is a server
// route (or a DB trigger, for the two events that can't afford to be
// missed: signup and referral completion, handled directly in the
// migration). Keep it that way; a client-callable version of this needs its
// own rate limiting and validation, which is more surface area than an 8-10
// event Phase 1 needs.
export async function track(
  eventName: string,
  opts: { userId?: string | null; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const sb = serviceClient();
    const { error } = await sb.from("events").insert({
      event_name: eventName,
      user_id: opts.userId ?? null,
      metadata: opts.metadata ?? {},
    });
    if (error) console.error(`track(${eventName}) failed:`, error.message);
  } catch (e) {
    console.error(`track(${eventName}) failed:`, e);
  }
}
