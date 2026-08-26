/**
 * Supabase client factory for use inside middleware.ts (Next.js middleware).
 *
 * middleware.ts doesn't have access to next/headers — it must read/write cookies
 * directly from NextRequest and NextResponse objects passed in.
 *
 * Usage:
 *   import { createProxySupabaseClient } from "@/lib/supabase/proxy-client";
 *   const { supabase, response } = createProxySupabaseClient(request);
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // always return `response` so Set-Cookie headers are forwarded
 */
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export function createProxySupabaseClient(request: NextRequest) {
  // Build a mutable response so we can attach Set-Cookie headers when
  // the Supabase SDK refreshes the session token.
  let response = NextResponse.next({ request });

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write new cookie values into the outgoing request AND response.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Rebuild the response with the updated request cookies.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, response };
}
