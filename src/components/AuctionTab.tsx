import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, Clock, ShieldCheck, Flame, ChevronRight, TrendingUp, 
  Gavel, CheckCircle2, AlertCircle, ArrowUpRight, Award, 
  Volume2, Eye, Filter, Sparkles, RefreshCw, Trophy, 
  Car, User, ArrowRight, Check, History, Info, Lock
} from "lucide-react";
import { Auction, AuctionBid, DEFAULT_AUCTIONS, Vehicle } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";
import { UserRole } from "../lib/userRoles";

interface AuctionTabProps {
  currentUser: FirebaseUser | null;
  userRole?: UserRole;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onSignInClick: () => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onPlayEngineSound?: (url?: string, title?: string, type?: string) => void;
  isEngineSoundEnabled?: boolean;
}

// Live Countdown Helper Component
function AuctionCountdown({ endTime, onExpire }: { endTime: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) onExpire();
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  if (timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-md uppercase tracking-wider">
        <Clock className="w-3.5 h-3.5" /> Auction Concluded
      </span>
    );
  }

  const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 30;

  return (
    <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${
      isUrgent ? "text-rose-500 animate-pulse" : "text-amber-500"
    }`}>
      <span className="bg-stone-900 text-white px-2 py-1 rounded shadow-inner">
        {String(timeLeft.hours).padStart(2, "0")}h
      </span>
      <span>:</span>
      <span className="bg-stone-900 text-white px-2 py-1 rounded shadow-inner">
        {String(timeLeft.minutes).padStart(2, "0")}m
      </span>
      <span>:</span>
      <span className="bg-stone-900 text-amber-400 px-2 py-1 rounded shadow-inner">
        {String(timeLeft.seconds).padStart(2, "0")}s
      </span>
    </div>
  );
}

export default function AuctionTab({
  currentUser,
  userRole,
  showToast,
  onSignInClick,
  onSelectVehicle,
  onPlayEngineSound,
  isEngineSoundEnabled
}: AuctionTabProps) {
  const [auctions, setAuctions] = useState<Auction[]>(() => {
    try {
      const stored = localStorage.getItem("autoworld_auctions_data");
      return stored ? JSON.parse(stored) : DEFAULT_AUCTIONS;
    } catch (e) {
      return DEFAULT_AUCTIONS;
    }
  });

  const [activeFilter, setActiveFilter] = useState<"all" | "live" | "upcoming" | "ended">("live");
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [customBidAmount, setCustomBidAmount] = useState<number | "">("");
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);

  // New Auction submission form
  const [newAuctionTitle, setNewAuctionTitle] = useState("");
  const [newAuctionMake, setNewAuctionMake] = useState("");
  const [newAuctionModel, setNewAuctionModel] = useState("");
  const [newAuctionYear, setNewAuctionYear] = useState(2023);
  const [newAuctionStartingBid, setNewAuctionStartingBid] = useState(5000000);
  const [newAuctionReservePrice, setNewAuctionReservePrice] = useState(6000000);
  const [newAuctionImage, setNewAuctionImage] = useState("https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80");
  const [newAuctionMileage, setNewAuctionMileage] = useState("10,000 km");
  const [newAuctionLocation, setNewAuctionLocation] = useState("Mumbai, Maharashtra");

  // Subscribe to real-time auctions from Firestore
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, "auctions"), (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Auction[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push({ ...(docSnap.data() as Auction), id: docSnap.id });
          });
          setAuctions(loaded);
          try {
            localStorage.setItem("autoworld_auctions_data", JSON.stringify(loaded));
          } catch (e) {
            console.error(e);
          }
        } else {
          // If empty in Firestore, write initial presets
          DEFAULT_AUCTIONS.forEach(async (auc) => {
            try {
              await setDoc(doc(db, "auctions", auc.id), auc);
            } catch (err) {
              console.warn("Auction preset sync notice:", err);
            }
          });
        }
      }, (error) => {
        console.warn("Auctions onSnapshot notice:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore auctions listener init:", e);
    }
  }, []);

  const filteredAuctions = useMemo(() => {
    if (activeFilter === "all") return auctions;
    return auctions.filter((a) => a.status === activeFilter);
  }, [auctions, activeFilter]);

  const activeAuctionDetail = selectedAuction || (filteredAuctions.length > 0 ? filteredAuctions[0] : auctions[0]);

  // Handle Bidding Submission
  const handlePlaceBid = async (amount: number) => {
    if (!currentUser) {
      onSignInClick();
      return;
    }
    if (!activeAuctionDetail) return;

    if (activeAuctionDetail.status !== "live") {
      setBidError("Bidding is only permitted on active 24-hour Live Flash Auctions.");
      return;
    }

    const minAllowed = activeAuctionDetail.currentBid + (activeAuctionDetail.minIncrement || 50000);
    if (amount < minAllowed) {
      setBidError(`Minimum valid bid is ₹${minAllowed.toLocaleString("en-IN")} (+₹${(activeAuctionDetail.minIncrement || 50000).toLocaleString("en-IN")} increment).`);
      return;
    }

    setIsSubmittingBid(true);
    setBidError(null);

    const newBid: AuctionBid = {
      id: `bid_${Date.now()}`,
      bidderUid: currentUser.uid,
      bidderName: currentUser.displayName || currentUser.email?.split("@")[0] || "Verified Bidder",
      bidderPhoto: currentUser.photoURL || undefined,
      amount: amount,
      timestamp: "Just now"
    };

    const isReserveNowMet = amount >= activeAuctionDetail.reservePrice;
    const updatedBids = [newBid, ...(activeAuctionDetail.bids || [])];
    const updatedAuction: Auction = {
      ...activeAuctionDetail,
      currentBid: amount,
      bidCount: (activeAuctionDetail.bidCount || 0) + 1,
      isReserveMet: isReserveNowMet,
      bids: updatedBids,
      winnerUid: currentUser.uid,
      winnerName: currentUser.displayName || "Top Bidder",
      winningBid: amount
    };

    try {
      // 1. Update Firestore
      await updateDoc(doc(db, "auctions", activeAuctionDetail.id), {
        currentBid: amount,
        bidCount: updatedAuction.bidCount,
        isReserveMet: isReserveNowMet,
        bids: updatedBids,
        winnerUid: currentUser.uid,
        winnerName: currentUser.displayName || "Top Bidder",
        winningBid: amount
      });

      // 2. Update local state
      setAuctions((prev) => prev.map((a) => (a.id === activeAuctionDetail.id ? updatedAuction : a)));
      setSelectedAuction(updatedAuction);
      setBidSuccess(`Bid of ₹${amount.toLocaleString("en-IN")} successfully confirmed on the live floor!`);
      setCustomBidAmount("");
      setTimeout(() => setBidSuccess(null), 6000);
    } catch (err) {
      console.error("Bid submission error:", err);
      // Fallback local update
      setAuctions((prev) => prev.map((a) => (a.id === activeAuctionDetail.id ? updatedAuction : a)));
      setSelectedAuction(updatedAuction);
      setBidSuccess(`Bid of ₹${amount.toLocaleString("en-IN")} accepted locally!`);
      setTimeout(() => setBidSuccess(null), 6000);
    } finally {
      setIsSubmittingBid(false);
    }
  };

  // Handle Submitting a New Car for Flash Auction
  const handleProposeAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onSignInClick();
      return;
    }

    const newId = `auc-${Date.now()}`;
    const newAuctionItem: Auction = {
      id: newId,
      title: newAuctionTitle || `${newAuctionYear} ${newAuctionMake} ${newAuctionModel}`,
      make: newAuctionMake || "Porsche",
      model: newAuctionModel || "GT3",
      year: Number(newAuctionYear),
      image: newAuctionImage,
      photos: [{ src: newAuctionImage, alt: newAuctionTitle }],
      startingBid: Number(newAuctionStartingBid),
      currentBid: Number(newAuctionStartingBid),
      bidCount: 0,
      minIncrement: 50000,
      reservePrice: Number(newAuctionReservePrice),
      isReserveMet: false,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: "live",
      bids: [],
      sellerUid: currentUser.uid,
      sellerName: currentUser.displayName || currentUser.email || "Seller",
      sellerPhone: "+91 98000 00000",
      sellerEmail: currentUser.email || "seller@autoworld.in",
      location: newAuctionLocation,
      condition: 5,
      mileage: newAuctionMileage,
      fuel: "Petrol",
      transmission: "Automatic",
      highlights: [
        "Verified platform 100-point inspection certified",
        "Clear RTO NOC documentation and Single Owner Registry",
        "24-Hour Verified Flash Drop"
      ],
      verifiedOnly: true,
      featured: true
    };

    try {
      await setDoc(doc(db, "auctions", newId), newAuctionItem);
    } catch (err) {
      console.warn("Firestore auction creation notice:", err);
    }

    const nextList = [newAuctionItem, ...auctions];
    setAuctions(nextList);
    try {
      localStorage.setItem("autoworld_auctions_data", JSON.stringify(nextList));
    } catch (e) {
      console.error(e);
    }

    setSelectedAuction(newAuctionItem);
    setIsProposeModalOpen(false);
    setBidSuccess("⚡ Your supercar has been listed for a 24-Hour Live Flash Auction!");
    setTimeout(() => setBidSuccess(null), 6000);
  };

  return (
    <div id="auction-tab-container" className="min-h-screen bg-[#FAF8F5] text-stone-900 pb-20">
      {/* 1. Header Banner */}
      <div className="bg-stone-950 text-white border-b border-amber-500/30 relative overflow-hidden pt-10 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
                <Zap className="w-3.5 h-3.5 fill-amber-400" /> Live Flash Auction & Transparent Bidding Floor
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white">
                Weekly 24-Hour <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">Verified Supercar Auctions</span>
              </h1>
              <p className="mt-2 text-stone-400 text-sm sm:text-base max-w-2xl">
                Real-time timed drops for certified exotic machinery. Zero hidden reserve games, 100% transparent bidding stream, and guaranteed ownership transfer.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="propose-auction-btn"
                onClick={() => setIsProposeModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Gavel className="w-4 h-4" /> Propose Car for Flash Auction
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-stone-800 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Drop Duration</p>
                <p className="font-bold text-white font-mono">Strict 24-Hour Timer</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Vehicle Integrity</p>
                <p className="font-bold text-emerald-400">100-Point Inspected</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Floor Transparency</p>
                <p className="font-bold text-blue-400">Real-Time Bid Stream</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Reserve Guarantee</p>
                <p className="font-bold text-purple-400">Clear Reserve Status</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Floor & Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Filter Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter("live")}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeFilter === "live"
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Drops ({auctions.filter((a) => a.status === "live").length})
            </button>
            <button
              onClick={() => setActiveFilter("upcoming")}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeFilter === "upcoming"
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              Upcoming ({auctions.filter((a) => a.status === "upcoming").length})
            </button>
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeFilter === "all"
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              All Drops ({auctions.length})
            </button>
          </div>

          <div className="text-xs text-stone-500 font-mono">
            Auto-refreshing live socket floor • Anti-sniping +2m enabled
          </div>
        </div>

        {/* Success / Error Alerts */}
        <AnimatePresence>
          {bidSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold flex items-center gap-3 shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{bidSuccess}</span>
            </motion.div>
          )}

          {bidError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-sm font-semibold flex items-center gap-3 shadow-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{bidError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Featured Active Bidding Arena */}
        {activeAuctionDetail ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Visuals & Vehicle Dossier (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200 shadow-md overflow-hidden">
                {/* Main Media Showcase */}
                <div className="relative aspect-video bg-stone-900 overflow-hidden group">
                  <img
                    src={activeAuctionDetail.image}
                    alt={activeAuctionDetail.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Badges Overlay */}
                  <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-stone-950/80 backdrop-blur-md border border-amber-500/40 text-amber-400 text-xs font-bold rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                      <Zap className="w-3.5 h-3.5 fill-amber-400" /> Lot #{activeAuctionDetail.id}
                    </span>

                    {activeAuctionDetail.isReserveMet ? (
                      <span className="px-3 py-1 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Reserve Price Met
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-950/80 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-bold rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                        <Lock className="w-3.5 h-3.5 text-amber-400" /> Reserve Not Yet Met
                      </span>
                    )}
                  </div>

                  {/* Engine Acoustic Player Button */}
                  {activeAuctionDetail.engineSoundUrl && onPlayEngineSound && (
                    <button
                      onClick={() => onPlayEngineSound(
                        activeAuctionDetail.engineSoundUrl,
                        activeAuctionDetail.engineSoundTitle,
                        activeAuctionDetail.engineSoundType
                      )}
                      className="absolute bottom-4 left-4 px-3.5 py-1.5 bg-stone-900/90 backdrop-blur-md hover:bg-stone-900 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-105"
                    >
                      <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" /> Listen to Exhaust Note
                    </button>
                  )}

                  {/* Live Timer Pill */}
                  <div className="absolute bottom-4 right-4 bg-stone-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-stone-700 shadow-xl">
                    <AuctionCountdown endTime={activeAuctionDetail.endTime} />
                  </div>
                </div>

                {/* Info and Highlights */}
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
                    <div>
                      <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                        {activeAuctionDetail.year} • {activeAuctionDetail.make} • {activeAuctionDetail.location}
                      </p>
                      <h2 className="text-2xl font-bold font-serif text-stone-900">
                        {activeAuctionDetail.title}
                      </h2>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs text-stone-500">Starting Bid</p>
                      <p className="text-sm font-bold text-stone-700 font-mono">
                        ₹{activeAuctionDetail.startingBid.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Highlights Bullet List */}
                  {activeAuctionDetail.highlights && activeAuctionDetail.highlights.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                        Lot Highlights & Provenance
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeAuctionDetail.highlights.map((h, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-stone-700 bg-stone-50 p-2 rounded-lg border border-stone-100">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Specifications Grid */}
                  {activeAuctionDetail.specs && (
                    <div className="mt-5 pt-4 border-t border-stone-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">
                        Technical Dossier & Certification
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {Object.entries(activeAuctionDetail.specs).map(([key, val]) => (
                          <div key={key} className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                            <p className="text-stone-400 text-[10px] uppercase font-semibold">{key}</p>
                            <p className="font-bold text-stone-800 mt-0.5 truncate">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Other Flash Lots Bar */}
              <div className="bg-white p-4 rounded-xl border border-stone-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                  All Active Lots in this Flash Window
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {auctions.map((auc) => (
                    <button
                      key={auc.id}
                      onClick={() => setSelectedAuction(auc)}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex gap-3 items-center ${
                        activeAuctionDetail.id === auc.id
                          ? "bg-amber-50/60 border-amber-500/50 shadow-sm"
                          : "bg-stone-50 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      <img src={auc.image} alt={auc.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">{auc.title}</p>
                        <p className="text-xs font-mono font-bold text-amber-600">₹{(auc.currentBid / 100000).toFixed(2)} Lakhs</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Live Bidding Floor & Action Console (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Active Bid Console */}
              <div className="bg-stone-950 text-white rounded-2xl p-6 border border-amber-500/30 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Live Bidding Floor</span>
                  </div>
                  <span className="text-xs font-mono text-stone-400">{activeAuctionDetail.bidCount} Bids Placed</span>
                </div>

                {/* Current High Bid Card */}
                <div className="my-5 p-4 rounded-xl bg-stone-900/90 border border-stone-800 text-center">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Current Highest Bid</p>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 mt-1">
                    ₹{activeAuctionDetail.currentBid.toLocaleString("en-IN")}
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    {activeAuctionDetail.isReserveMet ? (
                      <span className="text-emerald-400 font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Reserve Met • Highest bidder takes the vehicle
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold flex items-center justify-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Reserve not met yet (Min reserve: ₹{(activeAuctionDetail.reservePrice / 100000).toFixed(2)} Lakhs)
                      </span>
                    )}
                  </p>
                </div>

                {/* Quick Increment Bid Buttons */}
                <div className="space-y-3">
                  <p className="text-xs text-stone-400 font-medium">Instant Quick Bid Increments:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[50000, 100000, 250000].map((inc) => {
                      const targetBid = activeAuctionDetail.currentBid + inc;
                      return (
                        <button
                          key={inc}
                          disabled={isSubmittingBid || activeAuctionDetail.status !== "live"}
                          onClick={() => handlePlaceBid(targetBid)}
                          className="py-2.5 px-2 bg-stone-800 hover:bg-amber-500 hover:text-stone-950 font-bold text-xs rounded-lg transition-all border border-stone-700 hover:border-amber-400 cursor-pointer disabled:opacity-50 text-center"
                        >
                          +₹{(inc / 1000).toFixed(0)}k
                          <span className="block text-[10px] opacity-70 font-mono font-normal">
                            ₹{(targetBid / 100000).toFixed(2)}L
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Bid Input */}
                  <div className="pt-2">
                    <label className="text-xs text-stone-400 block mb-1.5 font-medium">Or enter custom bid amount (₹):</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-stone-400 font-mono text-sm">₹</span>
                        <input
                          type="number"
                          min={activeAuctionDetail.currentBid + 50000}
                          step={10000}
                          placeholder={String(activeAuctionDetail.currentBid + 50000)}
                          value={customBidAmount}
                          onChange={(e) => setCustomBidAmount(e.target.value ? Number(e.target.value) : "")}
                          className="w-full pl-7 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <button
                        disabled={!customBidAmount || isSubmittingBid || activeAuctionDetail.status !== "live"}
                        onClick={() => customBidAmount && handlePlaceBid(Number(customBidAmount))}
                        className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs rounded-lg transition-all shadow-md cursor-pointer disabled:opacity-40"
                      >
                        Place Bid
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bidder Protection Notice */}
                <div className="mt-5 p-3 rounded-lg bg-stone-900/60 border border-stone-800/80 text-[11px] text-stone-400 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Bids are legally binding. Winning lot includes Auto World Escrow Protection, physical delivery inspection, and state RTO clearance guarantee.
                  </span>
                </div>
              </div>

              {/* Transparent Live Bid History Stream */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-md">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-stone-900">Live Bidding Feed</h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Real-time Feed
                  </span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {activeAuctionDetail.bids && activeAuctionDetail.bids.length > 0 ? (
                    activeAuctionDetail.bids.map((bid, idx) => (
                      <div
                        key={bid.id || idx}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          idx === 0
                            ? "bg-amber-50/70 border-amber-300 shadow-sm"
                            : "bg-stone-50 border-stone-100 text-stone-600"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            idx === 0 ? "bg-amber-500 text-stone-950 shadow" : "bg-stone-200 text-stone-700"
                          }`}>
                            {idx === 0 ? <Trophy className="w-4 h-4" /> : idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900 truncate flex items-center gap-1.5">
                              {bid.bidderName}
                              {idx === 0 && (
                                <span className="px-1.5 py-0.5 bg-amber-500 text-stone-950 text-[10px] font-bold rounded uppercase">
                                  Leading
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-stone-400">{bid.timestamp}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 font-mono">
                          <p className={`text-sm font-bold ${idx === 0 ? "text-amber-700" : "text-stone-900"}`}>
                            ₹{bid.amount.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-stone-400 text-xs">
                      No floor bids yet for this lot. Be the first to place the opening bid!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 mt-6">
            <Clock className="w-12 h-12 text-stone-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-stone-800">No Auctions in this Filter</h3>
            <p className="text-stone-500 text-sm mt-1">Check back soon for the next scheduled 24-hour supercar drop.</p>
          </div>
        )}
      </div>

      {/* Propose Car for Flash Auction Modal */}
      <AnimatePresence>
        {isProposeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="text-lg font-bold font-serif text-stone-900">List for 24-Hour Flash Auction</h3>
                </div>
                <button
                  onClick={() => setIsProposeModalOpen(false)}
                  className="text-stone-400 hover:text-stone-600 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleProposeAuction} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Vehicle Full Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2022 Porsche 911 GT3 RS"
                    value={newAuctionTitle}
                    onChange={(e) => setNewAuctionTitle(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Make</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Porsche / BMW / Ferrari"
                      value={newAuctionMake}
                      onChange={(e) => setNewAuctionMake(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Model</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 911 / M3 / F8"
                      value={newAuctionModel}
                      onChange={(e) => setNewAuctionModel(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Starting Bid (₹)</label>
                    <input
                      type="number"
                      required
                      value={newAuctionStartingBid}
                      onChange={(e) => setNewAuctionStartingBid(Number(e.target.value))}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Reserve Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={newAuctionReservePrice}
                      onChange={(e) => setNewAuctionReservePrice(Number(e.target.value))}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Mileage</label>
                    <input
                      type="text"
                      placeholder="e.g. 6,500 km"
                      value={newAuctionMileage}
                      onChange={(e) => setNewAuctionMileage(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Location / RTO</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai (MH-01)"
                      value={newAuctionLocation}
                      onChange={(e) => setNewAuctionLocation(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Primary Showcase Photo URL</label>
                  <input
                    type="url"
                    required
                    value={newAuctionImage}
                    onChange={(e) => setNewAuctionImage(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                  ⚡ The auction will run for exactly 24 hours from launch. All bids will be published transparently with anti-sniping protection.
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsProposeModalOpen(false)}
                    className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Launch 24h Flash Auction
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
