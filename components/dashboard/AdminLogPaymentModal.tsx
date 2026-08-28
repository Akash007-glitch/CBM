"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Plus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  ShieldCheck,
  CreditCard,
  Building2,
  User,
  Calendar,
  Layers,
  ArrowRight,
  Printer,
  Copy,
  Check,
  Wallet,
  Sparkles,
  Receipt,
  Info,
  Clock,
} from "lucide-react";
import { useDashboardStore, Customer } from "@/store/dashboardStore";
import { useUser } from "@/store/authStore";
import {
  getCustomerOutstanding,
  getCustomerFinancialSummaries,
  type CustomerFinancialSummary,
} from "@/lib/services/customerService";
import type { AllocationRequest } from "@/lib/services/paymentService";
import { Spinner } from "@/components/ui/Spinner";

interface AdminLogPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
}

interface UnpaidInvoice {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  invoice_total: number;
  paid_amount: number;
  outstanding_amount: number;
  days_overdue: number;
}

interface ReceiptData {
  paymentId: string;
  receiptNumber: string;
  customerName: string;
  customerCode: string;
  customerPhone?: string | null;
  customerCity?: string | null;
  salesmanName: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  paymentDate: string;
  timestamp: string;
  allocations: {
    invoiceNumber: string;
    invoiceDate: string;
    allocatedAmount: number;
  }[];
  unallocatedAmount: number;
  remainingBalance: number;
  notes?: string | null;
}

export const AdminLogPaymentModal: React.FC<AdminLogPaymentModalProps> = ({
  isOpen,
  onClose,
  initialCustomerId,
}) => {
  const currentUser = useUser();
  const customers = useDashboardStore((s) => s.customers);
  const salesmen = useDashboardStore((s) => s.salesmen);
  const recordPayment = useDashboardStore((s) => s.recordPayment);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || "");
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>("");

  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "bank_transfer" | "cheque" | "other">("upi");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Invoice Allocation State
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState<boolean>(false);
  const [allocationMode, setAllocationMode] = useState<"fifo" | "manual">("fifo");
  const [manualAllocations, setManualAllocations] = useState<{ [invoiceId: string]: string }>({});

  // Financial Summaries for quick outstanding stats
  const [summaries, setSummaries] = useState<CustomerFinancialSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState<boolean>(false);

  // Flow State
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string>("");
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Double-submit protection
  const isSubmittingRef = useRef<boolean>(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Load customer summaries when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingSummaries(true);
    getCustomerFinancialSummaries()
      .then((data) => {
        if (isMounted) setSummaries(data);
      })
      .catch((err) => console.warn("Failed to load customer summaries:", err))
      .finally(() => {
        if (isMounted) setIsLoadingSummaries(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Set initial customer if passed or preserved
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  // When customer changes, load their unpaid invoices & auto-select assigned salesman
  useEffect(() => {
    if (!selectedCustomerId) {
      setUnpaidInvoices([]);
      setManualAllocations({});
      return;
    }

    const customerObj = customers.find((c) => c.id === selectedCustomerId);
    if (customerObj?.assigned_salesman_id) {
      setSelectedSalesmanId(customerObj.assigned_salesman_id);
    } else if (!selectedSalesmanId && salesmen.length > 0) {
      setSelectedSalesmanId(salesmen[0].id);
    }

    let isMounted = true;
    setIsLoadingInvoices(true);
    getCustomerOutstanding(selectedCustomerId)
      .then((data) => {
        if (!isMounted) return;
        const valid = (data || [])
          .filter((inv) => Number(inv.outstanding_amount) > 0)
          .map((inv) => ({
            invoice_id: inv.invoice_id,
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            due_date: inv.due_date,
            invoice_total: Number(inv.invoice_total),
            paid_amount: Number(inv.paid_amount),
            outstanding_amount: Number(inv.outstanding_amount),
            days_overdue: Number(inv.days_overdue || 0),
          }))
          // Sort oldest first for FIFO
          .sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());

        setUnpaidInvoices(valid);

        // Initialize manual allocations map
        const initialManual: { [id: string]: string } = {};
        valid.forEach((inv) => {
          initialManual[inv.invoice_id] = "";
        });
        setManualAllocations(initialManual);
      })
      .catch((err) => console.warn("Could not fetch customer unpaid invoices:", err))
      .finally(() => {
        if (isMounted) setIsLoadingInvoices(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCustomerId, customers, salesmen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered customer list for search (CASH account is excluded as it is not a debtor/party customer)
  const filteredCustomers = useMemo(() => {
    const validCustomers = customers.filter(
      (c) => c.name.trim().toUpperCase() !== "CASH"
    );
    if (!customerSearch.trim()) return validCustomers;
    const q = customerSearch.toLowerCase().trim();
    return validCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.customer_code && c.customer_code.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const selectedSummary = useMemo(
    () => summaries.find((s) => s.customer_id === selectedCustomerId),
    [summaries, selectedCustomerId]
  );

  const currentOutstanding = useMemo(() => {
    if (selectedSummary) return Number(selectedSummary.total_balance);
    if (unpaidInvoices.length > 0) {
      return unpaidInvoices.reduce((acc, inv) => acc + inv.outstanding_amount, 0);
    }
    return Number(selectedCustomer?.opening_balance || 0);
  }, [selectedSummary, unpaidInvoices, selectedCustomer]);

  const enteredAmount = parseFloat(amount) || 0;

  // Compute calculated allocations based on mode
  const computedAllocations: AllocationRequest[] = useMemo(() => {
    if (enteredAmount <= 0) return [];

    if (allocationMode === "fifo") {
      let remaining = enteredAmount;
      const list: AllocationRequest[] = [];
      for (const inv of unpaidInvoices) {
        if (remaining <= 0) break;
        const alloc = Math.min(remaining, inv.outstanding_amount);
        if (alloc > 0) {
          list.push({
            invoice_id: inv.invoice_id,
            allocated_amount: Number(alloc.toFixed(2)),
          });
          remaining -= alloc;
        }
      }
      return list;
    } else {
      // Manual Mode
      const list: AllocationRequest[] = [];
      for (const inv of unpaidInvoices) {
        const val = parseFloat(manualAllocations[inv.invoice_id] || "0");
        if (val > 0) {
          list.push({
            invoice_id: inv.invoice_id,
            allocated_amount: Number(Math.min(val, inv.outstanding_amount).toFixed(2)),
          });
        }
      }
      return list;
    }
  }, [enteredAmount, allocationMode, unpaidInvoices, manualAllocations]);

  const totalAllocatedAmount = useMemo(() => {
    return computedAllocations.reduce((s, a) => s + a.allocated_amount, 0);
  }, [computedAllocations]);

  const unallocatedAmount = Math.max(0, enteredAmount - totalAllocatedAmount);
  const remainingCustomerBalance = Math.max(0, currentOutstanding - enteredAmount);

  // Validate form before confirmation
  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorToast("");

    if (!selectedCustomerId) {
      setErrorToast("Please select a customer.");
      return;
    }
    if (!selectedSalesmanId) {
      setErrorToast("Please select the receiving salesman/collector.");
      return;
    }
    if (enteredAmount <= 0) {
      setErrorToast("Please enter a valid payment amount greater than ₹0.");
      return;
    }
    if (allocationMode === "manual" && totalAllocatedAmount > enteredAmount) {
      setErrorToast(
        `Total allocated to invoices (₹${totalAllocatedAmount.toLocaleString(
          "en-IN"
        )}) exceeds payment amount (₹${enteredAmount.toLocaleString("en-IN")}).`
      );
      return;
    }

    setIsConfirming(true);
  };

  // Submit payment to database
  const handleFinalSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorToast("");

    const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedReceiptNo = `REC-${yearMonth}-${randSuffix}`;

    try {
      const recorded = await recordPayment(
        {
          customer_id: selectedCustomerId,
          salesman_id: selectedSalesmanId,
          created_by: currentUser?.id ?? "",
          amount: enteredAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || null,
          payment_number: generatedReceiptNo,
          notes: notes.trim() || null,
        },
        computedAllocations
      );

      // Build rich receipt details
      const salesmanObj = salesmen.find((s) => s.id === selectedSalesmanId);
      const allocatedDetails = computedAllocations.map((a) => {
        const inv = unpaidInvoices.find((i) => i.invoice_id === a.invoice_id);
        return {
          invoiceNumber: inv?.invoice_number || a.invoice_id.slice(0, 8),
          invoiceDate: inv?.invoice_date || paymentDate,
          allocatedAmount: a.allocated_amount,
        };
      });

      const receipt: ReceiptData = {
        paymentId: recorded.id,
        receiptNumber: recorded.payment_number || generatedReceiptNo,
        customerName: selectedCustomer?.name || "Customer",
        customerCode: selectedCustomer?.customer_code || selectedCustomer?.id.slice(0, 8) || "N/A",
        customerPhone: selectedCustomer?.phone,
        customerCity: selectedCustomer?.city,
        salesmanName: salesmanObj?.name || "Admin / Direct",
        amount: enteredAmount,
        paymentMethod: paymentMethod.replace("_", " ").toUpperCase(),
        referenceNumber: referenceNumber.trim() || "N/A",
        paymentDate: paymentDate,
        timestamp: new Date().toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        allocations: allocatedDetails,
        unallocatedAmount,
        remainingBalance: remainingCustomerBalance,
        notes: notes.trim() || null,
      };

      setReceiptData(receipt);
      setIsConfirming(false);
    } catch (err) {
      console.error("Failed to log payment:", err);
      setErrorToast(
        err instanceof Error ? err.message : "Failed to record payment in database."
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setReceiptData(null);
    setIsConfirming(false);
    setAmount("");
    setReferenceNumber("");
    setNotes("");
    setManualAllocations({});
    setErrorToast("");
  };

  const handleCopyReceipt = () => {
    if (!receiptData) return;
    const text = `
========================================
SUBH ENTERPRISE - PAYMENT RECEIPT
========================================
Receipt No   : ${receiptData.receiptNumber}
Date & Time  : ${receiptData.timestamp}
Customer     : ${receiptData.customerName} (${receiptData.customerCode})
Collector    : ${receiptData.salesmanName}
Amount Paid  : ₹${receiptData.amount.toLocaleString("en-IN")}
Mode         : ${receiptData.paymentMethod}
Ref / UTR    : ${receiptData.referenceNumber}
----------------------------------------
Invoices Allocated (${receiptData.allocations.length}):
${receiptData.allocations
  .map(
    (a) => `• Inv #${a.invoiceNumber} (${a.invoiceDate}): ₹${a.allocatedAmount.toLocaleString("en-IN")}`
  )
  .join("\n")}
${
  receiptData.unallocatedAmount > 0
    ? `Advance Credit : ₹${receiptData.unallocatedAmount.toLocaleString("en-IN")}\n`
    : ""
}New Outstanding Balance: ₹${receiptData.remainingBalance.toLocaleString("en-IN")}
========================================
Thank you for your payment!
`.trim();

    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      data-component="AdminLogPaymentModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
    >
      {/* ────────────────────────────────────────────────────────────────────────
          RECEIPT SCREEN VIEW (After Successful Payment)
          ──────────────────────────────────────────────────────────────────────── */}
      {receiptData ? (
        <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
          {/* Receipt Header Banner */}
          <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Payment Logged Successfully</h3>
                <p className="text-xs text-emerald-100">
                  Receipt #{receiptData.receiptNumber} generated
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Voucher Paper */}
          <div className="p-6 overflow-y-auto space-y-6 text-sm bg-[#FAFBFD] print:p-0 print:bg-white">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative overflow-hidden space-y-4">
              {/* Watermark badge */}
              <div className="absolute right-4 top-4 rotate-[-8deg] border-2 border-emerald-500/30 text-emerald-600/40 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-md pointer-events-none">
                PAID &amp; RECORDED
              </div>

              <div className="border-b border-slate-100 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-black text-[#0B1C30] tracking-tight">
                      SUBH ENTERPRISE
                    </h4>
                    <p className="text-[11px] text-slate-500">Official Payment Collection Receipt</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-mono font-bold text-slate-900">
                      {receiptData.receiptNumber}
                    </span>
                    <p className="text-[11px] text-slate-500">{receiptData.timestamp}</p>
                  </div>
                </div>
              </div>

              {/* Amount Big Hero */}
              <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Amount Received
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono mt-0.5">
                    ₹{receiptData.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-800 text-xs font-bold uppercase tracking-wide shadow-2xs">
                    {receiptData.paymentMethod}
                  </span>
                  {receiptData.referenceNumber !== "N/A" && (
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      Ref: {receiptData.referenceNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Customer & Salesman Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200/70">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    Received From
                  </span>
                  <span className="font-bold text-slate-900 block text-sm">
                    {receiptData.customerName}
                  </span>
                  <span className="text-slate-600 block">
                    Code: {receiptData.customerCode}
                    {receiptData.customerCity ? ` • ${receiptData.customerCity}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    Collected By
                  </span>
                  <span className="font-bold text-slate-900 block text-sm">
                    {receiptData.salesmanName}
                  </span>
                  <span className="text-slate-600 block">Date: {receiptData.paymentDate}</span>
                </div>
              </div>

              {/* Invoices Allocation Section */}
              {receiptData.allocations.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Allocated Invoices ({receiptData.allocations.length})
                  </span>
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px]">
                        <tr>
                          <th className="px-3 py-1.5">Invoice #</th>
                          <th className="px-3 py-1.5">Date</th>
                          <th className="px-3 py-1.5 text-right">Allocated (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {receiptData.allocations.map((a, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-mono font-bold text-slate-800">
                              {a.invoiceNumber}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{a.invoiceDate}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                              ₹{a.allocatedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium">
                  Payment credited to general account balance (no specific invoices linked).
                </div>
              )}

              {/* Balances Summary Footer */}
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Remaining Customer Balance:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{receiptData.remainingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="h-10 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={handleCopyReceipt}
                className="h-10 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                {copiedReceipt ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResetForAnother}
                className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                + Log Another Payment
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-6 rounded-xl bg-teal-brand hover:bg-teal-brand/90 text-white text-xs font-bold transition-opacity shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────────────────────
            MAIN LOG PAYMENT FORM MODAL
            ──────────────────────────────────────────────────────────────────────── */
        <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in fade-in zoom-in duration-150">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-[#F8F9FF]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-brand text-white flex items-center justify-center shadow-xs">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0B1C30]">Log Customer Payment</h2>
                <p className="text-xs text-slate-500 font-normal">
                  Record incoming funds, assign salesman &amp; allocate to unpaid invoices
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Banner */}
          {errorToast && (
            <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorToast}</span>
            </div>
          )}

          {/* Form Content */}
          <form
            id="admin-log-payment-form"
            onSubmit={handleOpenReview}
            className="p-6 overflow-y-auto space-y-6 text-sm"
          >
            {/* ── 1. CUSTOMER & SALESMAN SECTION ── */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-brand uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  1. Customer &amp; Collector Selection
                </span>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId("");
                      setCustomerSearch("");
                    }}
                    className="text-xs font-bold text-teal-brand hover:underline cursor-pointer"
                  >
                    Change Customer
                  </button>
                )}
              </div>

              {!selectedCustomerId ? (
                /* Customer Search Dropdown */
                <div ref={customerDropdownRef} className="relative">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Select Customer <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search customer by name, code, phone, or city..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-slate-900 outline-none font-medium text-sm transition-all"
                    />
                  </div>

                  {isCustomerDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 z-30 divide-y divide-slate-100">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((cust) => {
                          const summary = summaries.find((s) => s.customer_id === cust.id);
                          const bal = summary ? summary.total_balance : cust.opening_balance;
                          return (
                            <div
                              key={cust.id}
                              onClick={() => {
                                setSelectedCustomerId(cust.id);
                                setIsCustomerDropdownOpen(false);
                                setCustomerSearch("");
                              }}
                              className="p-3 hover:bg-[#F8F9FF] cursor-pointer flex items-center justify-between transition-colors"
                            >
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{cust.name}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>Code: {cust.customer_code || cust.id.slice(0, 8)}</span>
                                  {cust.city && <span>• {cust.city}</span>}
                                  {cust.phone && <span>• 📞 {cust.phone}</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                                  Balance
                                </span>
                                <span
                                  className={`text-xs font-bold font-mono ${
                                    Number(bal) > 0 ? "text-rose-600" : "text-emerald-600"
                                  }`}
                                >
                                  ₹{Number(bal || 0).toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500 font-medium">
                          No customers found matching &quot;{customerSearch}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : selectedCustomer ? (
                /* Selected Customer Snapshot Card */
                <div className="bg-[#F8F9FF] border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[#0B1C30]">
                        {selectedCustomer.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-teal-brand text-[11px] font-bold font-mono">
                        {selectedCustomer.customer_code || selectedCustomer.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {[selectedCustomer.city, selectedCustomer.state, selectedCustomer.phone]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-lg border border-slate-200 shrink-0">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                        Current Outstanding
                      </span>
                      <span className="text-base font-black text-rose-600 font-mono">
                        {isLoadingSummaries ? (
                          <Spinner className="w-4 h-4 text-rose-600" />
                        ) : (
                          `₹${currentOutstanding.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}`
                        )}
                      </span>
                    </div>
                    {Number(selectedCustomer.credit_limit || 0) > 0 && (
                      <div className="border-l border-slate-200 pl-4">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                          Credit Limit
                        </span>
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          ₹{Number(selectedCustomer.credit_limit).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Salesman Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Receiving Salesman / Collector <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedSalesmanId}
                    onChange={(e) => setSelectedSalesmanId(e.target.value)}
                    required
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-slate-900 outline-none font-medium text-sm cursor-pointer"
                  >
                    <option value="" disabled>
                      Select Salesman
                    </option>
                    {salesmen.map((sm) => {
                      const isAssigned =
                        selectedCustomer?.assigned_salesman_id === sm.id;
                      return (
                        <option key={sm.id} value={sm.id}>
                          {sm.name} {sm.employee_code ? `(${sm.employee_code})` : ""}{" "}
                          {isAssigned ? "★ (Assigned)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-slate-900 outline-none font-medium text-sm font-mono"
                  />
                </div>
              </div>
            </section>

            {/* ── 2. PAYMENT DETAILS SECTION ── */}
            <section className="space-y-4 pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-teal-brand uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                2. Payment Details
              </span>

              {/* Payment Method Pills */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { id: "upi", label: "UPI / QR", icon: "⚡" },
                      { id: "bank_transfer", label: "NEFT / RTGS", icon: "🏦" },
                      { id: "cash", label: "Cash", icon: "💵" },
                      { id: "cheque", label: "Cheque", icon: "📄" },
                      { id: "other", label: "Other", icon: "📦" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`h-11 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === m.id
                          ? "bg-teal-brand text-white border-teal-brand shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount and Reference Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Amount Collected (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-base">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-12 pl-8 pr-4 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-brand focus:ring-2 focus:ring-teal-brand/20 text-slate-900 outline-none font-bold text-lg font-mono transition-all"
                    />
                  </div>

                  {/* Quick Amount Chips */}
                  {currentOutstanding > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setAmount(currentOutstanding.toString())}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-teal-brand text-[11px] font-bold border border-blue-200 cursor-pointer transition-colors"
                      >
                        Full Due: ₹{currentOutstanding.toLocaleString("en-IN")}
                      </button>
                      {currentOutstanding > 1000 && (
                        <button
                          type="button"
                          onClick={() =>
                            setAmount(Math.round(currentOutstanding / 2).toString())
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
                        >
                          50%: ₹{Math.round(currentOutstanding / 2).toLocaleString("en-IN")}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    {paymentMethod === "cheque"
                      ? "Cheque # & Bank Name"
                      : paymentMethod === "upi"
                      ? "UPI Transaction ID / Ref #"
                      : paymentMethod === "bank_transfer"
                      ? "Bank UTR / Transaction #"
                      : "Reference / Receipt # (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder={
                      paymentMethod === "cheque"
                        ? "e.g. CHQ-981244 HDFC Bank"
                        : paymentMethod === "upi"
                        ? "e.g. 423987123984"
                        : paymentMethod === "bank_transfer"
                        ? "e.g. UTRN239841289"
                        : "Optional reference number"
                    }
                    className="w-full h-12 px-3.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-slate-900 outline-none font-medium text-sm transition-all"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Received via collection drive at main branch"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-slate-900 outline-none font-medium text-xs transition-all"
                />
              </div>
            </section>

            {/* ── 3. INVOICE ALLOCATION ENGINE ── */}
            {selectedCustomerId && (
              <section className="space-y-4 pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-teal-brand uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      3. Invoice Allocation
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Allocate this payment against customer&apos;s unpaid invoices
                    </p>
                  </div>

                  {unpaidInvoices.length > 0 && (
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setAllocationMode("fifo")}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          allocationMode === "fifo"
                            ? "bg-white text-teal-brand shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Auto (FIFO Oldest First)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllocationMode("manual")}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          allocationMode === "manual"
                            ? "bg-white text-teal-brand shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Manual Distribution
                      </button>
                    </div>
                  )}
                </div>

                {isLoadingInvoices ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <Spinner className="w-6 h-6 text-teal-brand mx-auto mb-2" />
                    <span className="text-xs text-slate-500 font-medium">
                      Loading open invoices...
                    </span>
                  </div>
                ) : unpaidInvoices.length > 0 ? (
                  <div className="space-y-3">
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                          <tr>
                            <th className="p-3">Invoice #</th>
                            <th className="p-3">Date</th>
                            <th className="p-3 text-right">Invoice Total</th>
                            <th className="p-3 text-right">Due Balance</th>
                            <th className="p-3 text-right w-36">This Allocation (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {unpaidInvoices.map((inv) => {
                            const alloc = computedAllocations.find(
                              (a) => a.invoice_id === inv.invoice_id
                            );
                            const allocAmount = alloc?.allocated_amount || 0;

                            return (
                              <tr key={inv.invoice_id} className="hover:bg-slate-50/70">
                                <td className="p-3 font-mono font-bold text-slate-900">
                                  {inv.invoice_number}
                                  {inv.days_overdue > 0 && (
                                    <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                                      {inv.days_overdue}d overdue
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-600">{inv.invoice_date}</td>
                                <td className="p-3 text-right font-mono text-slate-700">
                                  ₹{inv.invoice_total.toLocaleString("en-IN")}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-rose-600">
                                  ₹{inv.outstanding_amount.toLocaleString("en-IN")}
                                </td>
                                <td className="p-3 text-right">
                                  {allocationMode === "fifo" ? (
                                    <span className="font-mono font-bold text-teal-brand text-sm">
                                      ₹{allocAmount.toLocaleString("en-IN")}
                                    </span>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        max={inv.outstanding_amount}
                                        placeholder="0"
                                        value={manualAllocations[inv.invoice_id] || ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setManualAllocations((prev) => ({
                                            ...prev,
                                            [inv.invoice_id]: val,
                                          }));
                                        }}
                                        className="w-24 h-8 px-2 text-right rounded-lg border border-slate-300 font-mono font-bold text-xs focus:border-teal-brand focus:ring-1 focus:ring-teal-brand outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setManualAllocations((prev) => ({
                                            ...prev,
                                            [inv.invoice_id]: inv.outstanding_amount.toString(),
                                          }));
                                        }}
                                        className="text-[10px] font-bold text-teal-brand hover:bg-blue-50 px-1.5 py-1 rounded"
                                      >
                                        MAX
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Allocation Calculation Summary Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-slate-500 font-medium">Total Payment:</span>{" "}
                          <span className="font-mono font-bold text-slate-900">
                            ₹{enteredAmount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Allocated:</span>{" "}
                          <span className="font-mono font-bold text-teal-brand">
                            ₹{totalAllocatedAmount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        {unallocatedAmount > 0 && (
                          <div>
                            <span className="text-slate-500 font-medium">Advance / Unallocated:</span>{" "}
                            <span className="font-mono font-bold text-emerald-600">
                              ₹{unallocatedAmount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-slate-600">
                        <span>New Net Outstanding: </span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{remainingCustomerBalance.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      This customer currently has no pending open invoices. This payment will be
                      recorded as a general account credit.
                    </span>
                  </div>
                )}
              </section>
            )}
          </form>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-[#F8F9FF] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-log-payment-form"
              disabled={isSubmitting || !selectedCustomerId || enteredAmount <= 0}
              className="h-11 px-6 rounded-xl bg-teal-brand text-white font-bold text-xs hover:bg-teal-brand/90 transition-opacity shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Review &amp; Record Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* ────────────────────────────────────────────────────────────────────
              CONFIRMATION OVERLAY MODAL
              ──────────────────────────────────────────────────────────────────── */}
          {isConfirming && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-teal-brand">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#0B1C30] leading-tight">
                        Confirm Payment Entry
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Verify collection details before posting to ledger
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsConfirming(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Error Banner inside confirmation */}
                {errorToast && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorToast}</span>
                  </div>
                )}

                {/* Summary Card */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="font-semibold text-slate-600">Customer</span>
                    <span className="font-bold text-slate-900">{selectedCustomer?.name}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Collector / Salesman</span>
                    <span className="font-medium text-slate-800">
                      {salesmen.find((s) => s.id === selectedSalesmanId)?.name || "Direct"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Payment Mode</span>
                    <span className="font-bold text-slate-800 uppercase">{paymentMethod}</span>
                  </div>

                  {referenceNumber.trim() && (
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-600">Reference #</span>
                      <span className="font-mono text-slate-800">{referenceNumber.trim()}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Payment Date</span>
                    <span className="font-mono text-slate-800">{paymentDate}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-800">Amount Collected</span>
                    <span className="font-mono font-black text-base text-teal-brand">
                      ₹{enteredAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span>Allocations</span>
                    <span>
                      {computedAllocations.length} invoice(s) • ₹
                      {totalAllocatedAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsConfirming(false)}
                    className="flex-1 h-11 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Edit Details
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFinalSubmit}
                    className="flex-[1.5] h-11 bg-teal-brand text-white rounded-xl text-xs font-bold hover:bg-teal-brand/90 shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-75"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner className="w-4 h-4 text-white" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Confirm &amp; Post</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
