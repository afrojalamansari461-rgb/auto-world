import React, { useState, useEffect } from "react";
import { Crown, Check, X, Shield, Star, Award, ShieldCheck, Heart, User, Sparkles, Building, ChevronDown, CreditCard, Mail } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { motion, AnimatePresence } from "motion/react";

interface PremiumTabProps {
  subscriptionActive: boolean;
  setSubscriptionActive: (active: boolean) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  currentUser: FirebaseUser | null;
}

export default function PremiumTab({ subscriptionActive, setSubscriptionActive, showToast, currentUser }: PremiumTabProps) {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "business" | "">("");
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Sub-tab selection state
  const [activeSubTab, setActiveSubTab] = useState<"plans" | "comparison" | "faq">("plans");

  // FAQ states
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  // Form states
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic pricing
  const proPrice = period === "monthly" ? 1499 : 1199;
  const businessPrice = period === "monthly" ? 4999 : 3999;

  const handleOpenCheckout = (planName: "pro" | "business", basePrice: number) => {
    setSelectedPlan(planName);
    setSelectedPrice(basePrice);
    setShowCheckout(true);
  };

  // double click cheat
  const handleDoubleCheat = () => {
    setCardNumber("4242 4242 4242 4242");
    setExpiry("12/28");
    setCvv("123");
    setBillingName("John Doe");
    setBillingEmail("test@example.com");
    setAgreeTerms(true);
  };

  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      showToast("Please agree to the Terms of Service.", "error");
      return;
    }
    if (!cardNumber || !expiry || !cvv || !billingEmail) {
      showToast("Please fill out all requested card and billing fields.", "error");
      return;
    }

    setIsProcessing(true);
    setTimeout(async () => {
      const subscriptionObj = {
        plan: selectedPlan,
        price: selectedPrice,
        period: period,
        startDate: new Date().toISOString(),
        status: "active"
      };

      // Firestore persistence if authenticated
      if (currentUser) {
        try {
          await setDoc(doc(db, "subscriptions", currentUser.uid), {
            ...subscriptionObj,
            userId: currentUser.uid
          });
        } catch (err: any) {
          handleFirestoreError(err, OperationType.WRITE, `subscriptions/${currentUser.uid}`);
          throw err;
        }
      }

      localStorage.setItem("autoWorld_subscription", JSON.stringify(subscriptionObj));
      localStorage.setItem("autoWorld_subscription_date", new Date().toISOString());
      
      setSubscriptionActive(true);
      setIsProcessing(false);
      setShowCheckout(false);
      showToast(`Congratulations! You have successfully upgraded to the ${selectedPlan.toUpperCase()} Premium Tier!`, "success");
    }, 1800);
  };

  const handleCancelSubscription = async () => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      showToast("Please tap 'Verifying cancel' again to finalize subscription downgrade.", "info");
      return;
    }

    if (currentUser) {
      try {
        await setDoc(doc(db, "subscriptions", currentUser.uid), {
          userId: currentUser.uid,
          plan: "basic",
          price: 0,
          period: "monthly",
          startDate: new Date().toISOString(),
          status: "expired"
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `subscriptions/${currentUser.uid}`);
        throw err;
      }
    }

    localStorage.removeItem("autoWorld_subscription");
    localStorage.removeItem("autoWorld_subscription_date");
    setSubscriptionActive(false);
    setConfirmCancel(false);
    showToast("Subscription downgraded to Basic successfully.", "info");
  };

  const plansComparison = [
    { name: "Active Listings", basic: "1 Active Listing", pro: "10 Active Listings", business: "Unlimited Listings" },
    { name: "Listing Duration", basic: "30 Days", pro: "60 Days", business: "90 Days" },
    { name: "Featured Placements", basic: "No", pro: "2 / month", business: "Unlimited" },
    { name: "Support Tier", basic: "Standard Support", pro: "24/7 Priority Support", business: "VIP Dedicated Manager" },
    { name: "Analytics Dashboard", basic: "No", pro: "Basic metrics", business: "Advanced analytics" },
    { name: "Email Marketing Outreach", basic: "No", pro: "Yes", business: "VIP Priority campaigns" },
    { name: "Bulk import / export Integration", basic: "No", pro: "No", business: "Yes (Full API)" },
  ];

  const faqs = [
    { q: "Can I cancel my premium plan anytime?", a: "Yes, you hold full autonomy to pause, downgrade, or cancel subscription parameters at any time inside your dashboard. No contract locks!" },
    { q: "What payment forms do you authorize?", a: "We support major credit cards (Visa, Mastercard, American Express), securely monitored and protected." },
    { q: "How long does a listed car stay visible?", a: "Basic free accounts can list are car for 30 days. Pro members hold 60-day visibility, and Business listings stay up to 90 days." },
    { q: "Do you offer refunds if my vehicle sells before cycle ends?", a: "Because we activate immediate ad distribution tools and priority rankings upon upgrades, we don't offer prorated refunds, but you can cancel next term billings securely." },
  ];

  return (
    <div className="bg-[#F4F1EA] py-12 text-[#1A1A1A]">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto px-4 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-stone-900/10 text-stone-900 border border-stone-300 mb-5 rounded-full shadow-inner animate-in zoom-in duration-300">
          <Crown className="w-7 h-7 fill-amber-500 text-amber-500 animate-pulse" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-black text-stone-950 tracking-tight leading-tight mb-4 uppercase">
          Maximize listing traffic & <span className="italic font-light text-stone-605 font-sans tracking-wide">Power sales</span>
        </h1>
        <p className="text-stone-605 text-xs sm:text-sm max-w-lg mx-auto font-semibold leading-relaxed uppercase tracking-wider">
          Scale visibility up to 3x, contact active vetted buyers directly, and take advantage of pro dashboard analytic tools.
        </p>
      </section>

      {/* SMOOTH SCROLL NAVIGATOR FOR PREMIUM TAB */}
      <div className="flex justify-center max-w-lg mx-auto mb-12 border-b border-stone-300 pb-px gap-2 sm:gap-6 px-4">
        {[
          { id: "plans-section", label: "Plans & Packages", icon: Sparkles },
          { id: "comparison-section", label: "Listing Features", icon: Award },
          { id: "faq-section", label: "Billing & FAQ", icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                const el = document.getElementById(tab.id);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="relative pb-3 flex items-center gap-1.5 px-3 text-[10px] sm:text-xs font-black uppercase tracking-widest text-stone-500 hover:text-stone-900 transition select-none cursor-pointer leading-none"
            >
              <Icon className="w-3.5 h-3.5 shrink-0 text-stone-600" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-16">
        {/* SECTION 1: Plans & Packages */}
        <section id="plans-section" className="scroll-mt-12 space-y-12">
          {/* Pricing switcher */}
          <div className="flex justify-center items-center gap-3.5 mb-12">
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-5 py-2.5 text-xs font-bold font-mono uppercase tracking-widest transition cursor-pointer select-none leading-none ${
                period === "monthly" ? "bg-stone-900 text-[#F4F1EA] shadow-md border border-stone-900" : "bg-[#FAF8F5] text-stone-605 hover:bg-stone-200 border border-stone-300"
              }`}
            >
              Monthly Billings
            </button>
            <button
              onClick={() => setPeriod("yearly")}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold font-mono uppercase tracking-widest transition cursor-pointer select-none leading-none ${
                period === "yearly" ? "bg-stone-900 text-[#F4F1EA] shadow-md border border-stone-900" : "bg-[#FAF8F5] text-stone-605 hover:bg-stone-200 border border-stone-300"
              }`}
            >
              Yearly Billings
              <span className="px-2 py-0.5 bg-emerald-250 text-emerald-950 font-black uppercase tracking-wider text-[9px]">Save 20%</span>
            </button>
          </div>

          {/* Plan Cards */}
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card: Basic */}
            <div className="bg-[#FAF8F2] p-6.5 border border-stone-300 flex flex-col justify-between hover:shadow-md transition duration-300">
              <div className="space-y-4">
                <span className="text-[10px] font-bold font-mono tracking-widest text-stone-500 block uppercase">Free tier</span>
                <h3 className="text-xl font-serif font-black text-stone-900 leading-none">Basic Free</h3>
                <div className="pt-2">
                  <span className="text-3xl font-serif font-black text-stone-900">₹0</span>
                  <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block mt-1">Free lifetime</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                  Designed for individual casual brokers posting single listed items for basic localized visibility queries.
                </p>
                <hr className="border-stone-200" />
                <ul className="text-xs text-stone-700 space-y-3 font-semibold">
                  <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 1 Active Listing</li>
                  <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 30 Days expiration</li>
                  <li className="flex items-center gap-1.5 text-stone-400"><X className="w-4 h-4 text-stone-400 shrink-0" /> No Featured Listings</li>
                  <li className="flex items-center gap-1.5 text-stone-400"><X className="w-4 h-4 text-stone-400 shrink-0" /> Standard support ranks</li>
                </ul>
              </div>
              <button
                className="w-full mt-6 py-3 border border-stone-200 text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/40 bg-stone-100 cursor-not-allowed"
                disabled
              >
                {subscriptionActive ? "Basic Inactive" : "Active Default plan"}
              </button>
            </div>

            {/* Card: Pro */}
            <div className="bg-[#FAF8F2] p-6.5 border-2 border-stone-950 flex flex-col justify-between relative shadow-sm hover:shadow-xl transition duration-300">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-950 text-[#F4F1EA] px-4 py-1 text-[9px] font-bold uppercase tracking-widest font-mono">
                Most Popular
              </div>
              <div className="space-y-4 pt-1">
                <span className="text-[10px] font-bold font-mono tracking-widest text-stone-605 block uppercase">Expert Broker</span>
                <h3 className="text-xl font-serif font-black text-stone-900 leading-none">Professional Pro</h3>
                <div className="pt-2">
                  <span className="text-3xl font-serif font-black text-stone-905">₹{proPrice.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block mt-1">/ Month {period === "yearly" ? "billed yearly" : ""}</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                  Best suited for active individual dealer agents seeking top visibility and verified organic lead check tags.
                </p>
                <hr className="border-stone-200" />
                <ul className="text-xs text-stone-700 space-y-3 font-semibold">
                  <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 10 Active Listings</li>
                  <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 60 Days validation</li>
                  <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 2 Featured spots / mo</li>
                  <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 24/7 Priority Helpline</li>
                </ul>
              </div>
              
              {subscriptionActive && localStorage.getItem("autoWorld_subscription")?.includes("pro") ? (
                <button
                  onClick={handleCancelSubscription}
                  className="w-full mt-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold uppercase tracking-widest transition border border-red-300 cursor-pointer"
                >
                  {confirmCancel ? "Verifying cancel" : "Downgrade plan / Cancel"}
                </button>
              ) : (
                <button
                  onClick={() => handleOpenCheckout("pro", proPrice)}
                  className="w-full mt-6 py-3 bg-stone-900 hover:bg-stone-850 text-white text-xs font-extrabold uppercase tracking-widest transition shadow-sm cursor-pointer block text-center"
                >
                  Upgrade to Pro
                </button>
              )}
            </div>

            {/* Card: Business */}
            <div className="bg-[#FAF8F2] p-6.5 border border-stone-300 flex flex-col justify-between hover:shadow-md transition duration-300">
              <div className="space-y-4">
                <span className="text-[10px] font-bold font-mono tracking-widest text-[#1A1A1A]/60 block uppercase">Dealership fleet</span>
                <h3 className="text-xl font-serif font-black text-stone-900 leading-none">Dealership Business</h3>
                <div className="pt-2">
                  <span className="text-3xl font-serif font-black text-stone-900">₹{businessPrice.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block mt-1">/ Month {period === "yearly" ? "billed yearly" : ""}</span>
                </div>
                <p className="text-xs text-stone-605 leading-relaxed font-semibold">
                  Unlimited list volume, bulk import scripts, and absolute VIP dedicated support panels safeguarding inventories.
                </p>
                <hr className="border-stone-200" />
                <ul className="text-xs text-stone-700 space-y-3 font-semibold">
                  <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Unlimited active listings</li>
                  <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 90 Days visibility list</li>
                  <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Unlimited Featured slots</li>
                  <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Dedicated Account Broker</li>
                  <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Custom API XML listings feed</li>
                </ul>
              </div>

              {subscriptionActive && localStorage.getItem("autoWorld_subscription")?.includes("business") ? (
                <button
                  onClick={handleCancelSubscription}
                  className="w-full mt-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold uppercase tracking-widest transition border border-red-300 cursor-pointer"
                >
                  {confirmCancel ? "Verifying cancel" : "Downgrade plan / Cancel"}
                </button>
              ) : (
                <button
                  onClick={() => handleOpenCheckout("business", businessPrice)}
                  className="w-full mt-6 py-3 bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-widest transition cursor-pointer block border border-stone-900 text-center"
                >
                  Upgrade to Business
                </button>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 2: Granular Comparison Grid */}
        <section id="comparison-section" className="scroll-mt-12 max-w-5xl mx-auto px-4 pt-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-black text-stone-950 uppercase tracking-tight">Granular Comparison Grid</h2>
            <p className="text-[10px] text-stone-550 font-mono tracking-widest uppercase mt-1">Core subscription capabilities analyzed side-by-side</p>
          </div>
          <div className="bg-[#FAF8F5] border border-stone-300 shadow-sm overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-300">
                  <th className="p-4 sm:p-5 text-[10px] font-bold text-stone-555 uppercase font-mono tracking-widest">Core Benefits</th>
                  <th className="p-4 sm:p-5 text-[10px] font-bold text-stone-555 uppercase font-mono tracking-widest">Basic</th>
                  <th className="p-4 sm:p-5 text-[10px] font-black text-stone-900 uppercase font-mono tracking-widest font-extrabold pb-3">Pro Professional</th>
                  <th className="p-4 sm:p-5 text-[10px] font-bold text-stone-555 uppercase font-mono tracking-widest">Business Dealership</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-xs sm:text-sm text-stone-650 font-semibold uppercase tracking-wide text-[11px]">
                {plansComparison.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-50 transition">
                    <td className="p-4 sm:p-5 font-bold text-stone-900 leading-relaxed">{row.name}</td>
                    <td className="p-4 sm:p-5 text-stone-555">{row.basic}</td>
                    <td className="p-4 sm:p-5 text-stone-955 font-black">{row.pro}</td>
                    <td className="p-4 sm:p-5 text-stone-705">{row.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 3: FAQ SECURE MODULE */}
        <section id="faq-section" className="scroll-mt-12 max-w-4xl mx-auto px-4 pt-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-black text-stone-950 uppercase tracking-tight">FAQ Subscription Guide</h2>
            <p className="text-[10px] text-stone-555 font-mono tracking-widest uppercase mt-1">Frequently asked customer billing queries answered</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFAQIndex === idx;
              return (
                <div key={idx} className="bg-[#FAF8F5] border border-stone-300 overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenFAQIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-bold text-[#1A1A1A] flex items-center justify-between transition hover:bg-stone-100 cursor-pointer"
                  >
                    <span className="text-xs font-extrabold uppercase tracking-widest text-stone-800 leading-snug">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-stone-500 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-stone-300"
                      >
                        <div className="p-5 bg-stone-100 text-xs text-stone-605 leading-relaxed font-semibold">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* CHECKOUT POPUP DIALOG OVERLAY */}
      {showCheckout && (
        <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
          <div className="bg-[#F4F1EA] border-2 border-stone-900 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in-0 slide-in-from-bottom-12 zoom-in-95 duration-300 ease-out">
            {/* Header */}
            <div className="bg-stone-900 text-[#F4F1EA] p-6 text-center relative border-b border-stone-850">
              <button
                onClick={() => setShowCheckout(false)}
                className="absolute top-4 right-4 text-white hover:text-stone-300 p-1 font-mono cursor-pointer"
              >
                ✕
              </button>
              <Crown className="w-10 h-10 mx-auto mb-2 text-amber-500 fill-amber-500 animate-pulse" />
              <h2 className="text-lg font-serif font-black tracking-tight leading-none uppercase">Secure Payment Upgrade</h2>
              <p className="text-xs text-stone-305 mt-1.5 uppercase font-bold tracking-widest font-mono">Plan: {selectedPlan.toUpperCase()} (₹{selectedPrice.toLocaleString("en-IN")}/month)</p>
            </div>

            {/* Form list body */}
            <form onSubmit={handleConfirmPay} className="p-6.5 space-y-6">
              <div className="bg-[#FAF8F5] border border-stone-300 p-4.5 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-stone-500 uppercase tracking-widest font-mono">
                  <span>Upgrade term bill:</span>
                  <span>₹{selectedPrice.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-stone-400 uppercase tracking-widest font-mono">
                  <span>Additional setup tariff:</span>
                  <span>₹0</span>
                </div>
                <hr className="border-stone-200" />
                <div className="flex justify-between items-center text-sm font-black text-stone-900 pb-1 uppercase tracking-widest leading-none font-mono">
                  <span>Total Due Today:</span>
                  <span className="text-stone-955 font-serif font-black text-lg">₹{selectedPrice.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Input elements */}
              <div className="p-4.5 bg-[#FAF8F5] border border-stone-300 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-widest block font-sans">Debit / Credit credentials</h4>
                  <span className="text-[9px] text-[#1A1A1A]/40 tracking-wider uppercase italic font-bold block">Protected checkout</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Card Number</label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      onDoubleClick={handleDoubleCheat}
                      required
                      className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-sm font-mono tracking-widest focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Expiry date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        maxLength={5}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-sm focus:outline-none focus:border-stone-900 text-center font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">CVV Code</label>
                      <input
                        type="password"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        maxLength={3}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-sm focus:outline-none focus:border-stone-900 text-center font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Billing Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={billingName}
                        onChange={(e) => setBillingName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-sm focus:outline-none focus:border-stone-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Billing Email</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-sm focus:outline-none focus:border-stone-900 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* checkbox checklist terms */}
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="chk-terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                    className="mt-1 w-4.5 h-4.5 text-stone-900 accent-stone-900 border-stone-300 rounded focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="chk-terms" className="text-[10px] text-stone-755 uppercase tracking-widest cursor-pointer select-none font-bold leading-relaxed">
                    I authorize immediate billing cycle deployment of ₹{selectedPrice.toLocaleString("en-IN")} matching period selection terms.
                  </label>
                </div>

                <div className="bg-[#FAF8F5] border border-stone-300 text-stone-755 text-[10px] uppercase font-bold tracking-wider leading-relaxed p-3.5 flex items-start gap-1.5">
                  <Sparkles className="w-4 h-4 shrink-0 text-stone-905 mt-0.5" />
                  <span>
                    <strong>Helper shortcut:</strong> Double-click card number input to instantly auto-fill test credentials!
                  </span>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="flex-1 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-900 text-xs font-bold uppercase tracking-widest cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-2 py-3 bg-stone-950 text-white text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 transition cursor-pointer hover:bg-stone-850"
                  >
                    {isProcessing ? (
                      <>Validating order...</>
                    ) : (
                      <>Confirm Upgrade Payment</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
