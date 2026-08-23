"use client";

import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  ChevronDown,
  Pencil,
  Loader2,
  CheckCircle2,
  Info,
  ArrowRight,
  AlertCircle,
  FileWarning,
  RefreshCw,
  Table,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  parseExcelFile,
  transformRowsWithMappings,
  ERP_FIELD_DEFINITIONS,
  type ColumnMapping,
  type ParseExcelResult,
  type ERPField,
} from "@/lib/utils/excelParser";
import { importDayBook, type ImportDayBookResponse } from "@/lib/services/dayBookService";
import { useDashboardStore } from "@/store/dashboardStore";

interface ImportDayBookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportDayBookModal: React.FC<ImportDayBookModalProps> = ({ isOpen, onClose }) => {
  const refreshStore = useDashboardStore((s) => s.refresh);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetAccount, setTargetAccount] = useState("day_book");
  const [checkDuplicates, setCheckDuplicates] = useState(true);
  const [isEditingMapping, setIsEditingMapping] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"mapping" | "rows">("rows");

  // Parsed state
  const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);

  // Post-import results state
  const [importResult, setImportResult] = useState<ImportDayBookResponse | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setMappings([]);
    setRawRows([]);
    setImportResult(null);
    setParseError(null);
    setIsEditingMapping(false);
    setShowErrorDetails(false);
    setActivePreviewTab("rows");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (file: File) => {
    // Validate file extension
    const validExts = [".xlsx", ".xls", ".csv"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExts.includes(ext)) {
      setParseError("Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setParseError("File size exceeds 10MB limit. Please upload a smaller file.");
      return;
    }

    setParseError(null);
    setIsParsing(true);
    setSelectedFile(file);
    setImportResult(null);

    try {
      const result = await parseExcelFile(file);
      setParseResult(result);
      setMappings(result.mappings);

      // Save raw rows for re-mapping
      const buffer = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: true, // consistent with parseExcelFile — get actual numbers, not formatted strings
      });
      setRawRows(rows);
      setActivePreviewTab("rows");
    } catch (err) {
      console.error("Excel parse error:", err);
      setParseError(err instanceof Error ? err.message : "Failed to parse file.");
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleMappingChange = (excelCol: string, newErpField: ERPField | "ignore") => {
    const updatedMappings = mappings.map((m) => {
      if (m.excelColumn === excelCol) {
        return { ...m, erpField: newErpField };
      }
      return m;
    });

    setMappings(updatedMappings);

    if (parseResult && rawRows.length > 0) {
      const recomputed = transformRowsWithMappings(
        parseResult.sheetName,
        parseResult.headers,
        rawRows,
        updatedMappings
      );
      setParseResult(recomputed);
    }
  };

  const handleProcessImport = async () => {
    if (!selectedFile || !parseResult || parseResult.allRows.length === 0) return;

    setIsProcessing(true);
    setParseError(null);

    try {
      const response = await importDayBook({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        targetAccount,
        checkDuplicates,
        rows: parseResult.allRows,
      });

      setImportResult(response);
      // Trigger live store refresh to update KPI cards, customers list, and activity feed
      await refreshStore();
    } catch (err) {
      console.error("Import processing error:", err);
      setParseError(err instanceof Error ? err.message : "Import processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatINR = (num: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);

  return (
    <div
      data-component="ImportDayBookModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1C30]/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div className="bg-white w-full max-w-[860px] rounded-2xl shadow-2xl overflow-hidden border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8F9FF]">
          <div>
            <h2 className="text-xl font-bold text-[#0B1C30] tracking-tight">
              Import Day Book Data
            </h2>
            <p className="text-xs text-[#6E7977] mt-0.5 font-medium">
              Upload Excel/CSV transactions with running balance validation &amp; duplicate protection.
            </p>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6E7977] hover:text-[#0B1C30] hover:bg-[#E5EEFF] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 text-sm">
          {/* Error Banner */}
          {parseError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="flex-1">{parseError}</span>
              <button
                onClick={() => setParseError(null)}
                className="text-red-500 hover:text-red-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STAGE 1: POST-IMPORT SUCCESS REPORT ── */}
          {importResult ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center py-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1C30]">
                  {importResult.status === "completed"
                    ? "Day Book Import Complete!"
                    : importResult.status === "completed_with_errors"
                    ? "Import Finished with Some Errors"
                    : "Import Failed"}
                </h3>
                <p className="text-xs text-[#3E4947] mt-1 font-medium">
                  File: <span className="font-bold text-[#0B1C30]">{importResult.fileName}</span> &bull; Batch ID: {importResult.batchId.slice(0, 8)}
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#F8F9FF] border border-[#E2E8F0] p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E7977] block">
                    Transactions
                  </span>
                  <span className="text-xl font-bold text-[#0F766E] mt-1 block">
                    {importResult.successfulRows.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="bg-[#F8F9FF] border border-[#E2E8F0] p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E7977] block">
                    New Customers
                  </span>
                  <span className="text-xl font-bold text-[#0051D5] mt-1 block">
                    {importResult.newCustomersCount.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="bg-[#F8F9FF] border border-[#E2E8F0] p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E7977] block">
                    Duplicates Skipped
                  </span>
                  <span className="text-xl font-bold text-[#D97706] mt-1 block">
                    {importResult.duplicateRows.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="bg-[#F8F9FF] border border-[#E2E8F0] p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E7977] block">
                    Failed Rows
                  </span>
                  <span className={`text-xl font-bold mt-1 block ${importResult.failedRows > 0 ? "text-[#BA1A1A]" : "text-gray-400"}`}>
                    {importResult.failedRows.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Error list accordion if any */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="border border-red-200 rounded-xl overflow-hidden bg-red-50/40">
                  <button
                    type="button"
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="w-full px-4 py-3 text-left font-bold text-xs text-red-800 flex items-center justify-between hover:bg-red-100/50 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileWarning className="w-4 h-4 text-red-600" />
                      View {importResult.errors.length} Failed Row(s) Details
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-red-600 transform transition-transform ${
                        showErrorDetails ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showErrorDetails && (
                    <div className="p-3 border-t border-red-200 max-h-48 overflow-y-auto bg-white space-y-2">
                      {importResult.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="text-xs p-2.5 rounded-lg border border-red-100 bg-red-50/50 flex flex-col gap-1"
                        >
                          <div className="flex justify-between font-bold text-red-900">
                            <span>Row #{err.row_number}</span>
                            <span className="text-red-600">{err.error_reason}</span>
                          </div>
                          {err.raw_data && (
                            <div className="text-[10px] text-gray-500 font-mono truncate">
                              {JSON.stringify(err.raw_data)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── STAGE 2: UPLOAD & PREVIEW FORM ── */
            <>
              {/* File Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group ${
                  isDragging
                    ? "border-[#0F766E] bg-[#E6F7F4]"
                    : selectedFile
                    ? "border-[#0F766E]/60 bg-[#F0FDF9]"
                    : "border-[#C8E8E1] bg-[#F2FAF8]/60 hover:bg-[#EAF7F4] hover:border-[#0F766E]/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-11 h-11 rounded-full bg-[#D7F3EC] flex items-center justify-center text-[#0F766E] mb-2 group-hover:scale-105 transition-transform shadow-xs">
                  {isParsing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-5 h-5 stroke-[2.2]" />
                  )}
                </div>

                {selectedFile ? (
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#0F766E] flex items-center justify-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4" />
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-[#6E7977]">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to choose another file
                    </p>
                    {/* Deselect / clear file button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // don't trigger file picker
                        handleReset();
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-full border border-red-200 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      Deselect file
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-[#0B1C30]">
                      Drag and Drop or Browse Day Book File (.xlsx or .csv)
                    </p>
                    <p className="text-xs text-[#6E7977] mt-1 font-medium">
                      Supports standard Day Book files with Debit, Credit, and Running Balance columns
                    </p>
                  </>
                )}
              </div>

              {/* IMPORT SETTINGS */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-bold tracking-wider text-[#6E7977] uppercase">
                  IMPORT SETTINGS
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-[#3E4947] mb-1.5">
                      Target Ledger/Account
                    </label>
                    <div className="relative">
                      <select
                        value={targetAccount}
                        onChange={(e) => setTargetAccount(e.target.value)}
                        className="w-full h-10 pl-3 pr-9 border border-[#CBD5E1] rounded-lg bg-white focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-xs font-medium text-[#0B1C30] outline-none appearance-none cursor-pointer"
                      >
                        <option value="day_book">Day Book / Cash Account</option>
                        <option value="bank_hdfc">HDFC Bank Account - 4920</option>
                        <option value="bank_sbi">SBI Operational Account</option>
                        <option value="sales_general">Sales Ledger (General)</option>
                        <option value="receivables">Customer Receivables Ledger</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#6E7977] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pb-2 sm:pb-2.5">
                    <button
                      type="button"
                      onClick={() => setCheckDuplicates(!checkDuplicates)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        checkDuplicates ? "bg-[#0F766E]" : "bg-[#CBD5E1]"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          checkDuplicates ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span
                      className="text-xs font-medium text-[#3E4947] select-none cursor-pointer"
                      onClick={() => setCheckDuplicates(!checkDuplicates)}
                    >
                      Check for duplicate entries
                    </span>
                  </div>
                </div>
              </div>

              {/* DATA MAPPING & PREVIEW (ONLY WHEN FILE IS LOADED) */}
              {parseResult && (
                <div className="space-y-3.5">
                  {/* Validation Summary Bento */}
                  <div className="bg-[#EFF4FF]/60 border border-[#CBD5E1] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B1C30] flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-[#0051D5]" />
                        Import Validation Preview
                      </span>
                      <span className="text-[11px] font-semibold text-[#6E7977]">
                        Sheet: {parseResult.sheetName}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                      <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] text-center">
                        <span className="text-[10px] uppercase font-bold text-[#6E7977]">Total Rows</span>
                        <p className="text-base font-bold text-[#0B1C30]">{parseResult.totalRows}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] text-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-700">Valid Rows</span>
                        <p className="text-base font-bold text-emerald-700">{parseResult.validCount}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] text-center">
                        <span className="text-[10px] uppercase font-bold text-[#0051D5]">Parties</span>
                        <p className="text-base font-bold text-[#0051D5]">{parseResult.uniqueCustomers.length}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] text-center">
                        <span className="text-[10px] uppercase font-bold text-[#D97706]">Mismatch</span>
                        <p className="text-base font-bold text-[#D97706]">{parseResult.balanceMismatchCount}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] text-center">
                        <span className="text-[10px] uppercase font-bold text-red-600">Errors</span>
                        <p className="text-base font-bold text-red-600">{parseResult.errorCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* PREVIEW TABS: Row Preview vs Column Mappings */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActivePreviewTab("rows")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            activePreviewTab === "rows"
                              ? "bg-[#0F766E] text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <Table className="w-3.5 h-3.5" />
                          <span>Rows &amp; Balance Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePreviewTab("mapping")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            activePreviewTab === "mapping"
                              ? "bg-[#0F766E] text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Column Mappings ({mappings.filter((m) => m.erpField !== "ignore").length})</span>
                        </button>
                      </div>

                      {activePreviewTab === "mapping" && (
                        <button
                          type="button"
                          onClick={() => setIsEditingMapping(!isEditingMapping)}
                          className="text-xs font-semibold text-[#0F766E] hover:underline cursor-pointer"
                        >
                          {isEditingMapping ? "Done Editing" : "Edit Mappings"}
                        </button>
                      )}
                    </div>

                    {/* TAB 1: ROW & RUNNING BALANCE PREVIEW */}
                    {activePreviewTab === "rows" && (
                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-2xs">
                        <div className="max-h-56 overflow-y-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#EEF5FF] text-[#4A5568] border-b border-[#E2E8F0] sticky top-0 z-10">
                              <tr>
                                <th className="py-2.5 px-3 font-semibold">Ref #</th>
                                <th className="py-2.5 px-3 font-semibold">Party Name</th>
                                <th className="py-2.5 px-3 font-semibold text-right">Debit (+)</th>
                                <th className="py-2.5 px-3 font-semibold text-right">Credit (-)</th>
                                <th className="py-2.5 px-3 font-semibold text-right">Calc. Balance</th>
                                <th className="py-2.5 px-3 font-semibold text-right">Excel Balance</th>
                                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                              {parseResult.allRows.slice(0, 20).map((row, idx) => (
                                <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-medium text-[#0B1C30]">
                                    {row.voucherRef || `Row ${row.rowNumber}`}
                                  </td>
                                  <td className="py-2.5 px-3 font-medium text-[#0B1C30] max-w-[140px] truncate">
                                    {row.customerName}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                                    {row.debit > 0 ? formatINR(row.debit) : "₹0.00"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-[#BA1A1A]">
                                    {row.credit > 0 ? formatINR(row.credit) : "₹0.00"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-[#0B1C30]">
                                    {formatINR(row.calculatedBalance)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-[#6E7977]">
                                    {row.excelBalance !== null ? formatINR(row.excelBalance) : "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {row.isValid ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                        <Check className="w-3 h-3" /> Valid
                                      </span>
                                    ) : !row.isBalanceMatched ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800" title={row.errorReason}>
                                        <AlertTriangle className="w-3 h-3" /> Mismatch
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800" title={row.errorReason}>
                                        <X className="w-3 h-3" /> Error
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {parseResult.allRows.length > 20 && (
                          <div className="py-2 px-3 bg-slate-50 text-[11px] text-center text-[#6E7977] border-t border-[#E2E8F0]">
                            Showing first 20 of {parseResult.allRows.length} rows
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: COLUMN MAPPINGS */}
                    {activePreviewTab === "mapping" && (
                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#EEF5FF] text-[#4A5568] border-b border-[#E2E8F0]">
                              <th className="py-2.5 px-4 font-semibold">Excel Column</th>
                              <th className="py-2.5 px-2 w-8 text-center text-[#94A3B8]"></th>
                              <th className="py-2.5 px-4 font-semibold">ERP Field</th>
                              <th className="py-2.5 px-4 font-semibold text-right">Sample Data</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {mappings.map((item, idx) => {
                              const matchedDef = ERP_FIELD_DEFINITIONS.find((d) => d.erpField === item.erpField);
                              return (
                                <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-3 px-4 font-medium text-[#0B1C30]">
                                    {item.excelColumn}
                                  </td>
                                  <td className="py-3 px-2 text-center text-[#94A3B8]">
                                    <ArrowRight className="w-3 h-3 mx-auto text-slate-400" />
                                  </td>
                                  <td className="py-3 px-4">
                                    {isEditingMapping ? (
                                      <select
                                        value={item.erpField}
                                        onChange={(e) =>
                                          handleMappingChange(
                                            item.excelColumn,
                                            e.target.value as ERPField | "ignore"
                                          )
                                        }
                                        className="h-8 px-2 border border-[#CBD5E1] rounded-md text-xs font-medium text-[#0B1C30] focus:border-[#0F766E] outline-none bg-white"
                                      >
                                        <option value="ignore">— Ignore Column —</option>
                                        {ERP_FIELD_DEFINITIONS.map((def) => (
                                          <option key={def.erpField} value={def.erpField}>
                                            {def.label} {def.required ? "*" : ""}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span
                                        className={`font-semibold ${
                                          item.erpField === "ignore"
                                            ? "text-gray-400 italic"
                                            : "text-[#0F766E]"
                                        }`}
                                      >
                                        {matchedDef ? matchedDef.label : "Ignored"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right font-medium text-[#4A5568] max-w-[160px] truncate">
                                    {item.sampleData || "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-white flex items-center justify-between gap-3">
          <div>
            {importResult && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-[#0F766E] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Import Another File</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-[#3E4947] hover:text-[#0B1C30] transition-colors cursor-pointer rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              {importResult ? "Close" : "Cancel"}
            </button>

            {!importResult && (
              <button
                type="button"
                disabled={!selectedFile || isProcessing || isParsing || (parseResult?.validCount === 0)}
                onClick={handleProcessImport}
                className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Import...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Process Import ({parseResult ? `${parseResult.validCount} Rows` : "0"})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
