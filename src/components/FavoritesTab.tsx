import React, { useState, useEffect } from "react";
import { Heart, Eye, Car, ArrowRight, Gauge, Calendar, Fuel } from "lucide-react";
import { Vehicle, DEFAULT_VEHICLES, UserListing } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { getDocs, collection } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

interface FavoritesTabProps {
  favorites: number[];
  toggleFavorite: (id: number) => void;
  onQuickView: (vehicle: Vehicle) => void;
  setActiveTab: (tab: string) => void;
}

export default function FavoritesTab({
  favorites,
  toggleFavorite,
  onQuickView,
  setActiveTab
}: FavoritesTabProps) {
  const [favoriteVehicles, setFavoriteVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadFavorites = async () => {
      setIsLoading(true);
      
      // 1. Start with default vehicles (applying overrides if any)
      let defaultData = [...DEFAULT_VEHICLES];
      try {
        const overridesStr = localStorage.getItem("autoWorld_default_overrides");
        if (overridesStr) {
          const overridesMap = JSON.parse(overridesStr);
          if (overridesMap && typeof overridesMap === "object") {
            defaultData = defaultData.map(v => {
              const override = overridesMap[v.id];
              return override ? { ...v, ...override } : v;
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse overrides in FavoritesTab:", e);
      }

      // Filter default vehicles immediately if their ID is in favorites
      let matchedDefault = defaultData.filter(car => favorites.includes(car.id));

      let userListings: UserListing[] = [];
      
      // 2. Fetch user listings from Firestore
      try {
        let querySnapshot;
        try {
          querySnapshot = await getDocs(collection(db, "listings"));
        } catch (dbErr: any) {
          handleFirestoreError(dbErr, OperationType.LIST, "listings");
          throw dbErr;
        }
        querySnapshot.forEach((docSnap) => {
          const lData = docSnap.data() as UserListing;
          if (lData.status === "active" || lData.status === undefined) {
            userListings.push(lData);
          }
        });
      } catch (err) {
        console.warn("Firestore fetch listings in FavoritesTab failed, falling back to local list:", err);
      }

      // 3. Fallback to local storage for user listings
      try {
        const stored = localStorage.getItem("autoWorld_listings");
        if (stored) {
          const localListings: UserListing[] = JSON.parse(stored);
          localListings.forEach((localItem) => {
            if (!userListings.some(item => item.id === localItem.id)) {
              if (localItem.status === "active" || localItem.status === undefined) {
                userListings.push(localItem);
              }
            }
          });
        }
      } catch (e) {
        console.error("Local storage lookup in FavoritesTab failed:", e);
      }

      // Map user listings to Vehicle types
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
          mileage: listing.mileage ? `${parseInt(listing.mileage).toLocaleString()} km` : "N/A",
          fuel: listing.fuelType ? (listing.fuelType.charAt(0).toUpperCase() + listing.fuelType.slice(1)) : "Petrol",
          transmission: listing.transmission ? (listing.transmission.charAt(0).toUpperCase() + listing.transmission.slice(1)) : "Automatic",
          badge: listing.verified ? "verified" : listing.featured ? "premium" : listing.urgent ? "hot" : null,
          description: listing.description,
          features: listing.features,
          category: listing.type,
          isUserListing: true,
          listingId: listing.id,
          sellerName: listing.sellerName,
          sellerEmail: listing.sellerEmail,
          sellerPhone: listing.sellerPhone,
          location: listing.location,
          negotiable: listing.negotiable,
          photos: listing.photos,
          engine: listing.engine,
          color: listing.color,
          owners: listing.owners,
          regNumber: listing.regNumber
        };
      });

      // Filter compiled user vehicles if their ID is in favorites
      const matchedUser = compiledUserVehicles.filter(car => favorites.includes(car.id));

      setFavoriteVehicles([...matchedDefault, ...matchedUser]);
      setIsLoading(false);
    };

    loadFavorites();
  }, [favorites]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-12 md:py-16"
    >
      {/* Tab Header Section */}
      <div className="border-b border-stone-300 pb-8 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-[10px] font-sans uppercase tracking-[0.25em] text-stone-500 block mb-1 font-black">
            Vetted Showcase Registry
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-black text-stone-900 tracking-tight flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            Your Curated Garage ({favoriteVehicles.length})
          </h1>
        </div>
        <p className="text-stone-500 text-xs italic font-serif max-w-md md:text-right">
          A personalized fleet of vehicles saved across your secure device ledger session.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent animate-spin rounded-full" />
          <span className="text-xs font-mono uppercase tracking-widest text-stone-400">Loading collection catalog...</span>
        </div>
      ) : favoriteVehicles.length === 0 ? (
        /* Clean Empty State */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-stone-300/80 bg-[#FAF8F5] p-12 md:p-16 text-center max-w-2xl mx-auto my-12"
        >
          <div className="w-16 h-16 bg-stone-100 border border-stone-250 flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8 text-stone-400 stroke-[1.5]" />
          </div>
          <h2 className="text-xl font-serif font-black text-stone-900 mb-3 uppercase tracking-tight">Your Saved Fleet Is Empty</h2>
          <p className="text-stone-500 text-xs leading-relaxed uppercase tracking-widest font-sans mb-8 max-w-md mx-auto">
            Identify your target models across our complete catalog, mark them with a heart, and keep track of them in this dedicated vault.
          </p>
          <button
            onClick={() => setActiveTab("buy")}
            className="px-6 py-3 bg-stone-900 hover:bg-stone-850 text-white text-xs font-sans font-bold uppercase tracking-widest transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            Explore Master Inventory
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      ) : (
        /* Favorites Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {favoriteVehicles.map((car) => (
              <motion.div
                key={car.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-[#FAF8F5] border border-stone-300 overflow-hidden flex flex-col group relative shadow-sm hover:shadow-lg hover:border-stone-400 transition-all duration-300"
              >
                {/* Image panel */}
                <div className="relative h-56 overflow-hidden bg-stone-200">
                  <img
                    src={car.image}
                    alt={car.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                    }}
                  />
                  
                  {car.badge && (
                    <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-stone-950 text-white text-[9px] font-bold uppercase tracking-widest border border-white/10 shadow-sm">
                      {car.badge}
                    </span>
                  )}
                </div>

                {/* Content Block */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono tracking-widest text-stone-400 block uppercase">
                        REF #AW0{car.id}
                      </span>
                      {car.badge === "verified" && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 uppercase tracking-wider border border-emerald-200">
                          Verified
                        </span>
                      )}
                    </div>
                    <h3
                      className="text-lg font-serif font-black text-stone-950 mb-3 hover:underline cursor-pointer leading-tight"
                      onClick={() => onQuickView(car)}
                    >
                      {car.title}
                    </h3>
                    
                    <div className="w-full grid grid-cols-3 gap-2 py-2.5 border-y border-stone-200 text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-4">
                      <div>
                        <span className="text-stone-400 block text-[9px] uppercase font-light">Mileage</span>
                        <span className="text-stone-900 font-bold">{car.mileage}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[9px] uppercase font-light">Fuel</span>
                        <span className="text-stone-900 font-bold">{car.fuel}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[9px] uppercase font-light">Gearbox</span>
                        <span className="text-stone-900 font-bold block truncate">{car.transmission}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-2.5">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-light font-sans">Valuation</span>
                      <span className="text-xl font-serif font-black text-stone-950">
                        ₹{car.price.toLocaleString("en-IN")}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(car.id)}
                        className="w-10 h-10 border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-650 flex items-center justify-center transition-all cursor-pointer"
                        title="Remove from Saved"
                      >
                        <Heart className="w-4.5 h-4.5 fill-current" />
                      </button>
                      <button
                        onClick={() => onQuickView(car)}
                        className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white text-xs font-sans uppercase font-bold tracking-widest transition-all cursor-pointer"
                      >
                        Dossier
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
