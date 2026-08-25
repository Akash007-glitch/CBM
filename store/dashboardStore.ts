/**
 * dashboardStore.ts
 *
 * Live Supabase-powered store replacing all static mock data.
 *
 * Architecture:
 *  - State is loaded from Supabase RPCs (get_dashboard_stats, get_activity_feed)
 *  - Supabase Realtime subscriptions on invoices, payments, customers, activity_logs
 *    trigger a debounced re-fetch of stats on any INSERT/UPDATE/DELETE
 *  - CRUD actions (addCustomer, createInvoice, recordPayment) call the service
 *    layer and then refresh state
 *
 * The DB remains the single source of truth. This store is a read-through cache.
 */

import { create } from "zustand";
import { supabase } from "@/app/lib/supabase";
import {
  getDashboardStats,
  getSalesTrend,
  getActivityFeed,
  type DashboardStats,
  type SalesTrendPoint,
  type ActivityFeedItem,
} from "@/lib/services/dashboardService";
import {
  getCustomers,
  createCustomer,
  deactivateCustomer,
  deleteCustomer,
  type CustomerRow,
} from "@/lib/services/customerService";
import {
  getSalesmen,
  type SalesmanWithProfile,
} from "@/lib/services/salesmanService";
import {
  getInvoices,
  createInvoice,
  type InvoiceRow,
  type CreateInvoicePayload,
} from "@/lib/services/invoiceService";
import {
  getPayments,
  createAndAllocatePayment,
  type PaymentRow,
  type AllocationRequest,
} from "@/lib/services/paymentService";
import type { TablesInsert } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Re-export legacy types so existing UI components don't break ──────────────

/** @deprecated Use CustomerRow from customerService instead */
export type Customer = CustomerRow & {
  // UI convenience aliases kept for backward compatibility
  company?: string;
  totalPurchases?: number;
  outstandingBalance?: number;
  joinedDate?: string;
  lastInteraction?: string;
  location?: string;
  invoiceTotal?: number;
  previouslyPaid?: number;
  status?: string;
};

export type { SalesmanWithProfile as Salesman };
export type { InvoiceRow as Invoice };
export type { PaymentRow as Collection };
export type { ActivityFeedItem as ActivityItem };

// ── Store State ───────────────────────────────────────────────────────────────

interface DashboardState {
  // KPI stats
  stats: DashboardStats;
  // Entities
  customers: CustomerRow[];
  salesmen: SalesmanWithProfile[];
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  activities: ActivityFeedItem[];
  salesTrend: SalesTrendPoint[];
  // UI state
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  // Realtime
  _channel: RealtimeChannel | null;

  // Actions
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  addCustomer: (payload: TablesInsert<"customers">) => Promise<CustomerRow>;
  deactivateCustomer: (id: string) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  createInvoice: (payload: CreateInvoicePayload) => Promise<InvoiceRow>;
  recordPayment: (
    paymentPayload: TablesInsert<"payments">,
    allocations?: AllocationRequest[]
  ) => Promise<PaymentRow>;
  loadMoreActivity: (page: number) => Promise<void>;
  destroy: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDateRange(days = 30): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(start), end: fmt(end) };
}

// Debounce helper for Realtime refresh bursts
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDashboardStore = create<DashboardState>((set, get) => {
  // Debounced refresh triggered by Realtime events.
  // Re-fetches ALL entities so that customer adds, payment records,
  // and day-book imports are immediately reflected in the UI.
  const debouncedRefresh = debounce(async () => {
    try {
      const { start, end } = getDateRange(30);
      const results = await Promise.allSettled([
        getDashboardStats(),
        getCustomers(),
        getInvoices({ limit: 100 }),
        getPayments({ limit: 100 }),
        getActivityFeed(20, 0),
        getSalesTrend(start, end),
      ]);

      set({
        stats: results[0].status === "fulfilled" ? results[0].value : get().stats,
        customers: results[1].status === "fulfilled" ? results[1].value : get().customers,
        invoices: results[2].status === "fulfilled" ? results[2].value : get().invoices,
        payments: results[3].status === "fulfilled" ? results[3].value : get().payments,
        activities: results[4].status === "fulfilled" ? results[4].value : get().activities,
        salesTrend: results[5].status === "fulfilled" ? results[5].value : get().salesTrend,
      });
    } catch (err) {
      console.warn("Realtime refresh failed:", err);
    }
  }, 600);

  return {
    // ── Initial state ──────────────────────────────────────────────────────────
    stats: {
      today_sales: 0,
      today_collections: 0,
      total_outstanding: 0,
      pending_invoices: 0,
      total_customers: 0,
      monthly_revenue: 0,
    },
    customers: [],
    salesmen: [],
    invoices: [],
    payments: [],
    activities: [],
    salesTrend: [],
    isLoading: false,
    isInitialized: false,
    error: null,
    _channel: null,

    // ── Initialize ─────────────────────────────────────────────────────────────
    initialize: async () => {
      set({ isLoading: true, error: null });

      try {
        const { start, end } = getDateRange(30);

        const results = await Promise.allSettled([
          getDashboardStats(),
          getCustomers(),
          getSalesmen(),
          getInvoices({ limit: 100 }),
          getPayments({ limit: 100 }),
          getActivityFeed(20, 0),
          getSalesTrend(start, end),
        ]);

        const stats = results[0].status === "fulfilled" ? results[0].value : {
          today_sales: 0,
          today_collections: 0,
          total_outstanding: 0,
          pending_invoices: 0,
          total_customers: 0,
          monthly_revenue: 0,
        };
        const customers = results[1].status === "fulfilled" ? results[1].value : [];
        const salesmen = results[2].status === "fulfilled" ? results[2].value : [];
        const invoices = results[3].status === "fulfilled" ? results[3].value : [];
        const payments = results[4].status === "fulfilled" ? results[4].value : [];
        const activities = results[5].status === "fulfilled" ? results[5].value : [];
        const trend = results[6].status === "fulfilled" ? results[6].value : [];

        // Log any failed calls for diagnostics
        results.forEach((r, idx) => {
          if (r.status === "rejected") {
            console.warn(`[dashboardStore] Init query ${idx} failed:`, r.reason);
          }
        });

        // Only create the Realtime channel once — reuse existing one if already live
        let channel = get()._channel;
        if (!channel) {
          channel = supabase
            .channel("erp-dashboard")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "invoices" },
              () => debouncedRefresh()
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "payments" },
              () => debouncedRefresh()
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "customers" },
              () => debouncedRefresh()
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "day_book_entries" },
              () => debouncedRefresh()
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "import_batches" },
              () => debouncedRefresh()
            )
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "activity_logs" },
              () => debouncedRefresh()
            )
            .subscribe();
        }

        set({
          stats,
          customers,
          salesmen,
          invoices,
          payments,
          activities,
          salesTrend: trend,
          isLoading: false,
          isInitialized: true,
          _channel: channel,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set({ isLoading: false, isInitialized: true, error: msg });
      }
    },

    // ── Refresh (full reload) ──────────────────────────────────────────────────
    refresh: async () => {
      set({ isLoading: true });
      try {
        const { start, end } = getDateRange(30);
        const results = await Promise.allSettled([
          getDashboardStats(),
          getCustomers(),
          getSalesmen(),
          getInvoices({ limit: 100 }),
          getPayments({ limit: 100 }),
          getActivityFeed(20, 0),
          getSalesTrend(start, end),
        ]);

        set({
          stats: results[0].status === "fulfilled" ? results[0].value : get().stats,
          customers: results[1].status === "fulfilled" ? results[1].value : get().customers,
          salesmen: results[2].status === "fulfilled" ? results[2].value : get().salesmen,
          invoices: results[3].status === "fulfilled" ? results[3].value : get().invoices,
          payments: results[4].status === "fulfilled" ? results[4].value : get().payments,
          activities: results[5].status === "fulfilled" ? results[5].value : get().activities,
          salesTrend: results[6].status === "fulfilled" ? results[6].value : get().salesTrend,
          isLoading: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set({ isLoading: false, error: msg });
      }
    },

    // ── addCustomer ────────────────────────────────────────────────────────────
    addCustomer: async (payload) => {
      const customer = await createCustomer(payload);
      // Optimistically prepend; Realtime will sync stats
      set((state) => ({ customers: [customer, ...state.customers] }));
      return customer;
    },

    // ── deactivateCustomer ─────────────────────────────────────────────────────
    deactivateCustomer: async (id: string) => {
      await deactivateCustomer(id);
      set((state) => ({
        customers: state.customers.map((c) =>
          c.id === id ? { ...c, is_active: false } : c
        ),
      }));
    },

    // ── deleteCustomer ─────────────────────────────────────────────────────────
    deleteCustomer: async (id: string) => {
      await deleteCustomer(id);
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
      }));
    },

    // ── createInvoice ──────────────────────────────────────────────────────────
    createInvoice: async (payload) => {
      const invoice = await createInvoice(payload);
      set((state) => ({ invoices: [invoice, ...state.invoices] }));
      return invoice;
    },

    // ── recordPayment ──────────────────────────────────────────────────────────
    recordPayment: async (paymentPayload, allocations = []) => {
      const { payment } = await createAndAllocatePayment(paymentPayload, allocations);
      set((state) => ({ payments: [payment, ...state.payments] }));

      // Automatically log payment activity with resolved customer name
      try {
        const customer = get().customers.find((c) => c.id === paymentPayload.customer_id);
        const customerName = customer?.name ?? "Customer";
        const formattedAmount = Number(paymentPayload.amount).toLocaleString("en-IN");
        await supabase.rpc("log_activity", {
          p_action: "payment_received",
          p_description: `Payment of ₹${formattedAmount} received from ${customerName}`,
          p_entity_type: "payments",
          p_entity_id: payment.id,
          p_user_id: paymentPayload.created_by || null,
          p_metadata: {
            customer_id: paymentPayload.customer_id,
            customer_name: customerName,
            amount: paymentPayload.amount,
            payment_method: paymentPayload.payment_method,
          },
        });
      } catch (logErr) {
        console.warn("Could not log payment activity:", logErr);
      }

      return payment;
    },

    // ── loadMoreActivity ───────────────────────────────────────────────────────
    loadMoreActivity: async (page) => {
      const more = await getActivityFeed(20, page * 20);
      set((state) => ({
        activities: [...state.activities, ...more],
      }));
    },

    // ── destroy (cleanup Realtime) ─────────────────────────────────────────────
    destroy: () => {
      const { _channel } = get();
      if (_channel) {
        supabase.removeChannel(_channel);
        set({ _channel: null });
      }
    },
  };
});

// ── Selector hook: live KPI metrics ──────────────────────────────────────────

/**
 * Drop-in replacement for the old `useRealtimeMetrics()` hook.
 * Now reads live values from the Supabase RPC via the store.
 */
export function useRealtimeMetrics() {
  const stats = useDashboardStore((s) => s.stats);

  return {
    todaySales:          stats.today_sales,
    todayCollections:    stats.today_collections,
    totalOutstanding:    stats.total_outstanding,
    pendingInvoicesCount: Number(stats.pending_invoices),
    totalCustomersCount: Number(stats.total_customers),
    mtdRevenueRaw:       stats.monthly_revenue,
    mtdRevenueLakhs:     (stats.monthly_revenue / 100000).toFixed(2),
  };
}
