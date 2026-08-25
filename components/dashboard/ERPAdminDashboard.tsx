"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Plus,
  ChevronDown,
  FileText,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { useDashboardStore, useRealtimeMetrics } from "@/store/dashboardStore";

interface ERPAdminDashboardProps {
  onOpenAddCustomer: () => void;
  onOpenQuickAdd?: () => void;
}

export const ERPAdminDashboard: React.FC<ERPAdminDashboardProps> = ({
  onOpenAddCustomer,
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
  const salesTrend = useDashboardStore((s) => s.salesTrend);
  const customers  = useDashboardStore((s) => s.customers);

  const formatActivityText = (description: string | null, metadata: unknown) => {
    if (!description) return "";
    let text = description;

    if (metadata && typeof metadata === "object") {
      const meta = metadata as Record<string, unknown>;
      if (typeof meta.customer_name === "string" && meta.customer_name) {
        text = text.replace(/from\s+([0-9a-f-]{36})/i, `from ${meta.customer_name}`);
        text = text.replace(/for\s+([0-9a-f-]{36})/i, `for ${meta.customer_name}`);
      } else if (typeof meta.customer_id === "string") {
        const found = customers.find((c) => c.id === meta.customer_id);
        if (found) {
          text = text.replace(meta.customer_id, found.name);
        }
      }
    }

    // Replace any matching customer UUIDs found anywhere in the description text
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    text = text.replace(uuidRegex, (matchedId) => {
      const found = customers.find((c) => c.id.toLowerCase() === matchedId.toLowerCase());
      return found ? found.name : matchedId;
    });

    // Strip any remaining literal 'customer_id=' prefix
    text = text.replace(/customer_id=\s*/gi, "");

    return text;
  };

  const [trendPeriod, setTrendPeriod] = useState("Last 30 Days");

  const formatINR = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);

  // Compute dynamic points for the sales trend SVG chart
  const maxSale = Math.max(...salesTrend.map((p) => p.sales), 10000);
  const chartPoints = salesTrend.length > 0
    ? salesTrend.map((p, idx) => {
        const x = (idx / Math.max(salesTrend.length - 1, 1)) * 480 + 10;
        const y = 160 - (p.sales / maxSale) * 130;
        return { x, y, sales: p.sales, date: p.date };
      })
    : [
        { x: 10, y: 160, sales: 0, date: "Day 1" },
        { x: 130, y: 160, sales: 0, date: "Day 7" },
        { x: 250, y: 160, sales: 0, date: "Day 15" },
        { x: 370, y: 160, sales: 0, date: "Day 22" },
        { x: 490, y: 160, sales: 0, date: "Day 30" },
      ];

  const pathD = chartPoints.length > 0
    ? `M ${chartPoints[0].x},${chartPoints[0].y} ` +
      chartPoints.slice(1).map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
    : "M 0,160 L 500,160";

  const areaD = chartPoints.length > 0
    ? `${pathD} L ${chartPoints[chartPoints.length - 1].x},175 L ${chartPoints[0].x},175 Z`
    : "M 0,160 L 500,160 L 500,175 L 0,175 Z";

  return (
    <div data-component="ERPAdminDashboard" className="max-w-360 mx-auto space-y-8">
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
          {/* Add Customer Button */}
          <button
            onClick={onOpenAddCustomer}
            className="bg-white border border-[#BDC9C6] text-teal-brand px-4 h-10 rounded-lg text-sm font-semibold hover:bg-[#F8F9FF] transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-teal-brand" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Bento Grid matching Stitch Specification */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {/* Card 1: Today's Sales */}
        <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 shadow-xs xl:col-span-2 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-teal-brand/5 rounded-full blur-xl group-hover:bg-teal-brand/10 transition-colors pointer-events-none" />
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
                Today&apos;s Sales
              </span>
              <div className="p-1.5 rounded-md bg-[#E5EEFF] text-teal-brand flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[#0B1C30] mt-4 tracking-tight">
              {formatINR(todaySales)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-teal-brand">
            <span>Live daily invoice total</span>
          </div>
        </div>

        {/* Card 2: Today's Collections */}
        <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 shadow-xs xl:col-span-2 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#0051D5]/5 rounded-full blur-xl group-hover:bg-[#0051D5]/10 transition-colors pointer-events-none" />
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#3E4947] uppercase tracking-wider">
                Today&apos;s Collections
              </span>
              <div className="p-1.5 rounded-md bg-[#E5EEFF] text-[#0051D5] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[#0B1C30] mt-4 tracking-tight">
              {formatINR(todayCollections)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-[#0051D5]">
            <span>Live daily payments received</span>
          </div>
        </div>

        {/* Card 3: Total Outstanding */}
        <div className="border border-[#BA1A1A]/30 bg-[#FFDAD6]/10 rounded-[14px] p-6 shadow-xs xl:col-span-2 flex flex-col justify-between relative overflow-hidden group">
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
          <div className="flex items-center gap-1.5 mt-4 text-xs font-semibold text-[#BA1A1A]">
            <AlertCircle className="w-4 h-4" />
            <span>Uncollected balance across all invoices</span>
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
                  className="bg-[#EFF4FF] border border-[#BDC9C6] rounded-md text-sm text-[#0B1C30] px-3 py-1.5 pr-8 focus:outline-none focus:border-teal-brand font-medium appearance-none cursor-pointer"
                >
                  <option>Last 30 Days</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E7977] pointer-events-none" />
              </div>
            </div>

            {/* Responsive Line Chart Visualization */}
            <div className="h-62.5 w-full rounded-lg border border-[#E2E8F0] p-4 flex flex-col justify-between relative bg-repeating-linear-45 from-[#F8F9FF] to-[#FFFFFF]">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
                <line x1="0" y1="30" x2="500" y2="30" stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" />
                <line x1="0" y1="80" x2="500" y2="80" stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" />
                <line x1="0" y1="130" x2="500" y2="130" stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" />

                <defs>
                  <linearGradient id="stitchSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B2CC1" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#1B2CC1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <path d={areaD} fill="url(#stitchSalesGrad)" />
                <path d={pathD} fill="none" stroke="#1B2CC1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {chartPoints.map((pt, i) => (
                  <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#1B2CC1" stroke="#ffffff" strokeWidth="1.5">
                    <title>{`${pt.date}: ₹${pt.sales.toLocaleString("en-IN")}`}</title>
                  </circle>
                ))}
              </svg>

              <div className="flex items-center justify-between text-xs text-[#6E7977] font-medium pt-2 border-t border-[#E2E8F0]">
                <span>Start</span>
                <span>Mid-Month</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* Collection vs Outstanding */}

        </div>

        {/* Right Column (1 Col Wide): Activity Feed */}
        <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-6 shadow-xs flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-[#0B1C30]">Activity Feed</h2>
            {/* <button className="text-[#3E4947] hover:text-[#0B1C30] p-1 rounded cursor-pointer">
              <MoreHorizontal className="w-5 h-5" />
            </button> */}
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {activities.slice(0, 5).map((act) => {
              // Map action string to icon type
              const isPayment = act.action?.includes('payment');
              const isAlert = act.action?.includes('overdue') || act.action?.includes('alert');

              let icon = <DollarSign className="w-4 h-4 text-[#0051D5]" />;
              let iconBg = "bg-[#E5EEFF]";

              if (isAlert) {
                icon = <AlertTriangle className="w-4 h-4 text-[#BA1A1A]" />;
                iconBg = "bg-[#FFDAD6]/30";
              } else if (!isPayment) {
                icon = <FileText className="w-4 h-4 text-teal-brand" />;
                iconBg = "bg-[#E5EEFF]";
              }

              const timeAgo = act.created_at
                ? new Date(act.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div key={act.id} className="flex gap-4 items-start">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}
                  >
                    {icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#0B1C30]">{act.action?.replace(/_/g, ' ')}</div>
                    <div className="text-sm text-[#3E4947] font-normal">{formatActivityText(act.description, act.metadata)}</div>
                    <div className="text-xs text-[#6E7977] mt-1 font-medium">{timeAgo}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            // onClick={}
            className="w-full mt-6 py-2.5 border border-[#E2E8F0] rounded-lg text-teal-brand font-semibold text-sm hover:bg-[#F8F9FF] transition-colors cursor-pointer"
          >
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
};
