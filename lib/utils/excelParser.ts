import * as XLSX from "xlsx";

export type ERPField =
  | "transaction_date"
  | "voucher_ref"
  | "customer_name"
  | "particulars"
  | "debit"
  | "credit"
  | "balance"
  | "amount"
  | "transaction_type"
  | "customer_code"
  | "phone"
  | "email"
  | "address"
  | "city"
  | "state"
  | "pincode"
  | "gstin";

export interface ColumnMappingDefinition {
  erpField: ERPField;
  label: string;
  required: boolean;
  synonyms: string[];
}

export const ERP_FIELD_DEFINITIONS: ColumnMappingDefinition[] = [
  {
    erpField: "transaction_date",
    label: "Transaction Date",
    required: true,
    synonyms: [
      "transaction date",
      "date",
      "txn date",
      "voucher date",
      "posting date",
      "vch date",
      "dt",
      "entry date",
    ],
  },
  {
    erpField: "voucher_ref",
    label: "Reference / Voucher No",
    required: false,
    synonyms: [
      "reference no",
      "reference number",
      "reference",
      "ref no",
      "ref",
      "voucher ref",
      "voucher reference",
      "voucher no",
      "voucher number",
      "vch no",
      "invoice no",
      "bill no",
      "doc no",
      "chq no",
    ],
  },
  {
    erpField: "customer_name",
    label: "Party / Customer Name",
    required: true,
    synonyms: [
      "party name",
      "party",
      "customer name",
      "customer",
      "ledger name",
      "ledger",
      "account name",
      "account",
      "client name",
      "client",
      "particulars/party",
    ],
  },
  {
    erpField: "particulars",
    label: "Particulars / Description",
    required: false,
    synonyms: [
      "particulars",
      "description",
      "narration",
      "remarks",
      "details",
      "note",
      "notes",
      "transaction details",
      "item description",
    ],
  },
  {
    erpField: "debit",
    label: "Debit (Money In)",
    required: false,
    synonyms: [
      "debit",
      "dr",
      "dr amount",
      "debit amount",
      "dr.",
      "receipts",
      "inflow",
      "deposit",
    ],
  },
  {
    erpField: "credit",
    label: "Credit (Money Out)",
    required: false,
    synonyms: [
      "credit",
      "cr",
      "cr amount",
      "credit amount",
      "cr.",
      "payments",
      "outflow",
      "withdrawal",
    ],
  },
  {
    erpField: "balance",
    label: "Running Balance",
    required: false,
    synonyms: [
      "balance",
      "running balance",
      "closing balance",
      "net balance",
      "bal",
      "current balance",
    ],
  },
  {
    erpField: "amount",
    label: "Amount / Value",
    required: false,
    synonyms: [
      "amount",
      "value",
      "net amount",
      "total",
      "total amount",
      "txn amount",
      "net value",
    ],
  },
  {
    erpField: "transaction_type",
    label: "Transaction Type (Dr/Cr)",
    required: false,
    synonyms: [
      "transaction type",
      "txn type",
      "type",
      "dr/cr",
      "cr/dr",
      "entry type",
      "d/c",
    ],
  },
  {
    erpField: "customer_code",
    label: "Customer / Party Code",
    required: false,
    synonyms: [
      "customer code",
      "party code",
      "ledger code",
      "account code",
      "code",
      "cust code",
    ],
  },
  {
    erpField: "phone",
    label: "Phone / Mobile",
    required: false,
    synonyms: [
      "phone",
      "mobile",
      "contact",
      "phone number",
      "mobile no",
      "contact no",
      "telephone",
    ],
  },
  {
    erpField: "email",
    label: "Email",
    required: false,
    synonyms: ["email", "email address", "e-mail", "mail"],
  },
  {
    erpField: "address",
    label: "Address",
    required: false,
    synonyms: ["address", "street", "street address", "location"],
  },
  {
    erpField: "city",
    label: "City",
    required: false,
    synonyms: ["city", "town", "district"],
  },
  {
    erpField: "state",
    label: "State",
    required: false,
    synonyms: ["state", "province"],
  },
  {
    erpField: "pincode",
    label: "PIN / ZIP Code",
    required: false,
    synonyms: ["pincode", "pin code", "zip", "zip code", "postal code", "pin"],
  },
  {
    erpField: "gstin",
    label: "GSTIN / Tax ID",
    required: false,
    synonyms: ["gstin", "gst no", "gst number", "gstin/uin", "tax id", "tax number"],
  },
];

export interface ColumnMapping {
  excelColumn: string;
  erpField: ERPField | "ignore";
  confidence: number;
  sampleData: string;
}

export interface NormalizedDayBookRow {
  rowNumber: number;
  transactionDate: string; // YYYY-MM-DD
  voucherRef: string | null;
  customerName: string;
  particulars: string | null;
  debit: number;
  credit: number;
  calculatedBalance: number;
  excelBalance: number | null;
  balance: number; // final balance (calculated)
  amount: number; // positive value for backwards compatibility
  transactionType: "debit" | "credit";
  customerCode?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  rawRowData: Record<string, unknown>;
  isValid: boolean;
  isBalanceMatched: boolean;
  errorReason?: string;
  duplicateHash?: string;
}

export interface ParseExcelResult {
  sheetName: string;
  headers: string[];
  mappings: ColumnMapping[];
  totalRows: number;
  previewRows: NormalizedDayBookRow[];
  allRows: NormalizedDayBookRow[];
  validCount: number;
  errorCount: number;
  balanceMismatchCount: number;
  uniqueCustomers: string[];
}

/**
 * Normalizes customer names for consistent matching
 */
export function normalizeCustomerName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Converts various date formats into YYYY-MM-DD
 */
export function parseExcelDate(value: unknown): string {
  if (!value) {
    return new Date().toISOString().split("T")[0];
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return new Date().toISOString().split("T")[0];
    return value.toISOString().split("T")[0];
  }

  if (typeof value === "number") {
    // Excel serial number (1900 date system)
    const dateObj = XLSX.SSF.parse_date_code(value);
    if (dateObj) {
      const y = dateObj.y.toString().padStart(4, "0");
      const m = dateObj.m.toString().padStart(2, "0");
      const d = dateObj.d.toString().padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(value).trim();
  if (!str) return new Date().toISOString().split("T")[0];

  // Try ISO YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    let y = dmyMatch[3];
    if (y.length === 2) {
      y = parseInt(y, 10) > 50 ? `19${y}` : `20${y}`;
    }
    return `${y}-${m}-${d}`;
  }

  // Fallback to JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

/**
 * Normalizes amount string/number
 */
export function parseExcelAmount(value: unknown): {
  amount: number;
  amountSigned: number;
  isNegative: boolean;
  isDebit: boolean;
  isCredit: boolean;
} {
  if (typeof value === "number") {
    return {
      amount: Math.abs(value),
      amountSigned: value,
      isNegative: value < 0,
      isDebit: value >= 0,
      isCredit: value < 0,
    };
  }

  if (!value) {
    return {
      amount: 0,
      amountSigned: 0,
      isNegative: false,
      isDebit: true,
      isCredit: false,
    };
  }

  let str = String(value).trim();
  const isDr = /\b(dr|debit)\b/i.test(str);
  const isCr = /\b(cr|credit)\b/i.test(str);
  const isParenthesesNegative = /^\(.*\)$/.test(str);

  // Strip currency symbols, commas, spaces, Dr/Cr indicators
  str = str
    .replace(/[₹$€£,]/g, "")
    .replace(/\b(dr|cr|debit|credit)\b/gi, "")
    .replace(/[()]/g, "")
    .trim();

  const num = parseFloat(str);
  const validNum = isNaN(num) ? 0 : num;
  const isNegative = validNum < 0 || isParenthesesNegative || isCr;
  const amountSigned = isNegative ? -Math.abs(validNum) : Math.abs(validNum);

  return {
    amount: Math.abs(validNum),
    amountSigned,
    isNegative,
    isDebit: isDr || (!isCr && !isNegative),
    isCredit: isCr || isNegative,
  };
}

/**
 * Generates deterministic duplicate hash based on voucher_ref or transaction details.
 * Balance is deliberately excluded from hash.
 */
export function generateDuplicateHash(
  customerName: string,
  voucherRef: string | null,
  transactionDate: string,
  debit: number,
  credit: number,
  particulars: string | null = null
): string {
  const normName = normalizeCustomerName(customerName);
  const normRef = (voucherRef || "").trim().toLowerCase();
  const normDate = transactionDate.trim();
  const normDeb = Number(debit || 0).toFixed(2);
  const normCred = Number(credit || 0).toFixed(2);

  if (normRef) {
    return `${normName}::ref_${normRef}::${normDate}::deb_${normDeb}::cred_${normCred}`;
  }

  const normPart = (particulars || "").trim().toLowerCase().slice(0, 40);
  return `${normName}::part_${normPart}::${normDate}::deb_${normDeb}::cred_${normCred}`;
}

/**
 * Automatically detects the best ERP field match for a given Excel column header
 */
export function detectColumnMapping(
  header: string,
  sampleValue: unknown = ""
): { erpField: ERPField | "ignore"; confidence: number } {
  const cleanHeader = header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ");

  // Exact synonym match
  for (const def of ERP_FIELD_DEFINITIONS) {
    for (const syn of def.synonyms) {
      if (cleanHeader === syn) {
        return { erpField: def.erpField, confidence: 1.0 };
      }
    }
  }

  // Partial match
  for (const def of ERP_FIELD_DEFINITIONS) {
    for (const syn of def.synonyms) {
      if (cleanHeader.includes(syn) || syn.includes(cleanHeader)) {
        return { erpField: def.erpField, confidence: 0.8 };
      }
    }
  }

  // Value inspection fallback
  if (sampleValue) {
    const sampleStr = String(sampleValue);
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(sampleStr)) {
      return { erpField: "transaction_date", confidence: 0.6 };
    }
    if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(sampleStr)) {
      return { erpField: "gstin", confidence: 0.9 };
    }
  }

  return { erpField: "ignore", confidence: 0 };
}

/**
 * Reads an uploaded Excel / CSV File and generates mappings & preview rows
 */
export async function parseExcelFile(file: File): Promise<ParseExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The uploaded Excel workbook has no sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: true, // return actual numbers so parseExcelAmount gets JS numbers, not formatted strings
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("No data found in sheet '" + firstSheetName + "'.");
  }

  // Extract raw headers
  const headers = Object.keys(rawRows[0] || {});

  // Build initial mappings
  const usedErpFields = new Set<string>();
  const mappings: ColumnMapping[] = headers.map((col) => {
    const sample = rawRows[0]?.[col] ? String(rawRows[0][col]) : "";
    const match = detectColumnMapping(col, sample);

    let erpField: ERPField | "ignore" = match.erpField;
    if (erpField !== "ignore" && usedErpFields.has(erpField)) {
      erpField = "ignore";
    } else if (erpField !== "ignore") {
      usedErpFields.add(erpField);
    }

    return {
      excelColumn: col,
      erpField,
      confidence: match.confidence,
      sampleData: sample,
    };
  });

  // Convert raw rows using detected mappings
  return transformRowsWithMappings(sheetNameOrDefault(firstSheetName), headers, rawRows, mappings);
}

function sheetNameOrDefault(name: string): string {
  return name || "Sheet1";
}

/**
 * Transforms raw rows into normalized day book rows with running balance calculation
 */
export function transformRowsWithMappings(
  sheetName: string,
  headers: string[],
  rawRows: Record<string, unknown>[],
  mappings: ColumnMapping[]
): ParseExcelResult {
  const mappingMap = new Map<ERPField, string>();
  mappings.forEach((m) => {
    if (m.erpField !== "ignore") {
      mappingMap.set(m.erpField, m.excelColumn);
    }
  });

  const normalizedRows: NormalizedDayBookRow[] = [];
  const uniqueCustomerSet = new Set<string>();

  let validCount = 0;
  let errorCount = 0;
  let balanceMismatchCount = 0;

  // Running balance carry-forward across chronological rows
  let runningBalance = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNumber = i + 2; // Row 1 is header, data starts at row 2

    // Check if entire row is empty
    const hasAnyContent = Object.values(raw).some(
      (v) => v !== "" && v !== null && v !== undefined
    );
    if (!hasAnyContent) {
      continue; // skip completely empty rows
    }

    // Extract fields using mapping
    const rawDate = mappingMap.has("transaction_date")
      ? raw[mappingMap.get("transaction_date")!]
      : "";
    const rawCustomer = mappingMap.has("customer_name")
      ? raw[mappingMap.get("customer_name")!]
      : "";
    const rawVoucher = mappingMap.has("voucher_ref")
      ? raw[mappingMap.get("voucher_ref")!]
      : "";
    const rawParticulars = mappingMap.has("particulars")
      ? raw[mappingMap.get("particulars")!]
      : "";

    // Debit, Credit, Balance, Amount extraction
    const rawDebit = mappingMap.has("debit") ? raw[mappingMap.get("debit")!] : "";
    const rawCredit = mappingMap.has("credit") ? raw[mappingMap.get("credit")!] : "";
    const rawBalance = mappingMap.has("balance") ? raw[mappingMap.get("balance")!] : "";
    const rawAmount = mappingMap.has("amount") ? raw[mappingMap.get("amount")!] : "";
    const rawType = mappingMap.has("transaction_type")
      ? raw[mappingMap.get("transaction_type")!]
      : "";

    // Optional customer metadata fields
    const rawCode = mappingMap.has("customer_code")
      ? raw[mappingMap.get("customer_code")!]
      : "";
    const rawPhone = mappingMap.has("phone") ? raw[mappingMap.get("phone")!] : "";
    const rawEmail = mappingMap.has("email") ? raw[mappingMap.get("email")!] : "";
    const rawAddress = mappingMap.has("address") ? raw[mappingMap.get("address")!] : "";
    const rawCity = mappingMap.has("city") ? raw[mappingMap.get("city")!] : "";
    const rawState = mappingMap.has("state") ? raw[mappingMap.get("state")!] : "";
    const rawPincode = mappingMap.has("pincode") ? raw[mappingMap.get("pincode")!] : "";
    const rawGstin = mappingMap.has("gstin") ? raw[mappingMap.get("gstin")!] : "";

    const customerName = String(rawCustomer || "").trim();
    const transactionDate = parseExcelDate(rawDate);
    const voucherRef = rawVoucher ? String(rawVoucher).trim() : null;
    const particulars = rawParticulars ? String(rawParticulars).trim() : null;

    // Determine Debit and Credit amounts
    let debitAmount = 0;
    let creditAmount = 0;
    const hasDebitCol = mappingMap.has("debit");
    const hasCreditCol = mappingMap.has("credit");

    if (hasDebitCol || hasCreditCol) {
      if (rawDebit !== "" && rawDebit !== null && rawDebit !== undefined) {
        debitAmount = parseExcelAmount(rawDebit).amount;
      }
      if (rawCredit !== "" && rawCredit !== null && rawCredit !== undefined) {
        creditAmount = parseExcelAmount(rawCredit).amount;
      }
    } else if (mappingMap.has("amount")) {
      const parsedAmt = parseExcelAmount(rawAmount);
      if (rawType) {
        const typeStr = String(rawType).trim().toLowerCase();
        if (typeStr.includes("dr") || typeStr.includes("deb")) {
          debitAmount = parsedAmt.amount;
          creditAmount = 0;
        } else {
          debitAmount = 0;
          creditAmount = parsedAmt.amount;
        }
      } else if (parsedAmt.isDebit) {
        debitAmount = parsedAmt.amount;
        creditAmount = 0;
      } else {
        debitAmount = 0;
        creditAmount = parsedAmt.amount;
      }
    }

    // Determine transaction type and amount
    const transactionType: "debit" | "credit" = debitAmount > 0 ? "debit" : "credit";
    const totalTxnAmount = Math.max(debitAmount, creditAmount);

    // CURRENT BALANCE = PREVIOUS BALANCE + DEBIT - CREDIT
    const calculatedBalance = runningBalance + debitAmount - creditAmount;

    // Excel Balance Validation (if present)
    let excelBalance: number | null = null;
    let isBalanceMatched = true;
    let balanceErrorReason: string | undefined = undefined;

    if (mappingMap.has("balance") && rawBalance !== "" && rawBalance !== null && rawBalance !== undefined) {
      const parsedBal = parseExcelAmount(rawBalance);
      excelBalance = parsedBal.amountSigned;

      if (Math.abs(calculatedBalance - excelBalance) > 0.01) {
        isBalanceMatched = false;
        balanceMismatchCount++;
        balanceErrorReason = `Balance mismatch: calculated ₹${calculatedBalance.toLocaleString(
          "en-IN"
        )} vs Excel ₹${excelBalance.toLocaleString("en-IN")}`;
      }
    }

    // Carry forward running balance
    runningBalance = calculatedBalance;

    // Row validation
    let isValid = true;
    let errorReason: string | undefined = undefined;

    if (!customerName) {
      isValid = false;
      errorReason = "Missing Customer / Party name";
    } else if (debitAmount === 0 && creditAmount === 0 && totalTxnAmount === 0) {
      isValid = false;
      errorReason = "Transaction must have a non-zero Debit or Credit amount";
    } else if (!isBalanceMatched && balanceErrorReason) {
      // Flag balance mismatch as error/warning
      errorReason = balanceErrorReason;
    }

    if (isValid) {
      const normName = normalizeCustomerName(customerName);
      uniqueCustomerSet.add(normName);
      validCount++;
    } else {
      errorCount++;
    }

    const duplicateHash = generateDuplicateHash(
      customerName || `unknown_${rowNumber}`,
      voucherRef,
      transactionDate,
      debitAmount,
      creditAmount,
      particulars
    );

    normalizedRows.push({
      rowNumber,
      transactionDate,
      voucherRef,
      customerName,
      particulars,
      debit: debitAmount,
      credit: creditAmount,
      calculatedBalance,
      excelBalance,
      balance: calculatedBalance,
      amount: totalTxnAmount,
      transactionType,
      customerCode: rawCode ? String(rawCode).trim() : null,
      phone: rawPhone ? String(rawPhone).trim() : null,
      email: rawEmail ? String(rawEmail).trim() : null,
      address: rawAddress ? String(rawAddress).trim() : null,
      city: rawCity ? String(rawCity).trim() : null,
      state: rawState ? String(rawState).trim() : null,
      pincode: rawPincode ? String(rawPincode).trim() : null,
      gstin: rawGstin ? String(rawGstin).trim() : null,
      rawRowData: raw,
      isValid,
      isBalanceMatched,
      errorReason,
      duplicateHash,
    });
  }

  return {
    sheetName,
    headers,
    mappings,
    totalRows: normalizedRows.length,
    previewRows: normalizedRows.slice(0, 10),
    allRows: normalizedRows,
    validCount,
    errorCount,
    balanceMismatchCount,
    uniqueCustomers: Array.from(uniqueCustomerSet),
  };
}
