"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Plus,
  MoreHorizontal,
  ChevronDown,
  ArrowUp,
  FileText,
  DollarSign,
  AlertCircle,
  Zap,
} from "lucide-react";
import { useDashboardStore, useRealtimeMetrics } from "@/store/dashboardStore";

interface ERPAdminDashboardProps {
  onOpenAddCustomer: () => void;
  onOpenQuickAdd: () => void;
}

export const ERPAdminDashboard: React.FC<ERPAdminDashboardProps> = ({
  onOpenAddCustomer,
  onOpenQuickAdd,
}) => {
  const {
    todaySales,
    todayCollections,
    totalOutstanding,
    pendingInvoicesCount,
    totalCustomersCount,
    mtdRevenueLakhs,
  } = useRealtimeMetrics();

  const activities = useDashboardStore((s) => s.activities);
  const triggerSimulatedTransaction = useDashboardStore((s) => s.triggerSimulatedTransaction);

  const [trendPeriod, setTrendPeriod] = useState("Last 30 Days");

  const formatINR = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="max-w-[1440px] mx-auto space-y-8">
      {/* Header Section matching Stitch Specification */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1C30] tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-base text-[#3E4947] mt-2 font-normal">
            Real-time overview of distribution metrics and financial health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Simulation Trigger button for testing live recalculation */}
          <button
            onClick={triggerSimulatedTransaction}
            className="bg-[#EFF4FF] hover:bg-[#DCE9FF] border border-[#BDC9C6] text-[#005C55] px-3.5 h-10 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Simulate incoming sale or payment in real-time"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Simulate Live Event</span>
          </button>

          {/* Add Customer Button */}
          <button
            onClick={onOpenAddCustomer}
            className="bg-white border border-[#BDC9C6] text-[#0F766E] px-4 h-10 rounded-lg text-sm font-semibold hover:bg-[#F8F9FF] transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#0F766E]" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Bento Grid matching Stitch Specification */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {/* Card 1: Today's Sales */}
        <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 shadow-xs xl:col-span-2 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#0F766E]/5 rounded-full blur-xl group-hover:bg-[#0F766E]/10 transition-colors pointer-events-none" />
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
                Today's Sales
              </span>
              <div className="p-1.5 rounded-md bg-[#E5EEFF] text-[#0F766E] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[#0B1C30] mt-4 tracking-tight">
              {formatINR(todaySales)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-sm font-medium text-[#0F766E]">
            <ArrowUp className="w-4 h-4" />
            <span>12% vs yesterday</span>
          </div>
        </div>

        {/* Card 2: Today's Collections */}
        <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 shadow-xs xl:col-span-2 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#0051D5]/5 rounded-full blur-xl group-hover:bg-[#0051D5]/10 transition-colors pointer-events-none" />
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
                Today's Collections
              </span>
              <div className="p-1.5 rounded-md bg-[#E5EEFF] text-[#0051D5] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[#0B1C30] mt-4 tracking-tight">
              {formatINR(todayCollections)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-sm font-medium text-[#0051D5]">
            <ArrowUp className="w-4 h-4" />
            <span>5% vs yesterday</span>
          </div>
        </div>

        {/* Card 3: Total Outstanding */}
        <div className="bg-white border border-[#BA1A1A]/30 bg-[#FFDAD6]/10 rounded-[14px] p-6 shadow-xs xl:col-span-2 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#BA1A1A]/5 rounded-full blur-xl group-hover:bg-[#BA1A1A]/10 transition-colors pointer-events-none" />
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
                Total Outstanding
              </span>
              <div className="p-1.5 rounded-md bg-[#FFDAD6]/50 text-[#BA1A1A] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[#0B1C30] mt-4 tracking-tight">
              {formatINR(totalOutstanding)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-sm font-semibold text-[#BA1A1A]">
            <AlertCircle className="w-4 h-4" />
            <span>High Priority - Action Required</span>
          </div>
        </div>

        {/* Card 4: Pending Invoices */}
        <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 shadow-xs">
          <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
            Pending Invoices
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#0B1C30] mt-2">
            {pendingInvoicesCount}
          </div>
        </div>

        {/* Card 5: Total Customers */}
        <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 shadow-xs">
          <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
            Total Customers
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#0B1C30] mt-2">
            {totalCustomersCount.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Card 6: Monthly Revenue (MTD) */}
        <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 shadow-xs xl:col-span-4 flex flex-row items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
              Monthly Revenue (MTD)
            </span>
            <div className="text-3xl sm:text-4xl font-bold text-[#0B1C30] mt-2 tracking-tight">
              ₹{mtdRevenueLakhs} Lakhs
            </div>
          </div>
          {/* Mini Chart visualization matching Stitch specification */}
          <div className="w-48 h-12 rounded-lg bg-repeating-linear-45 from-[#F8F9FF] to-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#6E7977] shadow-inner p-1">
            <svg className="w-full h-full text-[#0F766E]" viewBox="0 0 100 30" fill="none">
              <path
                d="M 0,22 Q 25,8 50,16 T 100,6"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Workspace: Charts & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols Wide): Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly Sales Trend */}
          <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-[#0B1C30]">Monthly Sales Trend</h2>
              <div className="relative">
                <select
                  value={trendPeriod}
                  onChange={(e) => setTrendPeriod(e.target.value)}
                  className="bg-[#EFF4FF] border border-[#BDC9C6] rounded-md text-sm text-[#0B1C30] px-3 py-1.5 pr-8 focus:outline-none focus:border-[#0F766E] font-medium appearance-none cursor-pointer"
                >
                  <option>Last 30 Days</option>
                  <option>This Quarter</option>
                  <option>Year to Date</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E7977] pointer-events-none" />
              </div>
            </div>

            {/* Responsive Line Chart Visualization with Stitch Diagonal Canvas background */}
            <div className="h-[250px] w-full rounded-lg border border-[#E2E8F0] p-4 flex flex-col justify-between relative bg-repeating-linear-45 from-[#F8F9FF] to-[#FFFFFF]">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
                <line x1="0" y1="30" x2="500" y2="30" stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" />
                <line x1="0" y1="80" x2="500" y2="80" stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" />
                <line x1="0" y1="130" x2="500" y2="130" stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" />

                <defs>
                  <linearGradient id="stitchSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F766E" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <path
                  d="M 0,140 Q 60,100 120,60 T 240,85 T 360,35 T 500,50 L 500,180 L 0,180 Z"
                  fill="url(#stitchSalesGrad)"
                />

                <path
                  d="M 0,140 Q 60,100 120,60 T 240,85 T 360,35 T 500,50"
                  fill="none"
                  stroke="#0F766E"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {[
                  { x: 0, y: 140 },
                  { x: 120, y: 60 },
                  { x: 240, y: 85 },
                  { x: 360, y: 35 },
                  { x: 500, y: 50 },
                ].map((pt, i) => (
                  <circle key={i} cx={pt.x} cy={pt.y} r="4.5" fill="#0F766E" stroke="#ffffff" strokeWidth="2" />
                ))}
              </svg>

              <div className="flex items-center justify-between text-xs text-[#6E7977] font-medium pt-2 border-t border-[#E2E8F0]">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
                <span>Current</span>
              </div>
            </div>
          </div>

          {/* Collection vs Outstanding */}
          <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-[#0B1C30]">Collection vs Outstanding</h2>
              <button
                onClick={onOpenQuickAdd}
                className="text-[#0F766E] text-sm font-semibold hover:underline cursor-pointer"
              >
                View Details
              </button>
            </div>

            {/* Overdue Alert pill matching Stitch spec */}
            <div className="px-4 py-3 rounded-lg bg-[#FFDAD6]/30 border border-[#BA1A1A]/20 flex items-center justify-between text-sm font-medium text-[#BA1A1A]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#BA1A1A] flex-shrink-0" />
                <span>Global Industries invoice &gt; 60 days overdue (₹12,000)</span>
              </div>
              <span className="text-xs uppercase font-bold px-2 py-0.5 bg-[#BA1A1A] text-white rounded">
                Overdue
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col Wide): Activity Feed */}
        <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 shadow-xs flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-[#0B1C30]">Activity Feed</h2>
            <button className="text-[#3E4947] hover:text-[#0B1C30] p-1 rounded cursor-pointer">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {activities.slice(0, 5).map((act) => {
              let icon = <DollarSign className="w-4 h-4 text-[#0051D5]" />;
              let iconBg = "bg-[#E5EEFF]";

              if (act.type === "alert") {
                icon = <AlertTriangle className="w-4 h-4 text-[#BA1A1A]" />;
                iconBg = "bg-[#FFDAD6]/30";
              } else if (act.type === "invoice") {
                icon = <FileText className="w-4 h-4 text-[#0F766E]" />;
                iconBg = "bg-[#E5EEFF]";
              }

              return (
                <div key={act.id} className="flex gap-4 items-start">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}
                  >
                    {icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#0B1C30]">{act.title}</div>
                    <div className="text-sm text-[#3E4947] font-normal">{act.subtitle}</div>
                    <div className="text-xs text-[#6E7977] mt-1 font-medium">{act.timestamp}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onOpenQuickAdd}
            className="w-full mt-6 py-2.5 border border-[#E2E8F0] rounded-lg text-[#0F766E] font-semibold text-sm hover:bg-[#F8F9FF] transition-colors cursor-pointer"
          >
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
};
