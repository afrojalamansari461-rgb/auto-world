import { useState, useEffect } from "react";
import { Car, Star, Lock, Clock, Heart, Eye, Filter, User, Mail, Phone, Info, Award, CheckCircle2, ChevronRight, Gauge, AlertCircle, Compass, Share2 } from "lucide-react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomeTab from "./components/HomeTab";
import BuyTab from "./components/BuyTab";
import SellTab from "./components/SellTab";
import PremiumTab from "./components/PremiumTab";
import ContactTab from "./components/ContactTab";
import { Vehicle, UserListing, DEFAULT_VEHICLES } from "./types";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [subscriptionActive, setSubscriptionActive] = useState<boolean>(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Search parameters forwarded from Home quick forms to is Buy tab
  const [searchFilters, setSearchFilters] = useState<{ type: string; priceRange: string; location: string }>({
    type: "",
    priceRange: "",
    location: ""
  });

  // Handle URL deep-linking on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vehicleIdStr = params.get("vehicle");
    if (vehicleIdStr) {
      const vehicleId = parseInt(vehicleIdStr, 10);
      if (!isNaN(vehicleId)) {
        // 1. Try finding in DEFAULT_VEHICLES
        const foundDefault = DEFAULT_VEHICLES.find(v => v.id === vehicleId);
        if (foundDefault) {
          setSelectedVehicle(foundDefault);
          return;
        }

        // 2. Try finding in localStorage & Firestore
        const loadDeepLinkVehicle = async () => {
          let userListings: UserListing[] = [];
          
          // Try local storage first
          try {
            const stored = localStorage.getItem("autoWorld_listings");
            if (stored) {
              userListings = JSON.parse(stored);
            }
          } catch (e) {
            console.error("Local storage lookup failed", e);
          }

          // Try Firestore
          try {
            let querySnapshot = await getDocs(collection(db, "listings"));
            querySnapshot.forEach((docSnap) => {
              const data = docSnap.data() as UserListing;
              if (!userListings.some(item => item.id === data.id)) {
                userListings.push(data);
              }
            });
          } catch (e) {
            console.warn("Firestore fetch for deep link failed, using available local data:", e);
          }

          // Find match
          const matchingIndex = userListings.findIndex((_, index) => (1000 + index) === vehicleId);
          if (matchingIndex !== -1) {
            const listing = userListings[matchingIndex];
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

            const mappedVehicle: Vehicle = {
              id: 1000 + matchingIndex, 
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
              listingId: listing.id,
              sellerName: listing.sellerName,
              sellerEmail: listing.sellerEmail,
              sellerPhone: listing.sellerPhone,
              location: listing.location,
              negotiable: listing.negotiable
            };

            setSelectedVehicle(mappedVehicle);
          }
        };

        loadDeepLinkVehicle();
      }
    }
  }, []);

  // Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check custom subscription details from database on checkout startup
  useEffect(() => {
    const syncSubscription = async () => {
      if (currentUser) {
        try {
          let subDoc;
          try {
            subDoc = await getDoc(doc(db, "subscriptions", currentUser.uid));
          } catch (dbErr: any) {
            handleFirestoreError(dbErr, OperationType.GET, `subscriptions/${currentUser.uid}`);
            throw dbErr;
          }
          if (subDoc.exists()) {
            const data = subDoc.data();
            setSubscriptionActive(data.status === "active");
          } else {
            setSubscriptionActive(false);
          }
        } catch (err) {
          console.error("Error reading Firestore subscription:", err);
          setSubscriptionActive(false);
        }
      } else {
        const rawSub = localStorage.getItem("autoWorld_subscription");
        if (rawSub) {
          try {
            const parsed = JSON.parse(rawSub);
            if (parsed && parsed.status === "active") {
              setSubscriptionActive(true);
              return;
            }
          } catch (e) {
            console.error("Failed to parse local subscription:", e);
          }
        }
        setSubscriptionActive(false);
      }
    };
    syncSubscription();
  }, [currentUser]);

  // Set initial favorite structures
  const toggleFavorite = (id: number) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter((favId) => favId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const handleQuickView = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  // Find user listing specifics for details modal
  const [modalSellerInfo, setModalSellerInfo] = useState<{
    name: string;
    email: string;
    phone: string;
    location: string;
    negotiable: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedVehicle) {
      setModalSellerInfo(null);
      return;
    }

    // Direct check if the vehicle object already has the seller details attached!
    if (selectedVehicle.sellerName) {
      setModalSellerInfo({
        name: selectedVehicle.sellerName,
        email: selectedVehicle.sellerEmail || "agent@autoworld.com",
        phone: selectedVehicle.sellerPhone || "+1800 123 4567",
        location: selectedVehicle.location || "Pune, Maharashtra",
        negotiable: selectedVehicle.negotiable || "yes"
      });
      return;
    }

    if (selectedVehicle.isUserListing && selectedVehicle.listingId) {
      try {
        const stored = localStorage.getItem("autoWorld_listings");
        if (stored) {
          const userListings: UserListing[] = JSON.parse(stored);
          const match = userListings.find(l => l.id === selectedVehicle.listingId);
          if (match) {
            setModalSellerInfo({
              name: match.sellerName,
              email: match.sellerEmail,
              phone: match.sellerPhone,
              location: match.location,
              negotiable: match.negotiable
            });
            return;
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Default corporate support rep context
    setModalSellerInfo(null);
  }, [selectedVehicle]);

  // Accessibility: Listen for Escape key to close the modal dialog
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedVehicle(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedVehicle]);

  return (
    <div className="bg-[#F4F1EA] min-h-screen text-[#1A1A1A] flex flex-col justify-between font-sans selection:bg-stone-900 selection:text-[#F4F1EA]">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        subscriptionActive={subscriptionActive}
        currentUser={currentUser}
      />

      {/* Primary tab views switcher */}
      <main className="flex-grow">
        {activeTab === "home" && (
          <HomeTab
            setActiveTab={setActiveTab}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            setSearchFilters={setSearchFilters}
            onQuickView={handleQuickView}
          />
        )}
        
        {activeTab === "buy" && (
          <BuyTab
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            searchFilters={searchFilters}
            onQuickView={handleQuickView}
            subscriptionActive={subscriptionActive}
            showToast={showToast}
            currentUser={currentUser}
          />
        )}

        {activeTab === "sell" && (
          <SellTab
            setActiveTab={setActiveTab}
            subscriptionActive={subscriptionActive}
            showToast={showToast}
            currentUser={currentUser}
          />
        )}

        {activeTab === "premium" && (
          <PremiumTab
            subscriptionActive={subscriptionActive}
            setSubscriptionActive={setSubscriptionActive}
            showToast={showToast}
            currentUser={currentUser}
          />
        )}

        {activeTab === "contact" && (
          <ContactTab showToast={showToast} currentUser={currentUser} />
        )}
      </main>

      {/* Global Interactive detailed vehicle model overlay sheets */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
          <div className="bg-[#FAF8F5] w-full max-w-4xl shadow-2xl relative max-h-[92vh] overflow-y-auto border border-stone-300 animate-in fade-in-0 slide-in-from-bottom-12 zoom-in-95 duration-300 ease-out">
            {/* Close trigger */}
            <button
              onClick={() => setSelectedVehicle(null)}
              aria-label="Close vehicle details overlay dialog"
              title="Close details (Esc)"
              className="absolute top-4 right-4 z-50 text-[#F4F1EA] bg-stone-900 w-10 h-10 flex items-center justify-center text-xs font-mono font-bold cursor-pointer hover:bg-stone-850 focus:outline-none focus:ring-2 focus:ring-stone-950"
            >
              ✕
            </button>

            {/* Modal Inside Multi-grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
              {/* Media images panel */}
              <div className="space-y-4 font-sans">
                <div className="relative aspect-video border border-stone-300 overflow-hidden bg-stone-150">
                  <img
                    src={selectedVehicle.image}
                    alt={selectedVehicle.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                    }}
                  />
                  {selectedVehicle.badge && (
                    <span className="absolute top-4 left-4 px-3 py-1 bg-stone-900 text-[#F4F1EA] text-[9px] font-bold uppercase tracking-widest border border-stone-700">
                      {selectedVehicle.badge}
                    </span>
                  )}
                </div>
                
                <div className="p-4 bg-[#F4F1EA] border border-stone-300 flex items-start gap-2.5">
                  <Info className="w-5 h-5 text-stone-900 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-stone-605 uppercase font-sans font-bold tracking-wider leading-relaxed">
                    All listed specifications have been digitally audited by Auto World mechanics. Double check conditions upon scheduling inspect callbacks.
                  </p>
                </div>
              </div>              {/* Informational Specs and contacts panel */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-3 py-1 bg-stone-900 text-[#F4F1EA] text-[9px] font-bold uppercase tracking-widest font-mono">
                      Ref: AW-{selectedVehicle.id}
                    </span>
                    <span className="text-[9px] text-stone-800 font-bold uppercase tracking-widest bg-stone-200 border border-stone-350 px-2 py-0.5">Active List</span>
                  </div>
                  <h2 className="text-2xl font-serif font-black text-stone-950 tracking-tight leading-tight">
                    {selectedVehicle.title}
                  </h2>
                  <div className="text-3xl font-serif font-black text-stone-900 mt-2">
                    ₹{selectedVehicle.price.toLocaleString("en-IN")}
                  </div>
                </div>

                {selectedVehicle.description && (
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-bold tracking-widest uppercase text-stone-400">Description</h3>
                    <p className="text-xs text-stone-705 leading-relaxed font-semibold">
                      {selectedVehicle.description}
                    </p>
                  </div>
                )}

                {/* Technical specifications dashboard */}
                <div className="space-y-2">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Technical specs</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs text-stone-700">
                    <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                      <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Mileage run</span>
                      <span className="text-stone-900 font-bold mt-0.5 block">{selectedVehicle.mileage}</span>
                    </div>
                    <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                      <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Displacement</span>
                      <span className="text-stone-900 font-bold mt-0.5 block">{selectedVehicle.fuel}</span>
                    </div>
                    <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                      <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Transmission</span>
                      <span className="text-stone-900 font-bold mt-0.5 block">{selectedVehicle.transmission}</span>
                    </div>
                    <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                      <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Production Year</span>
                      <span className="text-stone-900 font-bold mt-0.5 block">{selectedVehicle.year}</span>
                    </div>
                  </div>
                </div>

                {/* Feature tags */}
                {selectedVehicle.features && selectedVehicle.features.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold tracking-widest uppercase text-stone-400 font-sans">Extra options checklist</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedVehicle.features.map((f, i) => (
                        <span key={i} className="px-2.5 py-1 bg-stone-900 text-white text-[9px] uppercase tracking-widest font-bold">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seller direct contact info module */}
                <div className="p-4 bg-[#FAF8F5] border border-stone-300 font-sans space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                    <User className="w-5 h-5 text-stone-900" />
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 uppercase tracking-widest leading-none">Vetted Seller Profile</h4>
                      <span className="text-[9px] text-[#777777] block font-bold uppercase tracking-widest mt-0.5 font-sans">Verified Contact details</span>
                    </div>
                  </div>

                  {modalSellerInfo ? (
                    <div className="space-y-3.5 text-xs text-stone-705 leading-relaxed font-sans">
                      <div className="flex justify-between">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">Seller Username:</span>
                        <span className="text-stone-900 font-bold">{modalSellerInfo.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">Register Email:</span>
                        <span className="text-stone-950 font-mono tracking-tight font-bold">{modalSellerInfo.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">WhatsApp Callback:</span>
                        <span className="text-stone-900 font-bold block">{modalSellerInfo.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">Trade Location:</span>
                        <span className="text-stone-900 font-bold">{modalSellerInfo.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">Price Negotiability:</span>
                        <span className="font-bold text-stone-900 uppercase text-[9px]">
                          {modalSellerInfo.negotiable === "yes" ? "Authorized Negotiable" : "Firm pricing only"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs text-[#555555] leading-relaxed font-sans">
                      <div className="flex justify-between">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">Seller Profile:</span>
                        <span className="text-stone-900 font-bold">Auto World Certified agent</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">Corporate Email:</span>
                        <span className="text-stone-955 font-mono tracking-tight font-bold">brokerage@autoworld.com</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">Support phone:</span>
                        <span className="text-stone-900 font-mono font-bold">+91 1800 123 4567</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 uppercase tracking-widest text-[9px]">Trade Location:</span>
                        <span className="text-stone-900 font-bold">Corporate square, Mumbai</span>
                      </div>
                    </div>
                  )}

                  {/* Operational callback shortcuts */}
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <a
                      href={`mailto:${modalSellerInfo ? modalSellerInfo.email : 'brokerage@autoworld.com'}?subject=Inquiry%20regarding%20${encodeURIComponent(selectedVehicle.title)}`}
                      className="px-4 py-3 bg-stone-905 text-[#F4F1EA] text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer hover:bg-stone-850"
                    >
                      <Mail className="w-4 h-4 shrink-0 text-white" />
                      Direct Email
                    </a>
                    <a
                      href={`https://wa.me/${(modalSellerInfo ? modalSellerInfo.phone : '+91 1800 123 4567').replace(/[^0-9+]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-950 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Phone className="w-4 h-4 shrink-0 text-stone-900" />
                      WhatsApp Chat
                    </a>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 font-sans">
                  <button
                    onClick={() => {
                      toggleFavorite(selectedVehicle.id);
                      showToast(favorites.includes(selectedVehicle.id) ? "Removed from bookmark brief!" : "Saved brand new bookmark briefcase!", "success");
                    }}
                    className={`flex-1 py-3.5 border text-[10px] uppercase font-bold tracking-widest cursor-pointer flex items-center justify-center gap-2 transition ${
                      favorites.includes(selectedVehicle.id)
                        ? "bg-stone-900 border-stone-900 text-[#F4F1EA]"
                        : "bg-[#FAF8F5] border-stone-300 text-stone-900 hover:bg-stone-200"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(selectedVehicle.id) ? "fill-current" : ""}`} />
                    {favorites.includes(selectedVehicle.id) ? "Saved bookmark" : "Add to Favorites"}
                  </button>
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}${window.location.pathname}?vehicle=${selectedVehicle.id}`;
                      navigator.clipboard.writeText(shareUrl).then(() => {
                        showToast("Link Copied — Deep-linked listing URL ready to share!", "success");
                      }).catch((e) => {
                        console.error("Clipboard copy failed", e);
                        showToast("Failed to copy link.", "error");
                      });
                    }}
                    className="flex-1 py-3.5 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-950 text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Share2 className="w-4 h-4 text-stone-900 shrink-0" />
                    Share Listing
                  </button>
                  <button
                    onClick={() => {
                      showToast(`Inflow dispatch formulated for: ${selectedVehicle.title}. Auto World dialer rep will contact you shortly.`, "success");
                    }}
                    className="flex-1 py-3.5 bg-stone-900 border border-stone-900 hover:bg-stone-850 text-white text-[10px] uppercase font-bold tracking-widest transition cursor-pointer"
                  >
                    Request Callback
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification element */}
      {toast && (
        <div 
          id="toast-notification"
          className="fixed bottom-8 right-8 z-[250] flex items-center justify-between gap-4 px-6 py-4 border shadow-xl bg-stone-950 text-[#F4F1EA] border-stone-800 rounded-sm animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-sm"
        >
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 text-emerald-400 font-bold font-mono text-sm shrink-0">✓</span>
            <p className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-[#F4F1EA]/90 leading-normal">
              {toast.message}
            </p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-[10px] font-mono hover:text-white cursor-pointer opacity-70 hover:opacity-100 transition whitespace-nowrap pl-2"
          >
            [close]
          </button>
        </div>
      )}

      {/* Global Footer */}
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
