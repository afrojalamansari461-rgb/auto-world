import React, { useState, useEffect, useRef } from "react";
import { 
  Car, Search, Shield, Trophy, Users, Star, ArrowRight, Eye, Heart, 
  DollarSign, Calendar, MapPin, Gauge, ShieldCheck, Crown, Sparkles, 
  Wrench, Cpu, Zap, Flame, Disc, MessageCircle, Layers, Sliders, Activity, 
  Wind, Lightbulb, PlusCircle, RefreshCw, Quote, CheckCircle2, ChevronLeft,
  ChevronRight, Pause, Play, Camera, Clock
} from "lucide-react";
import { 
  Vehicle, DEFAULT_VEHICLES, UserListing, Part, DEFAULT_PARTS, 
  PART_RARITY_TIERS, PART_CONDITION_LABELS, PART_CATEGORIES, UserPartListing 
} from "../types";
import { motion, AnimatePresence, useMotionValue, useAnimationFrame } from "motion/react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { subscribeToRealtimeCatalog } from "../lib/catalogSync";
import { AnimatedFavoriteHeart } from "./AnimatedFavoriteHeart";
import {
  BuyerTestimonial,
  TestimonialsConfig,
  DEFAULT_TESTIMONIALS_CONFIG,
  subscribeToTestimonials,
  getPublicDisplayTestimonials,
} from "../lib/testimonialsService";
import SubmitTestimonialForm from "./SubmitTestimonialForm";
import {
  AdminControlSystemsState,
  DEFAULT_ADMIN_CONTROL_SYSTEMS,
  subscribeToControlSystems,
  getSellerTrustBadge,
  isPromoBannerCurrentlyActive,
  HomepageSectionId,
} from "../lib/adminControlSystemsService";

interface HomeTabProps {
  setActiveTab: (tab: string) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  setSearchFilters: (filters: { type: string; priceRange: string; location: string }) => void;
  onQuickView: (vehicle: Vehicle) => void;
  onQuickViewPart?: (part: Part, coords?: { x: number; y: number }) => void;
  favoritePartIds?: (string | number)[];
  toggleFavoritePart?: (id: string | number) => void;
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

  try {
    const overridesStr = localStorage.getItem("autoWorld_default_overrides");
    if (overridesStr) {
      const overridesMap = JSON.parse(overridesStr);
      if (overridesMap && typeof overridesMap === "object") {
        list = list.map(v => {
          const override = overridesMap[v.id];
          return override ? { ...v, ...override } : v;
        });
      }
    }
  } catch (e) {
    console.error("Failed to parse custom default overrides in HomeTab:", e);
  }

  return list;
}

function getOverriddenParts(): Part[] {
  let list = [...DEFAULT_PARTS];
  try {
    const hiddenStr = localStorage.getItem("autoWorld_hidden_parts");
    if (hiddenStr) {
      const hiddenIds = JSON.parse(hiddenStr);
      if (Array.isArray(hiddenIds)) {
        list = list.filter(p => !hiddenIds.includes(p.id));
      }
    }
  } catch (e) {
    console.error("Failed to parse hidden default parts in HomeTab:", e);
  }

  try {
    const removedStr = localStorage.getItem("autoWorld_removed_parts");
    if (removedStr) {
      const removedIds = JSON.parse(removedStr);
      if (Array.isArray(removedIds)) {
        list = list.filter(p => !removedIds.includes(p.id));
      }
    }
  } catch (e) {
    console.error("Failed to parse removed default parts in HomeTab:", e);
  }

  try {
    const badgesStr = localStorage.getItem("autoWorld_part_badges");
    if (badgesStr) {
      const badgesMap = JSON.parse(badgesStr);
      if (badgesMap && typeof badgesMap === "object") {
        list = list.map(p => {
          const customBadge = badgesMap[p.id];
          return {
            ...p,
            badge: customBadge !== undefined ? customBadge : p.badge
          };
        });
      }
    }
  } catch (e) {
    console.error("Failed to parse custom part badges in HomeTab:", e);
  }

  try {
    const overridesStr = localStorage.getItem("autoWorld_part_overrides");
    if (overridesStr) {
      const overridesMap = JSON.parse(overridesStr);
      if (overridesMap && typeof overridesMap === "object") {
        list = list.map(p => {
          const override = overridesMap[p.id];
          return override ? { ...p, ...override } : p;
        });
      }
    }
  } catch (e) {
    console.error("Failed to parse custom default parts overrides in HomeTab:", e);
  }

  return list;
}

async function getHomeFeaturedVehicles(): Promise<Vehicle[]> {
  const defaults = getOverriddenVehicles();
  let userListings: UserListing[] = [];

  try {
    const stored = localStorage.getItem("autoWorld_listings");
    if (stored) {
      userListings = JSON.parse(stored);
    }
  } catch (e) {
    console.error("Local storage listings read failed in HomeTab:", e);
  }

  try {
    const querySnapshot = await getDocs(collection(db, "listings"));
    const fetched: UserListing[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserListing;
      fetched.push({ ...data, id: docSnap.id });
    });
    if (fetched.length > 0) {
      userListings = fetched;
    }
  } catch (e) {
    console.warn("Firestore fetch in HomeTab failed, using local fallback:", e);
  }

  const mappedUserListings: Vehicle[] = userListings
    .filter(item => item.status === "active")
    .map((listing, index) => {
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
        year: parseInt(listing.year) || 2023,
        mileage: listing.mileage ? `${parseInt(listing.mileage).toLocaleString()} mi` : "N/A",
        fuel: listing.fuelType ? (listing.fuelType.charAt(0).toUpperCase() + listing.fuelType.slice(1)) : "Petrol",
        transmission: listing.transmission ? (listing.transmission.charAt(0).toUpperCase() + listing.transmission.slice(1)) : "Automatic",
        badge: listing.verified ? "verified" : listing.featured ? "premium" : listing.urgent ? "hot" : null,
        description: listing.description,
        features: listing.features || [],
        category: listing.type,
        isUserListing: true,
        listingId: listing.id,
        sellerName: listing.sellerName,
        sellerEmail: listing.sellerEmail,
        sellerPhone: listing.sellerPhone,
        location: listing.location,
        negotiable: listing.negotiable,
        status: listing.status
      };
    });

  const allVehicles = [
    ...defaults.map(v => ({ ...v, uniqueKey: `default-${v.id}` })),
    ...mappedUserListings.map(v => ({ ...v, uniqueKey: `user-${v.listingId}` }))
  ];

  try {
    const homeFeaturedStr = localStorage.getItem("autoWorld_home_featured_ids");
    if (homeFeaturedStr) {
      const keys: string[] = JSON.parse(homeFeaturedStr);
      if (Array.isArray(keys) && keys.length > 0) {
        const selectedList: Vehicle[] = [];
        keys.forEach(key => {
          const found = allVehicles.find(v => v.uniqueKey === key);
          if (found) {
            const { uniqueKey, ...cleanVehicle } = found;
            selectedList.push(cleanVehicle);
          }
        });
        if (selectedList.length > 0) {
          return selectedList;
        }
      }
    }
  } catch (e) {
    console.error("Failed to load/parse autoWorld_home_featured_ids in HomeTab:", e);
  }

  return defaults.slice(0, 3);
}

export default function HomeTab({ 
  setActiveTab, 
  favorites, 
  toggleFavorite, 
  setSearchFilters, 
  onQuickView,
  onQuickViewPart,
  favoritePartIds = [],
  toggleFavoritePart
}: HomeTabProps) {
  const [activeSearchTab, setActiveSearchTab] = useState<"buy" | "sell">("buy");
  const [selectedType, setSelectedType] = useState("Any Type");
  const [selectedPriceRange, setSelectedPriceRange] = useState("Any Price");
  const [selectedLocation, setSelectedLocation] = useState("");

  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [featuredCars, setFeaturedCars] = useState<Vehicle[]>(() => {
    return getOverriddenVehicles().slice(0, 3);
  });

  // Performance Parts States
  const [featuredParts, setFeaturedParts] = useState<Part[]>(() => {
    return getOverriddenParts().slice(0, 3);
  });
  const [hoveredPartId, setHoveredPartId] = useState<number | string | null>(null);

  // Verified Buyer Testimonials & Auto-Scrolling Carousel State
  const [allTestimonials, setAllTestimonials] = useState<BuyerTestimonial[]>([]);
  const [testimonialsConfig, setTestimonialsConfig] = useState<TestimonialsConfig>(
    DEFAULT_TESTIMONIALS_CONFIG
  );
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [recentlySubmittedCount, setRecentlySubmittedCount] = useState(0);

  const carouselX = useMotionValue(0);
  const carouselTrackRef = useRef<HTMLDivElement>(null);

  const [controlSystems, setControlSystems] = useState<AdminControlSystemsState>(
    DEFAULT_ADMIN_CONTROL_SYSTEMS
  );

  useEffect(() => {
    const unsubTestimonials = subscribeToTestimonials(({ items, config }) => {
      setAllTestimonials(items);
      setTestimonialsConfig(config);
    });
    const unsubControls = subscribeToControlSystems((sys) => {
      setControlSystems(sys);
    });
    return () => {
      unsubTestimonials();
      unsubControls();
    };
  }, []);

  const getSectionMeta = (id: HomepageSectionId, defaultOrder: number) => {
    const found = controlSystems.homepageLayout.sections.find((s) => s.id === id);
    return {
      visible: found ? found.visible : true,
      order: found ? found.order : defaultOrder,
      customTitle: found?.customTitle,
      customSubtitle: found?.customSubtitle,
    };
  };

  const heroMeta = getSectionMeta("hero", 1);
  const featuredCarsMeta = getSectionMeta("featured_cars", 2);
  const motorsportPartsMeta = getSectionMeta("motorsport_parts", 3);
  const howItWorksMeta = getSectionMeta("how_it_works", 4);
  const statsMeta = getSectionMeta("stats", 5);
  const testimonialsMeta = getSectionMeta("testimonials", 6);
  const premiumPromoMeta = getSectionMeta("premium_promo", 7);
  const promoBannerState = isPromoBannerCurrentlyActive(
    controlSystems.homepageLayout.promoBanner
  );

  const publicTestimonials = getPublicDisplayTestimonials(allTestimonials, testimonialsConfig);
  const pendingTestimonialsCount = allTestimonials.filter((t) => t.status === "pending").length;

  // Duplicate list for seamless infinite loop carousel
  const carouselItems =
    publicTestimonials.length > 0
      ? [...publicTestimonials, ...publicTestimonials]
      : [];

  useAnimationFrame((_, delta) => {
    if (
      !testimonialsConfig.isAutoScrollEnabled ||
      isManualPaused ||
      (testimonialsConfig.pauseOnHover && isCarouselHovered) ||
      publicTestimonials.length === 0 ||
      !carouselTrackRef.current
    ) {
      return;
    }

    const halfWidth = carouselTrackRef.current.scrollWidth / 2;
    if (halfWidth <= 0) return;

    const speedPxPerMs =
      testimonialsConfig.scrollSpeed === "slow"
        ? 0.032
        : testimonialsConfig.scrollSpeed === "fast"
        ? 0.115
        : 0.062;

    let nextX = carouselX.get() - delta * speedPxPerMs;
    if (nextX <= -halfWidth) {
      nextX += halfWidth;
    }
    carouselX.set(nextX);
  });

  const handleManualCarouselStep = (dir: "prev" | "next") => {
    if (!carouselTrackRef.current) return;
    const halfWidth = carouselTrackRef.current.scrollWidth / 2;
    if (halfWidth <= 0) return;
    const stepPx = 390;
    let nextX = carouselX.get() + (dir === "prev" ? stepPx : -stepPx);
    if (nextX > 0) {
      nextX -= halfWidth;
    } else if (nextX <= -halfWidth) {
      nextX += halfWidth;
    }
    carouselX.set(nextX);
  };

  // Dynamic Site Content States
  const [heroTitle, setHeroTitle] = useState(() => {
    return localStorage.getItem("autoWorld_hero_title") || "The Aesthetic of Fine Motors.";
  });
  const [heroSubtitle, setHeroSubtitle] = useState(() => {
    return localStorage.getItem("autoWorld_hero_subtitle") || "Refining the pre-owned vehicular trade network through uncompromised mechanical verification, pure high-fidelity listing specifications, and classical typographic clarity.";
  });
  const [heroBadge, setHeroBadge] = useState(() => {
    return localStorage.getItem("autoWorld_hero_badge") || "Volume IV • Issue 12 • Established MMXXVI";
  });
  const [announcementText, setAnnouncementText] = useState(() => {
    return localStorage.getItem("autoWorld_announcement_text") || "🔥 EXCLUSIVE PROMO: Unlimited verified listings and 0% buyer pass markup for all new users this week!";
  });
  const [isAnnouncementEnabled, setIsAnnouncementEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_announcement_enabled");
      if (stored !== null) return JSON.parse(stored);
    } catch (e) {}
    return true;
  });

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeCatalog(({ userListings, userParts, overrides, partOverrides, adminSettings }) => {
      if (adminSettings.heroTitle) setHeroTitle(adminSettings.heroTitle);
      if (adminSettings.heroSubtitle) setHeroSubtitle(adminSettings.heroSubtitle);
      if (adminSettings.heroBadge) setHeroBadge(adminSettings.heroBadge);
      if (adminSettings.announcementText) setAnnouncementText(adminSettings.announcementText);
      if (adminSettings.isAnnouncementEnabled !== undefined) setIsAnnouncementEnabled(adminSettings.isAnnouncementEnabled);

      // --- 1. Vehicles logic ---
      let defaults = [...DEFAULT_VEHICLES];

      if (adminSettings.hiddenDefaultIds && adminSettings.hiddenDefaultIds.length > 0) {
        defaults = defaults.filter(v => !adminSettings.hiddenDefaultIds.includes(v.id));
      }
      if (adminSettings.removedDefaultIds && adminSettings.removedDefaultIds.length > 0) {
        defaults = defaults.filter(v => !adminSettings.removedDefaultIds.includes(v.id));
      }
      if (adminSettings.defaultBadges) {
        defaults = defaults.map(v => {
          const customBadge = adminSettings.defaultBadges[v.id];
          return {
            ...v,
            badge: (customBadge !== undefined ? customBadge : v.badge) as "verified" | "premium" | "hot" | null
          };
        });
      }
      defaults = defaults.map(v => {
        const override = overrides[String(v.id)];
        return override ? { ...v, ...override } : v;
      });

      const mappedUserListings: Vehicle[] = userListings
        .filter(item => item.status === "active" || item.status === undefined)
        .map((listing, index) => {
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
            year: parseInt(listing.year) || 2023,
            mileage: listing.mileage ? `${parseInt(listing.mileage).toLocaleString()} mi` : "N/A",
            fuel: listing.fuelType ? (listing.fuelType.charAt(0).toUpperCase() + listing.fuelType.slice(1)) : "Petrol",
            transmission: listing.transmission ? (listing.transmission.charAt(0).toUpperCase() + listing.transmission.slice(1)) : "Automatic",
            badge: (listing.verified ? "verified" : listing.featured ? "premium" : listing.urgent ? "hot" : null) as "verified" | "premium" | "hot" | null,
            description: listing.description,
            features: listing.features || [],
            category: listing.type,
            isUserListing: true,
            listingId: listing.id,
            sellerName: listing.sellerName,
            sellerEmail: listing.sellerEmail,
            sellerPhone: listing.sellerPhone,
            location: listing.location,
            negotiable: listing.negotiable,
            status: listing.status
          };
        });

      const allVehicles = [
        ...defaults.map(v => ({ ...v, uniqueKey: `default-${v.id}` })),
        ...mappedUserListings.map(v => ({ ...v, uniqueKey: `user-${v.listingId}` }))
      ];

      if (adminSettings.homeFeaturedIds && adminSettings.homeFeaturedIds.length > 0) {
        const selectedList: Vehicle[] = [];
        adminSettings.homeFeaturedIds.forEach(key => {
          const found = allVehicles.find(v => String(v.uniqueKey) === String(key));
          if (found) {
            const { uniqueKey, ...cleanVehicle } = found;
            selectedList.push(cleanVehicle);
          }
        });
        if (selectedList.length > 0) {
          setFeaturedCars(selectedList);
        } else {
          setFeaturedCars(defaults.slice(0, 3));
        }
      } else {
        setFeaturedCars(defaults.slice(0, 3));
      }

      // --- 2. Performance Parts logic ---
      let pDefaults = getOverriddenParts();
      if (adminSettings.hiddenPartIds && adminSettings.hiddenPartIds.length > 0) {
        pDefaults = pDefaults.filter(p => !adminSettings.hiddenPartIds?.includes(p.id));
      }
      if (adminSettings.removedPartIds && adminSettings.removedPartIds.length > 0) {
        pDefaults = pDefaults.filter(p => !adminSettings.removedPartIds?.includes(p.id));
      }
      if (adminSettings.partBadges) {
        pDefaults = pDefaults.map(p => {
          const customB = adminSettings.partBadges?.[String(p.id)];
          return {
            ...p,
            badge: (customB !== undefined ? customB : p.badge) as any
          };
        });
      }
      if (partOverrides) {
        pDefaults = pDefaults.map(p => {
          const customOver = partOverrides[String(p.id)];
          return customOver ? { ...p, ...customOver } : p;
        });
      }

      const mappedUserParts: Part[] = (userParts || [])
        .filter(item => item.status === "active" || item.status === undefined)
        .map((p, idx) => ({
          id: p.id || `user-part-${idx}`,
          title: p.title,
          category: p.category,
          rarity: p.rarity,
          condition: (p.condition as any) || 5,
          brand: p.brand,
          price: p.price,
          image: p.photos && p.photos.length > 0 ? p.photos[0].src : "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
          photos: p.photos,
          compatibleVehicles: p.compatibleVehicles,
          description: p.description,
          specifications: p.specifications,
          sellerName: p.sellerName,
          sellerPhone: p.sellerPhone,
          sellerEmail: p.sellerEmail,
          location: p.location,
          negotiable: p.negotiable,
          badge: (p.verified ? "verified" : p.featured ? "premium" : p.urgent ? "hot" : null) as any,
          status: p.status,
          isUserListing: true,
          listingId: p.id,
          partNumber: p.partNumber,
          warranty: p.warranty
        }));

      const allPartsCombined = [
        ...pDefaults.map(p => ({ ...p, uniqueKey: `default-${p.id}` })),
        ...mappedUserParts.map(p => ({ ...p, uniqueKey: `user-${p.listingId}` }))
      ];

      if (adminSettings.homeFeaturedPartIds && adminSettings.homeFeaturedPartIds.length > 0) {
        const selectedParts: Part[] = [];
        adminSettings.homeFeaturedPartIds.forEach(key => {
          const found = allPartsCombined.find(p => String(p.uniqueKey) === String(key) || String(p.id) === String(key));
          if (found) {
            const { uniqueKey, ...cleanPart } = found;
            selectedParts.push(cleanPart as Part);
          }
        });
        if (selectedParts.length > 0) {
          setFeaturedParts(selectedParts);
        } else {
          setFeaturedParts(pDefaults.slice(0, 3));
        }
      } else {
        setFeaturedParts(allPartsCombined.map(({ uniqueKey, ...c }) => c as Part).slice(0, 3));
      }
    });

    const handleLocalUpdate = () => {
      const storedT = localStorage.getItem("autoWorld_hero_title");
      if (storedT) setHeroTitle(storedT);
      const storedS = localStorage.getItem("autoWorld_hero_subtitle");
      if (storedS) setHeroSubtitle(storedS);
      const storedB = localStorage.getItem("autoWorld_hero_badge");
      if (storedB) setHeroBadge(storedB);
      const storedA = localStorage.getItem("autoWorld_announcement_text");
      if (storedA) setAnnouncementText(storedA);
      const storedE = localStorage.getItem("autoWorld_is_announcement_enabled");
      if (storedE !== null) {
        try { setIsAnnouncementEnabled(JSON.parse(storedE)); } catch (e) {}
      }
    };
    window.addEventListener("autoWorld_db_update", handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener("autoWorld_db_update", handleLocalUpdate);
    };
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
      className="bg-[#F4F1EA] text-[#1A1A1A] font-sans overflow-hidden animate-in fade-in duration-300 flex flex-col"
    >
      {/* Editorial Split Hero Section */}
      {heroMeta.visible && (
      <motion.section
        style={{ order: heroMeta.order }}
        variants={itemVariants}
        className="relative border-b border-[#1A1A1A]/10 w-full"
      >
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Primary Narrative */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
            className="lg:col-span-7 p-8 sm:p-12 md:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#1A1A1A]/10"
          >
            <div>
              <span className="text-xs sm:text-sm font-sans uppercase tracking-[0.28em] text-stone-800 font-bold mb-6 block">
                {heroBadge}
              </span>
              <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif font-black tracking-tight leading-[0.92] text-stone-950 mb-8 select-none">
                {heroTitle === "The Aesthetic of Fine Motors." ? (
                  <>
                    <span className="font-serif font-black">The </span>
                    <span className="italic font-normal text-stone-800 pr-1 font-editorial-serif" style={{ fontFamily: '"Instrument Serif", Fraunces, Georgia, serif', fontStyle: 'italic' }}>
                      Aesthetic
                    </span>
                    <br />
                    <span className="font-serif font-black">of Fine Motors.</span>
                  </>
                ) : (
                  heroTitle
                )}
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed text-stone-800 max-w-xl font-sans font-normal mb-10 tracking-tight">
                {heroSubtitle}
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
            className="lg:col-span-5 p-4 sm:p-8 lg:p-10 bg-stone-900 text-[#F4F1EA] flex flex-col justify-center rounded-xl shadow-xl"
          >
            <div className="bg-[#FAF8F5] text-stone-950 p-6 sm:p-8 rounded-lg shadow-md border border-stone-300">
              
              {/* Tab options */}
              <div className="flex border-b border-stone-250 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveSearchTab("buy")}
                  className={`pb-3.5 px-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition relative cursor-pointer flex items-center gap-2 ${
                    activeSearchTab === "buy" ? "text-stone-950" : "text-stone-400 hover:text-stone-700"
                  }`}
                >
                  <Search className="w-4 h-4 text-amber-600" />
                  <span>Buy a Car</span>
                  {activeSearchTab === "buy" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-stone-950 rounded-t-sm" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSearchTab("sell")}
                  className={`pb-3.5 px-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition relative cursor-pointer flex items-center gap-2 ${
                    activeSearchTab === "sell" ? "text-stone-950" : "text-stone-400 hover:text-stone-700"
                  }`}
                >
                  <Car className="w-4 h-4 text-amber-600" />
                  <span>Sell a Car</span>
                  {activeSearchTab === "sell" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-stone-950 rounded-t-sm" />
                  )}
                </button>
              </div>

              {/* BUY FORM */}
              {activeSearchTab === "buy" && (
                <form onSubmit={handleSearchSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="home-type-select" className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                      Car Type
                    </label>
                    <select
                      id="home-type-select"
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 rounded-md text-stone-950 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-950 focus:border-stone-950 transition-all cursor-pointer"
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
                    <label htmlFor="home-price-select" className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                      Budget Range
                    </label>
                    <select
                      id="home-price-select"
                      value={selectedPriceRange}
                      onChange={(e) => setSelectedPriceRange(e.target.value)}
                      className="w-full px-3.5 py-3 bg-[#F4F1EA] border border-stone-300 rounded-md text-stone-950 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-950 focus:border-stone-950 transition-all cursor-pointer"
                    >
                      <option>Any Price</option>
                      <option>Under ₹5 Lakhs</option>
                      <option>₹5 Lakhs - ₹15 Lakhs</option>
                      <option>₹15 Lakhs - ₹30 Lakhs</option>
                      <option>Over ₹30 Lakhs</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="home-location-input" className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                      City / Location
                    </label>
                    <div className="relative">
                      <MapPin aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 w-4 h-4" />
                      <input
                        id="home-location-input"
                        type="text"
                        placeholder="Type city e.g. Mumbai, Delhi, Pune..."
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#F4F1EA] border border-stone-300 rounded-md text-stone-950 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-950 focus:border-stone-950 transition-all"
                      />
                    </div>
                    {/* Quick popular city tags */}
                    <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-600">
                      <span className="font-semibold text-stone-500">Popular:</span>
                      {["Mumbai", "Delhi", "Pune", "Bengaluru", "Jaipur", "Gurugram"].map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => setSelectedLocation(city)}
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold transition cursor-pointer ${
                            selectedLocation.toLowerCase().includes(city.toLowerCase())
                              ? "bg-stone-950 text-white border-stone-950"
                              : "bg-stone-200/70 hover:bg-stone-300 text-stone-800 border-stone-300"
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-stone-950 text-white text-xs sm:text-sm font-sans font-bold uppercase tracking-wider rounded-md hover:bg-stone-800 active:scale-[0.99] cursor-pointer transition shadow-md flex items-center justify-center gap-2 mt-2"
                  >
                    <Search className="w-4 h-4 text-amber-400" />
                    <span>Search Available Cars</span>
                  </button>
                </form>
              )}

              {/* SELL CONTEXT */}
              {activeSearchTab === "sell" && (
                <div className="text-center py-4 space-y-4">
                  <h2 className="text-base font-bold text-stone-950">Sell Your Car Commission-Free</h2>
                  <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto font-sans font-medium">
                    Post your vehicle details, add photos, set your price, and connect directly with verified buyers.
                  </p>
                  <div className="w-full grid grid-cols-3 gap-2 py-2">
                    <div className="p-2.5 bg-[#F4F1EA] border border-stone-300 rounded-md text-center">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-950 block">1. Details</span>
                    </div>
                    <div className="p-2.5 bg-[#F4F1EA] border border-stone-300 rounded-md text-center">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-950 block">2. Photos</span>
                    </div>
                    <div className="p-2.5 bg-[#F4F1EA] border border-stone-300 rounded-md text-center">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-950 block">3. Publish</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("sell")}
                    className="w-full py-4 bg-stone-950 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-md flex items-center justify-center gap-2 cursor-pointer transition shadow-md"
                  >
                    <span>List Your Car Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          </motion.div>

        </div>
      </motion.section>
      )}

      {/* Section 2: Featured vehicles Grid */}
      {featuredCarsMeta.visible && (
      <motion.section
        style={{ order: featuredCarsMeta.order }}
        variants={itemVariants}
        className="py-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#1A1A1A]/10"
      >
        <div className="flex flex-col md:flex-row justify-between items-baseline gap-4 mb-10 border-b border-stone-300 pb-6">
          <div>
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-stone-500 font-bold block mb-1">
              {featuredCarsMeta.customSubtitle || "Pristine Specimens Currently Catalogued"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-stone-900">
              {featuredCarsMeta.customTitle || "Featured Premium Collections"}
            </h2>
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
                className="bg-[#FAF8F5] border border-stone-200/90 rounded-2xl overflow-hidden flex flex-col group transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:border-stone-400 relative animate-in fade-in zoom-in-95"
              >
                {/* Media frame */}
                <div className="relative h-56 overflow-hidden bg-stone-200 grayscale-20 hover:grayscale-0 transition-all duration-500">
                  <img
                    src={car.image}
                    alt={car.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                    }}
                  />
                  
                  {car.badge && (
                    <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-stone-950/90 text-[#F4F1EA] text-[9px] font-bold uppercase tracking-[0.15em] border border-[#F4F1EA]/20 rounded-lg shadow-md backdrop-blur-xs">
                      {car.badge}
                    </span>
                  )}
                </div>

                {/* Info block */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1 flex-wrap">
                      <span className="text-[9px] font-mono tracking-widest text-stone-400 block uppercase">REF #AW0{car.id}</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {(() => {
                          const kycBadge = getSellerTrustBadge(car.sellerEmail, car.sellerName);
                          if (kycBadge) {
                            return (
                              <span className="text-[9px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wider border border-amber-300 flex items-center gap-1">
                                <ShieldCheck className="w-2.5 h-2.5 text-amber-700" />
                                {kycBadge.badgeTier}
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {car.badge === "verified" && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-emerald-200">Verified</span>
                        )}
                      </div>
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(car.id);
                        }}
                        className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                          isFav
                            ? "bg-stone-950 border-stone-950 text-white hover:bg-stone-800"
                            : "bg-[#FAF8F5] border-stone-300 text-stone-600 hover:text-stone-950 hover:border-stone-400"
                        }`}
                        title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        <AnimatedFavoriteHeart isFav={isFav} className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => onQuickView(car)}
                        className="px-4 py-2.5 bg-stone-950 hover:bg-stone-800 text-[#F4F1EA] text-xs font-sans uppercase font-bold tracking-widest border border-stone-950 rounded-xl transition-all duration-300 cursor-pointer shadow-xs"
                      >
                        View Dossier
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
      )}

      {/* Section 2.5: Performance Hardware & Curated Parts Marketplace Showcase */}
      {motorsportPartsMeta.visible && (
      <motion.section
        style={{ order: motorsportPartsMeta.order }}
        variants={itemVariants}
        className="py-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#1A1A1A]/10"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-[#1A1A1A]/10 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-stone-950">
              {motorsportPartsMeta.customTitle || "Curated Motorsport Parts & Upgrades"}
            </h2>
            <p className="text-stone-700 text-sm font-sans mt-1 max-w-2xl">
              {motorsportPartsMeta.customSubtitle ||
                "Factory OEM components, high-flow turbochargers, aero kits, and verified performance hardware."}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab("buy");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="group flex items-center gap-2 text-stone-900 hover:text-stone-600 font-sans uppercase font-bold text-xs tracking-widest transition-colors cursor-pointer bg-transparent border-none p-0 focus:outline-none"
            >
              <span>Examine Inventory Room</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* 3-Column Performance Parts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredParts.map((part) => {
              const rarityMeta = PART_RARITY_TIERS[part.rarity] || PART_RARITY_TIERS.Common;
              const conditionMeta = PART_CONDITION_LABELS[part.condition] || PART_CONDITION_LABELS[5];
              const isHovered = hoveredPartId === part.id;
              const displayImage = part.photos && part.photos.length > 0 ? part.photos[0].src : (part.image || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800");

              // Badge styling per prompt specification
              let badgeStyle = "bg-stone-200 text-stone-800 border-stone-300";
              let badgeGlow = "";
              if (part.rarity === "Common") {
                badgeStyle = "bg-slate-200 text-slate-800 border-slate-300";
              } else if (part.rarity === "Uncommon") {
                badgeStyle = "bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]";
              } else if (part.rarity === "Rare") {
                badgeStyle = "bg-blue-950 text-blue-300 border-blue-500/50 shadow-[0_0_14px_rgba(59,130,246,0.35)]";
              } else if (part.rarity === "Epic") {
                badgeStyle = "bg-purple-950 text-purple-300 border-purple-500/60 shadow-[0_0_18px_rgba(168,85,247,0.4)]";
              } else if (part.rarity === "Legendary") {
                badgeStyle = "bg-amber-950 text-amber-300 border-amber-400 ring-1 ring-amber-400/50 shadow-[0_0_22px_rgba(245,158,11,0.5)] animate-pulse";
              }

              const isPartFav = favoritePartIds.some(fav => String(fav) === String(part.id) || (part.listingId && String(fav) === String(part.listingId)));
              const cleanPhone = (part.sellerPhone || "+919820011988").replace(/[^0-9]/g, "");
              const waMessage = encodeURIComponent(
                `Hello ${part.sellerName || "Seller"}, I am inquiring about "${part.title}" (Ref #PART-AW0${part.id}, ₹${part.price.toLocaleString("en-IN")}) listed on Auto World Motorsport Marketplace.`
              );
              const waUrl = `https://wa.me/${cleanPhone}?text=${waMessage}`;

              return (
                <motion.div
                  key={part.id}
                  onMouseEnter={() => setHoveredPartId(part.id)}
                  onMouseLeave={() => setHoveredPartId(null)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="bg-[#FAF8F5] border border-stone-200/90 rounded-2xl flex flex-col justify-between group overflow-hidden transition-all duration-300 hover:border-amber-600/70 shadow-sm hover:shadow-xl relative"
                >
                  {/* Top Image Showcase with Zoom on Hover */}
                  <div className="relative h-60 w-full overflow-hidden bg-stone-900 border-b border-stone-200/90">
                    <img
                      src={displayImage}
                      alt={part.title}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800";
                      }}
                    />

                    {/* Rarity & Verified Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                      <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-lg border ${badgeStyle}`}>
                        {part.rarity}
                      </span>
                      {part.badge === "verified" && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg flex items-center gap-1 shadow-sm">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Accredited
                        </span>
                      )}
                    </div>

                    {/* Category Stamp */}
                    <div className="absolute bottom-3 right-3 px-2.5 py-0.5 bg-stone-950/85 text-stone-200 text-[9px] font-mono uppercase tracking-widest rounded-lg border border-stone-700/80 backdrop-blur-xs">
                      {part.category.replace("_", " ")}
                    </div>

                    {/* Interactive Wishlist Heart Button */}
                    {toggleFavoritePart && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoritePart(part.id);
                        }}
                        className={`absolute top-3 right-3 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md z-10 active:scale-90 ${
                          isPartFav
                            ? "bg-red-600 border-red-400 text-white shadow-red-600/40 scale-105"
                            : "bg-stone-900/85 hover:bg-stone-900 text-stone-300 hover:text-white border-stone-700 hover:scale-105"
                        }`}
                        aria-label={isPartFav ? "Remove part from favorites" : "Save part to favorites"}
                        title={isPartFav ? "Saved to Favorites" : "Add to Favorites"}
                      >
                        <Heart
                          className={`w-4 h-4 transition-transform ${
                            isPartFav ? "fill-white text-white scale-110" : "text-stone-300 hover:text-red-400"
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col justify-between flex-1 space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold">
                          {part.brand}
                        </span>
                        <div className="flex items-center gap-0.5" title={`${part.condition}/5 Condition`}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= part.condition ? "text-amber-500 fill-amber-500" : "text-stone-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <h3 
                        onClick={(e) => {
                          if (onQuickViewPart) onQuickViewPart(part, { x: e.clientX, y: e.clientY });
                        }}
                        className="font-serif font-black text-stone-950 text-lg leading-snug line-clamp-2 cursor-pointer hover:underline"
                      >
                        {part.title}
                      </h3>

                      {/* Compatible Fitment */}
                      <div className="mt-3 p-2.5 bg-[#F4F1EA] border border-stone-200/90 rounded-xl text-[11px] font-sans flex items-start gap-2">
                        <Wrench className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-stone-700 line-clamp-1">
                          <span className="font-bold text-stone-900">Fitment: </span>
                          {part.compatibleVehicles || "Universal Specification"}
                        </div>
                      </div>
                    </div>

                    {/* Price & Action Row */}
                    <div className="pt-3 border-t border-stone-200 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-stone-400 block uppercase font-light font-sans">Valuation</span>
                          <span className="text-2xl font-serif font-black text-stone-950">
                            ₹{part.price.toLocaleString("en-IN")}
                          </span>
                        </div>
                        {part.negotiable === "yes" && (
                          <span className="text-[10px] font-mono px-2.5 py-0.5 bg-stone-200 text-stone-700 rounded-lg">
                            Negotiable
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={(e) => {
                            if (onQuickViewPart) {
                              onQuickViewPart(part, { x: e.clientX, y: e.clientY });
                            }
                          }}
                          className="w-full py-2.5 bg-stone-950 hover:bg-stone-800 text-white text-[11px] font-sans uppercase font-bold tracking-wider rounded-xl border border-stone-950 transition-all duration-300 cursor-pointer text-center"
                        >
                          Examine Part Dossier
                        </button>
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-sans uppercase font-bold tracking-wider rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs text-center"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Seller</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </motion.section>
      )}

      {/* Section 3: Process Steps */}
      {howItWorksMeta.visible && (
      <motion.section
        style={{ order: howItWorksMeta.order }}
        variants={itemVariants}
        className="py-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#1A1A1A]/10"
      >
        <div className="text-center max-w-xl mx-auto mb-16">
          <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-stone-600 block mb-1.5 font-bold">
            {howItWorksMeta.customSubtitle || "How It Works"}
          </span>
          <h2 className="text-3xl font-serif font-black text-stone-950">
            {howItWorksMeta.customTitle || "Simple Steps to Buy or Sell"}
          </h2>
          <p className="text-stone-700 text-sm font-sans mt-1">A safe and easy way to connect buyers and sellers.</p>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              step: "01", 
              title: "Browse Cars", 
              points: [
                "Filter by price, model, or style",
                "Check vehicle details and features",
                "View clear HD photos"
              ] 
            },
            { 
              step: "02", 
              title: "Check Details", 
              points: [
                "See real engine & mileage specs",
                "Check ownership & condition",
                "Compare fair market prices"
              ] 
            },
            { 
              step: "03", 
              title: "Contact Owner", 
              points: [
                "Connect with real car owners",
                "Call or message via WhatsApp",
                "Ask questions directly"
              ] 
            },
            { 
              step: "04", 
              title: "Buy & Drive", 
              points: [
                "Verify paper registration",
                "Take a test drive in person",
                "Complete the purchase safely"
              ] 
            }
          ].map((item, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, type: "spring", stiffness: 90, damping: 15 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="bg-[#FAF8F5] p-8 border border-stone-900/20 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="text-3xl font-serif font-light text-stone-600 border-b border-stone-300 pb-3 mb-4 flex justify-between items-baseline">
                  <span>{item.step}</span>
                  <span className="text-[10px] uppercase font-sans tracking-widest text-stone-600 font-bold">Step</span>
                </div>
                <h3 className="text-sm uppercase tracking-wider font-bold text-stone-950 mb-3">{item.title}</h3>
                <ul className="space-y-2 text-stone-800 text-xs font-sans font-medium">
                  {item.points.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <span className="text-stone-950 font-bold">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
      )}

      {/* Section 4: Statistics */}
      {statsMeta.visible && (
      <motion.section
        style={{ order: statsMeta.order }}
        variants={itemVariants}
        className="bg-stone-950 text-white py-16 border-b border-[#1A1A1A]/10 w-full"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-stone-800">
            {controlSystems.homepageLayout.stats.map((statItem) => (
              <div key={statItem.id} className="space-y-1">
                <div className="text-4xl sm:text-5xl font-serif font-light text-white tabular-nums">
                  {statItem.value}
                </div>
                <p className="text-stone-300 text-xs md:text-[10px] uppercase tracking-widest font-sans font-bold">
                  {statItem.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
      )}

      {/* Section 4.5: Verified Buyer & Seller Testimonials */}
      {testimonialsConfig.isSectionVisible && testimonialsMeta.visible && (
        <motion.section
          style={{ order: testimonialsMeta.order }}
          variants={itemVariants}
          className="py-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#1A1A1A]/10 overflow-hidden"
        >
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 pb-6 border-b border-stone-300">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-950 text-[#F4F1EA] rounded-lg border border-stone-800 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-sans uppercase tracking-[0.2em] font-bold">
                    {testimonialsConfig.sectionBadge || "Authenticated Ledger Feedback"}
                  </span>
                </div>
              </div>

              <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-stone-950">
                {testimonialsConfig.sectionTitle || "Verified Buyer Testimonials"}
              </h2>
              <p className="text-stone-700 text-sm font-sans mt-1 max-w-2xl">
                {testimonialsConfig.sectionSubtitle ||
                  "Unedited dispatches from collectors, enthusiasts, and motorsport builders who completed verified acquisitions through Auto World."}
              </p>
            </div>

            {/* Carousel Controls & Submit Testimonial Trigger */}
            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
              <div className="inline-flex items-center gap-1 bg-[#FAF8F5] border border-stone-300 rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleManualCarouselStep("prev")}
                  className="w-8 h-8 rounded-lg hover:bg-stone-950 text-stone-800 hover:text-[#F4F1EA] flex items-center justify-center cursor-pointer transition"
                  title="Previous Testimonial"
                  aria-label="Previous Testimonial"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleManualCarouselStep("next")}
                  className="w-8 h-8 rounded-lg hover:bg-stone-950 text-stone-800 hover:text-[#F4F1EA] flex items-center justify-center cursor-pointer transition"
                  title="Next Testimonial"
                  aria-label="Next Testimonial"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {testimonialsConfig.allowPublicSubmissions !== false && (
                <button
                  type="button"
                  onClick={() => setShowSubmitForm((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-xs border ${
                    showSubmitForm
                      ? "bg-amber-500 text-stone-950 border-amber-600"
                      : "bg-stone-950 hover:bg-stone-800 text-[#F4F1EA] border-stone-950"
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{showSubmitForm ? "Close Submission Form" : "Submit Your Testimonial"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Expandable 'Submit Your Testimonial' Form for Verified Buyers & Sellers */}
          <AnimatePresence>
            {showSubmitForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mb-12 overflow-hidden"
              >
                <SubmitTestimonialForm
                  onSubmitted={() => {
                    setRecentlySubmittedCount((c) => c + 1);
                  }}
                  onCancel={() => setShowSubmitForm(false)}
                  onNavigateTab={setActiveTab}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Testimonials Carousel Viewport */}
          {publicTestimonials.length === 0 ? (
            <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl p-12 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-stone-400 mx-auto" />
              <h3 className="text-lg font-serif font-bold text-stone-900">
                No Verified Testimonials Currently Displayed
              </h3>
              <p className="text-xs text-stone-600 max-w-md mx-auto">
                Reviews from verified buyers and sellers will appear here once published.
              </p>
            </div>
          ) : (
            <div
              onMouseEnter={() => setIsCarouselHovered(true)}
              onMouseLeave={() => setIsCarouselHovered(false)}
              className="relative w-full overflow-hidden py-2 select-none"
            >
              {/* Subtle left/right editorial gradient fade masks */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-[#F4F1EA] to-transparent z-20" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-[#F4F1EA] to-transparent z-20" />

              <motion.div
                ref={carouselTrackRef}
                style={{ x: carouselX }}
                className="flex items-stretch gap-6 w-max"
              >
                {carouselItems.map((review, index) => (
                  <motion.div
                    key={`${review.id}-${index}`}
                    whileHover={{ y: -6, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className="w-[330px] sm:w-[380px] shrink-0 bg-[#FAF8F5] border border-stone-200/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-stone-400 transition-colors duration-300 relative group"
                  >
                    <div>
                      {/* Top Bar: Star Rating & Verified Purchase/Seller Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-stone-200/90">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="flex items-center gap-0.5"
                            aria-label={`Rated ${review.rating} out of 5 stars`}
                          >
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= Math.round(review.rating)
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-stone-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-mono font-bold text-stone-900 ml-1">
                            {review.rating.toFixed(1)}
                          </span>
                        </div>

                        {review.verifiedPurchase !== false && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            {review.transactionRole || "Verified Purchase"}
                          </span>
                        )}
                      </div>

                      {/* Purchased Vehicle / Part Tag */}
                      <div className="mb-4 p-3 bg-[#F4F1EA] border border-stone-200/90 rounded-xl flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          {review.itemCategory === "Vehicle Acquisition" ? (
                            <Car className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          ) : (
                            <Wrench className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 block">
                              {review.itemCategory} • {review.dossierRef}
                            </span>
                            <span className="text-xs font-serif font-bold text-stone-950 truncate block">
                              {review.purchasedItem}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Buyer Review Comment */}
                      <div className="relative mb-5">
                        <Quote className="w-6 h-6 text-stone-200 absolute -top-1 -left-1 pointer-events-none select-none" />
                        <p className="text-stone-700 text-xs sm:text-sm font-sans leading-relaxed pl-4 relative z-10 italic">
                          "{review.comment}"
                        </p>
                      </div>

                      {/* Image Verification Placeholders / Attachments */}
                      {review.verificationImages && review.verificationImages.length > 0 && (
                        <div className="mb-5 pt-3 border-t border-stone-200/70">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 flex items-center gap-1 font-bold">
                              <Camera className="w-3 h-3 text-emerald-700" />
                              Verified Proof Attachments
                            </span>
                            <span className="text-[9px] font-mono text-emerald-700 font-bold">
                              ✓ Authenticated
                            </span>
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {review.verificationImages.map((vImg) => (
                              <div
                                key={vImg.id}
                                className="flex items-center gap-2 p-1.5 bg-[#F4F1EA] border border-stone-200/90 rounded-lg shrink-0"
                              >
                                <img
                                  src={vImg.imageUrl}
                                  alt={vImg.label}
                                  className="w-8 h-8 rounded object-cover border border-stone-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=600&auto=format&fit=crop&q=80";
                                  }}
                                />
                                <span className="text-[10px] font-sans font-semibold text-stone-800 max-w-[120px] truncate pr-1">
                                  {vImg.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Buyer Footer Metadata */}
                    <div className="pt-4 border-t border-stone-200/90 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-stone-950 text-amber-400 font-serif font-bold text-sm flex items-center justify-center shrink-0 border border-stone-800">
                          {review.buyerName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-sans font-bold text-stone-950 truncate">
                            {review.buyerName}
                          </h3>
                          <p className="text-[11px] font-sans text-stone-500 truncate">
                            {review.buyerTitle}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-stone-700">
                          <MapPin className="w-3 h-3 text-amber-700 shrink-0" />
                          {review.location}
                        </span>
                        <span className="block text-[9px] font-mono uppercase tracking-wider text-stone-400 mt-0.5">
                          {review.purchaseDate}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </motion.section>
      )}

      {/* Section 5: Premium Promo */}
      {premiumPromoMeta.visible && (
      <motion.section
        style={{ order: premiumPromoMeta.order }}
        variants={itemVariants}
        className="py-24 bg-[#E0DBCF] text-[#1A1A1A] relative overflow-hidden w-full"
      >
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-6">
          <Crown className="w-12 h-12 text-stone-950 mx-auto" />
          <span className="text-[10px] tracking-[0.3em] font-sans font-bold uppercase block text-stone-800">
            {premiumPromoMeta.customSubtitle || "Auto World Premium"}
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-black tracking-tight text-stone-950">
            {premiumPromoMeta.customTitle || "Upgrade to Premium Membership"}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left text-xs font-sans font-semibold text-stone-900 bg-[#F4F1EA]/80 p-5 border border-stone-400 rounded-xl shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
              <span>Direct Phone & WhatsApp Numbers</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
              <span>Saved Message & Inquiry History</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
              <span>Featured Car Placement on Home Page</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
              <span>Verified Gold Seller Badge</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setActiveTab("premium")}
              className="px-8 py-4 bg-stone-950 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-widest transition cursor-pointer shadow-md rounded-xl"
            >
              View Premium Plans
            </button>
          </div>
        </div>
      </motion.section>
      )}

    </motion.div>
  );
}
