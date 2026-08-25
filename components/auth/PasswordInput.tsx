import React, { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  onForgotClick: () => void;
  error?: string;
  disabled?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  onForgotClick,
  error,
  disabled,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const hasError = Boolean(error);

  return (
    <div data-component="PasswordInput">
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor="password-input"
          className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
        >
          Password
        </label>
        <button
          type="button"
          onClick={onForgotClick}
          disabled={disabled}
          className="text-xs font-bold text-[#1B2CC1] hover:text-[#15239E] hover:underline cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Forgot Password?
        </button>
      </div>
      <div className="relative flex items-center">
        <Lock
          className={`w-4 h-4 absolute left-3.5 pointer-events-none stroke-[2] transition-colors ${
            hasError ? "text-red-400" : "text-slate-400"
          }`}
        />
        <input
          id="password-input"
          type={showPassword ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? "password-error" : undefined}
          className={`w-full pl-10 pr-10 py-2.5 text-slate-800 bg-white border rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs font-normal disabled:opacity-60 disabled:cursor-not-allowed ${
            hasError
              ? "border-red-400 focus:border-red-400 focus:ring-red-400/15"
              : "border-slate-200/90 focus:border-[#1B2CC1] focus:ring-[#1B2CC1]/15"
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer p-1 transition-colors disabled:opacity-50"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 stroke-[2]" />
          ) : (
            <Eye className="w-4 h-4 stroke-[2]" />
          )}
        </button>
      </div>
      {hasError && (
        <p
          id="password-error"
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 font-medium"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};
