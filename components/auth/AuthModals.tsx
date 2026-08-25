"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { AuthModalType } from "@/types/auth";
import { SECURITY_METRICS } from "@/constants/auth";
import { sendPasswordReset } from "@/lib/auth/authService";
import { KeyRound, HelpCircle, FileText, Loader2 } from "lucide-react";

interface AuthModalsProps {
  activeModal: AuthModalType;
  onClose: () => void;
  userEmail: string;
  onResetSuccess: () => void;
  onResetError: (message: string) => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  activeModal,
  onClose,
  userEmail,
  onResetSuccess,
  onResetError,
}) => {
  const [resetEmail, setResetEmail] = useState(userEmail);
  const [isSending, setIsSending] = useState(false);

  const handleResetSubmit = async () => {
    if (!resetEmail.trim()) return;
    setIsSending(true);

    const result = await sendPasswordReset(resetEmail.trim());
    setIsSending(false);
    onClose();

    if (result.success) {
      onResetSuccess();
    } else {
      onResetError(result.error ?? "Failed to send reset email.");
    }
  };

  if (!activeModal) return null;

  return (
    <>
      {/* Reset Password Modal */}
      <Modal
        isOpen={activeModal === "forgot"}
        onClose={onClose}
        title="Reset Password"
        icon={<KeyRound className="w-5 h-5 text-teal-brand" />}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Enter your registered email address. We&apos;ll send a secure reset
            link verified by Kinetic Shield.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-brand focus:ring-2 focus:ring-teal-brand/15 transition-all"
              placeholder="name@kinetic.ent"
              disabled={isSending}
            />
          </div>
          <button
            onClick={handleResetSubmit}
            disabled={isSending || !resetEmail.trim()}
            className="w-full bg-teal-brand text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-teal-brand-dark transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </div>
      </Modal>

      {/* Support & Assistance Modal */}
      <Modal
        isOpen={activeModal === "help"}
        onClose={onClose}
        title="Support & Assistance"
        icon={<HelpCircle className="w-5 h-5 text-teal-brand" />}
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>Need assistance signing into your Shubh Enterprise account?</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Verify you have selected the correct role (Admin or Salesman).</li>
            <li>Ensure caps lock is turned off when entering your password.</li>
            <li>
              Contact your system administrator at{" "}
              <span className="font-semibold text-slate-800">support@kinetic.ent</span>{" "}
              for credential resets.
            </li>
          </ul>
          <button
            onClick={onClose}
            className="w-full mt-2 bg-slate-100 text-slate-700 font-semibold text-sm py-2 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Security Architecture Modal */}
      <Modal
        isOpen={activeModal === "security"}
        onClose={onClose}
        title="Security Architecture"
        icon={<FileText className="w-5 h-5 text-teal-brand" />}
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Shubh Enterprise is protected by{" "}
          </p>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70 text-xs space-y-1.5">
            {SECURITY_METRICS.map((metric) => (
              <div key={metric.label} className="flex justify-between font-medium">
                <span>{metric.label}:</span>
                <span className="text-teal-brand">{metric.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-full mt-2 bg-slate-100 text-slate-700 font-semibold text-sm py-2 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
};
