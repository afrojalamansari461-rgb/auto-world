import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, PhoneCall, CheckCircle2, Clock, Calendar, MessageSquare, ShieldCheck, User, Phone } from "lucide-react";
import { Vehicle } from "../types";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { CelebrationAnimation, fireCelebrationConfetti } from "./CelebrationAnimation";

interface CallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: Vehicle | null;
  sellerInfo?: { name?: string; phone?: string; email?: string } | null;
  currentUser?: any;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export const CallbackModal: React.FC<CallbackModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  sellerInfo,
  currentUser,
  showToast,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow === "hidden" ? "" : originalOverflow;
    };
  }, [isOpen]);

  const targetSellerName = sellerInfo?.name || vehicle?.sellerName || "AutoWorld Concierge Desk";
  const targetSellerPhone = sellerInfo?.phone || vehicle?.sellerPhone || "+919920155667";

  const [fullName, setFullName] = useState<string>(currentUser?.displayName || "");
  const [phoneNumber, setPhoneNumber] = useState<string>(currentUser?.phoneNumber || "");
  const [timeSlot, setTimeSlot] = useState<string>("ASAP (Within 15 minutes)");
  const [queryTopic, setQueryTopic] = useState<string>(
    vehicle ? `Inquiry regarding ${vehicle.title}` : "General Vehicle Buying & Valuation Query"
  );
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      showToast?.("Please enter a valid contact phone number.", "error");
      return;
    }

    setIsSubmitting(true);
    const callbackRef = `CB-${Math.floor(100000 + Math.random() * 900000)}`;

    const callbackData = {
      callbackRef,
      vehicleId: vehicle?.id || null,
      vehicleTitle: vehicle?.title || "General Query",
      vehicleImage: vehicle?.image || vehicle?.photos?.[0]?.src || "",
      vehiclePrice: vehicle?.price || 0,
      sellerName: targetSellerName,
      sellerPhone: targetSellerPhone,
      sellerEmail: vehicle?.sellerEmail || "",
      sellerUserId: (vehicle as any)?.userId || "",
      listingId: (vehicle as any)?.listingId || "",
      fullName: fullName.trim() || "Interested Buyer",
      phoneNumber: phoneNumber.trim(),
      timeSlot,
      queryTopic,
      note: note.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
    };

    try {
      if (db) {
        await addDoc(collection(db, "callback_requests"), callbackData);
      }

      const existing = JSON.parse(localStorage.getItem("autoWorld_callback_requests") || "[]");
      existing.unshift(callbackData);
      localStorage.setItem("autoWorld_callback_requests", JSON.stringify(existing));

      window.dispatchEvent(new CustomEvent("autoworld_requests_updated"));

      setSubmittedData(callbackData);
      fireCelebrationConfetti();
      showToast?.(`Callback request #${callbackRef} logged! Advisor will call you shortly.`, "success");
    } catch (err) {
      console.error("Callback registration error:", err);
      setSubmittedData(callbackData);
      showToast?.(`Callback logged locally! Reference: #${callbackRef}`, "info");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppRedirect = () => {
    const text = encodeURIComponent(
      `Hello ${targetSellerName}, I logged a callback request (#${submittedData?.callbackRef || "AW"}) for ${
        vehicle ? vehicle.title : "a vehicle inquiry"
      }. My phone is ${phoneNumber}. Please get back to me.`
    );
    window.open(`https://wa.me/${targetSellerPhone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-stone-950 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-white leading-tight">
                Request Instant Callback
              </h3>
              <p className="text-xs text-stone-300 truncate max-w-xs">
                Speak directly with {targetSellerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {!submittedData ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Context Summary */}
              {vehicle && (
                <div className="p-3 bg-white border border-stone-250 rounded-xl flex items-center gap-3 shadow-2xs">
                  <img
                    src={vehicle.image || vehicle.photos?.[0]?.src}
                    alt={vehicle.title}
                    className="w-14 h-11 object-cover rounded-md border border-stone-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-stone-900 truncate">{vehicle.title}</h4>
                    <p className="text-[11px] font-semibold text-amber-700">
                      ₹{vehicle.price.toLocaleString("en-IN")} • {vehicle.location || "Mumbai"}
                    </p>
                  </div>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1">
                  <User className="w-3.5 h-3.5 inline mr-1 text-stone-500" />
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-950 focus:ring-2 focus:ring-stone-950"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1">
                  <Phone className="w-3.5 h-3.5 inline mr-1 text-amber-700" />
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-950 focus:ring-2 focus:ring-stone-950"
                />
              </div>

              {/* Time Slot */}
              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1">
                  <Clock className="w-3.5 h-3.5 inline mr-1 text-stone-500" />
                  Preferred Callback Time
                </label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-950 focus:ring-2 focus:ring-stone-950 cursor-pointer"
                >
                  <option>ASAP (Within 15 minutes)</option>
                  <option>Today Evening (4:00 PM - 7:00 PM)</option>
                  <option>Tomorrow Morning (10:00 AM - 1:00 PM)</option>
                  <option>Tomorrow Afternoon (2:00 PM - 5:00 PM)</option>
                </select>
              </div>

              {/* Query Topic */}
              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1">
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1 text-stone-500" />
                  Primary Discussion Topic
                </label>
                <select
                  value={queryTopic}
                  onChange={(e) => setQueryTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-950 focus:ring-2 focus:ring-stone-950 cursor-pointer"
                >
                  <option>Vehicle Inquiry & Final Pricing</option>
                  <option>Test Drive & Inspection Booking</option>
                  <option>Loan Approval & EMI Rates</option>
                  <option>Exchange / Sell Old Car</option>
                  <option>General Concierge Guidance</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any specific questions for the seller or concierge..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-950 focus:ring-2 focus:ring-stone-950"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Submit Callback Request</span>
              </button>
            </form>
          ) : (
            /* Success Card */
            <div className="py-2 text-center space-y-4">
              <CelebrationAnimation
                title="Callback Scheduled!"
                subtitle={`Our advisor will contact you at ${submittedData.phoneNumber} during ${submittedData.timeSlot}.`}
                badgeText={`REF #${submittedData.callbackRef}`}
                iconType="callback"
              />

              <div className="pt-2 flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
                <button
                  onClick={handleWhatsAppRedirect}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Message on WhatsApp</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-stone-950 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-stone-800 transition cursor-pointer shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
