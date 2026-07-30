import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Car, Star, Lock, Clock, Heart, Eye, Filter, User, Mail, Phone, Info, Award, CheckCircle2, ChevronLeft, ChevronRight, Gauge, AlertCircle, AlertTriangle, Compass, Share2, MessageCircle, Shield, Check, CheckCircle, Trash2, EyeOff, ShieldAlert, Wrench, Sparkles, ArrowUp, Image as ImageIcon, FileText, Layers, Calculator } from "lucide-react";
import { getListingExpirationDetails, run30DayExpirationTask } from "./lib/expirationManager";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomeTab from "./components/HomeTab";
import BuyTab from "./components/BuyTab";
import SellTab from "./components/SellTab";
import PremiumTab from "./components/PremiumTab";
import ContactTab from "./components/ContactTab";
import { AnimatedFavoriteHeart } from "./components/AnimatedFavoriteHeart";
import { EMICalculator } from "./components/EMICalculator";
import AdminPanel from "./components/AdminPanel";
import FavoritesTab from "./components/FavoritesTab";
import SignInModal from "./components/SignInModal";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import FeedbackWidget from "./components/FeedbackWidget";
import Modal from "./components/Modal";
import { SecureShieldCard } from "./components/SecureShieldCard";
import { Vehicle, UserListing, DEFAULT_VEHICLES } from "./types";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db, firebaseConfig, handleFirestoreError, OperationType } from "./firebase";
import { doc, getDoc, collection, getDocs, setDoc, getDocFromServer, updateDoc, deleteDoc } from "firebase/firestore";
import { saveCatalogOverride, saveAdminSettingsToFirestore, subscribeToRealtimeCatalog } from "./lib/catalogSync";
import { CountUp } from "./components/CountUp";
import { AdminGrandEntry } from "./components/AdminGrandEntry";

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

const tabViewVariants = {
  initial: { opacity: 0, x: 16, filter: "blur(4px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -16, filter: "blur(4px)" },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState<boolean>(false);
  const [subscriptionActive, setSubscriptionActive] = useState<boolean>(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [activeModalSubTab, setActiveModalSubTab] = useState<"overview" | "gallery" | "specs" | "contact">("overview");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);
  const [openLegalDoc, setOpenLegalDoc] = useState<"privacy" | "terms" | "fraud" | "support" | null>(null);
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [firebaseConfigError, setFirebaseConfigError] = useState<boolean>(false);

  // Admin Edit and Buyer Pass status states
  const [isAdminEditMode, setIsAdminEditMode] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editMileage, setEditMileage] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPhotos, setEditPhotos] = useState<{ src: string; alt: string }[]>([]);
  const [hasPaidPass, setHasPaidPass] = useState<boolean>(false);
  const [showAdminGrandEntry, setShowAdminGrandEntry] = useState<boolean>(false);
  const [isSecureShieldEnabled, setIsSecureShieldEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_secure_shield");
      return stored !== null ? JSON.parse(stored) : true;
    } catch (e) {
      return true;
    }
  });
  const [isSimranFreeModeEnabled, setIsSimranFreeModeEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_simran_free_mode");
      return stored !== null ? JSON.parse(stored) : false;
    } catch (e) {
      return false;
    }
  });

  // Custom Confirmation Modal state for vehicle actions & modal operations
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    danger?: boolean;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Global Scroll to top state & effect
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

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

  // Keyboard shortcuts for the vehicle detail modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedVehicle) return;

      // Avoid shortcuts when typing inside an input, textarea, or editable element
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).contentEditable === "true")
      ) {
        return;
      }

      // 1. Arrow keys for carousel navigation
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const images = getCarouselImages(selectedVehicle);
        if (images.length > 1) {
          setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const images = getCarouselImages(selectedVehicle);
        if (images.length > 1) {
          setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
        }
      }

      // 2. Ctrl+S or Cmd+S to save/bookmark the current vehicle
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        toggleFavorite(selectedVehicle.id);
        const isCurrentlyFav = favorites.includes(selectedVehicle.id);
        showToast(
          isCurrentlyFav
            ? "Removed from your Curated Garage!"
            : "Successfully saved to your Curated Garage!",
          "success"
        );
      }

      // 3. Escape key to close the modal
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedVehicle(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedVehicle, favorites, favoritesLoaded]);

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
              photos: listing.photos,
              engine: listing.engine,
              color: listing.color,
              owners: listing.owners,
              regNumber: listing.regNumber,
              datePosted: listing.datePosted || (listing as any).createdAt,
              status: listing.status
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

  // Sync hasPaidPass reactively for selectedVehicle modal and custom contacts gating
  useEffect(() => {
    let cancelled = false;

    const recheckPass = async () => {
      // 1. Check if Admin enabled Free Buy Pass mode
      const isFreePass = localStorage.getItem("autoWorld_is_free_pass") === "true";
      if (isFreePass) {
        if (!cancelled) setHasPaidPass(true);
        return;
      }

      // 2. Certified owner or active subscriber bypass
      if (currentUser?.email === "afrojalamansari461@gmail.com" || subscriptionActive) {
        if (!cancelled) setHasPaidPass(true);
        return;
      }

      if (!currentUser || currentUser.isAnonymous) {
        if (!cancelled) setHasPaidPass(false);
        return;
      }

      // 3. Local storage pass fallback
      const localPass = localStorage.getItem(`autoWorld_buyerPass_${currentUser.uid}`);
      const localPassDate = localStorage.getItem(`autoWorld_buyerPassDate_${currentUser.uid}`);
      if (localPass === "true" && localPassDate) {
        const passDate = new Date(localPassDate);
        const now = new Date();
        const diffHours = (now.getTime() - passDate.getTime()) / (1000 * 60 * 60);
        if (diffHours < 24) {
          if (!cancelled) setHasPaidPass(true);
          return;
        }
      }

      // 4. Firestore buyer pass check
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const docRef = doc(db, "buyer_passes", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().paid) {
          const passDateStr = docSnap.data().date;
          if (passDateStr) {
            const passDate = new Date(passDateStr);
            const now = new Date();
            const diffHours = (now.getTime() - passDate.getTime()) / (1000 * 60 * 60);
            if (diffHours < 24) {
              if (!cancelled) setHasPaidPass(true);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Firestore buyer pass fetch warning inside App.tsx:", err);
      }

      if (!cancelled) setHasPaidPass(false);
    };

    recheckPass();

    // Subscribe to catalog/admin settings changes for real-time toggle response
    const unsub = subscribeToRealtimeCatalog(({ adminSettings }) => {
      if (adminSettings.isFreePassEnabled !== undefined) {
        localStorage.setItem("autoWorld_is_free_pass", JSON.stringify(adminSettings.isFreePassEnabled));
      }
      if (adminSettings.isSecureShieldEnabled !== undefined) {
        setIsSecureShieldEnabled(adminSettings.isSecureShieldEnabled);
        localStorage.setItem("autoWorld_is_secure_shield", JSON.stringify(adminSettings.isSecureShieldEnabled));
      }
      if (adminSettings.isSimranFreeModeEnabled !== undefined) {
        setIsSimranFreeModeEnabled(adminSettings.isSimranFreeModeEnabled);
        localStorage.setItem("autoWorld_is_simran_free_mode", JSON.stringify(adminSettings.isSimranFreeModeEnabled));
      }
      recheckPass();
    });

    const handleGlobalUpdate = () => {
      try {
        const storedShield = localStorage.getItem("autoWorld_is_secure_shield");
        if (storedShield !== null) {
          setIsSecureShieldEnabled(JSON.parse(storedShield));
        }
        const storedSimran = localStorage.getItem("autoWorld_is_simran_free_mode");
        if (storedSimran !== null) {
          setIsSimranFreeModeEnabled(JSON.parse(storedSimran));
        }
      } catch (e) {
        console.warn("Global update error for admin settings", e);
      }
      recheckPass();
    };
    window.addEventListener("autoWorld_db_update", handleGlobalUpdate);

    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener("autoWorld_db_update", handleGlobalUpdate);
    };
  }, [currentUser, subscriptionActive, selectedVehicle]);

  // Periodic 30-Day Auto-Expiration Background Task & Seller Alerts
  useEffect(() => {
    let unmounted = false;

    const triggerExpirationCheck = async () => {
      try {
        const result = await run30DayExpirationTask();
        if (!unmounted && result.expiredCount > 0) {
          console.log(`[30-Day Expiration Routine] Auto-updated ${result.expiredCount} listing(s) to hidden status.`);
        }

        // Notify current user if they have listings expiring in <= 3 days or newly auto-hidden
        if (!unmounted && currentUser && currentUser.email) {
          let userListings: UserListing[] = [];
          try {
            const stored = localStorage.getItem("autoworld_user_listings");
            if (stored) {
              userListings = JSON.parse(stored);
            }
          } catch (e) {
            console.warn("Local listings read error:", e);
          }

          const myEmail = currentUser.email.toLowerCase();
          const myUserListings = userListings.filter(
            l => l.sellerEmail && l.sellerEmail.toLowerCase() === myEmail
          );

          let nearExpiryCount = 0;
          let hiddenCount = 0;

          myUserListings.forEach((item) => {
            const isFeatured = Boolean(item.featured || item.urgent || item.verified);
            if (!isFeatured) {
              const exp = getListingExpirationDetails(item.datePosted || (item as any).createdAt, false);
              if (exp.isNearExpiry) {
                nearExpiryCount++;
              } else if (exp.isExpired || item.status === "hidden") {
                hiddenCount++;
              }
            }
          });

          const toastKey = `autoWorld_expiry_toast_${currentUser.uid}_${new Date().toDateString()}`;
          if (!sessionStorage.getItem(toastKey)) {
            if (nearExpiryCount > 0) {
              showToast(
                `⚠️ ALERT: ${nearExpiryCount} of your listings are expiring in 3 days or less! Upgrade to Premium to keep them active.`,
                "error"
              );
              sessionStorage.setItem(toastKey, "true");
            } else if (hiddenCount > 0) {
              showToast(
                `ℹ️ NOTICE: You have listing(s) automatically hidden after reaching the 30-day free tier limit.`,
                "error"
              );
              sessionStorage.setItem(toastKey, "true");
            }
          }
        }
      } catch (err) {
        console.warn("Background expiration task error:", err);
      }
    };

    triggerExpirationCheck();
    const interval = setInterval(triggerExpirationCheck, 5 * 60 * 1000); // Re-run every 5 mins

    const handleUpdateEvent = () => {
      triggerExpirationCheck();
    };
    window.addEventListener("autoWorld_db_update", handleUpdateEvent);

    return () => {
      unmounted = true;
      clearInterval(interval);
      window.removeEventListener("autoWorld_db_update", handleUpdateEvent);
    };
  }, [currentUser]);

  // Listen for admin login to trigger grand entrance animation once per session
  useEffect(() => {
    // Disabled Admin Grand Entrance animation and sound per user request
    setShowAdminGrandEntry(false);
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

  const handleQuickView = (vehicle: Vehicle, editMode?: boolean) => {
    setSelectedVehicle(vehicle);
    if (editMode) {
      setEditTitle(vehicle.title);
      setEditImage(vehicle.image);
      setEditPrice(vehicle.price);
      setEditMileage(vehicle.mileage);
      setEditDesc(vehicle.description || "");
      setEditPhotos(vehicle.photos ? [...vehicle.photos] : [{ src: vehicle.image, alt: vehicle.title }]);
      setIsAdminEditMode(true);
    }
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

    const performApprovalChange = async () => {
      try {
        await updateDoc(doc(db, "listings", selectedVehicle.listingId!), { status: newStatus });
        setSelectedVehicle(prev => prev ? { ...prev, status: newStatus } : null);
        showToast(`Listing ${newStatus === "active" ? "Approved & Active" : "Unapproved & Hidden"}!`, "success");
        window.dispatchEvent(new Event("autoWorld_db_update"));
      } catch (err: any) {
        console.error(err);
        showToast("Failed to update approval on Firestore", "error");
      }
    };

    if (isCurrentlyApproved) {
      setConfirmModal({
        isOpen: true,
        title: "UNAPPROVE VEHICLE LISTING",
        message: `Are you sure you want to unapprove vehicle "${selectedVehicle.title}"? This will suspend the listing and hide it from the public catalog.`,
        danger: true,
        confirmText: "UNAPPROVE LISTING",
        onConfirm: performApprovalChange
      });
    } else {
      await performApprovalChange();
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
        const isCurrentlyVerified = selectedVehicle.badge === "verified";
        const nextBadge = isCurrentlyVerified ? null : "verified";
        badgesMap[selectedVehicle.id] = nextBadge;
        localStorage.setItem("autoWorld_default_badges", JSON.stringify(badgesMap));
        await saveAdminSettingsToFirestore({ defaultBadges: badgesMap });
        setSelectedVehicle(prev => prev ? { ...prev, badge: nextBadge } : null);
        showToast(`Static vehicle is now ${nextBadge ? "Verified" : "Standard"}!`, "success");
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
        const isCurrentlyPremium = selectedVehicle.badge === "premium";
        const nextBadge = isCurrentlyPremium ? null : "premium";
        badgesMap[selectedVehicle.id] = nextBadge;
        localStorage.setItem("autoWorld_default_badges", JSON.stringify(badgesMap));
        await saveAdminSettingsToFirestore({ defaultBadges: badgesMap });
        setSelectedVehicle(prev => prev ? { ...prev, badge: nextBadge } : null);
        showToast(`Static vehicle is now ${nextBadge ? "Featured" : "Standard"}!`, "success");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleRequestCallback = () => {
    const seller = {
      phoneNumber: modalSellerInfo?.phone || selectedVehicle?.sellerPhone || '+919920155667',
      name: modalSellerInfo?.name || selectedVehicle?.sellerName || 'Amitabh',
    };
    const phoneNumber = seller?.phoneNumber || '+919920155667';
    const sellerName = seller?.name || 'Amitabh';
    const message = `Hi ${sellerName}, I am interested in a luxury import from Auto World and would like to request a callback.`;
    const encodedMessage = encodeURIComponent(message);
    
    window.location.href = `sms:${phoneNumber}?body=${encodedMessage}`;
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
        const isCurrentlyHot = selectedVehicle.badge === "hot";
        const nextBadge = isCurrentlyHot ? null : "hot";
        badgesMap[selectedVehicle.id] = nextBadge;
        localStorage.setItem("autoWorld_default_badges", JSON.stringify(badgesMap));
        await saveAdminSettingsToFirestore({ defaultBadges: badgesMap });
        setSelectedVehicle(prev => prev ? { ...prev, badge: nextBadge } : null);
        showToast(`Static vehicle is now ${nextBadge ? "Hot Deal" : "Standard"}!`, "success");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteInModal = async () => {
    if (!selectedVehicle || !selectedVehicle.isUserListing || !selectedVehicle.listingId) return;
    
    setConfirmModal({
      isOpen: true,
      title: "PERMANENT VEHICLE DELETION",
      message: `Are you sure you want to permanently delete "${selectedVehicle.title}" from the Firestore database? This action is absolute and cannot be undone.`,
      danger: true,
      confirmText: "PERMANENTLY DELETE",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "listings", selectedVehicle.listingId!));
          
          // Also update local storage if they mirrored it there
          try {
            const stored = localStorage.getItem("autoWorld_listings");
            if (stored) {
              const list: UserListing[] = JSON.parse(stored);
              const updated = list.filter(item => item.id !== selectedVehicle.listingId);
              localStorage.setItem("autoWorld_listings", JSON.stringify(updated));
            }
          } catch (e) {
            console.error(e);
          }

          showToast("Listing deleted successfully from Firestore database!", "success");
          setSelectedVehicle(null);
          window.dispatchEvent(new Event("autoWorld_db_update"));
        } catch (err: any) {
          console.error(err);
          showToast("Failed to delete from Firestore", "error");
        }
      }
    });
  };

  const handleHideRestoreInModal = async () => {
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
      await saveAdminSettingsToFirestore({ hiddenDefaultIds: hiddenIds });
      setSelectedVehicle(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartAdminEdit = () => {
    if (!selectedVehicle) return;
    setEditTitle(selectedVehicle.title);
    setEditImage(selectedVehicle.image);
    setEditPrice(selectedVehicle.price);
    setEditMileage(selectedVehicle.mileage);
    setEditDesc(selectedVehicle.description || "");
    setEditPhotos(selectedVehicle.photos ? [...selectedVehicle.photos] : [{ src: selectedVehicle.image, alt: selectedVehicle.title }]);
    setIsAdminEditMode(true);
  };

  const handleSaveAdminEdits = async () => {
    if (!selectedVehicle) return;
    
    const finalPhotos = editPhotos.filter(p => p.src.trim() !== "");
    const primaryImage = finalPhotos.length > 0 ? finalPhotos[0].src.trim() : editImage.trim();

    const updatedVehicle = {
      ...selectedVehicle,
      title: editTitle.trim(),
      image: primaryImage,
      price: editPrice,
      mileage: editMileage.trim(),
      description: editDesc.trim(),
      photos: finalPhotos
    };
    
    try {
      if (selectedVehicle.isUserListing && selectedVehicle.listingId) {
        // Update user listing in Firestore
        const docRef = doc(db, "listings", selectedVehicle.listingId);
        await updateDoc(docRef, {
          title: editTitle.trim(),
          image: primaryImage,
          photos: finalPhotos,
          price: editPrice,
          mileage: editMileage.trim(),
          description: editDesc.trim()
        });
        
        // Also update local storage cached user listings if any
        const rawLocal = localStorage.getItem("autoWorld_listings");
        if (rawLocal) {
          try {
            const list = JSON.parse(rawLocal);
            if (Array.isArray(list)) {
              const updatedList = list.map((item: any) => {
                if (item.id === selectedVehicle.listingId) {
                  return {
                    ...item,
                    title: editTitle.trim(),
                    image: primaryImage,
                    photos: finalPhotos,
                    price: editPrice,
                    mileage: editMileage.trim(),
                    description: editDesc.trim()
                  };
                }
                return item;
              });
              localStorage.setItem("autoWorld_listings", JSON.stringify(updatedList));
            }
          } catch (e) {
            console.error("Local storage listing sync failed:", e);
          }
        }
      } else {
        // Save catalog override directly to Firestore
        await saveCatalogOverride(selectedVehicle.id, {
          title: editTitle.trim(),
          image: primaryImage,
          price: editPrice,
          mileage: editMileage.trim(),
          description: editDesc.trim(),
          photos: finalPhotos
        });
      }
      
      setSelectedVehicle(updatedVehicle);
      setIsAdminEditMode(false);
      showToast("Dossier specifications updated successfully!", "success");
      window.dispatchEvent(new Event("autoWorld_db_update"));
    } catch (err: any) {
      console.error("Failed to save admin edits:", err);
      showToast("Error updating dossier details: " + err.message, "error");
    }
  };

  // Reset admin edit mode and tab view when selectedVehicle changes
  useEffect(() => {
    if (!selectedVehicle) {
      setIsAdminEditMode(false);
    } else {
      setActiveModalSubTab("overview");
      setCurrentImageIndex(0);
    }
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
    <div className="bg-[#F4F1EA] min-h-screen text-[#1A1A1A] flex flex-col justify-between font-sans selection:bg-stone-900 selection:text-[#F4F1EA] overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        subscriptionActive={subscriptionActive}
        currentUser={currentUser}
        onSignInClick={() => setActiveTab("login")}
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
                  setActiveTab("login");
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
      <main className="flex-grow overflow-hidden pb-16 lg:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabViewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
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
                onSignInClick={() => setActiveTab("login")}
              />
            )}

            {activeTab === "sell" && (
              <SellTab
                setActiveTab={setActiveTab}
                subscriptionActive={subscriptionActive}
                showToast={showToast}
                currentUser={currentUser}
                onSignInClick={() => setActiveTab("login")}
              />
            )}

            {activeTab === "premium" && (
              <PremiumTab
                subscriptionActive={subscriptionActive}
                setSubscriptionActive={setSubscriptionActive}
                showToast={showToast}
                currentUser={currentUser}
                isSimranFreeModeEnabled={isSimranFreeModeEnabled}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "contact" && (
              <ContactTab showToast={showToast} currentUser={currentUser} />
            )}

            {activeTab === "favorites" && (
              <FavoritesTab
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                onQuickView={handleQuickView}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "admin" && (
              <AdminPanel 
                showToast={showToast} 
                currentUser={currentUser} 
                onQuickView={handleQuickView}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "login" && (
              <Login 
                onNavigate={(page) => setActiveTab(page)} 
                showToast={showToast} 
                onSuccess={() => setActiveTab("home")}
              />
            )}

            {activeTab === "signup" && (
              <SignUp 
                onNavigate={(page) => setActiveTab(page)} 
                showToast={showToast} 
                onSuccess={() => setActiveTab("home")}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Interactive detailed vehicle model overlay sheets */}
      <AnimatePresence>
        {selectedVehicle && (
          <Modal
            isOpen={Boolean(selectedVehicle)}
            onClose={() => setSelectedVehicle(null)}
            containerClassName="w-full max-w-4xl max-h-[92vh]"
            overlayClassName="bg-stone-950/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 52, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 36, scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 28,
                mass: 0.85
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FAF8F5] w-full max-w-4xl shadow-2xl relative max-h-[92vh] flex flex-col border border-stone-300 transition-transform duration-300 ease-out hover:scale-[1.02]"
            >
            {/* Close trigger */}
            <button
              onClick={() => setSelectedVehicle(null)}
              aria-label="Close vehicle details overlay dialog"
              title="Close details (Esc)"
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 text-[#F4F1EA] bg-stone-900 w-10 h-10 flex items-center justify-center text-xs font-mono font-bold cursor-pointer hover:bg-stone-850 focus:outline-none focus:ring-2 focus:ring-stone-950"
            >
              ✕
            </button>

            {/* Modal Sub-navigation Bar for tab view transitions */}
            {!isAdminEditMode && (
              <div className="bg-[#EFECE6] border-b border-stone-300 px-3 sm:px-6 pt-3 pb-2.5 flex items-center justify-between gap-2 overflow-x-auto shrink-0 select-none pr-14 z-20">
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalSubTab("overview")}
                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border ${
                      activeModalSubTab === "overview"
                        ? "bg-stone-900 text-[#F4F1EA] border-stone-900 shadow-2xs font-mono ring-1 ring-stone-900"
                        : "bg-[#F4F1EA] text-stone-700 border-stone-300 hover:bg-stone-200"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    Overview
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModalSubTab("gallery")}
                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border ${
                      activeModalSubTab === "gallery"
                        ? "bg-stone-900 text-[#F4F1EA] border-stone-900 shadow-2xs font-mono ring-1 ring-stone-900"
                        : "bg-[#F4F1EA] text-stone-700 border-stone-300 hover:bg-stone-200"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                    Image Gallery
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModalSubTab("specs")}
                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border ${
                      activeModalSubTab === "specs"
                        ? "bg-stone-900 text-[#F4F1EA] border-stone-900 shadow-2xs font-mono ring-1 ring-stone-900"
                        : "bg-[#F4F1EA] text-stone-700 border-stone-300 hover:bg-stone-200"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    Technical Specs
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModalSubTab("contact")}
                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border ${
                      activeModalSubTab === "contact"
                        ? "bg-stone-900 text-[#F4F1EA] border-stone-900 shadow-2xs font-mono ring-1 ring-stone-900"
                        : "bg-[#F4F1EA] text-stone-700 border-stone-300 hover:bg-stone-200"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    Seller & Contact
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModalSubTab("finance")}
                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border ${
                      activeModalSubTab === "finance"
                        ? "bg-stone-900 text-[#F4F1EA] border-stone-900 shadow-2xs font-mono ring-1 ring-stone-900"
                        : "bg-[#F4F1EA] text-stone-700 border-stone-300 hover:bg-stone-200"
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5 text-amber-500" />
                    Finance & EMI
                  </button>
                </div>

                <span className="text-[9px] font-mono text-stone-500 font-bold uppercase tracking-widest hidden md:inline-block">
                  AW-{selectedVehicle.id}
                </span>
              </div>
            )}

            {/* Scrollable content wrapper */}
            <div className="flex-1 overflow-y-auto">
              {isAdminEditMode ? (
                /* Admin Edit specifications form */
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-2 pb-3 border-b border-stone-250">
                    <Wrench className="w-5 h-5 text-amber-500 animate-spin" />
                    <div>
                      <h3 className="text-sm font-sans uppercase tracking-[0.2em] font-black text-stone-900">ADMINISTRATIVE DOSSIER WRITER</h3>
                      <p className="text-[10px] text-stone-500 uppercase font-mono">Modify validated specs for Ref: AW-{selectedVehicle.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Image and Multi-Image Gallery Editor */}
                    <div className="space-y-5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 block border-b border-stone-150 pb-1">Media Corrective Vault</span>
                      
                      {/* Live preview */}
                      <div className="aspect-video bg-stone-900 border border-stone-300 overflow-hidden relative">
                        <img
                          src={editImage}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                          }}
                        />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-stone-900/85 text-white text-[8px] font-mono uppercase tracking-wider">
                          Live Showcase Image Preview
                        </div>
                      </div>

                      {/* Multi-Image List Editor */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-sans uppercase tracking-wider font-bold text-stone-700">Dossier Image Gallery ({editPhotos.length} items)</label>
                          <button
                            type="button"
                            onClick={() => {
                              setEditPhotos([...editPhotos, { src: "", alt: `${editTitle} View` }]);
                            }}
                            className="px-2.5 py-1 bg-stone-900 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-stone-800 transition rounded-none cursor-pointer"
                          >
                            + Add Image Slot
                          </button>
                        </div>
                        
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 border border-stone-200 p-2.5 bg-white">
                          {editPhotos.map((photo, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-2 border-b border-stone-100 pb-2.5 last:border-b-0 last:pb-0">
                              <div className="w-14 h-10 border border-stone-350 shrink-0 bg-stone-100 relative">
                                <img
                                  src={photo.src}
                                  alt={`Slot ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                                  }}
                                />
                                <span className="absolute bottom-0 right-0 bg-stone-950/80 text-[7px] text-white px-1 py-0.2 font-mono">
                                  #{index + 1}
                                </span>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={photo.src}
                                    onChange={(e) => {
                                      const newPhotos = [...editPhotos];
                                      newPhotos[index].src = e.target.value;
                                      setEditPhotos(newPhotos);
                                      if (index === 0) {
                                        setEditImage(e.target.value);
                                      }
                                    }}
                                    className="w-full bg-[#FAF8F5] border border-stone-300 p-1.5 text-[10px] font-mono text-stone-850 focus:outline-none"
                                    placeholder="Image URL https://..."
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newPhotos = editPhotos.filter((_, i) => i !== index);
                                      setEditPhotos(newPhotos);
                                      if (newPhotos.length > 0 && index === 0) {
                                        setEditImage(newPhotos[0].src);
                                      }
                                    }}
                                    className="p-1.5 bg-red-50 text-red-650 border border-red-200 hover:bg-red-100 text-[10px] uppercase font-bold cursor-pointer"
                                    title="Remove this image slot"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between text-[8px] font-mono text-stone-500">
                                  <span>Alt label: {photo.alt || "None"}</span>
                                  {index === 0 ? (
                                    <span className="text-amber-650 font-extrabold uppercase">★ Primary Showcase Image</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Move to top (make primary)
                                        const newPhotos = [...editPhotos];
                                        const [target] = newPhotos.splice(index, 1);
                                        newPhotos.unshift(target);
                                        setEditPhotos(newPhotos);
                                        setEditImage(target.src);
                                      }}
                                      className="text-stone-700 hover:text-stone-950 underline font-bold cursor-pointer"
                                    >
                                      Make Primary Showcase
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {editPhotos.length === 0 && (
                            <p className="text-[10px] text-stone-500 font-mono text-center py-4">No images listed. Click "+ Add Image Slot" to insert images.</p>
                          )}
                        </div>
                      </div>

                      {/* Presets Grid */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[10px] font-sans uppercase tracking-wider font-bold text-stone-700 block">Clear & High-Quality Image Presets</label>
                        <span className="text-[9px] text-stone-400 block leading-tight">Apply preset to slot #1 showcase image:</span>
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {[
                            { label: "Premium SUV (High Res)", url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1000" },
                            { label: "Executive Sedan (Clear)", url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000" },
                            { label: "Sports Coupe (HD)", url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000" },
                            { label: "Off-Road Terrain (Clean)", url: "https://images.unsplash.com/photo-1532581291347-9c39cf10a73c?w=1000" },
                            { label: "Cruiser Motorcycle (Crisp)", url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1000" },
                            { label: "Classic Hatchback", url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1000" }
                          ].map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              onClick={() => {
                                if (editPhotos.length > 0) {
                                  const newPhotos = [...editPhotos];
                                  newPhotos[0].src = p.url;
                                  setEditPhotos(newPhotos);
                                } else {
                                  setEditPhotos([{ src: p.url, alt: `${editTitle} Primary` }]);
                                }
                                setEditImage(p.url);
                              }}
                              className={`p-2 text-left border rounded-xs text-[10px] font-bold uppercase cursor-pointer transition ${
                                editImage === p.url
                                  ? "bg-amber-550/10 border-amber-500 text-amber-900"
                                  : "bg-white hover:bg-stone-50 border-stone-200 text-stone-600"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Spec fields */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 block border-b border-stone-150 pb-1">Spec Data Points</span>
                      
                      {/* Title */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-sans uppercase tracking-wider font-bold text-stone-700">Vehicle Title (Name)</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-[#FAF8F5] border border-stone-300 p-2.5 text-sm font-serif font-black text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-950"
                          placeholder="e.g. Toyota Fortuner 2.8L"
                        />
                      </div>

                      {/* Price and Mileage Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Price */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-sans uppercase tracking-wider font-bold text-stone-700">Price (in INR)</label>
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                            className="w-full bg-[#FAF8F5] border border-stone-300 p-2.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-950"
                          />
                        </div>

                        {/* Mileage */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-sans uppercase tracking-wider font-bold text-stone-700">Mileage (e.g. '12,500 km')</label>
                          <input
                            type="text"
                            value={editMileage}
                            onChange={(e) => setEditMileage(e.target.value)}
                            className="w-full bg-[#FAF8F5] border border-stone-300 p-2.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-950"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-sans uppercase tracking-wider font-bold text-stone-700">Description Summary</label>
                        <textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          rows={4}
                          className="w-full bg-[#FAF8F5] border border-stone-300 p-2.5 text-xs text-stone-800 leading-normal font-medium focus:outline-none focus:ring-1 focus:ring-stone-950"
                          placeholder="Detailed historical context, service records, and mechanical condition overview."
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 pt-4 border-t border-stone-200">
                        <button
                          type="button"
                          onClick={() => setIsAdminEditMode(false)}
                          className="flex-1 py-3 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-950 text-[10px] uppercase font-bold tracking-widest cursor-pointer transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAdminEdits}
                          className="flex-1 py-3 bg-stone-900 border border-stone-900 hover:bg-stone-850 text-white text-[10px] uppercase font-bold tracking-widest cursor-pointer transition"
                        >
                          Save Dossier Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeModalSubTab}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    layout
                    className="p-6 md:p-8"
                  >
                    {/* TAB 1: OVERVIEW (Dual Column Full Dossier) */}
                    {activeModalSubTab === "overview" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                          decoding="async"
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

                        {/* Keyboard navigation Hint */}
                        {hasMultiple && (
                          <span className="absolute bottom-4 left-4 z-10 px-2 py-1 bg-stone-900/80 backdrop-blur-sm text-stone-300 font-mono text-[9px] font-bold border border-stone-700/80 select-none hidden sm:inline-block">
                            Use ← / → keys
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
                                  loading="lazy"
                                  decoding="async"
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

                {/* ADMIN DIRECT CONTROL PANEL IN THE OVERLAY - MOVED STICKY */}
                {currentUser?.email === "afrojalamansari461@gmail.com" && (
                  <div className="p-4 bg-stone-900 border-2 border-amber-500 text-[#F4F1EA] font-sans space-y-4 shadow-lg sticky top-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-stone-800">
                      <Wrench className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 font-mono">BACKOFFICE DOSSIER CONTROL</h4>
                        <span className="text-[9px] text-stone-400 block uppercase font-mono tracking-wider">Level 5 Security Access Activated</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {/* Edit Specs Toggle Button */}
                      <button
                        onClick={handleStartAdminEdit}
                        className="px-2.5 py-2 bg-amber-500 hover:bg-amber-400 border border-amber-600 text-stone-950 text-[9px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1 font-mono transition col-span-2 sm:col-span-1"
                        title="Edit name, image, price, and mileage specifications"
                      >
                        <Wrench className="w-3.5 h-3.5 shrink-0 text-stone-950" />
                        Edit Specs
                      </button>

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
                  <div className="text-3xl font-serif font-black text-stone-900 mt-2 flex items-center gap-0.5">
                    <span>₹</span>
                    <CountUp to={selectedVehicle.price} />
                  </div>

                  {/* 30-Day Listing Expiration Badge & Info Box */}
                  {(() => {
                    const isPremiumOrFeatured = Boolean(
                      selectedVehicle.badge === "premium" || 
                      selectedVehicle.badge === "verified" || 
                      (selectedVehicle as any).featured || 
                      (selectedVehicle as any).urgent
                    );
                    const datePosted = selectedVehicle.datePosted || (selectedVehicle as any).createdAt;
                    const expDetails = getListingExpirationDetails(datePosted, isPremiumOrFeatured);

                    return (
                      <div className="mt-3">
                        {!expDetails.isPremiumOrFeatured ? (
                          expDetails.isExpired ? (
                            <div className="bg-red-50 border-2 border-red-600 p-3.5 flex items-start gap-2.5 shadow-xs">
                              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-mono font-extrabold uppercase tracking-wider">
                                    EXPIRED (AUTO-HIDDEN)
                                  </span>
                                  <span className="text-[10px] text-red-800 font-mono font-bold">
                                    30-Day Limit Reached
                                  </span>
                                </div>
                                <p className="text-[11px] text-red-950 font-semibold mt-1 leading-snug">
                                  This listing was created on {expDetails.postedDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} and has passed the 30-day free tier window. It is automatically hidden from public catalog search.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className={`border p-3 flex items-start justify-between gap-3 ${
                              expDetails.isNearExpiry
                                ? "bg-amber-50 border-amber-400 text-amber-950 shadow-xs"
                                : "bg-stone-100 border-stone-300 text-stone-850"
                            }`}>
                              <div className="flex items-start gap-2.5">
                                <Clock className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${expDetails.isNearExpiry ? "text-amber-600 animate-pulse" : "text-stone-700"}`} />
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2 py-0.5 text-[9.5px] font-mono font-extrabold uppercase tracking-wider border border-stone-900 ${
                                      expDetails.isNearExpiry ? "bg-amber-400 text-stone-950" : "bg-stone-900 text-amber-400"
                                    }`}>
                                      Expires in {expDetails.daysRemaining} {expDetails.daysRemaining === 1 ? "day" : "days"}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-stone-600">
                                      Expiry Date: {expDetails.expiryDateStr}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-stone-600 font-medium mt-1 leading-tight">
                                    Calculated using a 30-day window from the creation date ({expDetails.postedDateObj.toLocaleDateString()}).
                                    {expDetails.isNearExpiry && (
                                      <span className="block text-amber-800 font-bold mt-0.5">
                                        ⚠️ Warning: Less than 3 days remaining before this listing is automatically hidden!
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="bg-emerald-50/80 border border-emerald-300 p-2.5 flex items-center gap-2 text-emerald-950">
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wide">
                              Verified / Premium Listing — Permanent Active Status (No 30-Day Auto-Hide)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                    {selectedVehicle.category === "bicycle" || selectedVehicle.fuel?.toLowerCase().includes("human") || selectedVehicle.fuel?.toLowerCase().includes("pedal") ? (
                      <>
                        <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Frame Size</span>
                          <span className="text-stone-900 font-bold mt-0.5 block">{selectedVehicle.frameSize || "Standard"}</span>
                        </div>
                        <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Cycle Style</span>
                          <span className="text-stone-900 font-bold mt-0.5 block">{selectedVehicle.bicycleType || selectedVehicle.make || "Bicycle"}</span>
                        </div>
                        <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Drivetrain / Gears</span>
                          <span className="text-stone-900 font-bold mt-0.5 block">{selectedVehicle.gears || selectedVehicle.transmission || "Pedal Drive"}</span>
                        </div>
                        <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Model Year</span>
                          <span className="text-stone-900 font-bold mt-0.5 block">{selectedVehicle.year}</span>
                        </div>
                        {selectedVehicle.frameMaterial && (
                          <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                            <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Frame Material</span>
                            <span className="text-stone-900 font-bold mt-0.5 block text-[11px] font-mono leading-none">{selectedVehicle.frameMaterial}</span>
                          </div>
                        )}
                        {selectedVehicle.brakeType && (
                          <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                            <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Brake System</span>
                            <span className="text-stone-900 font-bold mt-0.5 block text-[11px] leading-none">{selectedVehicle.brakeType}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Mileage run</span>
                          <span className="text-stone-900 font-bold mt-0.5 block">
                            <CountUp to={selectedVehicle.mileage} />
                          </span>
                        </div>
                        <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Power / Fuel</span>
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
                        {selectedVehicle.engine && (
                          <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                            <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Engine / Battery</span>
                            <span className="text-stone-900 font-bold mt-0.5 block text-[11px] font-mono leading-none">{selectedVehicle.engine}</span>
                          </div>
                        )}
                        {selectedVehicle.color && (
                          <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                            <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Exterior Color</span>
                            <span className="text-stone-900 font-bold mt-0.5 block text-[11px] leading-none">{selectedVehicle.color}</span>
                          </div>
                        )}
                        {selectedVehicle.owners && (
                          <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                            <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Owner Count</span>
                            <span className="text-stone-900 font-bold mt-0.5 block text-[11px] leading-none">{selectedVehicle.owners}</span>
                          </div>
                        )}
                        {selectedVehicle.regNumber && (
                          <div className="p-3 bg-[#FAF8F5] border border-stone-300">
                            <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Reg Number / Plate</span>
                            <span className="text-stone-900 font-bold mt-0.5 block font-mono text-[11px] leading-none">{selectedVehicle.regNumber}</span>
                          </div>
                        )}
                      </>
                    )}
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
                {isSecureShieldEnabled && (
                  <SecureShieldCard
                    vehicleTitle={selectedVehicle.title}
                    vehicleId={selectedVehicle.id}
                    sellerPhone={modalSellerInfo?.phone}
                    isEnabled={isSecureShieldEnabled}
                    onBookShield={(id, title) => {
                      const phone = modalSellerInfo ? modalSellerInfo.phone : '+91 98230 44556';
                      triggerSmsLeadAlert(phone, title || selectedVehicle.title, id || selectedVehicle.id, "inspection");
                      showToast("Secured Shield booking request logged (₹199)! An inspector will be assigned to AW-" + selectedVehicle.id + " upon seller feedback.", "success");
                    }}
                  />
                )}

                {/* Seller direct contact info module */}
                {hasPaidPass ? (
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
                          <span className="text-stone-955 font-mono tracking-tight font-bold">{modalSellerInfo.email}</span>
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
                ) : (
                  <div className="p-4 bg-[#FAF8F5] border border-stone-300 font-sans space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                      <User className="w-5 h-5 text-stone-900" />
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-widest leading-none">Vetted Seller Profile</h4>
                        <span className="text-[9px] text-amber-600 font-bold uppercase tracking-widest mt-0.5 font-sans animate-pulse">Contact Locked</span>
                      </div>
                    </div>
                    
                    <div className="py-4 text-center space-y-3">
                      <Lock className="w-8 h-8 text-amber-600 mx-auto" />
                      <h5 className="text-[11px] font-bold text-stone-800 uppercase tracking-wider">Seller Contacts Restricted</h5>
                      <p className="text-[10px] text-stone-500 leading-relaxed max-w-sm mx-auto uppercase font-sans">
                        Unlocked exclusively for Premium Pass owners or active subscribers.
                      </p>
                      <button
                        onClick={() => {
                          setSelectedVehicle(null);
                          setActiveTab("buy");
                          setTimeout(() => {
                            const section = document.getElementById("inventory-catalog-start");
                            if (section) section.scrollIntoView({ behavior: "smooth" });
                          }, 300);
                          showToast("Unlock seller coordinates with our ₹1 verification pass!", "info");
                        }}
                        className="mt-2 px-4 py-2 bg-stone-900 hover:bg-stone-850 text-white text-[9px] font-extrabold uppercase tracking-widest cursor-pointer transition border border-stone-900"
                      >
                        Unlock with ₹1 Pass
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 font-sans">
                  <button
                    onClick={() => {
                      toggleFavorite(selectedVehicle.id);
                      showToast(favorites.includes(selectedVehicle.id) ? "Removed from bookmark brief!" : "Saved brand new bookmark briefcase!", "success");
                    }}
                    className={`flex-1 py-3.5 border text-[10px] uppercase font-bold tracking-widest cursor-pointer flex items-center justify-center gap-2 transition ${
                      favorites.includes(selectedVehicle.id)
                        ? "bg-black border-black text-white hover:bg-neutral-900"
                        : "bg-white border-black text-black hover:bg-neutral-100"
                    }`}
                  >
                    <AnimatedFavoriteHeart isFav={favorites.includes(selectedVehicle.id)} className="w-4 h-4" />
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
                    onClick={handleRequestCallback}
                    className="flex-1 py-3.5 bg-stone-900 border border-stone-900 hover:bg-stone-850 text-white text-[10px] uppercase font-bold tracking-widest transition cursor-pointer"
                  >
                    Request Callback
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GALLERY (Focused Full-Frame High-Res Gallery View) */}
          {activeModalSubTab === "gallery" && (
            <div className="space-y-6 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-300 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold block">
                    HIGH-DEFINITION MEDIA SHOWCASE
                  </span>
                  <h2 className="text-xl font-serif font-black text-stone-950">
                    {selectedVehicle.title} Gallery
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalSubTab("specs")}
                    className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-stone-200 border border-stone-300 text-stone-900 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    Switch to Technical Specs →
                  </button>
                </div>
              </div>

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
                  <div className="space-y-4">
                    {/* Large Main Slide Frame */}
                    <div className="relative aspect-video max-h-[500px] border-2 border-stone-900 overflow-hidden bg-stone-950 group shadow-lg">
                      <motion.img
                        key={currentImageIndex}
                        initial={{ opacity: 0.7, scale: 1.03 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        src={images[currentImageIndex]?.src || selectedVehicle.image}
                        alt={images[currentImageIndex]?.alt || selectedVehicle.title}
                        decoding="async"
                        className="w-full h-full object-cover select-none"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                        }}
                      />

                      {/* Slide overlay info */}
                      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                        {selectedVehicle.badge && (
                          <span className="px-3 py-1 bg-stone-900 text-[#F4F1EA] text-[9px] font-bold uppercase tracking-widest border border-stone-700">
                            {selectedVehicle.badge}
                          </span>
                        )}
                        <span className="px-3 py-1 bg-amber-500 text-stone-950 text-[9px] font-mono font-bold uppercase tracking-widest border border-amber-600">
                          HD Inspection Photo
                        </span>
                      </div>

                      {hasMultiple && (
                        <span className="absolute bottom-4 right-4 z-10 px-3 py-1 bg-stone-900/90 backdrop-blur-sm text-stone-100 font-mono text-xs font-bold border border-stone-700 select-none">
                          {currentImageIndex + 1} of {images.length}
                        </span>
                      )}

                      {hasMultiple && (
                        <button
                          onClick={handlePrev}
                          aria-label="Previous photo"
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center bg-stone-950/85 hover:bg-stone-900 text-white border border-stone-700 transition cursor-pointer shadow-md"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                      )}

                      {hasMultiple && (
                        <button
                          onClick={handleNext}
                          aria-label="Next photo"
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center bg-stone-950/85 hover:bg-stone-900 text-white border border-stone-700 transition cursor-pointer shadow-md"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      )}
                    </div>

                    {/* Thumbnail list */}
                    {hasMultiple && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                        {images.map((img, idx) => {
                          const isActive = idx === currentImageIndex;
                          return (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`relative aspect-video border-2 transition-all cursor-pointer overflow-hidden ${
                                isActive 
                                  ? "border-amber-500 ring-2 ring-amber-500/30 scale-[1.02]" 
                                  : "border-stone-300 opacity-60 hover:opacity-100"
                              }`}
                            >
                              <img
                                src={img.src}
                                alt={`Thumbnail ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                                }}
                              />
                              <span className="absolute bottom-1 right-1 px-1 bg-stone-900/90 text-white text-[8px] font-mono">
                                #{idx + 1}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="p-4 bg-[#F4F1EA] border border-stone-300 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-stone-700 space-y-1">
                  <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">Audit Certified Media Vault</h4>
                  <p className="text-[10px] text-stone-600 leading-relaxed">
                    Each photograph uploaded to Ref: AW-{selectedVehicle.id} has undergone geometric aspect analysis and timestamp verification.
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-300">
                <button
                  type="button"
                  onClick={() => setActiveModalSubTab("overview")}
                  className="px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-900 text-xs font-bold uppercase tracking-wider cursor-pointer transition"
                >
                  ← Back to Full Dossier Overview
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalSubTab("specs")}
                  className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
                >
                  <FileText className="w-4 h-4 text-amber-500" />
                  View Technical Specifications →
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TECHNICAL SPECS (Dedicated High-Density Specs Dossier) */}
          {activeModalSubTab === "specs" && (
            <div className="space-y-6 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-300 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold block">
                    VERIFIED TECHNICAL SPECIFICATIONS
                  </span>
                  <h2 className="text-xl font-serif font-black text-stone-950">
                    {selectedVehicle.title} Specifications
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModalSubTab("gallery")}
                  className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-stone-200 border border-stone-300 text-stone-900 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer self-start sm:self-auto"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                  View Image Gallery →
                </button>
              </div>

              {/* Valuation & Overview Banner */}
              <div className="p-4 bg-stone-900 text-[#F4F1EA] border border-stone-900 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 block">Verified Listing Price</span>
                  <div className="text-2xl font-serif font-black text-amber-400">
                    ₹{selectedVehicle.price.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-stone-300 border-l border-stone-700 pl-4">
                  <div>
                    <span className="text-[9px] text-stone-400 block uppercase">Reference ID</span>
                    <span className="font-bold text-white">AW-{selectedVehicle.id}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block uppercase">Year</span>
                    <span className="font-bold text-white">{selectedVehicle.year}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block uppercase">Badge Status</span>
                    <span className="font-bold text-amber-400 uppercase">{selectedVehicle.badge || "Standard"}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Spec Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-900 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-amber-600" />
                  Engineering & Spec Breakdown
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-stone-700">
                  {selectedVehicle.category === "bicycle" || selectedVehicle.fuel?.toLowerCase().includes("human") || selectedVehicle.fuel?.toLowerCase().includes("pedal") ? (
                    <>
                      <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                        <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Frame Size</span>
                        <span className="text-stone-950 font-bold text-sm mt-0.5 block">{selectedVehicle.frameSize || "Standard"}</span>
                      </div>
                      <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                        <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Cycle Style</span>
                        <span className="text-stone-950 font-bold text-sm mt-0.5 block">{selectedVehicle.bicycleType || selectedVehicle.make || "Bicycle"}</span>
                      </div>
                      <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                        <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Drivetrain / Gears</span>
                        <span className="text-stone-950 font-bold text-sm mt-0.5 block">{selectedVehicle.gears || selectedVehicle.transmission || "Pedal Drive"}</span>
                      </div>
                      <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                        <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Model Year</span>
                        <span className="text-stone-950 font-bold text-sm mt-0.5 block">{selectedVehicle.year}</span>
                      </div>
                      {selectedVehicle.frameMaterial && (
                        <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Frame Material</span>
                          <span className="text-stone-950 font-bold mt-0.5 block text-xs font-mono">{selectedVehicle.frameMaterial}</span>
                        </div>
                      )}
                      {selectedVehicle.brakeType && (
                        <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Brake System</span>
                          <span className="text-stone-950 font-bold mt-0.5 block text-xs">{selectedVehicle.brakeType}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                        <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Mileage run</span>
                        <span className="text-stone-950 font-bold text-sm mt-0.5 block">
                          <CountUp to={selectedVehicle.mileage} />
                        </span>
                      </div>
                      <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                        <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Power / Fuel Type</span>
                        <span className="text-stone-950 font-bold text-sm mt-0.5 block">{selectedVehicle.fuel}</span>
                      </div>
                      <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                        <span className="text-stone-400 block text-[9px] font-bold uppercase tracking-widest">Transmission</span>
                        <span className="text-stone-950 font-bold text-sm mt-0.5 block">{selectedVehicle.transmission}</span>
                      </div>
                      <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                        <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Production Year</span>
                        <span className="text-stone-950 font-bold text-sm mt-0.5 block">{selectedVehicle.year}</span>
                      </div>
                      {selectedVehicle.engine && (
                        <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Engine / Displacement</span>
                          <span className="text-stone-950 font-bold mt-0.5 block text-xs font-mono">{selectedVehicle.engine}</span>
                        </div>
                      )}
                      {selectedVehicle.color && (
                        <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Exterior Paint Finish</span>
                          <span className="text-stone-950 font-bold mt-0.5 block text-xs">{selectedVehicle.color}</span>
                        </div>
                      )}
                      {selectedVehicle.owners && (
                        <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Owner Count</span>
                          <span className="text-stone-950 font-bold mt-0.5 block text-xs">{selectedVehicle.owners}</span>
                        </div>
                      )}
                      {selectedVehicle.regNumber && (
                        <div className="p-3.5 bg-[#FAF8F5] border border-stone-300">
                          <span className="text-[#999999] block text-[9px] font-bold uppercase tracking-widest">Reg Number / Plate</span>
                          <span className="text-stone-950 font-bold mt-0.5 block font-mono text-xs">{selectedVehicle.regNumber}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Extra Options Checklist */}
              {selectedVehicle.features && selectedVehicle.features.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-stone-900">Installed Equipment & Options</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedVehicle.features.map((f, i) => (
                      <div key={i} className="p-2.5 bg-stone-900 text-white text-xs font-bold flex items-center gap-2 border border-stone-900">
                        <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Description */}
              {selectedVehicle.description && (
                <div className="space-y-2 pt-2 border-t border-stone-300">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-stone-900">Seller & Mechanic Assessment</h3>
                  <p className="text-xs text-stone-750 leading-relaxed font-sans bg-[#FAF8F5] p-4 border border-stone-300">
                    {selectedVehicle.description}
                  </p>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-300">
                <button
                  type="button"
                  onClick={() => setActiveModalSubTab("gallery")}
                  className="px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
                >
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  ← View Image Gallery
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalSubTab("contact")}
                  className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Shield className="w-4 h-4 text-amber-500" />
                  Book Inspection & Contact Seller →
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SELLER & CONTACT (Dedicated Contact & Shield Inspection View) */}
          {activeModalSubTab === "contact" && (
            <div className="space-y-6 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-300 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold block">
                    TRANSACTION & DIRECT DISPATCH
                  </span>
                  <h2 className="text-xl font-serif font-black text-stone-950">
                    Seller & Inspection Shield
                  </h2>
                </div>

                <span className="text-xs font-mono text-stone-500 font-bold">
                  AW-{selectedVehicle.id}
                </span>
              </div>

              {/* Shield Section */}
              {isSecureShieldEnabled && (
                <SecureShieldCard
                  vehicleTitle={selectedVehicle.title}
                  vehicleId={selectedVehicle.id}
                  sellerPhone={modalSellerInfo?.phone}
                  isEnabled={isSecureShieldEnabled}
                  onBookShield={(id, title) => {
                    const phone = modalSellerInfo ? modalSellerInfo.phone : '+91 98230 44556';
                    triggerSmsLeadAlert(phone, title || selectedVehicle.title, id || selectedVehicle.id, "inspection");
                    showToast("Secured Shield booking request logged (₹199)! An inspector will be assigned to AW-" + selectedVehicle.id + " upon seller feedback.", "success");
                  }}
                />
              )}

              {/* Seller profile or unlocked contacts */}
              {hasPaidPass ? (
                <div className="p-5 bg-[#FAF8F5] border border-stone-300 font-sans space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-stone-200">
                    <User className="w-5 h-5 text-stone-900" />
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 uppercase tracking-widest leading-none">Vetted Seller Coordinates</h4>
                      <span className="text-[9px] text-[#777777] block font-bold uppercase tracking-widest mt-0.5 font-sans">Verified Direct Contact Details</span>
                    </div>
                  </div>

                  {modalSellerInfo ? (
                    <div className="space-y-3.5 text-xs text-stone-750 leading-relaxed font-sans">
                      <div className="flex justify-between border-b border-stone-200/60 pb-1.5">
                        <span className="text-stone-400 uppercase tracking-widest text-[10px]">Seller Name:</span>
                        <span className="text-stone-950 font-bold">{modalSellerInfo.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-stone-200/60 pb-1.5">
                        <span className="text-stone-400 uppercase tracking-widest text-[10px]">Email Address:</span>
                        <span className="text-stone-950 font-mono tracking-tight font-bold">{modalSellerInfo.email}</span>
                      </div>
                      <div className="flex justify-between border-b border-stone-200/60 pb-1.5">
                        <span className="text-stone-400 uppercase tracking-widest text-[10px]">Phone Number:</span>
                        <span className="text-stone-950 font-bold">{modalSellerInfo.phone}</span>
                      </div>
                      <div className="flex justify-between border-b border-stone-200/60 pb-1.5">
                        <span className="text-stone-400 uppercase tracking-widest text-[10px]">City Location:</span>
                        <span className="text-stone-950 font-bold">{modalSellerInfo.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 uppercase tracking-widest text-[10px]">Negotiable:</span>
                        <span className="font-bold text-stone-950 uppercase text-[10px]">
                          {modalSellerInfo.negotiable === "yes" ? "Authorized Price Flexibility" : "Firm Price Only"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs text-[#555555] leading-relaxed font-sans">
                      <div className="flex justify-between">
                        <span className="text-stone-400 uppercase tracking-widest text-[10px]">Brokerage Representative:</span>
                        <span className="text-stone-900 font-bold">Auto World Certified Agent</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-stone-200">
                    <a
                      href={`mailto:${modalSellerInfo ? modalSellerInfo.email : 'brokerage@autoworld.com'}?subject=Inquiry%20regarding%20${encodeURIComponent(selectedVehicle.title)}`}
                      className="px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Mail className="w-4 h-4 shrink-0 text-amber-400" />
                      Send Direct Email
                    </a>
                    <a
                      href={`https://wa.me/${(() => {
                        const raw = (modalSellerInfo ? modalSellerInfo.phone : '+91 98230 44556').replace(/\D/g, '');
                        return raw.length === 10 ? `91${raw}` : raw;
                      })()}?text=${encodeURIComponent(
                        `Hello! I am inquiring about the vehicle listed on Auto World:\n\n` +
                        `🚗 *${selectedVehicle.title}*\n` +
                        `• Price: ₹${selectedVehicle.price.toLocaleString("en-IN")}\n` +
                        `• Mileage: ${selectedVehicle.mileage}\n` +
                        `• Specs: ${selectedVehicle.fuel} | ${selectedVehicle.transmission}\n` +
                        `• Ref Code: AW-${selectedVehicle.id}\n\n` +
                        `Is this vehicle still available for a physical inspection or negotiation?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        const phone = modalSellerInfo ? modalSellerInfo.phone : '+91 98230 44556';
                        triggerSmsLeadAlert(phone, selectedVehicle.title, selectedVehicle.id, "whatsapp");
                      }}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600 hover:border-emerald-500 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0 text-white" />
                      Chat on WhatsApp
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-[#FAF8F5] border border-stone-300 font-sans space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                    <User className="w-5 h-5 text-stone-900" />
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 uppercase tracking-widest leading-none">Vetted Seller Profile</h4>
                      <span className="text-[9px] text-amber-600 font-bold uppercase tracking-widest mt-0.5 font-sans animate-pulse">Contact Locked</span>
                    </div>
                  </div>
                  
                  <div className="py-6 text-center space-y-3">
                    <Lock className="w-10 h-10 text-amber-600 mx-auto" />
                    <h5 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Seller Contacts Restricted</h5>
                    <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto uppercase font-sans">
                      Unlock direct WhatsApp and phone coordinates with our ₹1 Verification Pass.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedVehicle(null);
                        setActiveTab("buy");
                        setTimeout(() => {
                          const section = document.getElementById("inventory-catalog-start");
                          if (section) section.scrollIntoView({ behavior: "smooth" });
                        }, 300);
                        showToast("Unlock seller coordinates with our ₹1 verification pass!", "info");
                      }}
                      className="mt-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white text-xs font-extrabold uppercase tracking-widest cursor-pointer transition border border-stone-900"
                    >
                      Unlock with ₹1 Pass
                    </button>
                  </div>
                </div>
              )}

              {/* Action Shortcuts */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 font-sans">
                <button
                  onClick={() => {
                    toggleFavorite(selectedVehicle.id);
                    showToast(favorites.includes(selectedVehicle.id) ? "Removed from bookmark brief!" : "Saved brand new bookmark briefcase!", "success");
                  }}
                  className={`flex-1 py-3.5 border text-xs uppercase font-bold tracking-widest cursor-pointer flex items-center justify-center gap-2 transition ${
                    favorites.includes(selectedVehicle.id)
                      ? "bg-black border-black text-white hover:bg-neutral-900"
                      : "bg-white border-black text-black hover:bg-neutral-100"
                  }`}
                >
                  <AnimatedFavoriteHeart isFav={favorites.includes(selectedVehicle.id)} className="w-4 h-4" />
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
                  className="flex-1 py-3.5 bg-[#FAF8F5] border border-stone-300 hover:bg-stone-200 text-stone-950 text-xs uppercase font-bold tracking-widest flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Share2 className="w-4 h-4 text-stone-900 shrink-0" />
                  Share Listing
                </button>
                <button
                  onClick={handleRequestCallback}
                  className="flex-1 py-3.5 bg-stone-900 border border-stone-900 hover:bg-stone-850 text-white text-xs uppercase font-bold tracking-widest transition cursor-pointer"
                >
                  Request Callback
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: FINANCE & EMI (Interactive Loan Calculator & Pre-Approval Lead Capture) */}
          {activeModalSubTab === "finance" && (
            <div className="space-y-6 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-300 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold block">
                    BANK LOAN & EMI PRE-APPROVAL
                  </span>
                  <h2 className="text-xl font-serif font-black text-stone-950">
                    Vehicle Finance Calculator
                  </h2>
                </div>

                <span className="text-xs font-mono text-stone-500 font-bold">
                  AW-{selectedVehicle.id}
                </span>
              </div>

              <EMICalculator
                vehiclePrice={selectedVehicle.price}
                vehicleTitle={selectedVehicle.title}
                vehicleId={selectedVehicle.id}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    )}
  </div>
</motion.div>
</Modal>
)}
</AnimatePresence>

      {/* Toast Notification element with Framer Motion AnimatePresence */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            id="toast-notification"
            initial={{ opacity: 0, y: 32, scale: 0.9, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(2px)" }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-[250] flex items-center justify-between gap-4 px-5 py-4 border shadow-xl bg-stone-950 text-[#F4F1EA] border-stone-800 rounded-sm max-w-sm"
          >
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.12 }}
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  toast.type === "error" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                  toast.type === "info" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                  "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {toast.type === "error" ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : toast.type === "info" ? (
                  <Info className="w-3.5 h-3.5" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </motion.div>
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Central Login Modal overlaid with Netlify optimization options */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        showToast={showToast}
      />

      {/* Global Footer */}
      <Footer setActiveTab={setActiveTab} onOpenLegal={setOpenLegalDoc} />

      {/* Global Legal & Advisor Support Modal */}
      <AnimatePresence>
        {openLegalDoc && (
          <Modal
            isOpen={Boolean(openLegalDoc)}
            onClose={() => setOpenLegalDoc(null)}
            containerClassName="w-full max-w-3xl max-h-[85vh]"
            overlayClassName="bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-[#FAF8F5] text-stone-900 border border-stone-800 w-full max-h-[85vh] flex flex-col shadow-2xl relative font-sans">
            {/* Header / Newspaper Column Header banner */}
            <div className="border-b-4 border-stone-950 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-[#F4F1EA] relative">
              <div className="pr-12 sm:pr-0">
                <span className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-[#B45309] block mb-1">
                  OFFICIAL AUTO WORLD GAZETTE
                </span>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-black tracking-tight text-stone-950 uppercase leading-tight">
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
                className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-stone-500 hover:text-stone-950 px-2.5 py-1 sm:px-3 sm:py-1.5 border border-stone-300 hover:border-stone-900 bg-white transition cursor-pointer shrink-0 whitespace-nowrap"
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
                      Pro Subscribers and ₹1 Daily Pass holders receive prioritized ticket handling. VIP channels forward your questions to our senior listing mechanics instantly for live advice on paint depth, engine safety, or registration transfers.
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
        </Modal>
      )}
    </AnimatePresence>
      {/* Global Slide-Over User Feedback Widget */}
      <FeedbackWidget 
        showToast={showToast} 
        currentUser={currentUser} 
      />

      {/* Admin Grand Entrance Premium overlay */}
      <AdminGrandEntry 
        isOpen={showAdminGrandEntry} 
        onClose={() => setShowAdminGrandEntry(false)} 
      />

      {/* Floating Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && activeTab === "buy" && (
          <motion.button
            key="scroll-to-top"
            initial={{ opacity: 0, y: 50, scale: 0.85, rotate: -4 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 35, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            whileHover={{ 
              scale: 1.1,
              y: -5,
            }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToTop}
            id="scroll-to-top-btn"
            className="fixed bottom-36 sm:bottom-40 lg:bottom-20 right-4 sm:right-6 z-50 flex items-center justify-center w-11 h-11 bg-stone-950 text-white border border-purple-400/85 shadow-[0_0_12px_rgba(192,132,252,0.5)] hover:shadow-[0_0_22px_rgba(192,132,252,0.9)] cursor-pointer rounded-none group select-none hover:bg-stone-900 hover:border-purple-300 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950"
            title="Scroll to Top"
            aria-label="Scroll back to the top of the vehicle catalog"
          >
            <div className="relative overflow-hidden w-4 h-4 flex items-center justify-center shrink-0">
              <ArrowUp className="w-4 h-4 absolute transition-all duration-300 group-hover:-translate-y-6 text-white" />
              <ArrowUp className="w-4 h-4 absolute translate-y-6 transition-all duration-300 group-hover:translate-y-0 text-white" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal for Vehicle Actions */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <Modal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            containerClassName="w-full max-w-md"
            overlayClassName="bg-stone-900/60 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#FAF8F5] border-3 border-stone-900 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6 font-mono"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b-2 border-stone-900">
                <div className={`w-3 h-3 rounded-none rotate-45 ${confirmModal.danger ? "bg-red-600" : "bg-purple-600"}`} />
                <h3 className="text-xs font-mono font-black tracking-wider uppercase text-stone-950">
                  {confirmModal.title || "CONFIRMATION REQUIRED"}
                </h3>
              </div>
              
              <p className="text-xs text-stone-800 leading-relaxed uppercase font-mono">
                {confirmModal.message}
              </p>
              
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-stone-105 hover:bg-stone-200 border border-stone-300 text-[10px] font-bold uppercase tracking-widest font-mono cursor-pointer transition"
                >
                  ABORT TRANSACTION
                </button>
                
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  className={`px-5 py-2 text-white text-[10px] font-black uppercase tracking-widest font-mono cursor-pointer transition ${
                    confirmModal.danger 
                      ? "bg-red-600 hover:bg-red-700 shadow-[0_0_12px_rgba(220,38,38,0.3)]" 
                      : "bg-stone-900 hover:bg-stone-800"
                  }`}
                >
                  {confirmModal.confirmText || "EXECUTE ACTION"}
                </button>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
