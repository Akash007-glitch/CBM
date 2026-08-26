import { NextRequest, NextResponse } from "next/server";
import { createProxySupabaseClient } from "@/lib/supabase/proxy-client";

/**
 * ROUTE PROTECTION — middleware.ts (Next.js 16)
 *
 * This file runs ON THE SERVER at the edge before any page is rendered.
 * It uses @supabase/ssr to verify the actual Supabase session from cookies
 * and queries the `profiles` table for the user's role.
 *
 * Rules enforced:
 *  1. Protected route + no session            → redirect to / (login)
 *  2. Admin-only route + non-admin role       → redirect to /dashboard/salesman
 *  3. Salesman-only route + admin role        → redirect to /dashboard/admin
 *  4. Login page (/) + logged in              → redirect to role-appropriate dashboard
 *
 * IMPORTANT: This is a UX and edge routing guard. RLS on the database is the
 * real security boundary — every privileged database query is protected independently.
 */

// ── Route definitions ─────────────────────────────────────────────────────────

const PROTECTED_PREFIXES = ["/dashboard", "/customers", "/sales", "/reports"];

const ADMIN_ONLY_PREFIXES = ["/dashboard/admin", "/api/admin"];

const SALESMAN_ONLY_PREFIXES = ["/dashboard/salesman"];

const LOGIN_PATHS = ["/", "/dashboard/admin/login", "/dashboard/salesman/login"];

const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/dashboard/admin",
  salesman: "/dashboard/salesman",
};

const DEFAULT_DASHBOARD = "/dashboard/salesman";

// ── Helpers ───────────────────────────────────────────────────────────────────

function redirectTo(path: string, request: NextRequest) {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}

function loginPathFor(pathname: string) {
  return pathname.startsWith("/dashboard/admin") || pathname.startsWith("/api/admin")
    ? "/dashboard/admin/login"
    : "/dashboard/salesman/login";
}

async function getUserRole(
  supabase: Awaited<ReturnType<typeof createProxySupabaseClient>>["supabase"],
  user: { id: string } | null
): Promise<string | null> {
  if (!user) return null;

  // Query profiles table directly — database is authoritative source of truth
  try {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (data as { role: string } | null)?.role;
    if (role === "admin" || role === "salesman") return role;
  } catch {
    // Ignore error and return null
  }

  return null;
}

// ── Middleware function ───────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create Supabase client that can read/refresh the session from cookies.
  const { supabase, response } = createProxySupabaseClient(request);

  // getUser() verifies the JWT with Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedRoute = PROTECTED_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );
  const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  const isSalesmanOnly = SALESMAN_ONLY_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );
  const isLoginPage = LOGIN_PATHS.includes(pathname);

  // ── Rule 1: Protected route, not logged in → login page ──────────────────────
  if (isProtectedRoute && !user) {
    return redirectTo(loginPathFor(pathname), request);
  }

  // ── Role-specific rules (only when logged in on a role-restricted route) ──────
  if (user && (isAdminOnly || isSalesmanOnly)) {
    const role = await getUserRole(supabase, user);

    // ── Rule 2: Admin-only route, non-admin user ──────────────────────────────
    if (isAdminOnly && role !== "admin") {
      return redirectTo(ROLE_DASHBOARD["salesman"], request);
    }

    // ── Rule 3: Salesman-only route, admin user ───────────────────────────────
    if (isSalesmanOnly && role === "admin") {
      return redirectTo(ROLE_DASHBOARD["admin"], request);
    }
  }

  // ── Rule 4: Login page visited by a logged-in user ───────────────────────────
  if (isLoginPage && user) {
    const role = await getUserRole(supabase, user);
    const destination = (role && ROLE_DASHBOARD[role]) ?? DEFAULT_DASHBOARD;
    return redirectTo(destination, request);
  }

  // ── Default: allow the request through, forwarding any refreshed cookies ─────
  return response;
}

// ── Matcher config ─────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Match all paths except:
     *   - _next/static  (Next.js static assets)
     *   - _next/image   (Next.js image optimisation)
     *   - favicon.ico   (browser tab icon)
     *
     * This covers both page routes AND /api/* routes, so admin API routes
     * get the same protection as admin dashboard pages.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
