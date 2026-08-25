"use client";

import React, { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { ToastVariant } from "@/types/auth";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
  duration?: number;
}

const variantStyles: Record<ToastVariant, { wrapper: string; icon: React.ReactNode }> = {
  success: {
    wrapper: "bg-slate-900 border-slate-800 text-white",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
  },
  error: {
    wrapper: "bg-red-950 border-red-900/60 text-white",
    icon: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
  },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = "success",
  onClose,
  duration = 5000,
}) => {
  const styles = variantStyles[variant];

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      data-component="Toast"
      role="alert"
      aria-live="assertive"
      className={`fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:left-auto sm:right-5 sm:translate-x-0 sm:w-auto sm:max-w-sm z-9999 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm animate-in fade-in slide-in-from-top-4 duration-300 ${styles.wrapper}`}
    >
      {styles.icon}
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity cursor-pointer p-0.5 rounded-md"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
