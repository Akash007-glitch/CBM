import { supabase } from "@/app/lib/supabase";
import type { Tables } from "@/types/database";
import type { NormalizedDayBookRow } from "@/lib/utils/excelParser";

export type DayBookEntryRow = Tables<"day_book_entries">;
export type ImportBatchRow = Tables<"import_batches">;
export type ImportErrorRow = Tables<"import_errors">;

export interface ImportDayBookPayload {
  fileName: string;
  fileSize?: number;
  targetAccount?: string;
  checkDuplicates?: boolean;
  rows: NormalizedDayBookRow[];
}

export interface ImportDayBookResponse {
  batchId: string;
  fileName: string;
  totalRows: number;
  successfulRows: number;
  newCustomersCount: number;
  duplicateRows: number;
  failedRows: number;
  status: "processing" | "completed" | "completed_with_errors" | "failed";
  errors: {
    row_number: number;
    error_reason: string;
    raw_data: Record<string, unknown> | null;
  }[];
}

/**
 * Sends parsed Day Book data to the secure server route for database processing
 */
export async function importDayBook(
  payload: ImportDayBookPayload
): Promise<ImportDayBookResponse> {
  const response = await fetch("/api/admin/day-book/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Import failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Returns recent import batches
 */
export async function getImportBatches(limit = 20): Promise<ImportBatchRow[]> {
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getImportBatches: ${error.message}`);
  return data ?? [];
}

/**
 * Returns Day Book entries for a customer or batch
 */
export async function getDayBookEntries(params: {
  customerId?: string;
  batchId?: string;
  limit?: number;
}): Promise<DayBookEntryRow[]> {
  let query = supabase
    .from("day_book_entries")
    .select("*, customers(name, customer_code)")
    .order("transaction_date", { ascending: false });

  if (params.customerId) {
    query = query.eq("customer_id", params.customerId);
  }
  if (params.batchId) {
    query = query.eq("import_batch_id", params.batchId);
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getDayBookEntries: ${error.message}`);
  return data ?? [];
}

/**
 * Returns errors for an import batch
 */
export async function getImportErrors(batchId: string): Promise<ImportErrorRow[]> {
  const { data, error } = await supabase
    .from("import_errors")
    .select("*")
    .eq("import_batch_id", batchId)
    .order("row_number", { ascending: true });

  if (error) throw new Error(`getImportErrors: ${error.message}`);
  return data ?? [];
}
