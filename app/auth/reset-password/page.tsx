"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { BrandHeader } from "@/components/auth/BrandHeader";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Toast } from "@/components/ui/Toast";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setIsSuccess(true);
      setToast({
        message: "Your password has been successfully reset! Redirecting to login...",
        variant: "success",
      });

      setTimeout(() => {
        router.replace("/");
      }, 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reset password. Please try again.";
      setError(msg);
      setToast({ message: msg, variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-login-gradient flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-full max-w-105 mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200/80 flex flex-col items-center">
        <BrandHeader />

        <div className="w-full mb-6">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Reset Your Password
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-normal">
            Enter a new, secure password for your account.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="w-full mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="w-full text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Password Changed!</h3>
            <p className="text-xs text-slate-600">
              You can now log in using your new credentials.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-brand hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* New Password */}
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                New Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3.5 pointer-events-none text-slate-400" />
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 text-slate-800 bg-white border border-slate-200/90 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-brand focus:ring-2 focus:ring-teal-brand/15 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3.5 pointer-events-none text-slate-400" />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-10 py-2.5 text-slate-800 bg-white border border-slate-200/90 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-brand focus:ring-2 focus:ring-teal-brand/15 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <SubmitButton isLoading={isLoading} />
            </div>

            <div className="text-center pt-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-teal-brand transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
