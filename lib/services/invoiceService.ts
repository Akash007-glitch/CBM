/**
 * invoiceService.ts
 *
 * Full lifecycle management for invoices and their line items.
 * Cancellation preserves the record for audit; status is auto-managed by DB trigger.
 */

import { supabase } from "@/app/lib/supabase";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database";

export type InvoiceRow = Tables<"invoices">;
export type InvoiceItemRow = Tables<"invoice_items">;
export type InvoiceItemInsert = TablesInsert<"invoice_items">;
export type OutstandingRow = Tables<"invoice_outstanding">;

// ── Extended types ────────────────────────────────────────────────────────────

export interface InvoiceWithDetails extends InvoiceRow {
  customers: { name: string; phone: string | null; city: string | null } | null;
  salesmen: { name: string; email: string | null } | null;
  invoice_items: InvoiceItemRow[];
}

export interface CreateInvoicePayload {
  invoice_number: string;
  customer_id: string;
  salesman_id: string;
  created_by: string;
  invoice_date?: string;
  due_date?: string | null;
  subtotal: number;
  discount_amount?: number;
  total_amount: number;
  notes?: string | null;
  status?: string;
  items: Omit<InvoiceItemInsert, "invoice_id">[];
}

export interface InvoiceFilters {
  customer_id?: string;
  salesman_id?: string;
  status?: string | string[];
  from_date?: string;
  to_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Lists invoices with customer and salesman names.
 * Accepts optional filters for status, date range, and search.
 */
export async function getInvoices(
  filters: InvoiceFilters = {}
): Promise<InvoiceRow[]> {
  let query = supabase
    .from("invoices")
    .select("*, customers(name), salesmen(name)")
    .order("invoice_date", { ascending: false });

  if (filters.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters.salesman_id) query = query.eq("salesman_id", filters.salesman_id);
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }
  if (filters.from_date) query = query.gte("invoice_date", filters.from_date);
  if (filters.to_date)   query = query.lte("invoice_date", filters.to_date);
  if (filters.search) {
    query = query.ilike("invoice_number", `%${filters.search}%`);
  }
  if (filters.limit)  query = query.limit(filters.limit);
  if (filters.offset) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit ?? 50) - 1
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`getInvoices: ${error.message}`);
  return (data ?? []) as InvoiceRow[];
}

/**
 * Returns a single invoice with full details: customer, salesman, and line items.
 */
export async function getInvoice(id: string): Promise<InvoiceWithDetails | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `*, customers(name, phone, city), salesmen(name, email), invoice_items(*)`
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getInvoice: ${error.message}`);
  }
  return data as InvoiceWithDetails;
}

/**
 * Returns outstanding invoice data via the `invoice_outstanding` view.
 */
export async function getOutstanding(
  filters: Pick<InvoiceFilters, "customer_id" | "salesman_id"> = {}
): Promise<OutstandingRow[]> {
  let query = supabase
    .from("invoice_outstanding")
    .select("*")
    .order("invoice_date", { ascending: false });

  if (filters.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters.salesman_id) query = query.eq("salesman_id", filters.salesman_id);

  const { data, error } = await query;
  if (error) throw new Error(`getOutstanding: ${error.message}`);
  return (data ?? []) as OutstandingRow[];
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Creates an invoice together with its line items in a single round-trip.
 * Line items are inserted after the invoice to use the returned ID.
 *
 * Note: Supabase does not expose multi-statement transactions via the JS client.
 * If the item insert fails after the invoice is created, the invoice will exist
 * without items. For production, wrap this in a Postgres function if atomicity
 * is strictly required.
 */
export async function createInvoice(
  payload: CreateInvoicePayload
): Promise<InvoiceRow> {
  const { items, ...invoiceData } = payload;

  // Insert invoice
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      ...invoiceData,
      discount_amount: invoiceData.discount_amount ?? 0,
      status: invoiceData.status ?? "issued",
    })
    .select()
    .single();

  if (invErr) throw new Error(`createInvoice: ${invErr.message}`);

  // Insert line items
  if (items.length > 0) {
    const { error: itemsErr } = await supabase.from("invoice_items").insert(
      items.map((item) => ({ ...item, invoice_id: invoice.id }))
    );
    if (itemsErr) throw new Error(`createInvoice (items): ${itemsErr.message}`);
  }

  return invoice;
}

/**
 * Updates mutable invoice fields (notes, due_date, discount_amount, etc.).
 * Does not allow changing customer_id or salesman_id after creation.
 */
export async function updateInvoice(
  id: string,
  payload: TablesUpdate<"invoices">
): Promise<InvoiceRow> {
  const { data, error } = await supabase
    .from("invoices")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`updateInvoice: ${error.message}`);
  return data;
}

/**
 * Cancels an invoice by setting status = 'cancelled'.
 * Does NOT delete the record — preserves the audit trail.
 * Cancelled invoices are excluded from the invoice_outstanding view.
 */
export async function cancelInvoice(id: string): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) throw new Error(`cancelInvoice: ${error.message}`);
}

/**
 * Returns the line items for a given invoice.
 */
export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItemRow[]> {
  const { data, error } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at");

  if (error) throw new Error(`getInvoiceItems: ${error.message}`);
  return data ?? [];
}
