import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Car,
  Phone,
  User,
  Compass,
} from "lucide-react";
import { Vehicle } from "../types";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { dispatchAdminSmsAlert } from "../lib/notificationService";
import { CelebrationAnimation, fireCelebrationConfetti } from "./CelebrationAnimation";
import {
  modalBackdropVariants,
  modalPanelVariants,
  MagneticButton,
} from "./AnimationWrapper";

interface TestDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  currentUser?: any;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export const TestDriveModal: React.FC<TestDriveModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  currentUser,
  showToast,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow === "hidden" ? "" : originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const [driveType, setDriveType] = useState<"doorstep" | "showroom">("doorstep");
  const [preferredDate, setPreferredDate] = useState<string>(
    new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]
  );
  const [timeSlot, setTimeSlot] = useState<string>("Morning (10:00 AM - 1:00 PM)");
  const [fullName, setFullName] = useState<string>(currentUser?.displayName || "");
  const [phone, setPhone] = useState<string>(currentUser?.phoneNumber || "");
  const [address, setAddress] = useState<string>(vehicle?.location || "Mumbai, Maharashtra");
  const [hasLicense, setHasLicense] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    if (!phone.trim()) {
      showToast?.("Please provide a valid contact phone number.", "error");
      return;
    }
    if (!hasLicense) {
      showToast?.("A valid driving license is required for test drives.", "error");
      return;
    }

    setIsSubmitting(true);
    const bookingRef = `TD-${Math.floor(100000 + Math.random() * 900000)}`;

    const bookingData = {
      bookingRef,
      vehicleId: vehicle.id,
      vehicleTitle: vehicle.title,
      vehiclePrice: vehicle.price,
      vehicleImage: vehicle.image || vehicle.photos?.[0]?.src || "",
      sellerName: vehicle.sellerName || "AutoWorld Direct",
      sellerPhone: vehicle.sellerPhone || "+919920155667",
      sellerEmail: vehicle.sellerEmail || "",
      sellerUserId: (vehicle as any).userId || "",
      listingId: (vehicle as any).listingId || "",
      driveType,
      preferredDate,
      timeSlot,
      fullName: fullName.trim() || "Valued Buyer",
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
      status: "scheduled",
    };

    try {
      if (db) {
        await addDoc(collection(db, "test_drives"), bookingData);
      }

      const existing = JSON.parse(localStorage.getItem("autoWorld_test_drives") || "[]");
      existing.unshift(bookingData);
      localStorage.setItem("autoWorld_test_drives", JSON.stringify(existing));

      window.dispatchEvent(new CustomEvent("autoworld_requests_updated"));

      dispatchAdminSmsAlert(
        "buyerLead",
        "🏎️ Test Drive Requested",
        `Test Drive Request for ${bookingData.vehicleTitle} by ${bookingData.fullName} (${bookingData.phone}). Slot: ${bookingData.preferredDate} (${bookingData.timeSlot}). Ref: #${bookingRef}`,
        {
          bookingRef,
          vehicleTitle: bookingData.vehicleTitle,
          buyer: bookingData.fullName,
          phone: bookingData.phone,
        }
      );

      setBookingSuccess(bookingData);
      fireCelebrationConfetti();
      showToast?.(`Test drive scheduled! Reference code: ${bookingRef}`, "success");
    } catch (err) {
      console.error("Test drive booking error:", err);
      setBookingSuccess(bookingData);
      showToast?.(`Test drive confirmed locally! Ref: ${bookingRef}`, "info");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && vehicle && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
          {/* Smooth 0px -> 4px Backdrop Blur */}
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-[#0F0F10]/80"
          />

          <motion.div
            variants={modalPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 bg-[#F6F5F2] border-2 border-[#0F0F10] w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#0F0F10] text-white flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#D5001C] text-white flex items-center justify-center font-bold">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-serif font-extrabold uppercase tracking-tight text-white leading-tight">
                    Schedule Concierge Road Test
                  </h3>
                  <p className="text-xs font-mono text-stone-400 truncate max-w-xs sm:max-w-md tabular-nums">
                    {vehicle.title} • ₹{vehicle.price.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                aria-label="Close test drive modal"
                className="w-9 h-9 bg-white/10 hover:bg-[#D5001C] text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {!bookingSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Vehicle Preview Card */}
                  <div className="flex items-center gap-4 p-3.5 bg-white border border-[#0F0F10]/20">
                    <img
                      src={vehicle.image || vehicle.photos?.[0]?.src}
                      alt={vehicle.title}
                      className="w-20 h-14 object-cover border border-[#0F0F10]/15 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#D5001C] block">
                        {vehicle.year} • {vehicle.fuel} • {vehicle.transmission}
                      </span>
                      <h4 className="text-sm font-serif font-extrabold text-[#0F0F10] truncate">
                        {vehicle.title}
                      </h4>
                      <p className="text-[11px] font-mono text-stone-500">
                        REGISTRY LOCATION: {vehicle.location || "Mumbai, India"}
                      </p>
                    </div>
                  </div>

                  {/* Drive Type Selection */}
                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 uppercase tracking-[0.18em] block mb-2">
                      01 / Select Road Test Protocol
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setDriveType("doorstep")}
                        className={`p-4 border text-left transition cursor-pointer flex items-start gap-3 ${
                          driveType === "doorstep"
                            ? "bg-[#0F0F10] text-[#F6F5F2] border-[#0F0F10]"
                            : "bg-white border-[#0F0F10]/20 text-[#0F0F10] hover:border-[#0F0F10]"
                        }`}
                      >
                        <div className="w-8 h-8 bg-[#D5001C] text-white flex items-center justify-center shrink-0 font-bold">
                          <Compass className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold uppercase tracking-wider block">
                            Doorstep Valet Delivery
                          </span>
                          <span
                            className={`text-[11px] block leading-tight mt-1 ${
                              driveType === "doorstep" ? "text-stone-300" : "text-stone-500"
                            }`}
                          >
                            Vehicle delivered directly to your residence or office with a
                            protocol officer.
                          </span>
                        </div>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setDriveType("showroom")}
                        className={`p-4 border text-left transition cursor-pointer flex items-start gap-3 ${
                          driveType === "showroom"
                            ? "bg-[#0F0F10] text-[#F6F5F2] border-[#0F0F10]"
                            : "bg-white border-[#0F0F10]/20 text-[#0F0F10] hover:border-[#0F0F10]"
                        }`}
                      >
                        <div className="w-8 h-8 bg-stone-800 text-white flex items-center justify-center shrink-0 font-bold">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold uppercase tracking-wider block">
                            Showroom / Vault Inspection
                          </span>
                          <span
                            className={`text-[11px] block leading-tight mt-1 ${
                              driveType === "showroom" ? "text-stone-300" : "text-stone-500"
                            }`}
                          >
                            Visit the custodian facility for lift inspection and closed-course
                            road test.
                          </span>
                        </div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Date & Time Slot */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono font-bold text-stone-600 uppercase tracking-[0.18em] block mb-1.5">
                        <Calendar className="w-3.5 h-3.5 inline mr-1.5 text-[#0F0F10]" />
                        Preferred Date
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-[#0F0F10]/25 text-xs font-mono font-bold text-[#0F0F10] focus:outline-none focus:border-[#0F0F10]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold text-stone-600 uppercase tracking-[0.18em] block mb-1.5">
                        <Clock className="w-3.5 h-3.5 inline mr-1.5 text-[#0F0F10]" />
                        Time Window
                      </label>
                      <select
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#0F0F10]/25 text-xs font-semibold text-[#0F0F10] focus:outline-none focus:border-[#0F0F10] cursor-pointer"
                      >
                        <option>Morning (10:00 AM - 1:00 PM)</option>
                        <option>Afternoon (1:00 PM - 4:00 PM)</option>
                        <option>Evening (4:00 PM - 7:00 PM)</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono font-bold text-stone-600 uppercase tracking-[0.18em] block mb-1.5">
                        <User className="w-3.5 h-3.5 inline mr-1.5 text-stone-500" />
                        Principal Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-[#0F0F10]/25 text-xs text-[#0F0F10] focus:outline-none focus:border-[#0F0F10]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold text-stone-600 uppercase tracking-[0.18em] block mb-1.5">
                        <Phone className="w-3.5 h-3.5 inline mr-1.5 text-stone-500" />
                        Direct Telephone *
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-[#0F0F10]/25 text-xs font-mono text-[#0F0F10] focus:outline-none focus:border-[#0F0F10]"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 uppercase tracking-[0.18em] block mb-1.5">
                      <MapPin className="w-3.5 h-3.5 inline mr-1.5 text-stone-500" />
                      {driveType === "doorstep"
                        ? "Dispatch Address"
                        : "City / Nearest Landmark"}
                    </label>
                    <input
                      type="text"
                      placeholder="Street, locality, landmark, city..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-[#0F0F10]/25 text-xs text-[#0F0F10] focus:outline-none focus:border-[#0F0F10]"
                    />
                  </div>

                  {/* License confirmation */}
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-[#0F0F10] cursor-pointer p-3 bg-white border border-[#0F0F10]/20">
                    <input
                      type="checkbox"
                      checked={hasLicense}
                      onChange={(e) => setHasLicense(e.target.checked)}
                      className="w-4 h-4 accent-[#D5001C]"
                    />
                    <span>I hold a valid Motor Vehicle Driving License.</span>
                  </label>

                  {/* Submit Button */}
                  <MagneticButton
                    type="submit"
                    disabled={isSubmitting}
                    magneticStrength={0.08}
                    className="w-full py-4 bg-[#D5001C] hover:bg-[#b80018] text-white text-xs font-sans font-extrabold uppercase tracking-[0.2em] transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Car className="w-4 h-4" />
                    <span>Confirm Road Test Mandate</span>
                  </MagneticButton>
                </form>
              ) : (
                /* Success Card */
                <div className="py-2 px-2 text-center space-y-4">
                  <CelebrationAnimation
                    title="Road Test Mandate Confirmed"
                    subtitle={`Your appointment for ${bookingSuccess.vehicleTitle} is scheduled for ${bookingSuccess.preferredDate} (${bookingSuccess.timeSlot}).`}
                    badgeText={`REF #${bookingSuccess.bookingRef}`}
                    iconType="shield"
                  />

                  <div className="bg-white p-4 border border-[#0F0F10]/20 max-w-md mx-auto text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-mono uppercase text-[10px]">
                        Protocol:
                      </span>
                      <span className="font-bold text-[#0F0F10] uppercase font-mono">
                        {bookingSuccess.driveType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-mono uppercase text-[10px]">
                        Location:
                      </span>
                      <span className="font-bold text-[#0F0F10]">
                        {bookingSuccess.address}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-mono uppercase text-[10px]">
                        Principal:
                      </span>
                      <span className="font-bold text-[#0F0F10] tabular-nums">
                        {bookingSuccess.fullName} ({bookingSuccess.phone})
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-center">
                    <MagneticButton
                      onClick={onClose}
                      className="px-8 py-3 bg-[#0F0F10] text-white text-xs font-extrabold uppercase tracking-[0.18em] hover:bg-[#D5001C] transition cursor-pointer"
                    >
                      Close Dossier
                    </MagneticButton>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
