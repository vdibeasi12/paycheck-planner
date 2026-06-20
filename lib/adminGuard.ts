import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

// Reads the `aal` claim from a Supabase access token (JWT) with no network
// call. Node runtime, so we decode base64url via Buffer. Returns null on any
// problem so the caller falls back to the authoritative MFA-factor check.
function getAalClaim(token?: string | null): string | null {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = Buffer.from(b64, "base64").toString("utf8");
    const obj = JSON.parse(json);
    return typeof obj.aal === "string" ? obj.aal : null;
  } catch {
    return null;
  }
}

export type AdminGate =
  | { ok: false; status: number; error: string }
  | { ok: true; userId: string; userEmail: string | null };

// Shared gate for every admin API handler. Three checks, in order:
//   1) a session exists (else 401)
//   2) the caller's profile is_admin (else 403)
//   3) AAL2 step-up, mirroring the middleware page-layer rule: if the admin has
//      a verified MFA factor, the session must be aal2 (else 401). An admin with
//      no verified factor has nothing to step up to and passes, exactly like the
//      middleware. This closes the gap where an aal1 session could hit an admin
//      API directly, bypassing the page-layer /mfa redirect.
export async function requireAdmin(): Promise<AdminGate> {
  const userClient = await createUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

  const { data: profile } = await userClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return { ok: false, status: 403, error: "Forbidden" };

  const {
    data: { session },
  } = await userClient.auth.getSession();
  if (getAalClaim(session?.access_token) !== "aal2") {
    const { data: factors } = await userClient.auth.mfa.listFactors();
    const hasVerifiedFactor =
      !!factors &&
      Array.isArray(factors.all) &&
      factors.all.some((f) => f.status === "verified");
    if (hasVerifiedFactor) {
      return { ok: false, status: 401, error: "Step-up authentication required" };
    }
  }

  return { ok: true, userId: user.id, userEmail: user.email ?? null };
}

// Service-role client (bypasses RLS). Server-only; never expose to the client.
export function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

// Best-effort write to admin_audit_log. Never throws: an audit failure must
// never break the admin action that triggered it. Inserted via service-role
// because admin_audit_log has RLS on with no policies (service-role only).
export async function logAdminAction(entry: {
  actorId: string;
  actorEmail?: string | null;
  action: string;
  targetId?: string | null;
  targetEmail?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const sb = serviceClient();
    await sb.from("admin_audit_log").insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      target_id: entry.targetId ?? null,
      target_email: entry.targetEmail ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.error("admin_audit_log insert failed:", e);
  }
}