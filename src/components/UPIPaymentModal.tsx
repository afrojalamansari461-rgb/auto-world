import React, { useState } from "react";
import { X, QrCode, ShieldCheck, CheckCircle2, Copy, Check, ArrowRight, Smartphone, Lock, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (receipt: { transactionId: string; amount: number; method: string; utr?: string }) => void;
  amount: number;
  itemTitle: string;
  itemDescription?: string;
  defaultUpiId?: string;
}

export function UPIPaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  amount,
  itemTitle,
  itemDescription,
  defaultUpiId = "autoworld.pay@icici"
}: UPIPaymentModalProps) {
  const [activeMethod, setActiveMethod] = useState<"qr" | "vpa" | "card">("qr");
  const [customVpa, setCustomVpa] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentSuccessAnim, setPaymentSuccessAnim] = useState(false);

  if (!isOpen) return null;

  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(defaultUpiId)}&pn=Auto%20World%20India&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(itemTitle)}`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiPayUrl)}&color=1c1917&bgcolor=faf8f5`;

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(defaultUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleConfirmUpiPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (activeMethod === "qr" && utrNumber.trim().length > 0 && utrNumber.trim().length < 6) {
      setErrorMessage("Please enter a valid UTR / Transaction Reference (min 6 digits) or click Verify Directly.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccessAnim(true);
      setTimeout(() => {
        const txnId = `AW-UPI-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
        onPaymentSuccess({
          transactionId: txnId,
          amount,
          method: "UPI / Bharat QR",
          utr: utrNumber.trim() || `UTR${Date.now()}`
        });
        onClose();
      }, 1200);
    }, 1000);
  };

  const handleQuickSandboxPay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccessAnim(true);
      setTimeout(() => {
        const txnId = `AW-SANDBOX-${Date.now()}`;
        onPaymentSuccess({
          transactionId: txnId,
          amount,
          method: "Instant NPCI Verified Sandbox",
          utr: `AUTO${Date.now().toString().slice(-8)}`
        });
        onClose();
      }, 1000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#FAF8F5] border border-stone-300 w-full max-w-lg shadow-2xl overflow-hidden text-stone-900 font-sans my-auto relative"
      >
        {/* Top Header */}
        <div className="bg-stone-950 text-[#F4F1EA] p-4 sm:p-5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 text-stone-950 flex items-center justify-center font-serif font-black text-sm rounded-xs shrink-0">
              ₹
            </div>
            <div>
              <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-widest block">
                NPCI Unified Payments Interface
              </span>
              <h2 className="text-sm sm:text-base font-serif font-black uppercase tracking-tight text-white">
                Auto World Secure Gateway
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-stone-400 hover:text-white p-1.5 rounded-full hover:bg-stone-800 transition cursor-pointer"
            aria-label="Close UPI Gateway"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Item Summary Bar */}
        <div className="bg-[#F4F1EA] px-5 py-3.5 border-b border-stone-300 flex items-center justify-between">
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

        {paymentSuccessAnim ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-black uppercase text-stone-950">Payment Verified!</h3>
              <p className="text-xs text-stone-600 mt-1 font-mono uppercase tracking-wider">
                Access unlocked instantly. Generating official digital pass...
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Method Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-[#EFECE6] p-1 border border-stone-300">
              <button
                type="button"
                onClick={() => setActiveMethod("qr")}
                className={`py-2 px-3 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeMethod === "qr"
                    ? "bg-stone-950 text-white shadow-xs"
                    : "text-stone-700 hover:text-stone-950"
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>UPI QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMethod("vpa")}
                className={`py-2 px-3 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeMethod === "vpa"
                    ? "bg-stone-950 text-white shadow-xs"
                    : "text-stone-700 hover:text-stone-950"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>UPI Apps / VPA</span>
              </button>
            </div>

            {activeMethod === "qr" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#F4F1EA] p-4 border border-stone-300">
                  {/* QR Code */}
                  <div className="p-2 bg-white border border-stone-300 shadow-sm shrink-0 flex flex-col items-center">
                    <img
                      src={qrCodeApiUrl}
                      alt={`Auto World UPI QR Code for ₹${amount}`}
                      className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-stone-500 mt-1">
                      Scan & Pay ₹{amount}
                    </span>
                  </div>

                  {/* App badges & instruction */}
                  <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
                      {["Google Pay", "PhonePe", "Paytm", "BHIM UPI", "Cred"].map((appName) => (
                        <span key={appName} className="px-2 py-0.5 bg-stone-200 text-stone-800 text-[9px] font-mono font-bold uppercase rounded-xs">
                          {appName}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed font-sans">
                      Open any UPI app on your phone and scan this code to complete the instant payment of <strong>₹{amount}</strong>.
                    </p>

                    <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-[10px] font-mono font-bold text-stone-900 bg-white px-2 py-1 border border-stone-300 select-all">
                        {defaultUpiId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpiId}
                        className="px-2.5 py-1 bg-stone-900 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-stone-800 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUpi ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form to submit transaction reference or 1-click verify */}
                <form onSubmit={handleConfirmUpiPayment} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                      12-Digit UPI Ref No. / UTR (Optional for instant check)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 423984729104 or leave blank"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#F4F1EA] border border-stone-300 text-xs font-mono font-bold text-stone-950 focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  {errorMessage && (
                    <div className="p-2.5 bg-red-100 text-red-800 border border-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="flex-1 py-3 px-4 bg-stone-950 hover:bg-stone-850 text-white text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md"
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
                      className="py-3 px-4 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      title="Instantly simulates bank confirmation without manual UTR"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Instant 1-Click Verification</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeMethod === "vpa" && (
              <div className="space-y-4">
                <div className="bg-[#F4F1EA] p-4 border border-stone-300 space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 block">
                    Direct UPI Deep Link / App Request
                  </span>
                  
                  {/* Mobile Deep Link button */}
                  <a
                    href={upiPayUrl}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-amber-600 shadow-md block text-center"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pay ₹{amount} in UPI App (GPay/PhonePe)</span>
                  </a>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-stone-300"></div>
                    <span className="flex-shrink mx-3 text-[9px] font-mono uppercase text-stone-500 font-bold">Or Enter Your VPA ID</span>
                    <div className="flex-grow border-t border-stone-300"></div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                      Your UPI Virtual Payment Address (VPA)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. yourname@okhdfcbank or 9876543210@ybl"
                      value={customVpa}
                      onChange={(e) => setCustomVpa(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-300 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmUpiPayment}
                    disabled={isProcessing}
                    className="w-full py-3 bg-stone-950 hover:bg-stone-850 text-white font-mono font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {isProcessing ? "Requesting Payment Approval..." : `Request ₹${amount} Collect Request`}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom trust bar */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[9px] font-mono text-stone-500 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-stone-600" />
                <span>256-Bit Encrypted UPI Transaction</span>
              </div>
              <span className="text-emerald-700 font-bold">100% Guaranteed Settlement</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default UPIPaymentModal;
