import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  normalizeCustomerName,
  generateDuplicateHash,
  type NormalizedDayBookRow,
} from "@/lib/utils/excelParser";
import type { TablesInsert, Json } from "@/types/database";

export const maxDuration = 60; // Allow sufficient time for batch processing large imports

export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate Caller with Server Supabase Client ────────────────────
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: callerUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !callerUser) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // ── 2. Verify Admin Role ─────────────────────────────────────────────────
    const { data: callerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (profileError || !callerProfile || (callerProfile as { role: string }).role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin users can import Day Book data." },
        { status: 403 }
      );
    }

    // Prefer service role client for bulk ingestion to bypass RLS bottlenecks
    let dbClient = supabase;
    try {
      dbClient = createAdminSupabaseClient();
    } catch {
      dbClient = supabase;
    }

    // ── 3. Parse Request Payload ─────────────────────────────────────────────
    let body: {
      fileName: string;
      fileSize?: number;
      targetAccount?: string;
      checkDuplicates?: boolean;
      rows: NormalizedDayBookRow[];
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const {
      fileName,
      fileSize = 0,
      targetAccount = "Day Book / Cash Account",
      checkDuplicates = true,
      rows = [],
    } = body;

    const MAX_IMPORT_ROWS = 5000;

    if (!fileName || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "fileName and a non-empty rows array are required." },
        { status: 400 }
      );
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { error: `Import batch exceeds the maximum allowed limit of ${MAX_IMPORT_ROWS} rows.` },
        { status: 400 }
      );
    }

    // ── 4. Create Import Batch Record using Authenticated Admin Client ────────
    let { data: batchData, error: batchError } = await dbClient
      .from("import_batches")
      .insert({
        file_name: fileName,
        file_size: fileSize,
        target_account: targetAccount,
        total_rows: rows.length,
        status: "processing",
        uploaded_by: callerUser.id,
      })
      .select("id")
      .single();

    if (batchError && dbClient !== supabase) {
      console.warn("[day-book/import] Service role client failed, retrying with authenticated admin client:", batchError.message);
      dbClient = supabase;
      const retry = await dbClient
        .from("import_batches")
        .insert({
          file_name: fileName,
          file_size: fileSize,
          target_account: targetAccount,
          total_rows: rows.length,
          status: "processing",
          uploaded_by: callerUser.id,
        })
        .select("id")
        .single();
      batchData = retry.data;
      batchError = retry.error;
    }

    if (batchError || !batchData) {
      console.error("[day-book/import] Failed to create import batch:", batchError);
      return NextResponse.json(
        { error: `Failed to initialize import batch: ${batchError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    const batchId = batchData.id;

    // ── 5. Fetch Existing Customers for Matching ─────────────────────────────
    const { data: existingCustomers, error: custError } = await dbClient
      .from("customers")
      .select("id, name, customer_code, gstin, phone, email, opening_balance");

    if (custError) {
      console.error("[day-book/import] Failed to fetch customers:", custError);
    }

    const customerMapByName = new Map<string, string>();
    const customerMapByCode = new Map<string, string>();
    const customerMapByGstin = new Map<string, string>();
    const customerOpeningBalMap = new Map<string, number>();

    (existingCustomers || []).forEach((c) => {
      if (c.id) customerOpeningBalMap.set(c.id, Number(c.opening_balance || 0));
      if (c.name) customerMapByName.set(normalizeCustomerName(c.name), c.id);
      if (c.customer_code) customerMapByCode.set(c.customer_code.trim().toLowerCase(), c.id);
      if (c.gstin) customerMapByGstin.set(c.gstin.trim().toLowerCase(), c.id);
    });

    // ── 6. Group Rows & Identify Missing Customers ───────────────────────────
    const newCustomersToInsertMap = new Map<
      string,
      {
        name: string;
        customer_code?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        pincode?: string | null;
        gstin?: string | null;
        is_active: boolean;
        opening_balance: number;
        credit_limit: number;
      }
    >();

    const validRowsToProcess: NormalizedDayBookRow[] = [];
    const importErrorsList: {
      row_number: number;
      error_reason: string;
      raw_data: Json | null;
    }[] = [];

    function sanitizeFormula(val: unknown): string | null {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      if (!str) return null;
      // If the value begins with formula characters, prefix with single quote to prevent spreadsheet injection
      if (/^[=+@\-\t\r]/.test(str)) {
        return `'${str}`;
      }
      return str;
    }

    const SUMMARY_KEYWORDS_PATTERN = /^(total|totals|grand\s*total|sub\s*total|subtotal|closing\s*balance|summary|brought\s*forward|carried\s*forward|b\/f|c\/f|inwards?\s*qty|outwards?\s*qty)$/i;

    for (const row of rows) {
      if (!row) continue;

      const rawCustName = typeof row.customerName === "string" ? row.customerName.trim() : "";
      const rawDateStr = typeof row.transactionDate === "string" ? row.transactionDate.trim() : "";
      const rawValues = row.rawRowData ? Object.values(row.rawRowData).map((v) => String(v ?? "").trim()) : [];

      // If this row is a total/summary footer row, silently skip it without recording an error
      if (
        SUMMARY_KEYWORDS_PATTERN.test(rawCustName) ||
        SUMMARY_KEYWORDS_PATTERN.test(rawDateStr) ||
        rawValues.some((v) => SUMMARY_KEYWORDS_PATTERN.test(v)) ||
        (!rawCustName && !row.voucherRef && Number(row.debit || 0) === 0 && Number(row.credit || 0) === 0)
      ) {
        continue;
      }

      if (!row.isValid) {
        importErrorsList.push({
          row_number: row?.rowNumber || 0,
          error_reason: row?.errorReason || "Row validation failed",
          raw_data: (row?.rawRowData ?? {}) as unknown as Json,
        });
        continue;
      }

      if (!rawCustName) {
        importErrorsList.push({
          row_number: row.rowNumber || 0,
          error_reason: "Customer name is missing or invalid.",
          raw_data: (row.rawRowData ?? {}) as unknown as Json,
        });
        continue;
      }

      const normName = normalizeCustomerName(rawCustName);
      const normCode = row.customerCode ? String(row.customerCode).trim().toLowerCase() : null;
      const normGstin = row.gstin ? String(row.gstin).trim().toLowerCase() : null;

      const matchedId =
        (normCode ? customerMapByCode.get(normCode) : null) ||
        (normGstin ? customerMapByGstin.get(normGstin) : null) ||
        customerMapByName.get(normName);

      if (!matchedId) {
        if (!newCustomersToInsertMap.has(normName)) {
          const rowOpBal = Number(row.openingBalance || 0);
          newCustomersToInsertMap.set(normName, {
            name: sanitizeFormula(rawCustName) || rawCustName,
            customer_code: sanitizeFormula(row.customerCode) || null,
            phone: sanitizeFormula(row.phone) || null,
            email: sanitizeFormula(row.email) || null,
            address: sanitizeFormula(row.address) || null,
            city: sanitizeFormula(row.city) || null,
            state: sanitizeFormula(row.state) || null,
            pincode: sanitizeFormula(row.pincode) || null,
            gstin: sanitizeFormula(row.gstin) || null,
            is_active: true,
            opening_balance: rowOpBal,
            credit_limit: 0,
          });
        }
      }

      validRowsToProcess.push(row);
    }

    // ── 7. Batch Create New Customers with Row-Level Fallback ────────────────
    let newCustomersCount = 0;
    const newCustomerList = Array.from(newCustomersToInsertMap.values());

    if (newCustomerList.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < newCustomerList.length; i += chunkSize) {
        const chunk = newCustomerList.slice(i, i + chunkSize);
        const { data: createdCusts, error: insertCustErr } = await dbClient
          .from("customers")
          .insert(chunk)
          .select("id, name, customer_code, gstin, opening_balance");

        if (insertCustErr) {
          console.warn("[day-book/import] Chunk customer insert failed, falling back to row-by-row:", insertCustErr.message);

          // Retry inserting each customer individually
          for (const cust of chunk) {
            const { data: singleCust, error: singleErr } = await dbClient
              .from("customers")
              .insert(cust)
              .select("id, name, customer_code, gstin, opening_balance")
              .single();

            if (singleErr) {
              // Retry without gstin in case column is missing from older migration
              const custWithoutGstin = { ...cust };
              delete custWithoutGstin.gstin;
              const { data: retryCust, error: retryErr } = await dbClient
                .from("customers")
                .insert(custWithoutGstin)
                .select("id, name, customer_code, opening_balance")
                .single();

              if (retryErr) {
                console.error(`[day-book/import] Could not create customer "${cust.name}":`, retryErr.message);
                importErrorsList.push({
                  row_number: 0,
                  error_reason: `Failed to create customer "${cust.name}": ${retryErr.message}`,
                  raw_data: cust as unknown as Json,
                });
              } else if (retryCust) {
                if (retryCust.name) customerMapByName.set(normalizeCustomerName(retryCust.name), retryCust.id);
                if (retryCust.customer_code) customerMapByCode.set(retryCust.customer_code.trim().toLowerCase(), retryCust.id);
                customerOpeningBalMap.set(retryCust.id, Number(retryCust.opening_balance || cust.opening_balance || 0));
                newCustomersCount++;
              }
            } else if (singleCust) {
              if (singleCust.name) customerMapByName.set(normalizeCustomerName(singleCust.name), singleCust.id);
              if (singleCust.customer_code) customerMapByCode.set(singleCust.customer_code.trim().toLowerCase(), singleCust.id);
              if (singleCust.gstin) customerMapByGstin.set(singleCust.gstin.trim().toLowerCase(), singleCust.id);
              customerOpeningBalMap.set(singleCust.id, Number(singleCust.opening_balance || cust.opening_balance || 0));
              newCustomersCount++;
            }
          }
        } else if (createdCusts) {
          createdCusts.forEach((c) => {
            if (c.name) customerMapByName.set(normalizeCustomerName(c.name), c.id);
            if (c.customer_code) customerMapByCode.set(c.customer_code.trim().toLowerCase(), c.id);
            if (c.gstin) customerMapByGstin.set(c.gstin.trim().toLowerCase(), c.id);
            customerOpeningBalMap.set(c.id, Number(c.opening_balance || 0));
          });
          newCustomersCount += createdCusts.length;
        }
      }
    }

    // ── 8. Duplicate Detection & Querying ────────────────────────────────────
    const existingHashesSet = new Set<string>();

    if (checkDuplicates && validRowsToProcess.length > 0) {
      const hashes = validRowsToProcess
        .map((r) => r.duplicateHash)
        .filter((h): h is string => Boolean(h));

      // Query in chunks of 200 hashes
      const hashChunkSize = 200;
      for (let i = 0; i < hashes.length; i += hashChunkSize) {
        const chunk = hashes.slice(i, i + hashChunkSize);
        const { data: existingEntries } = await dbClient
          .from("day_book_entries")
          .select("duplicate_hash")
          .in("duplicate_hash", chunk);

        (existingEntries || []).forEach((e) => {
          if (e.duplicate_hash) existingHashesSet.add(e.duplicate_hash);
        });
      }
    }

    // ── 9. Filter Non-Duplicate Entries for Insertion ────────────────────────
    const entriesToInsert: TablesInsert<"day_book_entries">[] = [];
    const seenBatchHashes = new Set<string>();
    const customerRunningBalances = new Map<string, number>();
    let duplicateRowsCount = 0;

    for (const row of validRowsToProcess) {
      const normName = normalizeCustomerName(row.customerName);
      const normCode = row.customerCode ? row.customerCode.trim().toLowerCase() : null;
      const normGstin = row.gstin ? row.gstin.trim().toLowerCase() : null;

      const customerId =
        (normCode ? customerMapByCode.get(normCode) : null) ||
        (normGstin ? customerMapByGstin.get(normGstin) : null) ||
        customerMapByName.get(normName);

      if (!customerId) {
        importErrorsList.push({
          row_number: row.rowNumber,
          error_reason: `Could not resolve customer "${row.customerName}"`,
          raw_data: (row.rawRowData ?? {}) as unknown as Json,
        });
        continue;
      }

      const dupHash =
        row.duplicateHash ||
        generateDuplicateHash(
          row.customerName,
          row.voucherType ?? null,
          row.voucherRef ?? null,
          row.transactionDate,
          row.debit,
          row.credit
        );

      if (checkDuplicates) {
        if (existingHashesSet.has(dupHash) || seenBatchHashes.has(dupHash)) {
          duplicateRowsCount++;
          continue; // skip duplicate entry
        }
      }

      seenBatchHashes.add(dupHash);

      // If duplicate checking is disabled, ensure unique hash suffix so Postgres UNIQUE constraint is not violated
      const finalHash = checkDuplicates
        ? dupHash
        : `${dupHash}::force_${batchId.slice(0, 8)}_${row.rowNumber}`;

      // Track running balance starting from customer opening balance
      if (!customerRunningBalances.has(customerId)) {
        const initBal = customerOpeningBalMap.get(customerId) ?? Number(row.openingBalance || 0);
        customerRunningBalances.set(customerId, initBal);
      }
      const prevBal = customerRunningBalances.get(customerId) ?? 0;
      const calculatedEntryBalance = prevBal + Number(row.debit || 0) - Number(row.credit || 0);
      customerRunningBalances.set(customerId, calculatedEntryBalance);

      entriesToInsert.push({
        import_batch_id: batchId,
        customer_id: customerId,
        transaction_date: row.transactionDate,
        voucher_type: sanitizeFormula(row.voucherType) || null,
        voucher_ref: sanitizeFormula(row.voucherRef) || null,
        particulars: sanitizeFormula(row.particulars || row.customerName) || null,
        debit: Number(row.debit || 0),
        credit: Number(row.credit || 0),
        balance: calculatedEntryBalance,
        amount: Number(row.amount || Math.max(row.debit || 0, row.credit || 0)),
        transaction_type: row.transactionType || (Number(row.debit || 0) > 0 ? "debit" : "credit"),
        source: "excel_import",
        duplicate_hash: finalHash,
        raw_row_data: row.rawRowData as unknown as Json,
        created_by: callerUser.id,
      });
    }

    // ── 10. Batch Insert Day Book Entries with Graceful Fallback ─────────────
    let successfulRowsCount = 0;
    const entryChunkSize = 200;

    for (let i = 0; i < entriesToInsert.length; i += entryChunkSize) {
      const chunk = entriesToInsert.slice(i, i + entryChunkSize);
      const { data: inserted, error: insertErr } = await dbClient
        .from("day_book_entries")
        .insert(chunk)
        .select("id");

      if (insertErr) {
        console.warn("[day-book/import] Chunk insert failed, falling back to row-by-row:", insertErr.message);

        // Fall back to row-by-row insertion
        for (let idx = 0; idx < chunk.length; idx++) {
          const entry = chunk[idx];
          const { data: singleInsert, error: singleErr } = await dbClient
            .from("day_book_entries")
            .insert(entry)
            .select("id")
            .single();

          if (singleErr) {
            const isUniqueViolation =
              singleErr.message.includes("unique constraint") ||
              singleErr.message.includes("duplicate_hash") ||
              singleErr.code === "23505";

            if (isUniqueViolation && checkDuplicates) {
              // Gracefully treat un-queried duplicate as duplicate skipped
              duplicateRowsCount++;
            } else if (isUniqueViolation && !checkDuplicates) {
              // User specifically disabled duplicate checking: retry with unique timestamp suffix
              const retryHash = `${entry.duplicate_hash || "entry"}::retry_${Date.now()}_${idx}`;
              const { data: retryInsert, error: retryErr } = await dbClient
                .from("day_book_entries")
                .insert({ ...entry, duplicate_hash: retryHash })
                .select("id")
                .single();

              if (retryErr) {
                importErrorsList.push({
                  row_number: i + idx + 2,
                  error_reason: retryErr.message,
                  raw_data: (entry.raw_row_data ?? null) as Json | null,
                });
              } else if (retryInsert) {
                successfulRowsCount++;
              }
            } else {
              importErrorsList.push({
                row_number: i + idx + 2,
                error_reason: singleErr.message,
                raw_data: (entry.raw_row_data ?? null) as Json | null,
              });
            }
          } else if (singleInsert) {
            successfulRowsCount++;
          }
        }
      } else if (inserted) {
        successfulRowsCount += inserted.length;
      }
    }

    // ── 11. Insert Import Errors ─────────────────────────────────────────────
    if (importErrorsList.length > 0) {
      const formattedErrors = importErrorsList.map((err) => ({
        import_batch_id: batchId,
        row_number: err.row_number,
        error_reason: err.error_reason,
        raw_data: err.raw_data,
      }));

      const errorChunkSize = 100;
      for (let i = 0; i < formattedErrors.length; i += errorChunkSize) {
        const chunk = formattedErrors.slice(i, i + errorChunkSize);
        await dbClient.from("import_errors").insert(chunk);
      }
    }

    // ── 12. Update Import Batch Record ───────────────────────────────────────
    const failedRowsCount = importErrorsList.length;
    let finalStatus: "completed" | "completed_with_errors" | "failed" = "completed";

    if (successfulRowsCount === 0 && failedRowsCount > 0) {
      finalStatus = "failed";
    } else if (failedRowsCount > 0) {
      finalStatus = "completed_with_errors";
    }

    await dbClient
      .from("import_batches")
      .update({
        successful_rows: successfulRowsCount,
        duplicate_rows: duplicateRowsCount,
        failed_rows: failedRowsCount,
        new_customers_count: newCustomersCount,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    // ── 13. Log Activity ─────────────────────────────────────────────────────
    try {
      await dbClient.rpc("log_activity", {
        p_action: "day_book_import",
        p_description: `Imported ${successfulRowsCount} Day Book entries from "${fileName}". (${newCustomersCount} new customers, ${duplicateRowsCount} duplicates skipped, ${failedRowsCount} errors)`,
        p_entity_type: "import_batches",
        p_entity_id: batchId,
        p_user_id: callerUser.id,
        p_metadata: {
          file_name: fileName,
          successful_rows: successfulRowsCount,
          duplicate_rows: duplicateRowsCount,
          failed_rows: failedRowsCount,
          new_customers_count: newCustomersCount,
        },
      });
    } catch (actErr) {
      console.warn("[day-book/import] Non-fatal: failed to log activity:", actErr);
    }

    // ── 14. Return Results ───────────────────────────────────────────────────
    return NextResponse.json(
      {
        batchId,
        fileName,
        totalRows: rows.length,
        successfulRows: successfulRowsCount,
        newCustomersCount,
        duplicateRows: duplicateRowsCount,
        failedRows: failedRowsCount,
        status: finalStatus,
        errors: importErrorsList.slice(0, 50),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[day-book/import] Unhandled error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
