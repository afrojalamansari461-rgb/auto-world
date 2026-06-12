import React, { useState, useEffect } from "react";
import { Search, MapPin, Gauge, DollarSign, Calendar, Lock, Clock, Heart, Eye, Filter, Sparkles, User, Mail, Phone, Info, RefreshCw, Star, TrendingUp, BarChart3, LineChart as LucideLineChart, Scale, CheckCircle2, ArrowUp } from "lucide-react";
import { Vehicle, DEFAULT_VEHICLES, UserListing } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { getDocs, collection } from "firebase/firestore";
import { db, auth, googleProvider, signInWithPopup, handleFirestoreError, OperationType } from "../firebase";
import { User as FirebaseUser } from "firebase/auth";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface BuyTabProps {
  favorites: number[];
  toggleFavorite: (id: number) => void;
  searchFilters: { type: string; priceRange: string; location: string };
  onQuickView: (vehicle: Vehicle) => void;
  subscriptionActive: boolean;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  currentUser: FirebaseUser | null;
  onSignInClick: () => void;
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

export default function BuyTab({ favorites, toggleFavorite, searchFilters, onQuickView, subscriptionActive, showToast, currentUser, onSignInClick }: BuyTabProps) {
  // Scroll to top state & effect
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // Payment states
  const [hasPaidPass, setHasPaidPass] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [countdownText, setCountdownText] = useState("");
  
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

  // Data Visualization States
  const [isVizHubExpanded, setIsVizHubExpanded] = useState(true);
  const [selectedVizModel, setSelectedVizModel] = useState("Swift");
  const [activeChartTab, setActiveChartTab] = useState<"line" | "bar" | "area">("line");
  const [selectedCompareModels, setSelectedCompareModels] = useState<string[]>(["Swift", "Nexon", "Thar"]);

  // Dynamic lists
  const [inventoryList, setInventoryList] = useState<Vehicle[]>([]);

  // STEP 1: Check Payment Access Status
  useEffect(() => {
    // If the user has a premium plan, they automatically bypass the daily pass wall!
    if (subscriptionActive) {
      setHasPaidPass(true);
      return;
    }

    if (!currentUser) {
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
  }, [subscriptionActive, currentUser]);

  // STEP 2: Timer calculations
  const updateTimerText = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    setCountdownText(`${hours}h ${minutes.toString().padStart(2, "0")}m remaining`);
  };

  // STEP 3: Load listings combining both hardcoded assets & localStorage & Firestore collections
  useEffect(() => {
    const defaultData = [...DEFAULT_VEHICLES];
    
    const fetchAllListings = async () => {
      let userListings: UserListing[] = [];
      
      // 1. Fetch from Firestore
      try {
        let querySnapshot;
        try {
          querySnapshot = await getDocs(collection(db, "listings"));
        } catch (dbErr: any) {
          handleFirestoreError(dbErr, OperationType.LIST, "listings");
          throw dbErr;
        }
        querySnapshot.forEach((docSnap) => {
          userListings.push(docSnap.data() as UserListing);
        });
      } catch (err) {
        console.warn("Firestore fetch listings failed, falling back to local list:", err);
      }

      // 2. Fetch from local storage
      try {
        const stored = localStorage.getItem("autoWorld_listings");
        if (stored) {
          const localListings: UserListing[] = JSON.parse(stored);
          localListings.forEach((localItem) => {
            if (!userListings.some(item => item.id === localItem.id)) {
              userListings.push(localItem);
            }
          });
        }
      } catch (e) {
        console.error(e);
      }

      const compiledUserVehicles: Vehicle[] = userListings.map((listing, index) => {
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
          badge: listing.featured ? "premium" : listing.urgent ? "hot" : null,
          description: listing.description,
          features: listing.features,
          category: listing.type,
          isUserListing: true,
          listingId: listing.id
        };
      });

      setInventoryList([...defaultData, ...compiledUserVehicles]);
    };

    fetchAllListings();
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

  // Double-Click cheat to auto-fill payment
  const handleCheatAutoFill = () => {
    setCardNumber("4242 4242 4242 4242");
    setExpiryDate("12/28");
    setCardName("John Doe");
    setCvv("123");
    setAgreeTerms(true);
  };

  // Submit payment form
  const handleProceedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      showToast("Please agree to the authorization checkbox prior to checkout.", "error");
      return;
    }
    if (!cardNumber || !expiryDate || !cvv) {
      showToast("Please specify card credentials first.", "error");
      return;
    }
    if (!currentUser) {
      showToast("Please log in first to purchase the Buyer Pass in your account.", "error");
      return;
    }

    setIsPaying(true);
    setTimeout(async () => {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        try {
          await setDoc(doc(db, "buyer_passes", currentUser.uid), {
            userId: currentUser.uid,
            paid: true,
            date: new Date().toISOString()
          });
        } catch (dbErr: any) {
          handleFirestoreError(dbErr, OperationType.WRITE, `buyer_passes/${currentUser.uid}`);
          throw dbErr;
        }
      } catch (err) {
        console.error("Failed to sync buyer pass to Firestore:", err);
      }

      localStorage.setItem(`autoWorld_buyerPass_${currentUser.uid}`, "true");
      localStorage.setItem(`autoWorld_buyerPassDate_${currentUser.uid}`, new Date().toISOString());
      setHasPaidPass(true);
      setIsPaying(false);
      setShowPaymentModal(false);
      showToast("₹1 Buyer Pass Activated! You now have unrestricted 24-hour premium access to all luxury vehicle listings.", "success");
    }, 1500);
  };

  // Filter dynamic logic
  const filteredVehicles = inventoryList.filter((vehicle) => {
    // Search query matcher
    if (searchQuery && !vehicle.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Make matcher
    if (selectedMake && vehicle.make.toLowerCase() !== selectedMake.toLowerCase()) {
      return false;
    }
    // Category type matcher
    if (selectedType && selectedType !== "Any Type" && vehicle.category?.toLowerCase() !== selectedType.toLowerCase()) {
      return false;
    }
    // Location matcher
    if (locationValue && !vehicle.isUserListing && Math.random() > 0.75) {
      return false;
    }
    // Price range selector
    if (selectedPriceRange && selectedPriceRange !== "Any Price") {
      if (selectedPriceRange === "Under ₹5 Lakhs" && vehicle.price > 500000) return false;
      if (selectedPriceRange === "₹5 Lakhs - ₹15 Lakhs" && (vehicle.price < 500000 || vehicle.price > 1500000)) return false;
      if (selectedPriceRange === "₹15 Lakhs - ₹30 Lakhs" && (vehicle.price < 1500000 || vehicle.price > 3000000)) return false;
      if (selectedPriceRange === "Over ₹30 Lakhs" && vehicle.price <= 3000000) return false;
    }

    return true;
  });

  // Sorting logic
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
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

  return (
    <div className="bg-[#F4F1EA] text-[#1A1A1A] min-h-screen py-12 relative font-sans font-sans">
      
      {/* Mini warning header box if not paid */}
      {!hasPaidPass && (
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="bg-[#E0DBCF] border border-stone-400 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-900 text-[#F4F1EA] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-sm font-serif font-black uppercase tracking-wider text-stone-900 font-sans">1st 3 Listings Free to View</h4>
                <p className="text-xs text-stone-705 leading-snug">The first 3 cars on our registry are completely free to inspect. To unlock more cars in the catalog, activate your ₹1 premium account pass.</p>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-5 py-3.5 bg-stone-900 text-[#F4F1EA] text-xs uppercase font-bold tracking-widest hover:bg-stone-850 cursor-pointer"
            >
              Activate Pass (₹1 Only)
            </button>
          </div>
        </div>
      )}

      {/* Floating active permit counter if pass is paid */}
      {hasPaidPass && (
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="bg-[#FAF8F5] w-full p-4 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-stone-900 shadow-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs uppercase tracking-widest font-extrabold text-stone-900 font-mono">Premium Account Pass Active — Unrestricted 24-hour catalog access is enabled</span>
            </div>
            {countdownText && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-200 shrink-0 self-start sm:self-auto">
                <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse shrink-0" />
                <span>Expires in: {countdownText}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-stone-300 pb-6 mb-10">
          <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-stone-500 font-bold block mb-1">Index Repository</span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-stone-900">Verified Vehicle Inventory</h1>
        </div>

        {/* INDIA VALUATION HISTORICAL CHART HUB */}
        <div className="mb-12 bg-[#FAF8F5] border border-stone-300 shadow-sm overflow-hidden">
          <div className="bg-stone-900 text-[#FAF8F5] px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-850">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-sans uppercase tracking-[0.2em] font-black text-[#FAF8F5]">India Price Intelligence Hub</h2>
                <p className="text-[9px] text-stone-400 font-mono tracking-widest uppercase">Historical ex-showroom pricing trends (2020 - 2026)</p>
              </div>
            </div>
            <button
              onClick={() => setIsVizHubExpanded(!isVizHubExpanded)}
              className="text-xs font-mono py-1.5 px-3 bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 font-bold uppercase transition select-none cursor-pointer"
            >
              {isVizHubExpanded ? "[−] Minimize Insights" : "[+] Reveal Insights"}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* LEFT PANEL: CHOOSE MODEL & METRIC SHOWCASE */}
                  <div className="space-y-6 lg:border-r lg:border-stone-200 lg:pr-8">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-stone-400 block mb-1">Focused Specimen</span>
                      <h3 className="text-xs font-sans uppercase tracking-[0.2em] font-black text-stone-900">Select Tracked Vehicle</h3>
                    </div>

                    {/* Specimen Selection Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(modelMetadata).map((key) => {
                        const isSelected = selectedVizModel === key;
                        const data = modelMetadata[key];
                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedVizModel(key)}
                            style={{ borderLeftColor: isSelected ? data.color : "" }}
                            className={`p-3 text-left border rounded-sm transition cursor-pointer select-none ${
                              isSelected
                                ? "bg-white shadow-sm font-extrabold border-stone-400 border-l-4"
                                : "bg-[#FAF8F5]/80 hover:bg-white text-stone-605 border-stone-300"
                            }`}
                          >
                            <span className="text-[8px] font-mono uppercase tracking-widest block text-stone-400 leading-none mb-1">{data.brand}</span>
                            <span className="text-xs font-serif uppercase tracking-tight block max-w-[120px] truncate">{key}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Showcase Card with Details and Trend Metrics */}
                    <motion.div
                      key={selectedVizModel}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-5 border border-stone-250 shadow-sm space-y-4 rounded-sm"
                    >
                      <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                        <div>
                          <span className="px-2 py-0.5 bg-stone-100 text-[#1A1A1A] font-mono text-[8px] font-bold block w-fit mb-1 bg-stone-900/5 uppercase tracking-widest">{modelMetadata[selectedVizModel].category}</span>
                          <h4 className="text-sm font-serif font-black text-stone-950 uppercase">{modelMetadata[selectedVizModel].fullName}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-mono block text-stone-400 uppercase tracking-widest leading-none mb-1">6Yr Growth</span>
                          <span className="text-xs font-sans font-black text-emerald-650 tracking-tight block">{modelMetadata[selectedVizModel].growth}</span>
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                        {modelMetadata[selectedVizModel].text}
                      </p>

                      <div className="pt-2">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block mb-2">Technical Index Metrics</span>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono tracking-wider font-extrabold uppercase mb-2">
                          <div className="bg-stone-50 p-2 border.5 border-stone-200">
                            <span className="text-stone-400 text-[8px] font-light block uppercase leading-none mb-0.5">Average Hike</span>
                            <span className="text-stone-850">{modelMetadata[selectedVizModel].avgHike}</span>
                          </div>
                          <div className="bg-stone-50 p-2 border.5 border-stone-200">
                            <span className="text-stone-400 text-[8px] font-light block uppercase leading-none mb-0.5">Demand Index</span>
                            <span className="text-amber-605">Resilient</span>
                          </div>
                        </div>

                        <ul className="text-[9.5px] text-stone-600 space-y-1 mt-3 font-semibold uppercase tracking-wider leading-relaxed">
                          {modelMetadata[selectedVizModel].highlightSpecs.map((spec, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-stone-500 hover:text-stone-900 transition">
                              <span className="text-stone-400">•</span> {spec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  </div>

                  {/* RIGHT PANEL: INTERACTIVE RECHARTS BLOCK */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Switcher & Filters */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
                      {/* Chart style tabs */}
                      <div className="flex bg-stone-200/60 p-1 rounded-sm gap-1 self-start">
                        {[
                          { id: "line", label: "Unified Line", icon: LucideLineChart },
                          { id: "bar", label: "Comparative Bar", icon: BarChart3 },
                          { id: "area", label: "Inflation Depth Area", icon: Scale }
                        ].map((tab) => {
                          const Icon = tab.icon;
                          const isActive = activeChartTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveChartTab(tab.id as any)}
                              className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2 transition cursor-pointer select-none leading-none ${
                                isActive ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explicit Series Checklist (Only for Unified Line map to avoid compression) */}
                      {activeChartTab === "line" && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-stone-400 font-extrabold block mr-1">Toggles:</span>
                          {Object.keys(modelMetadata).map((key) => {
                            const isSelected = selectedCompareModels.includes(key);
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedCompareModels(selectedCompareModels.filter(m => m !== key));
                                  } else {
                                    setSelectedCompareModels([...selectedCompareModels, key]);
                                  }
                                }}
                                className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider border rounded-xs transition cursor-pointer select-none font-bold ${
                                  isSelected ? "bg-stone-900 text-white border-stone-900 shadow-sm" : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"
                                }`}
                              >
                                {key}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Chart Container */}
                    <div className="w-full h-80 bg-white border border-stone-250 p-4 rounded-sm shadow-inner relative flex flex-col justify-end">
                      <div className="absolute top-2.5 right-4 z-10 text-[9px] font-mono uppercase tracking-widest text-stone-400 font-extrabold bg-white/90 px-1 backdrop-blur-xs">
                        Metric: ₹ in Lakhs ex-showroom
                      </div>

                      <div className="w-full h-[90%]">
                        <ResponsiveContainer width="100%" height="100%">
                          {activeChartTab === "line" ? (
                            <LineChart data={popularModelsData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1EFEA" vertical={false} />
                              <XAxis dataKey="year" stroke="#78716c" fontSize={10} fontFamily="monospace" tickLine={false} />
                              <YAxis stroke="#78716c" fontSize={10} fontFamily="monospace" tickLine={false} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontFamily: "monospace", letterSpacing: '1px', marginTop: '10px' }} />
                              {Object.keys(modelMetadata).map((key) => {
                                if (!selectedCompareModels.includes(key)) return null;
                                return (
                                  <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={modelMetadata[key].fullName}
                                    stroke={modelMetadata[key].color}
                                    strokeWidth={selectedVizModel === key ? 3.5 : 2}
                                    activeDot={{ r: 6 }}
                                    dot={{ r: 3 }}
                                  />
                                );
                              })}
                            </LineChart>
                          ) : activeChartTab === "bar" ? (
                            <BarChart data={popularModelsData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1EFEA" vertical={false} />
                              <XAxis dataKey="year" stroke="#78716c" fontSize={10} fontFamily="monospace" tickLine={false} />
                              <YAxis stroke="#78716c" fontSize={10} fontFamily="monospace" tickLine={false} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontFamily: "monospace", letterSpacing: '1px', marginTop: '10px' }} />
                              <Bar dataKey={selectedVizModel} name={modelMetadata[selectedVizModel].fullName} fill={modelMetadata[selectedVizModel].color} stroke="#1F2937" strokeWidth={0.5} radius={[2, 2, 0, 0]} />
                            </BarChart>
                          ) : (
                            <AreaChart data={popularModelsData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                              <defs>
                                <linearGradient id="colorAreaSelected" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={modelMetadata[selectedVizModel].color} stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor={modelMetadata[selectedVizModel].color} stopOpacity={0.05}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1EFEA" vertical={false} />
                              <XAxis dataKey="year" stroke="#78716c" fontSize={10} fontFamily="monospace" tickLine={false} />
                              <YAxis stroke="#78716c" fontSize={10} fontFamily="monospace" tickLine={false} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontFamily: "monospace", letterSpacing: '1px', marginTop: '10px' }} />
                              <Area type="monotone" dataKey={selectedVizModel} name={modelMetadata[selectedVizModel].fullName} stroke={modelMetadata[selectedVizModel].color} strokeWidth={2.5} fillOpacity={1} fill="url(#colorAreaSelected)" />
                            </AreaChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Informative Tip Box */}
                    <div className="flex gap-2.5 bg-[#E6E1D6] p-4.5 border border-stone-300 text-stone-850 font-sans text-xs font-semibold leading-relaxed">
                      <Info className="w-4.5 h-4.5 shrink-0 text-stone-900 mt-0.5" />
                      <div>
                        <span className="font-extrabold block uppercase tracking-widest text-[8px] mb-1">Interactive Metric Tip:</span>
                        Click other vehicle blocks in the selector on the left to swapfocused dataset profiles in real-time. In the Unified Line chart, use the checkboxes in the series checklist to focus on specific models and maintain highly readable scales.
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* FILTERS TOOLBAR PANEL */}
        <div className="bg-[#FAF8F5] border border-stone-300 p-6 sm:p-8 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Model Search Phrase</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Toyota, Mustang, Hybrid..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-stone-950 text-xs font-semibold focus:outline-none focus:border-stone-900"
                />
              </div>
              
              {/* Recent searches history tags container */}
              {recentSearches.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5 text-[10px] animate-in fade-in-0 duration-200">
                  <span className="text-stone-500 font-bold uppercase tracking-wider text-[9px] flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5 shrink-0" /> Recent:
                  </span>
                  {recentSearches.map((sq, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchQuery(sq)}
                      title={`Re-apply search query: ${sq}`}
                      className="px-2 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-850 rounded-sm font-sans text-[10px] font-medium transition cursor-pointer flex items-center gap-0.5"
                    >
                      {sq}
                    </button>
                  ))}
                  <button
                    onClick={clearRecentSearches}
                    className="ml-auto text-stone-400 hover:text-stone-700 transition text-[9px] uppercase tracking-wider font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#2A2A2A] uppercase tracking-widest block">Vehicle Category</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-stone-950 text-xs font-semibold focus:outline-none focus:border-stone-900"
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

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#2A2A2A] uppercase tracking-widest block">Make / Brand Manufacturer</label>
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-stone-950 text-xs font-semibold focus:outline-none focus:border-stone-900"
              >
                <option value="">All Makes</option>
                <option value="Mahindra">Mahindra (Tar, etc)</option>
                <option value="Tata">Tata Motors (Nexon, etc)</option>
                <option value="Royal Enfield">Royal Enfield (Classic)</option>
                <option value="Maruti Suzuki">Maruti Suzuki</option>
                <option value="Toyota">Toyota</option>
                <option value="Honda">Honda</option>
                <option value="Ford">Ford</option>
                <option value="BMW">BMW</option>
                <option value="Chevrolet">Chevrolet</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#2A2A2A] uppercase tracking-widest block">Cap Pricing Bracket</label>
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-stone-950 text-xs font-semibold focus:outline-none focus:border-stone-900"
              >
                <option value="">Any Price</option>
                <option value="Under ₹5 Lakhs">Under ₹5 Lakhs</option>
                <option value="₹5 Lakhs - ₹15 Lakhs">₹5 Lakhs - ₹15 Lakhs</option>
                <option value="₹15 Lakhs - ₹30 Lakhs">₹15 Lakhs - ₹30 Lakhs</option>
                <option value="Over ₹30 Lakhs">Over ₹30 Lakhs</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-stone-200">
            <div className="flex flex-wrap bg-stone-200 p-1 rounded-sm gap-1">
              {[
                { id: "newest", label: "Year Matrix" },
                { id: "price-low", label: "Price Asc" },
                { id: "price-high", label: "Price Desc" },
                { id: "mileage", label: "Mileage Asc" }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setSortBy(btn.id)}
                  className={`px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                    sortBy === btn.id ? "bg-stone-900 text-white shadow-sm" : "text-stone-605 hover:text-stone-900"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-[#F4F1EA] text-[10px] font-sans font-bold uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
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

          {sortedVehicles.length === 0 ? (
            <div className="bg-[#FAF8F5] border border-stone-300 py-16 text-center">
              <Sparkles className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-serif font-black text-stone-800 mb-1">No specimens found</h3>
              <p className="text-stone-500 text-xs max-w-sm mx-auto">Try lowering criteria specifications or click reset parameters.</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {displayedVehicles.map((car, idx) => {
                  const isFav = favorites.includes(car.id);
                  return (
                    <motion.div
                      key={car.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 80, damping: 14, delay: (idx % 6) * 0.05 }}
                      whileHover={{ scale: 1.025, y: -4, transition: { type: "spring", stiffness: 350, damping: 25 } }}
                      whileTap={{ scale: 0.97 }}
                      className="bg-[#FAF8F5] border border-stone-900/15 overflow-hidden flex flex-col group transition cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="relative h-56 overflow-hidden bg-stone-150 grayscale-20 group-hover:grayscale-0 transition-all duration-300">
                        <img
                          src={car.image}
                          alt={car.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                          }}
                        />
                        
                        {car.badge && (
                          <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-stone-900 text-[#F4F1EA] text-[9px] font-sans font-bold uppercase tracking-wider border border-[#F4F1EA]/20">
                            {car.badge}
                          </span>
                        )}

                        <button
                          onClick={() => toggleFavorite(car.id)}
                          className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition border ${
                            isFav
                              ? "bg-stone-950 text-white border-stone-950"
                              : "bg-white/80 text-stone-700 hover:text-stone-950 hover:bg-white border-stone-200"
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isFav ? "fill-white" : ""}`} />
                        </button>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-mono tracking-widest text-[#777777] block uppercase mb-1">REF #AW0{car.id}</span>
                          <h3 className="text-xl font-serif font-black text-stone-950 mb-3 cursor-pointer" onClick={() => onQuickView(car)}>
                            {car.title}
                          </h3>
                          
                          <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-stone-200 text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-4">
                            <div>
                              <span className="text-stone-400 block text-[9px] uppercase font-light">Mileage</span>
                              <span className="text-stone-900 font-bold">{car.mileage}</span>
                            </div>
                            <div>
                              <span className="text-stone-400 block text-[9px] uppercase font-light">Displace</span>
                              <span className="text-stone-900 font-bold">{car.fuel}</span>
                            </div>
                            <div>
                              <span className="text-stone-400 block text-[9px] uppercase font-light">Gearbox</span>
                              <span className="text-stone-900 font-bold text-[9px] truncate block">{car.transmission}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2.5">
                          <div>
                            <span className="text-xs text-stone-400 block uppercase font-light font-sans">Valuation</span>
                            <span className="text-2xl font-serif font-black text-stone-950">₹{car.price.toLocaleString("en-IN")}</span>
                          </div>
                          <button
                            onClick={() => onQuickView(car)}
                            className="px-4 py-2.5 bg-stone-950 hover:bg-stone-850 text-[#F4F1EA] text-xs font-sans uppercase font-bold tracking-widest border border-stone-950 transition"
                          >
                            View Dossier
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Padlock status module if has not paid pass and database contains hidden elements */}
              {sortedVehicles.length > 3 && !hasPaidPass && (
                <div className="mt-12 bg-[#FAF8F5] border border-stone-400 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
                  <div className="w-12 h-12 bg-stone-950 text-[#F4F1EA] flex items-center justify-center mx-auto">
                    <Lock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-black uppercase text-stone-950 tracking-tight">Plus {sortedVehicles.length - 3} More Specimens Catalogued</h3>
                    <p className="text-xs text-stone-605 max-w-md mx-auto pt-1 leading-relaxed">
                      You are viewing the first 3 car listings completely free. Activate our secure ₹1 buyer pass to reveal all remaining catalog entries and direct broker contact registries inside your account.
                    </p>
                  </div>
                  
                  {currentUser ? (
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

      {/* DETAILED DAILY PERMIT INLET MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
          <div className="bg-[#F4F1EA] border-2 border-stone-900 w-full max-w-lg shadow-2xl relative max-h-[95vh] overflow-y-auto animate-in fade-in-0 slide-in-from-bottom-12 zoom-in-95 duration-300 ease-out p-6 sm:p-8">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-stone-900 hover:text-stone-605 font-mono text-lg cursor-pointer"
            >
              [✕]
            </button>
            
            <div className="text-center pb-6 border-b border-stone-300">
              <Lock className="w-10 h-10 mx-auto mb-3 text-stone-900" />
              <h2 className="text-2xl font-serif font-black tracking-tight uppercase text-stone-950">Purchase Premium Pass</h2>
              <p className="text-xs text-stone-600 uppercase tracking-widest mt-1 font-bold">Unlocking verified coordinates & technical specs</p>
            </div>

            <div className="py-6 space-y-6">
              
              {/* Daily Access Pass Card */}
              <div className="bg-[#FAF8F5] border border-stone-300 p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-stone-900 text-[#F4F1EA] flex items-center justify-center text-xs shrink-0 font-bold uppercase tracking-wider">
                  Pass
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-stone-900">Standard Buyer Pass</h3>
                  <div className="text-2xl font-serif font-black text-stone-950 mt-0.5">₹1 <span className="text-xs text-stone-500 font-light">/ 24-hours access pass</span></div>
                  <ul className="text-[10px] text-stone-600 space-y-0.5 mt-2 list-disc list-inside uppercase tracking-wider font-bold">
                    <li>Query complete engine checklists</li>
                    <li>Access direct seller tele-contacts</li>
                    <li>Add elements to historic briefcase</li>
                  </ul>
                </div>
              </div>

              {/* Payment input elements */}
              <form onSubmit={handleProceedPayment} className="space-y-4">
                <div className="p-5 bg-[#FAF8F5] border border-stone-300 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2">
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-widest">Debit / Credit credentials</h4>
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest italic">Encrypted</span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Card identification number</label>
                      <input
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        onDoubleClick={handleCheatAutoFill}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-xs font-mono tracking-widest focus:outline-none focus:border-stone-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Expiration</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          maxLength={5}
                          required
                          className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">CVV code</label>
                        <input
                          type="password"
                          placeholder="CVV"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          maxLength={3}
                          required
                          className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-xs focus:outline-none focus:border-stone-900 text-center font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Holder Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="modal-agree"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                    className="mt-1 w-4 h-4 text-stone-900 accent-stone-900 border-stone-300 focus:ring-0"
                  />
                  <label htmlFor="modal-agree" className="text-[10px] text-stone-700 font-bold uppercase tracking-widest leading-relaxed cursor-pointer select-none">
                    Unconditionally agree to authorize singular transfer of ₹1.
                  </label>
                </div>

                {/* Double click helper prompt */}
                <div className="bg-[#E0DBCF] text-stone-8 font-sans p-3 border border-stone-400 text-[10px] font-bold uppercase tracking-wider leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-stone-900" />
                  <span>
                    Auto-Fill Trigger: Double-click Card identification number field to instantly populate standard test credentials.
                  </span>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-950 text-xs font-bold uppercase tracking-widest cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isPaying}
                    className="flex-2 py-3 bg-stone-900 text-[#F4F1EA] text-xs font-bold uppercase tracking-widest hover:bg-stone-850 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isPaying ? (
                      <>Processing Inflow...</>
                    ) : (
                      <>Accept & Unlock Database</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-to-top"
            initial={{ opacity: 0, y: 50, scale: 0.85, rotate: -3 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 35, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 350, damping: 24 }}
            whileHover={{ 
              scale: 1.05,
              y: -4,
            }}
            whileTap={{ scale: 0.96 }}
            onClick={scrollToTop}
            id="scroll-to-top-btn"
            className="fixed bottom-8 right-8 z-50 flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF8F5] text-stone-900 border border-stone-300 shadow-xl font-sans font-extrabold uppercase tracking-widest text-[9px] cursor-pointer rounded-none group select-none hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all duration-200"
            title="Scroll to Top"
          >
            <ArrowUp className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 shrink-0" />
            <span className="hidden sm:inline">Back to Top</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
