import React, { useState } from "react";
import { Shield, CheckCircle2, Award, Check } from "lucide-react";

interface SecureShieldCardProps {
  vehicleTitle?: string;
  vehicleId?: string | number;
  sellerPhone?: string;
  onBookShield?: (vehicleId?: string | number, vehicleTitle?: string) => void;
  isEnabled?: boolean;
}

export function SecureShieldCard({
  vehicleTitle,
  vehicleId,
  sellerPhone,
  onBookShield,
  isEnabled = true,
}: SecureShieldCardProps) {
  const [isAdded, setIsAdded] = useState(false);

  if (!isEnabled) {
    return null;
  }

  const handleToggle = () => {
    const nextState = !isAdded;
    setIsAdded(nextState);
    if (onBookShield && nextState) {
      onBookShield(vehicleId, vehicleTitle);
    }
  };

  return (
    <div className="p-5 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 text-stone-100 border border-amber-500/40 hover:border-amber-500/70 shadow-xl font-sans space-y-4 rounded-none relative overflow-hidden transition-all duration-300">
      {/* Subtle background ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 shrink-0">
            <Shield className="w-5 h-5 text-amber-400 fill-amber-400/20" />
          </div>
          <div>
            <h4 className="text-xs font-serif font-black uppercase tracking-wider text-amber-400 leading-none">
              Auto World Secure Shield
            </h4>
            <span className="text-[9px] text-stone-400 font-mono uppercase tracking-widest block mt-1">
              Inspection & RC Transfer Guarantee
            </span>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold uppercase tracking-widest border border-amber-500/30">
          ₹199 OFFER
        </span>
      </div>

      {/* 3 Bullet Points in a Flex Column with Checkmarks */}
      <div className="flex flex-col gap-2.5 py-1 text-xs text-stone-300 font-sans">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <strong className="font-bold text-stone-100">150-Point Physical Inspection:</strong>{" "}
            <span className="text-stone-300 font-normal">A master technician verifies every inch.</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <strong className="font-bold text-stone-100">Zero RTO Headaches:</strong>{" "}
            <span className="text-stone-300 font-normal">We handle the complete RC transfer.</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <strong className="font-bold text-stone-100">Fraud Protection:</strong>{" "}
            <span className="text-stone-300 font-normal">100% verified legal history.</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full py-3 px-4 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer border shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
          isAdded
            ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-900/50"
            : "bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-400 shadow-amber-900/40"
        }`}
      >
        {isAdded ? (
          <>
            <Check className="w-4 h-4 text-white shrink-0" />
            <span>🛡️ SECURE SHIELD ADDED (₹199)</span>
          </>
        ) : (
          <>
            <Award className="w-4 h-4 text-stone-950 shrink-0" />
            <span>🛡️ ADD SECURE SHIELD (₹199)</span>
          </>
        )}
      </button>
    </div>
  );
}
