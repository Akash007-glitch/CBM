import * as XLSX from "xlsx";

export type ERPField =
  | "transaction_date"
  | "customer_name"
  | "voucher_type"
  | "voucher_ref"
  | "debit"
  | "credit"
  | "opening_balance"
  | "particulars"
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
      "date",
      "transaction date",
      "txn date",
      "vch date",
      "voucher date",
      "dt",
      "posting date",
      "entry date",
    ],
  },
  {
    erpField: "customer_name",
    label: "Customer / Ledger Name (Particulars)",
    required: true,
    synonyms: [
      "particulars",
      "particular",
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
      "particulars party",
    ],
  },
  {
    erpField: "voucher_type",
    label: "Voucher Type (Vch Type)",
    required: true,
    synonyms: [
      "vch type",
      "voucher type",
      "vchtype",
      "vch type.",
      "vch_type",
      "type",
      "txn type",
      "transaction type",
    ],
  },
  {
    erpField: "voucher_ref",
    label: "Voucher Number (Vch No.)",
    required: true,
    synonyms: [
      "vch no",
      "vch no.",
      "voucher no",
      "voucher no.",
      "voucher number",
      "vch number",
      "vchno",
      "reference no",
      "reference no.",
      "ref no",
      "ref no.",
      "reference",
      "ref",
      "invoice no",
      "invoice no.",
      "bill no",
      "doc no",
      "chq no",
    ],
  },
  {
    erpField: "debit",
    label: "Debit Amount",
    required: false,
    synonyms: [
      "debit amount",
      "debit",
      "dr amount",
      "dr",
      "debit amt",
      "dr.",
      "inwards amount",
      "receipts",
      "inflow",
      "deposit",
    ],
  },
  {
    erpField: "credit",
    label: "Credit Amount",
    required: false,
    synonyms: [
      "credit amount",
      "credit",
      "cr amount",
      "cr",
      "credit amt",
      "cr.",
      "outwards amount",
      "payments",
      "outflow",
      "withdrawal",
    ],
  },
  {
    erpField: "opening_balance",
    label: "Opening Balance",
    required: false,
    synonyms: [
      "opening balance",
      "opening bal",
      "op balance",
      "op bal",
      "opening",
      "open bal",
      "open balance",
      "previous balance",
      "prev balance",
      "opening debit",
      "opening credit",
      "op. bal.",
      "op. balance",
    ],
  },
  {
    erpField: "particulars",
    label: "Narration / Description",
    required: false,
    synonyms: [
      "narration",
      "description",
      "remarks",
      "details",
      "note",
      "notes",
      "transaction details",
      "item description",
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
  voucherType: string | null; // e.g. "Sales", "Receipt", "Payment"
  voucherRef: string | null; // e.g. "1909" (Voucher Number)
  customerName: string; // From Particulars / Ledger
  particulars: string | null; // Full raw particulars or narration
  openingBalance?: number;
  debit: number; // 0 if empty
  credit: number; // 0 if empty
  calculatedBalance: number; // Running balance: Op. Bal + Debit - Credit
  excelBalance: number | null;
  balance: number;
  amount: number; // Debit > 0 ? Debit : Credit
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

const MONTH_NAME_MAP: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

/**
 * Converts various date formats into YYYY-MM-DD.
 * Handles Excel serial numbers, text dates (e.g. 26-Aug-26, 26-Aug-2026), and standard DD/MM/YYYY.
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

  // Match text-month dates like "26-Aug-26", "26-Aug-2026", "26 Aug 2026", "26/Aug/26"
  const textMonthMatch = str.match(/^(\d{1,2})[-/.\s]+([A-Za-z]{3,9})[-/.\s]+(\d{2,4})$/);
  if (textMonthMatch) {
    const d = textMonthMatch[1].padStart(2, "0");
    const mKey = textMonthMatch[2].toLowerCase();
    const m = MONTH_NAME_MAP[mKey] || "01";
    let y = textMonthMatch[3];
    if (y.length === 2) {
      const numY = parseInt(y, 10);
      y = numY > 50 ? `19${y}` : `20${y}`;
    }
    return `${y}-${m}-${d}`;
  }

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
      const numY = parseInt(y, 10);
      y = numY > 50 ? `19${y}` : `20${y}`;
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
 * Normalizes amount string or number.
 * Empty or unparseable values safely default to 0.
 */
export function parseExcelAmount(value: unknown): {
  amount: number;
  amountSigned: number;
  isNegative: boolean;
  isDebit: boolean;
  isCredit: boolean;
} {
  if (typeof value === "number") {
    const isNeg = value < 0;
    return {
      amount: Math.abs(value),
      amountSigned: value,
      isNegative: isNeg,
      isDebit: !isNeg,
      isCredit: isNeg,
    };
  }

  if (value === null || value === undefined || value === "") {
    return {
      amount: 0,
      amountSigned: 0,
      isNegative: false,
      isDebit: true,
      isCredit: false,
    };
  }

  let str = String(value).trim();
  if (!str) {
    return {
      amount: 0,
      amountSigned: 0,
      isNegative: false,
      isDebit: true,
      isCredit: false,
    };
  }

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
    isDebit: !isNegative && (isDr || validNum >= 0),
    isCredit: isNegative || isCr,
  };
}

/**
 * Sanitizes formula injection characters (=, +, -, @, \t, \r)
 */
export function sanitizeFormula(value: string | null | undefined): string {
  if (!value) return "";
  const str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Generates deterministic duplicate hash based on the real Day Book transaction identity:
 * Voucher Type + Voucher Number + Transaction Date + Customer/Particulars
 */
export function generateDuplicateHash(
  particulars: string,
  voucherType: string | null,
  voucherNumber: string | null,
  transactionDate: string,
  debit: number = 0,
  credit: number = 0
): string {
  const normName = normalizeCustomerName(particulars);
  const normType = (voucherType || "sales").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const normNo = (voucherNumber || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const normDate = transactionDate.trim();
  const normDeb = Number(debit || 0).toFixed(2);
  const normCred = Number(credit || 0).toFixed(2);

  if (normNo) {
    return `${normType}::${normNo}::${normDate}::${normName}`;
  }
  return `${normType}::${normDate}::${normName}::deb_${normDeb}::cred_${normCred}`;
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

  if (!cleanHeader) {
    return { erpField: "ignore", confidence: 0 };
  }

  // Exact synonym match (Priority 1)
  for (const def of ERP_FIELD_DEFINITIONS) {
    for (const syn of def.synonyms) {
      if (cleanHeader === syn) {
        return { erpField: def.erpField, confidence: 1.0 };
      }
    }
  }

  // Partial match (Priority 2)
  for (const def of ERP_FIELD_DEFINITIONS) {
    for (const syn of def.synonyms) {
      if (cleanHeader.includes(syn) || (syn.length > 3 && cleanHeader.startsWith(syn))) {
        return { erpField: def.erpField, confidence: 0.85 };
      }
    }
  }

  // Value inspection fallback
  if (sampleValue) {
    const sampleStr = String(sampleValue).trim();
    if (
      /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(sampleStr) ||
      /^\d{1,2}[/-][A-Za-z]{3}[/-]\d{2,4}$/.test(sampleStr)
    ) {
      return { erpField: "transaction_date", confidence: 0.6 };
    }
    if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(sampleStr)) {
      return { erpField: "gstin", confidence: 0.9 };
    }
  }

  return { erpField: "ignore", confidence: 0 };
}

/**
 * Reads an uploaded Excel / CSV File and generates mappings & preview rows.
 * Automatically detects report header rows (e.g. SUBH ENTERPRISE, Day Book)
 * and isolates the true column header row.
 */
export async function parseExcelFile(
  file: File,
  initialCustomerBalances?: Map<string, number>
): Promise<ParseExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The uploaded Excel workbook has no sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];

  // Read 2D array representation to scan for the true header row
  const raw2D: (string | number | boolean | null | undefined)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (!raw2D || raw2D.length === 0) {
    throw new Error("No data found in sheet '" + firstSheetName + "'.");
  }

  // Scan first 30 rows to find the true header row
  let bestHeaderRowIndex = 0;
  let maxScore = 0;

  const maxScanRows = Math.min(raw2D.length, 30);
  for (let r = 0; r < maxScanRows; r++) {
    const rowValues = (raw2D[r] || []).map((v) => String(v || "").trim()).filter(Boolean);
    if (rowValues.length < 2) continue;

    let score = 0;
    for (const val of rowValues) {
      const match = detectColumnMapping(val);
      if (match.erpField !== "ignore") {
        if (
          match.erpField === "transaction_date" ||
          match.erpField === "customer_name" ||
          match.erpField === "voucher_type" ||
          match.erpField === "voucher_ref" ||
          match.erpField === "debit" ||
          match.erpField === "credit"
        ) {
          score += 3; // high weight for the 6 primary Day Book columns
        } else {
          score += 1;
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestHeaderRowIndex = r;
    }
  }

  // Parse using detected header row index
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    range: bestHeaderRowIndex,
    defval: "",
    raw: true, // return actual numbers
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("No transaction data found in sheet '" + firstSheetName + "'.");
  }

  // Extract raw headers (filtering out unnamed empty columns)
  const headerKeys = Object.keys(rawRows[0] || {});
  const headers = headerKeys.filter((h) => h && !h.startsWith("__EMPTY"));

  // Build initial mappings
  const usedErpFields = new Set<string>();
  const mappings: ColumnMapping[] = headers.map((col) => {
    // Find a non-empty sample value across top 6 rows (skipping subheaders)
    let sample = "";
    for (let r = 0; r < Math.min(rawRows.length, 6); r++) {
      const v = rawRows[r]?.[col];
      const strVal = String(v ?? "").trim();
      if (
        strVal !== "" &&
        !/inwards?\s*qty|outwards?\s*qty/i.test(strVal)
      ) {
        sample = strVal;
        break;
      }
    }

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
  return transformRowsWithMappings(
    sheetNameOrDefault(firstSheetName),
    headers,
    rawRows,
    mappings,
    initialCustomerBalances
  );
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
  mappings: ColumnMapping[],
  initialCustomerBalances?: Map<string, number>
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

  // Running balance per customer
  const partyRunningBalances = new Map<string, number>();

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNumber = i + 2;

    // Extract non-empty row cell values
    const rowValues = Object.values(raw).map((v) => String(v ?? "").trim());
    const hasAnyContent = rowValues.some((v) => v !== "");
    if (!hasAnyContent) {
      continue;
    }

    // Check for row of separators like '---', '===', '***'
    const nonBlankValues = rowValues.filter((v) => v !== "");
    if (nonBlankValues.length > 0 && nonBlankValues.every((v) => /^[-=_*~#|]+$/.test(v))) {
      continue;
    }

    // Extract fields using mapping
    const rawDate = mappingMap.has("transaction_date")
      ? raw[mappingMap.get("transaction_date")!]
      : "";
    const rawCustomer = mappingMap.has("customer_name")
      ? raw[mappingMap.get("customer_name")!]
      : "";
    const rawVchType = mappingMap.has("voucher_type")
      ? raw[mappingMap.get("voucher_type")!]
      : "";
    const rawVoucher = mappingMap.has("voucher_ref")
      ? raw[mappingMap.get("voucher_ref")!]
      : "";
    const rawParticulars = mappingMap.has("particulars")
      ? raw[mappingMap.get("particulars")!]
      : "";
    const rawOpening = mappingMap.has("opening_balance")
      ? raw[mappingMap.get("opening_balance")!]
      : "";

    // Debit, Credit, Balance, Amount extraction
    const rawDebit = mappingMap.has("debit") ? raw[mappingMap.get("debit")!] : "";
    const rawCredit = mappingMap.has("credit") ? raw[mappingMap.get("credit")!] : "";
    const rawBalance = mappingMap.has("balance") ? raw[mappingMap.get("balance")!] : "";
    const rawAmount = mappingMap.has("amount") ? raw[mappingMap.get("amount")!] : "";

    // Customer metadata fields
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

    // In the real Day Book: Particulars IS the customer name
    const customerName = String(rawCustomer || rawParticulars || "").trim();
    const dateStr = String(rawDate ?? "").trim();
    const voucherType = rawVchType ? String(rawVchType).trim() : null;
    const voucherRef = rawVoucher ? String(rawVoucher).trim() : null;
    const particulars = rawParticulars ? String(rawParticulars).trim() : customerName;

    // Comprehensive Summary / Footer Keywords Pattern
    const SUMMARY_KEYWORDS_PATTERN = /^(total|totals|grand\s*total|sub\s*total|subtotal|closing\s*balance|summary|brought\s*forward|carried\s*forward|b\/f|c\/f|inwards?\s*qty|outwards?\s*qty)$/i;

    // 1. If any cell in the row matches summary keywords (e.g. Date: "TOTAL" or Particulars: "Total")
    const hasSummaryCell = nonBlankValues.some((v) => SUMMARY_KEYWORDS_PATTERN.test(v));
    const isCustomerSummary = SUMMARY_KEYWORDS_PATTERN.test(customerName);
    const isDateSummary = SUMMARY_KEYWORDS_PATTERN.test(dateStr);
    const isVoucherSummary = voucherType ? SUMMARY_KEYWORDS_PATTERN.test(voucherType) : false;

    if (hasSummaryCell || isCustomerSummary || isDateSummary || isVoucherSummary) {
      continue; // Silently skip report summary/total/subtotal footers
    }

    // Skip repeated header row
    if (
      (customerName.toLowerCase() === "particulars" || customerName.toLowerCase() === "party name" || customerName.toLowerCase() === "customer") &&
      (dateStr.toLowerCase() === "date" || dateStr.toLowerCase() === "vch date" || dateStr.toLowerCase() === "transaction date")
    ) {
      continue;
    }

    // Skip rows where both customerName is empty AND voucherRef is empty
    if (!customerName && !voucherRef) {
      continue;
    }

    const transactionDate = parseExcelDate(rawDate);

    // Optional Opening Balance parsed from row
    let rowOpeningBalance: number | undefined = undefined;
    if (rawOpening !== "" && rawOpening !== null && rawOpening !== undefined) {
      rowOpeningBalance = parseExcelAmount(rawOpening).amountSigned;
    }

    // Determine Debit and Credit amounts (default 0 if empty)
    let debitAmount = 0;
    let creditAmount = 0;

    if (rawDebit !== "" && rawDebit !== null && rawDebit !== undefined) {
      debitAmount = parseExcelAmount(rawDebit).amount;
    }
    if (rawCredit !== "" && rawCredit !== null && rawCredit !== undefined) {
      creditAmount = parseExcelAmount(rawCredit).amount;
    }

    // If only generic amount column was provided
    if (debitAmount === 0 && creditAmount === 0 && rawAmount !== "") {
      const parsedAmt = parseExcelAmount(rawAmount);
      if (voucherType && /receipt|payment|credit/i.test(voucherType)) {
        creditAmount = parsedAmt.amount;
      } else {
        debitAmount = parsedAmt.amount;
      }
    }

    // Determine transaction type and total amount
    const transactionType: "debit" | "credit" = debitAmount > 0 ? "debit" : "credit";
    const totalTxnAmount = Math.max(debitAmount, creditAmount);

    // Compute running balance per party
    const normPartyKey = normalizeCustomerName(customerName);

    if (!partyRunningBalances.has(normPartyKey)) {
      const initialBal =
        rowOpeningBalance !== undefined
          ? rowOpeningBalance
          : (initialCustomerBalances?.get(normPartyKey) ?? 0);
      partyRunningBalances.set(normPartyKey, initialBal);
    }

    const prevPartyBal = partyRunningBalances.get(normPartyKey) ?? 0;
    const calculatedPartyBalance = prevPartyBal + debitAmount - creditAmount;
    partyRunningBalances.set(normPartyKey, calculatedPartyBalance);

    const calculatedBalance = calculatedPartyBalance;
    const effectiveOpeningBalance =
      rowOpeningBalance !== undefined
        ? rowOpeningBalance
        : (initialCustomerBalances?.get(normPartyKey) ?? 0);

    // Excel Balance Validation (if present)
    let excelBalance: number | null = null;
    let isBalanceMatched = true;
    let balanceErrorReason: string | undefined = undefined;

    if (mappingMap.has("balance") && rawBalance !== "" && rawBalance !== null && rawBalance !== undefined) {
      const parsedBal = parseExcelAmount(rawBalance);
      excelBalance = parsedBal.amountSigned;

      const matchesParty = Math.abs(calculatedPartyBalance - excelBalance) <= 0.01;
      if (!matchesParty) {
        isBalanceMatched = false;
        balanceMismatchCount++;
        balanceErrorReason = `Balance notice: calculated ₹${calculatedBalance.toLocaleString(
          "en-IN"
        )} vs Excel ₹${excelBalance.toLocaleString("en-IN")}`;
      }
    }

    // Row validation
    let isValid = true;
    let errorReason: string | undefined = undefined;

    if (!customerName) {
      isValid = false;
      errorReason = "Missing Customer / Particulars name";
    } else if (!rawDate) {
      isValid = false;
      errorReason = "Missing transaction Date";
    } else if (debitAmount === 0 && creditAmount === 0 && totalTxnAmount === 0 && (rowOpeningBalance === undefined || rowOpeningBalance === 0)) {
      isValid = false;
      errorReason = "Transaction must have a non-zero Debit or Credit amount";
    } else if (balanceErrorReason) {
      errorReason = balanceErrorReason;
    }

    if (isValid) {
      uniqueCustomerSet.add(normPartyKey);
      validCount++;
    } else {
      errorCount++;
    }

    const duplicateHash = generateDuplicateHash(
      customerName || `unknown_${rowNumber}`,
      voucherType,
      voucherRef,
      transactionDate,
      debitAmount,
      creditAmount
    );

    normalizedRows.push({
      rowNumber,
      transactionDate,
      voucherType,
      voucherRef,
      customerName,
      particulars,
      openingBalance: effectiveOpeningBalance,
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
