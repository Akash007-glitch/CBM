"use client";

import { useBeforeUnload } from "@/hooks/useBeforeUnload";

/**
 * Shared layout for all dashboard routes (/dashboard/admin/* and
 * /dashboard/salesman/*).
 *
 * Registers the "Leave site?" beforeunload warning so it only fires
 * when the user is inside the dashboard — not on the login pages.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Show browser's native "Leave site?" dialog on tab close / hard refresh /
  // external navigation. Does NOT affect Next.js client-side route changes.
  useBeforeUnload();

  return <>{children}</>;
}
