"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useLogout, useAuthLoading } from "@/store/authStore";
import {
  LayoutDashboard,
  Users,
  Award,
  Wallet,
  Clock,
  Search,
  Bell,
  Calendar,
  Plus,
  LogOut,
  Menu,
  X,
  Radio,
  Package,
} from "lucide-react";
import { useDashboardStore } from "@/store/dashboardStore";

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  id: string;
  badge?: number;
}

interface DashboardShellProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (id: string) => void;
  onOpenQuickAdd?: () => void;
  onOpenAddCustomer?: () => void;
  navItems?: NavItem[];
  brandColor?: string;
  roleBadgeClass?: string;
  roleLabel?: string;
}

const DEFAULT_ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, id: "dashboard" },
  { label: "Customers", icon: <Users className="w-5 h-5" />, id: "customers" },
  { label: "Salesmen", icon: <Award className="w-5 h-5" />, id: "salesmen" },
  { label: "Collections", icon: <Wallet className="w-5 h-5" />, id: "collections" },
  { label: "Outstanding", icon: <Clock className="w-5 h-5" />, id: "outstanding" },
];

export const DashboardShell: React.FC<DashboardShellProps> = ({
  children,
  activePage,
  onNavigate,
  onOpenQuickAdd,
  navItems,
  roleLabel = "Admin",
}) => {
  const router = useRouter();
  const user = useUser();
  const logout = useLogout();
  const isLoading = useAuthLoading();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize the dashboard store when the shell mounts (i.e. on every login).
  // This fetches customers, salesmen, invoices, etc. from Supabase.
  const initialize = useDashboardStore((s) => s.initialize);
  const destroy = useDashboardStore((s) => s.destroy);

  useEffect(() => {
    initialize();
    return () => destroy();
  }, [initialize, destroy]);

  const [displayName, setDisplayName] = useState<string>(roleLabel);
  const [initials, setInitials] = useState<string>(roleLabel.slice(0, 2).toUpperCase());

  const effectiveNavItems = navItems ?? DEFAULT_ADMIN_NAV;

  React.useEffect(() => {
    const name =
      (user?.user_metadata?.full_name as string | undefined) ??
      user?.email?.split("@")[0] ??
      roleLabel;
    setDisplayName(name);
    setInitials(
      name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    );
  }, [user, roleLabel]);

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <div data-component="DashboardShell" className="flex h-screen bg-[#F8F9FF] overflow-hidden font-sans text-[#0B1C30]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── SideNavBar matching Stitch Specification ── */}
      <aside
        data-component="DashboardShell/SideNavBar"
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col w-64 text-white
          shadow-md transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "linear-gradient(180deg, rgb(15, 118, 110) 0%, rgb(0, 77, 64) 100%)",
        }}
        aria-label="Main navigation sidebar"
      >
        {/* Sidebar Brand Header */}
        <div className="flex items-center gap-4 px-5 py-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-inner flex-shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Shubh Enterprise</h2>
            <p className="text-xs text-[#9CF2E8] font-semibold">Best in </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/80 hover:text-white cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Main menu" className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {effectiveNavItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-semibold
                  transition-all duration-200 cursor-pointer text-left
                  ${isActive
                    ? "bg-white/10 text-white border-r-4 border-[#9CF2E8] shadow-xs"
                    : "text-[#9CF2E8]/80 hover:bg-white/5 hover:text-white"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                <span className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-[#9CF2E8]/70"}`}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Simulation Ticker & Logout */}
        <div className="p-4 border-t border-white/10 bg-black/10 space-y-3">
          {/* <button
            onClick={toggleLiveSimulation}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${isLiveSimulationActive
              ? "bg-[#0F766E]/40 text-[#9CF2E8] border border-[#0F766E]/60"
              : "bg-slate-800/60 text-slate-400 border border-slate-700/50"
              }`}
          >
            <span className="flex items-center gap-2">
              <Radio className={`w-3.5 h-3.5 ${isLiveSimulationActive ? "text-emerald-300 animate-pulse" : "text-slate-500"}`} />
              {isLiveSimulationActive ? "Realtime Active" : "Realtime Paused"}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isLiveSimulationActive ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-700 text-slate-400"}`}>
              {isLiveSimulationActive ? "LIVE" : "PAUSED"}
            </span>
          </button> */}

          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0F766E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 border border-white/20">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-[#9CF2E8] truncate">{roleLabel}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="text-[#9CF2E8]/80 hover:text-red-300 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Workspace Canvas ── */}
      <div data-component="DashboardShell/MainCanvas" className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopNavBar matching Stitch Specification */}
        <header data-component="DashboardShell/TopNavBar" className="flex items-center justify-between gap-4 px-8 h-16 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] shadow-2xs flex-shrink-0">
          <div className="flex items-center gap-6 flex-1 max-w-md">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900 cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Title */}
            <span className="font-semibold text-lg text-[#005C55] tracking-tight hidden sm:block">
              Shubh Enterprise
            </span>


          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            {/* <button
              className="text-[#3E4947] hover:text-[#005C55] transition-colors p-2 rounded-full hover:bg-[#E5EEFF] cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button> */}

            <button
              className="text-[#3E4947] hover:text-[#005C55] transition-colors p-2 rounded-full hover:bg-[#E5EEFF] cursor-pointer"
              aria-label="Calendar"
            >
              <Calendar className="w-5 h-5" />
            </button>

            {/* Quick Add Button */}
            <button
              onClick={onOpenQuickAdd}
              className="bg-[#0F766E] text-white px-4 h-10 rounded-lg text-sm font-semibold hover:bg-[#0F766E]/90 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Add</span>
            </button>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full border border-[#BDC9C6] bg-[#0F766E] text-white text-xs font-bold flex items-center justify-center shadow-2xs ml-2">
              {initials}
            </div>
          </div>
        </header>

        {/* Main Workspace Body */}
        <main data-component="DashboardShell/PageContent" className="flex-1 overflow-y-auto p-8 bg-[#F8F9FF]">
          {children}
        </main>
      </div>
    </div>
  );
};
