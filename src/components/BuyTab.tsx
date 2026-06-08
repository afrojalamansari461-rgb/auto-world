import React, { useState, useEffect } from "react";
import { Search, MapPin, Gauge, DollarSign, Calendar, Lock, Clock, Heart, Eye, Filter, Sparkles, User, Mail, Phone, Info, RefreshCw, Star } from "lucide-react";
import { Vehicle, DEFAULT_VEHICLES, UserListing } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface BuyTabProps {
  favorites: number[];
  toggleFavorite: (id: number) => void;
  searchFilters: { type: string; priceRange: string; location: string };
  onQuickView: (vehicle: Vehicle) => void;
  subscriptionActive: boolean;
}

export default function BuyTab({ favorites, toggleFavorite, searchFilters, onQuickView, subscriptionActive }: BuyTabProps) {
  // Payment states
  const [hasPaidPass, setHasPaidPass] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [countdownText, setCountdownText] = useState("");
  
  // Payment Input details
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Listing Filters
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState(searchFilters.priceRange || "");
  const [selectedType, setSelectedType] = useState(searchFilters.type || "");
  const [locationValue, setLocationValue] = useState(searchFilters.location || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Dynamic lists
  const [inventoryList, setInventoryList] = useState<Vehicle[]>([]);

  // STEP 1: Check Payment Access Status
  useEffect(() => {
    // If the user has a premium plan, they automatically bypass the daily pass wall!
    if (subscriptionActive) {
      setHasPaidPass(true);
      return;
    }

    const checkPass = () => {
      const lastPayment = localStorage.getItem("autoWorld_lastPayment");
      if (lastPayment) {
        const lastDate = new Date(lastPayment);
        const now = new Date();
        const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

        if (diffHours < 24) {
          setHasPaidPass(true);
          const remainingMinutes = Math.floor((24 - diffHours) * 60);
          updateTimerText(remainingMinutes);
        } else {
          setHasPaidPass(false);
          localStorage.removeItem("autoWorld_lastPayment");
        }
      } else {
        setHasPaidPass(false);
      }
    };

    checkPass();
    const interval = setInterval(checkPass, 10000); // Poll lock screen
    return () => clearInterval(interval);
  }, [subscriptionActive]);

  // STEP 2: Timer calculations
  const updateTimerText = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    setCountdownText(`${hours}h ${minutes.toString().padStart(2, "0")}m remaining`);
  };

  // STEP 3: Load listings combining both hardcoded assets & localStorage submissions
  useEffect(() => {
    const defaultData = [...DEFAULT_VEHICLES];
    
    // Parse user created listings
    let userListings: UserListing[] = [];
    try {
      const stored = localStorage.getItem("autoWorld_listings");
      if (stored) {
        userListings = JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }

    const compiledUserVehicles: Vehicle[] = userListings.map((listing, index) => {
      let image = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800";
      if (listing.type === "car" || listing.type === "suv") {
        image = listing.photos && listing.photos.length > 0 
          ? listing.photos[0].src 
          : "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800";
      } else if (listing.type === "truck") {
        image = listing.photos && listing.photos.length > 0 
          ? listing.photos[0].src 
          : "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800";
      } else if (listing.type === "motorcycle") {
        image = listing.photos && listing.photos.length > 0 
          ? listing.photos[0].src 
          : "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800";
      } else if (listing.type === "bicycle") {
        image = listing.photos && listing.photos.length > 0 
          ? listing.photos[0].src 
          : "https://images.unsplash.com/photo-1484920274317-87885fcbc504?w=800";
      }

      return {
        id: 1000 + index, 
        title: listing.title,
        price: listing.price,
        image: image,
        make: listing.make,
        model: listing.model,
        year: parseInt(listing.year) || 2022,
        mileage: listing.mileage ? `${parseInt(listing.mileage).toLocaleString()} mi` : "N/A",
        fuel: listing.fuelType ? (listing.fuelType.charAt(0).toUpperCase() + listing.fuelType.slice(1)) : "Petrol",
        transmission: listing.transmission ? (listing.transmission.charAt(0).toUpperCase() + listing.transmission.slice(1)) : "Automatic",
        badge: listing.featured ? "premium" : listing.urgent ? "hot" : null,
        description: listing.description,
        features: listing.features,
        category: listing.type,
        isUserListing: true,
        listingId: listing.id
      };
    });

    setInventoryList([...defaultData, ...compiledUserVehicles]);
  }, []);

  // Sync passed search filters
  useEffect(() => {
    if (searchFilters.type) setSelectedType(searchFilters.type);
    if (searchFilters.priceRange) setSelectedPriceRange(searchFilters.priceRange);
    if (searchFilters.location) setLocationValue(searchFilters.location);
  }, [searchFilters]);

  // Double-Click cheat to auto-fill payment
  const handleCheatAutoFill = () => {
    setCardNumber("4242 4242 4242 4242");
    setExpiryDate("12/28");
    setCardName("John Doe");
    setCvv("123");
    setAgreeTerms(true);
  };

  // Submit payment form
  const handleProceedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      alert("Please agree to the authorization checkbox prior to checkout.");
      return;
    }
    if (!cardNumber || !expiryDate || !cvv) {
      alert("Please specify card credentials first.");
      return;
    }

    setIsPaying(true);
    setTimeout(() => {
      localStorage.setItem("autoWorld_lastPayment", new Date().toISOString());
      setHasPaidPass(true);
      setIsPaying(false);
      setShowPaymentModal(false);
      alert("✅ Daily Access Pass Activated!\nYou now hold full listing privileges for 24 hours.");
    }, 1500);
  };

  // Filter dynamic logic
  const filteredVehicles = inventoryList.filter((vehicle) => {
    // Search query matcher
    if (searchQuery && !vehicle.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Make matcher
    if (selectedMake && vehicle.make.toLowerCase() !== selectedMake.toLowerCase()) {
      return false;
    }
    // Category type matcher
    if (selectedType && selectedType !== "Any Type" && vehicle.category?.toLowerCase() !== selectedType.toLowerCase()) {
      return false;
    }
    // Location matcher
    if (locationValue && !vehicle.isUserListing && Math.random() > 0.75) {
      return false;
    }
    // Price range selector
    if (selectedPriceRange && selectedPriceRange !== "Any Price") {
      if (selectedPriceRange === "Under $10,000" && vehicle.price > 10000) return false;
      if (selectedPriceRange === "$10,000 - $20,000" && (vehicle.price < 10000 || vehicle.price > 20000)) return false;
      if (selectedPriceRange === "$20,000 - $30,000" && (vehicle.price < 20000 || vehicle.price > 30000)) return false;
      if ((selectedPriceRange === "Over $30,000" || selectedPriceRange === "Over $30,005") && vehicle.price <= 30000) return false;
    }

    return true;
  });

  // Sorting logic
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "mileage") {
      const mA = parseInt(a.mileage.replace(/[^0-9]/g, "")) || 0;
      const mB = parseInt(b.mileage.replace(/[^0-9]/g, "")) || 0;
      return mA - mB;
    }
    return b.year - a.year; // newest year default
  });

  const handleResetFilters = () => {
    setSelectedMake("");
    setSelectedPriceRange("Any Price");
    setSelectedType("Any Type");
    setLocationValue("");
    setSearchQuery("");
  };

  return (
    <div className="bg-[#F4F1EA] text-[#1A1A1A] min-h-screen py-12 relative font-sans">
      
      {/* Mini warning header box if not paid */}
      {!hasPaidPass && (
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="bg-[#E0DBCF] border border-stone-400 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-900 text-[#F4F1EA] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-sm font-bold uppercase tracking-wider text-stone-900 font-sans">Full Database Access Locked</h4>
                <p className="text-xs text-stone-700 leading-snug">Inspecting technical details or direct contacts requires an active daily pass or syndicate membership.</p>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-5 py-3.5 bg-stone-900 text-[#F4F1EA] text-xs uppercase font-bold tracking-widest hover:bg-stone-850 cursor-pointer"
            >
              Activate Daily Pass
            </button>
          </div>
        </div>
      )}

      {/* Floating active permit counter if pass is paid */}
      {hasPaidPass && countdownText && (
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="bg-stone-90 w-full p-4 border border-stone-900/10 flex items-center gap-3 text-stone-900 bg-[#FAF8F5]">
            <Clock className="w-5 h-5 text-stone-600 animate-pulse animate-duration-1000" />
            <span className="text-xs uppercase tracking-widest font-bold">Verification permit status: {countdownText}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-stone-300 pb-6 mb-10">
          <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-stone-500 font-bold block mb-1">Index Repository</span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-stone-900">Verified Vehicle Inventory</h1>
        </div>
        
        {/* FILTERS TOOLBAR PANEL */}
        <div className="bg-[#FAF8F5] border border-stone-300 p-6 sm:p-8 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Model Search Phrase</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Toyota, Mustang, Hybrid..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-stone-950 text-xs font-semibold focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#2A2A2A] uppercase tracking-widest block">Vehicle Category</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-stone-950 text-xs font-semibold focus:outline-none focus:border-stone-900"
              >
                <option value="">All Types</option>
                <option value="car">Car</option>
                <option value="suv">SUV</option>
                <option value="truck">Truck</option>
                <option value="van">Van</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#2A2A2A] uppercase tracking-widest block">Make / Brand Manufacturer</label>
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-stone-950 text-xs font-semibold focus:outline-none focus:border-stone-900"
              >
                <option value="">All Makes</option>
                <option value="Mahindra">Mahindra (Tar, etc)</option>
                <option value="Tata">Tata Motors (Nexon, etc)</option>
                <option value="Royal Enfield">Royal Enfield (Classic)</option>
                <option value="Maruti Suzuki">Maruti Suzuki</option>
                <option value="Toyota">Toyota</option>
                <option value="Honda">Honda</option>
                <option value="Ford">Ford</option>
                <option value="BMW">BMW</option>
                <option value="Chevrolet">Chevrolet</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#2A2A2A] uppercase tracking-widest block">Cap Pricing Bracket</label>
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 text-stone-950 text-xs font-semibold focus:outline-none focus:border-stone-900"
              >
                <option value="">Any Price</option>
                <option value="Under $10,000">Under $10,000</option>
                <option value="$10,000 - $20,000">$10,000 - $20,000</option>
                <option value="$20,000 - $30,000">$20,000 - $30,000</option>
                <option value="Over $30,000">Over $30,000</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-stone-200">
            <div className="flex flex-wrap bg-stone-200 p-1 rounded-sm gap-1">
              {[
                { id: "newest", label: "Year Matrix" },
                { id: "price-low", label: "Price Asc" },
                { id: "price-high", label: "Price Desc" },
                { id: "mileage", label: "Mileage Asc" }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setSortBy(btn.id)}
                  className={`px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                    sortBy === btn.id ? "bg-stone-900 text-white shadow-sm" : "text-stone-605 hover:text-stone-900"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-[#F4F1EA] text-[10px] font-sans font-bold uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        </div>

        {/* LISTINGS DISPLAY GRID ROOM */}
        <div className="relative">
          
          {/* Access permit block lock overlay if has not paid pass */}
          {!hasPaidPass && (
            <div className="absolute inset-0 bg-stone-200/55 backdrop-blur-md z-45 flex flex-col items-center justify-center p-8 text-center min-h-[450px] border border-stone-300">
              <div className="w-14 h-14 bg-stone-950 text-[#F4F1EA] flex items-center justify-center mb-5 border border-stone-800">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-black text-stone-950 mb-2">Unlocking Verified Spec Sheets Required</h3>
              <p className="max-w-md text-stone-600 text-xs leading-relaxed mb-6">
                Active certified permits are charged at $1.00 USD for full 24-hour database queries. Instantly auto-fill standard credentials to bypass listing fences.
              </p>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-6 py-4 bg-stone-950 hover:bg-stone-850 text-[#F4F1EA] text-xs font-bold uppercase tracking-widest transition cursor-pointer"
              >
                Purchase Access Permit ($1.00)
              </button>
            </div>
          )}

          {/* List Statistics */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-bold text-stone-500 font-mono uppercase tracking-widest">
              {sortedVehicles.length} specimens catalogued matching search parameters
            </span>
          </div>

          {sortedVehicles.length === 0 ? (
            <div className="bg-[#FAF8F5] border border-stone-300 py-16 text-center">
              <Sparkles className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-serif font-black text-stone-800 mb-1">No specimens found</h3>
              <p className="text-stone-500 text-xs max-w-sm mx-auto">Try lowering criteria specifications or click reset parameters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {sortedVehicles.map((car, idx) => {
                const isFav = favorites.includes(car.id);
                return (
                  <motion.div
                    key={car.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 80, damping: 14, delay: (idx % 6) * 0.05 }}
                    whileHover={{ scale: 1.03, y: -6, transition: { duration: 0.15 } }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-[#FAF8F5] border border-stone-900/15 overflow-hidden flex flex-col group transition cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="relative h-56 overflow-hidden bg-stone-150 grayscale-20 group-hover:grayscale-0 transition-all duration-300">
                      <img
                        src={car.image}
                        alt={car.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                        }}
                      />
                      
                      {car.badge && (
                        <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-stone-900 text-[#F4F1EA] text-[9px] font-sans font-bold uppercase tracking-wider border border-[#F4F1EA]/20">
                          {car.badge}
                        </span>
                      )}

                      <button
                        onClick={() => toggleFavorite(car.id)}
                        className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition border ${
                          isFav
                            ? "bg-stone-950 text-white border-stone-950"
                            : "bg-white/80 text-stone-700 hover:text-stone-950 hover:bg-white border-stone-200"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? "fill-white" : ""}`} />
                      </button>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-mono tracking-widest text-stone-400 block uppercase mb-1">REF #AW0{car.id}</span>
                        <h3 className="text-xl font-serif font-black text-stone-950 mb-3 cursor-pointer" onClick={() => {
                          if (hasPaidPass) {
                            onQuickView(car);
                          } else {
                            setShowPaymentModal(true);
                          }
                        }}>
                          {car.title}
                        </h3>
                        
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-stone-200 text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-4">
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
                          <span className="text-2xl font-serif font-black text-stone-950">${car.price.toLocaleString()}</span>
                        </div>
                        <button
                          onClick={() => {
                            if (hasPaidPass) {
                              onQuickView(car);
                            } else {
                              setShowPaymentModal(true);
                            }
                          }}
                          className="px-4 py-2.5 bg-stone-950 hover:bg-stone-850 text-[#F4F1EA] text-xs font-sans uppercase font-bold tracking-widest border border-stone-950 transition"
                        >
                          View Dossier
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DETAILED DAILY PERMIT INLET MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-[#F4F1EA] border-2 border-stone-900 w-full max-w-lg shadow-2xl relative max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200 p-6 sm:p-8">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-stone-900 hover:text-stone-605 font-mono text-lg cursor-pointer"
            >
              [✕]
            </button>
            
            <div className="text-center pb-6 border-b border-stone-300">
              <Lock className="w-10 h-10 mx-auto mb-3 text-stone-900" />
              <h2 className="text-2xl font-serif font-black tracking-tight uppercase text-stone-950">Purchase Daily Permit</h2>
              <p className="text-xs text-stone-600 uppercase tracking-widest mt-1 font-bold">Unlocking verified coordinates & technical specs</p>
            </div>

            <div className="py-6 space-y-6">
              
              {/* Daily Access Pass Card */}
              <div className="bg-[#FAF8F5] border border-stone-300 p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-stone-900 text-[#F4F1EA] flex items-center justify-center text-xs shrink-0 font-bold uppercase tracking-wider">
                  Pass
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-stone-900">Standard Daily Permit</h3>
                  <div className="text-2xl font-serif font-black text-stone-950 mt-0.5">$1.00 <span className="text-xs text-stone-500 font-light">/ 24 hours pass</span></div>
                  <ul className="text-[10px] text-stone-600 space-y-0.5 mt-2 list-disc list-inside uppercase tracking-wider font-bold">
                    <li>Query complete engine checklists</li>
                    <li>Access direct seller tele-contacts</li>
                    <li>Add elements to historic briefcase</li>
                  </ul>
                </div>
              </div>

              {/* Payment input elements */}
              <form onSubmit={handleProceedPayment} className="space-y-4">
                <div className="p-5 bg-[#FAF8F5] border border-stone-300 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2">
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-widest">Debit / Credit credentials</h4>
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest italic">Encrypted</span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Card identification number</label>
                      <input
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        onDoubleClick={handleCheatAutoFill}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-xs font-mono tracking-widest focus:outline-none focus:border-stone-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Expiration</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          maxLength={5}
                          required
                          className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">CVV code</label>
                        <input
                          type="password"
                          placeholder="CVV"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          maxLength={3}
                          required
                          className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-xs focus:outline-none focus:border-stone-900 text-center font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Holder Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="modal-agree"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                    className="mt-1 w-4 h-4 text-stone-900 accent-stone-900 border-stone-300 focus:ring-0"
                  />
                  <label htmlFor="modal-agree" className="text-[10px] text-stone-700 font-bold uppercase tracking-widest leading-relaxed cursor-pointer select-none">
                    Unconditionally agree to authorize singular transfer of $1.00 USD.
                  </label>
                </div>

                {/* Double click helper prompt */}
                <div className="bg-[#E0DBCF] text-stone-8 font-sans p-3 border border-stone-400 text-[10px] font-bold uppercase tracking-wider leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-stone-900" />
                  <span>
                    Auto-Fill Trigger: Double-click Card identification number field to instantly populate standard test coordinates.
                  </span>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-950 text-xs font-bold uppercase tracking-widest cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isPaying}
                    className="flex-2 py-3 bg-stone-900 text-[#F4F1EA] text-xs font-bold uppercase tracking-widest hover:bg-stone-850 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isPaying ? (
                      <>Processing Inflow...</>
                    ) : (
                      <>Accept & Unlock Database</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
