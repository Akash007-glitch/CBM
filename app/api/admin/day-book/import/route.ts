import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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

    if (!fileName || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "fileName and a non-empty rows array are required." },
        { status: 400 }
      );
    }

    // ── 4. Create Import Batch Record using Authenticated Admin Client ────────
    const { data: batchData, error: batchError } = await supabase
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

    if (batchError || !batchData) {
      console.error("[day-book/import] Failed to create import batch:", batchError);
      return NextResponse.json(
        { error: `Failed to initialize import batch: ${batchError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    const batchId = batchData.id;

    // ── 5. Fetch Existing Customers for Matching ─────────────────────────────
    const { data: existingCustomers, error: custError } = await supabase
      .from("customers")
      .select("id, name, customer_code, gstin, phone, email");

    if (custError) {
      console.error("[day-book/import] Failed to fetch customers:", custError);
    }

    const customerMapByName = new Map<string, string>();
    const customerMapByCode = new Map<string, string>();
    const customerMapByGstin = new Map<string, string>();

    (existingCustomers || []).forEach((c) => {
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

    for (const row of rows) {
      if (!row.isValid) {
        importErrorsList.push({
          row_number: row.rowNumber,
          error_reason: row.errorReason || "Row validation failed",
          raw_data: (row.rawRowData ?? {}) as unknown as Json,
        });
        continue;
      }

      const normName = normalizeCustomerName(row.customerName);
      const normCode = row.customerCode ? row.customerCode.trim().toLowerCase() : null;
      const normGstin = row.gstin ? row.gstin.trim().toLowerCase() : null;

      const matchedId =
        (normCode ? customerMapByCode.get(normCode) : null) ||
        (normGstin ? customerMapByGstin.get(normGstin) : null) ||
        customerMapByName.get(normName);

      if (!matchedId) {
        if (!newCustomersToInsertMap.has(normName)) {
          newCustomersToInsertMap.set(normName, {
            name: row.customerName.trim(),
            customer_code: row.customerCode?.trim() || null,
            phone: row.phone?.trim() || null,
            email: row.email?.trim() || null,
            address: row.address?.trim() || null,
            city: row.city?.trim() || null,
            state: row.state?.trim() || null,
            pincode: row.pincode?.trim() || null,
            gstin: row.gstin?.trim() || null,
            is_active: true,
            opening_balance: 0,
            credit_limit: 0,
          });
        }
      }

      validRowsToProcess.push(row);
    }

    // ── 7. Batch Create New Customers ────────────────────────────────────────
    let newCustomersCount = 0;
    const newCustomerList = Array.from(newCustomersToInsertMap.values());

    if (newCustomerList.length > 0) {
      // Insert in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < newCustomerList.length; i += chunkSize) {
        const chunk = newCustomerList.slice(i, i + chunkSize);
        const { data: createdCusts, error: insertCustErr } = await supabase
          .from("customers")
          .insert(chunk)
          .select("id, name, customer_code, gstin");

        if (insertCustErr) {
          console.error("[day-book/import] Error creating customers chunk:", insertCustErr);
        } else if (createdCusts) {
          createdCusts.forEach((c) => {
            if (c.name) customerMapByName.set(normalizeCustomerName(c.name), c.id);
            if (c.customer_code) customerMapByCode.set(c.customer_code.trim().toLowerCase(), c.id);
            if (c.gstin) customerMapByGstin.set(c.gstin.trim().toLowerCase(), c.id);
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
        const { data: existingEntries } = await supabase
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
          row.voucherRef,
          row.transactionDate,
          row.debit,
          row.credit,
          row.particulars
        );

      if (checkDuplicates) {
        if (existingHashesSet.has(dupHash) || seenBatchHashes.has(dupHash)) {
          duplicateRowsCount++;
          continue; // skip duplicate entry
        }
      }

      seenBatchHashes.add(dupHash);

      entriesToInsert.push({
        import_batch_id: batchId,
        customer_id: customerId,
        transaction_date: row.transactionDate,
        voucher_ref: row.voucherRef,
        particulars: row.particulars,
        debit: row.debit,
        credit: row.credit,
        balance: row.calculatedBalance,
        amount: row.amount,
        transaction_type: row.transactionType,
        source: "excel_import",
        duplicate_hash: dupHash,
        raw_row_data: row.rawRowData as unknown as Json,
        created_by: callerUser.id,
      });
    }

    // ── 10. Batch Insert Day Book Entries ────────────────────────────────────
    let successfulRowsCount = 0;
    const entryChunkSize = 200;

    for (let i = 0; i < entriesToInsert.length; i += entryChunkSize) {
      const chunk = entriesToInsert.slice(i, i + entryChunkSize);
      const { data: inserted, error: insertErr } = await supabase
        .from("day_book_entries")
        .insert(chunk)
        .select("id");

      if (insertErr) {
        console.error("[day-book/import] Error inserting day book chunk:", insertErr);
        // Record all rows in this chunk as failed
        chunk.forEach((entry, idx) => {
          importErrorsList.push({
            row_number: i + idx + 2,
            error_reason: insertErr.message,
            raw_data: (entry.raw_row_data ?? null) as Json | null,
          });
        });
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
        await supabase.from("import_errors").insert(chunk);
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

    await supabase
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
      await supabase.rpc("log_activity", {
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
