import React, { useState } from "react";
import { X, Calendar, Clock, MapPin, CheckCircle2, Car, ShieldCheck, Phone, User, Compass } from "lucide-react";
import { Vehicle } from "../types";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { CelebrationAnimation, fireCelebrationConfetti } from "./CelebrationAnimation";

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
  if (!isOpen || !vehicle) return null;

  const [driveType, setDriveType] = useState<"doorstep" | "showroom">("doorstep");
  const [preferredDate, setPreferredDate] = useState<string>(
    new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]
  );
  const [timeSlot, setTimeSlot] = useState<string>("Morning (10:00 AM - 1:00 PM)");
  const [fullName, setFullName] = useState<string>(currentUser?.displayName || "");
  const [phone, setPhone] = useState<string>(currentUser?.phoneNumber || "");
  const [address, setAddress] = useState<string>(vehicle.location || "Mumbai, Maharashtra");
  const [hasLicense, setHasLicense] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      vehicleImage: vehicle.image || vehicle.photos?.[0]?.src,
      sellerName: vehicle.sellerName || "AutoWorld Direct",
      sellerPhone: vehicle.sellerPhone || "+919920155667",
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

      // Local storage fallback
      const existing = JSON.parse(localStorage.getItem("autoWorld_test_drives") || "[]");
      existing.unshift(bookingData);
      localStorage.setItem("autoWorld_test_drives", JSON.stringify(existing));

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

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-stone-950 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-white leading-tight">
                Schedule VIP Test Drive
              </h3>
              <p className="text-xs text-stone-300 truncate max-w-xs sm:max-w-md">
                {vehicle.title} • ₹{vehicle.price.toLocaleString("en-IN")}
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {!bookingSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Vehicle Preview Card */}
              <div className="flex items-center gap-3 p-3 bg-white border border-stone-250 rounded-xl shadow-2xs">
                <img
                  src={vehicle.image || vehicle.photos?.[0]?.src}
                  alt={vehicle.title}
                  className="w-16 h-12 sm:w-20 sm:h-14 object-cover rounded-lg border border-stone-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                    {vehicle.year} • {vehicle.fuel} • {vehicle.transmission}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                    {vehicle.title}
                  </h4>
                  <p className="text-xs text-stone-600 font-semibold">
                    Location: {vehicle.location || "Mumbai, India"}
                  </p>
                </div>
              </div>

              {/* Drive Type Selection */}
              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-2">
                  Select Test Drive Option
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDriveType("doorstep")}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                      driveType === "doorstep"
                        ? "bg-amber-500/10 border-amber-600 text-stone-950 shadow-xs"
                        : "bg-white border-stone-300 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 font-bold">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-stone-950">
                        Doorstep Delivery
                      </span>
                      <span className="text-[11px] text-stone-500 block leading-tight mt-0.5">
                        Vehicle brought directly to your home or office address with valet officer.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDriveType("showroom")}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                      driveType === "showroom"
                        ? "bg-amber-500/10 border-amber-600 text-stone-950 shadow-xs"
                        : "bg-white border-stone-300 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center shrink-0 font-bold">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-stone-950">
                        Showroom / Seller Location
                      </span>
                      <span className="text-[11px] text-stone-500 block leading-tight mt-0.5">
                        Visit seller showroom for comprehensive inspection and road test.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Date & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1.5">
                    <Calendar className="w-3.5 h-3.5 inline mr-1 text-amber-700" />
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-950 focus:ring-2 focus:ring-stone-950"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1.5">
                    <Clock className="w-3.5 h-3.5 inline mr-1 text-amber-700" />
                    Preferred Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-950 focus:ring-2 focus:ring-stone-950 cursor-pointer"
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
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1.5">
                    <User className="w-3.5 h-3.5 inline mr-1 text-stone-500" />
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-950 focus:ring-2 focus:ring-stone-950"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1.5">
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-stone-500" />
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-950 focus:ring-2 focus:ring-stone-950"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1.5">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-stone-500" />
                  {driveType === "doorstep" ? "Doorstep Address for Delivery" : "City / Nearest Landmark"}
                </label>
                <input
                  type="text"
                  placeholder="Street, locality, landmark, city..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-950 focus:ring-2 focus:ring-stone-950"
                />
              </div>

              {/* License confirmation */}
              <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={hasLicense}
                  onChange={(e) => setHasLicense(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
                <span>I hold a valid Indian Driving License for motor vehicles.</span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-stone-950 hover:bg-stone-850 text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <Car className="w-4 h-4 text-amber-400" />
                <span>Confirm VIP Test Drive Booking</span>
              </button>
            </form>
          ) : (
            /* Success Card */
            <div className="py-2 px-2 text-center space-y-4">
              <CelebrationAnimation
                title="Shield Inspection & Drive Confirmed!"
                subtitle={`Your VIP test drive for ${bookingSuccess.vehicleTitle} has been scheduled for ${bookingSuccess.preferredDate} (${bookingSuccess.timeSlot}).`}
                badgeText={`REF #${bookingSuccess.bookingRef}`}
                iconType="shield"
              />

              <div className="bg-white p-4 border border-stone-300 rounded-xl max-w-md mx-auto text-left text-xs space-y-2 shadow-2xs">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Drive Location:</span>
                  <span className="font-bold text-stone-900 capitalize">{bookingSuccess.driveType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Address:</span>
                  <span className="font-bold text-stone-900">{bookingSuccess.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Contact Person:</span>
                  <span className="font-bold text-stone-900">{bookingSuccess.fullName} ({bookingSuccess.phone})</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-8 py-2.5 bg-stone-950 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-stone-800 transition cursor-pointer shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
