import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, MapPin, Gauge, DollarSign, Calendar, Lock, Clock, Heart, Eye, Filter, Sparkles, User, Mail, Phone, Info, RefreshCw, Star, TrendingUp, BarChart3, LineChart as LucideLineChart, CheckCircle2, ArrowUp, MessageCircle, Sliders, SlidersHorizontal, Check, Zap, Compass, Calculator, X, AlertTriangle, Bell, PhoneCall, Award, Car, Plus, ExternalLink, BookmarkPlus, Wrench, Cpu, Flame, Disc, Layers, ShieldCheck, Tag, ChevronRight, Wind, CircleDot, Box, RotateCcw, Volume2, Music, Repeat } from "lucide-react";
import { Vehicle, DEFAULT_VEHICLES, UserListing, Part, DEFAULT_PARTS, PART_CATEGORIES, PART_RARITY_TIERS, PART_CONDITION_LABELS, PART_BRANDS, UserPartListing } from "../types";
import { SkeletonLoader } from "./SkeletonLoader";
import { motion, AnimatePresence } from "motion/react";
import { getDocs, collection } from "firebase/firestore";
import { db, auth, googleProvider, signInWithPopup, handleFirestoreError, OperationType } from "../firebase";
import { subscribeToRealtimeCatalog } from "../lib/catalogSync";
import { User as FirebaseUser } from "firebase/auth";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { AnimatedFavoriteHeart } from "./AnimatedFavoriteHeart";
import { EMICalculator } from "./EMICalculator";
import { Modal } from "./Modal";
import { TestDriveModal } from "./TestDriveModal";
import { InspectionReportModal } from "./InspectionReportModal";
import { SavedSearchesModal } from "./SavedSearchesModal";
import { CallbackModal } from "./CallbackModal";
import { InlineEMICalculator } from "./InlineEMICalculator";
import { UPIPaymentModal } from "./UPIPaymentModal";
import AuctionTab from "./AuctionTab";
import ExchangeTab from "./ExchangeTab";

interface BuyTabProps {
  favorites: number[];
  toggleFavorite: (id: number) => void;
  searchFilters: { type: string; priceRange: string; location: string };
  onQuickView: (vehicle: Vehicle) => void;
  onQuickViewPart?: (part: Part, coords?: { x: number; y: number }) => void;
  subscriptionActive: boolean;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  currentUser: FirebaseUser | null;
  onSignInClick: () => void;
  favoritePartIds?: (string | number)[];
  toggleFavoritePart?: (id: string | number) => void;
  activeSubTab?: "buy_vehicle" | "peer_to_peer" | "auction";
  onSubTabChange?: (tab: "buy_vehicle" | "peer_to_peer" | "auction") => void;
  isEngineSoundEnabled?: boolean;
  onPlayEngineSound?: (url?: string, title?: string, type?: string) => void;
}

// Historical price trends in India (in Lakhs INR ex-showroom)
const popularModelsData = [
  { year: "2020", Swift: 5.49, Nexon: 6.95, Thar: 11.90, Fortuner: 28.60, "Classic 350": 1.65 },
  { year: "2021", Swift: 5.85, Nexon: 7.39, Thar: 12.80, Fortuner: 30.30, "Classic 350": 1.80 },
  { year: "2022", Swift: 6.20, Nexon: 8.15, Thar: 13.90, Fortuner: 32.50, "Classic 350": 1.95 },
  { year: "2023", Swift: 6.90, Nexon: 8.99, Thar: 14.50, Fortuner: 37.80, "Classic 350": 2.10 },
  { year: "2024", Swift: 7.30, Nexon: 10.49, Thar: 15.90, Fortuner: 41.20, "Classic 350": 2.22 },
  { year: "2025", Swift: 7.90, Nexon: 11.20, Thar: 16.80, Fortuner: 45.90, "Classic 350": 2.38 },
  { year: "2026", Swift: 8.40, Nexon: 12.10, Thar: 17.50, Fortuner: 49.50, "Classic 350": 2.49 },
];

interface ModelMeta {
  fullName: string;
  category: string;
  brand: string;
  color: string;
  text: string;
  highlightSpecs: string[];
  growth: string;
  avgHike: string;
}

const modelMetadata: Record<string, ModelMeta> = {
  Swift: {
    fullName: "Maruti Suzuki Swift",
    category: "Hatchback",
    brand: "Maruti Suzuki",
    color: "#D97706",
    text: "India's highest selling hatchback series. Over the last six years, Swift prices climbed steadily due to rising raw material inflation, advanced tech inclusions, and standard dual airbags.",
    highlightSpecs: ["Fuel Economy: 22.3 km/L", "Global NCAP: 3 Stars", "Resale Demand: Outstanding"],
    growth: "+53.0%",
    avgHike: "+₹48k/yr"
  },
  Nexon: {
    fullName: "Tata Nexon",
    category: "Compact SUV",
    brand: "Tata Motors",
    color: "#2563EB",
    text: "Pioneered compact SUV safety with its legendary 5-Star impact scores. Steady feature revisions like touch consoles and ventilated seats pushed original pricing from ~7L up to 12.1L.",
    highlightSpecs: ["Safest in Segment", "GNCAP Index: 5-Star", "Turbodiesel Optional"],
    growth: "+73.1%",
    avgHike: "+₹85k/yr"
  },
  Thar: {
    fullName: "Mahindra Thar",
    category: "LFS Lifestyle 4x4",
    brand: "Mahindra & Mahindra",
    color: "#DC2626",
    text: "The signature off-road icon. Re-launched in late 2020 with lifestyle features, attracting massive backlogs and waitlists that allowed for confident ex-showroom revisions.",
    highlightSpecs: ["Engine: 2.2L mHawk / 2.0L mStallion", "Terrain Modes: Mechanical 4WD", "Wading Depth: 650mm"],
    growth: "+47.1%",
    avgHike: "+₹93k/yr"
  },
  Fortuner: {
    fullName: "Toyota Fortuner",
    category: "Full-Size SUV",
    brand: "Toyota Bharat",
    color: "#059669",
    text: "The undisputed emperor of large premium SUVs. Holds legendary depreciation resistance, allowing owners to resell older models near new values, while new buy points scale close to ₹50 Lakhs.",
    highlightSpecs: ["Engine: 2.8L GD Turbo", "Traction: A-TRC Actuators", "Resale Value: Bulletproof"],
    growth: "+73.1%",
    avgHike: "+₹3.48L/yr"
  },
  "Classic 350": {
    fullName: "Royal Enfield Classic 350",
    category: "Retro Motorcycle",
    brand: "Royal Enfield",
    color: "#7C3AED",
    text: "India's cruiser default. Transitioned to the advanced J-Series engine platform in recent years, boosting reliability and refinement while moving pricing past ₹2.4 Lakhs.",
    highlightSpecs: ["Engine: J1-Series 349cc", "Fuel Economy: 36.2 km/L", "Build: Signature Metal body"],
    growth: "+50.9%",
    avgHike: "+₹14k/yr"
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-stone-900 text-white p-3 border border-stone-800 text-[11px] font-mono leading-relaxed uppercase shadow-xl rounded-sm">
        <p className="font-extrabold border-b border-stone-700 pb-1 mb-1.5 tracking-wider text-[#FAF8F5]">Year: {label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <p key={entry.name} style={{ color: entry.stroke || entry.fill || entry.color }} className="font-semibold flex justify-between gap-4">
              <span>{entry.name}:</span>
              <span className="font-extrabold text-white">₹{entry.value.toFixed(2)} Lakhs</span>
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function getOverriddenParts(): Part[] {
  let list = [...DEFAULT_PARTS];
  try {
    const hiddenStr = localStorage.getItem("autoWorld_hidden_parts");
    if (hiddenStr) {
      const hiddenIds = JSON.parse(hiddenStr);
      if (Array.isArray(hiddenIds)) {
        list = list.filter(p => !hiddenIds.includes(p.id));
      }
    }
  } catch (e) {}

  try {
    const removedStr = localStorage.getItem("autoWorld_removed_parts");
    if (removedStr) {
      const removedIds = JSON.parse(removedStr);
      if (Array.isArray(removedIds)) {
        list = list.filter(p => !removedIds.includes(p.id));
      }
    }
  } catch (e) {}

  try {
    const badgesStr = localStorage.getItem("autoWorld_part_badges");
    if (badgesStr) {
      const badgesMap = JSON.parse(badgesStr);
      if (badgesMap && typeof badgesMap === "object") {
        list = list.map(p => {
          const customBadge = badgesMap[p.id];
          return {
            ...p,
            badge: customBadge !== undefined ? customBadge : p.badge
          };
        });
      }
    }
  } catch (e) {}

  try {
    const overridesStr = localStorage.getItem("autoWorld_part_overrides");
    if (overridesStr) {
      const overridesMap = JSON.parse(overridesStr);
      if (overridesMap && typeof overridesMap === "object") {
        list = list.map(p => {
          const override = overridesMap[p.id];
          return override ? { ...p, ...override } : p;
        });
      }
    }
  } catch (e) {}

  return list;
}

export default function BuyTab({ 
  favorites, 
  toggleFavorite, 
  searchFilters, 
  onQuickView, 
  onQuickViewPart, 
  subscriptionActive, 
  showToast, 
  currentUser, 
  onSignInClick,
  favoritePartIds = [],
  toggleFavoritePart,
  activeSubTab,
  onSubTabChange,
  isEngineSoundEnabled,
  onPlayEngineSound
}: BuyTabProps) {
  // Buy Sub-Navigation: "buy_vehicle" | "peer_to_peer" | "auction"
  const [internalSubTab, setInternalSubTab] = useState<"buy_vehicle" | "peer_to_peer" | "auction">("buy_vehicle");
  const currentSubTab = activeSubTab !== undefined ? activeSubTab : internalSubTab;

  const handleSubTabChange = (tab: "buy_vehicle" | "peer_to_peer" | "auction") => {
    setInternalSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  // Mode switcher: "vehicles" | "parts"
  const [activeCatalogMode, setActiveCatalogMode] = useState<"vehicles" | "parts">("vehicles");

  // Parts Catalog State
  const [partsList, setPartsList] = useState<Part[]>(() => getOverriddenParts());
  const [selectedPartCategory, setSelectedPartCategory] = useState<string>("all");
  const [selectedPartRarity, setSelectedPartRarity] = useState<string>("all");
  const [selectedPartBrand, setSelectedPartBrand] = useState<string>("all");
  const [partSearchQuery, setPartSearchQuery] = useState<string>("");
  const [partSortBy, setPartSortBy] = useState<string>("featured");
  const [isPartWishlistOnly, setIsPartWishlistOnly] = useState<boolean>(false);

  // Payment states
  const [hasPaidPass, setHasPaidPass] = useState(false);
  const [isFreePassMode, setIsFreePassMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("autoWorld_is_free_pass") === "true";
    } catch (e) {
      return false;
    }
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [countdownText, setCountdownText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Payment Input details
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Listing Filters
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState(searchFilters.priceRange || "");
  const [selectedType, setSelectedType] = useState(searchFilters.type || "");
  const [locationValue, setLocationValue] = useState(searchFilters.location || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // EMI Calculator Modal State
  const [emiVehicle, setEmiVehicle] = useState<Vehicle | null>(null);

  // Feature Modals States
  const [testDriveVehicle, setTestDriveVehicle] = useState<Vehicle | null>(null);
  const [inspectionVehicle, setInspectionVehicle] = useState<Vehicle | null>(null);
  const [isSavedSearchesOpen, setIsSavedSearchesOpen] = useState<boolean>(false);
  const [callbackVehicle, setCallbackVehicle] = useState<Vehicle | null>(null);

  // Smart Matcher States
  const [isSmartMatcherEnabled, setIsSmartMatcherEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_smart_matcher");
      return stored !== null ? JSON.parse(stored) : true;
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    const syncSmartMatcherToggle = () => {
      try {
        const stored = localStorage.getItem("autoWorld_is_smart_matcher");
        if (stored !== null) {
          setIsSmartMatcherEnabled(JSON.parse(stored));
        }
      } catch (e) {}
    };

    window.addEventListener("storage", syncSmartMatcherToggle);
    const interval = setInterval(syncSmartMatcherToggle, 1000);
    return () => {
      window.removeEventListener("storage", syncSmartMatcherToggle);
      clearInterval(interval);
    };
  }, []);

  const [isVizHubExpanded, setIsVizHubExpanded] = useState(true);
  const [userBudget, setUserBudget] = useState<number>(15); // Budget in Lakhs
  const [selectedPreference, setSelectedPreference] = useState<string>("All"); // All, SUV, Hatchback, Sedan, Luxury, Motorcycle
  const [usagePriority, setUsagePriority] = useState<string>("balanced"); // balanced, economy, family, performance, adventure

  // Dynamic lists
  const [inventoryList, setInventoryList] = useState<Vehicle[]>([]);

  // STEP 1: Check Payment Access Status
  useEffect(() => {
    // If Admin enabled Free Buy Pass mode, bypass completely!
    const isFreePass = localStorage.getItem("autoWorld_is_free_pass") === "true";
    if (isFreePass || isFreePassMode) {
      setHasPaidPass(true);
      return;
    }

    // If the user is the certified owner, bypass completely!
    if (currentUser?.email === "afrojalamansari461@gmail.com") {
      setHasPaidPass(true);
      return;
    }

    // If the user has a premium plan, they automatically bypass the daily pass wall!
    if (subscriptionActive) {
      setHasPaidPass(true);
      return;
    }

    if (!currentUser || currentUser.isAnonymous) {
      setHasPaidPass(false);
      return;
    }

    const checkPass = async () => {
      // 1. Check from Firestore
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const docRef = doc(db, "buyer_passes", currentUser.uid);
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (dbErr: any) {
          handleFirestoreError(dbErr, OperationType.GET, `buyer_passes/${currentUser.uid}`);
          return;
        }
        if (docSnap && docSnap.exists() && docSnap.data().paid) {
          const passDateStr = docSnap.data().date;
          if (passDateStr) {
            const passDate = new Date(passDateStr);
            const now = new Date();
            const diffHours = (now.getTime() - passDate.getTime()) / (1000 * 60 * 60);

            if (diffHours < 24) {
              setHasPaidPass(true);
              const remainingMinutes = Math.floor((24 - diffHours) * 60);
              updateTimerText(remainingMinutes);
              return;
            } else {
              setHasPaidPass(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Firestore pass check failed, falling back to local storage:", err);
      }

      // 2. Check local fallback
      const localPass = localStorage.getItem(`autoWorld_buyerPass_${currentUser.uid}`);
      const localPassDate = localStorage.getItem(`autoWorld_buyerPassDate_${currentUser.uid}`);
      if (localPass === "true" && localPassDate) {
        const passDate = new Date(localPassDate);
        const now = new Date();
        const diffHours = (now.getTime() - passDate.getTime()) / (1000 * 60 * 60);

        if (diffHours < 24) {
          setHasPaidPass(true);
          const remainingMinutes = Math.floor((24 - diffHours) * 60);
          updateTimerText(remainingMinutes);
        } else {
          setHasPaidPass(false);
          localStorage.removeItem(`autoWorld_buyerPass_${currentUser.uid}`);
          localStorage.removeItem(`autoWorld_buyerPassDate_${currentUser.uid}`);
        }
      } else {
        setHasPaidPass(false);
      }
    };

    checkPass();
    const interval = setInterval(checkPass, 12000); // Poll pass status
    return () => clearInterval(interval);
  }, [subscriptionActive, currentUser, isFreePassMode]);

  // STEP 2: Timer calculations
  const updateTimerText = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    setCountdownText(`${hours}h ${minutes.toString().padStart(2, "0")}m remaining`);
  };

  // WhatsApp Handler & Phone Sanitizer
  const handleWhatsAppClick = (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation();

    if (!hasPaidPass) {
      setShowPaymentModal(true);
      showToast("Unlock seller coordinates & WhatsApp connect with our ₹1 pass!", "info");
      return;
    }

    const rawPhone = vehicle.sellerPhone || '919876543210';
    let cleanPhone = rawPhone.replace(/\D/g, '');

    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const textMessage = `Hi, I saw your ${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || vehicle.title || ''} (Ref #AW-${vehicle.id || 'AW01'}) listed on Auto World. Is it still available for a test drive?`;
    const encodedText = encodeURIComponent(textMessage);

    fetch("/api/send-sms-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerPhone: vehicle.sellerPhone || '+91 98230 44556',
        vehicleTitle: vehicle.title,
        listingId: vehicle.id,
        buyerName: "A vetted buyer",
        actionType: "whatsapp"
      })
    }).catch(err => console.error(err));

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // STEP 3: Realtime load listings combining static assets, Firestore overrides & collections
  useEffect(() => {
    setIsLoading(true);

    const handleDbSync = () => {
      try {
        const isFree = localStorage.getItem("autoWorld_is_free_pass") === "true";
        setIsFreePassMode(isFree);
        if (isFree) {
          setHasPaidPass(true);
        }
      } catch (e) {
        console.warn(e);
      }
    };
    window.addEventListener("autoWorld_db_update", handleDbSync);

    const unsubscribe = subscribeToRealtimeCatalog(({ userListings, userParts, overrides, partOverrides, adminSettings }) => {
      if (adminSettings.isFreePassEnabled !== undefined) {
        setIsFreePassMode(Boolean(adminSettings.isFreePassEnabled));
        if (adminSettings.isFreePassEnabled) {
          setHasPaidPass(true);
        }
      }

      let defaultData = [...DEFAULT_VEHICLES];

      // Filter hidden/removed
      if (adminSettings.hiddenDefaultIds && adminSettings.hiddenDefaultIds.length > 0) {
        defaultData = defaultData.filter(v => !adminSettings.hiddenDefaultIds.includes(v.id));
      }
      if (adminSettings.removedDefaultIds && adminSettings.removedDefaultIds.length > 0) {
        defaultData = defaultData.filter(v => !adminSettings.removedDefaultIds.includes(v.id));
      }

      // Apply default badges from Firestore admin settings
      if (adminSettings.defaultBadges) {
        defaultData = defaultData.map(v => {
          const customBadge = adminSettings.defaultBadges[v.id];
          return {
            ...v,
            badge: (customBadge !== undefined ? customBadge : v.badge) as "verified" | "premium" | "hot" | null
          };
        });
      }

      // Apply spec overrides from Firestore catalog_overrides
      defaultData = defaultData.map(v => {
        const override = overrides[String(v.id)];
        return override ? { ...v, ...override } : v;
      });

      // Filter active user listings (automatically hides non-premium listings after 30 days)
      const activeUserListings = userListings.filter(l => {
        if (l.status && l.status !== "active") return false;
        
        // Non-premium / non-featured listings auto-expire and hide after 30 days
        const isPremiumOrFeatured = Boolean(l.featured || l.urgent || l.verified);
        if (!isPremiumOrFeatured && l.datePosted) {
          const postedTime = new Date(l.datePosted).getTime();
          if (!isNaN(postedTime)) {
            const ageMs = Date.now() - postedTime;
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            if (ageMs > thirtyDaysMs) {
              return false; // Auto-hidden from public catalog after 30 days
            }
          }
        }
        return true;
      });

      const compiledUserVehicles: Vehicle[] = activeUserListings.map((listing, index) => {
        let image = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800";
        if (listing.type === "car" || listing.type === "suv") {
          image = listing.photos && listing.photos.length > 0 
            ? listing.photos[0].src 
            : "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800";
        } else if (listing.type === "truck") {
          image = listing.photos && listing.photos.length > 0 
            ? listing.photos[0].src 
            : "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800";
        } else if (listing.type === "motorcycle") {
          image = listing.photos && listing.photos.length > 0 
            ? listing.photos[0].src 
            : "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800";
        } else if (listing.type === "bicycle") {
          image = listing.photos && listing.photos.length > 0 
            ? listing.photos[0].src 
            : "https://images.unsplash.com/photo-1484920274317-87885fcbc504?w=800";
        }

        return {
          id: 1000 + index, 
          title: listing.title,
          price: listing.price,
          image: image,
          make: listing.make,
          model: listing.model,
          year: parseInt(listing.year) || 2022,
          mileage: listing.mileage ? `${parseInt(listing.mileage).toLocaleString()} mi` : "N/A",
          fuel: listing.fuelType ? (listing.fuelType.charAt(0).toUpperCase() + listing.fuelType.slice(1)) : "Petrol",
          transmission: listing.transmission ? (listing.transmission.charAt(0).toUpperCase() + listing.transmission.slice(1)) : "Automatic",
          badge: (listing.verified ? "verified" : listing.featured ? "premium" : listing.urgent ? "hot" : null) as "verified" | "premium" | "hot" | null,
          description: listing.description,
          features: listing.features,
          category: listing.type,
          isUserListing: true,
          listingId: listing.id,
          sellerName: listing.sellerName,
          sellerEmail: listing.sellerEmail,
          sellerPhone: listing.sellerPhone,
          location: listing.location,
          negotiable: listing.negotiable,
          photos: listing.photos,
          engine: listing.engine,
          color: listing.color,
          owners: listing.owners,
          regNumber: listing.regNumber,
          datePosted: listing.datePosted || (listing as any).createdAt,
          status: listing.status
        };
      });

      setInventoryList([...defaultData, ...compiledUserVehicles]);

      // --- Performance Parts Synchronization ---
      let pDefaults = getOverriddenParts();
      if (adminSettings.hiddenPartIds && adminSettings.hiddenPartIds.length > 0) {
        pDefaults = pDefaults.filter(p => !adminSettings.hiddenPartIds?.includes(p.id));
      }
      if (adminSettings.removedPartIds && adminSettings.removedPartIds.length > 0) {
        pDefaults = pDefaults.filter(p => !adminSettings.removedPartIds?.includes(p.id));
      }
      if (adminSettings.partBadges) {
        pDefaults = pDefaults.map(p => {
          const customB = adminSettings.partBadges?.[String(p.id)];
          return {
            ...p,
            badge: (customB !== undefined ? customB : p.badge) as any
          };
        });
      }
      if (partOverrides) {
        pDefaults = pDefaults.map(p => {
          const customOver = partOverrides[String(p.id)];
          return customOver ? { ...p, ...customOver } : p;
        });
      }

      const mappedUserParts: Part[] = (userParts || [])
        .filter(item => item.status === "active" || item.status === undefined)
        .map((p, idx) => ({
          id: p.id || `user-part-${idx}`,
          title: p.title,
          category: p.category,
          rarity: p.rarity,
          condition: (p.condition as any) || 5,
          brand: p.brand,
          price: p.price,
          image: p.photos && p.photos.length > 0 ? p.photos[0].src : "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
          photos: p.photos,
          compatibleVehicles: p.compatibleVehicles,
          description: p.description,
          specifications: p.specifications,
          sellerName: p.sellerName,
          sellerPhone: p.sellerPhone,
          sellerEmail: p.sellerEmail,
          location: p.location,
          negotiable: p.negotiable,
          badge: (p.verified ? "verified" : p.featured ? "premium" : p.urgent ? "hot" : null) as any,
          status: p.status,
          isUserListing: true,
          listingId: p.id,
          partNumber: p.partNumber,
          warranty: p.warranty
        }));

      const allPartsCombined = [
        ...pDefaults.map(p => ({ ...p, uniqueKey: `default-${p.id}` })),
        ...mappedUserParts.map(p => ({ ...p, uniqueKey: `user-${p.listingId}` }))
      ];

      setPartsList(allPartsCombined);
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener("autoWorld_db_update", handleDbSync);
      unsubscribe();
    };
  }, []);

  // Synchronise recent search queries on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("autoWorld_recentSearches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load recent searches", e);
    }
  }, []);

  // Debounced storage effect for search queries
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 3) return;

    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem("autoWorld_recentSearches");
        let list: string[] = stored ? JSON.parse(stored) : [];
        list = list.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
        list.unshift(trimmed);
        list = list.slice(0, 3);
        localStorage.setItem("autoWorld_recentSearches", JSON.stringify(list));
        setRecentSearches(list);
      } catch (err) {
        console.error("Failed to save recent search", err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearRecentSearches = () => {
    try {
      localStorage.removeItem("autoWorld_recentSearches");
      setRecentSearches([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Sync passed search filters
  useEffect(() => {
    if (searchFilters.type) setSelectedType(searchFilters.type);
    if (searchFilters.priceRange) setSelectedPriceRange(searchFilters.priceRange);
    if (searchFilters.location) setLocationValue(searchFilters.location);
  }, [searchFilters]);

  // Simple synth tone generator for tactical audios
  const playSynthBeep = (freq = 800, duration = 0.1, type: OscillatorType = "sine") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignored
    }
  };

  // Free Persona Generator (does NOT expose real cars, real titles, real images, or real stats)
  const getFreeLifestyleRecommendation = () => {
    // Determine archetype based on selectedPreference and usagePriority
    let name = "The Agile Metropolitan";
    let category = "Ultra-Efficient Hatchback / City Runabout";
    let desc = "Optimized for navigating dense urban environments, tight parallel parking, and maintaining maximum fuel efficiency. This archetype values agility, low cost-per-mile, and smart city integration.";
    let pricing = "₹4 Lakhs - ₹9 Lakhs";
    let specs = [
      { name: "Estimated Fuel Efficiency", value: "22.5 km/l" },
      { name: "Turning Radius", value: "4.7 meters" },
      { name: "Engine Displace Index", value: "1.2L Dual VTVT" },
      { name: "Cargo Volume Capacity", value: "310 Liters" }
    ];
    let keyTraits = ["Easy maneuverability", "Lowest maintenance cost", "Intelligent city start-stop technology"];

    if (selectedPreference === "SUV" || usagePriority === "adventure") {
      name = "The Frontier Nomad";
      category = "Rugged All-Weather SUV / Cruiser";
      desc = "Engineered for high ground clearance, uneven terrains, and weekend explorations. This archetype prioritizes road presence, long-travel suspension, and high towing resilience.";
      pricing = "₹12 Lakhs - ₹25 Lakhs";
      specs = [
        { name: "Ground Clearance Index", value: "210 mm" },
        { name: "Approach/Departure Angles", value: "32° / 26°" },
        { name: "Engine Torque Output", value: "350 Nm" },
        { name: "Drive Configuration", value: "Part-time 4WD selectable" }
      ];
      keyTraits = ["High water-wading depth", "Off-road traction modes", "Heavy-duty chassis construction"];
    } else if (selectedPreference === "Luxury" || usagePriority === "performance") {
      name = "The Executive Aviator";
      category = "Luxury Executive Sedan / Sport Tourer";
      desc = "Tuned for high-speed aerodynamic stability, pristine NVH damping, and luxury long-distance cabin comfort. This archetype delivers maximum acceleration response and state-of-the-art cabin diagnostics.";
      pricing = "₹25 Lakhs - ₹48 Lakhs+";
      specs = [
        { name: "Power Output Index", value: "190 bhp" },
        { name: "Aerodynamic Drag Coefficient", value: "0.26 Cd" },
        { name: "Thermal Climate Zones", value: "Dual-zone adaptive" },
        { name: "Acoustic Insulation Index", value: "Acoustic double-glazed windows" }
      ];
      keyTraits = ["Premium active suspension", "Full suite smart advanced driver aids", "Dynamic ride telemetry tracking"];
    } else if (selectedPreference === "Sedan" || usagePriority === "family") {
      name = "The Sovereign Guardian";
      category = "Spacious Comfort Sedan / Premium MPV";
      desc = "Tailored for passenger ergonomics, child occupant safety, and expansive cargo utility. This archetype focuses on a soft, supple ride, abundant cabin airbags, and effortless automatic drivability.";
      pricing = "₹10 Lakhs - ₹18 Lakhs";
      specs = [
        { name: "Airbags Count Index", value: "6 Standard SRS airbags" },
        { name: "Rear Legroom Clear Space", value: "980 mm" },
        { name: "Crash Safety Vetting Index", value: "5-Star GNCAP Vetted" },
        { name: "Rear Air Conditioning", value: "Dedicated blower with speed controls" }
      ];
      keyTraits = ["Supple body isolation", "Modular third-row fold structures", "High-def 360-degree surround cameras"];
    } else if (selectedPreference === "Motorcycle") {
      name = "The Apex Ranger";
      category = "Sport Streetbike / Cruise Adventure Motorcycle";
      desc = "Crafted for single-passenger freedom, high-agility lane splitting, and high-adrenaline lean-angles. This archetype delivers unmatched throttle power-to-weight ratios and minimalistic upkeep.";
      pricing = "₹1.5 Lakhs - ₹4 Lakhs";
      specs = [
        { name: "Power-to-Weight Ratio", value: "165 bhp/ton" },
        { name: "Braking Safeguard", value: "Dual-channel Switchable ABS" },
        { name: "Suspension Vetting", value: "Inverted front USD forks" },
        { name: "Exhaust Acoustic Vetting", value: "Refined low-frequency rumble" }
      ];
      keyTraits = ["Zero traffic-grid lock delays", "Extremely sporty leaning dynamics", "Highly affordable maintenance"];
    }

    return { name, category, desc, pricing, specs, keyTraits };
  };

  // Live match calculator based on budget, body style preference, and usage priority
  const getSmartRecommendations = () => {
    const list = inventoryList;
    if (!list || list.length === 0) return [];
    
    const scoredList = list.map(car => {
      const carPriceLakhs = car.price / 100000;
      
      // 1. Budget Score Calculation
      let budgetScore = 0;
      let isBudgetMatch = false;

      if (carPriceLakhs <= userBudget) {
        // Fits within or under budget
        isBudgetMatch = true;
        const underPercent = (userBudget - carPriceLakhs) / userBudget;
        if (underPercent <= 0.4) {
          budgetScore = 100;
        } else {
          budgetScore = Math.max(70, 100 - Math.round(underPercent * 40));
        }
      } else {
        // Exceeds user budget
        const overPercent = (carPriceLakhs - userBudget) / userBudget;
        if (overPercent <= 0.18) { // Allow up to 18% negotiation stretch
          isBudgetMatch = true;
          budgetScore = Math.round(75 - (overPercent / 0.18) * 35); // 75 down to 40
        } else {
          isBudgetMatch = false;
          budgetScore = Math.max(0, 30 - Math.round(overPercent * 40));
        }
      }
      
      // 2. Category/Preference Score
      let categoryScore = 100;
      let isCategoryMatch = true;

      if (selectedPreference !== "All") {
        const titleL = car.title.toLowerCase();
        const makeL = car.make.toLowerCase();
        const modelL = (car.model || "").toLowerCase();
        const catL = (car.category || "").toLowerCase();
        
        let matchesType = false;
        if (selectedPreference === "SUV") {
          matchesType = titleL.includes("suv") || catL.includes("suv") || titleL.includes("thar") || titleL.includes("fortuner") || titleL.includes("nexon") || titleL.includes("creta") || titleL.includes("brezza") || titleL.includes("harrier") || titleL.includes("safari") || titleL.includes("xuv") || titleL.includes("compass") || titleL.includes("duster") || titleL.includes("scorpio") || titleL.includes("seltos") || titleL.includes("venue") || titleL.includes("punch");
        } else if (selectedPreference === "Hatchback") {
          matchesType = titleL.includes("hatchback") || catL.includes("hatchback") || titleL.includes("swift") || titleL.includes("baleno") || titleL.includes("i20") || titleL.includes("polo") || titleL.includes("tiago") || titleL.includes("alto") || titleL.includes("kwid") || titleL.includes("wagonr") || titleL.includes("ignis") || titleL.includes("altroz") || titleL.includes("celerio") || titleL.includes("glanza");
        } else if (selectedPreference === "Sedan") {
          matchesType = titleL.includes("sedan") || catL.includes("sedan") || titleL.includes("city") || titleL.includes("verna") || titleL.includes("slavia") || titleL.includes("virtus") || titleL.includes("ciaz") || titleL.includes("civic") || titleL.includes("octavia") || titleL.includes("superb") || titleL.includes("elantra") || titleL.includes("amaze") || titleL.includes("aura") || titleL.includes("dzire") || titleL.includes("camry") || titleL.includes("accord");
        } else if (selectedPreference === "Luxury") {
          matchesType = carPriceLakhs > 20 || makeL.includes("audi") || makeL.includes("bmw") || makeL.includes("mercedes") || titleL.includes("audi") || titleL.includes("bmw") || titleL.includes("mercedes") || titleL.includes("fortuner") || makeL.includes("jaguar") || makeL.includes("porsche") || makeL.includes("volvo") || makeL.includes("lexus");
        } else if (selectedPreference === "Motorcycle") {
          matchesType = catL.includes("motorcycle") || catL.includes("bike") || titleL.includes("classic") || titleL.includes("bullet") || titleL.includes("royal enfield") || titleL.includes("triumph") || titleL.includes("duke") || titleL.includes("ktm") || titleL.includes("harley") || titleL.includes("ninja") || titleL.includes("yamaha");
        }

        isCategoryMatch = matchesType;
        categoryScore = matchesType ? 100 : 0;
      }
      
      // 3. Usage Priority Score
      let usageScore = 80;
      const titleLower = car.title.toLowerCase();
      const fuelLower = car.fuel.toLowerCase();
      const featuresStr = (car.features || []).join(" ").toLowerCase();
      
      if (usagePriority === "economy") {
        const isManual = car.transmission.toLowerCase().includes("manual");
        const isGoodFuel = fuelLower.includes("petrol") || fuelLower.includes("cng") || fuelLower.includes("hybrid") || fuelLower.includes("electric") || fuelLower.includes("ev");
        let score = 90;
        if (carPriceLakhs > 15) score -= 30;
        if (!isManual) score -= 10;
        if (!isGoodFuel) score -= 15;
        usageScore = Math.max(40, score);
      } else if (usagePriority === "family") {
        const isBig = titleLower.includes("suv") || titleLower.includes("sedan") || titleLower.includes("fortuner") || titleLower.includes("nexon") || titleLower.includes("creta") || titleLower.includes("city") || car.transmission.toLowerCase().includes("automatic");
        const hasSafety = featuresStr.includes("airbag") || featuresStr.includes("safety") || featuresStr.includes("sensor") || featuresStr.includes("camera") || featuresStr.includes("control") || car.seating >= 5;
        let score = 75;
        if (isBig) score += 15;
        if (hasSafety) score += 10;
        usageScore = Math.min(100, score);
      } else if (usagePriority === "performance") {
        const isAutomatic = car.transmission.toLowerCase().includes("automatic");
        const isPremium = carPriceLakhs > 15 || titleLower.includes("audi") || titleLower.includes("bmw") || titleLower.includes("mercedes") || titleLower.includes("fortuner") || titleLower.includes("thar") || titleLower.includes("v6") || titleLower.includes("turbo");
        let score = 65;
        if (isAutomatic) score += 15;
        if (isPremium) score += 20;
        usageScore = Math.min(100, score);
      } else if (usagePriority === "adventure") {
        const isAdventurous = titleLower.includes("4x4") || titleLower.includes("thar") || titleLower.includes("off-road") || titleLower.includes("fortuner") || titleLower.includes("suv") || titleLower.includes("adventure") || titleLower.includes("all-wheel");
        const isDiesel = fuelLower.includes("diesel");
        let score = 60;
        if (isAdventurous) score += 25;
        if (isDiesel) score += 15;
        usageScore = Math.min(100, score);
      }
      
      // Total weighted score
      const totalScore = Math.round((budgetScore * 0.50) + (categoryScore * 0.30) + (usageScore * 0.20));
      
      // Strict validity check: Must pass budget flex and category preference
      const isValidMatch = isBudgetMatch && isCategoryMatch && totalScore >= 45;

      return {
        car,
        score: totalScore,
        isBudgetMatch,
        isCategoryMatch,
        isValidMatch,
        reasons: {
          budget: carPriceLakhs <= userBudget 
            ? `Fits easily in budget (₹${(userBudget - carPriceLakhs).toFixed(1)}L spare)` 
            : `₹${(carPriceLakhs - userBudget).toFixed(1)}L stretch over budget`,
          preference: isCategoryMatch ? `Matches ${selectedPreference} preference` : `Mismatched body style`,
          usage: usagePriority === "economy" && carPriceLakhs < 15 ? "High Fuel-Efficiency Value"
                 : usagePriority === "family" && (titleLower.includes("suv") || titleLower.includes("sedan")) ? "Spacious Family Cruiser"
                 : usagePriority === "performance" && car.transmission.toLowerCase().includes("automatic") ? "Smooth Automatic Performance"
                 : usagePriority === "adventure" && (titleLower.includes("4x4") || titleLower.includes("thar")) ? "Off-road Capable Companion"
                 : "Versatile Daily Commuter"
        }
      };
    });
    
    // Only return valid matches
    const validMatches = scoredList.filter(item => item.isValidMatch);

    return validMatches
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.car.price - b.car.price;
      })
      .slice(0, 3);
  };

  // Handle UPI Payment Success
  const handleUpiPaymentSuccess = async (receipt: { transactionId: string; amount: number; method: string; utr?: string }) => {
    if (!currentUser || currentUser.isAnonymous) {
      // Allow fallback storing to guest key as well
      const guestKey = currentUser ? currentUser.uid : "guest_active";
      localStorage.setItem(`autoWorld_buyerPass_${guestKey}`, "true");
      localStorage.setItem(`autoWorld_buyerPassDate_${guestKey}`, new Date().toISOString());
      setHasPaidPass(true);
      setShowPaymentModal(false);
      showToast(`₹${receipt.amount} Buyer Pass Activated via ${receipt.method}! 24h Full Access Granted.`, "success");
      return;
    }

    try {
      const { doc, setDoc } = await import("firebase/firestore");
      try {
        await setDoc(doc(db, "buyer_passes", currentUser.uid), {
          userId: currentUser.uid,
          paid: true,
          date: new Date().toISOString(),
          transactionId: receipt.transactionId,
          method: receipt.method,
          utr: receipt.utr || "INSTANT_VERIFIED"
        });
      } catch (dbErr: any) {
        handleFirestoreError(dbErr, OperationType.WRITE, `buyer_passes/${currentUser.uid}`);
      }
    } catch (err) {
      console.error("Failed to sync buyer pass to Firestore:", err);
    }

    localStorage.setItem(`autoWorld_buyerPass_${currentUser.uid}`, "true");
    localStorage.setItem(`autoWorld_buyerPassDate_${currentUser.uid}`, new Date().toISOString());
    setHasPaidPass(true);
    setShowPaymentModal(false);
    showToast(`₹${receipt.amount} Buyer Pass Activated via ${receipt.method}! 24h Full Access Granted.`, "success");
  };

  // Location matching calculations
  const cleanedLocQuery = (locationValue || "").trim().toLowerCase();

  const locationMatchesInInventory = cleanedLocQuery 
    ? inventoryList.filter(vehicle => {
        const vLoc = (vehicle.location || "").toLowerCase();
        const vTitle = (vehicle.title || "").toLowerCase();
        const vSeller = (vehicle.sellerName || "").toLowerCase();
        const vDesc = (vehicle.description || "").toLowerCase();
        return vLoc.includes(cleanedLocQuery) || vTitle.includes(cleanedLocQuery) || vSeller.includes(cleanedLocQuery) || vDesc.includes(cleanedLocQuery);
      })
    : [];

  const hasLocationMatches = locationMatchesInInventory.length > 0;

  // Filter dynamic logic
  const filteredVehicles = inventoryList.filter((vehicle) => {
    // Search query matcher
    if (searchQuery && !vehicle.title.toLowerCase().includes(searchQuery.toLowerCase()) && !vehicle.make.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Make matcher
    if (selectedMake && vehicle.make.toLowerCase() !== selectedMake.toLowerCase()) {
      return false;
    }
    // Category type matcher
    if (selectedType && selectedType !== "Any Type" && selectedType !== "" && vehicle.category?.toLowerCase() !== selectedType.toLowerCase()) {
      return false;
    }
    // Location matcher: only filter out non-matching vehicles if there ARE matches in the system for this location
    if (cleanedLocQuery && hasLocationMatches) {
      const vLoc = (vehicle.location || "").toLowerCase();
      const vTitle = (vehicle.title || "").toLowerCase();
      const vSeller = (vehicle.sellerName || "").toLowerCase();
      const vDesc = (vehicle.description || "").toLowerCase();
      const matchesLoc = vLoc.includes(cleanedLocQuery) || vTitle.includes(cleanedLocQuery) || vSeller.includes(cleanedLocQuery) || vDesc.includes(cleanedLocQuery);

      if (!matchesLoc) {
        return false;
      }
    }
    // Price range selector
    if (selectedPriceRange && selectedPriceRange !== "Any Price" && selectedPriceRange !== "") {
      if (selectedPriceRange === "Under ₹5 Lakhs" && vehicle.price > 500000) return false;
      if (selectedPriceRange === "₹5 Lakhs - ₹15 Lakhs" && (vehicle.price < 500000 || vehicle.price > 1500000)) return false;
      if (selectedPriceRange === "₹15 Lakhs - ₹30 Lakhs" && (vehicle.price < 1500000 || vehicle.price > 3000000)) return false;
      if (selectedPriceRange === "Over ₹30 Lakhs" && vehicle.price <= 3000000) return false;
    }

    return true;
  });

  // Sorting logic
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    // Pin Premium/Featured listings to the top of the feed
    const aPremium = a.badge === "premium" ? 1 : 0;
    const bPremium = b.badge === "premium" ? 1 : 0;
    if (aPremium !== bPremium) {
      return bPremium - aPremium; // 1 (Premium) goes before 0
    }

    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "mileage") {
      const mA = parseInt(a.mileage.replace(/[^0-9]/g, "")) || 0;
      const mB = parseInt(b.mileage.replace(/[^0-9]/g, "")) || 0;
      return mA - mB;
    }
    return b.year - a.year; // newest year default
  });

  const displayedVehicles = hasPaidPass ? sortedVehicles : sortedVehicles.slice(0, 3);

  const handleResetFilters = () => {
    setSelectedMake("");
    setSelectedPriceRange("Any Price");
    setSelectedType("Any Type");
    setLocationValue("");
    setSearchQuery("");
  };

  // --- Parts Filtering & Sorting Logic ---
  const isPartMatchCategory = (part: Part, category: string): boolean => {
    if (!category || category === "all") return true;
    const cat = (part.category || "").toLowerCase();
    const title = (part.title || "").toLowerCase();
    const desc = (part.description || "").toLowerCase();
    const brand = (part.brand || "").toLowerCase();
    const specsStr = part.specifications ? JSON.stringify(part.specifications).toLowerCase() : "";
    const combined = `${cat} ${title} ${desc} ${brand} ${specsStr}`;

    if (category === "performance") {
      const perfCats = ["turbo", "nitro", "suspension", "brakes", "ecu_tuning", "exhaust", "wheels", "performance"];
      if (perfCats.includes(cat)) return true;
      return /turbo|boost|nitrous|nos|ecu|tuning|tuner|exhaust|valved|coilover|suspension|brake|caliper|rotors|stage|racing|motorsport|downpipe|supercharger|intercooler/i.test(combined);
    }
    if (category === "engine") {
      const engineCats = ["engine", "turbo", "nitro", "ecu_tuning"];
      if (engineCats.includes(cat)) return true;
      return /engine|crate|cylinder|piston|camshaft|crankshaft|intake|manifold|valvetrain|inconel|fuel rail|injector|turbo|block|spark|cooling|radiator|oil cooler/i.test(combined);
    }
    if (category === "interior") {
      const interiorCats = ["interior"];
      if (interiorCats.includes(cat)) return true;
      return /interior|seat|bucket|recaro|sparco|steering|wheel|harness|roll cage|cage|gauge|cluster|telemetry|pedal|shifter|shift knob|carbon trim|alcantara|cockpit/i.test(combined);
    }
    if (category === "exterior") {
      const exteriorCats = ["spoiler", "headlight", "body_kit", "wheels", "exterior"];
      if (exteriorCats.includes(cat)) return true;
      return /spoiler|wing|aero|splitter|diffuser|body kit|widebody|bumper|hood|fender|headlight|lamp|laser|led|carbon fiber|lip|mirror|grille/i.test(combined);
    }
    return cat === category.toLowerCase();
  };

  const isPartFavorited = (part: Part): boolean => {
    const partId = String(part.id);
    const altId = part.isUserListing && part.listingId ? `user-part-${part.listingId}` : `part-${part.id}`;
    const listingId = part.listingId ? String(part.listingId) : "";

    const inPartFavs = favoritePartIds.some((fav) => {
      const sFav = String(fav);
      return sFav === partId || (altId && sFav === altId) || (listingId && sFav === listingId) || (typeof part.id === "number" && fav === part.id);
    });
    if (inPartFavs) return true;

    const numId = typeof part.id === "number" ? part.id : Number(String(part.id).replace(/\D/g, "").slice(0, 5));
    if (numId && favorites.includes(numId)) return true;

    return false;
  };

  const filteredParts = partsList.filter((part) => {
    // Wishlist Only filter
    if (isPartWishlistOnly && !isPartFavorited(part)) {
      return false;
    }
    // Category filter
    if (!isPartMatchCategory(part, selectedPartCategory)) {
      return false;
    }
    // Rarity filter
    if (selectedPartRarity !== "all" && part.rarity !== selectedPartRarity) {
      return false;
    }
    // Brand filter
    if (selectedPartBrand !== "all" && part.brand?.toLowerCase() !== selectedPartBrand.toLowerCase()) {
      return false;
    }
    // Search query matcher
    if (partSearchQuery.trim()) {
      const q = partSearchQuery.trim().toLowerCase();
      const matchTitle = (part.title || "").toLowerCase().includes(q);
      const matchBrand = (part.brand || "").toLowerCase().includes(q);
      const matchPartNo = (part.partNumber || "").toLowerCase().includes(q);
      const matchDesc = (part.description || "").toLowerCase().includes(q);
      const matchCompat = typeof part.compatibleVehicles === "string"
        ? (part.compatibleVehicles || "").toLowerCase().includes(q)
        : Array.isArray(part.compatibleVehicles)
        ? (part.compatibleVehicles as string[]).some(v => (v || "").toLowerCase().includes(q))
        : false;
      const matchSpecs = part.specifications
        ? Object.entries(part.specifications).some(([k, v]) => String(k).toLowerCase().includes(q) || String(v).toLowerCase().includes(q))
        : false;

      if (!matchTitle && !matchBrand && !matchPartNo && !matchDesc && !matchCompat && !matchSpecs) {
        return false;
      }
    }
    return true;
  });

  const sortedParts = [...filteredParts].sort((a, b) => {
    const aPin = a.badge === "premium" || a.badge === "verified" ? 1 : 0;
    const bPin = b.badge === "premium" || b.badge === "verified" ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;

    if (partSortBy === "price_asc") return a.price - b.price;
    if (partSortBy === "price_desc") return b.price - a.price;
    if (partSortBy === "rarity") {
      const rarityRank: Record<string, number> = { Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };
      return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0);
    }
    return 0; // Default order
  });

  const displayedParts = hasPaidPass ? sortedParts : sortedParts.slice(0, 3);

  const handleResetPartFilters = () => {
    setSelectedPartCategory("all");
    setSelectedPartRarity("all");
    setSelectedPartBrand("all");
    setPartSearchQuery("");
    setPartSortBy("featured");
    setIsPartWishlistOnly(false);
  };

  const handlePartWhatsAppClick = (e: React.MouseEvent, part: Part) => {
    e.stopPropagation();

    if (!hasPaidPass) {
      setShowPaymentModal(true);
      showToast("Unlock seller coordinates & WhatsApp connect with our ₹1 pass!", "info");
      return;
    }

    const rawPhone = part.sellerPhone || '919876543210';
    let cleanPhone = rawPhone.replace(/\D/g, '');

    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const textMessage = `Hi, I saw your ${part.brand || ''} ${part.title} (Part #${part.partNumber || part.id}) listed on Auto World. Is this currently available for shipping or pickup?`;
    const encodedText = encodeURIComponent(textMessage);

    fetch("/api/send-sms-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerPhone: part.sellerPhone || '+91 98230 44556',
        vehicleTitle: part.title,
        listingId: part.id,
        buyerName: "A vetted buyer",
        actionType: "whatsapp"
      })
    }).catch(err => console.error(err));

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
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

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-[#F4F1EA] text-[#1A1A1A] min-h-screen py-10 relative font-sans"
    >
      
      {/* 3-TAB NAVBAR FOR BUY SECTION: BUY VEHICLE | CAR EXCHANGE | AUCTION */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 mb-6 sm:mb-8">
        <div className="bg-stone-900/95 backdrop-blur-md p-1 sm:p-2 border border-stone-800 shadow-xl">
          <div className="grid grid-cols-3 gap-1 sm:gap-2 w-full" role="tablist" aria-label="Buy Section Navigation">
            {/* Tab 1: Buy Vehicle */}
            <button
              id="buy-subtab-vehicle"
              type="button"
              role="tab"
              aria-selected={currentSubTab === "buy_vehicle"}
              onClick={() => handleSubTabChange("buy_vehicle")}
              className={`relative py-2.5 sm:py-3 px-1 sm:px-4 font-sans text-[11px] sm:text-xs md:text-sm font-extrabold uppercase tracking-tight sm:tracking-widest transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-2 select-none text-center min-w-0 ${
                currentSubTab === "buy_vehicle"
                  ? "bg-amber-500 text-stone-950 font-black shadow-lg shadow-amber-500/20 border-b-2 border-amber-300"
                  : "text-stone-300 hover:text-white hover:bg-stone-800/90"
              }`}
            >
              <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Buy Vehicle</span>
            </button>

            {/* Tab 2: Car Exchange */}
            <button
              id="buy-subtab-car-exchange"
              type="button"
              role="tab"
              aria-selected={currentSubTab === "peer_to_peer"}
              onClick={() => handleSubTabChange("peer_to_peer")}
              className={`relative py-2.5 sm:py-3 px-1 sm:px-4 font-sans text-[11px] sm:text-xs md:text-sm font-extrabold uppercase tracking-tight sm:tracking-widest transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-2 select-none text-center min-w-0 ${
                currentSubTab === "peer_to_peer"
                  ? "bg-amber-500 text-stone-950 font-black shadow-lg shadow-amber-500/20 border-b-2 border-amber-300"
                  : "text-stone-300 hover:text-white hover:bg-stone-800/90"
              }`}
            >
              <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Car Exchange</span>
            </button>

            {/* Tab 3: Auction */}
            <button
              id="buy-subtab-auction"
              type="button"
              role="tab"
              aria-selected={currentSubTab === "auction"}
              onClick={() => handleSubTabChange("auction")}
              className={`relative py-2.5 sm:py-3 px-1 sm:px-4 font-sans text-[11px] sm:text-xs md:text-sm font-extrabold uppercase tracking-tight sm:tracking-widest transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-2 select-none text-center min-w-0 ${
                currentSubTab === "auction"
                  ? "bg-amber-500 text-stone-950 font-black shadow-lg shadow-amber-500/20 border-b-2 border-amber-300"
                  : "text-stone-300 hover:text-white hover:bg-stone-800/90"
              }`}
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Auction</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: CAR EXCHANGE */}
      {currentSubTab === "peer_to_peer" && (
        <ExchangeTab
          currentUser={currentUser}
          showToast={showToast}
          onSignInClick={onSignInClick}
        />
      )}

      {/* SUB-VIEW 2: AUCTION */}
      {currentSubTab === "auction" && (
        <AuctionTab
          currentUser={currentUser}
          showToast={showToast}
          onSignInClick={onSignInClick}
          onSelectVehicle={onQuickView}
          isEngineSoundEnabled={isEngineSoundEnabled}
          onPlayEngineSound={onPlayEngineSound}
        />
      )}

      {/* SUB-VIEW 3: BUY VEHICLE / PARTS CATALOG */}
      {currentSubTab === "buy_vehicle" && (
        <>
          {/* Mini warning header box if not paid */}
          {!hasPaidPass && (
            <motion.div variants={itemVariants} className="max-w-7xl mx-auto px-4 mb-8">
              <div className="bg-[#E0DBCF] border border-stone-400 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-900 text-[#F4F1EA] flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-center sm:text-left">
                    <h4 className="text-sm font-serif font-black uppercase tracking-wider text-stone-900 font-sans">1st 3 Listings Free to View</h4>
                    <p className="text-sm md:text-xs text-stone-705 leading-snug">The first 3 cars on our registry are completely free to inspect. To unlock more cars in the catalog, activate your ₹1 premium account pass.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-5 py-3.5 bg-stone-900 text-[#F4F1EA] text-xs uppercase font-bold tracking-widest hover:bg-stone-850 cursor-pointer"
                >
                  Activate Pass (₹1 Only)
                </button>
              </div>
            </motion.div>
          )}

          {/* Floating active permit counter if pass is paid */}
          {hasPaidPass && (
            <motion.div variants={itemVariants} className="max-w-7xl mx-auto px-4 mb-8">
              <div className="bg-[#FAF8F5] w-full p-4 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-stone-900 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-xs uppercase tracking-widest font-extrabold text-stone-900 font-mono">
                    {currentUser?.email === "afrojalamansari461@gmail.com"
                      ? "SYSTEM OWNER ACCESS: UNRESTRICTED GLOBAL CATALOG ACCESS IS PERMANENTLY ENABLED"
                      : "Premium Account Pass Active — Unrestricted 24-hour catalog access is enabled"}
                  </span>
                </div>
                {currentUser?.email === "afrojalamansari461@gmail.com" ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 text-[10px] font-mono font-bold uppercase tracking-wider border border-emerald-200 shrink-0 self-start sm:self-auto animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Infinity Access</span>
                  </div>
                ) : (
                  countdownText && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-200 shrink-0 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse shrink-0" />
                      <span>Expires in: {countdownText}</span>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          )}

      <motion.div variants={itemVariants} className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        {/* DUAL CATALOG MODE SWITCHER: VEHICLES VS. VEHICLE PARTS */}
        <div className="mb-8 bg-stone-900 p-2 sm:p-3 border-2 border-stone-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-sans shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
          <div className="flex flex-wrap items-center gap-2">
            {/* 1ST BUTTON: VEHICLES */}
            <button
              type="button"
              id="buy-tab-btn-vehicles"
              onClick={() => setActiveCatalogMode("vehicles")}
              className={`group relative px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer border ${
                activeCatalogMode === "vehicles"
                  ? "bg-amber-500 text-stone-950 border-amber-400 font-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] ring-1 ring-amber-300"
                  : "bg-stone-800 hover:bg-stone-750 text-stone-200 border-stone-700 hover:border-amber-500/50 hover:text-white"
              }`}
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                activeCatalogMode === "vehicles" ? "bg-stone-950 text-amber-400" : "bg-stone-900 text-amber-400 group-hover:bg-stone-950"
              }`}>
                <Car className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col items-start leading-tight text-left">
                <span className="font-extrabold text-[11px] tracking-wider flex items-center gap-1.5">
                  Vehicles
                  <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded-full font-black ${
                    activeCatalogMode === "vehicles" ? "bg-stone-950 text-amber-400" : "bg-stone-700 text-stone-300"
                  }`}>
                    {inventoryList.length}
                  </span>
                </span>
                <span className={`text-[8.5px] font-sans uppercase tracking-widest ${
                  activeCatalogMode === "vehicles" ? "text-stone-900 font-bold" : "text-stone-400"
                }`}>
                  Exotic & Certified
                </span>
              </div>
            </button>

            {/* 2ND BUTTON: VEHICLE PARTS */}
            <button
              type="button"
              id="buy-tab-btn-parts"
              onClick={() => setActiveCatalogMode("parts")}
              className={`group relative px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer border ${
                activeCatalogMode === "parts"
                  ? "bg-amber-500 text-stone-950 border-amber-400 font-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] ring-1 ring-amber-300"
                  : "bg-stone-800 hover:bg-stone-750 text-stone-200 border-stone-700 hover:border-amber-500/50 hover:text-white"
              }`}
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                activeCatalogMode === "parts" ? "bg-stone-950 text-amber-400" : "bg-stone-900 text-amber-400 group-hover:bg-stone-950"
              }`}>
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col items-start leading-tight text-left">
                <span className="font-extrabold text-[11px] tracking-wider flex items-center gap-1.5">
                  Vehicle Parts
                  <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded-full font-black ${
                    activeCatalogMode === "parts" ? "bg-stone-950 text-amber-400" : "bg-stone-700 text-stone-300"
                  }`}>
                    {partsList.length}
                  </span>
                </span>
                <span className={`text-[8.5px] font-sans uppercase tracking-widest ${
                  activeCatalogMode === "parts" ? "text-stone-900 font-bold" : "text-stone-400"
                }`}>
                  Performance & Hardware
                </span>
              </div>
            </button>
          </div>

          <div className="text-[10px] font-mono text-stone-400 flex items-center gap-2 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>Active Registry: <strong className="text-amber-400 uppercase">{activeCatalogMode === "vehicles" ? "Motor Vehicles" : "Performance Hardware"}</strong></span>
          </div>
        </div>

        {/* --- VIEW 1: MOTOR VEHICLES REGISTRY --- */}
        {activeCatalogMode === "vehicles" && (
          <div>
            <div className="border-b border-stone-300 pb-6 mb-10">
              <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-stone-500 font-bold block mb-1">Index Repository</span>
              <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-stone-900">Verified Vehicle Inventory</h1>
            </div>

        {/* SMART BUDGET MATCHER ENGINE OR FREE LIFESTYLE MATCHED ARCHETYPE */}
        {!hasPaidPass ? (
          <div className="mb-12 bg-[#FAF8F5] border border-stone-300 shadow-sm overflow-hidden">
            <div className="bg-stone-900 text-[#FAF8F5] px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-850">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <Compass className="w-5 h-5 animate-pulse text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-sans uppercase tracking-[0.2em] font-black text-[#FAF8F5]">Lifestyle Archetype Discovery</h2>
                  <p className="text-[9px] text-stone-400 font-mono tracking-widest uppercase">Formulate your ideal vehicle blueprint completely free</p>
                </div>
              </div>
              <span className="text-[9px] font-mono px-2.5 py-1 bg-stone-800 text-stone-350 uppercase font-black border border-stone-700">
                Free Vetting Mode
              </span>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Column 1: Sliders & Preferences */}
                <div className="space-y-6">
                  <div className="border-b border-stone-200 pb-3">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block mb-1">Step 01</span>
                    <h3 className="text-xs font-sans uppercase tracking-[0.2em] font-black text-stone-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-stone-700" /> Adjust Parameters
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Range Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Target Budget Class</span>
                        <span className="text-xs font-mono font-bold text-stone-900">
                          {userBudget <= 8 ? "Economy Vetting" : userBudget <= 18 ? "Balanced Class" : userBudget <= 35 ? "Premium Segment" : "Luxury Sovereign"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="50"
                        step="1"
                        value={userBudget}
                        onChange={(e) => setUserBudget(parseInt(e.target.value))}
                        className="w-full accent-stone-900 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[8px] font-mono text-stone-400">
                        <span>₹2L (Budget)</span>
                        <span>₹15L (Mid)</span>
                        <span>₹30L (High)</span>
                        <span>₹50L (Max)</span>
                      </div>
                    </div>

                    {/* Preferred vehicle body style */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block">Desired Format</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: "All Formats", id: "All" },
                          { label: "SUV / Terrain", id: "SUV" },
                          { label: "Hatchback", id: "Hatchback" },
                          { label: "Sedan Comfort", id: "Sedan" },
                          { label: "Luxury Tier", id: "Luxury" },
                          { label: "Motorcycles", id: "Motorcycle" },
                        ].map((pref) => (
                          <button
                            key={pref.id}
                            type="button"
                            onClick={() => setSelectedPreference(pref.id)}
                            className={`p-2 text-left rounded-xs border transition cursor-pointer text-[10px] font-bold uppercase ${
                              selectedPreference === pref.id
                                ? "bg-white border-stone-900 border-l-4 shadow-xs font-black text-stone-950"
                                : "bg-stone-50 hover:bg-white text-stone-500 border-stone-200"
                            }`}
                          >
                            {pref.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Choose Primary Usage */}
                <div className="space-y-6 md:border-l md:border-stone-200 md:pl-8">
                  <div className="border-b border-stone-200 pb-3">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block mb-1">Step 02</span>
                    <h3 className="text-xs font-sans uppercase tracking-[0.2em] font-black text-stone-900 flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-stone-700" /> Usage Intent
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        id: "balanced",
                        title: "Balanced Daily Commute",
                        desc: "Standard daily versatility, ease of driving, all-round comfort",
                        tag: "Balanced"
                      },
                      {
                        id: "economy",
                        title: "Economy & High Efficiency",
                        desc: "Maximizes fuel economy, lower maintenance, pocket friendly",
                        tag: "Fuel Saver"
                      },
                      {
                        id: "family",
                        title: "Family Space & Safety",
                        desc: "Superior cabin space, safety features, premium comfort",
                        tag: "Family First"
                      },
                      {
                        id: "performance",
                        title: "High Performance & Power",
                        desc: "Automatic drivability, premium acceleration, high tech features",
                        tag: "Performance"
                      },
                      {
                        id: "adventure",
                        title: "Rugged Adventure & Terrain",
                        desc: "Off-road capable, reliable, heavy-duty engine",
                        tag: "Terrain-Ready"
                      }
                    ].map((prio) => (
                      <button
                        key={prio.id}
                        type="button"
                        onClick={() => setUsagePriority(prio.id)}
                        className={`w-full p-3 text-left border rounded-xs transition-all duration-300 cursor-pointer relative group flex flex-col ${
                          usagePriority === prio.id
                            ? "bg-white border-stone-900 shadow-sm scale-[1.01]"
                            : "bg-stone-50 hover:bg-white hover:border-stone-300 text-stone-500 border-stone-200"
                        }`}
                      >
                        <div className="flex justify-between items-center w-full mb-1">
                          <span className={`text-[11px] font-serif font-black uppercase ${usagePriority === prio.id ? "text-stone-900" : "text-stone-750"}`}>
                            {prio.title}
                          </span>
                          <span className={`text-[8px] font-mono uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-xs ${
                            usagePriority === prio.id ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-600"
                          }`}>
                            {prio.tag}
                          </span>
                        </div>
                        <p className="text-[9px] text-stone-500 leading-snug">
                          {prio.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column 3: Custom Generated Archetype Profile (NO REAL DATA) */}
                <div className="space-y-6 md:border-l md:border-stone-200 md:pl-8 flex flex-col justify-between">
                  <div>
                    <div className="border-b border-stone-200 pb-3">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block mb-1">Step 03</span>
                      <h3 className="text-xs font-sans uppercase tracking-[0.2em] font-black text-stone-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" /> Ideal Blueprint Result
                      </h3>
                    </div>

                    {/* Computed Blueprint Card with Elite Spring & Blur Animations */}
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={`${userBudget}-${selectedPreference}-${usagePriority}`}
                        initial={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(4px)" }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.95, y: -20, filter: "blur(2px)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 24 }}
                        className="mt-4 bg-white border border-stone-250 p-4 shadow-sm space-y-3"
                      >
                        <div className="flex justify-between items-start border-b border-stone-150 pb-2">
                          <div>
                            <span className="text-[8px] font-mono uppercase tracking-widest text-stone-400">matched profile archetype</span>
                            <h4 className="text-sm font-serif font-black text-stone-950 uppercase tracking-tight leading-tight mt-0.5">
                              {getFreeLifestyleRecommendation().name}
                            </h4>
                          </div>
                          <span className="px-1.5 py-0.5 bg-stone-950 text-[#FAF8F5] text-[8px] font-mono uppercase tracking-widest border border-stone-800">
                            Free Match
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-stone-500 font-bold uppercase">Format Standard</span>
                            <span className="font-mono text-stone-850 font-bold text-stone-900">{getFreeLifestyleRecommendation().category}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-stone-500 font-bold uppercase">Target Price Range</span>
                            <span className="font-mono text-emerald-700 font-black">{getFreeLifestyleRecommendation().pricing}</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-stone-600 leading-normal italic bg-stone-50 p-2.5 border border-stone-150 rounded-xs">
                          "{getFreeLifestyleRecommendation().desc}"
                        </p>

                        {/* Synthetic Tech specs list */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-stone-400 block">Representative Engineering Blueprint</span>
                          <div className="grid grid-cols-2 gap-2 text-[9px]">
                            {getFreeLifestyleRecommendation().specs.map((spec) => (
                              <div key={spec.name} className="border-b border-stone-100 pb-1">
                                <div className="text-stone-400 uppercase tracking-tight text-[8px] truncate">{spec.name}</div>
                                <div className="font-mono text-stone-800 font-black truncate">{spec.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Upgrade CTA banner block */}
                  <div className="mt-6 pt-4 border-t border-stone-200">
                    <button
                      onClick={() => { playSynthBeep(850, 0.15); setShowPaymentModal(true); }}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold uppercase text-[10px] tracking-widest shadow-md transition-all flex items-center justify-center gap-1.5 font-sans border border-amber-600 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-stone-950 shrink-0" />
                      Unlock Real Match Inventory (₹1 Pass)
                    </button>
                    <p className="text-[8px] text-stone-400 uppercase tracking-widest text-center mt-2 leading-tight">
                      Bypasses simulated blueprints to search actual vetted vehicle specifications
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : !isSmartMatcherEnabled ? (
          <div className="mb-12 bg-stone-900 text-[#FAF8F5] border-2 border-amber-500/40 p-6 sm:p-8 rounded-xs shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center rounded shrink-0">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-sans uppercase tracking-[0.2em] font-black text-amber-400">
                    Smart Car Matcher Paused
                  </h2>
                  <p className="text-[10px] text-stone-400 font-mono tracking-widest uppercase">
                    Disabled in Admin Settings
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-widest bg-stone-800 text-stone-400 border border-stone-700">
                PAUSED BY ADMIN
              </span>
            </div>
            <p className="text-xs text-stone-300 font-mono leading-relaxed">
              The car recommendation tool is currently turned off by the admin. You can browse all available vehicles in our car list below.
            </p>
          </div>
        ) : (
          <div className="mb-12 bg-[#FAF8F5] border border-stone-300 shadow-sm overflow-hidden">
            <div className="bg-stone-900 text-[#FAF8F5] px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-850">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <Zap className="w-5 h-5 animate-pulse text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-sans uppercase tracking-[0.2em] font-black text-[#FAF8F5]">Smart Car Matcher</h2>
                  <p className="text-[9px] text-stone-400 font-mono tracking-widest uppercase">Choose your budget and style to get instant car suggestions</p>
                </div>
              </div>
              <button
                onClick={() => setIsVizHubExpanded(!isVizHubExpanded)}
                className="text-xs font-mono py-1.5 px-3 bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 font-bold uppercase transition select-none cursor-pointer"
              >
                {isVizHubExpanded ? "[−] Hide Tool" : "[+] Show Tool"}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isVizHubExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 sm:p-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Column 1: Personal Budget & Preferences */}
                    <div className="space-y-6">
                      <div className="border-b border-stone-200 pb-3">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block mb-1">Step 01</span>
                        <h3 className="text-xs font-sans uppercase tracking-[0.2em] font-black text-stone-900 flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-stone-700" /> Set Your Budget & Style
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {/* Range Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Max Budget Target</span>
                            <span className="text-sm font-serif font-black text-stone-900">₹{userBudget} Lakhs</span>
                          </div>
                          <input
                            type="range"
                            min="2"
                            max="50"
                            step="1"
                            value={userBudget}
                            onChange={(e) => setUserBudget(parseInt(e.target.value))}
                            className="w-full accent-stone-900 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-[8px] font-mono text-stone-400">
                            <span>₹2L</span>
                            <span>₹15L</span>
                            <span>₹30L</span>
                            <span>₹50L+</span>
                          </div>
                        </div>

                        {/* Budget Presets */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block">Quick Presets</span>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { label: "Under ₹6L", value: 6 },
                              { label: "₹6L - ₹12L", value: 10 },
                              { label: "₹12L - ₹20L", value: 16 },
                              { label: "₹20L - ₹35L", value: 28 },
                              { label: "₹35L+ Premium", value: 45 },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => setUserBudget(preset.value)}
                                className={`px-2 py-1 text-[9px] font-mono rounded-xs border transition cursor-pointer ${
                                  Math.abs(userBudget - preset.value) <= 2
                                    ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                                    : "bg-white hover:bg-stone-50 text-stone-605 border-stone-200"
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Preference style selector */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block">Preferred Body Style</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { label: "All Vehicles", id: "All" },
                              { label: "SUV / Off-road", id: "SUV" },
                              { label: "Hatchback", id: "Hatchback" },
                              { label: "Sedan Comfort", id: "Sedan" },
                              { label: "Luxury Premium", id: "Luxury" },
                              { label: "Motorcycles", id: "Motorcycle" },
                            ].map((pref) => (
                              <button
                                key={pref.id}
                                type="button"
                                onClick={() => setSelectedPreference(pref.id)}
                                className={`p-2 text-left rounded-xs border transition cursor-pointer text-xs font-semibold ${
                                  selectedPreference === pref.id
                                    ? "bg-white border-stone-900 border-l-4 shadow-xs font-black"
                                    : "bg-stone-50 hover:bg-white text-stone-605 border-stone-200"
                                }`}
                              >
                                {pref.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dynamic telemetry card to fill space beautifully */}
                        <div className="bg-stone-50 border border-stone-200 p-3.5 space-y-2 rounded-xs mt-4">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-stone-400 block">Diagnostic Footprint</span>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-stone-500 font-bold uppercase">Budget Cap</span>
                              <span className="font-mono text-stone-800 font-bold">₹{userBudget} Lakhs Max</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-stone-500 font-bold uppercase">Body Affinity</span>
                              <span className="font-mono text-stone-850 font-bold">{selectedPreference === "All" ? "Universal Specs" : selectedPreference}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-stone-500 font-bold uppercase">System Engine</span>
                              <span className="font-mono text-amber-600 font-black">AI Matcher V2.1</span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[9px] text-stone-400 font-mono">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active Telemetry
                            </span>
                            <span>S/N #8402</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Select Primary Usage */}
                    <div className="space-y-6 md:border-l md:border-stone-200 md:pl-8">
                      <div className="border-b border-stone-200 pb-3">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block mb-1">Step 02</span>
                        <h3 className="text-xs font-sans uppercase tracking-[0.2em] font-black text-stone-900 flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-stone-700" /> Choose Usage Priority
                        </h3>
                      </div>

                      <div className="space-y-2.5">
                        {[
                          {
                            id: "balanced",
                            title: "Balanced Daily Commute",
                            desc: "Standard daily versatility, ease of driving, all-round comfort",
                            tag: "Balanced"
                          },
                          {
                            id: "economy",
                            title: "Economy & High Efficiency",
                            desc: "Maximizes fuel economy, lower maintenance, pocket friendly",
                            tag: "Fuel Saver"
                          },
                          {
                            id: "family",
                            title: "Family Space & Safety",
                            desc: "Superior cabin space, safety features, premium comfort",
                            tag: "Family First"
                          },
                          {
                            id: "performance",
                            title: "High Performance & Power",
                            desc: "Automatic drivability, premium acceleration, high tech features",
                            tag: "Performance"
                          },
                          {
                            id: "adventure",
                            title: "Rugged Adventure & Terrain",
                            desc: "Off-road capable, reliable, heavy-duty engine",
                            tag: "Terrain-Ready"
                          }
                        ].map((prio) => (
                          <button
                            key={prio.id}
                            type="button"
                            onClick={() => setUsagePriority(prio.id)}
                            className={`w-full p-3 text-left border rounded-xs transition-all duration-300 cursor-pointer relative group flex flex-col ${
                              usagePriority === prio.id
                                ? "bg-white border-stone-900 shadow-sm scale-[1.01]"
                                : "bg-stone-50 hover:bg-white hover:border-stone-300 text-stone-605 border-stone-200"
                            }`}
                          >
                            <div className="flex justify-between items-center w-full mb-1">
                              <span className={`text-xs font-serif font-black uppercase ${usagePriority === prio.id ? "text-stone-900" : "text-stone-750"}`}>
                                {prio.title}
                              </span>
                              <span className={`text-[8px] font-mono uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-xs ${
                                usagePriority === prio.id ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-600"
                              }`}>
                                {prio.tag}
                              </span>
                            </div>
                            <p className="text-[10px] text-stone-500 leading-snug">
                              {prio.desc}
                            </p>
                            {usagePriority === prio.id && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-stone-900 animate-pulse" />
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Neural Allocation Matrix to fill the empty space beautifully */}
                      <div className="bg-stone-50 border border-stone-200 p-3.5 space-y-3 rounded-xs mt-4">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-stone-400 block">Neural Allocation Matrix</span>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-stone-500 uppercase">Budget Weighting</span>
                              <span className="text-stone-850 font-bold">50%</span>
                            </div>
                            <div className="w-full bg-stone-200 h-1 rounded-full overflow-hidden">
                              <div className="bg-stone-900 h-full rounded-full" style={{ width: "50%" }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-stone-500 uppercase">Format Affinity</span>
                              <span className="text-stone-850 font-bold">30%</span>
                            </div>
                            <div className="w-full bg-stone-200 h-1 rounded-full overflow-hidden">
                              <div className="bg-stone-700 h-full rounded-full" style={{ width: "30%" }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-stone-500 uppercase">Usage Suitability</span>
                              <span className="text-stone-850 font-bold">20%</span>
                            </div>
                            <div className="w-full bg-stone-200 h-1 rounded-full overflow-hidden">
                              <div className="bg-stone-500 h-full rounded-full" style={{ width: "20%" }} />
                            </div>
                          </div>
                        </div>
                        <p className="text-[8px] text-stone-400 font-mono uppercase tracking-widest leading-normal">
                          *Real-time weight optimization is fully computed client-side using deterministic scoring matrices.
                        </p>
                      </div>
                    </div>

                    {/* Column 3: Optimal Match Results */}
                    <div className="space-y-6 md:border-l md:border-stone-200 md:pl-8">
                      <div className="border-b border-stone-200 pb-3">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block mb-1">Step 03</span>
                        <h3 className="text-xs font-sans uppercase tracking-[0.2em] font-black text-stone-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" /> Optimal Match Results
                        </h3>
                      </div>

                      <div className="space-y-3.5 relative min-h-[250px]">
                        <AnimatePresence mode="popLayout">
                          <motion.div
                            key={`${userBudget}-${selectedPreference}-${usagePriority}`}
                            initial={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(4px)" }}
                            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 0.95, y: -20, filter: "blur(2px)" }}
                            transition={{ type: "spring", stiffness: 300, damping: 24 }}
                            className="space-y-3.5"
                          >
                            {getSmartRecommendations().length > 0 ? (
                              getSmartRecommendations().map((item) => (
                                <div
                                  key={item.car.id}
                                  className="bg-white p-3 border border-stone-250 shadow-xs hover:shadow-sm hover:border-stone-400 transition-all rounded-xs space-y-2 relative overflow-hidden group"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded-xs ${
                                      item.score >= 85 ? "bg-emerald-100 text-emerald-900 border border-emerald-200" :
                                      item.score >= 60 ? "bg-amber-100 text-amber-900 border border-amber-200" :
                                      "bg-stone-100 text-stone-705 border border-stone-200"
                                    }`}>
                                      {item.score}% Match
                                    </span>
                                    <span className="text-xs font-serif font-black text-stone-900">
                                      {item.car.price === 0 ? "Negotiable" : item.car.price < 10000 ? `₹${item.car.price.toLocaleString()}` : item.car.price < 100000 ? `₹${(item.car.price / 1000).toFixed(1)} K` : `₹${(item.car.price / 100000).toFixed(2)} Lakhs`}
                                    </span>
                                  </div>

                                  <div className="flex gap-3 items-center">
                                    <div className="w-14 h-11 bg-stone-100 border border-stone-250 overflow-hidden shrink-0">
                                      <img
                                        src={item.car.image}
                                        alt={item.car.title}
                                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                                        }}
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-serif font-black text-stone-950 uppercase truncate leading-none mb-1">
                                        {item.car.title}
                                      </h4>
                                      <p className="text-[10px] font-mono text-stone-500 uppercase tracking-wider leading-none">
                                        {item.car.make} • {item.car.year} • {item.car.transmission}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-[10px] space-y-1 bg-stone-50 border border-stone-150 p-2 rounded-xs">
                                    <div className="text-stone-700 flex items-start gap-1 font-semibold leading-tight">
                                      <span className="text-emerald-600 shrink-0 select-none">✓</span>
                                      <span>{item.reasons.budget}</span>
                                    </div>
                                    <div className="text-stone-700 flex items-start gap-1 font-semibold leading-tight">
                                      <span className="text-amber-600 shrink-0 select-none">⚡</span>
                                      <span>{item.reasons.usage}</span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSearchQuery(item.car.title);
                                      showToast(`Filter locked onto ${item.car.title}!`, "success");
                                      setTimeout(() => {
                                        document.getElementById("inventory-catalog-start")?.scrollIntoView({ behavior: 'smooth' });
                                      }, 100);
                                    }}
                                    className="w-full py-1.5 bg-stone-900 hover:bg-stone-850 text-white text-[9px] uppercase font-bold tracking-widest rounded-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <span>View This Car</span>
                                    <ArrowUp className="w-3 h-3 rotate-90 shrink-0" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="bg-white border-2 border-stone-800 p-4 rounded-xs space-y-3 shadow-xs font-sans text-stone-900">
                                <div className="flex items-start gap-2.5">
                                  <div className="p-1.5 bg-amber-500/20 text-amber-900 border border-amber-400 rounded shrink-0">
                                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="text-xs font-serif font-black uppercase text-stone-950 tracking-wide">
                                      No Vehicles Match Choice
                                    </h4>
                                    <p className="text-[10px] font-mono text-stone-600 leading-relaxed">
                                      No {selectedPreference !== "All" ? <strong className="text-stone-900 font-bold">{selectedPreference}</strong> : "vehicle"} in active stock under <strong className="text-stone-900 font-bold">₹{userBudget} Lakhs</strong>.
                                    </p>
                                  </div>
                                </div>

                                <div className="bg-stone-50 border border-stone-200 p-3 space-y-2 rounded-xs">
                                  <span className="text-[9px] font-mono uppercase font-bold text-stone-500 block">
                                    Quick Filter Adjustments:
                                  </span>
                                  <div className="flex flex-col gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUserBudget(25);
                                        setSelectedPreference("All");
                                      }}
                                      className="w-full py-1.5 px-2 bg-stone-900 hover:bg-stone-800 text-white text-[9px] font-mono font-bold uppercase tracking-wider rounded-xs transition text-center cursor-pointer"
                                    >
                                      Auto-Expand Budget to ₹25L
                                    </button>
                                    {selectedPreference !== "All" && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPreference("All")}
                                        className="w-full py-1.5 px-2 bg-stone-200 hover:bg-stone-300 text-stone-900 text-[9px] font-mono font-bold uppercase tracking-wider rounded-xs transition text-center cursor-pointer"
                                      >
                                        Show All Body Styles
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>

                        {/* High-fidelity verification trust stamp at the bottom of Column 3 */}
                        <div className="bg-stone-900 text-[#FAF8F5] p-3.5 border border-stone-850 space-y-2 rounded-xs mt-4 shadow-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                            <span className="text-[9px] font-sans uppercase font-black tracking-widest text-white">Verified Engine Sync</span>
                          </div>
                          <p className="text-[9px] text-stone-400 leading-normal uppercase font-mono">
                            Database synchronized. Direct broker lines and registration registries are active.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Location Match Banner */}
        {cleanedLocQuery && (
          <div className={`mb-6 p-4 rounded-lg border transition-all duration-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            hasLocationMatches
              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
              : "bg-amber-50 border-amber-300 text-amber-950"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                hasLocationMatches ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
              }`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold">
                  {hasLocationMatches
                    ? `Location Filter Active: "${locationValue}"`
                    : `No vehicles listed in "${locationValue}" yet`}
                </p>
                <p className="text-[11px] opacity-80">
                  {hasLocationMatches
                    ? `Showing ${locationMatchesInInventory.length} matching vehicle(s) in this location.`
                    : `Showing all available vehicles from other regions below.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocationValue("")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                hasLocationMatches
                  ? "bg-emerald-200/80 hover:bg-emerald-300 text-emerald-950"
                  : "bg-amber-200/80 hover:bg-amber-300 text-amber-950"
              }`}
            >
              {hasLocationMatches ? "Clear Location" : "View All Cities"}
            </button>
          </div>
        )}

        {/* FILTERS TOOLBAR PANEL */}
        <div id="inventory-catalog-start" className="bg-[#FAF8F5] border border-stone-300 p-4 sm:p-6 lg:p-8 mb-10 rounded-xl shadow-sm">
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            
            {/* Search Input */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <label htmlFor="buy-search-phrase" className="text-xs font-bold text-stone-700 uppercase tracking-wider block">Search Make / Model</label>
              <div className="relative">
                <Search aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                <input
                  id="buy-search-phrase"
                  type="text"
                  placeholder="Toyota, Swift, Thar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 rounded-md text-stone-950 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
              
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                  <span className="text-stone-500 font-bold uppercase text-[9px] flex items-center gap-0.5">
                    <Clock aria-hidden="true" className="w-2.5 h-2.5 shrink-0" /> Recent:
                  </span>
                  {recentSearches.map((sq, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchQuery(sq)}
                      className="px-2 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-900 rounded-md text-[10px] font-medium transition cursor-pointer"
                    >
                      {sq}
                    </button>
                  ))}
                  <button
                    onClick={clearRecentSearches}
                    className="ml-auto text-stone-400 hover:text-stone-700 transition text-[9px] uppercase font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Category Type */}
            <div className="space-y-1.5">
              <label htmlFor="buy-category-select" className="text-xs font-bold text-stone-700 uppercase tracking-wider block">Car Type</label>
              <select
                id="buy-category-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F4F1EA] border border-stone-300 rounded-md text-stone-950 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="car">Car</option>
                <option value="suv">SUV</option>
                <option value="truck">Truck</option>
                <option value="van">Van</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
              </select>
            </div>

            {/* Make Select */}
            <div className="space-y-1.5">
              <label htmlFor="buy-make-select" className="text-xs font-bold text-stone-700 uppercase tracking-wider block">Brand / Make</label>
              <select
                id="buy-make-select"
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F4F1EA] border border-stone-300 rounded-md text-stone-950 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer"
              >
                <option value="">All Brands</option>
                <option value="Mahindra">Mahindra</option>
                <option value="Tata">Tata Motors</option>
                <option value="Royal Enfield">Royal Enfield</option>
                <option value="Maruti Suzuki">Maruti Suzuki</option>
                <option value="Toyota">Toyota</option>
                <option value="Honda">Honda</option>
                <option value="Ford">Ford</option>
                <option value="BMW">BMW</option>
                <option value="Chevrolet">Chevrolet</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-1.5">
              <label htmlFor="buy-price-select" className="text-xs font-bold text-stone-700 uppercase tracking-wider block">Budget Range</label>
              <select
                id="buy-price-select"
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F4F1EA] border border-stone-300 rounded-md text-stone-950 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer"
              >
                <option value="">Any Price</option>
                <option value="Under ₹5 Lakhs">Under ₹5 Lakhs</option>
                <option value="₹5 Lakhs - ₹15 Lakhs">₹5 Lakhs - ₹15 Lakhs</option>
                <option value="₹15 Lakhs - ₹30 Lakhs">₹15 Lakhs - ₹30 Lakhs</option>
                <option value="Over ₹30 Lakhs">Over ₹30 Lakhs</option>
              </select>
            </div>

            {/* City / Location */}
            <div className="space-y-1.5">
              <label htmlFor="buy-location-input" className="text-xs font-bold text-stone-700 uppercase tracking-wider block">City / Location</label>
              <div className="relative">
                <MapPin aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                <input
                  id="buy-location-input"
                  type="text"
                  placeholder="Mumbai, Delhi, Pune..."
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F4F1EA] border border-stone-300 rounded-md text-stone-950 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-stone-250">
            <div className="flex flex-wrap bg-stone-200/80 p-1 rounded-md gap-1 w-full sm:w-auto">
              {[
                { id: "newest", label: "Newest Year" },
                { id: "price-low", label: "Price: Low to High" },
                { id: "price-high", label: "Price: High to Low" },
                { id: "mileage", label: "Lowest Mileage" }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setSortBy(btn.id)}
                  className={`px-3 py-2 text-[11px] font-bold tracking-wider transition cursor-pointer rounded-md ${
                    sortBy === btn.id ? "bg-stone-950 text-white shadow-sm" : "text-stone-700 hover:text-stone-950"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsSavedSearchesOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer rounded-md transition shadow-xs"
                title="Save current search criteria and manage alert notifications"
              >
                <Bell className="w-3.5 h-3.5 text-stone-950" />
                <span>Saved Search Alerts</span>
              </button>

              <button
                onClick={handleResetFilters}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-[#F4F1EA] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer rounded-md transition shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* LISTINGS DISPLAY GRID ROOM */}
        <div className="relative">
          
          {/* List Statistics */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-bold text-stone-500 font-mono uppercase tracking-widest">
              {displayedVehicles.length} of {sortedVehicles.length} catalog elements accessible
            </span>
          </div>

          {isLoading ? (
            <SkeletonLoader count={6} />
          ) : sortedVehicles.length === 0 ? (
            <div className="bg-[#FAF8F5] border border-stone-300 py-16 text-center">
              <Sparkles className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-serif font-black text-stone-800 mb-1">No specimens found</h3>
              <p className="text-stone-500 text-xs max-w-sm mx-auto">Try lowering criteria specifications or click reset parameters.</p>
            </div>
          ) : (
            <div>
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6 md:gap-8">
                <AnimatePresence mode="popLayout">
                  {displayedVehicles.map((car, idx) => {
                    const isFav = favorites.includes(car.id);
                    return (
                      <motion.div
                        key={car.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{
                          opacity: { duration: 0.25 },
                          scale: { duration: 0.25 },
                          y: { duration: 0.25 },
                          layout: { type: "spring", stiffness: 220, damping: 26 }
                        }}
                        whileHover={{
                          scale: 1.015,
                          y: -6,
                          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                          transition: { type: "spring", stiffness: 300, damping: 22 }
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onQuickView(car)}
                        className={`bg-[#FAF8F5] border overflow-hidden flex flex-col group transition-all duration-300 cursor-pointer shadow-sm hover:border-stone-400 min-w-0 w-full max-w-full ${
                          car.badge === "premium" ? "border-amber-500/60 ring-1 ring-amber-500/20" : "border-stone-900/15"
                        }`}
                      >
                      <div className="relative h-48 sm:h-56 md:h-60 w-full overflow-hidden bg-stone-150 grayscale-20 group-hover:grayscale-0 transition-all duration-300 shrink-0">
                        <img
                          src={car.image}
                          alt={car.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                          }}
                        />
                        
                        {car.badge === "premium" && (
                          <span className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-stone-900 text-[#FAF8F5] text-[8.5px] sm:text-[9px] font-sans font-black uppercase tracking-widest border border-amber-400 flex items-center gap-1.5 shadow-sm max-w-[calc(100%-1.5rem)] truncate">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            <span className="truncate">Premium Featured</span>
                          </span>
                        )}

                        {car.badge === "hot" && (
                          <span className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-stone-900 text-[#FAF8F5] text-[8.5px] sm:text-[9px] font-sans font-black uppercase tracking-widest border border-red-500 flex items-center gap-1.5 shadow-sm max-w-[calc(100%-1.5rem)] truncate">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                            <span className="truncate">Hot Urgent</span>
                          </span>
                        )}

                        {car.badge === "verified" && (
                          <span className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-stone-950 text-white text-[8.5px] sm:text-[9px] font-sans font-black uppercase tracking-widest border border-purple-400/85 flex items-center gap-1.5 shadow-[0_0_12px_rgba(192,132,252,0.65)] max-w-[calc(100%-1.5rem)] truncate">
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400 animate-pulse shrink-0" />
                            <span className="truncate">Verified Specimen</span>
                          </span>
                        )}

                        {car.badge && car.badge !== "premium" && car.badge !== "hot" && car.badge !== "verified" && (
                          <span className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 px-2.5 py-1 sm:px-3 sm:py-1 bg-stone-900 text-[#F4F1EA] text-[8.5px] sm:text-[9px] font-sans font-bold uppercase tracking-wider border border-[#F4F1EA]/20 max-w-[calc(100%-1.5rem)] truncate">
                            {car.badge}
                          </span>
                        )}

                        {/* Audio Engine Sound Indicator on Card Image (ONLY IF car.engineSoundUrl exists) */}
                        {car.engineSoundUrl && (
                          <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-10">
                            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-stone-950/90 text-amber-400 text-[8px] sm:text-[8.5px] font-mono font-bold uppercase tracking-wider border border-amber-400/60 backdrop-blur-xs flex items-center gap-1.5 shadow-sm">
                              <Volume2 className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>Engine Audio</span>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 sm:p-5 md:p-6 flex-1 flex flex-col justify-between min-w-0 w-full">
                        <div className="min-w-0 w-full">
                          <span className="text-[8.5px] sm:text-[9px] font-mono tracking-widest text-[#777777] block uppercase mb-1 truncate">
                            REF #AW0{car.id}
                          </span>
                          <h3 className="text-base sm:text-lg md:text-xl font-serif font-black text-stone-950 mb-2 sm:mb-2.5 cursor-pointer break-words line-clamp-2 leading-snug sm:leading-tight">
                            {car.title}
                          </h3>
                          
                          <div className="w-full grid grid-cols-3 gap-1.5 sm:gap-2 py-2 sm:py-2.5 border-y border-stone-200 text-[9.5px] sm:text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-2.5 min-w-0">
                            <div className="min-w-0">
                              <span className="text-stone-400 block text-[8px] sm:text-[9px] uppercase font-light truncate">Mileage</span>
                              <span className="text-stone-900 font-bold text-[9px] sm:text-[10px] truncate block">{car.mileage}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-stone-400 block text-[8px] sm:text-[9px] uppercase font-light truncate">Displace</span>
                              <span className="text-stone-900 font-bold text-[9px] sm:text-[10px] truncate block">{car.fuel}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-stone-400 block text-[8px] sm:text-[9px] uppercase font-light truncate">Gearbox</span>
                              <span className="text-stone-900 font-bold text-[9px] sm:text-[10px] truncate block">{car.transmission}</span>
                            </div>
                          </div>

                          {/* Inspection Badge & Quick Test Drive Bar */}
                          <div className="flex items-center justify-between gap-1 mb-3 bg-stone-100/90 p-1.5 rounded-md border border-stone-250">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectionVehicle(car);
                              }}
                              className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-800 hover:text-emerald-900 transition cursor-pointer"
                              title="View 100-Point Inspection & Certification Report"
                            >
                              <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>100-Pt Certified</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {car.engineSoundUrl && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickView(car);
                                  }}
                                  className="px-2 py-1 bg-amber-400 hover:bg-amber-350 text-stone-950 text-[9px] font-extrabold uppercase rounded transition cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                                  title="Listen to Engine in Dossier"
                                >
                                  <Volume2 className="w-3 h-3" />
                                  <span>Listen</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTestDriveVehicle(car);
                                }}
                                className="px-2 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 text-[9px] font-extrabold uppercase rounded transition cursor-pointer flex items-center gap-1"
                                title="Schedule Doorstep or Showroom Test Drive"
                              >
                                <Car className="w-3 h-3" />
                                <span>Test Drive</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCallbackVehicle(car);
                                }}
                                className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-900 text-[9px] font-bold uppercase rounded transition cursor-pointer flex items-center gap-1"
                                title="Request Instant Callback"
                              >
                                <PhoneCall className="w-3 h-3 text-emerald-700" />
                                <span>Callback</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2.5 sm:pt-3 border-t border-stone-200 mt-auto flex flex-col gap-2.5 sm:gap-3 min-w-0 w-full">
                          {/* Valuation & Location Header */}
                          <div className="flex flex-wrap items-end justify-between gap-1.5 min-w-0 w-full">
                            <div className="min-w-0 max-w-[65%] sm:max-w-none">
                              <span className="text-[8.5px] sm:text-[10px] text-stone-400 block uppercase font-mono font-medium tracking-wider">
                                Valuation
                              </span>
                              <span className="text-base sm:text-xl md:text-2xl font-serif font-black text-stone-950 block leading-tight truncate">
                                ₹{car.price.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <span className="text-[8.5px] sm:text-[10px] font-mono text-stone-600 bg-stone-200/70 px-2 py-0.5 border border-stone-300 uppercase font-bold rounded-xs shrink-0 truncate max-w-[120px] sm:max-w-none">
                              {car.location || "India"}
                            </span>
                          </div>

                          {/* Row 1 (Secondary Actions): Favorite, Dossier, EMI Calc */}
                          <div className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
                            {/* Favorite Heart Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(car.id);
                              }}
                              className={`px-2.5 sm:px-3 py-2 border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 ${
                                isFav
                                  ? "bg-stone-950 border-stone-950 text-white hover:bg-stone-850"
                                  : "bg-[#FAF8F5] border-stone-300 text-stone-700 hover:text-stone-950 hover:border-stone-400"
                              }`}
                              title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                            >
                              <AnimatedFavoriteHeart isFav={isFav} className="w-3.5 h-3.5" />
                            </button>

                            {/* Dossier Quick View Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickView(car);
                              }}
                              className="flex-1 py-2 px-1.5 sm:px-3 bg-stone-950 hover:bg-stone-850 text-[#F4F1EA] text-[9px] sm:text-[10px] font-sans uppercase font-bold tracking-wider sm:tracking-widest border border-stone-950 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs min-w-0"
                              title="View dossier & specifications"
                            >
                              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-stone-400 shrink-0" />
                              <span className="truncate">Dossier</span>
                            </button>

                            {/* EMI Calculator Trigger Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmiVehicle(car);
                              }}
                              className="flex-1 py-2 px-1.5 sm:px-3 bg-[#F4F1EA] hover:bg-stone-200 text-stone-900 border border-stone-300 text-[9px] sm:text-[10px] font-sans uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs min-w-0"
                              title="Calculate EMI & apply for bank loan"
                            >
                              <Calculator className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
                              <span className="truncate">EMI Calc</span>
                            </button>
                          </div>

                          {/* Row 2 (Primary Call To Action): Full-Width Chat on WhatsApp */}
                          <button
                            type="button"
                            onClick={(e) => handleWhatsAppClick(e, car)}
                            className={`w-full py-2.5 px-2.5 sm:px-4 text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-0 ${
                              hasPaidPass
                                ? "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border-emerald-600 hover:border-emerald-500 shadow-xs"
                                : "bg-stone-900 hover:bg-stone-800 text-white border-stone-900"
                            }`}
                            title={hasPaidPass ? "Chat directly on WhatsApp with seller" : "Unlock seller contact via WhatsApp"}
                          >
                            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-white" />
                            <span className="truncate font-bold">
                              {hasPaidPass ? "Chat on WhatsApp" : "Unlock Seller & Chat WhatsApp"}
                            </span>
                            {!hasPaidPass && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-auto" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>

              {/* Padlock status module if has not paid pass and database contains hidden elements */}
              {sortedVehicles.length > 3 && !hasPaidPass && (
                <div className="mt-12 bg-[#FAF8F5] border border-stone-400 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
                  <div className="w-12 h-12 bg-stone-950 text-[#F4F1EA] flex items-center justify-center mx-auto">
                    <Lock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-black uppercase text-stone-950 tracking-tight">Plus {sortedVehicles.length - 3} More Specimens Catalogued</h3>
                    <p className="text-sm md:text-xs text-stone-605 max-w-md mx-auto pt-1 leading-relaxed">
                      You are viewing the first 3 car listings completely free. Activate our secure ₹1 buyer pass to reveal all remaining catalog entries and direct broker contact registries inside your account.
                    </p>
                  </div>
                  
                  {currentUser && !currentUser.isAnonymous ? (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="px-6 py-3.5 bg-stone-900 text-white font-bold uppercase text-[11px] tracking-widest hover:bg-stone-850 cursor-pointer"
                    >
                      Activate ₹1 Account Pass
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={onSignInClick}
                        className="px-6 py-3.5 bg-stone-900 text-white font-bold uppercase text-[11px] tracking-widest hover:bg-stone-850 cursor-pointer flex items-center gap-2 mx-auto transition"
                      >
                        <User className="w-4 h-4 shrink-0 text-[#F4F1EA]" />
                        Sign In to Unlock All Specs
                      </button>
                      <p className="text-[9px] uppercase font-bold text-stone-500 tracking-wider leading-none">Authentication required for registering your pass</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}

      {/* --- VIEW 2: PERFORMANCE PARTS & TUNING HARDWARE REGISTRY --- */}
      {activeCatalogMode === "parts" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header */}
          <div className="border-b border-stone-300 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-amber-600 font-bold block mb-1">
                Motorsport Tuning & Hardware Index
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-stone-900">
                Performance Parts & Aftermarket Registry
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
                Curated collection of authentic racing turbochargers, lightweight pre-preg carbon aero, titanium exhaust systems, forged wheels, coilovers, and precision ECU tunes with verified fitment.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-stone-900 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider border border-amber-500/30 shadow-sm flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                {filteredParts.length} Verified Components
              </span>
            </div>
          </div>

          {/* CATEGORY SELECTOR TABS & WISHLIST FILTER */}
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] space-y-3 font-sans">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-300 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-stone-700 flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                Hardware Categories & Filters
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-stone-600 font-bold">
                  Showing {displayedParts.length} of {filteredParts.length} items
                </span>
                {!hasPaidPass && sortedParts.length > 3 && (
                  <span className="px-2 py-0.5 bg-amber-500 text-stone-950 text-[9px] font-mono font-black uppercase tracking-wider rounded-xs flex items-center gap-1 shadow-xs">
                    <Lock className="w-3 h-3" />
                    Preview (Top 3)
                  </span>
                )}
              </div>
            </div>

            {/* Category Tabs: All, Performance, Engine, Interior, Exterior + Wishlist */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {[
                { id: "all", label: "All", subtitle: "All Parts", icon: Layers },
                { id: "performance", label: "Performance", subtitle: "Turbos & Brakes", icon: Zap },
                { id: "engine", label: "Engine", subtitle: "Blocks & Crates", icon: Cpu },
                { id: "interior", label: "Interior", subtitle: "Cockpit & Seats", icon: Gauge },
                { id: "exterior", label: "Exterior", subtitle: "Aero & Spoilers", icon: Wind },
              ].map((cat) => {
                const IconComp = cat.icon;
                const isSelected = selectedPartCategory === cat.id && !isPartWishlistOnly;
                const matchCount = partsList.filter(p => isPartMatchCategory(p, cat.id)).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedPartCategory(cat.id);
                      setIsPartWishlistOnly(false);
                    }}
                    className={`px-4 py-2.5 text-xs font-mono uppercase font-black tracking-wider whitespace-nowrap transition-all duration-200 flex items-center gap-2 border-2 cursor-pointer shadow-xs ${
                      isSelected
                        ? "bg-stone-950 text-amber-400 border-stone-950 ring-2 ring-amber-400/60 shadow-[2px_2px_0px_0px_rgba(217,119,6,0.9)] scale-[1.02]"
                        : "bg-white hover:bg-stone-100 text-stone-800 border-stone-300 hover:border-stone-500"
                    }`}
                  >
                    <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? "text-amber-400" : "text-amber-600"}`} />
                    <span>{cat.label}</span>
                    <span className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded-xs ${
                      isSelected ? "bg-amber-400 text-stone-950 font-black" : "bg-stone-200 text-stone-700"
                    }`}>
                      {matchCount}
                    </span>
                  </button>
                );
              })}

              {/* Dedicated Wishlist Category Button */}
              {(() => {
                const wishlistCount = partsList.filter(p => isPartFavorited(p)).length;
                return (
                  <button
                    type="button"
                    onClick={() => setIsPartWishlistOnly(prev => !prev)}
                    className={`ml-auto px-4 py-2.5 text-xs font-mono uppercase font-black tracking-wider whitespace-nowrap transition-all duration-200 flex items-center gap-2 border-2 cursor-pointer shadow-xs ${
                      isPartWishlistOnly
                        ? "bg-red-600 text-white border-red-700 ring-2 ring-red-400/70 shadow-[2px_2px_0px_0px_rgba(220,38,38,0.9)] scale-[1.02]"
                        : "bg-white hover:bg-red-50 text-stone-800 border-stone-300 hover:border-red-300"
                    }`}
                    title="Filter by saved Wishlist parts"
                  >
                    <Heart className={`w-4 h-4 shrink-0 ${isPartWishlistOnly ? "fill-white text-white" : "text-red-500 fill-red-500/20"}`} />
                    <span>Wishlist</span>
                    <span className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded-xs ${
                      isPartWishlistOnly ? "bg-white text-red-600 font-black" : "bg-red-100 text-red-700"
                    }`}>
                      {wishlistCount}
                    </span>
                  </button>
                );
              })()}
            </div>
          </div>

          {/* SEARCH & SECONDARY FILTERS BAR */}
          <div className="bg-stone-900 border-2 border-stone-950 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Search Bar */}
              <div className="lg:col-span-4 relative">
                <label className="block text-[9px] font-mono text-stone-400 uppercase tracking-widest mb-1 font-bold">
                  Search Hardware & Specs
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={partSearchQuery}
                    onChange={(e) => setPartSearchQuery(e.target.value)}
                    placeholder="Search titanium, Garrett, BMW M3, 500HP..."
                    className="w-full pl-9 pr-3 py-2 bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 text-xs font-mono focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  {partSearchQuery && (
                    <button
                      onClick={() => setPartSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Rarity Filter */}
              <div className="lg:col-span-2">
                <label className="block text-[9px] font-mono text-stone-400 uppercase tracking-widest mb-1 font-bold">
                  Rarity / Tier
                </label>
                <select
                  value={selectedPartRarity}
                  onChange={(e) => setSelectedPartRarity(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 text-stone-100 text-xs font-mono focus:border-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Tiers</option>
                  <option value="Legendary">Legendary (★ 5-Star)</option>
                  <option value="Epic">Epic (4-Star)</option>
                  <option value="Rare">Rare (3-Star)</option>
                  <option value="Uncommon">Uncommon</option>
                  <option value="Common">OEM / Common</option>
                </select>
              </div>

              {/* Brand Filter */}
              <div className="lg:col-span-3">
                <label className="block text-[9px] font-mono text-stone-400 uppercase tracking-widest mb-1 font-bold">
                  Brand / Manufacturer
                </label>
                <select
                  value={selectedPartBrand}
                  onChange={(e) => setSelectedPartBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 text-stone-100 text-xs font-mono focus:border-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Brands</option>
                  {Array.from(new Set(partsList.map((p) => p.brand).filter(Boolean))).sort().map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="lg:col-span-2">
                <label className="block text-[9px] font-mono text-stone-400 uppercase tracking-widest mb-1 font-bold">
                  Sort Order
                </label>
                <select
                  value={partSortBy}
                  onChange={(e) => setPartSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 text-stone-100 text-xs font-mono focus:border-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="featured">Featured / Verified</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rarity">Highest Rarity Tier</option>
                </select>
              </div>

              {/* Reset Action */}
              <div className="lg:col-span-1 flex items-end">
                <button
                  onClick={handleResetPartFilters}
                  title="Reset all filters"
                  className="w-full py-2 px-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white text-xs font-mono uppercase font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline lg:hidden xl:inline">Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* PARTS INVENTORY GRID */}
          {displayedParts.length === 0 ? (
            <div className="bg-[#FAF8F5] border-2 border-stone-900 p-12 text-center space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <div className="w-14 h-14 bg-stone-900 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                {isPartWishlistOnly ? <Heart className="w-7 h-7 text-red-500 fill-red-500" /> : <Wrench className="w-7 h-7" />}
              </div>
              <h3 className="text-lg font-serif font-black text-stone-900 uppercase tracking-tight">
                {isPartWishlistOnly ? "No Saved Wishlist Parts Yet" : "No Performance Hardware Matches Found"}
              </h3>
              <p className="text-xs text-stone-600 max-w-md mx-auto">
                {isPartWishlistOnly
                  ? "You haven't added any motorsport parts to your wishlist yet. Click the heart icon on any part card to bookmark it for later."
                  : "No motorsport parts currently match your search filters or selected category. Try clearing keywords or browsing all categories."}
              </p>
              <button
                onClick={handleResetPartFilters}
                className="px-5 py-2.5 bg-stone-900 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider hover:bg-stone-850 cursor-pointer shadow-sm"
              >
                {isPartWishlistOnly ? "View All Parts" : "Reset Parts Filters"}
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedParts.map((part) => {
                  const isLegendary = part.rarity === "Legendary";
                  const isEpic = part.rarity === "Epic";
                  const isRare = part.rarity === "Rare";
                  const isFavorite = isPartFavorited(part);

                  return (
                    <div
                      key={part.id}
                      id={`part-card-${part.id}`}
                      onClick={(e) => onQuickViewPart?.(part, { x: e.clientX, y: e.clientY })}
                      className="group bg-[#FAF8F5] border-2 border-stone-900 hover:border-amber-500 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[5px_5px_0px_0px_rgba(217,119,6,0.8)] cursor-pointer relative"
                    >
                      {/* Top Image Section */}
                      <div className="relative aspect-[16/10] bg-stone-950 overflow-hidden border-b-2 border-stone-900">
                        <img
                          src={part.image}
                          alt={part.title}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/30 pointer-events-none" />

                        {/* Rarity Badge / Ribbon */}
                        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-wider shadow-md border ${
                              isLegendary
                                ? "bg-amber-500 text-stone-950 border-amber-300 shadow-amber-500/30"
                                : isEpic
                                ? "bg-purple-600 text-white border-purple-400 shadow-purple-600/30"
                                : isRare
                                ? "bg-sky-600 text-white border-sky-400 shadow-sky-600/30"
                                : "bg-stone-800 text-stone-200 border-stone-600"
                            }`}
                          >
                            {part.rarity} Tier
                          </span>

                          {part.badge === "verified" && (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-400">
                              <ShieldCheck className="w-3 h-3" />
                              Verified OEM
                            </span>
                          )}
                          {part.badge === "premium" && (
                            <span className="px-2 py-0.5 bg-amber-600 text-white text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 border border-amber-400">
                              <Sparkles className="w-3 h-3" />
                              Motorsport Pro
                            </span>
                          )}
                        </div>

                        {/* Interactive Wishlist Heart Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentlyFav = isPartFavorited(part);
                            if (toggleFavoritePart) {
                              toggleFavoritePart(part.id);
                            } else {
                              const numId = typeof part.id === "number" ? part.id : Number(String(part.id).replace(/\D/g, "").slice(0, 5)) || 999;
                              toggleFavorite(numId);
                            }
                            if (currentlyFav) {
                              showToast(`Removed "${part.title}" from Wishlist`, "info");
                            } else {
                              showToast(`Saved "${part.title}" to Wishlist!`, "success");
                            }
                          }}
                          className={`absolute top-3 right-3 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md active:scale-90 z-10 ${
                            isFavorite
                              ? "bg-red-600 border-red-400 text-white shadow-red-600/40 scale-105"
                              : "bg-stone-900/85 hover:bg-stone-900 text-stone-300 hover:text-white border-stone-700 hover:scale-105"
                          }`}
                          aria-label={isFavorite ? "Remove part from wishlist" : "Save part to wishlist"}
                          title={isFavorite ? "Saved to Wishlist (Click to remove)" : "Save to Wishlist"}
                        >
                          <Heart
                            className={`w-4 h-4 transition-transform ${
                              isFavorite ? "fill-white text-white scale-110" : "text-stone-300 hover:text-red-400 hover:scale-110"
                            }`}
                          />
                        </button>

                        {/* Brand & Part Number Bottom Overlay */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[10px] font-mono">
                          <span className="px-2 py-0.5 bg-stone-900/90 border border-stone-700 font-bold uppercase tracking-wider text-amber-300">
                            {part.brand || "Aftermarket"}
                          </span>
                          {part.partNumber && (
                            <span className="px-2 py-0.5 bg-black/75 border border-stone-800 text-stone-300">
                              PN: {part.partNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-serif font-black text-base text-stone-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
                              {part.title}
                            </h3>
                          </div>

                          <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed mb-3">
                            {part.description}
                          </p>

                          {/* Fitment Tag */}
                          {Boolean(part.compatibleVehicles) && (
                            <div className="mb-3 p-2 bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-700 flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                              <span className="truncate font-semibold">
                                Fitment: {typeof part.compatibleVehicles === "string" ? part.compatibleVehicles : Array.isArray(part.compatibleVehicles) ? (part.compatibleVehicles as string[]).join(", ") : "Universal"}
                              </span>
                            </div>
                          )}

                          {/* Key Specs Badges */}
                          {part.specifications && Object.keys(part.specifications).length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(part.specifications).slice(0, 3).map(([key, val]) => (
                                <span
                                  key={key}
                                  className="px-2 py-0.5 bg-white border border-stone-300 text-[9px] font-mono text-stone-800 font-bold"
                                >
                                  <strong className="text-stone-500 font-normal">{key}: </strong>
                                  {String(val)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pricing & Footer Actions */}
                        <div className="pt-3 border-t border-stone-200 space-y-3">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <span className="text-[9px] font-mono uppercase text-stone-500 tracking-wider block">
                                Asking Price
                              </span>
                              <span className="text-lg sm:text-xl font-serif font-black text-stone-900">
                                ₹{part.price.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-mono font-bold uppercase tracking-wider">
                                {part.negotiable ? "Negotiable" : "Fixed Price"}
                              </span>
                              <span className="text-[9px] font-mono text-stone-500 block mt-0.5">
                                {part.location || "Verified Supplier"}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickViewPart?.(part, { x: e.clientX, y: e.clientY });
                              }}
                              className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-amber-400 text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer border border-stone-950 shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Dossier
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handlePartWhatsAppClick(e, part)}
                              className={`py-2.5 px-3 text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer border shadow-xs ${
                                hasPaidPass
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-800"
                                  : "bg-stone-900 hover:bg-stone-800 text-amber-400 border-stone-950"
                              }`}
                              title={hasPaidPass ? "Connect directly on WhatsApp with seller" : "Unlock seller coordinates & WhatsApp"}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="truncate">{hasPaidPass ? "WhatsApp" : "Unlock & Chat"}</span>
                              {!hasPaidPass && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Locked Parts Module when user has not activated Buyer Pass and there are more than 3 parts */}
              {sortedParts.length > 3 && !hasPaidPass && (
                <div className="mt-12 bg-[#FAF8F5] border-2 border-stone-900 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                  <div className="w-12 h-12 bg-stone-950 text-[#F4F1EA] flex items-center justify-center mx-auto border border-amber-500/40">
                    <Lock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-black uppercase text-stone-950 tracking-tight">
                      Plus {sortedParts.length - 3} More Motorsport Components Catalogued
                    </h3>
                    <p className="text-sm md:text-xs text-stone-600 max-w-md mx-auto pt-1 leading-relaxed">
                      You are viewing the first 3 performance parts completely free. Activate our secure ₹1 buyer pass to reveal all remaining component inventory and direct seller contact registries.
                    </p>
                  </div>
                  
                  {currentUser && !currentUser.isAnonymous ? (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="px-6 py-3.5 bg-stone-900 text-amber-400 font-bold uppercase text-[11px] font-mono tracking-widest hover:bg-stone-850 cursor-pointer border border-amber-500/40 shadow-sm"
                    >
                      Activate ₹1 Account Pass
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={onSignInClick}
                        className="px-6 py-3.5 bg-stone-900 text-amber-400 font-bold uppercase text-[11px] font-mono tracking-widest hover:bg-stone-850 cursor-pointer flex items-center gap-2 mx-auto transition border border-amber-500/40"
                      >
                        <User className="w-4 h-4 shrink-0 text-[#F4F1EA]" />
                        Sign In to Unlock All Parts
                      </button>
                      <p className="text-[9px] uppercase font-bold text-stone-500 tracking-wider leading-none">Authentication required for registering your pass</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
    </>
    )}

      {/* DETAILED DAILY PERMIT UPI GATEWAY MODAL */}
      <UPIPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handleUpiPaymentSuccess}
        amount={1}
        itemTitle="Auto World 24-Hour Premium Buyer Pass"
        itemDescription="Direct access to verified seller phone contacts, full mechanical checklists & complete RTO dossiers."
        defaultUpiId="autoworld.pay@icici"
      />

      {/* EMI Loan Calculator Popup Modal */}
      <Modal
        isOpen={Boolean(emiVehicle)}
        onClose={() => setEmiVehicle(null)}
        containerClassName="w-full max-w-2xl"
        overlayClassName="bg-stone-950/85 backdrop-blur-md"
      >
        {emiVehicle && (
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setEmiVehicle(null)}
              className="absolute top-4 right-4 z-30 text-stone-400 hover:text-white p-2 bg-stone-900/90 border border-stone-800 rounded-full cursor-pointer transition shadow-lg"
              aria-label="Close EMI calculator modal"
            >
              <X className="w-5 h-5" />
            </button>
            <EMICalculator
              vehiclePrice={emiVehicle.price}
              vehicleTitle={emiVehicle.title}
              vehicleId={emiVehicle.id}
            />
          </div>
        )}
      </Modal>

      {/* TEST DRIVE SCHEDULER MODAL */}
      <TestDriveModal
        isOpen={!!testDriveVehicle}
        onClose={() => setTestDriveVehicle(null)}
        vehicle={testDriveVehicle}
        currentUser={currentUser}
        showToast={showToast}
      />

      {/* 100-POINT INSPECTION REPORT MODAL */}
      <InspectionReportModal
        isOpen={!!inspectionVehicle}
        onClose={() => setInspectionVehicle(null)}
        vehicle={inspectionVehicle}
      />

      {/* SAVED SEARCH ALERTS MODAL */}
      <SavedSearchesModal
        isOpen={isSavedSearchesOpen}
        onClose={() => setIsSavedSearchesOpen(false)}
        currentFilters={{
          type: selectedType,
          priceRange: selectedPriceRange,
          location: locationValue,
          make: selectedMake,
        }}
        onApplySearch={(f) => {
          if (f.type !== undefined) setSelectedType(f.type);
          if (f.priceRange !== undefined) setSelectedPriceRange(f.priceRange);
          if (f.location !== undefined) setLocationValue(f.location);
          if (f.make !== undefined) setSelectedMake(f.make);
        }}
        showToast={showToast}
      />

      {/* REQUEST CALLBACK MODAL */}
      <CallbackModal
        isOpen={!!callbackVehicle}
        onClose={() => setCallbackVehicle(null)}
        vehicle={callbackVehicle}
        currentUser={currentUser}
        showToast={showToast}
      />

    </motion.div>
  );
}
