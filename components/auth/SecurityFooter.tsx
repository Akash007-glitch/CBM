import React from "react";
import { ShieldCheck } from "lucide-react";
import { AuthModalType } from "@/types/auth";

interface SecurityFooterProps {
  onOpenModal: (type: AuthModalType) => void;
}

export const SecurityFooter: React.FC<SecurityFooterProps> = ({ onOpenModal }) => {
  return (
    <div data-component="SecurityFooter" className="mt-12 flex flex-col items-center gap-3">
      {/* Protected pill badge */}


      {/* Footer secondary links */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <button
          type="button"
          onClick={() => onOpenModal("help")}
          className="hover:text-slate-600 transition-colors cursor-pointer"
        >
          Help
        </button>
        <span className="text-slate-300">•</span>
        <button
          type="button"
          onClick={() => onOpenModal("security")}
          className="hover:text-slate-600 transition-colors cursor-pointer"
        >
          Security Architecture
        </button>
      </div>
    </div>
  );
};
