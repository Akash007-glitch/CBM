"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useLogout, useUser } from "@/store/authStore";
import { useDashboardStore, Customer } from "@/store/dashboardStore";
import {
  getCustomerOutstanding,
  type CustomerFinancialSummary,
} from "@/lib/services/customerService";
import type { PaymentWithCustomer } from "@/lib/services/paymentService";
import {
  Menu,
  Search,
  Plus,
  Phone,
  FileText,
  Banknote,
  ArrowLeft,
  X,
  MapPin,
  CheckCircle2,
  Home,
  Users,
  Wallet,
  Landmark,
  MoreHorizontal,
  TrendingUp,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Check,
  Copy,
  FileCheck,
  QrCode,
  ChevronDown,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "cheque" | "other";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI / QR",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  other: "Other",
};

import { LogoutConfirmModal } from "@/components/dashboard/LogoutConfirmModal";
import { usePreventAccidentalBack } from "@/lib/hooks/usePreventAccidentalBack";

export const isCashAccount = (name?: string | null): boolean => {
  if (!name) return false;
  const norm = name.trim().toUpperCase();
  return (
    norm === "CASH" ||
    norm === "CASH A/C" ||
    norm === "CASH A/C." ||
    norm === "CASH AC" ||
    norm === "CASH ACCOUNT" ||
    norm === "CASH IN HAND" ||
    norm === "PETTY CASH" ||
    /^CASH(\s+(A\/C|ACCOUNT|IN\s+HAND))?$/i.test(norm)
  );
};

export default function SalesmanDashboardPage() {
  const logout = useLogout();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Trap browser back button to prevent accidental logout/exit
  usePreventAccidentalBack(() => {
    setIsLogoutModalOpen(true);
  });

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setIsLogoutModalOpen(false);
      window.location.assign("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Navigation & view states
  const [activeTab, setActiveTab] = useState<"home" | "customers" | "collections" | "record-collection">("customers");

  // Store data & actions
  const initialize = useDashboardStore((s) => s.initialize);
  const destroy = useDashboardStore((s) => s.destroy);
  const customers = useDashboardStore((s) => s.customers);
  const financialSummaries = useDashboardStore((s) => s.financialSummaries);
  const salesmen = useDashboardStore((s) => s.salesmen);
  const payments = useDashboardStore((s) => s.payments);
  const invoices = useDashboardStore((s) => s.invoices);
  const recordPayment = useDashboardStore((s) => s.recordPayment);
  const addCustomer = useDashboardStore((s) => s.addCustomer);

  // Map customer_id -> CustomerFinancialSummary
  const summaryMap = useMemo(() => {
    const map = new Map<string, CustomerFinancialSummary>();
    financialSummaries.forEach((s) => map.set(s.customer_id, s));
    return map;
  }, [financialSummaries]);

  // Resolve the current salesman's row ID (needed for payment RLS)
  const currentUser = useUser();
  const currentSalesmanId = salesmen.find((s) => s.user_id === currentUser?.id)?.id ?? "";

  // Fetch data from Supabase on mount
  useEffect(() => {
    initialize();
    return () => destroy();
  }, [initialize, destroy]);

  // Customer Directory Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Add Customer Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Record Collection Form state
  const [collCustomer, setCollCustomer] = useState<Customer | null>(null);
  const [collCustomerSearch, setCollCustomerSearch] = useState("");
  const [isCollCustomerDropdownOpen, setIsCollCustomerDropdownOpen] = useState(false);
  const collDropdownRef = useRef<HTMLDivElement>(null);

  // Close customer dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (collDropdownRef.current && !collDropdownRef.current.contains(event.target as Node)) {
        setIsCollCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered customer list for collection customer selector (excludes Cash & system accounts)
  const collFilteredCustomers = useMemo(() => {
    const validCustomers = customers.filter((c) => !isCashAccount(c.name));
    if (!collCustomerSearch.trim()) return validCustomers;
    const q = collCustomerSearch.toLowerCase();
    return validCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.customer_code && c.customer_code.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, collCustomerSearch]);

  const [collInvoiceTotal, setCollInvoiceTotal] = useState<number>(0);
  const [collPrevPaid, setCollPrevPaid] = useState<number>(0);
  const [unpaidInvoices, setUnpaidInvoices] = useState<{ invoice_id: string; outstanding_amount: number; invoice_total: number }[]>([]);
  const [applyDiscount, setApplyDiscount] = useState<boolean>(false);
  const [damageDeduction, setDamageDeduction] = useState<string>("0");
  const [specialDiscount, setSpecialDiscount] = useState<string>("0");
  const [amountCollected, setAmountCollected] = useState<string>("0.00");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Synchronous submission lock refs to completely prevent multi-click races
  const isFinalizingRef = useRef(false);
  const isCreatingCustomerRef = useRef(false);

  // Collection Confirmation & Receipt Modal state
  const [isConfirmingCollection, setIsConfirmingCollection] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    id: string;
    customerName: string;
    customerCode: string;
    amount: number;
    paymentMethod: string;
    referenceNumber: string;
    date: string;
    time: string;
    newBalance: number;
    damageDeduction?: number;
    specialDiscount?: number;
  } | null>(null);

  // Handle direct navigation to Record Collection from Customer Card Collection Icon
  const handleOpenCollection = async (customer: Customer) => {
    setCollCustomer(customer);

    let invs: { invoice_id: string; outstanding_amount: number; invoice_total: number }[] = [];
    try {
      const data = await getCustomerOutstanding(customer.id);
      invs = (data || []).map((row) => ({
        invoice_id: row.invoice_id ?? "",
        outstanding_amount: Number(row.outstanding_amount ?? 0),
        invoice_total: Number(row.invoice_total ?? 0),
      })).filter((i) => i.outstanding_amount > 0);
    } catch {
      invs = [];
    }

    setUnpaidInvoices(invs);

    const totalOutstandingFromInvoices = invs.reduce(
      (sum, i) => sum + i.outstanding_amount,
      0
    );
    const totalInvoiceSum = invs.reduce(
      (sum, i) => sum + i.invoice_total,
      0
    );
    const totalPaidSum = Math.max(0, totalInvoiceSum - totalOutstandingFromInvoices);

    const summary = summaryMap.get(customer.id);
    const customerNetBalance = summary ? Number(summary.total_balance) : Number(customer.opening_balance || 0);

    const effectiveOutstanding = totalOutstandingFromInvoices > 0
      ? totalOutstandingFromInvoices
      : customerNetBalance > 0
        ? customerNetBalance
        : Number(customer.opening_balance || 0);

    setCollInvoiceTotal(totalInvoiceSum > 0 ? totalInvoiceSum : effectiveOutstanding);
    setCollPrevPaid(totalPaidSum);
    setAmountCollected(effectiveOutstanding > 0 ? effectiveOutstanding.toFixed(2) : "0.00");
    setApplyDiscount(false);
    setDamageDeduction("0");
    setSpecialDiscount("0");
    setReferenceNumber("");
    setIsConfirmingCollection(false);
    setReceiptData(null);
    setActiveTab("record-collection");
  };

  // Handle step 1: open collection confirmation modal
  const handleInitiateConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collCustomer) return;

    const collectedNum = parseFloat(amountCollected) || 0;
    if (collectedNum <= 0) {
      setToastMessage("Please enter a valid collection amount.");
      setTimeout(() => setToastMessage(null), 2000);
      return;
    }

    setIsConfirmingCollection(true);
  };

  // Handle step 2: finalize collection & record to store with payment allocations
  const handleFinalizeCollection = async () => {
    if (!collCustomer || isFinalizingRef.current) return;
    isFinalizingRef.current = true;

    const collectedNum = parseFloat(amountCollected) || 0;
    const damageNum = parseFloat(damageDeduction) || 0;
    const discountNum = parseFloat(specialDiscount) || 0;

    setIsFinalizing(true);
    try {
      if (!currentSalesmanId) {
        throw new Error("Your salesman profile is not set up correctly. Please contact the admin.");
      }

      // Compute FIFO allocations against customer's unpaid invoices
      let remaining = collectedNum;
      const allocations: { invoice_id: string; allocated_amount: number }[] = [];
      for (const inv of unpaidInvoices) {
        if (remaining <= 0) break;
        const alloc = Math.min(remaining, inv.outstanding_amount);
        if (alloc > 0 && inv.invoice_id) {
          allocations.push({
            invoice_id: inv.invoice_id,
            allocated_amount: alloc,
          });
          remaining -= alloc;
        }
      }

      await recordPayment(
        {
          customer_id: collCustomer.id,
          salesman_id: currentSalesmanId,
          created_by: currentUser?.id ?? "",
          amount: collectedNum,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || null,
          notes: damageNum > 0 || discountNum > 0
            ? `Damage: ${damageNum}, Discount: ${discountNum}`
            : null,
          payment_date: new Date().toISOString().split("T")[0],
        },
        allocations
      );

      const newReceipt = {
        id: `COL-${payments.length + 102}`,
        customerName: collCustomer.name,
        customerCode: collCustomer.customer_code || collCustomer.id.slice(0, 8),
        amount: collectedNum,
        paymentMethod: PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod,
        referenceNumber: referenceNumber.trim() || "N/A",
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        newBalance,
        damageDeduction: damageNum,
        specialDiscount: discountNum,
      };

      setReceiptData(newReceipt);
      setIsConfirmingCollection(false);
      setToastMessage(`Collection of ₹${collectedNum.toLocaleString("en-IN")} confirmed for ${collCustomer.name}!`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to record payment. Please try again.";
      setToastMessage(`Error: ${msg}`);
      setTimeout(() => setToastMessage(null), 4000);
      setIsConfirmingCollection(false);
    } finally {
      isFinalizingRef.current = false;
      setIsFinalizing(false);
    }
  };

  // Handle Quick Add Customer submission
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || isCreatingCustomerRef.current) return;
    isCreatingCustomerRef.current = true;

    setIsCreatingCustomer(true);
    try {
      await addCustomer({
        name: newCompanyName.trim(),
        email: null,
        phone: newPhone.trim() || null,
        city: newCity.trim() || null,
        is_active: true,
        opening_balance: 0,
        credit_limit: 0,
        assigned_salesman_id: currentSalesmanId || null,
      });

      setNewCompanyName("");
      setNewCity("");
      setNewPhone("");
      setIsAddCustomerOpen(false);
      setToastMessage(`New Customer "${newCompanyName}" added to Directory!`);
      setTimeout(() => setToastMessage(null), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add customer.";
      setToastMessage(`Error: ${msg}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      isCreatingCustomerRef.current = false;
      setIsCreatingCustomer(false);
    }
  };

  // Filtered customer list (exclude CASH ledger account)
  const filteredCustomers = customers
    .filter((cust) => !isCashAccount(cust.name))
    .filter((cust) => {
      const q = searchQuery.toLowerCase();
      return (
        cust.name.toLowerCase().includes(q) ||
        (cust.city && cust.city.toLowerCase().includes(q)) ||
        (cust.customer_code && cust.customer_code.toLowerCase().includes(q)) ||
        (cust.phone && cust.phone.includes(q))
      );
    });

  // Calculate deductions & new balance
  const damageNum = parseFloat(damageDeduction) || 0;
  const discountNum = parseFloat(specialDiscount) || 0;
  const totalDeduction = damageNum + discountNum;
  const currentOutstanding = collCustomer
    ? (summaryMap.get(collCustomer.id)?.total_balance ?? (
      Number(collCustomer.opening_balance) > 0
        ? Number(collCustomer.opening_balance)
        : Math.max(0, collInvoiceTotal - collPrevPaid)
    ))
    : 0;
  const collectedVal = parseFloat(amountCollected) || 0;
  const newBalance = Math.max(0, currentOutstanding - totalDeduction - collectedVal);

  return (
    <AuthGuard requireAuth requiredRole="salesman">
      <div className="min-h-screen bg-[#F8F9FE] font-sans text-slate-900 flex flex-col justify-between pb-20">
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-teal-brand text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-in fade-in zoom-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-blue-200 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ── TOP HEADER (Sales Portal Bar) ── */}
        {activeTab !== "record-collection" && (
          <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 py-3.5 flex items-center justify-between shadow-2xs">
            <button
              onClick={() => setActiveTab(activeTab === "home" ? "customers" : "home")}
              className="p-2 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              <Menu className="w-6 h-6 text-slate-800" />
            </button>

            <h1 className="text-lg font-bold text-teal-brand tracking-tight">Sales Portal</h1>

            <div className="flex items-center gap-1">
              {/* <button
                onClick={() => {
                  const el = document.getElementById("customer-search-input");
                  if (el) el.focus();
                }}
                className="p-2 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-slate-700" />
              </button> */}

              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </header>
        )}

        {/* ── MAIN CONTENT AREA ── */}
        <main className="flex-1 w-full max-w-lg mx-auto">
          {/* ========================================================================= */}
          {/* 1. CUSTOMERS DIRECTORY TAB (MATCHES IMAGE 1 SCREENSHOT EXACTLY)           */}
          {/* ========================================================================= */}
          {activeTab === "customers" && (
            <div className="p-4 space-y-4 animate-in fade-in duration-150">
              {/* Search Bar Input */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="customer-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers, phone, or location..."
                  className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-brand focus:ring-2 focus:ring-teal-brand/15 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Section Header */}
              <div className="flex items-center justify-between pt-1">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Customer Directory</h2>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF1FF] text-teal-brand">
                  {`${filteredCustomers.length} Total`}
                </span>
              </div>

              {/* Customer Cards List */}
              <div className="space-y-3.5">
                {filteredCustomers.map((cust) => {
                  const isOverdue = !cust.is_active;
                  const isCurrent = cust.is_active;
                  const isInactive = !cust.is_active;
                  const statusLabel = cust.is_active ? "Active" : "Inactive";
                  const summary = summaryMap.get(cust.id);
                  const outstanding = summary ? Number(summary.total_balance) : Number(cust.opening_balance || 0);

                  return (
                    <div
                      key={cust.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs transition-all hover:shadow-xs"
                    >
                      {/* Top Row: Name & Status Badge */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {cust.name}
                          </h3>
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{cust.city || "—"}</span>
                          </div>
                        </div>

                        {/* Status Badge Pill */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isOverdue
                            ? "bg-red-100/90 text-red-700"
                            : isCurrent
                              ? "bg-blue-100/90 text-teal-brand"
                              : isInactive
                                ? "bg-slate-100 text-slate-600"
                                : "bg-teal-brand/10 text-teal-brand"
                            }`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {/* Middle Row: Outstanding & Last Interaction */}
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            OUTSTANDING
                          </span>
                          <span
                            className={`text-base font-extrabold ${outstanding > 0
                              ? isOverdue
                                ? "text-red-600"
                                : "text-slate-900"
                              : outstanding < 0
                                ? "text-emerald-600"
                                : "text-slate-400"
                              }`}
                          >
                            ₹ {outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            LAST INTERACTION
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            {new Date(cust.updated_at).toLocaleDateString("en-IN") || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons Row: Call & Collect */}
                      <div className="flex items-center gap-2.5 mt-4">
                        <a
                          href={`tel:${(cust.phone || "").replace(/[^0-9+]/g, "")}`}
                          className="flex-1 h-9 border border-slate-200 hover:border-teal-brand/40 rounded-xl text-xs font-bold text-teal-brand flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white"
                        >
                          <Phone className="w-3.5 h-3.5 text-teal-brand" />
                          <span>Call</span>
                        </a>

                        <button
                          onClick={() => handleOpenCollection(cust)}
                          title={`Record Collection for ${cust.name}`}
                          className="flex-1 h-9 bg-teal-brand hover:bg-teal-brand/90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Banknote className="w-4 h-4 text-blue-200" />
                          <span>Collect</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. RECORD COLLECTION PAGE (MATCHES IMAGE 2 SCREENSHOT EXACTLY)             */}
          {/* ========================================================================= */}
          {activeTab === "record-collection" && (
            <div className="min-h-screen bg-[#F8F9FE] flex flex-col justify-between animate-in fade-in slide-in-from-right duration-200">
              {/* Header: Back Arrow + Record Collection Title */}
              <div className="bg-white border-b border-slate-200/80 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
                <button
                  onClick={() => setActiveTab("customers")}
                  className="p-1 text-slate-700 hover:text-slate-900 cursor-pointer"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-800" />
                </button>
                <h1 className="text-base font-bold text-slate-900 tracking-tight text-center flex-1 pr-6">
                  Record Collection
                </h1>
              </div>

              {/* Form Container */}
              <form onSubmit={handleInitiateConfirmation} className="p-4 space-y-4 flex-1 pb-24">
                {/* Alert Top Banner */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs font-medium leading-relaxed flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-brand shrink-0" />
                  <span>Verify collection details and click Confirm Collection below to open final review.</span>
                </div>

                {/* Customer Selector */}
                <div className="space-y-1.5" ref={collDropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Customer <span className="text-red-500">*</span>
                    </label>
                    {collCustomer && (
                      <button
                        type="button"
                        onClick={() => {
                          setCollCustomer(null);
                          setIsCollCustomerDropdownOpen(true);
                        }}
                        className="text-[11px] font-semibold text-teal-brand hover:underline cursor-pointer"
                      >
                        Change Customer
                      </button>
                    )}
                  </div>

                  {collCustomer ? (
                    /* Selected Customer Snapshot Card */
                    <div className="bg-white border-2 border-teal-brand/30 rounded-2xl p-3.5 shadow-2xs relative group hover:border-teal-brand/50 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-brand/10 text-teal-brand flex items-center justify-center font-black text-sm shrink-0 border border-teal-brand/20">
                            {collCustomer.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm leading-tight">
                                {collCustomer.name}
                              </h4>
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                                {collCustomer.customer_code || collCustomer.id.slice(0, 6)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-1">
                              {collCustomer.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {collCustomer.city}
                                </span>
                              )}
                              {collCustomer.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {collCustomer.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                              Outstanding
                            </span>
                            <span className={`text-xs font-black font-mono ${currentOutstanding > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                              ₹{currentOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCollCustomer(null);
                              setIsCollCustomerDropdownOpen(true);
                            }}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer ml-1"
                            title="Remove or Change Customer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Customer Search Dropdown Trigger & Popover */
                    <div className="relative">
                      <div
                        onClick={() => setIsCollCustomerDropdownOpen(true)}
                        className={`relative flex items-center bg-white border rounded-xl px-3.5 h-12 shadow-2xs cursor-pointer transition-all ${
                          isCollCustomerDropdownOpen
                            ? "border-teal-brand ring-2 ring-teal-brand/20"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                        <input
                          type="text"
                          value={collCustomerSearch}
                          onChange={(e) => {
                            setCollCustomerSearch(e.target.value);
                            setIsCollCustomerDropdownOpen(true);
                          }}
                          onFocus={() => setIsCollCustomerDropdownOpen(true)}
                          placeholder="Search customer by name, code, city..."
                          className="w-full text-xs font-semibold text-slate-900 bg-transparent outline-none placeholder-slate-400"
                        />
                        {collCustomerSearch ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollCustomerSearch("");
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 transition-transform ${
                              isCollCustomerDropdownOpen ? "rotate-180 text-teal-brand" : ""
                            }`}
                          />
                        )}
                      </div>

                      {/* Dropdown Menu */}
                      {isCollCustomerDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-72 overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200 z-40 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-3 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10 backdrop-blur-xs">
                            <span>Select a customer ({collFilteredCustomers.length})</span>
                            {collCustomerSearch && (
                              <button
                                type="button"
                                onClick={() => setCollCustomerSearch("")}
                                className="text-teal-brand hover:underline font-semibold cursor-pointer"
                              >
                                Clear search
                              </button>
                            )}
                          </div>

                          {collFilteredCustomers.length > 0 ? (
                            collFilteredCustomers.map((cust) => {
                              const summary = summaryMap.get(cust.id);
                              const bal = summary ? Number(summary.total_balance) : Number(cust.opening_balance || 0);
                              return (
                                <div
                                  key={cust.id}
                                  onClick={() => {
                                    handleOpenCollection(cust);
                                    setIsCollCustomerDropdownOpen(false);
                                    setCollCustomerSearch("");
                                  }}
                                  className="p-3 hover:bg-teal-50/50 cursor-pointer flex items-center justify-between transition-colors group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-teal-100 text-slate-700 group-hover:text-teal-brand flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                                      {cust.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 text-xs group-hover:text-teal-brand transition-colors">
                                        {cust.name}
                                      </div>
                                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                        <span className="font-mono font-medium text-slate-400">
                                          {cust.customer_code || cust.id.slice(0, 6)}
                                        </span>
                                        {cust.city && (
                                          <span className="flex items-center gap-0.5">
                                            • <MapPin className="w-2.5 h-2.5 text-slate-400 inline" /> {cust.city}
                                          </span>
                                        )}
                                        {cust.phone && (
                                          <span className="flex items-center gap-0.5">
                                            • <Phone className="w-2.5 h-2.5 text-slate-400 inline" /> {cust.phone}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right pl-3 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">
                                      Balance
                                    </span>
                                    <span
                                      className={`text-xs font-black font-mono ${
                                        bal > 0 ? "text-rose-600" : "text-emerald-600"
                                      }`}
                                    >
                                      ₹{bal.toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-6 text-center space-y-2">
                              <p className="text-xs font-semibold text-slate-600">
                                No customers found matching &quot;{collCustomerSearch}&quot;
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddCustomerOpen(true);
                                  setIsCollCustomerDropdownOpen(false);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-brand text-white text-xs font-bold rounded-lg shadow-2xs hover:bg-teal-brand/90 transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add New Customer</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Select Invoice Summary Card */}
                <div className="space-y-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Select Invoice</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-tight">
                      Selecting this will apply the collection to the oldest outstanding bill.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                      <span>Invoice Total</span>
                      <span className="font-bold text-slate-900">₹{collInvoiceTotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                      <span>Previously Paid</span>
                      <span className="font-bold text-slate-900">₹{collPrevPaid.toFixed(2)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">Outstanding Balance</span>
                      <span className="text-sm font-black text-red-600">
                        ₹{currentOutstanding.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Apply Discount or Damage Deduction Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Apply Discount or Damage Deduction</span>
                    <button
                      type="button"
                      onClick={() => setApplyDiscount(!applyDiscount)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${applyDiscount ? "bg-teal-brand" : "bg-slate-300"
                        }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${applyDiscount ? "translate-x-5" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>

                  {applyDiscount && (
                    <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Damage Deduction
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              value={damageDeduction}
                              onChange={(e) => setDamageDeduction(e.target.value)}
                              className="w-full h-9 pl-7 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-teal-brand"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Special Discount
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              value={specialDiscount}
                              onChange={(e) => setSpecialDiscount(e.target.value)}
                              className="w-full h-9 pl-7 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-teal-brand"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold pt-1 text-slate-700">
                        <span>Total Deduction</span>
                        <span className="font-extrabold text-slate-900">₹{totalDeduction.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount Collected Section */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Amount Collected <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3.5 h-12 shadow-2xs">
                    <span className="text-base font-bold text-slate-700 mr-2">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amountCollected}
                      onChange={(e) => setAmountCollected(e.target.value)}
                      className="w-full text-base font-black text-slate-900 bg-transparent outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-slate-500 font-semibold">New Balance</span>
                    <span className="font-bold text-teal-brand">₹{newBalance.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method Cards */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Payment Method <span className="text-red-500">*</span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {(
                      [
                        { id: "cash", label: "Cash", icon: <Banknote className="w-5 h-5" /> },
                        { id: "upi", label: "UPI / QR", icon: <QrCode className="w-5 h-5" /> },
                        { id: "bank_transfer", label: "Transfer", icon: <Landmark className="w-5 h-5" /> },
                        { id: "cheque", label: "Cheque", icon: <FileText className="w-5 h-5" /> },
                        { id: "other", label: "Other", icon: <MoreHorizontal className="w-5 h-5" /> },
                      ] as const
                    ).map((pm) => {
                      const isSelected = paymentMethod === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`h-16 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${isSelected
                              ? "border-teal-brand bg-blue-50/70 text-teal-brand shadow-2xs ring-1 ring-teal-brand"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            }`}
                        >
                          <div className={isSelected ? "text-teal-brand" : "text-slate-500"}>{pm.icon}</div>
                          <span className="text-xs font-bold">
                            {pm.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reference Number Field */}
                <div className="space-y-1 pb-4">
                  <label className="text-xs font-bold text-slate-700">Reference Number (Optional)</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Receipt / UPI / Cheque #"
                    className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-teal-brand shadow-2xs"
                  />
                </div>

                {/* Sticky Action Footer */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3.5 flex items-center gap-3 z-40 max-w-lg mx-auto shadow-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab("customers")}
                    className="flex-1 h-11 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-2 h-11 bg-teal-brand hover:bg-teal-brand/90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-200" />
                    <span>Confirm Collection ({collectedVal > 0 ? `₹${collectedVal.toLocaleString("en-IN")}` : "₹0"})</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. HOME OVERVIEW TAB                                                       */}
          {/* ========================================================================= */}
          {activeTab === "home" && (
            <div className="p-4 space-y-5 animate-in fade-in duration-150">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Sales Portal</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Welcome back, Sales Manager</p>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">My Sales Today</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      ₹{invoices
                        .filter(
                          (i) =>
                            (i.salesman_id === currentSalesmanId || !currentSalesmanId) &&
                            i.invoice_date?.startsWith(new Date().toISOString().split("T")[0]) &&
                            i.status !== "cancelled"
                        )
                        .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
                        .toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-teal-brand">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">My Collections</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      ₹{payments.reduce((sum: number, c: { amount: number }) => sum + Number(c.amount), 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Customer Outstanding</span>
                    <p className="text-2xl font-black text-rose-600 mt-1">
                      ₹{financialSummaries
                        .filter((s) => !isCashAccount(s.customer_name))
                        .reduce((sum, s) => sum + (s.total_balance > 0 ? s.total_balance : 0), 0)
                        .toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                    <Landmark className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
                </div>
                <button
                  onClick={() => setActiveTab("customers")}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-brand" />
                    Browse Customer Directory
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. COLLECTIONS LOG TAB                                                     */}
          {/* ========================================================================= */}
          {activeTab === "collections" && (
            <div className="p-4 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Recent Collections</h2>
                  <p className="text-xs text-slate-500 font-medium">Log of all payments received</p>
                </div>
                <button
                  onClick={() => {
                    const defaultCust = customers[0];
                    if (defaultCust) handleOpenCollection(defaultCust);
                  }}
                  className="px-3 py-2 bg-teal-brand text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record</span>
                </button>
              </div>

              <div className="space-y-3">
                {payments.map((col) => {
                  const customerName =
                    customers.find((c) => c.id === col.customer_id)?.name ??
                    (col as PaymentWithCustomer).customers?.name ??
                    "Unknown Customer";

                  return (
                    <div key={col.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex justify-between items-start text-xs font-bold">
                        <div>
                          <span className="text-slate-900 block font-bold text-sm">{customerName}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-teal-brand text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-teal-brand" />
                              Confirmed
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {PAYMENT_METHOD_LABELS[col.payment_method as PaymentMethod] || col.payment_method?.replace("_", " ") || "Cash"}
                            </span>
                          </div>
                        </div>
                        <span className="text-teal-brand font-black text-sm">₹{Number(col.amount).toLocaleString("en-IN")}</span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <span>Ref: {col.reference_number || (col as unknown as { payment_number?: string }).payment_number || col.id.slice(0, 8)}</span>
                        <span>{new Date(col.payment_date).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>
                  );
                })}
                {payments.length === 0 && (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs font-medium">
                    No collections recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ── MODAL: QUICK ADD NEW CUSTOMER ── */}
        {isAddCustomerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Add New Customer</h3>
                <button onClick={() => setIsAddCustomerOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Company / Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl font-medium outline-none focus:border-teal-brand"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Location / City</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl font-medium outline-none focus:border-teal-brand"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl font-medium outline-none focus:border-teal-brand"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isCreatingCustomer}
                    onClick={() => setIsAddCustomerOpen(false)}
                    className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingCustomer}
                    className="flex-1 h-10 bg-teal-brand text-white rounded-xl font-bold hover:bg-teal-brand/90 shadow-xs flex items-center justify-center gap-2 disabled:opacity-75"
                  >
                    {isCreatingCustomer ? (
                      <>
                        <Spinner className="w-4 h-4 text-white" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      "Create"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: COLLECTION CONFIRMATION DRAWER ── */}
        {isConfirmingCollection && collCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-teal-brand">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">Confirm Collection</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Verify summary before recording</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsConfirmingCollection(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Breakdown Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Customer</span>
                  <span className="font-bold text-slate-900">{collCustomer.name}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Payment Method</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                    {PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod}
                  </span>
                </div>

                {referenceNumber && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Reference #</span>
                    <span className="font-mono font-bold text-slate-800">{referenceNumber}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Previous Outstanding</span>
                  <span className="font-bold text-slate-800">₹{currentOutstanding.toFixed(2)}</span>
                </div>

                {totalDeduction > 0 && (
                  <div className="flex justify-between items-center text-amber-700">
                    <span className="font-semibold">Total Deductions</span>
                    <span className="font-bold">- ₹{totalDeduction.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Amount Collected</span>
                  <span className="text-base font-black text-teal-brand">₹{collectedVal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-slate-500">Updated Balance</span>
                  <span className="font-bold text-slate-900">₹{newBalance.toFixed(2)}</span>
                </div>
              </div>

              {/* Alert notice */}
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 font-medium">
                By confirming, this payment will be logged to customer ledger and synced with admin dashboard.
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={isFinalizing}
                  onClick={() => setIsConfirmingCollection(false)}
                  className="flex-1 h-11 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  disabled={isFinalizing}
                  onClick={handleFinalizeCollection}
                  className="flex-[1.5] h-11 bg-teal-brand text-white rounded-xl text-xs font-bold hover:bg-teal-brand/90 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-75"
                >
                  {isFinalizing ? (
                    <>
                      <Spinner className="w-4 h-4 text-white" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-white stroke-3" />
                      <span>Confirm & Submit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: COLLECTION CONFIRMED RECEIPT VIEW ── */}
        {receiptData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-5 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-teal-brand mx-auto flex items-center justify-center">
                <FileCheck className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">Collection Confirmed!</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Receipt #{receiptData.id}</p>
              </div>

              <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Customer:</span>
                  <span className="font-bold text-slate-900">{receiptData.customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Amount Paid:</span>
                  <span className="font-extrabold text-teal-brand text-sm">
                    ₹{receiptData.amount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Payment Mode:</span>
                  <span className="font-bold text-slate-800">{receiptData.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Ref #:</span>
                  <span className="font-mono font-bold text-slate-700">{receiptData.referenceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Date & Time:</span>
                  <span className="font-medium text-slate-700">
                    {receiptData.date} • {receiptData.time}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `COLLECTION RECEIPT\nReceipt #: ${receiptData.id}\nCustomer: ${receiptData.customerName}\nAmount: ₹${receiptData.amount}\nMode: ${receiptData.paymentMethod}\nDate: ${receiptData.date}`
                    );
                    setToastMessage("Receipt copied to clipboard!");
                    setTimeout(() => setToastMessage(null), 1500);
                  }}
                  className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-50"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy</span>
                </button>

                <button
                  onClick={() => {
                    setReceiptData(null);
                    setActiveTab("collections");
                  }}
                  className="flex-1 h-10 bg-teal-brand text-white rounded-xl text-xs font-bold hover:bg-teal-brand/90 shadow-xs"
                >
                  View Collections
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── BOTTOM NAVIGATION BAR (MATCHES IMAGE 1 SCREENSHOT) ── */}
        {activeTab !== "record-collection" && (
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 py-2 px-6 flex items-center justify-around max-w-lg mx-auto shadow-lg">
            {/* Home Tab */}
            <button
              onClick={() => setActiveTab("home")}
              className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeTab === "home" ? "text-teal-brand" : "text-slate-400 hover:text-slate-600"
                }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[11px] font-bold">Home</span>
            </button>

            {/* Customers Tab (Active Highlighted Pill) */}
            <button
              onClick={() => setActiveTab("customers")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full cursor-pointer transition-all ${activeTab === "customers"
                ? "bg-teal-brand/10 text-teal-brand"
                : "text-slate-400 hover:text-slate-600"
                }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[11px] font-bold">Customers</span>
            </button>

            {/* Collections Tab */}
            <button
              onClick={() => setActiveTab("collections")}
              className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeTab === "collections"
                ? "text-teal-brand"
                : "text-slate-400 hover:text-slate-600"
                }`}
            >
              <Wallet className="w-5 h-5" />
              <span className="text-[11px] font-bold">Collections</span>
            </button>
          </nav>
        )}

        {/* Logout Confirmation Modal */}
        <LogoutConfirmModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </div>
    </AuthGuard>
  );
}
