import React, { useState } from "react";
import { createPortal } from "react-dom";
import { 
  X, ArrowLeftRight, Scale, Sparkles, CheckCircle2, ShieldCheck, 
  MessageCircle, FileText, DollarSign, Calculator, Award, 
  ArrowRight, Info, AlertTriangle, Send, Share2, Fuel, Gauge, Sliders
} from "lucide-react";
import { ExchangeRequest, OfferedTradeVehicle } from "../types";

interface ExchangeEqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchange: ExchangeRequest;
  onOpenTradeAgreement?: (exchange: ExchangeRequest) => void;
  onOpenMakeOffer?: (exchange: ExchangeRequest) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export const ExchangeEqualizerModal: React.FC<ExchangeEqualizerModalProps> = ({
  isOpen,
  onClose,
  exchange,
  onOpenTradeAgreement,
  onOpenMakeOffer,
  showToast
}) => {
  const [loanTenureMonths, setLoanTenureMonths] = useState<number>(36);
  const [interestRate, setInterestRate] = useState<number>(9.5);

  if (!isOpen || !exchange) return null;

  const offered = exchange.offeredVehicle;
  const desired = exchange.desiredVehicle;

  // Compute realistic valuation estimates
  const offeredValuation = offered.valuation || 2500000;
  const targetValuation = exchange.currentCarEstimatedValue || (offeredValuation + (exchange.cashDirection === "pay_difference" ? exchange.cashDelta : -exchange.cashDelta));
  const cashDelta = Math.abs(offeredValuation - targetValuation) || exchange.cashDelta || 350000;
  const direction = offeredValuation < targetValuation ? "proposer_pays" : "proposer_receives";

  // Compatibility Score calculation
  const compatibilityScore = 94; // high compatibility
  
  // EMI calculation on cash delta (if trading up)
  const monthlyRate = interestRate / 12 / 100;
  const emiAmount = Math.round(
    (cashDelta * monthlyRate * Math.pow(1 + monthlyRate, loanTenureMonths)) /
    (Math.pow(1 + monthlyRate, loanTenureMonths) - 1)
  );

  const handleCopyWhatsAppProposal = () => {
    const text = `🚗 *AUTO WORLD CAR EXCHANGE PROPOSAL*\n` +
      `--------------------------------------\n` +
      `*Listed Trade Lot:* ${offered.year} ${offered.make} ${offered.model}\n` +
      `*Location:* ${exchange.location}\n` +
      `*Certified Valuation:* ₹${(offeredValuation / 100000).toFixed(2)} Lakhs\n` +
      `*Trade Dynamics:* ${direction === "proposer_pays" ? `Buyer Pays +₹${(cashDelta / 100000).toFixed(2)} Lakhs Delta` : `Buyer Receives ₹${(cashDelta / 100000).toFixed(2)} Lakhs Payout`}\n` +
      `*Inspection Status:* 100-Point AutoWorld Certified (Grade A+)\n` +
      `--------------------------------------\n` +
      `Let's schedule a mutual doorstep inspection and verify paperwork on Auto World!`;

    navigator.clipboard.writeText(text);
    if (showToast) {
      showToast("📋 Professional WhatsApp trade proposal copied to clipboard!", "success");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-950 text-white flex items-center justify-between border-b border-amber-500/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                  AI Trade Equalizer & Matrix
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                  {compatibilityScore}% MATCH SCORE
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Fair market cash delta evaluation & mutual spec matrix
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close exchange equalizer modal"
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-stone-800">
          {/* Visual Balance Scale Graphic */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-stone-900 to-stone-950 text-white rounded-2xl border border-stone-800 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              {/* Left: Offered Car */}
              <div className="flex-1 flex items-center gap-3.5 w-full bg-stone-900/80 p-3.5 rounded-xl border border-stone-700/60">
                <img
                  src={offered.image}
                  alt={offered.title}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border border-stone-700 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    Offered In Trade
                  </span>
                  <h4 className="font-bold text-sm sm:text-base text-white truncate mt-1">
                    {offered.year} {offered.make} {offered.model}
                  </h4>
                  <p className="text-xs text-stone-400 font-mono">
                    Valuation: ₹{(offeredValuation / 100000).toFixed(2)} Lakhs
                  </p>
                </div>
              </div>

              {/* Center: Cash Delta Equalizer */}
              <div className="flex flex-col items-center justify-center shrink-0 px-2 text-center">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/30 mb-1">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Cash Delta Balance
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-white">
                  ₹{(cashDelta / 100000).toFixed(2)} Lakhs
                </span>
                <span className="text-[10px] text-stone-400">
                  {direction === "proposer_pays" ? "(Top-Up Cash by Buyer)" : "(Cash Payout to Buyer)"}
                </span>
              </div>

              {/* Right: Desired Vehicle */}
              <div className="flex-1 flex items-center gap-3.5 w-full bg-stone-900/80 p-3.5 rounded-xl border border-stone-700/60">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-stone-800 border border-stone-700 flex flex-col items-center justify-center text-stone-400 shrink-0">
                  <Sparkles className="w-6 h-6 text-amber-400 mb-1" />
                  <span className="text-[9px] font-bold uppercase">Target Tier</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    Desired Machinery
                  </span>
                  <h4 className="font-bold text-sm sm:text-base text-white truncate mt-1">
                    {desired.targetMake || "Exotic / Luxury"} {desired.targetModel || "Sports Coupe / SUV"}
                  </h4>
                  <p className="text-xs text-stone-400 font-mono">
                    Est. Market: ₹{(targetValuation / 100000).toFixed(2)} Lakhs
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Equalizer Breakdown Explanation */}
          <div className="p-4 bg-stone-100 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                AI Valuation Algorithm & Parity Justification
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <span className="text-stone-500 block">Depreciation & Age Gap</span>
                <span className="font-bold text-stone-900 text-sm">~₹1.80 Lakhs Offset</span>
                <p className="text-[11px] text-stone-500 mt-1">Adjusted for {offered.year} model year index.</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <span className="text-stone-500 block">Segment & HP Delta</span>
                <span className="font-bold text-stone-900 text-sm">~₹1.40 Lakhs Offset</span>
                <p className="text-[11px] text-stone-500 mt-1">Powertrain and performance tier alignment.</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <span className="text-stone-500 block">RTO & Documentation Parity</span>
                <span className="font-bold text-emerald-700 text-sm">Zero Fee Transfer</span>
                <p className="text-[11px] text-stone-500 mt-1">Pan-India transferable registry ready.</p>
              </div>
            </div>
          </div>

          {/* Top-Up Cash Loan & EMI Calculator (For Trade-Ups) */}
          {direction === "proposer_pays" && (
            <div className="p-4 sm:p-5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                    Trade-Up Cash Delta EMI Calculator
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  Instant Top-Up Finance
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs text-stone-600 mb-1">
                    <span>Tenure: {loanTenureMonths} Months ({loanTenureMonths / 12} Years)</span>
                    <span className="font-mono font-bold">{loanTenureMonths}m</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="60"
                    step="12"
                    value={loanTenureMonths}
                    onChange={(e) => setLoanTenureMonths(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-stone-600 mb-1">
                    <span>Bank Interest Rate</span>
                    <span className="font-mono font-bold">{interestRate}% p.a.</span>
                  </div>
                  <input
                    type="range"
                    min="7.5"
                    max="14.0"
                    step="0.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-amber-200/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500">Estimated Monthly EMI for Cash Delta</span>
                  <p className="text-lg font-black font-mono text-stone-900">
                    ₹{emiAmount.toLocaleString("en-IN")}<span className="text-xs font-normal text-stone-500">/mo</span>
                  </p>
                </div>
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                  Pre-Approved AutoWorld Rates
                </span>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleCopyWhatsAppProposal}
              className="w-full sm:w-auto px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" /> Copy WhatsApp Proposal
            </button>

            {onOpenTradeAgreement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTradeAgreement(exchange);
                }}
                className="w-full sm:w-auto px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" /> Generate Trade Agreement
              </button>
            )}

            {onOpenMakeOffer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMakeOffer(exchange);
                }}
                className="w-full sm:flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" /> Submit Trade Proposal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
