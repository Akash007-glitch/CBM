"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  UserX,
  AlertCircle,
  Eye,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useDashboardStore } from "@/store/dashboardStore";
import {
  getCustomerFinancialSummaries,
  type CustomerRow,
  type CustomerFinancialSummary,
} from "@/lib/services/customerService";
import type { PaymentRow } from "@/lib/services/paymentService";
import type { InvoiceRow } from "@/lib/services/invoiceService";
import { Spinner } from "@/components/ui/Spinner";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Add New Customer Modal ────────────────────────────────────────────────────

export const AddCustomerModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const addCustomer = useDashboardStore((s) => s.addCustomer);
  const salesmen = useDashboardStore((s) => s.salesmen);

  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [assignedSalesman, setAssignedSalesman] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Synchronous submission lock to prevent double/triple click race conditions
  const isSubmittingRef = useRef(false);

  if (!isOpen) return null;

  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setErrorToast("Please enter a company or customer name.");
      return;
    }
    setErrorToast("");
    setIsConfirmOpen(true);
  };

  const handleFinalCreate = async () => {
    // Immediate synchronous lock: prevents duplicate network requests
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorToast("");

    const nameToUse = companyName.trim();
    const openBal = parseFloat(openingBalance) || 0;
    const creditLim = parseFloat(creditLimit) || 0;
    const salesmanId = assignedSalesman || undefined;

    try {
      await addCustomer({
        name: nameToUse,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: streetAddress.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: zip.trim() || null,
        assigned_salesman_id: salesmanId ?? null,
        credit_limit: creditLim,
        opening_balance: openBal,
        is_active: true,
      });

      setSuccessToast(`Customer "${nameToUse}" created successfully!`);
      setIsConfirmOpen(false);

      setTimeout(() => {
        setCompanyName(""); setContactPerson(""); setPhone(""); setEmail("");
        setStreetAddress(""); setCity(""); setState(""); setZip("");
        setAssignedSalesman(""); setCreditLimit(""); setOpeningBalance("");
        setSuccessToast("");
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        onClose();
      }, 1200);
    } catch (err) {
      setErrorToast(err instanceof Error ? err.message : "Failed to create customer.");
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div data-component="AddCustomerModal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1C30]/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[#E2E8F0] animate-in fade-in zoom-in duration-200">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8F9FF]">
          <h2 className="text-xl font-bold text-[#0B1C30]">Add New Customer</h2>
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#3E4947] hover:bg-[#E5EEFF] transition-colors cursor-pointer disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Error Toasts */}
        {successToast && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}
        {errorToast && !isConfirmOpen && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>{errorToast}</span>
          </div>
        )}

        {/* Modal Body */}
        <form id="add-customer-form" onSubmit={handleOpenConfirmation} className="p-6 overflow-y-auto flex flex-col gap-6 text-sm">

          {/* BASIC INFORMATION */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-teal-brand uppercase tracking-widest">BASIC INFORMATION</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Company Name *</label>
                <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-[#0B1C30] outline-none font-medium" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Contact Person</label>
                <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Full Name"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-[#0B1C30] outline-none font-medium" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-[#0B1C30] outline-none font-medium" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="billing@company.com"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-[#0B1C30] outline-none font-medium" />
              </div>
            </div>
          </section>

          {/* ADDRESS */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-teal-brand uppercase tracking-widest">ADDRESS</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Street Address</label>
                <input type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="123 Business Way"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-[#0B1C30] outline-none font-medium" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#3E4947]">City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-[#0B1C30] outline-none font-medium" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#3E4947]">State</label>
                  <input type="text" value={state} onChange={(e) => setState(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-[#0B1C30] outline-none font-medium" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#3E4947]">ZIP/Pincode</label>
                  <input type="text" value={zip} onChange={(e) => setZip(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-[#0B1C30] outline-none font-medium" />
                </div>
              </div>
            </div>
          </section>

          {/* ASSIGNMENT & FINANCIALS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-teal-brand uppercase tracking-widest">FINANCIALS</h3>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Credit Limit (₹)</label>
                <input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="₹ 0.00"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-[#0B1C30] outline-none font-medium font-mono" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Opening Balance (₹)</label>
                <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="₹ 0.00"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-[#0B1C30] outline-none font-medium font-mono" />
              </div>
            </div>
          </section>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8F9FF] flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="h-10 px-6 rounded-lg border border-[#BDC9C6] text-[#0B1C30] font-semibold text-sm hover:bg-[#E5EEFF] transition-colors cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" form="add-customer-form" disabled={isSubmitting}
            className="h-10 px-6 rounded-lg bg-teal-brand text-white font-semibold text-sm hover:bg-teal-brand/90 transition-opacity shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed">
            <span>Review &amp; Create</span>
          </button>
        </div>

        {/* Confirmation Modal Overlay */}
        {isConfirmOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-teal-brand">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0B1C30] leading-tight">Confirm New Customer</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Please review details before creating account</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsConfirmOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error Toast inside Confirmation */}
              {errorToast && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorToast}</span>
                </div>
              )}

              {/* Breakdown Summary Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Company Name</span>
                  <span className="font-bold text-slate-900">{companyName.trim()}</span>
                </div>

                {contactPerson.trim() && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Contact Person</span>
                    <span className="font-medium text-slate-900">{contactPerson.trim()}</span>
                  </div>
                )}

                {(phone.trim() || email.trim()) && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Contact</span>
                    <span className="font-medium text-slate-800">{phone.trim() || email.trim()}</span>
                  </div>
                )}

                {(city.trim() || state.trim()) && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Location</span>
                    <span className="font-medium text-slate-800">{[city.trim(), state.trim()].filter(Boolean).join(", ")}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Opening Balance</span>
                  <span className="font-bold text-slate-900">
                    ₹{parseFloat(openingBalance || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Credit Limit</span>
                  <span className="font-bold text-teal-brand">
                    ₹{parseFloat(creditLimit || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Alert notice */}
              <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-teal-brand shrink-0" />
                <span>Are you sure you want to add this customer? A ledger record will be initialized.</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsConfirmOpen(false)}
                  className="flex-1 h-11 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalCreate}
                  className="flex-[1.5] h-11 bg-teal-brand text-white rounded-xl text-xs font-bold hover:bg-teal-brand/90 shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="w-4 h-4 text-white" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Confirm &amp; Create</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import { ImportDayBookModal } from "@/components/dashboard/ImportDayBookModal";
import { CustomerFinancialInspector } from "@/components/dashboard/CustomerFinancialInspector";
import { AdminLogPaymentModal } from "@/components/dashboard/AdminLogPaymentModal";
import { getPaymentAllocations, type AllocationRow } from "@/lib/services/paymentService";
import {
  Wallet,
  CreditCard,
  Printer,
  Copy,
  Check,
  Receipt,
  Filter,
  Calendar,
  TrendingUp,
  Banknote,
  FileText,
  ExternalLink,
} from "lucide-react";

export { ImportDayBookModal, CustomerFinancialInspector, AdminLogPaymentModal };
export const QuickAddModal: React.FC<ModalProps> = (props) => <ImportDayBookModal {...props} />;

// ── Sub-Pages Views ───────────────────────────────────────────────────────────

export const CustomersView: React.FC<{ onOpenAddCustomer: () => void }> = ({ onOpenAddCustomer }) => {
  const customers = useDashboardStore((s) => s.customers);
  const deleteCustomer = useDashboardStore((s) => s.deleteCustomer);
  const deactivateCustomer = useDashboardStore((s) => s.deactivateCustomer);

  const [selectedCustomerIdForInspector, setSelectedCustomerIdForInspector] = useState<string>("");
  const [financialSummaries, setFinancialSummaries] = useState<CustomerFinancialSummary[]>([]);
  const [tableSearch, setTableSearch] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<CustomerRow | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [canFallbackDeactivate, setCanFallbackDeactivate] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const inspectorRef = React.useRef<HTMLDivElement>(null);

  // Load financial summaries whenever customers change
  useEffect(() => {
    let isMounted = true;
    getCustomerFinancialSummaries()
      .then((data) => {
        if (isMounted) setFinancialSummaries(data);
      })
      .catch((err) => console.warn("Failed to load customer financial summaries in table:", err));

    return () => {
      isMounted = false;
    };
  }, [customers]);

  const summaryMap = useMemo(() => {
    const map = new Map<string, CustomerFinancialSummary>();
    financialSummaries.forEach((s) => map.set(s.customer_id, s));
    return map;
  }, [financialSummaries]);

  const filteredCustomers = useMemo(() => {
    const validCustomers = customers.filter(
      (c) =>
        c.name.trim().toUpperCase() !== "CASH" &&
        !/^CASH(\s+(A\/C|ACCOUNT|IN\s+HAND))?$/i.test(c.name.trim())
    );
    if (!tableSearch.trim()) return validCustomers;
    const q = tableSearch.toLowerCase().trim();
    return validCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.customer_code && c.customer_code.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, tableSearch]);

  const handleInspectCustomer = (customerId: string) => {
    setSelectedCustomerIdForInspector(customerId);
    if (inspectorRef.current) {
      inspectorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setIsProcessing(true);
    setDeleteError(null);
    setCanFallbackDeactivate(false);

    try {
      await deleteCustomer(customerToDelete.id);
      setToastMsg(`Customer "${customerToDelete.name}" removed successfully.`);
      setCustomerToDelete(null);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete customer.";
      // Check if it's a foreign key constraint violation
      if (
        msg.toLowerCase().includes("foreign key") ||
        msg.toLowerCase().includes("violates") ||
        msg.toLowerCase().includes("reference")
      ) {
        setDeleteError(
          "Cannot permanently delete this customer because they have existing invoices or payment transactions linked to them."
        );
        setCanFallbackDeactivate(true);
      } else {
        setDeleteError(msg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeactivate = async () => {
    if (!customerToDelete) return;
    setIsProcessing(true);
    setDeleteError(null);

    try {
      await deactivateCustomer(customerToDelete.id);
      setToastMsg(`Customer "${customerToDelete.name}" marked as Inactive.`);
      setCustomerToDelete(null);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to deactivate customer.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div data-component="CustomersView" className="space-y-8 max-w-360 mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── 1. CUSTOMER FINANCIAL INSPECTOR WITH DROPDOWN ── */}
      <div ref={inspectorRef}>
        <CustomerFinancialInspector
          selectedCustomerId={selectedCustomerIdForInspector}
          onSelectCustomer={setSelectedCustomerIdForInspector}
        />
      </div>

      {/* ── 2. CUSTOMER DIRECTORY DIRECT TABLE ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#0B1C30]">Customer Financial Directory</h2>
            <p className="text-xs text-[#3E4947]">
              Complete breakdown of Opening Balances, Debits, Credits, and Net Balances across all accounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search directory..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#BDC9C6] rounded-lg text-[#0B1C30] placeholder-slate-400 focus:outline-none focus:border-teal-brand"
              />
            </div>

            {/* Add Customer Trigger */}
            <button
              onClick={onOpenAddCustomer}
              className="bg-teal-brand text-white px-3.5 h-9 rounded-lg text-xs font-semibold hover:bg-teal-brand/90 transition-colors shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Financial Table */}
        <div className="bg-white rounded-[14px] border border-[#E2E8F0] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FF] border-b border-[#E2E8F0] text-[#3E4947] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">City</th>
                  <th className="p-3.5 text-right">Opening Bal</th>
                  <th className="p-3.5 text-right text-rose-600">Total Debits</th>
                  <th className="p-3.5 text-right text-emerald-600">Total Credits</th>
                  <th className="p-3.5 text-right">Net Balance</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredCustomers.map((c) => {
                  const summary = summaryMap.get(c.id);
                  const opening = summary ? summary.opening_balance : Number(c.opening_balance || 0);
                  const debits = summary ? summary.total_debit : 0;
                  const credits = summary ? summary.total_credit : 0;
                  const netBalance = summary ? summary.total_balance : opening;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleInspectCustomer(c.id)}
                      className={`hover:bg-[#F0F5FF] cursor-pointer transition-colors ${selectedCustomerIdForInspector === c.id ? "bg-[#EFF4FF] font-medium" : ""
                        }`}
                    >
                      <td className="p-3.5 font-bold text-[#0B1C30] flex items-center gap-2">
                        <span>{c.name}</span>
                        {selectedCustomerIdForInspector === c.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-brand shrink-0 animate-pulse" />
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{c.customer_code || "—"}</td>
                      <td className="p-3.5 text-[#3E4947]">{c.city || "—"}</td>
                      <td className="p-3.5 text-right font-mono text-slate-600">
                        ₹{opening.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-rose-600">
                        ₹{debits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-emerald-600">
                        ₹{credits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold">
                        <span className={netBalance > 0 ? "text-rose-700" : "text-emerald-700"}>
                          ₹{netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleInspectCustomer(c.id)}
                            title="Inspect Financial Ledger"
                            className="p-1 text-teal-brand hover:bg-[#E5EEFF] rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCustomerToDelete(c)}
                            title="Delete Customer"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No customers found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 3. DELETE / DEACTIVATE CONFIRMATION MODAL ── */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 pb-2 border-b border-slate-100">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove Customer Account</h3>
                <p className="text-xs text-slate-500">Confirm deletion or deactivation</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Cannot Delete Permanently</span>
                </div>
                <p>{deleteError}</p>
                {canFallbackDeactivate && (
                  <p className="font-medium text-slate-700 pt-1">
                    Would you like to <strong>deactivate</strong> this customer instead? Their records will be preserved for financial auditing.
                  </p>
                )}
              </div>
            )}

            {!deleteError && (
              <div className="space-y-2 text-xs text-slate-600">
                <p>
                  Are you sure you want to delete <strong>{customerToDelete.name}</strong>?
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
                  <div>Code: {customerToDelete.customer_code || "—"}</div>
                  <div>City: {customerToDelete.city || "—"}</div>
                  <div>Opening Balance: ₹{Number(customerToDelete.opening_balance || 0).toLocaleString("en-IN")}</div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setCustomerToDelete(null);
                  setDeleteError(null);
                  setCanFallbackDeactivate(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {canFallbackDeactivate ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleDeactivate}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isProcessing ? <Spinner className="w-3.5 h-3.5 text-white" /> : <UserX className="w-3.5 h-3.5" />}
                  <span>Deactivate Customer</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isProcessing ? <Spinner className="w-3.5 h-3.5 text-white" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SalesmenView: React.FC = () => {
  const salesmen = useDashboardStore((s) => s.salesmen);
  const customers = useDashboardStore((s) => s.customers);

  return (
    <div data-component="SalesmenView" className="space-y-6 max-w-360 mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-[#0B1C30]">Sales Team Overview</h2>
        <p className="text-sm text-[#3E4947]">Directory and customer allocations for your on-field team</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {salesmen.map((sm) => {
          const assignedCount = customers.filter((c) => c.assigned_salesman_id === sm.id).length;
          return (
            <div key={sm.id} className="bg-white rounded-[14px] border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-[#EFF4FF] text-teal-brand rounded">
                    {sm.employee_code || sm.id.slice(0, 8)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${sm.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {sm.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#0B1C30] mt-3">{sm.profiles?.full_name || sm.name}</h3>
                <div className="text-xs text-[#3E4947] mt-1 space-y-0.5">
                  <p>{sm.email || sm.profiles?.email || "No email provided"}</p>
                  <p>{sm.phone || "No phone provided"}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="text-[#3E4947] font-medium">Assigned Accounts</span>
                <span className="font-bold text-teal-brand bg-[#EFF4FF] px-2.5 py-1 rounded-full">{assignedCount} Customers</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CollectionsView: React.FC<{
  onOpenLogPayment?: () => void;
  onOpenQuickAdd?: () => void;
}> = ({ onOpenLogPayment, onOpenQuickAdd }) => {
  const payments = useDashboardStore((s) => s.payments);
  const customers = useDashboardStore((s) => s.customers);
  const salesmen = useDashboardStore((s) => s.salesmen);
  const invoices = useDashboardStore((s) => s.invoices);

  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Receipt Modal State
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRow | null>(null);
  const [receiptAllocations, setReceiptAllocations] = useState<AllocationRow[]>([]);
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Handle clicking + Log Payment
  const handleOpenLogModal = () => {
    if (onOpenLogPayment) {
      onOpenLogPayment();
    } else if (onOpenQuickAdd) {
      onOpenQuickAdd();
    }
  };

  // Inspect receipt and fetch allocations
  const handleInspectReceipt = async (payment: PaymentRow) => {
    setSelectedPaymentForReceipt(payment);
    setIsLoadingAllocations(true);
    try {
      const data = await getPaymentAllocations(payment.id);
      setReceiptAllocations(data);
    } catch (err) {
      console.warn("Could not fetch payment allocations:", err);
      setReceiptAllocations([]);
    } finally {
      setIsLoadingAllocations(false);
    }
  };

  // KPI calculations
  const todayStr = new Date().toISOString().split("T")[0];
  const thisMonthStr = new Date().toISOString().slice(0, 7);

  const totalCollections = useMemo(() => {
    return payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [payments]);

  const todayCollections = useMemo(() => {
    return payments
      .filter((p) => p.payment_date && p.payment_date.startsWith(todayStr))
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [payments, todayStr]);

  const monthCollections = useMemo(() => {
    return payments
      .filter((p) => p.payment_date && p.payment_date.startsWith(thisMonthStr))
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [payments, thisMonthStr]);

  const cashCollections = useMemo(() => {
    return payments
      .filter((p) => p.payment_method === "cash")
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [payments]);

  const digitalCollections = totalCollections - cashCollections;

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const cust = customers.find((c) => c.id === p.customer_id);
      const sm = salesmen.find((s) => s.id === p.salesman_id);
      const custName = cust?.name || "";
      const smName = sm?.name || "";
      const payNo = p.payment_number || p.id;
      const refNo = p.reference_number || "";

      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matches =
          custName.toLowerCase().includes(q) ||
          smName.toLowerCase().includes(q) ||
          payNo.toLowerCase().includes(q) ||
          refNo.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Method filter
      if (methodFilter !== "all" && p.payment_method !== methodFilter) {
        return false;
      }

      // Date filter
      if (dateFilter === "today" && !p.payment_date.startsWith(todayStr)) {
        return false;
      }
      if (dateFilter === "month" && !p.payment_date.startsWith(thisMonthStr)) {
        return false;
      }

      return true;
    });
  }, [payments, customers, salesmen, searchTerm, methodFilter, dateFilter, todayStr, thisMonthStr]);

  const filteredTotalAmount = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [filteredPayments]);

  const getMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case "upi":
        return {
          bg: "bg-indigo-50 border-indigo-200 text-indigo-700",
          icon: "",
          label: "UPI",
        };
      case "bank_transfer":
        return {
          bg: "bg-blue-50 border-blue-200 text-blue-700",
          icon: "",
          label: "Bank Transfer",
        };
      case "cash":
        return {
          bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
          icon: "",
          label: "Cash",
        };
      case "cheque":
        return {
          bg: "bg-amber-50 border-amber-200 text-amber-700",
          icon: "",
          label: "Cheque",
        };
      default:
        return {
          bg: "bg-slate-100 border-slate-200 text-slate-700",
          icon: "",
          label: method.replace("_", " "),
        };
    }
  };

  const handleCopyReceiptText = () => {
    if (!selectedPaymentForReceipt) return;
    const cust = customers.find((c) => c.id === selectedPaymentForReceipt.customer_id);
    const sm = salesmen.find((s) => s.id === selectedPaymentForReceipt.salesman_id);
    const smName = sm?.profiles?.full_name || sm?.name || "Admin / Direct";
    const text = `
========================================
SUBH ENTERPRISE - PAYMENT RECEIPT
========================================
Receipt #    : ${selectedPaymentForReceipt.payment_number || selectedPaymentForReceipt.id.slice(0, 8)}
Date         : ${new Date(selectedPaymentForReceipt.payment_date).toLocaleDateString("en-IN")}
Customer     : ${cust?.name || "Customer"}
Salesman     : ${smName}
Amount Paid  : ₹${Number(selectedPaymentForReceipt.amount).toLocaleString("en-IN")}
Payment Mode : ${selectedPaymentForReceipt.payment_method.toUpperCase()}
Reference #  : ${selectedPaymentForReceipt.reference_number || "N/A"}
========================================
`.trim();

    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  return (
    <div data-component="CollectionsView" className="space-y-6 max-w-360 mx-auto">
      {/* Header with Title and Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1C30] tracking-tight">
            Collections &amp; Payments Log
          </h2>
          <p className="text-sm text-[#3E4947] mt-1">
            Real-time ledger of payments received, payment methods, and invoice allocations
          </p>
        </div>
        <button
          onClick={handleOpenLogModal}
          className="h-11 px-5 bg-teal-brand text-white text-sm font-bold rounded-xl shadow-xs hover:bg-teal-brand/90 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Log Payment</span>
        </button>
      </div>

      {/* ── KPI Bento Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
              Total Collections
            </span>
            <div className="p-1.5 rounded-lg bg-[#E5EEFF] text-teal-brand">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0B1C30] mt-3 font-mono">
            ₹{totalCollections.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {payments.length} total receipts recorded
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
              Today&apos;s Collections
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-3 font-mono">
            ₹{todayCollections.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-emerald-700 mt-1 font-medium">
            Received today ({new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
              Digital / Cheque
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0B1C30] mt-3 font-mono">
            ₹{digitalCollections.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            UPI, Bank Transfers &amp; Cheques
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
              Cash Collections
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0B1C30] mt-3 font-mono">
            ₹{cashCollections.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Physical cash receipts</div>
        </div>
      </div>

      {/* ── Search and Filters Bar ── */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, payment #, reference #, or collector..."
            className="w-full h-10 pl-10 pr-4 text-xs bg-slate-50 border border-[#BDC9C6] rounded-xl text-[#0B1C30] placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-brand font-medium"
          />
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto">
          {/* Method Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Modes</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {searchTerm || methodFilter !== "all" || dateFilter !== "all" ? (
            <button
              onClick={() => {
                setSearchTerm("");
                setMethodFilter("all");
                setDateFilter("all");
              }}
              className="text-xs font-bold text-teal-brand hover:underline px-2 cursor-pointer shrink-0"
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>

      {/* Filter summary status */}
      {(searchTerm || methodFilter !== "all" || dateFilter !== "all") && (
        <div className="text-xs text-slate-500 px-1 flex items-center justify-between">
          <span>
            Showing <strong>{filteredPayments.length}</strong> matching transaction(s)
          </span>
          <span className="font-mono font-bold text-slate-800">
            Total: ₹{filteredTotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* ── Payments Log Table ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FF] border-b border-[#E2E8F0] text-[#3E4947] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Receipt / Payment #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Collector</th>
                <th className="p-4 text-right">Amount (₹)</th>
                <th className="p-4 text-center">Method</th>
                <th className="p-4">Ref / Cheque #</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredPayments.map((p) => {
                const cust = customers.find((c) => c.id === p.customer_id);
                const sm = salesmen.find((s) => s.id === p.salesman_id);
                const custName =
                  cust?.name ??
                  (p as PaymentRow & { customers?: { name: string } | null }).customers?.name ??
                  "Unknown Customer";
                const smName =
                  sm?.profiles?.full_name ??
                  sm?.name ??
                  (p as PaymentRow & { salesmen?: { name: string } | null }).salesmen?.name ??
                  "Admin / Direct";
                const badge = getMethodBadge(p.payment_method);

                return (
                  <tr
                    key={p.id}
                    onClick={() => handleInspectReceipt(p)}
                    className="hover:bg-[#F8F9FF] cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-mono font-bold text-slate-800">
                      <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                        {p.payment_number ?? p.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#0B1C30] text-sm">{custName}</div>
                      {cust?.customer_code && (
                        <div className="text-[11px] font-mono text-slate-400">
                          {cust.customer_code}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{smName}</td>
                    <td className="p-4 text-right font-mono font-black text-emerald-700 text-sm">
                      ₹{Number(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border shadow-2xs ${badge.bg}`}
                      >
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      {p.reference_number || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-4 text-slate-600">
                      {new Date(p.payment_date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspectReceipt(p);
                        }}
                        className="p-1.5 text-teal-brand hover:bg-[#E5EEFF] rounded-lg transition-colors cursor-pointer"
                        title="View Official Receipt Voucher"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500 font-medium">
                    {payments.length === 0
                      ? "No payment collections logged yet. Click '+ Log Payment' above to record the first entry."
                      : "No payments match your current search and filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PAYMENT RECEIPT INSPECTOR MODAL ── */}
      {selectedPaymentForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-brand text-white flex items-center justify-center shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B1C30]">Payment Receipt Voucher</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedPaymentForReceipt.payment_number || selectedPaymentForReceipt.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentForReceipt(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 text-xs pr-1">
              {/* Amount hero */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase">
                    Amount Received
                  </span>
                  <div className="text-2xl font-black text-emerald-700 font-mono mt-0.5">
                    ₹
                    {Number(selectedPaymentForReceipt.amount).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded bg-white border border-emerald-300 text-emerald-800 text-xs font-bold uppercase font-mono shadow-2xs">
                    {selectedPaymentForReceipt.payment_method.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Customer and Collector details */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Customer</span>
                  <span className="font-bold text-slate-900">
                    {customers.find((c) => c.id === selectedPaymentForReceipt.customer_id)?.name ||
                      "Customer"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Collector / Salesman</span>
                  <span className="font-medium text-slate-800">
                    {(() => {
                      const sm = salesmen.find((s) => s.id === selectedPaymentForReceipt.salesman_id);
                      return sm?.profiles?.full_name || sm?.name || "Admin / Direct";
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Payment Date</span>
                  <span className="font-mono text-slate-800">
                    {new Date(selectedPaymentForReceipt.payment_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {selectedPaymentForReceipt.reference_number && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Reference / UTR</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedPaymentForReceipt.reference_number}
                    </span>
                  </div>
                )}
                {selectedPaymentForReceipt.notes && (
                  <div className="flex justify-between items-start pt-1 border-t border-slate-200">
                    <span className="text-slate-500 font-semibold">Notes</span>
                    <span className="text-slate-700 text-right max-w-xs">
                      {selectedPaymentForReceipt.notes}
                    </span>
                  </div>
                )}
              </div>

              {/* Allocations breakdown if any */}
              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Invoice Allocations
                </span>
                {isLoadingAllocations ? (
                  <div className="p-4 text-center bg-slate-50 rounded-lg">
                    <Spinner className="w-4 h-4 text-teal-brand mx-auto" />
                  </div>
                ) : receiptAllocations.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px]">
                        <tr>
                          <th className="p-2">Invoice ID / #</th>
                          <th className="p-2 text-right">Allocated (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {receiptAllocations.map((a) => {
                          const matchedInv = invoices.find((inv) => inv.id === a.invoice_id);
                          return (
                            <tr key={a.id}>
                              <td className="p-2 font-mono text-slate-800">
                                {matchedInv?.invoice_number || a.invoice_id.slice(0, 8)}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-teal-brand">
                                ₹
                                {Number(a.allocated_amount).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
                    No specific invoice allocations recorded (direct ledger collection credit).
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center gap-2">
              <button
                type="button"
                onClick={handleCopyReceiptText}
                className="h-10 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copiedReceipt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentForReceipt(null)}
                className="h-10 px-6 rounded-xl bg-teal-brand text-white text-xs font-bold hover:bg-teal-brand/90 transition-opacity cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export const OutstandingView: React.FC = () => {
  const customers = useDashboardStore((s) => s.customers);
  const [summaries, setSummaries] = useState<CustomerFinancialSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getCustomerFinancialSummaries()
      .then((data) => {
        if (isMounted) {
          setSummaries(data);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch customer summaries for OutstandingView:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [customers]);

  // Filter only debtor parties (total_balance > 0, excluding CASH account)
  const debtorParties = useMemo(() => {
    return summaries.filter(
      (c) => c.customer_name.toUpperCase() !== "CASH" && c.total_balance > 0
    );
  }, [summaries]);

  const totalOutstandingAmount = useMemo(() => {
    return debtorParties.reduce((sum, p) => sum + p.total_balance, 0);
  }, [debtorParties]);

  const filteredParties = useMemo(() => {
    if (!search.trim()) return debtorParties;
    const q = search.toLowerCase().trim();
    return debtorParties.filter(
      (p) =>
        p.customer_name.toLowerCase().includes(q) ||
        (p.customer_code && p.customer_code.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q))
    );
  }, [debtorParties, search]);

  return (
    <div data-component="OutstandingView" className="space-y-6 max-w-360 mx-auto">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C30]">Outstanding Party Balances</h2>
          <p className="text-sm text-[#3E4947]">Real-time debit balance across all debtor parties</p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party by name, city..."
            className="w-full pl-9 pr-3 h-10 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-brand shadow-2xs"
          />
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-[#FFDAD6]/15 border border-[#BA1A1A]/30 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-[#BA1A1A] uppercase tracking-wider">
              Total Party Debit Balance
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#BA1A1A] mt-1">
              ₹{totalOutstandingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#FFDAD6]/60 text-[#BA1A1A] flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-[#6E7977] uppercase tracking-wider">
              Parties with Outstanding
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#0B1C30] mt-1">
              {debtorParties.length} Parties
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-brand/10 text-teal-brand flex items-center justify-center font-bold">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table of Debtor Parties */}
      <div className="bg-white rounded-[14px] border border-[#E2E8F0] overflow-hidden shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8F9FF] border-b border-[#E2E8F0] text-[#3E4947] font-semibold uppercase tracking-wider text-xs">
            <tr>
              <th className="p-4">Party Name</th>
              <th className="p-4">Contact / City</th>
              <th className="p-4 text-right">Total Debit (Sales)</th>
              <th className="p-4 text-right">Total Credit (Paid)</th>
              <th className="p-4 text-right">Debit Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                  <Spinner className="w-6 h-6 text-teal-brand mx-auto mb-2" />
                  Calculating live party balances...
                </td>
              </tr>
            ) : filteredParties.length > 0 ? (
              filteredParties.map((p) => (
                <tr key={p.customer_id} className="hover:bg-[#F8F9FF] transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-[#0B1C30]">{p.customer_name}</div>
                    {p.customer_code && (
                      <span className="text-[11px] text-slate-400 font-mono">Code: {p.customer_code}</span>
                    )}
                  </td>
                  <td className="p-4 text-[#3E4947]">
                    <div>{p.city || "—"}</div>
                    {p.phone && <span className="text-xs text-slate-400 font-mono">{p.phone}</span>}
                  </td>
                  <td className="p-4 text-right font-medium text-slate-800">
                    ₹{p.total_debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right font-medium text-slate-600">
                    ₹{p.total_credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-[#FFDAD6]/50 text-[#BA1A1A]">
                      ₹{p.total_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })} Dr
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                  {search ? "No debtor parties match your search." : "No outstanding balances — all parties are settled!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
