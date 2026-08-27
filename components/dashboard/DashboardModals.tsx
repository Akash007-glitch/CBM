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

export { ImportDayBookModal, CustomerFinancialInspector };
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
    if (!tableSearch.trim()) return customers;
    const q = tableSearch.toLowerCase().trim();
    return customers.filter(
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
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0B1C30] outline-none focus:border-teal-brand focus:ring-1 focus:ring-teal-brand font-medium placeholder:text-slate-400"
              />
            </div>

            <button
              onClick={onOpenAddCustomer}
              className="flex items-center gap-1.5 px-3.5 h-9 bg-teal-brand text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-teal-brand/90 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> New Customer
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[14px] border border-[#E2E8F0] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FF] border-b border-[#E2E8F0] text-[#3E4947] font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Contact &amp; Location</th>
                  <th className="py-3.5 px-4 text-right">Op. Balance</th>
                  <th className="py-3.5 px-4 text-right">Total Debit (+)</th>
                  <th className="py-3.5 px-4 text-right">Total Credit (&minus;)</th>
                  <th className="py-3.5 px-4 text-right">Total Balance</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredCustomers.map((c) => {
                  const summary = summaryMap.get(c.id);
                  const opBal = Number(c.opening_balance || 0);
                  const totDebit = summary ? summary.total_debit : 0;
                  const totCredit = summary ? summary.total_credit : 0;
                  const totBalance = summary ? summary.total_balance : opBal;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleInspectCustomer(c.id)}
                      className="hover:bg-[#F8F9FF] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#0B1C30] group-hover:text-teal-brand transition-colors flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {c.customer_code && (
                            <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {c.customer_code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#3E4947]">
                        <span className="text-[11px] block">{c.city ?? "—"}</span>
                        <span className="text-[10px] text-[#6E7977]">{c.phone || c.email || "—"}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-600">
                        ₹{opBal.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                        {totDebit > 0 ? `+₹${totDebit.toLocaleString("en-IN")}` : "₹0.00"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-amber-800">
                        {totCredit > 0 ? `-₹${totCredit.toLocaleString("en-IN")}` : "₹0.00"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0B1C30]">
                        ₹{totBalance.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.is_active ? "bg-teal-brand/10 text-teal-brand" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleInspectCustomer(c.id)}
                            className="p-1.5 rounded-lg text-teal-brand bg-teal-brand/10 hover:bg-teal-brand hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                            title="Inspect Financials & Ledger"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Inspect</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCustomerToDelete(c);
                              setDeleteError(null);
                              setCanFallbackDeactivate(false);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold"
                            title="Remove customer"
                            aria-label={`Remove customer ${c.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                      {customers.length === 0
                        ? "No customers found. Click \"New Customer\" above to add one."
                        : `No customers match "${tableSearch}".`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete / Remove Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1C30]/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#E2E8F0] p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-[#0B1C30]">Remove Customer</h3>
                <p className="text-xs text-[#6E7977] mt-0.5">
                  Are you sure you want to remove <strong className="text-[#0B1C30]">{customerToDelete.name}</strong>?
                </p>
              </div>
              <button
                onClick={() => {
                  setCustomerToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isProcessing}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error / Conflict Alert */}
            {deleteError && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Notice</span>
                </div>
                <p>{deleteError}</p>
                {canFallbackDeactivate && (
                  <p className="font-semibold text-amber-950">
                    Tip: You can deactivate this customer instead so they no longer appear as an active account while preserving past ledger and invoice history.
                  </p>
                )}
              </div>
            )}

            {/* Customer Details Box */}
            <div className="bg-[#F8F9FF] rounded-xl p-3.5 border border-[#E2E8F0] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#6E7977]">Customer Code:</span>
                <span className="font-semibold text-[#0B1C30]">{customerToDelete.customer_code ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6E7977]">Opening Balance:</span>
                <span className="font-semibold text-[#BA1A1A]">₹{Number(customerToDelete.opening_balance).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6E7977]">Current Status:</span>
                <span className="font-semibold text-[#0B1C30]">{customerToDelete.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCustomerToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isProcessing}
                className="flex-1 h-10 border border-[#BDC9C6] rounded-xl text-xs font-semibold text-[#0B1C30] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {customerToDelete.is_active && (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={isProcessing}
                  className="flex-1 h-10 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Deactivate</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDelete}
                disabled={isProcessing}
                className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-75"
              >
                {isProcessing ? (
                  <Spinner className="w-4 h-4 text-white" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SalesmenView: React.FC = () => {
  const salesmen = useDashboardStore((s) => s.salesmen);

  return (
    <div data-component="SalesmenView" className="space-y-6 max-w-360 mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-[#0B1C30]">Sales Force</h2>
        <p className="text-sm text-[#3E4947] font-medium">Team directory</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {salesmen.map((s) => {
          const initials = s.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
          return (
            <div key={s.id} className="bg-white p-6 rounded-[14px] border border-[#E2E8F0] shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-brand text-white text-base font-bold flex items-center justify-center">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-[#0B1C30]">{s.name}</h4>
                <p className="text-xs text-[#6E7977]">{s.email ?? s.profiles?.email}</p>
                <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-[#3E4947]">
                  {s.employee_code && <span>Code: {s.employee_code}</span>}
                  <span className={s.is_active ? "text-teal-brand" : "text-gray-400"}>
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CollectionsView: React.FC<{ onOpenQuickAdd: () => void }> = ({ onOpenQuickAdd }) => {
  const payments = useDashboardStore((s) => s.payments);
  const customers = useDashboardStore((s) => s.customers);

  return (
    <div data-component="CollectionsView" className="space-y-6 max-w-360 mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C30]">Collections Log</h2>
          <p className="text-sm text-[#3E4947]">Real-time log of payments received</p>
        </div>
        <button onClick={onOpenQuickAdd}
          className="px-4 py-2 bg-teal-brand text-white text-sm font-semibold rounded-lg shadow-xs hover:bg-teal-brand/90 cursor-pointer">
          + Log Payment
        </button>
      </div>

      <div className="bg-white rounded-[14px] border border-[#E2E8F0] overflow-hidden shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8F9FF] border-b border-[#E2E8F0] text-[#3E4947] font-semibold uppercase tracking-wider text-xs">
            <tr>
              <th className="p-4">Payment #</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Method</th>
              <th className="p-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {payments.map((p) => {
              const custName =
                customers.find((c) => c.id === p.customer_id)?.name ??
                (p as PaymentRow & { customers?: { name: string } | null }).customers?.name ??
                "Unknown Customer";

              return (
                <tr key={p.id} className="hover:bg-[#F8F9FF]">
                  <td className="p-4 font-mono font-semibold text-[#3E4947]">{p.payment_number ?? p.id.slice(0, 8)}</td>
                  <td className="p-4 font-bold text-[#0B1C30]">{custName}</td>
                  <td className="p-4 font-bold text-teal-brand">₹{Number(p.amount).toLocaleString("en-IN")}</td>
                  <td className="p-4 text-[#3E4947] capitalize">{p.payment_method.replace("_", " ")}</td>
                  <td className="p-4 text-[#3E4947]">{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
                </tr>
              );
            })}
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                  No payment collections logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
