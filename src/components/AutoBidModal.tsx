import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Bot, ShieldCheck, Zap, ArrowRight, CheckCircle2, AlertCircle, TrendingUp, Info } from "lucide-react";
import { Auction } from "../types";

interface AutoBidModalProps {
  isOpen: boolean;
  onClose: () => void;
  auction: Auction;
  currentAutoBidAmount: number | null;
  onSaveAutoBid: (maxAmount: number | null) => void;
  minAllowed: number;
}

export const AutoBidModal: React.FC<AutoBidModalProps> = ({
  isOpen,
  onClose,
  auction,
  currentAutoBidAmount,
  onSaveAutoBid,
  minAllowed
}) => {
  const [targetMaxBid, setTargetMaxBid] = useState<number>(
    currentAutoBidAmount || Math.ceil((auction.currentBid + (auction.minIncrement || 50000) * 3) / 10000) * 10000
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const minIncrement = auction.minIncrement || 50000;
  const estimatedIncrements = Math.max(1, Math.floor((targetMaxBid - auction.currentBid) / minIncrement));

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetMaxBid < minAllowed) {
      setError(`Max Auto-Bid ceiling must be at least ₹${minAllowed.toLocaleString("en-IN")}`);
      return;
    }
    setError(null);
    onSaveAutoBid(targetMaxBid);
    onClose();
  };

  const handleCancelAutoBid = () => {
    onSaveAutoBid(null);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-950 text-white flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                  Proxy Auto-Bid Bot
                </h3>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                  AI FLOOR DEFENSE
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {auction.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close auto-bid modal"
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleApply} className="p-5 sm:p-6 space-y-5 text-stone-800">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-900 flex gap-3">
            <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">How Proxy Auto-Bidding Works:</p>
              <p className="text-amber-800/90 mt-1">
                Enter the maximum amount you are willing to pay. The system will automatically place the minimum increment bids (+₹{minIncrement.toLocaleString("en-IN")}) on your behalf to keep you in first place, only up to your ceiling.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs">
            <div>
              <span className="text-stone-500">Current High Bid</span>
              <p className="font-bold text-stone-900 font-mono text-sm sm:text-base">
                ₹{auction.currentBid.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Minimum Allowed Ceiling</span>
              <p className="font-bold text-emerald-700 font-mono text-sm sm:text-base">
                ₹{minAllowed.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Your Maximum Proxy Bid Ceiling (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">₹</span>
              <input
                type="number"
                min={minAllowed}
                step={minIncrement}
                value={targetMaxBid}
                onChange={(e) => setTargetMaxBid(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 bg-white border-2 border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl font-mono text-lg font-bold text-stone-900 outline-none transition-all"
                placeholder={String(minAllowed)}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-stone-500 mt-1.5">
              <span>Approx. {estimatedIncrements} automated counter-bid steps</span>
              <span>Increment step: ₹{minIncrement.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Quick preset ceiling buttons */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-stone-500">Quick Ceiling Presets:</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                auction.currentBid + minIncrement * 2,
                auction.currentBid + minIncrement * 5,
                auction.currentBid + minIncrement * 10
              ].map((presetVal) => (
                <button
                  key={presetVal}
                  type="button"
                  onClick={() => setTargetMaxBid(presetVal)}
                  className={`px-2 py-1.5 border rounded-lg text-xs font-mono font-bold transition-all ${
                    targetMaxBid === presetVal
                      ? "bg-amber-500 text-stone-950 border-amber-600 shadow-sm"
                      : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  ₹{(presetVal / 100000).toFixed(2)}L
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {currentAutoBidAmount && (
              <button
                type="button"
                onClick={handleCancelAutoBid}
                className="px-4 py-3 bg-stone-200 hover:bg-rose-100 hover:text-rose-700 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Disable Bot
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Bot className="w-4 h-4" /> Activate Auto-Bid
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
