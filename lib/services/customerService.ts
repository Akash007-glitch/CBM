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
