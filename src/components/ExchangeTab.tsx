import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Repeat, ArrowLeftRight, Calculator, Plus, CheckCircle2, 
  AlertCircle, ShieldCheck, Sparkles, Filter, ChevronRight, 
  Car, User, Phone, Mail, MapPin, Fuel, Gauge, DollarSign, 
  ThumbsUp, X, Send, Award, Info, RefreshCw
} from "lucide-react";
import { ExchangeRequest, TradeOffer, DEFAULT_EXCHANGES, OfferedTradeVehicle } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc, getDocs, query, where } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";
import { UserRole } from "../lib/userRoles";

interface ExchangeTabProps {
  currentUser: FirebaseUser | null;
  userRole?: UserRole;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onSignInClick: () => void;
  onNavigateToSell?: () => void;
}

export default function ExchangeTab({
  currentUser,
  userRole,
  showToast,
  onSignInClick,
  onNavigateToSell
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
  const [activeTabMode, setActiveTabMode] = useState<"browse_matcher" | "my_trades" | "create_exchange">("browse_matcher");
  const [selectedExchange, setSelectedExchange] = useState<ExchangeRequest | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [filterMake, setFilterMake] = useState<string>("all");
  const [filterDirection, setFilterDirection] = useState<string>("all");

  // Offer Submission Form State
  const [myCarTitle, setMyCarTitle] = useState("");
  const [myCarMake, setMyCarMake] = useState("");
  const [myCarModel, setMyCarModel] = useState("");
  const [myCarYear, setMyCarYear] = useState(2022);
  const [myCarValuation, setMyCarValuation] = useState<number>(2000000);
  const [myCarMileage, setMyCarMileage] = useState("15,000 km");
  const [myCarFuel, setMyCarFuel] = useState("Petrol");
  const [myCarImage, setMyCarImage] = useState("https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80");
  const [tradeNote, setTradeNote] = useState("");
  const [customCashAdjustment, setCustomCashAdjustment] = useState<number>(0);

  // New Exchange Listing Wizard State
  const [newOfferedTitle, setNewOfferedTitle] = useState("");
  const [newOfferedMake, setNewOfferedMake] = useState("");
  const [newOfferedModel, setNewOfferedModel] = useState("");
  const [newOfferedYear, setNewOfferedYear] = useState(2023);
  const [newOfferedValuation, setNewOfferedValuation] = useState<number>(1800000);
  const [newOfferedMileage, setNewOfferedMileage] = useState("12,000 km");
  const [newOfferedFuel, setNewOfferedFuel] = useState("Diesel");
  const [newOfferedImage, setNewOfferedImage] = useState("https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&auto=format&fit=crop&q=80");
  const [newOfferedDesc, setNewOfferedDesc] = useState("");

  const [newDesiredMake, setNewDesiredMake] = useState("");
  const [newDesiredModel, setNewDesiredModel] = useState("");
  const [newDesiredType, setNewDesiredType] = useState("Luxury Sedan / SUV");
  const [newCashDirection, setNewCashDirection] = useState<"pay_difference" | "receive_difference" | "even_swap">("pay_difference");
  const [newCashDelta, setNewCashDelta] = useState<number>(500000);
  const [newLocation, setNewLocation] = useState("Mumbai / Pune");

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  // Filtered Exchange items
  const filteredExchanges = useMemo(() => {
    return exchanges.filter((exc) => {
      if (filterMake !== "all" && exc.offeredVehicle.make.toLowerCase() !== filterMake.toLowerCase()) {
        return false;
      }
      if (filterDirection !== "all" && exc.cashDirection !== filterDirection) {
        return false;
      }
      return true;
    });
  }, [exchanges, filterMake, filterDirection]);

  // Automated Delta Math Calculation
  const calculateDelta = (myValuation: number, targetValuation: number) => {
    const diff = myValuation - targetValuation;
    if (diff === 0) {
      return { direction: "even_swap" as const, amount: 0, text: "Even Value Swap (₹0 Cash Delta)" };
    } else if (diff > 0) {
      return {
        direction: "proposer_receives" as const,
        amount: diff,
        text: `You Receive ₹${(diff / 100000).toFixed(2)} Lakhs in cash difference`
      };
    } else {
      return {
        direction: "proposer_pays" as const,
        amount: Math.abs(diff),
        text: `You Pay ₹${(Math.abs(diff) / 100000).toFixed(2)} Lakhs in cash difference`
      };
    }
  };

  // Submit Trade Offer against an existing listing
  const handleSendTradeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onSignInClick();
      return;
    }
    if (!selectedExchange) return;

    const deltaInfo = calculateDelta(myCarValuation, selectedExchange.offeredVehicle.valuation);
    const offerId = `offer-${Date.now()}`;

    const newOffer: TradeOffer = {
      id: offerId,
      exchangeRequestId: selectedExchange.id,
      targetCreatorUid: selectedExchange.creatorUid,
      proposerUid: currentUser.uid,
      proposerName: currentUser.displayName || currentUser.email || "Trade Proposer",
      proposerEmail: currentUser.email || "proposer@autoworld.in",
      proposerPhone: "+91 98000 12345",
      proposerVehicle: {
        title: myCarTitle || `${myCarYear} ${myCarMake} ${myCarModel}`,
        make: myCarMake || "Vehicle",
        model: myCarModel || "Model",
        year: Number(myCarYear),
        valuation: Number(myCarValuation),
        mileage: myCarMileage,
        fuel: myCarFuel,
        condition: 5,
        image: myCarImage,
        description: tradeNote
      },
      calculatedDelta: deltaInfo.amount,
      cashDirection: deltaInfo.direction,
      cashOfferAmount: customCashAdjustment || deltaInfo.amount,
      note: tradeNote,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "trade_offers", offerId), newOffer);
      // Increment offer count on listing
      await updateDoc(doc(db, "exchanges", selectedExchange.id), {
        offersCount: (selectedExchange.offersCount || 0) + 1
      });
    } catch (err) {
      console.warn("Trade offer Firestore sync notice:", err);
    }

    setTradeOffers((prev) => [newOffer, ...prev]);
    setIsTradeModalOpen(false);
    setNotification({
      type: "success",
      message: `🔄 Trade offer with automated delta (₹${(deltaInfo.amount / 100000).toFixed(2)} Lakhs) sent to ${selectedExchange.creatorName}!`
    });
    setTimeout(() => setNotification(null), 6000);
  };

  // Submit Brand New Exchange Listing
  const handleCreateExchangeListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onSignInClick();
      return;
    }

    const excId = `exc-${Date.now()}`;
    const newListing: ExchangeRequest = {
      id: excId,
      creatorUid: currentUser.uid,
      creatorName: currentUser.displayName || currentUser.email?.split("@")[0] || "Verified Car Owner",
      creatorEmail: currentUser.email || "owner@autoworld.in",
      creatorPhone: "+91 98000 55443",
      offeredVehicle: {
        title: newOfferedTitle || `${newOfferedYear} ${newOfferedMake} ${newOfferedModel}`,
        make: newOfferedMake || "Vehicle",
        model: newOfferedModel || "Model",
        year: Number(newOfferedYear),
        valuation: Number(newOfferedValuation),
        mileage: newOfferedMileage,
        fuel: newOfferedFuel,
        condition: 5,
        image: newOfferedImage,
        description: newOfferedDesc
      },
      desiredVehicle: {
        targetMake: newDesiredMake || "Any Luxury Brand",
        targetModel: newDesiredModel || "Any Sedan/SUV",
        targetType: newDesiredType,
        notes: `Looking to swap for ${newDesiredMake} ${newDesiredModel} with ${newCashDirection.replace("_", " ")}.`
      },
      cashDirection: newCashDirection,
      cashDelta: Number(newCashDelta),
      status: "active",
      offersCount: 0,
      location: newLocation,
      createdAt: new Date().toISOString(),
      badge: "verified"
    };

    try {
      await setDoc(doc(db, "exchanges", excId), newListing);
    } catch (err) {
      console.warn("Exchange creation notice:", err);
    }

    const nextList = [newListing, ...exchanges];
    setExchanges(nextList);
    try {
      localStorage.setItem("autoworld_exchanges_data", JSON.stringify(nextList));
    } catch (e) {
      console.error(e);
    }

    setActiveTabMode("browse_matcher");
    setNotification({
      type: "success",
      message: "Your P2P Trade-In & Swap Listing is now live on the match floor!"
    });
    setTimeout(() => setNotification(null), 6000);
  };

  return (
    <div id="exchange-tab-container" className="min-h-screen bg-[#FAF8F5] text-stone-900 pb-20">
      {/* 1. Header Banner */}
      <div className="bg-stone-950 text-white border-b border-cyan-500/30 relative overflow-hidden pt-10 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 border border-cyan-500/40 rounded-full text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">
                <Repeat className="w-3.5 h-3.5" /> Car Exchange & Trade-In Matcher
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white">
                Swap Cars Directly <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-amber-300">& Calculate Value Delta</span>
              </h1>
              <p className="mt-2 text-stone-400 text-sm sm:text-base max-w-2xl">
                Skip dealership trade-in cuts. Match directly with fellow car owners, trade vehicles instantly, and automatically calculate who pays whom the cash difference.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="create-exchange-btn"
                onClick={() => setActiveTabMode("create_exchange")}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-bold text-sm rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> List My Car for Trade-In
              </button>
            </div>
          </div>

          {/* Quick Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-stone-800 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Automated Math</p>
                <p className="font-bold text-white">Real-Time Value Delta</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Legal Swap Escrow</p>
                <p className="font-bold text-emerald-400">RTO Dual Transfer</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Direct Exchange</p>
                <p className="font-bold text-amber-400">Zero Middleman Cut</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Match Governance</p>
                <p className="font-bold text-purple-400">Certified Valuer SOP</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTabMode("browse_matcher")}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTabMode === "browse_matcher"
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              <Repeat className="w-4 h-4 text-cyan-500" />
              Browse Trade Matches ({exchanges.length})
            </button>
            <button
              onClick={() => setActiveTabMode("create_exchange")}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTabMode === "create_exchange"
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-500" />
              List Vehicle for Swap
            </button>
          </div>

          {/* Filter Bar */}
          {activeTabMode === "browse_matcher" && (
            <div className="flex items-center gap-3">
              <select
                value={filterDirection}
                onChange={(e) => setFilterDirection(e.target.value)}
                className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 font-semibold focus:outline-none"
              >
                <option value="all">All Cash Delta Types</option>
                <option value="pay_difference">Owner Pays Difference</option>
                <option value="receive_difference">Owner Receives Cash</option>
                <option value="even_swap">Even Value Swaps</option>
              </select>
            </div>
          )}
        </div>

        {/* Notifications */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-4 p-4 rounded-xl text-sm font-semibold flex items-center gap-3 shadow-sm ${
                notification.type === "success"
                  ? "bg-emerald-50 border border-emerald-300 text-emerald-900"
                  : "bg-rose-50 border border-rose-300 text-rose-900"
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Tab Body Content */}
        {activeTabMode === "browse_matcher" && (
          <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExchanges.map((exc) => {
                return (
                  <div
                    key={exc.id}
                    className="bg-white rounded-2xl border border-stone-200 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Offered Vehicle Showcase */}
                      <div className="relative aspect-video bg-stone-900 overflow-hidden">
                        <img
                          src={exc.offeredVehicle.image}
                          alt={exc.offeredVehicle.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent pointer-events-none" />

                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2.5 py-1 bg-stone-950/80 backdrop-blur-md border border-cyan-500/40 text-cyan-400 text-[11px] font-bold rounded-md uppercase">
                            Offered for Swap
                          </span>
                          {exc.badge && (
                            <span className="px-2 py-0.5 bg-amber-500 text-stone-950 text-[10px] font-black rounded uppercase">
                              {exc.badge}
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                          <span className="font-mono text-sm font-bold bg-stone-950/80 px-2 py-0.5 rounded border border-stone-700">
                            Valuation: ₹{(exc.offeredVehicle.valuation / 100000).toFixed(2)}L
                          </span>
                          <span className="text-xs text-stone-300 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-cyan-400" /> {exc.location}
                          </span>
                        </div>
                      </div>

                      {/* Trade Overview & Comparison Card */}
                      <div className="p-5">
                        <h3 className="font-bold text-lg text-stone-900 leading-snug">
                          {exc.offeredVehicle.title}
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {exc.offeredVehicle.mileage} • {exc.offeredVehicle.fuel} • Listed by {exc.creatorName}
                        </p>

                        {/* Trade Match Target Box */}
                        <div className="mt-4 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 mb-1">
                            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-600" />
                            <span>Desired Trade Target:</span>
                          </div>
                          <p className="text-sm font-semibold text-cyan-800">
                            {exc.desiredVehicle.targetMake} {exc.desiredVehicle.targetModel || ""}
                          </p>
                          {exc.desiredVehicle.notes && (
                            <p className="text-xs text-stone-600 mt-1 italic">
                              "{exc.desiredVehicle.notes}"
                            </p>
                          )}
                        </div>

                        {/* Automated Delta Indicator Banner */}
                        <div className="mt-3 p-3 bg-cyan-50/70 rounded-xl border border-cyan-200 text-xs">
                          <p className="text-stone-500 font-medium">Trade Economics Delta:</p>
                          <div className="font-bold text-cyan-950 mt-0.5 flex items-center gap-1.5">
                            <Calculator className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                            {exc.cashDirection === "pay_difference" && (
                              <span>Owner will pay up to ₹{(exc.cashDelta / 100000).toFixed(2)}L cash difference</span>
                            )}
                            {exc.cashDirection === "receive_difference" && (
                              <span>Proposer pays ~₹{(exc.cashDelta / 100000).toFixed(2)}L cash difference</span>
                            )}
                            {exc.cashDirection === "even_swap" && (
                              <span>Straight Even-Value Vehicle Swap (₹0 Delta)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="p-5 pt-0">
                      <button
                        onClick={() => {
                          setSelectedExchange(exc);
                          setIsTradeModalOpen(true);
                        }}
                        className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <Repeat className="w-4 h-4 text-cyan-400" />
                        Propose My Car & Calculate Delta
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Wizard: Create New Exchange Listing */}
        {activeTabMode === "create_exchange" && (
          <div className="mt-8 max-w-3xl mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <Repeat className="w-6 h-6 text-cyan-600" />
                <div>
                  <h2 className="text-xl font-bold font-serif text-stone-900">List Your Vehicle for P2P Trade-In</h2>
                  <p className="text-xs text-stone-500">Configure what car you have and what car you wish to swap for.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTabMode("browse_matcher")}
                className="text-xs text-stone-500 hover:text-stone-800 font-semibold cursor-pointer"
              >
                Back to Matcher
              </button>
            </div>

            <form onSubmit={handleCreateExchangeListing} className="mt-6 space-y-6 text-xs">
              {/* Part 1: Your Car Details */}
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-3">
                  <Car className="w-4 h-4 text-cyan-600" /> 1. The Car You Are Offering
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Vehicle Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2023 Mahindra Thar 4x4 Diesel AT"
                      value={newOfferedTitle}
                      onChange={(e) => setNewOfferedTitle(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Make / Brand</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mahindra / BMW / Toyota"
                      value={newOfferedMake}
                      onChange={(e) => setNewOfferedMake(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Estimated Market Valuation (₹)</label>
                    <input
                      type="number"
                      required
                      value={newOfferedValuation}
                      onChange={(e) => setNewOfferedValuation(Number(e.target.value))}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm font-mono"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">₹{(newOfferedValuation / 100000).toFixed(2)} Lakhs</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Mileage / Odometer</label>
                    <input
                      type="text"
                      placeholder="e.g. 14,500 km"
                      value={newOfferedMileage}
                      onChange={(e) => setNewOfferedMileage(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-stone-700 mb-1">Showcase Photo URL</label>
                    <input
                      type="url"
                      required
                      value={newOfferedImage}
                      onChange={(e) => setNewOfferedImage(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Part 2: Target Swap Criteria */}
              <div className="pt-4 border-t border-stone-100">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-3">
                  <ArrowLeftRight className="w-4 h-4 text-amber-600" /> 2. What Car Are You Looking For?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Target Make / Model</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BMW 3-Series / Audi A4 / Fortuner"
                      value={newDesiredMake}
                      onChange={(e) => setNewDesiredMake(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Cash Delta Preference</label>
                    <select
                      value={newCashDirection}
                      onChange={(e) => setNewCashDirection(e.target.value as any)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm bg-white"
                    >
                      <option value="pay_difference">I will pay cash difference (Upgrading)</option>
                      <option value="receive_difference">I want to receive cash difference (Downsizing)</option>
                      <option value="even_swap">Even Value Swap (Similar price)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Maximum Cash Delta (₹)</label>
                    <input
                      type="number"
                      value={newCashDelta}
                      onChange={(e) => setNewCashDelta(Number(e.target.value))}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Your City / Region</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActiveTabMode("browse_matcher")}
                  className="px-4 py-2.5 text-stone-600 hover:bg-stone-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg cursor-pointer shadow-md"
                >
                  Publish P2P Swap Listing
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 5. Modal: Interactive Trade-In Proposal & Automated Delta Calculator */}
      <AnimatePresence>
        {isTradeModalOpen && selectedExchange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-lg font-bold font-serif text-stone-900">
                    Propose Swap with {selectedExchange.creatorName}
                  </h3>
                </div>
                <button
                  onClick={() => setIsTradeModalOpen(false)}
                  className="text-stone-400 hover:text-stone-600 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Vehicle Comparison Header */}
              <div className="mt-4 grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <div>
                  <p className="text-stone-400 font-semibold uppercase text-[10px]">Target Vehicle</p>
                  <p className="font-bold text-stone-900 truncate">{selectedExchange.offeredVehicle.title}</p>
                  <p className="font-mono text-cyan-700 font-bold">
                    Valuation: ₹{(selectedExchange.offeredVehicle.valuation / 100000).toFixed(2)}L
                  </p>
                </div>
                <div>
                  <p className="text-stone-400 font-semibold uppercase text-[10px]">Your Proposed Vehicle</p>
                  <p className="font-bold text-stone-900 truncate">{myCarTitle || "Enter details below"}</p>
                  <p className="font-mono text-emerald-700 font-bold">
                    Valuation: ₹{(Number(myCarValuation) / 100000).toFixed(2)}L
                  </p>
                </div>
              </div>

              {/* Automated Real-time Delta Math Visualizer */}
              {myCarValuation > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-cyan-900 to-stone-950 text-white border border-cyan-500/40">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-300 mb-1">
                    <span>Automated Value Delta Calculation:</span>
                    <span>Algorithm Certified</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-serif text-amber-300">
                    {calculateDelta(myCarValuation, selectedExchange.offeredVehicle.valuation).text}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Math: ₹{(myCarValuation / 100000).toFixed(2)}L (Your Car) - ₹{(selectedExchange.offeredVehicle.valuation / 100000).toFixed(2)}L (Target Car)
                  </p>
                </div>
              )}

              {/* Proposal Form */}
              <form onSubmit={handleSendTradeOffer} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Your Car Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2022 BMW 330i M-Sport"
                      value={myCarTitle}
                      onChange={(e) => setMyCarTitle(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Your Valuation (₹)</label>
                    <input
                      type="number"
                      required
                      value={myCarValuation}
                      onChange={(e) => setMyCarValuation(Number(e.target.value))}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Mileage / Fuel</label>
                    <input
                      type="text"
                      placeholder="e.g. 18,000 km • Petrol"
                      value={myCarMileage}
                      onChange={(e) => setMyCarMileage(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Photo URL</label>
                    <input
                      type="url"
                      required
                      value={myCarImage}
                      onChange={(e) => setMyCarImage(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Proposal Note / Terms to Owner</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Willing to meet in Pune for mutual inspection this weekend."
                    value={tradeNote}
                    onChange={(e) => setTradeNote(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsTradeModalOpen(false)}
                    className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-bold rounded-lg cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Trade Offer
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
