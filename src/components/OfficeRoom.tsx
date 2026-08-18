import React, { useState, useEffect } from "react";
import { 
  Building2, Briefcase, User as UserIcon, ShieldCheck, ShieldAlert, Sparkles, 
  Car, Search, Tag, Mail, Calculator, CheckCircle2, Eye, EyeOff, Wrench, Plus, 
  Filter, AlertCircle, Clock, Check, BarChart3, ChevronRight, RefreshCw, Award, 
  Phone, MessageSquare, DollarSign, Users, Lock, Unlock, FileText, HelpCircle, Info, ChevronDown, UserCheck,
  Megaphone, Share2, Copy, Send, Image as ImageIcon, Target, TrendingUp, Globe, Heart, History, BookOpen, CheckSquare, Square, ListTodo, ArrowUpRight
} from "lucide-react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { UserRole, ALL_ROLES, OWNER_EMAIL, subscribeToUserRoles, updateUserRole, UserProfile, THE_7_ASSIGNABLE_ROLES, ROLE_SOPS, ALL_ASSIGNABLE_ROLES } from "../lib/userRoles";
import RoleBadge from "./RoleBadge";
import { Vehicle, UserListing } from "../types";
import { motion, AnimatePresence } from "motion/react";
import AdminAuditLogs, { recordAuditLog } from "./AdminAuditLogs";
import AdminPartsDesk from "./AdminPartsDesk";

interface OfficeRoomProps {
  currentUser: User | null;
  userRole: UserRole;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  setActiveTab: (tab: string) => void;
  onQuickView?: (vehicle: Vehicle) => void;
}

interface FirestoreMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  date: string;
}

interface FirestoreLoanLead {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  monthlyIncome: string;
  vehiclePrice: number;
  downPayment: number;
  loanAmount: number;
  tenureYears: number;
  monthlyEMI: number;
  vehicleTitle?: string;
  createdAt?: string;
  status?: string;
}

export default function OfficeRoom({ currentUser, userRole, showToast, setActiveTab, onQuickView }: OfficeRoomProps) {
  const [activeSubDesk, setActiveSubDesk] = useState<string>("overview");
  const [listings, setListings] = useState<UserListing[]>([]);
  const [messages, setMessages] = useState<FirestoreMessage[]>([]);
  const [loanLeads, setLoanLeads] = useState<FirestoreLoanLead[]>([]);
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

  // Marketing & Social Media Desk States
  const [bannerTitle, setBannerTitle] = useState("FESTIVE LUXURY SUPERCAR SALE — UP TO $15,000 DISCOUNT");
  const [bannerTag, setBannerTag] = useState("EXCLUSIVE SUMMER DEALS 🔥");
  const [bannerTheme, setBannerTheme] = useState<"gold" | "emerald" | "ruby" | "sapphire">("gold");
  const [bannerCta, setBannerCta] = useState("EXPLORE FEATURED OFFERS");
  const [bannerActive, setBannerActive] = useState(true);

  const [selectedSocialCar, setSelectedSocialCar] = useState<string>("Ferrari 296 GTB");
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "facebook" | "x" | "whatsapp">("instagram");
  const [customBadgeVehicleId, setCustomBadgeVehicleId] = useState<string>("");
  const [customBadgeText, setCustomBadgeText] = useState<string>("HOT DEAL 🔥");
  const [vehicleBadges, setVehicleBadges] = useState<Record<string, string>>({});

  // Department Desk Access Helpers
  const isOwner = currentUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() || userRole === "Owner";
  const isStaffUser = isOwner || (userRole && userRole !== "User");

  const canAccessStaffRoles = isOwner;
  const canAccessInventory = isOwner || userRole === "Co-Owner" || userRole === "Super Admin" || userRole === "Inventory Manager";
  const canAccessParts = isOwner || userRole === "Co-Owner" || userRole === "Super Admin" || userRole === "Inventory Manager" || userRole === "Parts Specialist" || userRole === "Content Moderator";
  const canAccessSales = isOwner || userRole === "Co-Owner" || userRole === "Super Admin" || userRole === "Sales & Leads Specialist";
  const canAccessSupport = isOwner || userRole === "Co-Owner" || userRole === "Super Admin" || userRole === "Support Agent";
  const canAccessModeration = isOwner || userRole === "Co-Owner" || userRole === "Super Admin" || userRole === "Content Moderator";
  const canAccessFinance = isOwner || userRole === "Co-Owner" || userRole === "Super Admin" || userRole === "Finance Specialist";
  const canAccessMarketing = isOwner || userRole === "Co-Owner" || userRole === "Super Admin" || userRole === "Marketing & Social Media Lead";

  // SOP Deck Active Role Selection & Interactive Checklist
  const [selectedSopRole, setSelectedSopRole] = useState<UserRole>(
    userRole !== "User" ? userRole : "Parts Specialist"
  );
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("autoworld_staff_completed_tasks");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleTaskCompletion = (taskKey: string) => {
    setCompletedTasks(prev => {
      const next = { ...prev, [taskKey]: !prev[taskKey] };
      try {
        localStorage.setItem("autoworld_staff_completed_tasks", JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Auto-set initial active desk based on assigned user role
  useEffect(() => {
    if (userRole === "Inventory Manager") setActiveSubDesk("inventory");
    else if (userRole === "Parts Specialist") setActiveSubDesk("parts");
    else if (userRole === "Sales & Leads Specialist") setActiveSubDesk("sales");
    else if (userRole === "Support Agent") setActiveSubDesk("support");
    else if (userRole === "Content Moderator") setActiveSubDesk("moderation");
    else if (userRole === "Finance Specialist") setActiveSubDesk("finance");
    else if (userRole === "Marketing & Social Media Lead") setActiveSubDesk("marketing");
    else if (canAccessStaffRoles) setActiveSubDesk("overview");
  }, [userRole]);

  const fetchOfficeData = async () => {
    setIsLoading(true);
    try {
      // Fetch listings
      const snapListings = await getDocs(collection(db, "listings"));
      const loadedListings: UserListing[] = [];
      snapListings.forEach((d) => {
        loadedListings.push({ ...d.data() as UserListing, id: d.id });
      });
      setListings(loadedListings);

      // Fetch messages
      const snapMsgs = await getDocs(collection(db, "messages"));
      const loadedMsgs: FirestoreMessage[] = [];
      snapMsgs.forEach((d) => {
        const val = d.data();
        loadedMsgs.push({
          id: d.id,
          name: val.name || "Anonymous",
          email: val.email || "",
          subject: val.subject || "No Subject",
          message: val.message || "",
          date: val.date || new Date().toISOString()
        });
      });
      setMessages(loadedMsgs);

      // Fetch loan leads
      const snapLoans = await getDocs(collection(db, "loanLeads"));
      const loadedLoans: FirestoreLoanLead[] = [];
      snapLoans.forEach((d) => {
        const val = d.data();
        loadedLoans.push({
          id: d.id,
          fullName: val.fullName || "Applicant",
          phone: val.phone || "",
          city: val.city || "",
          monthlyIncome: val.monthlyIncome || "",
          vehiclePrice: val.vehiclePrice || 0,
          downPayment: val.downPayment || 0,
          loanAmount: val.loanAmount || 0,
          tenureYears: val.tenureYears || 1,
          monthlyEMI: val.monthlyEMI || 0,
          vehicleTitle: val.vehicleTitle || "Vehicle Financing",
          createdAt: val.createdAt || new Date().toISOString(),
          status: val.status || "pending"
        });
      });
      setLoanLeads(loadedLoans);

    } catch (err) {
      console.warn("Office room data fetch notice:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficeData();

    // Subscribe to user roles if owner/admin
    let unsubUsers: (() => void) | null = null;
    if (canAccessStaffRoles) {
      unsubUsers = subscribeToUserRoles((users) => {
        setUsersList(users);
      });
    }

    return () => {
      if (unsubUsers) unsubUsers();
    };
  }, [currentUser, userRole]);

  // Handle Listing Status Approval
  const handleApproveListing = async (listingId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "pending" ? "active" : "pending";
    try {
      await updateDoc(doc(db, "listings", listingId), { status: nextStatus });
      setListings(prev => prev.map(item => item.id === listingId ? { ...item, status: nextStatus } : item));
      showToast(nextStatus === "active" ? "Listing approved & published!" : "Listing set to pending verification.", "success");
    } catch (err) {
      console.error("Approve error:", err);
      showToast("Permission denied or Firestore update error.", "error");
    }
  };

  const roleMeta = ALL_ROLES.find(r => r.id === userRole) || ALL_ROLES[ALL_ROLES.length - 1];

  if (!isStaffUser) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6 font-sans">
        <div className="bg-white border-2 border-stone-900 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-500/40 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="px-3 py-1 bg-amber-100 text-amber-900 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full inline-block border border-amber-300">
              Staff Office Access Restricted
            </div>
            <h2 className="text-2xl font-serif font-black text-stone-950">Staff Role Required</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              The AutoWorld Executive Office Room is reserved for team members with an assigned operational role.
            </p>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-left text-xs font-mono space-y-2 text-stone-700">
            <div className="flex items-center gap-2 text-stone-900 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Current Account Status:</span>
            </div>
            <p className="text-[11px] text-stone-600">
              Logged in as <strong className="text-stone-900">{currentUser?.displayName || currentUser?.email || "Customer"}</strong> (<span className="text-stone-500 font-bold">User / Unassigned</span>)
            </p>
            <p className="text-[10.5px] text-stone-500 pt-1 border-t border-stone-200">
              💡 Please request the System Owner or Admin to assign your account an operational staff role in the Admin Panel to unlock your department workspace.
            </p>
          </div>

          <button
            onClick={() => setActiveTab("home")}
            className="w-full py-3 bg-stone-900 text-[#F4F1EA] hover:bg-stone-800 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Car className="w-4 h-4 text-amber-400" />
            <span>Return to AutoWorld Showroom</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 pb-20 font-sans">
      {/* Top Banner & Luxury Office Header */}
      <section className="bg-stone-950 text-[#F4F1EA] pt-10 pb-12 px-4 sm:px-6 lg:px-12 border-b border-amber-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        
        <div className="max-w-[1550px] mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                    EXECUTIVE STAFF OFFICE ROOM
                  </span>
                </div>
                <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest hidden sm:inline">
                  LIVE FIRESTORE DESK CONNECTED
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight text-white flex items-center gap-3">
                <span>Auto World</span>
                <span className="italic font-normal text-amber-400 font-serif">Staff Office</span>
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-2xl leading-relaxed">
                Welcome to your role-specific operational workspace. All tools, lead registers, and catalog controls are tailored strictly to your verified access privileges.
              </p>
            </div>

            {/* Current Staff User Identity Card */}
            <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-xl shadow-xl backdrop-blur-md flex items-center gap-4 min-w-[300px]">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt={currentUser.displayName || "Avatar"} className="w-12 h-12 rounded-full border-2 border-amber-500/50 object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-stone-800 border-2 border-amber-500/50 text-amber-400 flex items-center justify-center font-bold text-lg">
                  {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">{currentUser?.displayName || currentUser?.email || "Staff Member"}</h3>
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
                <p className="text-[11px] text-stone-400 truncate">{currentUser?.email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <RoleBadge role={userRole} size="sm" />
                  <span className="text-[9px] text-stone-500 uppercase font-mono tracking-wider">• Verified Clearance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Office Room Workspace Container */}
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-10 mt-8">
        
        {/* Navigation Desk Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none border-b border-stone-200">
          <button
            onClick={() => setActiveSubDesk("overview")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubDesk === "overview"
                ? "bg-stone-950 text-white shadow-md"
                : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-500" />
            Office Overview
          </button>

          {canAccessInventory && (
            <button
              onClick={() => setActiveSubDesk("inventory")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeSubDesk === "inventory"
                  ? "bg-stone-950 text-white shadow-md"
                  : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200"
              }`}
            >
              <Car className="w-4 h-4 text-emerald-500" />
              Inventory Desk
              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-mono rounded-full font-bold">
                {listings.length}
              </span>
            </button>
          )}

          {canAccessParts && (
            <button
              onClick={() => setActiveSubDesk("parts")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeSubDesk === "parts"
                  ? "bg-amber-600 text-stone-950 font-black shadow-md border-b-2 border-amber-300"
                  : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200"
              }`}
            >
              <Wrench className="w-4 h-4 text-amber-600" />
              Hardware Desk
            </button>
          )}

          {canAccessSales && (
            <button
              onClick={() => setActiveSubDesk("sales")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeSubDesk === "sales"
                  ? "bg-stone-950 text-white shadow-md"
                  : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200"
              }`}
            >
              <DollarSign className="w-4 h-4 text-blue-500" />
              Sales & Buyer Desk
              <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 text-[10px] font-mono rounded-full font-bold">
                {messages.length}
              </span>
            </button>
          )}

          {canAccessSupport && (
            <button
              onClick={() => setActiveSubDesk("support")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeSubDesk === "support"
                  ? "bg-stone-950 text-white shadow-md"
                  : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-cyan-500" />
              Support Desk
            </button>
          )}

          {canAccessModeration && (
            <button
              onClick={() => setActiveSubDesk("moderation")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeSubDesk === "moderation"
                  ? "bg-stone-950 text-white shadow-md"
                  : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-rose-500" />
              Listing Approvals
              {listings.filter(l => l.status === "pending").length > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-mono rounded-full font-bold animate-pulse">
                  {listings.filter(l => l.status === "pending").length}
                </span>
              )}
            </button>
          )}

          {canAccessFinance && (
            <button
              onClick={() => setActiveSubDesk("finance")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeSubDesk === "finance"
                  ? "bg-stone-950 text-white shadow-md"
                  : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200"
              }`}
            >
              <Calculator className="w-4 h-4 text-indigo-500" />
              Finance & EMI Hub
              <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 text-[10px] font-mono rounded-full font-bold">
                {loanLeads.length}
              </span>
            </button>
          )}

          {canAccessMarketing && (
            <button
              onClick={() => setActiveSubDesk("marketing")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeSubDesk === "marketing"
                  ? "bg-stone-950 text-white shadow-md"
                  : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200"
              }`}
            >
              <Megaphone className="w-4 h-4 text-pink-500" />
              Marketing & Social Desk
              <span className="px-1.5 py-0.5 bg-pink-500/10 text-pink-600 text-[10px] font-mono rounded-full font-bold">
                Campaign
              </span>
            </button>
          )}

          {canAccessStaffRoles && (
            <button
              onClick={() => setActiveSubDesk("roles")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeSubDesk === "roles"
                  ? "bg-stone-950 text-white shadow-md"
                  : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200"
              }`}
            >
              <Users className="w-4 h-4 text-amber-500" />
              Staff & Roles Desk
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-700 text-[10px] font-mono rounded-full font-bold">
                {usersList.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveSubDesk("sop")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubDesk === "sop"
                ? "bg-amber-600 text-stone-950 font-black shadow-md border-b-2 border-amber-300"
                : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200"
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-600" />
            Operations & SOP Deck
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-800 text-[10px] font-mono rounded-full font-bold">
              Manual
            </span>
          </button>

          <button
            onClick={() => setActiveSubDesk("audit")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubDesk === "audit"
                ? "bg-stone-950 text-white shadow-md"
                : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200"
            }`}
          >
            <History className="w-4 h-4 text-purple-500" />
            Activity Log
            <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-600 text-[10px] font-mono rounded-full font-bold">
              Audit Trail
            </span>
          </button>
        </div>

        {/* SUB DESK CONTENT */}

        {/* 1. OVERVIEW DESK */}
        {activeSubDesk === "overview" && (
          <div className="space-y-8">
            {/* Quick Metrics Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">Active Inventory</span>
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <Car className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-serif font-bold text-stone-950">{listings.length}</div>
                <p className="text-[11px] text-stone-500 mt-1">Pre-owned vehicles cataloged</p>
              </div>

              <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">Buyer Inquiries</span>
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-serif font-bold text-stone-950">{messages.length}</div>
                <p className="text-[11px] text-stone-500 mt-1">Total customer leads captured</p>
              </div>

              <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">Pending Approvals</span>
                  <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-serif font-bold text-stone-950">
                  {listings.filter(l => l.status === "pending").length}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Awaiting moderator check</p>
              </div>

              <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">Loan Application Leads</span>
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Calculator className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-serif font-bold text-stone-950">{loanLeads.length}</div>
                <p className="text-[11px] text-stone-500 mt-1">EMI calculations submitted</p>
              </div>
            </div>

            {/* Role Privilege Summary Box */}
            <div className="bg-white border border-stone-200 p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-serif font-bold text-stone-950">
                  Assigned Operational Role: <span className="text-amber-600">{roleMeta.label}</span>
                </h3>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed mb-4">
                {roleMeta.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {canAccessInventory && (
                  <div className="p-4 rounded-lg border bg-emerald-50/50 border-emerald-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-900">Inventory Control Desk</span>
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-stone-500">Add, edit, and adjust catalog specifications.</p>
                  </div>
                )}

                {canAccessSales && (
                  <div className="p-4 rounded-lg border bg-blue-50/50 border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-900">Sales & Buyer Relations</span>
                      <Check className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-[11px] text-stone-500">Manage buyer test drives & price offers.</p>
                  </div>
                )}

                {canAccessSupport && (
                  <div className="p-4 rounded-lg border bg-cyan-50/50 border-cyan-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-900">Customer Support Desk</span>
                      <Check className="w-4 h-4 text-cyan-600" />
                    </div>
                    <p className="text-[11px] text-stone-500">Handle support tickets and callback logs.</p>
                  </div>
                )}

                {canAccessModeration && (
                  <div className="p-4 rounded-lg border bg-rose-50/50 border-rose-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-900">Listing Moderation Desk</span>
                      <Check className="w-4 h-4 text-rose-600" />
                    </div>
                    <p className="text-[11px] text-stone-500">Approve or reject pending seller submissions.</p>
                  </div>
                )}

                {canAccessFinance && (
                  <div className="p-4 rounded-lg border bg-indigo-50/50 border-indigo-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-900">Finance & Loan Applications</span>
                      <Check className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-[11px] text-stone-500">Process EMI calculations & banking quotes.</p>
                  </div>
                )}

                {canAccessMarketing && (
                  <div className="p-4 rounded-lg border bg-amber-50/50 border-amber-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-900">Marketing & Social Desk</span>
                      <Check className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-[11px] text-stone-500">Curate hero highlights and announcements.</p>
                  </div>
                )}

                {canAccessStaffRoles && (
                  <div className="p-4 rounded-lg border bg-purple-50/50 border-purple-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-900">Staff Roles & Permissions Desk</span>
                      <Check className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-[11px] text-stone-500">Manage user roles and staff privileges.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 1.5. PERFORMANCE HARDWARE & TUNING DESK */}
        {activeSubDesk === "parts" && canAccessParts && (
          <div className="space-y-6">
            <AdminPartsDesk
              showToast={showToast}
              currentUser={currentUser}
            />
          </div>
        )}

        {/* 2. INVENTORY DESK */}
        {activeSubDesk === "inventory" && canAccessInventory && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-stone-200">
              <div>
                <h2 className="text-lg font-serif font-bold text-stone-950">Vehicle Catalog & Stock Desk</h2>
                <p className="text-xs text-stone-500">Manage all vehicle listings stored in Firestore ledger.</p>
              </div>
              <button 
                onClick={() => setActiveTab("sell")}
                className="px-4 py-2 bg-stone-950 hover:bg-black text-amber-400 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                Post New Stock
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((item) => (
                <div key={item.id} className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50/50 hover:shadow-md transition">
                  <div className="h-40 relative bg-stone-900">
                    <img 
                      src={item.photos?.[0]?.src || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800"} 
                      alt={item.title} 
                      className="w-full h-full object-cover" 
                    />
                    <span className={`absolute top-3 left-3 px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded ${
                      item.status === "active" ? "bg-emerald-500 text-white" : "bg-amber-500 text-stone-950"
                    }`}>
                      {item.status || "active"}
                    </span>
                  </div>

                  <div className="p-4">
                    <h4 className="text-sm font-bold text-stone-950 line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-amber-700 font-bold font-mono mt-0.5">₹{item.price.toLocaleString("en-IN")}</p>
                    <p className="text-[11px] text-stone-500 mt-2">Seller: {item.sellerName || "Anonymous"}</p>

                    <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between">
                      <button 
                        onClick={() => handleApproveListing(item.id, item.status || "active")}
                        className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded cursor-pointer transition ${
                          item.status === "pending"
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-stone-200 hover:bg-stone-300 text-stone-800"
                        }`}
                      >
                        {item.status === "pending" ? "Approve" : "Toggle Pending"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. SALES & LEADS DESK */}
        {activeSubDesk === "sales" && canAccessSales && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="pb-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-bold text-stone-950">Sales Leads & Buyer Inquiries Desk</h2>
              <p className="text-xs text-stone-500">Live contact inquiries submitted by potential buyers.</p>
            </div>

            <div className="space-y-3">
              {messages.length === 0 ? (
                <p className="text-xs text-stone-500 italic">No incoming buyer inquiries captured yet.</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="p-4 border border-stone-200 rounded-lg bg-stone-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-950">{msg.name}</span>
                        <span className="text-[10px] font-mono text-stone-500">({msg.email})</span>
                      </div>
                      <p className="text-xs font-semibold text-amber-700 mt-1">{msg.subject}</p>
                      <p className="text-xs text-stone-600 mt-1">{msg.message}</p>
                      <span className="text-[9px] text-stone-400 block font-mono mt-2">Submitted: {msg.date}</span>
                    </div>
                    <a 
                      href={`mailto:${msg.email}?subject=Re: Auto World Inquiry - ${encodeURIComponent(msg.subject)}`} 
                      className="px-3 py-1.5 bg-stone-950 text-amber-400 text-[10px] font-mono font-bold uppercase rounded hover:bg-black transition cursor-pointer shrink-0"
                    >
                      Reply to Buyer
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. SUPPORT DESK */}
        {activeSubDesk === "support" && canAccessSupport && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="pb-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-bold text-stone-950">Customer Desk & Support Portal</h2>
              <p className="text-xs text-stone-500">Help center submissions & buyer assistance records.</p>
            </div>

            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.id} className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">{m.name} ({m.email})</span>
                    <span className="text-[10px] text-stone-400 font-mono">{m.date}</span>
                  </div>
                  <p className="text-xs text-stone-700 mt-2">{m.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. MODERATION DESK */}
        {activeSubDesk === "moderation" && canAccessModeration && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="pb-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-bold text-stone-950">Listing Quality & Moderation Queue</h2>
              <p className="text-xs text-stone-500">Approve or reject pending seller vehicle submissions.</p>
            </div>

            <div className="space-y-4">
              {listings.filter(l => l.status === "pending").length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-emerald-900">All seller submissions audited!</p>
                  <p className="text-[11px] text-emerald-700 mt-1">No pending vehicle listings awaiting review right now.</p>
                </div>
              ) : (
                listings.filter(l => l.status === "pending").map((item) => (
                  <div key={item.id} className="p-4 border border-stone-200 rounded-lg bg-stone-50 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-stone-950">{item.title}</h4>
                      <p className="text-xs text-amber-700 font-bold">₹{item.price.toLocaleString("en-IN")}</p>
                      <p className="text-[11px] text-stone-500">Seller: {item.sellerName} ({item.sellerEmail})</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleApproveListing(item.id, "pending")}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded cursor-pointer"
                      >
                        Approve & Publish
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 6. FINANCE DESK */}
        {activeSubDesk === "finance" && canAccessFinance && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="pb-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-bold text-stone-950">Loan Applications & EMI Lead Desk</h2>
              <p className="text-xs text-stone-500">Buyer instant financing calculations captured from website EMI widget.</p>
            </div>

            <div className="space-y-3">
              {loanLeads.length === 0 ? (
                <p className="text-xs text-stone-500 italic">No instant loan applications recorded yet.</p>
              ) : (
                loanLeads.map((lead) => (
                  <div key={lead.id} className="p-4 border border-stone-200 rounded-lg bg-stone-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-950">{lead.fullName}</span>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold">Phone: {lead.phone}</span>
                        <span className="text-[10px] font-mono text-stone-500">({lead.city})</span>
                      </div>
                      <p className="text-xs text-stone-700 mt-1 font-semibold">{lead.vehicleTitle}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-stone-600 font-mono">
                        <span>Vehicle Price: ₹{lead.vehiclePrice?.toLocaleString("en-IN")}</span>
                        <span>Down Payment: ₹{lead.downPayment?.toLocaleString("en-IN")}</span>
                        <span className="text-amber-700 font-bold">Monthly EMI: ₹{lead.monthlyEMI?.toLocaleString("en-IN")}/mo</span>
                      </div>
                    </div>

                    <a 
                      href={`tel:${lead.phone}`} 
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-bold uppercase rounded transition cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      Call Applicant
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 7. MARKETING & SOCIAL MEDIA DESK */}
        {activeSubDesk === "marketing" && canAccessMarketing && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-serif font-bold text-stone-950">Marketing & Social Media Campaign Desk</h2>
                  <span className="px-2 py-0.5 bg-pink-100 text-pink-800 text-[9px] font-mono font-bold uppercase tracking-widest rounded border border-pink-300">
                    ● ACTIVE
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Customize website promotional sale banners, generate formatted social media share graphics/text, assign deal badges, and track conversion leads.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono font-bold bg-stone-900 text-pink-400 px-3.5 py-2 rounded-lg shrink-0">
                <Megaphone className="w-4 h-4 text-pink-400" />
                <span>Campaign ROI: +28.4%</span>
              </div>
            </div>

            {/* Campaign Analytics Quick Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-stone-500">
                  <span>Monthly Impressions</span>
                  <Globe className="w-4 h-4 text-pink-600" />
                </div>
                <p className="text-2xl font-serif font-bold text-stone-950">142,850</p>
                <p className="text-[10px] text-emerald-600 font-mono font-bold">↑ +18.2% vs last month</p>
              </div>

              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-stone-500">
                  <span>Click-Through Rate (CTR)</span>
                  <Target className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-serif font-bold text-stone-950">5.4%</p>
                <p className="text-[10px] text-stone-500 font-mono">Industry avg: 2.1%</p>
              </div>

              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-stone-500">
                  <span>Social Referrals</span>
                  <Share2 className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-serif font-bold text-stone-950">1,240</p>
                <p className="text-[10px] text-blue-600 font-mono font-bold">IG, FB, WhatsApp & X</p>
              </div>

              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-stone-500">
                  <span>Test Drives via Ads</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-serif font-bold text-stone-950">48 Leads</p>
                <p className="text-[10px] text-emerald-600 font-mono font-bold">High intent buyers</p>
              </div>
            </div>

            {/* SECTION 1: Interactive Website Banner Customizer */}
            <div className="p-6 border border-stone-200 rounded-xl bg-stone-50/50 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-950 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-pink-600" />
                    Interactive Website Banner Customizer
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">Customize the live promotional campaign banner displayed across the AutoWorld showroom.</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-stone-600">Banner Active:</span>
                  <button
                    onClick={() => {
                      setBannerActive(!bannerActive);
                      showToast(bannerActive ? "Promotional banner paused." : "Promotional banner activated!", "info");
                    }}
                    className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-full cursor-pointer transition ${
                      bannerActive ? "bg-emerald-500 text-white" : "bg-stone-300 text-stone-700"
                    }`}
                  >
                    {bannerActive ? "● LIVE" : "PAUSED"}
                  </button>
                </div>
              </div>

              {/* Banner Live Preview Box */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500">Live Showroom Banner Preview:</span>
                <div className={`p-6 rounded-xl shadow-lg border relative overflow-hidden transition-all duration-300 ${
                  bannerTheme === "gold"
                    ? "bg-gradient-to-r from-stone-950 via-amber-950 to-stone-950 border-amber-500/40 text-[#F4F1EA]"
                    : bannerTheme === "emerald"
                    ? "bg-gradient-to-r from-emerald-950 via-teal-950 to-stone-950 border-emerald-500/40 text-emerald-100"
                    : bannerTheme === "ruby"
                    ? "bg-gradient-to-r from-rose-950 via-red-950 to-stone-950 border-rose-500/40 text-rose-100"
                    : "bg-gradient-to-r from-slate-950 via-blue-950 to-stone-950 border-blue-500/40 text-blue-100"
                }`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 bg-white/10 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full border border-white/20">
                        {bannerTag || "SPECIAL OFFER"}
                      </span>
                      <h4 className="text-base sm:text-lg font-serif font-bold tracking-tight text-white">{bannerTitle || "PROMOTIONAL TITLE"}</h4>
                    </div>
                    <button className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono text-xs font-black uppercase tracking-wider rounded-lg shadow-md shrink-0 cursor-pointer">
                      {bannerCta || "EXPLORE OFFERS"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Banner Control Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-500">Banner Title:</label>
                  <input
                    type="text"
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-500">Discount Badge Tag:</label>
                  <input
                    type="text"
                    value={bannerTag}
                    onChange={(e) => setBannerTag(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-500">Button CTA Label:</label>
                  <input
                    type="text"
                    value={bannerCta}
                    onChange={(e) => setBannerCta(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-500">Theme Atmosphere:</label>
                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    {(["gold", "emerald", "ruby", "sapphire"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setBannerTheme(t)}
                        className={`py-1.5 text-[10px] font-mono uppercase font-bold rounded border cursor-pointer ${
                          bannerTheme === t
                            ? "bg-stone-950 text-amber-400 border-amber-500"
                            : "bg-white text-stone-600 border-stone-300 hover:bg-stone-100"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => showToast("Promotional website banner updated & published live!", "success")}
                  className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Publish Banner Live
                </button>
              </div>
            </div>

            {/* SECTION 2: Social Share Content Post Studio */}
            <div className="p-6 border border-stone-200 rounded-xl bg-stone-50/50 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-stone-950 uppercase tracking-wider flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  Social Media Share Content Generator
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">Generate ready-to-publish social media captions with auto-formatted specifications & hashtag sets.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-500">Target Vehicle Listing:</label>
                  <select
                    value={selectedSocialCar}
                    onChange={(e) => setSelectedSocialCar(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {listings.length > 0 ? (
                      listings.map(l => (
                        <option key={l.id} value={`${l.make} ${l.model} ${l.year}`}>
                          {l.year} {l.make} {l.model} — ₹{l.price?.toLocaleString("en-IN")}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Ferrari 296 GTB">2023 Ferrari 296 GTB — ₹5,40,00,000</option>
                        <option value="Lamborghini Huracan EVO">2022 Lamborghini Huracan EVO — ₹3,70,00,000</option>
                        <option value="Porsche 911 GT3 RS">2024 Porsche 911 GT3 RS — ₹3,50,0,000</option>
                        <option value="Rolls-Royce Ghost">2023 Rolls-Royce Ghost — ₹6,95,00,000</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-500">Target Social Platform:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["instagram", "facebook", "x", "whatsapp"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedPlatform(p)}
                        className={`py-2 text-[10px] font-mono uppercase font-bold rounded-lg border cursor-pointer transition ${
                          selectedPlatform === p
                            ? "bg-blue-900 text-white border-blue-800 shadow-sm"
                            : "bg-white text-stone-600 border-stone-300 hover:bg-stone-100"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Formatted Social Output Copy Box */}
              {(() => {
                const socialText = selectedPlatform === "instagram"
                  ? `🚗 LUXURY SPOTLIGHT: ${selectedSocialCar}\n🔥 Exclusive Deal Available Now at AutoWorld!\n💎 Certified Multi-Point Quality Inspection Passed.\n⚡ Zero-down payment EMI finance options & instant test drive booking available.\n📍 Experience it live at AutoWorld Showroom or book online.\n\n#AutoWorld #LuxuryCars #${selectedSocialCar.replace(/\s+/g, '')} #SupercarsForSale #CarDeals`
                  : selectedPlatform === "whatsapp"
                  ? `🚗 *AutoWorld Special Arrival: ${selectedSocialCar}*\n\nLooking for an extraordinary drive? Book your VIP test drive today!\n✅ Certified Stock\n✅ Bank EMI Loan Assistance\n👉 Direct Inquiry: Call +91 98765 43210 or reply to this message.`
                  : `🏎️ FEATURED STOCK: ${selectedSocialCar}. Available now at AutoWorld Showroom! Book your test drive or inquire for custom financing. #AutoWorld #CarSales #${selectedSocialCar.replace(/\s+/g, '')}`;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-stone-500">Formatted Post Copy ({selectedPlatform.toUpperCase()}):</span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(socialText);
                          showToast(`Copied ${selectedPlatform.toUpperCase()} post copy to clipboard!`, "success");
                        }}
                        className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-amber-400 text-[10px] font-mono font-bold uppercase rounded flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        Copy Caption
                      </button>
                    </div>

                    <textarea
                      readOnly
                      rows={5}
                      value={socialText}
                      className="w-full p-3 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-800 focus:outline-none shadow-2xs"
                    />
                  </div>
                );
              })()}
            </div>

            {/* SECTION 3: Promotional Deal Badging Tool */}
            <div className="p-6 border border-stone-200 rounded-xl bg-stone-50/50 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-stone-950 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  Vehicle Promotional Badge Dispatch
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">Attach custom marketing badges to inventory listings to boost showroom click rates.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  value={customBadgeVehicleId}
                  onChange={(e) => setCustomBadgeVehicleId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">Select Inventory Vehicle...</option>
                  {listings.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.year} {l.make} {l.model} ({vehicleBadges[l.id] ? `Badge: ${vehicleBadges[l.id]}` : "No Badge"})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  {["HOT DEAL 🔥", "FEATURED 🌟", "PRICE DROP ⚡", "SPECIAL FINANCING 💎"].map(badge => (
                    <button
                      key={badge}
                      onClick={() => setCustomBadgeText(badge)}
                      className={`px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase rounded border cursor-pointer whitespace-nowrap ${
                        customBadgeText === badge
                          ? "bg-emerald-900 text-amber-300 border-emerald-700"
                          : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
                      }`}
                    >
                      {badge}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (!customBadgeVehicleId) {
                      showToast("Please select a vehicle to assign the badge.", "error");
                      return;
                    }
                    setVehicleBadges(prev => ({ ...prev, [customBadgeVehicleId]: customBadgeText }));
                    showToast(`Assigned "${customBadgeText}" badge to vehicle!`, "success");
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm cursor-pointer shrink-0"
                >
                  Apply Badge
                </button>
              </div>
            </div>

          </div>
        )}

        {/* 8. STAFF ROLES & PERMISSION DESK */}
        {activeSubDesk === "roles" && canAccessStaffRoles && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-serif font-bold text-stone-950">Staff Directory & Role Dispatch Desk</h2>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold uppercase tracking-widest rounded border border-emerald-300">
                    ● Real-Time Sync
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Assign or change staff operational roles for registered users. Select a role from the dropdown or hover to view its exact responsibilities and tooltips.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono font-bold bg-stone-900 text-stone-100 px-3.5 py-2 rounded-lg shrink-0">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>{usersList.length} Registered Accounts</span>
              </div>
            </div>

            {/* Role Responsibilities Tooltip Reference Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl space-y-2 font-mono">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Role Responsibility Guidance Reference:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[10.5px] text-stone-700">
                {ALL_ROLES.map((r) => (
                  <div key={r.id} className="p-2.5 bg-white/90 border border-amber-200/80 rounded-lg shadow-2xs">
                    <span className={`font-bold block ${r.textColor}`}>{r.label}:</span>
                    <span className="text-stone-600 leading-tight block mt-0.5">{r.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-grow">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Search user by name, email, or UID..."
                  className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setRoleFilter("all")}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase font-bold tracking-wider rounded-lg border cursor-pointer whitespace-nowrap ${
                    roleFilter === "all"
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
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
                      className={`px-2.5 py-1.5 text-[9.5px] font-mono uppercase font-bold tracking-wider rounded-lg border cursor-pointer whitespace-nowrap ${
                        roleFilter === r.id
                          ? "bg-stone-900 text-amber-400 border-stone-900"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {r.label}: {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Users List with Role Assignment Dropdowns & Tooltips */}
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
                  <div className="p-8 text-center bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                    <Users className="w-8 h-8 text-stone-400 mx-auto" />
                    <p className="text-xs font-bold text-stone-700">No matching user accounts found</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filtered.map((user) => {
                    const isTargetUserOwner = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() || user.role === "Owner";
                    const currentRoleMeta = ALL_ROLES.find(r => r.id === user.role) || ALL_ROLES[ALL_ROLES.length - 1];

                    return (
                      <div
                        key={user.uid}
                        className="p-5 border border-stone-200 rounded-xl bg-stone-50/50 hover:border-stone-300 transition flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                      >
                        {/* Left: User Info */}
                        <div className="space-y-2 max-w-xl">
                          <div className="flex items-center gap-3">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.displayName || user.email} className="w-10 h-10 rounded-full object-cover border-2 border-stone-300 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-stone-950">
                                  {user.displayName || "Registered User"}
                                </h3>
                                <RoleBadge role={user.role || "User"} size="sm" />
                              </div>
                              <p className="text-xs text-stone-500 font-mono mt-0.5">{user.email || "No email"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-[10px] text-stone-500 font-mono pt-1">
                            <span>UID: <strong className="text-stone-700">{user.uid.slice(0, 14)}...</strong></span>
                            <span>Joined: <strong className="text-stone-700">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Recent"}</strong></span>
                          </div>
                        </div>

                        {/* Right: Role Assignment Dropdown & Live Tooltip Description */}
                        <div className="space-y-2 shrink-0 min-w-[320px]">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500 flex items-center gap-1">
                              <span>Assign Operational Role:</span>
                              <Info className="w-3 h-3 text-amber-600" />
                            </label>
                          </div>

                          {isTargetUserOwner ? (
                            <div className="px-4 py-2 bg-amber-500/20 text-amber-900 border border-amber-400/50 rounded-lg text-xs font-mono font-bold flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Owner (Permanent Root Privilege)</span>
                            </div>
                          ) : !isOwner ? (
                            <div className="p-3 bg-stone-100 border border-stone-300 rounded-lg text-xs font-mono text-stone-700 flex items-center justify-between gap-2">
                              <span className="font-bold">{user.role || "User"}</span>
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 uppercase">
                                System Owner Only
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {/* Role Select Dropdown */}
                              <div className="relative">
                                <select
                                  value={user.role || "User"}
                                  onChange={(e) => {
                                    const newRole = e.target.value as UserRole;
                                    if (newRole !== (user.role || "User")) {
                                      setPendingRoleChange({
                                        uid: user.uid,
                                        userName: user.displayName || user.email || "User",
                                        targetRole: newRole,
                                        currentRole: (user.role || "User") as UserRole
                                      });
                                    }
                                  }}
                                  className="w-full pl-3 pr-8 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer appearance-none shadow-xs"
                                >
                                  {THE_7_ASSIGNABLE_ROLES.map((roleName) => {
                                    const meta = ALL_ROLES.find(r => r.id === roleName);
                                    return (
                                      <option key={roleName} value={roleName} title={`${roleName}: ${meta?.description}`}>
                                        {meta?.label || roleName} — ({meta?.description})
                                      </option>
                                    );
                                  })}
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                              </div>

                              {/* Tooltip Description Guidance Box */}
                              <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-lg text-[10.5px] font-mono text-stone-700 leading-relaxed flex items-start gap-2 shadow-2xs">
                                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-amber-950 font-bold block mb-0.5">
                                    {currentRoleMeta.label}:
                                  </strong>
                                  <span className="text-stone-600">{currentRoleMeta.description}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* 9. ACTIVITY LOG & AUDIT TRAIL DESK */}
        {activeSubDesk === "audit" && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-serif font-bold text-stone-950">Staff & Operational Activity Log</h2>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[9px] font-mono font-bold uppercase tracking-widest rounded border border-purple-300">
                    ● Real-Time Audit Ledger
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Tamper-proof history tracking user role reassignments, inventory additions, listing moderation actions, and administrative activity.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono font-bold bg-stone-900 text-purple-300 px-3.5 py-2 rounded-lg shrink-0">
                <History className="w-4 h-4 text-purple-400" />
                <span>Office Activity Stream</span>
              </div>
            </div>

            <AdminAuditLogs
              currentUserEmail={currentUser?.email || "staff@autoworld.com"}
              currentUserRole={userRole}
              showToast={showToast}
            />
          </div>
        )}

        {/* 10. STANDARD OPERATING PROCEDURES (SOP) & DUTIES MANUAL */}
        {activeSubDesk === "sop" && (
          <div className="space-y-8 font-sans">
            {/* Header Banner */}
            <div className="bg-[#FAF8F5] border border-stone-300 p-6 md:p-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-amber-800">
                    Auto World Staff Governance Deck
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-black text-stone-950">
                  Standard Operating Procedures & Duties Manual
                </h2>
                <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                  Interactive operational protocol guidelines, mandatory daily task checklists, and clearance governance across all Auto World department desks.
                </p>
              </div>

              <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-xs shrink-0 font-mono text-xs">
                <div className="text-[10px] uppercase text-stone-400 font-bold mb-1">Your Authenticated Profile</div>
                <div className="font-bold text-stone-900">{currentUser?.email || "staff@autoworld.com"}</div>
                <div className="text-amber-700 font-black mt-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{userRole}</span>
                </div>
              </div>
            </div>

            {/* Role Selection Navigator Tabs */}
            <div className="bg-white border border-stone-200 p-3 rounded-xl shadow-sm overflow-x-auto scrollbar-none flex items-center gap-2">
              {(Object.keys(ROLE_SOPS) as UserRole[]).map((rKey) => {
                const isSelected = selectedSopRole === rKey;
                const isMyRole = userRole === rKey;
                const rSop = ROLE_SOPS[rKey];

                return (
                  <button
                    key={rKey}
                    onClick={() => setSelectedSopRole(rKey)}
                    className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      isSelected
                        ? "bg-stone-950 text-white shadow-md font-mono"
                        : "bg-[#FAF8F5] text-stone-600 hover:text-stone-950 hover:bg-stone-100 border border-stone-200"
                    }`}
                  >
                    <span>{rKey}</span>
                    {isMyRole && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-stone-950 text-[9px] font-mono rounded font-black">
                        YOU
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Selected Role SOP Card */}
            {(() => {
              const currentSop = ROLE_SOPS[selectedSopRole] || ROLE_SOPS["Parts Specialist"];
              const roleMeta = ALL_ROLES.find(r => r.id === selectedSopRole) || {
                label: selectedSopRole,
                description: "Auto World Platform Operations",
                badgeBg: "bg-amber-100",
                textColor: "text-amber-900",
                borderColor: "border-amber-300"
              };
              const RoleIcon = selectedSopRole === "Owner" || selectedSopRole === "Co-Owner" || selectedSopRole === "Super Admin" 
                ? ShieldCheck 
                : selectedSopRole === "Parts Specialist" 
                ? Wrench 
                : selectedSopRole === "Inventory Manager" 
                ? Car 
                : selectedSopRole === "Sales & Leads Specialist" 
                ? DollarSign 
                : selectedSopRole === "Support Agent" 
                ? MessageSquare 
                : selectedSopRole === "Content Moderator" 
                ? CheckCircle2 
                : selectedSopRole === "Finance Specialist" 
                ? Calculator 
                : selectedSopRole === "Marketing & Social Media Lead" 
                ? Megaphone 
                : UserIcon;

              const roleTaskKeys = currentSop.dailyTasks.map((_, idx) => `${selectedSopRole}-task-${idx}`);
              const completedCount = roleTaskKeys.filter(k => completedTasks[k]).length;
              const totalCount = roleTaskKeys.length;
              const isAllDone = totalCount > 0 && completedCount === totalCount;

              return (
                <div className="space-y-6">
                  {/* Role Meta Summary Card */}
                  <div className="bg-white border border-stone-200 p-6 rounded-xl shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-50 rounded-xl text-amber-700 border border-amber-200 shrink-0">
                          <RoleIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl font-serif font-black text-stone-950">
                              {roleMeta.label}
                            </h3>
                            <span className={`px-2.5 py-0.5 text-[10px] font-mono font-black uppercase rounded-full border ${currentSop.badgeColor}`}>
                              {currentSop.clearanceLevel}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {roleMeta.description}
                          </p>
                        </div>
                      </div>

                      {/* Quick Action Navigation Links */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {currentSop.quickActions.map((qa, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (qa.tabTarget === "admin" || qa.tabTarget === "office") {
                                if (qa.label.toLowerCase().includes("part") || qa.label.toLowerCase().includes("hardware")) {
                                  setActiveSubDesk("parts");
                                } else if (qa.label.toLowerCase().includes("inventory") || qa.label.toLowerCase().includes("catalog")) {
                                  setActiveSubDesk("inventory");
                                } else {
                                  setActiveSubDesk("overview");
                                }
                              } else {
                                setActiveTab(qa.tabTarget);
                              }
                            }}
                            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-850 text-white text-[11px] font-mono uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                            title={qa.actionDesc}
                          >
                            <span>{qa.label}</span>
                            <ArrowUpRight className="w-3 h-3 text-amber-400" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Core Responsibilities Grid */}
                    <div className="mt-5">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        <span>Core Role Responsibilities</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentSop.coreResponsibilities.map((resp, idx) => (
                          <div key={idx} className="bg-[#FAF8F5] border border-stone-200 p-3.5 rounded-lg flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-stone-800 leading-relaxed font-sans">{resp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Grid: Daily Tasks Checklist & Strict SOP Protocol Guidelines */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Column 1: Daily Tasks Checklist */}
                    <div className="bg-white border border-stone-200 p-6 rounded-xl shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
                          <div className="flex items-center gap-2">
                            <ListTodo className="w-4 h-4 text-blue-600" />
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-950">
                              Daily Duty Checklist
                            </h4>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                            isAllDone ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-stone-100 text-stone-600"
                          }`}>
                            {completedCount} / {totalCount} Completed
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {currentSop.dailyTasks.map((task, idx) => {
                            const taskKey = `${selectedSopRole}-task-${idx}`;
                            const isDone = Boolean(completedTasks[taskKey]);

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => toggleTaskCompletion(taskKey)}
                                className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 cursor-pointer ${
                                  isDone 
                                    ? "bg-emerald-50/70 border-emerald-200 text-stone-500" 
                                    : "bg-[#FAF8F5] border-stone-200 text-stone-800 hover:border-stone-300"
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isDone ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-stone-400" />
                                  )}
                                </div>
                                <span className={`text-xs leading-relaxed ${isDone ? "line-through text-stone-500" : "font-medium"}`}>
                                  {task}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {isAllDone && (
                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-mono font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>All daily operational responsibilities signed off!</span>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Mandatory SOP Guidelines */}
                    <div className="bg-white border border-stone-200 p-6 rounded-xl shadow-sm">
                      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-stone-100">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-950">
                          Mandatory Operational Protocols (SOP)
                        </h4>
                      </div>

                      <div className="space-y-3">
                        {currentSop.sopGuidelines.map((guide, idx) => (
                          <div key={idx} className="p-3.5 bg-rose-50/40 border border-rose-100 rounded-lg flex items-start gap-2.5 text-xs text-stone-800 leading-relaxed">
                            <span className="text-rose-600 font-bold font-mono">§{idx + 1}</span>
                            <span>{guide}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 p-3.5 bg-[#FAF8F5] border border-stone-200 rounded-lg text-[11px] font-mono text-stone-600 leading-relaxed">
                        <span className="font-bold text-stone-900 block mb-1">COMPLIANCE NOTICE:</span>
                        Deviations from standard operational procedures are logged directly into the tamper-proof Audit Trail ledger.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ROLE CHANGE CONFIRMATION DIALOG MODAL */}
        <AnimatePresence>
          {pendingRoleChange && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans"
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
                    <ShieldAlert className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-950 font-serif">Confirm Role Change</h3>
                    <p className="text-xs text-stone-500 font-mono">Verify permission modification</p>
                  </div>
                </div>

                <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono space-y-2 text-stone-800">
                  <p>
                    Are you sure you want to reassign operational role for:
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
                        await recordAuditLog(
                          currentUser?.email || "staff@autoworld.com",
                          "ROLE ASSIGNMENT",
                          `Reassigned user "${pendingRoleChange.userName}" (${pendingRoleChange.uid}) from "${pendingRoleChange.currentRole}" to "${pendingRoleChange.targetRole}".`
                        );
                        showToast(`Successfully assigned role "${pendingRoleChange.targetRole}" to ${pendingRoleChange.userName}!`, "success");
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

      </div>
    </div>
  );
}
