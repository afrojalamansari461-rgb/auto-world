import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Database, Trash2, Mail, Phone, Calendar, Heart, 
  Search, CheckCircle, RefreshCw, BarChart3, Tag, MessageSquare, 
  Crown, ExternalLink, Sparkles, Filter, Check, Eye
} from "lucide-react";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Vehicle, DEFAULT_VEHICLES, UserListing } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface AdminPanelProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  currentUser: User | null;
  onQuickView: (vehicle: Vehicle) => void;
  setActiveTab: (tab: string) => void;
}

interface FirestoreMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  date: string;
}

interface FirestoreBuyerPass {
  id: string;
  userId: string;
  paid: boolean;
  date: string;
}

interface FirestoreFeedback {
  id: string;
  text: string;
  category: "bug_report" | "suggestion" | "question" | "praise";
  name?: string;
  email?: string;
  timestamp: string;
  status: "active" | "archived" | "resolved";
}

export default function AdminPanel({ showToast, currentUser, onQuickView, setActiveTab }: AdminPanelProps) {
  const [listings, setListings] = useState<UserListing[]>([]);
  const [messages, setMessages] = useState<FirestoreMessage[]>([]);
  const [passes, setPasses] = useState<FirestoreBuyerPass[]>([]);
  const [feedbacks, setFeedbacks] = useState<FirestoreFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubSection, setActiveSubSection] = useState<"inventory" | "leads" | "payments" | "feedback">("inventory");
  
  // Custom states for spectacular welcome intro sequence and floating animations
  const [isIntroActive, setIsIntroActive] = useState(true);
  const [introProgress, setIntroProgress] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Simple, modern high-tech synth tone generator for ultimate futuristic feedback
  const playSynthBeep = (freq = 800, duration = 0.1, type: OscillatorType = "sine") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignored if browser policy blocks instant playback before gesture
    }
  };

  useEffect(() => {
    const isAuthorizedUser = currentUser?.email === "afrojalamansari461@gmail.com";
    if (isAuthorizedUser) {
      // Initialize some cool logs sequentially
      const logTemplates = [
        "[SYS_READY] INITIALIZING AUTOMOTIVE LEDGER ARCHITECTURE CORE...",
        "[DB_STATE] SECURING WEB AUDIO CHANNELS & AMPLITUDES...",
        "[INDEX_SYNC] CONNECTING DYNAMIC FIRESTORE LISTINGS CHANNELS...",
        "[MEM_ALLOC] ALLOCATING NEON GRID COORDINATES AND POLAR MATRICES...",
        "[AUTH_OK] USER VERIFIED: LEVEL 5 ACCESS LEVEL REGISTERED.",
        "[RENDER_INIT] PREPARING BULK CONTROLS FOR ALL PLATFORM VEHICLES...",
        "[COMPLETE] BOOT SEQUENCES ALIGNED. ACTIVE MONITORING SYSTEM ARMED."
      ];

      let logIdx = 0;
      const logInterval = setInterval(() => {
        if (logIdx < logTemplates.length) {
          setTerminalLogs((prev) => [...prev, logTemplates[logIdx]]);
          playSynthBeep(440 + logIdx * 80, 0.08, "triangle");
          logIdx++;
        } else {
          clearInterval(logInterval);
        }
      }, 400);

      const interval = setInterval(() => {
        setIntroProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          const increment = Math.floor(Math.random() * 14) + 6;
          const next = prev + increment;
          if (next >= 100) {
            playSynthBeep(1200, 0.35, "sine");
            return 100;
          }
          // Play mini click beep
          playSynthBeep(600 + prev * 3, 0.04, "sine");
          return next;
        });
      }, 150);

      const timeout = setTimeout(() => {
        setIsIntroActive(false);
      }, 3600);

      return () => {
        clearInterval(interval);
        clearInterval(logInterval);
        clearTimeout(timeout);
      };
    } else {
      setIsIntroActive(false);
    }
  }, [currentUser]);

  // States for hidden default vehicles stored in localStorage to customize catalogs
  const [hiddenDefaultIds, setHiddenDefaultIds] = useState<number[]>([]);
  
  // Custom badges for hardcoded default vehicles to control them
  const [defaultBadges, setDefaultBadges] = useState<Record<number, string | null>>({});

  // Active inventory viewer filter (controlling all cars, user list, or defaults)
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "user" | "default">("all");

  // Search filter inside admin panel
  const [adminSearch, setAdminSearch] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    
    // 1. Load Listings
    try {
      const listingsSnapshot = await getDocs(collection(db, "listings"));
      const loadedListings: UserListing[] = [];
      listingsSnapshot.forEach((docSnap) => {
        loadedListings.push({ 
          ...docSnap.data() as UserListing, 
          id: docSnap.id 
        });
      });
      setListings(loadedListings);
    } catch (err: any) {
      console.warn("Failed to load listings:", err);
      // Under the firebase integration skill instructions, we MUST call handleFirestoreError
      try {
        handleFirestoreError(err, OperationType.GET, "listings");
      } catch (e: any) {
        const errMsg = e instanceof Error ? e.message : String(e);
        if (errMsg.toLowerCase().includes("offline") || errMsg.toLowerCase().includes("unavailable")) {
          console.warn("Offline database status noticed during listings load:", errMsg);
        } else {
          console.error("SDK handoff exception caught for listings collection:", e);
        }
      }
      showToast("Could not load vehicle listings database index.", "error");
    }

    // 2. Load Contact Messages / Leads
    try {
      const messagesSnapshot = await getDocs(collection(db, "messages"));
      const loadedMessages: FirestoreMessage[] = [];
      messagesSnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        loadedMessages.push({
          id: docSnap.id,
          name: d.name || "Anonymous",
          email: d.email || "",
          subject: d.subject || "No Subject",
          message: d.message || "",
          date: d.date || new Date().toISOString()
        });
      });
      loadedMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMessages(loadedMessages);
    } catch (err: any) {
      console.warn("Failed to load messages:", err);
      try {
        handleFirestoreError(err, OperationType.GET, "messages");
      } catch (e: any) {
        const errMsg = e instanceof Error ? e.message : String(e);
        if (errMsg.toLowerCase().includes("offline") || errMsg.toLowerCase().includes("unavailable")) {
          console.warn("Offline database status noticed during messages load:", errMsg);
        } else {
          console.error("SDK handoff exception caught for messages collection:", e);
        }
      }
      showToast("Access restrictions on Buyer Inquiries collection.", "info");
    }

    // 3. Load Buyer Passes / Payments
    try {
      const passesSnapshot = await getDocs(collection(db, "buyer_passes"));
      const loadedPasses: FirestoreBuyerPass[] = [];
      passesSnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        loadedPasses.push({
          id: docSnap.id,
          userId: d.userId || docSnap.id,
          paid: d.paid || false,
          date: d.date || ""
        });
      });
      setPasses(loadedPasses);
    } catch (err: any) {
      console.warn("Failed to load buyer passes:", err);
      try {
        handleFirestoreError(err, OperationType.GET, "buyer_passes");
      } catch (e: any) {
        const errMsg = e instanceof Error ? e.message : String(e);
        if (errMsg.toLowerCase().includes("offline") || errMsg.toLowerCase().includes("unavailable")) {
          console.warn("Offline database status noticed during buyer_passes load:", errMsg);
        } else {
          console.error("SDK handoff exception caught for buyer_passes collection:", e);
        }
      }
      showToast("Access restrictions on Pass Purchases collection.", "info");
    }

    // 4. Load User Feedbacks
    try {
      const feedbacksSnapshot = await getDocs(collection(db, "feedbacks"));
      const loadedFeedbacks: FirestoreFeedback[] = [];
      feedbacksSnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        loadedFeedbacks.push({
          id: docSnap.id,
          text: d.text || "",
          category: d.category || "suggestion",
          name: d.name || "",
          email: d.email || "",
          timestamp: d.timestamp || new Date().toISOString(),
          status: d.status || "active"
        });
      });
      loadedFeedbacks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFeedbacks(loadedFeedbacks);
    } catch (err: any) {
      console.warn("Failed to load feedbacks:", err);
      // Try to read from localStorage if offline/denied
      try {
        const stored = localStorage.getItem("autoWorld_feedbacks");
        if (stored) {
          setFeedbacks(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    
    // Load hidden default IDs on mount
    try {
      const stored = localStorage.getItem("autoWorld_hidden_defaults");
      if (stored) {
        setHiddenDefaultIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }

    const handleUpdate = () => {
      loadData();
      try {
        const stored = localStorage.getItem("autoWorld_hidden_defaults");
        if (stored) {
          setHiddenDefaultIds(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener("autoWorld_db_update", handleUpdate);
    return () => window.removeEventListener("autoWorld_db_update", handleUpdate);
  }, []);

  // Delete User Listing from Firestore
  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this vehicle from the official database? This action is irreversible.")) return;

    try {
      await deleteDoc(doc(db, "listings", listingId));
      setListings(prev => prev.filter(item => item.id !== listingId));
      
      // Also update local storage if they mirrored it there
      try {
        const stored = localStorage.getItem("autoWorld_listings");
        if (stored) {
          const list: UserListing[] = JSON.parse(stored);
          const updated = list.filter(item => item.id !== listingId);
          localStorage.setItem("autoWorld_listings", JSON.stringify(updated));
        }
      } catch (e) {
        console.error(e);
      }

      showToast("Listing deleted successfully! Changes are now synchronized system-wide.", "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `listings/${listingId}`);
      showToast("Deletion failed: Check database rules credentials.", "error");
    }
  };

  // Toggle Featured status for user listing
  const handleToggleFeatured = async (item: UserListing) => {
    const nextFeatured = !item.featured;
    try {
      await updateDoc(doc(db, "listings", item.id), { featured: nextFeatured });
      setListings(prev => prev.map(l => l.id === item.id ? { ...l, featured: nextFeatured } : l));
      showToast(`Listing marked as ${nextFeatured ? "Featured" : "Standard"}!`, "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `listings/${item.id}`);
      showToast("Failed to update listing: insufficient rules.", "error");
    }
  };

  // Toggle Verified status for user listing
  const handleToggleVerified = async (item: UserListing) => {
    const nextVerified = !item.verified;
    try {
      await updateDoc(doc(db, "listings", item.id), { verified: nextVerified });
      setListings(prev => prev.map(l => l.id === item.id ? { ...l, verified: nextVerified } : l));
      showToast(`Listing marked as ${nextVerified ? "Verified" : "Unverified"}!`, "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `listings/${item.id}`);
      showToast("Failed to update listing verification status.", "error");
    }
  };

  // Toggle Urgent status for user listing
  const handleToggleUrgent = async (item: UserListing) => {
    const nextUrgent = !item.urgent;
    try {
      await updateDoc(doc(db, "listings", item.id), { urgent: nextUrgent });
      setListings(prev => prev.map(l => l.id === item.id ? { ...l, urgent: nextUrgent } : l));
      showToast(`Listing highlighted as ${nextUrgent ? "Urgent Hot Deal" : "Normal Deal"}!`, "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `listings/${item.id}`);
      showToast("Failed to update listing flags.", "error");
    }
  };

  // Toggle Admin Approval status ('pending' vs 'active')
  const handleToggleApproval = async (item: UserListing) => {
    // If status is 'pending', change to 'active'. Else change to 'pending'.
    const nextStatus = item.status === "pending" || item.status === undefined ? "active" : "pending";
    try {
      await updateDoc(doc(db, "listings", item.id), { status: nextStatus });
      setListings(prev => prev.map(l => l.id === item.id ? { ...l, status: nextStatus } : l));
      
      // Also update local storage cache if mirrored there
      try {
        const stored = localStorage.getItem("autoWorld_listings");
        if (stored) {
          const list: UserListing[] = JSON.parse(stored);
          const updated = list.map(l => l.id === item.id ? { ...l, status: nextStatus } : l);
          localStorage.setItem("autoWorld_listings", JSON.stringify(updated));
        }
      } catch (e) {
        console.error("Failed to update local storage approved status:", e);
      }

      showToast(`Listing is now ${nextStatus === "active" ? "APPROVED and visible to buyers!" : "marked as PENDING and hidden from buyers!"}`, "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `listings/${item.id}`);
      showToast("Failed to update listing approval workflow.", "error");
    }
  };

  // Toggle hiding a hardcoded default vehicle
  const handleToggleHideDefault = (vehicleId: number) => {
    let updated: number[];
    if (hiddenDefaultIds.includes(vehicleId)) {
      updated = hiddenDefaultIds.filter(id => id !== vehicleId);
      showToast("Vehicle restored! It is now visible in the Buy catalog again.", "success");
    } else {
      updated = [...hiddenDefaultIds, vehicleId];
      showToast("Vehicle hidden! It has been removed from public listings indexes.", "info");
    }
    setHiddenDefaultIds(updated);
    localStorage.setItem("autoWorld_hidden_defaults", JSON.stringify(updated));
  };

  // Delete Inquiry Message from Firestore
  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm("Archive and permanently delete this customer inquiry?")) return;

    try {
      await deleteDoc(doc(db, "messages", messageId));
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      showToast("Inquiry lead removed from active ledger.", "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `messages/${messageId}`);
    }
  };

  // Delete User Feedback from Firestore
  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user feedback post?")) return;

    try {
      await deleteDoc(doc(db, "feedbacks", id));
      setFeedbacks(prev => prev.filter(fb => fb.id !== id));
      
      // Also update localized storage if mirrored there
      try {
        const stored = localStorage.getItem("autoWorld_feedbacks");
        if (stored) {
          const arr: FirestoreFeedback[] = JSON.parse(stored);
          const updated = arr.filter(fb => fb.id !== id);
          localStorage.setItem("autoWorld_feedbacks", JSON.stringify(updated));
        }
      } catch (e) {
        console.error(e);
      }

      showToast("Feedback record deleted permanently.", "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `feedbacks/${id}`);
      showToast("Could not delete feedback: rules constraint.", "error");
    }
  };

  // Toggle Feedback resolution status
  const handleToggleFeedbackStatus = async (item: FirestoreFeedback) => {
    const nextStatus = item.status === "active" ? "resolved" : "active";
    try {
      await updateDoc(doc(db, "feedbacks", item.id), { status: nextStatus });
      setFeedbacks(prev => prev.map(fb => fb.id === item.id ? { ...fb, status: nextStatus } : fb));
      showToast(`Feedback status updated to ${nextStatus}!`, "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `feedbacks/${item.id}`);
      showToast("Failed to update feedback status: insufficient rules.", "error");
    }
  };

  // Toggle Custom badge for default static vehicle
  const handleToggleDefaultBadge = (vehicleId: number, badgeType: "verified" | "premium" | "hot") => {
    const currentBadge = defaultBadges[vehicleId];
    const nextBadge = currentBadge === badgeType ? null : badgeType;
    const updated = { ...defaultBadges, [vehicleId]: nextBadge };
    setDefaultBadges(updated);
    
    // Also mirror to global default badges
    localStorage.setItem("autoWorld_default_badges", JSON.stringify(updated));
    showToast(`Vehicle #${vehicleId} badge modified to: ${nextBadge ? nextBadge.toUpperCase() : "STANDARD"}`, "success");
  };

  // BULK CONTROLS FOR ALL CARS
  const handleBulkApprove = async () => {
    if (!window.confirm("Are you sure you want to approve all pending user listings?")) return;
    try {
      const pendingListings = listings.filter(l => l.status === "pending" || l.status === undefined);
      if (pendingListings.length === 0) {
        showToast("No pending listings to approve.", "info");
        return;
      }
      setIsLoading(true);
      for (const item of pendingListings) {
        await updateDoc(doc(db, "listings", item.id), { status: "active" });
      }
      setListings(prev => prev.map(l => ({ ...l, status: "active" })));
      showToast("All user-submitted vehicle listings are now active and approved!", "success");
    } catch (err: any) {
      showToast("Error executing bulk approval.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUnapprove = async () => {
    if (!window.confirm("Are you sure you want to mark all user listings as pending approval?")) return;
    try {
      const activeListings = listings.filter(l => l.status === "active" || l.status === undefined);
      if (activeListings.length === 0) {
        showToast("No active listings to unapprove.", "info");
        return;
      }
      setIsLoading(true);
      for (const item of activeListings) {
        await updateDoc(doc(db, "listings", item.id), { status: "pending" });
      }
      setListings(prev => prev.map(l => ({ ...l, status: "pending" })));
      showToast("All user listings marked as pending/hidden.", "success");
    } catch (err: any) {
      showToast("Error executing bulk unapproval.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkVerifyAll = async () => {
    if (!window.confirm("Would you like to instantly verify ALL vehicles on the platform (both static and user-submitted)?")) return;
    try {
      setIsLoading(true);
      // 1. Verify all user listings in Firestore
      for (const item of listings) {
        await updateDoc(doc(db, "listings", item.id), { verified: true });
      }
      setListings(prev => prev.map(l => ({ ...l, verified: true })));

      // 2. Verify all default vehicles in localStorage
      const updatedBadges: Record<number, string | null> = {};
      DEFAULT_VEHICLES.forEach(v => {
        updatedBadges[v.id] = "verified";
      });
      setDefaultBadges(updatedBadges);
      localStorage.setItem("autoWorld_default_badges", JSON.stringify(updatedBadges));

      showToast("Platform verification scan complete. All available vehicles are now marked as Verified!", "success");
    } catch (err: any) {
      showToast("Error verifying all listings.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAllControls = async () => {
    if (!window.confirm("Reset all platform vehicles to standard settings? This restores all hidden static cars and clears customized badges/flags.")) return;
    try {
      // Clear local storage overrides
      localStorage.removeItem("autoWorld_hidden_defaults");
      localStorage.removeItem("autoWorld_default_badges");
      setHiddenDefaultIds([]);
      setDefaultBadges({});

      // Reset all user listings to standard (remove verified, featured, hot, unapproved) in Firestore
      setIsLoading(true);
      for (const item of listings) {
        await updateDoc(doc(db, "listings", item.id), {
          verified: false,
          featured: false,
          urgent: false,
          status: "active"
        });
      }
      setListings(prev => prev.map(l => ({
        ...l,
        verified: false,
        featured: false,
        urgent: false,
        status: "active"
      })));

      showToast("Reset completed successfully. All cars have returned to their default platform flags.", "success");
    } catch (err: any) {
      showToast("Error during global controls reset.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Build temporary listing list inside admin
  const allDefaultsMapped: Vehicle[] = DEFAULT_VEHICLES.map(v => {
    const customBadge = defaultBadges[v.id];
    return {
      ...v,
      isUserListing: false,
      badge: customBadge !== undefined ? customBadge : v.badge
    };
  });

  const userListingsMapped: Vehicle[] = listings.map((listing, index) => {
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
      fuel: listing.fuelType || "Petrol",
      transmission: listing.transmission || "Automatic",
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

  let aggregateInventoryList = [...allDefaultsMapped, ...userListingsMapped];

  if (inventoryFilter === "user") {
    aggregateInventoryList = userListingsMapped;
  } else if (inventoryFilter === "default") {
    aggregateInventoryList = allDefaultsMapped;
  }

  // Filter listings based on input text
  const filteredInventory = aggregateInventoryList.filter(item => {
    const searchStr = `${item.make} ${item.model} ${item.title} ${item.category}`.toLowerCase();
    return searchStr.includes(adminSearch.toLowerCase());
  });

  const totalRevenueEstimates = passes.length * 1; // ₹1 per pass

  const isAuthorized = currentUser?.email === "afrojalamansari461@gmail.com";

  if (!isAuthorized) {
    return (
      <div id="admin-unauthorized-view" className="max-w-md mx-auto my-16 p-8 bg-[#FAF8F5] border border-stone-300 shadow-xl text-center space-y-5 animate-in fade-in">
        <ShieldAlert className="w-12 h-12 text-red-650 mx-auto" id="restricted-shield" />
        <h2 className="text-xl font-serif font-black uppercase text-stone-900 tracking-tight" id="restricted-heading">Access Restricted</h2>
        <p className="text-xs text-stone-600 font-sans leading-relaxed" id="restricted-paragraph">
          The Owner Administrative Workspace is locked. Only the certified owner account (<strong className="font-bold text-stone-950 text-xs">afrojalamansari461@gmail.com</strong>) is authorized to access and utilize these production system controls.
        </p>
        <button
          id="restricted-return-home"
          onClick={() => setActiveTab("home")}
          className="w-full py-2.5 bg-stone-900 text-[#F4F1EA] text-xs font-bold uppercase tracking-widest hover:bg-stone-800 cursor-pointer"
        >
          Return to Home Page
        </button>
      </div>
    );
  }

  const handleEnterWorkspace = () => {
    playSynthBeep(900, 0.15, "triangle");
    setTimeout(() => playSynthBeep(1400, 0.35, "sine"), 120);
    setIsIntroActive(false);
  };

  if (isIntroActive) {
    return (
      <div className="fixed inset-0 z-50 bg-[#060404] text-[#FAF8F5] flex flex-col items-center justify-center p-6 select-none overflow-hidden font-mono">
        {/* Futuristic Grid and Lines background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(192,132,252,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(192,132,252,0.03)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
        
        {/* Laser scanner vertical sweep line */}
        <div className="absolute left-0 w-full h-1 bg-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.85)] pointer-events-none z-20 animate-scan" />

        {/* Floating background neon dots */}
        <div className="absolute top-12 left-12 w-2 h-2 rounded-full bg-purple-500/40 blur-xs animate-ping" />
        <div className="absolute bottom-24 right-12 w-3.5 h-3.5 rounded-full bg-purple-500/25 blur-xs animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-bounce" style={{ animationDuration: '4.5s' }} />
        <div className="absolute bottom-1/4 left-1/4 w-2.5 h-2.5 rounded-full bg-purple-650/30 blur-xs animate-pulse" style={{ animationDuration: '6s' }} />

        {/* Outer security bracket frame */}
        <div className="absolute inset-4 sm:inset-8 border border-purple-500/10 max-w-4xl mx-auto my-auto h-[90vh] rounded-xs flex flex-col items-center justify-center pointer-events-none">
          {/* Animated corner brackets */}
          <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-purple-400/80 animate-pulse" />
          <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-purple-400/80 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-purple-400/80 animate-pulse" />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-purple-400/80 animate-pulse" />
        </div>

        {/* Main centered box */}
        <div className="relative z-10 max-w-md w-full text-center space-y-6 p-6 sm:p-8 border-2 border-purple-950/40 bg-[#090707]/95 shadow-[0_0_50px_rgba(168,85,247,0.25)] backdrop-blur-md">
          {/* Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-950/60 border border-purple-500/40 text-purple-300 text-[9px] font-black uppercase tracking-widest animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
              Clearance: Certified Owner
            </div>
            <p className="text-[9px] text-stone-500 uppercase tracking-widest font-mono">establishing secure admin session</p>
          </div>

          {/* Central Logo / Visual */}
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            {/* Spinning tech wheels */}
            <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 border-r-purple-300 border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '1s' }} />
            <div className="absolute inset-2 rounded-full border border-b-purple-400 border-t-transparent border-r-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
            <div className="absolute inset-4 rounded-full bg-stone-900 flex items-center justify-center border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <ShieldAlert className="w-7 h-7 text-purple-400 animate-pulse" />
            </div>
          </div>

          {/* Display Text */}
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-wider text-white">
              Admin Control Deck
            </h1>
            <p className="text-[10px] text-purple-300 uppercase tracking-widest font-extrabold font-mono">
              SYSTEM OWNER: <span className="text-white bg-purple-950/60 px-2 py-0.5 border border-purple-500/20">Afroj Alam</span>
            </p>
          </div>

          {/* Code Execution Log Console */}
          <div className="bg-[#030202] border border-stone-850 p-3 h-28 overflow-y-auto font-mono text-[8.5px] text-left space-y-1 rounded-xs select-text scrollbar-thin">
            {terminalLogs.map((log, idx) => (
              <div key={idx} className="text-purple-300/90 leading-normal flex items-start gap-1 font-mono">
                <span className="text-purple-500 select-none shrink-0">&gt;</span>
                <span>{log}</span>
              </div>
            ))}
            <div className="inline-block w-1.5 h-3 bg-purple-400 animate-pulse vertical-align-middle" />
          </div>

          {/* Progress bar */}
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between text-[9px] text-stone-400 font-bold uppercase tracking-wider font-mono">
              <span>Syncing Ledger Indexes</span>
              <span className="text-purple-400 font-black">{Math.min(100, introProgress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#141212] border border-stone-850 p-0.5 rounded-none overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.9)] transition-all duration-150 ease-out"
                style={{ width: `${Math.min(100, introProgress)}%` }}
              />
            </div>
          </div>

          {/* Action Button - Skip */}
          <div className="pt-2">
            <button
              onClick={handleEnterWorkspace}
              className="w-full py-2.5 border border-purple-500 bg-purple-950/20 hover:bg-purple-500 hover:text-black text-purple-300 text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] font-mono"
            >
              Enter Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-desk-view" className="relative animate-in fade-in duration-500 bg-[#F4F1EA] py-10 min-h-screen overflow-hidden">
      
      {/* Continuous Floating Ambient Corner decorations & Neon borders */}
      <div className="absolute top-6 left-6 w-14 h-14 border-t-2 border-l-2 border-purple-400/40 pointer-events-none animate-pulse" />
      <div className="absolute top-6 right-6 w-14 h-14 border-t-2 border-r-2 border-purple-400/40 pointer-events-none animate-pulse" />
      <div className="absolute bottom-6 left-6 w-14 h-14 border-b-2 border-l-2 border-purple-400/40 pointer-events-none animate-pulse" />
      <div className="absolute bottom-6 right-6 w-14 h-14 border-b-2 border-r-2 border-purple-400/40 pointer-events-none animate-pulse" />

      {/* Floating particles in outer background */}
      <div className="absolute top-28 left-12 w-2.5 h-2.5 rounded-full bg-purple-400/20 blur-xs pointer-events-none animate-bounce" style={{ animationDuration: '6s' }} />
      <div className="absolute top-1/3 right-12 w-2 h-2 rounded-full bg-purple-400/35 blur-xs pointer-events-none animate-pulse" style={{ animationDuration: '4.5s' }} />
      <div className="absolute bottom-28 left-16 w-3 h-3 rounded-full bg-purple-400/15 blur-xs pointer-events-none animate-pulse" style={{ animationDuration: '7s' }} />
      <div className="absolute bottom-1/3 right-16 w-1.5 h-1.5 rounded-full bg-purple-400/30 pointer-events-none animate-bounce" style={{ animationDuration: '8s' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Block */}
        <div className="bg-stone-900 text-[#F4F1EA] p-6 sm:p-8 border-2 border-stone-950 shadow-md mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
              <span className="font-mono text-xs text-amber-500 font-bold uppercase tracking-widest">[ SECURITY: ADMINISTRATOR DESK CONTROL ACTIVE ]</span>
            </div>
            <h1 className="text-3xl font-serif font-black tracking-tight uppercase">Owner Administrative Workspace</h1>
            <p className="text-stone-300 text-xs sm:text-sm max-w-xl font-medium leading-relaxed">
              Verify customer inquiries, manage inventory directly in production, add featured flags, or delete/restore listings across the system instantly.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-5 py-2.5 bg-[#FAF8F5] text-stone-900 border border-stone-305 hover:bg-stone-100 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer self-start md:self-center transition disabled:opacity-50 font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-900 ${isLoading ? "animate-spin" : ""}`} />
            Sync Db
          </button>
        </div>

        {/* Analytics widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card 1 */}
          <div className="bg-[#FAF8F5] p-5 border border-stone-300 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Active Firestore Posts</span>
              <Database className="w-5 h-5 text-stone-800" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-black text-stone-900">{listings.length}</span>
              <span className="text-xs text-stone-400 font-bold uppercase">vehicles</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#FAF8F5] p-5 border border-stone-300 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Customer Inquiries</span>
              <MessageSquare className="w-5 h-5 text-stone-850" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-black text-stone-900">{messages.length}</span>
              <span className="text-xs text-green-600 font-bold uppercase">[Active Leads]</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#FAF8F5] p-5 border border-stone-300 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Activation Pass Purchases</span>
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-black text-stone-900">{passes.length}</span>
              <span className="text-xs text-stone-400 font-bold uppercase">users unlocked</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-[#FAF8F5] p-5 border border-stone-300 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono text-stone-900">Total pass revenue</span>
              <BarChart3 className="w-5 h-5 text-green-700" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-black text-stone-900">₹{totalRevenueEstimates}</span>
              <span className="text-xs text-stone-500 font-bold font-mono uppercase tracking-wider">INR Earned</span>
            </div>
          </div>
        </div>

        {/* SECTION CONTROL SWITCHER */}
        <div className="border border-stone-300 bg-[#FAF8F5] mb-8 p-1 flex flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setActiveSubSection("inventory")}
            className={`flex-1 min-w-[120px] py-3 text-center text-xs uppercase tracking-widest font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeSubSection === "inventory"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <Tag className="w-4 h-4 shrink-0" />
            Inventory list ({aggregateInventoryList.length})
          </button>
          
          <button
            onClick={() => setActiveSubSection("leads")}
            className={`flex-1 min-w-[120px] py-3 text-center text-xs uppercase tracking-widest font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeSubSection === "leads"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            Buyer Inquiries ({messages.length})
          </button>

          <button
            onClick={() => setActiveSubSection("payments")}
            className={`flex-1 min-w-[120px] py-3 text-center text-xs uppercase tracking-widest font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeSubSection === "payments"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <Crown className="w-4 h-4 shrink-0" />
            Pass Purchases ({passes.length})
          </button>

          <button
            onClick={() => setActiveSubSection("feedback")}
            className={`flex-1 min-w-[120px] py-3 text-center text-xs uppercase tracking-widest font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeSubSection === "feedback"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0 text-emerald-600" />
            User Feedback ({feedbacks.length})
          </button>
        </div>

        {/* LOADING INDICATOR PANEL */}
        {isLoading ? (
          <div className="bg-[#FAF8F5] border border-stone-305 py-24 text-center">
            <RefreshCw className="w-10 h-10 mx-auto text-stone-400 animate-spin mb-4" />
            <h3 className="text-md uppercase font-bold tracking-widest text-stone-700">Connecting to Cloud Firestore database...</h3>
            <p className="text-stone-400 text-xs mt-1 uppercase font-mono">Syncing active collections and models</p>
          </div>
        ) : (
          <div>
            {/* SUBSECTION 1: INVENTORY MANAGEMENT */}
            {activeSubSection === "inventory" && (
              <div className="space-y-6">

                {/* ADVANCED GLOBAL VEHICLES COMMAND & CONTROL DECK */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-5 space-y-4 shadow-[4px_4px_0px_0px_rgba(168,85,247,0.15)]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-purple-600 animate-pulse" />
                        <h2 className="text-xs sm:text-sm font-serif font-black uppercase text-stone-900 tracking-tight">Platform-wide Inventory Control Desk</h2>
                      </div>
                      <p className="text-[10px] text-stone-500 uppercase tracking-widest font-mono mt-0.5">unified master controls for static and database items</p>
                    </div>
                    
                    {/* View filter buttons */}
                    <div className="flex items-center border border-stone-300 p-0.5 bg-stone-100/60 self-start md:self-center font-mono text-[9px] font-black">
                      <button
                        onClick={() => { playSynthBeep(700, 0.05); setInventoryFilter("all"); }}
                        className={`px-3 py-1.5 uppercase transition cursor-pointer ${
                          inventoryFilter === "all"
                            ? "bg-stone-900 text-white shadow-xs"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200"
                        }`}
                      >
                        All ({allDefaultsMapped.length + userListingsMapped.length})
                      </button>
                      <button
                        onClick={() => { playSynthBeep(750, 0.05); setInventoryFilter("user"); }}
                        className={`px-3 py-1.5 uppercase transition cursor-pointer ${
                          inventoryFilter === "user"
                            ? "bg-stone-900 text-white shadow-xs"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200"
                        }`}
                      >
                        User Postings ({userListingsMapped.length})
                      </button>
                      <button
                        onClick={() => { playSynthBeep(800, 0.05); setInventoryFilter("default"); }}
                        className={`px-3 py-1.5 uppercase transition cursor-pointer ${
                          inventoryFilter === "default"
                            ? "bg-stone-900 text-white shadow-xs"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200"
                        }`}
                      >
                        Static ({allDefaultsMapped.length})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1.5">
                    <button
                      onClick={() => { playSynthBeep(900, 0.1); handleBulkApprove(); }}
                      className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white border border-stone-950 text-[10px] font-extrabold uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-2 font-mono shadow-xs"
                    >
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Approve All
                    </button>
                    
                    <button
                      onClick={() => { playSynthBeep(600, 0.1); handleBulkUnapprove(); }}
                      className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 text-[10px] font-extrabold uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-2 font-mono shadow-xs"
                    >
                      <Filter className="w-4 h-4 text-amber-600 shrink-0" />
                      Unapprove All
                    </button>

                    <button
                      onClick={() => { playSynthBeep(1100, 0.15, "triangle"); handleBulkVerifyAll(); }}
                      className="px-3.5 py-2.5 bg-purple-950/10 hover:bg-purple-950/20 text-purple-950 border border-purple-300 text-[10px] font-extrabold uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-2 font-mono shadow-xs"
                    >
                      <CheckCircle className="w-4 h-4 text-purple-650 shrink-0" />
                      Verify All
                    </button>

                    <button
                      onClick={() => { playSynthBeep(500, 0.25, "sawtooth"); handleResetAllControls(); }}
                      className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-extrabold uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-2 font-mono shadow-xs"
                    >
                      <RefreshCw className="w-4 h-4 text-red-500 shrink-0" />
                      Global Reset
                    </button>
                  </div>
                </div>
                
                {/* Search controller inside subsection */}
                <div className="bg-[#FAF8F5] border border-stone-300 p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative flex-grow w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Filter vehicles by make, model, name or category..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] text-stone-900 text-xs border border-stone-300 focus:border-stone-900 font-sans outline-none placeholder:text-stone-400"
                    />
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[#777] font-mono whitespace-nowrap self-stretch sm:self-center flex items-center justify-center p-3 bg-stone-100">
                    Displaying: {filteredInventory.length} results
                  </div>
                </div>

                {/* Grid items */}
                {filteredInventory.length === 0 ? (
                  <div className="bg-[#FAF8F5] border border-stone-300 py-16 text-center">
                    <p className="text-stone-500 text-xs sm:text-sm uppercase font-mono">No matching vehicles found inside database indexes.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredInventory.map((item) => {
                      const isDefaultHidden = hiddenDefaultIds.includes(item.id);
                      return (
                        <div 
                          key={`${item.isUserListing ? "user" : "default"}-${item.id}`}
                          className={`bg-[#FAF8F5] border-2 flex flex-col sm:flex-row ${
                            isDefaultHidden 
                              ? "border-amber-305 opacity-65 bg-stone-100" 
                              : item.isUserListing
                                ? "border-stone-400"
                                : "border-stone-300"
                          }`}
                        >
                          {/* Image box */}
                          <div className="w-full sm:w-44 h-40 shrink-0 relative bg-stone-200">
                            <img 
                              src={item.image} 
                              alt={item.title} 
                              className="w-full h-full object-cover grayscale-25"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 left-2 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 border text-white font-mono bg-stone-950">
                              {item.isUserListing ? "Firestore post" : "hardcoded static"}
                            </div>

                            {item.badge && (
                              <div className="absolute bottom-2 left-2 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 border text-stone-900 bg-amber-400 border-amber-500 font-mono">
                                [ {item.badge} ]
                              </div>
                            )}
                          </div>

                          {/* Info panel */}
                          <div className="flex-grow p-4.5 flex flex-col justify-between space-y-4">
                            <div>
                              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                <span className="text-[9px] font-mono text-[#555] uppercase font-bold tracking-widest">{item.make} • {item.year}</span>
                                <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                                  {item.isUserListing ? (
                                    <span className={`uppercase px-2 py-0.5 border ${
                                      item.status === "pending"
                                        ? "bg-amber-100 text-amber-800 border-amber-200"
                                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    }`}>
                                      {item.status === "pending" ? "Pending Approval" : "Approved & Active"}
                                    </span>
                                  ) : (
                                    <span className={`uppercase px-2 py-0.5 ${
                                      isDefaultHidden ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-900"
                                    }`}>
                                      {isDefaultHidden ? "Hidden Catalog" : "Visible Catalog"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <h3 className="font-serif font-black text-stone-900 text-md uppercase leading-tight mt-1">{item.title}</h3>
                              <p className="text-stone-950 font-extrabold text-xs font-mono mt-1">₹{(item.price).toLocaleString()} INR</p>
                              <p className="text-[10px] text-stone-500 line-clamp-1 mt-2">{item.description}</p>
                            </div>

                            {/* Controls block */}
                            <div className="pt-2 border-t border-stone-900/10 flex flex-wrap gap-2">
                              {/* Quick View */}
                              <button
                                onClick={() => onQuickView(item)}
                                className="px-2.5 py-1.5 bg-stone-105 hover:bg-stone-200 border border-stone-300 text-[10px] font-bold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition"
                              >
                                <Eye className="w-3 h-3 text-stone-700" />
                                View
                              </button>

                              {item.isUserListing && item.listingId ? (
                                <>
                                  {/* Admin Approval Toggle */}
                                  <button
                                    onClick={() => handleToggleApproval(listings.find(l => l.id === item.listingId)!)}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-0.5 font-mono transition ${
                                      listings.find(l => l.id === item.listingId)?.status === "pending"
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                                        : "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-305"
                                    }`}
                                    title={listings.find(l => l.id === item.listingId)?.status === "pending" ? "Approve the listing for public Buy catalog" : "Mark as pending/hide from buyers"}
                                  >
                                    {listings.find(l => l.id === item.listingId)?.status === "pending" ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        Approve
                                      </>
                                    ) : (
                                      "Unapprove"
                                    )}
                                  </button>

                                  {/* Verified control */}
                                  <button
                                    onClick={() => handleToggleVerified(listings.find(l => l.id === item.listingId)!)}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                                      listings.find(l => l.id === item.listingId)?.verified
                                        ? "bg-purple-650 text-white border-purple-700 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                        : "bg-[#FAF8F5] hover:bg-purple-50 border-stone-300 text-[#555]"
                                    }`}
                                  >
                                    <CheckCircle className={`w-3.5 h-3.5 ${listings.find(l => l.id === item.listingId)?.verified ? "text-purple-300 fill-purple-300/20" : "text-stone-400"}`} />
                                    {listings.find(l => l.id === item.listingId)?.verified ? "Verified" : "Verify"}
                                  </button>

                                  {/* Featured control for User Listings */}
                                  <button
                                    onClick={() => handleToggleFeatured(listings.find(l => l.id === item.listingId)!)}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                                      listings.find(l => l.id === item.listingId)?.featured
                                        ? "bg-amber-450 border-amber-600 text-stone-950"
                                        : "bg-[#FAF8F5] hover:bg-amber-50 border-stone-300 text-[#555]"
                                    }`}
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    {listings.find(l => l.id === item.listingId)?.featured ? "★ Featured" : "☆ Feature"}
                                  </button>

                                  {/* Urgent control */}
                                  <button
                                    onClick={() => handleToggleUrgent(listings.find(l => l.id === item.listingId)!)}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                                      listings.find(l => l.id === item.listingId)?.urgent
                                        ? "bg-red-600 border-red-750 text-white"
                                        : "bg-[#FAF8F5] hover:bg-red-50 border-stone-300 text-stone-605"
                                    }`}
                                  >
                                    Hot Deal
                                  </button>

                                  {/* Absolute Deletion */}
                                  <button
                                    onClick={() => handleDeleteListing(item.listingId!)}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-300 text-red-650 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1.5 font-mono ml-auto transition"
                                    title="Delete/Hide forever from Firestore"
                                  >
                                    <Trash2 className="w-3 h-3.5 shrink-0" />
                                    Remove
                                  </button>
                                </>
                              ) : (
                                /* Hardcoded system vehicles with fully functional advanced controls */
                                <>
                                  {/* Verified control for default vehicle */}
                                  <button
                                    onClick={() => handleToggleDefaultBadge(item.id, "verified")}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                                      item.badge === "verified"
                                        ? "bg-purple-650 text-white border-purple-700 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                        : "bg-[#FAF8F5] hover:bg-purple-50 border-stone-300 text-[#555]"
                                    }`}
                                    title="Mark this static vehicle as verified"
                                  >
                                    <CheckCircle className={`w-3.5 h-3.5 ${item.badge === "verified" ? "text-purple-300 fill-purple-300/20" : "text-stone-400"}`} />
                                    {item.badge === "verified" ? "Verified" : "Verify"}
                                  </button>

                                  {/* Featured control for default vehicle */}
                                  <button
                                    onClick={() => handleToggleDefaultBadge(item.id, "premium")}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                                      item.badge === "premium"
                                        ? "bg-amber-450 border-amber-600 text-stone-950"
                                        : "bg-[#FAF8F5] hover:bg-amber-50 border-stone-300 text-[#555]"
                                    }`}
                                    title="Set premium featured status"
                                  >
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    {item.badge === "premium" ? "★ Featured" : "☆ Feature"}
                                  </button>

                                  {/* Hot Deal control for default vehicle */}
                                  <button
                                    onClick={() => handleToggleDefaultBadge(item.id, "hot")}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                                      item.badge === "hot"
                                        ? "bg-red-600 border-red-750 text-white"
                                        : "bg-[#FAF8F5] hover:bg-red-50 border-stone-300 text-stone-605"
                                    }`}
                                    title="Set hot deal tag"
                                  >
                                    Hot Deal
                                  </button>

                                  {/* Restore / Hide toggle */}
                                  <button
                                    onClick={() => handleToggleHideDefault(item.id)}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1.5 font-mono ml-auto transition ${
                                      isDefaultHidden
                                        ? "bg-green-100 hover:bg-green-200 text-green-905 border-green-300"
                                        : "bg-amber-50 hover:bg-amber-100 text-amber-850 border-amber-300"
                                    }`}
                                  >
                                    {isDefaultHidden ? "Restore" : "Hide"}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUBSECTION 2: CUSTOMER LEADS & INQUIRIES */}
            {activeSubSection === "leads" && (
              <div className="space-y-6">
                <div className="bg-[#FAF8F5] border border-stone-300 p-4 flex items-center justify-between">
                  <h2 className="text-xs uppercase font-extrabold text-stone-500 tracking-wider font-mono">Active contact messages and form applications:</h2>
                  <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-stone-900 text-[#F4F1EA]">Total Leads: {messages.length}</span>
                </div>

                {messages.length === 0 ? (
                  <div className="bg-[#FAF8F5] border border-stone-300 py-24 text-center">
                    <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <h3 className="text-md uppercase font-bold tracking-widest text-[#555]">No customer inquiries recorded in database.</h3>
                    <p className="text-stone-400 text-xs mt-1 uppercase font-semibold">Leads from contact forms populate here in real-time</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className="bg-[#FAF8F5] border border-stone-300 p-6 shadow-sm space-y-4 relative">
                        {/* Remove Action */}
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="absolute top-6 right-6 p-2 text-stone-400 hover:text-red-600 transition cursor-pointer"
                          title="Delete Inquiry"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>

                        <div className="flex flex-wrap items-baseline gap-3">
                          <span className="text-xs font-bold px-2 py-0.5 bg-stone-900 text-white uppercase font-mono tracking-widest">
                            {msg.subject}
                          </span>
                          <span className="text-[10px] text-stone-400 font-bold font-mono uppercase">
                            Received: {new Date(msg.date).toLocaleDateString("en-IN")} at {new Date(msg.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-stone-900">Name: <span className="font-medium text-stone-700">{msg.name}</span></h3>
                          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-stone-500">
                            <span className="flex items-center gap-1.5 font-bold">
                              <Mail className="w-3.5 h-3.5 text-stone-400" />
                              {msg.email}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 bg-stone-100 border border-stone-200 rounded-none">
                          <p className="text-xs leading-relaxed text-stone-800 font-mono whitespace-pre-wrap">
                            {msg.message}
                          </p>
                        </div>

                        <div className="pt-2 flex gap-3">
                          {/* Direct reply email callback */}
                          <a
                            href={`mailto:${msg.email}?subject=Response%20regarding%20AutoWorld%20Inquiry:%20${encodeURIComponent(msg.subject)}`}
                            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-[#F4F1EA] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email Reply Back
                          </a>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="px-4 py-2 bg-stone-100 border border-stone-300 hover:bg-stone-200 text-stone-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 font-mono"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBSECTION 3: PASSES AND PAYMENTS */}
            {activeSubSection === "payments" && (
              <div className="space-y-6">
                <div className="bg-[#FAF8F5] border border-stone-300 p-4 flex items-center justify-between">
                  <h2 className="text-xs uppercase font-extrabold text-stone-500 tracking-wider font-mono">Completed payments & secure authorization registers:</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-900 text-white uppercase font-mono font-extrabold tracking-widest">
                    Activation receipts: {passes.length}
                  </span>
                </div>

                {passes.length === 0 ? (
                  <div className="bg-[#FAF8F5] border border-stone-300 py-24 text-center">
                    <Crown className="w-12 h-12 text-stone-300 mx-auto mb-3 animate-pulse" />
                    <h3 className="text-md uppercase font-bold tracking-widest text-[#555]">No premium pass payment receipts stored yet.</h3>
                    <p className="text-stone-400 text-xs mt-1 uppercase font-semibold">User pass purchases generate payment entries instantly</p>
                  </div>
                ) : (
                  <div className="bg-[#FAF8F5] border border-stone-300 overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-900 text-[#F4F1EA] uppercase text-[9px] tracking-widest font-mono font-bold">
                          <th className="p-4 border-b border-stone-300">Transaction ID</th>
                          <th className="p-4 border-b border-stone-300">Buyer uid</th>
                          <th className="p-4 border-b border-stone-300">Payment Status</th>
                          <th className="p-3 border-b border-stone-300">Sum</th>
                          <th className="p-4 border-b border-stone-300">Activation Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {passes.map((pass) => (
                          <tr key={pass.id} className="hover:bg-stone-100 text-xs font-mono">
                            <td className="p-4 font-bold text-stone-900 select-all">{pass.id}</td>
                            <td className="p-4 text-stone-500 select-all">{pass.userId}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 bg-green-100 text-green-905 uppercase text-[9px] font-extrabold">
                                {pass.paid ? "● Confirmed" : "pending"}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-green-700">₹1.00 INR</td>
                            <td className="p-4 text-stone-505 select-none">
                              {pass.date ? new Date(pass.date).toLocaleString("en-IN") : "Unknown Date"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SUBSECTION 4: USER FEEDBACK & WCAG COMPLIANCE REPORTS */}
            {activeSubSection === "feedback" && (
              <div className="space-y-6">
                <div className="bg-[#FAF8F5] border border-stone-300 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xs uppercase font-extrabold text-stone-500 tracking-wider font-mono">
                      Continuous Quality & Compliance Feedback Desk:
                    </h2>
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                      Submissions stored securely in Google Cloud Firestore collections
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-stone-900 text-white uppercase font-mono font-extrabold tracking-widest shrink-0">
                    Active Submissions: {feedbacks.length}
                  </span>
                </div>

                {feedbacks.length === 0 ? (
                  <div className="bg-[#FAF8F5] border border-stone-300 py-20 text-center">
                    <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3 animate-bounce" />
                    <h3 className="text-md uppercase font-bold tracking-widest text-stone-600">
                      No user feedback posts logged yet.
                    </h3>
                    <p className="text-stone-400 text-xs mt-1 uppercase font-mono">
                      Feedback widget submissions populate this real-time desk instantly
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {feedbacks.map((fb) => {
                      const dateObj = new Date(fb.timestamp);
                      const displayDate = isNaN(dateObj.getTime()) 
                        ? "Date Unspecified" 
                        : dateObj.toLocaleDateString("en-IN") + " " + dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

                      let badgeText = "Suggestion";
                      let badgeColor = "bg-emerald-100 text-emerald-950 border-emerald-305";
                      if (fb.category === "bug_report") {
                        badgeText = "Bug Report";
                        badgeColor = "bg-red-100 text-red-950 border-red-305";
                      } else if (fb.category === "question") {
                        badgeText = "Question";
                        badgeColor = "bg-sky-100 text-sky-950 border-sky-305";
                      } else if (fb.category === "praise") {
                        badgeText = "Praise";
                        badgeColor = "bg-rose-100 text-rose-950 border-rose-305";
                      }

                      return (
                        <div 
                          key={fb.id} 
                          className={`bg-[#FAF8F5] border-2 p-6 shadow-sm space-y-4 relative transition duration-300 ${
                            fb.status === "resolved" 
                              ? "border-emerald-300 opacity-75 bg-emerald-50/10" 
                              : "border-stone-300 hover:border-stone-400"
                          }`}
                        >
                          {/* Close / Archive Action */}
                          <button
                            onClick={() => handleDeleteFeedback(fb.id)}
                            className="absolute top-6 right-6 p-2 text-stone-450 hover:text-red-650 transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-stone-900"
                            title="Delete user feedback entry"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>

                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase font-mono tracking-widest ${badgeColor}`}>
                              {badgeText}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase font-mono tracking-wider ${
                              fb.status === "resolved" ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-800"
                            }`}>
                              {fb.status === "resolved" ? "Resolved" : "Active"}
                            </span>
                            <span className="text-[10px] text-stone-450 font-bold font-mono uppercase">
                              Submitted: {displayDate}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-xs font-bold font-mono text-stone-550">
                              Author Name: <span className="font-semibold text-stone-800">{fb.name || "Anonymous"}</span>
                            </h3>
                            {fb.email && (
                              <div className="flex items-center gap-1.5 text-xs font-mono text-stone-500">
                                <span className="flex items-center gap-1 font-bold">
                                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                                  {fb.email}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="p-4 bg-stone-100 border border-stone-205 rounded-none font-mono text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                            {fb.text}
                          </div>

                          <div className="pt-2 flex flex-wrap gap-2.5">
                            {fb.email && (
                              <a
                                href={`mailto:${fb.email}?subject=Regarding%20your%20AutoWorld%20feedback&body=Hi%20${fb.name || "there"},%0D%0A%0D%0AThank%20you%20for%20your%20feedback:%20"${encodeURIComponent(fb.text)}"%0D%0A%0D%0AWe%20wanted%20to%20follow%20up...`}
                                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-[#F4F1EA] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                                Send Email Follow-up
                              </a>
                            )}
                            <button
                              onClick={() => handleToggleFeedbackStatus(fb)}
                              className="px-4 py-2 bg-stone-50 border border-stone-300 hover:bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 font-mono cursor-pointer"
                            >
                              <CheckCircle className={`w-3.5 h-3.5 ${fb.status === "resolved" ? "text-emerald-600" : "text-stone-450"}`} />
                              {fb.status === "resolved" ? "Mark Active" : "Mark Resolved"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
