import React, { useState, useEffect } from "react";
import { Car, Search, Shield, Trophy, Users, Star, ArrowRight, Eye, Heart, DollarSign, Calendar, MapPin, Gauge, ShieldCheck, Crown, Sparkles } from "lucide-react";
import { Vehicle, DEFAULT_VEHICLES } from "../types";
import { motion } from "motion/react";

interface HomeTabProps {
  setActiveTab: (tab: string) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  setSearchFilters: (filters: { type: string; priceRange: string; location: string }) => void;
  onQuickView: (vehicle: Vehicle) => void;
}

function getOverriddenVehicles(): Vehicle[] {
  let list = [...DEFAULT_VEHICLES];
  try {
    const hiddenStr = localStorage.getItem("autoWorld_hidden_defaults");
    if (hiddenStr) {
      const hiddenIds = JSON.parse(hiddenStr);
      if (Array.isArray(hiddenIds)) {
        list = list.filter(v => !hiddenIds.includes(v.id));
      }
    }
  } catch (e) {
    console.error("Failed to parse hidden default vehicles in HomeTab:", e);
  }

  try {
    const removedStr = localStorage.getItem("autoWorld_removed_defaults");
    if (removedStr) {
      const removedIds = JSON.parse(removedStr);
      if (Array.isArray(removedIds)) {
        list = list.filter(v => !removedIds.includes(v.id));
      }
    }
  } catch (e) {
    console.error("Failed to parse removed default vehicles in HomeTab:", e);
  }

  try {
    const badgesStr = localStorage.getItem("autoWorld_default_badges");
    if (badgesStr) {
      const badgesMap = JSON.parse(badgesStr);
      if (badgesMap && typeof badgesMap === "object") {
        list = list.map(v => {
          const customBadge = badgesMap[v.id];
          return {
            ...v,
            badge: customBadge !== undefined ? customBadge : v.badge
          };
        });
      }
    }
  } catch (e) {
    console.error("Failed to parse custom default badges in HomeTab:", e);
  }
  return list;
}

export default function HomeTab({ setActiveTab, favorites, toggleFavorite, setSearchFilters, onQuickView }: HomeTabProps) {
  const [activeSearchTab, setActiveSearchTab] = useState<"buy" | "sell">("buy");
  const [selectedType, setSelectedType] = useState("Any Type");
  const [selectedPriceRange, setSelectedPriceRange] = useState("Any Price");
  const [selectedLocation, setSelectedLocation] = useState("");

  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [featuredCars, setFeaturedCars] = useState<Vehicle[]>(() => {
    return getOverriddenVehicles().slice(0, 3);
  });

  useEffect(() => {
    const handleUpdate = () => {
      setFeaturedCars(getOverriddenVehicles().slice(0, 3));
    };
    window.addEventListener("autoWorld_db_update", handleUpdate);
    // Sync on mount
    handleUpdate();
    return () => window.removeEventListener("autoWorld_db_update", handleUpdate);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchFilters({
      type: selectedType === "Any Type" ? "" : selectedType.toLowerCase(),
      priceRange: selectedPriceRange === "Any Price" ? "" : selectedPriceRange,
      location: selectedLocation
    });
    setActiveTab("buy");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-[#F4F1EA] text-[#1A1A1A] font-sans overflow-hidden animate-in fade-in duration-300"
    >
      
      {/* Editorial Split Hero Section */}
      <motion.section variants={itemVariants} className="relative border-b border-[#1A1A1A]/10">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Primary Narrative */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
            className="lg:col-span-7 p-8 sm:p-12 md:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#1A1A1A]/10"
          >
            <div>
              <span className="text-[10px] font-sans uppercase tracking-[0.25em] text-stone-700 mb-6 block font-extrabold">
                Volume IV • Issue 12 • Established MMXXVI
              </span>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-black tracking-tight leading-[0.95] text-stone-900 mb-8 select-none">
                The <span className="italic font-light text-stone-700">Aesthetic</span> <br/>
                of Fine Motors.
              </h1>
              <p className="text-base sm:text-lg leading-relaxed text-stone-700 max-w-lg font-sans mb-10">
                Refining the pre-owned vehicular trade network through uncompromised mechanical verification, pure high-fidelity listing specifications, and classical typographic clarity.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-stone-300/40">
              <div className="flex -space-x-3">
                <span className="w-9 h-9 rounded-full bg-stone-900 text-stone-200 text-xs flex items-center justify-center font-bold border-2 border-[#F4F1EA]">M</span>
                <span className="w-9 h-9 rounded-full bg-stone-800 text-stone-200 text-xs flex items-center justify-center font-bold border-2 border-[#F4F1EA]">V</span>
                <span className="w-9 h-9 rounded-full bg-stone-700 text-stone-250 text-xs flex items-center justify-center font-bold border-2 border-[#F4F1EA]">H</span>
              </div>
              <div className="text-xs">
                <div className="font-bold text-stone-950 uppercase tracking-wider">PEERLESS MOTOR INDICES</div>
                <div className="text-stone-500 italic">Vetted and digitally certified by mechanical inspectors</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Search Control panel */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.1 }}
            className="lg:col-span-5 p-8 sm:p-12 bg-stone-900 text-[#F4F1EA] flex flex-col justify-center"
          >
            <div className="bg-[#FAF8F5] text-stone-950 p-6 shadow-sm border border-stone-250">
              
              {/* Tab options */}
              <div className="flex border-b border-stone-200 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveSearchTab("buy")}
                  className={`pb-3.5 px-4 text-xs font-bold uppercase tracking-wider transition relative cursor-pointer ${
                    activeSearchTab === "buy" ? "text-stone-950" : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  Acquire Vehicle
                  {activeSearchTab === "buy" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-stone-900" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSearchTab("sell")}
                  className={`pb-3.5 px-4 text-xs font-bold uppercase tracking-wider transition relative cursor-pointer ${
                    activeSearchTab === "sell" ? "text-stone-950" : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  List a Vehicle
                  {activeSearchTab === "sell" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-stone-900" />
                  )}
                </button>
              </div>

              {/* BUY FORM */}
              {activeSearchTab === "buy" && (
                <form onSubmit={handleSearchSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Class Configuration</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-stone-950 text-xs font-semibold focus:outline-none focus:border-stone-900"
                    >
                      <option>Any Type</option>
                      <option>Car</option>
                      <option>SUV</option>
                      <option>Truck</option>
                      <option>Van</option>
                      <option>Motorcycle</option>
                      <option>Bicycle</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Target Broker Budget</label>
                    <select
                      value={selectedPriceRange}
                      onChange={(e) => setSelectedPriceRange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-stone-950 text-xs font-semibold focus:outline-none focus:border-stone-900"
                    >
                      <option>Any Price</option>
                      <option>Under ₹5 Lakhs</option>
                      <option>₹5 Lakhs - ₹15 Lakhs</option>
                      <option>₹15 Lakhs - ₹30 Lakhs</option>
                      <option>Over ₹30 Lakhs</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Region Coordinates</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="City, state, or ZIP..."
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-[#F4F1EA] border border-stone-300 text-stone-950 text-xs font-semibold focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-stone-900 text-[#F4F1EA] text-xs font-sans font-bold uppercase tracking-widest hover:bg-stone-850 cursor-pointer transition"
                  >
                    Examine Catalog Matching Indices
                  </button>
                </form>
              )}

              {/* SELL CONTEXT */}
              {activeSearchTab === "sell" && (
                <div className="text-center py-3 space-y-4">
                  <h3 className="text-sm font-bold font-serif italic text-stone-900">Commission-Free Listing Wizard</h3>
                  <p className="text-sm md:text-xs text-stone-600 leading-relaxed max-w-sm mx-auto font-sans">
                    Specify mechanical specifications, configure your asking parameters, and allow premium buyers to query your verified details.
                  </p>
                  <div className="w-full grid grid-cols-3 gap-2.5 py-2">
                    <div className="p-2 bg-[#F4F1EA] border border-stone-200">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-900 block">01 / Classify</span>
                    </div>
                    <div className="p-2 bg-[#F4F1EA] border border-stone-200">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-900 block">02 / Image</span>
                    </div>
                    <div className="p-2 bg-[#F4F1EA] border border-stone-200">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-900 block">03 / Deploy</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("sell")}
                    className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Create Listing Blueprint
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          </motion.div>

        </div>
      </motion.section>

      {/* Section 2: Featured vehicles Grid */}
      <motion.section variants={itemVariants} className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#1A1A1A]/10">
        <div className="flex flex-col md:flex-row justify-between items-baseline gap-4 mb-10 border-b border-stone-300 pb-6">
          <div>
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-stone-500 font-bold block mb-1">Pristine Specimens Currently Catalogued</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-stone-900">Featured Premium Collections</h2>
          </div>
          <button
            onClick={() => setActiveTab("buy")}
            className="group text-xs font-sans font-bold uppercase tracking-widest text-stone-900 hover:opacity-75 flex items-center gap-1.5 transition cursor-pointer"
          >
            Examine Complete Inventory Room
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        {/* AnimatePresence for grid filter transitions */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredCars.map((car) => {
            const isFav = favorites.includes(car.id);
            const isHovered = hoveredCardId === car.id;
            return (
              <motion.div
                key={car.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                onMouseEnter={() => setHoveredCardId(car.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                whileHover={{ scale: 1.025, y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                className="bg-[#FAF8F5] border border-stone-900/15 overflow-hidden flex flex-col group transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:border-stone-400 relative animate-in fade-in zoom-in-95"
              >
                {/* Media frame */}
                <div className="relative h-56 overflow-hidden bg-stone-200 grayscale-20 hover:grayscale-0 transition-all duration-500">
                  <img
                    src={car.image}
                    alt={car.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                    }}
                  />
                  
                  {car.badge && (
                    <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-stone-950 text-[#F4F1EA] text-[9px] font-bold uppercase tracking-[0.15em] border border-[#F4F1EA]/20 shadow-md">
                      {car.badge}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleFavorite(car.id)}
                    className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition border shadow-sm ${
                      isFav
                        ? "bg-stone-900 text-stone-100 border-stone-950"
                        : "bg-white/80 text-stone-700 hover:text-stone-950 hover:bg-white border-stone-200"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isFav ? "fill-white" : ""}`} />
                  </button>

                  {/* Dynamic Laser Scanning Line */}
                  {isHovered && (
                    <motion.div
                      initial={{ top: "0%" }}
                      animate={{ top: "100%" }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-0.5 bg-[#A855F7] shadow-[0_0_12px_#A855F7] z-20 pointer-events-none"
                    />
                  )}

                  {/* Diagnostic Radar Metric Overlay */}
                  <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={isHovered ? { opacity: 1, backdropFilter: "blur(3px)" } : { opacity: 0, backdropFilter: "blur(0px)" }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 bg-stone-950/85 p-5 flex flex-col justify-between text-[#F4F1EA] pointer-events-none z-10"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#A855F7] font-bold flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7] inline-block"></span>
                          Chassis Scan Active
                        </span>
                        <span className="text-[9px] uppercase text-stone-400 font-mono">Telemetry Logs</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-[9px] font-mono mb-1">
                            <span className="text-stone-400">ENGINE DIAGNOSTICS</span>
                            <span className="text-[#A855F7] font-bold">{car.id % 2 === 0 ? "98%" : "96%"}</span>
                          </div>
                          <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: "0%" }}
                              animate={isHovered ? { width: car.id % 2 === 0 ? "98%" : "96%" } : { width: "0%" }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className="h-full bg-[#A855F7]" 
                            />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-[9px] font-mono mb-1">
                            <span className="text-stone-400">BODYWORK INTEGRITY</span>
                            <span className="text-[#A855F7] font-bold">{car.id % 3 === 0 ? "95%" : "97%"}</span>
                          </div>
                          <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: "0%" }}
                              animate={isHovered ? { width: car.id % 3 === 0 ? "95%" : "97%" } : { width: "0%" }}
                              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                              className="h-full bg-[#A855F7]" 
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[9px] font-mono mb-1">
                            <span className="text-stone-400">DRIVETRAIN STATUS</span>
                            <span className="text-[#A855F7] font-bold">EXCELLENT</span>
                          </div>
                          <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: "0%" }}
                              animate={isHovered ? { width: "94%" } : { width: "0%" }}
                              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                              className="h-full bg-[#A855F7]" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] font-mono text-stone-400 uppercase leading-relaxed text-center flex items-center justify-center gap-1.5 border-t border-stone-800/80 pt-2.5">
                      <Eye className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      View service ledger logs
                    </div>
                  </motion.div>
                </div>

                {/* Info block */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono tracking-widest text-stone-400 block uppercase">REF #AW0{car.id}</span>
                      {car.badge === "verified" && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 uppercase tracking-wider border border-emerald-200">Verified</span>
                      )}
                    </div>
                    <h3 className="text-xl font-serif font-black text-stone-950 mb-3 group-hover:underline cursor-pointer" onClick={() => onQuickView(car)}>
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

                  <div className="flex items-center justify-between pt-2.5">
                    <div>
                      <span className="text-xs text-stone-400 block uppercase font-light font-sans">Valuation</span>
                      <span className="text-2xl font-serif font-black text-stone-950">₹{car.price.toLocaleString("en-IN")}</span>
                    </div>
                    <button
                      onClick={() => onQuickView(car)}
                      className="px-4 py-2.5 bg-stone-950 hover:bg-[#F4F1EA] hover:text-stone-950 text-[#F4F1EA] text-xs font-sans uppercase font-bold tracking-widest border border-stone-950 transition-all duration-300"
                    >
                      View Dossier
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Section 3: Process Steps */}
      <motion.section variants={itemVariants} className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#1A1A1A]/10">
        <div className="text-center max-w-xl mx-auto mb-16">
          <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-stone-400 block mb-1.5 font-bold">Verification Workflow</span>
          <h2 className="text-3xl font-serif font-black text-stone-900">How Auto World Operates</h2>
          <p className="text-stone-500 text-sm italic font-serif">We provide an physical print-grade framework safeguarding buyers and publishers.</p>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { step: "01", title: "Browse Listings", desc: "Utilize clean typographic filter matrices to identify models. Examine mechanical checklists and high resolution photo documents." },
            { step: "02", title: "Inspect Metrics", desc: "Receive transparent reports holding exact engine conditions, structural health ratings, and estimated broker parameters." },
            { step: "03", title: "Direct Contact", desc: "Establish direct contacts with vetted owners over safe, verified email and phone coordinates, supported with standardized template forms." },
            { step: "04", title: "Authentic Handover", desc: "Complete registration state processes, verify mechanical identification, and confidently sign trade deeds." }
          ].map((item, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, type: "spring", stiffness: 90, damping: 15 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="bg-[#FAF8F5] p-8 border border-stone-900/15 transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <div className="text-3xl font-serif font-light text-stone-400 border-b border-stone-200 pb-3 mb-4 flex justify-between items-baseline">
                <span>{item.step}</span>
                <span className="text-[10px] uppercase font-sans tracking-widest text-stone-400 font-bold">Chapter</span>
              </div>
              <h3 className="text-sm uppercase tracking-wider font-bold text-stone-950 mb-2">{item.title}</h3>
              <p className="text-stone-605 text-sm md:text-xs leading-relaxed font-sans font-semibold">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Section 4: Statistics */}
      <motion.section variants={itemVariants} className="bg-stone-950 text-white py-16 border-b border-[#1A1A1A]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-stone-800">
            <div className="space-y-1">
              <div className="text-4xl sm:text-5xl font-serif font-light">10k+</div>
              <p className="text-stone-400 text-xs md:text-[10px] uppercase tracking-widest font-sans font-bold">Motors Catalogued</p>
            </div>
            <div className="space-y-1">
              <div className="text-4xl sm:text-5xl font-serif font-light">50k+</div>
              <p className="text-stone-400 text-xs md:text-[10px] uppercase tracking-widest font-sans font-bold">Inspected Transfers</p>
            </div>
            <div className="space-y-1">
              <div className="text-4xl sm:text-5xl font-serif font-light">100%</div>
              <p className="text-stone-400 text-xs md:text-[10px] uppercase tracking-widest font-sans font-bold">Secure Vetting</p>
            </div>
            <div className="space-y-1">
              <div className="text-4xl sm:text-5xl font-serif font-light">4.9/5</div>
              <p className="text-stone-400 text-xs md:text-[10px] uppercase tracking-widest font-sans font-bold">Broker Satisfaction</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Section 5: Premium Promo */}
      <motion.section variants={itemVariants} className="py-24 bg-[#E0DBCF] text-[#1A1A1A] relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-6">
          <Crown className="w-12 h-12 text-stone-900 mx-auto" />
          <span className="text-[10px] tracking-[0.3em] font-sans font-bold uppercase block text-stone-600">The Editorial Index Plus</span>
          <h2 className="text-4xl md:text-5xl font-serif font-black tracking-tight text-stone-950">Unlock Premium Syndicate Placement</h2>
          <p className="text-stone-700 text-sm max-w-lg mx-auto font-sans leading-relaxed">
            Gain immediate access to full owner phone metrics, broker correspondence archives, active listings priority displays, and custom certified badges.
          </p>
          <div className="pt-4">
            <button
              onClick={() => setActiveTab("premium")}
              className="px-8 py-4 bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-widest transition cursor-pointer"
            >
              Examine Syndicate Membership Matrix
            </button>
          </div>
        </div>
      </motion.section>

    </motion.div>
  );
}
