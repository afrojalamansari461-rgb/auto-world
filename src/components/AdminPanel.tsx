import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Database, Trash2, Mail, Phone, Calendar, Heart, 
  Search, CheckCircle, RefreshCw, BarChart3, Tag, MessageSquare, 
  Crown, ExternalLink, Sparkles, Filter, Check, Eye, Plus, Award, 
  Clock, Settings, AlertCircle, Wrench, EyeOff, Activity
} from "lucide-react";
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Vehicle, DEFAULT_VEHICLES, UserListing, VEHICLE_MAKES, VEHICLE_MODELS } from "../types";
import { SkeletonLoader } from "./SkeletonLoader";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface AdminPanelProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  currentUser: User | null;
  onQuickView: (vehicle: Vehicle, editMode?: boolean) => void;
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#FAF8F5] border-2 border-stone-950 p-2.5 font-mono text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-stone-950">{payload[0].name} : {payload[0].value}</p>
        <p className="text-stone-400 text-[8px] mt-0.5">Firestore Ledger</p>
      </div>
    );
  }
  return null;
};

export default function AdminPanel({ showToast, currentUser, onQuickView, setActiveTab }: AdminPanelProps) {
  const [listings, setListings] = useState<UserListing[]>([]);
  const [messages, setMessages] = useState<FirestoreMessage[]>([]);
  const [passes, setPasses] = useState<FirestoreBuyerPass[]>([]);
  const [feedbacks, setFeedbacks] = useState<FirestoreFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubSection, setActiveSubSection] = useState<"inventory" | "leads" | "payments" | "feedback" | "audit">("inventory");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const loadAuditLogs = async () => {
    try {
      const logsSnapshot = await getDocs(collection(db, "audit_logs"));
      const loadedLogs: any[] = [];
      logsSnapshot.forEach((docSnap) => {
        loadedLogs.push({
          ...docSnap.data(),
          id: docSnap.id
        });
      });
      loadedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(loadedLogs);
    } catch (err: any) {
      console.warn("Failed to load audit logs:", err);
    }
  };

  const writeAuditLog = async (actionType: string, description: string) => {
    try {
      const email = currentUser?.email || "afrojalamansari461@gmail.com";
      const id = "log_" + Math.random().toString(36).substring(2, 11);
      const logData = {
        id,
        adminEmail: email,
        actionType,
        description,
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, "audit_logs"), logData);
      await loadAuditLogs();
    } catch (err: any) {
      console.error("Failed to write audit log:", err);
    }
  };
  
  // Developer bypass state for testing
  const [devBypass, setDevBypass] = useState(() => {
    try {
      return localStorage.getItem("autoWorld_admin_bypass") === "true";
    } catch (e) {
      return false;
    }
  });
  
  // Custom states for spectacular welcome intro sequence and floating animations
  const [isIntroActive, setIsIntroActive] = useState(() => {
    try {
      return sessionStorage.getItem("autoWorld_admin_entered") !== "true";
    } catch (e) {
      return true;
    }
  });
  const [introProgress, setIntroProgress] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [liveTime, setLiveTime] = useState("");

  useEffect(() => {
    try {
      setLiveTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    } catch (e) {
      setLiveTime("04:20:00");
    }
    const timer = setInterval(() => {
      try {
        setLiveTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
      } catch (e) {
        // Ignored
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    const isAuthorizedUser = currentUser?.email === "afrojalamansari461@gmail.com" || devBypass;
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

      return () => {
        clearInterval(interval);
        clearInterval(logInterval);
      };
    } else {
      setIsIntroActive(false);
    }
  }, [currentUser, devBypass]);

  // States for hidden default vehicles stored in localStorage to customize catalogs
  const [hiddenDefaultIds, setHiddenDefaultIds] = useState<number[]>([]);
  
  // Custom states for simulated permanent deletion of static defaults
  const [removedDefaultIds, setRemovedDefaultIds] = useState<number[]>([]);

  // Customized Interactive Confirmation Modal states
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

  // Holographic Activity HUD Toast states
  const [hudAlert, setHudAlert] = useState<{
    title: string;
    description: string;
    type: "verified" | "premium" | "hot" | "approve" | "unapprove" | "delete" | "hide" | "restore" | "bulk";
    visible: boolean;
  } | null>(null);

  // Particle click animations tracking state
  interface ClickParticle {
    id: number;
    x: number;
    y: number;
    color: string;
    icon: string;
    text: string;
  }
  const [clickParticles, setClickParticles] = useState<ClickParticle[]>([]);

  // Helper trigger for interactive HUD updates
  const triggerHudAlert = (title: string, description: string, type: "verified" | "premium" | "hot" | "approve" | "unapprove" | "delete" | "hide" | "restore" | "bulk" = "verified") => {
    if (type === "verified") {
      playSynthBeep(880, 0.1, "triangle");
      setTimeout(() => playSynthBeep(1320, 0.2, "sine"), 100);
    } else if (type === "premium") {
      playSynthBeep(1000, 0.08, "sine");
      setTimeout(() => playSynthBeep(1200, 0.08, "sine"), 70);
      setTimeout(() => playSynthBeep(1500, 0.25, "sine"), 140);
    } else if (type === "hot") {
      playSynthBeep(650, 0.12, "sawtooth");
      setTimeout(() => playSynthBeep(850, 0.15, "triangle"), 110);
    } else if (type === "delete" || type === "hide") {
      playSynthBeep(500, 0.25, "sawtooth");
    } else {
      playSynthBeep(900, 0.15, "triangle");
    }

    setHudAlert({ title, description, type, visible: true });

    // Auto dismiss
    setTimeout(() => {
      setHudAlert(prev => prev ? { ...prev, visible: false } : null);
    }, 2200);
  };

  // Click Particle Spawning Function
  const spawnParticles = (e: React.MouseEvent, color: string, text: string, icon = "✨") => {
    const x = e.clientX;
    const y = e.clientY;
    
    const id = Date.now() + Math.random();
    const newParticle: ClickParticle = {
      id,
      x,
      y,
      color,
      icon,
      text
    };
    
    setClickParticles(prev => [...prev, newParticle]);
    
    setTimeout(() => {
      setClickParticles(prev => prev.filter(p => p.id !== id));
    }, 1000);
  };
  
  // Custom badges for hardcoded default vehicles to control them
  const [defaultBadges, setDefaultBadges] = useState<Record<number, string | null>>({});

  // Active inventory viewer filter (controlling all cars, user list, or defaults, or hidden)
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "user" | "default" | "hidden">("all");

  // Interactive Admin Intake Form (Add New Vehicle Specimen) state variables
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newCustomMake, setNewCustomMake] = useState("");
  const [newCustomModel, setNewCustomModel] = useState("");
  const [newCategory, setNewCategory] = useState("car");
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newPrice, setNewPrice] = useState("");
  const [newMileage, setNewMileage] = useState("0");
  const [newFuel, setNewFuel] = useState("Petrol");
  const [newTransmission, setNewTransmission] = useState("Automatic");
  const [newEngine, setNewEngine] = useState("2.0L Turbocharged I4");
  const [newColor, setNewColor] = useState("Stealth Black");
  const [newOwners, setNewOwners] = useState("1st Owner");
  const [newRegNumber, setNewRegNumber] = useState("DL-3C");
  const [newBadge, setNewBadge] = useState<"verified" | "premium" | "hot" | null>(null);
  const [newDescription, setNewDescription] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newSellerName, setNewSellerName] = useState("Auto World Executive Desk");
  const [newSellerPhone, setNewSellerPhone] = useState("+91 99001 88224");
  const [newSellerEmail, setNewSellerEmail] = useState("admin@autoworld.in");
  const [newLocation, setNewLocation] = useState("New Delhi, Delhi");
  const [newNegotiable, setNewNegotiable] = useState("no");
  const [newFeatures, setNewFeatures] = useState("ABS, Airbags, Bluetooth, Backup Camera, Climate Control");
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  // Search and category filters inside admin panel
  const [adminSearch, setAdminSearch] = useState("");
  const [adminMakeFilter, setAdminMakeFilter] = useState("");
  const [adminYearFilter, setAdminYearFilter] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState("");
  const [chartMode, setChartMode] = useState<"status" | "active-categories" | "activity-30">("status");

  const get30DaysListingActivity = () => {
    const activityMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      activityMap[dateStr] = 0;
    }
    listings.forEach((listing) => {
      if (listing.datePosted) {
        let cleanDate = listing.datePosted;
        if (cleanDate.includes("T")) {
          cleanDate = cleanDate.split("T")[0];
        }
        if (activityMap[cleanDate] !== undefined) {
          activityMap[cleanDate]++;
        }
      }
    });
    return Object.keys(activityMap).sort().map((dateStr) => {
      const parts = dateStr.split("-");
      const shortDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
      return {
        date: shortDate,
        fullDate: dateStr,
        count: activityMap[dateStr]
      };
    });
  };

  // Multi-selection management for platform vehicles
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const toggleSelectVehicle = (itemKey: string) => {
    setSelectedKeys((prev) => 
      prev.includes(itemKey) ? prev.filter(k => k !== itemKey) : [...prev, itemKey]
    );
  };

  const handleSelectAllFiltered = (filteredItems: Vehicle[]) => {
    const allKeys = filteredItems.map(item => `${item.isUserListing ? "user" : "default"}-${item.id}`);
    const areAllSelected = allKeys.every(k => selectedKeys.includes(k));
    
    if (areAllSelected) {
      // Unselect all filtered
      setSelectedKeys(prev => prev.filter(k => !allKeys.includes(k)));
    } else {
      // Select all filtered (union)
      setSelectedKeys(prev => Array.from(new Set([...prev, ...allKeys])));
    }
  };

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

    // 5. Load Admin Audit Logs
    await loadAuditLogs();

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

    // Load removed default IDs on mount
    try {
      const removedStr = localStorage.getItem("autoWorld_removed_defaults");
      if (removedStr) {
        setRemovedDefaultIds(JSON.parse(removedStr));
      }
    } catch (e) {
      console.error(e);
    }

    // Load default badges on mount
    try {
      const badgesStr = localStorage.getItem("autoWorld_default_badges");
      if (badgesStr) {
        setDefaultBadges(JSON.parse(badgesStr));
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
      try {
        const removedStr = localStorage.getItem("autoWorld_removed_defaults");
        if (removedStr) {
          setRemovedDefaultIds(JSON.parse(removedStr));
        }
      } catch (e) {
        console.error(e);
      }
      try {
        const badgesStr = localStorage.getItem("autoWorld_default_badges");
        if (badgesStr) {
          setDefaultBadges(JSON.parse(badgesStr));
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener("autoWorld_db_update", handleUpdate);
    return () => window.removeEventListener("autoWorld_db_update", handleUpdate);
  }, []);

  // Delete User Listing from Firestore with premium HUD Custom Confirm Dialog
  const handleDeleteListing = (listingId: string) => {
    const targetListing = listings.find(l => l.id === listingId);
    const title = targetListing ? targetListing.title : "Selected Vehicle";

    setConfirmModal({
      isOpen: true,
      title: "PERMANENT DATABASE DELETION",
      message: `Are you sure you want to permanently purge specimen "${title}" from the Cloud Firestore database? This action is absolute, synchronized live, and irreversible.`,
      danger: true,
      confirmText: "PURGE SYSTEM INDEX",
      onConfirm: async () => {
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

          triggerHudAlert("SPECIMEN PURGED", `"${title}" was successfully deleted from Firestore.`, "delete");
          await writeAuditLog("delete_listing", `Purged user vehicle listing "${title}" (ID: ${listingId})`);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `listings/${listingId}`);
          showToast("Deletion failed: Check database rules credentials.", "error");
        }
      }
    });
  };

  // Toggle Featured status for user listing
  const handleToggleFeatured = async (item: UserListing) => {
    const nextFeatured = !item.featured;
    try {
      await updateDoc(doc(db, "listings", item.id), { featured: nextFeatured });
      setListings(prev => prev.map(l => l.id === item.id ? { ...l, featured: nextFeatured } : l));
      triggerHudAlert(
        nextFeatured ? "FEATURED TAG ACTIVATED" : "FEATURED TAG DEACTIVATED",
        `Specimen "${item.title}" is now ${nextFeatured ? "flagged as Featured premium star" : "reverted to normal stock"}.`,
        "premium"
      );
      await writeAuditLog("toggle_featured", `Toggled featured status for user vehicle "${item.title}" to ${nextFeatured}`);
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
      triggerHudAlert(
        nextVerified ? "VERIFIED ACCREDITATION GRANTED" : "VERIFIED ACCREDITATION REVOKED",
        `Specimen "${item.title}" has been ${nextVerified ? "certified and verified" : "demoted to unverified"}.`,
        "verified"
      );
      await writeAuditLog("toggle_verified", `Toggled verified status for user vehicle "${item.title}" to ${nextVerified}`);
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
      triggerHudAlert(
        nextUrgent ? "HOT DEAL FLAME ACTIVATED" : "HOT DEAL FLAME DEACTIVATED",
        `Specimen "${item.title}" highlighted as ${nextUrgent ? "a sizzling hot deal" : "a regular stock value"}.`,
        "hot"
      );
      await writeAuditLog("toggle_urgent", `Toggled hot deal status for user vehicle "${item.title}" to ${nextUrgent}`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `listings/${item.id}`);
      showToast("Failed to update listing flags.", "error");
    }
  };

  // Toggle Admin Approval status ('pending' vs 'active')
  const handleToggleApproval = async (item: UserListing) => {
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

      triggerHudAlert(
        nextStatus === "active" ? "SPECIMEN PUBLISHED ONLINE" : "SPECIMEN HELD / HIDDEN",
        `Specimen "${item.title}" is now ${nextStatus === "active" ? "active and visible to public catalog" : "archived in pending drafts"}.`,
        nextStatus === "active" ? "approve" : "unapprove"
      );
      await writeAuditLog("status_change", `Updated approval status of user vehicle "${item.title}" to ${nextStatus}`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `listings/${item.id}`);
      showToast("Failed to update listing approval workflow.", "error");
    }
  };

  // Compile and record brand-new vehicle specimen to Firestore & local storage
  const handleSubmitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalMake = newMake === "Other" ? newCustomMake : newMake;
    const finalModel = newModel === "Other" ? newCustomModel : newModel;
    if (!finalMake || !finalModel) {
      showToast("Manufacturer and Model are required!", "error");
      return;
    }
    
    setIsSubmittingIntake(true);
    playSynthBeep(600, 0.2, "square");
    
    try {
      const finalTitle = `${finalMake} ${finalModel} ${newYear}`;
      const finalPriceInt = parseInt(newPrice) || 500000;
      
      const featuresArray = newFeatures
        .split(",")
        .map(f => f.trim())
        .filter(Boolean);
        
      const listingData = {
        title: finalTitle,
        make: finalMake,
        model: finalModel,
        type: newCategory,
        year: newYear,
        price: finalPriceInt,
        condition: 10,
        mileage: newMileage,
        fuelType: newFuel,
        transmission: newTransmission,
        engine: newEngine,
        color: newColor,
        owners: newOwners,
        regNumber: newRegNumber,
        description: newDescription || `Superb condition pristine ${finalTitle} curated for elite buyers.`,
        negotiable: newNegotiable,
        sellerName: newSellerName,
        sellerPhone: newSellerPhone,
        sellerEmail: newSellerEmail,
        location: newLocation,
        features: featuresArray,
        verified: newBadge === "verified",
        featured: newBadge === "premium",
        urgent: newBadge === "hot",
        photos: [{ src: newImageUrl || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800", alt: finalTitle }],
        datePosted: new Date().toISOString().split("T")[0],
        status: "active" as const
      };
      
      // Save directly to Firestore
      const docRef = await addDoc(collection(db, "listings"), listingData);
      
      // Also add to local storage listings for offline sync fallback
      try {
        const stored = localStorage.getItem("autoWorld_listings") || "[]";
        const localListings: UserListing[] = JSON.parse(stored);
        localListings.push({ ...listingData, id: docRef.id } as UserListing);
        localStorage.setItem("autoWorld_listings", JSON.stringify(localListings));
      } catch (err) {
        console.error(err);
      }
      
      // Append a terminal log live for active aesthetic feedback!
      setTerminalLogs(prev => [
        ...prev,
        `[INJECTED] SPECIMEN ${finalTitle.toUpperCase()} STORED AT GUID ${docRef.id.slice(0, 8).toUpperCase()}`,
        `[METRICS] PRICE: ₹${finalPriceInt} | ENGINE: ${newEngine.toUpperCase()} | COLOR: ${newColor.toUpperCase()}`
      ]);

      triggerHudAlert(
        "CYBER SPECIMEN INJECTED",
        `Specimen "${finalTitle}" is compiled and active inside Firestore.`,
        "premium"
      );
      
      // Trigger update
      window.dispatchEvent(new Event("autoWorld_db_update"));
      await writeAuditLog("create_listing", `Injected new vehicle specimen "${finalTitle}" into Firestore (ID: ${docRef.id})`);
      
      // Close form and reset
      setShowIntakeForm(false);
      setNewMake("");
      setNewModel("");
      setNewCustomMake("");
      setNewCustomModel("");
      setNewPrice("");
      setNewMileage("0");
      setNewDescription("");
      setNewImageUrl("");
      setNewBadge(null);
      setNewEngine("2.0L Turbocharged I4");
      setNewColor("Stealth Black");
      setNewOwners("1st Owner");
      setNewRegNumber("DL-3C");
    } catch (err: any) {
      console.error(err);
      showToast("Error uploading specimen to Firestore.", "error");
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  // Toggle hiding a hardcoded default vehicle with Holographic HUD feedback
  const handleToggleHideDefault = (vehicleId: number) => {
    let updated: number[];
    const target = DEFAULT_VEHICLES.find(v => v.id === vehicleId);
    const title = target ? target.title : "Default Vehicle";

    if (hiddenDefaultIds.includes(vehicleId)) {
      updated = hiddenDefaultIds.filter(id => id !== vehicleId);
      triggerHudAlert("VEHICLE RESTORED", `"${title}" has been restored to active visible index catalogs.`, "restore");
    } else {
      updated = [...hiddenDefaultIds, vehicleId];
      triggerHudAlert("VEHICLE ARCHIVED", `"${title}" was hidden and catalog access has been restricted.`, "hide");
    }
    setHiddenDefaultIds(updated);
    localStorage.setItem("autoWorld_hidden_defaults", JSON.stringify(updated));
    window.dispatchEvent(new Event("autoWorld_db_update"));
  };

  // Permanently remove a default hardcoded vehicle with advanced HUD confirmation
  const handleRemoveDefaultPermanently = (vehicleId: number) => {
    const target = DEFAULT_VEHICLES.find(v => v.id === vehicleId);
    const title = target ? target.title : "Default Vehicle";

    setConfirmModal({
      isOpen: true,
      title: "PERMANENT STATIC DELETE PROTOCOL",
      message: `Are you sure you want to permanently delete/scrub static vehicle asset "${title}"? This will blacklist and purge it across the home and buy inventory catalogs.`,
      danger: true,
      confirmText: "SCRUB FOREVER",
      onConfirm: () => {
        const updated = [...removedDefaultIds, vehicleId];
        setRemovedDefaultIds(updated);
        localStorage.setItem("autoWorld_removed_defaults", JSON.stringify(updated));
        
        // Also trigger dynamic update across elements
        window.dispatchEvent(new Event("autoWorld_db_update"));

        triggerHudAlert("ASSET PURGED FOREVER", `"${title}" has been permanently scrubbed from the platform index.`, "delete");
      }
    });
  };

  // Delete Inquiry Message from Firestore
  const handleDeleteMessage = (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    const nameStr = msg ? msg.name : "this lead";

    setConfirmModal({
      isOpen: true,
      title: "PURGE BUYER INQUIRY",
      message: `Are you sure you want to permanently delete customer inquiry from "${nameStr}"? This lead record will be permanently purged from system memory.`,
      danger: true,
      confirmText: "PURGE RECORD",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "messages", messageId));
          setMessages(prev => prev.filter(item => item.id !== messageId));
          triggerHudAlert("RECORD PURGED", `Inquiry lead from "${nameStr}" purged.`, "delete");
          await writeAuditLog("delete_message", `Purged inquiry lead from "${nameStr}" (ID: ${messageId})`);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `messages/${messageId}`);
          showToast("Failed to remove message record: rules constraint.", "error");
        }
      }
    });
  };

  // Delete User Feedback from Firestore
  const handleDeleteFeedback = (id: string) => {
    const fb = feedbacks.find(f => f.id === id);
    const author = fb ? fb.name : "Anonymous";

    setConfirmModal({
      isOpen: true,
      title: "PURGE FEEDBACK CORRESPONDENCE",
      message: `Are you sure you want to permanently delete public feedback submitted by "${author}"? This post will be scrubbed from public testimonials.`,
      danger: true,
      confirmText: "SCRUB CORRESPONDENCE",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "feedbacks", id));
          setFeedbacks(prev => prev.filter(item => item.id !== id));
          
          // Also update localized storage if mirrored there
          try {
            const stored = localStorage.getItem("autoWorld_feedbacks");
            if (stored) {
              const arr: FirestoreFeedback[] = JSON.parse(stored);
              const updated = arr.filter(fItem => fItem.id !== id);
              localStorage.setItem("autoWorld_feedbacks", JSON.stringify(updated));
            }
          } catch (e) {
            console.error(e);
          }

          triggerHudAlert("TESTIMONIAL PURGED", `Feedback from "${author}" scrubbed.`, "delete");
          await writeAuditLog("delete_feedback", `Purged feedback correspondence from "${author}" (ID: ${id})`);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `feedbacks/${id}`);
          showToast("Could not delete feedback: rules constraint.", "error");
        }
      }
    });
  };

  // Toggle Feedback resolution status
  const handleToggleFeedbackStatus = async (item: FirestoreFeedback) => {
    const nextStatus = item.status === "active" ? "resolved" : "active";
    try {
      await updateDoc(doc(db, "feedbacks", item.id), { status: nextStatus });
      setFeedbacks(prev => prev.map(fb => fb.id === item.id ? { ...fb, status: nextStatus } : fb));
      showToast(`Feedback status updated to ${nextStatus}!`, "success");
      await writeAuditLog("status_change", `Updated feedback status of correspondence from "${item.name || "Anonymous"}" to "${nextStatus}"`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `feedbacks/${item.id}`);
      showToast("Failed to update feedback status: insufficient rules.", "error");
    }
  };

  // Toggle Custom badge for default static vehicle with HUD alert
  const handleToggleDefaultBadge = (vehicleId: number, badgeType: "verified" | "premium" | "hot") => {
    const currentBadge = defaultBadges[vehicleId];
    const nextBadge = currentBadge === badgeType ? null : badgeType;
    const updated = { ...defaultBadges, [vehicleId]: nextBadge };
    setDefaultBadges(updated);
    
    // Also mirror to global default badges
    localStorage.setItem("autoWorld_default_badges", JSON.stringify(updated));
    window.dispatchEvent(new Event("autoWorld_db_update"));

    const target = DEFAULT_VEHICLES.find(v => v.id === vehicleId);
    const title = target ? target.title : "Default Vehicle";

    triggerHudAlert(
      nextBadge ? `${badgeType.toUpperCase()} BADGE ENGAGED` : "BADGE RETURNED TO DEFAULT",
      `Static specimen "${title}" badge set to ${nextBadge ? badgeType : "standard"}.`,
      badgeType
    );
  };

  // BULK CONTROLS FOR ALL CARS WITH HUD CONFIRMS
  const handleBulkApprove = () => {
    const pendingListings = listings.filter(l => l.status === "pending" || l.status === undefined);
    if (pendingListings.length === 0) {
      triggerHudAlert("BULK PROCESS CANCELLED", "No pending draft listings found to approve.", "bulk");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "BULK APPROVAL INITIATION",
      message: `Are you sure you want to approve all ${pendingListings.length} pending user listings? They will instantly become visible in the public Buy Catalog.`,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          for (const item of pendingListings) {
            await updateDoc(doc(db, "listings", item.id), { status: "active" });
          }
          setListings(prev => prev.map(l => ({ ...l, status: "active" })));
          triggerHudAlert("BULK APPROVE SUCCESS", `Approved and published all ${pendingListings.length} pending user listings.`, "bulk");
          window.dispatchEvent(new Event("autoWorld_db_update"));
        } catch (err: any) {
          showToast("Error executing bulk approval.", "error");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleBulkUnapprove = () => {
    const activeListings = listings.filter(l => l.status === "active" || l.status === undefined);
    if (activeListings.length === 0) {
      triggerHudAlert("BULK PROCESS CANCELLED", "No active listings found to unapprove.", "bulk");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "BULK SUSPENSION INITIATION",
      message: `Are you sure you want to suspend/unapprove all ${activeListings.length} user-submitted listings? This hides them from buyers immediately.`,
      danger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          for (const item of activeListings) {
            await updateDoc(doc(db, "listings", item.id), { status: "pending" });
          }
          setListings(prev => prev.map(l => ({ ...l, status: "pending" })));
          triggerHudAlert("BULK SUSPEND COMPLETE", `Hidden and suspended all ${activeListings.length} active listings.`, "bulk");
          window.dispatchEvent(new Event("autoWorld_db_update"));
        } catch (err: any) {
          showToast("Error executing bulk unapproval.", "error");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleBulkVerifyAll = () => {
    setConfirmModal({
      isOpen: true,
      title: "INSTANT ACCREDITATION PROTOCOL",
      message: "Are you sure you want to instantly award [VERIFIED] status to ALL vehicles on the platform (both default static assets and user posts)?",
      onConfirm: async () => {
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

          triggerHudAlert("BULK VERIFY ENGAGED", "Platform-wide scanning complete. All vehicles certified.", "verified");
          window.dispatchEvent(new Event("autoWorld_db_update"));
        } catch (err: any) {
          showToast("Error verifying all listings.", "error");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleResetAllControls = () => {
    setConfirmModal({
      isOpen: true,
      title: "SYSTEM FACTORY RESET DECREE",
      message: "WARNING: This will purge all administrative configurations. All hidden defaults will be unhidden, blacklisted defaults restored, badges cleared, and user listings reset to unverified stock. Proceed?",
      danger: true,
      confirmText: "FACTORY PURGE",
      onConfirm: async () => {
        try {
          setIsLoading(true);
          // Clear local storage overrides
          localStorage.removeItem("autoWorld_hidden_defaults");
          localStorage.removeItem("autoWorld_removed_defaults");
          localStorage.removeItem("autoWorld_default_badges");
          setHiddenDefaultIds([]);
          setRemovedDefaultIds([]);
          setDefaultBadges({});

          // Reset all user listings to standard (remove verified, featured, hot, unapproved) in Firestore
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

          triggerHudAlert("SYSTEM INDEX RESET", "All administrator controls, archives, and badges returned to baseline standards.", "delete");
          window.dispatchEvent(new Event("autoWorld_db_update"));
        } catch (err: any) {
          showToast("Error during global controls reset.", "error");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // Bulk actions on SELECTED vehicles specifically
  const handleBulkApproveSelected = () => {
    const selectedUsers = listings.filter(l => selectedKeys.includes(`user-${l.id}`));
    if (selectedUsers.length === 0) {
      triggerHudAlert("NO DYNAMIC POSTS SELECTED", "Please check/select user posts to approve.", "bulk");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "APPROVE SELECTED CORES",
      message: `Are you sure you want to approve and publish the ${selectedUsers.length} selected user postings?`,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          for (const item of selectedUsers) {
            await updateDoc(doc(db, "listings", item.id), { status: "active" });
          }
          setListings(prev => prev.map(l => selectedKeys.includes(`user-${l.id}`) ? { ...l, status: "active" } : l));
          triggerHudAlert("SELECTION CORES APPROVED", `Approved and published ${selectedUsers.length} selected posts.`, "bulk");
          window.dispatchEvent(new Event("autoWorld_db_update"));
        } catch (err: any) {
          showToast("Error approving selected items.", "error");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleBulkUnapproveSelected = () => {
    const selectedUsers = listings.filter(l => selectedKeys.includes(`user-${l.id}`));
    if (selectedUsers.length === 0) {
      triggerHudAlert("NO DYNAMIC POSTS SELECTED", "Please select user posts to hold.", "bulk");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "UNAPPROVE SELECTED CORES",
      message: `Are you sure you want to hold/unapprove the ${selectedUsers.length} selected user postings?`,
      danger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          for (const item of selectedUsers) {
            await updateDoc(doc(db, "listings", item.id), { status: "pending" });
          }
          setListings(prev => prev.map(l => selectedKeys.includes(`user-${l.id}`) ? { ...l, status: "pending" } : l));
          triggerHudAlert("SELECTION CORES HELD", `Held/Suspended ${selectedUsers.length} selected posts.`, "bulk");
          window.dispatchEvent(new Event("autoWorld_db_update"));
        } catch (err: any) {
          showToast("Error holding selected items.", "error");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleBulkVerifySelected = () => {
    const selectedUsers = listings.filter(l => selectedKeys.includes(`user-${l.id}`));
    const selectedDefaultIds = DEFAULT_VEHICLES.filter(v => selectedKeys.includes(`default-${v.id}`)).map(v => v.id);
    
    if (selectedUsers.length === 0 && selectedDefaultIds.length === 0) {
      triggerHudAlert("NO SPECIMENS SELECTED", "Please select vehicles to verify.", "bulk");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "ACCREDIT SELECTED SPECIMENS",
      message: `Are you sure you want to award [VERIFIED] status to all ${selectedUsers.length + selectedDefaultIds.length} selected vehicles?`,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          for (const item of selectedUsers) {
            await updateDoc(doc(db, "listings", item.id), { verified: true });
          }
          setListings(prev => prev.map(l => selectedKeys.includes(`user-${l.id}`) ? { ...l, verified: true } : l));

          const nextBadges = { ...defaultBadges };
          selectedDefaultIds.forEach(id => {
            nextBadges[id] = "verified";
          });
          setDefaultBadges(nextBadges);
          localStorage.setItem("autoWorld_default_badges", JSON.stringify(nextBadges));

          triggerHudAlert("SELECTION VERIFIED", `Certified and verified ${selectedUsers.length + selectedDefaultIds.length} vehicles.`, "verified");
          window.dispatchEvent(new Event("autoWorld_db_update"));
        } catch (err: any) {
          showToast("Error verifying selected specimens.", "error");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleBulkHideSelected = () => {
    const selectedDefaultIds = DEFAULT_VEHICLES.filter(v => selectedKeys.includes(`default-${v.id}`)).map(v => v.id);
    if (selectedDefaultIds.length === 0) {
      triggerHudAlert("NO STATIC SPECIMENS SELECTED", "Hiding only works for static catalog specimens.", "bulk");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "HIDE SELECTED SPECIMENS",
      message: `Are you sure you want to hide all ${selectedDefaultIds.length} selected static default vehicles from the public catalog?`,
      onConfirm: () => {
        const nextHidden = Array.from(new Set([...hiddenDefaultIds, ...selectedDefaultIds]));
        setHiddenDefaultIds(nextHidden);
        localStorage.setItem("autoWorld_hidden_defaults", JSON.stringify(nextHidden));
        triggerHudAlert("SPECIMENS HIDDEN", `Successfully hid ${selectedDefaultIds.length} static specs.`, "hide");
        window.dispatchEvent(new Event("autoWorld_db_update"));
      }
    });
  };

  const handleBulkDeleteSelectedPermanently = () => {
    const selectedUsers = listings.filter(l => selectedKeys.includes(`user-${l.id}`));
    const selectedDefaultIds = DEFAULT_VEHICLES.filter(v => selectedKeys.includes(`default-${v.id}`)).map(v => v.id);

    if (selectedUsers.length === 0 && selectedDefaultIds.length === 0) {
      triggerHudAlert("NO ITEMS SELECTED", "Select items to delete permanently.", "bulk");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "PERMANENT SCRUB SEQUENCE",
      message: `WARNING: You are about to permanently delete ${selectedUsers.length} Firestore listings and blacklist/scrub ${selectedDefaultIds.length} static defaults. This is synchronized live and is absolute. Proceed?`,
      danger: true,
      confirmText: "SCRUB CHANNELS",
      onConfirm: async () => {
        try {
          setIsLoading(true);
          for (const item of selectedUsers) {
            await deleteDoc(doc(db, "listings", item.id));
          }
          setListings(prev => prev.filter(l => !selectedKeys.includes(`user-${l.id}`)));

          try {
            const stored = localStorage.getItem("autoWorld_listings");
            if (stored) {
              const list: UserListing[] = JSON.parse(stored);
              const updated = list.filter(l => !selectedKeys.includes(`user-${l.id}`));
              localStorage.setItem("autoWorld_listings", JSON.stringify(updated));
            }
          } catch (e) {
            console.error(e);
          }

          const nextRemoved = Array.from(new Set([...removedDefaultIds, ...selectedDefaultIds]));
          setRemovedDefaultIds(nextRemoved);
          localStorage.setItem("autoWorld_removed_defaults", JSON.stringify(nextRemoved));

          setSelectedKeys(prev => prev.filter(k => !selectedKeys.includes(k)));

          triggerHudAlert("SELECTION SCRUBBED", `Purged selected specimens completely from database.`, "delete");
          window.dispatchEvent(new Event("autoWorld_db_update"));
        } catch (err: any) {
          showToast("Error scrubbing selected items.", "error");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // Load default overrides from local storage
  let defaultOverrides: Record<string, any> = {};
  try {
    const overridesStr = localStorage.getItem("autoWorld_default_overrides");
    if (overridesStr) {
      defaultOverrides = JSON.parse(overridesStr);
    }
  } catch (e) {
    console.error("Failed to load overrides in AdminPanel:", e);
  }

  // Build temporary listing list inside admin
  const allDefaultsMapped: Vehicle[] = DEFAULT_VEHICLES.filter(v => !removedDefaultIds.includes(v.id)).map(v => {
    const customBadge = defaultBadges[v.id];
    const override = defaultOverrides[v.id] || {};
    return {
      ...v,
      ...override,
      isUserListing: false,
      badge: customBadge !== undefined ? customBadge : (override.badge !== undefined ? override.badge : v.badge)
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
  } else if (inventoryFilter === "hidden") {
    aggregateInventoryList = allDefaultsMapped.filter(item => hiddenDefaultIds.includes(item.id));
  }

  // Dynamic filter options
  const availableMakes = Array.from(new Set(aggregateInventoryList.map(item => item.make))).filter(Boolean).sort();
  const availableYears = Array.from(new Set(aggregateInventoryList.map(item => item.year))).filter(Boolean).sort((a, b) => b - a);

  // Filter listings based on input text and categories (Make, Year, Status)
  const filteredInventory = aggregateInventoryList.filter(item => {
    const searchStr = `${item.make} ${item.model} ${item.title} ${item.category}`.toLowerCase();
    const matchesSearch = searchStr.includes(adminSearch.toLowerCase());
    
    const matchesMake = !adminMakeFilter || item.make.toLowerCase() === adminMakeFilter.toLowerCase();
    const matchesYear = !adminYearFilter || item.year.toString() === adminYearFilter;
    
    const itemStatus = item.isUserListing ? (item.status || "pending") : "active";
    const matchesStatus = !adminStatusFilter || itemStatus === adminStatusFilter;
    
    return matchesSearch && matchesMake && matchesYear && matchesStatus;
  });

  const totalRevenueEstimates = passes.length * 1; // ₹1 per pass

  const isAuthorized = currentUser?.email === "afrojalamansari461@gmail.com" || devBypass;

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

        <div className="pt-4 border-t border-stone-200">
          <button
            onClick={() => {
              try {
                localStorage.setItem("autoWorld_admin_bypass", "true");
                setDevBypass(true);
                showToast("Developer Admin Bypass Enabled", "success");
              } catch (e) {
                console.error(e);
              }
            }}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black uppercase tracking-widest transition duration-200 cursor-pointer font-mono"
          >
            Bypass Owner Check (Dev Mode)
          </button>
        </div>
      </div>
    );
  }

  const handleEnterWorkspace = () => {
    playSynthBeep(900, 0.15, "triangle");
    setTimeout(() => playSynthBeep(1400, 0.35, "sine"), 120);
    try {
      sessionStorage.setItem("autoWorld_admin_entered", "true");
    } catch (e) {
      console.error(e);
    }
    setIsIntroActive(false);
  };

  return (
    <div className="relative min-h-screen bg-[#F4F1EA] overflow-hidden">
      {/* CINEMATIC FULL-SCREEN BOOT SEQUENCE OVERLAY */}
      <AnimatePresence>
        {isIntroActive && (
          <motion.div
            key="admin-boot-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(15px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[200] bg-[#090807] text-[#FAF8F5] flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden font-mono"
          >
            {/* Elegant Background Grid & Matrix effects */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.035)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
            
            {/* Continuous scanning line that sweeps vertically */}
            <motion.div 
              animate={{ y: ["-10%", "110%", "-10%"] }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
              className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/80 to-transparent shadow-[0_0_20px_rgba(168,85,247,0.7)] pointer-events-none"
              style={{ top: 0 }}
            />

            {/* Glowing framing borders that pulsate and frame the screen */}
            <div className="absolute inset-4 sm:inset-6 border border-stone-900 pointer-events-none rounded-xs">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-500/50 animate-pulse" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-500/50 animate-pulse" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-500/50 animate-pulse" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-500/50 animate-pulse" />
              
              {/* Floating micro indicators on border edges */}
              <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
              <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: "1s" }} />
            </div>

            {/* TOP BAR INFORMATION HUD */}
            <div className="flex items-center justify-between w-full z-10 px-4 pt-2">
              <div className="flex items-start gap-3.5 text-stone-500">
                <div className="p-2 border border-stone-800 bg-stone-950/70 rounded-xs flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-500 animate-pulse" />
                </div>
                <div className="text-left">
                  <span className="text-[9px] text-stone-400 font-extrabold uppercase tracking-[0.2em] block">CHRONOMETER</span>
                  <span className="text-sm text-purple-400 font-black tracking-widest font-mono">{liveTime || "04:19:00"}</span>
                  <span className="text-[8px] text-stone-600 block tracking-wider uppercase font-mono">LATENCY: 12ms // VERIFIED</span>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-[9px] text-stone-400 font-extrabold uppercase tracking-[0.2em] block">CONNECTION INGRESS</span>
                <span className="text-xs text-[#FAF8F5] font-black tracking-widest">PORT 3000 // STANDALONE</span>
                <span className="text-[8px] text-stone-600 block tracking-wider uppercase font-mono">PROTOCOLS: ENCRYPTED CRYPTO L5</span>
              </div>
            </div>

            {/* MAIN CENTRAL WORKSPACE CONSOLE */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full z-10 my-4 px-2">
              <div className="border-2 border-purple-500/40 bg-[#0c0a09]/95 p-6 sm:p-8 w-full shadow-[0_0_80px_rgba(168,85,247,0.2)] space-y-6 relative rounded-xs">
                {/* Active target rect lines */}
                <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-purple-500" />
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-purple-500" />
                <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-purple-500" />
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-purple-500" />

                {/* Header branding */}
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] font-black uppercase tracking-[0.2em]">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                    CLEARANCE: CERTIFIED OWNER
                  </div>
                  <p className="text-[9px] text-stone-400 font-bold uppercase tracking-[0.25em] block">
                    ESTABLISHING SECURE ADMIN SESSION
                  </p>

                  {/* Glowing spinning radar gauge */}
                  <div className="relative w-20 h-20 mx-auto my-4 flex items-center justify-center">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                      className="absolute inset-0 border-2 border-purple-500/40 border-t-purple-500 border-b-purple-500 rounded-full"
                    />
                    <motion.div 
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                      className="absolute inset-1.5 border border-purple-500/20 border-l-purple-500/60 border-r-purple-500/60 rounded-full"
                    />
                    <div className="w-13 h-13 bg-stone-950/90 border border-stone-800 rounded-full flex items-center justify-center relative shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                      <ShieldAlert className="w-6 h-6 text-purple-400 animate-pulse" />
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-widest text-[#FAF8F5] leading-none">
                    ADMIN CONTROL DECK
                  </h2>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-950/80 border border-purple-500/40 text-purple-200 text-[10px] font-black uppercase tracking-widest rounded-xs">
                    SYSTEM OWNER: <span className="text-white font-extrabold bg-purple-900/50 px-1 py-0.5 rounded-xs">AFROJ ALAM</span>
                  </div>
                </div>

                {/* Custom terminal console logs display */}
                <div className="bg-[#060505] border border-stone-850 p-3.5 h-28 overflow-y-auto font-mono text-[9px] text-left space-y-1.5 rounded-xs select-text scrollbar-thin">
                  {terminalLogs.map((log, idx) => (
                    <div key={idx} className="text-stone-300 leading-normal flex items-start gap-1.5 font-mono">
                      <span className="text-purple-500 select-none shrink-0">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                  {introProgress < 100 && (
                    <div className="inline-block w-1.5 h-3 bg-purple-500 animate-pulse" />
                  )}
                </div>

                {/* Calibration progress bar */}
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between text-[9px] text-stone-400 font-bold uppercase tracking-wider font-mono">
                    <span>SYNCING LEDGER INDEXES</span>
                    <span className="text-purple-400 font-black">{Math.min(100, introProgress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#120f0d] border border-stone-850 p-0.5 rounded-none overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-400 shadow-[0_0_12px_rgba(168,85,247,0.8)] transition-all duration-150 ease-out"
                      style={{ width: `${Math.min(100, introProgress)}%` }}
                    />
                  </div>
                </div>

                {/* Interactive entrance activation button */}
                <div className="pt-2">
                  <button
                    onClick={handleEnterWorkspace}
                    className={`w-full py-3.5 border text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer font-mono flex items-center justify-center gap-2 ${
                      introProgress >= 100
                        ? "border-purple-500 bg-purple-500/10 hover:bg-purple-500 hover:text-stone-950 text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.3)] active:scale-95"
                        : "border-stone-850 bg-stone-950/40 text-stone-600 cursor-not-allowed"
                    }`}
                    disabled={introProgress < 100}
                  >
                    <span>ENTER WORKSPACE</span>
                  </button>
                </div>
              </div>
            </div>

            {/* HUD BOTTOM BAR */}
            <div className="flex items-center justify-between w-full z-10 px-4 pb-2 text-[8px] text-stone-500 font-mono select-none">
              <span className="uppercase">AUTOWORLD PLATFORM ENGINE v2.4 // LEDGER MASTER CONTROLS</span>
              <span className="hidden sm:inline uppercase">SYSTEM INFRASTRUCTURE STATUS: STABLE AND DEPLOYED ON PORT 3000</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, scale: 0.995, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        id="admin-desk-view" 
        className="relative bg-[#F4F1EA] py-10 min-h-screen overflow-hidden"
      >
      
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

        {/* At-a-Glance Firestore Analytics Chart */}
        <div className="bg-[#FAF8F5] border-2 border-stone-950 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-stone-200 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-purple-600 tracking-widest uppercase font-mono block">
                // PLATFORM_STATUS_METRICS_CHANNEL
              </span>
              <h2 className="text-lg font-serif font-black text-stone-950 uppercase flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-stone-900" />
                {chartMode === "status" 
                  ? "Firestore Listings Status Distribution" 
                  : chartMode === "active-categories" 
                    ? "Active Listings Category Breakdown" 
                    : "30-Day Listing Publication Activity"
                }
              </h2>
              <p className="text-stone-500 text-[10px] uppercase font-mono leading-relaxed">
                {chartMode === "status" 
                  ? "Live visualization of Active, Pending, and Sold listings created by users in production"
                  : chartMode === "active-categories"
                    ? "Granular breakdown of Active published listings categorized by vehicle type (SUV, Sedan, Motorcycle, etc.)"
                    : "Time-series representation of newly created vehicle listings over the last 30 days"
                }
              </p>
            </div>

            {/* Filter Toggle and Metrics Segment */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              {/* Toggle controls */}
              <div className="flex items-center border-2 border-stone-950 p-0.5 bg-stone-100 font-mono text-[9px] font-black uppercase">
                <button
                  type="button"
                  onClick={() => { playSynthBeep(850, 0.05); chartMode !== "status" && setChartMode("status"); }}
                  className={`px-3 py-1.5 transition duration-150 cursor-pointer ${
                    chartMode === "status"
                      ? "bg-stone-950 text-white shadow-sm"
                      : "text-stone-600 hover:text-stone-950"
                  }`}
                >
                  Overall Status
                </button>
                <button
                  type="button"
                  onClick={() => { playSynthBeep(900, 0.05); chartMode !== "active-categories" && setChartMode("active-categories"); }}
                  className={`px-3 py-1.5 transition duration-150 cursor-pointer ${
                    chartMode === "active-categories"
                      ? "bg-purple-900 text-white shadow-sm"
                      : "text-stone-600 hover:text-stone-950"
                  }`}
                >
                  Active Categories
                </button>
                <button
                  type="button"
                  onClick={() => { playSynthBeep(950, 0.05); chartMode !== "activity-30" && setChartMode("activity-30"); }}
                  className={`px-3 py-1.5 transition duration-150 cursor-pointer ${
                    chartMode === "activity-30"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-stone-600 hover:text-stone-950"
                  }`}
                >
                  30-Day Activity
                </button>
              </div>

              {/* Status Indicators Legend */}
              <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider font-mono bg-stone-50 border border-stone-200 p-2 rounded-sm shrink-0">
                {chartMode === "status" ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#16a34a] border border-stone-950 rounded-xs" />
                      <span>Active ({listings.filter(l => l.status === "active").length})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#d97706] border border-stone-950 rounded-xs" />
                      <span>Pending ({listings.filter(l => l.status === "pending" || !l.status).length})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#4b5563] border border-stone-950 rounded-xs" />
                      <span>Sold ({listings.filter(l => l.status === "sold").length})</span>
                    </div>
                  </>
                ) : chartMode === "active-categories" ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#16a34a] border border-stone-950 rounded-xs" />
                      <span>SUV ({listings.filter(l => l.status === "active" && l.category?.toLowerCase() === "suv").length})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#2563eb] border border-stone-950 rounded-xs" />
                      <span>Sedan ({listings.filter(l => l.status === "active" && (l.category?.toLowerCase() === "car" || l.category?.toLowerCase() === "sedan" || !l.category)).length})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#ea580c] border border-stone-950 rounded-xs" />
                      <span>Motorcycle ({listings.filter(l => l.status === "active" && l.category?.toLowerCase() === "motorcycle").length})</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-amber-500 border border-stone-950 rounded-xs" />
                      <span>30-Day Sum ({listings.length} Specimen)</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="w-full h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "activity-30" ? (
                <LineChart
                  data={get30DaysListingActivity()}
                  margin={{ top: 15, right: 25, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#1c1917"
                    tick={{ fontSize: 8, fontFamily: "monospace", fontWeight: "bold" }}
                  />
                  <YAxis 
                    stroke="#1c1917"
                    tick={{ fontSize: 9, fontFamily: "monospace", fontWeight: "bold" }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#FAF8F5] border-2 border-stone-950 p-2.5 font-mono text-[9px] font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-stone-950 font-black">Date: {payload[0].payload.fullDate}</p>
                            <p className="text-amber-600 mt-1">Injected: {payload[0].value} listings</p>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#d97706" 
                    strokeWidth={3} 
                    dot={{ r: 4, stroke: '#1c1917', strokeWidth: 1.5, fill: '#f59e0b' }}
                    activeDot={{ r: 6, stroke: '#1c1917', strokeWidth: 2, fill: '#ffffff' }}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={
                    chartMode === "status"
                      ? [
                          { name: "Active", count: listings.filter(l => l.status === "active").length },
                          { name: "Pending", count: listings.filter(l => l.status === "pending" || !l.status).length },
                          { name: "Sold", count: listings.filter(l => l.status === "sold").length }
                        ]
                      : [
                          { name: "SUV", count: listings.filter(l => l.status === "active" && l.category?.toLowerCase() === "suv").length },
                          { name: "Sedan / Car", count: listings.filter(l => l.status === "active" && (l.category?.toLowerCase() === "car" || l.category?.toLowerCase() === "sedan" || !l.category)).length },
                          { name: "Motorcycle", count: listings.filter(l => l.status === "active" && l.category?.toLowerCase() === "motorcycle").length },
                          { name: "Truck", count: listings.filter(l => l.status === "active" && l.category?.toLowerCase() === "truck").length },
                          { name: "Van", count: listings.filter(l => l.status === "active" && l.category?.toLowerCase() === "van").length },
                          { name: "Bicycle", count: listings.filter(l => l.status === "active" && l.category?.toLowerCase() === "bicycle").length },
                          { name: "Commercial", count: listings.filter(l => l.status === "active" && l.category?.toLowerCase() === "commercial").length },
                          { name: "Other", count: listings.filter(l => l.status === "active" && (l.category?.toLowerCase() === "other" || !["suv", "car", "sedan", "motorcycle", "truck", "van", "bicycle", "commercial"].includes(l.category?.toLowerCase() || ""))).length }
                        ]
                  }
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#1c1917"
                    tick={{ fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                  />
                  <YAxis 
                    stroke="#1c1917"
                    tick={{ fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }} />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={60}>
                    {
                      (chartMode === "status"
                        ? [
                            { fill: "#16a34a" },
                            { fill: "#d97706" },
                            { fill: "#4b5563" }
                          ]
                        : [
                            { fill: "#16a34a" },
                            { fill: "#2563eb" },
                            { fill: "#ea580c" },
                            { fill: "#dc2626" },
                            { fill: "#7c3aed" },
                            { fill: "#db2777" },
                            { fill: "#0d9488" },
                            { fill: "#4b5563" }
                          ]
                      ).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="#1c1917" strokeWidth={1.5} />
                      ))
                    }
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
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

          <button
            onClick={() => { playSynthBeep(1000, 0.05); setActiveSubSection("audit"); }}
            className={`flex-1 min-w-[120px] py-3 text-center text-xs uppercase tracking-widest font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeSubSection === "audit"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <Clock className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
            Admin Audit Log ({auditLogs.length})
          </button>
        </div>

        {/* LOADING INDICATOR PANEL */}
        {isLoading ? (
          <div className="my-12">
            <div className="mb-6 flex items-center justify-between">
              <div className="h-4 bg-stone-300 w-48 rounded-xs animate-pulse" />
              <div className="h-4 bg-stone-300 w-24 rounded-xs animate-pulse" />
            </div>
            <SkeletonLoader count={6} />
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

                    <button
                      onClick={() => { playSynthBeep(900, 0.15, "triangle"); setShowIntakeForm(!showIntakeForm); }}
                      className="px-4 py-2.5 bg-purple-900 hover:bg-purple-800 text-white text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 transition border border-purple-950 font-mono shadow-[0_0_12px_rgba(147,51,234,0.3)] animate-pulse cursor-pointer self-start md:self-center"
                    >
                      <Plus className="w-4 h-4 text-purple-300" />
                      Add New Specimen
                    </button>
                    
                    {/* View filter buttons */}
                    <div className="flex items-center border border-stone-300 p-0.5 bg-stone-100/60 self-start md:self-center font-mono text-[9px] font-black flex-wrap gap-0.5">
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
                      <button
                        onClick={() => { playSynthBeep(850, 0.05); setInventoryFilter("hidden"); }}
                        className={`px-3 py-1.5 uppercase transition cursor-pointer flex items-center gap-1 ${
                          inventoryFilter === "hidden"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-amber-600 hover:bg-amber-100"
                        }`}
                        title="Show hidden static default vehicles"
                      >
                        <EyeOff className="w-3 h-3 text-amber-500 shrink-0" />
                        Archived ({allDefaultsMapped.filter(item => hiddenDefaultIds.includes(item.id)).length})
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
                      <CheckCircle className="w-4 h-4 text-purple-600 shrink-0" />
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

                <AnimatePresence>
                  {showIntakeForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-6"
                    >
                      <form 
                        onSubmit={handleSubmitIntake}
                        className="bg-[#FAF8F5] border-2 border-stone-900 p-6 space-y-6 shadow-[6px_6px_0px_0px_rgba(168,85,247,0.2)]"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                          <div className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-purple-600" />
                            <h3 className="text-xs sm:text-sm font-serif font-black uppercase text-stone-900 tracking-tight">Cyber Vehicle Intake Console</h3>
                          </div>
                          <span className="text-[9px] font-mono font-black uppercase bg-purple-150 text-purple-950 border border-purple-300 px-2.5 py-1">Mode: Direct Database Insertion</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          {/* Make select */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Make / Brand *</label>
                            <select
                              value={newMake}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewMake(val);
                                setNewModel("");
                                if (val && val !== "Other") {
                                  const inferredCat = Object.keys(VEHICLE_MAKES).find(cat => 
                                    VEHICLE_MAKES[cat].includes(val)
                                  );
                                  if (inferredCat) setNewCategory(inferredCat);
                                }
                              }}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            >
                              <option value="">Select Manufacturer</option>
                              {Array.from(new Set(Object.values(VEHICLE_MAKES).flat())).filter(m => m !== "Other").sort().map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                              <option value="Other">Other / Custom Brand</option>
                            </select>
                            {newMake === "Other" && (
                              <input
                                type="text"
                                placeholder="Enter custom brand"
                                value={newCustomMake}
                                onChange={(e) => setNewCustomMake(e.target.value)}
                                className="w-full mt-1.5 px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                                required
                              />
                            )}
                          </div>

                          {/* Model select */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Model *</label>
                            <select
                              value={newModel}
                              onChange={(e) => setNewModel(e.target.value)}
                              disabled={!newMake}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 disabled:opacity-50 text-stone-900"
                              required
                            >
                              <option value="">Select Model</option>
                              {newMake && (VEHICLE_MODELS[newMake] || Object.values(VEHICLE_MODELS).flat()).map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                              <option value="Other">Other Model</option>
                            </select>
                            {newModel === "Other" && (
                              <input
                                type="text"
                                placeholder="Enter custom model"
                                value={newCustomModel}
                                onChange={(e) => setNewCustomModel(e.target.value)}
                                className="w-full mt-1.5 px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                                required
                              />
                            )}
                          </div>

                          {/* Category select */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Category / Type *</label>
                            <select
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            >
                              <option value="car">Car / Sedan</option>
                              <option value="suv">SUV</option>
                              <option value="truck">Truck</option>
                              <option value="van">Van</option>
                              <option value="motorcycle">Motorcycle</option>
                              <option value="bicycle">Bicycle</option>
                              <option value="commercial">Commercial Vehicle</option>
                              <option value="other">Other / Custom</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                          {/* Price */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Price (INR) *</label>
                            <input
                              type="number"
                              placeholder="e.g. 1500000"
                              value={newPrice}
                              onChange={(e) => setNewPrice(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            />
                          </div>

                          {/* Year */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Year *</label>
                            <input
                              type="number"
                              value={newYear}
                              onChange={(e) => setNewYear(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            />
                          </div>

                          {/* Mileage */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Mileage (km or mi) *</label>
                            <input
                              type="text"
                              value={newMileage}
                              onChange={(e) => setNewMileage(e.target.value)}
                              placeholder="e.g. 12,500 km"
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            />
                          </div>

                          {/* Fuel */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Fuel Type *</label>
                            <select
                              value={newFuel}
                              onChange={(e) => setNewFuel(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                            >
                              <option value="Petrol">Petrol</option>
                              <option value="Diesel">Diesel</option>
                              <option value="Electric">Electric</option>
                              <option value="Hybrid">Hybrid</option>
                              <option value="CNG">CNG</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                          {/* Transmission */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Transmission *</label>
                            <select
                              value={newTransmission}
                              onChange={(e) => setNewTransmission(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                            >
                              <option value="Automatic">Automatic</option>
                              <option value="Manual">Manual</option>
                              <option value="Semi-Automatic">Semi-Automatic</option>
                            </select>
                          </div>

                          {/* Badge control */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Custom Spec Badge Tag</label>
                            <select
                              value={newBadge || ""}
                              onChange={(e) => setNewBadge((e.target.value as any) || null)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                            >
                              <option value="">Standard (No Badge)</option>
                              <option value="verified">Verified (Verified Checklist)</option>
                              <option value="premium">Premium (Featured Specimen)</option>
                              <option value="hot">Hot Deal (Urgent Placement)</option>
                            </select>
                          </div>

                          {/* Negotiable */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Negotiable Ask *</label>
                            <select
                              value={newNegotiable}
                              onChange={(e) => setNewNegotiable(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                            >
                              <option value="no">Fixed Ask (No negotiation)</option>
                              <option value="yes">Yes, Negotiable</option>
                            </select>
                          </div>
                        </div>

                        {/* HIGH-FIDELITY ADDED ATTRIBUTES */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                          {/* Engine Spec */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Engine Specifications</label>
                            <input
                              type="text"
                              value={newEngine}
                              onChange={(e) => setNewEngine(e.target.value)}
                              placeholder="e.g. 3.0L Twin-Turbo V6"
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                            />
                          </div>

                          {/* Paint Color */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Exterior Paint / Color</label>
                            <input
                              type="text"
                              value={newColor}
                              onChange={(e) => setNewColor(e.target.value)}
                              placeholder="e.g. Aventurine Metallic Green"
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                            />
                          </div>

                          {/* Number of Owners */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Owner Count Index</label>
                            <select
                              value={newOwners}
                              onChange={(e) => setNewOwners(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                            >
                              <option value="1st Owner">1st Owner (Single)</option>
                              <option value="2nd Owner">2nd Owner</option>
                              <option value="3rd Owner">3rd Owner</option>
                              <option value="4th+ Owner">4th+ Owner</option>
                            </select>
                          </div>

                          {/* Registration State ID */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Registration Plate ID</label>
                            <input
                              type="text"
                              value={newRegNumber}
                              onChange={(e) => setNewRegNumber(e.target.value)}
                              placeholder="e.g. MH-12 or DL-4C"
                              className="w-full px-3 py-2 bg-[#FAF8F5] text-stone-900 text-xs border border-stone-300 focus:border-stone-900 font-sans outline-none"
                            />
                          </div>
                        </div>

                        {/* Image field with premium Unsplash tag shortcuts */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Specimen Cover Image URL *</label>
                          <input
                            type="url"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                            required
                          />
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[8px] font-mono font-bold text-stone-400 uppercase tracking-wider mr-1">Quick Presets:</span>
                            {[
                              { label: "🚗 Porsche 911", url: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80" },
                              { label: "🚙 Mahindra Thar", url: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&auto=format&fit=crop&q=80" },
                              { label: "🏍 RE Classic", url: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800&auto=format&fit=crop&q=80" },
                              { label: "⚡ Tesla Model Y", url: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&auto=format&fit=crop&q=80" },
                              { label: "⛰ Toyota Fortuner", url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800" },
                              { label: "🏎 Lamborghini", url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&auto=format&fit=crop&q=80" }
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => { playSynthBeep(950, 0.08); setNewImageUrl(preset.url); }}
                                className="px-2 py-1 bg-stone-105 hover:bg-stone-200 border border-stone-300 text-[8px] font-mono font-bold uppercase tracking-wider transition cursor-pointer text-stone-800"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Description & Features */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Dossier Narrative Description</label>
                            <textarea
                              rows={3}
                              placeholder="Describe the condition, owner history, and mechanical highlights..."
                              value={newDescription}
                              onChange={(e) => setNewDescription(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Mechanical Features (comma-separated)</label>
                            <textarea
                              rows={3}
                              placeholder="e.g. ABS, Airbags, Sunroof, Leather Seats, Ceramic Coating"
                              value={newFeatures}
                              onChange={(e) => setNewFeatures(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                            />
                          </div>
                        </div>

                        {/* Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 pt-3 border-t border-stone-200">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Location *</label>
                            <input
                              type="text"
                              value={newLocation}
                              onChange={(e) => setNewLocation(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Seller Name *</label>
                            <input
                              type="text"
                              value={newSellerName}
                              onChange={(e) => setNewSellerName(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Seller Phone *</label>
                            <input
                              type="text"
                              value={newSellerPhone}
                              onChange={(e) => setNewSellerPhone(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Seller Email *</label>
                            <input
                              type="email"
                              value={newSellerEmail}
                              onChange={(e) => setNewSellerEmail(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 text-xs font-semibold focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            />
                          </div>
                        </div>

                        {/* Submission triggers */}
                        <div className="flex items-center justify-end gap-3 pt-3">
                          <button
                            type="button"
                            onClick={() => { playSynthBeep(400, 0.1); setShowIntakeForm(false); }}
                            className="px-4 py-2.5 bg-stone-105 hover:bg-stone-200 text-stone-700 text-[10px] font-bold uppercase tracking-widest border border-stone-300 font-mono transition cursor-pointer"
                          >
                            Abort Intake
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingIntake}
                            className="px-6 py-2.5 bg-purple-900 hover:bg-purple-800 text-white text-[10px] font-black uppercase tracking-widest border border-purple-950 font-mono transition flex items-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.3)] disabled:opacity-50"
                          >
                            {isSubmittingIntake ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                COMPILING SPECIMEN...
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 text-purple-300" />
                                COMPILE & INJECT TO DATABASE
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Search & Category Filter Hub */}
                <div className="bg-[#FAF8F5] border border-stone-300 p-4 space-y-3">
                  <div className="flex flex-col md:flex-row items-center gap-3">
                    <div className="relative flex-grow w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Search specific inventory by make, model, category, title..."
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white text-stone-900 text-xs border border-stone-300 focus:border-stone-950 font-sans outline-none placeholder:text-stone-400 shadow-xs"
                      />
                    </div>
                    {/* Reset Button if any filter active */}
                    {(adminSearch || adminMakeFilter || adminYearFilter || adminStatusFilter) && (
                      <button
                        onClick={() => {
                          playSynthBeep(450, 0.05);
                          setAdminSearch("");
                          setAdminMakeFilter("");
                          setAdminYearFilter("");
                          setAdminStatusFilter("");
                        }}
                        className="text-[10px] font-mono font-bold bg-stone-100 hover:bg-stone-200 border border-stone-300 px-3 py-2.5 cursor-pointer transition uppercase tracking-wider text-stone-700 whitespace-nowrap self-stretch md:self-auto text-center"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  {/* Multi-category Filtering Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 font-mono text-[10px] font-bold uppercase tracking-wider text-stone-800">
                    {/* Make Filter Dropdown */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] text-stone-400">Filter By Make</label>
                      <select
                        value={adminMakeFilter}
                        onChange={(e) => { playSynthBeep(850, 0.04); setAdminMakeFilter(e.target.value); }}
                        className="px-2.5 py-2 bg-white border border-stone-300 focus:border-stone-950 text-stone-900 text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="">[ ALL MAKES ]</option>
                        {availableMakes.map(m => (
                          <option key={m} value={m}>{m.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Year Filter Dropdown */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] text-stone-400">Filter By Year</label>
                      <select
                        value={adminYearFilter}
                        onChange={(e) => { playSynthBeep(850, 0.04); setAdminYearFilter(e.target.value); }}
                        className="px-2.5 py-2 bg-white border border-stone-300 focus:border-stone-950 text-stone-900 text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="">[ ALL YEARS ]</option>
                        {availableYears.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter Dropdown */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] text-stone-400">Filter By Status</label>
                      <select
                        value={adminStatusFilter}
                        onChange={(e) => { playSynthBeep(850, 0.04); setAdminStatusFilter(e.target.value); }}
                        className="px-2.5 py-2 bg-white border border-stone-300 focus:border-stone-950 text-stone-900 text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="">[ ALL STATUSES ]</option>
                        <option value="active">🟢 ACTIVE / PUBLISHED</option>
                        <option value="pending">🟡 PENDING APPROVAL</option>
                        <option value="sold">⚫ SOLD / ARCHIVED</option>
                      </select>
                    </div>

                    {/* Results Count Widget */}
                    <div className="flex flex-col gap-1 justify-end">
                      <div className="text-[10px] uppercase font-black tracking-widest text-stone-900 text-center py-2 bg-stone-105 border border-stone-300 h-[34px] flex items-center justify-center">
                        MATCHING: {filteredInventory.length} / {aggregateInventoryList.length} CARS
                      </div>
                    </div>
                  </div>
                </div>

                {/* SELECT ALL & SELECTION ACTIONS HUB */}
                <div className="bg-[#FAF8F5] border-2 border-stone-950 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {/* Select All Checkbox */}
                  <div className="flex items-center gap-3">
                    <label className="relative flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={filteredInventory.length > 0 && filteredInventory.every(item => selectedKeys.includes(`${item.isUserListing ? "user" : "default"}-${item.id}`))}
                        onChange={() => {
                          playSynthBeep(900, 0.05);
                          handleSelectAllFiltered(filteredInventory);
                        }}
                        className="w-4 h-4 accent-purple-800 rounded border-stone-400 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-950">
                        Select All Cars / Every Exist Vehicle ({filteredInventory.length})
                      </span>
                    </label>
                    {selectedKeys.length > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-950 text-[8px] font-black uppercase tracking-wider border border-purple-300 animate-pulse">
                        {selectedKeys.length} SELECTED
                      </span>
                    )}
                  </div>

                  {/* Actions for selected list */}
                  {selectedKeys.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mr-1.5 self-center">Selection Actions:</span>
                      
                      <button
                        onClick={() => { playSynthBeep(950, 0.08); handleBulkApproveSelected(); }}
                        className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-850 text-white text-[9px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shadow-sm"
                        title="Approve selected user postings"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Approve
                      </button>

                      <button
                        onClick={() => { playSynthBeep(650, 0.08); handleBulkUnapproveSelected(); }}
                        className="px-2.5 py-1.5 bg-stone-105 hover:bg-stone-200 text-stone-900 border border-stone-305 text-[9px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shadow-sm"
                        title="Unapprove selected user postings"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                        Hold
                      </button>

                      <button
                        onClick={() => { playSynthBeep(1100, 0.1); handleBulkVerifySelected(); }}
                        className="px-2.5 py-1.5 bg-purple-900 hover:bg-purple-800 text-white text-[9px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shadow-sm shadow-purple-950/20"
                        title="Award verified badge to selected items"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-purple-300" />
                        Verify
                      </button>

                      <button
                        onClick={() => { playSynthBeep(850, 0.08); handleBulkHideSelected(); }}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shadow-sm"
                        title="Hide selected default static items"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                        Archive Static
                      </button>

                      <button
                        onClick={() => { playSynthBeep(450, 0.2, "sawtooth"); handleBulkDeleteSelectedPermanently(); }}
                        className="px-2.5 py-1.5 bg-red-650 hover:bg-red-750 text-white text-[9px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1 border border-red-800 shadow-sm"
                        title="Permanently scrub all selected items from platform database"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-200" />
                        Scrub Forever
                      </button>

                      <button
                        onClick={() => { playSynthBeep(500, 0.05); setSelectedKeys([]); }}
                        className="text-[9px] font-bold text-stone-500 hover:text-stone-950 underline ml-2 cursor-pointer uppercase tracking-wider"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest italic">Check individual cards or Select All to unlock bulk channels</span>
                  )}
                </div>

                {/* Grid items */}
                {filteredInventory.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#FAF8F5] border-2 border-stone-950 p-8 sm:p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center relative overflow-hidden"
                  >
                    {/* Retro Grid Background Overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />
                    
                    {/* Custom SVG Blueprint Illustration for No Results */}
                    <div className="relative w-48 h-32 mb-6 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full text-stone-300" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Blueprint Chassis Outlines */}
                        <path d="M20 90 H180 M30 90 L45 50 H155 L170 90" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                        <circle cx="55" cy="90" r="14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                        <circle cx="145" cy="90" r="14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                        
                        {/* Animated Magnifying Lens Sweeping Across the Empty Chassis */}
                        <motion.g
                          animate={{ 
                            x: [0, 40, -30, 0],
                            y: [0, -10, 5, 0]
                          }}
                          transition={{ 
                            duration: 6, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                        >
                          {/* Search Glass Circle */}
                          <circle cx="100" cy="60" r="22" fill="#FAF8F5" stroke="#1c1917" strokeWidth="2.5" className="shadow-sm" />
                          <circle cx="100" cy="60" r="17" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="2 2" />
                          {/* Handle of Magnifying Glass */}
                          <path d="M116 76 L130 90" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
                          {/* Inside Sparkles of empty search */}
                          <path d="M96 52 H104 M100 48 V56" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
                        </motion.g>
                      </svg>
                    </div>

                    {/* Bold Typography & Explanation */}
                    <div className="max-w-md space-y-2 relative z-10">
                      <span className="text-[9px] font-black text-amber-600 tracking-widest uppercase font-mono block">
                        // SEARCH_REGISTRY_NULL
                      </span>
                      <h3 className="text-base font-serif font-black uppercase text-stone-950 tracking-tight">
                        No Matching Specimen Identified
                      </h3>
                      <p className="text-stone-500 text-[11px] uppercase font-mono leading-relaxed">
                        Your filter configuration yielded 0 matches across {aggregateInventoryList.length} total active vehicles. Try relaxing the search parameters or resetting filters.
                      </p>
                    </div>

                    {/* Reset Button Widget */}
                    <button
                      onClick={() => {
                        playSynthBeep(450, 0.05);
                        setAdminSearch("");
                        setAdminMakeFilter("");
                        setAdminYearFilter("");
                        setAdminStatusFilter("");
                      }}
                      className="mt-6 px-5 py-2.5 bg-stone-950 hover:bg-stone-800 text-white font-mono text-[10px] font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(168,85,247,0.3)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer relative z-10"
                    >
                      Reset All Filters & Show Full Inventory
                    </button>
                  </motion.div>
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

                            {/* Interactive Card Selection Checkbox overlay */}
                            <div className="absolute top-2 right-2 z-10 bg-stone-950/85 backdrop-blur-xs p-1.5 border border-stone-850 rounded-sm hover:bg-stone-900 transition flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={selectedKeys.includes(`${item.isUserListing ? "user" : "default"}-${item.id}`)}
                                onChange={() => {
                                  playSynthBeep(850, 0.05);
                                  toggleSelectVehicle(`${item.isUserListing ? "user" : "default"}-${item.id}`);
                                }}
                                className="w-3.5 h-3.5 accent-purple-600 rounded border-stone-650 cursor-pointer"
                                title="Toggle select vehicle"
                              />
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
                                    <>
                                      {(item.status === "pending" || !item.status) && (
                                        <span className="uppercase px-2 py-0.5 border bg-amber-100 text-amber-800 border-amber-200">
                                          Pending Approval
                                        </span>
                                      )}
                                      {item.status === "active" && (
                                        <span className="uppercase px-2 py-0.5 border bg-emerald-100 text-emerald-800 border-emerald-200">
                                          Approved & Active
                                        </span>
                                      )}
                                      {item.status === "sold" && (
                                        <span className="uppercase px-2 py-0.5 border bg-stone-200 text-stone-600 border-stone-300">
                                          Sold / Archived
                                        </span>
                                      )}
                                    </>
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

                              {/* Direct Edit Spec */}
                              <button
                                onClick={() => onQuickView(item, true)}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 border border-amber-600 text-stone-950 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition"
                              >
                                <Wrench className="w-3 h-3 text-stone-950" />
                                Edit Spec
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
                                    onClick={(e) => {
                                      handleToggleVerified(listings.find(l => l.id === item.listingId)!);
                                      spawnParticles(e, '#c084fc', '+VERIFIED', '✨');
                                    }}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                                      listings.find(l => l.id === item.listingId)?.verified
                                        ? "bg-purple-700 text-white border-purple-800 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                        : "bg-[#FAF8F5] hover:bg-purple-50 border-stone-300 text-[#555]"
                                    }`}
                                  >
                                    <CheckCircle className={`w-3.5 h-3.5 ${listings.find(l => l.id === item.listingId)?.verified ? "text-purple-300 fill-purple-300/20" : "text-stone-400"}`} />
                                    <span className="shrink-0">{listings.find(l => l.id === item.listingId)?.verified ? "Verified" : "Verify"}</span>
                                  </button>

                                  {/* Featured control for User Listings */}
                                  <button
                                    onClick={(e) => {
                                      handleToggleFeatured(listings.find(l => l.id === item.listingId)!);
                                      spawnParticles(e, '#fbbf24', '+FEATURED', '⭐');
                                    }}
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
                                    onClick={(e) => {
                                      handleToggleUrgent(listings.find(l => l.id === item.listingId)!);
                                      spawnParticles(e, '#f87171', '+HOT DEAL', '🔥');
                                    }}
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
                                    onClick={(e) => {
                                      handleToggleDefaultBadge(item.id, "verified");
                                      spawnParticles(e, '#c084fc', '+VERIFIED', '✨');
                                    }}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                                      item.badge === "verified"
                                        ? "bg-purple-700 text-white border-purple-800 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                        : "bg-[#FAF8F5] hover:bg-purple-50 border-stone-300 text-[#555]"
                                    }`}
                                    title="Mark this static vehicle as verified"
                                  >
                                    <CheckCircle className={`w-3.5 h-3.5 ${item.badge === "verified" ? "text-purple-300 fill-purple-300/20" : "text-stone-400"}`} />
                                    <span className="shrink-0">{item.badge === "verified" ? "Verified" : "Verify"}</span>
                                  </button>

                                  {/* Featured control for default vehicle */}
                                  <button
                                    onClick={(e) => {
                                      handleToggleDefaultBadge(item.id, "premium");
                                      spawnParticles(e, '#fbbf24', '+FEATURED', '⭐');
                                    }}
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
                                    onClick={(e) => {
                                      handleToggleDefaultBadge(item.id, "hot");
                                      spawnParticles(e, '#f87171', '+HOT DEAL', '🔥');
                                    }}
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

                                  {/* Permanent Remove control for default vehicle */}
                                  <button
                                    onClick={() => handleRemoveDefaultPermanently(item.id)}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-300 text-red-650 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1.5 font-mono transition"
                                    title="Permanently remove default vehicle from platform"
                                  >
                                    <Trash2 className="w-3 h-3.5 shrink-0" />
                                    Remove
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

            {/* SUBSECTION 5: ADMIN AUDIT LOG */}
            {activeSubSection === "audit" && (
              <div className="space-y-6">
                <div className="bg-[#FAF8F5] border border-stone-300 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xs uppercase font-extrabold text-amber-600 tracking-wider font-mono flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                      SECURE AUDIT PIPELINE / SYSTEM AUDIT LOGS:
                    </h2>
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                      Immutable record of admin actions synchronized live from Google Cloud Firestore collection 'audit_logs'
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => { playSynthBeep(600, 0.05); await loadAuditLogs(); showToast("Audit logs refreshed!", "success"); }}
                      className="p-1.5 border border-stone-300 hover:bg-stone-100 text-stone-700 font-mono uppercase text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Sync system pipeline"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sync Tunnels
                    </button>
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-stone-900 text-white uppercase font-mono tracking-widest shrink-0">
                      Total Records: {auditLogs.length}
                    </span>
                  </div>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="bg-[#FAF8F5] border border-stone-300 py-20 text-center">
                    <Clock className="w-12 h-12 text-stone-300 mx-auto mb-3 animate-spin-slow" />
                    <h3 className="text-md uppercase font-bold tracking-widest text-stone-600">
                      No security audit records detected.
                    </h3>
                    <p className="text-stone-400 text-xs mt-1 uppercase font-mono">
                      Actions taken within this backoffice console are registered securely and immutably
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[700px] overflow-y-auto pr-1">
                    {auditLogs.map((log, idx) => {
                      const dateObj = new Date(log.timestamp);
                      const displayDate = isNaN(dateObj.getTime()) 
                        ? "Time Unspecified" 
                        : dateObj.toLocaleDateString("en-IN") + " " + dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                      let borderAccent = "border-l-stone-500";
                      let badgeColor = "bg-stone-100 text-stone-850 border-stone-300";
                      let actionLabel = log.actionType || "SYSTEM";

                      if (log.actionType === "delete_listing") {
                        borderAccent = "border-l-red-600";
                        badgeColor = "bg-red-50 text-red-950 border-red-200";
                        actionLabel = "PURGE_SPECIMEN";
                      } else if (log.actionType === "create_listing") {
                        borderAccent = "border-l-emerald-600";
                        badgeColor = "bg-emerald-50 text-emerald-950 border-emerald-200";
                        actionLabel = "INJECT_SPECIMEN";
                      } else if (log.actionType === "toggle_featured") {
                        borderAccent = "border-l-purple-600";
                        badgeColor = "bg-purple-50 text-purple-950 border-purple-200";
                        actionLabel = "TAG_FEATURED";
                      } else if (log.actionType === "toggle_verified") {
                        borderAccent = "border-l-blue-600";
                        badgeColor = "bg-blue-50 text-blue-950 border-blue-200";
                        actionLabel = "TAG_VERIFIED";
                      } else if (log.actionType === "toggle_urgent") {
                        borderAccent = "border-l-amber-600";
                        badgeColor = "bg-amber-50 text-amber-950 border-amber-200";
                        actionLabel = "TAG_HOT_DEAL";
                      } else if (log.actionType === "status_change") {
                        borderAccent = "border-l-amber-500";
                        badgeColor = "bg-amber-50 text-amber-950 border-amber-200";
                        actionLabel = "STATUS_OVERRIDE";
                      } else if (log.actionType === "delete_message") {
                        borderAccent = "border-l-rose-500";
                        badgeColor = "bg-rose-50 text-rose-950 border-rose-200";
                        actionLabel = "PURGE_INQUIRY";
                      } else if (log.actionType === "delete_feedback") {
                        borderAccent = "border-l-rose-600";
                        badgeColor = "bg-rose-50 text-rose-950 border-rose-200";
                        actionLabel = "PURGE_FEEDBACK";
                      } else if (log.actionType === "edit_listing") {
                        borderAccent = "border-l-sky-500";
                        badgeColor = "bg-sky-50 text-sky-950 border-sky-200";
                        actionLabel = "SPECIMEN_MODIFIED";
                      }

                      return (
                        <motion.div
                          key={log.id || idx}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                          className={`bg-[#FAF8F5] border border-stone-200 border-l-4 ${borderAccent} p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition duration-200 hover:bg-stone-50`}
                        >
                          <div className="space-y-1.5 flex-grow">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className={`text-[9px] font-mono font-black border px-2 py-0.5 uppercase tracking-widest ${badgeColor}`}>
                                {actionLabel}
                              </span>
                              <span className="text-[10px] text-stone-450 font-bold font-mono">
                                {displayDate}
                              </span>
                              <span className="text-[9px] text-stone-400 font-mono lowercase">
                                GUID: {log.id ? log.id.slice(0, 10) : "N/A"}
                              </span>
                            </div>
                            <p className="text-xs font-mono font-bold text-stone-850 leading-relaxed uppercase">
                              {log.description}
                            </p>
                          </div>
                          
                          <div className="text-right shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-stone-200">
                            <span className="text-[10px] text-stone-500 font-mono block">OPERATOR</span>
                            <span className="text-xs font-mono font-bold text-stone-800 block">
                              {log.adminEmail || "afrojalamansari461@gmail.com"}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Holographic HUD Alert Overlay */}
      <AnimatePresence>
        {hudAlert && hudAlert.visible && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-6 right-6 z-[60] w-96 bg-[#FAF8F5] border-2 border-stone-900 p-4 shadow-[5px_5px_0px_0px_rgba(120,53,4,0.15)] font-mono text-xs overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-stone-900" />
            <div className="flex items-start gap-3 pl-2">
              <div className="flex-grow space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-amber-600 tracking-widest uppercase">
                    // SYSTEM_ALERT_{hudAlert.type.toUpperCase()}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <h4 className="font-serif font-black text-stone-900 uppercase text-xs">
                  {hudAlert.title}
                </h4>
                <p className="text-stone-500 text-[10px] uppercase leading-relaxed">
                  {hudAlert.description}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-200 flex justify-between items-center text-[8px] text-stone-400 font-bold">
              <span>UTC TIMESTAMP: {new Date().toISOString().slice(11, 19)}</span>
              <span>STATUS: ACTIVE_LEDGER</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Holographic Confirmer Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px]"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#FAF8F5] border-3 border-stone-900 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-10 space-y-6"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b-2 border-stone-900">
                <div className={`w-3 h-3 rounded-none rotate-45 ${confirmModal.danger ? "bg-red-600" : "bg-purple-600"}`} />
                <h3 className="text-xs font-mono font-black tracking-wider uppercase text-stone-950">
                  {confirmModal.title || "SYSTEM RESOLUTION PROPOSAL"}
                </h3>
              </div>
              
              <p className="text-xs text-stone-800 leading-relaxed uppercase font-mono">
                {confirmModal.message}
              </p>
              
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => { playSynthBeep(400, 0.1); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
                  className="px-4 py-2 bg-stone-105 hover:bg-stone-200 border border-stone-300 text-[10px] font-bold uppercase tracking-widest font-mono cursor-pointer transition"
                >
                  ABORT TRANSACTION
                </button>
                
                <button
                  onClick={() => {
                    playSynthBeep(confirmModal.danger ? 1100 : 880, 0.25, "triangle");
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  className={`px-5 py-2 text-white text-[10px] font-black uppercase tracking-widest font-mono cursor-pointer transition ${
                    confirmModal.danger 
                      ? "bg-red-600 hover:bg-red-700 shadow-[0_0_12px_rgba(220,38,38,0.3)]" 
                      : "bg-stone-900 hover:bg-stone-800"
                  }`}
                >
                  {confirmModal.confirmText || "EXECUTE SPECIMEN CHANGE"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Particle Burst Layer */}
      <div className="pointer-events-none fixed inset-0 z-[70]">
        {clickParticles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, scale: 0.5, x: p.x, y: p.y }}
            animate={{ opacity: 0, scale: 1.5, y: p.y - 120, x: p.x + (Math.random() * 80 - 40) }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-1 select-none pointer-events-none"
            style={{ color: p.color, textShadow: "0 0 8px rgba(0,0,0,0.2)" }}
          >
            <span>{p.icon}</span>
            <span>{p.text}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
    </div>
  );
}
