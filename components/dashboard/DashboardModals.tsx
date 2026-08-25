"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  UserX,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useDashboardStore } from "@/store/dashboardStore";
import type { CustomerRow } from "@/lib/services/customerService";
import type { PaymentRow } from "@/lib/services/paymentService";
import type { InvoiceRow } from "@/lib/services/invoiceService";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Add New Customer Modal ────────────────────────────────────────────────────

export const AddCustomerModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const addCustomer  = useDashboardStore((s) => s.addCustomer);
  const salesmen     = useDashboardStore((s) => s.salesmen);

  const [companyName,      setCompanyName]      = useState("");
  const [contactPerson,    setContactPerson]    = useState("");
  const [phone,            setPhone]            = useState("");
  const [email,            setEmail]            = useState("");
  const [streetAddress,    setStreetAddress]    = useState("");
  const [city,             setCity]             = useState("");
  const [state,            setState]            = useState("");
  const [zip,              setZip]              = useState("");
  const [assignedSalesman, setAssignedSalesman] = useState("");
  const [creditLimit,      setCreditLimit]      = useState("");
  const [openingBalance,   setOpeningBalance]   = useState("");
  const [successToast,     setSuccessToast]     = useState("");
  const [errorToast,       setErrorToast]       = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorToast("");

    const nameToUse    = companyName.trim() || "New Customer";
    const openBal      = parseFloat(openingBalance) || 0;
    const creditLim    = parseFloat(creditLimit) || 0;
    const salesmanId   = assignedSalesman || undefined;

    try {
      await addCustomer({
        name:                 nameToUse,
        email:                email.trim() || null,
        phone:                phone.trim() || null,
        address:              streetAddress.trim() || null,
        city:                 city.trim() || null,
        state:                state.trim() || null,
        pincode:              zip.trim() || null,
        assigned_salesman_id: salesmanId ?? null,
        credit_limit:         creditLim,
        opening_balance:      openBal,
        is_active:            true,
      });

      setSuccessToast(`Customer "${nameToUse}" created successfully!`);

      setTimeout(() => {
        setCompanyName(""); setContactPerson(""); setPhone(""); setEmail("");
        setStreetAddress(""); setCity(""); setState(""); setZip("");
        setAssignedSalesman(""); setCreditLimit(""); setOpeningBalance("");
        setSuccessToast("");
        onClose();
      }, 1200);
    } catch (err) {
      setErrorToast(err instanceof Error ? err.message : "Failed to create customer.");
    }
  };

  return (
    <div data-component="AddCustomerModal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1C30]/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[#E2E8F0] animate-in fade-in zoom-in duration-200">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8F9FF]">
          <h2 className="text-xl font-bold text-[#0B1C30]">Add New Customer</h2>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#3E4947] hover:bg-[#E5EEFF] transition-colors cursor-pointer">
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
        {errorToast && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>{errorToast}</span>
          </div>
        )}

        {/* Modal Body */}
        <form id="add-customer-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-6 text-sm">

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
              <h3 className="text-xs font-bold text-teal-brand uppercase tracking-widest">ASSIGNMENT</h3>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Assigned Salesman</label>
                <select value={assignedSalesman} onChange={(e) => setAssignedSalesman(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-teal-brand focus:ring-1 focus:ring-teal-brand text-[#0B1C30] outline-none font-medium appearance-none cursor-pointer">
                  <option value="">Select Salesman</option>
                  {salesmen.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
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
          <button type="button" onClick={onClose}
            className="h-10 px-6 rounded-lg border border-[#BDC9C6] text-[#0B1C30] font-semibold text-sm hover:bg-[#E5EEFF] transition-colors cursor-pointer">
            Cancel
          </button>
          <button type="submit" form="add-customer-form"
            className="h-10 px-6 rounded-lg bg-teal-brand text-white font-semibold text-sm hover:bg-teal-brand/90 transition-opacity shadow-xs cursor-pointer">
            Create Customer
          </button>
        </div>
      </div>
    </div>
  );
};

import { ImportDayBookModal } from "@/components/dashboard/ImportDayBookModal";

export { ImportDayBookModal };
export const QuickAddModal: React.FC<ModalProps> = (props) => <ImportDayBookModal {...props} />;

// ── Sub-Pages Views ───────────────────────────────────────────────────────────

export const CustomersView: React.FC<{ onOpenAddCustomer: () => void }> = ({ onOpenAddCustomer }) => {
  const customers          = useDashboardStore((s) => s.customers);
  const deleteCustomer     = useDashboardStore((s) => s.deleteCustomer);
  const deactivateCustomer = useDashboardStore((s) => s.deactivateCustomer);

  const [customerToDelete, setCustomerToDelete] = useState<CustomerRow | null>(null);
  const [isProcessing, setIsProcessing]         = useState(false);
  const [deleteError, setDeleteError]           = useState<string | null>(null);
  const [canFallbackDeactivate, setCanFallbackDeactivate] = useState(false);
  const [toastMsg, setToastMsg]                 = useState<string | null>(null);

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
    <div data-component="CustomersView" className="space-y-6 max-w-360 mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C30]">Customer Directory</h2>
          <p className="text-sm text-[#3E4947]">Real-time balances &amp; purchase histories</p>
        </div>
        <button onClick={onOpenAddCustomer}
          className="flex items-center gap-2 px-4 py-2 bg-teal-brand text-white text-sm font-semibold rounded-lg shadow-xs hover:bg-teal-brand/90 cursor-pointer">
          <Plus className="w-4 h-4" /> New Customer
        </button>
      </div>

      <div className="bg-white rounded-[14px] border border-[#E2E8F0] overflow-hidden shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8F9FF] border-b border-[#E2E8F0] text-[#3E4947] font-semibold uppercase tracking-wider text-xs">
            <tr>
              <th className="p-4">Customer</th>
              <th className="p-4">Contact</th>
              <th className="p-4">City</th>
              <th className="p-4">Opening Balance</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-[#F8F9FF] transition-colors">
                <td className="p-4 font-bold text-[#0B1C30]">
                  {c.name}
                  {c.customer_code && <span className="text-[#3E4947] font-normal ml-1">({c.customer_code})</span>}
                </td>
                <td className="p-4 text-[#3E4947]">
                  {c.email}<br /><span className="text-xs text-[#6E7977]">{c.phone}</span>
                </td>
                <td className="p-4 text-[#3E4947]">{c.city ?? "—"}</td>
                <td className="p-4 font-bold text-[#BA1A1A]">
                  ₹{Number(c.opening_balance).toLocaleString("en-IN")}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${c.is_active ? "bg-teal-brand/10 text-teal-brand" : "bg-gray-100 text-gray-500"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => {
                      setCustomerToDelete(c);
                      setDeleteError(null);
                      setCanFallbackDeactivate(false);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
                    title="Remove customer"
                    aria-label={`Remove customer ${c.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                  No customers found. Click &quot;New Customer&quot; above to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
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
  const payments  = useDashboardStore((s) => s.payments);
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
  const invoices = useDashboardStore((s) => s.invoices)
    .filter((i) => i.status === "issued" || i.status === "partially_paid" || i.status === "overdue");
  const customers = useDashboardStore((s) => s.customers);

  return (
    <div data-component="OutstandingView" className="space-y-6 max-w-360 mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-[#0B1C30]">Outstanding Invoices</h2>
        <p className="text-sm text-[#3E4947]">Unpaid pending client accounts</p>
      </div>

      <div className="bg-white rounded-[14px] border border-[#E2E8F0] overflow-hidden shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8F9FF] border-b border-[#E2E8F0] text-[#3E4947] font-semibold uppercase tracking-wider text-xs">
            <tr>
              <th className="p-4">Invoice #</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Outstanding</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {invoices.map((inv) => {
              const custName = customers.find((c) => c.id === inv.customer_id)?.name ??
                (inv as InvoiceRow & { customers?: { name: string } | null }).customers?.name ??
                inv.customer_id.slice(0, 8);
              const remaining = Number(inv.total_amount) - Number((inv as InvoiceRow & { paid_amount?: number }).paid_amount || 0);

              return (
                <tr key={inv.id} className="hover:bg-[#F8F9FF]">
                  <td className="p-4 font-mono font-semibold text-[#3E4947]">{inv.invoice_number}</td>
                  <td className="p-4 font-bold text-[#0B1C30]">{custName}</td>
                  <td className="p-4 font-bold text-[#BA1A1A]">₹{remaining.toLocaleString("en-IN")}</td>
                  <td className="p-4 text-[#6E7977]">{inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN") : "—"}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#FFDAD6] text-[#BA1A1A] capitalize">
                      {inv.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
