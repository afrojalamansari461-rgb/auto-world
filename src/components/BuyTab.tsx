import React, { useState, useEffect } from "react";
import { Search, MapPin, Gauge, DollarSign, Calendar, Lock, Clock, Heart, Eye, Filter, Sparkles, User, Mail, Phone, Info, RefreshCw, Star, TrendingUp, BarChart3, LineChart as LucideLineChart, Scale, CheckCircle2, ArrowUp, MessageCircle, Sliders, Check, Zap, Compass } from "lucide-react";
import { Vehicle, DEFAULT_VEHICLES, UserListing } from "../types";
import { SkeletonLoader } from "./SkeletonLoader";
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

  // Smart Matcher States
  const [isVizHubExpanded, setIsVizHubExpanded] = useState(true);
  const [userBudget, setUserBudget] = useState<number>(15); // Budget in Lakhs
  const [selectedPreference, setSelectedPreference] = useState<string>("All"); // All, SUV, Hatchback, Sedan, Luxury, Motorcycle
  const [usagePriority, setUsagePriority] = useState<string>("balanced"); // balanced, economy, family, performance, adventure

  // Dynamic lists
  const [inventoryList, setInventoryList] = useState<Vehicle[]>([]);

  // STEP 1: Check Payment Access Status
  useEffect(() => {
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
  }, [subscriptionActive, currentUser]);

  // STEP 2: Timer calculations
  const updateTimerText = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    setCountdownText(`${hours}h ${minutes.toString().padStart(2, "0")}m remaining`);
  };

  // STEP 3: Load listings combining both hardcoded assets & localStorage & Firestore collections
  useEffect(() => {
    const fetchAllListings = async () => {
      setIsLoading(true);
      let defaultData = [...DEFAULT_VEHICLES];
      
      // Fetch showcase vehicles from custom API
      try {
        const response = await fetch("/api/vehicles");
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.vehicles)) {
            defaultData = data.vehicles;
          }
        }
      } catch (e) {
        console.warn("Showcase API fetch failed, falling back to compiled list:", e);
      }

      try {
        const hiddenStr = localStorage.getItem("autoWorld_hidden_defaults");
        if (hiddenStr) {
          const hiddenIds = JSON.parse(hiddenStr);
          if (Array.isArray(hiddenIds)) {
            defaultData = defaultData.filter(v => !hiddenIds.includes(v.id));
          }
        }
      } catch (e) {
        console.error("Failed to parse hidden default vehicles:", e);
      }

      try {
        const removedStr = localStorage.getItem("autoWorld_removed_defaults");
        if (removedStr) {
          const removedIds = JSON.parse(removedStr);
          if (Array.isArray(removedIds)) {
            defaultData = defaultData.filter(v => !removedIds.includes(v.id));
          }
        }
      } catch (e) {
        console.error("Failed to parse removed default vehicles:", e);
      }

      // Read default vehicle custom badges from local overrides
      try {
        const badgesStr = localStorage.getItem("autoWorld_default_badges");
        if (badgesStr) {
          const badgesMap = JSON.parse(badgesStr);
          if (badgesMap && typeof badgesMap === "object") {
            defaultData = defaultData.map(v => {
              const customBadge = badgesMap[v.id];
              return {
                ...v,
                badge: customBadge !== undefined ? customBadge : v.badge
              };
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse custom default badges:", e);
      }

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
          const lData = docSnap.data() as UserListing;
          if (lData.status === "active" || lData.status === undefined) {
            userListings.push(lData);
          }
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
              if (localItem.status === "active" || localItem.status === undefined) {
                userListings.push(localItem);
              }
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
          badge: listing.verified ? "verified" : listing.featured ? "premium" : listing.urgent ? "hot" : null,
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
          regNumber: listing.regNumber
        };
      });

      setInventoryList([...defaultData, ...compiledUserVehicles]);
      setIsLoading(false);
    };

    fetchAllListings();

    const handleUpdate = () => {
      fetchAllListings();
    };
    window.addEventListener("autoWorld_db_update", handleUpdate);
    return () => window.removeEventListener("autoWorld_db_update", handleUpdate);
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
    const list = inventoryList.length > 0 ? inventoryList : DEFAULT_VEHICLES;
    
    const scoredList = list.map(car => {
      // 1. Budget Score (price is in actual INR, so convert budget from Lakhs to actual value)
      const carPriceLakhs = car.price / 100000;
      let budgetScore = 100;
      
      if (carPriceLakhs > userBudget) {
        // Car is more expensive than budget
        const overPercent = (carPriceLakhs - userBudget) / userBudget;
        if (overPercent <= 0.15) {
          budgetScore = 100 - (overPercent / 0.15) * 40; // scale down to 60
        } else if (overPercent <= 0.4) {
          budgetScore = 60 - ((overPercent - 0.15) / 0.25) * 40; // scale down to 20
        } else {
          budgetScore = Math.max(0, 20 - ((overPercent - 0.4) / 0.6) * 20); // scale down to 0
        }
      } else {
        // Car is cheaper than budget (under budget)
        const underPercent = (userBudget - carPriceLakhs) / userBudget;
        if (underPercent > 0.6) {
          budgetScore = 80; // easily affordable but maybe too small for this high budget
        }
      }
      
      // 2. Category/Preference Score
      let categoryScore = 100;
      if (selectedPreference !== "All") {
        const titleL = car.title.toLowerCase();
        const makeL = car.make.toLowerCase();
        const modelL = (car.model || "").toLowerCase();
        const catL = (car.category || "").toLowerCase();
        
        let matchesType = false;
        if (selectedPreference === "SUV") {
          matchesType = titleL.includes("suv") || catL.includes("suv") || titleL.includes("thar") || titleL.includes("fortuner") || titleL.includes("nexon") || titleL.includes("creta");
        } else if (selectedPreference === "Hatchback") {
          matchesType = titleL.includes("hatchback") || catL.includes("hatchback") || titleL.includes("swift") || titleL.includes("baleno") || titleL.includes("i20") || titleL.includes("polo");
        } else if (selectedPreference === "Sedan") {
          matchesType = titleL.includes("sedan") || catL.includes("sedan") || titleL.includes("city") || titleL.includes("verna") || titleL.includes("slavia") || titleL.includes("civic");
        } else if (selectedPreference === "Luxury") {
          matchesType = carPriceLakhs > 22 || titleL.includes("audi") || titleL.includes("bmw") || titleL.includes("mercedes") || titleL.includes("fortuner");
        } else if (selectedPreference === "Motorcycle") {
          matchesType = catL.includes("motorcycle") || catL.includes("bike") || titleL.includes("classic") || titleL.includes("bullet") || titleL.includes("royal enfield") || titleL.includes("triumph");
        }
        
        categoryScore = matchesType ? 100 : 25;
      }
      
      // 3. Usage Priority Score
      let usageScore = 100;
      const titleLower = car.title.toLowerCase();
      const fuelLower = car.fuel.toLowerCase();
      const featuresStr = (car.features || []).join(" ").toLowerCase();
      
      if (usagePriority === "economy") {
        const isManual = car.transmission.toLowerCase().includes("manual");
        const isGoodFuel = fuelLower.includes("petrol") || fuelLower.includes("cng") || fuelLower.includes("hybrid");
        let score = 100;
        if (carPriceLakhs > 15) score -= 40;
        if (!isManual) score -= 15;
        if (!isGoodFuel) score -= 15;
        usageScore = Math.max(30, score);
      } else if (usagePriority === "family") {
        const isBig = titleLower.includes("suv") || titleLower.includes("sedan") || titleLower.includes("fortuner") || titleLower.includes("nexon") || titleLower.includes("thar") || car.transmission.toLowerCase().includes("automatic");
        const hasSafety = featuresStr.includes("airbag") || featuresStr.includes("safety") || featuresStr.includes("sensor") || featuresStr.includes("camera") || featuresStr.includes("control");
        let score = 70;
        if (isBig) score += 15;
        if (hasSafety) score += 15;
        usageScore = score;
      } else if (usagePriority === "performance") {
        const isAutomatic = car.transmission.toLowerCase().includes("automatic");
        const isPremium = carPriceLakhs > 15 || titleLower.includes("audi") || titleLower.includes("bmw") || titleLower.includes("mercedes") || titleLower.includes("fortuner") || titleLower.includes("thar");
        let score = 60;
        if (isAutomatic) score += 20;
        if (isPremium) score += 20;
        usageScore = score;
      } else if (usagePriority === "adventure") {
        const isAdventurous = titleLower.includes("4x4") || titleLower.includes("thar") || titleLower.includes("off-road") || titleLower.includes("fortuner") || titleLower.includes("suv") || titleLower.includes("adventure");
        const isDiesel = fuelLower.includes("diesel");
        let score = 60;
        if (isAdventurous) score += 25;
        if (isDiesel) score += 15;
        usageScore = score;
      }
      
      // Calculate weighted combination
      const totalScore = Math.round((budgetScore * 0.5) + (categoryScore * 0.3) + (usageScore * 0.2));
      
      return {
        car,
        score: totalScore,
        reasons: {
          budget: carPriceLakhs <= userBudget 
            ? `Fits easily in budget (₹${(userBudget - carPriceLakhs).toFixed(1)}L spare)` 
            : `₹${(carPriceLakhs - userBudget).toFixed(1)}L stretch over budget`,
          preference: categoryScore === 100 ? `Matches ${selectedPreference} preference` : `Fallback selection`,
          usage: usagePriority === "economy" && carPriceLakhs < 15 ? "High Fuel-Efficiency Value"
                 : usagePriority === "family" && (titleLower.includes("suv") || titleLower.includes("sedan")) ? "Spacious Family Cruiser"
                 : usagePriority === "performance" && car.transmission.toLowerCase().includes("automatic") ? "Smooth Automatic Performance"
                 : usagePriority === "adventure" && (titleLower.includes("4x4") || titleLower.includes("thar")) ? "Off-road Capable Companion"
                 : "Versatile Daily Commuter"
        }
      };
    });
    
    // Sort recommendations: highest compatibility score first, then cheaper first (as tie-breaker)
    return scoredList
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.car.price - b.car.price;
      })
      .slice(0, 3);
  };

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
    if (!currentUser || currentUser.isAnonymous) {
      showToast("Registered account required. Please sign in with Google or Email first to purchase a Buyer Pass.", "error");
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
      className="bg-[#F4F1EA] text-[#1A1A1A] min-h-screen py-12 relative font-sans"
    >
      
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

      <motion.div variants={itemVariants} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

                    {/* Computed Blueprint Card */}
                    <div className="mt-4 bg-white border border-stone-250 p-4 shadow-sm space-y-3">
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
                    </div>
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
        ) : (
          <div className="mb-12 bg-[#FAF8F5] border border-stone-300 shadow-sm overflow-hidden">
            <div className="bg-stone-900 text-[#FAF8F5] px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-850">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <Zap className="w-5 h-5 animate-pulse text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-sans uppercase tracking-[0.2em] font-black text-[#FAF8F5]">Smart Matcher Engine</h2>
                  <p className="text-[9px] text-stone-400 font-mono tracking-widest uppercase">Input your target criteria for real-time model recommendations</p>
                </div>
              </div>
              <button
                onClick={() => setIsVizHubExpanded(!isVizHubExpanded)}
                className="text-xs font-mono py-1.5 px-3 bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 font-bold uppercase transition select-none cursor-pointer"
              >
                {isVizHubExpanded ? "[−] Minimize Engine" : "[+] Reveal Engine"}
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
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="space-y-3.5"
                          >
                            {getSmartRecommendations().map((item, idx) => (
                              <div
                                key={item.car.id}
                                className="bg-white p-3 border border-stone-250 shadow-xs hover:shadow-sm hover:border-stone-400 transition-all rounded-xs space-y-2 relative overflow-hidden"
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
                                    ₹{(item.car.price / 100000).toFixed(2)} Lakhs
                                  </span>
                                </div>

                                <div className="flex gap-3 items-center">
                                  <div className="w-14 h-11 bg-stone-100 border border-stone-250 overflow-hidden shrink-0">
                                    <img
                                      src={item.car.image}
                                      alt={item.car.title}
                                      className="w-full h-full object-cover"
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
                                    <span className="text-amber-605 shrink-0 select-none">⚡</span>
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
                                  <span>Focus Listing Specimen</span>
                                  <ArrowUp className="w-3 h-3 rotate-90 shrink-0" />
                                </button>
                              </div>
                            ))}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* FILTERS TOOLBAR PANEL */}
        <div id="inventory-catalog-start" className="bg-[#FAF8F5] border border-stone-300 p-6 sm:p-8 mb-10">
          <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
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
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                  {displayedVehicles.map((car, idx) => {
                    const isFav = favorites.includes(car.id);
                    return (
                      <motion.div
                        key={car.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{
                          type: "spring",
                          stiffness: 90,
                          damping: 15,
                          delay: (idx % 3) * 0.06,
                          layout: { type: "spring", stiffness: 180, damping: 25 }
                        }}
                        whileHover={{ scale: 1.025, y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onQuickView(car)}
                        className={`bg-[#FAF8F5] border overflow-hidden flex flex-col group transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:border-stone-400 ${
                          car.badge === "premium" ? "border-amber-500/60 ring-1 ring-amber-500/20" : "border-stone-900/15"
                        }`}
                      >
                      <div className="relative h-56 overflow-hidden bg-stone-150 grayscale-20 group-hover:grayscale-0 transition-all duration-300">
                        <img
                          src={car.image}
                          alt={car.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                          }}
                        />
                        
                        {car.badge === "premium" && (
                          <span className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-stone-900 text-[#FAF8F5] text-[9px] font-sans font-black uppercase tracking-widest border border-amber-400 flex items-center gap-1.5 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            Premium Featured
                          </span>
                        )}

                        {car.badge === "hot" && (
                          <span className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-stone-900 text-[#FAF8F5] text-[9px] font-sans font-black uppercase tracking-widest border border-red-500 flex items-center gap-1.5 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                            Hot Urgent
                          </span>
                        )}

                        {car.badge === "verified" && (
                          <span className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-stone-950 text-white text-[9px] font-sans font-black uppercase tracking-widest border border-purple-400/85 flex items-center gap-1.5 shadow-[0_0_12px_rgba(192,132,252,0.65)]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 animate-pulse shrink-0" />
                            Verified Specimen
                          </span>
                        )}

                        {car.badge && car.badge !== "premium" && car.badge !== "hot" && car.badge !== "verified" && (
                          <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-stone-900 text-[#F4F1EA] text-[9px] font-sans font-bold uppercase tracking-wider border border-[#F4F1EA]/20">
                            {car.badge}
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(car.id);
                          }}
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
                          <h3 className="text-xl font-serif font-black text-stone-950 mb-3 cursor-pointer">
                            {car.title}
                          </h3>
                          
                          <div className="w-full grid grid-cols-3 gap-2 py-2.5 border-y border-stone-200 text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-4">
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

                        <div className="flex items-center justify-between pt-2.5 gap-2">
                          <div>
                            <span className="text-xs text-stone-400 block uppercase font-light font-sans">Valuation</span>
                            <span className="text-lg sm:text-xl font-serif font-black text-stone-950 block leading-tight">₹{car.price.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => onQuickView(car)}
                              className="px-3 py-2 bg-stone-950 hover:bg-stone-850 text-[#F4F1EA] text-[10px] font-sans uppercase font-bold tracking-widest border border-stone-950 transition-all cursor-pointer"
                              title="View dossier & specifications"
                            >
                              Dossier
                            </button>
                            <a
                              href={`https://wa.me/${(car.sellerPhone || '+91 98230 44556').replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(
                                `Hi! I'm interested in the vehicle you listed on Auto World:\n\n` +
                                `🚗 *${car.title}*\n` +
                                `• Price: ₹${car.price.toLocaleString("en-IN")}\n` +
                                `• Mileage: ${car.mileage}\n` +
                                `• Ref Code: AW-${car.id}\n\n` +
                                `Is this still available for direct inspection or purchase discussion?`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetch("/api/send-sms-alert", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    sellerPhone: car.sellerPhone || '+91 98230 44556',
                                    vehicleTitle: car.title,
                                    listingId: car.id,
                                    buyerName: "A vetted buyer",
                                    actionType: "whatsapp"
                                  })
                                }).catch(err => console.error(err));
                              }}
                              className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-sans uppercase font-bold tracking-widest transition-all flex items-center gap-1 border border-emerald-600 hover:border-emerald-700 cursor-pointer shadow-sm"
                              title="Contact seller instantly via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 shrink-0 text-white" />
                              WhatsApp
                            </a>
                          </div>
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
      </motion.div>

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

                    <div className="w-full grid grid-cols-2 gap-3.5">
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
            initial={{ opacity: 0, y: 50, scale: 0.85, rotate: -4 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 35, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            whileHover={{ 
              scale: 1.1,
              y: -5,
            }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToTop}
            id="scroll-to-top-btn"
            className="fixed bottom-24 right-6 z-50 flex items-center justify-center w-11 h-11 bg-stone-950 text-white border border-purple-400/85 shadow-[0_0_12px_rgba(192,132,252,0.5)] hover:shadow-[0_0_22px_rgba(192,132,252,0.9)] cursor-pointer rounded-none group select-none hover:bg-stone-900 hover:border-purple-300 transition-all duration-300"
            title="Scroll to Top"
          >
            <div className="relative overflow-hidden w-4 h-4 flex items-center justify-center shrink-0">
              <ArrowUp className="w-4 h-4 absolute transition-all duration-300 group-hover:-translate-y-6 text-white" />
              <ArrowUp className="w-4 h-4 absolute translate-y-6 transition-all duration-300 group-hover:translate-y-0 text-white" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
