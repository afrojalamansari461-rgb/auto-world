import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Car, Star, Lock, Clock, Heart, Eye, Filter, User, Mail, Phone, Info, Award, CheckCircle2, ChevronLeft, ChevronRight, Gauge, AlertCircle, Compass, Share2, MessageCircle, Shield, Check, CheckCircle, Trash2, EyeOff, ShieldAlert, Wrench, Sparkles } from "lucide-react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomeTab from "./components/HomeTab";
import BuyTab from "./components/BuyTab";
import SellTab from "./components/SellTab";
import PremiumTab from "./components/PremiumTab";
import ContactTab from "./components/ContactTab";
import AdminPanel from "./components/AdminPanel";
import SignInModal from "./components/SignInModal";
import FeedbackWidget from "./components/FeedbackWidget";
import { Vehicle, UserListing, DEFAULT_VEHICLES } from "./types";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { doc, getDoc, collection, getDocs, setDoc, getDocFromServer, updateDoc, deleteDoc } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const getCarouselImages = (vehicle: Vehicle): { src: string; alt: string }[] => {
  if (vehicle.photos && vehicle.photos.length > 0) {
    return vehicle.photos;
  }
  
  const baseImg = vehicle.image;
  const title = vehicle.title;
  const category = (vehicle.category || "").toLowerCase();
  const lowerMake = (vehicle.make || "").toLowerCase();
  
  if (category === "motorcycle" || lowerMake.includes("royal enfield")) {
    return [
      { src: baseImg, alt: `${title} - Front Profile` },
      { src: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80", alt: `${title} - Cockpit Detail` },
      { src: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&auto=format&fit=crop&q=80", alt: `${title} - Engine & Exhaust` },
    ];
  } else if (category === "bicycle" || lowerMake.includes("hero cycles") || lowerMake.includes("firefox")) {
    return [
      { src: baseImg, alt: `${title} - Side Profile` },
      { src: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800&auto=format&fit=crop&q=80", alt: `${title} - Gears & Chain` },
      { src: "https://images.unsplash.com/photo-1502744688674-c619d388682d?w=800&auto=format&fit=crop&q=80", alt: `${title} - Front Handlebars` },
    ];
  } else if (category === "suv" || lowerMake.includes("mahindra") || lowerMake.includes("tata") || lowerMake.includes("toyota")) {
    return [
      { src: baseImg, alt: `${title} - Exterior Front 3/4 View` },
      { src: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=80", alt: `${title} - Cockpit & Dashboard` },
      { src: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=80", alt: `${title} - Rear View / Cargo` },
    ];
  } else {
    return [
      { src: baseImg, alt: `${title} - Exterior Profile` },
      { src: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80", alt: `${title} - Premium Steering Wheel` },
      { src: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop&q=80", alt: `${title} - Alloy Wheel Detail` },
    ];
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState<boolean>(false);
  const [subscriptionActive, setSubscriptionActive] = useState<boolean>(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);
  const [openLegalDoc, setOpenLegalDoc] = useState<"privacy" | "terms" | "fraud" | "support" | null>(null);
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [firebaseConfigError, setFirebaseConfigError] = useState<boolean>(false);

  // Check Firebase Database reachability on startup
  useEffect(() => {
    const testReachability = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (err: any) {
        console.warn("Startup connection probe:", err);
        if (err && (err.message?.includes("offline") || err.code === "unavailable" || err.message?.includes("failed to get document"))) {
          setFirebaseConfigError(true);
        }
      }
    };
    testReachability();
  }, []);

  // Global high-contrast theme state
  const [theme, setTheme] = useState<string>(() => {
    try {
      const storedTheme = localStorage.getItem("autoWorld_theme");
      if (storedTheme === "dark" || storedTheme === "light") {
        return storedTheme;
      }
    } catch (e) {
      console.error(e);
    }
    return "light";
  });

  // Keep dark class on root html synchronized with the state
  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      localStorage.setItem("autoWorld_theme", theme);
    } catch (err) {
      console.error("Theme set error", err);
    }
  }, [theme]);

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
              negotiable: listing.negotiable,
              photos: listing.photos
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
    let ignore = false;
    const syncSubscription = async () => {
      if (currentUser && !currentUser.isAnonymous) {
        try {
          let subDoc;
          try {
            subDoc = await getDoc(doc(db, "subscriptions", currentUser.uid));
          } catch (dbErr: any) {
            if (ignore) return;
            handleFirestoreError(dbErr, OperationType.GET, `subscriptions/${currentUser.uid}`);
            throw dbErr;
          }
          if (ignore) return;
          if (subDoc.exists()) {
            const data = subDoc.data();
            setSubscriptionActive(data.status === "active");
          } else {
            setSubscriptionActive(false);
          }
        } catch (err: any) {
          if (ignore) return;
          const errMsg = err instanceof Error ? err.message : String(err);
          const isOffline = errMsg.toLowerCase().includes("offline") || errMsg.toLowerCase().includes("unavailable") || errMsg.toLowerCase().includes("could not reach");
          if (isOffline) {
            console.warn("Firestore subscription connection currently offline:", errMsg);
          } else {
            console.error("Error reading Firestore subscription:", err);
          }
          setSubscriptionActive(false);
        }
      } else {
        const rawSub = localStorage.getItem("autoWorld_subscription");
        if (rawSub) {
          try {
            const parsed = JSON.parse(rawSub);
            if (parsed && parsed.status === "active") {
              if (ignore) return;
              setSubscriptionActive(true);
              return;
            }
          } catch (e) {
            console.error("Failed to parse local subscription:", e);
          }
        }
        if (ignore) return;
        setSubscriptionActive(false);
      }
    };
    syncSubscription();
    return () => {
      ignore = true;
    };
  }, [currentUser]);

  // load saved favorites on auth state change
  useEffect(() => {
    let ignore = false;
    const loadFavorites = async () => {
      if (ignore) return;
      setFavoritesLoaded(false);
      if (currentUser && !currentUser.isAnonymous) {
        try {
          const favRef = doc(db, "user_favorites", currentUser.uid);
          let favSnap;
          try {
            favSnap = await getDoc(favRef);
          } catch (dbErr: any) {
            if (ignore) return;
            handleFirestoreError(dbErr, OperationType.GET, `user_favorites/${currentUser.uid}`);
            throw dbErr;
          }
          if (ignore) return;
          if (favSnap.exists()) {
            const data = favSnap.data();
            if (data && Array.isArray(data.favoriteIds)) {
              setFavorites(data.favoriteIds);
            } else {
              setFavorites([]);
            }
          } else {
            // Check if there are some local favorites first before setting to empty
            const localStored = localStorage.getItem("autoWorld_favorites");
            if (localStored) {
              try {
                const parsed = JSON.parse(localStored);
                if (Array.isArray(parsed)) {
                  setFavorites(parsed);
                  if (ignore) return;
                  // Sync local data up to user_favorites in Firestore
                  await setDoc(favRef, {
                    userId: currentUser.uid,
                    favoriteIds: parsed,
                    lastUpdated: new Date().toISOString()
                  });
                } else {
                  setFavorites([]);
                }
              } catch (e) {
                setFavorites([]);
              }
            } else {
              setFavorites([]);
            }
          }
          if (ignore) return;
          setFavoritesLoaded(true);
        } catch (err: any) {
          if (ignore) return;
          const errMsg = err instanceof Error ? err.message : String(err);
          const isOffline = errMsg.toLowerCase().includes("offline") || errMsg.toLowerCase().includes("unavailable") || errMsg.toLowerCase().includes("could not reach");
          if (isOffline) {
            console.warn("Firestore user_favorites connection currently offline:", errMsg);
          } else {
            console.error("Error reading Firestore user_favorites:", err);
          }
          // Keep favoritesLoaded to false to prevent a transient read error from overwriting remote data
        }
      } else {
        // Logged out / offline fallback
        const localStored = localStorage.getItem("autoWorld_favorites");
        if (localStored) {
          try {
            const parsed = JSON.parse(localStored);
            if (Array.isArray(parsed)) {
              if (ignore) return;
              setFavorites(parsed);
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          if (ignore) return;
          setFavorites([]);
        }
        if (ignore) return;
        setFavoritesLoaded(true);
      }
    };
    loadFavorites();
    return () => {
      ignore = true;
    };
  }, [currentUser]);

  // Save favorites locally and sync with Firestore when modified by the user
  useEffect(() => {
    if (!favoritesLoaded) return;

    const saveFavorites = async () => {
      // 1. Always save locally
      try {
        localStorage.setItem("autoWorld_favorites", JSON.stringify(favorites));
      } catch (e) {
        console.error("Local storage favorites save failed", e);
      }

      // 2. Save to Firestore if logged in
      if (currentUser && !currentUser.isAnonymous) {
        try {
          const favRef = doc(db, "user_favorites", currentUser.uid);
          await setDoc(favRef, {
            userId: currentUser.uid,
            favoriteIds: favorites,
            lastUpdated: new Date().toISOString()
          });
        } catch (err: any) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const isOffline = errMsg.toLowerCase().includes("offline") || errMsg.toLowerCase().includes("unavailable") || errMsg.toLowerCase().includes("could not reach");
          if (isOffline) {
            console.warn("Firestore user_favorites sync currently offline:", errMsg);
          } else {
            console.error("Failed to sync favorites with Firestore:", err);
          }
        }
      }
    };
    saveFavorites();
  }, [favorites, currentUser, favoritesLoaded]);

  // Set initial favorite structures
  const toggleFavorite = (id: number) => {
    if (!favoritesLoaded) return;
    if (favorites.includes(id)) {
      setFavorites(favorites.filter((favId) => favId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const triggerSmsLeadAlert = async (sellerPhone: string, vehicleTitle: string, listingId: string | number, actionType: "whatsapp" | "inspection") => {
    try {
      await fetch("/api/send-sms-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerPhone,
          vehicleTitle,
          listingId,
          buyerName: currentUser?.displayName || "A vetted buyer",
          actionType
        })
      });
      console.log(`Lead SMS alert triggered successfully.`);
    } catch (err) {
      console.error("Failed to trigger Lead SMS alert asynchronously:", err);
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

    setCurrentImageIndex(0);

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

  // ADMIN PANEL CONTROLS INSIDE THE OVERLAY MODAL
  const handleToggleApprovalInModal = async () => {
    if (!selectedVehicle || !selectedVehicle.isUserListing || !selectedVehicle.listingId) return;
    const isCurrentlyApproved = selectedVehicle.status !== "pending";
    const newStatus = isCurrentlyApproved ? "pending" : "active";
    try {
      await updateDoc(doc(db, "listings", selectedVehicle.listingId), { status: newStatus });
      setSelectedVehicle(prev => prev ? { ...prev, status: newStatus } : null);
      showToast(`Listing ${newStatus === "active" ? "Approved & Active" : "Unapproved & Hidden"}!`, "success");
      window.dispatchEvent(new Event("autoWorld_db_update"));
    } catch (err: any) {
      console.error(err);
      showToast("Failed to update approval on Firestore", "error");
    }
  };

  const handleToggleVerifyInModal = async () => {
    if (!selectedVehicle) return;
    if (selectedVehicle.isUserListing && selectedVehicle.listingId) {
      const isCurrentlyVerified = selectedVehicle.badge === "verified";
      const nextVerified = !isCurrentlyVerified;
      const nextBadge = nextVerified ? "verified" : null;
      try {
        await updateDoc(doc(db, "listings", selectedVehicle.listingId), { verified: nextVerified });
        setSelectedVehicle(prev => prev ? { ...prev, badge: nextBadge } : null);
        showToast(`Listing is now ${nextVerified ? "Verified" : "Standard"}!`, "success");
        window.dispatchEvent(new Event("autoWorld_db_update"));
      } catch (err: any) {
        console.error(err);
        showToast("Failed to update Firestore verification", "error");
      }
    } else {
      try {
        const currentBadgesStr = localStorage.getItem("autoWorld_default_badges") || "{}";
        const badgesMap = JSON.parse(currentBadgesStr);
        const isCurrentlyVerified = badgesMap[selectedVehicle.id] === "verified";
        const nextBadge = isCurrentlyVerified ? null : "verified";
        badgesMap[selectedVehicle.id] = nextBadge;
        localStorage.setItem("autoWorld_default_badges", JSON.stringify(badgesMap));
        setSelectedVehicle(prev => prev ? { ...prev, badge: nextBadge } : null);
        showToast(`Static vehicle is now ${nextBadge ? "Verified" : "Standard"}!`, "success");
        window.dispatchEvent(new Event("autoWorld_db_update"));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleToggleFeaturedInModal = async () => {
    if (!selectedVehicle) return;
    if (selectedVehicle.isUserListing && selectedVehicle.listingId) {
      const isCurrentlyFeatured = selectedVehicle.badge === "premium";
      const nextFeatured = !isCurrentlyFeatured;
      const nextBadge = nextFeatured ? "premium" : null;
      try {
        await updateDoc(doc(db, "listings", selectedVehicle.listingId), { featured: nextFeatured });
        setSelectedVehicle(prev => prev ? { ...prev, badge: nextBadge } : null);
        showToast(`Listing is now ${nextFeatured ? "Featured" : "Standard"}!`, "success");
        window.dispatchEvent(new Event("autoWorld_db_update"));
      } catch (err: any) {
        console.error(err);
        showToast("Failed to update Firestore featured flag", "error");
      }
    } else {
      try {
        const currentBadgesStr = localStorage.getItem("autoWorld_default_badges") || "{}";
        const badgesMap = JSON.parse(currentBadgesStr);
        const isCurrentlyPremium = badgesMap[selectedVehicle.id] === "premium";
        const nextBadge = isCurrentlyPremium ? null : "premium";
        badgesMap[selectedVehicle.id] = nextBadge;
        localStorage.setItem("autoWorld_default_badges", JSON.stringify(badgesMap));
        setSelectedVehicle(prev => prev ? { ...prev, badge: nextBadge } : null);
        showToast(`Static vehicle is now ${nextBadge ? "Featured" : "Standard"}!`, "success");
        window.dispatchEvent(new Event("autoWorld_db_update"));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleToggleHotInModal = async () => {
    if (!selectedVehicle) return;
    if (selectedVehicle.isUserListing && selectedVehicle.listingId) {
      const isCurrentlyHot = selectedVehicle.badge === "hot";
      const nextHot = !isCurrentlyHot;
      const nextBadge = nextHot ? "hot" : null;
      try {
        await updateDoc(doc(db, "listings", selectedVehicle.listingId), { urgent: nextHot });
        setSelectedVehicle(prev => prev ? { ...prev, badge: nextBadge } : null);
        showToast(`Listing is now ${nextHot ? "Hot Deal" : "Standard"}!`, "success");
        window.dispatchEvent(new Event("autoWorld_db_update"));
      } catch (err: any) {
        console.error(err);
        showToast("Failed to update Firestore hot flag", "error");
      }
    } else {
      try {
        const currentBadgesStr = localStorage.getItem("autoWorld_default_badges") || "{}";
        const badgesMap = JSON.parse(currentBadgesStr);
        const isCurrentlyHot = badgesMap[selectedVehicle.id] === "hot";
        const nextBadge = isCurrentlyHot ? null : "hot";
        badgesMap[selectedVehicle.id] = nextBadge;
        localStorage.setItem("autoWorld_default_badges", JSON.stringify(badgesMap));
        setSelectedVehicle(prev => prev ? { ...prev, badge: nextBadge } : null);
        showToast(`Static vehicle is now ${nextBadge ? "Hot Deal" : "Standard"}!`, "success");
        window.dispatchEvent(new Event("autoWorld_db_update"));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteInModal = async () => {
    if (!selectedVehicle || !selectedVehicle.isUserListing || !selectedVehicle.listingId) return;
    if (!window.confirm("Are you sure you want to permanently delete this user listing from Firestore? This is irreversible.")) return;
    try {
      await deleteDoc(doc(db, "listings", selectedVehicle.listingId));
      showToast("Listing deleted successfully from Firestore database!", "success");
      setSelectedVehicle(null);
      window.dispatchEvent(new Event("autoWorld_db_update"));
    } catch (err: any) {
      console.error(err);
      showToast("Failed to delete from Firestore", "error");
    }
  };

  const handleHideRestoreInModal = () => {
    if (!selectedVehicle || selectedVehicle.isUserListing) return;
    try {
      const currentHiddenStr = localStorage.getItem("autoWorld_hidden_defaults") || "[]";
      let hiddenIds: number[] = JSON.parse(currentHiddenStr);
      const isCurrentlyHidden = hiddenIds.includes(selectedVehicle.id);
      
      if (isCurrentlyHidden) {
        hiddenIds = hiddenIds.filter(id => id !== selectedVehicle.id);
        showToast("Static vehicle restored to public view catalog!", "success");
      } else {
        hiddenIds.push(selectedVehicle.id);
        showToast("Static vehicle hidden from public view catalog!", "success");
      }
      localStorage.setItem("autoWorld_hidden_defaults", JSON.stringify(hiddenIds));
      window.dispatchEvent(new Event("autoWorld_db_update"));
      setSelectedVehicle(null);
    } catch (e) {
      console.error(e);
    }
  };

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
        onSignInClick={() => setIsSignInModalOpen(true)}
      />

      {/* Dynamic Firebase Connectivity Check Alert noticed at the top */}
      {firebaseConfigError && (
        <div id="firebase-conn-alert" className="border-y-2 border-amber-605 bg-[#FAF8F5] text-stone-900 px-4 py-3 text-xs font-sans">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-semibold">
            <div className="flex items-start md:items-center gap-2.5">
              <span className="p-1 bg-amber-605 text-[#FAF8F5] inline-flex items-center justify-center shrink-0 rounded font-bold text-[9px]">⚠️</span>
              <p className="leading-relaxed text-left text-[11px] sm:text-xs">
                <strong className="text-amber-800 uppercase tracking-wide text-[10px]">Connection Warning:</strong> Could not establish a pipeline to Firestore. This web-ledger points to your custom Firebase Project (<code className="bg-amber-100 px-1 font-mono font-bold text-amber-905 rounded">{firebaseConfig.projectId}</code>). Please ensure your database is active and authentication providers are configured.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button 
                onClick={() => {
                  setIsSignInModalOpen(true);
                }}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-[#F4F1EA] font-mono text-[9px] font-bold uppercase tracking-wider shadow-sm cursor-pointer whitespace-nowrap"
              >
                View Setup Controls
              </button>
              <button 
                onClick={() => setFirebaseConfigError(false)}
                className="px-2.5 py-1.5 border border-stone-300 hover:bg-stone-100 text-stone-700 font-mono text-[9px] font-bold uppercase cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

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
            onSignInClick={() => setIsSignInModalOpen(true)}
          />
        )}

        {activeTab === "sell" && (
          <SellTab
            setActiveTab={setActiveTab}
            subscriptionActive={subscriptionActive}
            showToast={showToast}
            currentUser={currentUser}
            onSignInClick={() => setIsSignInModalOpen(true)}
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

        {activeTab === "admin" && (
          <AdminPanel 
            showToast={showToast} 
            currentUser={currentUser} 
            onQuickView={handleQuickView}
            setActiveTab={setActiveTab}
          />
        )}
      </main>

      {/* Global Interactive detailed vehicle model overlay sheets */}
      <AnimatePresence>
        {selectedVehicle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-stone-950/85 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 24,
                mass: 0.9
              }}
              className="bg-[#FAF8F5] w-full max-w-4xl shadow-2xl relative max-h-[92vh] flex flex-col border border-stone-300"
            >
            {/* Close trigger */}
            <button
              onClick={() => setSelectedVehicle(null)}
              aria-label="Close vehicle details overlay dialog"
              title="Close details (Esc)"
              className="absolute top-4 right-4 z-50 text-[#F4F1EA] bg-stone-900 w-10 h-10 flex items-center justify-center text-xs font-mono font-bold cursor-pointer hover:bg-stone-850 focus:outline-none focus:ring-2 focus:ring-stone-950"
            >
              ✕
            </button>

            {/* Scrollable content wrapper */}
            <div className="flex-1 overflow-y-auto">
              {/* Modal Inside Multi-grid layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
                {/* Media images panel */}
                <div className="space-y-4 font-sans md:sticky md:top-0 self-start">
                {(() => {
                  const images = getCarouselImages(selectedVehicle);
                  const hasMultiple = images.length > 1;
                  
                  const handlePrev = () => {
                    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                  };
                  
                  const handleNext = () => {
                    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                  };

                  return (
                    <div className="space-y-3">
                      {/* Main slide frame */}
                      <div className="relative aspect-video border border-stone-300 overflow-hidden bg-stone-900 group">
                        <img
                          src={images[currentImageIndex]?.src || selectedVehicle.image}
                          alt={images[currentImageIndex]?.alt || selectedVehicle.title}
                          className="w-full h-full object-cover select-none transition-all duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                          }}
                        />
                        
                        {/* Overlay badge info */}
                        {selectedVehicle.badge && (
                          <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-stone-900 text-[#F4F1EA] text-[9px] font-bold uppercase tracking-widest border border-stone-700">
                            {selectedVehicle.badge}
                          </span>
                        )}

                        {/* Slide counter */}
                        {hasMultiple && (
                          <span className="absolute bottom-4 right-4 z-10 px-2 py-1 bg-stone-900/80 backdrop-blur-sm text-stone-100 font-mono text-[10px] font-bold border border-stone-700 select-none">
                            {currentImageIndex + 1} / {images.length}
                          </span>
                        )}

                        {/* Left arrow navigation */}
                        {hasMultiple && (
                          <button
                            onClick={handlePrev}
                            aria-label="Previous photo"
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-stone-950/80 hover:bg-stone-900 text-white border border-stone-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 cursor-pointer"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                        )}

                        {/* Right arrow navigation */}
                        {hasMultiple && (
                          <button
                            onClick={handleNext}
                            aria-label="Next photo"
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-stone-950/80 hover:bg-stone-900 text-white border border-stone-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 cursor-pointer"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {/* Thumbnails strip */}
                      {hasMultiple && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-stone-400 scrollbar-track-stone-200">
                          {images.map((img, idx) => {
                            const isActive = idx === currentImageIndex;
                            return (
                              <button
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`relative w-20 aspect-video shrink-0 border transition-all cursor-pointer ${
                                  isActive 
                                    ? "border-stone-950 ring-2 ring-stone-950/20" 
                                    : "border-stone-300 opacity-60 hover:opacity-100"
                                }`}
                                aria-label={`View photo ${idx + 1}`}
                              >
                                <img
                                  src={img.src}
                                  alt={`Thumbnail ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                                  }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
                
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

                {/* Auto World Verified Shield Section */}
                <div className="p-4 bg-amber-50/45 border-2 border-dashed border-amber-500/40 font-sans space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4.5 h-4.5 text-amber-650 fill-amber-100 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 uppercase tracking-widest leading-none">Auto World Secure Shield</h4>
                      <span className="text-[9px] text-amber-800 block font-bold uppercase tracking-widest mt-1">150-Point Certificate Inspection & RC Transfer Guarantee</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-600 leading-relaxed font-semibold">
                    Protect your purchase! For a professional inspection booking fee of <strong className="text-stone-900 font-extrabold">₹1,999</strong>, our certified technician will physically verify this vehicle and secure all ownership paperwork transfers.
                  </p>
                  <button
                    onClick={() => {
                      const phone = modalSellerInfo ? modalSellerInfo.phone : '+91 98230 44556';
                      triggerSmsLeadAlert(phone, selectedVehicle.title, selectedVehicle.id, "inspection");
                      showToast("Secured Shield booking request logged! An inspector will be assigned to AW-" + selectedVehicle.id + " upon seller feedback.", "success");
                    }}
                    className="w-full py-2 bg-stone-950 hover:bg-stone-850 text-[#FAF8F5] text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition cursor-pointer border border-stone-950"
                  >
                    <Award className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0 animate-pulse" />
                    Secure Inspection Shield (₹1,999)
                  </button>
                </div>

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
                      href={`https://wa.me/${(modalSellerInfo ? modalSellerInfo.phone : '+91 98230 44556').replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(
                        `Hi! I'm interested in the vehicle you listed on Auto World:\n\n` +
                        `🚗 *${selectedVehicle.title}*\n` +
                        `• Ref Code: AW-${selectedVehicle.id}\n` +
                        `• Valuation: ₹${selectedVehicle.price.toLocaleString("en-IN")}\n` +
                        `• Mileage: ${selectedVehicle.mileage}\n` +
                        `• Fuel: ${selectedVehicle.fuel}\n\n` +
                        `Is this vehicle still available for a physical inspection or negotiation?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        const phone = modalSellerInfo ? modalSellerInfo.phone : '+91 98230 44556';
                        triggerSmsLeadAlert(phone, selectedVehicle.title, selectedVehicle.id, "whatsapp");
                      }}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 hover:border-emerald-700 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0 text-white" />
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

                {/* ADMIN DIRECT CONTROL PANEL IN THE OVERLAY */}
                {currentUser?.email === "afrojalamansari461@gmail.com" && (
                  <div className="mt-6 p-4 bg-stone-900 border-2 border-amber-500 text-[#F4F1EA] font-sans space-y-4 shadow-lg">
                    <div className="flex items-center gap-2 pb-2 border-b border-stone-800">
                      <Wrench className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 font-mono">BACKOFFICE DOSSIER CONTROL</h4>
                        <span className="text-[9px] text-stone-400 block uppercase font-mono tracking-wider">Level 5 Security Access Activated</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {/* Approval Toggle (only for Firestore list items) */}
                      {selectedVehicle.isUserListing ? (
                        <button
                          onClick={handleToggleApprovalInModal}
                          className={`px-2.5 py-2 border text-[9px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1 font-mono transition ${
                            selectedVehicle.status !== "pending"
                              ? "bg-amber-500 text-stone-950 border-amber-600 hover:bg-amber-400"
                              : "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-500"
                          }`}
                          title="Toggle public listing visibility"
                        >
                          {selectedVehicle.status !== "pending" ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 shrink-0 text-stone-950" />
                              Unapprove
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 shrink-0 text-white" />
                              Approve
                            </>
                          )}
                        </button>
                      ) : (
                        /* Hide / Restore Toggle for default cars */
                        <button
                          onClick={handleHideRestoreInModal}
                          className="px-2.5 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 text-[9px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1 font-mono transition"
                          title="Hide default car from buy tab"
                        >
                          <EyeOff className="w-3.5 h-3.5 shrink-0" />
                          Hide Spec
                        </button>
                      )}

                      {/* Verified badge control */}
                      <button
                        onClick={handleToggleVerifyInModal}
                        className={`px-2.5 py-2 border text-[9px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1 font-mono transition ${
                          selectedVehicle.badge === "verified"
                            ? "bg-purple-600 border-purple-700 text-white hover:bg-purple-500"
                            : "bg-stone-850 hover:bg-stone-800 border-stone-700 text-stone-300"
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 shrink-0 text-white" />
                        {selectedVehicle.badge === "verified" ? "Verified" : "Verify"}
                      </button>

                      {/* Featured (premium) badge control */}
                      <button
                        onClick={handleToggleFeaturedInModal}
                        className={`px-2.5 py-2 border text-[9px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1 font-mono transition ${
                          selectedVehicle.badge === "premium"
                            ? "bg-sky-600 border-sky-700 text-white hover:bg-sky-500"
                            : "bg-stone-850 hover:bg-stone-800 border-stone-700 text-stone-300"
                        }`}
                      >
                        <Award className="w-3.5 h-3.5 shrink-0 text-white" />
                        {selectedVehicle.badge === "premium" ? "Premium" : "Premiumize"}
                      </button>

                      {/* Hot Deal badge control */}
                      <button
                        onClick={handleToggleHotInModal}
                        className={`px-2.5 py-2 border text-[9px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1 font-mono transition ${
                          selectedVehicle.badge === "hot"
                            ? "bg-red-600 border-red-700 text-white hover:bg-red-500"
                            : "bg-stone-850 hover:bg-stone-800 border-stone-700 text-stone-300"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-white" />
                        {selectedVehicle.badge === "hot" ? "Hot Deal" : "Set Hot"}
                      </button>

                      {/* Delete control (only for user listings) */}
                      {selectedVehicle.isUserListing && (
                        <button
                          onClick={handleDeleteInModal}
                          className="px-2.5 py-2 bg-red-800 hover:bg-red-700 border border-red-900 text-white text-[9px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1 font-mono transition col-span-2 sm:col-span-1"
                          title="Delete permanently from Firestore"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

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

      {/* Central Login Modal overlaid with Netlify optimization options */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        showToast={showToast}
      />

      {/* Global Footer */}
      <Footer setActiveTab={setActiveTab} onOpenLegal={setOpenLegalDoc} />

      {/* Global Legal & Advisor Support Modal */}
      {openLegalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FAF8F5] text-stone-900 border border-stone-800 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl relative font-sans">
            {/* Header / Newspaper Column Header banner */}
            <div className="border-b-4 border-stone-950 p-6 flex items-start justify-between bg-[#F4F1EA]">
              <div>
                <span className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-[#B45309] block mb-1">
                  OFFICIAL AUTO WORLD GAZETTE
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-stone-950 uppercase">
                  {openLegalDoc === "privacy" && "Privacy & Personal Data Protocol"}
                  {openLegalDoc === "terms" && "Consolidated Terms of Service"}
                  {openLegalDoc === "fraud" && "Shield & Anti-Fraud Guidelines"}
                  {openLegalDoc === "support" && "Advisor Desk & VIP Support"}
                </h2>
                <p className="text-[10px] text-stone-500 font-serif italic mt-1 uppercase tracking-wider">
                  Effective Date: June 12, 2026 • Certified Broker Network
                </p>
              </div>
              <button 
                onClick={() => setOpenLegalDoc(null)}
                className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500 hover:text-stone-950 px-3 py-1.5 border border-stone-300 hover:border-stone-900 bg-white transition cursor-pointer"
              >
                [ CLOSE ]
              </button>
            </div>

            {/* Scrollable Document Body */}
            <div className="p-6 sm:p-8 overflow-y-auto text-sm leading-relaxed text-stone-850 space-y-6 max-h-[60vh] font-sans">
              
              {openLegalDoc === "privacy" && (
                <>
                  <div className="p-4 bg-stone-100 border-l-4 border-stone-950 text-xs font-serif italic mb-6">
                    "At Auto World, we maintain pristine records. This registry is designed to verify real car listings without compromising client contacts, keeping personal identifiers shielded from automated crawlers."
                  </div>
                  
                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">1. Scope of Private Registers</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      We collect user email addresses, account verification states, and listing details submitted voluntarily via the Sell portal. All transactions, private notes, and coordinates are handled over secure encrypted connections.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">2. Firestore Data Persistence</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      User listing assets, favorite bookmarks, and transaction logs are synchronized selectively to cloud storage (Firestore). We protect these records strictly under authenticated permission rules, preventing non-owner modifications. Anonymous visitors can query public archives but never view backoffice communication.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">3. Regional Regulation & VIN Scans</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      Auto World cross-references vehicle chassis indices and vehicle registration plates against national transport archives to prevent duplication and trace listing authenticity.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">4. Cookie Configuration & Tracking</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      We use minor persistence tokens (localStorage) to memorize theme toggles and session states. No third-party behavioral profiling or telemetry cookies are ever distributed on this site.
                    </p>
                  </section>
                </>
              )}

              {openLegalDoc === "terms" && (
                <>
                  <div className="p-4 bg-stone-100 border-l-4 border-stone-950 text-xs font-serif italic mb-6">
                    "Please read these conditions carefully before publishing details. By utilizing the platform, you acknowledge that Auto World acts exclusively as an independent aggregator and digital matching hub."
                  </div>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">1. Marketplace Intermediation</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      Auto World provides listing space and advisor tools for registered vehicles. We are NOT party to the physical transfers, title handovers, registration signoffs, or cash transfers, which remain the sole liability of the buyer and seller.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">2. Seller Responsibilities</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      As a seller, you warrant that all specifications (mileage, engine status, fuel categories, and photo reports) represent the honest condition of the vehicle. Intentionally posting mismatched mock data, false mileage declarations, or third-party vehicle VINs will result in listing deletion and credential ban.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">3. Premium Passes & Subscriptions</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      Subscription fees ($1 Pass index tier or recurring Pro listings) are billed securely. These digital privileges unlock contact metrics, live advisor reports, and high-visibility search listings instantly. Premium payments are non-refundable.
                    </p>
                  </section>
                </>
              )}

              {openLegalDoc === "fraud" && (
                <>
                  <div className="p-4 bg-stone-105 border-l-4 border-stone-950 text-xs font-serif italic mb-6">
                    "Protecting our global subscriber network from broker deception is our primary concern. Read these safety rules before initiating bank transfers."
                  </div>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-[#DC2626] tracking-tight pb-1">1. The Verified Handover Principle</h3>
                    <p className="text-xs text-red-700 font-bold leading-normal">
                      NEVER send upfront reservation tokens, token deposits, or shipping margins without physically inspecting the vehicle, reviewing the logbook, and checking the matching chassis number yourself.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">2. Common Red Flags to Avoid</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      Be highly suspicious of listings priced significantly below market averages, sellers who refuse personal inspections, or brokers who request swift digital cash wire transfers instantly.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">3. Reporting Deceptive Listings</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      If you notice any suspicious photos, invalid telephone coordinates, or fraudulent listings while searching our Buy catalog, click the "Report Deceptive Listing" button immediately or submit a Contact Ticket. Verified reports are reviewed inside 4 hours.
                    </p>
                  </section>
                </>
              )}

              {openLegalDoc === "support" && (
                <>
                  <div className="p-4 bg-stone-100 border-l-4 border-stone-950 text-xs font-serif italic mb-6">
                    "Our verified trading advisors are available 24 hours a day to facilitate negotiations and review mechanic report details."
                  </div>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">1. Standard Response Times</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      Our support desk processes ticket queues chronologically. All standard user inquiries are answered inside 12 to 24 hours.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">2. Premium VIP Hotline</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      Pro Subscribers and $1 Daily Pass holders receive prioritised ticket handling. VIP routing routes your questions to our senior listing mechanics instantly for live advice on paint depth, engine safety, or registration transfers.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-serif font-black text-base uppercase text-stone-950 tracking-tight">3. Escalation Desk</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                      For serious broker disputes, listing claims, or technical firestore account sync bottlenecks, please submit an inquiry form or contact our customer success email layout directly.
                    </p>
                  </section>
                </>
              )}

            </div>

            {/* Footer / Decorative stamp */}
            <div className="p-4 border-t border-stone-250 bg-stone-100 flex items-center justify-between text-[10px] font-mono text-stone-500">
              <span>SECURITY CERTIFIED BY AUTO WORLD</span>
              <span className="font-black">© 2026 AFROJ ALAM ANSARI</span>
            </div>
          </div>
        </div>
      )}
      {/* Global Slide-Over User Feedback Widget */}
      <FeedbackWidget 
        showToast={showToast} 
        currentUser={currentUser} 
      />
    </div>
  );
}
