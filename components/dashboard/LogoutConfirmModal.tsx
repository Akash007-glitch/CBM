"use client";

import React, { useEffect } from "react";
import { LogOut, X, AlertTriangle } from "lucide-react";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isLoggingOut?: boolean;
  title?: string;
  description?: string;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoggingOut = false,
  title = "Are you sure you want to sign out?",
  description = "You will be signed out of the Subh Enterprise portal. Any unsaved progress will be lost.",
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoggingOut) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoggingOut, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-component="LogoutConfirmModal"
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#0B1C30]/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#E2E8F0] p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header with Icon */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#FFDAD6]/60 border border-[#BA1A1A]/20 text-[#BA1A1A] flex items-center justify-center shrink-0 shadow-2xs">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3
                id="logout-modal-title"
                className="text-lg font-bold text-[#0B1C30] leading-snug"
              >
                {title}
              </h3>
              <p className="text-xs font-semibold text-[#BA1A1A] flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Confirm logout session</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoggingOut}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6E7977] hover:bg-slate-100 hover:text-[#0B1C30] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message body */}
        <p className="text-sm text-[#3E4947] leading-relaxed">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="h-10 px-5 rounded-lg border border-[#BDC9C6] text-[#0B1C30] font-semibold text-sm hover:bg-[#F8F9FF] transition-colors cursor-pointer disabled:opacity-50"
          >
            Stay Logged In
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="h-10 px-5 rounded-lg bg-[#BA1A1A] hover:bg-[#93000A] text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
