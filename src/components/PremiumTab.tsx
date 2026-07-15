import React, { useState } from "react";
import { Crown, Check, X, Shield, Star, Award, ShieldCheck, Sparkles, ChevronDown, CreditCard, Lock, Radio } from "lucide-react";
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

// Custom 3D Tiltable Premium Plan Card
function PremiumPlanCard({ 
  title, 
  priceLabel, 
  priceVal, 
  subLabel, 
  desc, 
  features, 
  btnLabel, 
  btnDisabled, 
  onBtnClick, 
  badgeText, 
  isMostPopular,
  priceUnit = "/ Month"
}: {
  title: string;
  priceLabel: string;
  priceVal: string;
  subLabel: string;
  desc: string;
  features: { label: string; included: boolean }[];
  btnLabel: string;
  btnDisabled?: boolean;
  onBtnClick?: () => void;
  badgeText?: string;
  isMostPopular?: boolean;
  priceUnit?: string;
}) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [sheenX, setSheenX] = useState(50);
  const [sheenY, setSheenY] = useState(50);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    setRotateX(-y / 15);
    setRotateY(x / 15);
    setSheenX(((e.clientX - box.left) / box.width) * 100);
    setSheenY(((e.clientY - box.top) / box.height) * 100);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      className={`bg-[#FAF8F5] p-6.5 border-2 flex flex-col justify-between relative shadow-sm transition-all duration-300 ease-out ${
        isMostPopular 
          ? "border-purple-600 shadow-[6px_6px_0px_0px_rgba(168,85,247,0.3)] hover:shadow-[10px_10px_0px_0px_rgba(168,85,247,0.4)]" 
          : "border-stone-950 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)]"
      }`}
      style={{
        transformStyle: "preserve-3d",
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic Sheen light reflection */}
      {isHovered && (
        <div 
          className="absolute inset-0 pointer-events-none z-30 mix-blend-overlay opacity-50"
          style={{
            background: `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255,255,255,0.55) 0%, transparent 60%)`
          }}
        />
      )}

      {badgeText && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-[9px] font-bold uppercase tracking-widest font-mono z-10 ${
          isMostPopular ? "bg-purple-600 text-white" : "bg-stone-950 text-[#F4F1EA]"
        }`}>
          {badgeText}
        </div>
      )}

      <div className="space-y-4">
        <span className="text-[10px] font-bold font-mono tracking-widest text-stone-500 block uppercase">{priceLabel}</span>
        <h3 className="text-xl font-serif font-black text-stone-950 leading-none flex items-center gap-2">
          {title}
          {isMostPopular && <Sparkles className="w-4 h-4 text-purple-600 fill-purple-100" />}
        </h3>
        <div className="pt-2">
          <span className="text-3xl font-serif font-black text-stone-950">{priceVal}</span>
          <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block mt-1">{subLabel} {priceUnit}</span>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed font-semibold">
          {desc}
        </p>
        <hr className="border-stone-200" />
        <ul className="text-xs text-stone-700 space-y-3 font-semibold">
          {features.map((f, i) => (
            <li key={i} className={`flex items-center gap-1.5 ${f.included ? "" : "text-stone-400"}`}>
              {f.included ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-stone-400 shrink-0" />
              )}
              <span>{f.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onBtnClick}
        disabled={btnDisabled}
        className={`w-full mt-6 py-3.5 text-xs font-extrabold uppercase tracking-widest transition duration-200 block text-center ${
          btnDisabled
            ? "border-2 border-stone-200 text-[#1A1A1A]/30 bg-stone-100 cursor-not-allowed"
            : isMostPopular
              ? "bg-purple-600 hover:bg-purple-700 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer"
              : "bg-stone-950 hover:bg-stone-850 text-white shadow-[3px_3px_0px_0px_rgba(168,85,247,0.3)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer"
        }`}
      >
        {btnLabel}
      </button>
    </motion.div>
  );
}

export default function PremiumTab({ subscriptionActive, setSubscriptionActive, showToast, currentUser }: PremiumTabProps) {
  const isOwner = currentUser?.email === "afrojalamansari461@gmail.com";
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "business" | "">("");
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Sub-tab selection state with sliding indicators
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
  
  // High-fidelity processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutStage, setCheckoutStage] = useState<number>(0);

  const checkoutStages = [
    "Establishing secure Indian Banking network SSL socket...",
    "Validating secure token hash matching merchant keys...",
    "Analyzing credit balance verification request protocol...",
    "Completing dual-key ledger encryption synchronization...",
    "Confirming secure subscription status update..."
  ];

  // Dynamic pricing
  const proPrice = period === "monthly" ? 1499 : 1199;
  const businessPrice = period === "monthly" ? 4999 : 3999;

  const handleOpenCheckout = (planName: "pro" | "business", basePrice: number) => {
    setSelectedPlan(planName);
    setSelectedPrice(basePrice);
    setShowCheckout(true);
  };

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
    setCheckoutStage(0);

    // Dynamic high-security simulated stepper
    const interval = setInterval(() => {
      setCheckoutStage((prev) => {
        if (prev < checkoutStages.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 650);

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
          clearInterval(interval);
          setIsProcessing(false);
          throw err;
        }
      }

      localStorage.setItem("autoWorld_subscription", JSON.stringify(subscriptionObj));
      localStorage.setItem("autoWorld_subscription_date", new Date().toISOString());
      
      setSubscriptionActive(true);
      setIsProcessing(false);
      setShowCheckout(false);
      clearInterval(interval);
      showToast(`Congratulations! You have successfully upgraded to the ${selectedPlan.toUpperCase()} Premium Tier!`, "success");
    }, 3400);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
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
      className="bg-[#F4F1EA] py-12 text-[#1A1A1A]"
    >
      {/* Hero Section */}
      <motion.section variants={itemVariants} className="text-center max-w-4xl mx-auto px-4 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-stone-900/10 text-stone-900 border border-stone-300 mb-5 rounded-full shadow-inner animate-in zoom-in duration-300">
          <Crown className="w-7 h-7 fill-amber-500 text-amber-500 animate-pulse" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-black text-stone-950 tracking-tight leading-tight mb-4 uppercase">
          Maximize listing traffic & <span className="italic font-light text-stone-600 font-sans tracking-wide">Power sales</span>
        </h1>
        <p className="text-stone-600 text-xs sm:text-sm max-w-lg mx-auto font-semibold leading-relaxed uppercase tracking-wider">
          Scale visibility up to 3x, contact active vetted buyers directly, and take advantage of pro dashboard analytic tools.
        </p>
      </motion.section>

      {/* PREMIUM SLIDING TABS CONTROLLER */}
      <motion.div 
        variants={itemVariants}
        className="flex justify-center max-w-2xl mx-auto mb-12 border-b border-stone-300 pb-px gap-1 sm:gap-4 px-4 overflow-x-auto whitespace-nowrap scrollbar-none flex-nowrap"
      >
        {[
          { id: "plans", label: "Plans", icon: Sparkles },
          { id: "comparison", label: "Listing", icon: Award },
          { id: "faq", label: "Billing", icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`relative pb-3 flex items-center gap-1.5 px-3.5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors duration-200 select-none cursor-pointer leading-none shrink-0 ${
                isActive ? "text-stone-950 font-black" : "text-stone-550 hover:text-stone-850"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? "text-purple-600" : "text-stone-500"}`} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="activeSubTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-purple-600"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
            </button>
          );
        })}
      </motion.div>

      {/* SUB-TABS DYNAMIC VIEWPORT */}
      <motion.div variants={itemVariants} className="max-w-6xl mx-auto px-4">
        <AnimatePresence mode="wait">
          {activeSubTab === "plans" && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-12"
            >
              {isOwner ? (
                <div className="max-w-4xl mx-auto px-4">
                  <div className="bg-[#FAF8F2] border-4 border-stone-950 p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-stone-900/10 rounded-full translate-x-12 -translate-y-12 border border-stone-300" />
                    <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-stone-900/5 rounded-full border border-stone-300/50" />
                    
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-900 text-[#F4F1EA] mb-6 rounded-full border border-amber-400 shadow-lg relative">
                      <Crown className="w-8 h-8 fill-amber-400 text-amber-400 animate-bounce" />
                    </div>
                    
                    <h3 className="text-3xl font-serif font-black uppercase text-stone-950 tracking-tight mb-2">
                      Owner Active Pass
                    </h3>
                    <span className="inline-block text-[10px] font-mono tracking-widest uppercase bg-stone-900 text-amber-400 px-3.5 py-1 font-bold mb-6">
                      Certified Administrator: afrojalamansari461@gmail.com
                    </span>
                    
                    <div className="max-w-xl mx-auto space-y-4 text-xs sm:text-sm font-semibold uppercase tracking-wider text-stone-600">
                      <p className="leading-relaxed">
                        Auto World billing protocols are bypassed. Your verified owner sign-in profile holds absolute sovereign access, unlocking premium lists, direct broker routes, and custom dashboard indices globally.
                      </p>
                      
                      <div className="border-y border-stone-300 py-4 my-6 grid grid-cols-3 gap-4 text-center">
                        <div>
                          <span className="block text-[#1A1A1A] text-lg sm:text-xl font-serif font-black">Unlimited</span>
                          <span className="text-[9px] text-stone-400 block font-mono">Listings Allowed</span>
                        </div>
                        <div className="border-x border-stone-200">
                          <span className="block text-[#1A1A1A] text-lg sm:text-xl font-serif font-black">Infinity</span>
                          <span className="text-[9px] text-stone-400 block font-mono">Validity Period</span>
                        </div>
                        <div>
                          <span className="block text-[#1A1A1A] text-lg sm:text-xl font-serif font-black">VIP Gold</span>
                          <span className="text-[9px] text-stone-400 block font-mono">Access Permit</span>
                        </div>
                      </div>
                      
                      <p className="text-[10px] font-mono font-bold text-stone-400 normal-case leading-snug">
                        "With administrative ownership comes absolute system-wide command. Thank you for maintaining the pristine registry records of Auto World."
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Pricing Switcher */}
                  <div className="flex justify-center items-center gap-3.5 mb-12">
                    <button
                      type="button"
                      onClick={() => setPeriod("monthly")}
                      className={`px-5 py-2.5 text-xs font-bold font-mono uppercase tracking-widest transition cursor-pointer select-none leading-none ${
                        period === "monthly" 
                          ? "bg-stone-900 text-[#F4F1EA] shadow-md border border-stone-900" 
                          : "bg-[#FAF8F5] text-stone-600 hover:bg-stone-200 border border-stone-300"
                      }`}
                    >
                      Monthly Billings
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriod("yearly")}
                      className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold font-mono uppercase tracking-widest transition cursor-pointer select-none leading-none ${
                        period === "yearly" 
                          ? "bg-stone-900 text-[#F4F1EA] shadow-md border border-stone-900" 
                          : "bg-[#FAF8F5] text-stone-600 hover:bg-stone-200 border border-stone-300"
                      }`}
                    >
                      Yearly Billings
                      <span className="px-2 py-0.5 bg-emerald-200 text-emerald-950 font-black uppercase tracking-wider text-[9px]">Save 20%</span>
                    </button>
                  </div>

                  {/* Plan Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Basic Card */}
                    <PremiumPlanCard
                      title="Basic Free"
                      priceLabel="Free tier"
                      priceVal="₹0"
                      subLabel="Free lifetime"
                      desc="Designed for individual casual brokers posting single listed items for basic localized visibility queries."
                      features={[
                        { label: "1 Active Listing", included: true },
                        { label: "30 Days expiration", included: true },
                        { label: "No Featured Listings", included: false },
                        { label: "Standard support ranks", included: false }
                      ]}
                      btnLabel={subscriptionActive ? "Basic Inactive" : "Active Default plan"}
                      btnDisabled={true}
                    />

                    {/* Pro Card */}
                    <PremiumPlanCard
                      title="Professional Pro"
                      priceLabel="Expert Broker"
                      priceVal={`₹${proPrice.toLocaleString("en-IN")}`}
                      subLabel={period === "yearly" ? "billed yearly" : "billed monthly"}
                      desc="Best suited for active individual dealer agents seeking top visibility and verified organic lead check tags."
                      features={[
                        { label: "10 Active Listings", included: true },
                        { label: "60 Days validation", included: true },
                        { label: "2 Featured spots / mo", included: true },
                        { label: "24/7 Priority Helpline", included: true }
                      ]}
                      isMostPopular={true}
                      badgeText="Most Popular"
                      btnLabel={
                        subscriptionActive && localStorage.getItem("autoWorld_subscription")?.includes("pro")
                          ? confirmCancel ? "Verifying cancel" : "Downgrade plan / Cancel"
                          : "Upgrade to Pro"
                      }
                      onBtnClick={
                        subscriptionActive && localStorage.getItem("autoWorld_subscription")?.includes("pro")
                          ? handleCancelSubscription
                          : () => handleOpenCheckout("pro", proPrice)
                      }
                    />

                    {/* Business Card */}
                    <PremiumPlanCard
                      title="Dealership Business"
                      priceLabel="Dealership fleet"
                      priceVal={`₹${businessPrice.toLocaleString("en-IN")}`}
                      subLabel={period === "yearly" ? "billed yearly" : "billed monthly"}
                      desc="Unlimited list volume, bulk import scripts, and absolute VIP dedicated support panels safeguarding inventories."
                      features={[
                        { label: "Unlimited active listings", included: true },
                        { label: "90 Days visibility list", included: true },
                        { label: "Unlimited Featured spots", included: true },
                        { label: "Dedicated Account Broker", included: true },
                        { label: "Custom API XML listings feed", included: true }
                      ]}
                      btnLabel={
                        subscriptionActive && localStorage.getItem("autoWorld_subscription")?.includes("business")
                          ? confirmCancel ? "Verifying cancel" : "Downgrade plan / Cancel"
                          : "Upgrade to Business"
                      }
                      onBtnClick={
                        subscriptionActive && localStorage.getItem("autoWorld_subscription")?.includes("business")
                          ? handleCancelSubscription
                          : () => handleOpenCheckout("business", businessPrice)
                      }
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeSubTab === "comparison" && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="max-w-5xl mx-auto pt-4"
            >
              <div className="bg-[#FAF8F5] border-2 border-stone-950 shadow-sm overflow-hidden">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-350">
                      <th className="p-4 sm:p-5 text-[10px] font-bold text-stone-500 uppercase font-mono tracking-widest">Core Benefits</th>
                      <th className="p-4 sm:p-5 text-[10px] font-bold text-stone-500 uppercase font-mono tracking-widest">Basic</th>
                      <th className="p-4 sm:p-5 text-[10px] font-black text-purple-700 uppercase font-mono tracking-widest font-extrabold">Pro</th>
                      <th className="p-4 sm:p-5 text-[10px] font-bold text-stone-500 uppercase font-mono tracking-widest">Business</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-xs sm:text-sm text-stone-600 font-semibold uppercase tracking-wide text-[11px]">
                    {plansComparison.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50 transition">
                        <td className="p-4 sm:p-5 font-bold text-stone-950 leading-relaxed">{row.name}</td>
                        <td className="p-4 sm:p-5 text-stone-500">{row.basic}</td>
                        <td className="p-4 sm:p-5 text-purple-800 font-black">{row.pro}</td>
                        <td className="p-4 sm:p-5 text-stone-700">{row.business}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeSubTab === "faq" && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="max-w-4xl mx-auto pt-4 space-y-4"
            >
              {faqs.map((faq, idx) => {
                const isOpen = openFAQIndex === idx;
                return (
                  <div key={idx} className="bg-[#FAF8F5] border-2 border-stone-950 overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpenFAQIndex(isOpen ? null : idx)}
                      className="w-full p-5 text-left font-bold text-[#1A1A1A] flex items-center justify-between transition hover:bg-stone-100 cursor-pointer"
                    >
                      <span className="text-xs font-extrabold uppercase tracking-widest text-stone-850 leading-snug">{faq.q}</span>
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
                          <div className="p-5 bg-stone-100 text-xs text-stone-600 leading-relaxed font-semibold">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* CHECKOUT POPUP DIALOG OVERLAY */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#F4F1EA] border-2 border-stone-950 w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(168,85,247,0.3)] relative max-h-[92vh] overflow-y-auto"
            >
              {isProcessing ? (
                /* Dynamic Premium Multi-stage Live Cryptographic Transaction Progress Stepper */
                <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[400px] space-y-6">
                  <div className="relative w-20 h-20">
                    <motion.div 
                      className="absolute inset-0 bg-purple-200 rounded-none border border-purple-500"
                      animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                    <motion.div 
                      className="absolute inset-3 bg-stone-950 text-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(168,85,247,1)]"
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    >
                      <Lock className="w-5 h-5 text-purple-400" />
                    </motion.div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-stone-950 font-mono">Securing Gateway Transaction</h3>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold">Encrypted Ledger Synchronization In Progress</p>
                  </div>

                  {/* Progressive Handshake Stage indicators */}
                  <div className="w-full max-w-xs space-y-2.5 pt-4 text-left font-mono">
                    {checkoutStages.map((stage, idx) => {
                      const isActive = checkoutStage === idx;
                      const isCompleted = checkoutStage > idx;
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-center gap-2.5 text-[10px] font-bold uppercase transition-opacity duration-300 ${
                            isActive ? "text-purple-600 opacity-100" : isCompleted ? "text-stone-500 opacity-60" : "text-stone-300 opacity-40"
                          }`}
                        >
                          <div className="shrink-0">
                            {isCompleted ? (
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            ) : isActive ? (
                              <Radio className="w-4 h-4 text-purple-600 animate-pulse" />
                            ) : (
                              <div className="w-4 h-4 border border-stone-300 rounded-none bg-stone-100" />
                            )}
                          </div>
                          <span className="truncate">{stage}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sleek bottom secure logo */}
                  <div className="pt-2 flex items-center gap-1.5 text-stone-400 font-mono text-[9px] font-extrabold uppercase tracking-widest">
                    <Shield className="w-3.5 h-3.5 text-stone-400" />
                    <span>PCIDSS COMPLIANT SSL KEY LOCK</span>
                  </div>
                </div>
              ) : (
                /* Checkout details form layout */
                <>
                  {/* Header */}
                  <div className="bg-stone-950 text-[#F4F1EA] p-6 text-center relative border-b border-stone-850">
                    <button
                      type="button"
                      onClick={() => setShowCheckout(false)}
                      className="absolute top-4 right-4 text-white hover:text-purple-400 p-1 font-mono cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                    <Crown className="w-10 h-10 mx-auto mb-2 text-amber-500 fill-amber-500" />
                    <h2 className="text-lg font-serif font-black tracking-tight leading-none uppercase">Secure Payment Upgrade</h2>
                    <p className="text-[10px] text-stone-400 mt-1.5 uppercase font-bold tracking-widest font-mono">
                      Plan: {selectedPlan.toUpperCase()} (₹{selectedPrice.toLocaleString("en-IN")}/month)
                    </p>
                  </div>

                  {/* Form body */}
                  <form onSubmit={handleConfirmPay} className="p-6 sm:p-8 space-y-6">
                    <div className="bg-[#FAF8F5] border-2 border-stone-950 p-4.5 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-500 uppercase tracking-widest font-mono">
                        <span>Upgrade term bill:</span>
                        <span>₹{selectedPrice.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-stone-400 uppercase tracking-widest font-mono">
                        <span>Additional setup tariff:</span>
                        <span>₹0</span>
                      </div>
                      <hr className="border-stone-200" />
                      <div className="flex justify-between items-center text-sm font-black text-stone-950 pb-1 uppercase tracking-widest leading-none font-mono">
                        <span>Total Due Today:</span>
                        <span className="text-purple-700 font-serif font-black text-lg">₹{selectedPrice.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    {/* Input credentials */}
                    <div className="p-4.5 bg-[#FAF8F5] border-2 border-stone-950 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <h4 className="text-xs font-black text-[#1A1A1A] uppercase tracking-widest block font-sans">Debit / Credit credentials</h4>
                        <span className="text-[9px] text-stone-500 tracking-wider uppercase italic font-bold block flex items-center gap-1">
                          <Lock className="w-3 h-3 text-emerald-600" /> Secure Gate
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">Card Number</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="4242 4242 4242 4242"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              onDoubleClick={handleDoubleCheat}
                              required
                              className="w-full pl-10 pr-3.5 py-2.5 bg-[#F4F1EA] border-2 border-stone-300 text-sm font-mono tracking-widest focus:outline-none focus:border-stone-950 focus:bg-white transition-colors"
                            />
                            <CreditCard className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">Expiry date</label>
                            <input
                              type="text"
                              placeholder="MM/YY"
                              value={expiry}
                              onChange={(e) => setExpiry(e.target.value)}
                              maxLength={5}
                              required
                              className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border-2 border-stone-300 text-sm focus:outline-none focus:border-stone-950 text-center font-mono focus:bg-white transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">CVV Code</label>
                            <input
                              type="password"
                              placeholder="123"
                              value={cvv}
                              onChange={(e) => setCvv(e.target.value)}
                              maxLength={3}
                              required
                              className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border-2 border-stone-300 text-sm focus:outline-none focus:border-stone-950 text-center font-mono focus:bg-white transition-colors"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">Billing Name</label>
                            <input
                              type="text"
                              placeholder="John Doe"
                              value={billingName}
                              onChange={(e) => setBillingName(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border-2 border-stone-300 text-sm focus:outline-none focus:border-stone-950 focus:bg-white transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">Billing Email</label>
                            <input
                              type="email"
                              placeholder="john@example.com"
                              value={billingEmail}
                              onChange={(e) => setBillingEmail(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border-2 border-stone-300 text-sm focus:outline-none focus:border-stone-950 font-mono focus:bg-white transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Terms authorization & details */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="chk-terms"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          required
                          className="mt-1 w-4.5 h-4.5 text-stone-950 accent-stone-950 border-2 border-stone-400 rounded-none focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="chk-terms" className="text-[10px] text-stone-700 uppercase tracking-widest cursor-pointer select-none font-bold leading-relaxed">
                          I authorize immediate billing cycle deployment of ₹{selectedPrice.toLocaleString("en-IN")} matching period selection terms.
                        </label>
                      </div>

                      <div className="bg-purple-50 border-2 border-dashed border-purple-350 text-purple-950 text-[10px] uppercase font-bold tracking-wider leading-relaxed p-3.5 flex items-start gap-1.5">
                        <Sparkles className="w-4 h-4 shrink-0 text-purple-600 mt-0.5" />
                        <span>
                          <strong>Developer Quick-Fill:</strong> Double-click card number input to instantly auto-fill valid credit card mock parameters!
                        </span>
                      </div>

                      <div className="flex gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowCheckout(false)}
                          className="flex-1 py-3.5 bg-[#FAF8F5] border-2 border-stone-950 hover:bg-stone-205 text-stone-950 text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-2 py-3.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 transition cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                        >
                          Confirm Upgrade Payment
                        </button>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
