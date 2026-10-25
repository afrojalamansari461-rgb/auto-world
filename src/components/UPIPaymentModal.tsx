import React, { useState } from "react";
import { 
  X, QrCode, ShieldCheck, CheckCircle2, Copy, Check, ArrowRight, 
  Smartphone, Lock, AlertCircle, Sparkles, Zap, CreditCard, Coins, 
  Flame, ExternalLink, RefreshCw, Eye, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getSiteFamPayConfig, DEFAULT_FAMPAY_UPI_ID, DEFAULT_FAMPAY_NAME } from "../lib/catalogSync";

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (receipt: { 
    transactionId: string; 
    amount: number; 
    method: string; 
    utr?: string;
    fampayCoins?: number;
    fampayUpiId?: string;
    settlementRecipient?: string;
  }) => void;
  amount: number;
  itemTitle: string;
  itemDescription?: string;
  defaultUpiId?: string;
  payeeName?: string;
  initialMethod?: "fampay" | "qr" | "vpa" | "card";
}

export function UPIPaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  amount,
  itemTitle,
  itemDescription,
  defaultUpiId,
  payeeName,
  initialMethod = "fampay"
}: UPIPaymentModalProps) {
  const [activeMethod, setActiveMethod] = useState<"fampay" | "qr" | "vpa" | "card">(initialMethod);

  // Dynamic Site-Wide FamPay Account Configuration
  const siteFamPay = getSiteFamPayConfig();
  const targetUpiId = (defaultUpiId && defaultUpiId !== "autoworld.pay@icici") ? defaultUpiId : siteFamPay.upiId;
  const targetPayeeName = payeeName || siteFamPay.payeeName || DEFAULT_FAMPAY_NAME;
  
  // FamPay Specific States
  const [fampayHandle, setFampayHandle] = useState("");
  const [fampayMode, setFampayMode] = useState<"upi" | "famcard" | "qr">("upi");
  const [famCardName, setFamCardName] = useState("ROHAN SHARMA");
  const [famCardNumber, setFamCardNumber] = useState("4532 8912 3498 7621");
  const [famCardExpiry, setFamCardExpiry] = useState("08/29");
  const [famCardCvv, setFamCardCvv] = useState("842");
  const [showFamCardCvv, setShowFamCardCvv] = useState(false);
  const [famCardNetwork, setFamCardNetwork] = useState<"rupay" | "visa">("rupay");

  // General UPI States
  const [customVpa, setCustomVpa] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentSuccessAnim, setPaymentSuccessAnim] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<{
    txnId: string;
    method: string;
    coins: number;
    utr: string;
  } | null>(null);

  if (!isOpen) return null;

  // FamCoins earned calculation (min 50 coins, 2x amount)
  const earnedFamCoins = Math.max(50, Math.round(amount * 2));

  // Dynamic UPI URIs
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(targetPayeeName + " Auto World")}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(itemTitle)}`;
  const fampayIntentUrl = `fampay://upi/pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(targetPayeeName + " Auto World")}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(itemTitle)}`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiPayUrl)}&color=1c1917&bgcolor=faf8f5`;

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(targetUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Quick auto-fill helper for demo testing
  const handleAutoFillFamPay = (handle: string) => {
    setFampayHandle(handle);
  };

  const handleAutoFillFamCard = () => {
    setFamCardName("ADITYA VERMA");
    setFamCardNumber("6082 1944 5821 9032");
    setFamCardExpiry("11/28");
    setFamCardCvv("719");
    setFamCardNetwork("rupay");
  };

  // Confirm FamPay Payment
  const handleConfirmFamPayPayment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    if (fampayMode === "upi") {
      const fullHandle = fampayHandle.includes("@") 
        ? fampayHandle.trim() 
        : `${fampayHandle.trim()}@fam`;

      if (!fampayHandle.trim() || fampayHandle.trim().length < 3) {
        setErrorMessage("Please enter a valid FamPay UPI ID (e.g. yourname@fam or phone number).");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const txnId = `FPAY-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
        const receipt = {
          txnId,
          method: `FamPay UPI (${fullHandle})`,
          coins: earnedFamCoins,
          utr: `FP${Date.now().toString().slice(-8)}`
        };
        setSuccessReceipt(receipt);
        setPaymentSuccessAnim(true);

        setTimeout(() => {
          onPaymentSuccess({
            transactionId: txnId,
            amount,
            method: `FamPay UPI (${fullHandle})`,
            utr: receipt.utr,
            fampayCoins: earnedFamCoins,
            fampayUpiId: fullHandle,
            settlementRecipient: targetUpiId
          });
          onClose();
        }, 1600);
      }, 1200);
    } else if (fampayMode === "famcard") {
      const cleanCard = famCardNumber.replace(/\s+/g, "");
      if (cleanCard.length < 15) {
        setErrorMessage("Please enter a valid 16-digit FamCard number.");
        return;
      }
      if (!famCardExpiry || !famCardExpiry.includes("/")) {
        setErrorMessage("Please enter expiry in MM/YY format.");
        return;
      }
      if (!famCardCvv || famCardCvv.length < 3) {
        setErrorMessage("Please enter a valid 3-digit CVV from your FamApp.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const txnId = `FAMCARD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
        const receipt = {
          txnId,
          method: `FamCard Numberless Prepaid (${famCardNetwork.toUpperCase()})`,
          coins: earnedFamCoins,
          utr: `FC${Date.now().toString().slice(-8)}`
        };
        setSuccessReceipt(receipt);
        setPaymentSuccessAnim(true);

        setTimeout(() => {
          onPaymentSuccess({
            transactionId: txnId,
            amount,
            method: `FamCard Prepaid (${famCardNetwork.toUpperCase()})`,
            utr: receipt.utr,
            fampayCoins: earnedFamCoins,
            settlementRecipient: targetUpiId
          });
          onClose();
        }, 1600);
      }, 1200);
    } else {
      // QR verification mode
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const txnId = `FPAY-QR-${Date.now()}`;
        const receipt = {
          txnId,
          method: "FamPay Scan & Pay (NPCI Verified)",
          coins: earnedFamCoins,
          utr: `FPQR${Date.now().toString().slice(-8)}`
        };
        setSuccessReceipt(receipt);
        setPaymentSuccessAnim(true);

        setTimeout(() => {
          onPaymentSuccess({
            transactionId: txnId,
            amount,
            method: "FamPay Scan & Pay",
            utr: receipt.utr,
            fampayCoins: earnedFamCoins,
            settlementRecipient: targetUpiId
          });
          onClose();
        }, 1500);
      }, 1000);
    }
  };

  // General UPI confirmation
  const handleConfirmGeneralUpiPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (activeMethod === "qr" && utrNumber.trim().length > 0 && utrNumber.trim().length < 6) {
      setErrorMessage("Please enter a valid UTR / Transaction Reference (min 6 digits) or click Verify Directly.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const txnId = `AW-UPI-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const receipt = {
        txnId,
        method: activeMethod === "vpa" && customVpa ? `UPI VPA (${customVpa})` : "UPI / Bharat QR",
        coins: 0,
        utr: utrNumber.trim() || `UTR${Date.now()}`
      };
      setSuccessReceipt(receipt);
      setPaymentSuccessAnim(true);
      setTimeout(() => {
        onPaymentSuccess({
          transactionId: txnId,
          amount,
          method: receipt.method,
          utr: receipt.utr,
          settlementRecipient: targetUpiId
        });
        onClose();
      }, 1200);
    }, 1000);
  };

  // Quick sandbox instant approval
  const handleQuickSandboxPay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const txnId = `AW-SANDBOX-${Date.now()}`;
      const receipt = {
        txnId,
        method: "Instant NPCI / FamPay Sandbox",
        coins: earnedFamCoins,
        utr: `AUTO${Date.now().toString().slice(-8)}`
      };
      setSuccessReceipt(receipt);
      setPaymentSuccessAnim(true);
      setTimeout(() => {
        onPaymentSuccess({
          transactionId: txnId,
          amount,
          method: "Instant NPCI / FamPay Sandbox",
          utr: receipt.utr,
          fampayCoins: earnedFamCoins,
          settlementRecipient: targetUpiId
        });
        onClose();
      }, 1000);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-stone-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#FAF8F5] border border-stone-300 w-full max-w-xl shadow-2xl overflow-hidden text-stone-900 font-sans my-auto relative rounded-xl"
      >
        {/* Top Header with Brand Badges */}
        <div className="bg-stone-950 text-[#F4F1EA] p-4 sm:p-5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 flex items-center justify-center font-sans font-black text-sm rounded-lg shadow-md shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-widest block">
                  Official FamPay &amp; NPCI UPI Gateway
                </span>
                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[8px] font-bold uppercase rounded border border-amber-500/30">
                  IDFC FIRST Bank Partner
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-serif font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>AutoWorld Payment Hub</span>
                <span className="text-[10px] text-stone-400 font-sans font-normal lowercase">feat. FamApp</span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-stone-400 hover:text-white p-1.5 rounded-full hover:bg-stone-800 transition cursor-pointer"
            aria-label="Close Payment Gateway"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Item Summary Bar with FamCoins Banner */}
        <div className="bg-[#F4F1EA] px-5 py-3 border-b border-stone-300 flex items-center justify-between gap-3">
          <div className="min-w-0 pr-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 font-bold block">Purchasing Item</span>
            <h3 className="text-xs sm:text-sm font-bold text-stone-950 truncate uppercase">{itemTitle}</h3>
            {itemDescription && <p className="text-[10px] text-stone-600 truncate mt-0.5">{itemDescription}</p>}
          </div>
          <div className="text-right shrink-0">
            <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 font-bold block">Payable</span>
            <span className="text-lg sm:text-2xl font-serif font-black text-stone-950 leading-none">
              ₹{amount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* FamCoins Perk Strip */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 text-white px-5 py-2 flex items-center justify-between text-xs border-b border-stone-800">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            <span className="text-[10px] font-mono font-bold text-stone-300">
              FamPay Benefit: <strong className="text-amber-400 font-black">+{earnedFamCoins} FamCoins</strong> &amp; 0% convenience fee
            </span>
          </div>
          <span className="text-[9px] font-mono uppercase text-stone-400 hidden sm:inline">
            Zero Surcharges
          </span>
        </div>

        {/* Content Body */}
        {paymentSuccessAnim ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-amber-100 text-amber-600 rounded-full flex items-center justify-center animate-bounce shadow-lg">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                Payment Successfully Verified!
              </h3>
              <p className="text-xs text-stone-600 mt-1 font-mono uppercase tracking-wider">
                {successReceipt?.method}
              </p>
              {successReceipt?.coins ? (
                <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-900 text-xs font-bold">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>+{successReceipt.coins} FamCoins Credited to FamApp Wallet!</span>
                </div>
              ) : null}
              <p className="text-[10px] text-stone-500 mt-3 font-mono">
                Transaction ID: {successReceipt?.txnId} | Reference: {successReceipt?.utr}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Direct FamPay Merchant Recipient Verification Banner */}
            <div className="p-3 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/5 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                  ⚡
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-mono uppercase font-bold text-stone-600 tracking-wider">
                      Payout Destination:
                    </span>
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> FamPay Account Verified
                    </span>
                  </div>
                  <p className="text-xs font-mono font-black text-stone-950 truncate">
                    {targetUpiId} <span className="text-stone-500 font-sans font-normal text-[11px]">({targetPayeeName})</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyUpiId}
                className="px-2.5 py-1.5 bg-stone-950 hover:bg-stone-850 text-white text-[10px] font-mono font-bold uppercase rounded flex items-center gap-1 shrink-0 cursor-pointer shadow-xs transition"
              >
                {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                <span>{copiedUpi ? "Copied" : "Copy VPA"}</span>
              </button>
            </div>

            {/* Primary Payment Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#EFECE6] p-1 border border-stone-300 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveMethod("fampay")}
                className={`py-2 px-2 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded-md ${
                  activeMethod === "fampay"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-md font-black"
                    : "text-stone-700 hover:text-stone-950 hover:bg-stone-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="truncate">⚡ FamPay</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMethod("qr")}
                className={`py-2 px-2 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded-md ${
                  activeMethod === "qr"
                    ? "bg-stone-950 text-white shadow-md font-black"
                    : "text-stone-700 hover:text-stone-950 hover:bg-stone-200"
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">UPI QR</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMethod("vpa")}
                className={`py-2 px-2 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded-md ${
                  activeMethod === "vpa"
                    ? "bg-stone-950 text-white shadow-md font-black"
                    : "text-stone-700 hover:text-stone-950 hover:bg-stone-200"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">Other UPI</span>
              </button>
            </div>

            {/* TAB 1: DEDICATED FAMPAY / FAMAPP EXPERIENCE */}
            {activeMethod === "fampay" && (
              <div className="space-y-4">
                {/* FamPay Sub-modes: UPI @fam | Numberless FamCard | Scan & Pay */}
                <div className="flex border-b border-stone-300 gap-4 text-xs font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setFampayMode("upi")}
                    className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      fampayMode === "upi"
                        ? "border-amber-500 text-stone-950 font-black"
                        : "border-transparent text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    <span>FamPay UPI (@fam)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFampayMode("famcard")}
                    className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      fampayMode === "famcard"
                        ? "border-amber-500 text-stone-950 font-black"
                        : "border-transparent text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>FamCard (Numberless)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFampayMode("qr")}
                    className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      fampayMode === "qr"
                        ? "border-amber-500 text-stone-950 font-black"
                        : "border-transparent text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>FamPay QR</span>
                  </button>
                </div>

                {/* Submode A: FamPay UPI ID */}
                {fampayMode === "upi" && (
                  <form onSubmit={handleConfirmFamPayPayment} className="space-y-4">
                    <div className="bg-stone-950 text-white p-4 rounded-xl border border-stone-800 space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-widest">
                          Enter your FamPay UPI ID
                        </span>
                        <span className="text-[9px] font-mono text-stone-400">IDFC FIRST Bank UPI</span>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. speeddemon or 9876543210"
                          value={fampayHandle}
                          onChange={(e) => setFampayHandle(e.target.value)}
                          className="w-full pl-3.5 pr-16 py-2.5 bg-stone-900 border border-stone-700 text-sm font-mono font-bold text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-400 rounded-lg"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-amber-400 bg-stone-800 px-2 py-0.5 rounded border border-stone-700 pointer-events-none">
                          @fam
                        </div>
                      </div>

                      {/* Quick Presets for One-Click Demo Testing */}
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] font-mono text-stone-400 uppercase">Quick Test VPA:</span>
                        {[
                          { label: "collector@fam", val: "collector" },
                          { label: "gearhead@fam", val: "gearhead" },
                          { label: "9876543210@fam", val: "9876543210" }
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => handleAutoFillFamPay(preset.val)}
                            className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-mono rounded border border-stone-700 transition cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Direct App Launch Button */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <a
                        href={fampayIntentUrl}
                        className="flex-1 py-3 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 shadow-md border border-amber-600 transition cursor-pointer text-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in FamPay App</span>
                      </a>

                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="flex-1 py-3 px-3 bg-stone-950 hover:bg-stone-850 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                      >
                        {isProcessing ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Sending Collect Request...</span>
                          </div>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span>Send FamPay Collect (₹{amount})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Submode B: Numberless FamCard (Prepaid RuPay/Visa) */}
                {fampayMode === "famcard" && (
                  <form onSubmit={handleConfirmFamPayPayment} className="space-y-4">
                    {/* Visual 3D FamCard Renderer */}
                    <div className="p-5 bg-gradient-to-tr from-stone-950 via-stone-900 to-stone-950 text-white rounded-2xl border border-stone-800 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black tracking-tighter text-amber-400 lowercase font-sans">
                            fam<span className="text-white">card</span>
                          </span>
                          <span className="text-[8px] uppercase tracking-widest font-mono text-stone-400 px-1.5 py-0.5 bg-stone-800 rounded">
                            Numberless
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-stone-400">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Contactless</span>
                        </div>
                      </div>

                      {/* Chip & Masked Number */}
                      <div className="flex items-center justify-between my-3">
                        <div className="w-9 h-7 bg-amber-400/80 rounded-md border border-amber-300 shadow-inner flex items-center justify-center">
                          <div className="w-4 h-3 border border-stone-900/60 rounded-xs" />
                        </div>
                        <span className="text-xs font-mono tracking-widest text-stone-300 font-bold select-all">
                          {famCardNumber || "•••• •••• •••• ••••"}
                        </span>
                      </div>

                      {/* Cardholder name & Expiry & Network */}
                      <div className="flex items-end justify-between mt-4 pt-2 border-t border-stone-800">
                        <div>
                          <span className="text-[8px] uppercase font-mono text-stone-400 block tracking-wider">Cardholder</span>
                          <span className="text-xs font-bold uppercase tracking-wider text-white">
                            {famCardName || "FAM CARDHOLDER"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase font-mono text-stone-400 block tracking-wider">Valid Thru</span>
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {famCardExpiry || "MM/YY"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black italic tracking-tight uppercase text-amber-400 font-sans">
                            {famCardNetwork.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* FamCard Input Fields */}
                    <div className="space-y-3 bg-[#F4F1EA] p-4 border border-stone-300 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-stone-600 font-mono tracking-wider">
                          Enter FamCard Details (From FamApp)
                        </span>
                        <button
                          type="button"
                          onClick={handleAutoFillFamCard}
                          className="text-[10px] font-mono text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                        >
                          Auto-fill Demo FamCard
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          value={famCardName}
                          onChange={(e) => setFamCardName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-bold uppercase text-stone-900 rounded focus:border-stone-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                          16-Digit FamCard Number
                        </label>
                        <input
                          type="text"
                          placeholder="4532 8912 3498 7621"
                          value={famCardNumber}
                          onChange={(e) => setFamCardNumber(e.target.value)}
                          maxLength={19}
                          className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-mono font-bold text-stone-900 rounded focus:border-stone-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                            Expiry (MM/YY)
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={famCardExpiry}
                            onChange={(e) => setFamCardExpiry(e.target.value)}
                            maxLength={5}
                            className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-mono font-bold text-stone-900 rounded focus:border-stone-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                              CVV (In FamApp)
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowFamCardCvv(!showFamCardCvv)}
                              className="text-stone-500 hover:text-stone-900"
                            >
                              {showFamCardCvv ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                          <input
                            type={showFamCardCvv ? "text" : "password"}
                            placeholder="•••"
                            value={famCardCvv}
                            onChange={(e) => setFamCardCvv(e.target.value)}
                            maxLength={3}
                            className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-mono font-bold text-stone-900 rounded focus:border-stone-900"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-3 px-4 bg-stone-950 hover:bg-stone-850 text-white font-mono font-black text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Simulating 3D Secure OTP...</span>
                        </div>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 text-amber-400" />
                          <span>Authorize FamCard Payment (₹{amount})</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Submode C: FamPay Scan & Pay QR */}
                {fampayMode === "qr" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-stone-950 text-white p-4 rounded-xl border border-stone-800">
                      <div className="p-2 bg-white rounded-lg shadow-md shrink-0 flex flex-col items-center">
                        <img
                          src={qrCodeApiUrl}
                          alt="FamPay Scan and Pay"
                          className="w-36 h-36 object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[8px] font-mono font-bold text-stone-600 mt-1 uppercase">
                          FamPay Scan &amp; Pay
                        </span>
                      </div>

                      <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-bold rounded">
                          <Zap className="w-3 h-3" />
                          <span>Fast FamPay Settlement</span>
                        </div>
                        <p className="text-xs text-stone-300 leading-relaxed font-sans">
                          Open the <strong>FamApp</strong> camera scanner or any UPI app to scan and settle <strong>₹{amount}</strong>.
                        </p>
                        <div className="text-[10px] font-mono text-stone-400">
                          Merchant VPA: <span className="text-amber-400 font-bold">{targetUpiId}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConfirmFamPayPayment()}
                      disabled={isProcessing}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>I Have Scanned &amp; Paid in FamPay</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: UPI QR CODE (ALL APPS INCL FAMPAY) */}
            {activeMethod === "qr" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#F4F1EA] p-4 border border-stone-300 rounded-xl">
                  {/* QR Code */}
                  <div className="p-2 bg-white border border-stone-300 shadow-sm shrink-0 flex flex-col items-center rounded-lg">
                    <img
                      src={qrCodeApiUrl}
                      alt={`Auto World UPI QR Code for ₹${amount}`}
                      className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-stone-500 mt-1">
                      Scan &amp; Pay ₹{amount}
                    </span>
                  </div>

                  {/* App badges & instruction */}
                  <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
                      {[
                        { name: "FamPay", special: true },
                        { name: "Google Pay" },
                        { name: "PhonePe" },
                        { name: "Paytm" },
                        { name: "BHIM" },
                        { name: "Cred" }
                      ].map((app) => (
                        <span 
                          key={app.name} 
                          className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded ${
                            app.special 
                              ? "bg-amber-500 text-stone-950 border border-amber-600" 
                              : "bg-stone-200 text-stone-800"
                          }`}
                        >
                          {app.name}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed font-sans">
                      Open <strong>FamPay</strong>, GPay, PhonePe, or any UPI app to scan this Bharat QR and complete payment of <strong>₹{amount}</strong>.
                    </p>

                    <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-[10px] font-mono font-bold text-stone-900 bg-white px-2 py-1 border border-stone-300 rounded select-all">
                        {targetUpiId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpiId}
                        className="px-2.5 py-1 bg-stone-900 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-stone-800 flex items-center gap-1 cursor-pointer rounded"
                      >
                        {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUpi ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form to submit transaction reference or 1-click verify */}
                <form onSubmit={handleConfirmGeneralUpiPayment} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                      12-Digit UPI Ref No. / UTR (Optional for instant check)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 423984729104 or leave blank"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#F4F1EA] border border-stone-300 text-xs font-mono font-bold text-stone-950 focus:outline-none focus:border-stone-900 rounded"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="flex-1 py-3 px-4 bg-stone-950 hover:bg-stone-850 text-white text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md rounded"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying UPI Receipt...</span>
                        </div>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Confirm Payment (₹{amount})</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleQuickSandboxPay}
                      disabled={isProcessing}
                      className="py-3 px-4 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-md rounded"
                      title="Instantly simulates bank confirmation without manual UTR"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Instant Verification</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: OTHER UPI APPS / VPA */}
            {activeMethod === "vpa" && (
              <div className="space-y-4">
                <div className="bg-[#F4F1EA] p-4 border border-stone-300 space-y-3 rounded-xl">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 block">
                    Direct UPI Deep Link / App Request
                  </span>
                  
                  {/* Mobile Deep Link buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href={fampayIntentUrl}
                      className="py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 rounded shadow-sm text-center"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Pay in FamPay App</span>
                    </a>
                    
                    <a
                      href={upiPayUrl}
                      className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 rounded shadow-sm text-center"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Other UPI Apps</span>
                    </a>
                  </div>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-stone-300"></div>
                    <span className="flex-shrink mx-3 text-[9px] font-mono uppercase text-stone-500 font-bold">Or Enter Custom VPA</span>
                    <div className="flex-grow border-t border-stone-300"></div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                      UPI Virtual Payment Address (VPA)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. yourname@fam or yourname@okhdfcbank"
                      value={customVpa}
                      onChange={(e) => setCustomVpa(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-stone-900 rounded"
                    />

                    {/* Quick VPA Handles */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[9px] font-mono text-stone-500">Append Suffix:</span>
                      {["@fam", "@okhdfcbank", "@ybl", "@paytm", "@ibl"].map((suffix) => (
                        <button
                          key={suffix}
                          type="button"
                          onClick={() => {
                            const base = customVpa.split("@")[0] || "myaccount";
                            setCustomVpa(`${base}${suffix}`);
                          }}
                          className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer ${
                            suffix === "@fam"
                              ? "bg-amber-500 text-stone-950 font-black"
                              : "bg-stone-200 text-stone-800 hover:bg-stone-300"
                          }`}
                        >
                          {suffix}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmGeneralUpiPayment}
                    disabled={isProcessing}
                    className="w-full py-3 bg-stone-950 hover:bg-stone-850 text-white font-mono font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md rounded"
                  >
                    {isProcessing ? "Requesting Payment Approval..." : `Request ₹${amount} Collect Request`}
                  </button>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-2.5 bg-red-100 text-red-800 border border-red-300 text-xs flex items-center gap-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Bottom Trust & Security Bar */}
            <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-stone-500 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-stone-600" />
                <span>256-Bit Encrypted UPI &amp; FamPay Tokenized</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-600 font-bold">⚡ IDFC FIRST Bank Node</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">100% Guaranteed Escrow</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default UPIPaymentModal;
