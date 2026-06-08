import React, { useState, useEffect } from "react";
import { Crown, Check, X, Shield, Star, Award, ShieldCheck, Heart, User, Sparkles, Building, ChevronDown, CreditCard, Mail } from "lucide-react";

interface PremiumTabProps {
  subscriptionActive: boolean;
  setSubscriptionActive: (active: boolean) => void;
}

export default function PremiumTab({ subscriptionActive, setSubscriptionActive }: PremiumTabProps) {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "business" | "">("");
  const [selectedPrice, setSelectedPrice] = useState(0);

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
  const proPrice = period === "monthly" ? 29 : 23;
  const businessPrice = period === "monthly" ? 99 : 79;

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
      alert("Please agree to the Terms of Service.");
      return;
    }
    if (!cardNumber || !expiry || !cvv || !billingEmail) {
      alert("Please fill out all requested card and billing fields.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const subscriptionObj = {
        plan: selectedPlan,
        price: selectedPrice,
        period: period,
        startDate: new Date().toISOString(),
        status: "active"
      };

      localStorage.setItem("autoWorld_subscription", JSON.stringify(subscriptionObj));
      localStorage.setItem("autoWorld_subscription_date", new Date().toISOString());
      
      setSubscriptionActive(true);
      setIsProcessing(false);
      setShowCheckout(false);
      alert(`🎉 Congratulations! You have successfully upgraded to the ${selectedPlan.toUpperCase()} Premium Tier!`);
    }, 1800);
  };

  const handleCancelSubscription = () => {
    if (window.confirm("Are you sure you want to cancel your current Premium subscription? Your status will revert to Basic.")) {
      localStorage.removeItem("autoWorld_subscription");
      localStorage.removeItem("autoWorld_subscription_date");
      setSubscriptionActive(false);
      alert("Subscription downgraded to Basic successfully.");
    }
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
    <div className="bg-slate-50 py-12 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto px-4 mb-16">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/10 mb-5">
          <Crown className="w-7 h-7 fill-amber-505" />
        </div>
        <h1 className="text-3.5xl sm:text-4.5xl font-black text-slate-950 tracking-tight leading-tight mb-4">
          Maximize Listing Traffic & <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">Power Sales</span>
        </h1>
        <p className="text-slate-500 text-sm max-w-lg mx-auto">
          Scale visibility up to 3x, contact active vetted buyers directly, and take advantage of pro dashboard analytic tools.
        </p>
      </section>

      {/* Pricing switcher */}
      <div className="flex justify-center items-center gap-3.5 mb-12">
        <button
          onClick={() => setPeriod("monthly")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer select-none leading-none ${
            period === "monthly" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          Monthly Billings
        </button>
        <button
          onClick={() => setPeriod("yearly")}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer select-none leading-none ${
            period === "yearly" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          Yearly Billings
          <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider">Save 20%</span>
        </button>
      </div>

      {/* Plan Cards */}
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* Card: Basic */}
        <div className="bg-white rounded-3xl p-6.5 border border-slate-205 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[10px] font-black tracking-widest text-slate-400 block uppercase">Free tier</span>
            <h3 className="text-xl font-bold text-slate-900 leading-none">Basic Free</h3>
            <div className="pt-2">
              <span className="text-3xl font-black text-slate-900">$0</span>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mt-1">Free lifetime</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Designed for individual casual brokers posting are single listed items for basic localized visibility queries.
            </p>
            <hr className="border-slate-100" />
            <ul className="text-xs text-slate-600 space-y-3 font-semibold">
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 1 Active Listing</li>
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 30 Days expiration</li>
              <li className="flex items-center gap-1.5 text-slate-350"><X className="w-4 h-4 text-red-500 shrink-0" /> No Featured Listings</li>
              <li className="flex items-center gap-1.5 text-slate-350"><X className="w-4 h-4 text-red-500 shrink-0" /> Standard support ranks</li>
            </ul>
          </div>
          <button
            className="w-full mt-6 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 cursor-not-allowed"
            disabled
          >
            {subscriptionActive ? "Basic Inactive" : "Active Default plan"}
          </button>
        </div>

        {/* Card: Pro */}
        <div className="bg-white rounded-3xl p-6.5 border-2 border-blue-500 flex flex-col justify-between relative shadow-lg shadow-blue-500/5">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider">
            Most Popular
          </div>
          <div className="space-y-4">
            <span className="text-[10px] font-black tracking-widest text-blue-600 block uppercase">Expert Broker</span>
            <h3 className="text-xl font-bold text-slate-900 leading-none">Professional Pro</h3>
            <div className="pt-2">
              <span className="text-3xl font-black text-blue-600">${proPrice}</span>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mt-1">/ Month {period === "yearly" ? "billed yearly" : ""}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Best suited for active individual dealer agents seeking top visibility and verified organic lead check tags.
            </p>
            <hr className="border-slate-100" />
            <ul className="text-xs text-slate-600 space-y-3 font-semibold">
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 10 Active Listings</li>
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 60 Days validation</li>
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 2 Featured spots / mo</li>
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> 24/7 Priority Helpline</li>
            </ul>
          </div>
          
          {subscriptionActive && localStorage.getItem("autoWorld_subscription")?.includes("pro") ? (
            <button
              onClick={handleCancelSubscription}
              className="w-full mt-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition border border-red-200 cursor-pointer"
            >
              Downgrade plan / Cancel
            </button>
          ) : (
            <button
              onClick={() => handleOpenCheckout("pro", proPrice)}
              className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-blue-500/15 cursor-pointer block"
            >
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* Card: Business */}
        <div className="bg-white rounded-3xl p-6.5 border border-slate-205 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[10px] font-black tracking-widest text-slate-450 block uppercase">Dealership fleet</span>
            <h3 className="text-xl font-bold text-slate-900 leading-none">Dealership Business</h3>
            <div className="pt-2">
              <span className="text-3xl font-black text-slate-900">${businessPrice}</span>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mt-1">/ Month {period === "yearly" ? "billed yearly" : ""}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Unlimited list volume, bulk import scripts, and absolute VIP dedicated support panels safeguarding inventories.
            </p>
            <hr className="border-slate-100" />
            <ul className="text-xs text-slate-600 space-y-3 font-semibold">
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
              className="w-full mt-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition border border-red-200 cursor-pointer"
            >
              Downgrade plan / Cancel
            </button>
          ) : (
            <button
              onClick={() => handleOpenCheckout("business", businessPrice)}
              className="w-full mt-6 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition cursor-pointer block"
            >
              Upgrade to Business
            </button>
          )}
        </div>
      </div>

      {/* Plan Comparisons Matrix Panel */}
      <section className="max-w-5xl mx-auto px-4 mb-20">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center tracking-tight mb-8">Granular Comparison Grid</h2>
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-205 shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 sm:p-5 text-xs font-black text-slate-550 uppercase">Core Benefits</th>
                <th className="p-4 sm:p-5 text-xs font-black text-slate-550 uppercase">Basic</th>
                <th className="p-4 sm:p-5 text-xs font-black text-slate-550 uppercase text-blue-600">Pro Professional</th>
                <th className="p-4 sm:p-5 text-xs font-black text-slate-550 uppercase">Business Dealership</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-650 font-semibold">
              {plansComparison.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 sm:p-5 font-bold text-slate-900">{row.name}</td>
                  <td className="p-4 sm:p-5 text-slate-500">{row.basic}</td>
                  <td className="p-4 sm:p-5 text-blue-600 font-bold">{row.pro}</td>
                  <td className="p-4 sm:p-5 text-slate-800">{row.business}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQS ACCORDIONS COLLAPSIBLE MODULE */}
      <section className="max-w-4xl mx-auto px-4 mb-12">
        <h2 className="text-2xl font-extrabold text-slate-950 text-center tracking-tight mb-8">FAQ Subscription Guide</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFAQIndex === idx;
            return (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenFAQIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left font-bold text-slate-850 flex items-center justify-between transition hover:bg-slate-50 cursor-pointer"
                >
                  <span className="text-sm sm:text-base leading-snug">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="p-5 border-t border-slate-100 bg-slate-50 text-xs sm:text-sm text-slate-500 leading-relaxed font-semibold">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CHECKOUT POPUP DIALOG OVERLAY */}
      {showCheckout && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-t-3xl text-center relative">
              <button
                onClick={() => setShowCheckout(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
              <Crown className="w-10 h-10 mx-auto mb-2 text-amber-400 fill-amber-400 animate-pulse" />
              <h2 className="text-lg font-black tracking-tight leading-none">Secure Payment Upgrade</h2>
              <p className="text-xs text-blue-100/90 mt-1.5 uppercase font-bold">Plan: {selectedPlan.toUpperCase()} (${selectedPrice}/month)</p>
            </div>

            {/* Form list body */}
            <form onSubmit={handleConfirmPay} className="p-6.5 space-y-6">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-550">
                  <span>Upgrade term bill:</span>
                  <span>${selectedPrice}.00 USD</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-550">
                  <span>Additional setup tariff:</span>
                  <span>$0.00 USD</span>
                </div>
                <hr className="border-slate-205" />
                <div className="flex justify-between items-center text-sm font-black text-slate-900 pb-1">
                  <span>Total Due Today:</span>
                  <span className="text-blue-600">${selectedPrice}.00 USD</span>
                </div>
              </div>

              {/* Input elements */}
              <div className="p-4.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider block">Debit / Credit card credentials</h4>
                  <span className="text-[10px] text-slate-400 tracking-wider uppercase italic font-bold block">Protected checkout</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Card Number</label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      onDoubleClick={handleDoubleCheat}
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Expiry date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        maxLength={5}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CVV Code</label>
                      <input
                        type="password"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        maxLength={3}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-center font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Billing Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={billingName}
                        onChange={(e) => setBillingName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-550"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Billing Email</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-550"
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
                    className="mt-1 w-4.5 h-4.5 text-blue-600 border-slate-200 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="chk-terms" className="text-xs text-slate-650 leading-relaxed cursor-pointer select-none font-semibold">
                    I authorize immediate billing cycle deployment of ${selectedPrice}.00 USD matching period selection terms.
                  </label>
                </div>

                <div className="bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] leading-relaxed p-3.5 rounded-2xl flex items-start gap-1.5 font-semibold">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    <strong>Auto-fill Cheat:</strong> Double-click the Card number input field to instantly fulfill perfect test checkout credentials!
                  </span>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-blue-500/15 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
                        Validating order...
                      </>
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
