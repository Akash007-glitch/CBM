"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FB] gap-4 p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 text-2xl font-bold mb-2">
        !
      </div>
      <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
      <p className="text-sm text-slate-500 max-w-sm">
        {error.message ?? "An unexpected error occurred loading the dashboard."}
      </p>
      <button
        onClick={reset}
        className="mt-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
