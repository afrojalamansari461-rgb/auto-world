import React, { useState, useEffect, useMemo } from "react";
import {
  Repeat,
  Tag,
  Calculator,
  CheckCircle2,
  ArrowRight,
  Car,
  MessageCircle,
  Check,
  X,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { User } from "firebase/auth";
import {
  AdminControlSystemsState,
  NegotiationOfferRecord,
  TradeInEstimatorInput,
  calculateTradeInValuation,
  loadLocalControlSystems,
  subscribeToControlSystems,
  submitPriceNegotiationOffer,
  respondToNegotiationOffer,
  acceptSellerCounterOffer,
} from "../lib/adminControlSystemsService";

interface PriceNegotiationAndTradeInWidgetProps {
  itemType?: "vehicle" | "part";
  itemId: string | number;
  itemTitle: string;
  listedPrice: number;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  currentUser: User | null;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  initialMode?: "offer" | "trade_in";
  isModal?: boolean;
  onClose?: () => void;
}

const SEGMENT_DEFAULT_PRICES: Record<TradeInEstimatorInput["segment"], { label: string; defaultOrigPrice: number; sampleModel: string }> = {
  hatchback: { label: "Hatchback / City Car", defaultOrigPrice: 850000, sampleModel: "Maruti Swift / Hyundai i20" },
  sedan: { label: "Executive Sedan", defaultOrigPrice: 1650000, sampleModel: "Honda City / Skoda Slavia" },
  compact_suv: { label: "Mid-Size / Compact SUV", defaultOrigPrice: 1850000, sampleModel: "Hyundai Creta / Kia Seltos" },
  luxury_suv: { label: "Full-Size / Luxury SUV", defaultOrigPrice: 4800000, sampleModel: "Toyota Fortuner / BMW X3" },
  sports: { label: "Performance / Luxury Coupe", defaultOrigPrice: 7500000, sampleModel: "BMW M340i / Porsche Cayman" },
  superbike: { label: "Superbike / Cruiser", defaultOrigPrice: 1400000, sampleModel: "Kawasaki Z900 / Ducati Monster" },
};

export default function PriceNegotiationAndTradeInWidget({
  itemType = "vehicle",
  itemId,
  itemTitle,
  listedPrice,
  sellerName = "Auto World Certified Seller",
  sellerEmail = "brokerage@autoworld.com",
  sellerPhone = "+91 98230 44556",
  currentUser,
  showToast,
  initialMode = "offer",
  isModal = false,
  onClose,
}: PriceNegotiationAndTradeInWidgetProps) {
  const [activeTab, setActiveTab] = useState<"offer" | "trade_in">(initialMode);
  const [controlSystems, setControlSystems] = useState<AdminControlSystemsState>(() =>
    loadLocalControlSystems()
  );

  // Make an Offer Form State
  const [offerPrice, setOfferPrice] = useState<number>(() =>
    Math.max(1000, Math.round((listedPrice * 0.95) / 1000) * 1000)
  );
  const [paymentMode, setPaymentMode] = useState<
    "Full Cash / RTGS" | "Pre-Approved Loan" | "Trade-In + Cash"
  >("Full Cash / RTGS");
  const [buyerName, setBuyerName] = useState<string>(
    currentUser?.displayName || currentUser?.email?.split("@")[0] || ""
  );
  const [buyerEmail, setBuyerEmail] = useState<string>(currentUser?.email || "");
  const [buyerPhone, setBuyerPhone] = useState<string>(currentUser?.phoneNumber || "");
  const [buyerNotes, setBuyerNotes] = useState<string>("");
  const [attachedTradeIn, setAttachedTradeIn] = useState<{
    summary: string;
    value: number;
  } | null>(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  // Counter-Offer Inline Input for Seller / Admin
  const [counteringOfferId, setCounteringOfferId] = useState<string | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState<string>("");
  const [counterMsgInput, setCounterMsgInput] = useState<string>("");

  // Trade-In + Upgrade Calculator State
  const [tradeSegment, setTradeSegment] = useState<TradeInEstimatorInput["segment"]>("compact_suv");
  const [tradeCarTitle, setTradeCarTitle] = useState<string>("Hyundai Creta SX (O)");
  const [tradeRegYear, setTradeRegYear] = useState<number>(2020);
  const [tradeKmDriven, setTradeKmDriven] = useState<number>(38000);
  const [tradeCondition, setTradeCondition] = useState<"mint" | "good" | "fair">("mint");
  const [tradeOwners, setTradeOwners] = useState<1 | 2 | 3>(1);
  const [tradeOriginalValue, setTradeOriginalValue] = useState<number>(1850000);
  const [tenureMonths, setTenureMonths] = useState<number>(60);

  // User's own listed vehicles from localStorage for 1-click Trade-In fill
  const [myListedCars, setMyListedCars] = useState<any[]>([]);

  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setOfferPrice(Math.max(1000, Math.round((listedPrice * 0.95) / 1000) * 1000));
  }, [listedPrice, itemId]);

  useEffect(() => {
    if (currentUser) {
      if (!buyerName && currentUser.displayName) setBuyerName(currentUser.displayName);
      if (!buyerEmail && currentUser.email) setBuyerEmail(currentUser.email);
    }
  }, [currentUser]);

  useEffect(() => {
    const unsub = subscribeToControlSystems((next) => {
      setControlSystems(next);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("autoWorld_listings");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          setMyListedCars(list.slice(0, 4));
        }
      }
    } catch {}
  }, []);

  const isAdminOrSeller = useMemo(() => {
    const email = (currentUser?.email || "").toLowerCase();
    if (!email) return false;
    if (email === "afrojalamansari461@gmail.com") return true;
    if (sellerEmail && email === sellerEmail.toLowerCase()) return true;
    return false;
  }, [currentUser, sellerEmail]);

  const itemOffers = useMemo(() => {
    return (controlSystems.negotiationOffers || []).filter(
      (o) =>
        String(o.itemId) === String(itemId) ||
        o.itemTitle.toLowerCase() === itemTitle.toLowerCase()
    );
  }, [controlSystems.negotiationOffers, itemId, itemTitle]);

  const tradeInResult = useMemo(() => {
    return calculateTradeInValuation({
      segment: tradeSegment,
      carTitle: tradeCarTitle,
      regYear: tradeRegYear,
      kmDriven: tradeKmDriven,
      condition: tradeCondition,
      owners: tradeOwners,
      originalApproxValue: tradeOriginalValue,
      targetVehiclePrice: listedPrice,
      interestRateApr: 9.2,
      tenureMonths,
    });
  }, [
    tradeSegment,
    tradeCarTitle,
    tradeRegYear,
    tradeKmDriven,
    tradeCondition,
    tradeOwners,
    tradeOriginalValue,
    listedPrice,
    tenureMonths,
  ]);

  const discountPercent = useMemo(() => {
    if (listedPrice <= 0) return 0;
    return Math.round(((listedPrice - offerPrice) / listedPrice) * 1000) / 10;
  }, [listedPrice, offerPrice]);

  const netCashPayableWithOffer = useMemo(() => {
    if (paymentMode === "Trade-In + Cash" && attachedTradeIn) {
      return Math.max(0, offerPrice - attachedTradeIn.value);
    }
    return offerPrice;
  }, [offerPrice, paymentMode, attachedTradeIn]);

  const handleApplyQuickPreset = (pctOff: number) => {
    const nextPrice = Math.max(
      1000,
      Math.round((listedPrice * (1 - pctOff / 100)) / 1000) * 1000
    );
    setOfferPrice(nextPrice);
  };

  const handleAttachTradeInToOffer = () => {
    setAttachedTradeIn({
      summary: tradeInResult.summaryLabel,
      value: tradeInResult.estimatedTradeInValue,
    });
    setPaymentMode("Trade-In + Cash");
    setActiveTab("offer");
    showToast(
      `Trade-in (${tradeInResult.summaryLabel} • Est. ₹${tradeInResult.estimatedTradeInValue.toLocaleString("en-IN")}) attached to your price offer!`,
      "success"
    );
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerPhone.trim()) {
      showToast("Please enter your full name and phone number for the binding offer.", "error");
      return;
    }
    if (offerPrice <= 0 || offerPrice > listedPrice * 1.5) {
      showToast("Please enter a valid offer amount.", "error");
      return;
    }

    setIsSubmittingOffer(true);
    try {
      const created = await submitPriceNegotiationOffer({
        itemType,
        itemId,
        itemTitle,
        listedPrice,
        buyerOfferPrice: offerPrice,
        paymentMode,
        tradeInSummary:
          paymentMode === "Trade-In + Cash" && attachedTradeIn
            ? attachedTradeIn.summary
            : undefined,
        tradeInEstimatedValue:
          paymentMode === "Trade-In + Cash" && attachedTradeIn
            ? attachedTradeIn.value
            : undefined,
        netPayableAfterTradeIn:
          paymentMode === "Trade-In + Cash" && attachedTradeIn
            ? Math.max(0, offerPrice - attachedTradeIn.value)
            : undefined,
        buyerName: buyerName.trim(),
        buyerEmail: (buyerEmail.trim() || currentUser?.email || "buyer@autoworld.in").toLowerCase(),
        buyerPhone: buyerPhone.trim(),
        sellerName,
        sellerEmail,
        sellerPhone,
        buyerNotes: buyerNotes.trim() || undefined,
      });

      setBuyerNotes("");
      showToast(
        `Binding Price Offer ${created.id} (₹${offerPrice.toLocaleString("en-IN")}) dispatched to Seller & Admin Desk!`,
        "success"
      );
    } catch (err) {
      console.error("Failed to submit price offer:", err);
      showToast("Could not submit offer. Please try again.", "error");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleSellerAction = async (
    offer: NegotiationOfferRecord,
    action: "Accepted" | "Rejected" | "Countered"
  ) => {
    if (action === "Countered") {
      const parsed = Number(counterPriceInput.replace(/[^0-9]/g, ""));
      if (!parsed || parsed <= 0) {
        showToast("Enter a valid counter-offer price in ₹.", "error");
        return;
      }
      await respondToNegotiationOffer(
        offer.id,
        "Countered",
        parsed,
        counterMsgInput.trim() || "Best final handover price from seller desk."
      );
      setCounteringOfferId(null);
      setCounterPriceInput("");
      setCounterMsgInput("");
      showToast(
        `Counter-offer of ₹${parsed.toLocaleString("en-IN")} sent to ${offer.buyerName}!`,
        "success"
      );
      return;
    }

    await respondToNegotiationOffer(offer.id, action);
    showToast(
      `Offer ${offer.id} marked as ${action.toUpperCase()}!`,
      action === "Accepted" ? "success" : "info"
    );
  };

  const handleBuyerAcceptCounter = async (offer: NegotiationOfferRecord) => {
    await acceptSellerCounterOffer(offer.id);
    showToast(
      `Counter-Offer of ₹${(offer.counterOfferPrice || offer.buyerOfferPrice).toLocaleString("en-IN")} accepted! Deal locked under ${offer.id}.`,
      "success"
    );
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`bg-[#FAF8F5] border-2 border-stone-900 text-stone-900 font-sans overflow-hidden ${
        isModal ? "rounded-2xl shadow-2xl" : "rounded-2xl shadow-sm"
      }`}
    >
      {/* TOP HEADER & SEGMENTED SWITCHER */}
      <div className="bg-stone-950 text-[#F4F1EA] p-4 sm:p-5 border-b border-stone-800">
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 font-bold block">
              Direct Deal & Upgrade Desk
            </span>
            <h3 className="text-base sm:text-lg font-serif font-black text-white tracking-tight leading-snug">
              {itemTitle}
            </h3>
            <p className="text-[11px] font-mono text-stone-400 mt-0.5 tabular-nums">
              Listed Valuation: <strong className="text-amber-300">₹{listedPrice.toLocaleString("en-IN")}</strong>
              {itemOffers.length > 0 && (
                <span> · {itemOffers.length} Active Negotiation Offer(s)</span>
              )}
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg border border-stone-700 cursor-pointer transition"
              aria-label="Close Negotiation Desk"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2-TAB INTERACTIVE SWITCHER */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-stone-900 rounded-xl border border-stone-800">
          <button
            type="button"
            onClick={() => setActiveTab("offer")}
            className={`py-2.5 px-3 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
              activeTab === "offer"
                ? "bg-amber-500 text-stone-950 font-black shadow-xs"
                : "text-stone-300 hover:text-white hover:bg-stone-800"
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Make Price Offer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("trade_in")}
            className={`py-2.5 px-3 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
              activeTab === "trade_in"
                ? "bg-amber-500 text-stone-950 font-black shadow-xs"
                : "text-stone-300 hover:text-white hover:bg-stone-800"
            }`}
          >
            <Repeat className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Trade-In + Upgrade Calc</span>
          </button>
        </div>
      </div>

      {/* ==========================================================================
          TAB 1: LIVE "MAKE AN OFFER / COUNTER-OFFER" PRICE NEGOTIATION DESK
      ========================================================================== */}
      {activeTab === "offer" && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* LIVE OFFERS & COUNTER-OFFERS FEED FOR THIS ITEM */}
          {itemOffers.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600">
                  Live Negotiation Ledger on This Listing ({itemOffers.length})
                </span>
                {isAdminOrSeller && (
                  <span className="text-[10px] font-mono text-amber-800 font-bold">
                    Seller / Admin Response Controls Active
                  </span>
                )}
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {itemOffers.map((offer) => {
                  const isMyOffer =
                    currentUser?.email &&
                    offer.buyerEmail.toLowerCase() === currentUser.email.toLowerCase();

                  return (
                    <div
                      key={offer.id}
                      className="p-3.5 bg-white border border-stone-300 rounded-xl space-y-2.5 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-bold text-stone-950">{offer.id}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-stone-600 font-sans font-semibold">
                            {offer.buyerName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[11px] text-stone-500">{offer.paymentMode}</span>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                            offer.status === "Accepted"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                              : offer.status === "Countered"
                              ? "bg-amber-950 text-amber-300 border-amber-500"
                              : offer.status === "Rejected"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-stone-100 text-stone-800 border-stone-300"
                          }`}
                        >
                          {offer.status}
                        </span>
                      </div>

                      {/* Price Breakdown Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 bg-[#F4F1EA] rounded-lg border border-stone-200 text-xs font-mono tabular-nums">
                        <div>
                          <span className="text-[9px] uppercase text-stone-500 block">
                            Listed Price
                          </span>
                          <span className="font-bold text-stone-700">
                            ₹{offer.listedPrice.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-stone-500 block">
                            Buyer Offer
                          </span>
                          <span className="font-black text-stone-950">
                            ₹{offer.buyerOfferPrice.toLocaleString("en-IN")}
                          </span>
                        </div>
                        {offer.counterOfferPrice ? (
                          <div>
                            <span className="text-[9px] uppercase text-amber-800 font-bold block">
                              Seller Counter-Offer
                            </span>
                            <span className="font-black text-amber-700">
                              ₹{offer.counterOfferPrice.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[9px] uppercase text-stone-500 block">
                              Requested Delta
                            </span>
                            <span className="font-bold text-emerald-700">
                              -₹
                              {Math.max(
                                0,
                                offer.listedPrice - offer.buyerOfferPrice
                              ).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </div>

                      {offer.tradeInSummary && (
                        <div className="text-[11px] font-mono text-stone-700 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 flex flex-wrap items-center justify-between gap-2">
                          <span>
                            Trade-In Attached: <strong>{offer.tradeInSummary}</strong>
                          </span>
                          {offer.tradeInEstimatedValue && (
                            <span className="text-emerald-800 font-bold tabular-nums">
                              Est. Trade-In: ₹{offer.tradeInEstimatedValue.toLocaleString("en-IN")} · Net Cash: ₹
                              {(offer.netPayableAfterTradeIn ??
                                Math.max(0, offer.buyerOfferPrice - offer.tradeInEstimatedValue)
                              ).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      )}

                      {offer.counterOfferMessage && (
                        <p className="text-xs text-amber-950 bg-amber-50/90 border border-amber-200 px-3 py-2 rounded-lg font-medium">
                          <strong className="font-mono text-[10px] uppercase tracking-wider block text-amber-800">
                            Seller Counter-Offer Note:
                          </strong>
                          "{offer.counterOfferMessage}"
                        </p>
                      )}

                      {/* Buyer Action when Counter-Offer exists */}
                      {offer.status === "Countered" && offer.counterOfferPrice && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleBuyerAcceptCounter(offer)}
                            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              Accept Counter-Offer (₹
                              {offer.counterOfferPrice.toLocaleString("en-IN")})
                            </span>
                          </button>

                          <a
                            href={`https://wa.me/${(offer.sellerPhone || "+919823044556").replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hi! Regarding Offer ${offer.id} on ${offer.itemTitle}: I reviewed the counter-offer of ₹${offer.counterOfferPrice.toLocaleString("en-IN")} and would like to proceed.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Finalize on WhatsApp</span>
                          </a>
                        </div>
                      )}

                      {/* Seller / Admin Inline Decision Bar */}
                      {isAdminOrSeller && offer.status !== "Accepted" && (
                        <div className="pt-2 border-t border-stone-200 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSellerAction(offer, "Accepted")}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Accept Offer
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCounteringOfferId(
                                  counteringOfferId === offer.id ? null : offer.id
                                );
                                setCounterPriceInput(
                                  String(
                                    Math.round((offer.listedPrice + offer.buyerOfferPrice) / 2)
                                  )
                                );
                              }}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg cursor-pointer"
                            >
                              Send Counter-Offer
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSellerAction(offer, "Rejected")}
                              className="px-3 py-1.5 bg-stone-200 hover:bg-red-100 text-stone-700 hover:text-red-800 text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg cursor-pointer"
                            >
                              Reject
                            </button>

                            {isMyOffer && (
                              <span className="text-[10px] font-mono text-stone-500 ml-auto">
                                Your Submitted Offer
                              </span>
                            )}
                          </div>

                          {counteringOfferId === offer.id && (
                            <div className="p-2.5 bg-stone-100 rounded-lg border border-stone-300 flex flex-col sm:flex-row gap-2">
                              <input
                                type="number"
                                value={counterPriceInput}
                                onChange={(e) => setCounterPriceInput(e.target.value)}
                                placeholder="Counter Price (₹)"
                                className="px-3 py-1.5 bg-white border border-stone-300 rounded text-xs font-mono font-bold text-stone-950 w-full sm:w-40"
                              />
                              <input
                                type="text"
                                value={counterMsgInput}
                                onChange={(e) => setCounterMsgInput(e.target.value)}
                                placeholder="Optional seller note (e.g. includes insurance)"
                                className="px-3 py-1.5 bg-white border border-stone-300 rounded text-xs text-stone-900 flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleSellerAction(offer, "Countered")}
                                className="px-3.5 py-1.5 bg-stone-950 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider rounded cursor-pointer shrink-0"
                              >
                                Dispatch Counter
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUBMIT NEW BINDING PRICE OFFER FORM */}
          <form onSubmit={handleSubmitOffer} className="space-y-4">
            <div className="p-4 bg-white border border-stone-300 rounded-xl space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-700">
                  Your Binding Offer Amount (₹)
                </label>
                <div className="flex items-center gap-1.5">
                  {[3, 5, 8].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyQuickPreset(pct)}
                      className="px-2.5 py-1 bg-[#F4F1EA] hover:bg-stone-900 hover:text-amber-300 border border-stone-300 rounded-md text-[10px] font-mono font-bold cursor-pointer transition tabular-nums"
                    >
                      -{pct}% (₹
                      {Math.round((listedPrice * (1 - pct / 100)) / 1000).toLocaleString("en-IN")}k)
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-7 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-serif font-black text-lg text-stone-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-8 pr-4 py-2.5 bg-[#FAF8F5] border-2 border-stone-900 rounded-xl text-lg font-serif font-black text-stone-950 tabular-nums focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-5 p-2.5 bg-[#F4F1EA] border border-stone-200 rounded-xl text-xs font-mono tabular-nums">
                  <span className="text-[9px] uppercase text-stone-500 block">
                    Difference vs Listed
                  </span>
                  {offerPrice < listedPrice ? (
                    <span className="font-bold text-emerald-700">
                      Save ₹{(listedPrice - offerPrice).toLocaleString("en-IN")} ({discountPercent}% below ask)
                    </span>
                  ) : (
                    <span className="font-bold text-stone-900">Full Asking Valuation</span>
                  )}
                </div>
              </div>

              {/* Payment Readiness Selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 block">
                  Settlement & Funding Method
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      "Full Cash / RTGS",
                      "Pre-Approved Loan",
                      "Trade-In + Cash",
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setPaymentMode(mode);
                        if (mode === "Trade-In + Cash" && !attachedTradeIn) {
                          setAttachedTradeIn({
                            summary: tradeInResult.summaryLabel,
                            value: tradeInResult.estimatedTradeInValue,
                          });
                        }
                      }}
                      className={`py-2 px-2.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer transition truncate ${
                        paymentMode === mode
                          ? "bg-stone-950 text-amber-400 border-stone-950"
                          : "bg-[#FAF8F5] text-stone-700 border-stone-300 hover:bg-stone-100"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attached Trade-In Summary Banner */}
              {paymentMode === "Trade-In + Cash" && (
                <div className="p-3 bg-emerald-950 text-emerald-100 rounded-xl border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                      Trade-In Equity Applied to Offer
                    </span>
                    <span className="font-semibold block">
                      {attachedTradeIn ? attachedTradeIn.summary : tradeInResult.summaryLabel}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-300 tabular-nums">
                      Est. Trade-In Credit: ₹
                      {(attachedTradeIn?.value || tradeInResult.estimatedTradeInValue).toLocaleString(
                        "en-IN"
                      )}{" "}
                      → Net Payable Cash: ₹{netCashPayableWithOffer.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("trade_in")}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer shrink-0"
                  >
                    Customize Trade-In
                  </button>
                </div>
              )}

              {/* Buyer Contact Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase text-stone-600 block mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-semibold text-stone-900"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase text-stone-600 block mb-1">
                    WhatsApp / Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="+91 98200 00000"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-mono text-stone-900"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase text-stone-600 block mb-1">
                    Buyer Gmail
                  </label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-mono text-stone-900"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={buyerNotes}
                  onChange={(e) => setBuyerNotes(e.target.value)}
                  placeholder="Optional condition or handover note (e.g. Ready for immediate settlement upon physical inspection)"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs text-stone-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingOffer}
              className="w-full py-3.5 px-5 bg-stone-950 hover:bg-stone-800 text-amber-400 rounded-xl text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {isSubmittingOffer
                  ? "Dispatching Binding Offer..."
                  : paymentMode === "Trade-In + Cash"
                  ? `Submit Trade-In + Offer (Net ₹${netCashPayableWithOffer.toLocaleString("en-IN")})`
                  : `Submit Binding Offer of ₹${offerPrice.toLocaleString("en-IN")}`}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* ==========================================================================
          TAB 2: INSTANT "TRADE-IN + UPGRADE" NET-PAYABLE & EMI CALCULATOR
      ========================================================================== */}
      {activeTab === "trade_in" && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Quick-Pick From User's Own Listed Cars (if available) */}
          {myListedCars.length > 0 && (
            <div className="p-3 bg-stone-100 border border-stone-300 rounded-xl space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 block">
                1-Click Select From Your Listed Vehicles on Auto World:
              </span>
              <div className="flex flex-wrap gap-2">
                {myListedCars.map((myCar, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTradeCarTitle(`${myCar.make || ""} ${myCar.model || myCar.title || ""}`.trim());
                      const yr = parseInt(String(myCar.year || "2021"), 10);
                      if (!isNaN(yr) && yr >= 2005 && yr <= 2026) setTradeRegYear(yr);
                      const km = parseInt(String(myCar.mileage || "30000").replace(/\D/g, ""), 10);
                      if (!isNaN(km)) setTradeKmDriven(km);
                      if (myCar.price && myCar.price > 50000) {
                        setTradeOriginalValue(Math.round(myCar.price * 1.35));
                      }
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-stone-950 hover:text-amber-300 border border-stone-300 rounded-lg text-[11px] font-mono font-bold cursor-pointer transition"
                  >
                    {myCar.title} (₹{Number(myCar.price || 0).toLocaleString("en-IN")})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trade-In Vehicle Specification Inputs */}
          <div className="p-4 bg-white border border-stone-300 rounded-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                  Your Current Vehicle Segment
                </label>
                <select
                  value={tradeSegment}
                  onChange={(e) => {
                    const seg = e.target.value as TradeInEstimatorInput["segment"];
                    setTradeSegment(seg);
                    setTradeOriginalValue(SEGMENT_DEFAULT_PRICES[seg].defaultOrigPrice);
                    setTradeCarTitle(SEGMENT_DEFAULT_PRICES[seg].sampleModel);
                  }}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-bold text-stone-900 cursor-pointer"
                >
                  {Object.entries(SEGMENT_DEFAULT_PRICES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                  Your Vehicle Make & Model
                </label>
                <input
                  type="text"
                  value={tradeCarTitle}
                  onChange={(e) => setTradeCarTitle(e.target.value)}
                  placeholder="e.g. 2020 Hyundai Creta SX"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-semibold text-stone-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                  Reg. Year
                </label>
                <select
                  value={tradeRegYear}
                  onChange={(e) => setTradeRegYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 cursor-pointer"
                >
                  {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014].map(
                    (yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                  Kilometers Driven
                </label>
                <input
                  type="number"
                  min={500}
                  step={2500}
                  value={tradeKmDriven}
                  onChange={(e) => setTradeKmDriven(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 tabular-nums"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                  Condition
                </label>
                <select
                  value={tradeCondition}
                  onChange={(e) => setTradeCondition(e.target.value as "mint" | "good" | "fair")}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-bold text-stone-900 cursor-pointer"
                >
                  <option value="mint">Mint (Showroom Track)</option>
                  <option value="good">Good (Minor Wear)</option>
                  <option value="fair">Fair (Needs Service)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                  Ownership
                </label>
                <select
                  value={tradeOwners}
                  onChange={(e) => setTradeOwners(Number(e.target.value) as 1 | 2 | 3)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 cursor-pointer"
                >
                  <option value={1}>1st Owner</option>
                  <option value={2}>2nd Owner</option>
                  <option value={3}>3rd+ Owner</option>
                </select>
              </div>
            </div>

            {/* Original Showroom Value Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] uppercase text-stone-600 font-bold">
                  Original On-Road Purchase Price of Your Current Car:
                </span>
                <span className="font-black text-stone-950 tabular-nums">
                  ₹{tradeOriginalValue.toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                min={300000}
                max={25000000}
                step={50000}
                value={tradeOriginalValue}
                onChange={(e) => setTradeOriginalValue(Number(e.target.value))}
                className="w-full accent-stone-950 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-stone-400">
                <span>₹3 Lakh</span>
                <span>₹50 Lakh</span>
                <span>₹1.25 Cr</span>
                <span>₹2.5 Cr</span>
              </div>
            </div>
          </div>

          {/* LIVE NET-PAYABLE UPGRADE & REDUCED EMI SUMMARY BOARD */}
          <div className="bg-stone-950 text-[#F4F1EA] rounded-2xl p-4 sm:p-5 border border-stone-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3.5 border-b border-stone-800 tabular-nums">
              <div className="p-3 bg-stone-900 rounded-xl border border-stone-800">
                <span className="text-[9px] font-mono uppercase tracking-wider text-stone-400 block">
                  1. Target Vehicle Price
                </span>
                <span className="text-base sm:text-lg font-serif font-black text-white block mt-0.5">
                  ₹{listedPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] font-mono text-stone-400 truncate block">
                  {itemTitle}
                </span>
              </div>

              <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-500/40">
                <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                  2. Est. Trade-In Credit (-)
                </span>
                <span className="text-base sm:text-lg font-serif font-black text-emerald-300 block mt-0.5">
                  - ₹{tradeInResult.estimatedTradeInValue.toLocaleString("en-IN")}
                </span>
                <span className="text-[9.5px] font-mono text-emerald-200/80 block">
                  Band: ₹{(tradeInResult.minRangeValue / 100000).toFixed(2)}L – ₹
                  {(tradeInResult.maxRangeValue / 100000).toFixed(2)}L
                </span>
              </div>

              <div className="p-3 bg-amber-500 text-stone-950 rounded-xl border border-amber-400">
                <span className="text-[9px] font-mono uppercase tracking-wider font-black block">
                  {tradeInResult.cashbackToBuyer > 0
                    ? "3. Net Cashback To You"
                    : "3. Net Payable Upgrade Diff"}
                </span>
                <span className="text-lg sm:text-xl font-serif font-black block mt-0.5">
                  ₹
                  {(tradeInResult.cashbackToBuyer > 0
                    ? tradeInResult.cashbackToBuyer
                    : tradeInResult.netPayableUpgradeDiff
                  ).toLocaleString("en-IN")}
                </span>
                <span className="text-[9.5px] font-mono font-bold block">
                  {tradeInResult.cashbackToBuyer > 0
                    ? "Your trade-in exceeds target price!"
                    : `${Math.round((tradeInResult.estimatedTradeInValue / Math.max(1, listedPrice)) * 100)}% covered by trade-in`}
                </span>
              </div>
            </div>

            {/* Reduced Monthly EMI Comparison */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono tabular-nums">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-stone-400">Standard 60m EMI (No Trade-In):</span>
                  <span className="line-through text-stone-500">
                    ₹{tradeInResult.standardMonthlyEmi.toLocaleString("en-IN")}/mo
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-amber-300 font-bold">
                    Upgrade EMI After Trade-In Equity:
                  </span>
                  <span className="text-base font-black text-white">
                    ₹{tradeInResult.upgradeReducedMonthlyEmi.toLocaleString("en-IN")}/mo
                  </span>
                  {tradeInResult.monthlyEmiSavings > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-500 text-stone-950 font-black text-[10px] rounded">
                      SAVE ₹{tradeInResult.monthlyEmiSavings.toLocaleString("en-IN")}/MO
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAttachTradeInToOffer}
                className="px-4 py-3 bg-[#FAF8F5] hover:bg-amber-400 text-stone-950 rounded-xl text-[11px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
              >
                <span>Attach Trade-In to My Price Offer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
