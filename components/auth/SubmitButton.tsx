import React from "react";
import { ArrowRight } from "lucide-react";

interface SubmitButtonProps {
  isLoading: boolean;
  text?: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isLoading,
  text = "Sign In",
}) => {
  return (
    <button
      data-component="SubmitButton"
      type="submit"
      disabled={isLoading}
      className="w-full bg-teal-brand hover:bg-teal-brand-dark active:bg-teal-brand-hover text-white font-semibold text-sm rounded-lg py-3.5 px-4 flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed mt-2"
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Authenticating...</span>
        </div>
      ) : (
        <>
          <span>{text}</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </>
      )}
    </button>
  );
};
