"use client";

import React, { useState } from "react";
import { X, Plus, CheckCircle2 } from "lucide-react";
import { useDashboardStore } from "@/store/dashboardStore";
import type { CustomerRow } from "@/lib/services/customerService";

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameToUse    = companyName.trim() || "New Customer";
    const openBal      = parseFloat(openingBalance) || 0;
    const creditLim    = parseFloat(creditLimit) || 0;
    const salesmanId   = assignedSalesman || undefined;

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

        {/* Success Toast */}
        {successToast && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Modal Body */}
        <form id="add-customer-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-6 text-sm">

          {/* BASIC INFORMATION */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-[#0F766E] uppercase tracking-widest">BASIC INFORMATION</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Company Name *</label>
                <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1C30] outline-none font-medium" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Contact Person</label>
                <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Full Name"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1C30] outline-none font-medium" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1C30] outline-none font-medium" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="billing@company.com"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1C30] outline-none font-medium" />
              </div>
            </div>
          </section>

          {/* ADDRESS */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-[#0F766E] uppercase tracking-widest">ADDRESS</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Street Address</label>
                <input type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="123 Business Way"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1C30] outline-none font-medium" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#3E4947]">City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1C30] outline-none font-medium" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#3E4947]">State</label>
                  <input type="text" value={state} onChange={(e) => setState(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1C30] outline-none font-medium" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#3E4947]">ZIP/Pincode</label>
                  <input type="text" value={zip} onChange={(e) => setZip(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1C30] outline-none font-medium" />
                </div>
              </div>
            </div>
          </section>

          {/* ASSIGNMENT & FINANCIALS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-[#0F766E] uppercase tracking-widest">ASSIGNMENT</h3>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Assigned Salesman</label>
                <select value={assignedSalesman} onChange={(e) => setAssignedSalesman(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1C30] outline-none font-medium appearance-none cursor-pointer">
                  <option value="">Select Salesman</option>
                  {salesmen.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-[#0F766E] uppercase tracking-widest">FINANCIALS</h3>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Credit Limit (₹)</label>
                <input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="₹ 0.00"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1C30] outline-none font-medium font-mono" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3E4947]">Opening Balance (₹)</label>
                <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="₹ 0.00"
                  className="h-10 px-3 rounded-lg border border-[#BDC9C6] bg-[#EFF4FF]/50 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1C30] outline-none font-medium font-mono" />
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
            className="h-10 px-6 rounded-lg bg-[#0F766E] text-white font-semibold text-sm hover:bg-[#0F766E]/90 transition-opacity shadow-xs cursor-pointer">
            Create Customer
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Quick Add Modal ────────────────────────────────────────────────────────────

export const QuickAddModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const customers = useDashboardStore((s) => s.customers);
  const salesmen  = useDashboardStore((s) => s.salesmen);

  const [activeTab, setActiveTab] = useState<"customer" | "invoice" | "payment">("customer");
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id ?? "");
  const [selectedSalesmanId, setSelectedSalesmanId] = useState(salesmen[0]?.id ?? "");
  const [amount, setAmount] = useState("15000");
  const [toastMsg, setToastMsg] = useState("");

  if (!isOpen) return null;

  if (activeTab === "customer") {
    return <AddCustomerModal isOpen={isOpen} onClose={onClose} />;
  }

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    if (activeTab === "invoice") {
      setToastMsg(`Invoice for ₹${numAmount.toLocaleString("en-IN")} queued — full invoice form required for DB.`);
    } else if (activeTab === "payment") {
      setToastMsg(`Payment of ₹${numAmount.toLocaleString("en-IN")} queued — full payment form required for DB.`);
    }

    setTimeout(() => { setToastMsg(""); onClose(); }, 1400);
  };

  return (
    <div data-component="QuickAddModal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1C30]/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <h3 className="text-lg font-bold text-[#0B1C30]">Quick Office Action</h3>
          <button type="button" onClick={onClose} className="text-[#3E4947] hover:text-[#0B1C30] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 p-1 bg-[#EFF4FF] rounded-lg mt-4 text-xs font-bold">
          <button type="button" onClick={() => setActiveTab("customer")}
            className="py-1.5 rounded-md text-[#0F766E] hover:bg-white transition-all cursor-pointer">
            + Customer
          </button>
          <button type="button" onClick={() => setActiveTab("invoice")}
            className={`py-1.5 rounded-md transition-all cursor-pointer ${activeTab === "invoice" ? "bg-white text-[#0B1C30] shadow-2xs" : "text-[#3E4947]"}`}>
            + Invoice
          </button>
          <button type="button" onClick={() => setActiveTab("payment")}
            className={`py-1.5 rounded-md transition-all cursor-pointer ${activeTab === "payment" ? "bg-white text-[#0B1C30] shadow-2xs" : "text-[#3E4947]"}`}>
            + Payment
          </button>
        </div>

        {toastMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>{toastMsg}</span>
          </div>
        )}

        <form onSubmit={handleActionSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#3E4947] mb-1">Select Customer</label>
            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full h-10 px-3 border border-[#BDC9C6] rounded-lg bg-[#EFF4FF]/50 focus:border-[#0F766E] text-[#0B1C30] font-medium">
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.city ? `(${c.city})` : ""}</option>
              ))}
            </select>
          </div>

          {activeTab === "invoice" && (
            <div>
              <label className="block font-semibold text-[#3E4947] mb-1">Assigned Salesman</label>
              <select value={selectedSalesmanId} onChange={(e) => setSelectedSalesmanId(e.target.value)}
                className="w-full h-10 px-3 border border-[#BDC9C6] rounded-lg bg-[#EFF4FF]/50 focus:border-[#0F766E] text-[#0B1C30] font-medium">
                {salesmen.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#3E4947] mb-1">Amount (₹)</label>
            <input type="number" required min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full h-10 px-3 border border-[#BDC9C6] rounded-lg bg-[#EFF4FF]/50 focus:border-[#0F766E] text-[#0B1C30] font-mono font-bold" />
          </div>

          <div className="pt-3 flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 border border-[#BDC9C6] rounded-lg font-semibold text-[#0B1C30] hover:bg-[#EFF4FF]">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 h-10 bg-[#0F766E] text-white rounded-lg font-semibold hover:bg-[#0F766E]/90 shadow-2xs">
              {activeTab === "invoice" ? "Generate Invoice" : "Log Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Sub-Pages Views ───────────────────────────────────────────────────────────

export const CustomersView: React.FC<{ onOpenAddCustomer: () => void }> = ({ onOpenAddCustomer }) => {
  const customers = useDashboardStore((s) => s.customers);

  return (
    <div data-component="CustomersView" className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C30]">Customer Directory</h2>
          <p className="text-sm text-[#3E4947]">Real-time balances &amp; purchase histories</p>
        </div>
        <button onClick={onOpenAddCustomer}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F766E] text-white text-sm font-semibold rounded-lg shadow-xs hover:bg-[#0F766E]/90 cursor-pointer">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-[#F8F9FF]">
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
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${c.is_active ? "bg-[#0F766E]/10 text-[#0F766E]" : "bg-gray-100 text-gray-500"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SalesmenView: React.FC = () => {
  const salesmen = useDashboardStore((s) => s.salesmen);

  return (
    <div data-component="SalesmenView" className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-[#0B1C30]">Sales Force</h2>
        <p className="text-sm text-[#3E4947] font-medium">Team directory</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {salesmen.map((s) => {
          const initials = s.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
          return (
            <div key={s.id} className="bg-white p-6 rounded-[14px] border border-[#E2E8F0] shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#0F766E] text-white text-base font-bold flex items-center justify-center">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-[#0B1C30]">{s.name}</h4>
                <p className="text-xs text-[#6E7977]">{s.email ?? s.profiles?.email}</p>
                <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-[#3E4947]">
                  {s.employee_code && <span>Code: {s.employee_code}</span>}
                  <span className={s.is_active ? "text-[#0F766E]" : "text-gray-400"}>
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

  return (
    <div data-component="CollectionsView" className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C30]">Collections Log</h2>
          <p className="text-sm text-[#3E4947]">Real-time log of payments received</p>
        </div>
        <button onClick={onOpenQuickAdd}
          className="px-4 py-2 bg-[#0F766E] text-white text-sm font-semibold rounded-lg shadow-xs hover:bg-[#0F766E]/90 cursor-pointer">
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
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-[#F8F9FF]">
                <td className="p-4 font-mono font-semibold text-[#3E4947]">{p.payment_number ?? p.id.slice(0, 8)}</td>
                <td className="p-4 font-bold text-[#0B1C30]">{p.customer_id}</td>
                <td className="p-4 font-bold text-[#0F766E]">₹{Number(p.amount).toLocaleString("en-IN")}</td>
                <td className="p-4 text-[#3E4947] capitalize">{p.payment_method.replace("_", " ")}</td>
                <td className="p-4 text-[#3E4947]">{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const OutstandingView: React.FC = () => {
  const invoices = useDashboardStore((s) => s.invoices)
    .filter((i) => i.status === "issued" || i.status === "partially_paid" || i.status === "overdue");

  return (
    <div data-component="OutstandingView" className="space-y-6 max-w-[1440px] mx-auto">
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
              <th className="p-4">Amount</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-[#F8F9FF]">
                <td className="p-4 font-mono font-semibold text-[#3E4947]">{inv.invoice_number}</td>
                <td className="p-4 font-bold text-[#0B1C30]">{inv.customer_id}</td>
                <td className="p-4 font-bold text-[#BA1A1A]">₹{Number(inv.total_amount).toLocaleString("en-IN")}</td>
                <td className="p-4 text-[#6E7977]">{inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN") : "—"}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#FFDAD6] text-[#BA1A1A] capitalize">
                    {inv.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
