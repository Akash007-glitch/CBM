import React from "react";
import { Mail, AlertCircle } from "lucide-react";

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export const EmailInput: React.FC<EmailInputProps> = ({
  value,
  onChange,
  placeholder,
  error,
  disabled,
}) => {
  const hasError = Boolean(error);

  return (
    <div data-component="EmailInput">
      <label
        htmlFor="email-input"
        className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider"
      >
        Email Address
      </label>
      <div className="relative flex items-center">
        <Mail
          className={`w-4 h-4 absolute left-3.5 pointer-events-none stroke-[2] transition-colors ${hasError ? "text-red-400" : "text-slate-400"
            }`}
        />
        <input
          id="email-input"
          type="email"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? "email-error" : undefined}
          className={`w-full pl-10 pr-4 py-2.5 text-slate-800 bg-white border rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs font-normal disabled:opacity-60 disabled:cursor-not-allowed ${hasError
            ? "border-red-400 focus:border-red-400 focus:ring-red-400/15"
            : "border-slate-200/90 focus:border-[#0D7663] focus:ring-[#0D7663]/15"
            }`}
        />
      </div>
      {hasError && (
        <p
          id="email-error"
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
