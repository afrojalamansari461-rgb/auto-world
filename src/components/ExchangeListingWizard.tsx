import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Repeat, Car, ArrowLeftRight, CheckCircle2, 
  MapPin, ShieldCheck, Sparkles, Upload, 
  Image as ImageIcon, HelpCircle, X, ChevronRight,
  Gauge, Fuel, Award, Plus, Trash2, Eye
} from "lucide-react";
import { ExchangeRequest, UserListing, DEFAULT_EXCHANGES } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";

interface ExchangeListingWizardProps {
  currentUser: FirebaseUser | null;
  onSignInClick: () => void;
  onSuccess: (newListing: ExchangeRequest) => void;
  onCancel?: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  initialVehicle?: Partial<UserListing>;
}

const POPULAR_MAKES = [
  "BMW", "Mercedes-Benz", "Audi", "Porsche", "Toyota", 
  "Mahindra", "Tata", "Hyundai", "Kia", "Land Rover", 
  "Jaguar", "Volvo", "Skoda", "Volkswagen", "Honda", "MG"
];

const BODY_TYPES = [
  "Luxury Sedan", "SUV / 4x4", "Compact SUV", "Coupe / GT", 
  "Hatchback", "Electric EV", "Convertible", "Sportback"
];

const POPULAR_FEATURES = [
  "Sunroof / Panoramic Roof", "360° Surround Camera", "ADAS Level 2",
  "Ventilated Leather Seats", "Wireless Apple CarPlay / Android Auto",
  "Premium Audio (Harman / Burmester / Bose)", "Ceramic / PPF Coating",
  "Active Zero-Dep Insurance", "Single Owner / Showroom Condition",
  "Full Authorized Service History", "Brand New Tyres", "All-Wheel Drive (AWD/4x4)"
];

const SAMPLE_CAR_IMAGES = [
  { label: "German Luxury Sedan", url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80" },
  { label: "Rugged 4x4 SUV", url: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&auto=format&fit=crop&q=80" },
  { label: "Electric SUV", url: "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&auto=format&fit=crop&q=80" },
  { label: "Sport Performance GT", url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80" },
  { label: "Executive Luxury SUV", url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80" },
];

export const ExchangeListingWizard: React.FC<ExchangeListingWizardProps> = ({
  currentUser,
  onSignInClick,
  onSuccess,
  onCancel,
  showToast,
  initialVehicle
}) => {
  // Step indicator: 1 = Offered Vehicle, 2 = Target & Delta, 3 = Verification & Contact
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Offered Vehicle State
  const [make, setMake] = useState(initialVehicle?.make || "");
  const [model, setModel] = useState(initialVehicle?.model || "");
  const [variant, setVariant] = useState("");
  const [year, setYear] = useState<number>(Number(initialVehicle?.year) || 2022);
  const [bodyType, setBodyType] = useState("SUV / 4x4");
  const [valuationLakhs, setValuationLakhs] = useState<number>(() => {
    if (initialVehicle?.price) {
      return Number((initialVehicle.price / 100000).toFixed(1));
    }
    return 24.5;
  });
  const [mileage, setMileage] = useState(initialVehicle?.mileage || "18,000 km");
  const [fuel, setFuel] = useState(initialVehicle?.fuel || "Diesel");
  const [transmission, setTransmission] = useState(initialVehicle?.transmission || "Automatic");
  const [ownership, setOwnership] = useState("1st Owner");
  const [condition, setCondition] = useState<number>(5);
  const [rtoState, setRtoState] = useState("Maharashtra (MH)");
  const [rtoCode, setRtoCode] = useState("MH-02 (Mumbai West)");
  const [regNumber, setRegNumber] = useState("");
  const [description, setDescription] = useState(initialVehicle?.description || "");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "Sunroof / Panoramic Roof",
    "Active Zero-Dep Insurance",
    "Full Authorized Service History"
  ]);
  const [image, setImage] = useState<string>(
    initialVehicle?.image || "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80"
  );
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");

  // Step 2: Target Swap Vehicle State
  const [targetMake, setTargetMake] = useState("BMW / Audi / Mercedes-Benz");
  const [targetModel, setTargetModel] = useState("3-Series / A4 / C-Class / X3 / Fortuner");
  const [targetBodyType, setTargetBodyType] = useState("Luxury Sedan / SUV");
  const [targetYearMin, setTargetYearMin] = useState<number>(2020);
  const [targetYearMax, setTargetYearMax] = useState<number>(2025);
  const [cashDirection, setCashDirection] = useState<"pay_difference" | "receive_difference" | "even_swap">("pay_difference");
  const [cashDeltaLakhs, setCashDeltaLakhs] = useState<number>(8.0);
  const [exchangeNotes, setExchangeNotes] = useState(
    "Looking to upgrade with cash difference. Clean documentation and immediate RTO NOC transfer preferred."
  );

  // Step 3: Contact & Verification Details
  const [sellerName, setSellerName] = useState(currentUser?.displayName || currentUser?.email?.split("@")[0] || "Car Enthusiast");
  const [sellerPhone, setSellerPhone] = useState("+91 98200 44321");
  const [sellerEmail, setSellerEmail] = useState(currentUser?.email || "seller@autoworld.in");
  const [locationCity, setLocationCity] = useState("Mumbai / Navi Mumbai, MH");
  const [allowWhatsApp, setAllowWhatsApp] = useState(true);
  const [urgentSwap, setUrgentSwap] = useState(false);

  // Derived Title
  const computedTitle = `${year} ${make || "Vehicle"} ${model || "Model"} ${variant}`.trim();
  const valuationInRupees = Math.round(valuationLakhs * 100000);
  const cashDeltaInRupees = Math.round(cashDeltaLakhs * 100000);

  // Toggle Feature
  const toggleFeature = (feat: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feat) ? prev.filter(f => f !== feat) : [...prev, feat]
    );
  };

  // Image Upload via File
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const src = loadEvt.target?.result as string;
        if (src) {
          setImage(src);
          if (showToast) showToast("Vehicle photo uploaded successfully!", "success");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Final Submit
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.isAnonymous) {
      if (onSignInClick) onSignInClick();
      return;
    }

    if (!make.trim() || !model.trim()) {
      if (showToast) showToast("Please enter your vehicle's make and model.", "error");
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    const listingId = `exc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newListing: ExchangeRequest = {
      id: listingId,
      creatorUid: currentUser.uid,
      creatorName: sellerName || currentUser.displayName || "Verified Car Owner",
      creatorEmail: sellerEmail || currentUser.email || "owner@autoworld.in",
      creatorPhone: sellerPhone,
      creatorPhoto: currentUser.photoURL || undefined,
      offeredVehicle: {
        title: computedTitle,
        make: make.trim(),
        model: model.trim(),
        year: Number(year),
        valuation: valuationInRupees,
        mileage: mileage.trim() || "15,000 km",
        fuel: fuel,
        condition: condition,
        image: image,
        photos: [{ src: image, alt: computedTitle }],
        transmission: transmission,
        location: locationCity,
        rtoCode: rtoCode,
        description: description || `Single-owner ${year} ${make} ${model} in pristine condition. All service records up to date.`,
        features: selectedFeatures
      },
      desiredVehicle: {
        targetMake: targetMake.trim(),
        targetModel: targetModel.trim(),
        targetType: targetBodyType,
        yearMin: targetYearMin,
        yearMax: targetYearMax,
        maxCashAdded: cashDirection === "pay_difference" ? cashDeltaInRupees : undefined,
        minCashReceived: cashDirection === "receive_difference" ? cashDeltaInRupees : undefined,
        notes: exchangeNotes
      },
      cashDirection: cashDirection,
      cashDelta: cashDirection === "even_swap" ? 0 : cashDeltaInRupees,
      status: "active",
      offersCount: 0,
      location: locationCity,
      createdAt: new Date().toISOString(),
      badge: urgentSwap ? "hot" : "verified"
    };

    try {
      // 1. Write to Firestore
      await setDoc(doc(db, "exchanges", listingId), newListing);
      
      // 2. Sync to LocalStorage
      try {
        const stored = localStorage.getItem("autoworld_exchanges_data");
        const existing: ExchangeRequest[] = stored ? JSON.parse(stored) : DEFAULT_EXCHANGES;
        localStorage.setItem("autoworld_exchanges_data", JSON.stringify([newListing, ...existing]));
      } catch (lsErr) {
        console.warn("LocalStorage exchange sync notice:", lsErr);
      }

      if (showToast) {
        showToast("🎉 Your Car Exchange listing is now live on the match floor!", "success");
      }
      onSuccess(newListing);
    } catch (err: any) {
      console.error("Failed to publish exchange listing:", err);
      handleFirestoreError(err, OperationType.CREATE, `exchanges/${listingId}`);
      if (showToast) {
        showToast("Error saving exchange to cloud database. Saved locally.", "info");
      }
      onSuccess(newListing);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FAF8F5] border-2 border-stone-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] text-stone-900 font-sans">
      {/* Top Header Banner */}
      <div className="bg-stone-950 text-white p-5 sm:p-6 border-b-2 border-stone-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-2">
            <Repeat className="w-3.5 h-3.5" /> P2P Car Exchange &amp; Swap Desk
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-serif uppercase tracking-tight text-white">
            List Your Car for Direct Exchange
          </h2>
          <p className="text-stone-400 text-xs mt-1">
            Swap directly with another verified car owner. Auto World calculates fair value deltas with RTO transfer assistance.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-mono font-bold uppercase border border-stone-700 cursor-pointer self-start md:self-auto"
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* 3-Step Wizard Navigation */}
      <div className="bg-stone-100 border-b border-stone-300 px-4 sm:px-6 py-3">
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-bold uppercase">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`py-2 px-1 sm:px-3 border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              currentStep === 1
                ? "bg-stone-950 text-amber-400 border-stone-950 shadow-sm"
                : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 text-[10px] flex items-center justify-center font-black">1</span>
            <span className="truncate">Your Vehicle</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`py-2 px-1 sm:px-3 border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              currentStep === 2
                ? "bg-stone-950 text-amber-400 border-stone-950 shadow-sm"
                : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 text-[10px] flex items-center justify-center font-black">2</span>
            <span className="truncate">Target &amp; Delta</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`py-2 px-1 sm:px-3 border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              currentStep === 3
                ? "bg-stone-950 text-amber-400 border-stone-950 shadow-sm"
                : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 text-[10px] flex items-center justify-center font-black">3</span>
            <span className="truncate">Contact &amp; Publish</span>
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <form onSubmit={handleFinalSubmit} className="p-4 sm:p-6 md:p-8 space-y-6">
        {/* =============================================================== */}
        {/* STEP 1: YOUR VEHICLE (OFFERED)                                */}
        {/* =============================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-stone-300 pb-3">
              <h3 className="text-base font-serif font-black uppercase text-stone-950 flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-600" /> Step 1: Tell Us About The Car You Are Offering
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Provide accurate details to ensure precise algorithmic value matching and fair cash delta calculations.
              </p>
            </div>

            {/* Quick Popular Makes */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-700 mb-2">
                Quick Select Brand / Make:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_MAKES.map(brand => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setMake(brand)}
                    className={`px-2.5 py-1 text-xs font-mono transition border cursor-pointer ${
                      make.toLowerCase() === brand.toLowerCase()
                        ? "bg-stone-950 text-amber-400 border-stone-950 font-bold"
                        : "bg-white text-stone-700 border-stone-300 hover:bg-stone-200"
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Make, Model, Variant, Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Make / Brand *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BMW"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900 focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3 Series / Thar / Fortuner"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900 focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Variant / Trim
                </label>
                <input
                  type="text"
                  placeholder="e.g. 330i M-Sport / LX 4x4"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900 focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Manufacturing Year *
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-mono focus:outline-stone-900"
                >
                  {Array.from({ length: 15 }, (_, i) => 2026 - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Valuation Slider & Numeric Box */}
            <div className="p-4 bg-stone-950 text-white border border-stone-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-widest">
                    Algorithmic Valuation Baseline
                  </span>
                  <h4 className="text-sm font-bold text-white uppercase">
                    Your Vehicle's Market Value: ₹{valuationLakhs.toFixed(2)} Lakhs (₹{valuationInRupees.toLocaleString("en-IN")})
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-stone-400">Exact ₹ Lakhs:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="500"
                    value={valuationLakhs}
                    onChange={(e) => setValuationLakhs(Math.max(0.5, Number(e.target.value)))}
                    className="w-24 p-1.5 bg-stone-900 border border-amber-500/50 text-amber-400 text-xs font-mono font-bold text-center focus:outline-none"
                  />
                </div>
              </div>

              <input
                type="range"
                min="2"
                max="120"
                step="0.5"
                value={valuationLakhs}
                onChange={(e) => setValuationLakhs(Number(e.target.value))}
                className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />

              <div className="flex justify-between text-[10px] font-mono text-stone-400">
                <span>Budget (₹2L)</span>
                <span>Mid-Range (₹25L)</span>
                <span>Luxury (₹60L)</span>
                <span>Exotic (₹1.2Cr+)</span>
              </div>
            </div>

            {/* Technical Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Fuel Type
                </label>
                <select
                  value={fuel}
                  onChange={(e) => setFuel(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900"
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric (EV)</option>
                  <option value="Hybrid">Strong Hybrid</option>
                  <option value="CNG">CNG / Petrol</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Transmission
                </label>
                <select
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900"
                >
                  <option value="Automatic">Automatic (AT / Torque Converter)</option>
                  <option value="Dual-Clutch (DCT/DSG)">Dual-Clutch (DCT / DSG)</option>
                  <option value="Manual">6-Speed Manual</option>
                  <option value="CVT">CVT / e-CVT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Odometer / Mileage
                </label>
                <input
                  type="text"
                  placeholder="e.g. 18,500 km"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900"
                />
              </div>
            </div>

            {/* RTO & Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  RTO Registration Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH-02 (Mumbai) / DL-01 (Delhi)"
                  value={rtoCode}
                  onChange={(e) => setRtoCode(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Ownership
                </label>
                <select
                  value={ownership}
                  onChange={(e) => setOwnership(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900"
                >
                  <option value="1st Owner">1st Owner (Single Handed)</option>
                  <option value="2nd Owner">2nd Owner</option>
                  <option value="Corporate / Company">Corporate / Company Lease</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Vehicle Condition ({condition}/5)
                </label>
                <div className="flex items-center gap-1.5 p-2 bg-white border border-stone-400 h-[38px]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCondition(star)}
                      className={`text-sm cursor-pointer transition ${
                        star <= condition ? "text-amber-500 font-bold scale-110" : "text-stone-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-[11px] font-mono text-stone-600 ml-2 font-bold">
                    {condition === 5 ? "Mint / Flawless" : condition === 4 ? "Excellent" : condition === 3 ? "Good" : "Fair"}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Features Checklist */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-2">
                Key Highlights &amp; Equipment (Check all that apply):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {POPULAR_FEATURES.map((feat) => {
                  const isChecked = selectedFeatures.includes(feat);
                  return (
                    <button
                      key={feat}
                      type="button"
                      onClick={() => toggleFeature(feat)}
                      className={`p-2 text-left text-xs transition border flex items-center gap-2 cursor-pointer ${
                        isChecked
                          ? "bg-amber-500/10 border-amber-600 text-stone-950 font-bold"
                          : "bg-white border-stone-300 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        isChecked ? "bg-amber-500 border-amber-600 text-stone-950" : "border-stone-400"
                      }`}>
                        {isChecked && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{feat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo Selection / Upload */}
            <div className="p-4 bg-white border border-stone-300 space-y-3">
              <label className="block text-xs font-mono font-bold uppercase text-stone-800">
                Showcase Vehicle Photo *
              </label>
              
              {/* Photo Preview & Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="relative aspect-video bg-stone-900 border border-stone-800 overflow-hidden group">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span className="text-white text-[10px] font-mono font-bold uppercase bg-stone-950/80 px-2 py-1">
                      Active Image
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-2 bg-stone-950 hover:bg-stone-850 text-white text-xs font-mono font-bold uppercase cursor-pointer flex items-center gap-2 border border-stone-800">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Upload From Device</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    <span className="text-xs text-stone-400 font-mono">or pick sample below</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_CAR_IMAGES.map((sample) => (
                      <button
                        key={sample.label}
                        type="button"
                        onClick={() => setImage(sample.url)}
                        className={`text-[10px] font-mono px-2 py-1 border transition cursor-pointer ${
                          image === sample.url
                            ? "bg-amber-500 text-stone-950 font-bold border-amber-600"
                            : "bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200"
                        }`}
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="url"
                    placeholder="Or enter public photo URL (https://...)"
                    value={customPhotoUrl}
                    onChange={(e) => {
                      setCustomPhotoUrl(e.target.value);
                      if (e.target.value.startsWith("http")) setImage(e.target.value);
                    }}
                    className="w-full p-2 bg-stone-50 border border-stone-300 text-xs font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Navigation CTA */}
            <div className="flex justify-end pt-4 border-t border-stone-300">
              <button
                type="button"
                onClick={() => {
                  if (!make.trim() || !model.trim()) {
                    if (showToast) showToast("Please enter Make and Model before continuing.", "error");
                    return;
                  }
                  setCurrentStep(2);
                }}
                className="px-6 py-3 bg-stone-950 hover:bg-stone-850 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Continue to Target Swap Criteria</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 2: TARGET VEHICLE & CASH DELTA                           */}
        {/* =============================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-stone-300 pb-3">
              <h3 className="text-base font-serif font-black uppercase text-stone-950 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-cyan-600" /> Step 2: What Vehicle Are You Looking To Trade For?
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Specify your dream swap target, acceptable year range, and your cash delta terms.
              </p>
            </div>

            {/* Target Criteria Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Target Brands / Makes *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BMW / Audi / Porsche / Toyota"
                  value={targetMake}
                  onChange={(e) => setTargetMake(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Target Models / Variants
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3-Series M-Sport / Fortuner Legender / Macan"
                  value={targetModel}
                  onChange={(e) => setTargetModel(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Target Body Type
                </label>
                <select
                  value={targetBodyType}
                  onChange={(e) => setTargetBodyType(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900"
                >
                  {BODY_TYPES.map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                  <option value="Any Category">Any Body Style</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Acceptable Year (Min)
                </label>
                <select
                  value={targetYearMin}
                  onChange={(e) => setTargetYearMin(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-mono focus:outline-stone-900"
                >
                  {Array.from({ length: 10 }, (_, i) => 2026 - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Acceptable Year (Max)
                </label>
                <select
                  value={targetYearMax}
                  onChange={(e) => setTargetYearMax(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-mono focus:outline-stone-900"
                >
                  {Array.from({ length: 10 }, (_, i) => 2026 - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* CASH DELTA DIRECTION SELECTION */}
            <div className="space-y-3">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-900">
                Cash Difference / Economic Delta Direction:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1: Pay difference */}
                <div
                  onClick={() => setCashDirection("pay_difference")}
                  className={`p-4 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    cashDirection === "pay_difference"
                      ? "bg-amber-500/15 border-amber-600 shadow-md"
                      : "bg-white border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-amber-900">1. Upgrading</span>
                    <span className="text-lg font-black text-amber-600">▲</span>
                  </div>
                  <div className="my-2">
                    <h5 className="font-bold text-sm text-stone-950">I Will Pay Cash Difference</h5>
                    <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                      Trading for a higher-value luxury vehicle and adding cash to balance the swap.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-amber-800 font-bold">
                    e.g. Thar (₹18L) + ₹12L Cash ➔ BMW (₹30L)
                  </span>
                </div>

                {/* 2: Receive difference */}
                <div
                  onClick={() => setCashDirection("receive_difference")}
                  className={`p-4 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    cashDirection === "receive_difference"
                      ? "bg-cyan-500/15 border-cyan-600 shadow-md"
                      : "bg-white border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-cyan-900">2. Downsizing</span>
                    <span className="text-lg font-black text-cyan-600">▼</span>
                  </div>
                  <div className="my-2">
                    <h5 className="font-bold text-sm text-stone-950">I Want To Receive Cash</h5>
                    <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                      Trading down for liquidity. Swap partner will pay you the remaining cash difference.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-800 font-bold">
                    e.g. BMW (₹42L) ➔ Fortuner (₹32L) + ₹10L Cash
                  </span>
                </div>

                {/* 3: Even swap */}
                <div
                  onClick={() => setCashDirection("even_swap")}
                  className={`p-4 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    cashDirection === "even_swap"
                      ? "bg-emerald-500/15 border-emerald-600 shadow-md"
                      : "bg-white border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-emerald-900">3. Straight Swap</span>
                    <span className="text-lg font-black text-emerald-600">⚖</span>
                  </div>
                  <div className="my-2">
                    <h5 className="font-bold text-sm text-stone-950">Even Value Swap (₹0 Delta)</h5>
                    <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                      Looking for a direct 1-to-1 vehicle trade with equal market valuation.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-800 font-bold">
                    e.g. Creta EV (₹19L) ➔ Scorpio-N (₹19L)
                  </span>
                </div>
              </div>
            </div>

            {/* Delta Amount Slider (if not even swap) */}
            {cashDirection !== "even_swap" && (
              <div className="p-4 bg-stone-950 text-white border border-stone-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest">
                      {cashDirection === "pay_difference" ? "Maximum Cash You Are Willing to Add" : "Minimum Cash Difference Expected"}
                    </span>
                    <h4 className="text-sm font-bold text-white uppercase">
                      Cash Delta: ₹{cashDeltaLakhs.toFixed(2)} Lakhs (₹{cashDeltaInRupees.toLocaleString("en-IN")})
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-stone-400">₹ Lakhs:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="100"
                      value={cashDeltaLakhs}
                      onChange={(e) => setCashDeltaLakhs(Math.max(0.1, Number(e.target.value)))}
                      className="w-24 p-1.5 bg-stone-900 border border-cyan-500/50 text-cyan-400 text-xs font-mono font-bold text-center focus:outline-none"
                    />
                  </div>
                </div>

                <input
                  type="range"
                  min="0.5"
                  max="40"
                  step="0.5"
                  value={cashDeltaLakhs}
                  onChange={(e) => setCashDeltaLakhs(Number(e.target.value))}
                  className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />

                <div className="flex gap-2">
                  {[2, 5, 10, 15, 25].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCashDeltaLakhs(preset)}
                      className={`text-[10px] font-mono px-2 py-0.5 border cursor-pointer ${
                        cashDeltaLakhs === preset
                          ? "bg-cyan-500 text-stone-950 font-bold border-cyan-400"
                          : "bg-stone-900 text-stone-300 border-stone-700 hover:bg-stone-800"
                      }`}
                    >
                      ₹{preset}L
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trade Notes */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                Exchange Terms &amp; Special Conditions
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Open to inspection at authorized service center in Mumbai/Pune. Single-owner cars with service history preferred."
                value={exchangeNotes}
                onChange={(e) => setExchangeNotes(e.target.value)}
                className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900"
              />
            </div>

            {/* Navigation CTAs */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-300">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-mono font-bold uppercase cursor-pointer"
              >
                ← Back to Vehicle
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-stone-950 hover:bg-stone-850 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Continue to Verification</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 3: CONTACT & PREVIEW PUBLISH                              */}
        {/* =============================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-stone-300 pb-3">
              <h3 className="text-base font-serif font-black uppercase text-stone-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Step 3: Owner Verification &amp; Match Floor Preview
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Confirm your contact details and preview how your exchange card will appear to other car owners.
              </p>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  Phone Number (Direct Trade Contact) *
                </label>
                <input
                  type="text"
                  required
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-mono focus:outline-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-stone-800 mb-1">
                  City / Preferred Swap Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai / Pune / Delhi NCR"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-400 text-stone-900 text-xs font-sans focus:outline-stone-900"
                />
              </div>
            </div>

            {/* WhatsApp and Urgent Toggles */}
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-sans text-stone-800">
                <input
                  type="checkbox"
                  checked={allowWhatsApp}
                  onChange={(e) => setAllowWhatsApp(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span className="font-bold">Allow Trade Offers via WhatsApp message</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-sans text-stone-800">
                <input
                  type="checkbox"
                  checked={urgentSwap}
                  onChange={(e) => setUrgentSwap(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
                <span className="font-bold text-amber-800">Mark as "Hot Swap / Immediate Deal"</span>
              </label>
            </div>

            {/* LIVE PREVIEW CARD */}
            <div className="p-4 sm:p-5 bg-stone-900 text-white border-2 border-stone-950 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Live Marketplace Card Preview
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase rounded border border-emerald-500/40">
                  Ready to Publish
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Image Showcase */}
                <div className="relative aspect-video bg-stone-950 overflow-hidden border border-stone-800">
                  <img src={image} alt={computedTitle} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-stone-950/90 text-cyan-400 text-[9px] font-mono font-bold uppercase border border-cyan-500/40">
                    Offered for Swap
                  </div>
                  <div className="absolute bottom-2 left-2 bg-stone-950/90 px-2 py-0.5 text-white font-mono text-[11px] font-bold border border-stone-700">
                    ₹{valuationLakhs.toFixed(2)}L
                  </div>
                </div>

                {/* Specs */}
                <div className="space-y-1.5 text-xs">
                  <h4 className="text-base font-bold text-white">{computedTitle || "Your Vehicle Title"}</h4>
                  <p className="text-stone-400 text-[11px]">
                    {mileage} • {fuel} • {transmission} • {rtoCode}
                  </p>
                  <div className="p-2.5 bg-stone-950 border border-stone-800 text-[11px] space-y-1">
                    <p className="text-stone-400 font-mono text-[10px] uppercase font-bold">Desired Swap Target:</p>
                    <p className="font-bold text-cyan-400">{targetMake} {targetModel}</p>
                  </div>
                </div>

                {/* Delta Pill */}
                <div className="p-3 bg-stone-950 border border-amber-500/40 space-y-2 text-xs">
                  <span className="text-[10px] font-mono text-stone-400 uppercase">Economic Delta:</span>
                  <div className="font-bold text-amber-300 leading-tight">
                    {cashDirection === "pay_difference" && `Owner pays up to ₹${cashDeltaLakhs.toFixed(2)}L cash difference`}
                    {cashDirection === "receive_difference" && `Proposer pays ~₹${cashDeltaLakhs.toFixed(2)}L cash difference`}
                    {cashDirection === "even_swap" && "Straight Even-Value Swap (₹0 Delta)"}
                  </div>
                  <p className="text-[10px] text-stone-400">Location: {locationCity}</p>
                </div>
              </div>
            </div>

            {/* Publish CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-300">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-mono font-bold uppercase cursor-pointer"
              >
                ← Back to Target Criteria
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-stone-950 font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <Repeat className={`w-4 h-4 ${isSubmitting ? "animate-spin" : ""}`} />
                <span>{isSubmitting ? "Publishing to Match Floor..." : "Publish P2P Swap Listing"}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
