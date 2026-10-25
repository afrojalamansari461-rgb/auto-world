import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Bot, AlertCircle, Info } from "lucide-react";
import { Auction } from "../types";
import {
  modalBackdropVariants,
  modalPanelVariants,
  MagneticButton,
} from "./AnimationWrapper";

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
  minAllowed,
}) => {
  const [targetMaxBid, setTargetMaxBid] = useState<number>(
    currentAutoBidAmount ||
      Math.ceil((auction.currentBid + (auction.minIncrement || 50000) * 3) / 10000) *
        10000
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const minIncrement = auction.minIncrement || 50000;
  const estimatedIncrements = Math.max(
    1,
    Math.floor((targetMaxBid - auction.currentBid) / minIncrement)
  );

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetMaxBid < minAllowed) {
      setError(
        `Max Auto-Bid ceiling must be at least ₹${minAllowed.toLocaleString("en-IN")}`
      );
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
          {/* Smooth 0px -> 4px Backdrop Blur */}
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-[#0F0F10]/85"
          />

          <motion.div
            variants={modalPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 bg-[#F6F5F2] border-2 border-[#0F0F10] w-full max-w-lg overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-[#0F0F10] text-white flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#D5001C] text-white flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-serif font-extrabold uppercase tracking-tight text-white">
                      Algorithmic Proxy Mandate
                    </h3>
                    <span className="px-2 py-0.5 bg-white/10 text-white border border-white/20 text-[9px] font-mono font-bold uppercase tracking-widest">
                      AUTO-DEFENSE
                    </span>
                  </div>
                  <p className="text-xs font-mono text-stone-400 truncate max-w-xs">
                    {auction.title}
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                aria-label="Close auto-bid modal"
                className="w-9 h-9 text-stone-400 hover:text-white hover:bg-[#D5001C] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Content */}
            <form onSubmit={handleApply} className="p-5 sm:p-6 space-y-5 text-[#0F0F10]">
              <div className="p-4 bg-white border border-[#0F0F10]/15 text-xs text-stone-700 flex gap-3">
                <Info className="w-4 h-4 text-[#D5001C] shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-[#0F0F10] uppercase tracking-wider text-[11px]">
                    Proxy Execution Protocol:
                  </p>
                  <p className="text-stone-600 mt-1 leading-relaxed">
                    Specify your maximum authorized capital ceiling. The trading desk
                    automatically executes minimum increment counter-bids (+₹
                    {minIncrement.toLocaleString("en-IN")}) to defend your lead position
                    up to your limit.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#0F0F10] text-white text-xs tabular-nums">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block">
                    Current High Bid
                  </span>
                  <p className="font-extrabold text-white font-mono text-base mt-0.5">
                    ₹{auction.currentBid.toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block">
                    Minimum Ceiling
                  </span>
                  <p className="font-extrabold text-emerald-400 font-mono text-base mt-0.5">
                    ₹{minAllowed.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-stone-600 mb-2">
                  Authorized Maximum Ceiling (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={minAllowed}
                    step={minIncrement}
                    value={targetMaxBid}
                    onChange={(e) => setTargetMaxBid(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 bg-white border-2 border-[#0F0F10] font-mono text-lg font-extrabold text-[#0F0F10] tabular-nums outline-none"
                    placeholder={String(minAllowed)}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 mt-1.5 tabular-nums">
                  <span>CAPACITY: ~{estimatedIncrements} INCREMENTS</span>
                  <span>STEP: ₹{minIncrement.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Quick preset ceiling buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 block">
                  Quick Capital Brackets:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    auction.currentBid + minIncrement * 2,
                    auction.currentBid + minIncrement * 5,
                    auction.currentBid + minIncrement * 10,
                  ].map((presetVal) => (
                    <motion.button
                      key={presetVal}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setTargetMaxBid(presetVal)}
                      className={`px-2 py-2 border text-xs font-mono font-bold tabular-nums transition-colors cursor-pointer ${
                        targetMaxBid === presetVal
                          ? "bg-[#0F0F10] text-white border-[#0F0F10]"
                          : "bg-white text-[#0F0F10] border-[#0F0F10]/20 hover:border-[#0F0F10]"
                      }`}
                    >
                      ₹{(presetVal / 100000).toFixed(2)}L
                    </motion.button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-[#D5001C] text-[#D5001C] text-xs font-mono font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                {currentAutoBidAmount && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancelAutoBid}
                    className="px-4 py-3.5 bg-white border border-[#D5001C] text-[#D5001C] hover:bg-[#D5001C] hover:text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Revoke
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-white border border-[#0F0F10]/25 hover:border-[#0F0F10] text-[#0F0F10] font-sans font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </motion.button>
                <MagneticButton
                  type="submit"
                  magneticStrength={0.08}
                  className="flex-1 py-3.5 bg-[#D5001C] hover:bg-[#b80018] text-white font-sans font-extrabold text-xs uppercase tracking-[0.16em] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-4 h-4" /> Arm Proxy Bid
                </MagneticButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
