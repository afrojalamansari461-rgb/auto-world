import React, { useState, useEffect } from "react";
import { 
  Zap, Clock, Gavel, ShieldCheck, CheckCircle2, AlertCircle, 
  Trash2, Plus, Edit2, RefreshCw, Trophy, Lock, Users, ArrowUpRight,
  TrendingUp, Volume2, Phone, Mail, MessageCircle, DollarSign, Calendar,
  Flame, CheckCircle, XCircle, Search, Filter, Play, Pause, AlertTriangle
} from "lucide-react";
import { Auction, AuctionBid, DEFAULT_AUCTIONS } from "../types";
import { db } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";

interface AdminAuctionDeskProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const SUPERCAR_PRESETS = [
  {
    title: "2024 Porsche 911 GT3 RS (992)",
    make: "Porsche",
    model: "911 GT3 RS",
    year: 2024,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80",
    startingBid: 28000000,
    reservePrice: 31500000,
    mileage: "1,200 km",
    fuel: "Petrol",
    transmission: "7-Speed PDK",
    soundType: "supercar",
    highlights: "Weissach Package with Exposed Carbon Roof & Magnesium Forged Wheels, Front Axle Lift"
  },
  {
    title: "2023 Lamborghini Huracán Tecnica",
    make: "Lamborghini",
    model: "Huracan Tecnica",
    year: 2023,
    image: "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=800&auto=format&fit=crop&q=80",
    startingBid: 34000000,
    reservePrice: 38000000,
    mileage: "3,100 km",
    fuel: "Petrol",
    transmission: "7-Speed LDF Dual-Clutch",
    soundType: "supercar",
    highlights: "5.2L Naturally Aspirated V10 (631 HP), Verde Selvans Pearl Effect, Carbon Bucket Seats"
  },
  {
    title: "2023 Ferrari Roma V8 Twin-Turbo",
    make: "Ferrari",
    model: "Roma",
    year: 2023,
    image: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&auto=format&fit=crop&q=80",
    startingBid: 31000000,
    reservePrice: 34500000,
    mileage: "4,200 km",
    fuel: "Petrol",
    transmission: "8-Speed F1 Dual-Clutch",
    soundType: "supercar",
    highlights: "Rosso Corsa over Cuoio Leather, Passenger Display Screen, Carbon Ceramic Brakes"
  },
  {
    title: "2023 Mercedes-AMG G63 4x4²",
    make: "Mercedes",
    model: "AMG G63",
    year: 2023,
    image: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?w=800&auto=format&fit=crop&q=80",
    startingBid: 29000000,
    reservePrice: 33000000,
    mileage: "6,400 km",
    fuel: "Petrol",
    transmission: "AMG SPEEDSHIFT TCT 9G",
    soundType: "v8_rumble",
    highlights: "4.0L V8 Biturbo (577 HP), Night Package Magno, Burmester 3D Surround Sound"
  }
];

export default function AdminAuctionDesk({ showToast }: AdminAuctionDeskProps) {
  const [auctions, setAuctions] = useState<Auction[]>(DEFAULT_AUCTIONS);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "upcoming" | "ended" | "reserve_met">("all");
  
  // Controls state
  const [newReservePrice, setNewReservePrice] = useState<number | "">("");
  const [isCreatingLot, setIsCreatingLot] = useState(false);
  const [isEditingLot, setIsEditingLot] = useState(false);
  const [testBidAmount, setTestBidAmount] = useState<number | "">("");
  const [testBidderName, setTestBidderName] = useState("AutoWorld Certified Floor Bidder");

  // New Lot Form State
  const [formTitle, setFormTitle] = useState("");
  const [formMake, setFormMake] = useState("Porsche");
  const [formModel, setFormModel] = useState("911 GT3 RS");
  const [formYear, setFormYear] = useState(2024);
  const [formImage, setFormImage] = useState("");
  const [formStartingBid, setFormStartingBid] = useState<number>(10000000);
  const [formReservePrice, setFormReservePrice] = useState<number>(12000000);
  const [formMinIncrement, setFormMinIncrement] = useState<number>(50000);
  const [formDurationHours, setFormDurationHours] = useState<number>(24);
  const [formMileage, setFormMileage] = useState("4,200 km");
  const [formFuel, setFormFuel] = useState("Petrol");
  const [formTransmission, setFormTransmission] = useState("Automatic");
  const [formLocation, setFormLocation] = useState("Mumbai, Maharashtra");
  const [formHighlights, setFormHighlights] = useState("100-Point Certified Inspection, XPEL Ultimate PPF, Zero Accident Record");

  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, "auctions"), (snap) => {
        if (!snap.empty) {
          const loaded: Auction[] = [];
          snap.forEach((d) => loaded.push({ ...(d.data() as Auction), id: d.id }));
          setAuctions(loaded);
          
          // keep selected lot in sync
          if (selectedAuction) {
            const updatedSelected = loaded.find(a => a.id === selectedAuction.id);
            if (updatedSelected) setSelectedAuction(updatedSelected);
          }
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("Admin auctions snapshot notice:", e);
    }
  }, [selectedAuction?.id]);

  // KPIs
  const totalLots = auctions.length;
  const liveLots = auctions.filter(a => a.status === "live").length;
  const totalBidVolume = auctions.reduce((acc, a) => acc + (a.currentBid || 0), 0);
  const highestCurrentBid = Math.max(0, ...auctions.map(a => a.currentBid || 0));
  const reserveMetCount = auctions.filter(a => a.isReserveMet).length;
  const reserveMetRate = totalLots > 0 ? Math.round((reserveMetCount / totalLots) * 100) : 0;
  const totalBidsLogged = auctions.reduce((acc, a) => acc + (a.bidCount || a.bids?.length || 0), 0);

  // Filtered lots
  const filteredAuctions = auctions.filter(a => {
    const matchesSearch = (a.title + " " + a.make + " " + a.model + " " + a.id).toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "live") return a.status === "live";
    if (statusFilter === "upcoming") return a.status === "upcoming";
    if (statusFilter === "ended") return a.status === "ended" || a.status === "settled";
    if (statusFilter === "reserve_met") return a.isReserveMet;
    return true;
  });

  const handleUpdateStatus = async (auctionId: string, newStatus: "live" | "upcoming" | "ended" | "settled") => {
    try {
      await updateDoc(doc(db, "auctions", auctionId), { status: newStatus });
      setAuctions((prev) => prev.map((a) => a.id === auctionId ? { ...a, status: newStatus } : a));
      showToast(`Auction lot #${auctionId} status updated to ${newStatus.toUpperCase()}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to update status in database", "error");
    }
  };

  const handleExtendTime = async (auctionId: string, hours: number) => {
    const auc = auctions.find((a) => a.id === auctionId);
    if (!auc) return;
    const currentEnd = new Date(auc.endTime).getTime();
    const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
    const newEnd = new Date(baseTime + hours * 3600 * 1000).toISOString();

    try {
      await updateDoc(doc(db, "auctions", auctionId), { endTime: newEnd, status: "live" });
      setAuctions((prev) => prev.map((a) => a.id === auctionId ? { ...a, endTime: newEnd, status: "live" } : a));
      showToast(`Auction timer extended by +${hours} hour(s) for ${auc.title}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to extend timer in database", "error");
    }
  };

  const handleReset24HourTimer = async (auctionId: string) => {
    const auc = auctions.find((a) => a.id === auctionId);
    if (!auc) return;
    const newStart = new Date().toISOString();
    const newEnd = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    try {
      await updateDoc(doc(db, "auctions", auctionId), {
        startTime: newStart,
        endTime: newEnd,
        status: "live"
      });
      setAuctions((prev) => prev.map((a) => a.id === auctionId ? { ...a, startTime: newStart, endTime: newEnd, status: "live" } : a));
      showToast(`Reset 24-Hour Flash countdown for ${auc.title}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to reset countdown timer", "error");
    }
  };

  const handleUpdateReserve = async (auctionId: string) => {
    if (!newReservePrice || Number(newReservePrice) <= 0) return;
    const auc = auctions.find((a) => a.id === auctionId);
    if (!auc) return;
    const isMet = auc.currentBid >= Number(newReservePrice);

    try {
      await updateDoc(doc(db, "auctions", auctionId), {
        reservePrice: Number(newReservePrice),
        isReserveMet: isMet
      });
      setAuctions((prev) => prev.map((a) => a.id === auctionId ? { ...a, reservePrice: Number(newReservePrice), isReserveMet: isMet } : a));
      showToast(`Reserve price updated to ₹${Number(newReservePrice).toLocaleString("en-IN")} (${isMet ? "RESERVE MET" : "BELOW RESERVE"})`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to update reserve price", "error");
    }
  };

  const handleDeleteAuction = async (auctionId: string) => {
    if (!window.confirm("Are you sure you want to delete this auction lot from the live floor permanently?")) return;
    try {
      await deleteDoc(doc(db, "auctions", auctionId));
      setAuctions((prev) => prev.filter((a) => a.id !== auctionId));
      if (selectedAuction?.id === auctionId) setSelectedAuction(null);
      showToast("Auction lot removed from platform", "info");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete auction", "error");
    }
  };

  const handleDeclareWinner = async (auctionId: string) => {
    const auc = auctions.find((a) => a.id === auctionId);
    if (!auc) return;
    if (!auc.bids || auc.bids.length === 0) {
      showToast("Cannot declare winner: No bids recorded on this lot yet", "error");
      return;
    }
    const topBid = auc.bids[auc.bids.length - 1];

    if (!window.confirm(`Declare ${topBid.bidderName} as winner with top bid of ₹${topBid.amount.toLocaleString("en-IN")}? This will settle and close the lot.`)) {
      return;
    }

    try {
      await updateDoc(doc(db, "auctions", auctionId), {
        status: "settled",
        winnerUid: topBid.bidderUid,
        winnerName: topBid.bidderName,
        winningBid: topBid.amount
      });
      setAuctions((prev) => prev.map((a) => a.id === auctionId ? { 
        ...a, 
        status: "settled", 
        winnerUid: topBid.bidderUid,
        winnerName: topBid.bidderName,
        winningBid: topBid.amount 
      } : a));
      showToast(`🏆 Winner declared: ${topBid.bidderName} (₹${topBid.amount.toLocaleString("en-IN")})`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to finalize auction winner", "error");
    }
  };

  const handleDeleteBid = async (auctionId: string, bidIndex: number) => {
    const auc = auctions.find((a) => a.id === auctionId);
    if (!auc || !auc.bids) return;

    if (!window.confirm("Revoke this bid? If this is the highest bid, the lot's current bid will automatically revert to the previous valid bid.")) return;

    const newBids = [...auc.bids];
    newBids.splice(bidIndex, 1);

    const newCurrentBid = newBids.length > 0 ? Math.max(...newBids.map(b => b.amount)) : auc.startingBid;
    const newIsReserveMet = newCurrentBid >= auc.reservePrice;

    try {
      await updateDoc(doc(db, "auctions", auctionId), {
        bids: newBids,
        bidCount: newBids.length,
        currentBid: newCurrentBid,
        isReserveMet: newIsReserveMet
      });
      setAuctions((prev) => prev.map((a) => a.id === auctionId ? {
        ...a,
        bids: newBids,
        bidCount: newBids.length,
        currentBid: newCurrentBid,
        isReserveMet: newIsReserveMet
      } : a));
      showToast(`Bid revoked. Current bid adjusted to ₹${newCurrentBid.toLocaleString("en-IN")}`, "info");
    } catch (err) {
      console.error(err);
      showToast("Failed to revoke bid", "error");
    }
  };

  const handlePlaceSimulatedBid = async (auctionId: string) => {
    const auc = auctions.find((a) => a.id === auctionId);
    if (!auc) return;
    const minRequired = (auc.currentBid || auc.startingBid) + (auc.minIncrement || 50000);
    const amount = testBidAmount ? Number(testBidAmount) : minRequired;

    if (amount <= (auc.currentBid || 0)) {
      showToast(`Test bid must be higher than current bid (₹${(auc.currentBid || 0).toLocaleString("en-IN")})`, "error");
      return;
    }

    const newBidObj: AuctionBid = {
      id: `bid-test-${Date.now()}`,
      bidderUid: `admin-sim-${Date.now()}`,
      bidderName: testBidderName || "Certified Floor Bidder",
      amount: amount,
      timestamp: "Just now"
    };

    const updatedBids = [...(auc.bids || []), newBidObj];
    const isReserveMet = amount >= auc.reservePrice;

    try {
      await updateDoc(doc(db, "auctions", auctionId), {
        bids: updatedBids,
        bidCount: updatedBids.length,
        currentBid: amount,
        isReserveMet: isReserveMet
      });
      setAuctions((prev) => prev.map((a) => a.id === auctionId ? {
        ...a,
        bids: updatedBids,
        bidCount: updatedBids.length,
        currentBid: amount,
        isReserveMet: isReserveMet
      } : a));
      setTestBidAmount("");
      showToast(`Floor test bid of ₹${amount.toLocaleString("en-IN")} submitted successfully`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to record test bid", "error");
    }
  };

  const handleCreateNewLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formImage || formStartingBid <= 0 || formReservePrice <= 0) {
      showToast("Please fill in all required auction details", "error");
      return;
    }

    const newId = `auc-${Date.now().toString().slice(-6)}`;
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + formDurationHours * 3600 * 1000).toISOString();

    const newAuctionObj: Auction = {
      id: newId,
      title: formTitle,
      make: formMake,
      model: formModel,
      year: Number(formYear),
      image: formImage,
      photos: [{ src: formImage, alt: formTitle }],
      startingBid: Number(formStartingBid),
      currentBid: Number(formStartingBid),
      bidCount: 0,
      minIncrement: Number(formMinIncrement),
      reservePrice: Number(formReservePrice),
      isReserveMet: false,
      startTime: startTime,
      endTime: endTime,
      status: "live",
      bids: [],
      sellerUid: "admin@autoworld.in",
      sellerName: "AutoWorld Certified Direct Vault",
      sellerPhone: "+91 98200 11223",
      sellerEmail: "auctions@autoworld.in",
      location: formLocation,
      condition: 5,
      mileage: formMileage,
      fuel: formFuel,
      transmission: formTransmission,
      engineSoundUrl: "preset:bmw_twinpower_turbo",
      engineSoundTitle: `${formMake} High-Rev Performance Soundtrack`,
      engineSoundType: "supercar",
      highlights: formHighlights.split(",").map(h => h.trim()).filter(Boolean),
      verifiedOnly: true,
      featured: true
    };

    try {
      await setDoc(doc(db, "auctions", newId), newAuctionObj);
      setAuctions((prev) => [newAuctionObj, ...prev]);
      setSelectedAuction(newAuctionObj);
      setIsCreatingLot(false);
      showToast(`🎉 New flash auction lot created: ${formTitle}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to create auction lot in Firestore", "error");
    }
  };

  const applyPreset = (preset: typeof SUPERCAR_PRESETS[0]) => {
    setFormTitle(preset.title);
    setFormMake(preset.make);
    setFormModel(preset.model);
    setFormYear(preset.year);
    setFormImage(preset.image);
    setFormStartingBid(preset.startingBid);
    setFormReservePrice(preset.reservePrice);
    setFormMileage(preset.mileage);
    setFormFuel(preset.fuel);
    setFormTransmission(preset.transmission);
    setFormHighlights(preset.highlights);
    showToast(`Loaded preset: ${preset.title}`, "info");
  };

  return (
    <div className="space-y-6">
      {/* Header Desk Info */}
      <div className="bg-stone-900 text-white p-6 border-2 border-stone-950 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-500 text-stone-950 text-[10px] font-mono font-black uppercase tracking-wider rounded-none mb-2">
              <Zap className="w-3.5 h-3.5 fill-stone-950" /> FLASH AUCTION DIRECTOR DESK
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-tight text-white">
              Live Bidding Floor & Supercar Drop Operations
            </h2>
            <p className="text-xs text-stone-400 font-mono mt-1">
              Govern 24-hour timed auctions, calibrate reserve prices, manage anti-sniping timers, and audit live bidding ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCreatingLot(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Create Auction Lot
            </button>
          </div>
        </div>

        {/* Real-time KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-stone-800 font-mono">
          <div className="bg-stone-950/80 p-3 border border-stone-800">
            <div className="text-[10px] text-stone-400 uppercase font-bold">Active Live Lots</div>
            <div className="text-lg font-black text-amber-400 mt-0.5">{liveLots} / {totalLots}</div>
          </div>
          <div className="bg-stone-950/80 p-3 border border-stone-800">
            <div className="text-[10px] text-stone-400 uppercase font-bold">Total Bid Volume</div>
            <div className="text-lg font-black text-emerald-400 mt-0.5">₹{(totalBidVolume / 10000000).toFixed(2)} Cr</div>
          </div>
          <div className="bg-stone-950/80 p-3 border border-stone-800">
            <div className="text-[10px] text-stone-400 uppercase font-bold">Highest Active Bid</div>
            <div className="text-lg font-black text-white mt-0.5">₹{(highestCurrentBid / 100000).toFixed(1)} Lakh</div>
          </div>
          <div className="bg-stone-950/80 p-3 border border-stone-800">
            <div className="text-[10px] text-stone-400 uppercase font-bold">Reserve Clearance</div>
            <div className="text-lg font-black text-cyan-400 mt-0.5">{reserveMetRate}% Met</div>
          </div>
          <div className="bg-stone-950/80 p-3 border border-stone-800 col-span-2 sm:col-span-1">
            <div className="text-[10px] text-stone-400 uppercase font-bold">Total Bids Placed</div>
            <div className="text-lg font-black text-purple-400 mt-0.5">{totalBidsLogged} bids</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#FAF8F5] p-3 border border-stone-300 flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-xs">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search lot ID, title, make..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto scrollbar-none">
          {[
            { id: "all", label: `All Lots (${auctions.length})` },
            { id: "live", label: `Live Floor (${liveLots})` },
            { id: "upcoming", label: "Upcoming" },
            { id: "ended", label: "Ended / Settled" },
            { id: "reserve_met", label: `Reserve Met (${reserveMetCount})` }
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

      {/* Main Two-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lots List (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {filteredAuctions.length === 0 ? (
            <div className="bg-[#FAF8F5] border border-stone-300 p-12 text-center font-mono">
              <Gavel className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-700 font-bold uppercase text-xs">No auction lots match current criteria</p>
              <p className="text-stone-400 text-[10px] mt-1">Adjust search filter or create a new auction lot</p>
            </div>
          ) : (
            filteredAuctions.map((auc) => {
              const isSelected = selectedAuction?.id === auc.id;
              const hasEnded = new Date(auc.endTime).getTime() <= Date.now() || auc.status === "ended" || auc.status === "settled";

              return (
                <div
                  key={auc.id}
                  onClick={() => {
                    setSelectedAuction(auc);
                    setNewReservePrice(auc.reservePrice);
                  }}
                  className={`p-4 bg-white border transition-all cursor-pointer relative ${
                    isSelected 
                      ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md bg-amber-50/20" 
                      : "border-stone-300 hover:border-stone-500 shadow-2xs"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative w-full sm:w-32 h-28 bg-stone-900 shrink-0 overflow-hidden">
                      <img src={auc.image} alt={auc.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-stone-900/90 text-white font-mono text-[9px] font-bold">
                        #{auc.id}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5 font-mono">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-xs ${
                          auc.status === "live" && !hasEnded ? "bg-emerald-100 text-emerald-900 border border-emerald-300" :
                          auc.status === "settled" ? "bg-purple-100 text-purple-900 border border-purple-300" :
                          auc.status === "upcoming" ? "bg-amber-100 text-amber-900 border border-amber-300" :
                          "bg-stone-200 text-stone-800 border border-stone-300"
                        }`}>
                          ● {auc.status === "live" && hasEnded ? "EXPIRED / ENDED" : auc.status}
                        </span>

                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${
                          auc.isReserveMet ? "bg-emerald-50 text-emerald-800 border border-emerald-300" : "bg-amber-50 text-amber-800 border border-amber-300"
                        }`}>
                          {auc.isReserveMet ? "✓ Reserve Met" : "⚠ Below Reserve"}
                        </span>
                      </div>

                      <h3 className="font-serif font-black text-sm text-stone-900 truncate">{auc.title}</h3>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase">Current High Bid</span>
                          <strong className="text-amber-700 font-bold text-xs">₹{auc.currentBid.toLocaleString("en-IN")}</strong>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase">Reserve Threshold</span>
                          <span className="text-stone-700 font-semibold">₹{auc.reservePrice.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase">Floor Activity</span>
                          <span className="text-stone-800 font-bold">{auc.bidCount || auc.bids?.length || 0} bids</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-100">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          Ends: {new Date(auc.endTime).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span>{auc.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Lot Control Desk (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedAuction ? (
            <div className="bg-[#FAF8F5] p-5 border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-5 font-mono text-xs">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-300">
                <div>
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">AUCTION LOT #{selectedAuction.id}</div>
                  <h3 className="font-serif font-black text-base text-stone-900 mt-0.5">{selectedAuction.title}</h3>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {selectedAuction.year} • {selectedAuction.mileage} • {selectedAuction.fuel} • {selectedAuction.transmission}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-stone-400 uppercase">Top Bid</div>
                  <div className="text-sm font-black text-amber-700 font-mono">₹{(selectedAuction.currentBid / 100000).toFixed(2)}L</div>
                </div>
              </div>

              {/* Status Switcher */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase text-stone-600 tracking-wider">
                  Auction Floor Status:
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(["live", "upcoming", "ended", "settled"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedAuction.id, st)}
                      className={`py-2 px-1 text-center font-bold text-[10px] uppercase cursor-pointer transition ${
                        selectedAuction.status === st
                          ? "bg-stone-900 text-white shadow-xs"
                          : "bg-white text-stone-700 hover:bg-stone-200 border border-stone-300"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anti-Sniping Timer Extensions */}
              <div className="space-y-1.5 pt-3 border-t border-stone-300">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase text-stone-600 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Extend Timer / Anti-Sniping Boost:
                  </label>
                  <span className="text-[9px] text-stone-500">
                    Remaining: {Math.max(0, Math.round((new Date(selectedAuction.endTime).getTime() - Date.now()) / (1000 * 60)))} mins
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { hrs: 0.25, label: "+15m" },
                    { hrs: 1, label: "+1h" },
                    { hrs: 6, label: "+6h" },
                    { hrs: 24, label: "+24h" }
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      onClick={() => handleExtendTime(selectedAuction.id, btn.hrs)}
                      className="py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-stone-300 font-bold text-[10px] cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleReset24HourTimer(selectedAuction.id)}
                  className="w-full py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-[10px] font-bold uppercase tracking-wider cursor-pointer mt-1"
                >
                  ↻ Reset to Full 24-Hour Countdown
                </button>
              </div>

              {/* Reserve Price Adjuster */}
              <div className="space-y-1.5 pt-3 border-t border-stone-300">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase text-stone-600 tracking-wider">
                    Reserve Price Threshold:
                  </label>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-xs ${
                    selectedAuction.isReserveMet ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedAuction.isReserveMet ? "MET" : "NOT MET"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newReservePrice}
                    onChange={(e) => setNewReservePrice(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Enter threshold in INR"
                    className="flex-1 p-2 bg-white border border-stone-300 font-mono text-xs focus:outline-none focus:border-stone-900"
                  />
                  <button
                    onClick={() => handleUpdateReserve(selectedAuction.id)}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Declare Winner & Settle */}
              {selectedAuction.bids && selectedAuction.bids.length > 0 && selectedAuction.status !== "settled" && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-amber-900 uppercase text-[10px] flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-600" />
                      Highest Bidder: {selectedAuction.bids[selectedAuction.bids.length - 1].bidderName}
                    </div>
                    <span className="font-bold text-amber-900">
                      ₹{selectedAuction.bids[selectedAuction.bids.length - 1].amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeclareWinner(selectedAuction.id)}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase text-[10px] tracking-wider cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-3.5 h-3.5" /> Declare Winner & Finalize Deal
                  </button>
                </div>
              )}

              {/* Winner Dossier & Contact */}
              {selectedAuction.winnerName && (
                <div className="p-3 bg-purple-50 border border-purple-200 space-y-2">
                  <div className="text-[10px] font-bold text-purple-900 uppercase">🏆 Official Winner Settled:</div>
                  <div className="font-bold text-stone-900">{selectedAuction.winnerName}</div>
                  <div className="text-stone-600">Winning Sum: ₹{(selectedAuction.winningBid || selectedAuction.currentBid).toLocaleString("en-IN")}</div>
                  <div className="flex gap-2 pt-1">
                    <a
                      href={`https://wa.me/919820011223?text=${encodeURIComponent(`Hello ${selectedAuction.winnerName}, congratulations on winning the AutoWorld auction for ${selectedAuction.title} at ₹${(selectedAuction.winningBid || selectedAuction.currentBid).toLocaleString("en-IN")}. Please share your delivery address.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold uppercase text-center flex items-center justify-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" /> WhatsApp Winner
                    </a>
                  </div>
                </div>
              )}

              {/* Live Bidding Ledger Audit */}
              <div className="space-y-2 pt-3 border-t border-stone-300">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-stone-700 uppercase text-[10px] tracking-wider">
                    Bid History Audit ({selectedAuction.bids?.length || 0})
                  </h4>
                  <span className="text-[9px] text-stone-400">Moderation Enabled</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedAuction.bids && selectedAuction.bids.length > 0 ? (
                    selectedAuction.bids.slice().reverse().map((b, idx) => {
                      const originalIdx = selectedAuction.bids!.length - 1 - idx;
                      return (
                        <div key={b.id || idx} className="flex items-center justify-between p-2 bg-white border border-stone-200 text-[11px] group">
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-stone-900 truncate">{b.bidderName}</div>
                            <div className="text-[9px] text-stone-400">{b.timestamp || "Recent"}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-black text-amber-700">₹{b.amount.toLocaleString("en-IN")}</span>
                            <button
                              onClick={() => handleDeleteBid(selectedAuction.id, originalIdx)}
                              className="p-1 text-stone-300 hover:text-red-600 transition cursor-pointer"
                              title="Revoke fraudulent bid"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 bg-white border border-dashed border-stone-300 text-center text-stone-400 text-[10px]">
                      No bids logged on this auction lot yet
                    </div>
                  )}
                </div>
              </div>

              {/* Floor Test Bid Simulator */}
              <div className="p-3 bg-stone-100 border border-stone-300 space-y-2">
                <div className="text-[10px] font-bold text-stone-700 uppercase">Simulate / Certified Floor Bid:</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Bidder Name"
                    value={testBidderName}
                    onChange={(e) => setTestBidderName(e.target.value)}
                    className="p-1.5 bg-white border border-stone-300 text-[10px]"
                  />
                  <input
                    type="number"
                    placeholder={`Min ₹${(selectedAuction.currentBid + selectedAuction.minIncrement).toLocaleString()}`}
                    value={testBidAmount}
                    onChange={(e) => setTestBidAmount(e.target.value ? Number(e.target.value) : "")}
                    className="p-1.5 bg-white border border-stone-300 text-[10px]"
                  />
                </div>
                <button
                  onClick={() => handlePlaceSimulatedBid(selectedAuction.id)}
                  className="w-full py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold uppercase text-[9px] tracking-wider cursor-pointer"
                >
                  + Inject Test Bid into Floor
                </button>
              </div>

              {/* Delete Auction */}
              <div className="pt-3 border-t border-stone-300 flex justify-end">
                <button
                  onClick={() => handleDeleteAuction(selectedAuction.id)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Auction Lot
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#FAF8F5] p-12 border border-stone-300 text-center font-mono text-xs space-y-2">
              <Gavel className="w-8 h-8 text-stone-300 mx-auto" />
              <div className="font-bold text-stone-600 uppercase">No Lot Selected</div>
              <p className="text-stone-400 text-[10px]">Select any auction lot from the left workbench to inspect bids, calibrate reserves, or extend countdown timers.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW AUCTION LOT MODAL */}
      {isCreatingLot && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF8F5] border-2 border-stone-900 max-w-2xl w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-5 font-mono my-8">
            <div className="flex items-center justify-between border-b border-stone-300 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-serif font-black uppercase text-base text-stone-900">Create New Flash Auction Lot</h3>
              </div>
              <button
                onClick={() => setIsCreatingLot(false)}
                className="p-1 text-stone-400 hover:text-stone-900 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-stone-500 font-bold uppercase">Rapid Supercar Drop Presets:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SUPERCAR_PRESETS.map((p) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="p-2 bg-white border border-stone-300 hover:border-amber-500 text-left cursor-pointer transition text-[10px]"
                  >
                    <strong className="block text-stone-900 font-serif truncate">{p.model}</strong>
                    <span className="text-amber-600 font-mono">₹{(p.startingBid / 10000000).toFixed(2)} Cr</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateNewLot} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Lot Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2024 Porsche 911 GT3 RS (992)"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Make / Brand *</label>
                  <input
                    type="text"
                    required
                    value={formMake}
                    onChange={(e) => setFormMake(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Model *</label>
                  <input
                    type="text"
                    required
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Year</label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Mileage</label>
                  <input
                    type="text"
                    value={formMileage}
                    onChange={(e) => setFormMileage(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Primary Image URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Starting Floor Bid (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formStartingBid}
                    onChange={(e) => setFormStartingBid(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Reserve Price Threshold (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formReservePrice}
                    onChange={(e) => setFormReservePrice(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Minimum Bid Increment (₹)</label>
                  <select
                    value={formMinIncrement}
                    onChange={(e) => setFormMinIncrement(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-stone-300"
                  >
                    <option value={10000}>₹10,000</option>
                    <option value={25000}>₹25,000</option>
                    <option value={50000}>₹50,000</option>
                    <option value={100000}>₹1,00,000</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Flash Auction Duration</label>
                  <select
                    value={formDurationHours}
                    onChange={(e) => setFormDurationHours(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-stone-300"
                  >
                    <option value={1}>1 Hour Flash Drop</option>
                    <option value={6}>6 Hours</option>
                    <option value={12}>12 Hours</option>
                    <option value={24}>24 Hours (Standard)</option>
                    <option value={72}>3 Days</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 uppercase text-[10px] mb-1">Key Highlights (Comma Separated)</label>
                  <input
                    type="text"
                    value={formHighlights}
                    onChange={(e) => setFormHighlights(e.target.value)}
                    placeholder="100-Point Inspection, Zero Accident, Single Owner"
                    className="w-full p-2 bg-white border border-stone-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-300">
                <button
                  type="button"
                  onClick={() => setIsCreatingLot(false)}
                  className="px-4 py-2 bg-white border border-stone-300 font-bold uppercase text-[10px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black uppercase text-[10px] tracking-wider cursor-pointer shadow-xs"
                >
                  Deploy Lot to Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
