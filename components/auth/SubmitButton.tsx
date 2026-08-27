import React from "react";
import { ArrowRight } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

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
          <Spinner className="w-4 h-4 text-white" />
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
