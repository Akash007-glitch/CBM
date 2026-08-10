"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * AuthProvider must be rendered inside RootLayout (as a Client Component).
 * It calls `initialize()` once on mount to hydrate the auth store from
 * the existing Supabase session and subscribes to future auth state changes.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
