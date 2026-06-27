import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { plaid, PLAID_ENABLED } from "@/lib/plaid";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

// POST { confirmEmail }: a user permanently deletes their OWN account.
// The user is taken from the session cookie (never from the request body), so a
// caller can only ever delete themselves. The typed email must match as a
// friction guard. Data is purged in one transaction via app_admin_purge_user,
// then the auth user is removed (which also revokes all of their sessions).
export async function POST(req: Request) {
  const userClient = await createUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const confirmEmail = body?.confirmEmail;
  const email = user.email || "";

  if (
    typeof confirmEmail !== "string" ||
    !email ||
    confirmEmail.trim().toLowerCase() !== email.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "Confirmation email does not match your account email." },
      { status: 400 }
    );
  }

  const sb = serviceClient();

  // 0) Revoke any linked Plaid items at Plaid before wiping local data, so we
  //    never leave dangling access tokens. Best-effort: a Plaid failure must
  //    not block the user's deletion.
  try {
    const { data: plaidItems } = await sb
      .from("plaid_items")
      .select("access_token")
      .eq("user_id", user.id);
    if (PLAID_ENABLED) {
      for (const it of plaidItems ?? []) {
        try {
          await plaid.itemRemove({ access_token: it.access_token });
        } catch (e) {
          console.error("account delete: plaid itemRemove failed", e);
        }
      }
    }
  } catch (e) {
    console.error("account delete: could not load plaid items", e);
  }

  // 1) Purge all app data in one transaction.
  const { error: purgeErr } = await sb.rpc("app_admin_purge_user", { p_uid: user.id });
  if (purgeErr) {
    return NextResponse.json(
      { error: "Account data could not be deleted: " + purgeErr.message },
      { status: 500 }
    );
  }

  // 2) Remove the auth user (also revokes their sessions).
  const { error: authErr } = await sb.auth.admin.deleteUser(user.id);
  if (authErr) {
    return NextResponse.json(
      { error: "Account could not be fully deleted: " + authErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}