import React from "react";
import { ShieldCheck } from "lucide-react";
import { AuthModalType } from "@/types/auth";

interface SecurityFooterProps {
  onOpenModal: (type: AuthModalType) => void;
}

export const SecurityFooter: React.FC<SecurityFooterProps> = ({ onOpenModal }) => {
  return (
    <div className="mt-12 flex flex-col items-center gap-3">
      {/* Protected pill badge */}
      <div className="bg-[#EAF3FD]/90 border border-blue-100/70 rounded-full px-4 py-1.5 flex items-center justify-center gap-2 shadow-2xs">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
        <span className="text-xs font-semibold text-slate-500 tracking-tight">
          Protected by Kinetic Shield Technology
        </span>
      </div>

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
