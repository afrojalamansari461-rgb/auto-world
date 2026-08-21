import React, { useState, useEffect } from "react";
import { 
  Repeat, ArrowLeftRight, Calculator, CheckCircle2, AlertCircle, 
  Trash2, Plus, Eye, RefreshCw, ShieldCheck, Mail, Phone, MapPin,
  Search, Filter, CheckCircle, XCircle, AlertTriangle, MessageCircle,
  Clock, DollarSign, Tag, TrendingUp, Sparkles, UserCheck, HelpCircle
} from "lucide-react";
import { ExchangeRequest, TradeOffer, DEFAULT_EXCHANGES } from "../types";
import { db } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";

interface AdminExchangeDeskProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const DEALERSHIP_SWAP_PRESETS = [
  {
    offeredTitle: "2023 BMW M340i xDrive",
    offeredMake: "BMW",
    offeredModel: "M340i",
    offeredYear: 2023,
    offeredValuation: 6200000,
    offeredImage: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80",
    offeredMileage: "9,800 km",
    offeredFuel: "Petrol",
    offeredTransmission: "8-Speed Steptronic Sport",
    desiredMake: "Porsche / Mercedes",
    desiredType: "Porsche Macan / 718 Cayman / AMG C43",
    cashDirection: "pay_difference" as const,
    cashDelta: 1500000,
    location: "Mumbai, Maharashtra"
  },
  {
    offeredTitle: "2022 Toyota Fortuner Legender 4x4",
    offeredMake: "Toyota",
    offeredModel: "Fortuner Legender",
    offeredYear: 2022,
    offeredValuation: 4100000,
    offeredImage: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80",
    offeredMileage: "24,000 km",
    offeredFuel: "Diesel",
    offeredTransmission: "6-Speed Automatic",
    desiredMake: "BMW / Audi",
    desiredType: "BMW X3 xDrive30i / Audi Q5 Quattro",
    cashDirection: "receive_difference" as const,
    cashDelta: 600000,
    location: "Gurugram, Haryana"
  },
  {
    offeredTitle: "2023 Mahindra Thar Earth Edition 4x4",
    offeredMake: "Mahindra",
    offeredModel: "Thar Earth Edition",
    offeredYear: 2023,
    offeredValuation: 1650000,
    offeredImage: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&auto=format&fit=crop&q=80",
    offeredMileage: "8,500 km",
    offeredFuel: "Diesel",
    offeredTransmission: "Manual",
    desiredMake: "Tata / Hyundai",
    desiredType: "Tata Safari Dark Edition / Hyundai Creta N-Line",
    cashDirection: "even_swap" as const,
    cashDelta: 0,
    location: "Bengaluru, Karnataka"
  }
];

export default function AdminExchangeDesk({ showToast }: AdminExchangeDeskProps) {
  const [exchanges, setExchanges] = useState<ExchangeRequest[]>(DEFAULT_EXCHANGES);
  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<ExchangeRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "matched" | "completed" | "flagged">("all");
  
  // Edit & override valuation state
  const [overrideValuation, setOverrideValuation] = useState<number | "">("");
  const [isCreatingListing, setIsCreatingListing] = useState(false);

  // New Swap Listing Form State
  const [formOfferedTitle, setFormOfferedTitle] = useState("");
  const [formOfferedMake, setFormOfferedMake] = useState("BMW");
  const [formOfferedModel, setFormOfferedModel] = useState("M340i");
  const [formOfferedYear, setFormOfferedYear] = useState(2023);
  const [formOfferedValuation, setFormOfferedValuation] = useState<number>(5500000);
  const [formOfferedImage, setFormOfferedImage] = useState("");
  const [formOfferedMileage, setFormOfferedMileage] = useState("12,000 km");
  const [formOfferedFuel, setFormOfferedFuel] = useState("Petrol");
  const [formOfferedTransmission, setFormOfferedTransmission] = useState("Automatic");
  const [formDesiredMake, setFormDesiredMake] = useState("Porsche");
  const [formDesiredType, setFormDesiredType] = useState("Porsche Macan / 718 Cayman");
  const [formCashDirection, setFormCashDirection] = useState<"pay_difference" | "receive_difference" | "even_swap">("pay_difference");
  const [formCashDelta, setFormCashDelta] = useState<number>(1000000);
  const [formLocation, setFormLocation] = useState("Mumbai, Maharashtra");
  const [formCreatorName, setFormCreatorName] = useState("AutoWorld Certified Trade Vault");
  const [formCreatorPhone, setFormCreatorPhone] = useState("+91 98200 44556");

  useEffect(() => {
    try {
      const unsubExchanges = onSnapshot(collection(db, "exchanges"), (snap) => {
        if (!snap.empty) {
          const loaded: ExchangeRequest[] = [];
          snap.forEach((d) => loaded.push({ ...(d.data() as ExchangeRequest), id: d.id }));
          setExchanges(loaded);
          
          if (selectedExchange) {
            const updated = loaded.find(e => e.id === selectedExchange.id);
            if (updated) setSelectedExchange(updated);
          }
        }
      });

      const unsubOffers = onSnapshot(collection(db, "trade_offers"), (snap) => {
        if (!snap.empty) {
          const loaded: TradeOffer[] = [];
          snap.forEach((d) => loaded.push({ ...(d.data() as TradeOffer), id: d.id }));
          setTradeOffers(loaded);
        }
      });

      return () => {
        unsubExchanges();
        unsubOffers();
      };
    } catch (e) {
      console.warn("Admin exchanges snapshot notice:", e);
    }
  }, [selectedExchange?.id]);

  // KPIs
  const totalListings = exchanges.length;
  const activeListings = exchanges.filter(e => e.status === "active").length;
  const matchedListings = exchanges.filter(e => e.status === "matched").length;
  const completedListings = exchanges.filter(e => e.status === "completed").length;
  const totalValuationVolume = exchanges.reduce((acc, e) => acc + (e.offeredVehicle?.valuation || 0), 0);

  // Filtered
  const filteredExchanges = exchanges.filter(e => {
    const text = (e.offeredVehicle?.title + " " + e.offeredVehicle?.make + " " + e.desiredVehicle?.targetMake + " " + e.creatorName + " " + e.location + " " + e.id).toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    if (statusFilter === "active") return e.status === "active";
    if (statusFilter === "matched") return e.status === "matched";
    if (statusFilter === "completed") return e.status === "completed";
    if (statusFilter === "flagged") return e.badge === "hot" || e.status === "cancelled";
    return true;
  });

  // Selected item counter offers
  const matchingOffers = selectedExchange 
    ? tradeOffers.filter(o => o.exchangeRequestId === selectedExchange.id) 
    : [];

  const handleUpdateStatus = async (exchangeId: string, newStatus: "active" | "matched" | "completed" | "cancelled") => {
    try {
      await updateDoc(doc(db, "exchanges", exchangeId), { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setExchanges((prev) => prev.map((e) => e.id === exchangeId ? { ...e, status: newStatus } : e));
      showToast(`Exchange listing #${exchangeId} status updated to ${newStatus.toUpperCase()}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to update exchange status in database", "error");
    }
  };

  const handleOverrideValuation = async (exchangeId: string) => {
    if (!overrideValuation || Number(overrideValuation) <= 0) return;
    const exc = exchanges.find(e => e.id === exchangeId);
    if (!exc) return;

    const newOffered = {
      ...exc.offeredVehicle,
      valuation: Number(overrideValuation)
    };

    try {
      await updateDoc(doc(db, "exchanges", exchangeId), {
        offeredVehicle: newOffered,
        updatedAt: new Date().toISOString()
      });
      setExchanges((prev) => prev.map((e) => e.id === exchangeId ? { ...e, offeredVehicle: newOffered } : e));
      showToast(`Valuation adjusted to ₹${Number(overrideValuation).toLocaleString("en-IN")}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to update valuation", "error");
    }
  };

  const handleToggleVerifiedBadge = async (exchangeId: string) => {
    const exc = exchanges.find(e => e.id === exchangeId);
    if (!exc) return;
    const newBadge = exc.badge === "verified" ? undefined : "verified";

    try {
      await updateDoc(doc(db, "exchanges", exchangeId), { badge: newBadge || null });
      setExchanges((prev) => prev.map((e) => e.id === exchangeId ? { ...e, badge: newBadge } : e));
      showToast(newBadge ? "Listing certified & marked as VERIFIED" : "Verified badge removed", "info");
    } catch (err) {
      console.error(err);
      showToast("Failed to toggle verification status", "error");
    }
  };

  const handleDeleteExchange = async (exchangeId: string) => {
    if (!window.confirm("Permanently delete this car exchange listing from the platform?")) return;
    try {
      await deleteDoc(doc(db, "exchanges", exchangeId));
      setExchanges((prev) => prev.filter((e) => e.id !== exchangeId));
      if (selectedExchange?.id === exchangeId) setSelectedExchange(null);
      showToast("Car exchange listing deleted", "info");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete exchange listing", "error");
    }
  };

  const handleCreateNewSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOfferedTitle || !formOfferedImage || formOfferedValuation <= 0) {
      showToast("Please fill in all required vehicle trade terms", "error");
      return;
    }

    const newId = `exc-${Date.now().toString().slice(-6)}`;
    const newExchangeObj: ExchangeRequest = {
      id: newId,
      creatorUid: "admin@autoworld.in",
      creatorName: formCreatorName,
      creatorEmail: "exchange@autoworld.in",
      creatorPhone: formCreatorPhone,
      location: formLocation,
      createdAt: new Date().toISOString(),
      cashDirection: formCashDirection,
      cashDelta: Number(formCashDelta),
      status: "active",
      badge: "verified",
      offeredVehicle: {
        title: formOfferedTitle,
        make: formOfferedMake,
        model: formOfferedModel,
        year: Number(formOfferedYear),
        valuation: Number(formOfferedValuation),
        mileage: formOfferedMileage,
        fuel: formOfferedFuel,
        transmission: formOfferedTransmission,
        condition: 5,
        image: formOfferedImage,
        description: "Official AutoWorld Dealership Certified trade-in specimen. Inspected and verified with ready transfer documentation."
      },
      desiredVehicle: {
        targetMake: formDesiredMake,
        targetType: formDesiredType,
        notes: "Looking for well-maintained single-owner vehicle with complete service records."
      }
    };

    try {
      await setDoc(doc(db, "exchanges", newId), newExchangeObj);
      setExchanges((prev) => [newExchangeObj, ...prev]);
      setSelectedExchange(newExchangeObj);
      setIsCreatingListing(false);
      showToast(`🎉 New certified swap listing posted: ${formOfferedTitle}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to deploy exchange listing to Firestore", "error");
    }
  };

  const applyPreset = (preset: typeof DEALERSHIP_SWAP_PRESETS[0]) => {
    setFormOfferedTitle(preset.offeredTitle);
    setFormOfferedMake(preset.offeredMake);
    setFormOfferedModel(preset.offeredModel);
    setFormOfferedYear(preset.offeredYear);
    setFormOfferedValuation(preset.offeredValuation);
    setFormOfferedImage(preset.offeredImage);
    setFormOfferedMileage(preset.offeredMileage);
    setFormOfferedFuel(preset.offeredFuel);
    setFormOfferedTransmission(preset.offeredTransmission);
    setFormDesiredMake(preset.desiredMake);
    setFormDesiredType(preset.desiredType);
    setFormCashDirection(preset.cashDirection);
    setFormCashDelta(preset.cashDelta);
    setFormLocation(preset.location);
    showToast(`Loaded trade template: ${preset.offeredTitle}`, "info");
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-stone-900 text-white p-6 border-2 border-stone-950 shadow-[4px_4px_0px_0px_rgba(6,182,212,1)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-cyan-500 text-stone-950 text-[10px] font-mono font-black uppercase tracking-wider rounded-none mb-2">
              <Repeat className="w-3.5 h-3.5" /> P2P CAR EXCHANGE & TRADE-IN DESK
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-tight text-white">
              Mutual Valuation Audit & Swap Match Operations
            </h2>
            <p className="text-xs text-stone-400 font-mono mt-1">
              Audit mutual trade evaluations, verify cash difference delta calculations, and manage peer-to-peer vehicle exchanges.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCreatingListing(true)}
              className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Post Certified Swap Listing
            </button>
          </div>
        </div>

        {/* Real-time KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-800 font-mono">
          <div className="bg-stone-950/80 p-3 border border-stone-800">
            <div className="text-[10px] text-stone-400 uppercase font-bold">Total Swap Listings</div>
            <div className="text-lg font-black text-cyan-400 mt-0.5">{totalListings}</div>
          </div>
          <div className="bg-stone-950/80 p-3 border border-stone-800">
            <div className="text-[10px] text-stone-400 uppercase font-bold">Active On Board</div>
            <div className="text-lg font-black text-emerald-400 mt-0.5">{activeListings}</div>
          </div>
          <div className="bg-stone-950/80 p-3 border border-stone-800">
            <div className="text-[10px] text-stone-400 uppercase font-bold">Swaps Completed</div>
            <div className="text-lg font-black text-purple-400 mt-0.5">{completedListings}</div>
          </div>
          <div className="bg-stone-950/80 p-3 border border-stone-800">
            <div className="text-[10px] text-stone-400 uppercase font-bold">Asset Swap Valuation</div>
            <div className="text-lg font-black text-amber-400 mt-0.5">₹{(totalValuationVolume / 10000000).toFixed(2)} Cr</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#FAF8F5] p-3 border border-stone-300 flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-xs">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search make, model, owner, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto scrollbar-none">
          {[
            { id: "all", label: `All Swaps (${exchanges.length})` },
            { id: "active", label: `Active Board (${activeListings})` },
            { id: "matched", label: `In Negotiation (${matchedListings})` },
            { id: "completed", label: `Completed (${completedListings})` },
            { id: "flagged", label: "Flagged / Special" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 font-bold uppercase text-[10px] whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-stone-900 text-white"
                  : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Listings (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {filteredExchanges.length === 0 ? (
            <div className="bg-[#FAF8F5] border border-stone-300 p-12 text-center font-mono">
              <Repeat className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-700 font-bold uppercase text-xs">No car exchange listings found</p>
              <p className="text-stone-400 text-[10px] mt-1">Try another filter or deploy a certified trade listing</p>
            </div>
          ) : (
            filteredExchanges.map((exc) => {
              const isSelected = selectedExchange?.id === exc.id;

              return (
                <div
                  key={exc.id}
                  onClick={() => {
                    setSelectedExchange(exc);
                    setOverrideValuation(exc.offeredVehicle.valuation);
                  }}
                  className={`p-4 bg-white border transition-all cursor-pointer relative ${
                    isSelected 
                      ? "border-cyan-500 ring-2 ring-cyan-500/20 shadow-md bg-cyan-50/20" 
                      : "border-stone-300 hover:border-stone-500 shadow-2xs"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative w-full sm:w-32 h-28 bg-stone-900 shrink-0 overflow-hidden">
                      <img 
                        src={exc.offeredVehicle.image} 
                        alt={exc.offeredVehicle.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-stone-900/90 text-white font-mono text-[9px] font-bold">
                        #{exc.id}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5 font-mono">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-xs ${
                          exc.status === "active" ? "bg-emerald-100 text-emerald-900 border border-emerald-300" :
                          exc.status === "matched" ? "bg-cyan-100 text-cyan-900 border border-cyan-300" :
                          exc.status === "completed" ? "bg-purple-100 text-purple-900 border border-purple-300" :
                          "bg-stone-200 text-stone-800 border border-stone-300"
                        }`}>
                          ● {exc.status}
                        </span>

                        {exc.badge === "verified" && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-300 text-[9px] font-bold uppercase flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-purple-600" /> Certified
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif font-black text-sm text-stone-900 truncate">
                        {exc.offeredVehicle.title}
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase">Offered Value</span>
                          <strong className="text-cyan-700 font-bold text-xs">
                            ₹{(exc.offeredVehicle.valuation / 100000).toFixed(2)}L
                          </strong>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase">Target Vehicle</span>
                          <span className="text-stone-800 font-bold truncate block">
                            {exc.desiredVehicle.targetMake || "Any Make"}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase">Cash Adjustment</span>
                          <span className="text-stone-700 font-semibold text-[10px]">
                            {exc.cashDirection === "even_swap" ? "Even Swap" : `₹${(exc.cashDelta / 100000).toFixed(1)}L`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-100">
                        <span>Trader: {exc.creatorName}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          {exc.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Exchange Detail & Decision Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedExchange ? (
            <div className="bg-[#FAF8F5] p-5 border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-5 font-mono text-xs">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-300">
                <div>
                  <div className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">
                    SWAP LISTING #{selectedExchange.id}
                  </div>
                  <h3 className="font-serif font-black text-base text-stone-900 mt-0.5">
                    {selectedExchange.offeredVehicle.title}
                  </h3>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {selectedExchange.offeredVehicle.year} • {selectedExchange.offeredVehicle.mileage} • {selectedExchange.offeredVehicle.fuel}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-stone-400 uppercase">Valuation</div>
                  <div className="text-sm font-black text-cyan-700 font-mono">
                    ₹{(selectedExchange.offeredVehicle.valuation / 100000).toFixed(2)}L
                  </div>
                </div>
              </div>

              {/* Status Switcher */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase text-stone-600 tracking-wider">
                  Exchange Deal Status:
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(["active", "matched", "completed", "cancelled"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedExchange.id, st)}
                      className={`py-2 px-1 text-center font-bold text-[10px] uppercase cursor-pointer transition ${
                        selectedExchange.status === st
                          ? "bg-stone-900 text-white shadow-xs"
                          : "bg-white text-stone-700 hover:bg-stone-200 border border-stone-300"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trader Dossier & Contact */}
              <div className="p-3 bg-white border border-stone-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-stone-700 uppercase">Trader Contact:</span>
                  <button
                    onClick={() => handleToggleVerifiedBadge(selectedExchange.id)}
                    className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-xs cursor-pointer border ${
                      selectedExchange.badge === "verified"
                        ? "bg-purple-100 text-purple-900 border-purple-300"
                        : "bg-stone-100 text-stone-700 border-stone-300"
                    }`}
                  >
                    {selectedExchange.badge === "verified" ? "✓ Verified Trader" : "+ Verify Trader"}
                  </button>
                </div>
                <div className="font-bold text-stone-900 text-xs">{selectedExchange.creatorName}</div>
                <div className="text-stone-600 text-[11px] space-y-0.5">
                  <div>📞 {selectedExchange.creatorPhone}</div>
                  <div>✉️ {selectedExchange.creatorEmail}</div>
                  <div>📍 {selectedExchange.location}</div>
                </div>

                {/* Direct WhatsApp Trigger */}
                <div className="pt-2 flex gap-2">
                  <a
                    href={`https://wa.me/${selectedExchange.creatorPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${selectedExchange.creatorName}, this is AutoWorld Car Exchange Hub regarding your trade listing for ${selectedExchange.offeredVehicle.title}. We have reviewed your target vehicle criteria.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold uppercase text-center flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <MessageCircle className="w-3 h-3" /> WhatsApp Trader
                  </a>
                  <a
                    href={`tel:${selectedExchange.creatorPhone}`}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[9px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Phone className="w-3 h-3" /> Call
                  </a>
                </div>
              </div>

              {/* Trade Terms & Delta Breakdown */}
              <div className="p-3 bg-cyan-50 border border-cyan-200 space-y-2 text-cyan-950">
                <div className="text-[10px] font-bold text-cyan-900 uppercase">Target Swap Requirements:</div>
                <div className="text-xs font-semibold">
                  Desired: <span className="font-bold text-cyan-900">{selectedExchange.desiredVehicle.targetMake}</span> ({selectedExchange.desiredVehicle.targetType})
                </div>
                <div className="text-[11px] text-cyan-800">
                  Cash Delta Direction: <strong>{selectedExchange.cashDirection.replace("_", " ").toUpperCase()}</strong>
                </div>
                <div className="text-xs font-bold font-mono text-cyan-950">
                  Adjustment Amount: ₹{selectedExchange.cashDelta.toLocaleString("en-IN")}
                </div>
                {selectedExchange.desiredVehicle.notes && (
                  <div className="text-[10px] text-cyan-700 italic pt-1 border-t border-cyan-200">
                    "{selectedExchange.desiredVehicle.notes}"
                  </div>
                )}
              </div>

              {/* Real-Time Valuation Recalibrator */}
              <div className="space-y-1.5 pt-3 border-t border-stone-300">
                <label className="block text-[10px] font-extrabold uppercase text-stone-600 tracking-wider">
                  Recalibrate / Override Vehicle Appraisal:
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={overrideValuation}
                    onChange={(e) => setOverrideValuation(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Enter new valuation in INR"
                    className="flex-1 p-2 bg-white border border-stone-300 font-mono text-xs focus:outline-none focus:border-stone-900"
                  />
                  <button
                    onClick={() => handleOverrideValuation(selectedExchange.id)}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Counter Proposals & Trade Offers */}
              <div className="space-y-2 pt-3 border-t border-stone-300">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-stone-700 uppercase text-[10px] tracking-wider">
                    Counter Proposals Submitted ({matchingOffers.length})
                  </h4>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {matchingOffers.length > 0 ? (
                    matchingOffers.map((off) => (
                      <div key={off.id} className="p-2 bg-white border border-stone-200 space-y-1 text-[11px]">
                        <div className="flex items-center justify-between font-bold text-stone-900">
                          <span>{off.proposerVehicle.title}</span>
                          <span className="font-mono text-cyan-700">₹{(off.proposerVehicle.valuation / 100000).toFixed(2)}L</span>
                        </div>
                        <div className="text-[10px] text-stone-500">
                          By: {off.proposerName} ({off.proposerPhone})
                        </div>
                        <div className="text-[10px] font-mono text-stone-700">
                          Proposed Delta: ₹{off.cashOfferAmount?.toLocaleString("en-IN") || 0}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-white border border-dashed border-stone-300 text-center text-stone-400 text-[10px]">
                      No counter trade proposals received on this listing yet
                    </div>
                  )}
                </div>
              </div>

              {/* Delete Action */}
              <div className="pt-3 border-t border-stone-300 flex justify-end">
                <button
                  onClick={() => handleDeleteExchange(selectedExchange.id)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Swap Listing
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#FAF8F5] p-12 border border-stone-300 text-center font-mono text-xs space-y-2">
              <Repeat className="w-8 h-8 text-stone-300 mx-auto" />
              <div className="font-bold text-stone-600 uppercase">No Swap Listing Selected</div>
              <p className="text-stone-400 text-[10px]">Select any trade-in exchange listing from the left workbench to inspect target requirements, audit valuations, or connect with traders.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW CAR SWAP LISTING MODAL */}
      {isCreatingListing && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF8F5] border-2 border-stone-900 max-w-2xl w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-5 font-mono my-8">
            <div className="flex items-center justify-between border-b border-stone-300 pb-3">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-cyan-500" />
                <h3 className="font-serif font-black uppercase text-base text-stone-900">Post Certified Dealership Swap Listing</h3>
              </div>
              <button
                onClick={() => setIsCreatingListing(false)}
                className="p-1 text-stone-400 hover:text-stone-900 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-stone-500 font-bold uppercase">Rapid Certified Trade Templates:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DEALERSHIP_SWAP_PRESETS.map((p) => (
                  <button
                    key={p.offeredTitle}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="p-2 bg-white border border-stone-300 hover:border-cyan-500 text-left cursor-pointer transition text-[10px]"
                  >
                    <strong className="block text-stone-900 font-serif truncate">{p.offeredModel}</strong>
                    <span className="text-cyan-700 font-mono">₹{(p.offeredValuation / 100000).toFixed(2)}L</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateNewSwap} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Offered Vehicle Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2023 BMW M340i xDrive"
                    value={formOfferedTitle}
                    onChange={(e) => setFormOfferedTitle(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Offered Make *</label>
                  <input
                    type="text"
                    required
                    value={formOfferedMake}
                    onChange={(e) => setFormOfferedMake(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Offered Model *</label>
                  <input
                    type="text"
                    required
                    value={formOfferedModel}
                    onChange={(e) => setFormOfferedModel(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Year</label>
                  <input
                    type="number"
                    value={formOfferedYear}
                    onChange={(e) => setFormOfferedYear(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Offered Vehicle Valuation (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formOfferedValuation}
                    onChange={(e) => setFormOfferedValuation(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Vehicle Image URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={formOfferedImage}
                    onChange={(e) => setFormOfferedImage(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Desired Target Make *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Porsche, BMW, Mercedes"
                    value={formDesiredMake}
                    onChange={(e) => setFormDesiredMake(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Desired Model / Type *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Porsche Macan or 718"
                    value={formDesiredType}
                    onChange={(e) => setFormDesiredType(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Cash Delta Direction</label>
                  <select
                    value={formCashDirection}
                    onChange={(e) => setFormCashDirection(e.target.value as any)}
                    className="w-full p-2 bg-white border border-stone-300"
                  >
                    <option value="pay_difference">Trader Pays Cash Difference</option>
                    <option value="receive_difference">Trader Receives Cash Difference</option>
                    <option value="even_swap">Even Value Swap (₹0)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Estimated Cash Delta (₹)</label>
                  <input
                    type="number"
                    value={formCashDelta}
                    onChange={(e) => setFormCashDelta(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Location / Hub</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formCreatorPhone}
                    onChange={(e) => setFormCreatorPhone(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-300">
                <button
                  type="button"
                  onClick={() => setIsCreatingListing(false)}
                  className="px-4 py-2 bg-white border border-stone-300 font-bold uppercase text-[10px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black uppercase text-[10px] tracking-wider cursor-pointer shadow-xs"
                >
                  Deploy Swap Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
