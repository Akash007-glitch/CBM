"use client";

import React, { useState } from "react";
import { UserRole, AuthModalType, LoginFormErrors, ToastState } from "@/types/auth";
import { ROLE_CONFIGS, ROLE_REDIRECT } from "@/constants/auth";
import { useLogin, useLogout, useAuthLoading } from "@/store/authStore";
import { validateLoginForm } from "@/lib/auth/validation";
import { BrandHeader } from "@/components/auth/BrandHeader";
import { RoleSwitcher } from "@/components/auth/RoleSwitcher";
import { EmailInput } from "@/components/auth/EmailInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { SecurityFooter } from "@/components/auth/SecurityFooter";
import { AuthModals } from "@/components/auth/AuthModals";
import { Toast } from "@/components/ui/Toast";

interface LoginFormProps {
  portalRole?: UserRole;
}

export const LoginForm: React.FC<LoginFormProps> = ({ portalRole }) => {
  // ── Store ────────────────────────────────────────────────────────────────
  const login = useLogin();
  const logout = useLogout();
  const isLoading = useAuthLoading();

  // ── Local UI state ────────────────────────────────────────────────────────
  const [role, setLocalRole] = useState<UserRole>(portalRole ?? "admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [activeModal, setActiveModal] = useState<AuthModalType>(null);

  const activeRoleConfig = ROLE_CONFIGS[role];

  const showToast = (message: string, variant: ToastState["variant"]) => {
    setToast({ message, variant });
  };

  const handleRoleChange = (newRole: UserRole) => {
    if (portalRole) return;
    setLocalRole(newRole);
    setEmail("");
    setPassword("");
    setFieldErrors({});
    setToast(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Client-side validation ──────────────────────────────────────────────
    const errors = validateLoginForm({ email, password });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    // ── Call Supabase via store ─────────────────────────────────────────────────────────────────
    const result = await login(email, password);

    if (!result.success) {
      showToast(result.error ?? "Sign in failed. Please try again.", "error");
      return;
    }

    // role comes from profiles table (fetched by authStore.login)
    const profileRole = result.role;

    if (!profileRole) {
      await logout();
      showToast(
        "Your account has no role assigned. Ask your administrator to set it in Supabase.",
        "error"
      );
      return;
    }

    // Sync the verified role into the global store and redirect.
    // proxy.ts handles server-side route protection via the real Supabase
    // session cookie — no hint cookies needed.
    if (profileRole !== role) {
      await logout();
      showToast(
        `This account is registered as ${profileRole}. Please use the ${profileRole} sign-in page.`,
        "error"
      );
      return;
    }

    // Let the browser make the first protected request after Supabase has
    // persisted its session cookie. A client-router RSC request can otherwise
    // race that cookie update and log a failed-fetch fallback.
    window.location.assign(ROLE_REDIRECT[profileRole as UserRole]);
  };


  return (
    <div data-component="LoginForm" className="w-full max-w-[420px] mx-auto flex flex-col items-center">
      {/* Notification Toast */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {/* Brand Header */}
      <BrandHeader />

      {!portalRole && (
        <RoleSwitcher currentRole={role} onRoleChange={handleRoleChange} />
      )}

      {/* Portal Details & Form */}
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {activeRoleConfig.portalTitle}
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-normal">
            {activeRoleConfig.portalSubtitle}
          </p>
        </div>

        {/* General error banner */}
        {fieldErrors.general && (
          <div
            role="alert"
            className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
          >
            {fieldErrors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <EmailInput
            value={email}
            onChange={(val) => {
              setEmail(val);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
            placeholder={activeRoleConfig.defaultEmail}
            error={fieldErrors.email}
            disabled={isLoading}
          />

          <PasswordInput
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            onForgotClick={() => setActiveModal("forgot")}
            error={fieldErrors.password}
            disabled={isLoading}
          />

          <SubmitButton isLoading={isLoading} />
        </form>
      </div>

      {/* Security Footer */}
      <SecurityFooter onOpenModal={setActiveModal} />

      {/* Modals */}
      <AuthModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        userEmail={email}
        onResetSuccess={() =>
          showToast("Password reset link sent — check your inbox.", "success")
        }
        onResetError={(msg) => showToast(msg, "error")}
      />
    </div>
  );
};
