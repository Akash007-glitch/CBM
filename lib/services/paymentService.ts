/**
 * paymentService.ts
 *
 * Operations for recording payments and allocating them to invoices.
 * The DB trigger on `payment_allocations` enforces:
 *   - No over-allocation against a payment
 *   - No over-payment against an invoice
 *   - Auto-recalculation of invoice status
 */

import { supabase } from "@/app/lib/supabase";
import type { Tables, TablesInsert } from "@/types/database";

export type PaymentRow = Tables<"payments">;
export type AllocationRow = Tables<"payment_allocations">;
export type PaymentInsert = TablesInsert<"payments">;

// ── Extended types ────────────────────────────────────────────────────────────

export interface PaymentWithCustomer extends PaymentRow {
  customers: { name: string; phone: string | null } | null;
  salesmen: { name: string } | null;
}

export interface AllocationRequest {
  invoice_id: string;
  allocated_amount: number;
}

export interface PaymentFilters {
  customer_id?: string;
  salesman_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Returns a list of payments with customer and salesman names.
 */
export async function getPayments(
  filters: PaymentFilters = {}
): Promise<PaymentWithCustomer[]> {
  let query = supabase
    .from("payments")
    .select("*, customers(name, phone), salesmen(name)")
    .order("payment_date", { ascending: false });

  if (filters.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters.salesman_id) query = query.eq("salesman_id", filters.salesman_id);
  if (filters.from_date)   query = query.gte("payment_date", filters.from_date);
  if (filters.to_date)     query = query.lte("payment_date", filters.to_date);
  if (filters.limit)       query = query.limit(filters.limit);
  if (filters.offset) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit ?? 50) - 1
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`getPayments: ${error.message}`);
  return (data ?? []) as PaymentWithCustomer[];
}

/**
 * Returns a single payment.
 */
export async function getPayment(id: string): Promise<PaymentWithCustomer | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("*, customers(name, phone), salesmen(name)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getPayment: ${error.message}`);
  }
  return data as PaymentWithCustomer;
}

/**
 * Returns the payment allocations for a given payment.
 */
export async function getPaymentAllocations(
  paymentId: string
): Promise<AllocationRow[]> {
  const { data, error } = await supabase
    .from("payment_allocations")
    .select("*")
    .eq("payment_id", paymentId);

  if (error) throw new Error(`getPaymentAllocations: ${error.message}`);
  return data ?? [];
}

/**
 * Calculates the unallocated remainder of a payment.
 * (payment.amount) - SUM(payment_allocations.allocated_amount)
 */
export async function getUnallocatedAmount(paymentId: string): Promise<number> {
  const payment = await getPayment(paymentId);
  if (!payment) throw new Error(`getUnallocatedAmount: payment ${paymentId} not found`);

  const allocations = await getPaymentAllocations(paymentId);
  const allocated = allocations.reduce((s, a) => s + Number(a.allocated_amount), 0);
  return Math.max(0, Number(payment.amount) - allocated);
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Records a new payment.
 * `amount` must be > 0 (enforced by DB CHECK constraint).
 */
export async function createPayment(
  payload: PaymentInsert
): Promise<PaymentRow> {
  const { data, error } = await supabase
    .from("payments")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`createPayment: ${error.message}`);
  return data;
}

/**
 * Allocates a payment to one or more invoices.
 *
 * The DB trigger (`recalculate_invoice_status`) will:
 *   1. Validate that total allocations for this payment do not exceed payment.amount
 *   2. Validate that total allocated to each invoice does not exceed invoice.total_amount
 *   3. Update each invoice's status automatically
 *
 * @throws if any allocation would cause over-allocation (DB raises EXCEPTION)
 */
export async function allocatePayment(
  paymentId: string,
  allocations: AllocationRequest[]
): Promise<AllocationRow[]> {
  if (allocations.length === 0) return [];

  const rows = allocations.map((a) => ({
    payment_id: paymentId,
    invoice_id: a.invoice_id,
    allocated_amount: a.allocated_amount,
  }));

  const { data, error } = await supabase
    .from("payment_allocations")
    .insert(rows)
    .select();

  if (error) throw new Error(`allocatePayment: ${error.message}`);
  return data ?? [];
}

/**
 * Records a payment AND immediately allocates it — common single-invoice flow.
 * Returns both the payment and the allocations created.
 */
export async function createAndAllocatePayment(
  paymentPayload: PaymentInsert,
  allocations: AllocationRequest[]
): Promise<{ payment: PaymentRow; allocations: AllocationRow[] }> {
  const payment = await createPayment(paymentPayload);
  const createdAllocations = await allocatePayment(payment.id, allocations);
  return { payment, allocations: createdAllocations };
}
