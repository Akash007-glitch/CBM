/**
 * customerService.ts
 *
 * CRUD + query operations for the `customers` table.
 * RLS enforces access: admins see all, salesmen see assigned customers only.
 */

import { supabase } from "@/app/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

export type CustomerRow = Tables<"customers">;
export type CustomerInsert = TablesInsert<"customers">;
export type CustomerUpdate = TablesUpdate<"customers">;

// ── Filters ───────────────────────────────────────────────────────────────────

export interface CustomerFilters {
  search?: string;       // matches name, email, phone, customer_code
  is_active?: boolean;
  city?: string;
  assigned_salesman_id?: string;
  limit?: number;
  offset?: number;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Returns a list of customers matching the given filters.
 * Results are ordered by name ascending.
 */
export async function getCustomers(
  filters: CustomerFilters = {}
): Promise<CustomerRow[]> {
  let query = supabase.from("customers").select("*").order("name");

  if (filters.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  }
  if (filters.assigned_salesman_id) {
    query = query.eq("assigned_salesman_id", filters.assigned_salesman_id);
  }
  if (filters.city) {
    const cleanCity = filters.city.replace(/[,().%]/g, "").trim();
    if (cleanCity) {
      query = query.ilike("city", `%${cleanCity}%`);
    }
  }
  if (filters.search) {
    const cleanSearch = filters.search.replace(/[,().%]/g, "").trim();
    if (cleanSearch) {
      query = query.or(
        `name.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,customer_code.ilike.%${cleanSearch}%`
      );
    }
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit ?? 50) - 1
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`getCustomers: ${error.message}`);
  return data ?? [];
}

/**
 * Returns a single customer by ID.
 */
export async function getCustomer(id: string): Promise<CustomerRow | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(`getCustomer: ${error.message}`);
  }
  return data;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Creates a new customer.
 * The `assigned_salesman_id` is required for salesman-owned customers
 * (RLS enforces this — salesman can only insert rows assigned to themselves).
 */
export async function createCustomer(
  payload: CustomerInsert
): Promise<CustomerRow> {
  const { data, error } = await supabase
    .from("customers")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`createCustomer: ${error.message}`);
  return data;
}

/**
 * Updates an existing customer.
 */
export async function updateCustomer(
  id: string,
  payload: CustomerUpdate
): Promise<CustomerRow> {
  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`updateCustomer: ${error.message}`);
  return data;
}

/**
 * Deactivates a customer (soft delete).
 */
export async function deactivateCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(`deactivateCustomer: ${error.message}`);
}

/**
 * Deletes a customer permanently from the database.
 * If foreign key references exist (e.g. invoices/payments), Postgres will throw an error.
 */
export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`deleteCustomer: ${error.message}`);
}


// ── Transaction History ───────────────────────────────────────────────────────

/**
 * Returns all invoices for a customer, ordered by date descending.
 */
export async function getCustomerInvoices(customerId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("customer_id", customerId)
    .order("invoice_date", { ascending: false });

  if (error) throw new Error(`getCustomerInvoices: ${error.message}`);
  return data ?? [];
}

/**
 * Returns all payments for a customer, ordered by date descending.
 */
export async function getCustomerPayments(customerId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("customer_id", customerId)
    .order("payment_date", { ascending: false });

  if (error) throw new Error(`getCustomerPayments: ${error.message}`);
  return data ?? [];
}

/**
 * Returns outstanding invoice data for a customer via the `invoice_outstanding` view.
 */
export async function getCustomerOutstanding(customerId: string) {
  const { data, error } = await supabase
    .from("invoice_outstanding")
    .select("*")
    .eq("customer_id", customerId)
    .order("invoice_date", { ascending: false });

  if (error) throw new Error(`getCustomerOutstanding: ${error.message}`);
  return data ?? [];
}

// ── Financial Summaries & Ledger RPCs ─────────────────────────────────────────

export interface CustomerFinancialSummary {
  customer_id: string;
  customer_name: string;
  customer_code: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  is_active: boolean;
  credit_limit: number;
  opening_balance: number;
  daybook_debit: number;
  daybook_credit: number;
  invoice_debit: number;
  payment_credit: number;
  total_debit: number;
  total_credit: number;
  total_balance: number;
}

export interface CustomerLedgerEntry {
  entry_id: string;
  source: "day_book" | "invoice" | "payment";
  entry_date: string;
  voucher_no: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number | null;
  created_at: string;
}

/**
 * Returns aggregated financial breakdown (Opening, Debit, Credit, Net Balance)
 * for a specific customer or all customers.
 */
export async function getCustomerFinancialSummaries(
  customerId?: string
): Promise<CustomerFinancialSummary[]> {
  const { data, error } = await supabase.rpc("get_customer_financial_summaries", {
    p_customer_id: customerId || null,
  });

  if (error) {
    console.error("getCustomerFinancialSummaries error:", error);
    throw new Error(`getCustomerFinancialSummaries: ${error.message}`);
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    customer_id: String(row.customer_id),
    customer_name: String(row.customer_name || ""),
    customer_code: row.customer_code ? String(row.customer_code) : null,
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    address: row.address ? String(row.address) : null,
    city: row.city ? String(row.city) : null,
    state: row.state ? String(row.state) : null,
    pincode: row.pincode ? String(row.pincode) : null,
    gstin: row.gstin ? String(row.gstin) : null,
    is_active: Boolean(row.is_active),
    credit_limit: Number(row.credit_limit || 0),
    opening_balance: Number(row.opening_balance || 0),
    daybook_debit: Number(row.daybook_debit || 0),
    daybook_credit: Number(row.daybook_credit || 0),
    invoice_debit: Number(row.invoice_debit || 0),
    payment_credit: Number(row.payment_credit || 0),
    total_debit: Number(row.total_debit || 0),
    total_credit: Number(row.total_credit || 0),
    total_balance: Number(row.total_balance || 0),
  }));
}

/**
 * Returns chronological transaction ledger entries (Day Book, Invoices, Collections)
 * for a customer.
 */
export async function getCustomerLedger(
  customerId: string
): Promise<CustomerLedgerEntry[]> {
  const { data, error } = await supabase.rpc("get_customer_ledger", {
    p_customer_id: customerId,
  });

  if (error) {
    console.error("getCustomerLedger error:", error);
    throw new Error(`getCustomerLedger: ${error.message}`);
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    entry_id: String(row.entry_id),
    source: (row.source as "day_book" | "invoice" | "payment") || "day_book",
    entry_date: String(row.entry_date || ""),
    voucher_no: String(row.voucher_no || "—"),
    particulars: String(row.particulars || ""),
    debit: Number(row.debit || 0),
    credit: Number(row.credit || 0),
    balance: row.balance !== null && row.balance !== undefined ? Number(row.balance) : null,
    created_at: String(row.created_at || ""),
  }));
}
