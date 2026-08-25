import React from "react";
import { UserRole } from "@/types/auth";
import { Shield, Lock, IdCard } from "lucide-react";

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentRole,
  onRoleChange,
}) => {
  return (
    <div data-component="RoleSwitcher" className="w-full bg-[#EFF3F6] p-1 rounded-xl flex items-center mb-7 border border-slate-200/60 shadow-xs">
      <button
        type="button"
        onClick={() => onRoleChange("admin")}
        style={{ touchAction: "manipulation" }}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
          currentRole === "admin"
            ? "bg-white text-slate-800 shadow-sm border border-slate-200/80"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <div className="relative flex items-center justify-center">
          <Shield className="w-4 h-4 stroke-2" />
          <Lock className="w-2 h-2 absolute stroke-3" />
        </div>
        <span>Admin</span>
      </button>

      <button
        type="button"
        onClick={() => onRoleChange("salesman")}
        style={{ touchAction: "manipulation" }}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
          currentRole === "salesman"
            ? "bg-white text-slate-800 shadow-sm border border-slate-200/80"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <IdCard className="w-4 h-4 stroke-2" />
        <span>Salesman</span>
      </button>
    </div>
  );
};
