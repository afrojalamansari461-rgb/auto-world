import React, { useState, useEffect } from "react";
import { Car, Tag, Sparkles, Upload, Trash2, Check, ArrowLeft, ArrowRight, Star, Heart, DollarSign, Calendar, Eye, MapPin, Phone, Mail, FileText, CheckCircle2, Crown } from "lucide-react";
import { VEHICLE_MAKES, VEHICLE_MODELS, UserListing } from "../types";
import { User } from "firebase/auth";
import { setDoc, doc, collection } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

interface SellTabProps {
  setActiveTab: (tab: string) => void;
  subscriptionActive: boolean;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  currentUser: User | null;
}

export default function SellTab({ setActiveTab, subscriptionActive, showToast, currentUser }: SellTabProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // STEP 1: Basic details
  const [vehicleType, setVehicleType] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  // STEP 2: Details
  const [condition, setCondition] = useState(3); // 1-5 rating
  const [hoveredCondition, setHoveredCondition] = useState<number | null>(null);
  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [description, setDescription] = useState("");
  const [transmission, setTransmission] = useState("");
  const [engineSize, setEngineSize] = useState("");
  const [doors, setDoors] = useState("");
  const [seats, setSeats] = useState("");
  const [checkedFeatures, setCheckedFeatures] = useState<string[]>([]);
  
  // Bike / Bicycle specific states
  const [bikeType, setBikeType] = useState("");
  const [bikeEngine, setBikeEngine] = useState("");
  const [bikeMileage, setBikeMileage] = useState("");
  const [bikeGears, setBikeGears] = useState("");
  const [bicycleType, setBicycleType] = useState("");
  const [frameSize, setFrameSize] = useState("");
  const [gears, setGears] = useState("");

  // STEP 3: Base64 Photos state
  const [photos, setPhotos] = useState<{ src: string; alt: string }[]>([]);

  // STEP 4: Price & Contacts details
  const [askingPrice, setAskingPrice] = useState("");
  const [negotiable, setNegotiable] = useState("yes");
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const [featuredListing, setFeaturedListing] = useState(false);
  const [urgentListing, setUrgentListing] = useState(false);

  // Suggested price outputs
  const [suggestedMin, setSuggestedMin] = useState(0);
  const [suggestedMax, setSuggestedMax] = useState(0);

  // Publish Status details
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedListingId, setPublishedListingId] = useState("");
  const [publishedTimeStr, setPublishedTimeStr] = useState("");

  // Reset makes / models when vehicleType changes
  useEffect(() => {
    setMake("");
    setModel("");
  }, [vehicleType]);

  // Reset model when make changes
  useEffect(() => {
    setModel("");
  }, [make]);

  // Suggested price calculator
  useEffect(() => {
    if (!vehicleType || !make || !model || !year) {
      setSuggestedMin(0);
      setSuggestedMax(0);
      return;
    }

    const basePrices: Record<string, number> = {
      car: 900000,
      suv: 1400000,
      truck: 1800000,
      van: 800000,
      motorcycle: 180000,
      bicycle: 15000,
      commercial: 2500000,
      other: 600000
    };

    const initialAmount = basePrices[vehicleType] || 10000;
    const yearAge = new Date().getFullYear() - (parseInt(year) || 2020);
    const ageMultiplier = Math.max(0.35, 1 - (yearAge * 0.065));
    const isPremiumMake = ["BMW", "Mercedes", "Audi"].includes(make);
    const brandMultiplier = isPremiumMake ? 1.35 : 1.0;

    const computedMin = Math.round(initialAmount * ageMultiplier * brandMultiplier * 0.85);
    const computedMax = Math.round(initialAmount * ageMultiplier * brandMultiplier * 1.15);

    setSuggestedMin(computedMin);
    setSuggestedMax(computedMax);
  }, [vehicleType, make, model, year]);

  const ratingLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

  const defaultFeatures = [
    "Air Conditioning", "Power Windows", "Power Steering", "ABS",
    "Airbags", "Sunroof/Moonroof", "Leather Seats", "Bluetooth", "Backup Camera"
  ];

  const handleFeatureToggle = (featureName: string) => {
    if (checkedFeatures.includes(featureName)) {
      setCheckedFeatures(checkedFeatures.filter(f => f !== featureName));
    } else {
      setCheckedFeatures([...checkedFeatures, featureName]);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processPhotoFiles(files);
  };

  const processPhotoFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      if (!file.type.match("image.*")) {
        showToast("Please upload valid image formats only.", "error");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast("Maximum image size is 5MB.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target?.result) {
          setPhotos(prev => [...prev, { src: loadEvent.target!.result as string, alt: file.name }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) processPhotoFiles(files);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!vehicleType) {
        showToast("Please select the vehicle category type.", "error");
        return;
      }
      if (!make || !model || !year) {
        showToast("Please specify make, model, and manufacturing year.", "error");
        return;
      }
    }

    if (currentStep === 2) {
      if (!description.trim() || description.length < 15) {
        showToast("Please provide an elegant description containing at least 15 characters.", "error");
        return;
      }
    }

    if (currentStep === 3) {
      if (photos.length === 0) {
        showToast("Please upload at least one image photo representation of your vehicle.", "error");
        return;
      }
    }

    if (currentStep === 4) {
      if (!askingPrice || isNaN(parseInt(askingPrice)) || parseInt(askingPrice) <= 0) {
        showToast("Please specify an appropriate asking price.", "error");
        return;
      }
    }

    setCurrentStep(prev => prev + 1);
    window.scrollTo({ top: 100, behavior: "smooth" });
  };

  const handlePublishListing = (e: React.FormEvent) => {
    e.preventDefault();

    if (!askingPrice || isNaN(parseInt(askingPrice)) || parseInt(askingPrice) <= 0) {
      showToast("Please specify an appropriate asking price.", "error");
      return;
    }
    if (!sellerName || !sellerEmail || !sellerPhone || !locationStr) {
      showToast("Please fill in all requested seller contact fields.", "error");
      return;
    }

    setIsPublishing(true);

    setTimeout(async () => {
      const generatedId = `AW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newListing: UserListing = {
        id: generatedId,
        title: `${year} ${make} ${model}`,
        type: vehicleType,
        make: make,
        model: model,
        year: year,
        price: parseInt(askingPrice),
        condition: condition,
        mileage: mileage || "0",
        fuelType: fuelType || "Petrol",
        description: description,
        negotiable: negotiable,
        sellerName: sellerName,
        sellerEmail: sellerEmail,
        sellerPhone: sellerPhone,
        location: locationStr,
        features: checkedFeatures.length > 0 ? checkedFeatures : ["Air Conditioning", "ABS"],
        transmission: transmission,
        engineSize: engineSize,
        doors: doors,
        seats: seats,
        bikeType: bikeType,
        bikeEngine: bikeEngine,
        bikeMileage: bikeMileage,
        bikeGears: bikeGears,
        bicycleType: bicycleType,
        frameSize: frameSize,
        gears: gears,
        featured: featuredListing,
        urgent: urgentListing,
        photos: photos,
        datePosted: new Date().toISOString(),
        status: "active"
      };

      const listingData = {
        ...newListing,
        userId: currentUser ? currentUser.uid : "offline"
      };

      if (currentUser) {
        try {
          await setDoc(doc(db, "listings", generatedId), listingData);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.WRITE, `listings/${generatedId}`);
          throw err;
        }
      }

      try {
        const stored = localStorage.getItem("autoWorld_listings");
        const existing: UserListing[] = stored ? JSON.parse(stored) : [];
        existing.push(newListing);
        localStorage.setItem("autoWorld_listings", JSON.stringify(existing));
      } catch (err) {
        console.error("Local storage error:", err);
      }

      setPublishedListingId(generatedId);
      setPublishedTimeStr(new Date().toLocaleString());
      setIsPublishing(false);
      setCurrentStep(6); // Success step screen (changed from 5)
      window.scrollTo({ top: 100, behavior: "smooth" });
    }, 1800);
  };

  const handleResetWizardForm = () => {
    setVehicleType("");
    setMake("");
    setModel("");
    setYear("");
    setCondition(3);
    setMileage("");
    setFuelType("");
    setDescription("");
    setTransmission("");
    setEngineSize("");
    setPhotos([]);
    setAskingPrice("");
    setSellerName("");
    setSellerEmail("");
    setSellerPhone("");
    setLocationStr("");
    setCheckedFeatures([]);
    setCurrentStep(1);
  };

  return (
    <div id="sell-form-wrapper" className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in duration-305 bg-[#F4F1EA] text-[#1A1A1A] font-sans">
      
      {/* Top wizard stepper */}
      {currentStep <= 5 && (
        <div className="mb-10 border-b border-stone-300 pb-8">
          <div className="flex justify-between items-center relative py-2 mb-2">
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[1px] bg-stone-300 z-10" />
            
            {[1, 2, 3, 4, 5].map((stepNum) => {
              const titles = ["Category", "Specifications", "Media", "Pricing", "Contact"];
              const isActive = currentStep >= stepNum;
              const isCurrent = currentStep === stepNum;
              return (
                <div key={stepNum} className="flex flex-col items-center relative z-20">
                  <div className={`w-10 h-10 flex items-center justify-center font-bold text-xs transition border ${
                    isCurrent
                      ? "bg-stone-900 text-[#F4F1EA] border-stone-950"
                      : isActive
                      ? "bg-[#FAF8F5] text-stone-900 border-stone-400"
                      : "bg-stone-200 border-stone-300 text-stone-400"
                  }`}>
                    {stepNum}
                  </div>
                  <span className={`text-[9px] uppercase tracking-wider font-bold mt-2 font-sans ${
                    isCurrent ? "text-stone-900" : "text-stone-400"
                  }`}>{titles[stepNum - 1]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: Basic Specifications */}
      {currentStep === 1 && (
        <div className="bg-[#FAF8F5] border border-stone-300 p-8 space-y-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 block mb-1">Step One / Wizard</span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-900 uppercase">Basic Vehicle Category info</h2>
            <p className="text-stone-500 text-xs mt-1 leading-relaxed">Specify your category types and manufacturing parameters to draft your dossier index matching rules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block">Vehicle Category Type <span className="text-stone-400 font-light">(required)</span></label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
              >
                <option value="">Select Category</option>
                <option value="car">Car / Sedan</option>
                <option value="suv">SUV / Crossover</option>
                <option value="truck">Truck / Pickup</option>
                <option value="van">Van / Minivan</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
                <option value="commercial">Commercial Vehicle</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block">Make / Manufacturer <span className="text-stone-400 font-light">(required)</span></label>
              <select
                value={make}
                onChange={(e) => setMake(e.target.value)}
                disabled={!vehicleType}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-400 text-xs font-semibold focus:outline-none focus:border-stone-900 disabled:opacity-50"
              >
                <option value="">Select Manufacturer</option>
                {vehicleType && VEHICLE_MAKES[vehicleType]?.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {vehicleType && <option value="Other">Other / Custom</option>}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block">Vehicle Model <span className="text-stone-400 font-light">(required)</span></label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!make}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-400 text-xs font-semibold focus:outline-none focus:border-stone-900 disabled:opacity-50"
              >
                <option value="">Select Model</option>
                {make && VEHICLE_MODELS[make]?.map((mod) => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
                {make && <option value="Other">Other Model</option>}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block">Manufacturing Year <span className="text-stone-400 font-light">(required)</span></label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
              >
                <option value="">Select Year</option>
                {Array.from({ length: 35 }, (_, idx) => new Date().getFullYear() - idx).map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-5 border-t border-stone-200">
            <button
              onClick={handleNextStep}
              className="px-6 py-3.5 bg-stone-900 hover:bg-stone-850 text-[#F4F1EA] text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
            >
              Continue to Specifications
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Specs and Checklist Details */}
      {currentStep === 2 && (
        <div className="bg-[#FAF8F5] border border-stone-300 p-8 space-y-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 block mb-1">Step Two / Specifications</span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-900 uppercase">Mechanical Parameters</h2>
            <p className="text-stone-500 text-xs mt-1">Provide engine specs, mileage parameters, and list modifications honestly.</p>
          </div>

          {/* Condition Rating Display */}
          <div className="p-6 bg-[#F4F1EA] border border-stone-300 text-center space-y-2">
            <h3 className="text-xs uppercase tracking-wider font-bold text-stone-900">Declare Current Overall State Rating</h3>
            <div className="flex justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((val) => {
                const isActive = (hoveredCondition !== null ? hoveredCondition : condition) >= val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCondition(val)}
                    onMouseEnter={() => setHoveredCondition(val)}
                    onMouseLeave={() => setHoveredCondition(null)}
                    className="text-2xl transition cursor-pointer"
                  >
                    <Star className={`w-7 h-7 ${isActive ? "fill-stone-900 text-stone-900" : "text-stone-300"}`} />
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-500 block">
              STATE STATUS DETECTED: {ratingLabels[condition - 1]}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-550 uppercase tracking-widest block">Mileage Metric (mi / km)</label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-550 uppercase tracking-widest block">Power / Fuel Type</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
              >
                <option value="">Select Fuel</option>
                <option value="petrol">Petrol / Gasoline</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Full Electric</option>
                <option value="hybrid">Plugin Hybrid</option>
              </select>
            </div>
          </div>

          {/* Additional details for four wheelers */}
          {["car", "suv", "truck", "van", "commercial"].includes(vehicleType) && (
            <div className="border-t border-stone-200 pt-5 space-y-4">
              <h3 className="text-xs uppercase tracking-widest font-bold text-stone-900">Transmission & Auxiliary Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-stone-400 block uppercase font-bold">Transmission style</span>
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4F1EA] border border-stone-300 text-xs"
                  >
                    <option value="">Select style</option>
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual Transmission</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-[#555555] block uppercase font-bold">Volume / Engine size</span>
                  <input
                    type="text"
                    placeholder="e.g. 1500cc or 2.0L"
                    value={engineSize}
                    onChange={(e) => setEngineSize(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4F1EA] border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[10px] text-stone-400 block uppercase font-bold tracking-wider">Auxiliary Features Tags Checkbox</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {defaultFeatures.map((fName) => {
                    const isChecked = checkedFeatures.includes(fName);
                    return (
                      <button
                        key={fName}
                        type="button"
                        onClick={() => handleFeatureToggle(fName)}
                        className={`px-3 py-2.5 text-[10px] font-bold uppercase transition border text-left flex items-center justify-between cursor-pointer ${
                          isChecked
                            ? "bg-stone-900 border-stone-900 text-white"
                            : "bg-[#F4F1EA] border-stone-300 text-stone-705"
                        }`}
                      >
                        {fName}
                        {isChecked && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-stone-550 uppercase tracking-widest block">Textual specifications description <span className="text-stone-400 font-light">(required)</span></label>
            <textarea
              rows={4}
              placeholder="State modifications lists, history files, or dynamic components parameters honestly..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs focus:outline-none focus:border-stone-900 font-medium"
            />
            <span className="text-[9px] text-[#777777] block uppercase tracking-wider">Provide at least 15 characters of descriptive print words.</span>
          </div>

          <div className="flex justify-between pt-5 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-950 text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-3.5 bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center cursor-pointer animate-pulse"
            >
              Continue to Media upload
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Photos Drag and Drop */}
      {currentStep === 3 && (
        <div className="bg-[#FAF8F5] border border-stone-300 p-8 space-y-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 block mb-1">Step Three / Media Frame</span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-900 uppercase">Snapshot Documentation</h2>
            <p className="text-stone-500 text-xs mt-1">Upload at least one physical photograph matching standard verification guidelines.</p>
          </div>

          <div className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-stone-300 bg-[#F4F1EA] px-6 py-10 flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload className="w-8 h-8 text-stone-900 mb-3" />
              <h3 className="text-xs uppercase tracking-wider font-bold text-stone-800">Drag snapshots directly here</h3>
              <p className="text-[10px] uppercase text-stone-500 tracking-wider mt-1 text-center font-bold">Compatible with JPEG & PNG formats (Max size: 5MB)</p>
              
              <label className="mt-4 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-[10px] uppercase tracking-widest font-bold shadow-sm cursor-pointer select-none">
                Browse Files
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photos.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] text-[#555555] block uppercase tracking-widest font-bold">Files Ready for upload ({photos.length})</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photos.map((item, idx) => (
                    <div key={idx} className="relative aspect-video border border-stone-300 overflow-hidden group">
                      <img src={item.src} alt={item.alt} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-stone-950 text-white text-xs flex items-center justify-center hover:bg-stone-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-5 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-905 text-xs font-bold uppercase tracking-widest cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3.5 bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center cursor-pointer"
              >
                Proceed to Pricing Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Price & Valuation */}
      {currentStep === 4 && (
        <div className="bg-[#FAF8F5] border border-stone-300 p-8 space-y-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 block mb-1">Step Four / Price & Terms</span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-900 uppercase">Valuation Specifications</h2>
            <p className="text-stone-500 text-xs mt-1">Compile pricing parameters and confirm negotiability conditions.</p>
          </div>

          {/* Pricing Suggestion Card */}
          {suggestedMax > 0 && (
            <div className="p-5 bg-[#F4F1EA] border border-stone-305">
              <span className="text-[9px] uppercase tracking-wider text-stone-400 block font-bold">Dynamic Appraisal</span>
              <h3 className="text-sm font-serif font-bold italic text-stone-950 mt-1">Market Valuation Index</h3>
              <div className="text-lg font-serif font-bold text-stone-900 mt-0.5">
                ₹{suggestedMin.toLocaleString("en-IN")} – ₹{suggestedMax.toLocaleString("en-IN")} INR
              </div>
              <p className="text-[10px] tracking-wide text-stone-500 uppercase mt-1 leading-normal font-sans">Suggested estimation formulated on production year {year}, brand {make}, model {model}, overall condition score {condition}/5 and historic transaction indexes.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block font-sans">Target Asking Price (INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold">₹</span>
                <input
                  type="number"
                  placeholder="e.g. 1250000"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block">Negotiability Conditions</label>
              <select
                value={negotiable}
                onChange={(e) => setNegotiable(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
              >
                <option value="yes">Asking price is negotiable</option>
                <option value="no">Asking price is absolutely firm</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-5 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex-1 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-905 text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-2 py-3 bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center cursor-pointer animate-pulse"
            >
              Continue to Contacts
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Contact Details Form */}
      {currentStep === 5 && (
        <form onSubmit={handlePublishListing} className="bg-[#FAF8F5] border border-stone-300 p-8 space-y-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 block mb-1">Step Five / Broker Contact registry</span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-900 uppercase">Contact Information</h2>
            <p className="text-stone-500 text-xs mt-1">Please provide verified contact information. This will be added directly to the broker/seller details displayed for this vehicle listing.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block font-sans">Owner / Broker Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                required
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs focus:outline-none text-stone-900 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block font-sans">Owner Verified Email</label>
              <input
                type="email"
                placeholder="broker@example.com"
                value={sellerEmail}
                onChange={(e) => setSellerEmail(e.target.value)}
                required
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs focus:outline-none text-stone-900 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block font-sans">Owner Contact Number</label>
              <input
                type="tel"
                placeholder="+91 99999 88888"
                value={sellerPhone}
                onChange={(e) => setSellerPhone(e.target.value)}
                required
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs focus:outline-none text-stone-900 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block font-sans">Physical Coordinates / City Location</label>
              <input
                type="text"
                placeholder="e.g. Pune, Maharashtra"
                value={locationStr}
                onChange={(e) => setLocationStr(e.target.value)}
                required
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs focus:outline-none text-stone-900 font-semibold"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-5 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="flex-1 py-3 bg-[#FAF8F5] border border-[#CCCCCC] hover:bg-stone-200 text-stone-905 text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isPublishing}
              className="flex-2 py-3 bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center cursor-pointer"
            >
              {isPublishing ? "Publishing Listing dossier..." : "Publish & Register Listing"}
            </button>
          </div>
        </form>
      )}

      {/* STEP 6: Successful deploy panel layout page */}
      {currentStep === 6 && (
        <div className="bg-[#FAF8F5] border-2 border-stone-900 p-8 sm:p-12 text-center space-y-6 animate-in zoom-in-95 duration-200 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-stone-950 text-[#F4F1EA] flex items-center justify-center mx-auto border border-stone-800">
            <CheckCircle2 className="w-8 h-8 text-[#FAF8F5]" />
          </div>
          
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-stone-500 block">Deploy Success</span>
            <h2 className="text-2xl font-serif font-black text-stone-950 uppercase tracking-tight">Listing Blueprint Catalogued</h2>
            <p className="text-stone-605 text-sm leading-relaxed max-w-md mx-auto">
              Your vehicular dossier for {year} {make} {model} has been safely built and published into the verified registry ledger.
            </p>
          </div>

          <div className="bg-[#F4F1EA] border border-stone-300 p-5 text-left max-w-sm mx-auto text-xs space-y-1 text-stone-800 font-mono">
            <div><span className="text-stone-400 font-bold uppercase tracking-wider text-[9px] block">Receipt Blueprint ID</span> {publishedListingId}</div>
            <div className="pt-2"><span className="text-stone-400 font-bold uppercase tracking-wider text-[9px] block">Time Catalogued</span> {publishedTimeStr}</div>
            <div className="pt-2"><span className="text-stone-400 font-bold uppercase tracking-wider text-[9px] block">Status Inflow</span> Vetted / Active</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 max-w-sm mx-auto">
            <button
              onClick={() => setActiveTab("buy")}
              className="flex-1 py-3 bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-widest transition cursor-pointer"
            >
              Look Up Catalog
            </button>
            <button
              onClick={handleResetWizardForm}
              className="flex-1 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-950 text-xs font-bold uppercase tracking-widest transition cursor-pointer"
            >
              List Another
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
