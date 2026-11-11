import React, { useState, useEffect, useRef } from "react";
import {
  Star,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Car,
  Wrench,
  MapPin,
  User,
  FileCheck,
  X,
  Clock,
  Camera,
  Send,
  LogIn,
  Lock,
  Mail,
  Tag,
  RefreshCw,
} from "lucide-react";
import { motion } from "motion/react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, googleProvider, signInWithPopup } from "../firebase";
import {
  submitNewBuyerTestimonial,
  VerificationAttachment,
  BuyerTestimonial,
  VerifiedTransactionLog,
  verifyUserBuyerSellerLogs,
} from "../lib/testimonialsService";

interface SubmitTestimonialFormProps {
  onSubmitted?: (newTestimonial: BuyerTestimonial) => void;
  onCancel?: () => void;
  onNavigateTab?: (tab: string) => void;
  defaultOpen?: boolean;
}

export default function SubmitTestimonialForm({
  onSubmitted,
  onCancel,
  onNavigateTab,
}: SubmitTestimonialFormProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [logsChecking, setLogsChecking] = useState<boolean>(false);
  const [verifiedLogs, setVerifiedLogs] = useState<VerifiedTransactionLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string>("");

  const [buyerName, setBuyerName] = useState("");
  const [buyerTitle, setBuyerTitle] = useState("Verified Buyer");
  const [transactionRole, setTransactionRole] = useState<"Verified Buyer" | "Verified Seller">(
    "Verified Buyer"
  );
  const [location, setLocation] = useState("Mumbai, MH");
  const [itemCategory, setItemCategory] = useState<"Vehicle Acquisition" | "Motorsport Hardware">(
    "Vehicle Acquisition"
  );
  const [purchasedItem, setPurchasedItem] = useState("");
  const [dossierRef, setDossierRef] = useState("REF #AW-VERIFIED");
  const [rating, setRating] = useState<number>(5.0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  // Image verification upload state
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string>("");
  const [deliveryPhotoLabel, setDeliveryPhotoLabel] = useState<string>(
    "Vehicle / Part Handover Photo"
  );
  const [invoiceProofUrl, setInvoiceProofUrl] = useState<string>("");
  const [invoiceProofLabel, setInvoiceProofLabel] = useState<string>(
    "Purchase / Sale Invoice Proof"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEntry, setSubmittedEntry] = useState<BuyerTestimonial | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const deliveryFileRef = useRef<HTMLInputElement>(null);
  const invoiceFileRef = useRef<HTMLInputElement>(null);

  const applyVerifiedLog = (log: VerifiedTransactionLog) => {
    setSelectedLogId(log.id);
    setTransactionRole(log.role);
    setBuyerTitle(log.role === "Verified Seller" ? "Verified Seller & Owner" : "Verified Buyer & Owner");
    setItemCategory(log.itemCategory);
    setPurchasedItem(log.itemTitle);
    setDossierRef(log.dossierRef);
    if (log.location) {
      setLocation(log.location);
    }
  };

  const checkUserEligibility = async (usr: FirebaseUser | null) => {
    if (!usr || usr.isAnonymous || !usr.email) {
      setVerifiedLogs([]);
      setLogsChecking(false);
      return;
    }

    setLogsChecking(true);
    try {
      if (usr.displayName && !buyerName) {
        setBuyerName(usr.displayName);
      } else if (usr.email && !buyerName) {
        const namePart = usr.email.split("@")[0].replace(/[._0-9]/g, " ").trim();
        if (namePart) {
          setBuyerName(
            namePart
              .split(" ")
              .filter(Boolean)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")
          );
        }
      }

      const logs = await verifyUserBuyerSellerLogs(usr.uid, usr.email);
      setVerifiedLogs(logs);
      if (logs.length > 0) {
        applyVerifiedLog(logs[0]);
      }
    } catch (e) {
      console.error("Failed to verify user transaction logs:", e);
    } finally {
      setLogsChecking(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
      setAuthChecking(false);
      checkUserEligibility(usr);
    });
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        setCurrentUser(res.user);
        await checkUserEligibility(res.user);
      }
    } catch (err: any) {
      if (onNavigateTab) {
        onNavigateTab("login");
      } else {
        setErrorMsg("Please sign in using the Sign In button in the top navigation bar.");
      }
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "delivery" | "invoice"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        if (target === "delivery") {
          setDeliveryPhotoUrl(reader.result);
          setDeliveryPhotoLabel(file.name.replace(/\.[^/.]+$/, "") || "Handover Photo");
        } else {
          setInvoiceProofUrl(reader.result);
          setInvoiceProofLabel(file.name.replace(/\.[^/.]+$/, "") || "Transaction Proof");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser || currentUser.isAnonymous || !currentUser.email) {
      setErrorMsg("You must be signed in with your Gmail account to submit a testimonial.");
      return;
    }

    if (verifiedLogs.length === 0) {
      setErrorMsg(
        "Only verified buyers and sellers with a recorded transaction on their Gmail account can submit a testimonial."
      );
      return;
    }

    if (!buyerName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!purchasedItem.trim()) {
      setErrorMsg("Please select or confirm the vehicle or part you bought or sold.");
      return;
    }
    if (comment.trim().length < 15) {
      setErrorMsg("Please write a review comment (at least 15 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      const verificationImages: VerificationAttachment[] = [];
      if (deliveryPhotoUrl.trim()) {
        verificationImages.push({
          id: `ver-del-${Date.now()}`,
          label: deliveryPhotoLabel || "Handover Photo",
          type: "delivery_photo",
          imageUrl: deliveryPhotoUrl.trim(),
          verified: true,
        });
      }
      if (invoiceProofUrl.trim()) {
        verificationImages.push({
          id: `ver-inv-${Date.now() + 1}`,
          label: invoiceProofLabel || "Transaction Proof",
          type: "invoice_proof",
          imageUrl: invoiceProofUrl.trim(),
          verified: true,
        });
      }

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const now = new Date();
      const purchaseDateStr = `Verified ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

      const created = await submitNewBuyerTestimonial(
        {
          buyerName: buyerName.trim(),
          buyerTitle: buyerTitle.trim() || transactionRole,
          buyerEmail: currentUser.email.toLowerCase(),
          buyerUid: currentUser.uid,
          transactionRole,
          location: location.trim() || "Mumbai, MH",
          purchasedItem: purchasedItem.trim(),
          itemCategory,
          rating: Number(rating),
          comment: comment.trim(),
          purchaseDate: purchaseDateStr,
          dossierRef: dossierRef.trim() || "REF #AW-VERIFIED",
          verifiedPurchase: true,
          verificationImages,
        },
        false
      );

      setSubmittedEntry(created);
      if (onSubmitted) {
        onSubmitted(created);
      }
    } catch (err) {
      console.error("Failed to submit testimonial:", err);
      setErrorMsg("Could not submit your testimonial. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading Auth / Transaction Logs State
  if (authChecking || logsChecking) {
    return (
      <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl p-8 text-center space-y-3 max-w-2xl mx-auto shadow-md">
        <RefreshCw className="w-6 h-6 text-stone-700 animate-spin mx-auto" />
        <h3 className="text-base font-serif font-bold text-stone-950">
          Verifying Account & Transaction History...
        </h3>
        <p className="text-xs text-stone-600 font-sans">
          Checking your Gmail account for verified buying or selling records on Auto World.
        </p>
      </div>
    );
  }

  // 2. Not Signed In Gate
  if (!currentUser || currentUser.isAnonymous || !currentUser.email) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl p-6 sm:p-8 shadow-xl max-w-2xl mx-auto text-center space-y-5"
      >
        <div className="w-12 h-12 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-amber-400 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Buyers & Sellers Only
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-950">
            Sign In with Your Gmail to Submit a Review
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 font-sans max-w-lg mx-auto leading-relaxed">
            Only authenticated users whose Gmail account has a verified record of buying or selling a vehicle or part on Auto World can submit a testimonial.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="px-6 py-3 bg-stone-950 hover:bg-stone-800 text-[#F4F1EA] rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shadow-md"
          >
            <LogIn className="w-4 h-4 text-amber-400" />
            <span>Sign In with Gmail</span>
          </button>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("login")}
              className="px-5 py-3 bg-[#F4F1EA] hover:bg-stone-200 text-stone-900 border border-stone-300 rounded-xl text-xs font-sans font-bold uppercase tracking-wider cursor-pointer transition"
            >
              Open Login Page
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3 text-stone-600 hover:text-stone-950 text-xs font-sans font-semibold cursor-pointer transition"
            >
              Cancel
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // 3. Signed In, But No Buy or Sell Log Found on This Gmail
  if (verifiedLogs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl p-6 sm:p-8 shadow-xl max-w-2xl mx-auto text-center space-y-5"
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-[#F4F1EA] rounded-lg text-[10px] font-mono font-bold">
            <Mail className="w-3 h-3 text-amber-400" />
            <span>Signed in as: {currentUser.email}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-950">
            No Verified Buy or Sell Record Found
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 font-sans max-w-lg mx-auto leading-relaxed">
            We checked <strong className="text-stone-900">{currentUser.email}</strong> against our transaction records, and no completed purchase, active Buyer Pass, or vehicle/part sale log was found for this Gmail account. Only verified buyers and sellers can submit a testimonial.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onNavigateTab && (
            <>
              <button
                type="button"
                onClick={() => onNavigateTab("buy")}
                className="px-5 py-2.5 bg-stone-950 hover:bg-stone-800 text-[#F4F1EA] rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
              >
                <Car className="w-3.5 h-3.5 text-amber-400" />
                <span>Buy a Car / Pass</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab("sell")}
                className="px-5 py-2.5 bg-[#F4F1EA] hover:bg-stone-200 text-stone-900 border border-stone-300 rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
              >
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>Sell a Vehicle</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => checkUserEligibility(currentUser)}
            className="px-4 py-2.5 bg-[#F4F1EA] hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Check My Gmail Logs</span>
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-stone-600 hover:text-stone-950 text-xs font-sans font-semibold cursor-pointer transition"
            >
              Close
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // 4. Submitted Confirmation State
  if (submittedEntry) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 text-center max-w-2xl mx-auto"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-md">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            Sent for Review
          </div>
          <h3 className="text-2xl font-serif font-black text-stone-950">
            Thank You for Your Verified Review
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 font-sans max-w-lg mx-auto leading-relaxed">
            Thank you, <strong className="text-stone-900">{submittedEntry.buyerName}</strong>. Your verified{" "}
            <strong className="text-stone-900">{submittedEntry.transactionRole || "Buyer"}</strong> review for{" "}
            <strong className="text-stone-900">{submittedEntry.purchasedItem}</strong> linked to{" "}
            <span className="font-mono text-stone-900">{submittedEntry.buyerEmail}</span> has been submitted and will appear on the Home page once approved.
          </p>
        </div>

        <div className="p-4 bg-[#F4F1EA] border border-stone-300 rounded-xl text-left space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= Math.round(submittedEntry.rating)
                      ? "text-amber-500 fill-amber-500"
                      : "text-stone-300"
                  }`}
                />
              ))}
              <span className="text-xs font-mono font-bold text-stone-900 ml-1">
                {submittedEntry.rating.toFixed(1)}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded text-[9px] font-mono font-bold uppercase">
              {submittedEntry.transactionRole || "Verified Buyer"}
            </span>
          </div>
          <p className="text-xs text-stone-700 italic">"{submittedEntry.comment}"</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 bg-stone-950 hover:bg-stone-800 text-[#F4F1EA] rounded-xl text-xs font-sans font-bold uppercase tracking-wider cursor-pointer transition"
            >
              Done & Close
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // 5. Verified Buyer / Seller Form
  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      onSubmit={handleSubmit}
      className="bg-[#FAF8F5] border-2 border-stone-900/90 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-stone-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Gmail Verified: {currentUser.email}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-900 text-amber-400 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider">
              {verifiedLogs.length} Verified {verifiedLogs.length === 1 ? "Transaction" : "Transactions"} Found
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-950">
            Submit Your Verified Buyer / Seller Testimonial
          </h3>
          <p className="text-xs text-stone-600 font-sans mt-1">
            Select your verified purchase or sale record below and share your experience with the Auto World community.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-9 h-9 rounded-xl bg-[#F4F1EA] hover:bg-stone-200 text-stone-700 flex items-center justify-center border border-stone-300 cursor-pointer transition shrink-0"
            title="Close Form"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs font-sans font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-600 hover:text-red-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Verified Transaction Log Selector from User's Gmail */}
      <div className="p-4 bg-[#F4F1EA] border border-stone-300 rounded-xl space-y-2.5">
        <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          Select Your Verified Bought or Sold Record ({currentUser.email}) *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {verifiedLogs.map((log) => {
            const isSelected = selectedLogId === log.id;
            return (
              <button
                key={log.id}
                type="button"
                onClick={() => applyVerifiedLog(log)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start justify-between gap-2 ${
                  isSelected
                    ? "bg-stone-950 text-[#F4F1EA] border-stone-950 shadow-sm"
                    : "bg-[#FAF8F5] text-stone-900 border-stone-300 hover:border-stone-500"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        log.role === "Verified Buyer"
                          ? "bg-emerald-900 text-emerald-200"
                          : "bg-amber-500 text-stone-950"
                      }`}
                    >
                      {log.role}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? "text-stone-400" : "text-stone-500"
                      }`}
                    >
                      {log.dateLabel}
                    </span>
                  </div>
                  <p className="text-xs font-serif font-bold truncate">{log.itemTitle}</p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 1: Buyer / Seller Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-700" />
            Your Full Name *
          </label>
          <input
            type="text"
            required
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Your Full Name"
            className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-950 font-medium focus:outline-none focus:border-stone-950"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-700">
            Verified Role
          </label>
          <input
            type="text"
            value={buyerTitle}
            onChange={(e) => setBuyerTitle(e.target.value)}
            placeholder="Verified Buyer / Verified Seller"
            className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-950 font-medium focus:outline-none focus:border-stone-950"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-700" />
            City & State *
          </label>
          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Mumbai, MH"
            className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-950 font-medium focus:outline-none focus:border-stone-950"
          />
        </div>
      </div>

      {/* Row 2: Vehicle / Part & Rating Input */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-700">
            Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setItemCategory("Vehicle Acquisition")}
              className={`py-2.5 px-3 rounded-xl border text-xs font-sans font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                itemCategory === "Vehicle Acquisition"
                  ? "bg-stone-950 text-[#F4F1EA] border-stone-950 shadow-xs"
                  : "bg-[#F4F1EA] text-stone-700 border-stone-300 hover:border-stone-500"
              }`}
            >
              <Car className="w-3.5 h-3.5 text-amber-400" />
              <span>Vehicle</span>
            </button>
            <button
              type="button"
              onClick={() => setItemCategory("Motorsport Hardware")}
              className={`py-2.5 px-3 rounded-xl border text-xs font-sans font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                itemCategory === "Motorsport Hardware"
                  ? "bg-stone-950 text-[#F4F1EA] border-stone-950 shadow-xs"
                  : "bg-[#F4F1EA] text-stone-700 border-stone-300 hover:border-stone-500"
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>Hardware</span>
            </button>
          </div>
        </div>

        <div className="md:col-span-5 space-y-1.5">
          <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-700">
            Bought or Sold Vehicle / Part *
          </label>
          <input
            type="text"
            required
            value={purchasedItem}
            onChange={(e) => setPurchasedItem(e.target.value)}
            placeholder="Vehicle or Motorsport Part Name"
            className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-950 font-medium focus:outline-none focus:border-stone-950"
          />
        </div>

        {/* Interactive Star Rating Selector */}
        <div className="md:col-span-3 space-y-1.5">
          <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-700">
            Rating *
          </label>
          <div className="p-2.5 bg-[#F4F1EA] border border-stone-300 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const activeVal = hoverRating !== null ? hoverRating : rating;
                const isFilled = starVal <= Math.round(activeVal);
                return (
                  <button
                    key={starVal}
                    type="button"
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(starVal)}
                    className="p-0.5 cursor-pointer transition-transform hover:scale-110"
                    aria-label={`Rate ${starVal} stars`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        isFilled ? "text-amber-500 fill-amber-500" : "text-stone-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <select
              value={rating}
              onChange={(e) => setRating(parseFloat(e.target.value))}
              className="bg-stone-950 text-amber-400 font-mono text-xs font-bold px-2 py-1 rounded-lg border border-stone-800 cursor-pointer"
            >
              <option value={5.0}>5.0 ★</option>
              <option value={4.9}>4.9 ★</option>
              <option value={4.8}>4.8 ★</option>
              <option value={4.5}>4.5 ★</option>
              <option value={4.0}>4.0 ★</option>
              <option value={3.5}>3.5 ★</option>
              <option value={3.0}>3.0 ★</option>
            </select>
          </div>
        </div>
      </div>

      {/* Row 3: Comment Textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-700">
            Your Review *
          </label>
          <span className="text-[10px] font-mono text-stone-500">
            {comment.length} / 500 characters
          </span>
        </div>
        <textarea
          required
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your buying or selling experience on Auto World..."
          className="w-full p-3.5 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-950 font-sans leading-relaxed focus:outline-none focus:border-stone-950"
        />
      </div>

      {/* Row 4: Optional Delivery / Handover Photos */}
      <div className="space-y-3 pt-2 border-t border-stone-200">
        <div>
          <h4 className="text-xs font-serif font-black uppercase tracking-wider text-stone-950 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-amber-700" />
            Optional Delivery or Vehicle Photos
          </h4>
          <p className="text-[11px] text-stone-600 font-sans">
            Optionally upload a photo of your vehicle handover or invoice proof.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#F4F1EA] border border-stone-300 rounded-xl flex items-start gap-3.5">
            <div className="w-16 h-16 rounded-xl bg-stone-200 overflow-hidden shrink-0 border border-stone-300 flex items-center justify-center">
              {deliveryPhotoUrl ? (
                <img
                  src={deliveryPhotoUrl}
                  alt={deliveryPhotoLabel}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-5 h-5 text-stone-500" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans uppercase tracking-wider font-bold text-stone-800">
                  Handover Photo
                </span>
                <button
                  type="button"
                  onClick={() => deliveryFileRef.current?.click()}
                  className="text-[10px] font-sans font-bold text-stone-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  Upload Photo
                </button>
                <input
                  ref={deliveryFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "delivery")}
                />
              </div>
              <input
                type="text"
                value={deliveryPhotoUrl}
                onChange={(e) => setDeliveryPhotoUrl(e.target.value)}
                placeholder="Or paste image URL..."
                className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-stone-300 rounded-lg text-[11px] font-sans text-stone-700"
              />
            </div>
          </div>

          <div className="p-4 bg-[#F4F1EA] border border-stone-300 rounded-xl flex items-start gap-3.5">
            <div className="w-16 h-16 rounded-xl bg-stone-200 overflow-hidden shrink-0 border border-stone-300 flex items-center justify-center">
              {invoiceProofUrl ? (
                <img
                  src={invoiceProofUrl}
                  alt={invoiceProofLabel}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FileCheck className="w-5 h-5 text-stone-500" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans uppercase tracking-wider font-bold text-stone-800">
                  Ownership / Proof Photo
                </span>
                <button
                  type="button"
                  onClick={() => invoiceFileRef.current?.click()}
                  className="text-[10px] font-sans font-bold text-stone-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  Upload Photo
                </button>
                <input
                  ref={invoiceFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "invoice")}
                />
              </div>
              <input
                type="text"
                value={invoiceProofUrl}
                onChange={(e) => setInvoiceProofUrl(e.target.value)}
                placeholder="Or paste image URL..."
                className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-stone-300 rounded-lg text-[11px] font-sans text-stone-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Submit Bar */}
      <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-stone-600 font-sans">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Verified as <strong>{transactionRole}</strong> via <strong>{currentUser.email}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-[#F4F1EA] hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-sans font-bold uppercase tracking-wider cursor-pointer transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-stone-950 hover:bg-stone-800 text-[#F4F1EA] rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shadow-md disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSubmitting ? "Submitting..." : "Submit Verified Review"}</span>
          </button>
        </div>
      </div>
    </motion.form>
  );
}
