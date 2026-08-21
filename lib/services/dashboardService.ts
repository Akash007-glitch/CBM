/**
 * dashboardService.ts
 *
 * Wraps the three server-side RPCs:
 *   - get_dashboard_stats()   → 6 KPI numbers
 *   - get_sales_trend()       → daily sales series for the chart
 *   - get_activity_feed()     → recent activity log entries
 *
 * All calls use the browser Supabase client (anon key + JWT cookie).
 * RLS + SECURITY INVOKER functions enforce access on the DB side.
 */

import { supabase } from "@/app/lib/supabase";
import type { Database } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  today_sales: number;
  today_collections: number;
  total_outstanding: number;
  pending_invoices: number;
  total_customers: number;
  monthly_revenue: number;
}

export interface SalesTrendPoint {
  date: string; // ISO date string yyyy-mm-dd
  sales: number;
}

export type ActivityFeedItem =
  Database["public"]["Functions"]["get_activity_feed"]["Returns"][number];

// ── getDashboardStats ─────────────────────────────────────────────────────────

/**
 * Fetches all 6 KPI values from the database.
 * Admins receive org-wide totals; salesmen receive their own scoped totals.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("get_dashboard_stats");

  if (error) throw new Error(`getDashboardStats: ${error.message}`);

  // The function returns a single-row SETOF — take the first element
  type StatsRow = typeof data extends readonly (infer R)[] ? R : typeof data;
  const row: StatsRow | undefined = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      today_sales: 0,
      today_collections: 0,
      total_outstanding: 0,
      pending_invoices: 0,
      total_customers: 0,
      monthly_revenue: 0,
    };
  }

  return {
    today_sales: Number(row.today_sales ?? 0),
    today_collections: Number(row.today_collections ?? 0),
    total_outstanding: Number(row.total_outstanding ?? 0),
    pending_invoices: Number(row.pending_invoices ?? 0),
    total_customers: Number(row.total_customers ?? 0),
    monthly_revenue: Number(row.monthly_revenue ?? 0),
  };
}

// ── getSalesTrend ─────────────────────────────────────────────────────────────

/**
 * Fetches a daily sales series between two dates.
 * Days with no invoices return 0.
 *
 * @param startDate - ISO date string "yyyy-mm-dd"
 * @param endDate   - ISO date string "yyyy-mm-dd"
 */
export async function getSalesTrend(
  startDate: string,
  endDate: string
): Promise<SalesTrendPoint[]> {
  const { data, error } = await supabase.rpc("get_sales_trend", {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw new Error(`getSalesTrend: ${error.message}`);

  return (data ?? []).map((row: { sale_date: string; sales: number | null }) => ({
    date: row.sale_date,
    sales: Number(row.sales ?? 0),
  }));
}

// ── getActivityFeed ───────────────────────────────────────────────────────────

/**
 * Fetches recent activity log entries.
 * Admins see all entries; salesmen see only their own.
 *
 * @param limit  - max rows to return (default 20)
 * @param offset - pagination offset (default 0)
 */
export async function getActivityFeed(
  limit = 20,
  offset = 0
): Promise<ActivityFeedItem[]> {
  const { data, error } = await supabase.rpc("get_activity_feed", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw new Error(`getActivityFeed: ${error.message}`);

  return data ?? [];
}
