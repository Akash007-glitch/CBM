/**
 * POST /api/admin/create-user
 *
 * Creates a new Supabase auth user and sets their role in the `profiles` table.
 *
 * Security layers:
 *  1. proxy.ts blocks non-admins from /api/admin/* before this runs
 *  2. This route re-verifies the caller's role server-side (defense in depth)
 *  3. The service role client (used for auth.admin.createUser) is server-only
 *
 * Request body:
 *   { email: string; password: string; role: "admin" | "salesman" }
 *
 * Response:
 *   201 { userId, email, role }   — user created
 *   400 { error }                 — bad request / validation failure
 *   401 { error }                 — not authenticated
 *   403 { error }                 — not an admin
 *   500 { error }                 — Supabase error
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  // ── 1. Authenticate the caller ─────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: callerUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !callerUser) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // ── 2. Verify the caller is an admin (independent of proxy) ────────────────
  console.log('user object right before query:', callerUser);
  console.log('user.id specifically:', callerUser?.id);
  const { data: callerProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerUser.id)
    .single();

  if (profileError || !callerProfile) {
    return NextResponse.json(
      { error: "Could not verify your role. Contact support." },
      { status: 403 }
    );
  }

  if ((callerProfile as { role: string }).role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: admin access required." },
      { status: 403 }
    );
  }

  // ── 3. Parse and validate request body ────────────────────────────────────
  let body: { email?: string; password?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { email, password, role } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  if (role !== "admin" && role !== "salesman") {
    return NextResponse.json(
      { error: "role must be either 'admin' or 'salesman'." },
      { status: 400 }
    );
  }

  // ── 4. Create the auth user using the service role client ─────────────────
  // The service role client bypasses RLS and can create users without
  // sending a confirmation email (email_confirm: true skips the confirmation).
  const adminClient = createAdminSupabaseClient();

  const { data: newUserData, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm so the user can log in immediately
    });

  if (createError || !newUserData.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create user." },
      { status: 500 }
    );
  }

  const newUserId = newUserData.user.id;

  // ── 5. Set the role in the profiles table ─────────────────────────────────
  // The trigger `handle_new_user()` inserts a 'salesman' row automatically,
  // but we upsert here to also handle the requested role (e.g. 'admin').
  const { error: upsertError } = await adminClient
    .from("profiles")
    .upsert({ id: newUserId, role }, { onConflict: "id" });

  if (upsertError) {
    // User was created but role couldn't be set — return partial success
    // and log so an admin can manually fix it.
    console.error("[create-user] Failed to set profile role:", upsertError);
    return NextResponse.json(
      {
        warning: "User created but role could not be set. Set it manually in Supabase.",
        userId: newUserId,
        email,
        role: "salesman", // default from trigger
      },
      { status: 207 }
    );
  }

  // ── 6. Return success ─────────────────────────────────────────────────────
  return NextResponse.json(
    { userId: newUserId, email, role },
    { status: 201 }
  );
}
