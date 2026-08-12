import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { 
  ShieldAlert, Database, Trash2, Mail, Phone, Calendar, Heart, 
  Search, CheckCircle, RefreshCw, BarChart3, Tag, MessageSquare, 
  Crown, ExternalLink, Sparkles, Filter, Check, Eye, Plus, Award, 
  Clock, Settings, AlertCircle, Wrench, EyeOff, History, Home, ArrowUp, ArrowDown,
  Sliders, Shield, ShieldCheck, Calculator, HelpCircle, Info,
  Upload, FolderPlus, UploadCloud, Image, Users, UserCheck, Briefcase, Smartphone, Bell, Send
} from "lucide-react";
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, getDoc, onSnapshot } from "firebase/firestore";
import { User } from "firebase/auth";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { saveAdminSettingsToFirestore, saveCatalogOverride } from "../lib/catalogSync";
import { 
  SmsAlert, 
  SmsSettings, 
  getSmsSettings, 
  saveSmsSettingsLocally, 
  dispatchAdminSmsAlert, 
  fetchSmsHistory 
} from "../lib/notificationService";
import { Vehicle, DEFAULT_VEHICLES, UserListing, VEHICLE_MAKES, VEHICLE_MODELS, SparePart, DEFAULT_SPARE_PARTS } from "../types";
import { SkeletonLoader } from "./SkeletonLoader";
import AdminAuditLogs, { recordAuditLog } from "./AdminAuditLogs";
import RoleBadge from "./RoleBadge";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { 
  subscribeToUserRoles, 
  updateUserRole, 
  UserProfile, 
  UserRole, 
  ALL_ASSIGNABLE_ROLES,
  THE_7_ASSIGNABLE_ROLES, 
  ALL_ROLES, 
  OWNER_EMAIL 
} from "../lib/userRoles";

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
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    uid: string;
    userName: string;
    targetRole: UserRole;
    currentRole: UserRole;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubSection, setActiveSubSection] = useState<"inventory" | "spare_parts" | "leads" | "payments" | "feedback" | "audit" | "content" | "roles" | "sms">("inventory");
  const [adminSpareParts, setAdminSpareParts] = useState<SparePart[]>(DEFAULT_SPARE_PARTS);
  const [homePinnedSparePartIds, setHomePinnedSparePartIds] = useState<string[]>([]);
  const [sparePartsSearch, setSparePartsSearch] = useState("");
  const [sparePartsCatFilter, setSparePartsCatFilter] = useState("all");

  // Mobile SMS & Notification System States (+91 7666232753)
  const [smsSettings, setSmsSettings] = useState<SmsSettings>(() => getSmsSettings());
  const [smsHistory, setSmsHistory] = useState<SmsAlert[]>([]);
  const [smsSearch, setSmsSearch] = useState("");
  const [smsCategoryFilter, setSmsCategoryFilter] = useState<string>("all");

  // Content Customizer (Edit Mode) States
  const [footerEmail, setFooterEmail] = useState<string>(() => localStorage.getItem("autoWorld_footer_email") || "afrojalamansari461@gmail.com");
  const [footerPhone, setFooterPhone] = useState<string>(() => localStorage.getItem("autoWorld_footer_phone") || "+91 98765 43210");
  const [showroomAddress, setShowroomAddress] = useState<string>(() => localStorage.getItem("autoWorld_showroom_address") || "123 Auto Avenue, Corporate Square, Mumbai, Maharashtra 400001");
  const [loginQuote, setLoginQuote] = useState<string>(() => localStorage.getItem("autoWorld_login_quote") || "The pursuit of timeless mechanics, unyielding craftsmanship, and pure automotive art.");
  const [loginCarImage, setLoginCarImage] = useState<string>(() => localStorage.getItem("autoWorld_login_car_image") || "/monochrome-car.jpg");
  const [registerQuote, setRegisterQuote] = useState<string>(() => localStorage.getItem("autoWorld_register_quote") || "Join an elite global registry of automobile connoisseurs, verified collectors, and fine motor enthusiasts.");
  const [registerCarImage, setRegisterCarImage] = useState<string>(() => localStorage.getItem("autoWorld_register_car_image") || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80");
  const [heroTitle, setHeroTitle] = useState<string>(() => localStorage.getItem("autoWorld_hero_title") || "The Aesthetic of Fine Motors.");
  const [heroSubtitle, setHeroSubtitle] = useState<string>(() => localStorage.getItem("autoWorld_hero_subtitle") || "Refining the pre-owned vehicular trade network through uncompromised mechanical verification, pure high-fidelity listing specifications, and classical typographic clarity.");
  const [heroBadge, setHeroBadge] = useState<string>(() => localStorage.getItem("autoWorld_hero_badge") || "Volume IV • Issue 12 • Established MMXXVI");
  const [announcementText, setAnnouncementText] = useState<string>(() => localStorage.getItem("autoWorld_announcement_text") || "🔥 EXCLUSIVE PROMO: Unlimited verified listings and 0% buyer pass markup for all new users this week!");
  const [isAnnouncementEnabled, setIsAnnouncementEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_announcement_enabled");
      return stored !== null ? JSON.parse(stored) : true;
    } catch (e) {
      return true;
    }
  });

  const defaultDialogues = [
    { quote: "Ja Simran, jee le apni zindagi!", character: "Amrish Puri (Baldev Singh)", movie: "Dilwale Dulhania Le Jayenge (1995)", type: "Iconic DDLJ Classic" },
    { quote: "Aapke paon dekhe, bahut haseen hain. Inhein zameen par mat rakhiyega... maile ho jayenge.", character: "Raj Kumar", movie: "Pakeezah (1972)", type: "Romantic Dialogue" },
    { quote: "Mogambo khush hua!", character: "Amrish Puri (Mogambo)", movie: "Mr. India (1987)", type: "Villain Dialogue" },
    { quote: "Kitne aadmi the?", character: "Amjad Khan (Gabbar Singh)", movie: "Sholay (1975)", type: "Legendary Dialogue" },
    { quote: "Don ko pakadna mushkil hi nahi... namumkin hai!", character: "Amitabh Bachchan", movie: "Don (1978)", type: "Action Classic" },
    { quote: "Bade bade deshon mein aisi chhoti chhoti baatein hoti rehti hain, Senorita.", character: "Shah Rukh Khan (Raj)", movie: "DDLJ (1995)", type: "Romance Classic" },
    { quote: "Parampara, Pratishtha, Anushasan... Yeh is gurukul ke teen stambh hain.", character: "Amitabh Bachchan", movie: "Mohabbatein (2000)", type: "Discipline Quote" },
    { quote: "All IZZ WELL! Aah, tension lene ka nahi, sirf lene ka!", character: "Aamir Khan (Ranchoddas)", movie: "3 Idiots (2009)", type: "Youth Anthem" }
  ];

  const defaultFaqs = [
    { q: "Can I cancel my premium plan anytime?", a: "Yes, you hold full autonomy to pause, downgrade, or cancel subscription parameters at any time inside your dashboard. No contract locks!" },
    { q: "What payment forms do you authorize?", a: "We support major credit cards (Visa, Mastercard, American Express), securely monitored and protected." },
    { q: "How long does a listed car stay visible?", a: "Basic free accounts can list a car for 30 days. Pro members hold 60-day visibility, and Business listings stay up to 90 days." },
    { q: "Do you offer refunds if my vehicle sells before cycle ends?", a: "Because we activate immediate ad distribution tools and priority rankings upon upgrades, we don't offer prorated refunds, but you can cancel next term billings securely." }
  ];

  const [customDialogues, setCustomDialogues] = useState<Array<{ quote: string; character: string; movie: string; type: string }>>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_custom_dialogues");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return defaultDialogues;
  });

  const [customFaqs, setCustomFaqs] = useState<Array<{ q: string; a: string }>>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_custom_faqs");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return defaultFaqs;
  });

  // State for Editing Dialogues Modal/Form
  const [editingDialogueIdx, setEditingDialogueIdx] = useState<number | null>(null);
  const [dialogueForm, setDialogueForm] = useState<{ quote: string; character: string; movie: string; type: string }>({
    quote: "", character: "", movie: "", type: "Simran Special"
  });

  // State for Editing FAQ Modal/Form
  const [editingFaqIdx, setEditingFaqIdx] = useState<number | null>(null);
  const [faqForm, setFaqForm] = useState<{ q: string; a: string }>({ q: "", a: "" });
  
  // Custom states for spectacular welcome intro sequence and floating animations
  const [isIntroActive, setIsIntroActive] = useState(false);
  const [introProgress, setIntroProgress] = useState(100);
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
    // Disabled Admin Panel entry animation and sounds per user request
    setIsIntroActive(false);
  }, [currentUser]);

  // States for hidden default vehicles stored in localStorage to customize catalogs
  const [hiddenDefaultIds, setHiddenDefaultIds] = useState<number[]>([]);
  
  // Custom states for simulated permanent deletion of static defaults
  const [removedDefaultIds, setRemovedDefaultIds] = useState<number[]>([]);

  // States for customizable home page featured vehicles
  const [homeFeaturedIds, setHomeFeaturedIds] = useState<string[]>([]);

  // State for global Buy Pass Free ON/OFF mode
  const [isFreePassEnabled, setIsFreePassEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("autoWorld_is_free_pass") === "true";
    } catch (e) {
      return false;
    }
  });

  // Additional Functional Feature Toggles
  const [isSecureShieldEnabled, setIsSecureShieldEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_secure_shield");
      return stored !== null ? JSON.parse(stored) : true;
    } catch (e) {
      return true;
    }
  });

  const [isEmiCalculatorEnabled, setIsEmiCalculatorEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_emi_calculator");
      return stored !== null ? JSON.parse(stored) : true;
    } catch (e) {
      return true;
    }
  });

  const [isWhatsAppConnectEnabled, setIsWhatsAppConnectEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_whatsapp_connect");
      return stored !== null ? JSON.parse(stored) : true;
    } catch (e) {
      return true;
    }
  });

  const [isAiAssistantEnabled, setIsAiAssistantEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_ai_assistant");
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

  const [isFeaturedBoosterEnabled, setIsFeaturedBoosterEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_featured_booster");
      return stored !== null ? JSON.parse(stored) : true;
    } catch (e) {
      return true;
    }
  });

  const [isUrgentHotStampEnabled, setIsUrgentHotStampEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_urgent_hot_stamp");
      return stored !== null ? JSON.parse(stored) : true;
    } catch (e) {
      return true;
    }
  });

  const [isSmartMatcherEnabled, setIsSmartMatcherEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("autoWorld_is_smart_matcher");
      return stored !== null ? JSON.parse(stored) : true;
    } catch (e) {
      return true;
    }
  });

  const handleToggleFreePass = async () => {
    const isOwner = currentUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
    if (!isOwner) {
      showToast("Global Buy Pass monetization controls are reserved for the System Owner.", "error");
      return;
    }

    const nextVal = !isFreePassEnabled;
    setIsFreePassEnabled(nextVal);
    playSynthBeep(nextVal ? 950 : 450, 0.15, "triangle");
    
    try {
      localStorage.setItem("autoWorld_is_free_pass", JSON.stringify(nextVal));
    } catch (e) {
      console.warn("Error setting localStorage for autoWorld_is_free_pass:", e);
    }

    await saveAdminSettingsToFirestore({ isFreePassEnabled: nextVal });

    triggerHudAlert(
      nextVal ? "BUY PASS IS NOW FREE" : "BUY PASS IS NOW PAID (₹1)",
      nextVal
        ? "Global free pass override activated! All buyers have 100% free unlocked access."
        : "Standard monetization active. Buyers are required to pay ₹1 for daily access pass.",
      nextVal ? "approve" : "unapprove"
    );

    showToast(
      nextVal
        ? "Buy Pass Free Mode ENABLED — All buyers get free access!"
        : "Buy Pass Free Mode DISABLED — Standard ₹1 pass required.",
      nextVal ? "success" : "info"
    );
  };

  const handleTogglePinSparePart = async (partId: string, isCurrentlyPinned: boolean) => {
    const nextPinnedState = !isCurrentlyPinned;
    playSynthBeep(nextPinnedState ? 1100 : 450, 0.15, "triangle");

    let updatedPinnedIds = [...homePinnedSparePartIds];
    if (nextPinnedState) {
      if (!updatedPinnedIds.includes(partId)) updatedPinnedIds.push(partId);
    } else {
      updatedPinnedIds = updatedPinnedIds.filter(id => id !== partId);
    }

    setHomePinnedSparePartIds(updatedPinnedIds);
    try {
      localStorage.setItem("autoWorld_home_pinned_spare_parts", JSON.stringify(updatedPinnedIds));
    } catch (e) {}

    // Update state locally
    setAdminSpareParts(prev => prev.map(p => p.id === partId ? { ...p, isPinned: nextPinnedState } : p));

    // Update in Firestore
    try {
      await updateDoc(doc(db, "components", partId), { isPinned: nextPinnedState });
    } catch (e) {
      console.warn("Firestore components update doc skipped/failed:", e);
    }

    await saveAdminSettingsToFirestore({ homePinnedSparePartIds: updatedPinnedIds });

    triggerHudAlert(
      nextPinnedState ? "PART PINNED TO HOMEPAGE" : "PART UNPINNED FROM HOMEPAGE",
      nextPinnedState
        ? "This spare part is now featured on the homepage Vault showcase."
        : "Removed from homepage Vault showcase.",
      nextPinnedState ? "premium" : "hide"
    );

    showToast(
      nextPinnedState
        ? "✦ Spare part successfully pinned to Homepage Vault!"
        : "Spare part unpinned from Homepage Vault.",
      nextPinnedState ? "success" : "info"
    );
  };

  const handleToggleFeature = async (
    key: "isSecureShieldEnabled" | "isEmiCalculatorEnabled" | "isWhatsAppConnectEnabled" | "isAiAssistantEnabled" | "isSimranFreeModeEnabled" | "isFeaturedBoosterEnabled" | "isUrgentHotStampEnabled" | "isSmartMatcherEnabled",
    currentVal: boolean,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    label: string,
    storageKey: string
  ) => {
    const nextVal = !currentVal;
    setter(nextVal);
    playSynthBeep(nextVal ? 900 : 400, 0.15, "square");

    try {
      localStorage.setItem(storageKey, JSON.stringify(nextVal));
    } catch (e) {
      console.warn(`Error setting localStorage for ${storageKey}:`, e);
    }

    await saveAdminSettingsToFirestore({ [key]: nextVal });

    triggerHudAlert(
      `${label.toUpperCase()} ${nextVal ? "ENABLED" : "DISABLED"}`,
      `${label} feature toggle is now ${nextVal ? "ACTIVE" : "DISABLED"} across the platform.`,
      nextVal ? "approve" : "unapprove"
    );

    showToast(
      `${label} is now ${nextVal ? "ENABLED" : "DISABLED"}!`,
      nextVal ? "success" : "info"
    );
  };

  // SMS & Mobile Notification Handlers (+91 7666232753)
  const handleToggleMasterSms = (newVal: boolean) => {
    const updated = saveSmsSettingsLocally({ isSmsEnabled: newVal });
    setSmsSettings(updated);
    saveAdminSettingsToFirestore({ isSmsNotificationsEnabled: newVal });
    triggerHudAlert(
      newVal ? "MOBILE NOTIFICATIONS ACTIVATED" : "MOBILE NOTIFICATIONS PAUSED",
      newVal
        ? `Instant SMS & Mobile alerts active for recipient +91 ${smsSettings.targetNumber || "7666232753"}.`
        : "Mobile notifications master toggle turned off.",
      newVal ? "verified" : "unapprove"
    );
    showToast(
      newVal ? "Mobile SMS Notifications ENABLED (+91 7666232753)" : "Mobile SMS Notifications DISABLED",
      newVal ? "success" : "info"
    );
  };

  const handleToggleSmsCategory = (key: keyof SmsSettings, newVal: boolean) => {
    const updated = saveSmsSettingsLocally({ [key]: newVal });
    setSmsSettings(updated);
    saveAdminSettingsToFirestore({ [key]: newVal });
    showToast(`Updated notification preference!`, "success");
  };

  const handleSendTestSms = async () => {
    playSynthBeep(1200, 0.2, "sine");
    const targetNum = smsSettings.targetNumber || "7666232753";
    const alertRes = await dispatchAdminSmsAlert(
      "testSms",
      "🧪 TEST SMS DISPATCH",
      `Test SMS dispatch to target +91 ${targetNum}. All notification triggers operational. Timestamp: ${new Date().toLocaleTimeString()}`,
      { test: true }
    );
    if (alertRes) {
      showToast(`Test SMS alert dispatched to +91 ${targetNum}!`, "success");
    }
  };

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
  const [chartMode, setChartMode] = useState<"status" | "active-categories">("status");

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

    // 4. Load User Feedbacks (from feedbacks and userFeedback collections)
    try {
      const loadedFeedbacks: FirestoreFeedback[] = [];

      try {
        const feedbacksSnapshot = await getDocs(collection(db, "feedbacks"));
        feedbacksSnapshot.forEach((docSnap) => {
          const d = docSnap.data();
          loadedFeedbacks.push({
            id: docSnap.id,
            text: d.text || d.message || "",
            category: d.category || "suggestion",
            name: d.name || "",
            email: d.email || "",
            timestamp: d.timestamp || new Date().toISOString(),
            status: d.status || "active"
          });
        });
      } catch (e) {
        // Continue to userFeedback
      }

      try {
        const userFeedbackSnapshot = await getDocs(collection(db, "userFeedback"));
        userFeedbackSnapshot.forEach((docSnap) => {
          const d = docSnap.data();
          let ts = new Date().toISOString();
          if (d.createdAt) {
            if (typeof d.createdAt === 'string') ts = d.createdAt;
            else if (d.createdAt.seconds) ts = new Date(d.createdAt.seconds * 1000).toISOString();
            else if (d.createdAt instanceof Date) ts = d.createdAt.toISOString();
          }
          loadedFeedbacks.push({
            id: docSnap.id,
            text: d.message || d.text || "",
            category: d.category || "SUGGESTION",
            name: d.name || "",
            email: d.email || "",
            timestamp: ts,
            status: d.status || "unread"
          });
        });
      } catch (e) {
        // Continue
      }

      loadedFeedbacks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFeedbacks(loadedFeedbacks);
    } catch (err: any) {
      console.warn("Failed to load feedbacks:", err);
      try {
        const stored = localStorage.getItem("autoWorld_feedbacks");
        if (stored) {
          setFeedbacks(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 5. Load Admin Settings (e.g. Buy Pass Free status & feature toggles)
    try {
      const adminSnap = await getDoc(doc(db, "admin_settings", "catalog"));
      if (adminSnap.exists()) {
        const data = adminSnap.data();
        if (data.isFreePassEnabled !== undefined) {
          setIsFreePassEnabled(Boolean(data.isFreePassEnabled));
          localStorage.setItem("autoWorld_is_free_pass", JSON.stringify(Boolean(data.isFreePassEnabled)));
        }
        if (data.isSecureShieldEnabled !== undefined) {
          setIsSecureShieldEnabled(Boolean(data.isSecureShieldEnabled));
          localStorage.setItem("autoWorld_is_secure_shield", JSON.stringify(Boolean(data.isSecureShieldEnabled)));
        }
        if (data.isEmiCalculatorEnabled !== undefined) {
          setIsEmiCalculatorEnabled(Boolean(data.isEmiCalculatorEnabled));
          localStorage.setItem("autoWorld_is_emi_calculator", JSON.stringify(Boolean(data.isEmiCalculatorEnabled)));
        }
        if (data.isWhatsAppConnectEnabled !== undefined) {
          setIsWhatsAppConnectEnabled(Boolean(data.isWhatsAppConnectEnabled));
          localStorage.setItem("autoWorld_is_whatsapp_connect", JSON.stringify(Boolean(data.isWhatsAppConnectEnabled)));
        }
        if (data.isAiAssistantEnabled !== undefined) {
          setIsAiAssistantEnabled(Boolean(data.isAiAssistantEnabled));
          localStorage.setItem("autoWorld_is_ai_assistant", JSON.stringify(Boolean(data.isAiAssistantEnabled)));
        }
        if (data.isSimranFreeModeEnabled !== undefined) {
          setIsSimranFreeModeEnabled(Boolean(data.isSimranFreeModeEnabled));
          localStorage.setItem("autoWorld_is_simran_free_mode", JSON.stringify(Boolean(data.isSimranFreeModeEnabled)));
        }
        if (data.isFeaturedBoosterEnabled !== undefined) {
          setIsFeaturedBoosterEnabled(Boolean(data.isFeaturedBoosterEnabled));
          localStorage.setItem("autoWorld_is_featured_booster", JSON.stringify(Boolean(data.isFeaturedBoosterEnabled)));
        }
        if (data.isUrgentHotStampEnabled !== undefined) {
          setIsUrgentHotStampEnabled(Boolean(data.isUrgentHotStampEnabled));
          localStorage.setItem("autoWorld_is_urgent_hot_stamp", JSON.stringify(Boolean(data.isUrgentHotStampEnabled)));
        }
        if (data.isSmartMatcherEnabled !== undefined) {
          setIsSmartMatcherEnabled(Boolean(data.isSmartMatcherEnabled));
          localStorage.setItem("autoWorld_is_smart_matcher", JSON.stringify(Boolean(data.isSmartMatcherEnabled)));
        }
        if (data.footerEmail) {
          setFooterEmail(data.footerEmail);
          localStorage.setItem("autoWorld_footer_email", data.footerEmail);
        }
        if (data.footerPhone) {
          setFooterPhone(data.footerPhone);
          localStorage.setItem("autoWorld_footer_phone", data.footerPhone);
        }
        if (data.showroomAddress) {
          setShowroomAddress(data.showroomAddress);
          localStorage.setItem("autoWorld_showroom_address", data.showroomAddress);
        }
        if (data.loginQuote) {
          setLoginQuote(data.loginQuote);
          localStorage.setItem("autoWorld_login_quote", data.loginQuote);
        }
        if (data.loginCarImage) {
          setLoginCarImage(data.loginCarImage);
          localStorage.setItem("autoWorld_login_car_image", data.loginCarImage);
        }
        if (data.registerQuote) {
          setRegisterQuote(data.registerQuote);
          localStorage.setItem("autoWorld_register_quote", data.registerQuote);
        }
        if (data.registerCarImage) {
          setRegisterCarImage(data.registerCarImage);
          localStorage.setItem("autoWorld_register_car_image", data.registerCarImage);
        }
        if (data.heroTitle) {
          setHeroTitle(data.heroTitle);
          localStorage.setItem("autoWorld_hero_title", data.heroTitle);
        }
        if (data.heroSubtitle) {
          setHeroSubtitle(data.heroSubtitle);
          localStorage.setItem("autoWorld_hero_subtitle", data.heroSubtitle);
        }
        if (data.heroBadge) {
          setHeroBadge(data.heroBadge);
          localStorage.setItem("autoWorld_hero_badge", data.heroBadge);
        }
        if (data.announcementText) {
          setAnnouncementText(data.announcementText);
          localStorage.setItem("autoWorld_announcement_text", data.announcementText);
        }
        if (data.isAnnouncementEnabled !== undefined) {
          setIsAnnouncementEnabled(Boolean(data.isAnnouncementEnabled));
          localStorage.setItem("autoWorld_is_announcement_enabled", JSON.stringify(Boolean(data.isAnnouncementEnabled)));
        }
        if (data.customDialogues && data.customDialogues.length > 0) {
          setCustomDialogues(data.customDialogues);
          localStorage.setItem("autoWorld_custom_dialogues", JSON.stringify(data.customDialogues));
        }
        if (data.customFaqs && data.customFaqs.length > 0) {
          setCustomFaqs(data.customFaqs);
          localStorage.setItem("autoWorld_custom_faqs", JSON.stringify(data.customFaqs));
        }
      }
    } catch (e) {
      console.warn("Could not load admin_settings doc:", e);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    // 1. Real-time subscriber for listings
    const unsubListings = onSnapshot(collection(db, "listings"), (snapshot) => {
      const items: UserListing[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data() as UserListing, id: docSnap.id });
      });
      setListings(items);
    }, (err) => console.warn("Admin listings listener warning:", err));

    // 2. Real-time subscriber for messages
    const unsubMessages = onSnapshot(collection(db, "messages"), (snapshot) => {
      const msgs: FirestoreMessage[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        msgs.push({
          id: docSnap.id,
          name: d.name || "Anonymous",
          email: d.email || "",
          subject: d.subject || "No Subject",
          message: d.message || "",
          date: d.date || new Date().toISOString()
        });
      });
      msgs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMessages(msgs);
    }, (err) => console.warn("Admin messages listener warning:", err));

    // 3. Real-time subscriber for buyer_passes
    const unsubPasses = onSnapshot(collection(db, "buyer_passes"), (snapshot) => {
      const pList: FirestoreBuyerPass[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        pList.push({
          id: docSnap.id,
          userId: d.userId || docSnap.id,
          paid: d.paid || false,
          date: d.date || ""
        });
      });
      setPasses(pList);
    }, (err) => console.warn("Admin passes listener warning:", err));

    // 4. Real-time subscriber for feedbacks
    const unsubFeedbacks = onSnapshot(collection(db, "feedbacks"), (snapshot) => {
      const fList: FirestoreFeedback[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        fList.push({
          id: docSnap.id,
          text: d.text || "",
          category: d.category || "suggestion",
          name: d.name || "",
          email: d.email || "",
          timestamp: d.timestamp || new Date().toISOString(),
          status: d.status || "active"
        });
      });
      fList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFeedbacks(fList);
    }, (err) => console.warn("Admin feedbacks listener warning:", err));

    // 5. Real-time subscriber for admin_settings/catalog
    const unsubAdminDoc = onSnapshot(doc(db, "admin_settings", "catalog"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.hiddenDefaultIds) setHiddenDefaultIds(data.hiddenDefaultIds);
        if (data.removedDefaultIds) setRemovedDefaultIds(data.removedDefaultIds);
        if (data.defaultBadges) setDefaultBadges(data.defaultBadges);
        if (data.homeFeaturedIds) setHomeFeaturedIds(data.homeFeaturedIds);
        if (data.isFreePassEnabled !== undefined) setIsFreePassEnabled(Boolean(data.isFreePassEnabled));
        if (data.isSecureShieldEnabled !== undefined) setIsSecureShieldEnabled(Boolean(data.isSecureShieldEnabled));
        if (data.isEmiCalculatorEnabled !== undefined) setIsEmiCalculatorEnabled(Boolean(data.isEmiCalculatorEnabled));
        if (data.isWhatsAppConnectEnabled !== undefined) setIsWhatsAppConnectEnabled(Boolean(data.isWhatsAppConnectEnabled));
        if (data.isAiAssistantEnabled !== undefined) setIsAiAssistantEnabled(Boolean(data.isAiAssistantEnabled));
        if (data.isSimranFreeModeEnabled !== undefined) setIsSimranFreeModeEnabled(Boolean(data.isSimranFreeModeEnabled));
        if (data.isSmartMatcherEnabled !== undefined) setIsSmartMatcherEnabled(Boolean(data.isSmartMatcherEnabled));
        if (data.footerEmail) setFooterEmail(data.footerEmail);
        if (data.footerPhone) setFooterPhone(data.footerPhone);
        if (data.showroomAddress) setShowroomAddress(data.showroomAddress);
        if (data.loginQuote) setLoginQuote(data.loginQuote);
        if (data.loginCarImage) setLoginCarImage(data.loginCarImage);
        if (data.heroTitle) setHeroTitle(data.heroTitle);
        if (data.heroSubtitle) setHeroSubtitle(data.heroSubtitle);
        if (data.heroBadge) setHeroBadge(data.heroBadge);
        if (data.announcementText) setAnnouncementText(data.announcementText);
        if (data.isAnnouncementEnabled !== undefined) setIsAnnouncementEnabled(Boolean(data.isAnnouncementEnabled));
        if (data.homePinnedSparePartIds) setHomePinnedSparePartIds(data.homePinnedSparePartIds);
        if (data.customDialogues && data.customDialogues.length > 0) setCustomDialogues(data.customDialogues);
        if (data.customFaqs && data.customFaqs.length > 0) setCustomFaqs(data.customFaqs);
      }
    }, (err) => console.warn("Admin settings doc listener warning:", err));
    
    // 6. Real-time subscriber for spare parts / performance components
    const unsubComponents = onSnapshot(collection(db, "components"), (snapshot) => {
      const parts: SparePart[] = [];
      snapshot.forEach((docSnap) => {
        parts.push({ ...docSnap.data() as SparePart, id: docSnap.id });
      });
      if (parts.length > 0) {
        setAdminSpareParts(parts);
      } else {
        setAdminSpareParts(DEFAULT_SPARE_PARTS);
      }
    }, (err) => {
      console.warn("Admin components listener warning:", err);
      setAdminSpareParts(DEFAULT_SPARE_PARTS);
    });

    // 7. Real-time subscriber for users & role management
    const unsubRoles = subscribeToUserRoles((users) => {
      setUsersList(users);
    });

    // Load local storage fallbacks
    try {
      const stored = localStorage.getItem("autoWorld_hidden_defaults");
      if (stored) setHiddenDefaultIds(JSON.parse(stored));
      const removedStr = localStorage.getItem("autoWorld_removed_defaults");
      if (removedStr) setRemovedDefaultIds(JSON.parse(removedStr));
      const badgesStr = localStorage.getItem("autoWorld_default_badges");
      if (badgesStr) setDefaultBadges(JSON.parse(badgesStr));
      const storedHome = localStorage.getItem("autoWorld_home_featured_ids");
      if (storedHome) setHomeFeaturedIds(JSON.parse(storedHome));
      const isFreeStr = localStorage.getItem("autoWorld_is_free_pass");
      if (isFreeStr !== null) setIsFreePassEnabled(JSON.parse(isFreeStr));
    } catch (e) {
      console.error(e);
    }

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("autoWorld_db_update", handleUpdate);

    // Load initial SMS History & attach live event listener
    fetchSmsHistory().then(history => setSmsHistory(history));

    const handleLiveSmsAlert = (e: any) => {
      const alertItem = e.detail;
      if (alertItem) {
        setSmsHistory(prev => [alertItem, ...prev]);
        triggerHudAlert(
          `📱 SMS ALERT TO ${alertItem.targetNumber || "7666232753"}`,
          alertItem.title + ": " + alertItem.message,
          "hot"
        );
      }
    };
    window.addEventListener("autoWorld_sms_alert", handleLiveSmsAlert);

    return () => {
      unsubListings();
      unsubMessages();
      unsubPasses();
      unsubFeedbacks();
      unsubAdminDoc();
      unsubRoles();
      window.removeEventListener("autoWorld_db_update", handleUpdate);
      window.removeEventListener("autoWorld_sms_alert", handleLiveSmsAlert);
    };
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

          // Record action in Audit Log
          await recordAuditLog(
            currentUser?.email || "Admin",
            "Delete Vehicle",
            `Deleted vehicle "${title}" (ID: ${listingId}) from listings.`
          );

          triggerHudAlert("SPECIMEN PURGED", `"${title}" was successfully deleted from Firestore.`, "delete");
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
      
      // Record in Audit Log
      await recordAuditLog(
        currentUser?.email || "Admin",
        "Toggle Featured",
        `Set Featured flag of vehicle "${item.title}" (ID: ${item.id}) to ${nextFeatured}.`
      );

      triggerHudAlert(
        nextFeatured ? "FEATURED TAG ACTIVATED" : "FEATURED TAG DEACTIVATED",
        `Specimen "${item.title}" is now ${nextFeatured ? "flagged as Featured premium star" : "reverted to normal stock"}.`,
        "premium"
      );
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
      
      // Record in Audit Log
      await recordAuditLog(
        currentUser?.email || "Admin",
        "Toggle Verified",
        `Set Verified flag of vehicle "${item.title}" (ID: ${item.id}) to ${nextVerified}.`
      );

      triggerHudAlert(
        nextVerified ? "VERIFIED ACCREDITATION GRANTED" : "VERIFIED ACCREDITATION REVOKED",
        `Specimen "${item.title}" has been ${nextVerified ? "certified and verified" : "demoted to unverified"}.`,
        "verified"
      );
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
      
      // Record in Audit Log
      await recordAuditLog(
        currentUser?.email || "Admin",
        "Toggle Urgent",
        `Set Urgent flag of vehicle "${item.title}" (ID: ${item.id}) to ${nextUrgent}.`
      );

      triggerHudAlert(
        nextUrgent ? "HOT DEAL FLAME ACTIVATED" : "HOT DEAL FLAME DEACTIVATED",
        `Specimen "${item.title}" highlighted as ${nextUrgent ? "a sizzling hot deal" : "a regular stock value"}.`,
        "hot"
      );
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `listings/${item.id}`);
      showToast("Failed to update listing flags.", "error");
    }
  };

  // Toggle Admin Approval status ('pending' vs 'active')
  const handleToggleApproval = async (item: UserListing) => {
    const isUnapproving = item.status === "active" || item.status === undefined;
    const nextStatus = isUnapproving ? "pending" : "active";

    const performApprovalToggle = async () => {
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

        // Record in Audit Log
        await recordAuditLog(
          currentUser?.email || "Admin",
          "Toggle Approval",
          `Updated approval status of vehicle "${item.title}" (ID: ${item.id}) to "${nextStatus}".`
        );

        triggerHudAlert(
          nextStatus === "active" ? "SPECIMEN PUBLISHED ONLINE" : "SPECIMEN HELD / HIDDEN",
          `Specimen "${item.title}" is now ${nextStatus === "active" ? "active and visible to public catalog" : "archived in pending drafts"}.`,
          nextStatus === "active" ? "approve" : "unapprove"
        );
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `listings/${item.id}`);
        showToast("Failed to update listing approval workflow.", "error");
      }
    };

    if (isUnapproving) {
      setConfirmModal({
        isOpen: true,
        title: "UNAPPROVE VEHICLE LISTING",
        message: `Are you sure you want to unapprove vehicle "${item.title}"? This will suspend its public status and hide it from the marketplace catalog.`,
        danger: true,
        confirmText: "UNAPPROVE LISTING",
        onConfirm: performApprovalToggle
      });
    } else {
      await performApprovalToggle();
    }
  };

  // Toggle Hide status for user listing ('hidden' vs 'active')
  const handleToggleHideUserListing = async (item: UserListing) => {
    const isCurrentlyHidden = item.status === "hidden";
    const nextStatus = isCurrentlyHidden ? "active" : "hidden";

    const performHideToggle = async () => {
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
          console.error("Failed to update local storage hidden status:", e);
        }

        // Record in Audit Log
        await recordAuditLog(
          currentUser?.email || "Admin",
          "Toggle Hide Listing",
          `Updated visibility status of vehicle "${item.title}" (ID: ${item.id}) to "${nextStatus}".`
        );

        triggerHudAlert(
          nextStatus === "hidden" ? "SPECIMEN HIDDEN FROM MARKET" : "SPECIMEN RESTORED TO MARKET",
          `Vehicle "${item.title}" is now ${nextStatus === "hidden" ? "hidden from buyers" : "restored and active on public catalog"}.`,
          nextStatus === "hidden" ? "unapprove" : "approve"
        );

        window.dispatchEvent(new Event("autoWorld_db_update"));
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `listings/${item.id}`);
        showToast("Failed to update listing hide status.", "error");
      }
    };

    if (!isCurrentlyHidden) {
      setConfirmModal({
        isOpen: true,
        title: "HIDE VEHICLE LISTING",
        message: `Are you sure you want to hide vehicle "${item.title}"? The car owner will see that their car has been hidden in their seller catalog, and buyers will no longer see it in search results.`,
        danger: true,
        confirmText: "HIDE LISTING",
        onConfirm: performHideToggle
      });
    } else {
      await performHideToggle();
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
      
      // Record action in Audit Log
      await recordAuditLog(
        currentUser?.email || "Admin",
        "Create Vehicle",
        `Created and published new vehicle "${finalTitle}" (ID: ${docRef.id}, Price: ₹${finalPriceInt}).`
      );

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
    saveAdminSettingsToFirestore({ hiddenDefaultIds: updated });
  };

  // Toggle home page featured pinning status
  const handleToggleHomeFeatured = (uniqueKey: string, title: string) => {
    let updated: string[];
    const isPinned = homeFeaturedIds.includes(uniqueKey);

    if (isPinned) {
      updated = homeFeaturedIds.filter(id => id !== uniqueKey);
      triggerHudAlert("REMOVED FROM HOME", `"${title}" has been removed from the Home Page Featured Showcase.`, "hide");
    } else {
      updated = [...homeFeaturedIds, uniqueKey];
      triggerHudAlert("PINNED TO HOME", `"${title}" has been successfully pinned to the Home Page Featured Showcase.`, "premium");
    }

    setHomeFeaturedIds(updated);
    saveAdminSettingsToFirestore({ homeFeaturedIds: updated });
  };

  // Move home page featured showcase item up or down in list
  const moveHomeFeaturedItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === homeFeaturedIds.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...homeFeaturedIds];

    // Swap positions
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setHomeFeaturedIds(updated);
    saveAdminSettingsToFirestore({ homeFeaturedIds: updated });
    playSynthBeep(direction === "up" ? 600 : 500, 0.1, "sine");
    triggerHudAlert("ORDER MODIFIED", "Homepage featured item sequence rearranged.", "restore");
  };

  // Set absolute order rank for home page featured showcase item (1-based index)
  const setHomeFeaturedItemRank = (index: number, newRankStr: string) => {
    const newRank = parseInt(newRankStr);
    if (isNaN(newRank) || newRank < 1 || newRank > homeFeaturedIds.length) return;

    const updated = [...homeFeaturedIds];
    const itemToMove = updated[index];

    // Remove from current position and insert at new target position (0-based)
    updated.splice(index, 1);
    updated.splice(newRank - 1, 0, itemToMove);

    setHomeFeaturedIds(updated);
    saveAdminSettingsToFirestore({ homeFeaturedIds: updated });
    playSynthBeep(700, 0.12, "sine");
    triggerHudAlert("RANK REASSIGNED", `Item moved to Rank #${newRank} in featured catalog.`, "premium");
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
        saveAdminSettingsToFirestore({ removedDefaultIds: updated });
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
    
    // Mirror to Firestore and local cache
    saveAdminSettingsToFirestore({ defaultBadges: updated });

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

          // Record in Audit Log
          await recordAuditLog(
            currentUser?.email || "Admin",
            "Bulk Approve",
            `Approved and published all ${pendingListings.length} pending user listings.`
          );

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

          // Record in Audit Log
          await recordAuditLog(
            currentUser?.email || "Admin",
            "Bulk Unapprove",
            `Suspended and hid all ${activeListings.length} active user listings.`
          );

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

          // 2. Verify all default vehicles in Firestore
          const updatedBadges: Record<number, string | null> = {};
          DEFAULT_VEHICLES.forEach(v => {
            updatedBadges[v.id] = "verified";
          });
          setDefaultBadges(updatedBadges);
          await saveAdminSettingsToFirestore({ defaultBadges: updatedBadges });

          // Record in Audit Log
          await recordAuditLog(
            currentUser?.email || "Admin",
            "Bulk Verify All",
            `Instantly awarded [VERIFIED] status to all ${listings.length} user listings and all default static vehicles on the platform.`
          );

          triggerHudAlert("BULK VERIFY ENGAGED", "Platform-wide scanning complete. All vehicles certified.", "verified");
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
          // Clear Firestore & local storage admin settings
          await saveAdminSettingsToFirestore({
            hiddenDefaultIds: [],
            removedDefaultIds: [],
            defaultBadges: {},
            homeFeaturedIds: []
          });
          setHiddenDefaultIds([]);
          setRemovedDefaultIds([]);
          setDefaultBadges({});
          setHomeFeaturedIds([]);

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

          // Record in Audit Log
          await recordAuditLog(
            currentUser?.email || "Admin",
            "System Reset",
            `Executed global factory reset: cleared all default badges, restored all hidden vehicles, and reset all ${listings.length} user listings.`
          );

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
    const selectedUsers = listings.filter(l => selectedKeys.includes(`user-${l.id}`));
    const selectedDefaultIds = DEFAULT_VEHICLES.filter(v => selectedKeys.includes(`default-${v.id}`)).map(v => v.id);

    if (selectedUsers.length === 0 && selectedDefaultIds.length === 0) {
      triggerHudAlert("NO SPECIMENS SELECTED", "Please select vehicles to hide.", "bulk");
      return;
    }

    const totalCount = selectedUsers.length + selectedDefaultIds.length;

    setConfirmModal({
      isOpen: true,
      title: "HIDE SELECTED SPECIMENS",
      message: `Are you sure you want to hide all ${totalCount} selected vehicles from the public catalog? Car owners will see that their cars have been hidden.`,
      danger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          // Hide selected user listings
          if (selectedUsers.length > 0) {
            for (const item of selectedUsers) {
              await updateDoc(doc(db, "listings", item.id), { status: "hidden" });
            }
            setListings(prev => prev.map(l => selectedKeys.includes(`user-${l.id}`) ? { ...l, status: "hidden" } : l));

            try {
              const stored = localStorage.getItem("autoWorld_listings");
              if (stored) {
                const list: UserListing[] = JSON.parse(stored);
                const updated = list.map(l => selectedKeys.includes(`user-${l.id}`) ? { ...l, status: "hidden" } : l);
                localStorage.setItem("autoWorld_listings", JSON.stringify(updated));
              }
            } catch (e) {
              console.error("Local storage sync error:", e);
            }
          }

          // Hide selected static default vehicles
          if (selectedDefaultIds.length > 0) {
            const nextHidden = Array.from(new Set([...hiddenDefaultIds, ...selectedDefaultIds]));
            setHiddenDefaultIds(nextHidden);
            localStorage.setItem("autoWorld_hidden_defaults", JSON.stringify(nextHidden));
          }

          triggerHudAlert("SPECIMENS HIDDEN", `Successfully hid ${totalCount} vehicles from public catalog.`, "hide");
          window.dispatchEvent(new Event("autoWorld_db_update"));
        } catch (err: any) {
          showToast("Error hiding selected items.", "error");
        } finally {
          setIsLoading(false);
        }
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

  // Content Customizer Handlers
  const handleSaveFooterSettings = async (emailVal: string, phoneVal: string) => {
    setFooterEmail(emailVal);
    setFooterPhone(phoneVal);
    try {
      localStorage.setItem("autoWorld_footer_email", emailVal);
      localStorage.setItem("autoWorld_footer_phone", phoneVal);
    } catch (e) {}
    await saveAdminSettingsToFirestore({ footerEmail: emailVal, footerPhone: phoneVal });
    window.dispatchEvent(new Event("autoWorld_db_update"));
    showToast("Footer contact details saved & updated live!", "success");
    triggerHudAlert("FOOTER UPDATED", `Email: ${emailVal}, Phone: ${phoneVal}`, "verified");
  };

  const handleSaveShowroomAddress = async (addrVal: string) => {
    setShowroomAddress(addrVal);
    try {
      localStorage.setItem("autoWorld_showroom_address", addrVal);
    } catch (e) {}
    await saveAdminSettingsToFirestore({ showroomAddress: addrVal });
    window.dispatchEvent(new Event("autoWorld_db_update"));
    showToast("Showroom address saved & updated live across site!", "success");
    triggerHudAlert("ADDRESS UPDATED", addrVal, "verified");
  };

  const handleSaveHeroSettings = async (titleVal: string, subtitleVal: string, badgeVal: string) => {
    setHeroTitle(titleVal);
    setHeroSubtitle(subtitleVal);
    setHeroBadge(badgeVal);
    try {
      localStorage.setItem("autoWorld_hero_title", titleVal);
      localStorage.setItem("autoWorld_hero_subtitle", subtitleVal);
      localStorage.setItem("autoWorld_hero_badge", badgeVal);
    } catch (e) {}
    await saveAdminSettingsToFirestore({ heroTitle: titleVal, heroSubtitle: subtitleVal, heroBadge: badgeVal });
    window.dispatchEvent(new Event("autoWorld_db_update"));
    showToast("Hero section headlines saved & updated live!", "success");
    triggerHudAlert("HERO UPDATED", titleVal, "verified");
  };

  const handleSaveAnnouncementSettings = async (textVal: string, enabledVal: boolean) => {
    setAnnouncementText(textVal);
    setIsAnnouncementEnabled(enabledVal);
    try {
      localStorage.setItem("autoWorld_announcement_text", textVal);
      localStorage.setItem("autoWorld_is_announcement_enabled", JSON.stringify(enabledVal));
    } catch (e) {}
    await saveAdminSettingsToFirestore({ announcementText: textVal, isAnnouncementEnabled: enabledVal });
    window.dispatchEvent(new Event("autoWorld_db_update"));
    showToast("Announcement banner saved & updated live!", "success");
    triggerHudAlert("ANNOUNCEMENT UPDATED", enabledVal ? "Banner Enabled" : "Banner Hidden", enabledVal ? "approve" : "unapprove");
  };

  const handleSaveLoginSettings = async (quoteVal: string, carImgVal: string) => {
    setLoginQuote(quoteVal);
    setLoginCarImage(carImgVal);
    try {
      localStorage.setItem("autoWorld_login_quote", quoteVal);
      localStorage.setItem("autoWorld_login_car_image", carImgVal);
    } catch (e) {}
    await saveAdminSettingsToFirestore({ loginQuote: quoteVal, loginCarImage: carImgVal });
    window.dispatchEvent(new Event("autoWorld_db_update"));
    showToast("Login quote & image updated live!", "success");
    triggerHudAlert("LOGIN PAGE UPDATED", "Login page quote and background car image saved.", "verified");
  };

  const handleSaveRegisterSettings = async (quoteVal: string, carImgVal: string) => {
    setRegisterQuote(quoteVal);
    setRegisterCarImage(carImgVal);
    try {
      localStorage.setItem("autoWorld_register_quote", quoteVal);
      localStorage.setItem("autoWorld_register_car_image", carImgVal);
    } catch (e) {}
    await saveAdminSettingsToFirestore({ registerQuote: quoteVal, registerCarImage: carImgVal });
    window.dispatchEvent(new Event("autoWorld_db_update"));
    showToast("Register page quote & image updated live!", "success");
    triggerHudAlert("REGISTER PAGE UPDATED", "Create Account page quote and background saved.", "verified");
  };

  const handleAddOrUpdateDialogue = async () => {
    if (!dialogueForm.quote.trim() || !dialogueForm.character.trim() || !dialogueForm.movie.trim()) {
      showToast("Please fill in Quote, Character, and Movie fields.", "error");
      return;
    }

    let updated: typeof customDialogues;
    if (editingDialogueIdx !== null) {
      updated = customDialogues.map((item, i) => i === editingDialogueIdx ? dialogueForm : item);
    } else {
      updated = [...customDialogues, dialogueForm];
    }

    setCustomDialogues(updated);
    try {
      localStorage.setItem("autoWorld_custom_dialogues", JSON.stringify(updated));
    } catch (e) {}
    await saveAdminSettingsToFirestore({ customDialogues: updated });
    window.dispatchEvent(new Event("autoWorld_db_update"));

    showToast(editingDialogueIdx !== null ? "Dialogue updated!" : "New dialogue added!", "success");
    setEditingDialogueIdx(null);
    setDialogueForm({ quote: "", character: "", movie: "", type: "Simran Special" });
  };

  const handleDeleteDialogue = async (idx: number) => {
    const updated = customDialogues.filter((_, i) => i !== idx);
    setCustomDialogues(updated);
    try {
      localStorage.setItem("autoWorld_custom_dialogues", JSON.stringify(updated));
    } catch (e) {}
    await saveAdminSettingsToFirestore({ customDialogues: updated });
    window.dispatchEvent(new Event("autoWorld_db_update"));
    showToast("Dialogue removed.", "info");
  };

  const handleResetDialogues = async () => {
    setCustomDialogues(defaultDialogues);
    try {
      localStorage.setItem("autoWorld_custom_dialogues", JSON.stringify(defaultDialogues));
    } catch (e) {}
    await saveAdminSettingsToFirestore({ customDialogues: defaultDialogues });
    window.dispatchEvent(new Event("autoWorld_db_update"));
    showToast("Dialogues restored to default Bollywood classics!", "success");
  };

  const handleAddOrUpdateFaq = async () => {
    if (!faqForm.q.trim() || !faqForm.a.trim()) {
      showToast("Please enter both Question and Answer fields.", "error");
      return;
    }

    let updated: typeof customFaqs;
    if (editingFaqIdx !== null) {
      updated = customFaqs.map((item, i) => i === editingFaqIdx ? faqForm : item);
    } else {
      updated = [...customFaqs, faqForm];
    }

    setCustomFaqs(updated);
    try {
      localStorage.setItem("autoWorld_custom_faqs", JSON.stringify(updated));
    } catch (e) {}
    await saveAdminSettingsToFirestore({ customFaqs: updated });
    window.dispatchEvent(new Event("autoWorld_db_update"));

    showToast(editingFaqIdx !== null ? "FAQ item updated!" : "New FAQ item added!", "success");
    setEditingFaqIdx(null);
    setFaqForm({ q: "", a: "" });
  };

  const handleDeleteFaq = async (idx: number) => {
    const updated = customFaqs.filter((_, i) => i !== idx);
    setCustomFaqs(updated);
    try {
      localStorage.setItem("autoWorld_custom_faqs", JSON.stringify(updated));
    } catch (e) {}
    await saveAdminSettingsToFirestore({ customFaqs: updated });
    window.dispatchEvent(new Event("autoWorld_db_update"));
    showToast("FAQ item removed.", "info");
  };

  const handleResetFaqs = async () => {
    setCustomFaqs(defaultFaqs);
    try {
      localStorage.setItem("autoWorld_custom_faqs", JSON.stringify(defaultFaqs));
    } catch (e) {}
    await saveAdminSettingsToFirestore({ customFaqs: defaultFaqs });
    window.dispatchEvent(new Event("autoWorld_db_update"));
    showToast("FAQs restored to platform defaults!", "success");
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

  const isOwner = currentUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const loggedInUserObj = usersList.find(u => u.uid === currentUser?.uid || u.email?.toLowerCase() === currentUser?.email?.toLowerCase());
  const currentUserRole: UserRole = isOwner ? "Owner" : (loggedInUserObj?.role || "User");
  const isCoOwner = currentUserRole === "Co-Owner";
  const isSuperAdmin = currentUserRole === "Super Admin";

  const isAuthorized = isOwner || isCoOwner || isSuperAdmin || currentUserRole === "Parts Manager" || currentUserRole === "Inventory Manager" || currentUserRole === "Content Moderator";

  if (!isAuthorized) {
    return (
      <div id="admin-unauthorized-view" className="max-w-md mx-auto my-16 p-8 bg-[#FAF8F5] border border-stone-300 shadow-xl text-center space-y-5 animate-in fade-in">
        <ShieldAlert className="w-12 h-12 text-red-650 mx-auto" id="restricted-shield" />
        <h2 className="text-xl font-serif font-black uppercase text-stone-900 tracking-tight" id="restricted-heading">Access Restricted</h2>
        <p className="text-xs text-stone-600 font-sans leading-relaxed" id="restricted-paragraph">
          The Administrative Workspace is locked. Only certified Owner, Co-Owner, or Super Admin accounts are authorized to access and utilize these production controls.
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
        <div className="absolute bottom-1/4 left-1/4 w-2.5 h-2.5 rounded-full bg-purple-600/30 blur-xs animate-pulse" style={{ animationDuration: '6s' }} />

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
            <div className="flex items-center gap-2.5 flex-wrap">
              <RoleBadge role={currentUserRole} size="lg" />
              <span className="font-mono text-xs text-amber-500 font-bold uppercase tracking-widest">
                {isOwner 
                  ? "[ SECURITY: OWNER DESK CONTROL ACTIVE ]" 
                  : isCoOwner 
                  ? "[ SECURITY: CO-OWNER EXECUTIVE DESK ACTIVE ]" 
                  : "[ SECURITY: ADMIN DESK ACTIVE ]"}
              </span>
            </div>
            <h1 className="text-3xl font-serif font-black tracking-tight uppercase">
              {isOwner ? "Owner Administrative Workspace" : isCoOwner ? "Co-Owner Executive Desk" : "Administrative Workspace"}
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm max-w-xl font-medium leading-relaxed">
              {isCoOwner 
                ? "Executive dashboard for managing vehicle inventory, buyer leads, customer feedback, and website content."
                : "Verify customer inquiries, manage inventory directly in production, add featured flags, or delete/restore listings across the system instantly."}
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

        {/* GLOBAL BUY PASS ON/OFF CONTROL BAR */}
        <div className={`mb-8 p-5 sm:p-6 border-2 transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
          isFreePassEnabled
            ? "bg-emerald-950 text-emerald-50 border-emerald-500 shadow-emerald-900/30"
            : "bg-[#FAF8F5] text-stone-900 border-stone-900"
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Crown className={`w-6 h-6 ${isFreePassEnabled ? "text-emerald-400 animate-bounce" : "text-amber-600"}`} />
                <h2 className="text-base font-serif font-black uppercase tracking-tight">
                  Buy Pass Access Mode Control
                </h2>
                <span className={`px-2.5 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider border rounded-xs ${
                  isFreePassEnabled
                    ? "bg-emerald-500 text-stone-950 border-emerald-300 animate-pulse"
                    : "bg-stone-200 text-stone-800 border-stone-400"
                }`}>
                  {isFreePassEnabled ? "● FREE PASS MODE: ACTIVE" : "● PAID PASS MODE: ₹1 REQUIRED"}
                </span>
              </div>
              <p className={`text-xs font-mono leading-relaxed uppercase ${
                isFreePassEnabled ? "text-emerald-200 font-medium" : "text-stone-600"
              }`}>
                {isFreePassEnabled
                  ? "Buy Pass is currently 100% FREE for all buyers across the app! Every user automatically gets full access to all vehicle listings, technical specs, and seller contact details without paying."
                  : "Standard ₹1 monetization mode is active. Buyers are required to activate a ₹1 account pass to view more than 3 listings or unlock seller phone numbers."}
              </p>
            </div>

            {/* Interactive ON / OFF Switch Button */}
            <div className="flex flex-col items-start sm:items-end gap-2 shrink-0 self-stretch sm:self-center bg-stone-900/10 p-3 border border-stone-900/20 rounded-sm">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-mono font-extrabold uppercase tracking-widest ${
                  isFreePassEnabled ? "text-emerald-300" : "text-stone-700"
                }`}>
                  Buy Pass Status:
                </span>
                <button
                  type="button"
                  onClick={handleToggleFreePass}
                  className={`px-4 py-2 text-xs font-mono font-black uppercase tracking-widest cursor-pointer transition-all duration-200 flex items-center gap-2 border-2 shadow-sm ${
                    isFreePassEnabled
                      ? "bg-emerald-500 hover:bg-emerald-400 text-stone-950 border-emerald-300 shadow-emerald-700/50"
                      : "bg-stone-900 hover:bg-stone-800 text-stone-100 border-stone-950"
                  }`}
                  title={isFreePassEnabled ? "Click to TURN OFF Free Buy Pass (Require ₹1)" : "Click to TURN ON Free Buy Pass (Make Free)"}
                >
                  <span className={`w-3 h-3 rounded-full ${isFreePassEnabled ? "bg-stone-950 animate-ping" : "bg-stone-500"}`} />
                  <span>{isFreePassEnabled ? "[ ON ] FREE PASS" : "[ OFF ] PAID ₹1 PASS"}</span>
                </button>
              </div>
              <span className={`text-[9px] font-mono uppercase tracking-wider font-bold ${
                isFreePassEnabled ? "text-emerald-400" : "text-stone-500"
              }`}>
                {isFreePassEnabled ? "Click button to turn OFF (Require ₹1)" : "Click button to turn ON (Make Free)"}
              </span>
            </div>
          </div>
        </div>

        {/* SYSTEM FUNCTIONAL FEATURE TOGGLES */}
        <div className="mb-8 p-5 sm:p-6 bg-[#FAF8F5] border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-5 font-sans">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-300">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h3 className="text-sm font-serif font-black uppercase tracking-tight text-stone-900">
                  System Functional Feature Toggles
                </h3>
                <p className="text-[10px] text-stone-500 font-mono uppercase tracking-wider">
                  Enable or disable key platform features live across all user sessions
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-stone-900 text-amber-400 text-[9px] font-mono font-bold uppercase tracking-widest border border-stone-800">
              7 ACTIVE CONTROLS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SEPARATE EDITORIAL CARD FOR PREMIUM PROMOTION ADD-ONS CONTROLS */}
            <div className="col-span-1 md:col-span-2 p-5 bg-[#FAF8F5] border-2 border-amber-900/30 rounded-none shadow-[3px_3px_0px_0px_rgba(197,160,89,0.25)] space-y-4 my-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-stone-300/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-amber-800" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-serif font-black uppercase tracking-wider text-stone-900">
                        Premium Promotion Add-ons Controls
                      </h4>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[8px] font-mono font-bold uppercase tracking-widest border border-amber-300">
                        Sell Tab Add-ons
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 font-mono leading-tight mt-0.5">
                      Toggle live availability for sellers to opt into Featured Booster and Urgent Hot Stamp tags
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-stone-900 text-amber-400 text-[8.5px] font-mono font-bold uppercase tracking-widest border border-stone-800 shrink-0">
                  2 PROMOTION CONTROLS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Featured Booster Add-on Toggle Card */}
                <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
                  isFeaturedBoosterEnabled
                    ? "bg-stone-900 text-stone-100 border-amber-500 shadow-md ring-1 ring-amber-400/20"
                    : "bg-white text-stone-600 border-stone-300"
                }`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className={`w-4 h-4 ${isFeaturedBoosterEnabled ? "text-amber-400" : "text-stone-400"}`} />
                        <h5 className="text-xs font-bold uppercase tracking-wider">
                          Featured Booster (Premium Spot)
                        </h5>
                      </div>
                      <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-widest ${
                        isFeaturedBoosterEnabled ? "bg-amber-500 text-stone-950 font-black border border-amber-400" : "bg-stone-200 text-stone-500"
                      }`}>
                        {isFeaturedBoosterEnabled ? "LIVE ON APP" : "PAUSED"}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 leading-relaxed font-mono">
                      Pins listing at absolute top of buyer catalog feed with a custom gold badge.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFeature("isFeaturedBoosterEnabled", isFeaturedBoosterEnabled, setIsFeaturedBoosterEnabled, "Featured Booster Add-on", "autoWorld_is_featured_booster")}
                    className={`w-full py-2.5 px-3 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition border ${
                      isFeaturedBoosterEnabled
                        ? "bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-400 shadow-sm"
                        : "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-600"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isFeaturedBoosterEnabled ? "bg-stone-950 animate-ping" : "bg-stone-500"}`} />
                    <span>{isFeaturedBoosterEnabled ? "[ ON ] FEATURED BOOSTER ENABLED" : "[ OFF ] FEATURED BOOSTER DISABLED"}</span>
                  </button>
                </div>

                {/* Urgent Hot Stamp Add-on Toggle Card */}
                <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
                  isUrgentHotStampEnabled
                    ? "bg-stone-900 text-stone-100 border-red-500 shadow-md ring-1 ring-red-400/20"
                    : "bg-white text-stone-600 border-stone-300"
                }`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`w-4 h-4 ${isUrgentHotStampEnabled ? "text-red-400" : "text-stone-400"}`} />
                        <h5 className="text-xs font-bold uppercase tracking-wider">
                          Urgent Hot Stamp (Immediate Sale)
                        </h5>
                      </div>
                      <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-widest ${
                        isUrgentHotStampEnabled ? "bg-red-600 text-white font-black border border-red-400" : "bg-stone-200 text-stone-500"
                      }`}>
                        {isUrgentHotStampEnabled ? "LIVE ON APP" : "PAUSED"}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 leading-relaxed font-mono">
                      Displays a high-contrast crimson tag to capture buyers negotiating immediate transfers.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFeature("isUrgentHotStampEnabled", isUrgentHotStampEnabled, setIsUrgentHotStampEnabled, "Urgent Hot Stamp Add-on", "autoWorld_is_urgent_hot_stamp")}
                    className={`w-full py-2.5 px-3 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition border ${
                      isUrgentHotStampEnabled
                        ? "bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-sm"
                        : "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-600"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isUrgentHotStampEnabled ? "bg-white animate-ping" : "bg-stone-500"}`} />
                    <span>{isUrgentHotStampEnabled ? "[ ON ] URGENT HOT STAMP ENABLED" : "[ OFF ] URGENT HOT STAMP DISABLED"}</span>
                  </button>
                </div>
              </div>
            </div>
            {/* 1. Secure Shield Offer Toggle */}
            <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
              isSecureShieldEnabled
                ? "bg-stone-900 text-stone-100 border-amber-500/60 shadow-md"
                : "bg-stone-100 text-stone-600 border-stone-300"
            }`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${isSecureShieldEnabled ? "text-amber-400" : "text-stone-400"}`} />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Secure Shield Offer (₹199)
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-widest ${
                    isSecureShieldEnabled ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-stone-200 text-stone-500"
                  }`}>
                    {isSecureShieldEnabled ? "LIVE ON APP" : "PAUSED"}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 leading-relaxed font-mono">
                  Show 150-Point Inspection & RC Transfer Guarantee ₹199 offer card on vehicle detail dossiers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleFeature("isSecureShieldEnabled", isSecureShieldEnabled, setIsSecureShieldEnabled, "Secure Shield Offer (₹199)", "autoWorld_is_secure_shield")}
                className={`w-full py-2.5 px-3 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition border ${
                  isSecureShieldEnabled
                    ? "bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-400 shadow-sm"
                    : "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-600"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${isSecureShieldEnabled ? "bg-stone-950 animate-ping" : "bg-stone-500"}`} />
                <span>{isSecureShieldEnabled ? "[ ON ] SECURE SHIELD ENABLED" : "[ OFF ] SECURE SHIELD DISABLED"}</span>
              </button>
            </div>

            {/* 2. EMI Calculator Toggle */}
            <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
              isEmiCalculatorEnabled
                ? "bg-stone-900 text-stone-100 border-emerald-500/60 shadow-md"
                : "bg-stone-100 text-stone-600 border-stone-300"
            }`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className={`w-4 h-4 ${isEmiCalculatorEnabled ? "text-emerald-400" : "text-stone-400"}`} />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Vehicle EMI Calculator
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-widest ${
                    isEmiCalculatorEnabled ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-stone-200 text-stone-500"
                  }`}>
                    {isEmiCalculatorEnabled ? "LIVE ON APP" : "PAUSED"}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 leading-relaxed font-mono">
                  Interactive monthly EMI loan calculator widget on listing pages.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleFeature("isEmiCalculatorEnabled", isEmiCalculatorEnabled, setIsEmiCalculatorEnabled, "EMI Calculator", "autoWorld_is_emi_calculator")}
                className={`w-full py-2.5 px-3 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition border ${
                  isEmiCalculatorEnabled
                    ? "bg-emerald-500 hover:bg-emerald-400 text-stone-950 border-emerald-400 shadow-sm"
                    : "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-600"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${isEmiCalculatorEnabled ? "bg-stone-950 animate-ping" : "bg-stone-500"}`} />
                <span>{isEmiCalculatorEnabled ? "[ ON ] EMI CALCULATOR ENABLED" : "[ OFF ] EMI CALCULATOR DISABLED"}</span>
              </button>
            </div>

            {/* 3. WhatsApp Seller Connect Toggle */}
            <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
              isWhatsAppConnectEnabled
                ? "bg-stone-900 text-stone-100 border-emerald-500/60 shadow-md"
                : "bg-stone-100 text-stone-600 border-stone-300"
            }`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className={`w-4 h-4 ${isWhatsAppConnectEnabled ? "text-emerald-400" : "text-stone-400"}`} />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      WhatsApp Direct Seller Connect
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-widest ${
                    isWhatsAppConnectEnabled ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-stone-200 text-stone-500"
                  }`}>
                    {isWhatsAppConnectEnabled ? "LIVE ON APP" : "PAUSED"}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 leading-relaxed font-mono">
                  One-click WhatsApp buyer inquiry button with pre-filled vehicle details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleFeature("isWhatsAppConnectEnabled", isWhatsAppConnectEnabled, setIsWhatsAppConnectEnabled, "WhatsApp Direct Connect", "autoWorld_is_whatsapp_connect")}
                className={`w-full py-2.5 px-3 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition border ${
                  isWhatsAppConnectEnabled
                    ? "bg-emerald-500 hover:bg-emerald-400 text-stone-950 border-emerald-400 shadow-sm"
                    : "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-600"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${isWhatsAppConnectEnabled ? "bg-stone-950 animate-ping" : "bg-stone-500"}`} />
                <span>{isWhatsAppConnectEnabled ? "[ ON ] WHATSAPP CONNECT ENABLED" : "[ OFF ] WHATSAPP CONNECT DISABLED"}</span>
              </button>
            </div>

            {/* 4. AI Listing Valuation Assistant Toggle */}
            <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
              isAiAssistantEnabled
                ? "bg-stone-900 text-stone-100 border-purple-500/60 shadow-md"
                : "bg-stone-100 text-stone-600 border-stone-300"
            }`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${isAiAssistantEnabled ? "text-purple-400" : "text-stone-400"}`} />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      AI Listing & Valuation Assistant
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-widest ${
                    isAiAssistantEnabled ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "bg-stone-200 text-stone-500"
                  }`}>
                    {isAiAssistantEnabled ? "LIVE ON APP" : "PAUSED"}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 leading-relaxed font-mono">
                  Gemini AI smart price estimator and listing optimization assistant.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleFeature("isAiAssistantEnabled", isAiAssistantEnabled, setIsAiAssistantEnabled, "AI Valuation Assistant", "autoWorld_is_ai_assistant")}
                className={`w-full py-2.5 px-3 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition border ${
                  isAiAssistantEnabled
                    ? "bg-purple-500 hover:bg-purple-400 text-stone-950 border-purple-400 shadow-sm"
                    : "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-600"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${isAiAssistantEnabled ? "bg-stone-950 animate-ping" : "bg-stone-500"}`} />
                <span>{isAiAssistantEnabled ? "[ ON ] AI ASSISTANT ENABLED" : "[ OFF ] AI ASSISTANT DISABLED"}</span>
              </button>
            </div>

            {/* 5. Smart Matcher Engine Toggle */}
            <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
              isSmartMatcherEnabled
                ? "bg-stone-900 text-stone-100 border-amber-500/60 shadow-md"
                : "bg-stone-100 text-stone-600 border-stone-300"
            }`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className={`w-4 h-4 ${isSmartMatcherEnabled ? "text-amber-400" : "text-stone-400"}`} />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Smart Matcher Engine V2.1
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-widest ${
                    isSmartMatcherEnabled ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-stone-200 text-stone-500"
                  }`}>
                    {isSmartMatcherEnabled ? "LIVE ON APP" : "PAUSED"}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 leading-relaxed font-mono">
                  Real-time budget & style buyer recommendation engine on the Buy catalog tab.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleFeature("isSmartMatcherEnabled", isSmartMatcherEnabled, setIsSmartMatcherEnabled, "Smart Matcher Engine", "autoWorld_is_smart_matcher")}
                className={`w-full py-2.5 px-3 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition border ${
                  isSmartMatcherEnabled
                    ? "bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-400 shadow-sm"
                    : "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-600"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${isSmartMatcherEnabled ? "bg-stone-950 animate-ping" : "bg-stone-500"}`} />
                <span>{isSmartMatcherEnabled ? "[ ON ] SMART MATCHER ENABLED" : "[ OFF ] SMART MATCHER DISABLED"}</span>
              </button>
            </div>

            {/* 5. Simran Mode: Blur & Disable Premium Tab with Bollywood/Hollywood Pop-up */}
            <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 col-span-1 md:col-span-2 ${
              isSimranFreeModeEnabled
                ? "bg-stone-900 text-amber-100 border-amber-400 shadow-lg"
                : "bg-stone-100 text-stone-600 border-stone-300"
            }`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${isSimranFreeModeEnabled ? "text-amber-400 animate-spin" : "text-stone-400"}`} />
                    <h4 className="text-xs font-bold uppercase tracking-wider font-serif text-amber-400">
                      "JA SIMRAN JEE LE APNI ZINDAGI" — FREE WEBSITE & BLUR PREMIUM TAB
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-widest ${
                    isSimranFreeModeEnabled ? "bg-amber-400 text-stone-950 font-black border border-amber-300" : "bg-stone-200 text-stone-500"
                  }`}>
                    {isSimranFreeModeEnabled ? "ACTIVE (BLURRED & FREE)" : "STANDARD MONETIZATION"}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 leading-relaxed font-mono">
                  Blurs/closes the Premium tab and overlays a pop-up declaring the website is 100% FREE with funny iconic Bollywood & Hollywood dialogues ("Ja Simran, jee le apni zindagi!")!
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleFeature("isSimranFreeModeEnabled", isSimranFreeModeEnabled, setIsSimranFreeModeEnabled, "Simran Free Mode (Blur Premium Tab)", "autoWorld_is_simran_free_mode")}
                className={`w-full py-3 px-3 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition border ${
                  isSimranFreeModeEnabled
                    ? "bg-amber-400 hover:bg-amber-300 text-stone-950 border-amber-300 shadow-md font-extrabold"
                    : "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-600"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${isSimranFreeModeEnabled ? "bg-stone-950 animate-ping" : "bg-stone-500"}`} />
                <span>{isSimranFreeModeEnabled ? "🎬 [ ON ] SIMRAN FREE MODE ACTIVE (BLURRED & FREE POP-UP)" : "🎬 [ OFF ] ENABLE SIMRAN FREE MODE"}</span>
              </button>
            </div>
          </div>
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
                {chartMode === "status" ? "Firestore Listings Status Distribution" : "Active Listings Category Breakdown"}
              </h2>
              <p className="text-stone-500 text-[10px] uppercase font-mono leading-relaxed">
                {chartMode === "status" 
                  ? "Live visualization of Active, Pending, and Sold listings created by users in production"
                  : "Granular breakdown of Active published listings categorized by vehicle type (SUV, Sedan, Motorcycle, etc.)"
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
                ) : (
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
                )}
              </div>
            </div>
          </div>

          <div className="w-full h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
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
            onClick={() => setActiveSubSection("spare_parts")}
            className={`flex-1 min-w-[140px] py-3 text-center text-xs uppercase tracking-widest font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeSubSection === "spare_parts"
                ? "bg-amber-500 text-stone-950 shadow-md font-black border-b-2 border-amber-300"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0 text-amber-500" />
            The Vault Parts ({adminSpareParts.length})
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
            onClick={() => setActiveSubSection("audit")}
            className={`flex-1 min-w-[120px] py-3 text-center text-xs uppercase tracking-widest font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeSubSection === "audit"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <History className="w-4 h-4 shrink-0 text-amber-600" />
            Audit Logs
          </button>

          {isOwner && (
            <button
              onClick={() => setActiveSubSection("roles")}
              className={`flex-1 min-w-[140px] py-3 text-center text-xs uppercase tracking-widest font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
                activeSubSection === "roles"
                  ? "bg-amber-600 text-stone-950 shadow-md font-black border-b-2 border-amber-300"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <Users className="w-4 h-4 shrink-0 text-stone-900" />
              User Roles ({usersList.length})
            </button>
          )}

          <button
            onClick={() => setActiveSubSection("content")}
            className={`flex-1 min-w-[140px] py-3 text-center text-xs uppercase tracking-widest font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeSubSection === "content"
                ? "bg-purple-900 text-white shadow-md border-b-2 border-amber-400"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0 text-amber-400" />
            Edit Mode (Content)
          </button>

          <button
            onClick={() => setActiveSubSection("sms")}
            className={`flex-1 min-w-[150px] py-3 text-center text-xs uppercase tracking-widest font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeSubSection === "sms"
                ? "bg-emerald-950 text-emerald-300 shadow-md border-b-2 border-emerald-400 font-black"
                : "text-stone-700 hover:text-stone-900 hover:bg-emerald-50/50"
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0 text-emerald-500 animate-pulse" />
            <span>SMS Alerts</span>
            <span className={`px-1.5 py-0.5 text-[8.5px] font-mono font-bold rounded ${
              smsSettings.isSmsEnabled ? "bg-emerald-500 text-stone-950" : "bg-stone-300 text-stone-700"
            }`}>
              {smsSettings.isSmsEnabled ? "ON" : "OFF"}
            </span>
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

                {/* HOME PAGE FEATURED SHOWCASE MANAGEMENT PANEL */}
                <div className="bg-stone-900 text-[#F4F1EA] border-2 border-stone-950 p-5 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-amber-500" />
                        <h2 className="text-xs sm:text-sm font-serif font-black uppercase text-white tracking-tight">Home Page Featured Showcase ({homeFeaturedIds.length})</h2>
                      </div>
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono mt-0.5">Select and pin items directly displayed in the home tab featured collections</p>
                    </div>
                    {homeFeaturedIds.length > 0 && (
                      <button
                        onClick={() => {
                          playSynthBeep(400, 0.15, "sawtooth");
                          setConfirmModal({
                            isOpen: true,
                            title: "CLEAR HOME SHOWCASE",
                            message: "Are you sure you want to reset the Home Page Showcase? It will revert to showing the default first 3 active vehicles.",
                            onConfirm: () => {
                              setHomeFeaturedIds([]);
                              localStorage.removeItem("autoWorld_home_featured_ids");
                              window.dispatchEvent(new Event("autoWorld_db_update"));
                              triggerHudAlert("SHOWCASE RESET", "Home Page Featured Showcase has been reset to defaults.", "restore");
                            }
                          });
                        }}
                        className="px-3 py-1.5 border border-stone-700 hover:bg-stone-800 text-stone-305 hover:text-white text-[9px] font-mono font-bold uppercase cursor-pointer"
                      >
                        Reset to Defaults
                      </button>
                    )}
                  </div>

                  {homeFeaturedIds.length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-stone-800 rounded-sm">
                      <p className="text-stone-400 text-[10px] uppercase font-mono">No custom home page items chosen. The system is displaying the first 3 active defaults.</p>
                      <p className="text-stone-500 text-[9px] uppercase font-mono mt-1">Click the "🏠 Pin to Home" button on any vehicle card below to start customizing your home tab!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {homeFeaturedIds.map((key, idx) => {
                        // find the corresponding item in aggregateList. We map both defaults and listings to their matches
                        const item = [
                          ...allDefaultsMapped.map(v => ({ ...v, uniqueKey: `default-${v.id}` })),
                          ...userListingsMapped.map(v => ({ ...v, uniqueKey: `user-${v.listingId}` }))
                        ].find(v => v.uniqueKey === key);

                        if (!item) return null;
                        return (
                          <div key={key} className="bg-stone-950 p-2 border border-stone-800 flex flex-col justify-between space-y-2 group relative">
                            <div className="relative aspect-video bg-stone-900 overflow-hidden">
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover animate-in fade-in" referrerPolicy="no-referrer" />
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-stone-900/90 text-white font-mono text-[7px] border border-stone-800">
                                #{idx + 1}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="text-[10px] font-bold uppercase tracking-tight text-white line-clamp-1">{item.title}</h4>
                              <p className="text-stone-400 text-[8px] font-mono">₹{item.price.toLocaleString()}</p>
                            </div>

                            {/* Precise Ordering Controls */}
                            <div className="flex items-center justify-between gap-1 bg-stone-900 p-1 border border-stone-850">
                              {/* Move Up */}
                              <button
                                disabled={idx === 0}
                                onClick={() => moveHomeFeaturedItem(idx, "up")}
                                className="p-1 bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-amber-400 disabled:opacity-20 disabled:hover:bg-stone-950 disabled:hover:text-stone-400 cursor-pointer rounded-sm border border-stone-800 transition"
                                title="Move Position Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>

                              {/* Rank Select */}
                              <div className="flex items-center gap-1">
                                <span className="text-[7px] font-mono text-stone-500 uppercase tracking-widest">Rank</span>
                                <select
                                  value={idx + 1}
                                  onChange={(e) => setHomeFeaturedItemRank(idx, e.target.value)}
                                  className="bg-stone-950 text-amber-500 hover:text-amber-400 border border-stone-800 font-mono text-[9px] py-0.5 px-1 rounded-sm focus:outline-none focus:border-amber-500 cursor-pointer text-center font-bold"
                                  title="Change precise display rank position"
                                >
                                  {Array.from({ length: homeFeaturedIds.length }).map((_, rankIdx) => (
                                    <option key={rankIdx} value={rankIdx + 1}>
                                      {rankIdx + 1}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Move Down */}
                              <button
                                disabled={idx === homeFeaturedIds.length - 1}
                                onClick={() => moveHomeFeaturedItem(idx, "down")}
                                className="p-1 bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-amber-400 disabled:opacity-20 disabled:hover:bg-stone-950 disabled:hover:text-stone-400 cursor-pointer rounded-sm border border-stone-800 transition"
                                title="Move Position Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => handleToggleHomeFeatured(key, item.title)}
                              className="w-full py-1 bg-stone-900 hover:bg-red-950 text-stone-400 hover:text-red-200 text-[8px] font-mono font-bold uppercase border border-stone-800 cursor-pointer"
                            >
                              Unpin
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

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
                                      {item.status === "hidden" && (
                                        <span className="uppercase px-2 py-0.5 border bg-red-100 text-red-800 border-red-300 font-extrabold flex items-center gap-1">
                                          <EyeOff className="w-3 h-3 text-red-600" />
                                          Hidden by Admin
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

                                  {/* Admin Hide / Unhide Toggle */}
                                  <button
                                    onClick={() => {
                                      const found = listings.find(l => l.id === item.listingId);
                                      if (found) handleToggleHideUserListing(found);
                                    }}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                                      listings.find(l => l.id === item.listingId)?.status === "hidden"
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                                        : "bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                                    }`}
                                    title={listings.find(l => l.id === item.listingId)?.status === "hidden" ? "Unhide vehicle and make active for buyers" : "Hide vehicle listing from public view (car owner will see hidden status)"}
                                  >
                                    <EyeOff className="w-3 h-3" />
                                    {listings.find(l => l.id === item.listingId)?.status === "hidden" ? "Unhide" : "Hide"}
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

                                  {/* Home Page Featured Showcase control */}
                                  <button
                                    onClick={(e) => {
                                      handleToggleHomeFeatured(`user-${item.listingId}`, item.title);
                                      spawnParticles(e, '#f59e0b', homeFeaturedIds.includes(`user-${item.listingId}`) ? '-HOME' : '+HOME', '🏠');
                                    }}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                                      homeFeaturedIds.includes(`user-${item.listingId}`)
                                        ? "bg-[#D97706] text-white border-[#B45309]"
                                        : "bg-[#FAF8F5] hover:bg-stone-100 border-stone-300 text-stone-700"
                                    }`}
                                    title="Pin or unpin this listing to the Home Page Featured Showcase"
                                  >
                                    <Home className="w-3.5 h-3.5" />
                                    {homeFeaturedIds.includes(`user-${item.listingId}`) ? "🏠 Pinned" : "🏠 Pin Home"}
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

                                  {/* Home Page Featured Showcase control */}
                                  <button
                                    onClick={(e) => {
                                      handleToggleHomeFeatured(`default-${item.id}`, item.title);
                                      spawnParticles(e, '#f59e0b', homeFeaturedIds.includes(`default-${item.id}`) ? '-HOME' : '+HOME', '🏠');
                                    }}
                                    className={`px-2.5 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                                      homeFeaturedIds.includes(`default-${item.id}`)
                                        ? "bg-[#D97706] text-white border-[#B45309]"
                                        : "bg-[#FAF8F5] hover:bg-stone-100 border-stone-300 text-stone-700"
                                    }`}
                                    title="Pin or unpin this vehicle to the Home Page Featured Showcase"
                                  >
                                    <Home className="w-3.5 h-3.5" />
                                    {homeFeaturedIds.includes(`default-${item.id}`) ? "🏠 Pinned" : "🏠 Pin Home"}
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

            {/* SUBSECTION 1.5: THE VAULT (SPARE PARTS / MODS / NITRO MANAGEMENT) */}
            {activeSubSection === "spare_parts" && (
              <div className="space-y-6 animate-in fade-in">
                {/* Header card for spare parts */}
                <div className="bg-stone-900 text-white border-2 border-stone-950 p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest">
                        <Wrench className="w-3.5 h-3.5 text-amber-400" />
                        <span>The Vault Administrative Control Desk</span>
                      </div>
                      <h2 className="text-2xl font-serif font-black uppercase text-white tracking-tight">
                        Performance Parts, Mods & Nitro Ledger
                      </h2>
                      <p className="text-stone-400 text-xs font-mono">
                        Pin spare parts to the homepage Vault carousel, manage inventory status, edit prices, or delete catalog items.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-amber-500 text-stone-950 text-xs font-mono font-black uppercase tracking-wider border border-amber-400">
                        Total Items: {adminSpareParts.length}
                      </span>
                      <span className="px-3 py-1.5 bg-stone-800 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider border border-stone-700">
                        Pinned on Home: {homePinnedSparePartIds.length}
                      </span>
                    </div>
                  </div>

                  {/* Filters & Search */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={sparePartsSearch}
                        onChange={(e) => setSparePartsSearch(e.target.value)}
                        placeholder="Search part title, brand, compatibility..."
                        className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <select
                        value={sparePartsCatFilter}
                        onChange={(e) => setSparePartsCatFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="all">ALL CATEGORIES ({adminSpareParts.length})</option>
                        <option value="performance">PERFORMANCE & TURBOS</option>
                        <option value="engine">ENGINE & EXHAUST</option>
                        <option value="nitro">NITROUS / NOS KITS</option>
                        <option value="wheels">WHEELS & BRAKES</option>
                        <option value="body_kits">BODY KITS & AERO</option>
                        <option value="electronics">ELECTRONICS & ECU</option>
                        <option value="tools">TOOLS & WORKSHOP</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => {
                          setSparePartsSearch("");
                          setSparePartsCatFilter("all");
                        }}
                        className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition border border-stone-700"
                      >
                        Reset Search Filters
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table of Spare Parts */}
                {adminSpareParts.length === 0 ? (
                  <div className="bg-[#FAF8F5] border-2 border-stone-300 p-12 text-center space-y-3">
                    <Wrench className="w-12 h-12 text-stone-400 mx-auto" />
                    <h3 className="text-sm font-serif font-bold uppercase text-stone-900">No Parts or Modifications Found</h3>
                    <p className="text-xs font-mono text-stone-500">Add parts using the Sell tab or seed default items.</p>
                  </div>
                ) : (
                  <div className="bg-[#FAF8F5] border-2 border-stone-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-900 text-white font-mono text-[10px] uppercase tracking-wider border-b-2 border-stone-950">
                            <th className="p-3">Component / Part</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Compatibility</th>
                            <th className="p-3">Price</th>
                            <th className="p-3">Condition</th>
                            <th className="p-3">Status / Home Pin</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-300 font-mono text-xs">
                          {adminSpareParts
                            .filter(part => {
                              const searchStr = `${part.title} ${part.partCategory} ${part.brand || ""} ${part.compatibility || ""}`.toLowerCase();
                              const matchesSearch = searchStr.includes(sparePartsSearch.toLowerCase());
                              const matchesCat = sparePartsCatFilter === "all" || part.partCategory === sparePartsCatFilter;
                              return matchesSearch && matchesCat;
                            })
                            .map((part) => {
                              const isPinned = part.isPinned || homePinnedSparePartIds.includes(part.id);
                              return (
                                <tr key={part.id} className="hover:bg-stone-200/60 transition-colors">
                                  {/* Part Info */}
                                  <td className="p-3">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={part.image}
                                        alt={part.title}
                                        className="w-12 h-12 object-cover border border-stone-400 rounded-xs bg-stone-900 shrink-0"
                                      />
                                      <div>
                                        <div className="font-bold text-stone-950 uppercase line-clamp-1">{part.title}</div>
                                        <div className="text-[10px] text-stone-500 uppercase">{part.brand || "Aftermarket OEM"}</div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Category */}
                                  <td className="p-3 font-semibold text-stone-800 uppercase text-[11px]">
                                    {part.partCategory.replace("_", " ")}
                                  </td>

                                  {/* Compatibility */}
                                  <td className="p-3 text-stone-700 text-[11px] max-w-[150px] truncate">
                                    {part.compatibility || "Universal"}
                                  </td>

                                  {/* Price */}
                                  <td className="p-3 font-black text-amber-600">
                                    ₹{part.price.toLocaleString("en-IN")}
                                  </td>

                                  {/* Condition */}
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 bg-stone-200 text-stone-800 text-[9px] font-bold uppercase border border-stone-300">
                                      {part.condition.replace("_", " ")}
                                    </span>
                                  </td>

                                  {/* Pin Status Toggle */}
                                  <td className="p-3">
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePinSparePart(part.id, isPinned)}
                                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 border shadow-xs ${
                                        isPinned
                                          ? "bg-amber-500 text-stone-950 border-amber-400 shadow-amber-300/40"
                                          : "bg-stone-200 hover:bg-stone-300 text-stone-700 border-stone-300"
                                      }`}
                                      title={isPinned ? "Click to unpin from Home Page" : "Click to pin to Home Page Vault"}
                                    >
                                      <span>{isPinned ? "✦ PINNED ON HOME" : "📌 PIN TO HOME"}</span>
                                    </button>
                                  </td>

                                  {/* Actions */}
                                  <td className="p-3 text-right">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        playSynthBeep(400, 0.2, "sawtooth");
                                        setConfirmModal({
                                          isOpen: true,
                                          title: "DELETE SPARE PART",
                                          message: `Are you sure you want to delete "${part.title}" from The Vault database?`,
                                          danger: true,
                                          confirmText: "DELETE PART",
                                          onConfirm: async () => {
                                            try {
                                              await deleteDoc(doc(db, "components", part.id));
                                            } catch (e) {}
                                            setAdminSpareParts(prev => prev.filter(p => p.id !== part.id));
                                            triggerHudAlert("PART DELETED", `Removed "${part.title}" from catalog.`, "delete");
                                            showToast(`Spare part "${part.title}" deleted.`, "info");
                                          }
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-red-100 hover:bg-red-600 hover:text-white text-red-700 border border-red-300 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 ml-auto"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
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

            {/* SUBSECTION 5: SYSTEM OPERATION AUDIT LOGS */}
            {activeSubSection === "audit" && (
              <AdminAuditLogs
                currentUserEmail={currentUser?.email || "Admin"}
                currentUserRole={currentUserRole}
                showToast={showToast}
              />
            )}

            {/* SUBSECTION 6: SITE CONTENT MANAGEMENT (EDIT MODE) */}
            {activeSubSection === "content" && (
              <div className="space-y-8">
                {/* Header Banner */}
                <div className="bg-[#FAF8F5] border-2 border-purple-900/30 p-5 shadow-[4px_4px_0px_0px_rgba(147,51,234,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-purple-700" />
                      <h2 className="text-base font-serif font-black uppercase text-stone-900 tracking-tight">
                        Site Content Customizer (Edit Mode)
                      </h2>
                    </div>
                    <p className="text-stone-500 text-xs font-mono mt-1">
                      Modify global footer contact info, login page quotes & car images, Simran Mode dialogues, and FAQs in real time.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-purple-900 text-white text-[10px] font-mono font-bold uppercase tracking-widest border border-purple-800 shrink-0">
                    REAL-TIME FIRESTORE SYNC
                  </span>
                </div>

                {/* 1. FOOTER & HEADQUARTERS CONTACT DETAILS CARD */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-stone-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-600" />
                      1. Footer & Headquarters Contact Details
                    </h3>
                    <span className="text-[10px] text-stone-500 font-mono">Synced on Footer & Contact page</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">
                        Footer Email Address:
                      </label>
                      <input
                        type="email"
                        value={footerEmail}
                        onChange={(e) => setFooterEmail(e.target.value)}
                        placeholder="e.g. support@autoworld.com"
                        className="w-full p-2.5 bg-white border-2 border-stone-900 text-xs font-mono focus:bg-stone-50 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">
                        Footer Phone Number:
                      </label>
                      <input
                        type="text"
                        value={footerPhone}
                        onChange={(e) => setFooterPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full p-2.5 bg-white border-2 border-stone-900 text-xs font-mono focus:bg-stone-50 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">
                      Showroom / Headquarters Office Address:
                    </label>
                    <input
                      type="text"
                      value={showroomAddress}
                      onChange={(e) => setShowroomAddress(e.target.value)}
                      placeholder="e.g. 123 Auto Avenue, Corporate Square, Mumbai..."
                      className="w-full p-2.5 bg-white border-2 border-stone-900 text-xs font-mono focus:bg-stone-50 outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveFooterSettings(footerEmail, footerPhone);
                        handleSaveShowroomAddress(showroomAddress);
                      }}
                      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-widest border-2 border-stone-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      Save Contact & Address Info
                    </button>
                  </div>
                </div>

                {/* HERO SECTION HEADLINES CUSTOMIZER CARD */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-stone-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Hero Section Headlines & Tagline
                    </h3>
                    <span className="text-[10px] text-stone-500 font-mono">Main Homepage Banner</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">
                        Top Badge / Editorial Subtitle:
                      </label>
                      <input
                        type="text"
                        value={heroBadge}
                        onChange={(e) => setHeroBadge(e.target.value)}
                        placeholder="e.g. Volume IV • Issue 12 • Established MMXXVI"
                        className="w-full p-2.5 bg-white border-2 border-stone-900 text-xs font-mono focus:bg-stone-50 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">
                        Main Hero Title Heading:
                      </label>
                      <input
                        type="text"
                        value={heroTitle}
                        onChange={(e) => setHeroTitle(e.target.value)}
                        placeholder="e.g. The Aesthetic of Fine Motors."
                        className="w-full p-2.5 bg-white border-2 border-stone-900 text-xs font-serif font-bold text-stone-900 focus:bg-stone-50 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">
                        Hero Description Paragraph:
                      </label>
                      <textarea
                        rows={2}
                        value={heroSubtitle}
                        onChange={(e) => setHeroSubtitle(e.target.value)}
                        placeholder="e.g. Refining the pre-owned vehicular trade network..."
                        className="w-full p-2.5 bg-white border-2 border-stone-900 text-xs font-sans text-stone-900 focus:bg-stone-50 outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveHeroSettings(heroTitle, heroSubtitle, heroBadge)}
                      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-widest border-2 border-stone-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      Save Hero Headlines
                    </button>
                  </div>
                </div>

                {/* ANNOUNCEMENT BANNER CUSTOMIZER CARD */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-stone-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Top Announcement / Promo Alert Banner
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-stone-600">
                        {isAnnouncementEnabled ? "ENABLED" : "DISABLED"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAnnouncementEnabled(!isAnnouncementEnabled)}
                        className={`w-10 h-5 rounded-full p-0.5 transition ${isAnnouncementEnabled ? "bg-emerald-600" : "bg-stone-400"}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition transform ${isAnnouncementEnabled ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">
                      Announcement Banner Message Text:
                    </label>
                    <input
                      type="text"
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      placeholder="e.g. 🔥 EXCLUSIVE PROMO: Unlimited verified listings..."
                      className="w-full p-2.5 bg-white border-2 border-stone-900 text-xs font-mono focus:bg-stone-50 outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveAnnouncementSettings(announcementText, isAnnouncementEnabled)}
                      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-widest border-2 border-stone-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      Save Announcement Banner
                    </button>
                  </div>
                </div>

                {/* 2. LOGIN PAGE CUSTOMIZER CARD */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-stone-900 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-600" />
                      2. Login Page Quote & Car Background
                    </h3>
                    <span className="text-[10px] text-stone-500 font-mono">Desktop & Mobile Login</span>
                  </div>

                  {/* Quote Editor */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">
                      Inspirational Quote Text:
                    </label>
                    <textarea
                      rows={2}
                      value={loginQuote}
                      onChange={(e) => setLoginQuote(e.target.value)}
                      placeholder="Enter quote shown on login left showcase panel..."
                      className="w-full p-3 bg-white border-2 border-stone-900 text-xs font-serif italic text-stone-900 focus:bg-stone-50 outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Car Image Editor & Presets */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">
                        Login Car Image Background:
                      </label>
                      <span className="text-[10px] font-mono text-stone-500">Upload file, select preset, or paste URL</span>
                    </div>

                    {/* Local File Uploader Dropzone */}
                    <div className="p-3 bg-white border-2 border-dashed border-purple-800/40 hover:border-purple-800 transition space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-900 uppercase">
                          <Upload className="w-4 h-4 text-purple-600 shrink-0" />
                          <span>Upload From Device Files:</span>
                        </div>
                        <label className="px-3 py-1.5 bg-purple-900 hover:bg-purple-950 text-white text-[10px] font-mono font-bold uppercase tracking-wider border border-purple-950 cursor-pointer transition flex items-center justify-center gap-1.5 shadow-xs">
                          <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                          <span>Browse My Files...</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (!file.type.startsWith("image/")) {
                                showToast("Please select a valid image file (PNG, JPG, WEBP, etc.)", "error");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === "string") {
                                  setLoginCarImage(reader.result);
                                  showToast(`Loaded ${file.name} for Login background!`, "success");
                                  triggerHudAlert("FILE LOADED", `Set local file "${file.name}" as Login image.`, "verified");
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] font-mono text-stone-500">
                        Supports local PNG, JPG, SVG, WEBP files from your computer or phone.
                      </p>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "Default Monochrome", url: "/monochrome-car.jpg" },
                        { label: "HD Silver Sports Car", url: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=1600" },
                        { label: "Red Supercar", url: "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&q=80&w=1600" },
                        { label: "Luxury Vintage Coupe", url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1600" }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLoginCarImage(preset.url)}
                          className={`p-2 text-[10px] font-mono font-bold uppercase tracking-wider border text-left transition cursor-pointer flex flex-col gap-1 ${
                            loginCarImage === preset.url
                              ? "bg-purple-900 text-white border-purple-950 font-black shadow-sm"
                              : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
                          }`}
                        >
                          <span>{preset.label}</span>
                          <span className="text-[8px] opacity-70 truncate">{preset.url}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={loginCarImage}
                        onChange={(e) => setLoginCarImage(e.target.value)}
                        placeholder="https://... or data:image/..."
                        className="w-full p-2.5 bg-white border-2 border-stone-900 text-xs font-mono focus:bg-stone-50 outline-none"
                      />
                      {loginCarImage.startsWith("data:") && (
                        <span className="px-2 py-1 bg-emerald-800 text-white text-[9px] font-mono font-bold uppercase shrink-0">
                          Custom File Uploaded
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div className="p-4 bg-stone-950 text-white border-2 border-stone-900 space-y-2 relative overflow-hidden rounded-none">
                    <div className="flex items-center justify-between text-[9px] font-mono text-amber-400 font-bold uppercase tracking-widest pb-1 border-b border-stone-800">
                      <span>LIVE PREVIEW: LOGIN SHOWCASE</span>
                      <span>16:9 RATIO</span>
                    </div>
                    <div className="relative h-40 w-full overflow-hidden border border-stone-800 bg-black flex items-end p-4">
                      <img 
                        src={loginCarImage || "/monochrome-car.jpg"} 
                        alt="Preview" 
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                        onError={(e) => { (e.target as any).src = "/monochrome-car.jpg"; }}
                      />
                      <div className="relative z-10 max-w-sm space-y-2">
                        <div className="w-8 h-[1px] bg-amber-400" />
                        <p className="text-xs font-serif italic text-stone-200 line-clamp-3">
                          "{loginQuote}"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveLoginSettings(loginQuote, loginCarImage)}
                      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-widest border-2 border-stone-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      Save Login Quote & Image
                    </button>
                  </div>
                </div>

                {/* 3. REGISTER / CREATE ACCOUNT PAGE CUSTOMIZER CARD */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-stone-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#c5a059]" />
                      3. Register / Create Account Page Quote & Car Background
                    </h3>
                    <span className="text-[10px] text-stone-500 font-mono">Sign Up Mode Customizer</span>
                  </div>

                  {/* Quote Editor */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">
                      Register Page Quote Text:
                    </label>
                    <textarea
                      rows={2}
                      value={registerQuote}
                      onChange={(e) => setRegisterQuote(e.target.value)}
                      placeholder="Enter quote shown on register left showcase panel..."
                      className="w-full p-3 bg-white border-2 border-stone-900 text-xs font-serif italic text-stone-900 focus:bg-stone-50 outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Car Image Editor & Presets */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700">
                        Register Page Car Image Background:
                      </label>
                      <span className="text-[10px] font-mono text-stone-500">Upload file, select preset, or paste URL</span>
                    </div>

                    {/* Local File Uploader Dropzone */}
                    <div className="p-3 bg-white border-2 border-dashed border-amber-800/40 hover:border-amber-700 transition space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-900 uppercase">
                          <Upload className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Upload From Device Files:</span>
                        </div>
                        <label className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-mono font-bold uppercase tracking-wider border border-stone-950 cursor-pointer transition flex items-center justify-center gap-1.5 shadow-xs">
                          <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                          <span>Browse My Files...</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (!file.type.startsWith("image/")) {
                                showToast("Please select a valid image file (PNG, JPG, WEBP, etc.)", "error");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === "string") {
                                  setRegisterCarImage(reader.result);
                                  showToast(`Loaded ${file.name} for Register background!`, "success");
                                  triggerHudAlert("FILE LOADED", `Set local file "${file.name}" as Register image.`, "verified");
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] font-mono text-stone-500">
                        Supports local PNG, JPG, SVG, WEBP files from your computer or phone.
                      </p>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "Luxury Vintage Coupe", url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1600" },
                        { label: "Porsche 911 GT3", url: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1600" },
                        { label: "Studio Supercar", url: "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1600" },
                        { label: "Monochrome Classic", url: "/monochrome-car.jpg" }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setRegisterCarImage(preset.url)}
                          className={`p-2 text-[10px] font-mono font-bold uppercase tracking-wider border text-left transition cursor-pointer flex flex-col gap-1 ${
                            registerCarImage === preset.url
                              ? "bg-stone-900 text-amber-400 border-stone-950 font-black shadow-sm"
                              : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
                          }`}
                        >
                          <span>{preset.label}</span>
                          <span className="text-[8px] opacity-70 truncate">{preset.url}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={registerCarImage}
                        onChange={(e) => setRegisterCarImage(e.target.value)}
                        placeholder="https://... or data:image/..."
                        className="w-full p-2.5 bg-white border-2 border-stone-900 text-xs font-mono focus:bg-stone-50 outline-none"
                      />
                      {registerCarImage.startsWith("data:") && (
                        <span className="px-2 py-1 bg-emerald-800 text-white text-[9px] font-mono font-bold uppercase shrink-0">
                          Custom File Uploaded
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div className="p-4 bg-stone-950 text-white border-2 border-stone-900 space-y-2 relative overflow-hidden rounded-none">
                    <div className="flex items-center justify-between text-[9px] font-mono text-amber-400 font-bold uppercase tracking-widest pb-1 border-b border-stone-800">
                      <span>LIVE PREVIEW: REGISTER SHOWCASE</span>
                      <span>16:9 RATIO</span>
                    </div>
                    <div className="relative h-40 w-full overflow-hidden border border-stone-800 bg-black flex items-end p-4">
                      <img 
                        src={registerCarImage || "/monochrome-car.jpg"} 
                        alt="Register Preview" 
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                        onError={(e) => { (e.target as any).src = "/monochrome-car.jpg"; }}
                      />
                      <div className="relative z-10 max-w-sm space-y-2">
                        <div className="w-8 h-[1px] bg-amber-400" />
                        <p className="text-xs font-serif italic text-stone-200 line-clamp-3">
                          "{registerQuote}"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveRegisterSettings(registerQuote, registerCarImage)}
                      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-widest border-2 border-stone-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      Save Register Quote & Image
                    </button>
                  </div>
                </div>

                {/* 3. SIMRAN MODE DIALOGUES CUSTOMIZER CARD */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-6">
                  <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <h3 className="text-xs font-mono font-black uppercase tracking-wider text-stone-900">
                        3. Simran Mode Dialogues ({customDialogues.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetDialogues}
                      className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 text-[10px] font-mono font-bold uppercase tracking-wider border border-stone-400 transition cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3 text-stone-600" />
                      Restore Default Dialogues
                    </button>
                  </div>

                  {/* Add / Edit Form */}
                  <div className="p-4 bg-white border-2 border-stone-900 space-y-4 shadow-sm">
                    <h4 className="text-xs font-mono font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                      {editingDialogueIdx !== null ? <Wrench className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-purple-600" />}
                      {editingDialogueIdx !== null ? `Editing Dialogue #${editingDialogueIdx + 1}` : "Add New Dialogue to Showcase"}
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                          Dialogue Quote:
                        </label>
                        <textarea
                          rows={2}
                          value={dialogueForm.quote}
                          onChange={(e) => setDialogueForm({ ...dialogueForm, quote: e.target.value })}
                          placeholder="e.g. Ja Simran, jee le apni zindagi!"
                          className="w-full p-2.5 bg-stone-50 border border-stone-400 text-xs font-serif italic text-stone-900 focus:bg-white outline-none resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                            Character Name:
                          </label>
                          <input
                            type="text"
                            value={dialogueForm.character}
                            onChange={(e) => setDialogueForm({ ...dialogueForm, character: e.target.value })}
                            placeholder="e.g. Amrish Puri"
                            className="w-full p-2 bg-stone-50 border border-stone-400 text-xs font-mono focus:bg-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                            Movie Title (Year):
                          </label>
                          <input
                            type="text"
                            value={dialogueForm.movie}
                            onChange={(e) => setDialogueForm({ ...dialogueForm, movie: e.target.value })}
                            placeholder="e.g. DDLJ (1995)"
                            className="w-full p-2 bg-stone-50 border border-stone-400 text-xs font-mono focus:bg-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                            Tag / Category:
                          </label>
                          <input
                            type="text"
                            value={dialogueForm.type}
                            onChange={(e) => setDialogueForm({ ...dialogueForm, type: e.target.value })}
                            placeholder="e.g. Simran Special"
                            className="w-full p-2 bg-stone-50 border border-stone-400 text-xs font-mono focus:bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        {editingDialogueIdx !== null && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDialogueIdx(null);
                              setDialogueForm({ quote: "", character: "", movie: "", type: "Simran Special" });
                            }}
                            className="px-3 py-1.5 bg-stone-200 text-stone-700 text-xs font-mono font-bold uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAddOrUpdateDialogue}
                          className="px-4 py-2 bg-purple-900 hover:bg-purple-800 text-white text-xs font-mono font-bold uppercase tracking-widest border border-purple-950 cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4 text-amber-400" />
                          {editingDialogueIdx !== null ? "Update Dialogue" : "Add Dialogue Item"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List of Active Dialogues */}
                  <div className="space-y-2.5">
                    {customDialogues.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-stone-900 text-stone-100 border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-amber-400 text-stone-950 font-mono text-[9px] font-black uppercase">
                              #{idx + 1} {item.type}
                            </span>
                            <span className="text-[10px] font-mono text-stone-400">— {item.character} ({item.movie})</span>
                          </div>
                          <p className="text-xs font-serif italic text-amber-200">
                            "{item.quote}"
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDialogueIdx(idx);
                              setDialogueForm(item);
                            }}
                            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-400 text-[10px] font-mono font-bold uppercase border border-stone-700 cursor-pointer flex items-center gap-1"
                          >
                            <Wrench className="w-3 h-3" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDialogue(idx)}
                            className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 text-[10px] font-mono font-bold uppercase border border-red-800 cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. MEMBERSHIP FAQs CUSTOMIZER CARD */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-6">
                  <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-purple-600" />
                      <h3 className="text-xs font-mono font-black uppercase tracking-wider text-stone-900">
                        4. Membership FAQs Management ({customFaqs.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetFaqs}
                      className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 text-[10px] font-mono font-bold uppercase tracking-wider border border-stone-400 transition cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3 text-stone-600" />
                      Restore Default FAQs
                    </button>
                  </div>

                  {/* Add / Edit FAQ Form */}
                  <div className="p-4 bg-white border-2 border-stone-900 space-y-3 shadow-sm">
                    <h4 className="text-xs font-mono font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                      {editingFaqIdx !== null ? <Wrench className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-purple-600" />}
                      {editingFaqIdx !== null ? `Editing FAQ Item #${editingFaqIdx + 1}` : "Add New Question & Answer"}
                    </h4>

                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                          Question:
                        </label>
                        <input
                          type="text"
                          value={faqForm.q}
                          onChange={(e) => setFaqForm({ ...faqForm, q: e.target.value })}
                          placeholder="e.g. Can I list a car for free?"
                          className="w-full p-2 bg-stone-50 border border-stone-400 text-xs font-mono focus:bg-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-1">
                          Answer:
                        </label>
                        <textarea
                          rows={2}
                          value={faqForm.a}
                          onChange={(e) => setFaqForm({ ...faqForm, a: e.target.value })}
                          placeholder="Enter clear answer..."
                          className="w-full p-2.5 bg-stone-50 border border-stone-400 text-xs font-mono text-stone-800 focus:bg-white outline-none resize-none leading-relaxed"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        {editingFaqIdx !== null && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFaqIdx(null);
                              setFaqForm({ q: "", a: "" });
                            }}
                            className="px-3 py-1.5 bg-stone-200 text-stone-700 text-xs font-mono font-bold uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAddOrUpdateFaq}
                          className="px-4 py-2 bg-purple-900 hover:bg-purple-800 text-white text-xs font-mono font-bold uppercase tracking-widest border border-purple-950 cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4 text-amber-400" />
                          {editingFaqIdx !== null ? "Update FAQ Item" : "Add FAQ Item"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List of Active FAQs */}
                  <div className="space-y-3">
                    {customFaqs.map((faq, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-white border border-stone-300 shadow-sm space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono font-bold uppercase text-purple-700 bg-purple-100 px-2 py-0.5 border border-purple-200">
                              FAQ #{idx + 1}
                            </span>
                            <h5 className="text-xs font-bold text-stone-900 font-mono leading-snug">
                              Q: {faq.q}
                            </h5>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFaqIdx(idx);
                                setFaqForm(faq);
                              }}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-mono font-bold uppercase border border-stone-300 cursor-pointer flex items-center gap-1"
                            >
                              <Wrench className="w-3 h-3 text-amber-600" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFaq(idx)}
                              className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-mono font-bold uppercase border border-red-300 cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-stone-600 font-mono leading-relaxed pl-2 border-l-2 border-stone-300">
                          A: {faq.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUBSECTION 7: USER ROLES MANAGEMENT & DISPATCH CENTER */}
            {activeSubSection === "roles" && (
              <div className="space-y-6">
                {!isOwner ? (
                  <div className="p-8 bg-[#FAF8F5] border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-stone-900 space-y-4 font-sans">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-500 text-stone-950 flex items-center justify-center border border-stone-900 shrink-0 font-bold">
                        <ShieldAlert className="w-6 h-6 text-stone-950" />
                      </div>
                      <div>
                        <h3 className="text-lg font-serif font-black uppercase tracking-tight text-stone-950">
                          User Registry & Role Dispatch Restricted
                        </h3>
                        <p className="text-xs text-stone-600 font-mono mt-0.5">
                          Privileged Directory Clearance Required
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-300 text-stone-800 text-xs font-mono leading-relaxed">
                      <strong>Restricted Clearance:</strong> Viewing registered user accounts, user counts, and user list registries is restricted exclusively to the <strong>System Owner</strong>. Co-Owners and operational staff members do not have permission to access user account lists or modify operational roles.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ROLE DISPATCH CENTER HEADER */}
                <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 font-sans">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-none bg-stone-900 text-amber-400 flex items-center justify-center border border-stone-950 shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-serif font-black uppercase tracking-tight text-stone-900">
                            User Registry & Live Role Dispatch Center
                          </h2>
                          <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-800 text-[9px] font-mono font-bold uppercase tracking-widest border border-emerald-400 animate-pulse">
                            ● Live Firestore Sync Active
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 font-mono leading-relaxed mt-0.5">
                          Manage website accounts, view live online/registered users, and assign any of the 7 staff operational roles. Changes reflect immediately in real time for users.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold bg-stone-900 text-stone-100 px-3.5 py-2 shrink-0 border border-stone-950">
                      <UserCheck className="w-4 h-4 text-amber-400" />
                      <span>{usersList.length} Registered Accounts</span>
                    </div>
                  </div>

                  {/* SEARCH AND FILTER BAR */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-grow">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                        placeholder="Search users by name, email, or UID..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-stone-300 text-xs font-mono placeholder:text-stone-400 focus:outline-none focus:border-stone-900"
                      />
                    </div>
                    
                    {/* Role Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                      <button
                        onClick={() => setRoleFilter("all")}
                        className={`px-3 py-1.5 text-[10px] font-mono uppercase font-bold tracking-wider border cursor-pointer whitespace-nowrap ${
                          roleFilter === "all"
                            ? "bg-stone-900 text-white border-stone-900"
                            : "bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200"
                        }`}
                      >
                        All Users ({usersList.length})
                      </button>
                      {ALL_ROLES.map((r) => {
                        const count = usersList.filter(u => u.role === r.id).length;
                        return (
                          <button
                            key={r.id}
                            onClick={() => setRoleFilter(r.id)}
                            className={`px-2.5 py-1.5 text-[9.5px] font-mono uppercase font-bold tracking-wider border cursor-pointer whitespace-nowrap ${
                              roleFilter === r.id
                                ? "bg-stone-900 text-amber-400 border-stone-900"
                                : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
                            }`}
                          >
                            {r.label}: {count}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* USER CARDS GRID / LIST */}
                {(() => {
                  const filtered = usersList.filter(u => {
                    const matchesSearch = !roleSearch || 
                      (u.displayName || "").toLowerCase().includes(roleSearch.toLowerCase()) ||
                      (u.email || "").toLowerCase().includes(roleSearch.toLowerCase()) ||
                      (u.uid || "").toLowerCase().includes(roleSearch.toLowerCase());
                    const matchesRole = roleFilter === "all" || u.role === roleFilter;
                    return matchesSearch && matchesRole;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-[#FAF8F5] border-2 border-stone-900 p-12 text-center space-y-3 font-mono">
                        <Users className="w-10 h-10 text-stone-400 mx-auto" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-stone-800">No matching user accounts found</h3>
                        <p className="text-xs text-stone-500">Try clearing your search query or role filter.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filtered.map((user) => {
                        const isTargetUserOwner = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() || user.role === "Owner";
                        return (
                          <div
                            key={user.uid}
                            className="bg-[#FAF8F5] border-2 border-stone-900 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col lg:flex-row lg:items-center justify-between gap-5 font-sans"
                          >
                            {/* User Info Column */}
                            <div className="space-y-2 max-w-xl">
                              <div className="flex items-center gap-3">
                                {user.photoURL ? (
                                  <img src={user.photoURL} alt={user.displayName || user.email || "User"} className="w-10 h-10 rounded-full object-cover border-2 border-stone-900 shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-sm border-2 border-stone-950 shrink-0">
                                    {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm font-serif font-black uppercase tracking-tight text-stone-900">
                                      {user.displayName || "Registered User"}
                                    </h3>
                                    {/* Status Badge */}
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8.5px] font-mono font-black uppercase tracking-widest">
                                      ● Live User
                                    </span>
                                    {/* Role Badge */}
                                    <RoleBadge role={isTargetUserOwner ? "Owner" : user.role || "User"} size="sm" />
                                  </div>
                                  <p className="text-xs text-stone-600 font-mono mt-0.5">{user.email || "No email provided"}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-[9.5px] text-stone-500 font-mono uppercase tracking-wider pt-1 border-t border-stone-200">
                                <span>UID: <strong className="text-stone-700">{user.uid.slice(0, 16)}...</strong></span>
                                <span>Joined: <strong className="text-stone-700">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Recent"}</strong></span>
                                <span>Last Login: <strong className="text-stone-700">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active"}</strong></span>
                              </div>
                            </div>

                            {/* Role Assignment Buttons */}
                            <div className="space-y-2 shrink-0">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500 block">
                                {isTargetUserOwner ? "Owner Role (Permanent Root Access)" : "Assign Operational Role:"}
                              </span>
                              {isTargetUserOwner ? (
                                <div className="px-4 py-2 bg-amber-500 text-stone-950 font-mono font-black text-xs uppercase tracking-widest border border-amber-600 flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4 text-stone-950" />
                                  <span>OWNER (SYSTEM PROPRIETOR)</span>
                                </div>
                              ) : !isOwner ? (
                                <div className="space-y-1.5 max-w-md">
                                  <div className="px-3.5 py-2 bg-stone-100 border border-stone-300 rounded text-xs font-mono font-bold text-stone-800 flex items-center justify-between gap-3">
                                    <span>Role: <strong>{user.role || "User"}</strong></span>
                                    <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 border border-amber-300 uppercase">
                                      System Owner Only
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-stone-500">
                                    Role assignments are restricted exclusively to the System Owner.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                                    {ALL_ASSIGNABLE_ROLES.map((r) => {
                                      const isCurrentRole = user.role === r;
                                      const meta = ALL_ROLES.find(roleObj => roleObj.id === r);
                                      return (
                                        <button
                                          key={r}
                                          onClick={() => {
                                            if (r !== (user.role || "User")) {
                                              setPendingRoleChange({
                                                uid: user.uid,
                                                userName: user.displayName || user.email || "User",
                                                targetRole: r,
                                                currentRole: (user.role || "User") as UserRole
                                              });
                                            }
                                          }}
                                          className={`px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                                            isCurrentRole
                                              ? "bg-stone-900 text-amber-400 border-amber-500 shadow-sm font-black scale-105"
                                              : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100 hover:border-stone-900"
                                          }`}
                                          title={`${r}: ${meta?.description}`}
                                        >
                                          {isCurrentRole && "✓ "}
                                          {r}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Tooltip Description Guidance Box */}
                                  {(() => {
                                    const meta = ALL_ROLES.find(roleObj => roleObj.id === (user.role || "User"));
                                    return (
                                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[10px] font-mono text-stone-700 max-w-md flex items-start gap-1.5">
                                        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                          <strong className="text-amber-950 font-bold block">{meta?.label || user.role}:</strong>
                                          <span>{meta?.description}</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                  </>
                )}
              </div>
            )}

            {/* SUBSECTION 8: MOBILE SMS & NOTIFICATIONS CONTROL CENTER (+91 7666232753) */}
            {activeSubSection === "sms" && (
              <div className="space-y-6">
                {/* HERO CARD FOR MASTER TOGGLE & RECIPIENT NUMBER */}
                <div className={`p-6 border-2 transition-all duration-300 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] ${
                  smsSettings.isSmsEnabled
                    ? "bg-emerald-950 text-emerald-50 border-emerald-500 shadow-emerald-950/40"
                    : "bg-[#FAF8F5] text-stone-900 border-stone-900"
                }`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Smartphone className={`w-7 h-7 ${smsSettings.isSmsEnabled ? "text-emerald-400 animate-bounce" : "text-stone-500"}`} />
                        <h2 className="text-lg font-serif font-black uppercase tracking-tight">
                          Mobile SMS & Instant Alerts Control Center
                        </h2>
                        <span className={`px-2.5 py-0.5 text-[9.5px] font-mono font-black uppercase tracking-wider border rounded-xs ${
                          smsSettings.isSmsEnabled
                            ? "bg-emerald-500 text-stone-950 border-emerald-300 animate-pulse"
                            : "bg-amber-100 text-amber-900 border-amber-300"
                        }`}>
                          {smsSettings.isSmsEnabled ? "● MASTER ALERTS: ACTIVE" : "● MASTER ALERTS: PAUSED"}
                        </span>
                      </div>
                      <p className={`text-xs font-mono leading-relaxed uppercase ${
                        smsSettings.isSmsEnabled ? "text-emerald-200" : "text-stone-600"
                      }`}>
                        {smsSettings.isSmsEnabled
                          ? `Instant mobile notification alerts dispatched in real-time to owner number +91 ${smsSettings.targetNumber || "7666232753"} for new car uploads, staff logins, vehicle expirations, and buyer leads.`
                          : "Notifications master toggle is currently OFF. Turn ON to receive instant SMS & alert notifications on phone number 7666232753."}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <div className="flex items-center gap-2 bg-stone-900/90 text-white px-3 py-1.5 border border-emerald-500/40 text-xs font-mono">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Recipient Number:</span>
                          <input
                            type="text"
                            value={smsSettings.targetNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              const updated = saveSmsSettingsLocally({ targetNumber: val });
                              setSmsSettings(updated);
                            }}
                            className="bg-stone-800 text-emerald-300 font-bold px-2 py-0.5 border border-stone-700 w-32 focus:outline-none focus:border-emerald-400"
                            placeholder="7666232753"
                          />
                        </div>
                        <span className="text-[10px] text-emerald-300 font-mono font-semibold">
                          (Verified Owner Contact)
                        </span>
                      </div>
                    </div>

                    {/* Master Switch & Test Trigger Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleMasterSms(!smsSettings.isSmsEnabled)}
                        className={`py-3 px-6 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition border-2 shadow-md ${
                          smsSettings.isSmsEnabled
                            ? "bg-emerald-500 hover:bg-emerald-400 text-stone-950 border-emerald-300"
                            : "bg-stone-900 hover:bg-stone-800 text-amber-400 border-amber-500"
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${smsSettings.isSmsEnabled ? "bg-stone-950 animate-ping" : "bg-amber-500"}`} />
                        <span>{smsSettings.isSmsEnabled ? "[ ON ] DISABLE ALERTS" : "[ OFF ] ENABLE SMS ALERTS"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendTestSms}
                        className="py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white border border-stone-700 hover:border-emerald-400 text-[11px] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                        <span>⚡ Send Test SMS to {smsSettings.targetNumber || "7666232753"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* NOTIFICATION CATEGORIES TOGGLES GRID */}
                <div className="bg-[#FAF8F5] border-2 border-stone-950 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-300">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-amber-600" />
                      <h3 className="text-sm font-serif font-black uppercase text-stone-900 tracking-tight">
                        Granular Alert Trigger Categories
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-stone-500 font-bold uppercase">
                      Recipient: +91 {smsSettings.targetNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Car Uploads */}
                    <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
                      smsSettings.alertCarUploads
                        ? "bg-stone-900 text-stone-100 border-emerald-500 shadow-sm"
                        : "bg-white text-stone-600 border-stone-300"
                    }`}>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase font-serif tracking-wider flex items-center gap-1.5">
                            🚗 New Car Uploads
                          </span>
                          <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold ${
                            smsSettings.alertCarUploads ? "bg-emerald-500 text-stone-950" : "bg-stone-200 text-stone-600"
                          }`}>
                            {smsSettings.alertCarUploads ? "ACTIVE" : "OFF"}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 font-mono leading-relaxed">
                          Alert when any user or dealer submits a new car listing on the Sell Tab.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSmsCategory("alertCarUploads", !smsSettings.alertCarUploads)}
                        className={`w-full py-2 text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                          smsSettings.alertCarUploads
                            ? "bg-emerald-500 text-stone-950 border-emerald-400 hover:bg-emerald-400"
                            : "bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700"
                        }`}
                      >
                        {smsSettings.alertCarUploads ? "✓ CAR UPLOAD ALERTS ON" : "TOGGLE ON CAR UPLOADS"}
                      </button>
                    </div>

                    {/* 2. Staff Logs */}
                    <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
                      smsSettings.alertStaffLogs
                        ? "bg-stone-900 text-stone-100 border-emerald-500 shadow-sm"
                        : "bg-white text-stone-600 border-stone-300"
                    }`}>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase font-serif tracking-wider flex items-center gap-1.5">
                            👤 Staff Logs & Login
                          </span>
                          <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold ${
                            smsSettings.alertStaffLogs ? "bg-emerald-500 text-stone-950" : "bg-stone-200 text-stone-600"
                          }`}>
                            {smsSettings.alertStaffLogs ? "ACTIVE" : "OFF"}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 font-mono leading-relaxed">
                          Alert when staff or admins log in, change user roles, or modify settings.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSmsCategory("alertStaffLogs", !smsSettings.alertStaffLogs)}
                        className={`w-full py-2 text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                          smsSettings.alertStaffLogs
                            ? "bg-emerald-500 text-stone-950 border-emerald-400 hover:bg-emerald-400"
                            : "bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700"
                        }`}
                      >
                        {smsSettings.alertStaffLogs ? "✓ STAFF LOG ALERTS ON" : "TOGGLE ON STAFF LOGS"}
                      </button>
                    </div>

                    {/* 3. Car Expirations */}
                    <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
                      smsSettings.alertCarExpirations
                        ? "bg-stone-900 text-stone-100 border-amber-500 shadow-sm"
                        : "bg-white text-stone-600 border-stone-300"
                    }`}>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase font-serif tracking-wider flex items-center gap-1.5">
                            ⏳ 30-Day Listing Expired
                          </span>
                          <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold ${
                            smsSettings.alertCarExpirations ? "bg-amber-500 text-stone-950" : "bg-stone-200 text-stone-600"
                          }`}>
                            {smsSettings.alertCarExpirations ? "ACTIVE" : "OFF"}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 font-mono leading-relaxed">
                          Alert when a car listing reaches 30 days and auto-hides from public catalog.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSmsCategory("alertCarExpirations", !smsSettings.alertCarExpirations)}
                        className={`w-full py-2 text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                          smsSettings.alertCarExpirations
                            ? "bg-amber-500 text-stone-950 border-amber-400 hover:bg-amber-400"
                            : "bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700"
                        }`}
                      >
                        {smsSettings.alertCarExpirations ? "✓ EXPIRATION ALERTS ON" : "TOGGLE ON EXPIRATIONS"}
                      </button>
                    </div>

                    {/* 4. Buyer Leads & Requests */}
                    <div className={`p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
                      smsSettings.alertBuyerLeads
                        ? "bg-stone-900 text-stone-100 border-emerald-500 shadow-sm"
                        : "bg-white text-stone-600 border-stone-300"
                    }`}>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase font-serif tracking-wider flex items-center gap-1.5">
                            📞 Buyer Leads & Callbacks
                          </span>
                          <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold ${
                            smsSettings.alertBuyerLeads ? "bg-emerald-500 text-stone-950" : "bg-stone-200 text-stone-600"
                          }`}>
                            {smsSettings.alertBuyerLeads ? "ACTIVE" : "OFF"}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 font-mono leading-relaxed">
                          Alert for callback requests, test drive bookings, and inquiry leads.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSmsCategory("alertBuyerLeads", !smsSettings.alertBuyerLeads)}
                        className={`w-full py-2 text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                          smsSettings.alertBuyerLeads
                            ? "bg-emerald-500 text-stone-950 border-emerald-400 hover:bg-emerald-400"
                            : "bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700"
                        }`}
                      >
                        {smsSettings.alertBuyerLeads ? "✓ BUYER LEAD ALERTS ON" : "TOGGLE ON LEADS"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* DISPATCHED SMS & ALERTS HISTORY LOG LEDGER */}
                <div className="bg-[#FAF8F5] border-2 border-stone-950 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-300">
                    <div>
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-stone-900" />
                        <h3 className="text-base font-serif font-black uppercase text-stone-900 tracking-tight">
                          Dispatched SMS Alert Audit Ledger ({smsHistory.length})
                        </h3>
                      </div>
                      <p className="text-[10px] text-stone-500 uppercase font-mono mt-0.5">
                        Real-time system audit log of all SMS alerts dispatched to owner number +91 {smsSettings.targetNumber || "7666232753"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={smsSearch}
                          onChange={(e) => setSmsSearch(e.target.value)}
                          placeholder="Search alerts..."
                          className="pl-8 pr-3 py-1.5 bg-white border border-stone-300 text-xs font-mono text-stone-800 focus:outline-none focus:border-stone-900 w-48"
                        />
                      </div>

                      <select
                        value={smsCategoryFilter}
                        onChange={(e) => setSmsCategoryFilter(e.target.value)}
                        className="py-1.5 px-3 bg-white border border-stone-300 text-xs font-mono text-stone-800 focus:outline-none focus:border-stone-900"
                      >
                        <option value="all">All Alert Types</option>
                        <option value="carUpload">Car Uploads</option>
                        <option value="staffLog">Staff Logs</option>
                        <option value="carExpired">Expirations</option>
                        <option value="buyerLead">Buyer Leads</option>
                        <option value="testSms">Test SMS</option>
                      </select>
                    </div>
                  </div>

                  {/* ALERTS HISTORY TABLE / CARDS */}
                  {(() => {
                    const filteredAlerts = smsHistory.filter(item => {
                      const matchesSearch = `${item.title} ${item.message} ${item.type}`.toLowerCase().includes(smsSearch.toLowerCase());
                      const matchesCat = smsCategoryFilter === "all" || item.type === smsCategoryFilter;
                      return matchesSearch && matchesCat;
                    });

                    if (filteredAlerts.length === 0) {
                      return (
                        <div className="text-center py-12 border-2 border-dashed border-stone-300 bg-white p-6 space-y-2">
                          <Bell className="w-10 h-10 text-stone-400 mx-auto animate-pulse" />
                          <h4 className="text-sm font-serif font-black uppercase text-stone-700">No Dispatched SMS Alerts Found</h4>
                          <p className="text-xs text-stone-500 font-mono">
                            Alerts will automatically log here whenever cars are uploaded, staff log in, or leads arrive.
                          </p>
                          <button
                            type="button"
                            onClick={handleSendTestSms}
                            className="mt-3 px-4 py-2 bg-stone-900 text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-stone-800 cursor-pointer"
                          >
                            Send First Test Alert
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {filteredAlerts.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 bg-white border-2 border-stone-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono"
                          >
                            <div className="space-y-1 max-w-3xl">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider border ${
                                  item.type === "carUpload" ? "bg-emerald-100 text-emerald-900 border-emerald-300" :
                                  item.type === "staffLog" ? "bg-purple-100 text-purple-900 border-purple-300" :
                                  item.type === "carExpired" ? "bg-amber-100 text-amber-900 border-amber-300" :
                                  item.type === "testSms" ? "bg-blue-100 text-blue-900 border-blue-300" :
                                  "bg-stone-100 text-stone-900 border-stone-300"
                                }`}>
                                  {item.type.toUpperCase()}
                                </span>
                                <h4 className="text-xs font-bold text-stone-950 uppercase font-serif">
                                  {item.title}
                                </h4>
                                <span className="text-[9px] text-stone-500 font-bold">
                                  • {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Just now"}
                                </span>
                              </div>

                              <p className="text-xs text-stone-700 leading-relaxed">
                                {item.message}
                              </p>

                              <div className="flex items-center gap-3 text-[9px] text-stone-500 pt-0.5">
                                <span>Target: <strong className="text-stone-900">+91 {item.targetNumber || "7666232753"}</strong></span>
                                <span>Status: <strong className="text-emerald-700 font-bold">[DISPATCHED & STORED]</strong></span>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              <a
                                href={`https://wa.me/91${item.targetNumber || "7666232753"}?text=${encodeURIComponent("📱 AUTO WORLD ALERT:\n" + item.title + "\n\n" + item.message)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs"
                              >
                                <Smartphone className="w-3 h-3" />
                                <span>Send WhatsApp</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role Change Confirmation Dialog Modal */}
      <AnimatePresence>
        {pendingRoleChange && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans"
            onClick={() => setPendingRoleChange(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-2 border-stone-900 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 text-amber-600">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center border border-amber-300 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-950 font-serif">Confirm Role Assignment</h3>
                  <p className="text-xs text-stone-500 font-mono">Verify permission modification</p>
                </div>
              </div>

              <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono space-y-2 text-stone-800">
                <p>
                  Are you sure you want to change operational role for:
                </p>
                <div className="p-2.5 bg-white border border-stone-300 rounded font-bold text-stone-900">
                  {pendingRoleChange.userName}
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-stone-500">Current Role:</span>
                  <span className="font-bold text-stone-700 bg-stone-200 px-2 py-0.5 rounded">{pendingRoleChange.currentRole}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-700 font-bold">New Target Role:</span>
                  <span className="font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-300">{pendingRoleChange.targetRole}</span>
                </div>
                {(() => {
                  const targetMeta = ALL_ROLES.find(r => r.id === pendingRoleChange.targetRole);
                  return targetMeta ? (
                    <p className="text-[10px] text-stone-600 italic pt-1 border-t border-stone-200 leading-relaxed">
                      "{targetMeta.description}"
                    </p>
                  ) : null;
                })()}
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => setPendingRoleChange(null)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 font-mono text-xs font-bold rounded-lg border border-stone-300 hover:bg-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!pendingRoleChange) return;
                    try {
                      await updateUserRole(pendingRoleChange.uid, pendingRoleChange.targetRole);
                      recordAuditLog(
                        currentUser?.email || "Admin",
                        "Role Change",
                        `Assigned ${pendingRoleChange.targetRole} role to user ${pendingRoleChange.userName}`
                      );
                      showToast(`Assigned "${pendingRoleChange.targetRole}" role to ${pendingRoleChange.userName}!`, "success");
                    } catch (err) {
                      showToast("Failed to update user role", "error");
                    } finally {
                      setPendingRoleChange(null);
                    }
                  }}
                  className="px-4 py-2 bg-amber-500 text-stone-950 font-mono text-xs font-black rounded-lg border border-amber-600 hover:bg-amber-400 shadow-sm cursor-pointer"
                >
                  Confirm & Apply Role
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="relative w-full max-w-md bg-[#FAF8F5] border-3 border-stone-900 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6"
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
          </Modal>
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
  );
}
