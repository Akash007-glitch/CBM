export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="min-h-screen flex items-center justify-center bg-[#F4F7FB]"
    >
      <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-teal-600 animate-spin" />
    </div>
  );
}
