import React, { useState, useEffect, useRef, useMemo } from "react";
import { Car, Tag, Sparkles, Upload, Trash2, Check, ArrowLeft, ArrowRight, Star, Heart, DollarSign, Calendar, Eye, MapPin, Phone, Mail, FileText, CheckCircle2, Crown, LogIn, ShieldAlert, Lock, X, AlertTriangle, Edit, Image as ImageIcon, Plus, Search, Filter, RefreshCw, Layers, ShieldCheck, CheckCircle, ChevronDown, ChevronUp, PhoneCall, MessageSquare, Clock, UserCheck, Send, CheckSquare, XCircle, User as UserIcon, ExternalLink, Wrench } from "lucide-react";
import { VEHICLE_MAKES, VEHICLE_MODELS, UserListing, INDIAN_RTO_STATES, INSURANCE_STATUS_OPTIONS, PUCC_STATUS_OPTIONS, HYPOTHECATION_OPTIONS, STATE_NOC_OPTIONS, ROAD_TAX_OPTIONS, DEFAULT_PARTS, UserPartListing, PartCategory, PartRarity, PART_CATEGORIES, PART_RARITY_TIERS, PART_BRANDS, PART_CONDITION_LABELS } from "../types";
import PartsUploadWizard from "./PartsUploadWizard";
import AdminPartsDesk from "./AdminPartsDesk";
import { getListingExpirationDetails } from "../lib/expirationManager";
import { subscribeToRealtimeCatalog } from "../lib/catalogSync";
import type { User as FirebaseUser } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import { setDoc, doc, collection, query, where, getDocs, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { db, storage, ref, uploadBytesResumable, getDownloadURL, handleFirestoreError, OperationType } from "../firebase";
import { dispatchAdminSmsAlert } from "../lib/notificationService";

export interface TestDriveRequest {
  id?: string;
  bookingRef: string;
  vehicleId: number | string;
  vehicleTitle: string;
  vehiclePrice?: number;
  vehicleImage?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerUserId?: string;
  listingId?: string;
  driveType: "doorstep" | "showroom";
  preferredDate: string;
  timeSlot: string;
  fullName: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: string;
  status: "scheduled" | "confirmed" | "completed" | "declined" | "cancelled" | "pending";
  sellerNote?: string;
}

export interface CallbackRequest {
  id?: string;
  callbackRef: string;
  itemType?: "vehicle" | "part";
  vehicleId?: number | string | null;
  vehicleTitle?: string;
  vehicleImage?: string;
  vehiclePrice?: number;
  partId?: number | string | null;
  partTitle?: string;
  partImage?: string;
  partPrice?: number;
  partCategory?: string;
  partNumber?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerUserId?: string;
  listingId?: string;
  fullName: string;
  phoneNumber: string;
  timeSlot?: string;
  queryTopic?: string;
  note?: string;
  createdAt: string;
  status: "pending" | "contacted" | "resolved" | "declined" | "cancelled";
  sellerNote?: string;
}

interface SellTabProps {
  setActiveTab: (tab: string) => void;
  subscriptionActive: boolean;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  currentUser: FirebaseUser | null;
  onSignInClick?: () => void;
}

// Helper function to re-compress base64 image data URLs using Canvas
const compressBase64Url = (dataUrl: string, maxDim = 550, quality = 0.55): Promise<string> => {
  if (!dataUrl || !dataUrl.startsWith("data:image")) return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

// Input Sanitization helper to strip executable HTML/script tags (preventing basic XSS attacks)
export const sanitizeInput = (input: string): string => {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
};

// Helper function to compress images using Canvas
const compressImageFile = (file: File, maxDim = 600, quality = 0.60): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return resolve("");
      compressBase64Url(src, maxDim, quality).then(resolve);
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

// Ensure photos array is well under Firestore's 1MB payload limit
const preparePhotosForFirestore = async (
  photos: { src: string; alt: string }[]
): Promise<{ src: string; alt: string }[]> => {
  if (!photos || photos.length === 0) return [];

  // Compress base64 images to max 600px width/height and 0.55 JPEG quality
  const compressedList = await Promise.all(
    photos.map(async (p) => {
      if (p.src && p.src.startsWith("data:image")) {
        const compressed = await compressBase64Url(p.src, 600, 0.55);
        return { ...p, src: compressed };
      }
      return p;
    })
  );

  // Calculate total payload length of all photo source strings
  let totalSize = compressedList.reduce((sum, p) => sum + (p.src ? p.src.length : 0), 0);

  // If total size exceeds 300,000 characters (~300KB), re-compress further (400px, 0.45 quality)
  if (totalSize > 300000) {
    const ultraCompressed = await Promise.all(
      compressedList.map(async (p) => {
        if (p.src && p.src.startsWith("data:image")) {
          const compressed = await compressBase64Url(p.src, 400, 0.45);
          return { ...p, src: compressed };
        }
        return p;
      })
    );
    return ultraCompressed;
  }

  return compressedList;
};

// ==========================================
// NHTSA vPIC API Interfaces & Response Wrappers
// Documentation: https://vpic.nhtsa.dot.gov/api/
// ==========================================
export interface NhtsaMakeItem {
  Make_ID: number;
  Make_Name: string;
}

export interface NhtsaModelItem {
  Make_ID: number;
  Make_Name: string;
  Model_ID: number;
  Model_Name: string;
}

export interface NhtsaResponse<T> {
  Count: number;
  Message: string;
  SearchCriteria?: string;
  Results: T[];
}

// Hardcoded years from 1990 up to the current year (2026) in descending order
const CURRENT_NHTSA_YEAR = 2026;
const NHTSA_YEARS = Array.from(
  { length: CURRENT_NHTSA_YEAR - 1990 + 1 },
  (_, idx) => (CURRENT_NHTSA_YEAR - idx).toString()
);

// Framer Motion Confetti Particle Shower for Celebration
const ConfettiExplosion = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    color: string;
    shape: "square" | "circle" | "strip" | "star";
    delay: number;
    duration: number;
  }>>([]);

  useEffect(() => {
    const colors = [
      "#F59E0B", // Gold / Amber
      "#10B981", // Emerald
      "#6366F1", // Indigo
      "#EC4899", // Pink
      "#3B82F6", // Blue
      "#1C1917", // Dark Stone
      "#F43F5E", // Rose
      "#8B5CF6", // Purple
    ];

    const newParticles = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 0.8) - (Math.PI * 0.4); // Spread outward & upward
      const distance = 180 + Math.random() * 520;
      const x = Math.sin(angle) * distance + (Math.random() * 80 - 40);
      const y = Math.cos(angle) * distance + 120 + Math.random() * 250;

      newParticles.push({
        id: i,
        x,
        y,
        rotation: Math.random() * 720 - 360,
        scale: 0.6 + Math.random() * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: (["square", "circle", "strip", "star"] as const)[Math.floor(Math.random() * 4)],
        delay: Math.random() * 0.3,
        duration: 2.2 + Math.random() * 1.6,
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-x-0 -top-12 bottom-0 pointer-events-none overflow-hidden z-30 flex justify-center items-start">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              opacity: 1,
              x: 0,
              y: 0,
              scale: 0,
              rotate: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              x: p.x,
              y: p.y,
              scale: [0, p.scale, p.scale, 0.2],
              rotate: p.rotation,
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.22, 1, 0.36, 1],
              times: [0, 0.15, 0.75, 1],
            }}
            style={{
              position: "absolute",
              backgroundColor: p.shape !== "star" ? p.color : "transparent",
              borderRadius: p.shape === "circle" ? "50%" : p.shape === "strip" ? "2px" : "1px",
              width: p.shape === "strip" ? "6px" : "11px",
              height: p.shape === "strip" ? "18px" : "11px",
            }}
          >
            {p.shape === "star" && (
              <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// Searchable Make / Manufacturer Component
// Ultra-fast, responsive & category-aware make selector
// ==========================================
interface SearchableMakeSelectProps {
  make: string;
  setMake: (make: string) => void;
  setModel: (model: string) => void;
  setVehicleType?: (type: string) => void;
  vehicleType?: string;
  customMake: string;
  setCustomMake: (val: string) => void;
  nhtsaMakes: string[];
  isLoadingMakes: boolean;
  VEHICLE_MAKES: Record<string, string[]>;
}

function SearchableMakeSelect({
  make,
  setMake,
  setModel,
  setVehicleType,
  vehicleType,
  customMake,
  setCustomMake,
  nhtsaMakes,
  isLoadingMakes,
  VEHICLE_MAKES
}: SearchableMakeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Category-aware popular brands
  const categoryPopular = useMemo(() => {
    if (vehicleType && VEHICLE_MAKES[vehicleType]) {
      return VEHICLE_MAKES[vehicleType];
    }
    return [
      "Toyota", "Honda", "Maruti Suzuki", "Tata", "Mahindra", "Hyundai",
      "Ford", "BMW", "Mercedes-Benz", "Audi", "Kia", "Volkswagen",
      "Porsche", "Tesla", "Royal Enfield", "Bajaj", "TVS", "Hero"
    ];
  }, [vehicleType, VEHICLE_MAKES]);

  // Handle click outside to close dropdown safely without blocking touch taps
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleSelectMake = (selectedMake: string) => {
    setMake(selectedMake);
    setModel(""); // Reset model when make changes
    setIsOpen(false);
    setSearchTerm("");
  };

  const cleanQuery = searchTerm.trim().toLowerCase();

  // Filter popular brands based on search query
  const filteredPopular = useMemo(() => {
    if (!cleanQuery) return categoryPopular;
    return categoryPopular.filter(brand =>
      brand.toLowerCase().includes(cleanQuery)
    );
  }, [cleanQuery, categoryPopular]);

  // Filter NHTSA Makes excluding category popular ones to avoid duplication
  const filteredNhtsa = useMemo(() => {
    if (!nhtsaMakes || nhtsaMakes.length === 0) return [];
    const catPopularLower = new Set(categoryPopular.map(b => b.toLowerCase()));
    
    const results: string[] = [];
    for (let i = 0; i < nhtsaMakes.length; i++) {
      const m = nhtsaMakes[i];
      const mLower = m.toLowerCase();
      if (!catPopularLower.has(mLower) && (!cleanQuery || mLower.includes(cleanQuery))) {
        results.push(m);
      }
    }
    return results;
  }, [cleanQuery, nhtsaMakes, categoryPopular]);

  // Cap NHTSA results to top 40 for instant 60fps rendering
  const cappedNhtsa = useMemo(() => filteredNhtsa.slice(0, 40), [filteredNhtsa]);

  const totalResultsCount = filteredPopular.length + filteredNhtsa.length;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select Vehicle Make or Manufacturer"
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 hover:border-stone-800 text-xs font-semibold focus:outline-none focus:border-stone-900 cursor-pointer flex items-center justify-between select-none transition text-left active:bg-stone-200"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Tag className="w-4 h-4 text-stone-500 shrink-0" aria-hidden="true" />
          {make ? (
            <span className="font-bold text-stone-900 truncate">
              {make === "Other" ? (customMake ? `Other: ${customMake}` : "Other / Custom Brand") : make}
            </span>
          ) : (
            <span className="text-stone-500 font-normal">
              {isLoadingMakes ? "Loading Makes from NHTSA..." : "Select Make / Manufacturer..."}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {make && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selected make"
              onClick={(e) => {
                e.stopPropagation();
                setMake("");
                setModel("");
                setCustomMake("");
              }}
              className="p-1 hover:bg-stone-300 rounded text-stone-600 hover:text-stone-900 transition active:scale-95"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          )}
          {isOpen ? <ChevronUp className="w-4 h-4 text-stone-600" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-stone-600" aria-hidden="true" />}
        </div>
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-stone-900 shadow-2xl z-50 overflow-hidden max-h-[380px] flex flex-col"
          >
            {/* Live Search Input Field */}
            <div className="p-2.5 bg-stone-100 border-b border-stone-200 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsOpen(false);
                    }
                  }}
                  placeholder="Type brand name (e.g. Toyota, BMW, Tata)..."
                  aria-label="Filter manufacturer list"
                  className="w-full pl-8 pr-8 py-2 bg-white border border-stone-300 text-sm sm:text-xs font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search input"
                    className="absolute right-2 text-stone-400 hover:text-stone-700 p-1"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Quick Tap Chips for Top Popular Brands */}
              {!cleanQuery && categoryPopular.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <span className="text-[9px] font-mono font-bold text-stone-400 uppercase shrink-0">Quick:</span>
                  {categoryPopular.slice(0, 7).map((brand) => (
                    <button
                      key={`chip-${brand}`}
                      type="button"
                      onClick={() => handleSelectMake(brand)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-stone-900 hover:text-white border border-stone-300 text-stone-800 transition shrink-0 rounded-sm active:scale-95"
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center mt-1.5 px-0.5 text-[9.5px] font-mono text-stone-500" aria-live="polite">
                <span>{isLoadingMakes ? "Fetching from NHTSA API..." : `${totalResultsCount} brands available`}</span>
                <span>Type to filter</span>
              </div>
            </div>

            {/* Scrollable Results List */}
            <div
              role="listbox"
              aria-label="Vehicle makes"
              className="overflow-y-auto divide-y divide-stone-100 font-sans text-xs grow"
            >
              {/* Popular Brands Section */}
              {filteredPopular.length > 0 && (
                <div>
                  <div className="bg-stone-100 px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-stone-700 sticky top-0 z-10 border-b border-stone-200">
                    Recommended Brands ({filteredPopular.length})
                  </div>
                  {filteredPopular.map((brand) => {
                    const isSelected = make === brand;
                    return (
                      <div
                        key={`pop-${brand}`}
                        role="option"
                        tabIndex={0}
                        aria-selected={isSelected}
                        onClick={() => handleSelectMake(brand)}
                        className={`px-3.5 py-3 cursor-pointer flex items-center justify-between transition active:bg-amber-100 ${
                          isSelected ? "bg-stone-900 font-bold text-white" : "hover:bg-stone-100 text-stone-900"
                        }`}
                      >
                        <span className="font-semibold text-xs sm:text-xs">{brand}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* All NHTSA Makes Section */}
              {cappedNhtsa.length > 0 && (
                <div>
                  <div className="bg-stone-100 px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-stone-700 sticky top-0 z-10 border-b border-stone-200">
                    Additional Makes ({filteredNhtsa.length})
                  </div>
                  {cappedNhtsa.map((brand) => {
                    const isSelected = make === brand;
                    return (
                      <div
                        key={`nhtsa-${brand}`}
                        role="option"
                        tabIndex={0}
                        aria-selected={isSelected}
                        onClick={() => handleSelectMake(brand)}
                        className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition active:bg-amber-100 ${
                          isSelected ? "bg-stone-900 font-bold text-white" : "hover:bg-stone-100 text-stone-800"
                        }`}
                      >
                        <span>{brand}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />}
                      </div>
                    );
                  })}
                  {filteredNhtsa.length > cappedNhtsa.length && (
                    <div className="p-2 bg-stone-50 border-t border-stone-200 text-center text-[10px] font-mono text-stone-500">
                      Showing top 40 of {filteredNhtsa.length} additional makes. Type in search box to narrow down.
                    </div>
                  )}
                </div>
              )}

              {/* Custom / Other Brand Option */}
              <div>
                <div
                  role="option"
                  tabIndex={0}
                  aria-selected={make === "Other"}
                  onClick={() => handleSelectMake("Other")}
                  className={`px-3.5 py-3 cursor-pointer flex items-center justify-between bg-stone-50 hover:bg-stone-100 text-stone-900 font-bold transition border-t border-stone-200 ${
                    make === "Other" ? "bg-stone-900 text-white" : ""
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    {searchTerm ? `Use custom brand: "${searchTerm}"` : "Other / Custom Brand"}
                  </span>
                  {make === "Other" && <Check className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />}
                </div>
              </div>

              {/* No match message */}
              {totalResultsCount === 0 && (
                <div className="p-4 text-center text-stone-500 space-y-2">
                  <p className="text-xs">No vehicle makes found matching &ldquo;<strong>{searchTerm}</strong>&rdquo;.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMake(searchTerm);
                      handleSelectMake("Other");
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider border border-amber-600 transition active:scale-95"
                  >
                    Add &ldquo;{searchTerm}&rdquo; as Custom Brand
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input for Custom Brand if "Other" is selected */}
      {make === "Other" && (
        <input
          type="text"
          placeholder="Enter custom vehicle brand (e.g. Pagani, Koenigsegg, Rivian)"
          value={customMake}
          onChange={(e) => setCustomMake(e.target.value)}
          className="w-full mt-2 px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-400 text-xs font-semibold focus:outline-none focus:border-stone-900 shadow-2xs"
        />
      )}
    </div>
  );
}

// ==========================================
// Searchable Model Select Component
// Enables ultra-fast, smooth search & filter across vehicle models
// ==========================================
interface SearchableModelSelectProps {
  year: string;
  make: string;
  model: string;
  setModel: (model: string) => void;
  customModel: string;
  setCustomModel: (val: string) => void;
  nhtsaModels: string[];
  isLoadingModels: boolean;
  VEHICLE_MODELS: Record<string, string[]>;
}

function SearchableModelSelect({
  year,
  make,
  model,
  setModel,
  customModel,
  setCustomModel,
  nhtsaModels,
  isLoadingModels,
  VEHICLE_MODELS,
}: SearchableModelSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDisabled = !year || !make || isLoadingModels;

  // Auto-close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleSelectModel = (selectedModel: string) => {
    setModel(selectedModel);
    if (selectedModel !== "Other") {
      setCustomModel("");
    }
    setIsOpen(false);
    setSearchTerm("");
  };

  // Derive and memoize deduplicated model list
  const uniqueModels = useMemo(() => {
    let rawModels: string[] = [];
    if (nhtsaModels && nhtsaModels.length > 0) {
      rawModels = nhtsaModels;
    } else if (make && make !== "Other") {
      rawModels = VEHICLE_MODELS[make] || Object.values(VEHICLE_MODELS).flat();
    }
    return Array.from(new Set(rawModels)).sort((a, b) => a.localeCompare(b));
  }, [nhtsaModels, make, VEHICLE_MODELS]);

  const cleanQuery = searchTerm.trim().toLowerCase();

  const filteredModels = useMemo(() => {
    if (!cleanQuery) return uniqueModels;
    return uniqueModels.filter((mod) =>
      mod.toLowerCase().includes(cleanQuery)
    );
  }, [uniqueModels, cleanQuery]);

  // Cap displayed models to top 50 for max DOM speed
  const cappedModels = useMemo(() => filteredModels.slice(0, 50), [filteredModels]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select Vehicle Model"
        disabled={isDisabled}
        onClick={() => {
          if (isDisabled) return;
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 hover:border-stone-800 text-xs font-semibold focus:outline-none focus:border-stone-900 cursor-pointer flex items-center justify-between select-none transition text-left disabled:opacity-50 disabled:bg-stone-200 disabled:cursor-not-allowed disabled:hover:border-stone-300 active:bg-stone-200"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {isDisabled && (!year || !make) ? (
            <Lock className="w-4 h-4 text-stone-400 shrink-0" aria-hidden="true" />
          ) : (
            <Car className="w-4 h-4 text-stone-500 shrink-0" aria-hidden="true" />
          )}
          {model ? (
            <span className="font-bold text-stone-900 truncate">
              {model === "Other" ? (customModel ? `Other: ${customModel}` : "Other / Custom Model") : model}
            </span>
          ) : (
            <span className="text-stone-500 font-normal truncate">
              {!year || !make
                ? "Select Year and Make first to enable model search"
                : isLoadingModels
                ? `Loading models for ${make} (${year})...`
                : uniqueModels.length > 0
                ? `Select or Search Model (${uniqueModels.length} models for ${make})...`
                : `Select or Search Model for ${make}...`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {model && !isDisabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selected model"
              onClick={(e) => {
                e.stopPropagation();
                setModel("");
                setCustomModel("");
              }}
              className="p-1 hover:bg-stone-300 rounded text-stone-600 hover:text-stone-900 transition active:scale-95"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          )}
          {isOpen ? <ChevronUp className="w-4 h-4 text-stone-600" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-stone-600" aria-hidden="true" />}
        </div>
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && !isDisabled && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-stone-900 shadow-2xl z-50 overflow-hidden max-h-[380px] flex flex-col"
          >
            {/* Live Search Input Field */}
            <div className="p-2.5 bg-stone-100 border-b border-stone-200 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsOpen(false);
                    }
                  }}
                  placeholder={`Search ${make} models...`}
                  aria-label="Filter vehicle model list"
                  className="w-full pl-8 pr-8 py-2 bg-white border border-stone-300 text-sm sm:text-xs font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search input"
                    className="absolute right-2 text-stone-400 hover:text-stone-700 p-1"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Quick Tap Chips for Top 6 Models if available */}
              {!cleanQuery && uniqueModels.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <span className="text-[9px] font-mono font-bold text-stone-400 uppercase shrink-0">Popular:</span>
                  {uniqueModels.slice(0, 6).map((mod) => (
                    <button
                      key={`chip-mod-${mod}`}
                      type="button"
                      onClick={() => handleSelectModel(mod)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-stone-900 hover:text-white border border-stone-300 text-stone-800 transition shrink-0 rounded-sm active:scale-95"
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center mt-1.5 px-0.5 text-[9.5px] font-mono text-stone-500" aria-live="polite">
                <span>
                  {isLoadingModels
                    ? "Fetching from NHTSA API..."
                    : `${filteredModels.length} models found for ${make} ${year ? `(${year})` : ""}`}
                </span>
                <span>Type to filter</span>
              </div>
            </div>

            {/* Scrollable Results List */}
            <div
              role="listbox"
              aria-label="Vehicle models"
              className="overflow-y-auto divide-y divide-stone-100 font-sans text-xs grow"
            >
              {/* Models List */}
              {cappedModels.length > 0 && (
                <div>
                  <div className="bg-stone-100 px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-stone-700 sticky top-0 z-10 border-b border-stone-200">
                    {nhtsaModels.length > 0
                      ? `NHTSA Models (${filteredModels.length})`
                      : `Suggested Models (${filteredModels.length})`}
                  </div>
                  {cappedModels.map((mod) => {
                    const isSelected = model === mod;
                    return (
                      <div
                        key={`model-${mod}`}
                        role="option"
                        tabIndex={0}
                        aria-selected={isSelected}
                        onClick={() => handleSelectModel(mod)}
                        className={`px-3.5 py-3 cursor-pointer flex items-center justify-between transition active:bg-amber-100 ${
                          isSelected
                            ? "bg-stone-900 font-bold text-white"
                            : "hover:bg-stone-100 text-stone-800"
                        }`}
                      >
                        <span className="font-medium text-xs sm:text-xs">{mod}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />}
                      </div>
                    );
                  })}
                  {filteredModels.length > cappedModels.length && (
                    <div className="p-2 bg-stone-50 border-t border-stone-200 text-center text-[10px] font-mono text-stone-500">
                      Showing top 50 of {filteredModels.length} models. Type in search box to narrow down.
                    </div>
                  )}
                </div>
              )}

              {/* Custom / Other Model Option */}
              <div>
                <div
                  role="option"
                  tabIndex={0}
                  aria-selected={model === "Other"}
                  onClick={() => handleSelectModel("Other")}
                  className={`px-3.5 py-3 cursor-pointer flex items-center justify-between bg-stone-50 hover:bg-stone-100 text-stone-900 font-bold transition border-t border-stone-200 ${
                    model === "Other" ? "bg-stone-900 text-white" : ""
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    {searchTerm ? `Use custom model: "${searchTerm}"` : "Other / Custom Model"}
                  </span>
                  {model === "Other" && <Check className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />}
                </div>
              </div>

              {/* No match message */}
              {filteredModels.length === 0 && (
                <div className="p-4 text-center text-stone-500 space-y-2">
                  <p className="text-xs">No models found matching &ldquo;<strong>{searchTerm}</strong>&rdquo; for {make}.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomModel(searchTerm);
                      handleSelectModel("Other");
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider border border-amber-600 transition active:scale-95"
                  >
                    Add &ldquo;{searchTerm}&rdquo; as Custom Model
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input for Custom Model if "Other" is selected */}
      {(model === "Other" || make === "Other") && (
        <input
          type="text"
          placeholder="Enter custom vehicle model name (e.g. Model S, Supra, GT3 RS)"
          value={customModel}
          onChange={(e) => setCustomModel(e.target.value)}
          className="w-full mt-2 px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-400 text-xs font-semibold focus:outline-none focus:border-stone-900 shadow-2xs"
        />
      )}
    </div>
  );
}

export default function SellTab({ setActiveTab, subscriptionActive, showToast, currentUser, onSignInClick }: SellTabProps) {
  const isAdmin = Boolean(currentUser?.email && (
    currentUser.email.toLowerCase() === "afrojalamansari461@gmail.com" ||
    currentUser.email.toLowerCase().includes("admin")
  ));

  const [currentStep, setCurrentStep] = useState(1);
  const [confettiKey, setConfettiKey] = useState(0);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);

  // View Mode: "wizard" (List a Vehicle) vs "list_part" (List a Part) vs "my_catalog" (Vehicle Catalog) vs "part_desk" (Part Desk) vs "requests" (Buyer Requests & Leads)
  const [viewMode, setViewMode] = useState<"wizard" | "list_part" | "my_catalog" | "part_desk" | "requests" | "parts">(() => {
    try {
      const initMode = sessionStorage.getItem("autoWorld_sell_initial_mode");
      if (initMode === "part" || initMode === "parts" || initMode === "list_part") {
        sessionStorage.removeItem("autoWorld_sell_initial_mode");
        return "list_part";
      }
      if (initMode === "part_desk") {
        sessionStorage.removeItem("autoWorld_sell_initial_mode");
        return "part_desk";
      }
      if (initMode === "my_catalog") {
        sessionStorage.removeItem("autoWorld_sell_initial_mode");
        return "my_catalog";
      }
      if (initMode === "requests") {
        sessionStorage.removeItem("autoWorld_sell_initial_mode");
        return "requests";
      }
    } catch (e) {}
    return "wizard";
  });

  // Performance Parts Count State for Desk Badge
  const [totalPartsCount, setTotalPartsCount] = useState<number>(() => DEFAULT_PARTS.length);

  useEffect(() => {
    const unsub = subscribeToRealtimeCatalog((catalog) => {
      const userParts = catalog.userParts || [];
      setTotalPartsCount(DEFAULT_PARTS.length + userParts.length);
    });
    return () => {
      if (unsub && typeof unsub === "function") unsub();
    };
  }, []);

  // Buyer Requests & Leads State
  const [testDriveRequests, setTestDriveRequests] = useState<TestDriveRequest[]>([]);
  const [callbackRequests, setCallbackRequests] = useState<CallbackRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestItemTargetFilter, setRequestItemTargetFilter] = useState<"all" | "vehicles" | "parts">("all");
  const [requestTypeFilter, setRequestTypeFilter] = useState<"all" | "test_drives" | "callbacks">("all");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | "pending" | "confirmed" | "completed" | "declined">("all");
  const [requestSearchQuery, setRequestSearchQuery] = useState("");
  const [selectedVehicleIdFilter, setSelectedVehicleIdFilter] = useState<string>("all");
  const [showOnlyMyVehiclesRequests, setShowOnlyMyVehiclesRequests] = useState<boolean>(true);
  const [editingNoteForReq, setEditingNoteForReq] = useState<string | null>(null);
  const [sellerNoteInput, setSellerNoteInput] = useState<string>("");

  // User's own listings state & real-time sync
  const [userListings, setUserListings] = useState<UserListing[]>([]);
  const [isLoadingUserListings, setIsLoadingUserListings] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilterStatus, setCatalogFilterStatus] = useState<"all" | "active" | "pending" | "hidden" | "sold">("all");

  // User's own part listings state & real-time sync
  const [userPartListings, setUserPartListings] = useState<UserPartListing[]>([]);
  const [isLoadingUserPartListings, setIsLoadingUserPartListings] = useState(false);
  const [partCatalogSearch, setPartCatalogSearch] = useState("");
  const [partCatalogFilterStatus, setPartCatalogFilterStatus] = useState<"all" | "active" | "pending" | "hidden" | "sold">("all");

  // Edit Part Modal States
  const [editingPartListing, setEditingPartListing] = useState<UserPartListing | null>(null);
  const [editPartForm, setEditPartForm] = useState<Partial<UserPartListing>>({});
  const [isSavingPartEdit, setIsSavingPartEdit] = useState(false);

  // Manage Part Photos Modal States
  const [photoManagingPartListing, setPhotoManagingPartListing] = useState<UserPartListing | null>(null);
  const [managePartPhotosList, setManagePartPhotosList] = useState<{ src: string; alt: string }[]>([]);
  const [newPartPhotoUrlInput, setNewPartPhotoUrlInput] = useState("");
  const [isSavingPartPhotos, setIsSavingPartPhotos] = useState(false);

  // Delete Part Confirmation Modal States
  const [deletingPartListing, setDeletingPartListing] = useState<UserPartListing | null>(null);
  const [isDeletingPart, setIsDeletingPart] = useState(false);

  // Edit Listing Modal States
  const [editingListing, setEditingListing] = useState<UserListing | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserListing>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Manage Photos Modal States
  const [photoManagingListing, setPhotoManagingListing] = useState<UserListing | null>(null);
  const [managePhotosList, setManagePhotosList] = useState<{ src: string; alt: string }[]>([]);
  const [newPhotoUrlInput, setNewPhotoUrlInput] = useState("");
  const [isSavingPhotos, setIsSavingPhotos] = useState(false);

  // Delete Confirmation Modal States
  const [deletingListing, setDeletingListing] = useState<UserListing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Free Tier Listing Limiting
  const [existingListingsCount, setExistingListingsCount] = useState(0);

  // Real-time listener for current user's listings in Firestore
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) {
      setUserListings([]);
      setExistingListingsCount(0);
      return;
    }

    setIsLoadingUserListings(true);
    const listingsRef = collection(db, "listings");

    const unsub = onSnapshot(listingsRef, (snapshot) => {
      const allItems: UserListing[] = [];
      const userUid = currentUser.uid;
      const userEmail = currentUser.email?.toLowerCase();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isOwner = data.userId === userUid || 
          (data.sellerEmail && userEmail && String(data.sellerEmail).toLowerCase() === userEmail);

        if (isOwner) {
          allItems.push({
            id: docSnap.id,
            ...data
          } as UserListing);
        }
      });

      // Also check local storage for offline / cached items
      try {
        const stored = localStorage.getItem("autoWorld_listings");
        if (stored) {
          const localItems: UserListing[] = JSON.parse(stored);
          localItems.forEach((localItem) => {
            const isOwner = localItem.userId === userUid || 
              (localItem.sellerEmail && userEmail && String(localItem.sellerEmail).toLowerCase() === userEmail);
            if (isOwner && !allItems.some(item => item.id === localItem.id)) {
              allItems.push(localItem);
            }
          });
        }
      } catch (e) {
        console.warn("Local storage fallback read error:", e);
      }

      allItems.sort((a, b) => new Date(b.datePosted || 0).getTime() - new Date(a.datePosted || 0).getTime());
      setUserListings(allItems);
      setExistingListingsCount(allItems.length);
      setIsLoadingUserListings(false);
    }, (err) => {
      console.warn("User listings snapshot listener error:", err);
      // Fallback local storage read
      try {
        const stored = localStorage.getItem("autoWorld_listings");
        if (stored) {
          const localItems: UserListing[] = JSON.parse(stored);
          const userEmail = currentUser.email?.toLowerCase();
          const filtered = localItems.filter(l => 
            l.userId === currentUser.uid || (l.sellerEmail && userEmail && String(l.sellerEmail).toLowerCase() === userEmail)
          );
          setUserListings(filtered);
          setExistingListingsCount(filtered.length);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingUserListings(false);
      }
    });

    return () => unsub();
  }, [currentUser]);

  // Real-time listener for current user's performance parts in Firestore
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) {
      setUserPartListings([]);
      return;
    }

    setIsLoadingUserPartListings(true);
    const partsRef = collection(db, "parts");

    const unsubParts = onSnapshot(partsRef, (snapshot) => {
      const allParts: UserPartListing[] = [];
      const userUid = currentUser.uid;
      const userEmail = currentUser.email?.toLowerCase();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isOwner = data.userId === userUid || 
          (data.sellerEmail && userEmail && String(data.sellerEmail).toLowerCase() === userEmail);

        if (isOwner) {
          allParts.push({
            id: docSnap.id,
            ...data
          } as UserPartListing);
        }
      });

      // Also check local storage for offline / cached items
      try {
        const stored = localStorage.getItem("autoworld_user_parts");
        if (stored) {
          const localParts: UserPartListing[] = JSON.parse(stored);
          localParts.forEach((localPart) => {
            const isOwner = localPart.userId === userUid || 
              (localPart.sellerEmail && userEmail && String(localPart.sellerEmail).toLowerCase() === userEmail);
            if (isOwner && !allParts.some(item => String(item.id) === String(localPart.id))) {
              allParts.push(localPart);
            }
          });
        }
      } catch (e) {
        console.warn("Local storage fallback read error for parts:", e);
      }

      allParts.sort((a, b) => new Date(b.datePosted || (b as any).createdAt || 0).getTime() - new Date(a.datePosted || (a as any).createdAt || 0).getTime());
      setUserPartListings(allParts);
      setIsLoadingUserPartListings(false);
    }, (err) => {
      console.warn("User parts snapshot listener error:", err);
      try {
        const stored = localStorage.getItem("autoworld_user_parts");
        if (stored) {
          const localParts: UserPartListing[] = JSON.parse(stored);
          const userEmail = currentUser.email?.toLowerCase();
          const filtered = localParts.filter(p => 
            p.userId === currentUser.uid || (p.sellerEmail && userEmail && p.sellerEmail.toLowerCase() === userEmail)
          );
          setUserPartListings(filtered);
        }
      } catch (e) {
        console.warn("Fallback local read failed:", e);
      }
      setIsLoadingUserPartListings(false);
    });

    return () => unsubParts();
  }, [currentUser]);

  // Real-time listener for test drives & callback requests
  useEffect(() => {
    setIsLoadingRequests(true);

    const unsubTD = onSnapshot(collection(db, "test_drives"), (snapshot) => {
      const tdList: TestDriveRequest[] = [];
      snapshot.forEach((docSnap) => {
        tdList.push({ id: docSnap.id, ...docSnap.data() } as TestDriveRequest);
      });

      try {
        const stored = localStorage.getItem("autoWorld_test_drives");
        if (stored) {
          const localItems: TestDriveRequest[] = JSON.parse(stored);
          localItems.forEach((item) => {
            if (!tdList.some((t) => t.bookingRef === item.bookingRef)) {
              tdList.push(item);
            }
          });
        }
      } catch (e) {}

      tdList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setTestDriveRequests(tdList);
      setIsLoadingRequests(false);
    }, (err) => {
      console.warn("Test drives firestore snapshot error:", err);
      try {
        const stored = localStorage.getItem("autoWorld_test_drives");
        if (stored) {
          setTestDriveRequests(JSON.parse(stored));
        }
      } catch (e) {}
      setIsLoadingRequests(false);
    });

    const unsubCB = onSnapshot(collection(db, "callback_requests"), (snapshot) => {
      const cbList: CallbackRequest[] = [];
      snapshot.forEach((docSnap) => {
        cbList.push({ id: docSnap.id, ...docSnap.data() } as CallbackRequest);
      });

      try {
        const stored = localStorage.getItem("autoWorld_callback_requests");
        if (stored) {
          const localItems: CallbackRequest[] = JSON.parse(stored);
          localItems.forEach((item) => {
            if (!cbList.some((c) => c.callbackRef === item.callbackRef)) {
              cbList.push(item);
            }
          });
        }
      } catch (e) {}

      cbList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setCallbackRequests(cbList);
    }, (err) => {
      console.warn("Callback requests firestore snapshot error:", err);
      try {
        const stored = localStorage.getItem("autoWorld_callback_requests");
        if (stored) {
          setCallbackRequests(JSON.parse(stored));
        }
      } catch (e) {}
    });

    const handleCustomUpdate = () => {
      try {
        const storedTD = JSON.parse(localStorage.getItem("autoWorld_test_drives") || "[]");
        setTestDriveRequests((prev) => {
          const combined = [...prev];
          storedTD.forEach((item: TestDriveRequest) => {
            const idx = combined.findIndex((t) => t.bookingRef === item.bookingRef);
            if (idx >= 0) {
              combined[idx] = item;
            } else {
              combined.unshift(item);
            }
          });
          return combined;
        });

        const storedCB = JSON.parse(localStorage.getItem("autoWorld_callback_requests") || "[]");
        setCallbackRequests((prev) => {
          const combined = [...prev];
          storedCB.forEach((item: CallbackRequest) => {
            const idx = combined.findIndex((c) => c.callbackRef === item.callbackRef);
            if (idx >= 0) {
              combined[idx] = item;
            } else {
              combined.unshift(item);
            }
          });
          return combined;
        });
      } catch (e) {}
    };

    window.addEventListener("autoworld_requests_updated", handleCustomUpdate);

    return () => {
      unsubTD();
      unsubCB();
      window.removeEventListener("autoworld_requests_updated", handleCustomUpdate);
    };
  }, []);

  // Update Request Status
  const handleUpdateRequestStatus = async (type: "test_drive" | "callback", refCode: string, newStatus: string, docId?: string) => {
    try {
      if (type === "test_drive") {
        if (docId && db) {
          await updateDoc(doc(db, "test_drives", docId), { status: newStatus });
        }
        setTestDriveRequests((prev) =>
          prev.map((item) => (item.bookingRef === refCode ? { ...item, status: newStatus as any } : item))
        );
        const stored = JSON.parse(localStorage.getItem("autoWorld_test_drives") || "[]");
        const updated = stored.map((item: any) => (item.bookingRef === refCode ? { ...item, status: newStatus } : item));
        localStorage.setItem("autoWorld_test_drives", JSON.stringify(updated));
      } else {
        if (docId && db) {
          await updateDoc(doc(db, "callback_requests", docId), { status: newStatus });
        }
        setCallbackRequests((prev) =>
          prev.map((item) => (item.callbackRef === refCode ? { ...item, status: newStatus as any } : item))
        );
        const stored = JSON.parse(localStorage.getItem("autoWorld_callback_requests") || "[]");
        const updated = stored.map((item: any) => (item.callbackRef === refCode ? { ...item, status: newStatus } : item));
        localStorage.setItem("autoWorld_callback_requests", JSON.stringify(updated));
      }

      showToast(`Request #${refCode} status updated to '${newStatus.toUpperCase()}'.`, "success");
      window.dispatchEvent(new CustomEvent("autoworld_requests_updated"));
    } catch (err) {
      console.error("Error updating request status:", err);
      showToast(`Updated status locally for #${refCode}`, "info");
    }
  };

  // Save Seller Private Note
  const handleSaveSellerNote = async (type: "test_drive" | "callback", refCode: string, noteText: string, docId?: string) => {
    try {
      if (type === "test_drive") {
        if (docId && db) {
          await updateDoc(doc(db, "test_drives", docId), { sellerNote: noteText });
        }
        setTestDriveRequests((prev) =>
          prev.map((item) => (item.bookingRef === refCode ? { ...item, sellerNote: noteText } : item))
        );
        const stored = JSON.parse(localStorage.getItem("autoWorld_test_drives") || "[]");
        const updated = stored.map((item: any) => (item.bookingRef === refCode ? { ...item, sellerNote: noteText } : item));
        localStorage.setItem("autoWorld_test_drives", JSON.stringify(updated));
      } else {
        if (docId && db) {
          await updateDoc(doc(db, "callback_requests", docId), { sellerNote: noteText });
        }
        setCallbackRequests((prev) =>
          prev.map((item) => (item.callbackRef === refCode ? { ...item, sellerNote: noteText } : item))
        );
        const stored = JSON.parse(localStorage.getItem("autoWorld_callback_requests") || "[]");
        const updated = stored.map((item: any) => (item.callbackRef === refCode ? { ...item, sellerNote: noteText } : item));
        localStorage.setItem("autoWorld_callback_requests", JSON.stringify(updated));
      }

      showToast(`Seller note saved for #${refCode}`, "success");
      setEditingNoteForReq(null);
      setSellerNoteInput("");
      window.dispatchEvent(new CustomEvent("autoworld_requests_updated"));
    } catch (err) {
      console.error("Error saving note:", err);
      showToast("Note saved locally", "info");
      setEditingNoteForReq(null);
    }
  };

  // Delete Request
  const handleDeleteRequest = async (type: "test_drive" | "callback", refCode: string, docId?: string) => {
    if (!window.confirm(`Are you sure you want to delete request #${refCode}?`)) return;

    try {
      if (type === "test_drive") {
        if (docId && db) {
          await deleteDoc(doc(db, "test_drives", docId));
        }
        setTestDriveRequests((prev) => prev.filter((item) => item.bookingRef !== refCode));
        const stored = JSON.parse(localStorage.getItem("autoWorld_test_drives") || "[]");
        const filtered = stored.filter((item: any) => item.bookingRef !== refCode);
        localStorage.setItem("autoWorld_test_drives", JSON.stringify(filtered));
      } else {
        if (docId && db) {
          await deleteDoc(doc(db, "callback_requests", docId));
        }
        setCallbackRequests((prev) => prev.filter((item) => item.callbackRef !== refCode));
        const stored = JSON.parse(localStorage.getItem("autoWorld_callback_requests") || "[]");
        const filtered = stored.filter((item: any) => item.callbackRef !== refCode);
        localStorage.setItem("autoWorld_callback_requests", JSON.stringify(filtered));
      }

      showToast(`Request #${refCode} removed.`, "info");
      window.dispatchEvent(new CustomEvent("autoworld_requests_updated"));
    } catch (err) {
      console.error("Error deleting request:", err);
      showToast("Removed request locally", "info");
    }
  };

  // Quick Status Toggle Handler
  const handleQuickStatusChange = async (listingId: string, newStatus: "active" | "pending" | "sold") => {
    const targetListing = userListings.find(l => l.id === listingId);
    if (targetListing?.status === "hidden" && !isAdmin) {
      showToast("This car listing was hidden by Admin. You cannot unhide or change its status.", "error");
      return;
    }

    try {
      await updateDoc(doc(db, "listings", listingId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Update LocalStorage
      try {
        const stored = localStorage.getItem("autoWorld_listings");
        if (stored) {
          const localListings: UserListing[] = JSON.parse(stored);
          const updated = localListings.map(l => l.id === listingId ? { ...l, status: newStatus } : l);
          localStorage.setItem("autoWorld_listings", JSON.stringify(updated));
        }
      } catch (e) {
        console.warn("LocalStorage status update error:", e);
      }

      window.dispatchEvent(new Event("autoWorld_db_update"));
      showToast(`Listing status updated to ${newStatus.toUpperCase()}`, "success");
    } catch (err: any) {
      console.error("Status update error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `listings/${listingId}`);
      showToast("Failed to update status.", "error");
    }
  };

  // Open Edit Listing Modal
  const handleOpenEditModal = (listing: UserListing) => {
    setEditingListing(listing);
    setEditForm({
      title: listing.title,
      price: listing.price,
      make: listing.make,
      model: listing.model,
      year: listing.year,
      mileage: listing.mileage,
      fuelType: listing.fuelType,
      transmission: listing.transmission,
      description: listing.description,
      negotiable: listing.negotiable,
      sellerName: listing.sellerName,
      sellerPhone: listing.sellerPhone,
      sellerEmail: listing.sellerEmail,
      location: listing.location,
      status: listing.status,
      featured: listing.featured,
      urgent: listing.urgent
    });
  };

  // Save Edit Listing
  const handleSaveEditListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    setIsSavingEdit(true);
    try {
      const preparedPhotos = editForm.photos ? await preparePhotosForFirestore(editForm.photos) : undefined;
      const docRef = doc(db, "listings", editingListing.id);
      const safeStatus = (editingListing.status === "hidden" && !isAdmin) ? "hidden" : (editForm.status || editingListing.status || "active");
      const updatedFields = {
        ...editingListing,
        ...editForm,
        status: safeStatus,
        ...(preparedPhotos ? { photos: preparedPhotos } : {}),
        price: typeof editForm.price === "number" ? editForm.price : parseInt(String(editForm.price || editingListing.price)),
        updatedAt: new Date().toISOString()
      };

      const cleanFields = Object.fromEntries(
        Object.entries(updatedFields).filter(([_, v]) => v !== undefined)
      );

      await setDoc(docRef, cleanFields, { merge: true });

      // Update local storage
      try {
        const stored = localStorage.getItem("autoWorld_listings");
        if (stored) {
          const localListings: UserListing[] = JSON.parse(stored);
          const idx = localListings.findIndex(l => l.id === editingListing.id);
          if (idx !== -1) {
            localListings[idx] = { ...localListings[idx], ...cleanFields };
            localStorage.setItem("autoWorld_listings", JSON.stringify(localListings));
          }
        }
      } catch (e) {
        console.warn("Local storage update error:", e);
      }

      window.dispatchEvent(new Event("autoWorld_db_update"));
      showToast("Vehicle listing details updated successfully!", "success");
      setEditingListing(null);
    } catch (err: any) {
      console.error("Save edit error:", err);
      if (!String(err?.message || "").includes("exceeds the maximum allowed size")) {
        handleFirestoreError(err, OperationType.UPDATE, `listings/${editingListing.id}`);
      }
      showToast("Failed to save changes. Document size or data format error.", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Manage Photos Modal
  const handleOpenPhotoManager = (listing: UserListing) => {
    setPhotoManagingListing(listing);
    setManagePhotosList(listing.photos ? [...listing.photos] : []);
    setNewPhotoUrlInput("");
  };

  // Add Photo File Handler (Convert to Base64 with compression)
  const handleAddPhotoFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    for (const file of files as File[]) {
      try {
        const compressedSrc = await compressImageFile(file, 600, 0.60);
        if (compressedSrc) {
          setManagePhotosList(prev => [...prev, { src: compressedSrc, alt: file.name }]);
        }
      } catch (err) {
        console.error("Image processing error:", err);
      }
    }
    e.target.value = "";
  };

  // Add Photo by URL
  const handleAddPhotoUrl = () => {
    if (!newPhotoUrlInput.trim()) return;
    setManagePhotosList(prev => [...prev, { src: newPhotoUrlInput.trim(), alt: "Vehicle Photo" }]);
    setNewPhotoUrlInput("");
    showToast("Added new photo URL to gallery list!", "info");
  };

  // Save Managed Photos
  const handleSavePhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoManagingListing) return;

    if (managePhotosList.length === 0) {
      showToast("Please keep at least one photo for your vehicle listing.", "error");
      return;
    }

    setIsSavingPhotos(true);
    try {
      const preparedPhotos = await preparePhotosForFirestore(managePhotosList);
      const docRef = doc(db, "listings", photoManagingListing.id);
      await updateDoc(docRef, {
        photos: preparedPhotos,
        updatedAt: new Date().toISOString()
      });

      // Local storage sync
      try {
        const stored = localStorage.getItem("autoWorld_listings");
        if (stored) {
          const localListings: UserListing[] = JSON.parse(stored);
          const idx = localListings.findIndex(l => l.id === photoManagingListing.id);
          if (idx !== -1) {
            localListings[idx].photos = managePhotosList;
            localStorage.setItem("autoWorld_listings", JSON.stringify(localListings));
          }
        }
      } catch (e) {
        console.warn("Local storage update error:", e);
      }

      window.dispatchEvent(new Event("autoWorld_db_update"));
      showToast("Photo gallery updated successfully!", "success");
      setPhotoManagingListing(null);
    } catch (err: any) {
      console.error("Save photos error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `listings/${photoManagingListing.id}`);
      showToast("Failed to save photos.", "error");
    } finally {
      setIsSavingPhotos(false);
    }
  };

  // Confirm Delete Listing
  const handleConfirmDeleteListing = async () => {
    if (!deletingListing) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "listings", deletingListing.id));

      // Local storage sync
      try {
        const stored = localStorage.getItem("autoWorld_listings");
        if (stored) {
          const localListings: UserListing[] = JSON.parse(stored);
          const filtered = localListings.filter(l => l.id !== deletingListing.id);
          localStorage.setItem("autoWorld_listings", JSON.stringify(filtered));
        }
      } catch (e) {
        console.warn("Local storage delete error:", e);
      }

      window.dispatchEvent(new Event("autoWorld_db_update"));
      showToast(`Listing "${deletingListing.title}" deleted permanently.`, "info");
      setDeletingListing(null);
    } catch (err: any) {
      console.error("Delete listing error:", err);
      handleFirestoreError(err, OperationType.DELETE, `listings/${deletingListing.id}`);
      showToast("Failed to delete listing.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ----------------------------------------------------
  // PERFORMANCE PART CATALOG HANDLERS
  // ----------------------------------------------------
  // Quick Part Status Change (Active / Pending / Sold)
  const handleQuickPartStatusChange = async (partId: string | number, newStatus: "active" | "pending" | "sold") => {
    try {
      const docRef = doc(db, "parts", String(partId));
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      setUserPartListings(prev => prev.map(p => String(p.id) === String(partId) ? { ...p, status: newStatus } : p));

      try {
        const stored = localStorage.getItem("autoworld_user_parts");
        if (stored) {
          const localParts: UserPartListing[] = JSON.parse(stored);
          const updated = localParts.map(p => String(p.id) === String(partId) ? { ...p, status: newStatus } : p);
          localStorage.setItem("autoworld_user_parts", JSON.stringify(updated));
        }
      } catch (e) {
        console.warn("LocalStorage part status update error:", e);
      }

      window.dispatchEvent(new Event("autoWorld_parts_update"));
      showToast(`Part status updated to ${newStatus.toUpperCase()}`, "success");
    } catch (err: any) {
      console.error("Part status update error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `parts/${partId}`);
      showToast("Failed to update part status.", "error");
    }
  };

  // Open Edit Part Modal
  const handleOpenEditPartModal = (part: UserPartListing) => {
    setEditingPartListing(part);
    setEditPartForm({
      title: part.title,
      price: part.price,
      brand: part.brand,
      category: part.category,
      rarity: part.rarity,
      condition: part.condition,
      compatibleVehicles: part.compatibleVehicles,
      partNumber: part.partNumber || "",
      description: part.description,
      negotiable: part.negotiable,
      sellerName: part.sellerName,
      sellerPhone: part.sellerPhone,
      sellerEmail: part.sellerEmail,
      location: part.location,
      status: part.status,
      featured: part.featured,
      urgent: part.urgent,
      verified: part.verified
    });
  };

  // Save Edit Part Listing
  const handleSaveEditPartListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartListing) return;

    setIsSavingPartEdit(true);
    try {
      const docRef = doc(db, "parts", String(editingPartListing.id));
      const safeStatus = (editingPartListing.status === "hidden" && !isAdmin) ? "hidden" : (editPartForm.status || editingPartListing.status || "active");
      const updatedFields = {
        ...editingPartListing,
        ...editPartForm,
        status: safeStatus,
        price: typeof editPartForm.price === "number" ? editPartForm.price : parseInt(String(editPartForm.price || editingPartListing.price)),
        updatedAt: new Date().toISOString()
      };

      const cleanFields = Object.fromEntries(
        Object.entries(updatedFields).filter(([_, v]) => v !== undefined)
      );

      await setDoc(docRef, cleanFields, { merge: true });

      try {
        const stored = localStorage.getItem("autoworld_user_parts");
        if (stored) {
          const localParts: UserPartListing[] = JSON.parse(stored);
          const idx = localParts.findIndex(p => String(p.id) === String(editingPartListing.id));
          if (idx !== -1) {
            localParts[idx] = { ...localParts[idx], ...cleanFields } as UserPartListing;
            localStorage.setItem("autoworld_user_parts", JSON.stringify(localParts));
          }
        }
      } catch (e) {
        console.warn("Local storage update error for parts:", e);
      }

      window.dispatchEvent(new Event("autoWorld_parts_update"));
      showToast("Part listing updated successfully!", "success");
      setEditingPartListing(null);
    } catch (err: any) {
      console.error("Save edit part error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `parts/${editingPartListing.id}`);
      showToast("Failed to save changes.", "error");
    } finally {
      setIsSavingPartEdit(false);
    }
  };

  // Open Manage Part Photos Modal
  const handleOpenPartPhotoManager = (part: UserPartListing) => {
    setPhotoManagingPartListing(part);
    const existing = part.photos && part.photos.length > 0
      ? [...part.photos]
      : part.image ? [{ src: part.image, alt: part.title }] : [];
    setManagePartPhotosList(existing);
    setNewPartPhotoUrlInput("");
  };

  // Add Part Photo Files
  const handleAddPartPhotoFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    for (const file of files as File[]) {
      try {
        const compressedSrc = await compressImageFile(file, 600, 0.60);
        if (compressedSrc) {
          setManagePartPhotosList(prev => [...prev, { src: compressedSrc, alt: file.name }]);
        }
      } catch (err) {
        console.error("Part image processing error:", err);
      }
    }
    e.target.value = "";
  };

  // Add Part Photo by URL
  const handleAddPartPhotoUrl = () => {
    if (!newPartPhotoUrlInput.trim()) return;
    setManagePartPhotosList(prev => [...prev, { src: newPartPhotoUrlInput.trim(), alt: "Part Photo" }]);
    setNewPartPhotoUrlInput("");
    showToast("Added photo URL to gallery!", "info");
  };

  // Save Managed Part Photos
  const handleSavePartPhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoManagingPartListing) return;

    if (managePartPhotosList.length === 0) {
      showToast("Please keep at least one photo for your part listing.", "error");
      return;
    }

    setIsSavingPartPhotos(true);
    try {
      const preparedPhotos = await preparePhotosForFirestore(managePartPhotosList);
      const docRef = doc(db, "parts", String(photoManagingPartListing.id));
      await updateDoc(docRef, {
        photos: preparedPhotos,
        image: preparedPhotos[0]?.src || photoManagingPartListing.image || "",
        updatedAt: new Date().toISOString()
      });

      try {
        const stored = localStorage.getItem("autoworld_user_parts");
        if (stored) {
          const localParts: UserPartListing[] = JSON.parse(stored);
          const idx = localParts.findIndex(p => String(p.id) === String(photoManagingPartListing.id));
          if (idx !== -1) {
            localParts[idx].photos = managePartPhotosList;
            localParts[idx].image = managePartPhotosList[0]?.src || localParts[idx].image;
            localStorage.setItem("autoworld_user_parts", JSON.stringify(localParts));
          }
        }
      } catch (e) {
        console.warn("Local storage update error for part photos:", e);
      }

      window.dispatchEvent(new Event("autoWorld_parts_update"));
      showToast("Part photo gallery updated successfully!", "success");
      setPhotoManagingPartListing(null);
    } catch (err: any) {
      console.error("Save part photos error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `parts/${photoManagingPartListing.id}`);
      showToast("Failed to save photos.", "error");
    } finally {
      setIsSavingPartPhotos(false);
    }
  };

  // Confirm Delete Part
  const handleConfirmDeletePart = async () => {
    if (!deletingPartListing) return;

    setIsDeletingPart(true);
    try {
      await deleteDoc(doc(db, "parts", String(deletingPartListing.id)));

      try {
        const stored = localStorage.getItem("autoworld_user_parts");
        if (stored) {
          const localParts: UserPartListing[] = JSON.parse(stored);
          const filtered = localParts.filter(p => String(p.id) !== String(deletingPartListing.id));
          localStorage.setItem("autoworld_user_parts", JSON.stringify(filtered));
        }
      } catch (e) {
        console.warn("Local storage delete error for part:", e);
      }

      window.dispatchEvent(new Event("autoWorld_parts_update"));
      showToast(`Part "${deletingPartListing.title}" removed permanently.`, "info");
      setDeletingPartListing(null);
    } catch (err: any) {
      console.error("Delete part error:", err);
      handleFirestoreError(err, OperationType.DELETE, `parts/${deletingPartListing.id}`);
      showToast("Failed to delete part.", "error");
    } finally {
      setIsDeletingPart(false);
    }
  };

  // STEP 1: Basic details
  const [vehicleType, setVehicleType] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [customMake, setCustomMake] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [availabilityError, setAvailabilityError] = useState(false);

  // ----------------------------------------------------
  // NHTSA vPIC API States & Cascading Fetching Logic
  // ----------------------------------------------------
  // Local state for storing list of makes fetched from NHTSA API
  const [nhtsaMakes, setNhtsaMakes] = useState<string[]>([]);
  const [isLoadingMakes, setIsLoadingMakes] = useState<boolean>(false);
  const [makesError, setMakesError] = useState<string | null>(null);

  // Local state for storing list of models fetched from NHTSA for selected (Make + Year)
  const [nhtsaModels, setNhtsaModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  /**
   * Effect 1: Fetch all vehicle makes from NHTSA vPIC API on component mount.
   * Endpoint: https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json
   */
  useEffect(() => {
    let isMounted = true;
    const fetchNhtsaMakes = async () => {
      setIsLoadingMakes(true);
      setMakesError(null);
      try {
        const response = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json");
        if (!response.ok) {
          throw new Error(`NHTSA API HTTP Error: ${response.status}`);
        }
        const data: NhtsaResponse<NhtsaMakeItem> = await response.json();
        if (isMounted && data && Array.isArray(data.Results)) {
          // Extract Make_Name, trim whitespace, deduplicate, and sort alphabetically
          const uniqueMakes = new Set<string>();
          data.Results.forEach((item) => {
            if (item.Make_Name && item.Make_Name.trim()) {
              uniqueMakes.add(item.Make_Name.trim());
            }
          });
          const sortedMakes = Array.from(uniqueMakes).sort((a, b) => a.localeCompare(b));
          setNhtsaMakes(sortedMakes);
        }
      } catch (err: any) {
        console.error("Failed to load vehicle makes from NHTSA API:", err);
        if (isMounted) {
          setMakesError("Could not fetch NHTSA makes. Local brand options available.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingMakes(false);
        }
      }
    };

    fetchNhtsaMakes();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Effect 2: Cascading fetch models when both a Make and Year are selected.
   * Endpoint: https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json
   * Note: Automatically clears selected model state when Make or Year changes.
   */
  useEffect(() => {
    let isMounted = true;

    // Reset selected model state whenever Make or Year changes
    setModel("");
    setNhtsaModels([]);
    setModelsError(null);

    // Skip fetch if either Make or Year is missing, or if Make is set to custom "Other"
    if (!make || !year || make === "Other") {
      setIsLoadingModels(false);
      return;
    }

    const fetchNhtsaModels = async () => {
      setIsLoadingModels(true);
      try {
        const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`NHTSA API HTTP Error: ${response.status}`);
        }
        const data: NhtsaResponse<NhtsaModelItem> = await response.json();
        if (isMounted && data && Array.isArray(data.Results)) {
          // Extract Model_Name, trim whitespace, deduplicate, and sort alphabetically
          const uniqueModels = new Set<string>();
          data.Results.forEach((item) => {
            if (item.Model_Name && item.Model_Name.trim()) {
              uniqueModels.add(item.Model_Name.trim());
            }
          });
          const sortedModels = Array.from(uniqueModels).sort((a, b) => a.localeCompare(b));
          setNhtsaModels(sortedModels);
        }
      } catch (err: any) {
        console.error(`Failed to fetch models for ${make} (${year}) from NHTSA:`, err);
        if (isMounted) {
          setModelsError(`Failed to fetch models for ${make} (${year}).`);
        }
      } finally {
        if (isMounted) {
          setIsLoadingModels(false);
        }
      }
    };

    fetchNhtsaModels();
    return () => {
      isMounted = false;
    };
  }, [make, year]);

  /**
   * Effect 3: Validate availability of selected vehicle combination (Year + Make/Brand + Vehicle Type).
   * Sets availabilityError to true if the selected combination yields zero results or is invalid.
   */
  useEffect(() => {
    if (!vehicleType || !make || !year || make === "Other") {
      setAvailabilityError(false);
      return;
    }

    const allowedMakes = VEHICLE_MAKES[vehicleType];
    const isMakeSupportedInType = allowedMakes
      ? allowedMakes.some((m) => m.toLowerCase() === make.toLowerCase())
      : true;

    const hasNhtsaModels = nhtsaModels.length > 0;
    const hasLocalModels = Boolean(VEHICLE_MODELS[make] && VEHICLE_MODELS[make].length > 0);

    // If make is incompatible with chosen category OR no models exist for this combo
    if ((allowedMakes && !isMakeSupportedInType) || (!isLoadingModels && !hasNhtsaModels && !hasLocalModels)) {
      setAvailabilityError(true);
    } else {
      setAvailabilityError(false);
    }
  }, [vehicleType, make, year, nhtsaModels, isLoadingModels]);

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
  
  // Category specific states
  const [bikeType, setBikeType] = useState("");
  const [bikeEngine, setBikeEngine] = useState("");
  const [bikeMileage, setBikeMileage] = useState("");
  const [bikeGears, setBikeGears] = useState("");
  const [bicycleType, setBicycleType] = useState("");
  const [frameSize, setFrameSize] = useState("");
  const [gears, setGears] = useState("");
  const [brakeType, setBrakeType] = useState("");
  const [frameMaterial, setFrameMaterial] = useState("");
  const [batteryCapacity, setBatteryCapacity] = useState("");
  const [electricRange, setElectricRange] = useState("");
  const [driveType, setDriveType] = useState("");

  // Indian Automotive & RTO Localization states
  const [rtoState, setRtoState] = useState("Maharashtra");
  const [rtoCode, setRtoCode] = useState("MH-02 (Mumbai West)");
  const [regNumber, setRegNumber] = useState("");
  const [insuranceStatus, setInsuranceStatus] = useState("Comprehensive (Active)");
  const [insuranceValidity, setInsuranceValidity] = useState("Dec 2026");
  const [puccStatus, setPuccStatus] = useState("Valid / Certified");
  const [puccValidity, setPuccValidity] = useState("Dec 2026");
  const [hypothecationStatus, setHypothecationStatus] = useState("Clean (No Active Loan)");
  const [fastagStatus, setFastagStatus] = useState("Active & Linked");
  const [stateNocAvailable, setStateNocAvailable] = useState("Pan-India Transferable (NOC Available)");
  const [roadTaxStatus, setRoadTaxStatus] = useState("Lifetime Road Tax Paid (LTT)");

  // STEP 3: Photos and Firebase Cloud Media Storage Upload state
  const [sessionVehicleId] = useState(() => `AW-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  const [photos, setPhotos] = useState<{ src: string; alt: string }[]>([]);
  const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, { progress: number; status: "uploading" | "done" | "error" }>>({});
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

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

  // Auto-save draft states
  const DRAFT_STORAGE_KEY = "autoWorld_sell_draft";
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Restore auto-saved draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        if (d && typeof d === "object") {
          if (d.vehicleType !== undefined) setVehicleType(d.vehicleType);
          if (d.make !== undefined) setMake(d.make);
          if (d.model !== undefined) setModel(d.model);
          if (d.year !== undefined) setYear(d.year);
          if (d.customMake !== undefined) setCustomMake(d.customMake);
          if (d.customModel !== undefined) setCustomModel(d.customModel);
          if (d.condition !== undefined) setCondition(d.condition);
          if (d.mileage !== undefined) setMileage(d.mileage);
          if (d.fuelType !== undefined) setFuelType(d.fuelType);
          if (d.description !== undefined) setDescription(d.description);
          if (d.transmission !== undefined) setTransmission(d.transmission);
          if (d.engineSize !== undefined) setEngineSize(d.engineSize);
          if (d.doors !== undefined) setDoors(d.doors);
          if (d.seats !== undefined) setSeats(d.seats);
          if (Array.isArray(d.checkedFeatures)) setCheckedFeatures(d.checkedFeatures);
          if (d.bikeType !== undefined) setBikeType(d.bikeType);
          if (d.bikeEngine !== undefined) setBikeEngine(d.bikeEngine);
          if (d.bikeMileage !== undefined) setBikeMileage(d.bikeMileage);
          if (d.bikeGears !== undefined) setBikeGears(d.bikeGears);
          if (d.bicycleType !== undefined) setBicycleType(d.bicycleType);
          if (d.frameSize !== undefined) setFrameSize(d.frameSize);
          if (d.gears !== undefined) setGears(d.gears);
          if (d.brakeType !== undefined) setBrakeType(d.brakeType);
          if (d.frameMaterial !== undefined) setFrameMaterial(d.frameMaterial);
          if (d.batteryCapacity !== undefined) setBatteryCapacity(d.batteryCapacity);
          if (d.electricRange !== undefined) setElectricRange(d.electricRange);
          if (d.driveType !== undefined) setDriveType(d.driveType);
          if (Array.isArray(d.photos)) setPhotos(d.photos);
          if (d.askingPrice !== undefined) setAskingPrice(d.askingPrice);
          if (d.negotiable !== undefined) setNegotiable(d.negotiable);
          if (d.sellerName !== undefined) setSellerName(d.sellerName);
          if (d.sellerEmail !== undefined) setSellerEmail(d.sellerEmail);
          if (d.sellerPhone !== undefined) setSellerPhone(d.sellerPhone);
          if (d.locationStr !== undefined) setLocationStr(d.locationStr);
          if (d.featuredListing !== undefined) setFeaturedListing(d.featuredListing);
          if (d.urgentListing !== undefined) setUrgentListing(d.urgentListing);
          if (d.currentStep && d.currentStep <= 5) setCurrentStep(d.currentStep);

          const hasContent = Boolean(
            d.vehicleType || d.make || d.model || d.year || d.description || d.askingPrice || (d.photos && d.photos.length > 0) || d.sellerPhone
          );
          if (hasContent) {
            setHasDraft(true);
            if (d.updatedAt) {
              setLastSavedTime(new Date(d.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }
            showToast("Restored auto-saved listing draft!", "info");
          }
        }
      }
    } catch (err) {
      console.warn("Failed to parse auto-save draft:", err);
    }
  }, []);

  // Save draft whenever form state changes
  useEffect(() => {
    if (currentStep > 5) return;

    const isFormDirty = Boolean(
      vehicleType || make || model || year || description || askingPrice || (photos && photos.length > 0) || sellerPhone || locationStr
    );

    if (!isFormDirty) return;

    const draftData = {
      currentStep,
      vehicleType,
      make,
      model,
      year,
      customMake,
      customModel,
      condition,
      mileage,
      fuelType,
      description,
      transmission,
      engineSize,
      doors,
      seats,
      checkedFeatures,
      bikeType,
      bikeEngine,
      bikeMileage,
      bikeGears,
      bicycleType,
      frameSize,
      gears,
      brakeType,
      frameMaterial,
      batteryCapacity,
      electricRange,
      driveType,
      photos,
      askingPrice,
      negotiable,
      sellerName,
      sellerEmail,
      sellerPhone,
      locationStr,
      featuredListing,
      urgentListing,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      setHasDraft(true);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn("Error auto-saving draft to localStorage:", err);
    }
  }, [
    currentStep, vehicleType, make, model, year, customMake, customModel,
    condition, mileage, fuelType, description, transmission, engineSize,
    doors, seats, checkedFeatures, bikeType, bikeEngine, bikeMileage,
    bikeGears, bicycleType, frameSize, gears, brakeType, frameMaterial,
    batteryCapacity, electricRange, driveType, photos, askingPrice,
    negotiable, sellerName, sellerEmail, sellerPhone, locationStr,
    featuredListing, urgentListing
  ]);

  // Publish Status details
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedListingId, setPublishedListingId] = useState("");
  const [publishedTimeStr, setPublishedTimeStr] = useState("");

  // Business Dealership Bulk Import States
  const [showDealerUpload, setShowDealerUpload] = useState(false);
  const [rawUploadText, setRawUploadText] = useState("");
  const [parsedDealerVehicles, setParsedDealerVehicles] = useState<any[]>([]);
  const [isParsingFeed, setIsParsingFeed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const handleParseDealerFeed = async (textToParse?: string) => {
    const text = textToParse !== undefined ? textToParse : rawUploadText;
    if (!text.trim()) {
      showToast("Please paste or upload valid CSV or XML dealership feed data.", "error");
      return;
    }

    setIsParsingFeed(true);
    setParsedDealerVehicles([]);
    try {
      const isXml = text.trim().startsWith("<");
      const response = await fetch("/api/dealer/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": isXml ? "application/xml" : "text/csv"
        },
        body: text
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setParsedDealerVehicles(data.vehicles || []);
        showToast(`Parsed ${data.count} vehicles successfully! Review specifications below before synching.`, "success");
      } else {
        showToast(data.error || "Failed to parse bulk inventory feed.", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Connection to feed parsing engine failed.", "error");
    } finally {
      setIsParsingFeed(false);
    }
  };

  const handleExecuteBulkImport = async () => {
    if (!currentUser) {
      showToast("Authentication required. Please sign in as a Dealer.", "info");
      return;
    }
    if (parsedDealerVehicles.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    let successCount = 0;
    try {
      const stored = localStorage.getItem("autoWorld_listings");
      const existing: UserListing[] = stored ? JSON.parse(stored) : [];

      for (let i = 0; i < parsedDealerVehicles.length; i++) {
        const v = parsedDealerVehicles[i];
        const generatedId = `AW-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        const newListing: UserListing = {
          id: generatedId,
          title: v.title || `${v.year} ${v.make} ${v.model}`,
          type: v.category || "car",
          make: v.make,
          model: v.model,
          year: String(v.year),
          price: Number(v.price),
          condition: 4, // Very Good
          mileage: String(v.mileage),
          fuelType: v.fuel,
          description: v.description,
          negotiable: "yes",
          sellerName: currentUser.displayName || "Authorized Dealership",
          sellerEmail: currentUser.email || "dealer@autoworld.com",
          sellerPhone: sellerPhone || "+91 99999 88888",
          location: locationStr || "Mumbai Dealer Hub",
          features: ["Air Conditioning", "ABS", "Power Windows", "Bluetooth", "Backup Camera"],
          transmission: v.transmission || "Automatic",
          engineSize: "2.0L",
          doors: "4",
          seats: "5",
          featured: true, // Dealership bulk uploads are automatically Featured!
          urgent: false,
          photos: [{ src: v.image, alt: v.title }],
          datePosted: new Date().toISOString(),
          status: "active"
        };

        const rawListingData = {
          ...newListing,
          userId: currentUser.uid
        };

        const listingData = Object.fromEntries(
          Object.entries(rawListingData).filter(([_, val]) => val !== undefined)
        );

        // Sync to Firestore
        try {
          await setDoc(doc(db, "listings", generatedId), listingData);
        } catch (dbErr) {
          console.warn("Failed syncing to Firestore in bulk upload:", dbErr);
        }

        existing.push(newListing);
        successCount++;
        setImportProgress(Math.round(((i + 1) / parsedDealerVehicles.length) * 100));
      }

      localStorage.setItem("autoWorld_listings", JSON.stringify(existing));
      showToast(`Bulk Synchronisation Finished! Successfully uploaded ${successCount} listings to inventory.`, "success");
      setExistingListingsCount(prev => prev + successCount);
      setParsedDealerVehicles([]);
      setRawUploadText("");
      setShowDealerUpload(false);
    } catch (err: any) {
      console.error(err);
      showToast("Inventory synchronization failed during batch execution.", "error");
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

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

  const getFeaturesForCategory = () => {
    if (vehicleType === "bicycle") {
      return [
        "Front Suspension", "Full Suspension", "Hydraulic Disc Brakes", "Mechanical Disc Brakes",
        "Rear Carrier Rack", "Mudguards / Fenders", "Kickstand", "LED Safety Lights",
        "Water Bottle Cage", "Helmet Included", "Gel Comfort Seat", "Puncture-Resistant Tyres"
      ];
    }
    if (vehicleType === "motorcycle") {
      return [
        "Anti-Lock Braking (ABS)", "Dual Disc Brakes", "Alloy Wheels", "Digital Speedometer Console",
        "Electric Push Start", "LED Headlight", "Riding Modes", "Traction Control",
        "Luggage Rack / Top Box", "Engine Crash Guard", "Tubeless Tyres", "USB Charging Port"
      ];
    }
    return [
      "Air Conditioning", "Power Windows", "Power Steering", "ABS Brakes",
      "Front & Side Airbags", "Sunroof / Moonroof", "Leather Seats", "Bluetooth & Apple CarPlay",
      "Backup Camera / 360", "Cruise Control", "Alloy Wheels", "Keyless Entry & Push Start"
    ];
  };

  const defaultFeatures = getFeaturesForCategory();

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

  const processPhotoFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setIsUploadingMedia(true);

    for (const file of fileArray) {
      if (!file.type.match("image.*")) {
        showToast(`Skipped non-image file "${file.name}".`, "error");
        continue;
      }
      if (file.size > 25 * 1024 * 1024) {
        showToast(`Image "${file.name}" exceeds maximum allowed 25MB.`, "error");
        continue;
      }

      const fileKey = `${file.name}_${Date.now()}`;
      setUploadProgressMap(prev => ({
        ...prev,
        [fileKey]: { progress: 5, status: "uploading" }
      }));

      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `vehicles/${sessionVehicleId}/${Date.now()}_${sanitizedFileName}`;

      try {
        // 1. Direct Cloud Upload to Firebase Storage
        const fileRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(fileRef, file);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgressMap(prev => ({
                ...prev,
                [fileKey]: { progress: Math.max(5, progress), status: "uploading" }
              }));
            },
            (error) => {
              console.warn("Firebase Storage direct upload error:", error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                setPhotos(prev => [...prev, { src: downloadURL, alt: file.name }]);
                setUploadProgressMap(prev => ({
                  ...prev,
                  [fileKey]: { progress: 100, status: "done" }
                }));
                resolve();
              } catch (urlErr) {
                reject(urlErr);
              }
            }
          );
        });

        showToast(`Uploaded "${file.name}" to Cloud Storage!`, "success");
      } catch (err: any) {
        console.warn(`Cloud upload fallback for "${file.name}":`, err);
        // 2. Resilient local compression fallback if remote Storage is offline
        try {
          const compressedSrc = await compressImageFile(file, 800, 0.65);
          if (compressedSrc) {
            setPhotos(prev => [...prev, { src: compressedSrc, alt: file.name }]);
            setUploadProgressMap(prev => ({
              ...prev,
              [fileKey]: { progress: 100, status: "done" }
            }));
            showToast(`Processed "${file.name}" locally.`, "info");
          }
        } catch (compErr) {
          setUploadProgressMap(prev => ({
            ...prev,
            [fileKey]: { progress: 0, status: "error" }
          }));
          showToast(`Failed to process photo "${file.name}".`, "error");
        }
      }
    }

    setIsUploadingMedia(false);
  };

  const [step3UrlInput, setStep3UrlInput] = useState("");

  const handleAddPhotoByUrl = () => {
    if (!step3UrlInput.trim()) return;
    setPhotos(prev => [...prev, { src: step3UrlInput.trim(), alt: "Vehicle Photo" }]);
    setStep3UrlInput("");
    showToast("Added image URL to snapshots list!", "info");
  };

  const handleAddSamplePhoto = () => {
    const samplePhotos = [
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800"
    ];
    const picked = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
    setPhotos(prev => [...prev, { src: picked, alt: "Sample Vehicle Image" }]);
    showToast("Added sample photo representation!", "info");
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
      if (availabilityError) {
        showToast("Sorry, this specific vehicle combination is not currently available in our system.", "error");
        return;
      }
      if (!vehicleType) {
        showToast("Please select the vehicle category type.", "error");
        return;
      }
      const actualMake = make === "Other" ? customMake : make;
      const actualModel = model === "Other" ? customModel : model;
      if (!actualMake || !actualModel || !year) {
        showToast("Please specify make, model, and manufacturing year.", "error");
        return;
      }

      // Check if user is unauthenticated when continuing to Specifications
      if (!currentUser || currentUser.isAnonymous) {
        setShowLoginRequiredModal(true);
        return;
      }
    }

    if (currentStep === 2) {
      if (vehicleType === "bicycle") {
        if (!bicycleType) {
          showToast("Please select the bicycle category style.", "error");
          return;
        }
      } else {
        if (!mileage || !mileage.trim() || isNaN(Number(mileage)) || Number(mileage) < 0) {
          showToast("Please enter a valid odometer mileage.", "error");
          return;
        }
        if (!fuelType) {
          showToast("Please select the power/fuel type.", "error");
          return;
        }
        if (!transmission) {
          showToast("Please select the transmission style.", "error");
          return;
        }
      }

      if (!description.trim() || description.length < 15) {
        showToast("Please provide a description containing at least 15 characters.", "error");
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

  const handlePublishListing = async (e: React.FormEvent) => {
    e.preventDefault();

    // Phase 3 Action Protection: Check authentication state before posting
    if (!currentUser || currentUser.isAnonymous) {
      showToast("Authentication required. Please sign in to list your vehicle.", "error");
      if (onSignInClick) {
        onSignInClick();
      } else {
        setShowLoginRequiredModal(true);
      }
      return;
    }

    if (!isAdmin && existingListingsCount >= 2 && !subscriptionActive) {
      showToast("Free tier limit reached. Please upgrade to a Premium plan to list more than 2 vehicles.", "error");
      return;
    }

    if (!askingPrice || isNaN(parseInt(askingPrice)) || parseInt(askingPrice) <= 0) {
      showToast("Please specify an appropriate asking price.", "error");
      return;
    }

    // Input Sanitization (stripping XSS scripts/HTML)
    const sanitizedSellerName = sanitizeInput(sellerName.trim()) || currentUser.displayName || currentUser.email?.split("@")[0] || "Vehicle Owner";
    const sanitizedSellerEmail = sanitizeInput(sellerEmail.trim()) || currentUser.email || "seller@autoworld.com";
    const sanitizedSellerPhone = sanitizeInput(sellerPhone.trim()) || "+91 98765 43210";
    const sanitizedLocationStr = sanitizeInput(locationStr.trim()) || "Mumbai, India";
    const sanitizedDescription = sanitizeInput(description.trim()) || "Well maintained vehicle in good operational condition.";

    setIsPublishing(true);

    try {
      const rawMake = make === "Other" ? (customMake || "Custom Make") : (make || "Standard Make");
      const rawModel = model === "Other" ? (customModel || "Custom Model") : (model || "Standard Model");
      const actualMake = sanitizeInput(rawMake);
      const actualModel = sanitizeInput(rawModel);
      const actualYear = year || new Date().getFullYear().toString();
      const generatedId = `AW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const rawTitle = `${actualYear} ${actualMake} ${actualModel}`;
      const sanitizedTitle = sanitizeInput(rawTitle);

      const fallbackPhotos = photos.length > 0
        ? photos
        : [{ src: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800", alt: sanitizedTitle }];

      // Compress photos so total payload is well below Firestore's 1MB limit
      const preparedPhotos = await preparePhotosForFirestore(fallbackPhotos);

      const newListing: UserListing = {
        id: generatedId,
        title: sanitizedTitle,
        type: vehicleType || "car",
        make: actualMake,
        model: actualModel,
        year: actualYear,
        price: parseInt(askingPrice),
        condition: condition || 4,
        mileage: vehicleType === "bicycle" ? "0" : (mileage || "0"),
        fuelType: vehicleType === "bicycle" ? "Pedal / Human Powered" : (fuelType || "Petrol"),
        description: sanitizedDescription,
        negotiable: negotiable || "yes",
        sellerName: sanitizedSellerName,
        sellerEmail: sanitizedSellerEmail,
        sellerPhone: sanitizedSellerPhone,
        location: sanitizedLocationStr,
        features: checkedFeatures.length > 0 ? checkedFeatures.map(f => sanitizeInput(f)) : defaultFeatures.slice(0, 3),
        transmission: vehicleType === "bicycle" ? (gears ? `${gears} Gears` : "Pedal Drive") : (transmission || "Manual"),
        engineSize: vehicleType === "bicycle" ? "" : (fuelType === "electric" ? `${batteryCapacity || "EV"} kWh` : (engineSize || "")),
        doors: ["car", "suv", "truck", "van", "commercial"].includes(vehicleType) ? (doors || "4") : "",
        seats: ["car", "suv", "truck", "van", "commercial"].includes(vehicleType) ? (seats || "5") : "",
        bikeType: sanitizeInput(bikeType || ""),
        bikeEngine: sanitizeInput(bikeEngine || ""),
        bikeMileage: sanitizeInput(bikeMileage || ""),
        bikeGears: sanitizeInput(bikeGears || ""),
        bicycleType: sanitizeInput(bicycleType || ""),
        frameSize: sanitizeInput(frameSize || ""),
        gears: sanitizeInput(gears || ""),
        brakeType: sanitizeInput(brakeType || ""),
        frameMaterial: sanitizeInput(frameMaterial || ""),
        batteryCapacity: sanitizeInput(batteryCapacity || ""),
        electricRange: sanitizeInput(electricRange || ""),
        driveType: sanitizeInput(driveType || ""),
        // Indian Automotive & RTO Localization
        rtoState: sanitizeInput(rtoState || "Maharashtra"),
        rtoCode: sanitizeInput(rtoCode || "MH-02"),
        regNumber: sanitizeInput(regNumber || ""),
        insuranceStatus: sanitizeInput(insuranceStatus || "Comprehensive (Active)"),
        insuranceValidity: sanitizeInput(insuranceValidity || "Dec 2026"),
        puccStatus: sanitizeInput(puccStatus || "Valid / Certified"),
        puccValidity: sanitizeInput(puccValidity || "Dec 2026"),
        hypothecationStatus: sanitizeInput(hypothecationStatus || "Clean (No Active Loan)"),
        fastagStatus: sanitizeInput(fastagStatus || "Active & Linked"),
        stateNocAvailable: sanitizeInput(stateNocAvailable || "Pan-India Transferable (NOC Available)"),
        roadTaxStatus: sanitizeInput(roadTaxStatus || "Lifetime Road Tax Paid (LTT)"),
        featured: featuredListing,
        urgent: urgentListing,
        photos: preparedPhotos,
        datePosted: new Date().toISOString(),
        status: "active"
      };

      const rawListingData = {
        ...newListing,
        userId: currentUser.uid
      };

      // Sanitize object to remove any keys with undefined values before sending to Firestore
      const listingData = Object.fromEntries(
        Object.entries(rawListingData).filter(([_, val]) => val !== undefined)
      );

      if (currentUser) {
        try {
          await setDoc(doc(db, "listings", generatedId), listingData);
        } catch (err: any) {
          console.warn("Firestore write initial warning:", err);
          const errMsg = String(err?.message || "");
          if (errMsg.includes("exceeds the maximum allowed size") || errMsg.includes("1,048,576")) {
            try {
              // Ultra-compress photos (300px max, 0.4 quality) to fit in document
              const emergencyPhotos = await Promise.all(
                preparedPhotos.map(async (p) => ({
                  ...p,
                  src: p.src.startsWith("data:image") ? await compressBase64Url(p.src, 300, 0.4) : p.src
                }))
              );
              const emergencyListingData = {
                ...listingData,
                photos: emergencyPhotos
              };
              await setDoc(doc(db, "listings", generatedId), emergencyListingData);
              newListing.photos = emergencyPhotos;
            } catch (retryErr) {
              console.error("Emergency Firestore save failed:", retryErr);
              showToast("Listing saved locally due to remote database image size constraints.", "info");
            }
          } else {
            handleFirestoreError(err, OperationType.WRITE, `listings/${generatedId}`);
          }
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

      window.dispatchEvent(new Event("autoWorld_db_update"));

      // Trigger SMS Notification to Admin (+91 7666232753)
      dispatchAdminSmsAlert(
        "carUpload",
        "🚗 New Vehicle Uploaded",
        `New listing: ${newListing.title} by ${newListing.sellerName} (${newListing.sellerPhone}). Price: ₹${newListing.price?.toLocaleString("en-IN")}`,
        { listingId: generatedId, title: newListing.title, seller: newListing.sellerName, phone: newListing.sellerPhone }
      );

      setExistingListingsCount(prev => prev + 1);
      setPublishedListingId(generatedId);
      setPublishedTimeStr(new Date().toLocaleString());

      // Clear auto-save draft upon successful publication
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {
        console.warn("Could not clear draft from localStorage", e);
      }
      setHasDraft(false);
      setLastSavedTime(null);

      showToast("Successfully Listed your vehicle!", "success");
      setConfettiKey(prev => prev + 1);
      setCurrentStep(6); // Success step screen
      window.scrollTo({ top: 100, behavior: "smooth" });
    } catch (err: any) {
      console.error("Publishing error:", err);
      showToast(err?.message || "Failed to publish listing. Please check inputs and try again.", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleResetWizardForm = () => {
    setVehicleType("");
    setMake("");
    setModel("");
    setYear("");
    setCustomMake("");
    setCustomModel("");
    setCondition(3);
    setMileage("");
    setFuelType("");
    setDescription("");
    setTransmission("");
    setEngineSize("");
    setDoors("");
    setSeats("");
    setCheckedFeatures([]);
    setBikeType("");
    setBikeEngine("");
    setBikeMileage("");
    setBikeGears("");
    setBicycleType("");
    setFrameSize("");
    setGears("");
    setBrakeType("");
    setFrameMaterial("");
    setBatteryCapacity("");
    setElectricRange("");
    setDriveType("");
    setPhotos([]);
    setAskingPrice("");
    setNegotiable("yes");
    setSellerName("");
    setSellerEmail("");
    setSellerPhone("");
    setLocationStr("");
    setFeaturedListing(false);
    setUrgentListing(false);
    setCurrentStep(1);

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      console.warn("Could not clear draft from localStorage", e);
    }
    setHasDraft(false);
    setLastSavedTime(null);
  };

  const handleClearDraft = () => {
    handleResetWizardForm();
    showToast("Listing draft cleared. Started fresh form!", "info");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.4, ease: "easeOut" } 
    }
  };

  // Calculate owner requests and pending counts
  const userEmailStr = currentUser?.email?.toLowerCase() || "";
  const userUidStr = currentUser?.uid || "";
  const userNameStr = currentUser?.displayName?.toLowerCase() || "";
  const userListingIdsSet = new Set(userListings.map((l) => String(l.id)));
  const userListingTitlesSet = new Set(userListings.map((l) => l.title.toLowerCase()));

  const isOwnerTDReq = (td: TestDriveRequest) => {
    if (!showOnlyMyVehiclesRequests) return true;
    if (isAdmin) return true;
    if (userEmailStr && td.sellerEmail && td.sellerEmail.toLowerCase() === userEmailStr) return true;
    if (userUidStr && td.sellerUserId && td.sellerUserId === userUidStr) return true;
    if (td.listingId && userListingIdsSet.has(String(td.listingId))) return true;
    if (td.vehicleId && userListingIdsSet.has(String(td.vehicleId))) return true;
    if (td.vehicleTitle && userListingTitlesSet.has(td.vehicleTitle.toLowerCase())) return true;
    if (userNameStr && td.sellerName && td.sellerName.toLowerCase().includes(userNameStr)) return true;
    if (userListings.length === 0) return true;
    return false;
  };

  const isOwnerCBReq = (cb: CallbackRequest) => {
    if (!showOnlyMyVehiclesRequests) return true;
    if (isAdmin) return true;
    if (userEmailStr && cb.sellerEmail && cb.sellerEmail.toLowerCase() === userEmailStr) return true;
    if (userUidStr && cb.sellerUserId && cb.sellerUserId === userUidStr) return true;
    if (cb.listingId && userListingIdsSet.has(String(cb.listingId))) return true;
    if (cb.vehicleId && userListingIdsSet.has(String(cb.vehicleId))) return true;
    if (cb.vehicleTitle && userListingTitlesSet.has(cb.vehicleTitle.toLowerCase())) return true;
    if (userNameStr && cb.sellerName && cb.sellerName.toLowerCase().includes(userNameStr)) return true;
    if (userListings.length === 0) return true;
    return false;
  };

  const ownerTDs = testDriveRequests.filter(isOwnerTDReq);
  const ownerCBs = callbackRequests.filter(isOwnerCBReq);
  const totalPendingReqsCount = ownerTDs.filter((t) => t.status === "scheduled" || t.status === "pending").length + ownerCBs.filter((c) => c.status === "pending").length;

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      id="sell-form-wrapper" 
      className="max-w-4xl mx-auto px-4 py-12 bg-[#F4F1EA] text-[#1A1A1A] font-sans"
    >
      {/* SELLER MODE & DESK CONTROL SWITCHER BAR */}
      <div 
        id="sell-tab-mode-switcher-bar"
        className="mb-8 bg-stone-900 p-3 sm:p-4 border-2 border-stone-950 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 font-sans shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
      >
        {/* GROUP 1: LISTING & CREATION (DEDICATED DIV) */}
        <div id="seller-action-creation-group" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 font-bold px-1 hidden md:inline">
            Create:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {/* 1ST BUTTON: LIST VEHICLE */}
            <button
              type="button"
              id="sell-tab-btn-list-vehicle"
              onClick={() => setViewMode("wizard")}
              className={`group relative px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer border ${
                viewMode === "wizard"
                  ? "bg-amber-500 text-stone-950 border-amber-400 font-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] ring-1 ring-amber-300"
                  : "bg-stone-800 hover:bg-stone-750 text-stone-200 border-stone-700 hover:border-amber-500/50 hover:text-white"
              }`}
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                viewMode === "wizard" ? "bg-stone-950 text-amber-400" : "bg-stone-900 text-amber-400 group-hover:bg-stone-950"
              }`}>
                <Car className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col items-start leading-tight text-left">
                <span className="font-extrabold text-[11px] tracking-wider flex items-center gap-1">
                  List Vehicle
                </span>
                <span className={`text-[8.5px] font-sans uppercase tracking-widest ${
                  viewMode === "wizard" ? "text-stone-900 font-bold" : "text-stone-400"
                }`}>
                  Cars &amp; SUVs
                </span>
              </div>
            </button>

            {/* 2ND BUTTON: LIST PART */}
            <button
              type="button"
              id="sell-tab-btn-list-part"
              onClick={() => setViewMode("list_part")}
              className={`group relative px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer border ${
                viewMode === "list_part" || (viewMode as string) === "parts"
                  ? "bg-amber-500 text-stone-950 border-amber-400 font-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] ring-1 ring-amber-300"
                  : "bg-stone-800 hover:bg-stone-750 text-stone-200 border-stone-700 hover:border-amber-500/50 hover:text-white"
              }`}
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                viewMode === "list_part" || (viewMode as string) === "parts" ? "bg-stone-950 text-amber-400" : "bg-stone-900 text-amber-400 group-hover:bg-stone-950"
              }`}>
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col items-start leading-tight text-left">
                <span className="font-extrabold text-[11px] tracking-wider flex items-center gap-1">
                  List Part
                </span>
                <span className={`text-[8.5px] font-sans uppercase tracking-widest ${
                  viewMode === "list_part" || (viewMode as string) === "parts" ? "text-stone-900 font-bold" : "text-stone-400"
                }`}>
                  Hardware &amp; Tuning
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="h-8 w-px bg-stone-750 hidden xl:block mx-1" />

        {/* GROUP 2: MANAGEMENT CATALOGS & LEADS (DEDICATED DIV) */}
        <div id="seller-action-management-group" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 font-bold px-1 hidden md:inline">
            Catalogs &amp; Leads:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {/* 3RD BUTTON: VEHICLE CATALOG */}
            <button
              type="button"
              id="sell-tab-btn-my-vehicles"
              onClick={() => setViewMode("my_catalog")}
              className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer border relative ${
                viewMode === "my_catalog"
                  ? "bg-stone-100 text-stone-950 border-white font-extrabold shadow-inner"
                  : "bg-stone-850 hover:bg-stone-800 text-stone-300 border-stone-700 hover:text-white"
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-stone-400" />
              <span>Vehicle Catalog</span>
              {userListings.length > 0 && (
                <span className={`px-1.5 py-0.2 text-[9.5px] font-mono font-black rounded-full ${
                  viewMode === "my_catalog" ? "bg-stone-950 text-amber-400" : "bg-amber-500 text-stone-950"
                }`}>
                  {userListings.length}
                </span>
              )}
            </button>

            {/* 4TH BUTTON: PART CATALOG */}
            <button
              type="button"
              id="sell-tab-btn-part-desk"
              onClick={() => setViewMode("part_desk")}
              className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer border relative ${
                viewMode === "part_desk"
                  ? "bg-stone-100 text-stone-950 border-white font-extrabold shadow-inner"
                  : "bg-stone-850 hover:bg-stone-800 text-stone-300 border-stone-700 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Part Catalog</span>
              <span className={`px-1.5 py-0.2 text-[9.5px] font-mono font-black rounded-full ${
                viewMode === "part_desk" ? "bg-stone-950 text-amber-400" : "bg-amber-500 text-stone-950"
              }`}>
                {currentUser && !currentUser.isAnonymous ? userPartListings.length : totalPartsCount}
              </span>
            </button>

            {/* 5TH BUTTON: BUYER REQUESTS */}
            <button
              type="button"
              id="sell-tab-btn-buyer-requests"
              onClick={() => setViewMode("requests")}
              className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer border relative ${
                viewMode === "requests"
                  ? "bg-stone-100 text-stone-950 border-white font-extrabold shadow-inner"
                  : "bg-stone-850 hover:bg-stone-800 text-stone-300 border-stone-700 hover:text-white"
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
              <span>Buyer Requests</span>
              {(ownerTDs.length + ownerCBs.length) > 0 && (
                <span className={`px-1.5 py-0.2 text-[9.5px] font-mono font-black rounded-full ${
                  totalPendingReqsCount > 0
                    ? "bg-red-600 text-white animate-pulse"
                    : viewMode === "requests"
                    ? "bg-stone-950 text-amber-400"
                    : "bg-amber-500 text-stone-950"
                }`}>
                  {totalPendingReqsCount > 0 ? `${totalPendingReqsCount} NEW` : ownerTDs.length + ownerCBs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* GROUP 3: AUTH / SELLER PROFILE STATUS (DEDICATED DIV) */}
        <div id="seller-action-auth-status" className="flex items-center">
          {currentUser && !currentUser.isAnonymous ? (
            <div className="text-[10.5px] font-mono text-stone-300 px-3 py-1.5 bg-stone-800 border border-stone-700 flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">Seller: <strong className="text-amber-400">{currentUser.displayName || currentUser.email}</strong></span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignInClick}
              className="text-[10.5px] font-mono text-amber-400 hover:text-amber-300 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In to Control Listings</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. LIST MOTORSPORT & PERFORMANCE PART (DEDICATED DIV) */}
      {(viewMode === "list_part" || (viewMode as string) === "parts") && (
        <div id="sell-view-list-part" className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 sm:p-8 space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.85)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-300 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-amber-800 bg-amber-500/15 px-2.5 py-1 border border-amber-600/30 mb-2">
                  <Wrench className="w-3.5 h-3.5 text-amber-700" />
                  <span>Motorsport Tuning &amp; Hardware Listing Desk</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-950 uppercase tracking-tight">
                  List Performance Hardware
                </h2>
                <p className="text-stone-600 text-xs mt-1 font-medium">
                  List turbochargers, GT spoilers, race exhausts, high-performance brake calipers, ECU tunes, and aftermarket accessories for immediate trade.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewMode("part_desk")}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-850 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-stone-950 shadow-sm cursor-pointer shrink-0 transition"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Go to Part Catalog →</span>
              </button>
            </div>

            <PartsUploadWizard
              currentUser={currentUser}
              subscriptionActive={subscriptionActive}
              showToast={showToast}
              onSignInClick={onSignInClick}
              onUploadSuccess={() => {
                setViewMode("part_desk");
              }}
            />
          </div>
        </div>
      )}
      
      {/* 2. MY VEHICLE CATALOG CONTROL PANEL (DEDICATED DIV) */}
      {viewMode === "my_catalog" && (
        <div id="sell-view-vehicle-catalog" className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-300 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-amber-800 bg-amber-500/15 px-2.5 py-1 border border-amber-600/30 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Seller Control Center</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-950 uppercase tracking-tight">
                  My Vehicle Catalog
                </h2>
                <p className="text-stone-600 text-xs mt-1 font-medium">
                  Full control center for your uploaded vehicles. Edit vehicle specs, manage photo galleries, update status, or remove listings.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewMode("wizard")}
                className="px-5 py-3 bg-stone-900 hover:bg-stone-800 text-[#F4F1EA] text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-stone-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer shrink-0 transition-transform active:scale-95"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>List New Vehicle</span>
              </button>
            </div>

            {/* Unauthenticated State Warning */}
            {(!currentUser || currentUser.isAnonymous) ? (
              <div className="p-8 bg-[#F4F1EA] border-2 border-stone-400 text-center space-y-4 my-4">
                <div className="w-14 h-14 bg-amber-500/15 border-2 border-amber-600/40 rounded-full flex items-center justify-center text-amber-700 mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-serif font-bold text-stone-900 uppercase">
                    Seller Sign In Required
                  </h3>
                  <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed font-medium">
                    Log in or create your free account to view your listed vehicles, edit parameters, update photo galleries, and track buyer inquiries.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSignInClick}
                  className="px-6 py-3.5 bg-stone-900 hover:bg-stone-850 text-white text-xs font-mono font-bold uppercase tracking-widest inline-flex items-center gap-2 border-2 border-stone-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>Log In / Sign Up Now</span>
                </button>
              </div>
            ) : (
              <>
                {/* Stats Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 pt-2">
                  <div className="p-3 bg-[#F4F1EA] border border-stone-300">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-stone-500 block">Total Inventory</span>
                    <span className="text-lg sm:text-xl font-serif font-black text-stone-900">{userListings.length} Vehicles</span>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-600/30">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-800 block">Active Listings</span>
                    <span className="text-lg sm:text-xl font-serif font-black text-emerald-900">
                      {userListings.filter(l => l.status === "active" || !l.status).length}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-600/30">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-800 block">Pending / On Hold</span>
                    <span className="text-lg sm:text-xl font-serif font-black text-amber-950">
                      {userListings.filter(l => l.status === "pending").length}
                    </span>
                  </div>

                  <div className="p-3 bg-red-500/10 border border-red-600/30">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-red-800 block">Hidden by Admin</span>
                    <span className="text-lg sm:text-xl font-serif font-black text-red-950">
                      {userListings.filter(l => l.status === "hidden").length}
                    </span>
                  </div>

                  <div className="p-3 bg-stone-200/80 border border-stone-300">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-stone-600 block">Sold Vehicles</span>
                    <span className="text-lg sm:text-xl font-serif font-black text-stone-800">
                      {userListings.filter(l => l.status === "sold").length}
                    </span>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1 bg-[#F4F1EA] p-1 border border-stone-300 overflow-x-auto">
                    {(["all", "active", "pending", "hidden", "sold"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setCatalogFilterStatus(st)}
                        className={`px-3 py-1.5 text-[10.5px] font-mono font-bold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                          catalogFilterStatus === st
                            ? "bg-stone-900 text-white shadow-xs"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                        }`}
                      >
                        {st === "all" ? `All (${userListings.length})` : `${st} (${userListings.filter(l => (st === "active" ? (l.status === "active" || !l.status) : l.status === st)).length})`}
                      </button>
                    ))}
                  </div>

                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter my catalog..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900 placeholder:text-stone-400"
                    />
                    {catalogSearch && (
                      <button
                        type="button"
                        onClick={() => setCatalogSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* CATALOG CARDS LIST */}
          {currentUser && !currentUser.isAnonymous && (
            <div className="space-y-4">
              {/* Seller 30-Day Expiration & Warning Summary Banner */}
              {(() => {
                let nearExpiryCount = 0;
                let hiddenCount = 0;

                userListings.forEach((item) => {
                  const isPremiumOrFeatured = Boolean(item.featured || item.urgent || item.verified || subscriptionActive || isAdmin);
                  const exp = getListingExpirationDetails(item.datePosted || (item as any).createdAt, isPremiumOrFeatured);
                  if (!isPremiumOrFeatured) {
                    if (exp.isNearExpiry) {
                      nearExpiryCount++;
                    } else if (exp.isExpired || item.status === "hidden") {
                      hiddenCount++;
                    }
                  }
                });

                if (nearExpiryCount === 0 && hiddenCount === 0) return null;

                return (
                  <div className="space-y-3 mb-2">
                    {nearExpiryCount > 0 && (
                      <div className="bg-amber-50 border-2 border-amber-500 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                          <div>
                            <h4 className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-950">
                              ⚠️ EXPIRATION ALERT: {nearExpiryCount} {nearExpiryCount === 1 ? "Listing" : "Listings"} Expiring Within 3 Days
                            </h4>
                            <p className="text-[11px] text-stone-800 font-medium mt-0.5">
                              Free tier listings automatically hide after 30 days. Upgrade your account or listing to feature permanently.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("premium")}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-[10px] font-mono font-extrabold uppercase tracking-widest border border-amber-600 shrink-0 cursor-pointer transition"
                        >
                          Upgrade To Premium
                        </button>
                      </div>
                    )}

                    {hiddenCount > 0 && (
                      <div className="bg-red-50 border-2 border-red-600 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-start gap-3">
                          <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-mono font-extrabold uppercase tracking-wider text-red-950">
                              🚫 AUTO-HIDDEN: {hiddenCount} {hiddenCount === 1 ? "Listing" : "Listings"} Exceeded 30-Day Window
                            </h4>
                            <p className="text-[11px] text-stone-800 font-medium mt-0.5">
                              These items are hidden from public search results due to the 30-day limit.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("premium")}
                          className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-mono font-extrabold uppercase tracking-widest border border-red-700 shrink-0 cursor-pointer transition"
                        >
                          Restore Visibility
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {isLoadingUserListings ? (
                <div className="p-12 text-center bg-[#FAF8F5] border border-stone-300 space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
                  <p className="text-xs font-mono font-bold text-stone-600 uppercase tracking-wider">
                    Loading your vehicle catalog...
                  </p>
                </div>
              ) : (() => {
                const filteredListings = userListings.filter((item) => {
                  const matchStatus = catalogFilterStatus === "all" ||
                    (catalogFilterStatus === "active" && (item.status === "active" || !item.status)) ||
                    item.status === catalogFilterStatus;

                  const searchLower = catalogSearch.toLowerCase().trim();
                  const matchSearch = !searchLower ||
                    item.title.toLowerCase().includes(searchLower) ||
                    item.make.toLowerCase().includes(searchLower) ||
                    item.model.toLowerCase().includes(searchLower) ||
                    item.year.toString().includes(searchLower);

                  return matchStatus && matchSearch;
                });

                if (filteredListings.length === 0) {
                  return (
                    <div className="p-12 text-center bg-[#FAF8F5] border border-stone-300 space-y-4">
                      <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center text-stone-500 mx-auto">
                        <Car className="w-6 h-6 text-stone-400" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-serif font-bold uppercase text-stone-900">
                          {userListings.length === 0 ? "No Vehicles Uploaded Yet" : "No Matching Vehicles Found"}
                        </h4>
                        <p className="text-xs text-stone-500 max-w-sm mx-auto">
                          {userListings.length === 0
                            ? "You haven't listed any vehicles in your account. Click below to add your first vehicle listing."
                            : "Try clearing search keywords or choosing 'All' status."}
                        </p>
                      </div>
                      {userListings.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setViewMode("wizard")}
                          className="px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-widest inline-flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-4 h-4 text-amber-400" />
                          <span>List Your First Vehicle</span>
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredListings.map((listing) => {
                      const mainPhoto = listing.photos && listing.photos.length > 0 ? listing.photos[0].src : "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800";
                      const status = listing.status || "active";

                      const isPremiumOrFeatured = Boolean(listing.featured || listing.urgent || listing.verified || subscriptionActive || isAdmin);
                      const exp = getListingExpirationDetails(listing.datePosted || (listing as any).createdAt, isPremiumOrFeatured);
                      const is30DaysExpired = exp.isExpired;
                      const daysRemaining = exp.daysRemaining;

                      return (
                        <motion.div
                          key={listing.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`bg-[#FAF8F5] border-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.85)] flex flex-col justify-between overflow-hidden relative group ${
                            is30DaysExpired ? "border-red-600 bg-red-50/20" : "border-stone-900"
                          }`}
                        >
                          {/* Image Thumbnail */}
                          <div className="relative aspect-video bg-stone-900 overflow-hidden">
                            <img
                              src={mainPhoto}
                              alt={listing.title}
                              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${is30DaysExpired ? "grayscale contrast-125 opacity-70" : ""}`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/20" />

                            {/* Status Tag */}
                            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                              {is30DaysExpired ? (
                                <span className="px-2.5 py-1 text-[9.5px] font-mono font-extrabold uppercase tracking-widest border border-stone-950 shadow-xs bg-red-600 text-white">
                                  EXPIRED (30 DAYS HIDDEN)
                                </span>
                              ) : status === "hidden" ? (
                                <span className="px-2.5 py-1 text-[9.5px] font-mono font-black uppercase tracking-widest border border-stone-950 shadow-xs bg-red-600 text-white animate-pulse">
                                  HIDDEN BY ADMIN
                                </span>
                              ) : (
                                <span className={`px-2.5 py-1 text-[9.5px] font-mono font-extrabold uppercase tracking-widest border border-stone-950 shadow-xs ${
                                  status === "active" ? "bg-emerald-500 text-stone-950" :
                                  status === "sold" ? "bg-stone-800 text-stone-200" :
                                  "bg-amber-500 text-stone-950"
                                }`}>
                                  {status.toUpperCase()}
                                </span>
                              )}

                              {listing.featured && (
                                <span className="px-2 py-0.5 bg-amber-400 text-stone-950 text-[9px] font-mono font-extrabold uppercase tracking-wider flex items-center gap-1 border border-stone-950">
                                  <Star className="w-3 h-3 fill-stone-950" /> Featured
                                </span>
                              )}

                              {!isPremiumOrFeatured && !is30DaysExpired && daysRemaining !== null && (
                                <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border border-stone-950 ${
                                  exp.isNearExpiry ? "bg-amber-500 text-stone-950 animate-pulse font-black" : "bg-stone-900 text-amber-400"
                                }`}>
                                  {daysRemaining}d Left (Free Tier)
                                </span>
                              )}
                            </div>

                            {/* Photos Counter */}
                            <div className="absolute bottom-3 right-3 bg-stone-950/85 text-white text-[10px] font-mono px-2 py-1 flex items-center gap-1.5 backdrop-blur-xs border border-white/20">
                              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                              <span>{listing.photos?.length || 0} Photos</span>
                            </div>
                          </div>

                          {/* Vehicle Specifications */}
                          <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-start gap-2">
                                <h3 className="font-serif font-black text-lg text-stone-950 uppercase leading-snug">
                                  {listing.title}
                                </h3>
                                <span className="font-serif font-black text-base text-amber-900 whitespace-nowrap bg-amber-500/15 px-2 py-0.5 border border-amber-600/30">
                                  ₹{listing.price?.toLocaleString("en-IN")}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono text-stone-600 font-semibold">
                                <span>Yr: {listing.year}</span>
                                <span>•</span>
                                <span>{listing.fuelType || "Petrol"}</span>
                                <span>•</span>
                                <span>{listing.transmission || "Manual"}</span>
                                <span>•</span>
                                <span>{listing.mileage} km</span>
                              </div>

                              {listing.description && (
                                <p className="text-xs text-stone-600 line-clamp-2 pt-1 font-medium leading-relaxed">
                                  {listing.description}
                                </p>
                              )}

                              {/* Admin Hidden Warning Banner */}
                              {status === "hidden" && (
                                <div className="p-3 bg-red-100/90 border-2 border-red-600 text-red-950 font-mono text-xs font-bold rounded-xs flex items-start gap-2.5 mt-2 shadow-xs">
                                  <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                                  <div>
                                    <span className="uppercase font-black text-red-700 block text-[11px] tracking-wider">⚠️ LISTING HIDDEN BY ADMIN</span>
                                    <p className="text-[10.5px] text-stone-800 font-medium leading-normal mt-0.5">
                                      Your vehicle listing has been hidden by the site administrator and is currently not visible to public buyers in the marketplace search catalog.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Created & Expiry Dates for Seller */}
                              <div className="pt-2.5 mt-2 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-1 text-[10.5px] font-mono">
                                <span className="text-stone-500 font-bold uppercase">
                                  Posted: <span className="text-stone-800">{exp.postedDateObj.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
                                </span>
                                <span className={`font-bold ${
                                  exp.isPremiumOrFeatured
                                    ? "text-emerald-700"
                                    : exp.isExpired
                                    ? "text-red-600 font-black uppercase"
                                    : exp.isNearExpiry
                                    ? "text-amber-700 font-black"
                                    : "text-stone-700"
                                }`}>
                                  {exp.isPremiumOrFeatured
                                    ? "Expires: Never (Premium)"
                                    : exp.isExpired
                                    ? "Expired (Auto-Hidden)"
                                    : `Expires: ${exp.expiryDateStr} (${exp.daysRemaining}d left)`}
                                </span>
                              </div>
                            </div>

                            {/* Status Quick Switch Selector */}
                            <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
                              <span className="text-[10px] font-mono font-bold uppercase text-stone-500">
                                Listing Status:
                              </span>
                              {status === "hidden" && !isAdmin ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 border border-red-400 text-red-950 rounded-xs">
                                  <Lock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                  <span className="text-[9.5px] font-mono font-black uppercase tracking-wider">
                                    LOCKED BY ADMIN (CANNOT UNHIDE)
                                  </span>
                                </div>
                              ) : (
                                <div className="flex gap-1">
                                  {(["active", "pending", "sold"] as const).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => handleQuickStatusChange(listing.id, st)}
                                      className={`px-2 py-0.5 text-[9.5px] font-mono font-bold uppercase tracking-wider border cursor-pointer transition ${
                                        status === st
                                          ? "bg-stone-900 text-white border-stone-950 font-extrabold"
                                          : "bg-[#F4F1EA] hover:bg-stone-200 text-stone-600 border-stone-300"
                                      }`}
                                    >
                                      {st}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Buyer Enquiries Button for this Vehicle */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVehicleIdFilter(String(listing.id));
                                setViewMode("requests");
                              }}
                              className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-between border border-amber-600 cursor-pointer shadow-xs transition"
                            >
                              <span className="flex items-center gap-1.5">
                                <PhoneCall className="w-4 h-4 text-stone-900" />
                                <span>View Buyer Enquiries</span>
                              </span>
                              <span className="px-2 py-0.5 bg-stone-950 text-amber-400 text-[10px] rounded-full font-black">
                                {testDriveRequests.filter(t => String(t.listingId) === String(listing.id) || String(t.vehicleId) === String(listing.id)).length +
                                 callbackRequests.filter(c => String(c.listingId) === String(listing.id) || String(c.vehicleId) === String(listing.id)).length} Leads
                              </span>
                            </button>

                            {/* Action Control Buttons */}
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(listing)}
                                className="py-2 px-2 bg-[#F4F1EA] hover:bg-stone-200 text-stone-900 border border-stone-400 text-[10.5px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                              >
                                <Edit className="w-3.5 h-3.5 text-stone-700" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenPhotoManager(listing)}
                                className="py-2 px-2 bg-[#F4F1EA] hover:bg-stone-200 text-stone-900 border border-stone-400 text-[10.5px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                                <span>Photos</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingListing(listing)}
                                className="py-2 px-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 text-[10.5px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 3. PERFORMANCE PART CATALOG & HARDWARE INVENTORY (DEDICATED DIV) */}
      {viewMode === "part_desk" && (
        <div id="sell-view-part-desk" className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 sm:p-8 space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.85)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-300 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-amber-800 bg-amber-500/15 px-2.5 py-1 border border-amber-600/30 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Seller Control Center</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-950 uppercase tracking-tight">
                  My Part Catalog
                </h2>
                <p className="text-stone-600 text-xs mt-1 font-medium">
                  Full control center for your uploaded performance parts. Edit part specs, manage photo galleries, update status, or remove listings.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewMode("list_part")}
                className="px-5 py-3 bg-stone-900 hover:bg-stone-800 text-[#F4F1EA] text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-stone-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer shrink-0 transition-transform active:scale-95"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>List New Part</span>
              </button>
            </div>

            {/* Unauthenticated State Warning */}
            {(!currentUser || currentUser.isAnonymous) ? (
              <div className="p-8 bg-[#F4F1EA] border-2 border-stone-400 text-center space-y-4 my-4">
                <div className="w-14 h-14 bg-amber-500/15 border-2 border-amber-600/40 rounded-full flex items-center justify-center text-amber-700 mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-serif font-bold text-stone-900 uppercase">
                    Seller Sign In Required
                  </h3>
                  <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed font-medium">
                    Log in or create your free account to view your listed performance parts, edit parameters, update photo galleries, and track buyer inquiries.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSignInClick}
                  className="px-6 py-3.5 bg-stone-900 hover:bg-stone-850 text-white text-xs font-mono font-bold uppercase tracking-widest inline-flex items-center gap-2 border-2 border-stone-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>Log In / Sign Up Now</span>
                </button>
              </div>
            ) : (
              <>
                {/* Stats Metric Cards (5 Columns matching Image 1) */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 pt-2">
                  <div className="p-3 bg-[#F4F1EA] border border-stone-300">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-stone-500 block">Total Inventory</span>
                    <span className="text-lg sm:text-xl font-serif font-black text-stone-900">{userPartListings.length} Parts</span>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-600/30">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-800 block">Active Listings</span>
                    <span className="text-lg sm:text-xl font-serif font-black text-emerald-900">
                      {userPartListings.filter(l => l.status === "active" || !l.status).length}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-600/30">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-800 block">Pending / On Hold</span>
                    <span className="text-lg sm:text-xl font-serif font-black text-amber-950">
                      {userPartListings.filter(l => l.status === "pending").length}
                    </span>
                  </div>

                  <div className="p-3 bg-red-500/10 border border-red-600/30">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-red-800 block">Hidden by Admin</span>
                    <span className="text-lg sm:text-xl font-serif font-black text-red-950">
                      {userPartListings.filter(l => l.status === "hidden").length}
                    </span>
                  </div>

                  <div className="p-3 bg-stone-200/80 border border-stone-300">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-stone-600 block">Sold / Out of Stock</span>
                    <span className="text-lg sm:text-xl font-serif font-black text-stone-800">
                      {userPartListings.filter(l => l.status === "sold").length}
                    </span>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1 bg-[#F4F1EA] p-1 border border-stone-300 overflow-x-auto">
                    {(["all", "active", "pending", "hidden", "sold"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setPartCatalogFilterStatus(st)}
                        className={`px-3 py-1.5 text-[10.5px] font-mono font-bold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                          partCatalogFilterStatus === st
                            ? "bg-stone-900 text-white shadow-xs"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                        }`}
                      >
                        {st === "all" ? `All (${userPartListings.length})` : `${st} (${userPartListings.filter(l => (st === "active" ? (l.status === "active" || !l.status) : l.status === st)).length})`}
                      </button>
                    ))}
                  </div>

                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter my catalog..."
                      value={partCatalogSearch}
                      onChange={(e) => setPartCatalogSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900 placeholder:text-stone-400"
                    />
                    {partCatalogSearch && (
                      <button
                        type="button"
                        onClick={() => setPartCatalogSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* CATALOG CARDS LIST FOR PERFORMANCE PARTS */}
          {currentUser && !currentUser.isAnonymous && (
            <div className="space-y-4">
              {/* Part 30-Day Expiration & Warning Summary Banner */}
              {(() => {
                let nearExpiryCount = 0;
                let hiddenCount = 0;

                userPartListings.forEach((item) => {
                  const isPremiumOrFeatured = Boolean(item.featured || item.urgent || item.verified || subscriptionActive || isAdmin);
                  const exp = getListingExpirationDetails(item.datePosted || (item as any).createdAt, isPremiumOrFeatured);
                  if (!isPremiumOrFeatured) {
                    if (exp.isNearExpiry) {
                      nearExpiryCount++;
                    } else if (exp.isExpired || item.status === "hidden") {
                      hiddenCount++;
                    }
                  }
                });

                if (nearExpiryCount === 0 && hiddenCount === 0) return null;

                return (
                  <div className="space-y-3 mb-2">
                    {nearExpiryCount > 0 && (
                      <div className="bg-amber-50 border-2 border-amber-500 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                          <div>
                            <h4 className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-950">
                              ⚠️ EXPIRATION ALERT: {nearExpiryCount} {nearExpiryCount === 1 ? "Part" : "Parts"} Expiring Within 3 Days
                            </h4>
                            <p className="text-[11px] text-stone-800 font-medium mt-0.5">
                              Free tier part listings automatically hide after 30 days. Upgrade your account or listing to feature permanently.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("premium")}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-[10px] font-mono font-extrabold uppercase tracking-widest border border-amber-600 shrink-0 cursor-pointer transition"
                        >
                          Upgrade To Premium
                        </button>
                      </div>
                    )}

                    {hiddenCount > 0 && (
                      <div className="bg-red-50 border-2 border-red-600 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-start gap-3">
                          <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-mono font-extrabold uppercase tracking-wider text-red-950">
                              🚫 AUTO-HIDDEN: {hiddenCount} {hiddenCount === 1 ? "Part" : "Parts"} Exceeded 30-Day Window
                            </h4>
                            <p className="text-[11px] text-stone-800 font-medium mt-0.5">
                              These items are hidden from public search results due to the 30-day limit.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("premium")}
                          className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-mono font-extrabold uppercase tracking-widest border border-red-700 shrink-0 cursor-pointer transition"
                        >
                          Restore Visibility
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {isLoadingUserPartListings ? (
                <div className="p-12 text-center bg-[#FAF8F5] border border-stone-300 space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
                  <p className="text-xs font-mono font-bold text-stone-600 uppercase tracking-wider">
                    Loading your performance part catalog...
                  </p>
                </div>
              ) : (() => {
                const filteredParts = userPartListings.filter((item) => {
                  const matchStatus = partCatalogFilterStatus === "all" ||
                    (partCatalogFilterStatus === "active" && (item.status === "active" || !item.status)) ||
                    item.status === partCatalogFilterStatus;

                  const searchLower = partCatalogSearch.toLowerCase().trim();
                  const matchSearch = !searchLower ||
                    item.title.toLowerCase().includes(searchLower) ||
                    item.brand.toLowerCase().includes(searchLower) ||
                    item.category.toLowerCase().includes(searchLower) ||
                    (item.partNumber && item.partNumber.toLowerCase().includes(searchLower));

                  return matchStatus && matchSearch;
                });

                if (filteredParts.length === 0) {
                  return (
                    <div className="p-12 text-center bg-[#FAF8F5] border-2 border-stone-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.85)] space-y-4">
                      <div className="w-14 h-14 bg-amber-500/15 border-2 border-amber-600/30 rounded-full flex items-center justify-center text-amber-700 mx-auto">
                        <Wrench className="w-7 h-7 text-amber-700" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-serif font-black uppercase text-stone-900">
                          {userPartListings.length === 0 ? "No Parts Uploaded Yet" : "No Matching Parts Found"}
                        </h4>
                        <p className="text-xs text-stone-600 max-w-sm mx-auto font-medium">
                          {userPartListings.length === 0
                            ? "You haven't listed any performance parts in your account. Click below to add your first part listing."
                            : "Try clearing search keywords or choosing 'All' status."}
                        </p>
                      </div>
                      {userPartListings.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setViewMode("list_part")}
                          className="px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-widest inline-flex items-center gap-2 cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-stone-950 transition active:scale-95"
                        >
                          <Plus className="w-4 h-4 text-amber-400" />
                          <span>List Your First Part</span>
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredParts.map((part) => {
                      const mainPhoto = part.photos && part.photos.length > 0
                        ? part.photos[0].src
                        : part.image || "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800";
                      const status = part.status || "active";

                      const isPremiumOrFeatured = Boolean(part.featured || part.urgent || part.verified || subscriptionActive || isAdmin);
                      const exp = getListingExpirationDetails(part.datePosted || (part as any).createdAt, isPremiumOrFeatured);
                      const is30DaysExpired = exp.isExpired;
                      const daysRemaining = exp.daysRemaining;

                      // Leads count for this specific part
                      const leadsCount = callbackRequests.filter(c => 
                        String(c.partId) === String(part.id) ||
                        (c.partTitle && part.title && c.partTitle.toLowerCase() === part.title.toLowerCase())
                      ).length;

                      return (
                        <motion.div
                          key={part.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`bg-[#FAF8F5] border-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.85)] flex flex-col justify-between overflow-hidden relative group ${
                            is30DaysExpired ? "border-red-600 bg-red-50/20" : "border-stone-900"
                          }`}
                        >
                          {/* Image Thumbnail (Matching Image 2) */}
                          <div className="relative aspect-video bg-stone-900 overflow-hidden">
                            <img
                              src={mainPhoto}
                              alt={part.title}
                              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${is30DaysExpired ? "grayscale contrast-125 opacity-70" : ""}`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/20" />

                            {/* Status & Expiry Badges */}
                            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                              {is30DaysExpired ? (
                                <span className="px-2.5 py-1 text-[9.5px] font-mono font-extrabold uppercase tracking-widest border border-stone-950 shadow-xs bg-red-600 text-white">
                                  EXPIRED (30 DAYS HIDDEN)
                                </span>
                              ) : status === "hidden" ? (
                                <span className="px-2.5 py-1 text-[9.5px] font-mono font-black uppercase tracking-widest border border-stone-950 shadow-xs bg-red-600 text-white animate-pulse">
                                  HIDDEN BY ADMIN
                                </span>
                              ) : (
                                <span className={`px-2.5 py-1 text-[9.5px] font-mono font-extrabold uppercase tracking-widest border border-stone-950 shadow-xs ${
                                  status === "active" ? "bg-emerald-500 text-stone-950 font-black" :
                                  status === "sold" ? "bg-stone-800 text-stone-200" :
                                  "bg-amber-500 text-stone-950 font-black"
                                }`}>
                                  {status.toUpperCase()}
                                </span>
                              )}

                              {part.featured && (
                                <span className="px-2 py-0.5 bg-amber-400 text-stone-950 text-[9px] font-mono font-extrabold uppercase tracking-wider flex items-center gap-1 border border-stone-950">
                                  <Star className="w-3 h-3 fill-stone-950" /> Featured
                                </span>
                              )}

                              {!isPremiumOrFeatured && !is30DaysExpired && daysRemaining !== null && (
                                <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border border-stone-950 ${
                                  exp.isNearExpiry ? "bg-amber-500 text-stone-950 animate-pulse font-black" : "bg-stone-900 text-amber-400"
                                }`}>
                                  {daysRemaining}d Left (Free Tier)
                                </span>
                              )}
                            </div>

                            {/* Photos Counter */}
                            <div className="absolute bottom-3 right-3 bg-stone-950/85 text-white text-[10px] font-mono px-2 py-1 flex items-center gap-1.5 backdrop-blur-xs border border-white/20">
                              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                              <span>{part.photos?.length || (part.image ? 1 : 0)} Photos</span>
                            </div>
                          </div>

                          {/* Part Specifications & Body (Matching Image 2) */}
                          <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-start gap-2">
                                <h3 className="font-serif font-black text-lg text-stone-950 uppercase leading-snug">
                                  {part.title}
                                </h3>
                                <span className="font-serif font-black text-base text-amber-900 whitespace-nowrap bg-amber-500/15 px-2 py-0.5 border border-amber-600/30">
                                  ₹{part.price?.toLocaleString("en-IN")}
                                </span>
                              </div>

                              {/* Specs row matching Image 2 style */}
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono text-stone-600 font-semibold">
                                <span>Cat: <strong className="text-stone-800 uppercase">{part.category}</strong></span>
                                <span>•</span>
                                <span>Brand: <strong className="text-stone-800">{part.brand}</strong></span>
                                <span>•</span>
                                <span>Rarity: <strong className="text-stone-800 uppercase">{part.rarity}</strong></span>
                                {part.partNumber && (
                                  <>
                                    <span>•</span>
                                    <span>PN: {part.partNumber}</span>
                                  </>
                                )}
                              </div>

                              {part.description && (
                                <p className="text-xs text-stone-600 line-clamp-2 pt-1 font-medium leading-relaxed">
                                  {part.description}
                                </p>
                              )}

                              {/* Admin Hidden Warning Banner */}
                              {status === "hidden" && (
                                <div className="p-3 bg-red-100/90 border-2 border-red-600 text-red-950 font-mono text-xs font-bold rounded-xs flex items-start gap-2.5 mt-2 shadow-xs">
                                  <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                                  <div>
                                    <span className="uppercase font-black text-red-700 block text-[11px] tracking-wider">⚠️ LISTING HIDDEN BY ADMIN</span>
                                    <p className="text-[10.5px] text-stone-800 font-medium leading-normal mt-0.5">
                                      Your part listing has been hidden by the administrator and is currently not visible to buyers in the motorsport parts catalog.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Posted & Expiry Dates */}
                              <div className="pt-2.5 mt-2 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-1 text-[10.5px] font-mono">
                                <span className="text-stone-500 font-bold uppercase">
                                  Posted: <span className="text-stone-800">{exp.postedDateObj.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
                                </span>
                                <span className={`font-bold ${
                                  exp.isPremiumOrFeatured
                                    ? "text-emerald-700"
                                    : exp.isExpired
                                    ? "text-red-600 font-black uppercase"
                                    : exp.isNearExpiry
                                    ? "text-amber-700 font-black"
                                    : "text-stone-700"
                                }`}>
                                  {exp.isPremiumOrFeatured
                                    ? "Expires: Never (Premium)"
                                    : exp.isExpired
                                    ? "Expired (Auto-Hidden)"
                                    : `Expires: ${exp.expiryDateStr} (${exp.daysRemaining}d left)`}
                                </span>
                              </div>
                            </div>

                            {/* Status Quick Switch Selector (Matching Image 2) */}
                            <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
                              <span className="text-[10px] font-mono font-bold uppercase text-stone-500">
                                Listing Status:
                              </span>
                              {status === "hidden" && !isAdmin ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 border border-red-400 text-red-950 rounded-xs">
                                  <Lock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                  <span className="text-[9.5px] font-mono font-black uppercase tracking-wider">
                                    LOCKED BY ADMIN
                                  </span>
                                </div>
                              ) : (
                                <div className="flex gap-1">
                                  {(["active", "pending", "sold"] as const).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => handleQuickPartStatusChange(part.id, st)}
                                      className={`px-2 py-0.5 text-[9.5px] font-mono font-bold uppercase tracking-wider border cursor-pointer transition ${
                                        status === st
                                          ? "bg-stone-900 text-white border-stone-950 font-extrabold"
                                          : "bg-[#F4F1EA] hover:bg-stone-200 text-stone-600 border-stone-300"
                                      }`}
                                    >
                                      {st}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Buyer Enquiries Button (Matching Image 2) */}
                            <button
                              type="button"
                              onClick={() => {
                                setRequestItemTargetFilter("parts");
                                setRequestSearchQuery(part.title);
                                setViewMode("requests");
                              }}
                              className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-between border border-amber-600 cursor-pointer shadow-xs transition"
                            >
                              <span className="flex items-center gap-1.5">
                                <PhoneCall className="w-4 h-4 text-stone-900" />
                                <span>View Buyer Enquiries</span>
                              </span>
                              <span className="px-2 py-0.5 bg-stone-950 text-amber-400 text-[10px] rounded-full font-black">
                                {leadsCount} Leads
                              </span>
                            </button>

                            {/* Action Buttons Grid: Edit, Photos, Remove (Matching Image 2) */}
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPartModal(part)}
                                className="py-2 px-2 bg-[#F4F1EA] hover:bg-stone-200 text-stone-900 border border-stone-400 text-[10.5px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                              >
                                <Edit className="w-3.5 h-3.5 text-stone-700" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenPartPhotoManager(part)}
                                className="py-2 px-2 bg-[#F4F1EA] hover:bg-stone-200 text-stone-900 border border-stone-400 text-[10.5px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                                <span>Photos</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingPartListing(part)}
                                className="py-2 px-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 text-[10.5px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 4. BUYER REQUESTS & LEADS CONTROL CENTER (DEDICATED DIV) */}
      {viewMode === "requests" && (
        <div id="sell-view-buyer-requests" className="space-y-6 animate-in fade-in duration-200">
          {(() => {
            // Combine and normalize test drives and callbacks
            const combinedList = [
              ...ownerTDs.map((td) => ({
                kind: "test_drive" as const,
                itemType: "vehicle" as const,
                refCode: td.bookingRef,
                id: td.id,
                vehicleId: td.vehicleId,
                vehicleTitle: td.vehicleTitle,
                vehiclePrice: td.vehiclePrice,
                vehicleImage: td.vehicleImage,
                partId: undefined as string | number | undefined,
                partTitle: undefined as string | undefined,
                partImage: undefined as string | undefined,
                partPrice: undefined as number | undefined,
                partCategory: undefined as string | undefined,
                partNumber: undefined as string | undefined,
                sellerName: td.sellerName,
                buyerName: td.fullName,
                phone: td.phone,
                preferredDate: td.preferredDate,
                timeSlot: td.timeSlot,
                driveType: td.driveType,
                address: td.address,
                notes: td.notes,
                createdAt: td.createdAt,
                status: td.status || "scheduled",
                sellerNote: td.sellerNote,
                rawTD: td,
              })),
              ...ownerCBs.map((cb) => {
                const isPartEnquiry = cb.itemType === "part" || !!cb.partTitle || !!cb.partId;
                return {
                  kind: "callback" as const,
                  itemType: (isPartEnquiry ? "part" : "vehicle") as "part" | "vehicle",
                  refCode: cb.callbackRef,
                  id: cb.id,
                  vehicleId: cb.vehicleId,
                  vehicleTitle: cb.vehicleTitle || (isPartEnquiry ? undefined : "General Vehicle Enquiry"),
                  vehiclePrice: cb.vehiclePrice,
                  vehicleImage: cb.vehicleImage,
                  partId: cb.partId,
                  partTitle: cb.partTitle,
                  partImage: cb.partImage,
                  partPrice: cb.partPrice,
                  partCategory: cb.partCategory,
                  partNumber: cb.partNumber,
                  sellerName: cb.sellerName,
                  buyerName: cb.fullName,
                  phone: cb.phoneNumber,
                  preferredDate: "",
                  timeSlot: cb.timeSlot || "ASAP",
                  driveType: null,
                  address: "",
                  notes: cb.note || cb.queryTopic,
                  createdAt: cb.createdAt,
                  status: cb.status || "pending",
                  sellerNote: cb.sellerNote,
                  rawCB: cb,
                };
              }),
            ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

            const vehicleReqs = combinedList.filter((item) => item.itemType === "vehicle");
            const partReqs = combinedList.filter((item) => item.itemType === "part");
            const pendingVehicleReqs = vehicleReqs.filter((i) => i.status === "pending" || i.status === "scheduled");
            const pendingPartReqs = partReqs.filter((i) => i.status === "pending");
            const actionedCount = combinedList.filter(
              (i) => i.status === "confirmed" || i.status === "contacted" || i.status === "completed" || i.status === "resolved"
            ).length;

            return (
              <>
                {/* Header Banner */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 sm:p-8 space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.85)]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-300 pb-4">
                    <div>
                      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-amber-800 bg-amber-500/15 px-2.5 py-1 border border-amber-600/30 mb-2">
                        <PhoneCall className="w-3.5 h-3.5 text-amber-700" />
                        <span>Buyer Leads &amp; Enquiries Manager</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-950 uppercase tracking-tight">
                        Buyer Requests &amp; Leads
                      </h2>
                      <p className="text-stone-600 text-xs mt-1 font-medium max-w-2xl">
                        Real-time direct enquiries and test drive schedules for vehicles &amp; performance motorsport parts.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowOnlyMyVehiclesRequests(!showOnlyMyVehiclesRequests)}
                        className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider border cursor-pointer flex items-center gap-2 transition ${
                          showOnlyMyVehiclesRequests
                            ? "bg-amber-500 text-stone-950 border-amber-600 shadow-xs"
                            : "bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700"
                        }`}
                        title="Toggle filtering requests for your listings vs all system requests"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>{showOnlyMyVehiclesRequests ? "Filter: My Listings Only" : "Show All System Leads"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("autoworld_requests_updated"))}
                        className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-wider border border-stone-950 flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sync</span>
                      </button>
                    </div>
                  </div>

                  {/* Metrics Dashboard Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-[#F4F1EA] p-3.5 border border-stone-300">
                      <div className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">Total Received</div>
                      <div className="text-xl font-serif font-black text-stone-950 mt-0.5">
                        {combinedList.length} <span className="text-xs font-sans text-stone-600 font-normal">Leads</span>
                      </div>
                    </div>

                    <div className="bg-[#F4F1EA] p-3.5 border border-stone-300">
                      <div className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                        <Car className="w-3 h-3 text-amber-600" /> Vehicle Enquiries
                      </div>
                      <div className="text-xl font-serif font-black text-stone-950 mt-0.5">
                        {vehicleReqs.length}{" "}
                        <span className="text-xs font-sans text-amber-700 font-bold">
                          ({pendingVehicleReqs.length} Pending)
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#F4F1EA] p-3.5 border border-stone-300">
                      <div className="text-[10px] font-mono font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-blue-600" /> Part Enquiries
                      </div>
                      <div className="text-xl font-serif font-black text-stone-950 mt-0.5">
                        {partReqs.length}{" "}
                        <span className="text-xs font-sans text-blue-700 font-bold">
                          ({pendingPartReqs.length} Pending)
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#F4F1EA] p-3.5 border border-stone-300">
                      <div className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Actioned Leads
                      </div>
                      <div className="text-xl font-serif font-black text-stone-950 mt-0.5">
                        {actionedCount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search & Filter Controls */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-4 space-y-3">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={requestSearchQuery}
                        onChange={(e) => setRequestSearchQuery(e.target.value)}
                        placeholder="Search buyer name, phone, vehicle, part title, or ref code (#TD... / #CB...)"
                        className="w-full pl-9 pr-8 py-2 bg-[#F4F1EA] border border-stone-400 text-xs font-mono text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-stone-950"
                      />
                      {requestSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setRequestSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Select Specific Vehicle Filter */}
                    {userListings.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase text-stone-500 whitespace-nowrap">
                          Vehicle:
                        </span>
                        <select
                          value={selectedVehicleIdFilter}
                          onChange={(e) => setSelectedVehicleIdFilter(e.target.value)}
                          className="px-3 py-2 bg-[#F4F1EA] border border-stone-400 text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-950"
                        >
                          <option value="all">All My Listed Vehicles ({userListings.length})</option>
                          {userListings.map((l) => (
                            <option key={l.id} value={String(l.id)}>
                              {l.title} (₹{l.price.toLocaleString("en-IN")})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Filter Tabs Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-300">
                    {/* Item Category (Vehicle vs Part) Selector */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-stone-500 mr-1">Target:</span>
                      {[
                        { id: "all", label: "All Items", count: combinedList.length },
                        { id: "vehicles", label: "🚗 Vehicles", count: vehicleReqs.length },
                        { id: "parts", label: "🔧 Motorsport Parts", count: partReqs.length },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setRequestItemTargetFilter(tab.id as any)}
                          className={`px-3 py-1 text-[11px] font-mono font-bold uppercase border cursor-pointer transition ${
                            requestItemTargetFilter === tab.id
                              ? "bg-stone-900 text-amber-400 border-stone-950 font-extrabold"
                              : "bg-[#F4F1EA] hover:bg-stone-200 text-stone-700 border-stone-300"
                          }`}
                        >
                          {tab.label} ({tab.count})
                        </button>
                      ))}
                    </div>

                    {/* Request Type Selector */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-stone-500 mr-1">Type:</span>
                      {[
                        { id: "all", label: "All Enquiries", count: combinedList.length },
                        { id: "test_drives", label: "Test Drives", count: ownerTDs.length },
                        { id: "callbacks", label: "Callbacks", count: ownerCBs.length },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setRequestTypeFilter(tab.id as any)}
                          className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase border cursor-pointer transition ${
                            requestTypeFilter === tab.id
                              ? "bg-amber-500 text-stone-950 border-amber-600 font-extrabold"
                              : "bg-[#F4F1EA] hover:bg-stone-200 text-stone-700 border-stone-300"
                          }`}
                        >
                          {tab.label} ({tab.count})
                        </button>
                      ))}
                    </div>

                    {/* Request Status Selector */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-stone-500 mr-1">Status:</span>
                      {[
                        { id: "all", label: "All Statuses" },
                        { id: "pending", label: "Pending" },
                        { id: "confirmed", label: "Confirmed / Contacted" },
                        { id: "completed", label: "Resolved" },
                        { id: "declined", label: "Declined" },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setRequestStatusFilter(st.id as any)}
                          className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase border cursor-pointer transition ${
                            requestStatusFilter === st.id
                              ? "bg-stone-900 text-white border-stone-950 font-extrabold"
                              : "bg-[#F4F1EA] hover:bg-stone-200 text-stone-600 border-stone-300"
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Requests Content Feed */}
                {isLoadingRequests ? (
                  <div className="p-12 text-center bg-[#FAF8F5] border border-stone-300 space-y-3">
                    <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
                    <p className="text-xs font-mono font-bold text-stone-600 uppercase tracking-wider">
                      Syncing direct buyer enquiries and test drive schedules...
                    </p>
                  </div>
                ) : (() => {
                  // Apply Filters
                  const filteredRequests = combinedList.filter((item) => {
                    // 1. Filter by Item Target (Vehicles vs Parts)
                    if (requestItemTargetFilter === "vehicles" && item.itemType !== "vehicle") return false;
                    if (requestItemTargetFilter === "parts" && item.itemType !== "part") return false;

                    // 2. Filter by Request Type
                    if (requestTypeFilter === "test_drives" && item.kind !== "test_drive") return false;
                    if (requestTypeFilter === "callbacks" && item.kind !== "callback") return false;

                    // 3. Filter by Vehicle ID
                    if (selectedVehicleIdFilter !== "all") {
                      if (String(item.vehicleId) !== selectedVehicleIdFilter) return false;
                    }

                    // 4. Filter by Status
                    if (requestStatusFilter === "pending") {
                      if (item.status !== "pending" && item.status !== "scheduled") return false;
                    } else if (requestStatusFilter === "confirmed") {
                      if (item.status !== "confirmed" && item.status !== "contacted") return false;
                    } else if (requestStatusFilter === "completed") {
                      if (item.status !== "completed" && item.status !== "resolved") return false;
                    } else if (requestStatusFilter === "declined") {
                      if (item.status !== "declined" && item.status !== "cancelled") return false;
                    }

                    // 5. Search Filter
                    const queryLower = requestSearchQuery.toLowerCase().trim();
                    if (queryLower) {
                      const matchName = item.buyerName?.toLowerCase().includes(queryLower);
                      const matchPhone = item.phone?.toLowerCase().includes(queryLower);
                      const matchRef = item.refCode?.toLowerCase().includes(queryLower);
                      const matchVehicle = item.vehicleTitle?.toLowerCase().includes(queryLower);
                      const matchPart = item.partTitle?.toLowerCase().includes(queryLower);
                      const matchCategory = item.partCategory?.toLowerCase().includes(queryLower);
                      const matchNotes = item.notes?.toLowerCase().includes(queryLower);
                      if (!matchName && !matchPhone && !matchRef && !matchVehicle && !matchPart && !matchCategory && !matchNotes) return false;
                    }

                    return true;
                  });

                  if (filteredRequests.length === 0) {
                    return (
                      <div className="p-12 text-center bg-[#FAF8F5] border-2 border-stone-900 space-y-4">
                        <div className="w-14 h-14 bg-amber-500/15 border border-amber-600/30 rounded-full flex items-center justify-center text-amber-700 mx-auto">
                          <PhoneCall className="w-7 h-7" />
                        </div>
                        <div className="space-y-1 max-w-md mx-auto">
                          <h4 className="text-lg font-serif font-black uppercase text-stone-900">
                            No Buyer Requests Found
                          </h4>
                          <p className="text-xs text-stone-600 font-medium">
                            {combinedList.length === 0
                              ? "There are no callback or test drive requests submitted yet. When buyers request a callback or schedule a test drive on your listed vehicles or performance parts, they will appear here in real-time."
                              : "No enquiries match your selected filters or search query. Try clearing search text or switching status tabs."}
                          </p>
                        </div>
                        {(requestSearchQuery || requestItemTargetFilter !== "all" || requestTypeFilter !== "all" || requestStatusFilter !== "all" || selectedVehicleIdFilter !== "all") && (
                          <button
                            type="button"
                            onClick={() => {
                              setRequestSearchQuery("");
                              setRequestItemTargetFilter("all");
                              setRequestTypeFilter("all");
                              setRequestStatusFilter("all");
                              setSelectedVehicleIdFilter("all");
                            }}
                            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Reset Filters</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filteredRequests.map((req) => {
                        const isTestDrive = req.kind === "test_drive";
                        const isPart = req.itemType === "part";
                        const cleanPhone = req.phone?.replace(/[^0-9]/g, "") || "";
                        const formattedDateStr = req.createdAt
                          ? new Date(req.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recently";

                        // Status badge styling
                        const isPending = req.status === "pending" || req.status === "scheduled";
                        const isConfirmed = req.status === "confirmed" || req.status === "contacted";
                        const isCompleted = req.status === "completed" || req.status === "resolved";
                        const isDeclined = req.status === "declined" || req.status === "cancelled";

                        // Pre-formulated WhatsApp message link tailored for Vehicle vs Part
                        const itemTitle = isPart ? (req.partTitle || "Motorsport Part") : (req.vehicleTitle || "Vehicle");
                        const itemKindLabel = isPart ? "motorsport part enquiry" : (isTestDrive ? "test drive booking" : "vehicle callback request");
                        const waText = encodeURIComponent(
                          `Hello ${req.buyerName}, regarding your ${itemKindLabel} (#${req.refCode}) for "${itemTitle}" on AutoWorld. I am the seller and would like to assist you!`
                        );
                        const waUrl = `https://wa.me/${cleanPhone.length <= 10 ? '91' + cleanPhone : cleanPhone}?text=${waText}`;

                        return (
                          <motion.div
                            key={req.refCode}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`bg-[#FAF8F5] border-2 border-stone-900 shadow-[5px_5px_0px_0px_rgba(0,0,0,0.85)] overflow-hidden relative ${
                              isPart
                                ? "border-l-8 border-l-blue-600"
                                : isTestDrive
                                ? "border-l-8 border-l-amber-500"
                                : "border-l-8 border-l-emerald-600"
                            }`}
                          >
                            {/* Top Header Strip */}
                            <div className="bg-stone-900 text-stone-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                              <div className="flex items-center gap-2">
                                {isPart ? (
                                  <span className="px-2.5 py-0.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                    <Wrench className="w-3 h-3 text-amber-300" /> PART ENQUIRY
                                  </span>
                                ) : isTestDrive ? (
                                  <span className="px-2.5 py-0.5 bg-amber-500 text-stone-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                    <Calendar className="w-3 h-3" /> VEHICLE TEST DRIVE
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 bg-emerald-500 text-stone-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                    <Car className="w-3 h-3" /> VEHICLE CALLBACK
                                  </span>
                                )}

                                <span className="font-bold text-amber-400">#{req.refCode}</span>
                                <span className="text-stone-500">•</span>
                                <span className="text-stone-400 text-[10.5px]">{formattedDateStr}</span>
                              </div>

                              {/* Status Tag */}
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-0.5 text-[10px] font-mono font-black uppercase tracking-wider border ${
                                    isPending
                                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                                      : isConfirmed
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                      : isCompleted
                                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                      : "bg-stone-700 text-stone-300 border-stone-600"
                                  }`}
                                >
                                  STATUS: {req.status.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div className="p-5 space-y-4">
                              {/* Target Item (Vehicle vs Part) Info Card Row */}
                              {isPart ? (
                                <div className="flex items-center gap-3 p-3 bg-blue-50/70 border-2 border-blue-200">
                                  {req.partImage ? (
                                    <img
                                      src={req.partImage}
                                      alt={req.partTitle || "Motorsport Part"}
                                      className="w-16 h-12 object-cover border border-blue-300 shrink-0 bg-stone-900"
                                    />
                                  ) : (
                                    <div className="w-16 h-12 bg-stone-900 border border-blue-400 flex items-center justify-center text-amber-400 shrink-0">
                                      <Wrench className="w-6 h-6 text-amber-400" />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-mono font-black uppercase tracking-wider shrink-0">
                                          PART
                                        </span>
                                        <h4 className="font-serif font-black text-stone-950 text-sm uppercase truncate">
                                          {req.partTitle || "Performance Tuning Hardware"}
                                        </h4>
                                      </div>
                                      {req.partPrice ? (
                                        <span className="font-serif font-bold text-xs text-blue-950 whitespace-nowrap bg-blue-200/80 px-2 py-0.5 border border-blue-300">
                                          ₹{req.partPrice.toLocaleString("en-IN")}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] font-mono text-stone-600 mt-0.5">
                                      {req.partCategory && (
                                        <span>Category: <strong className="text-stone-900 capitalize">{req.partCategory}</strong></span>
                                      )}
                                      {req.partNumber && (
                                        <span>P/N: <strong className="text-stone-900">{req.partNumber}</strong></span>
                                      )}
                                      <span>Seller: <strong className="text-stone-900">{req.sellerName || "AutoWorld Direct"}</strong></span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 p-3 bg-[#F4F1EA] border border-stone-300">
                                  {req.vehicleImage ? (
                                    <img
                                      src={req.vehicleImage}
                                      alt={req.vehicleTitle}
                                      className="w-16 h-12 object-cover border border-stone-400 shrink-0 bg-stone-900"
                                    />
                                  ) : (
                                    <div className="w-16 h-12 bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 shrink-0">
                                      <Car className="w-6 h-6" />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="px-1.5 py-0.5 bg-amber-500 text-stone-950 text-[9px] font-mono font-black uppercase tracking-wider shrink-0">
                                          VEHICLE
                                        </span>
                                        <h4 className="font-serif font-black text-stone-950 text-sm uppercase truncate">
                                          {req.vehicleTitle}
                                        </h4>
                                      </div>
                                      {req.vehiclePrice ? (
                                        <span className="font-serif font-bold text-xs text-amber-900 whitespace-nowrap bg-amber-500/20 px-2 py-0.5 border border-amber-600/30">
                                          ₹{req.vehiclePrice.toLocaleString("en-IN")}
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-[10.5px] font-mono text-stone-600 truncate mt-0.5">
                                      Seller Listing: <strong className="text-stone-900">{req.sellerName || "AutoWorld Direct"}</strong>
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Buyer Details Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-sans">
                                {/* Buyer Name & Phone */}
                                <div className="p-3 bg-stone-100/80 border border-stone-300 space-y-1">
                                  <div className="text-[10px] font-mono font-bold uppercase text-stone-500 flex items-center gap-1">
                                    <UserIcon className="w-3.5 h-3.5 text-stone-700" /> Buyer Name
                                  </div>
                                  <div className="font-serif font-black text-stone-950 text-sm">
                                    {req.buyerName || "Interested Buyer"}
                                  </div>
                                  <div className="text-xs font-mono font-bold text-stone-800 flex items-center gap-1 pt-0.5">
                                    <Phone className="w-3.5 h-3.5 text-amber-700" />
                                    <a href={`tel:${req.phone}`} className="hover:underline hover:text-amber-900">
                                      {req.phone}
                                    </a>
                                  </div>
                                </div>

                                {/* Date & Time Slot */}
                                <div className="p-3 bg-stone-100/80 border border-stone-300 space-y-1">
                                  <div className="text-[10px] font-mono font-bold uppercase text-stone-500 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-amber-700" /> Appointment / Preferred Time
                                  </div>
                                  {isTestDrive ? (
                                    <div className="space-y-0.5 font-mono">
                                      <div className="font-bold text-stone-900">
                                        📅 {req.preferredDate}
                                      </div>
                                      <div className="text-[11px] text-stone-700">
                                        ⏰ {req.timeSlot}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="font-mono text-stone-900 font-bold">
                                      ⏰ Preferred Slot: {req.timeSlot}
                                    </div>
                                  )}
                                </div>

                                {/* Drive Type / Topic */}
                                <div className="p-3 bg-stone-100/80 border border-stone-300 space-y-1">
                                  <div className="text-[10px] font-mono font-bold uppercase text-stone-500 flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Enquiry Scope
                                  </div>
                                  {isPart ? (
                                    <div className="font-mono font-bold text-blue-900 text-xs flex items-center gap-1">
                                      <Wrench className="w-3.5 h-3.5 text-blue-700" /> Motorsport Part Order &amp; Fitment
                                    </div>
                                  ) : isTestDrive ? (
                                    <div className="font-mono font-bold text-stone-900 uppercase text-xs">
                                      {req.driveType === "doorstep" ? "🚗 Doorstep Test Drive" : "🏢 Showroom Visit"}
                                    </div>
                                  ) : (
                                    <div className="font-mono font-bold text-stone-900 text-xs">
                                      📞 Callback &amp; Vehicle Valuation
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Doorstep Address or Notes */}
                              {isTestDrive && req.address && (
                                <div className="p-2.5 bg-amber-500/10 border border-amber-600/30 text-xs font-mono text-stone-800 flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="uppercase text-[10px] text-amber-900 block">Doorstep Delivery Address:</strong>
                                    <span>{req.address}</span>
                                  </div>
                                </div>
                              )}

                              {req.notes && (
                                <div className="p-2.5 bg-[#F4F1EA] border border-stone-300 text-xs text-stone-800 font-medium space-y-0.5">
                                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block">
                                    Buyer Note / Request Detail:
                                  </span>
                                  <p className="italic">"{req.notes}"</p>
                                </div>
                              )}

                              {/* Seller Internal Note Display */}
                              {req.sellerNote && editingNoteForReq !== req.refCode && (
                                <div className="p-3 bg-stone-900 text-amber-300 border border-stone-950 font-mono text-xs space-y-1 rounded-xs">
                                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-amber-400">
                                    <span>📝 Seller Internal Note:</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingNoteForReq(req.refCode);
                                        setSellerNoteInput(req.sellerNote || "");
                                      }}
                                      className="text-stone-400 hover:text-white underline cursor-pointer"
                                    >
                                      Edit Note
                                    </button>
                                  </div>
                                  <p className="text-stone-200">{req.sellerNote}</p>
                                </div>
                              )}

                              {/* Edit Seller Note Input Box */}
                              {editingNoteForReq === req.refCode && (
                                <div className="p-3 bg-amber-50 border-2 border-amber-500 space-y-2">
                                  <label className="text-[10.5px] font-mono font-bold uppercase text-stone-900 block">
                                    Add Internal Seller Note / Remarks:
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={sellerNoteInput}
                                    onChange={(e) => setSellerNoteInput(e.target.value)}
                                    placeholder="e.g. Spoke with buyer on phone, confirmed dispatch or meeting time."
                                    className="w-full p-2 bg-white border border-stone-400 text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-950"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingNoteForReq(null);
                                        setSellerNoteInput("");
                                      }}
                                      className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-mono font-bold uppercase cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveSellerNote(req.kind, req.refCode, sellerNoteInput, req.id)}
                                      className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-mono font-bold uppercase cursor-pointer"
                                    >
                                      Save Note
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Seller Action Controls Bar */}
                              <div className="pt-3 border-t border-stone-300 flex flex-wrap items-center justify-between gap-3">
                                {/* Left: Contact Direct Actions */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>WhatsApp Buyer</span>
                                  </a>

                                  <a
                                    href={`tel:${req.phone}`}
                                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                                  >
                                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Call Direct</span>
                                  </a>

                                  {editingNoteForReq !== req.refCode && !req.sellerNote && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingNoteForReq(req.refCode);
                                        setSellerNoteInput("");
                                      }}
                                      className="px-2.5 py-2 bg-[#F4F1EA] hover:bg-stone-200 text-stone-800 border border-stone-400 text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer transition"
                                    >
                                      <Edit className="w-3.5 h-3.5 text-stone-600" />
                                      <span>Add Note</span>
                                    </button>
                                  )}
                                </div>

                                {/* Right: Update Request Status & Delete */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 hidden sm:inline">
                                    Update Status:
                                  </span>

                                  <select
                                    value={req.status}
                                    onChange={(e) => handleUpdateRequestStatus(req.kind, req.refCode, e.target.value, req.id)}
                                    className="px-2.5 py-1.5 bg-[#F4F1EA] border border-stone-400 text-xs font-mono font-bold uppercase text-stone-900 focus:outline-none focus:border-stone-950 cursor-pointer"
                                  >
                                    <option value={isTestDrive ? "scheduled" : "pending"}>
                                      {isTestDrive ? "SCHEDULED (PENDING)" : "PENDING"}
                                    </option>
                                    <option value={isTestDrive ? "confirmed" : "contacted"}>
                                      {isTestDrive ? "CONFIRMED APPOINTMENT" : "CONTACTED BUYER"}
                                    </option>
                                    <option value={isTestDrive ? "completed" : "resolved"}>
                                      {isTestDrive ? "TEST DRIVE COMPLETED" : "RESOLVED / CLOSED"}
                                    </option>
                                    <option value="declined">DECLINED / CANCELLED</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRequest(req.kind, req.refCode, req.id)}
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 cursor-pointer transition"
                                    title="Delete request"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </div>
      )}

      {/* 5. VEHICLE LISTING WIZARD (DEDICATED DIV) */}
      {viewMode === "wizard" && (
        <div id="sell-view-list-vehicle" className="space-y-6 animate-in fade-in duration-200">
          {/* Admin Authority Banner */}
          {isAdmin && (
            <div className="mb-6 bg-stone-900 border-2 border-amber-500 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(245,158,11,0.3)]">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <span>Administrator Command Authority</span>
                    <span className="px-2 py-0.5 bg-amber-500 text-stone-950 text-[9px] font-extrabold rounded-xs">UNLIMITED</span>
                  </h4>
                  <p className="text-[11px] text-stone-300 font-semibold mt-0.5 leading-relaxed">
                    All vehicle listing limits bypassed. As an administrator ({currentUser?.email}), you hold full listing privileges, bulk CRM synchronization, priority catalog placement, and complete platform access.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isAdmin && existingListingsCount >= 2 && !subscriptionActive && (
        <div className="mb-6 bg-amber-50 border border-amber-300 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#9A3412]">Free Tier Limit Reached ({existingListingsCount}/2 Listings)</h4>
              <p className="text-[11px] text-stone-605 mt-1 leading-relaxed font-semibold">
                You have reached your free account limit of 2 listings. To publish additional vehicles, please upgrade to a Premium setup or delete previous listings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("premium")}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-sans font-bold uppercase tracking-widest transition whitespace-nowrap"
          >
            Go Premium
          </button>
        </div>
      )}

      {/* Business Dealer Sync Banner */}
      <div className="mb-8 p-5 bg-[#E8E3D7] border-2 border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-5 font-sans">
        <div className="flex items-start gap-3">
          <Crown className="w-6 h-6 text-amber-600 shrink-0 mt-0.5 fill-amber-200" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-900">⚡ Dealer Bulk Inventory Sync</h4>
            <p className="text-[11px] text-stone-705 mt-1 leading-relaxed font-semibold">
              {(subscriptionActive || isAdmin)
                ? "Active Dealership / Admin Authority! Import unlimited vehicles instantly using bulk CSV or XML dealership feed files." 
                : "Import up to 100+ vehicles instantly! Synchronize your dealership's CRM catalog with one-click bulk upload."
              }
            </p>
          </div>
        </div>
        
        {(subscriptionActive || isAdmin) ? (
          <button
            type="button"
            onClick={() => {
              setShowDealerUpload(!showDealerUpload);
              if (!showDealerUpload) {
                setParsedDealerVehicles([]);
              }
            }}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-[#F4F1EA] text-[10px] font-bold uppercase tracking-widest transition cursor-pointer"
          >
            {showDealerUpload ? "Standard Listing Wizard" : "Launch Bulk Importer"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab("premium")}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold uppercase tracking-widest transition cursor-pointer"
          >
            Unlock Dealer API
          </button>
        )}
      </div>

      {/* Bulk Importer Container */}
      {showDealerUpload && (subscriptionActive || isAdmin) && (
        <div className="bg-white border-2 border-stone-900 p-6 space-y-6 mb-10 animate-in fade-in duration-200">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">Dealership CSV / XML Synchronization Hub</h3>
            <p className="text-[11px] text-stone-500 mt-1 font-semibold">Paste feed data directly or drag CRM stock file to load vehicles.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left side: Upload and Paste */}
            <div className="space-y-4">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold">Paste CRM Export Text (CSV/XML)</label>
              <textarea
                value={rawUploadText}
                onChange={(e) => setRawUploadText(e.target.value)}
                placeholder={
                  `Paste CSV format (Header-aligned):\nmake,model,title,year,price,mileage,fuel,transmission,description,image\n\nOR Paste XML format:\n<inventory>\n  <vehicle>\n    <make>Honda</make>\n    ...\n  </vehicle>\n</inventory>`
                }
                rows={12}
                className="w-full p-3 bg-stone-50 border-2 border-stone-300 focus:border-stone-900 text-[11px] font-mono text-stone-800 focus:outline-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isParsingFeed || !rawUploadText.trim()}
                  onClick={() => handleParseDealerFeed()}
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-850 text-white text-[10px] uppercase tracking-widest font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isParsingFeed ? "Analyzing Data Structures..." : "Parse Inventory Feed"}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const demoCSV = `make,model,title,year,price,mileage,fuel,transmission,description,image\nMahindra,Thar,Thar LX Hard Top,2022,1450000,16500,Diesel,Manual,Single owner dealership certified Thar 4x4. Mint condition.,https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800\nMaruti,Swift,Swift VXI Petrol,2021,650000,32000,Petrol,Manual,Fuel efficient family hatchback. Complete service history.,https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800`;
                      setRawUploadText(demoCSV);
                      showToast("Loaded sample dealership CSV data. Click 'Parse Inventory Feed'!", "info");
                    }}
                    className="px-3 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-700 text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                  >
                    Load Sample CSV (Admin)
                  </button>
                )}
              </div>
            </div>

            {/* Right side: Instructions and Template downloads */}
            <div className="bg-[#FAF8F5] p-5 border border-stone-200 space-y-4 text-xs leading-relaxed">
              <h4 className="font-bold text-stone-800 uppercase tracking-widest text-[10px]">Import Guidelines & Schemas</h4>
              
              <div className="space-y-3 font-semibold text-stone-600 text-[11px]">
                <p>1. <strong className="text-stone-900 font-bold">Required CSV Columns:</strong> <code className="bg-stone-200 px-1 font-mono text-[9.5px]">make,model,title,year,price,mileage,fuel,transmission,description,image</code></p>
                <p>2. <strong className="text-stone-900 font-bold">Required XML tags:</strong> Wrap each vehicle in <code className="bg-stone-200 px-1 font-mono text-[9.5px]">&lt;vehicle&gt;</code> tags containing make, model, title, year, price, mileage, fuel, transmission, description, image.</p>
                <p>3. <strong className="text-stone-900 font-bold">Image Fallbacks:</strong> If the image URL is blank or fails, Auto World automatically assigns a vetted premium asset placeholder.</p>
                <p>4. <strong className="text-stone-900 font-bold">Featured Booster:</strong> Every dealer synchronized vehicle is marked as premium featured and pinned to top feeds automatically!</p>
              </div>

              <div className="pt-3 border-t border-stone-200 space-y-2">
                <label className="block text-[10px] font-bold text-stone-700 uppercase tracking-wider">Simulate Drag & Drop stock file</label>
                <div className="border-2 border-dashed border-stone-300 hover:border-stone-900 p-6 text-center cursor-pointer bg-white transition-all group"
                  onClick={() => {
                    const demoCSV = `make,model,title,year,price,mileage,fuel,transmission,description,image\nHyundai,Creta,Creta SX Executive,2022,1380000,18000,Diesel,Automatic,Creta executive SUV from first-owner dealer stock.,https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800\nTata,Nexon,Nexon EV Max,2023,1650000,8500,Electric,Automatic,Premium dealership EV stock with charger included.,https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800`;
                    setRawUploadText(demoCSV);
                    handleParseDealerFeed(demoCSV);
                  }}
                >
                  <Upload className="w-8 h-8 mx-auto text-stone-400 group-hover:text-stone-850 mb-2 animate-bounce" />
                  <span className="text-[10px] uppercase font-bold text-stone-700 tracking-wider">Drag & Drop CRM stock export (CSV/XML)</span>
                  <p className="text-[9px] text-stone-400 mt-1">or Click to auto-fill sample feed data</p>
                </div>
              </div>
            </div>
          </div>

          {/* Parsed Vehicles Table / Review Block */}
          {parsedDealerVehicles.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-stone-200">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 font-bold">
                  Parsed Feed Results: {parsedDealerVehicles.length} Vehicles Verified
                </span>
                <span className="text-[10px] text-stone-500 font-bold uppercase">All records verified secure</span>
              </div>

              {/* Table list */}
              <div className="overflow-x-auto border border-stone-200">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-200 uppercase tracking-widest text-[9px] font-mono text-stone-500">
                      <th className="p-3">Ref</th>
                      <th className="p-3">Make / Model</th>
                      <th className="p-3">Year</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Mileage</th>
                      <th className="p-3">Fuel / Gearbox</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-sans font-semibold text-stone-700">
                    {parsedDealerVehicles.map((v, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="p-3 font-mono text-stone-400 text-[10px]">T-{idx+1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <img src={v.image} className="w-6 h-6 object-cover border border-stone-200" alt="" />
                            <div>
                              <p className="text-stone-900 font-bold text-[11.5px]">{v.title}</p>
                              <p className="text-[10px] text-stone-405 lowercase truncate max-w-xs">{v.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-stone-900">{v.year}</td>
                        <td className="p-3 text-stone-900 font-mono">₹{v.price.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-stone-500 font-mono">{v.mileage.toLocaleString("en-IN")} km</td>
                        <td className="p-3 text-stone-800 uppercase text-[10px]">
                          <span className="bg-stone-200/60 px-1 py-0.5 font-bold mr-1">{v.fuel}</span>
                          <span className="bg-stone-200/60 px-1 py-0.5 font-bold">{v.transmission}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import Progress Bar */}
              {isImporting && (
                <div className="space-y-1 bg-stone-50 p-4 border border-stone-200">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-stone-600">
                    <span>Batch syncing listings to Firestore...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-stone-200 h-2">
                    <div className="bg-stone-900 h-2 transition-all duration-150" style={{ width: `${importProgress}%` }}></div>
                  </div>
                </div>
              )}

              {/* Execute Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setParsedDealerVehicles([])}
                  className="px-4 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-700 text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                >
                  Clear Results
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={handleExecuteBulkImport}
                  className="px-6 py-3 bg-stone-900 hover:bg-stone-850 text-[#F4F1EA] text-[10px] font-bold uppercase tracking-widest cursor-pointer flex items-center gap-1.5"
                >
                  <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                  {isImporting ? "Syncing CRM Stock..." : "Synchronize All Listings (One-Click)"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto-Save Draft Status Bar */}
      {!showDealerUpload && currentStep <= 5 && (
        <div className="mb-6 py-2.5 px-4 bg-[#E8E3D7] border border-stone-300 flex flex-col sm:flex-row items-center justify-between text-[11px] font-sans gap-2 rounded-none">
          <div className="flex items-center gap-2 text-stone-800 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span className="uppercase text-[10px] tracking-wider font-bold">Auto-Save Enabled</span>
            {lastSavedTime ? (
              <span className="text-stone-500 font-mono text-[10px] lowercase">
                • last draft saved at {lastSavedTime}
              </span>
            ) : (
              <span className="text-stone-500 text-[10px]">
                • changes auto-save automatically
              </span>
            )}
          </div>
          {hasDraft && (
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-[10px] text-stone-700 hover:text-red-700 uppercase font-bold tracking-widest underline cursor-pointer transition"
            >
              Discard Draft & Start Fresh
            </button>
          )}
        </div>
      )}

      {/* Top wizard stepper */}
      {!showDealerUpload && currentStep <= 5 && (
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
      {!showDealerUpload && currentStep === 1 && (
        <div className="bg-[#FAF8F5] border border-stone-300 p-8 space-y-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 block mb-1">Step One / Wizard</span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-900 uppercase">Basic Vehicle Category info</h2>
            <p className="text-stone-500 text-xs mt-1 leading-relaxed">Specify your category types and manufacturing parameters to draft your dossier index matching rules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
            {/* Category Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block">
                Vehicle Category Type <span className="text-stone-400 font-light">(required)</span>
              </label>
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

            {/* 1. Year Dropdown (Enabled by default) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block flex justify-between items-center">
                <span>1. Manufacturing Year <span className="text-stone-400 font-light">(required)</span></span>
                <span className="text-[9px] text-stone-400 font-mono font-normal">1990 - 2026</span>
              </label>
              <select
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  // Selecting new year automatically clears model and triggers model fetch via useEffect
                }}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
              >
                <option value="">Select Year (1990 - 2026)</option>
                {NHTSA_YEARS.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* 2. Make / Manufacturer (Searchable Combobox with NHTSA & Popular Brands) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block flex justify-between items-center">
                <span>2. Make / Manufacturer <span className="text-stone-400 font-light">(required)</span></span>
                {isLoadingMakes && (
                  <span className="text-[9px] text-amber-600 font-mono flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Loading NHTSA Makes...
                  </span>
                )}
              </label>

              <SearchableMakeSelect
                make={make}
                setMake={setMake}
                setModel={setModel}
                setVehicleType={setVehicleType}
                vehicleType={vehicleType}
                customMake={customMake}
                setCustomMake={setCustomMake}
                nhtsaMakes={nhtsaMakes}
                isLoadingMakes={isLoadingMakes}
                VEHICLE_MAKES={VEHICLE_MAKES}
              />
            </div>

            {/* 3. Vehicle Model (Searchable Combobox with NHTSA & Fallbacks) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest block flex justify-between items-center">
                <span>3. Vehicle Model <span className="text-stone-400 font-light">(required)</span></span>
                {isLoadingModels && (
                  <span className="text-[9px] text-amber-600 font-mono flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Fetching NHTSA Models...
                  </span>
                )}
              </label>

              <SearchableModelSelect
                year={year}
                make={make}
                model={model}
                setModel={setModel}
                customModel={customModel}
                setCustomModel={setCustomModel}
                nhtsaModels={nhtsaModels}
                isLoadingModels={isLoadingModels}
                VEHICLE_MODELS={VEHICLE_MODELS}
              />

              {(!year || !make) && (
                <p className="text-[9px] text-stone-500 font-medium italic mt-1 uppercase">
                  🔒 Model selection is locked. Please select a Manufacturing Year and Make above.
                </p>
              )}
            </div>
          </div>

          {/* Availability Error Alert Message */}
          {availabilityError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md text-xs font-semibold flex items-center gap-2.5 shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Sorry, this specific vehicle combination is not currently available in our system.</span>
            </motion.div>
          )}

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
      {!showDealerUpload && currentStep === 2 && (
        <div className="bg-[#FAF8F5] border border-stone-300 p-8 space-y-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 block mb-1">Step Two / Specifications</span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-900 uppercase">Mechanical Parameters</h2>
            <p className="text-stone-500 text-xs mt-1">Provide engine specs, mileage parameters, and list modifications honestly.</p>
          </div>

          {/* CONDITION & CATEGORY SPECIFIC INPUTS */}
          <div className="p-6 bg-[#F4F1EA] border border-stone-300 text-center space-y-2">
            <h3 className="text-xs uppercase tracking-wider font-bold text-stone-900">Declare Current Overall Condition Rating</h3>
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

          {/* 1. BICYCLE SPECIFIC FIELDS */}
          {vehicleType === "bicycle" && (
            <div className="space-y-4 pt-2">
              <div className="bg-amber-50/60 p-3 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bicycle Mode Activated: Engine & Fuel fields omitted for human-powered / electric pedal assist bicycles.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                    Bicycle Category Style <span className="text-stone-400 font-light">(required)</span>
                  </label>
                  <select
                    value={bicycleType}
                    onChange={(e) => setBicycleType(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select Style</option>
                    <option value="Road Bike">Road Bike</option>
                    <option value="Mountain Bike (MTB)">Mountain Bike (MTB)</option>
                    <option value="Hybrid / City">Hybrid / City Bike</option>
                    <option value="BMX">BMX</option>
                    <option value="Folding Bike">Folding Bike</option>
                    <option value="Electric E-Bike">Electric E-Bike</option>
                    <option value="Gravel / Cyclocross">Gravel / Cyclocross</option>
                    <option value="Cruiser">Cruiser</option>
                    <option value="Kids Bike">Kids Bike</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Frame Size</label>
                  <select
                    value={frameSize}
                    onChange={(e) => setFrameSize(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select Frame Size</option>
                    <option value="Extra Small (XS / 14&quot;)">Extra Small (XS / 14")</option>
                    <option value="Small (S / 16&quot;)">Small (S / 16")</option>
                    <option value="Medium (M / 18&quot;)">Medium (M / 18")</option>
                    <option value="Large (L / 20&quot;)">Large (L / 20")</option>
                    <option value="Extra Large (XL / 22&quot;)">Extra Large (XL / 22")</option>
                    <option value="Kids (16&quot;-20&quot; Wheel)">Kids (16"-20" Wheel)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Gear Count / Drivetrain</label>
                  <select
                    value={gears}
                    onChange={(e) => setGears(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select Drivetrain</option>
                    <option value="Single Speed">Single Speed (No Gears)</option>
                    <option value="7-Speed">7-Speed Shimano</option>
                    <option value="18-Speed">18-Speed</option>
                    <option value="21-Speed">21-Speed Tourney/Acera</option>
                    <option value="24-Speed">24-Speed Altus/Deore</option>
                    <option value="27-Speed">27-Speed Deore/SLX</option>
                    <option value="30-Speed / 1x12">30-Speed / 1x12 SRAM</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Brake System</label>
                  <select
                    value={brakeType}
                    onChange={(e) => setBrakeType(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select Brakes</option>
                    <option value="Hydraulic Disc Brakes">Hydraulic Disc Brakes</option>
                    <option value="Mechanical Disc Brakes">Mechanical Disc Brakes</option>
                    <option value="V-Brakes / Rim Brakes">V-Brakes / Rim Brakes</option>
                    <option value="Coaster Brake">Coaster Brake</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Frame Material</label>
                  <select
                    value={frameMaterial}
                    onChange={(e) => setFrameMaterial(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select Frame Material</option>
                    <option value="Aluminum Alloy 6061">Aluminum Alloy 6061 (Lightweight)</option>
                    <option value="Carbon Fiber">Carbon Fiber (Ultra Light / Performance)</option>
                    <option value="Chromoly Steel">Chromoly Steel (Durable / Vintage)</option>
                    <option value="Titanium">Titanium</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 2. MOTORCYCLE / SCOOTER SPECIFIC FIELDS */}
          {vehicleType === "motorcycle" && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Bike Category Type</label>
                  <select
                    value={bikeType}
                    onChange={(e) => setBikeType(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select Motorcycle Type</option>
                    <option value="Sports Bike">Sports Bike</option>
                    <option value="Cruiser">Cruiser</option>
                    <option value="Commuter">Commuter</option>
                    <option value="Scooter / Moped">Scooter / Moped</option>
                    <option value="Adventure / Off-Road">Adventure / Off-Road</option>
                    <option value="Cafe Racer">Cafe Racer</option>
                    <option value="Touring">Touring</option>
                    <option value="Electric Scooter/Bike">Electric Scooter / Bike</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                    Odometer Mileage (km/mi) <span className="text-stone-400 font-light">(required)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 12000"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                    Power / Fuel Type <span className="text-stone-400 font-light">(required)</span>
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select Power Source</option>
                    <option value="petrol">Petrol / Gasoline</option>
                    <option value="electric">Full Electric (EV)</option>
                  </select>
                </div>

                {fuelType === "electric" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Battery Capacity (kWh)</label>
                      <input
                        type="text"
                        placeholder="e.g. 3.7 kWh"
                        value={batteryCapacity}
                        onChange={(e) => setBatteryCapacity(e.target.value)}
                        className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Range Per Charge (km)</label>
                      <input
                        type="text"
                        placeholder="e.g. 120 km"
                        value={electricRange}
                        onChange={(e) => setElectricRange(e.target.value)}
                        className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Engine Size (cc)</label>
                    <input
                      type="text"
                      placeholder="e.g. 150cc, 350cc"
                      value={engineSize}
                      onChange={(e) => setEngineSize(e.target.value)}
                      className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                    Gearbox / Transmission <span className="text-stone-400 font-light">(required)</span>
                  </label>
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select Transmission</option>
                    <option value="Manual (5-Speed)">Manual (5-Speed)</option>
                    <option value="Manual (6-Speed)">Manual (6-Speed)</option>
                    <option value="Automatic / CVT">Automatic / CVT (Scooter)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 3. FOUR WHEELERS & COMMERCIAL SPECIFIC FIELDS */}
          {["car", "suv", "truck", "van", "commercial"].includes(vehicleType) && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                    Odometer Mileage (km/mi) <span className="text-stone-400 font-light">(required)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                    Power / Fuel Type <span className="text-stone-400 font-light">(required)</span>
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select Fuel</option>
                    <option value="petrol">Petrol / Gasoline</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">Full Electric (EV)</option>
                    <option value="hybrid">Plugin Hybrid</option>
                    <option value="cng">CNG / LPG</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">
                    Transmission Style <span className="text-stone-400 font-light">(required)</span>
                  </label>
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select Transmission</option>
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual Transmission</option>
                    <option value="amt">AMT (Automated Manual)</option>
                    <option value="cvt">CVT (Continuously Variable)</option>
                    <option value="dct">Dual-Clutch (DCT/DSG)</option>
                  </select>
                </div>

                {fuelType === "electric" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Battery Capacity (kWh)</label>
                      <input
                        type="text"
                        placeholder="e.g. 75 kWh"
                        value={batteryCapacity}
                        onChange={(e) => setBatteryCapacity(e.target.value)}
                        className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Electric Range (km)</label>
                      <input
                        type="text"
                        placeholder="e.g. 450 km per charge"
                        value={electricRange}
                        onChange={(e) => setElectricRange(e.target.value)}
                        className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Engine Volume / Size</label>
                    <input
                      type="text"
                      placeholder="e.g. 1.5L i-VTEC or 2.0L Turbo"
                      value={engineSize}
                      onChange={(e) => setEngineSize(e.target.value)}
                      className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Drivetrain</label>
                  <select
                    value={driveType}
                    onChange={(e) => setDriveType(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select Drivetrain</option>
                    <option value="FWD">FWD (Front-Wheel Drive)</option>
                    <option value="RWD">RWD (Rear-Wheel Drive)</option>
                    <option value="AWD">AWD (All-Wheel Drive)</option>
                    <option value="4WD">4WD (4x4 with Low Range)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Doors / Seats</label>
                  <div className="flex gap-2">
                    <select
                      value={doors}
                      onChange={(e) => setDoors(e.target.value)}
                      className="w-1/2 px-2 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold"
                    >
                      <option value="">Doors</option>
                      <option value="2">2 Doors</option>
                      <option value="3">3 Doors</option>
                      <option value="4">4 Doors</option>
                      <option value="5">5 Doors</option>
                    </select>
                    <select
                      value={seats}
                      onChange={(e) => setSeats(e.target.value)}
                      className="w-1/2 px-2 py-3 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold"
                    >
                      <option value="">Seats</option>
                      <option value="2">2 Seats</option>
                      <option value="4">4 Seats</option>
                      <option value="5">5 Seats</option>
                      <option value="7">7 Seats</option>
                      <option value="8">8+ Seats</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INDIAN AUTOMOTIVE & RTO REGISTRATION SPECIFICATIONS */}
          <div className="bg-[#F4F1EA] border border-stone-300 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-300 pb-2">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-amber-700 font-bold block">Compliance & Documentation</span>
                <h3 className="text-xs sm:text-sm font-serif font-black uppercase text-stone-950">Indian RTO & Vehicle Verification Data</h3>
              </div>
              <span className="px-2 py-0.5 bg-stone-900 text-amber-300 text-[9px] font-mono font-bold uppercase tracking-wider rounded-xs">
                RTO Parivahan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Registration Number (RC) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-widest block">
                  Registration Number (RC)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH-02-EQ-8842"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-mono font-bold tracking-wider text-stone-900 uppercase focus:outline-none focus:border-stone-900"
                />
              </div>

              {/* RTO State */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-widest block">
                  RTO State
                </label>
                <select
                  value={rtoState}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setRtoState(newState);
                    const stateObj = INDIAN_RTO_STATES.find(s => s.state === newState);
                    if (stateObj && stateObj.rtos && stateObj.rtos.length > 0) {
                      setRtoCode(stateObj.rtos[0]);
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  {INDIAN_RTO_STATES.map((st) => (
                    <option key={st.state} value={st.state}>{st.state}</option>
                  ))}
                </select>
              </div>

              {/* RTO Office Code */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-widest block">
                  RTO Office / Circle Code
                </label>
                <select
                  value={rtoCode}
                  onChange={(e) => setRtoCode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-900 font-mono"
                >
                  {INDIAN_RTO_STATES.find(s => s.state === rtoState)?.rtos.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  )) || (
                    <option value={rtoCode}>{rtoCode}</option>
                  )}
                </select>
              </div>

              {/* Insurance Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-widest block">
                  Insurance Status
                </label>
                <select
                  value={insuranceStatus}
                  onChange={(e) => setInsuranceStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  {INSURANCE_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Insurance Validity */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-widest block">
                  Insurance Validity
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dec 2026 or 11/2026"
                  value={insuranceValidity}
                  onChange={(e) => setInsuranceValidity(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              {/* PUCC Pollution Certificate */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-widest block">
                  PUCC Emission Certificate
                </label>
                <select
                  value={puccStatus}
                  onChange={(e) => setPuccStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  {PUCC_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Hypothecation / Bank NOC */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-widest block">
                  Hypothecation / Loan Status
                </label>
                <select
                  value={hypothecationStatus}
                  onChange={(e) => setHypothecationStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  {HYPOTHECATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* FASTag Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-widest block">
                  FASTag Attachment
                </label>
                <select
                  value={fastagStatus}
                  onChange={(e) => setFastagStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  <option value="Active & Linked">Active & Linked</option>
                  <option value="Not Attached">Not Attached</option>
                </select>
              </div>

              {/* State NOC Availability */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-widest block">
                  Interstate Transfer NOC
                </label>
                <select
                  value={stateNocAvailable}
                  onChange={(e) => setStateNocAvailable(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  {STATE_NOC_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Road Tax Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-widest block">
                  Road Tax Status
                </label>
                <select
                  value={roadTaxStatus}
                  onChange={(e) => setRoadTaxStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  {ROAD_TAX_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DYNAMIC CATEGORY FEATURES CHECKLIST */}
          <div className="space-y-2 pt-3 border-t border-stone-200">
            <span className="text-[10px] text-stone-600 block uppercase font-bold tracking-wider">
              {vehicleType === "bicycle" 
                ? "Bicycle Accessories & Components Checkbox"
                : vehicleType === "motorcycle"
                ? "Motorcycle Safety & Tech Options Checkbox"
                : "Vehicle Comfort & Safety Features Checkbox"
              }
            </span>
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
                        : "bg-[#F4F1EA] border-stone-300 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    <span className="truncate pr-1">{fName}</span>
                    {isChecked && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

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
      {!showDealerUpload && currentStep === 3 && (
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
              className="border-2 border-dashed border-stone-300 bg-[#F4F1EA] px-6 py-8 flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload className="w-8 h-8 text-stone-900 mb-2" />
              <h3 className="text-xs uppercase tracking-wider font-bold text-stone-800">Drag snapshots directly here</h3>
              <p className="text-[10px] uppercase text-stone-500 tracking-wider mt-1 text-center font-bold">Compatible with JPEG & PNG formats (Auto-compressed to web size)</p>
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <label className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-[10px] uppercase tracking-widest font-bold shadow-sm cursor-pointer select-none flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingMedia ? "Uploading Media..." : "Browse Local Files"}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    disabled={isUploadingMedia}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleAddSamplePhoto}
                    className="px-3 py-2.5 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-900 text-[10px] uppercase tracking-widest font-bold cursor-pointer"
                  >
                    + Add Sample Image (Admin Only)
                  </button>
                )}
              </div>
            </div>

            {/* LIVE FIREBASE STORAGE UPLOAD PROGRESS BAR CONTAINER */}
            {Object.keys(uploadProgressMap).length > 0 && (
              <div className="bg-[#F4F1EA] border border-stone-300 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-900">
                      Firebase Cloud Storage Pipe
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-stone-500 uppercase">Direct Secure Bucket</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(uploadProgressMap).map(([key, rawItem]) => {
                    const item = rawItem as { progress: number; status: "uploading" | "done" | "error" };
                    const shortName = key.split("_")[0];
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-stone-700 truncate max-w-[200px]">{shortName}</span>
                          <span className={item.status === "error" ? "text-red-600 font-bold" : "text-emerald-700 font-bold"}>
                            {item.status === "error" ? "Failed" : item.progress === 100 ? "Ready" : `${item.progress}%`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-300 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              item.status === "error"
                                ? "bg-red-500"
                                : item.progress === 100
                                ? "bg-emerald-600"
                                : "bg-amber-600"
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Direct Image URL input option */}
            <div className="bg-[#F4F1EA] p-4 border border-stone-300 space-y-2">
              <label className="text-[10px] font-bold text-stone-700 uppercase tracking-widest block">Or Add Image by Web URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/vehicle-photo.jpg"
                  value={step3UrlInput}
                  onChange={(e) => setStep3UrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
                <button
                  type="button"
                  onClick={handleAddPhotoByUrl}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                >
                  Add Link
                </button>
              </div>
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
      {!showDealerUpload && currentStep === 4 && (
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

          {/* Premium Promotion Add-ons Section */}
          <div className="pt-6 border-t border-stone-200 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Boost Your Sales Performance</span>
              <h3 className="text-sm font-serif font-black text-stone-900 uppercase">Premium Promotion Add-ons</h3>
              <p className="text-stone-500 text-[11px] leading-relaxed">
                Featured listings receive up to 3x more visibility by being pinned at the absolute top of the catalog feed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Featured Listing */}
              <div 
                onClick={() => setFeaturedListing(!featuredListing)}
                className={`p-4 border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                  featuredListing 
                    ? "bg-amber-50/60 border-amber-500 shadow-md ring-1 ring-amber-400/40" 
                    : "bg-white border-stone-200 hover:border-stone-400"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2.5 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      {/* ON/OFF Toggle Switch Button */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={featuredListing}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFeaturedListing(!featuredListing);
                        }}
                        className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          featuredListing ? "bg-amber-500" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out flex items-center justify-center text-[7px] font-mono font-black ${
                            featuredListing ? "translate-x-6 text-amber-600" : "translate-x-0 text-stone-400"
                          }`}
                        >
                          {featuredListing ? "ON" : "OFF"}
                        </span>
                      </button>

                      <span className="text-xs font-black text-stone-900 uppercase tracking-wider">Featured Booster</span>
                    </div>

                    <span className={`px-2 py-0.5 text-[8.5px] font-mono font-black uppercase tracking-wider rounded-sm ${
                      featuredListing ? "bg-amber-500 text-stone-950" : "bg-amber-100 text-amber-800"
                    }`}>
                      {featuredListing ? "ON" : "PREMIUM SPOT"}
                    </span>
                  </div>

                  <p className="text-[10px] text-stone-500 leading-snug">
                    Pinned at the absolute top of the buyer catalog feed with a custom gold premium badge.
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 mt-3 flex justify-between items-center text-xs font-mono font-bold">
                  <span className="text-stone-400">Add-on Pricing</span>
                  <span className="text-stone-900">
                    {subscriptionActive || currentUser?.email === "afrojalamansari461@gmail.com" ? (
                      <span className="text-emerald-600 uppercase font-bold">FREE with Pass</span>
                    ) : (
                      "₹499"
                    )}
                  </span>
                </div>
              </div>

              {/* Option 2: Urgent Listing */}
              <div 
                onClick={() => setUrgentListing(!urgentListing)}
                className={`p-4 border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                  urgentListing 
                    ? "bg-red-50/60 border-red-500 shadow-md ring-1 ring-red-400/40" 
                    : "bg-white border-stone-200 hover:border-stone-400"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2.5 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      {/* ON/OFF Toggle Switch Button */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={urgentListing}
                        onClick={(e) => {
                          e.stopPropagation();
                          setUrgentListing(!urgentListing);
                        }}
                        className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          urgentListing ? "bg-red-600" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out flex items-center justify-center text-[7px] font-mono font-black ${
                            urgentListing ? "translate-x-6 text-red-600" : "translate-x-0 text-stone-400"
                          }`}
                        >
                          {urgentListing ? "ON" : "OFF"}
                        </span>
                      </button>

                      <span className="text-xs font-black text-stone-900 uppercase tracking-wider">Urgent Hot Stamp</span>
                    </div>

                    <span className={`px-2 py-0.5 text-[8.5px] font-mono font-black uppercase tracking-wider rounded-sm ${
                      urgentListing ? "bg-red-600 text-white" : "bg-red-100 text-red-800"
                    }`}>
                      {urgentListing ? "ON" : "IMMEDIATE SALE"}
                    </span>
                  </div>

                  <p className="text-[10px] text-stone-500 leading-snug">
                    Displays a striking high-contrast crimson tag to capture buyers negotiating immediate transfers.
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 mt-3 flex justify-between items-center text-xs font-mono font-bold">
                  <span className="text-stone-400">Add-on Pricing</span>
                  <span className="text-stone-900">
                    {subscriptionActive || currentUser?.email === "afrojalamansari461@gmail.com" ? (
                      <span className="text-emerald-600 uppercase font-bold">FREE with Pass</span>
                    ) : (
                      "₹299"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Total price calculation helper */}
            {(featuredListing || urgentListing) && !subscriptionActive && currentUser?.email !== "afrojalamansari461@gmail.com" && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 flex justify-between items-center text-xs font-bold uppercase tracking-wider font-mono">
                <span className="text-stone-705">Total promotion additions:</span>
                <span className="text-stone-950 font-serif font-black text-sm">
                  ₹{(featuredListing ? 499 : 0) + (urgentListing ? 299 : 0)} INR
                </span>
              </div>
            )}
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
      {!showDealerUpload && currentStep === 5 && (
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
        <div className="relative max-w-2xl mx-auto py-4">
          <ConfettiExplosion key={confettiKey} />

          <motion.div 
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="bg-[#FAF8F5] border-2 border-stone-900 p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden z-10"
          >
            {/* Celebration Icon Badge */}
            <div className="relative inline-block">
              <motion.div 
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 18, delay: 0.15 }}
                className="w-20 h-20 bg-stone-950 text-[#F4F1EA] flex items-center justify-center mx-auto border-2 border-amber-500 shadow-xl relative z-10"
              >
                <CheckCircle2 className="w-10 h-10 text-amber-400" />
              </motion.div>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-2 border-2 border-dashed border-amber-400/60 rounded-full pointer-events-none"
              />
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-[10px] uppercase font-mono tracking-[0.2em] font-bold text-amber-700 block">Deploy Success • Catalogued</span>
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-950 uppercase tracking-tight">Listing Blueprint Catalogued</h2>
              <p className="text-stone-600 text-sm leading-relaxed max-w-md mx-auto font-sans">
                Your vehicular dossier for <strong className="text-stone-900">{year} {make} {model}</strong> has been safely built and published into the verified registry ledger.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-[#F4F1EA] border border-stone-300 p-5 text-left max-w-sm mx-auto text-xs space-y-1.5 text-stone-800 font-mono shadow-inner"
            >
              <div className="flex justify-between items-center"><span className="text-stone-400 font-bold uppercase tracking-wider text-[9px]">Receipt Blueprint ID</span> <span className="font-bold text-stone-900">{publishedListingId}</span></div>
              <div className="pt-1.5 border-t border-stone-200/80 flex justify-between items-center"><span className="text-stone-400 font-bold uppercase tracking-wider text-[9px]">Time Catalogued</span> <span className="text-stone-800 text-[11px]">{publishedTimeStr}</span></div>
              <div className="pt-1.5 border-t border-stone-200/80 flex justify-between items-center"><span className="text-stone-400 font-bold uppercase tracking-wider text-[9px]">Status Inflow</span> <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase tracking-wider">Active &amp; Visible</span></div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="space-y-3 pt-2"
            >
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-md mx-auto">
                <button
                  onClick={() => {
                    setViewMode("my_catalog");
                    setCurrentStep(1);
                  }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono text-xs font-bold uppercase tracking-widest border border-amber-600 transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  Manage My Listings
                </button>
                <button
                  onClick={() => setActiveTab("buy")}
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-850 text-white font-mono text-xs font-bold uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Look Up Catalog
                </button>
                <button
                  onClick={handleResetWizardForm}
                  className="flex-1 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-950 font-mono text-xs font-bold uppercase tracking-widest transition cursor-pointer"
                >
                  List Another
                </button>
              </div>

              {/* Replay Confetti celebration button */}
              <button
                type="button"
                onClick={() => setConfettiKey(prev => prev + 1)}
                className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold text-stone-500 hover:text-stone-900 transition pt-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Replay Celebration Confetti 🎉
              </button>
            </motion.div>
          </motion.div>
        </div>
      )}
      </div>
      )}

      {/* ADVANCED ANIMATED LOGIN REQUIRED POP-UP MODAL */}
      <AnimatePresence>
        {showLoginRequiredModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop with Smooth Blur & Darkening */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              onClick={() => setShowLoginRequiredModal(false)}
              className="fixed inset-0 bg-stone-950/80 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 32, rotateX: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative w-full max-w-md bg-[#FAF8F5] border-2 border-stone-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.95)] p-6 sm:p-8 overflow-hidden z-10 font-sans"
            >
              {/* Premium Top Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-600 to-stone-900" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowLoginRequiredModal(false)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-950 hover:bg-stone-200/80 rounded-full transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header Icon & Branding */}
              <div className="flex flex-col items-center text-center space-y-3">
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 20, delay: 0.08 }}
                  className="w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-600/40 flex items-center justify-center text-amber-700 shadow-inner"
                >
                  <Lock className="w-8 h-8" />
                </motion.div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-600/30 rounded-full text-amber-900 text-[10px] font-mono font-bold uppercase tracking-widest">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Login Required to Proceed</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-900 uppercase tracking-tight pt-1">
                    Sign In Required
                  </h3>
                  <p className="text-xs text-stone-600 font-medium leading-relaxed max-w-xs mx-auto">
                    Please log in or create a free account to enter vehicle specifications, upload media, and publish your listing on AutoWorld.
                  </p>
                </div>
              </div>

              {/* Benefits Section */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
                className="my-5 p-4 bg-[#F4F1EA] border border-stone-300 space-y-2 rounded-sm"
              >
                <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-stone-500 block">
                  Included with your free account:
                </span>
                <ul className="space-y-2 text-xs font-semibold text-stone-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Cloud synchronization for all vehicle drafts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Direct WhatsApp &amp; phone buyer leads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Free listing allocation with verified badge</span>
                  </li>
                </ul>
              </motion.div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setShowLoginRequiredModal(false);
                    if (onSignInClick) {
                      onSignInClick();
                    }
                  }}
                  className="w-full py-3.5 px-5 bg-stone-900 hover:bg-stone-800 text-[#F4F1EA] text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-stone-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>Log In / Sign Up Now</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginRequiredModal(false);
                      setCurrentStep(2);
                      window.scrollTo({ top: 100, behavior: "smooth" });
                      showToast("Continuing in Guest Mode. Please sign in before final publication.", "info");
                    }}
                    className="flex-1 py-2.5 px-3 bg-[#FAF8F5] hover:bg-stone-200/80 border border-stone-400 text-stone-800 text-[10.5px] font-mono font-bold uppercase tracking-wider text-center cursor-pointer transition-colors"
                  >
                    Continue as Guest
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLoginRequiredModal(false)}
                    className="py-2.5 px-4 bg-transparent hover:bg-stone-200/50 text-stone-500 hover:text-stone-900 text-[10.5px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT VEHICLE LISTING MODAL */}
      <AnimatePresence>
        {editingListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingListing(null)}
              className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#FAF8F5] border-2 border-stone-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.95)] p-6 sm:p-8 z-10 font-sans max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-stone-300 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-700 tracking-wider block">
                    Seller Control Panel
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-900 uppercase">
                    Edit Vehicle Listing
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditListing} className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Listing Title</label>
                    <input
                      type="text"
                      value={editForm.title || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                      className="w-full p-2.5 bg-[#F4F1EA] border border-stone-300 font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Asking Price (₹ INR)</label>
                    <input
                      type="number"
                      value={editForm.price || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                      required
                      className="w-full p-2.5 bg-[#F4F1EA] border border-stone-300 font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Make / Brand</label>
                    <input
                      type="text"
                      value={editForm.make || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, make: e.target.value }))}
                      required
                      className="w-full p-2.5 bg-[#F4F1EA] border border-stone-300 font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Model</label>
                    <input
                      type="text"
                      value={editForm.model || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, model: e.target.value }))}
                      required
                      className="w-full p-2.5 bg-[#F4F1EA] border border-stone-300 font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Year</label>
                    <input
                      type="text"
                      value={editForm.year || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, year: e.target.value }))}
                      required
                      className="w-full p-2.5 bg-[#F4F1EA] border border-stone-300 font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Mileage (km)</label>
                    <input
                      type="text"
                      value={editForm.mileage || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, mileage: e.target.value }))}
                      className="w-full p-2.5 bg-[#F4F1EA] border border-stone-300 font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Fuel Type</label>
                    <select
                      value={editForm.fuelType || "Petrol"}
                      onChange={(e) => setEditForm(prev => ({ ...prev, fuelType: e.target.value }))}
                      className="w-full p-2.5 bg-[#F4F1EA] border border-stone-300 font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="CNG">CNG</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Transmission</label>
                    <select
                      value={editForm.transmission || "Manual"}
                      onChange={(e) => setEditForm(prev => ({ ...prev, transmission: e.target.value }))}
                      className="w-full p-2.5 bg-[#F4F1EA] border border-stone-300 font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                    >
                      <option value="Manual">Manual</option>
                      <option value="Automatic">Automatic</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Description</label>
                  <textarea
                    rows={3}
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2.5 bg-[#F4F1EA] border border-stone-300 font-medium focus:outline-none focus:border-stone-900 text-stone-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Seller Contact Name</label>
                    <input
                      type="text"
                      value={editForm.sellerName || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, sellerName: e.target.value }))}
                      className="w-full p-2 bg-[#F4F1EA] border border-stone-300 font-semibold text-stone-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Seller Phone</label>
                    <input
                      type="text"
                      value={editForm.sellerPhone || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, sellerPhone: e.target.value }))}
                      className="w-full p-2 bg-[#F4F1EA] border border-stone-300 font-semibold text-stone-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-stone-700 uppercase block">Location City</label>
                    <input
                      type="text"
                      value={editForm.location || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full p-2 bg-[#F4F1EA] border border-stone-300 font-semibold text-stone-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-stone-300">
                  <button
                    type="button"
                    onClick={() => setEditingListing(null)}
                    className="px-4 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-700 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
                  >
                    {isSavingEdit ? "Saving Listing..." : "Save Vehicle Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANAGE PHOTOS MODAL */}
      <AnimatePresence>
        {photoManagingListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPhotoManagingListing(null)}
              className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#FAF8F5] border-2 border-stone-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.95)] p-6 sm:p-8 z-10 font-sans max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-stone-300 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-700 tracking-wider block">
                    Photo Manager
                  </span>
                  <h3 className="text-xl font-serif font-black text-stone-900 uppercase">
                    {photoManagingListing.title} Gallery ({managePhotosList.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoManagingListing(null)}
                  className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePhotos} className="space-y-5">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-600 block">
                    Current Listing Photos (First image is Cover Photo)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 bg-[#F4F1EA] border border-stone-300">
                    {managePhotosList.map((photo, idx) => (
                      <div key={idx} className="relative group aspect-video bg-stone-900 border border-stone-300 overflow-hidden">
                        <img src={photo.src} alt={photo.alt || "Vehicle"} className="w-full h-full object-cover" />
                        
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 bg-amber-500 text-stone-950 text-[8.5px] font-mono font-black uppercase px-1.5 py-0.5 border border-stone-950">
                            Cover
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setManagePhotosList(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-stone-950/90 text-white hover:bg-red-600 w-6 h-6 flex items-center justify-center rounded-xs transition cursor-pointer text-xs"
                          title="Remove Photo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-[#F4F1EA] border border-stone-300">
                  <span className="text-[10.5px] font-mono font-bold uppercase text-stone-800 block">
                    Add New Photos to Vehicle
                  </span>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-600 uppercase block">Option A: Upload Image Files</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleAddPhotoFiles}
                      className="w-full text-xs text-stone-700 file:mr-3 file:py-2 file:px-3 file:border-0 file:text-xs file:font-mono file:font-bold file:bg-stone-900 file:text-white hover:file:bg-stone-800 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1 pt-2 border-t border-stone-300">
                    <label className="text-[10px] font-bold text-stone-600 uppercase block">Option B: Add Image URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        value={newPhotoUrlInput}
                        onChange={(e) => setNewPhotoUrlInput(e.target.value)}
                        className="flex-1 p-2 bg-white border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                      />
                      <button
                        type="button"
                        onClick={handleAddPhotoUrl}
                        className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Add URL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-300">
                  <button
                    type="button"
                    onClick={() => setPhotoManagingListing(null)}
                    className="px-4 py-2.5 bg-[#FAF8F5] border border-stone-300 text-stone-700 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPhotos}
                    className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPhotos ? "Saving Photos..." : "Save Photo Gallery"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingListing(null)}
              className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#FAF8F5] border-2 border-stone-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.95)] p-6 sm:p-8 z-10 font-sans text-center space-y-4"
            >
              <div className="w-14 h-14 bg-red-100 border-2 border-red-300 rounded-full flex items-center justify-center text-red-600 mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-serif font-black text-stone-900 uppercase">
                  Remove Listing Permanently?
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed font-medium">
                  Are you sure you want to delete <strong className="text-stone-950 font-bold">"{deletingListing.title}"</strong>? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDeletingListing(null)}
                  className="flex-1 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-800 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteListing}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold uppercase tracking-widest border border-red-800 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PART LISTING MODAL */}
      <AnimatePresence>
        {editingPartListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPartListing(null)}
              className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#FAF8F5] border-2 border-stone-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.95)] p-6 sm:p-8 z-10 font-sans max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-stone-300 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-700" />
                  <h3 className="text-xl font-serif font-black text-stone-900 uppercase">
                    Edit Performance Part Specs
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPartListing(null)}
                  className="p-1 hover:bg-stone-200 text-stone-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditPartListing} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                      Part Title / Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editPartForm.title || ""}
                      onChange={(e) => setEditPartForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-2.5 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                        Price (₹ INR) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editPartForm.price || ""}
                        onChange={(e) => setEditPartForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                        className="w-full p-2.5 bg-white border border-stone-300 text-xs font-bold focus:border-stone-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                        Manufacturer / Brand *
                      </label>
                      <input
                        type="text"
                        required
                        value={editPartForm.brand || ""}
                        onChange={(e) => setEditPartForm(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full p-2.5 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                        Category *
                      </label>
                      <select
                        value={editPartForm.category || "Engine & Performance"}
                        onChange={(e) => setEditPartForm(prev => ({ ...prev, category: e.target.value as PartCategory }))}
                        className="w-full p-2.5 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 focus:outline-none"
                      >
                        {PART_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                        Rarity Tier
                      </label>
                      <select
                        value={editPartForm.rarity || "standard"}
                        onChange={(e) => setEditPartForm(prev => ({ ...prev, rarity: e.target.value as PartRarity }))}
                        className="w-full p-2.5 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 focus:outline-none"
                      >
                        <option value="standard">Standard OEM / Street</option>
                        <option value="enthusiast">Enthusiast Spec</option>
                        <option value="race_spec">Race / Track Spec</option>
                        <option value="legendary">Legendary / Rare</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                        Condition
                      </label>
                      <select
                        value={editPartForm.condition ?? 5}
                        onChange={(e) => setEditPartForm(prev => ({ ...prev, condition: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 }))}
                        className="w-full p-2.5 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 focus:outline-none"
                      >
                        <option value={5}>5 - Brand New / Sealed</option>
                        <option value={4}>4 - Like New / Mint</option>
                        <option value={3}>3 - Good Working Condition</option>
                        <option value={2}>2 - Fair / Refurbished</option>
                        <option value={1}>1 - For Parts / Spares</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                        Part Number / SKU
                      </label>
                      <input
                        type="text"
                        value={editPartForm.partNumber || ""}
                        onChange={(e) => setEditPartForm(prev => ({ ...prev, partNumber: e.target.value }))}
                        placeholder="e.g. HKS-70020-AT022"
                        className="w-full p-2.5 bg-white border border-stone-300 text-xs font-mono focus:border-stone-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                        Compatible Vehicles / Fitment
                      </label>
                      <input
                        type="text"
                        value={editPartForm.compatibleVehicles || ""}
                        onChange={(e) => setEditPartForm(prev => ({ ...prev, compatibleVehicles: e.target.value }))}
                        placeholder="e.g. Universal / Supra MK4 / Golf GTI"
                        className="w-full p-2.5 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                      Description &amp; Specifications
                    </label>
                    <textarea
                      rows={3}
                      value={editPartForm.description || ""}
                      onChange={(e) => setEditPartForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-2.5 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                        Seller Contact Name
                      </label>
                      <input
                        type="text"
                        value={editPartForm.sellerName || ""}
                        onChange={(e) => setEditPartForm(prev => ({ ...prev, sellerName: e.target.value }))}
                        className="w-full p-2 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={editPartForm.sellerPhone || ""}
                        onChange={(e) => setEditPartForm(prev => ({ ...prev, sellerPhone: e.target.value }))}
                        className="w-full p-2 bg-white border border-stone-300 text-xs font-mono focus:border-stone-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                        Dispatch / City Location
                      </label>
                      <input
                        type="text"
                        value={editPartForm.location || ""}
                        onChange={(e) => setEditPartForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full p-2 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Status Toggle in Modal */}
                  <div className="pt-2">
                    <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                      Part Status
                    </label>
                    <div className="flex gap-2">
                      {(["active", "pending", "sold"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setEditPartForm(prev => ({ ...prev, status: st }))}
                          className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                            (editPartForm.status || editingPartListing.status) === st
                              ? "bg-stone-900 text-white border-stone-950"
                              : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-stone-300">
                  <button
                    type="button"
                    onClick={() => setEditingPartListing(null)}
                    className="px-4 py-2.5 bg-[#FAF8F5] border border-stone-300 text-stone-700 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPartEdit}
                    className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPartEdit ? "Saving..." : "Save Part Listing"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANAGE PART PHOTOS MODAL */}
      <AnimatePresence>
        {photoManagingPartListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPhotoManagingPartListing(null)}
              className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#FAF8F5] border-2 border-stone-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.95)] p-6 sm:p-8 z-10 font-sans max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-stone-300 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-700" />
                  <h3 className="text-xl font-serif font-black text-stone-900 uppercase">
                    Manage Part Photo Gallery
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoManagingPartListing(null)}
                  className="p-1 hover:bg-stone-200 text-stone-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePartPhotos} className="space-y-4">
                <div className="space-y-3">
                  <p className="text-xs text-stone-600 font-medium">
                    Upload hardware photos or add direct image URLs. Drag to reorder (the first photo is your main cover thumbnail).
                  </p>

                  {/* Current Photos Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {managePartPhotosList.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square bg-stone-900 border border-stone-300 overflow-hidden group">
                        <img src={photo.src} alt={photo.alt} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 text-stone-950 text-[9px] font-mono font-extrabold uppercase">
                            Cover
                          </span>
                        )}
                        <div className="absolute inset-0 bg-stone-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...managePartPhotosList];
                                const [removed] = updated.splice(idx, 1);
                                updated.unshift(removed);
                                setManagePartPhotosList(updated);
                              }}
                              className="p-1 bg-stone-800 text-amber-400 hover:bg-stone-700 text-[10px] font-mono uppercase"
                              title="Make Cover"
                            >
                              Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setManagePartPhotosList(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 bg-red-600 text-white hover:bg-red-700"
                            title="Remove Photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Upload via Local File */}
                  <div className="pt-2">
                    <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                      Upload from Device
                    </label>
                    <label className="border-2 border-dashed border-stone-400 p-4 flex flex-col items-center justify-center gap-1 hover:border-stone-900 cursor-pointer bg-white transition-colors">
                      <Upload className="w-5 h-5 text-stone-500" />
                      <span className="text-xs font-mono font-bold text-stone-700">Choose images to upload</span>
                      <span className="text-[10px] text-stone-500">PNG, JPG, WEBP up to 5MB</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleAddPartPhotoFiles}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Upload via Direct URL */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-stone-700 mb-1">
                      Or Add Image by URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newPartPhotoUrlInput}
                        onChange={(e) => setNewPartPhotoUrlInput(e.target.value)}
                        className="flex-1 p-2 bg-white border border-stone-300 text-xs font-mono focus:border-stone-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddPartPhotoUrl}
                        className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Add URL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-300">
                  <button
                    type="button"
                    onClick={() => setPhotoManagingPartListing(null)}
                    className="px-4 py-2.5 bg-[#FAF8F5] border border-stone-300 text-stone-700 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPartPhotos}
                    className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPartPhotos ? "Saving Photos..." : "Save Photo Gallery"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE PART CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingPartListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingPartListing(null)}
              className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#FAF8F5] border-2 border-stone-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.95)] p-6 sm:p-8 z-10 font-sans text-center space-y-4"
            >
              <div className="w-14 h-14 bg-red-100 border-2 border-red-300 rounded-full flex items-center justify-center text-red-600 mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-serif font-black text-stone-900 uppercase">
                  Remove Part Permanently?
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed font-medium">
                  Are you sure you want to delete <strong className="text-stone-950 font-bold">"{deletingPartListing.title}"</strong>? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDeletingPartListing(null)}
                  className="flex-1 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-800 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingPart}
                  onClick={handleConfirmDeletePart}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold uppercase tracking-widest border border-red-800 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingPart ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

     </motion.div>
  );
}
