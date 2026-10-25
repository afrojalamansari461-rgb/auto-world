import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Repeat, ArrowLeftRight, Calculator, Plus, CheckCircle2, 
  AlertCircle, ShieldCheck, Sparkles, Filter, ChevronRight, 
  Car, User, Phone, Mail, MapPin, Fuel, Gauge, DollarSign, 
  ThumbsUp, X, Send, Award, Info, RefreshCw, Search,
  TrendingUp, Check, Clock, Eye, Layers, Lock, LogIn, 
  Share2, MessageCircle, FileText, CheckCircle, Scale, Printer
} from "lucide-react";
import { ExchangeRequest, TradeOffer, DEFAULT_EXCHANGES, OfferedTradeVehicle, UserListing } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc, getDocs, deleteDoc } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";
import { UserRole } from "../lib/userRoles";
import { ExchangeListingWizard } from "./ExchangeListingWizard";
import { ExchangeEqualizerModal } from "./ExchangeEqualizerModal";
import { TradeAgreementModal } from "./TradeAgreementModal";

interface ExchangeTabProps {
  currentUser: FirebaseUser | null;
  userRole?: UserRole;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onSignInClick: () => void;
  onNavigateToSell?: () => void;
  initialMode?: "browse_matcher" | "calculator" | "create_exchange" | "my_trades";
}

export default function ExchangeTab({
  currentUser,
  userRole,
  showToast,
  onSignInClick,
  onNavigateToSell,
  initialMode = "browse_matcher"
}: ExchangeTabProps) {
  const [exchanges, setExchanges] = useState<ExchangeRequest[]>(() => {
    try {
      const stored = localStorage.getItem("autoworld_exchanges_data");
      return stored ? JSON.parse(stored) : DEFAULT_EXCHANGES;
    } catch (e) {
      return DEFAULT_EXCHANGES;
    }
  });

  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>([]);
  const [activeTabMode, setActiveTabMode] = useState<"browse_matcher" | "calculator" | "create_exchange" | "my_trades">(initialMode);
  
  // Modals
  const [selectedExchangeForDossier, setSelectedExchangeForDossier] = useState<ExchangeRequest | null>(null);
  const [selectedExchangeForOffer, setSelectedExchangeForOffer] = useState<ExchangeRequest | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedExchangeForEqualizer, setSelectedExchangeForEqualizer] = useState<ExchangeRequest | null>(null);
  const [isEqualizerModalOpen, setIsEqualizerModalOpen] = useState(false);
  const [selectedExchangeForAgreement, setSelectedExchangeForAgreement] = useState<ExchangeRequest | null>(null);
  const [selectedOfferForAgreement, setSelectedOfferForAgreement] = useState<TradeOffer | null>(null);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);

  // Search and Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMake, setFilterMake] = useState<string>("all");
  const [filterDirection, setFilterDirection] = useState<string>("all");
  const [filterBodyType, setFilterBodyType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"latest" | "valuation_high" | "valuation_low" | "delta_low">("latest");

  // User's existing cars from localStorage/Firestore (for 1-click select in offer modal)
  const [userSavedListings, setUserSavedListings] = useState<UserListing[]>([]);

  // Offer Submission Form State
  const [offerSelectedCarId, setOfferSelectedCarId] = useState<string>("custom");
  const [myCarTitle, setMyCarTitle] = useState("");
  const [myCarMake, setMyCarMake] = useState("");
  const [myCarModel, setMyCarModel] = useState("");
  const [myCarYear, setMyCarYear] = useState(2022);
  const [myCarValuationLakhs, setMyCarValuationLakhs] = useState<number>(25.0);
  const [myCarMileage, setMyCarMileage] = useState("18,000 km");
  const [myCarFuel, setMyCarFuel] = useState("Petrol");
  const [myCarTransmission, setMyCarTransmission] = useState("Automatic");
  const [myCarImage, setMyCarImage] = useState("https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80");
  const [tradeNote, setTradeNote] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  // Standalone Calculator State
  const [calcMyMake, setCalcMyMake] = useState("Mahindra Thar 4x4");
  const [calcMyValuationLakhs, setCalcMyValuationLakhs] = useState<number>(18.5);
  const [calcTargetMake, setCalcTargetMake] = useState("BMW 330i M-Sport");
  const [calcTargetValuationLakhs, setCalcTargetValuationLakhs] = useState<number>(42.0);

  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Load User Saved Listings from localStorage for 1-click trade offer selection
  useEffect(() => {
    try {
      const stored = localStorage.getItem("autoWorld_listings");
      if (stored) {
        const parsed: UserListing[] = JSON.parse(stored);
        if (currentUser && !currentUser.isAnonymous) {
          const userSpecific = parsed.filter(l => l.sellerEmail?.toLowerCase() === currentUser.email?.toLowerCase() || l.sellerUserId === currentUser.uid);
          setUserSavedListings(userSpecific.length > 0 ? userSpecific : parsed);
        } else {
          setUserSavedListings(parsed);
        }
      }
    } catch (e) {
      console.warn("User listings load error:", e);
    }
  }, [currentUser]);

  // Subscribe to real-time exchanges
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, "exchanges"), (snapshot) => {
        if (!snapshot.empty) {
          const loaded: ExchangeRequest[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push({ ...(docSnap.data() as ExchangeRequest), id: docSnap.id });
          });
          setExchanges(loaded);
          try {
            localStorage.setItem("autoworld_exchanges_data", JSON.stringify(loaded));
          } catch (e) {
            console.error(e);
          }
        } else {
          // Push initial presets if empty
          DEFAULT_EXCHANGES.forEach(async (exc) => {
            try {
              await setDoc(doc(db, "exchanges", exc.id), exc);
            } catch (err) {
              console.warn("Exchange preset sync notice:", err);
            }
          });
        }
      }, (error) => {
        console.warn("Exchanges snapshot notice:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore exchanges listener init:", e);
    }
  }, []);

  // Subscribe to real-time trade offers
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, "trade_offers"), (snapshot) => {
        if (!snapshot.empty) {
          const loaded: TradeOffer[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push({ ...(docSnap.data() as TradeOffer), id: docSnap.id });
          });
          setTradeOffers(loaded);
        }
      }, (error) => {
        console.warn("Trade offers snapshot notice:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Trade offers listener error:", e);
    }
  }, []);

  // Dynamic filter lists
  const availableMakes = useMemo(() => {
    const set = new Set<string>();
    exchanges.forEach(e => {
      if (e.offeredVehicle.make) set.add(e.offeredVehicle.make);
    });
    return Array.from(set).sort();
  }, [exchanges]);

  // Filtered & Sorted Exchange Items
  const filteredExchanges = useMemo(() => {
    let result = exchanges.filter((exc) => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = exc.offeredVehicle.title.toLowerCase().includes(q);
        const makeMatch = exc.offeredVehicle.make.toLowerCase().includes(q);
        const desiredMatch = (exc.desiredVehicle.targetMake || "").toLowerCase().includes(q) || (exc.desiredVehicle.targetModel || "").toLowerCase().includes(q);
        const locMatch = (exc.location || "").toLowerCase().includes(q);
        if (!titleMatch && !makeMatch && !desiredMatch && !locMatch) return false;
      }
      // Make Filter
      if (filterMake !== "all" && exc.offeredVehicle.make.toLowerCase() !== filterMake.toLowerCase()) {
        return false;
      }
      // Direction Filter
      if (filterDirection !== "all" && exc.cashDirection !== filterDirection) {
        return false;
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "valuation_high") return b.offeredVehicle.valuation - a.offeredVehicle.valuation;
      if (sortBy === "valuation_low") return a.offeredVehicle.valuation - b.offeredVehicle.valuation;
      if (sortBy === "delta_low") return a.cashDelta - b.cashDelta;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return result;
  }, [exchanges, searchQuery, filterMake, filterDirection, sortBy]);

  // My Exchange Listings
  const myExchangeListings = useMemo(() => {
    if (!currentUser || currentUser.isAnonymous) return [];
    return exchanges.filter(e => e.creatorUid === currentUser.uid || e.creatorEmail?.toLowerCase() === currentUser.email?.toLowerCase());
  }, [exchanges, currentUser]);

  // My Sent Trade Offers
  const mySentOffers = useMemo(() => {
    if (!currentUser || currentUser.isAnonymous) return [];
    return tradeOffers.filter(o => o.proposerUid === currentUser.uid || o.proposerEmail?.toLowerCase() === currentUser.email?.toLowerCase());
  }, [tradeOffers, currentUser]);

  // Offers Received on My Listings
  const myReceivedOffers = useMemo(() => {
    if (!currentUser || currentUser.isAnonymous) return [];
    const myListingIds = new Set(myExchangeListings.map(l => l.id));
    return tradeOffers.filter(o => myListingIds.has(o.exchangeRequestId) || o.targetCreatorUid === currentUser.uid);
  }, [tradeOffers, myExchangeListings, currentUser]);

  // Automated Delta Math Calculation
  const calculateDelta = (myValuation: number, targetValuation: number) => {
    const diff = myValuation - targetValuation;
    if (diff === 0) {
      return { 
        direction: "even_swap" as const, 
        amount: 0, 
        text: "Straight Even Swap (₹0 Delta)", 
        shortText: "Even Value Swap",
        proposerAction: "No cash transfer needed"
      };
    } else if (diff > 0) {
      return {
        direction: "proposer_receives" as const,
        amount: diff,
        text: `You Receive ₹${(diff / 100000).toFixed(2)} Lakhs in cash compensation`,
        shortText: `Receive ₹${(diff / 100000).toFixed(2)}L`,
        proposerAction: `Listing owner pays you ₹${(diff / 100000).toFixed(2)}L cash difference`
      };
    } else {
      return {
        direction: "proposer_pays" as const,
        amount: Math.abs(diff),
        text: `You Pay ₹${(Math.abs(diff) / 100000).toFixed(2)} Lakhs in cash difference`,
        shortText: `Pay ₹${(Math.abs(diff) / 100000).toFixed(2)}L`,
        proposerAction: `You add ₹${(Math.abs(diff) / 100000).toFixed(2)}L cash to complete trade`
      };
    }
  };

  // Open Offer Modal for specific exchange
  const handleOpenOfferModal = (exc: ExchangeRequest) => {
    setSelectedExchangeForOffer(exc);
    setIsOfferModalOpen(true);

    // If user has saved cars, auto-select first one
    if (userSavedListings.length > 0) {
      const first = userSavedListings[0];
      setOfferSelectedCarId(first.id);
      setMyCarTitle(first.title);
      setMyCarMake(first.make);
      setMyCarModel(first.model);
      setMyCarYear(Number(first.year) || 2022);
      setMyCarValuationLakhs(Number((first.price / 100000).toFixed(1)));
      setMyCarMileage(first.mileage || "15,000 km");
      setMyCarFuel(first.fuel || "Petrol");
      setMyCarTransmission(first.transmission || "Automatic");
      setMyCarImage(first.image || "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800");
    }
  };

  // Handle vehicle select in offer modal
  const handleSelectCarInOfferModal = (listingId: string) => {
    setOfferSelectedCarId(listingId);
    if (listingId === "custom") {
      setMyCarTitle("");
      setMyCarMake("");
      setMyCarModel("");
      setMyCarValuationLakhs(20.0);
    } else {
      const found = userSavedListings.find(l => l.id === listingId);
      if (found) {
        setMyCarTitle(found.title);
        setMyCarMake(found.make);
        setMyCarModel(found.model);
        setMyCarYear(Number(found.year) || 2022);
        setMyCarValuationLakhs(Number((found.price / 100000).toFixed(1)));
        setMyCarMileage(found.mileage || "15,000 km");
        setMyCarFuel(found.fuel || "Petrol");
        setMyCarTransmission(found.transmission || "Automatic");
        setMyCarImage(found.image || "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800");
      }
    }
  };

  // Submit Trade Offer against an existing listing
  const handleSendTradeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.isAnonymous) {
      onSignInClick();
      return;
    }
    if (!selectedExchangeForOffer) return;

    setIsSubmittingOffer(true);
    const myValuationInRupees = Math.round(myCarValuationLakhs * 100000);
    const deltaInfo = calculateDelta(myValuationInRupees, selectedExchangeForOffer.offeredVehicle.valuation);
    const offerId = `offer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newOffer: TradeOffer = {
      id: offerId,
      exchangeRequestId: selectedExchangeForOffer.id,
      targetCreatorUid: selectedExchangeForOffer.creatorUid,
      proposerUid: currentUser.uid,
      proposerName: currentUser.displayName || currentUser.email?.split("@")[0] || "Trade Proposer",
      proposerEmail: currentUser.email || "proposer@autoworld.in",
      proposerPhone: "+91 98200 11223",
      proposerVehicle: {
        title: myCarTitle || `${myCarYear} ${myCarMake} ${myCarModel}`,
        make: myCarMake || "Vehicle",
        model: myCarModel || "Model",
        year: Number(myCarYear),
        valuation: myValuationInRupees,
        mileage: myCarMileage,
        fuel: myCarFuel,
        condition: 5,
        image: myCarImage,
        transmission: myCarTransmission,
        description: tradeNote
      },
      calculatedDelta: deltaInfo.amount,
      cashDirection: deltaInfo.direction,
      cashOfferAmount: deltaInfo.amount,
      note: tradeNote || `Proposing swap of my ${myCarTitle} for your ${selectedExchangeForOffer.offeredVehicle.title}.`,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "trade_offers", offerId), newOffer);
      // Increment offer count on listing
      await updateDoc(doc(db, "exchanges", selectedExchangeForOffer.id), {
        offersCount: (selectedExchangeForOffer.offersCount || 0) + 1
      });

      setTradeOffers((prev) => [newOffer, ...prev]);
      setIsOfferModalOpen(false);
      
      if (showToast) {
        showToast(`🎉 Trade offer sent to ${selectedExchangeForOffer.creatorName}! (${deltaInfo.shortText})`, "success");
      }
    } catch (err: any) {
      console.warn("Trade offer sync error:", err);
      handleFirestoreError(err, OperationType.CREATE, `trade_offers/${offerId}`);
      if (showToast) {
        showToast("Trade offer submitted locally!", "info");
      }
      setIsOfferModalOpen(false);
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // Quick Status change on offer (Accept / Reject)
  const handleUpdateOfferStatus = async (offerId: string, newStatus: "accepted" | "rejected" | "countered") => {
    try {
      await updateDoc(doc(db, "trade_offers", offerId), { status: newStatus });
      setTradeOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: newStatus } : o));
      if (showToast) {
        showToast(`Trade proposal marked as ${newStatus.toUpperCase()}`, "success");
      }
    } catch (e) {
      console.warn("Update offer status error:", e);
    }
  };

  // Delete an exchange listing
  const handleDeleteExchange = async (id: string) => {
    if (!confirm("Are you sure you want to remove this exchange listing?")) return;
    try {
      await deleteDoc(doc(db, "exchanges", id));
      setExchanges(prev => prev.filter(e => e.id !== id));
      if (showToast) showToast("Exchange listing removed successfully.", "info");
    } catch (e) {
      console.warn("Delete exchange error:", e);
    }
  };

  return (
    <div id="exchange-tab-container" className="min-h-screen bg-[#F4F1EA] text-stone-900 pb-20 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-stone-950 text-white border-b-2 border-stone-900 relative overflow-hidden pt-10 pb-12 px-4 sm:px-6 lg:px-8 shadow-xl">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-900 border border-stone-800 text-stone-300 text-xs font-mono font-bold uppercase tracking-widest mb-3">
                <Repeat className="w-3.5 h-3.5 text-white" /> P2P Vehicle Exchange &amp; Value Delta Desk
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white uppercase">
                Direct Car Exchange <span className="text-stone-400">&amp; Fair Value Swap</span>
              </h1>
              <p className="mt-2 text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Skip dealership trade-in cuts. Swap your vehicle directly with verified owners across India. Our algorithmic engine automatically calculates exact cash deltas and provides dual RTO transfer compliance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTabMode("create_exchange")}
                className="px-5 py-3 bg-white hover:bg-stone-100 text-stone-950 font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] cursor-pointer transition active:scale-95"
              >
                <Plus className="w-4 h-4 text-stone-950" /> List My Car for Exchange
              </button>

              <button
                type="button"
                onClick={() => setActiveTabMode("calculator")}
                className="px-4 py-3 bg-stone-900 hover:bg-stone-850 text-stone-200 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-stone-700 cursor-pointer transition"
              >
                <Calculator className="w-4 h-4 text-stone-300" /> Delta Calculator
              </button>
            </div>
          </div>

          {/* Quick Value Metrics & Guarantees */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 pt-6 border-t border-stone-800 text-xs font-sans">
            <div className="p-3 bg-stone-900 border border-stone-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-stone-800 flex items-center justify-center text-white shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-[10px] font-mono uppercase">Automated Valuation</p>
                <p className="font-bold text-white text-xs">Real-Time Cash Delta</p>
              </div>
            </div>

            <div className="p-3 bg-stone-900 border border-stone-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-stone-800 flex items-center justify-center text-white shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-[10px] font-mono uppercase">RTO Legal Transfer</p>
                <p className="font-bold text-white text-xs">Dual Form 29/30 SOP</p>
              </div>
            </div>

            <div className="p-3 bg-stone-900 border border-stone-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-stone-800 flex items-center justify-center text-white shrink-0">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-[10px] font-mono uppercase">Direct Owner Trade</p>
                <p className="font-bold text-white text-xs">Zero Dealership Cuts</p>
              </div>
            </div>

            <div className="p-3 bg-stone-900 border border-stone-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-stone-800 flex items-center justify-center text-white shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-[10px] font-mono uppercase">Inspection Escrow</p>
                <p className="font-bold text-white text-xs">Physical Verification</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Mode Navigation Switcher Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-stone-950 p-1.5 border-2 border-stone-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] flex flex-wrap items-center justify-between gap-2 font-mono">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {/* Tab 1: Browse Matches */}
            <button
              type="button"
              onClick={() => setActiveTabMode("browse_matcher")}
              className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                activeTabMode === "browse_matcher"
                  ? "bg-white text-stone-950 font-black shadow-sm"
                  : "bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-850"
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Browse Swaps ({exchanges.length})</span>
            </button>

            {/* Tab 2: Delta Calculator */}
            <button
              type="button"
              onClick={() => setActiveTabMode("calculator")}
              className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                activeTabMode === "calculator"
                  ? "bg-white text-stone-950 font-black shadow-sm"
                  : "bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-850"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Value Delta Calculator</span>
            </button>

            {/* Tab 3: List Car for Swap */}
            <button
              type="button"
              onClick={() => setActiveTabMode("create_exchange")}
              className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                activeTabMode === "create_exchange"
                  ? "bg-white text-stone-950 font-black shadow-sm"
                  : "bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-850"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>List Car for Swap</span>
            </button>

            {/* Tab 4: My Trades Desk */}
            <button
              type="button"
              onClick={() => setActiveTabMode("my_trades")}
              className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer relative ${
                activeTabMode === "my_trades"
                  ? "bg-white text-stone-950 font-black shadow-sm"
                  : "bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-850"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>My Trade Desk</span>
              {(myExchangeListings.length > 0 || myReceivedOffers.length > 0) && (
                <span className="px-1.5 py-0.2 bg-stone-950 text-white font-mono text-[9px] font-black rounded-full border border-stone-700">
                  {myExchangeListings.length + myReceivedOffers.length}
                </span>
              )}
            </button>
          </div>

          {/* User Sign In Status Indicator */}
          <div className="flex items-center text-[10.5px] text-stone-400 px-3 py-1">
            {currentUser && !currentUser.isAnonymous ? (
              <span className="flex items-center gap-1.5 text-stone-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="truncate max-w-[160px]">{currentUser.displayName || currentUser.email}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onSignInClick}
                className="text-stone-300 hover:text-white underline cursor-pointer"
              >
                Sign In to Post / Trade
              </button>
            )}
          </div>
        </div>

        {/* =============================================================== */}
        {/* VIEW 1: BROWSE SWAP MATCHES (MARKETPLACE)                     */}
        {/* =============================================================== */}
        {activeTabMode === "browse_matcher" && (
          <div className="mt-6 space-y-6 animate-in fade-in duration-200">
            {/* Filter & Search Bar */}
            <div className="bg-[#FAF8F5] p-4 sm:p-5 border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by Make, Model, Desired Target, or City (e.g. BMW, Thar, Mumbai)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-300 text-stone-900 text-xs font-sans focus:outline-stone-900"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filterDirection}
                    onChange={(e) => setFilterDirection(e.target.value)}
                    className="p-2.5 bg-white border border-stone-300 text-xs font-mono text-stone-800 font-bold focus:outline-stone-900"
                  >
                    <option value="all">All Cash Delta Types</option>
                    <option value="pay_difference">▲ Owner Pays Difference (Upgrade)</option>
                    <option value="receive_difference">▼ Proposer Pays Difference (Downsize)</option>
                    <option value="even_swap">⚖ Even Value Swaps (₹0 Delta)</option>
                  </select>

                  <select
                    value={filterMake}
                    onChange={(e) => setFilterMake(e.target.value)}
                    className="p-2.5 bg-white border border-stone-300 text-xs font-mono text-stone-800 font-bold focus:outline-stone-900"
                  >
                    <option value="all">All Brands / Makes</option>
                    {availableMakes.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="p-2.5 bg-white border border-stone-300 text-xs font-mono text-stone-800 font-bold focus:outline-stone-900"
                  >
                    <option value="latest">Sort: Recently Listed</option>
                    <option value="valuation_high">Highest Valuation</option>
                    <option value="valuation_low">Lowest Valuation</option>
                    <option value="delta_low">Lowest Cash Delta</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Badges */}
              {(filterDirection !== "all" || filterMake !== "all" || searchQuery) && (
                <div className="flex items-center gap-2 pt-2 border-t border-stone-200 text-xs font-mono">
                  <span className="text-stone-500">Active Filters:</span>
                  {filterDirection !== "all" && (
                    <span className="px-2 py-0.5 bg-stone-900 text-white rounded text-[10px] flex items-center gap-1 font-bold">
                      {filterDirection.replace("_", " ").toUpperCase()}
                      <button onClick={() => setFilterDirection("all")}>✕</button>
                    </span>
                  )}
                  {filterMake !== "all" && (
                    <span className="px-2 py-0.5 bg-stone-900 text-white rounded text-[10px] flex items-center gap-1 font-bold">
                      {filterMake}
                      <button onClick={() => setFilterMake("all")}>✕</button>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="px-2 py-0.5 bg-stone-900 text-white rounded text-[10px] flex items-center gap-1 font-bold">
                      "{searchQuery}"
                      <button onClick={() => setSearchQuery("")}>✕</button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setFilterDirection("all");
                      setFilterMake("all");
                      setSearchQuery("");
                    }}
                    className="text-stone-700 hover:text-stone-950 underline text-[10px] ml-auto"
                  >
                    Reset All
                  </button>
                </div>
              )}
            </div>

            {/* Exchange Cards Grid */}
            {filteredExchanges.length === 0 ? (
              <div className="bg-[#FAF8F5] border-2 border-stone-400 p-12 text-center space-y-4">
                <Repeat className="w-12 h-12 text-stone-400 mx-auto" />
                <h3 className="text-lg font-serif font-bold text-stone-900 uppercase">No matching exchange listings found</h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto">
                  Try adjusting your search query or delta filter, or be the first to list your car for exchange in this category!
                </p>
                <button
                  onClick={() => setActiveTabMode("create_exchange")}
                  className="px-6 py-2.5 bg-stone-950 text-white text-xs font-mono font-bold uppercase shadow-md cursor-pointer"
                >
                  List My Car for Swap
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExchanges.map((exc) => {
                  const valuationLakhs = (exc.offeredVehicle.valuation / 100000).toFixed(2);
                  const cashDeltaLakhs = (exc.cashDelta / 100000).toFixed(2);

                  return (
                    <div
                      key={exc.id}
                      className="bg-white border-2 border-stone-900 shadow-[5px_5px_0px_0px_rgba(0,0,0,0.9)] flex flex-col justify-between overflow-hidden hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                      <div>
                        {/* Offered Car Showcase */}
                        <div className="relative aspect-video bg-stone-950 overflow-hidden border-b-2 border-stone-900 group">
                          <img
                            src={exc.offeredVehicle.image}
                            alt={exc.offeredVehicle.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-transparent pointer-events-none" />

                          {/* Top Badges */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-stone-950/90 text-white text-[9.5px] font-mono font-bold uppercase border border-stone-700">
                              Offered For Trade
                            </span>
                            {exc.badge && (
                              <span className={`px-2 py-0.5 text-[9px] font-mono font-black rounded uppercase ${
                                exc.badge === "hot" ? "bg-red-600 text-white" : "bg-white text-stone-950 font-bold"
                              }`}>
                                {exc.badge}
                              </span>
                            )}
                          </div>

                          {/* Location & Valuation Bar */}
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white font-mono">
                            <span className="text-xs font-black bg-stone-950/90 px-2 py-0.5 border border-stone-700">
                              Valuation: ₹{valuationLakhs}L
                            </span>
                            <span className="text-[10px] text-stone-300 flex items-center gap-1 bg-stone-950/80 px-2 py-0.5">
                              <MapPin className="w-3 h-3 text-stone-300" /> {exc.location}
                            </span>
                          </div>
                        </div>

                        {/* Specs & Description */}
                        <div className="p-4 sm:p-5 space-y-3">
                          <div>
                            <h3 className="font-serif font-black text-base text-stone-950 uppercase leading-snug">
                              {exc.offeredVehicle.title}
                            </h3>
                            <p className="text-[11px] font-mono text-stone-500 mt-0.5">
                              {exc.offeredVehicle.mileage} • {exc.offeredVehicle.fuel} • {exc.offeredVehicle.transmission || "Automatic"} • {exc.offeredVehicle.rtoCode || "RTO Verified"}
                            </p>
                          </div>

                          {/* Desired Target Box */}
                          <div className="p-3 bg-stone-100 border border-stone-300 space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-stone-700">
                              <ArrowLeftRight className="w-3 h-3 text-stone-900" />
                              <span>Looking to Trade For:</span>
                            </div>
                            <p className="text-xs font-bold text-stone-950">
                              {exc.desiredVehicle.targetMake} {exc.desiredVehicle.targetModel || ""}
                            </p>
                            {exc.desiredVehicle.notes && (
                              <p className="text-[11px] text-stone-600 italic line-clamp-2 mt-0.5">
                                "{exc.desiredVehicle.notes}"
                              </p>
                            )}
                          </div>

                          {/* Cash Delta Badge */}
                          <div className="p-2.5 bg-stone-950 text-white border border-stone-800 text-xs">
                            <span className="text-[9.5px] font-mono text-stone-400 uppercase font-bold block">
                              Economic Delta Terms:
                            </span>
                            <div className="font-bold text-white text-xs mt-0.5 flex items-center gap-1.5">
                              {exc.cashDirection === "pay_difference" && (
                                <span>▲ Owner pays up to ₹{cashDeltaLakhs}L cash difference</span>
                              )}
                              {exc.cashDirection === "receive_difference" && (
                                <span>▼ Proposer pays ~₹{cashDeltaLakhs}L cash difference</span>
                              )}
                              {exc.cashDirection === "even_swap" && (
                                <span>⚖ Straight Even Value Swap (₹0 Delta)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="p-4 pt-0 space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExchangeForEqualizer(exc);
                            setIsEqualizerModalOpen(true);
                          }}
                          className="w-full py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-500/40 text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center justify-center gap-1.5 rounded"
                          title="Open AI Trade Valuation Equalizer, Match Score & EMI Simulator"
                        >
                          <Scale className="w-3.5 h-3.5 text-amber-700" />
                          <span>AI Equalizer &amp; Match Matrix</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedExchangeForDossier(exc)}
                            className="py-2 px-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-mono font-bold uppercase border border-stone-300 transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Dossier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenOfferModal(exc)}
                            className="py-2 px-2 bg-stone-950 hover:bg-stone-850 text-white text-xs font-mono font-bold uppercase border border-stone-950 transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Repeat className="w-3.5 h-3.5 text-white" />
                            <span>Propose Swap</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =============================================================== */}
        {/* VIEW 2: INTERACTIVE VALUE DELTA & SAVINGS CALCULATOR           */}
        {/* =============================================================== */}
        {activeTabMode === "calculator" && (
          <div className="mt-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-stone-700 bg-stone-200 px-2.5 py-1 border border-stone-400 mb-2">
                  <Calculator className="w-3.5 h-3.5" /> Direct P2P Swap Math Engine
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-black uppercase text-stone-950">
                  Interactive Value Delta &amp; Middleman Savings Calculator
                </h2>
                <p className="text-stone-600 text-xs mt-1 max-w-2xl font-medium">
                  Compare two vehicles directly. Understand the cash delta required to balance the transaction, plus how much you save by cutting out dealership trade-in margins.
                </p>
              </div>

              {/* 2-Way Comparison Input Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Side A: Your Car */}
                <div className="p-5 bg-white border-2 border-stone-900 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="text-xs font-mono font-bold uppercase text-stone-800 flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-stone-900" /> Vehicle A (Your Car)
                    </span>
                    <span className="text-xs font-mono font-black text-stone-950">₹{calcMyValuationLakhs.toFixed(2)}L</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase text-stone-700 mb-1">
                      Vehicle Name / Make &amp; Model
                    </label>
                    <input
                      type="text"
                      value={calcMyMake}
                      onChange={(e) => setCalcMyMake(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-300 text-xs font-sans focus:outline-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase text-stone-700 mb-1">
                      Estimated Market Valuation: ₹{calcMyValuationLakhs.toFixed(2)} Lakhs
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="150"
                      step="0.5"
                      value={calcMyValuationLakhs}
                      onChange={(e) => setCalcMyValuationLakhs(Number(e.target.value))}
                      className="w-full h-2 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-stone-900"
                    />
                  </div>
                </div>

                {/* Side B: Target Car */}
                <div className="p-5 bg-white border-2 border-stone-900 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="text-xs font-mono font-bold uppercase text-stone-800 flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-stone-900" /> Vehicle B (Target Car)
                    </span>
                    <span className="text-xs font-mono font-black text-stone-950">₹{calcTargetValuationLakhs.toFixed(2)}L</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase text-stone-700 mb-1">
                      Target Vehicle Name / Make &amp; Model
                    </label>
                    <input
                      type="text"
                      value={calcTargetMake}
                      onChange={(e) => setCalcTargetMake(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-300 text-xs font-sans focus:outline-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase text-stone-700 mb-1">
                      Target Valuation: ₹{calcTargetValuationLakhs.toFixed(2)} Lakhs
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="150"
                      step="0.5"
                      value={calcTargetValuationLakhs}
                      onChange={(e) => setCalcTargetValuationLakhs(Number(e.target.value))}
                      className="w-full h-2 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-stone-900"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Delta Calculation Visualizer Box */}
              {(() => {
                const myRupees = calcMyValuationLakhs * 100000;
                const targetRupees = calcTargetValuationLakhs * 100000;
                const diff = targetRupees - myRupees;
                const absDiff = Math.abs(diff);
                const absLakhs = (absDiff / 100000).toFixed(2);
                
                // Typical dealership margin is 12-15% on trade-ins
                const dealerCutSaved = Math.round((myRupees + targetRupees) * 0.06);

                return (
                  <div className="p-6 bg-stone-950 text-white border-2 border-stone-950 space-y-4 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 uppercase font-bold tracking-widest">
                          Algorithmic Transaction Result
                        </span>
                        <h3 className="text-xl font-bold font-serif text-white uppercase mt-0.5">
                          {diff === 0 
                            ? "Even Value Swap (₹0 Delta)" 
                            : diff > 0 
                            ? `You Pay ₹${absLakhs} Lakhs to Upgrade` 
                            : `You Receive ₹${absLakhs} Lakhs in Cash`}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Estimated Savings</span>
                        <p className="text-base font-mono font-black text-emerald-400">
                          ₹{(dealerCutSaved / 100000).toFixed(2)}L Saved vs Dealership
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                      <div className="p-3 bg-stone-900 border border-stone-800">
                        <p className="text-stone-400 text-[10px]">Your Vehicle</p>
                        <p className="font-bold text-white mt-1 truncate">{calcMyMake}</p>
                        <p className="text-stone-300 text-sm font-black">₹{calcMyValuationLakhs.toFixed(2)}L</p>
                      </div>

                      <div className="p-3 bg-stone-900 border border-stone-800">
                        <p className="text-stone-400 text-[10px]">Cash Delta Compensation</p>
                        <p className="font-bold text-white mt-1">
                          {diff === 0 ? "Even Exchange" : diff > 0 ? "Owner Adds Cash" : "Owner Receives Cash"}
                        </p>
                        <p className="text-white text-sm font-black">
                          {diff === 0 ? "₹0.00" : `₹${absLakhs} Lakhs`}
                        </p>
                      </div>

                      <div className="p-3 bg-stone-900 border border-stone-800">
                        <p className="text-stone-400 text-[10px]">Target Vehicle</p>
                        <p className="font-bold text-white mt-1 truncate">{calcTargetMake}</p>
                        <p className="text-stone-300 text-sm font-black">₹{calcTargetValuationLakhs.toFixed(2)}L</p>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <p className="text-stone-400 text-[11px] font-sans">
                        ✓ Dual RTO NOC forms (Form 29 &amp; 30) prepared automatically during the exchange.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTabMode("create_exchange")}
                        className="px-5 py-2.5 bg-white text-stone-950 font-mono font-black uppercase text-xs cursor-pointer shadow-md hover:bg-stone-100 shrink-0"
                      >
                        List this Swap Request →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* VIEW 3: CREATE NEW EXCHANGE LISTING WIZARD                     */}
        {/* =============================================================== */}
        {activeTabMode === "create_exchange" && (
          <div className="mt-6 max-w-3xl mx-auto animate-in fade-in duration-200">
            <ExchangeListingWizard
              currentUser={currentUser}
              onSignInClick={onSignInClick}
              onSuccess={(newListing) => {
                setActiveTabMode("browse_matcher");
              }}
              onCancel={() => setActiveTabMode("browse_matcher")}
              showToast={showToast}
            />
          </div>
        )}

        {/* =============================================================== */}
        {/* VIEW 4: MY TRADE DESK & OFFERS                                */}
        {/* =============================================================== */}
        {activeTabMode === "my_trades" && (
          <div className="mt-6 space-y-6 animate-in fade-in duration-200">
            {(!currentUser || currentUser.isAnonymous) ? (
              <div className="bg-[#FAF8F5] border-2 border-stone-900 p-12 text-center space-y-4 max-w-2xl mx-auto shadow-md">
                <Lock className="w-12 h-12 text-stone-600 mx-auto" />
                <h3 className="text-xl font-serif font-black uppercase text-stone-950">
                  Seller Account Sign-In Required
                </h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto">
                  Sign in or create your free Auto World account to manage your trade listings, review incoming swap proposals, and track deal closures.
                </p>
                <button
                  onClick={onSignInClick}
                  className="px-6 py-3 bg-stone-950 text-white font-mono font-bold text-xs uppercase shadow-md cursor-pointer inline-flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-white" /> Sign In / Create Account
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. My Active Exchange Listings */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,0.9)] space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                    <div>
                      <h3 className="font-serif font-black text-lg text-stone-950 uppercase">
                        My Listed Vehicles for Trade ({myExchangeListings.length})
                      </h3>
                      <p className="text-xs text-stone-600">
                        Cars you have posted on the P2P match floor.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTabMode("create_exchange")}
                      className="px-3.5 py-2 bg-stone-950 text-white text-xs font-mono font-bold uppercase cursor-pointer"
                    >
                      + List Another
                    </button>
                  </div>

                  {myExchangeListings.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-stone-300 text-xs text-stone-500 font-mono">
                      You haven't listed any vehicle for trade yet. Click "+ List Another" to post your car.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myExchangeListings.map(item => (
                        <div key={item.id} className="p-4 bg-white border border-stone-400 space-y-3">
                          <div className="relative aspect-video bg-stone-900 overflow-hidden">
                            <img src={item.offeredVehicle.image} alt={item.offeredVehicle.title} className="w-full h-full object-cover" />
                            <span className="absolute top-2 left-2 bg-stone-950/90 text-white font-mono text-[9px] px-2 py-0.5 uppercase">
                              Active Listing
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-stone-950 uppercase">{item.offeredVehicle.title}</h4>
                            <p className="text-[11px] font-mono text-stone-500">
                              Valuation: ₹{(item.offeredVehicle.valuation / 100000).toFixed(2)}L • Offers: {item.offersCount || 0}
                            </p>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-stone-200 text-xs">
                            <button
                              onClick={() => setSelectedExchangeForDossier(item)}
                              className="text-stone-800 font-bold underline font-mono text-[11px]"
                            >
                              View Dossier
                            </button>
                            <button
                              onClick={() => handleDeleteExchange(item.id)}
                              className="text-red-600 hover:text-red-800 font-mono text-[11px]"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Received Proposals on My Listings */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,0.9)] space-y-4">
                  <div className="border-b border-stone-300 pb-3">
                    <h3 className="font-serif font-black text-lg text-stone-950 uppercase">
                      Incoming Trade Offers ({myReceivedOffers.length})
                    </h3>
                    <p className="text-xs text-stone-600">
                      Proposals sent by other car owners targeting your exchange listings.
                    </p>
                  </div>

                  {myReceivedOffers.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-stone-300 text-xs text-stone-500 font-mono">
                      No incoming trade proposals at this moment.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myReceivedOffers.map(offer => (
                        <div key={offer.id} className="p-4 bg-white border-2 border-stone-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <img src={offer.proposerVehicle.image} alt={offer.proposerVehicle.title} className="w-20 h-16 object-cover border border-stone-300 shrink-0" />
                            <div className="text-xs">
                              <span className="font-mono text-[10px] text-stone-500 uppercase">From {offer.proposerName} ({offer.proposerPhone})</span>
                              <h4 className="font-bold text-sm text-stone-950 uppercase">{offer.proposerVehicle.title}</h4>
                              <p className="text-stone-600 font-mono">
                                Valuation: ₹{(offer.proposerVehicle.valuation / 100000).toFixed(2)}L • {offer.proposerVehicle.mileage}
                              </p>
                              {offer.note && <p className="text-stone-600 italic mt-1 text-[11px]">"{offer.note}"</p>}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-end md:items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 text-xs font-mono font-bold uppercase rounded ${
                              offer.status === "accepted" ? "bg-emerald-100 text-emerald-800" :
                              offer.status === "rejected" ? "bg-red-100 text-red-800" : "bg-stone-200 text-stone-800"
                            }`}>
                              Status: {offer.status}
                            </span>
                            
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const parentExchange = exchanges.find(e => e.id === offer.exchangeId) || null;
                                  setSelectedExchangeForAgreement(parentExchange);
                                  setSelectedOfferForAgreement(offer);
                                  setIsAgreementModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-mono font-bold uppercase border border-stone-300 flex items-center gap-1 cursor-pointer"
                                title="Generate Certified Barter Legal Contract (Dual Form 29/30 SOP)"
                              >
                                <FileText className="w-3.5 h-3.5 text-stone-700" />
                                <span>Agreement</span>
                              </button>

                              {offer.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleUpdateOfferStatus(offer.id, "accepted")}
                                    className="px-3 py-1.5 bg-stone-950 text-white text-xs font-mono font-bold uppercase cursor-pointer"
                                  >
                                    Accept &amp; Schedule Inspection
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOfferStatus(offer.id, "rejected")}
                                    className="px-3 py-1.5 bg-stone-200 text-stone-800 text-xs font-mono font-bold uppercase cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =============================================================== */}
      {/* MODAL 1: FULL VEHICLE TRADE DOSSIER INSPECTION                 */}
      {/* =============================================================== */}
      <AnimatePresence>
        {selectedExchangeForDossier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF8F5] border-2 border-stone-900 max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6 text-stone-900 font-sans"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                <div className="flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-stone-950" />
                  <h3 className="text-lg font-serif font-black text-stone-950 uppercase">
                    Exchange Dossier: {selectedExchangeForDossier.offeredVehicle.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedExchangeForDossier(null)}
                  className="text-stone-500 hover:text-stone-950 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Showcase Image & Core Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative aspect-video bg-stone-950 overflow-hidden border-2 border-stone-900">
                  <img
                    src={selectedExchangeForDossier.offeredVehicle.image}
                    alt={selectedExchangeForDossier.offeredVehicle.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-stone-950/90 text-white font-mono text-xs px-2.5 py-1 font-bold">
                    Valuation: ₹{(selectedExchangeForDossier.offeredVehicle.valuation / 100000).toFixed(2)}L
                  </div>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 bg-white border border-stone-300 space-y-1">
                    <p className="text-stone-500 uppercase font-bold text-[10px]">Owner / Trade Partner</p>
                    <p className="text-sm font-bold text-stone-950">{selectedExchangeForDossier.creatorName}</p>
                    <p className="text-stone-600">{selectedExchangeForDossier.creatorPhone} • {selectedExchangeForDossier.location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-white border border-stone-300">
                      <span className="text-stone-500 text-[10px]">Odometer:</span>
                      <p className="font-bold text-stone-900">{selectedExchangeForDossier.offeredVehicle.mileage}</p>
                    </div>
                    <div className="p-2.5 bg-white border border-stone-300">
                      <span className="text-stone-500 text-[10px]">Fuel &amp; Gearbox:</span>
                      <p className="font-bold text-stone-900">{selectedExchangeForDossier.offeredVehicle.fuel} / {selectedExchangeForDossier.offeredVehicle.transmission || "AT"}</p>
                    </div>
                    <div className="p-2.5 bg-white border border-stone-300">
                      <span className="text-stone-500 text-[10px]">RTO Registration:</span>
                      <p className="font-bold text-stone-900">{selectedExchangeForDossier.offeredVehicle.rtoCode || "Pan-India"}</p>
                    </div>
                    <div className="p-2.5 bg-white border border-stone-300">
                      <span className="text-stone-500 text-[10px]">Condition:</span>
                      <p className="font-bold text-amber-600">★ {selectedExchangeForDossier.offeredVehicle.condition}/5 Showroom</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desired Target & Delta Breakdown */}
              <div className="p-4 bg-stone-950 text-white border border-stone-800 space-y-2">
                <span className="text-[10px] font-mono text-stone-400 uppercase font-bold">
                  Desired Swap Target &amp; Terms:
                </span>
                <p className="text-sm font-bold text-white">
                  Looking for: {selectedExchangeForDossier.desiredVehicle.targetMake} {selectedExchangeForDossier.desiredVehicle.targetModel || ""}
                </p>
                <div className="text-xs text-stone-300 pt-1 border-t border-stone-800 font-mono">
                  Delta: {selectedExchangeForDossier.cashDirection === "pay_difference" 
                    ? `Owner willing to pay up to ₹${(selectedExchangeForDossier.cashDelta / 100000).toFixed(2)}L cash difference` 
                    : selectedExchangeForDossier.cashDirection === "receive_difference"
                    ? `Proposer pays ~₹${(selectedExchangeForDossier.cashDelta / 100000).toFixed(2)}L cash difference`
                    : "Even Value Swap (₹0 Delta)"}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-stone-300">
                <button
                  type="button"
                  onClick={() => setSelectedExchangeForDossier(null)}
                  className="px-4 py-2 bg-stone-200 text-stone-800 text-xs font-mono font-bold uppercase cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const exc = selectedExchangeForDossier;
                    setSelectedExchangeForDossier(null);
                    handleOpenOfferModal(exc);
                  }}
                  className="px-6 py-2 bg-stone-950 text-white text-xs font-mono font-black uppercase cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Repeat className="w-3.5 h-3.5 text-white" /> Propose My Car for Swap
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =============================================================== */}
      {/* MODAL 2: INTERACTIVE TRADE PROPOSAL & VALUE DELTA SENDER        */}
      {/* =============================================================== */}
      <AnimatePresence>
        {isOfferModalOpen && selectedExchangeForOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF8F5] border-2 border-stone-900 max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4 text-stone-900 font-sans"
            >
              <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                <div className="flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-stone-950" />
                  <h3 className="text-base font-serif font-black text-stone-950 uppercase">
                    Propose Swap with {selectedExchangeForOffer.creatorName}
                  </h3>
                </div>
                <button
                  onClick={() => setIsOfferModalOpen(false)}
                  className="text-stone-500 hover:text-stone-950 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Target Vehicle Preview */}
              <div className="p-3 bg-white border border-stone-300 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-stone-400 text-[10px] uppercase">Target Vehicle:</span>
                  <p className="font-bold text-stone-950">{selectedExchangeForOffer.offeredVehicle.title}</p>
                </div>
                <span className="text-stone-950 font-black text-sm">
                  Valuation: ₹{(selectedExchangeForOffer.offeredVehicle.valuation / 100000).toFixed(2)}L
                </span>
              </div>

              {/* 1-Click Select From User's Saved Cars */}
              {userSavedListings.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase text-stone-800">
                    Select From Your Saved Vehicles:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {userSavedListings.map(car => (
                      <button
                        key={car.id}
                        type="button"
                        onClick={() => handleSelectCarInOfferModal(car.id)}
                        className={`px-3 py-1.5 text-xs font-mono border transition cursor-pointer flex items-center gap-1.5 ${
                          offerSelectedCarId === car.id
                            ? "bg-stone-950 text-white font-bold border-stone-950"
                            : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
                        }`}
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>{car.title} (₹{(car.price / 100000).toFixed(1)}L)</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleSelectCarInOfferModal("custom")}
                      className={`px-3 py-1.5 text-xs font-mono border transition cursor-pointer ${
                        offerSelectedCarId === "custom"
                          ? "bg-stone-950 text-white font-bold border-stone-950"
                          : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
                      }`}
                    >
                      + Enter Another Car
                    </button>
                  </div>
                </div>
              )}

              {/* Automated Real-time Delta Math Visualizer */}
              {myCarValuationLakhs > 0 && (
                <div className="p-4 bg-stone-950 text-white border border-stone-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 uppercase font-bold">
                    <span>Algorithmic Value Delta:</span>
                    <span>Direct RTO Match</span>
                  </div>
                  <div className="text-base font-serif font-black text-white">
                    {calculateDelta(myCarValuationLakhs * 100000, selectedExchangeForOffer.offeredVehicle.valuation).text}
                  </div>
                  <p className="text-[10px] font-mono text-stone-400">
                    Math: ₹{myCarValuationLakhs.toFixed(2)}L (Your Car) vs ₹{(selectedExchangeForOffer.offeredVehicle.valuation / 100000).toFixed(2)}L (Target Car)
                  </p>
                </div>
              )}

              {/* Proposal Form */}
              <form onSubmit={handleSendTradeOffer} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono font-bold text-stone-700 mb-1">Your Vehicle Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2022 BMW 330i M-Sport"
                      value={myCarTitle}
                      onChange={(e) => setMyCarTitle(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-400 text-xs font-sans focus:outline-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-stone-700 mb-1">Your Valuation (₹ Lakhs) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={myCarValuationLakhs}
                      onChange={(e) => setMyCarValuationLakhs(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-stone-400 text-xs font-mono font-bold focus:outline-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono font-bold text-stone-700 mb-1">Mileage / Odometer</label>
                    <input
                      type="text"
                      placeholder="e.g. 18,000 km"
                      value={myCarMileage}
                      onChange={(e) => setMyCarMileage(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-400 text-xs font-sans focus:outline-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-stone-700 mb-1">Photo URL</label>
                    <input
                      type="url"
                      required
                      value={myCarImage}
                      onChange={(e) => setMyCarImage(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-400 text-xs font-sans focus:outline-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono font-bold text-stone-700 mb-1">Proposal Note / Terms to Owner</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Willing to meet in Mumbai this weekend for mutual physical inspection."
                    value={tradeNote}
                    onChange={(e) => setTradeNote(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-400 text-xs font-sans focus:outline-stone-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-stone-300">
                  <button
                    type="button"
                    onClick={() => setIsOfferModalOpen(false)}
                    className="px-4 py-2 bg-stone-200 text-stone-800 font-mono font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOffer}
                    className="px-6 py-2 bg-stone-950 hover:bg-stone-850 text-white font-mono font-black uppercase shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>{isSubmittingOffer ? "Submitting Offer..." : "Submit Trade Offer"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Trade Valuation Equalizer & Match Matrix Modal */}
      <ExchangeEqualizerModal
        isOpen={isEqualizerModalOpen}
        onClose={() => {
          setIsEqualizerModalOpen(false);
          setSelectedExchangeForEqualizer(null);
        }}
        targetExchange={selectedExchangeForEqualizer}
        userCar={null}
        onProposeOffer={(targetExc) => {
          setIsEqualizerModalOpen(false);
          handleOpenOfferModal(targetExc);
        }}
      />

      {/* Certified P2P Barter Agreement & Dual Form 29/30 SOP Modal */}
      <TradeAgreementModal
        isOpen={isAgreementModalOpen}
        onClose={() => {
          setIsAgreementModalOpen(false);
          setSelectedExchangeForAgreement(null);
          setSelectedOfferForAgreement(null);
        }}
        exchange={selectedExchangeForAgreement}
        offer={selectedOfferForAgreement}
      />
    </div>
  );
}
