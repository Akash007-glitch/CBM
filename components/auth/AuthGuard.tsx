"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useAuthStore,
  useIsAuthenticated,
  useAuthInitialized,
  useRole,
} from "@/store/authStore";
import { ROLE_REDIRECT } from "@/constants/auth";

/**
 * AuthGuard — Client-side route protection safety net
 *
 * WHY THIS EXISTS (alongside proxy.ts):
 *   proxy.ts is the server-side gatekeeper. It runs before the page loads.
 *   But in a Next.js app, client-side navigation (clicking a <Link> or using
 *   router.push()) does NOT trigger a full page reload — so proxy.ts is NOT
 *   re-invoked for those navigations.
 *
 *   AuthGuard fills that gap. It reads the actual Supabase auth state and
 *   the user's role from the Zustand store and redirects accordingly.
 *
 * NOTE: The proxy.ts now handles routing via real Supabase session cookies
 *   (using @supabase/ssr). There are no hint cookies to manage here.
 *
 * HOW TO USE:
 *
 *   // Protect a dashboard page — redirect to / if not logged in
 *   <AuthGuard requireAuth>
 *     <DashboardContent />
 *   </AuthGuard>
 *
 *   // Redirect away from login if already logged in (role-aware)
 *   <AuthGuard redirectIfAuth>
 *     <LoginContent />
 *   </AuthGuard>
 *
 *   // Restrict to a specific role — other roles get sent to their own dashboard
 *   <AuthGuard requireAuth requiredRole="admin">
 *     <AdminOnlyContent />
 *   </AuthGuard>
 */

interface AuthGuardProps {
  children: React.ReactNode;

  /**
   * Set to true on protected pages (dashboard, customers, etc.).
   * Unauthenticated users will be redirected to the login page (/).
   */
  requireAuth?: boolean;

  /**
   * Set to true on the login page.
   * Authenticated users will be redirected to their role-specific dashboard.
   */
  redirectIfAuth?: boolean;

  /**
   * Optional. If set, only users with this role can see this page.
   * Users with a different role are sent to their own dashboard.
   * e.g. requiredRole="admin" on the admin dashboard page.
   */
  requiredRole?: "admin" | "salesman";

  /**
   * Where to redirect unauthenticated users.
   * Defaults to "/" (the login page).
   */
  loginPath?: string;
}

function AuthSpinner() {
  return (
    <div
      data-component="AuthGuard/Spinner"
      role="status"
      aria-label="Loading"
      className="min-h-screen flex items-center justify-center bg-[#F4F7FA]"
    >
      <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-teal-brand animate-spin" />
    </div>
  );
}

export function AuthGuard({
  children,
  requireAuth = false,
  redirectIfAuth = false,
  requiredRole,
  loginPath = "/",
}: AuthGuardProps) {
  const router = useRouter();
  const initialize = useAuthStore((s) => s.initialize);
  const isAuthenticated = useIsAuthenticated();
  const isInitialized = useAuthInitialized();
  const role = useRole();

  // The correct home dashboard for whoever is currently logged in.
  const roleDashboard = ROLE_REDIRECT[role] ?? "/dashboard/salesman";

  // Failsafe: ensure the store is hydrated even on a hard refresh directly to
  // a protected URL (in case AuthProvider hasn't mounted yet).
  // initialize() is idempotent — it does nothing if already called.
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isInitialized) return;

    // ── Rule 1: requireAuth — unauthenticated users go to login ──────────────
    if (requireAuth && !isAuthenticated) {
      router.replace(loginPath);
      return;
    }

    // ── Rule 2: requiredRole — wrong-role users go to their own dashboard ─────
    if (requireAuth && isAuthenticated && requiredRole && role !== requiredRole) {
      router.replace(roleDashboard);
      return;
    }

    // ── Rule 3: redirectIfAuth — logged-in users go to their dashboard ────────
    if (redirectIfAuth && isAuthenticated) {
      router.replace(roleDashboard);
    }
  }, [
    isInitialized,
    isAuthenticated,
    requireAuth,
    redirectIfAuth,
    requiredRole,
    role,
    roleDashboard,
    loginPath,
    router,
  ]);

  // While Supabase is still loading the session, show a full-screen spinner.
  if (!isInitialized) return <AuthSpinner />;

  // Show spinner while any redirect is in flight (never blank white page)
  if (requireAuth && !isAuthenticated) return <AuthSpinner />;
  if (requireAuth && isAuthenticated && requiredRole && role !== requiredRole) return <AuthSpinner />;
  if (redirectIfAuth && isAuthenticated) return <AuthSpinner />;

  return <>{children}</>;
}
