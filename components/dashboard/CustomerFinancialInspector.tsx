"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  ChevronDown,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Layers,
  RefreshCw,
  Eye,
  CheckCircle2,
  Building2,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import {
  getCustomerFinancialSummaries,
  getCustomerLedger,
  type CustomerFinancialSummary,
  type CustomerLedgerEntry,
} from "@/lib/services/customerService";
import { useDashboardStore } from "@/store/dashboardStore";
import { Spinner } from "@/components/ui/Spinner";

interface CustomerFinancialInspectorProps {
  selectedCustomerId?: string | null;
  onSelectCustomer?: (customerId: string) => void;
  className?: string;
}

export const CustomerFinancialInspector: React.FC<CustomerFinancialInspectorProps> = ({
  selectedCustomerId: controlledCustomerId,
  onSelectCustomer,
  className = "",
}) => {
  const salesmen = useDashboardStore((s) => s.salesmen);
  const rawCustomers = useDashboardStore((s) => s.customers);

  const [summaries, setSummaries] = useState<CustomerFinancialSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [ledgerEntries, setLedgerEntries] = useState<CustomerLedgerEntry[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeLedgerTab, setActiveLedgerTab] = useState<"all" | "day_book" | "invoice" | "payment">("all");

  const formatINR = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);

  // Fetch all customer financial summaries
  const fetchSummaries = async () => {
    setIsLoadingSummaries(true);
    try {
      const data = await getCustomerFinancialSummaries();
      setSummaries(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(controlledCustomerId || data[0].customer_id);
      }
    } catch (err) {
      console.warn("Failed to load customer summaries via RPC, falling back to local store:", err);
      // Client-side fallback from raw store
      const fallback: CustomerFinancialSummary[] = rawCustomers.map((c) => ({
        customer_id: c.id,
        customer_name: c.name,
        customer_code: c.customer_code,
        phone: c.phone,
        email: c.email,
        address: c.address,
        city: c.city,
        state: c.state,
        pincode: c.pincode,
        gstin: c.gstin ?? null,
        is_active: c.is_active,
        credit_limit: Number(c.credit_limit || 0),
        opening_balance: Number(c.opening_balance || 0),
        daybook_debit: 0,
        daybook_credit: 0,
        invoice_debit: 0,
        payment_credit: 0,
        total_debit: 0,
        total_credit: 0,
        total_balance: Number(c.opening_balance || 0),
      }));
      setSummaries(fallback);
      if (fallback.length > 0 && !selectedId) {
        setSelectedId(controlledCustomerId || fallback[0].customer_id);
      }
    } finally {
      setIsLoadingSummaries(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [rawCustomers]);

  // Sync external controlled ID
  useEffect(() => {
    if (controlledCustomerId && controlledCustomerId !== selectedId) {
      setSelectedId(controlledCustomerId);
    }
  }, [controlledCustomerId]);

  // Fetch ledger when selected customer changes
  useEffect(() => {
    if (!selectedId) return;

    let isMounted = true;
    setIsLoadingLedger(true);

    getCustomerLedger(selectedId)
      .then((entries) => {
        if (isMounted) {
          setLedgerEntries(entries);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch customer ledger:", err);
        if (isMounted) setLedgerEntries([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingLedger(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  // Current selected customer data
  const currentSummary = useMemo(() => {
    return summaries.find((s) => s.customer_id === selectedId) || summaries[0] || null;
  }, [summaries, selectedId]);

  // Matching raw customer for additional metadata like assigned salesman
  const currentRawCustomer = useMemo(() => {
    if (!currentSummary) return null;
    return rawCustomers.find((c) => c.id === currentSummary.customer_id) || null;
  }, [rawCustomers, currentSummary]);

  const assignedSalesman = useMemo(() => {
    if (!currentRawCustomer?.assigned_salesman_id) return null;
    return salesmen.find((s) => s.id === currentRawCustomer.assigned_salesman_id) || null;
  }, [salesmen, currentRawCustomer]);

  // Filter dropdown list based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return summaries;
    const q = searchQuery.toLowerCase().trim();
    return summaries.filter(
      (c) =>
        c.customer_name.toLowerCase().includes(q) ||
        (c.customer_code && c.customer_code.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  }, [summaries, searchQuery]);

  // Filtered ledger entries based on tab
  const filteredLedger = useMemo(() => {
    if (activeLedgerTab === "all") return ledgerEntries;
    return ledgerEntries.filter((e) => e.source === activeLedgerTab);
  }, [ledgerEntries, activeLedgerTab]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsDropdownOpen(false);
    if (onSelectCustomer) onSelectCustomer(id);
  };

  const creditUtilization = useMemo(() => {
    if (!currentSummary || currentSummary.credit_limit <= 0) return null;
    const util = (currentSummary.total_balance / currentSummary.credit_limit) * 100;
    return Math.min(Math.max(util, 0), 100);
  }, [currentSummary]);

  return (
    <div
      data-component="CustomerFinancialInspector"
      className={`bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6 space-y-6 ${className}`}
    >
      {/* ── TOP BAR: Header + Customer Selector Dropdown ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-brand/10 text-teal-brand flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#0B1C30]">
              Customer Financial Inspector &amp; Ledger
            </h3>
          </div>
          <p className="text-xs text-[#6E7977] mt-0.5">
            Real-time balance computation: Opening Balance + Total Debits &minus; Total Credits
          </p>
        </div>

        {/* CUSTOMER SEARCHABLE DROPDOWN SELECTOR */}
        <div className="relative w-full md:w-80">
          <label className="text-[11px] font-bold text-[#6E7977] uppercase tracking-wider block mb-1">
            Select Customer
          </label>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full h-11 px-3.5 rounded-xl border border-[#BDC9C6] bg-[#EFF4FF]/40 hover:bg-[#EFF4FF]/80 focus:border-teal-brand focus:ring-2 focus:ring-teal-brand/20 transition-all flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 truncate min-w-0">
              <div className="w-6 h-6 rounded-full bg-teal-brand text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                {currentSummary?.customer_name ? currentSummary.customer_name.slice(0, 1).toUpperCase() : "C"}
              </div>
              <span className="font-bold text-sm text-[#0B1C30] truncate">
                {currentSummary?.customer_name || "Select Customer..."}
              </span>
              {currentSummary?.city && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-[#4A5568] shrink-0 font-medium">
                  {currentSummary.city}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-[#6E7977] transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* DROPDOWN MENU */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-full sm:w-96 max-h-80 bg-white rounded-xl shadow-2xl border border-[#CBD5E1] z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                {/* Search Header */}
                <div className="p-2.5 border-b border-[#E2E8F0] bg-slate-50 flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#6E7977] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search customer, code, city, phone..."
                    className="w-full bg-transparent text-xs font-medium text-[#0B1C30] outline-none placeholder:text-slate-400"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-slate-400 hover:text-slate-600 px-1"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* Options List */}
                <div className="overflow-y-auto max-h-60 divide-y divide-slate-100">
                  {filteredCustomers.map((c) => {
                    const isSelected = c.customer_id === selectedId;
                    return (
                      <button
                        key={c.customer_id}
                        type="button"
                        onClick={() => handleSelect(c.customer_id)}
                        className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-[#EFF4FF] transition-colors cursor-pointer ${
                          isSelected ? "bg-teal-brand/10" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-[#0B1C30] truncate">
                              {c.customer_name}
                            </span>
                            {c.customer_code && (
                              <span className="text-[10px] text-[#6E7977]">({c.customer_code})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-[#6E7977] mt-0.5">
                            {c.city && <span>📍 {c.city}</span>}
                            {c.phone && <span>📞 {c.phone}</span>}
                          </div>
                        </div>

                        {/* Balance Badge Preview */}
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-mono font-bold block ${
                              c.total_balance >= 0 ? "text-[#0B1C30]" : "text-emerald-700"
                            }`}
                          >
                            ₹{Math.abs(c.total_balance).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-[#6E7977]">
                            {c.total_balance >= 0 ? "Dr (Bal)" : "Cr (Adv)"}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {filteredCustomers.length === 0 && (
                    <div className="p-4 text-center text-xs text-[#6E7977]">
                      No customers match &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {currentSummary ? (
        <div className="space-y-6">
          {/* ── SECTION 1: CUSTOMER PROFILE INFO CARD ── */}
          <div className="bg-[#F8F9FF] border border-[#E2E8F0] rounded-xl p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Customer Title & Status */}
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-teal-brand text-white text-lg font-bold flex items-center justify-center shrink-0 shadow-xs">
                  {currentSummary.customer_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-[#0B1C30]">
                      {currentSummary.customer_name}
                    </h4>
                    {currentSummary.customer_code && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1] text-[#4A5568] font-mono text-xs font-semibold">
                        {currentSummary.customer_code}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        currentSummary.is_active
                          ? "bg-teal-brand/15 text-teal-brand"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {currentSummary.is_active ? "Active Account" : "Inactive Account"}
                    </span>
                  </div>

                  <p className="text-xs text-[#6E7977] mt-1 flex items-center gap-3 flex-wrap">
                    {currentSummary.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {currentSummary.city}
                        {currentSummary.state ? `, ${currentSummary.state}` : ""}
                        {currentSummary.pincode ? ` - ${currentSummary.pincode}` : ""}
                      </span>
                    )}
                    {currentSummary.address && (
                      <span className="text-slate-400 font-normal">({currentSummary.address})</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Contact & Salesman Badges */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {currentSummary.phone && (
                  <a
                    href={`tel:${currentSummary.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0B1C30] hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-teal-brand" />
                    {currentSummary.phone}
                  </a>
                )}
                {currentSummary.email && (
                  <a
                    href={`mailto:${currentSummary.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0B1C30] hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#0051D5]" />
                    {currentSummary.email}
                  </a>
                )}
                {currentSummary.gstin && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-mono font-semibold text-[#4A5568] shadow-2xs">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    GST: {currentSummary.gstin}
                  </span>
                )}
                {assignedSalesman && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0B1C30] shadow-2xs">
                    <User className="w-3.5 h-3.5 text-teal-brand" />
                    Salesman: {assignedSalesman.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 2: 4-CARD FINANCIAL BREAKDOWN BENTO ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* CARD 1: OPENING BALANCE */}
            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#6E7977] uppercase tracking-wider">
                  1. Opening Balance
                </span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-[#0B1C30] font-mono">
                  {formatINR(currentSummary.opening_balance)}
                </p>
                <p className="text-[11px] text-[#6E7977] mt-0.5 font-medium">
                  Initial recorded balance
                </p>
              </div>
            </div>

            {/* CARD 2: TOTAL DEBIT (+) */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  2. Total Debit (+)
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-700 font-mono">
                  +{formatINR(currentSummary.total_debit)}
                </p>
                <p className="text-[11px] text-emerald-800/80 mt-0.5 font-medium">
                  {currentSummary.daybook_debit > 0
                    ? `Day Book: ${formatINR(currentSummary.daybook_debit)}`
                    : "Invoices &amp; Inflows"}
                </p>
              </div>
            </div>

            {/* CARD 3: TOTAL CREDIT (-) */}
            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                  3. Total Credit (&minus;)
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-amber-800 font-mono">
                  &minus;{formatINR(currentSummary.total_credit)}
                </p>
                <p className="text-[11px] text-amber-900/80 mt-0.5 font-medium">
                  {currentSummary.daybook_credit > 0
                    ? `Day Book: ${formatINR(currentSummary.daybook_credit)}`
                    : "Collections &amp; Payments"}
                </p>
              </div>
            </div>

            {/* CARD 4: TOTAL / NET BALANCE (HERO CARD) */}
            <div className="bg-gradient-to-br from-[#0051D5] to-[#1B2CC1] text-white p-4 rounded-xl shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
                  Total Net Balance
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-xs">
                  {currentSummary.total_balance >= 0 ? "Dr (Receivable)" : "Cr (Advance)"}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight font-mono">
                  {formatINR(Math.abs(currentSummary.total_balance))}
                </p>
                <p className="text-[11px] text-blue-100/90 mt-0.5 font-medium">
                  = Op. Bal ({formatINR(currentSummary.opening_balance)}) + Debit &minus; Credit
                </p>
              </div>
            </div>
          </div>

          {/* Credit Limit Indicator if configured */}
          {currentSummary.credit_limit > 0 && (
            <div className="p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-[#0B1C30]">Credit Limit:</span>
                <span className="text-xs font-mono font-bold text-[#0B1C30]">
                  {formatINR(currentSummary.credit_limit)}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (creditUtilization ?? 0) > 90
                        ? "bg-red-600"
                        : (creditUtilization ?? 0) > 75
                        ? "bg-amber-500"
                        : "bg-teal-brand"
                    }`}
                    style={{ width: `${creditUtilization ?? 0}%` }}
                  />
                </div>
                <span className="text-xs font-bold font-mono text-[#4A5568] shrink-0">
                  {creditUtilization?.toFixed(0)}% Utilized
                </span>
              </div>
            </div>
          )}

          {/* ── SECTION 3: TRANSACTION LEDGER DETAILS ── */}
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-2xs">
            {/* Table Filter Tabs */}
            <div className="px-4 py-3 bg-[#F8F9FF] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-brand" />
                <span className="text-xs font-bold text-[#0B1C30]">
                  Customer Transaction Ledger
                </span>
                <span className="text-[11px] font-semibold text-[#6E7977]">
                  ({filteredLedger.length} entries)
                </span>
              </div>

              {/* Source Tabs */}
              <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab("all")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    activeLedgerTab === "all"
                      ? "bg-white text-[#0B1C30] shadow-2xs"
                      : "text-[#6E7977] hover:text-[#0B1C30]"
                  }`}
                >
                  All Sources
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab("day_book")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    activeLedgerTab === "day_book"
                      ? "bg-white text-teal-brand shadow-2xs"
                      : "text-[#6E7977] hover:text-[#0B1C30]"
                  }`}
                >
                  Day Book
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab("invoice")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    activeLedgerTab === "invoice"
                      ? "bg-white text-[#0051D5] shadow-2xs"
                      : "text-[#6E7977] hover:text-[#0B1C30]"
                  }`}
                >
                  Invoices
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab("payment")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    activeLedgerTab === "payment"
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "text-[#6E7977] hover:text-[#0B1C30]"
                  }`}
                >
                  Collections
                </button>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#EEF5FF] text-[#4A5568] border-b border-[#E2E8F0] sticky top-0 z-10 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5">Date</th>
                    <th className="py-2.5 px-3">Voucher / Ref #</th>
                    <th className="py-2.5 px-3">Particulars / Source</th>
                    <th className="py-2.5 px-3 text-right">Debit (+)</th>
                    <th className="py-2.5 px-3 text-right">Credit (&minus;)</th>
                    <th className="py-2.5 px-3.5 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {/* Row 0: Opening balance indicator row */}
                  <tr className="bg-slate-50/70 font-semibold text-[#4A5568]">
                    <td className="py-2.5 px-3.5 text-[11px]">—</td>
                    <td className="py-2.5 px-3 text-[11px] font-mono">OP-BAL</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600">
                      Opening Balance Recorded
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {currentSummary.opening_balance > 0 ? formatINR(currentSummary.opening_balance) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {currentSummary.opening_balance < 0 ? formatINR(Math.abs(currentSummary.opening_balance)) : "—"}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#0B1C30]">
                      {formatINR(currentSummary.opening_balance)}
                    </td>
                  </tr>

                  {filteredLedger.map((entry, idx) => (
                    <tr key={entry.entry_id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-3.5 font-medium text-[#0B1C30] whitespace-nowrap">
                        {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#4A5568]">
                        {entry.voucher_no}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[#0B1C30] max-w-45 truncate">
                            {entry.particulars}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold shrink-0 ${
                              entry.source === "day_book"
                                ? "bg-teal-brand/10 text-teal-brand"
                                : entry.source === "invoice"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {entry.source.replace("_", " ")}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700 font-mono">
                        {entry.debit > 0 ? formatINR(entry.debit) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-amber-800 font-mono">
                        {entry.credit > 0 ? formatINR(entry.credit) : "—"}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-[#0B1C30] font-mono">
                        {entry.balance !== null ? formatINR(entry.balance) : "—"}
                      </td>
                    </tr>
                  ))}

                  {filteredLedger.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[#6E7977]">
                        {isLoadingLedger ? (
                          <div className="flex items-center justify-center gap-2">
                            <Spinner className="w-4 h-4 text-teal-brand" />
                            <span>Loading customer transaction records...</span>
                          </div>
                        ) : (
                          "No transaction records found for this customer."
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 font-medium text-xs">
          {isLoadingSummaries ? (
            <div className="flex flex-col items-center justify-center gap-2">
              <Spinner className="w-6 h-6 text-teal-brand" />
              <span>Loading customer financial summaries...</span>
            </div>
          ) : (
            "No customers available."
          )}
        </div>
      )}
    </div>
  );
};
