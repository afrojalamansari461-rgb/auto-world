import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Award,
  Car,
  Wrench,
  Layout,
  Tag,
  Percent,
  UserCheck,
  PhoneCall,
  AlertTriangle,
  Ban,
  Lock,
  Unlock,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Search,
  MessageSquare,
  Calendar,
  Clock,
  Sparkles,
  FileCheck,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Sliders,
} from "lucide-react";
import { User } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_VEHICLES, DEFAULT_PARTS, UserListing, UserPartListing } from "../types";
import {
  AdminControlSystemsState,
  DealHandoverRecord,
  HomepageSectionConfig,
  HomepageStatItem,
  PromoCodeRecord,
  SellerVerificationRecord,
  SellerTrustTier,
  CrmInquiryRecord,
  CrmInquiryStatus,
  ListingReportRecord,
  BlacklistEntry,
  NegotiationOfferRecord,
  subscribeToControlSystems,
  saveControlSystemsState,
  recordVerifiedDealHandover,
  respondToNegotiationOffer,
} from "../lib/adminControlSystemsService";
import { recordAuditLog } from "./AdminAuditLogs";

export type ControlSystemModuleId =
  | "handover"
  | "homepage"
  | "pricing"
  | "kyc"
  | "crm"
  | "fraud";

interface AdminControlSystemsDeskProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  currentUser: User | null;
  initialModule?: ControlSystemModuleId;
}

export default function AdminControlSystemsDesk({
  showToast,
  currentUser,
  initialModule = "handover",
}: AdminControlSystemsDeskProps) {
  const [activeModule, setActiveModule] = useState<ControlSystemModuleId>(initialModule);
  const [state, setState] = useState<AdminControlSystemsState | null>(null);
  const [userVehicles, setUserVehicles] = useState<UserListing[]>([]);
  const [userParts, setUserParts] = useState<UserPartListing[]>([]);
  const [liveTestDrives, setLiveTestDrives] = useState<any[]>([]);
  const [liveCallbacks, setLiveCallbacks] = useState<any[]>([]);

  useEffect(() => {
    setActiveModule(initialModule);
  }, [initialModule]);

  useEffect(() => {
    const unsub = subscribeToControlSystems((nextState) => {
      setState(nextState);
    });
    return () => unsub();
  }, []);

  // Load vehicles, parts, test_drives, and callback_requests from Firestore + localStorage
  const refreshAuxiliaryData = async () => {
    try {
      const localVeh = JSON.parse(localStorage.getItem("autoWorld_listings") || "[]");
      if (Array.isArray(localVeh)) setUserVehicles(localVeh);
    } catch {}
    try {
      const localPrt = JSON.parse(localStorage.getItem("autoWorld_user_parts") || "[]");
      if (Array.isArray(localPrt)) setUserParts(localPrt);
    } catch {}
    try {
      const localTd = JSON.parse(localStorage.getItem("autoWorld_test_drives") || "[]");
      if (Array.isArray(localTd)) setLiveTestDrives(localTd);
    } catch {}
    try {
      const localCb = JSON.parse(localStorage.getItem("autoWorld_callback_requests") || "[]");
      if (Array.isArray(localCb)) setLiveCallbacks(localCb);
    } catch {}

    try {
      const [vehSnap, partSnap, tdSnap, cbSnap] = await Promise.allSettled([
        getDocs(collection(db, "listings")),
        getDocs(collection(db, "parts")),
        getDocs(collection(db, "test_drives")),
        getDocs(collection(db, "callback_requests")),
      ]);

      if (vehSnap.status === "fulfilled") {
        const list: UserListing[] = [];
        vehSnap.value.forEach((d) => list.push({ ...(d.data() as UserListing), id: d.id }));
        if (list.length > 0) setUserVehicles(list);
      }
      if (partSnap.status === "fulfilled") {
        const list: UserPartListing[] = [];
        partSnap.value.forEach((d) => list.push({ ...(d.data() as UserPartListing), id: d.id }));
        if (list.length > 0) setUserParts(list);
      }
      if (tdSnap.status === "fulfilled") {
        const list: any[] = [];
        tdSnap.value.forEach((d) => list.push({ ...d.data(), id: d.id }));
        if (list.length > 0) setLiveTestDrives(list);
      }
      if (cbSnap.status === "fulfilled") {
        const list: any[] = [];
        cbSnap.value.forEach((d) => list.push({ ...d.data(), id: d.id }));
        if (list.length > 0) setLiveCallbacks(list);
      }
    } catch (e) {
      console.warn("Auxiliary fetch fallback:", e);
    }
  };

  useEffect(() => {
    refreshAuxiliaryData();
    window.addEventListener("autoworld_requests_updated", refreshAuxiliaryData);
    return () => window.removeEventListener("autoworld_requests_updated", refreshAuxiliaryData);
  }, []);

  // ============================================================================
  // MODULE 1 STATES: VERIFIED DEAL & HANDOVER LEDGER
  // ============================================================================
  const [handoverItemType, setHandoverItemType] = useState<"vehicle" | "part">("vehicle");
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");
  const [customItemTitle, setCustomItemTitle] = useState<string>("");
  const [buyerGmailInput, setBuyerGmailInput] = useState<string>("");
  const [buyerNameInput, setBuyerNameInput] = useState<string>("");
  const [buyerPhoneInput, setBuyerPhoneInput] = useState<string>("");
  const [sellerGmailInput, setSellerGmailInput] = useState<string>("");
  const [sellerNameInput, setSellerNameInput] = useState<string>("Auto World Direct Vault");
  const [finalPriceInput, setFinalPriceInput] = useState<string>("");
  const [handoverDateInput, setHandoverDateInput] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [handoverLocationInput, setHandoverLocationInput] = useState<string>("Mumbai, Maharashtra");
  const [warrantyTierInput, setWarrantyTierInput] =
    useState<DealHandoverRecord["warrantyTier"]>("12-Month Comprehensive");
  const [vipPerksInput, setVipPerksInput] = useState<boolean>(true);
  const [handoverNotesInput, setHandoverNotesInput] = useState<string>("");
  const [ledgerSearch, setLedgerSearch] = useState<string>("");

  const catalogOptions = useMemo(() => {
    if (handoverItemType === "vehicle") {
      const defaults = DEFAULT_VEHICLES.map((v) => ({
        id: String(v.id),
        title: v.title,
        price: v.price,
        image: v.image,
        sellerName: v.sellerName || "Auto World Vault",
        sellerEmail: v.sellerEmail || "vault@autoworld.in",
        location: v.location || "Mumbai, Maharashtra",
      }));
      const users = userVehicles.map((u) => ({
        id: String(u.id),
        title: u.title,
        price: u.price,
        image: u.photos?.[0]?.src || "",
        sellerName: u.sellerName || "Verified Owner",
        sellerEmail: u.sellerEmail || "",
        location: u.location || "Mumbai, Maharashtra",
      }));
      return [...users, ...defaults];
    } else {
      const defaults = DEFAULT_PARTS.map((p) => ({
        id: String(p.id),
        title: p.title,
        price: p.price,
        image: p.image,
        sellerName: p.sellerName || "Motorsport Division",
        sellerEmail: p.sellerEmail || "parts@autoworld.in",
        location: p.location || "Pune, Maharashtra",
      }));
      const users = userParts.map((u) => ({
        id: String(u.id),
        title: u.title,
        price: u.price,
        image: u.photos?.[0]?.src || "",
        sellerName: u.sellerName || "Hardware Seller",
        sellerEmail: u.sellerEmail || "",
        location: u.location || "Pune, Maharashtra",
      }));
      return [...users, ...defaults];
    }
  }, [handoverItemType, userVehicles, userParts]);

  const handleSelectCatalogItem = (id: string) => {
    setSelectedCatalogId(id);
    const found = catalogOptions.find((item) => item.id === id);
    if (found) {
      setCustomItemTitle(found.title);
      setFinalPriceInput(String(found.price));
      setSellerNameInput(found.sellerName);
      setSellerGmailInput(found.sellerEmail);
      setHandoverLocationInput(found.location);
    }
  };

  const handleCreateHandoverRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerGmailInput.trim() || !buyerGmailInput.includes("@")) {
      showToast("Please enter a valid Buyer Gmail address.", "error");
      return;
    }
    if (!customItemTitle.trim()) {
      showToast("Please select a vehicle/part or enter its title.", "error");
      return;
    }

    const foundItem = catalogOptions.find((item) => item.id === selectedCatalogId);
    const salePrice = Number(finalPriceInput) || foundItem?.price || 0;

    const record = await recordVerifiedDealHandover({
      itemType: handoverItemType,
      itemId: selectedCatalogId || `CUSTOM-${Date.now()}`,
      itemTitle: customItemTitle.trim(),
      itemImage: foundItem?.image || "",
      dossierRef:
        handoverItemType === "vehicle"
          ? `AW-SOLD-${String(selectedCatalogId || "V").slice(0, 5).toUpperCase()}`
          : `PART-SOLD-${String(selectedCatalogId || "P").slice(0, 5).toUpperCase()}`,
      listedPrice: foundItem?.price || salePrice,
      finalSalePrice: salePrice,
      buyerGmail: buyerGmailInput.trim().toLowerCase(),
      buyerName: buyerNameInput.trim() || buyerGmailInput.split("@")[0],
      buyerPhone: buyerPhoneInput.trim(),
      sellerGmail: sellerGmailInput.trim().toLowerCase(),
      sellerName: sellerNameInput.trim() || "Auto World Concierge",
      handoverDate: handoverDateInput,
      location: handoverLocationInput.trim() || "Mumbai, Maharashtra",
      warrantyTier: warrantyTierInput,
      vipPerksUnlocked: vipPerksInput,
      notes: handoverNotesInput.trim(),
      recordedBy: currentUser?.email || "Admin",
    });

    await recordAuditLog(
      currentUser?.email || "Admin",
      "Verified Deal Handover",
      `Assigned Buyer Gmail (${record.buyerGmail}) to Sold ${record.itemType}: "${record.itemTitle}" for ₹${record.finalSalePrice.toLocaleString("en-IN")}.`
    );

    showToast(
      `Sold & Assigned to ${record.buyerGmail}! Official Verified Buyer log is now active for Testimonials & VIP Perks.`,
      "success"
    );

    setBuyerGmailInput("");
    setBuyerNameInput("");
    setBuyerPhoneInput("");
    setHandoverNotesInput("");
  };

  const handleDeleteHandoverRecord = async (id: string) => {
    await saveControlSystemsState((prev) => ({
      ...prev,
      dealsLedger: prev.dealsLedger.filter((d) => d.id !== id),
    }));
    showToast("Handover ledger entry removed.", "info");
  };

  // ============================================================================
  // MODULE 2 HANDLERS: HOMEPAGE LAYOUT, SECTION VISIBILITY & STATS
  // ============================================================================
  const handleToggleHomepageSection = async (sectionId: HomepageSectionConfig["id"]) => {
    if (!state) return;
    const updatedSections = state.homepageLayout.sections.map((s) =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    );
    await saveControlSystemsState((prev) => ({
      ...prev,
      homepageLayout: {
        ...prev.homepageLayout,
        sections: updatedSections,
      },
    }));
    showToast("Homepage section visibility updated live!", "success");
  };

  const handleMoveHomepageSection = async (index: number, direction: "up" | "down") => {
    if (!state) return;
    const sorted = [...state.homepageLayout.sections].sort((a, b) => a.order - b.order);
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const temp = sorted[index];
    sorted[index] = sorted[targetIdx];
    sorted[targetIdx] = temp;

    const reindexed = sorted.map((sec, idx) => ({ ...sec, order: idx + 1 }));
    await saveControlSystemsState((prev) => ({
      ...prev,
      homepageLayout: {
        ...prev.homepageLayout,
        sections: reindexed,
      },
    }));
    showToast(`Moved "${temp.label}" ${direction.toUpperCase()} on Home page!`, "success");
  };

  const handleUpdateStatItem = async (id: string, field: "value" | "label", val: string) => {
    if (!state) return;
    const nextStats = state.homepageLayout.stats.map((st) =>
      st.id === id ? { ...st, [field]: val } : st
    );
    await saveControlSystemsState((prev) => ({
      ...prev,
      homepageLayout: {
        ...prev.homepageLayout,
        stats: nextStats,
      },
    }));
  };

  // ============================================================================
  // MODULE 3 STATES & HANDLERS: DYNAMIC PRICING, PROMO CODES & FLASH SALE
  // ============================================================================
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoDesc, setNewPromoDesc] = useState("");
  const [newPromoType, setNewPromoType] = useState<"percent" | "flat">("percent");
  const [newPromoValue, setNewPromoValue] = useState("50");
  const [newPromoApplies, setNewPromoApplies] = useState<"all" | "buyer_pass" | "premium">("all");
  const [newPromoMaxUses, setNewPromoMaxUses] = useState("200");

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newPromoCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanCode) {
      showToast("Please enter a valid promo code (e.g. FESTIVAL50).", "error");
      return;
    }
    const val = Math.max(1, Number(newPromoValue) || 10);
    const newEntry: PromoCodeRecord = {
      id: `PROMO-${Date.now()}`,
      code: cleanCode,
      description: newPromoDesc.trim() || `${val}${newPromoType === "percent" ? "%" : " INR"} Off Promo`,
      discountType: newPromoType,
      discountValue: val,
      appliesTo: newPromoApplies,
      active: true,
      usageCount: 0,
      maxUses: Number(newPromoMaxUses) || 500,
    };

    await saveControlSystemsState((prev) => ({
      ...prev,
      pricingAndPromo: {
        ...prev.pricingAndPromo,
        promoCodes: [
          newEntry,
          ...prev.pricingAndPromo.promoCodes.filter((p) => p.code !== cleanCode),
        ],
      },
    }));

    showToast(`Promo code ${cleanCode} created & activated live!`, "success");
    setNewPromoCode("");
    setNewPromoDesc("");
  };

  const handleTogglePromoCode = async (id: string) => {
    await saveControlSystemsState((prev) => ({
      ...prev,
      pricingAndPromo: {
        ...prev.pricingAndPromo,
        promoCodes: prev.pricingAndPromo.promoCodes.map((p) =>
          p.id === id ? { ...p, active: !p.active } : p
        ),
      },
    }));
    showToast("Promo code status updated.", "info");
  };

  const handleDeletePromoCode = async (id: string) => {
    await saveControlSystemsState((prev) => ({
      ...prev,
      pricingAndPromo: {
        ...prev.pricingAndPromo,
        promoCodes: prev.pricingAndPromo.promoCodes.filter((p) => p.id !== id),
      },
    }));
    showToast("Promo code deleted.", "info");
  };

  // ============================================================================
  // MODULE 4 STATES & HANDLERS: SELLER KYC & TRUST BADGES
  // ============================================================================
  const [kycEmail, setKycEmail] = useState("");
  const [kycName, setKycName] = useState("");
  const [kycPhone, setKycPhone] = useState("");
  const [kycCity, setKycCity] = useState("Mumbai, Maharashtra");
  const [kycTier, setKycTier] = useState<SellerTrustTier>("Verified Owner");
  const [kycDocRef, setKycDocRef] = useState("");
  const [kycNotes, setKycNotes] = useState("");

  // Discover unique sellers from user listings & parts so Admin can 1-click verify them
  const discoveredSellers = useMemo(() => {
    const map = new Map<string, { name: string; email: string; phone: string; city: string; count: number }>();
    userVehicles.forEach((v) => {
      const key = (v.sellerEmail || v.sellerName || "").toLowerCase().trim();
      if (!key) return;
      const existing = map.get(key);
      map.set(key, {
        name: v.sellerName || "Vehicle Seller",
        email: v.sellerEmail || "",
        phone: v.sellerPhone || "",
        city: v.location || "India",
        count: (existing?.count || 0) + 1,
      });
    });
    userParts.forEach((p) => {
      const key = (p.sellerEmail || p.sellerName || "").toLowerCase().trim();
      if (!key) return;
      const existing = map.get(key);
      map.set(key, {
        name: p.sellerName || "Hardware Seller",
        email: p.sellerEmail || "",
        phone: p.sellerPhone || "",
        city: p.location || "India",
        count: (existing?.count || 0) + 1,
      });
    });
    return Array.from(map.values());
  }, [userVehicles, userParts]);

  const handleAssignSellerBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycEmail.trim() && !kycName.trim()) {
      showToast("Please provide the Seller's Gmail or Dealership Name.", "error");
      return;
    }

    const record: SellerVerificationRecord = {
      id: `KYC-${Date.now()}`,
      sellerEmail: kycEmail.trim().toLowerCase(),
      sellerName: kycName.trim() || kycEmail.split("@")[0],
      sellerPhone: kycPhone.trim(),
      city: kycCity.trim(),
      badgeTier: kycTier,
      kycStatus: "Approved",
      rcOrGstNumber: kycDocRef.trim() || "RC / GST Verified",
      inspectionNotes: kycNotes.trim() || "Verified by Admin KYC Desk.",
      verifiedAt: new Date().toISOString(),
    };

    await saveControlSystemsState((prev) => {
      const filtered = prev.sellerVerifications.filter(
        (s) =>
          (record.sellerEmail && s.sellerEmail.toLowerCase() !== record.sellerEmail) ||
          (!record.sellerEmail && s.sellerName.toLowerCase() !== record.sellerName.toLowerCase())
      );
      return {
        ...prev,
        sellerVerifications: [record, ...filtered],
      };
    });

    showToast(
      `Assigned "${kycTier}" badge to ${record.sellerName}! All their vehicle & part listings now display this badge.`,
      "success"
    );
    setKycEmail("");
    setKycName("");
    setKycPhone("");
    setKycDocRef("");
    setKycNotes("");
  };

  const handleQuickUpdateSellerTier = async (id: string, nextTier: SellerTrustTier) => {
    await saveControlSystemsState((prev) => ({
      ...prev,
      sellerVerifications: prev.sellerVerifications.map((s) =>
        s.id === id
          ? {
              ...s,
              badgeTier: nextTier,
              kycStatus: nextTier === "Unverified" ? "Pending Review" : "Approved",
            }
          : s
      ),
    }));
    showToast(`Updated seller trust badge to ${nextTier}.`, "success");
  };

  // ============================================================================
  // MODULE 5 STATES & HANDLERS: CRM INQUIRIES, TEST DRIVES & CALLBACKS
  // ============================================================================
  const [crmStatusFilter, setCrmStatusFilter] = useState<string>("all");
  const [crmSearch, setCrmSearch] = useState<string>("");

  // Merge live test_drives and callback_requests with state.crmInquiries
  const unifiedCrmRows = useMemo(() => {
    if (!state) return [];
    const list: CrmInquiryRecord[] = [...state.crmInquiries];
    const seenRefs = new Set(list.map((i) => i.refCode));

    liveTestDrives.forEach((td) => {
      const ref = td.bookingRef || `TD-${td.id || "001"}`;
      if (!seenRefs.has(ref)) {
        seenRefs.add(ref);
        list.push({
          id: td.id || ref,
          refCode: ref,
          inquiryType: "Test Drive",
          customerName: td.fullName || "Valued Buyer",
          customerPhone: td.phone || "",
          customerEmail: td.buyerEmail || "",
          targetItemTitle: td.vehicleTitle || "Vehicle Road Test",
          targetItemPrice: td.vehiclePrice || 0,
          preferredSlot: `${td.preferredDate || ""} • ${td.timeSlot || ""}`,
          locationOrAddress: td.address || "Showroom Inspection",
          notes: td.notes || "",
          assignedAdvisor: "Afroj Alam (Lead Desk)",
          status:
            td.status === "completed"
              ? "Closed Deal"
              : td.status === "confirmed"
              ? "Contacted"
              : "Test Drive Scheduled",
          createdAt: td.createdAt || new Date().toISOString(),
        });
      }
    });

    liveCallbacks.forEach((cb) => {
      const ref = cb.callbackRef || `CB-${cb.id || "001"}`;
      if (!seenRefs.has(ref)) {
        seenRefs.add(ref);
        list.push({
          id: cb.id || ref,
          refCode: ref,
          inquiryType: "Callback Request",
          customerName: cb.fullName || "Interested Buyer",
          customerPhone: cb.phoneNumber || "",
          customerEmail: "",
          targetItemTitle: cb.partTitle || cb.vehicleTitle || cb.queryTopic || "General Inquiry",
          targetItemPrice: cb.partPrice || cb.vehiclePrice || 0,
          preferredSlot: cb.timeSlot || "ASAP",
          locationOrAddress: cb.queryTopic || "",
          notes: cb.note || "",
          assignedAdvisor: "Concierge Desk",
          status:
            cb.status === "resolved"
              ? "Closed Deal"
              : cb.status === "contacted"
              ? "Contacted"
              : "New",
          createdAt: cb.createdAt || new Date().toISOString(),
        });
      }
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state, liveTestDrives, liveCallbacks]);

  const handleUpdateCrmStatus = async (row: CrmInquiryRecord, nextStatus: CrmInquiryStatus) => {
    await saveControlSystemsState((prev) => {
      const exists = prev.crmInquiries.some((item) => item.refCode === row.refCode);
      const nextList = exists
        ? prev.crmInquiries.map((item) =>
            item.refCode === row.refCode ? { ...item, status: nextStatus } : item
          )
        : [{ ...row, status: nextStatus }, ...prev.crmInquiries];
      return {
        ...prev,
        crmInquiries: nextList,
      };
    });
    showToast(`Inquiry #${row.refCode} marked as "${nextStatus}".`, "success");
  };

  const buildWhatsAppReplyUrl = (
    row: CrmInquiryRecord,
    template: "confirm_slot" | "inspection_dossier" | "closing_offer"
  ) => {
    const cleanPhone = (row.customerPhone || "+919820011988").replace(/[^0-9]/g, "");
    let message = "";
    if (template === "confirm_slot") {
      message = `Hello ${row.customerName}, greetings from Auto World Concierge Desk! Your ${row.inquiryType} (#${row.refCode}) for *${row.targetItemTitle}* is confirmed for *${row.preferredSlot || "your requested window"}*. Our protocol advisor ${row.assignedAdvisor} will coordinate with you shortly.`;
    } else if (template === "inspection_dossier") {
      message = `Hello ${row.customerName}, regarding your inquiry (#${row.refCode}) on *${row.targetItemTitle}*: The 111-point mechanical inspection dossier and Vahan RC clearance are verified. Would you like us to share the high-res inspection sheet here on WhatsApp?`;
    } else {
      message = `Hello ${row.customerName}, following up from Auto World Executive Desk regarding *${row.targetItemTitle}* (#${row.refCode}). We have a time-sensitive direct handover offer ready for you. Let us know a convenient time for a quick call.`;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // ============================================================================
  // MODULE 6 STATES & HANDLERS: FRAUD GUARD & USER BLACKLIST
  // ============================================================================
  const [blacklistType, setBlacklistType] = useState<"gmail" | "phone">("gmail");
  const [blacklistValue, setBlacklistValue] = useState("");
  const [blacklistReason, setBlacklistReason] = useState("");
  const [blacklistStatus, setBlacklistStatus] = useState<"Banned" | "Suspended">("Banned");

  const handleToggleFreezeListing = async (report: ListingReportRecord) => {
    if (!state) return;
    const isFrozen = state.fraudGuard.frozenListingKeys.includes(report.listingKey);
    const nextFrozen = isFrozen
      ? state.fraudGuard.frozenListingKeys.filter((k) => k !== report.listingKey)
      : [...state.fraudGuard.frozenListingKeys, report.listingKey];

    await saveControlSystemsState((prev) => ({
      ...prev,
      fraudGuard: {
        ...prev.fraudGuard,
        frozenListingKeys: nextFrozen,
        reports: prev.fraudGuard.reports.map((r) =>
          r.id === report.id ? { ...r, status: isFrozen ? "Open" : "Frozen" } : r
        ),
      },
    }));

    showToast(
      isFrozen
        ? `Unfroze listing "${report.itemTitle}". It is visible again in Buy catalog.`
        : `FROZEN listing "${report.itemTitle}"! Hidden from public Buy catalog pending investigation.`,
      isFrozen ? "info" : "error"
    );
  };

  const handleRequestProofOfOwnership = async (report: ListingReportRecord) => {
    await saveControlSystemsState((prev) => {
      const nextRcKeys = prev.fraudGuard.rcRequestedListingKeys.includes(report.listingKey)
        ? prev.fraudGuard.rcRequestedListingKeys
        : [...prev.fraudGuard.rcRequestedListingKeys, report.listingKey];
      return {
        ...prev,
        fraudGuard: {
          ...prev.fraudGuard,
          rcRequestedListingKeys: nextRcKeys,
          reports: prev.fraudGuard.reports.map((r) =>
            r.id === report.id
              ? {
                  ...r,
                  status: "RC/VIN Requested",
                  ownershipProofRequested: true,
                }
              : r
          ),
        },
      };
    });
    showToast(
      `Ownership Proof (RC / Chassis VIN) demand issued for "${report.itemTitle}".`,
      "info"
    );
  };

  const handleAddBlacklistEntry = async (
    targetType: "gmail" | "phone",
    rawValue: string,
    reason: string,
    status: "Banned" | "Suspended" = "Banned"
  ) => {
    const clean =
      targetType === "gmail" ? rawValue.trim().toLowerCase() : rawValue.replace(/[^0-9+]/g, "");
    if (!clean) {
      showToast("Please provide a valid Gmail address or phone number to blacklist.", "error");
      return;
    }

    const entry: BlacklistEntry = {
      id: `BLK-${Date.now()}`,
      targetType,
      value: clean,
      displayValue: rawValue.trim(),
      reason: reason.trim() || "Flagged by Admin Fraud Guard Desk",
      status,
      addedBy: currentUser?.email || "Admin",
      createdAt: new Date().toISOString(),
    };

    await saveControlSystemsState((prev) => ({
      ...prev,
      fraudGuard: {
        ...prev.fraudGuard,
        blacklist: [
          entry,
          ...prev.fraudGuard.blacklist.filter((b) => b.value.toLowerCase() !== clean.toLowerCase()),
        ],
      },
    }));

    showToast(
      `${status} ${targetType.toUpperCase()} (${rawValue.trim()}) from posting listings on Auto World.`,
      "error"
    );
    setBlacklistValue("");
    setBlacklistReason("");
  };

  const handleRemoveBlacklistEntry = async (id: string) => {
    await saveControlSystemsState((prev) => ({
      ...prev,
      fraudGuard: {
        ...prev.fraudGuard,
        blacklist: prev.fraudGuard.blacklist.filter((b) => b.id !== id),
      },
    }));
    showToast("Removed account from blacklist.", "info");
  };

  if (!state) return null;

  const sortedSections = [...state.homepageLayout.sections].sort((a, b) => a.order - b.order);
  const filteredDeals = state.dealsLedger.filter((d) => {
    const q = ledgerSearch.toLowerCase();
    return (
      !q ||
      d.buyerGmail.toLowerCase().includes(q) ||
      d.buyerName.toLowerCase().includes(q) ||
      d.itemTitle.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q)
    );
  });

  const filteredCrm = unifiedCrmRows.filter((row) => {
    const matchesStatus = crmStatusFilter === "all" || row.status === crmStatusFilter;
    const q = crmSearch.toLowerCase();
    const matchesQuery =
      !q ||
      row.customerName.toLowerCase().includes(q) ||
      row.customerPhone.toLowerCase().includes(q) ||
      row.targetItemTitle.toLowerCase().includes(q) ||
      row.refCode.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6 font-sans text-stone-900">
      {/* TOP MODULE SWITCHER BAR */}
      <div className="bg-stone-950 text-[#F4F1EA] p-5 border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-amber-400 block">
              Executive Operations & Live Platform Governance
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-tight text-white mt-0.5">
              Integrated Admin Command Systems
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Every action below updates Firestore and synchronizes live across Home, Buy, Sell, Premium, and Verified Testimonials.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase">
            <span className="px-2.5 py-1 bg-stone-900 border border-stone-700 text-amber-300 font-bold tabular-nums">
              {state.dealsLedger.length} Verified Handovers
            </span>
            <span className="px-2.5 py-1 bg-stone-900 border border-stone-700 text-emerald-300 font-bold tabular-nums">
              {state.pricingAndPromo.promoCodes.filter((p) => p.active).length} Active Promo Codes
            </span>
            <span className="px-2.5 py-1 bg-stone-900 border border-stone-700 text-red-300 font-bold tabular-nums">
              {state.fraudGuard.reports.filter((r) => r.status !== "Resolved" && r.status !== "Dismissed").length} Open Fraud Reports
            </span>
          </div>
        </div>

        {/* 6 SYSTEM TABS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 pt-4">
          {[
            {
              id: "handover" as ControlSystemModuleId,
              label: "1. Deal & Buyer Gmail Ledger",
              sub: `${state.dealsLedger.length} Sold Logs`,
              icon: FileCheck,
            },
            {
              id: "homepage" as ControlSystemModuleId,
              label: "2. Homepage Layout & Stats",
              sub: `${state.homepageLayout.sections.filter((s) => s.visible).length}/7 Visible`,
              icon: Layout,
            },
            {
              id: "pricing" as ControlSystemModuleId,
              label: "3. Pricing, Promos & Flash Sale",
              sub: `Pass: ₹${state.pricingAndPromo.buyerPassPrice}`,
              icon: Percent,
            },
            {
              id: "kyc" as ControlSystemModuleId,
              label: "4. Seller KYC & Trust Badges",
              sub: `${state.sellerVerifications.length} Verified`,
              icon: UserCheck,
            },
            {
              id: "crm" as ControlSystemModuleId,
              label: "5. Test Drive & Callback CRM",
              sub: `${unifiedCrmRows.length} Active Leads`,
              icon: PhoneCall,
            },
            {
              id: "fraud" as ControlSystemModuleId,
              label: "6. Fraud Guard & Blacklist",
              sub: `${state.fraudGuard.blacklist.length} Banned`,
              icon: AlertTriangle,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeModule === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveModule(tab.id)}
                className={`p-3 text-left border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isActive
                    ? "bg-amber-500 text-stone-950 border-amber-300 font-black shadow-sm"
                    : "bg-stone-900/90 text-stone-300 border-stone-800 hover:border-stone-600 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-stone-950" : "text-amber-400"}`} />
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 tabular-nums ${
                      isActive ? "bg-stone-950 text-amber-400" : "bg-stone-800 text-stone-400"
                    }`}
                  >
                    {tab.sub}
                  </span>
                </div>
                <span className="text-[11px] uppercase tracking-wider font-extrabold leading-tight">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==========================================================================
          MODULE 1: VERIFIED DEAL & HANDOVER LEDGER (ASSIGN BUYER GMAIL)
      ========================================================================== */}
      {activeModule === "handover" && (
        <div className="space-y-6">
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-5">
            <div className="border-b border-stone-300 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-bold block">
                  Official Ownership Transfer & Buyer Gmail Verification
                </span>
                <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                  Mark Vehicle / Part as Sold & Assign Buyer Gmail
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Assigning a Buyer's Gmail here immediately creates an official purchase log on their Gmail so they unlock the Verified Testimonial submission form, warranty coverage, and VIP perks.
                </p>
              </div>
              <span className="px-3 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase tracking-wider shrink-0">
                ✓ Instant Testimonial Eligibility Sync
              </span>
            </div>

            <form onSubmit={handleCreateHandoverRecord} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Item Category */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Asset Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHandoverItemType("vehicle");
                        setSelectedCatalogId("");
                      }}
                      className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-1.5 cursor-pointer ${
                        handoverItemType === "vehicle"
                          ? "bg-stone-950 text-white border-stone-950"
                          : "bg-white text-stone-700 border-stone-300"
                      }`}
                    >
                      <Car className="w-3.5 h-3.5 text-amber-400" />
                      <span>Vehicle</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHandoverItemType("part");
                        setSelectedCatalogId("");
                      }}
                      className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-1.5 cursor-pointer ${
                        handoverItemType === "part"
                          ? "bg-stone-950 text-white border-stone-950"
                          : "bg-white text-stone-700 border-stone-300"
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      <span>Motorsport Part</span>
                    </button>
                  </div>
                </div>

                {/* Select from Catalog */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Select Inventory Item to Mark Sold (Or Enter Custom Below)
                  </label>
                  <select
                    value={selectedCatalogId}
                    onChange={(e) => handleSelectCatalogItem(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-semibold text-stone-950 focus:outline-none focus:border-stone-950 cursor-pointer"
                  >
                    <option value="">-- Choose from {catalogOptions.length} Catalog Items --</option>
                    {catalogOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        [ID #{opt.id}] {opt.title} — ₹{opt.price.toLocaleString("en-IN")} ({opt.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Sold Vehicle / Part Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2023 Porsche 911 GT3 Touring"
                    value={customItemTitle}
                    onChange={(e) => setCustomItemTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-semibold text-stone-950"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                    Buyer's Gmail Address (Required for Verification) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. buyername@gmail.com"
                    value={buyerGmailInput}
                    onChange={(e) => setBuyerGmailInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-emerald-50/60 border-2 border-emerald-600 text-xs font-mono font-bold text-stone-950"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Buyer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aditya Singhania"
                    value={buyerNameInput}
                    onChange={(e) => setBuyerNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-semibold text-stone-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Final Sale Price (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 14500000"
                    value={finalPriceInput}
                    onChange={(e) => setFinalPriceInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-mono font-bold text-stone-950 tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Handover Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={handoverDateInput}
                    onChange={(e) => setHandoverDateInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-mono font-bold text-stone-950"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Warranty Coverage Tier
                  </label>
                  <select
                    value={warrantyTierInput}
                    onChange={(e) => setWarrantyTierInput(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-semibold text-stone-950 cursor-pointer"
                  >
                    <option value="None">None (As-Is Handover)</option>
                    <option value="6-Month Powertrain">6-Month Powertrain</option>
                    <option value="12-Month Comprehensive">12-Month Comprehensive</option>
                    <option value="24-Month Concierge VIP">24-Month Concierge VIP</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Seller Gmail (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="seller@gmail.com"
                    value={sellerGmailInput}
                    onChange={(e) => setSellerGmailInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-mono text-stone-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Handover Inspection & RTO Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Form 29/30 signed, Vahan hypothecation cleared, 2 keys handed over..."
                    value={handoverNotesInput}
                    onChange={(e) => setHandoverNotesInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs text-stone-950"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-stone-950 hover:bg-stone-800 text-amber-400 font-mono font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Record Sale & Verify Buyer Gmail</span>
                </button>
              </div>
            </form>
          </div>

          {/* HANDOVER LEDGER TABLE */}
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-300">
              <div>
                <h4 className="text-sm font-serif font-black uppercase text-stone-950">
                  Official Verified Buyer & Handover Ledger ({filteredDeals.length})
                </h4>
                <p className="text-[11px] text-stone-500">
                  Any user signing in with a Buyer or Seller Gmail listed below is automatically authenticated to post Verified Testimonials.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Gmail, buyer, or vehicle..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 text-xs text-stone-950"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-stone-900 text-[10px] font-mono uppercase tracking-wider text-stone-600 bg-stone-100">
                    <th className="py-2.5 px-3">Deal Ref & Date</th>
                    <th className="py-2.5 px-3">Sold Vehicle / Part</th>
                    <th className="py-2.5 px-3">Verified Buyer Gmail</th>
                    <th className="py-2.5 px-3 text-right">Final Price</th>
                    <th className="py-2.5 px-3">Warranty & Perks</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-xs">
                  {filteredDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-stone-100/70 transition">
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        <span className="font-bold text-stone-950 block">{deal.id}</span>
                        <span className="text-[10px] text-stone-500 tabular-nums">{deal.handoverDate}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-stone-900 text-amber-300">
                            {deal.itemType}
                          </span>
                          <span className="font-serif font-bold text-stone-950">{deal.itemTitle}</span>
                        </div>
                        {deal.notes && (
                          <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">{deal.notes}</p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 inline-block">
                          {deal.buyerGmail}
                        </span>
                        <span className="block text-[11px] font-semibold text-stone-700 mt-0.5">
                          {deal.buyerName} {deal.location ? `• ${deal.location}` : ""}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-stone-950 tabular-nums whitespace-nowrap">
                        ₹{deal.finalSalePrice.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold uppercase block w-fit">
                          {deal.warrantyTier}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteHandoverRecord(deal.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 transition cursor-pointer"
                          title="Delete Handover Log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODULE 2: HOMEPAGE LAYOUT, SECTION VISIBILITY & BANNER CONTROL DESK
      ========================================================================== */}
      {activeModule === "homepage" && (
        <div className="space-y-6">
          {/* Section Reordering & Visibility */}
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="border-b border-stone-300 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold block">
                  Live DOM Sequence & Visibility Controller
                </span>
                <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                  Homepage Section Order & Visibility
                </h3>
                <p className="text-xs text-stone-600">
                  Toggle visibility or reorder any section on the Home page. Changes apply immediately for all visitors.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {sortedSections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className={`p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    sec.visible
                      ? "bg-white border-stone-300"
                      : "bg-stone-100 border-stone-200 opacity-70"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-8 h-8 bg-stone-950 text-amber-400 font-mono font-black text-xs flex items-center justify-center shrink-0 tabular-nums">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-serif font-black uppercase text-stone-950">
                          {sec.label}
                        </h4>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${
                            sec.visible
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-stone-200 text-stone-600"
                          }`}
                        >
                          {sec.visible ? "VISIBLE ON HOME" : "HIDDEN"}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{sec.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveHomepageSection(idx, "up")}
                      className="p-2 border border-stone-300 bg-[#FAF8F5] hover:bg-stone-900 hover:text-white disabled:opacity-30 cursor-pointer transition"
                      title="Move Section Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sortedSections.length - 1}
                      onClick={() => handleMoveHomepageSection(idx, "down")}
                      className="p-2 border border-stone-300 bg-[#FAF8F5] hover:bg-stone-900 hover:text-white disabled:opacity-30 cursor-pointer transition"
                      title="Move Section Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleHomepageSection(sec.id)}
                      className={`px-3.5 py-2 text-[10px] font-mono font-black uppercase tracking-wider cursor-pointer border transition flex items-center gap-1.5 ${
                        sec.visible
                          ? "bg-stone-900 text-white border-stone-950 hover:bg-stone-800"
                          : "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-500"
                      }`}
                    >
                      {sec.visible ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide Section</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show Section</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Statistics Bar Editor */}
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="border-b border-stone-300 pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold block">
                Homepage Counter Bar Metrics
              </span>
              <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                Live-Edit Statistics Bar Numbers & Labels
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {state.homepageLayout.stats.map((st, idx) => (
                <div key={st.id} className="p-4 bg-stone-950 text-white border border-stone-800 space-y-3">
                  <span className="text-[9px] font-mono uppercase text-amber-400 font-bold block">
                    COUNTER SLOT #0{idx + 1}
                  </span>
                  <div>
                    <label className="text-[9px] font-mono uppercase text-stone-400 block mb-1">
                      Metric Figure (e.g. 10k+)
                    </label>
                    <input
                      type="text"
                      value={st.value}
                      onChange={(e) => handleUpdateStatItem(st.id, "value", e.target.value)}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 text-lg font-serif font-bold text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono uppercase text-stone-400 block mb-1">
                      Counter Label
                    </label>
                    <input
                      type="text"
                      value={st.label}
                      onChange={(e) => handleUpdateStatItem(st.id, "label", e.target.value)}
                      className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 text-xs font-mono uppercase text-stone-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODULE 3: DYNAMIC PRICING, PROMO CODES & FLASH SALE CONTROLLER
      ========================================================================== */}
      {activeModule === "pricing" && (
        <div className="space-y-6">
          {/* Dynamic Tier Pricing & Global Flash Sale */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Base Prices Controller */}
            <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="border-b border-stone-300 pb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold block">
                  Live Gateway Tariff Configuration
                </span>
                <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                  Buyer Pass & Premium Membership Pricing
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                    Buyer Pass Price (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={state.pricingAndPromo.buyerPassPrice}
                    onChange={(e) =>
                      saveControlSystemsState((prev) => ({
                        ...prev,
                        pricingAndPromo: {
                          ...prev.pricingAndPromo,
                          buyerPassPrice: Math.max(0, Number(e.target.value) || 0),
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-sm font-mono font-black text-stone-950 tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                    Pro Plan Monthly (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={state.pricingAndPromo.proMonthlyPrice}
                    onChange={(e) =>
                      saveControlSystemsState((prev) => ({
                        ...prev,
                        pricingAndPromo: {
                          ...prev.pricingAndPromo,
                          proMonthlyPrice: Math.max(0, Number(e.target.value) || 0),
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-sm font-mono font-black text-stone-950 tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                    Pro Plan Yearly (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={state.pricingAndPromo.proYearlyPrice}
                    onChange={(e) =>
                      saveControlSystemsState((prev) => ({
                        ...prev,
                        pricingAndPromo: {
                          ...prev.pricingAndPromo,
                          proYearlyPrice: Math.max(0, Number(e.target.value) || 0),
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-sm font-mono font-black text-stone-950 tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                    Business / Dealership Monthly (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={state.pricingAndPromo.businessMonthlyPrice}
                    onChange={(e) =>
                      saveControlSystemsState((prev) => ({
                        ...prev,
                        pricingAndPromo: {
                          ...prev.pricingAndPromo,
                          businessMonthlyPrice: Math.max(0, Number(e.target.value) || 0),
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-sm font-mono font-black text-stone-950 tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Global / Category Flash Sale Controller */}
            <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold block">
                    Catalog-Wide Promotional Stamp
                  </span>
                  <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                    Flash Sale & Festive Offer Badge Controller
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !state.pricingAndPromo.flashSaleEnabled;
                    saveControlSystemsState((prev) => ({
                      ...prev,
                      pricingAndPromo: {
                        ...prev.pricingAndPromo,
                        flashSaleEnabled: nextVal,
                      },
                    }));
                    showToast(
                      nextVal ? "Flash Sale Badges ENABLED across Buy catalog!" : "Flash Sale Badges PAUSED.",
                      "success"
                    );
                  }}
                  className={`px-3.5 py-2 text-[10px] font-mono font-black uppercase tracking-wider cursor-pointer border ${
                    state.pricingAndPromo.flashSaleEnabled
                      ? "bg-amber-500 text-stone-950 border-amber-600"
                      : "bg-stone-800 text-stone-300 border-stone-700"
                  }`}
                >
                  {state.pricingAndPromo.flashSaleEnabled ? "● FLASH SALE ACTIVE" : "○ PAUSED"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                    Flash Sale Badge Text
                  </label>
                  <input
                    type="text"
                    value={state.pricingAndPromo.flashSaleBadgeText}
                    onChange={(e) =>
                      saveControlSystemsState((prev) => ({
                        ...prev,
                        pricingAndPromo: {
                          ...prev.pricingAndPromo,
                          flashSaleBadgeText: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-mono font-bold text-stone-950"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                    Target Vehicle / Part Category
                  </label>
                  <select
                    value={state.pricingAndPromo.flashSaleTargetCategory}
                    onChange={(e) =>
                      saveControlSystemsState((prev) => ({
                        ...prev,
                        pricingAndPromo: {
                          ...prev.pricingAndPromo,
                          flashSaleTargetCategory: e.target.value as any,
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-semibold text-stone-950 cursor-pointer"
                  >
                    <option value="all">All Vehicles & Parts</option>
                    <option value="car">Sedans & Coupes Only</option>
                    <option value="suv">Luxury SUVs Only</option>
                    <option value="motorcycle">Superbikes Only</option>
                    <option value="parts">Motorsport Parts Only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Promo Code Generator & Ledger */}
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-5">
            <div className="border-b border-stone-300 pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-bold block">
                Discount & Waiver Code Engine
              </span>
              <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                Create & Manage Promo Codes (Buyer Pass & Premium Plans)
              </h3>
            </div>

            <form onSubmit={handleCreatePromoCode} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Code (e.g. FESTIVAL50)
                </label>
                <input
                  type="text"
                  required
                  placeholder="FESTIVAL50"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-mono font-black uppercase text-stone-950"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Discount Type
                </label>
                <select
                  value={newPromoType}
                  onChange={(e) => setNewPromoType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-semibold text-stone-950 cursor-pointer"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Discount Value
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newPromoValue}
                  onChange={(e) => setNewPromoValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-mono font-bold text-stone-950 tabular-nums"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Applies To
                </label>
                <select
                  value={newPromoApplies}
                  onChange={(e) => setNewPromoApplies(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-semibold text-stone-950 cursor-pointer"
                >
                  <option value="all">Both Pass & Premium</option>
                  <option value="buyer_pass">₹1 Buyer Pass Only</option>
                  <option value="premium">Premium Plans Only</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Festive Special"
                  value={newPromoDesc}
                  onChange={(e) => setNewPromoDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 text-xs text-stone-950"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-4 bg-stone-950 hover:bg-stone-800 text-amber-400 text-xs font-mono font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Code</span>
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {state.pricingAndPromo.promoCodes.map((promo) => (
                <div
                  key={promo.id}
                  className={`p-4 border flex flex-col justify-between gap-3 ${
                    promo.active ? "bg-white border-stone-300" : "bg-stone-100 border-stone-200 opacity-65"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 bg-stone-950 text-amber-400 font-mono font-black text-xs tracking-wider">
                        {promo.code}
                      </span>
                      <span className="text-xs font-mono font-black text-emerald-700 tabular-nums">
                        {promo.discountType === "percent"
                          ? `${promo.discountValue}% OFF`
                          : `₹${promo.discountValue} OFF`}
                      </span>
                    </div>
                    <p className="text-xs text-stone-700 font-semibold mt-2">{promo.description}</p>
                    <p className="text-[10px] font-mono text-stone-500 mt-1 uppercase tabular-nums">
                      Target: {promo.appliesTo} • Redeemed: {promo.usageCount}/{promo.maxUses}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => handleTogglePromoCode(promo.id)}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase cursor-pointer border ${
                        promo.active
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-stone-200 text-stone-700 border-stone-300"
                      }`}
                    >
                      {promo.active ? "● Active" : "○ Paused"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePromoCode(promo.id)}
                      className="text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODULE 4: SELLER KYC, DEALERSHIP BADGE & TRUST VERIFICATION DESK
      ========================================================================== */}
      {activeModule === "kyc" && (
        <div className="space-y-6">
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-5">
            <div className="border-b border-stone-300 pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold block">
                Seller Accreditation & Dealership Seal Registry
              </span>
              <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                Assign Official Seller Trust Badge (Auto-Displays on All Listings)
              </h3>
            </div>

            {discoveredSellers.length > 0 && (
              <div className="p-3 bg-stone-100 border border-stone-300 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-stone-600 block">
                  Quick-Select Active Sellers from Current Listings:
                </span>
                <div className="flex flex-wrap gap-2">
                  {discoveredSellers.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setKycName(s.name);
                        setKycEmail(s.email);
                        setKycPhone(s.phone);
                        setKycCity(s.city);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-stone-950 hover:text-white border border-stone-300 text-[11px] font-mono cursor-pointer transition"
                    >
                      {s.name} ({s.email || s.phone || "Seller"}) • {s.count} listing(s)
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAssignSellerBadge} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Seller / Dealership Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bavaria Motors Mumbai"
                  value={kycName}
                  onChange={(e) => setKycName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-semibold text-stone-950"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Seller Gmail / Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="seller@gmail.com"
                  value={kycEmail}
                  onChange={(e) => setKycEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-mono text-stone-950"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Official Trust Badge Tier
                </label>
                <select
                  value={kycTier}
                  onChange={(e) => setKycTier(e.target.value as SellerTrustTier)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-bold text-stone-950 cursor-pointer"
                >
                  <option value="Verified Owner">Verified Owner</option>
                  <option value="Certified Dealership">Certified Dealership</option>
                  <option value="Gold Collector">Gold Collector</option>
                  <option value="Unverified">Unverified</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  GSTIN / Vahan RC Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. 27AABCA9921K1Z5 or MH-01-AB-1234"
                  value={kycDocRef}
                  onChange={(e) => setKycDocRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs font-mono text-stone-950"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Verification Notes
                </label>
                <input
                  type="text"
                  placeholder="Physical showroom & RC verified"
                  value={kycNotes}
                  onChange={(e) => setKycNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 text-xs text-stone-950"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-stone-950 hover:bg-stone-800 text-amber-400 font-mono font-black text-xs uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Certify Seller & Apply Badge</span>
                </button>
              </div>
            </form>

            {/* Verified Sellers Table */}
            <div className="overflow-x-auto pt-3">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-stone-900 text-[10px] font-mono uppercase tracking-wider text-stone-600 bg-stone-100">
                    <th className="py-2.5 px-3">Seller / Dealership</th>
                    <th className="py-2.5 px-3">Gmail Account</th>
                    <th className="py-2.5 px-3">RC / GST Document</th>
                    <th className="py-2.5 px-3">Assigned Trust Badge</th>
                    <th className="py-2.5 px-3 text-right">Switch Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-xs">
                  {state.sellerVerifications.map((seller) => (
                    <tr key={seller.id} className="hover:bg-stone-100/70">
                      <td className="py-3 px-3 font-serif font-bold text-stone-950">
                        {seller.sellerName}
                        <span className="block text-[10px] font-sans font-normal text-stone-500">
                          {seller.inspectionNotes}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-800">{seller.sellerEmail}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-stone-600">
                        {seller.rcOrGstNumber || "Verified"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1 border ${
                            seller.badgeTier === "Gold Collector"
                              ? "bg-amber-950 text-amber-300 border-amber-500"
                              : seller.badgeTier === "Certified Dealership"
                              ? "bg-blue-950 text-blue-300 border-blue-500"
                              : seller.badgeTier === "Verified Owner"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                              : "bg-stone-200 text-stone-600 border-stone-300"
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {seller.badgeTier}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <select
                          value={seller.badgeTier}
                          onChange={(e) =>
                            handleQuickUpdateSellerTier(seller.id, e.target.value as SellerTrustTier)
                          }
                          className="px-2.5 py-1 bg-white border border-stone-300 text-[11px] font-mono font-bold text-stone-900 cursor-pointer"
                        >
                          <option value="Verified Owner">Verified Owner</option>
                          <option value="Certified Dealership">Certified Dealership</option>
                          <option value="Gold Collector">Gold Collector</option>
                          <option value="Unverified">Unverified</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODULE 5: TEST DRIVE, CALLBACK & BUYER INQUIRY ASSIGNMENT DESK (CRM)
      ========================================================================== */}
      {activeModule === "crm" && (
        <div className="space-y-6">
          {/* LIVE PRICE NEGOTIATION & TRADE-IN UPGRADE OFFERS DESK */}
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-300 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold block">
                  Live Price Negotiation &amp; Trade-In Upgrade Ledger
                </span>
                <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                  Make an Offer / Counter-Offer Desk ({(state.negotiationOffers || []).length})
                </h3>
                <p className="text-xs text-stone-600">
                  Review binding buyer offers and attached trade-in valuations. Accept, counter-offer, or convert agreed deals into Verified Handover Certificates in 1 click.
                </p>
              </div>
            </div>

            {(state.negotiationOffers || []).length === 0 ? (
              <div className="p-6 text-center bg-stone-100 border border-stone-300 text-xs font-mono text-stone-500 uppercase">
                No binding price offers submitted yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(state.negotiationOffers || []).map((offer: NegotiationOfferRecord) => {
                  const discountPct =
                    offer.listedPrice > 0
                      ? (((offer.listedPrice - offer.buyerOfferPrice) / offer.listedPrice) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <div
                      key={offer.id}
                      className="p-4 bg-white border-2 border-stone-900 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2 border-b border-stone-200 pb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 bg-stone-900 text-amber-400">
                                {offer.id}
                              </span>
                              <span className="text-[10px] font-mono font-bold uppercase text-stone-500">
                                {offer.paymentMode}
                              </span>
                            </div>
                            <h4 className="font-serif font-black text-sm text-stone-950 mt-1">
                              {offer.itemTitle}
                            </h4>
                            <p className="text-[11px] font-mono text-stone-600">
                              Buyer: <strong>{offer.buyerName}</strong> ({offer.buyerEmail}) · {offer.buyerPhone}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase border ${
                              offer.status === "Accepted"
                                ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                                : offer.status === "Countered"
                                ? "bg-amber-100 text-amber-900 border-amber-400"
                                : offer.status === "Rejected"
                                ? "bg-red-100 text-red-900 border-red-300"
                                : "bg-stone-100 text-stone-800 border-stone-300"
                            }`}
                          >
                            {offer.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#F4F1EA] border border-stone-300 text-xs">
                          <div>
                            <span className="text-[9px] font-mono uppercase text-stone-500 block">
                              Listed Price
                            </span>
                            <span className="font-mono font-bold text-stone-800 tabular-nums">
                              ₹{offer.listedPrice.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono uppercase text-stone-500 block">
                              Buyer Offer (-{discountPct}%)
                            </span>
                            <span className="font-serif font-black text-stone-950 tabular-nums">
                              ₹{offer.buyerOfferPrice.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono uppercase text-stone-500 block">
                              Counter / Agreed
                            </span>
                            <span className="font-serif font-black text-amber-800 tabular-nums">
                              {offer.counterOfferPrice
                                ? `₹${offer.counterOfferPrice.toLocaleString("en-IN")}`
                                : offer.status === "Accepted"
                                ? `₹${offer.buyerOfferPrice.toLocaleString("en-IN")}`
                                : "—"}
                            </span>
                          </div>
                        </div>

                        {offer.tradeInSummary && (
                          <div className="p-2.5 bg-amber-50 border border-amber-300 text-[11px] flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-amber-950">
                              <strong>Trade-In Attached:</strong> {offer.tradeInSummary}
                            </span>
                            <span className="font-mono font-black text-emerald-800">
                              Valued: ₹{(offer.tradeInEstimatedValue || 0).toLocaleString("en-IN")} · Net Payable: ₹
                              {(offer.netPayableAfterTradeIn || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}

                        {offer.buyerNotes && (
                          <p className="text-[11px] text-stone-600 italic">“{offer.buyerNotes}”</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await respondToNegotiationOffer(
                                offer.id,
                                "Accepted",
                                undefined,
                                "Offer officially accepted by Auto World Deal Desk."
                              );
                              showToast(`Accepted Offer ${offer.id}!`, "success");
                            }}
                            className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-mono font-bold uppercase cursor-pointer"
                          >
                            Accept Offer
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const suggestedCounter =
                                Math.round((offer.listedPrice + offer.buyerOfferPrice) / 2 / 5000) * 5000;
                              await respondToNegotiationOffer(
                                offer.id,
                                "Countered",
                                suggestedCounter,
                                `Official Counter-Offer at midpoint ₹${suggestedCounter.toLocaleString("en-IN")}.`
                              );
                              showToast(
                                `Sent midpoint Counter-Offer of ₹${suggestedCounter.toLocaleString("en-IN")}!`,
                                "info"
                              );
                            }}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-[10px] font-mono font-black uppercase cursor-pointer"
                          >
                            Send Midpoint Counter
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await respondToNegotiationOffer(
                                offer.id,
                                "Rejected",
                                undefined,
                                "Offer declined by Deal Desk."
                              );
                              showToast(`Declined Offer ${offer.id}`, "info");
                            }}
                            className="px-2.5 py-1.5 bg-stone-200 hover:bg-red-100 text-stone-700 hover:text-red-800 text-[10px] font-mono font-bold uppercase cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const agreedPrice = offer.counterOfferPrice || offer.buyerOfferPrice;
                            setHandoverItemType(offer.itemType);
                            setSelectedCatalogId(String(offer.itemId));
                            setCustomItemTitle(offer.itemTitle);
                            setBuyerGmailInput(offer.buyerEmail);
                            setBuyerNameInput(offer.buyerName);
                            setBuyerPhoneInput(offer.buyerPhone);
                            setFinalPriceInput(String(agreedPrice));
                            setHandoverNotesInput(
                              `Converted from Binding Offer ${offer.id} (${offer.paymentMode})${
                                offer.tradeInSummary
                                  ? ` | Includes Trade-In: ${offer.tradeInSummary} valued at ₹${(
                                      offer.tradeInEstimatedValue || 0
                                    ).toLocaleString("en-IN")}`
                                  : ""
                              }`
                            );
                            setActiveModule("handover");
                            showToast(
                              "Pre-filled Verified Handover Ledger with this offer's buyer & agreed price!",
                              "success"
                            );
                          }}
                          className="px-2.5 py-1.5 bg-stone-950 hover:bg-stone-800 text-amber-400 text-[10px] font-mono font-bold uppercase cursor-pointer flex items-center gap-1"
                        >
                          <Award className="w-3 h-3" />
                          Pre-Fill Handover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-300 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-bold block">
                  Centralized Concierge Dispatch CRM
                </span>
                <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                  Test Drives, Callback Requests & Direct Buyer Inquiries ({filteredCrm.length})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["all", "New", "Contacted", "Test Drive Scheduled", "Closed Deal"] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setCrmStatusFilter(st)}
                      className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase border cursor-pointer ${
                        crmStatusFilter === st
                          ? "bg-stone-950 text-amber-400 border-stone-950"
                          : "bg-white text-stone-700 border-stone-300"
                      }`}
                    >
                      {st === "all" ? "All Leads" : st}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-stone-900 text-[10px] font-mono uppercase tracking-wider text-stone-600 bg-stone-100">
                    <th className="py-2.5 px-3">Ref & Type</th>
                    <th className="py-2.5 px-3">Customer & Phone</th>
                    <th className="py-2.5 px-3">Target Vehicle / Part</th>
                    <th className="py-2.5 px-3">Slot & Location</th>
                    <th className="py-2.5 px-3">Pipeline Status</th>
                    <th className="py-2.5 px-3 text-right">1-Click WhatsApp Reply Templates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-xs">
                  {filteredCrm.map((row) => (
                    <tr key={row.id} className="hover:bg-stone-100/70">
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        <span className="font-bold text-stone-950 block">{row.refCode}</span>
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-bold uppercase inline-block mt-0.5 ${
                            row.inquiryType === "Test Drive"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-blue-100 text-blue-900"
                          }`}
                        >
                          {row.inquiryType}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-stone-950 block">{row.customerName}</span>
                        <span className="font-mono text-[11px] text-stone-600 tabular-nums">
                          {row.customerPhone}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-serif font-bold text-stone-950 block">
                          {row.targetItemTitle}
                        </span>
                        {row.targetItemPrice ? (
                          <span className="font-mono text-[10px] text-stone-500 tabular-nums">
                            ₹{row.targetItemPrice.toLocaleString("en-IN")}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-stone-700">
                        <span className="font-semibold block">{row.preferredSlot || "Flexible"}</span>
                        <span className="text-stone-500 text-[10px]">{row.locationOrAddress}</span>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={row.status}
                          onChange={(e) =>
                            handleUpdateCrmStatus(row, e.target.value as CrmInquiryStatus)
                          }
                          className={`px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase border cursor-pointer ${
                            row.status === "Closed Deal"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                              : row.status === "Test Drive Scheduled"
                              ? "bg-amber-100 text-amber-900 border-amber-400"
                              : row.status === "Contacted"
                              ? "bg-blue-100 text-blue-900 border-blue-300"
                              : "bg-stone-900 text-white border-stone-950"
                          }`}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Test Drive Scheduled">Test Drive Scheduled</option>
                          <option value="Closed Deal">Closed Deal</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={buildWhatsAppReplyUrl(row, "confirm_slot")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase"
                            title="Send WhatsApp Slot Confirmation"
                          >
                            WA: Confirm Slot
                          </a>
                          <a
                            href={buildWhatsAppReplyUrl(row, "inspection_dossier")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 text-[10px] font-mono font-bold uppercase"
                            title="Send WhatsApp Inspection Dossier"
                          >
                            WA: Dossier
                          </a>
                          <a
                            href={buildWhatsAppReplyUrl(row, "closing_offer")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 text-[10px] font-mono font-bold uppercase"
                            title="Send WhatsApp Final Handover Offer"
                          >
                            WA: Offer
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODULE 6: REPORTED LISTINGS, FRAUD GUARD & USER BLACKLIST CONTROL
      ========================================================================== */}
      {activeModule === "fraud" && (
        <div className="space-y-6">
          {/* Reported Listings Moderation Queue */}
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="border-b border-stone-300 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-red-700 font-bold block">
                  Buyer-Reported Suspicious Listings & Price Anomaly Queue
                </span>
                <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                  Admin Fraud Guard & Listing Moderation Queue ({state.fraudGuard.reports.length})
                </h3>
              </div>
              <span className="px-3 py-1 bg-red-950 text-red-300 border border-red-500/40 text-[10px] font-mono font-bold uppercase">
                {state.fraudGuard.frozenListingKeys.length} Frozen Listing(s)
              </span>
            </div>

            {state.fraudGuard.reports.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 border border-stone-200 bg-white">
                No suspicious listing reports in the queue.
              </div>
            ) : (
              <div className="space-y-3">
                {state.fraudGuard.reports.map((rep) => {
                  const isFrozen = state.fraudGuard.frozenListingKeys.includes(rep.listingKey);
                  return (
                    <div
                      key={rep.id}
                      className={`p-4 border-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        isFrozen
                          ? "bg-red-50/70 border-red-600"
                          : "bg-white border-stone-300"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-stone-950 text-white text-[10px] font-mono font-bold">
                            {rep.id}
                          </span>
                          <span className="px-2 py-0.5 bg-red-100 text-red-900 border border-red-300 text-[10px] font-mono font-bold uppercase">
                            {rep.reason}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-mono font-bold uppercase">
                            Status: {rep.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-serif font-black text-stone-950">
                          {rep.itemTitle} —{" "}
                          <span className="font-mono tabular-nums">
                            ₹{rep.listedPrice.toLocaleString("en-IN")}
                          </span>
                        </h4>
                        <p className="text-xs text-stone-700">{rep.details}</p>
                        <p className="text-[10px] font-mono text-stone-500">
                          Seller: {rep.sellerName || "Unknown"} ({rep.sellerEmail || "No email"} /{" "}
                          {rep.sellerPhone || "No phone"}) • Reported by:{" "}
                          {rep.reporterEmail || "Buyer"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleFreezeListing(rep)}
                          className={`px-3 py-2 text-[10px] font-mono font-black uppercase tracking-wider cursor-pointer border flex items-center gap-1.5 ${
                            isFrozen
                              ? "bg-emerald-700 text-white border-emerald-800"
                              : "bg-red-700 hover:bg-red-600 text-white border-red-800"
                          }`}
                        >
                          {isFrozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          <span>{isFrozen ? "Unfreeze Listing" : "Freeze Listing"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRequestProofOfOwnership(rep)}
                          className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 text-[10px] font-mono font-black uppercase tracking-wider cursor-pointer border border-stone-950"
                        >
                          Demand RC / VIN Proof
                        </button>

                        {rep.sellerEmail && (
                          <button
                            type="button"
                            onClick={() =>
                              handleAddBlacklistEntry(
                                "gmail",
                                rep.sellerEmail!,
                                `Banned from report ${rep.id}: ${rep.reason}`,
                                "Banned"
                              )
                            }
                            className="px-3 py-2 bg-stone-950 hover:bg-red-950 text-red-400 text-[10px] font-mono font-black uppercase tracking-wider cursor-pointer border border-red-800 flex items-center gap-1"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Ban Seller Gmail</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gmail & Phone Blacklist Control */}
          <div className="bg-[#FAF8F5] border-2 border-stone-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="border-b border-stone-300 pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-red-700 font-bold block">
                Sell Tab & Upload Access Firewall
              </span>
              <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                Blacklist / Suspend Gmail Account or Phone Number
              </h3>
              <p className="text-xs text-stone-600">
                Any Gmail address or mobile number added below is immediately blocked from posting vehicles or parts on the Sell page.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddBlacklistEntry(blacklistType, blacklistValue, blacklistReason, blacklistStatus);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
            >
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Identifier Type
                </label>
                <select
                  value={blacklistType}
                  onChange={(e) => setBlacklistType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-semibold text-stone-950 cursor-pointer"
                >
                  <option value="gmail">Gmail / Email Account</option>
                  <option value="phone">Phone / Mobile Number</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Gmail or Phone Value *
                </label>
                <input
                  type="text"
                  required
                  placeholder={blacklistType === "gmail" ? "spammer@gmail.com" : "+91 90000 00000"}
                  value={blacklistValue}
                  onChange={(e) => setBlacklistValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-mono text-stone-950"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Restriction Level
                </label>
                <select
                  value={blacklistStatus}
                  onChange={(e) => setBlacklistStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-semibold text-stone-950 cursor-pointer"
                >
                  <option value="Banned">Permanently Banned</option>
                  <option value="Suspended">Temporarily Suspended</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block mb-1">
                  Reason for Ban
                </label>
                <input
                  type="text"
                  placeholder="Fake price listing / odometer tampering"
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 text-xs text-stone-950"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-4 bg-red-700 hover:bg-red-600 text-white text-xs font-mono font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                <span>Enforce Ban</span>
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {state.fraudGuard.blacklist.map((blk) => (
                <div
                  key={blk.id}
                  className="p-3.5 bg-white border border-stone-300 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-red-950 text-red-300 text-[9px] font-mono font-bold uppercase">
                        {blk.status} ({blk.targetType})
                      </span>
                      <span className="font-mono font-bold text-xs text-stone-950">
                        {blk.displayValue}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1">{blk.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlacklistEntry(blk.id)}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-900 hover:text-white text-[10px] font-mono font-bold uppercase border border-stone-300 cursor-pointer transition"
                  >
                    Unban
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
