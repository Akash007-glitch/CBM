import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Query profile role to route user to correct portal
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const role = (profile as { role?: string } | null)?.role;
      const targetPath = next || (role === "admin" ? "/dashboard/admin" : "/dashboard/salesman");
      return NextResponse.redirect(`${origin}${targetPath}`);
    }
  }

  // Return user to login page with error param if code exchange failed
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
