"use client";

import React, { useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ERPAdminDashboard } from "@/components/dashboard/ERPAdminDashboard";
import {
  AddCustomerModal,
  QuickAddModal,
  AdminLogPaymentModal,
  CustomersView,
  SalesmenView,
  CollectionsView,
  OutstandingView,
} from "@/components/dashboard/DashboardModals";

export default function AdminDashboardPage() {
  const [activePage, setActivePage] = useState("dashboard");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isLogPaymentOpen, setIsLogPaymentOpen] = useState(false);

  return (
    <AuthGuard requireAuth requiredRole="admin">
      <DashboardShell
        activePage={activePage}
        onNavigate={setActivePage}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
        onOpenLogPayment={() => setIsLogPaymentOpen(true)}
      >
        {activePage === "dashboard" && (
          <ERPAdminDashboard
            onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onOpenLogPayment={() => setIsLogPaymentOpen(true)}
          />
        )}

        {activePage === "customers" && (
          <CustomersView onOpenAddCustomer={() => setIsAddCustomerOpen(true)} />
        )}

        {activePage === "salesmen" && <SalesmenView />}

        {activePage === "collections" && (
          <CollectionsView
            onOpenLogPayment={() => setIsLogPaymentOpen(true)}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          />
        )}

        {activePage === "outstanding" && <OutstandingView />}
      </DashboardShell>

      {/* Real-time Action Modals */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
      />

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />

      <AdminLogPaymentModal
        isOpen={isLogPaymentOpen}
        onClose={() => setIsLogPaymentOpen(false)}
      />
    </AuthGuard>
  );
}

