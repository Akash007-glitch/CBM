import React from "react";
import { Shield, Lock } from "lucide-react";

export const BrandHeader: React.FC = () => {
  return (
    <div className="w-full text-center flex flex-col items-center mb-5">
      <div className="flex items-center justify-center gap-2.5 mb-1.5">
        {/* Custom Shield Emblem Icon */}
        <div className="relative w-8 h-8 rounded-lg bg-[#0D7663] text-white flex items-center justify-center shadow-xs">
          <Shield className="w-5 h-5 fill-[#0D7663] stroke-white stroke-[2.2]" />
          <Lock className="w-2.5 h-2.5 text-white absolute center stroke-[3]" />
        </div>
        <h1 className="text-[26px] font-bold text-slate-900 tracking-tight font-sans">
          Shubh Enterprise
        </h1>
      </div>

      <p className="text-slate-500 text-sm font-medium">
        Secure System Authentication
      </p>

      {/* Accent Teal Divider Line */}
      <div className="w-full h-[3.5px] bg-[#0D7663] rounded-full mt-5 mb-6 opacity-95 teal-divider-glow" />
    </div>
  );
};
