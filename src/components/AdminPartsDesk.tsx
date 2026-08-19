import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Wrench, Zap, Tag, Trash2, Edit, Eye, ShieldCheck, 
  Sparkles, Star, Plus, Search, Filter, RefreshCw, 
  EyeOff, CheckCircle, ArrowUp, ArrowDown, Award,
  Cpu, Layers, AlertTriangle, ExternalLink, X, Check,
  Home, Phone, Mail, MapPin, Package, Shield, Save, Flame, ArrowRight,
  Car, Link2, TrendingUp, BarChart3, Sliders
} from "lucide-react";
import { 
  Part, UserPartListing, PART_CATEGORIES, PART_BRANDS, 
  PART_RARITY_TIERS, PART_CONDITION_LABELS, DEFAULT_PARTS 
} from "../types";
import { 
  subscribeToRealtimeCatalog, 
  saveAdminSettingsToFirestore, 
  savePartOverride 
} from "../lib/catalogSync";
import { doc, deleteDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import type { User as FirebaseUser } from "firebase/auth";
import PartDossierModal from "./PartDossierModal";
import VehicleCrossLinkingMatrix from "./parts/VehicleCrossLinkingMatrix";
import StockSupplyChainDesk from "./parts/StockSupplyChainDesk";
import ModerationApprovalQueue from "./parts/ModerationApprovalQueue";
import PartAnalyticsDesk from "./parts/PartAnalyticsDesk";

interface AdminPartsDeskProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  currentUser: FirebaseUser | null;
  onQuickViewPart?: (part: Part) => void;
}

function playSynthBeep(freq = 800, duration = 0.08, type: OscillatorType = "sine") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // audio fallback
  }
}

export default function AdminPartsDesk({
  showToast,
  currentUser,
  onQuickViewPart
}: AdminPartsDeskProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [userParts, setUserParts] = useState<UserPartListing[]>([]);
  const [partOverrides, setPartOverrides] = useState<Record<string, Partial<Part>>>({});
  const [adminSettings, setAdminSettings] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "defaults" | "user" | "hidden">("all");
  const [isLoading, setIsLoading] = useState(true);

  // Administrative Desk Sub-Views
  const [deskActiveTab, setDeskActiveTab] = useState<"catalog" | "cross_linking" | "supply_chain" | "moderation" | "analytics">("catalog");

  // Bulk Selection State
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // Part Dossier Modal with Tab & Coordinates State
  const [activeDossierPart, setActiveDossierPart] = useState<Part | null>(null);
  const [dossierInitialTab, setDossierInitialTab] = useState<"overview" | "gallery" | "specs" | "contact" | "control">("overview");
  const [dossierClickCoords, setDossierClickCoords] = useState<{ x: number; y: number } | null>(null);

  // Edit Modal State
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editRarity, setEditRarity] = useState<Part["rarity"]>("Rare");
  const [editCondition, setEditCondition] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [editFitment, setEditFitment] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPartNumber, setEditPartNumber] = useState("");
  const [editWarranty, setEditWarranty] = useState("");
  const [editImage, setEditImage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // New Hardware Intake Console Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBrand, setNewBrand] = useState("Garrett Motion");
  const [newCategory, setNewCategory] = useState("turbochargers");
  const [newRarity, setNewRarity] = useState<Part["rarity"]>("Rare");
  const [newCondition, setNewCondition] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [newPrice, setNewPrice] = useState("145000");
  const [newFitment, setNewFitment] = useState("Universal / 2.0L - 4.0L Engines");
  const [newPartNumber, setNewPartNumber] = useState("");
  const [newWarranty, setNewWarranty] = useState("12-Month Official Warranty");
  const [newImage, setNewImage] = useState("https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800");
  const [newDescription, setNewDescription] = useState("");
  const [isAddingPart, setIsAddingPart] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToRealtimeCatalog((catalog) => {
      setUserParts(catalog.userParts || []);
      setPartOverrides(catalog.partOverrides || {});
      setAdminSettings(catalog.adminSettings || {});

      // Build unified parts list
      let defaults = [...DEFAULT_PARTS];
      const badges = catalog.adminSettings?.partBadges || {};

      defaults = defaults.map(p => {
        const override = catalog.partOverrides?.[String(p.id)];
        const customBadge = badges[String(p.id)];
        return {
          ...p,
          ...(override || {}),
          badge: customBadge !== undefined ? customBadge : (override?.badge || p.badge)
        };
      });

      const userMapped: Part[] = (catalog.userParts || []).map((p, idx) => ({
        id: p.id || `user-${idx}`,
        title: p.title,
        category: p.category,
        rarity: p.rarity,
        condition: (p.condition as any) || 5,
        brand: p.brand,
        price: p.price,
        image: p.photos && p.photos.length > 0 ? p.photos[0].src : (p.image || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800"),
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

      setParts([...defaults, ...userMapped]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const featuredHomeIds: string[] = adminSettings.homeFeaturedPartIds || ["1", "2", "3"];
  const hiddenPartIds: (number | string)[] = adminSettings.hiddenPartIds || [];

  // Pinned Homepage Parts objects
  const pinnedParts: Part[] = [];
  featuredHomeIds.forEach(key => {
    const found = parts.find(p => {
      const pKey = `${p.isUserListing ? "user" : "default"}-${p.isUserListing ? p.listingId : p.id}`;
      return pKey === key || String(p.id) === key || `default-${p.id}` === key || `user-${p.listingId}` === key;
    });
    if (found && !pinnedParts.some(x => x.id === found.id)) {
      pinnedParts.push(found);
    }
  });

  // Reorder Homepage Featured Parts
  const handleMovePinnedPart = async (index: number, direction: "left" | "right") => {
    playSynthBeep(850, 0.06);
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= featuredHomeIds.length) return;

    const newIds = [...featuredHomeIds];
    const temp = newIds[index];
    newIds[index] = newIds[targetIndex];
    newIds[targetIndex] = temp;

    try {
      await saveAdminSettingsToFirestore({ homeFeaturedPartIds: newIds });
      showToast(`Updated homepage showcase ranking order.`, "success");
    } catch (e) {
      console.error("Move pinned part error:", e);
    }
  };

  const handleResetHomePinned = async () => {
    playSynthBeep(900, 0.1);
    const defaultIds = ["1", "2", "3"];
    try {
      await saveAdminSettingsToFirestore({ homeFeaturedPartIds: defaultIds });
      showToast("Reset Homepage showcase to default 3 performance parts.", "success");
    } catch (e) {
      console.error("Reset pinned parts error:", e);
    }
  };

  // Toggle Default Badge (verified, premium, hot)
  const handleToggleDefaultBadge = async (partId: string | number, badgeType: "verified" | "premium" | "hot") => {
    playSynthBeep(900, 0.08);
    const key = String(partId);
    const currentBadges = { ...(adminSettings.partBadges || {}) };
    
    if (currentBadges[key] === badgeType) {
      delete currentBadges[key];
      showToast(`Removed ${badgeType.toUpperCase()} tag from static hardware item.`, "info");
    } else {
      currentBadges[key] = badgeType;
      showToast(`Applied ${badgeType.toUpperCase()} tag to static hardware item.`, "success");
    }

    try {
      await saveAdminSettingsToFirestore({ partBadges: currentBadges });
    } catch (e) {
      console.error("Failed to update part badge:", e);
      showToast("Could not update badge.", "error");
    }
  };

  // Toggle Pin to Homepage Featured Hardware Showcase
  const handleToggleFeaturedHome = async (key: string) => {
    playSynthBeep(950, 0.08);
    let currentHomeIds = [...featuredHomeIds];
    if (currentHomeIds.includes(key) || currentHomeIds.some(id => key.includes(id))) {
      currentHomeIds = currentHomeIds.filter(id => id !== key && !key.includes(id));
      showToast("Removed from homepage featured hardware grid.", "info");
    } else {
      if (currentHomeIds.length >= 6) {
        showToast("Maximum 6 featured parts allowed on homepage. Replaced earliest item.", "info");
        currentHomeIds = currentHomeIds.slice(1);
      }
      currentHomeIds.push(key);
      showToast("Pinned hardware to homepage featured grid!", "success");
    }

    try {
      await saveAdminSettingsToFirestore({ homeFeaturedPartIds: currentHomeIds });
    } catch (e) {
      console.error("Home featured update error:", e);
    }
  };

  // Toggle Hide / Restore for Static Part
  const handleToggleHideDefault = async (partId: string | number) => {
    playSynthBeep(750, 0.08);
    let hidden = [...hiddenPartIds];
    const numId = typeof partId === "number" ? partId : parseInt(partId as string);
    if (hidden.includes(numId)) {
      hidden = hidden.filter(id => id !== numId);
      showToast("Restored part visibility on public marketplace catalog.", "success");
    } else {
      hidden.push(numId);
      showToast("Hidden part from public marketplace catalog.", "info");
    }
    await saveAdminSettingsToFirestore({ hiddenPartIds: hidden });
  };

  // Remove Static Part (Permanently Hide from default catalog)
  const handleRemoveDefaultPart = async (partId: string | number) => {
    if (!window.confirm("Archive this static hardware component from the active catalog?")) return;
    playSynthBeep(450, 0.15, "sawtooth");
    let hidden = [...hiddenPartIds];
    const numId = typeof partId === "number" ? partId : parseInt(partId as string);
    if (!hidden.includes(numId)) {
      hidden.push(numId);
    }
    await saveAdminSettingsToFirestore({ hiddenPartIds: hidden });
    showToast("Static hardware item archived from public catalog.", "info");
  };

  // User Part Listing Action Handlers
  const handleToggleUserListingApproval = async (part: Part) => {
    if (!part.listingId) return;
    playSynthBeep(900, 0.08);
    const newStatus = (part.status === "pending" || !part.status) ? "active" : "pending";
    try {
      await updateDoc(doc(db, "parts", part.listingId), { status: newStatus });
      showToast(
        newStatus === "active" 
          ? `Approved "${part.title}" for public marketplace!` 
          : `Moved "${part.title}" to pending approval.`,
        "success"
      );
    } catch (e) {
      console.error("Failed to toggle approval:", e);
      showToast("Could not update approval status.", "error");
    }
  };

  const handleToggleUserListingHide = async (part: Part) => {
    if (!part.listingId) return;
    playSynthBeep(700, 0.08);
    const newStatus = part.status === "hidden" ? "active" : "hidden";
    try {
      await updateDoc(doc(db, "parts", part.listingId), { status: newStatus });
      showToast(
        newStatus === "hidden" 
          ? `Hidden "${part.title}" from public marketplace.` 
          : `Unhid "${part.title}" and restored active status.`,
        "info"
      );
    } catch (e) {
      console.error("Failed to toggle hide:", e);
      showToast("Could not toggle visibility.", "error");
    }
  };

  const handleToggleUserPartVerified = async (part: Part) => {
    if (!part.listingId) return;
    playSynthBeep(1000, 0.08);
    const currentVal = part.badge === "verified";
    try {
      await updateDoc(doc(db, "parts", part.listingId), { verified: !currentVal });
      showToast(!currentVal ? `Awarded Verified badge to "${part.title}"` : `Removed Verified badge`, "success");
    } catch (e) {
      console.error(e);
      showToast("Could not update verified status.", "error");
    }
  };

  const handleToggleUserPartFeatured = async (part: Part) => {
    if (!part.listingId) return;
    playSynthBeep(1050, 0.08);
    const currentVal = part.badge === "premium";
    try {
      await updateDoc(doc(db, "parts", part.listingId), { featured: !currentVal });
      showToast(!currentVal ? `Marked "${part.title}" as Featured` : `Removed Featured flag`, "success");
    } catch (e) {
      console.error(e);
      showToast("Could not update featured flag.", "error");
    }
  };

  const handleToggleUserPartUrgent = async (part: Part) => {
    if (!part.listingId) return;
    playSynthBeep(850, 0.08);
    const currentVal = part.badge === "hot";
    try {
      await updateDoc(doc(db, "parts", part.listingId), { urgent: !currentVal });
      showToast(!currentVal ? `Tagged "${part.title}" as Hot Deal` : `Removed Hot Deal tag`, "info");
    } catch (e) {
      console.error(e);
      showToast("Could not update hot deal tag.", "error");
    }
  };

  const handleDeleteUserPart = async (listingId: string) => {
    if (!window.confirm("Permanently scrub this community performance part listing from Firestore?")) return;
    playSynthBeep(400, 0.2, "sawtooth");
    try {
      await deleteDoc(doc(db, "parts", listingId));
      showToast("Part scrubbed forever from Firestore database.", "success");
    } catch (e) {
      console.error("Failed to delete part:", e);
      showToast("Could not delete part from database.", "error");
    }
  };

  // Edit Modal Opening & Saving
  const handleOpenEdit = (part: Part) => {
    setEditingPart(part);
    setEditPrice(String(part.price));
    setEditTitle(part.title);
    setEditBrand(part.brand || "");
    setEditCategory(part.category || "turbochargers");
    setEditRarity(part.rarity || "Rare");
    setEditCondition(part.condition || 5);
    setEditFitment(part.compatibleVehicles || "");
    setEditDescription(part.description || "");
    setEditPartNumber(part.partNumber || "");
    setEditWarranty(part.warranty || "");
    setEditImage(part.photos && part.photos.length > 0 ? part.photos[0].src : (part.image || ""));
  };

  const handleSaveEdit = async () => {
    if (!editingPart) return;
    setIsSaving(true);
    const numPrice = parseInt(editPrice.replace(/[^0-9]/g, "")) || editingPart.price;

    const payload: Partial<Part> = {
      price: numPrice,
      title: editTitle.trim() || editingPart.title,
      brand: editBrand.trim() || editingPart.brand,
      category: editCategory.trim() || editingPart.category,
      rarity: editRarity,
      condition: editCondition,
      compatibleVehicles: editFitment.trim() || editingPart.compatibleVehicles,
      description: editDescription.trim() || editingPart.description,
      partNumber: editPartNumber.trim() || editingPart.partNumber,
      warranty: editWarranty.trim() || editingPart.warranty,
      image: editImage.trim() || editingPart.image
    };

    try {
      if (editingPart.isUserListing && editingPart.listingId) {
        await updateDoc(doc(db, "parts", editingPart.listingId), payload);
      } else {
        await savePartOverride(editingPart.id, payload);
      }
      playSynthBeep(1100, 0.12);
      showToast(`Updated performance part specs for "${payload.title}"`, "success");
      setEditingPart(null);
    } catch (e) {
      console.error("Save edit error:", e);
      showToast("Failed to save changes.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Add New Hardware Intake Handler
  const handleAddNewHardware = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPrice) {
      showToast("Please provide a valid Hardware Title and Valuation.", "error");
      return;
    }

    setIsAddingPart(true);
    playSynthBeep(1000, 0.1);
    const numPrice = parseInt(newPrice.replace(/[^0-9]/g, "")) || 100000;

    const newPartData: Partial<UserPartListing> = {
      title: newTitle.trim(),
      brand: newBrand.trim() || "Garrett Motion",
      category: newCategory,
      rarity: newRarity,
      condition: newCondition,
      price: numPrice,
      compatibleVehicles: newFitment.trim() || "Universal Fitment",
      partNumber: newPartNumber.trim() || `AW-MOD-${Date.now().toString().slice(-4)}`,
      warranty: newWarranty.trim() || "12-Month Guarantee",
      description: newDescription.trim() || "High-performance motorsport upgrade component verified by Auto World Engineering.",
      photos: [{ src: newImage.trim(), alt: newTitle.trim() }],
      image: newImage.trim(),
      sellerName: "Auto World Motorsport Vault",
      sellerPhone: "+91 98200 11988",
      sellerEmail: "dispatch@autoworld.com",
      location: "Mumbai, India",
      negotiable: "no",
      verified: true,
      featured: true,
      status: "active",
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, "parts"), newPartData);
      showToast(`Successfully added "${newTitle}" to active Firestore parts inventory!`, "success");
      setShowAddForm(false);
      setNewTitle("");
      setNewDescription("");
      setNewPartNumber("");
    } catch (err) {
      console.error("Add part error:", err);
      showToast("Failed to add hardware to Firestore.", "error");
    } finally {
      setIsAddingPart(false);
    }
  };

  // Filtering
  const filteredParts = parts.filter(p => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (rarityFilter !== "all" && p.rarity !== rarityFilter) return false;
    
    const numId = typeof p.id === "number" ? p.id : parseInt(p.id as string);
    const isHidden = !p.isUserListing && hiddenPartIds.includes(numId);
    
    if (sourceFilter === "defaults" && p.isUserListing) return false;
    if (sourceFilter === "user" && !p.isUserListing) return false;
    if (sourceFilter === "hidden" && !isHidden && p.status !== "hidden") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (p.title || "").toLowerCase().includes(q);
      const matchBrand = (p.brand || "").toLowerCase().includes(q);
      const matchFit = (p.compatibleVehicles || "").toLowerCase().includes(q);
      const matchDesc = (p.description || "").toLowerCase().includes(q);
      return matchTitle || matchBrand || matchFit || matchDesc;
    }
    return true;
  });

  // Bulk Selection Operations
  const allFilteredKeys = filteredParts.map(p => `${p.isUserListing ? "user" : "default"}-${p.isUserListing ? p.listingId : p.id}`);
  const isAllSelected = filteredParts.length > 0 && allFilteredKeys.every(k => selectedKeys.includes(k));

  const toggleSelectPart = (key: string) => {
    setSelectedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSelectAll = () => {
    playSynthBeep(900, 0.06);
    if (isAllSelected) {
      setSelectedKeys(prev => prev.filter(k => !allFilteredKeys.includes(k)));
    } else {
      setSelectedKeys(prev => Array.from(new Set([...prev, ...allFilteredKeys])));
    }
  };

  const handleBulkApprove = async () => {
    playSynthBeep(950, 0.08);
    const selectedUserParts = filteredParts.filter(p => p.isUserListing && p.listingId && selectedKeys.includes(`user-${p.listingId}`));
    if (selectedUserParts.length === 0) {
      showToast("No community-listed hardware items in current selection.", "info");
      return;
    }
    for (const p of selectedUserParts) {
      try {
        await updateDoc(doc(db, "parts", p.listingId!), { status: "active" });
      } catch (e) {
        console.error(e);
      }
    }
    showToast(`Approved ${selectedUserParts.length} selected hardware items.`, "success");
  };

  const handleBulkHold = async () => {
    playSynthBeep(650, 0.08);
    const selectedUserParts = filteredParts.filter(p => p.isUserListing && p.listingId && selectedKeys.includes(`user-${p.listingId}`));
    if (selectedUserParts.length === 0) {
      showToast("No community-listed hardware items in current selection.", "info");
      return;
    }
    for (const p of selectedUserParts) {
      try {
        await updateDoc(doc(db, "parts", p.listingId!), { status: "pending" });
      } catch (e) {
        console.error(e);
      }
    }
    showToast(`Moved ${selectedUserParts.length} items to Pending Hold.`, "info");
  };

  const handleBulkVerify = async () => {
    playSynthBeep(1100, 0.1);
    let count = 0;
    const currentBadges = { ...(adminSettings.partBadges || {}) };

    for (const p of filteredParts) {
      const key = `${p.isUserListing ? "user" : "default"}-${p.isUserListing ? p.listingId : p.id}`;
      if (selectedKeys.includes(key)) {
        count++;
        if (p.isUserListing && p.listingId) {
          try {
            await updateDoc(doc(db, "parts", p.listingId), { verified: true });
          } catch (e) {
            console.error(e);
          }
        } else {
          currentBadges[String(p.id)] = "verified";
        }
      }
    }
    try {
      await saveAdminSettingsToFirestore({ partBadges: currentBadges });
      showToast(`Awarded Verified badge to ${count} hardware items.`, "success");
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkHide = async () => {
    playSynthBeep(850, 0.08);
    let hidden = [...hiddenPartIds];
    let count = 0;

    for (const p of filteredParts) {
      const key = `${p.isUserListing ? "user" : "default"}-${p.isUserListing ? p.listingId : p.id}`;
      if (selectedKeys.includes(key)) {
        count++;
        if (p.isUserListing && p.listingId) {
          try {
            await updateDoc(doc(db, "parts", p.listingId), { status: "hidden" });
          } catch (e) {
            console.error(e);
          }
        } else {
          const numId = typeof p.id === "number" ? p.id : parseInt(p.id as string);
          if (!hidden.includes(numId)) hidden.push(numId);
        }
      }
    }

    try {
      await saveAdminSettingsToFirestore({ hiddenPartIds: hidden });
      showToast(`Archived / Hidden ${count} hardware items from public marketplace.`, "info");
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Permanently scrub ${selectedKeys.length} selected hardware items from system?`)) return;
    playSynthBeep(450, 0.2, "sawtooth");
    let hidden = [...hiddenPartIds];
    let deletedCount = 0;

    for (const p of filteredParts) {
      const key = `${p.isUserListing ? "user" : "default"}-${p.isUserListing ? p.listingId : p.id}`;
      if (selectedKeys.includes(key)) {
        if (p.isUserListing && p.listingId) {
          try {
            await deleteDoc(doc(db, "parts", p.listingId));
            deletedCount++;
          } catch (e) {
            console.error(e);
          }
        } else {
          const numId = typeof p.id === "number" ? p.id : parseInt(p.id as string);
          if (!hidden.includes(numId)) hidden.push(numId);
          deletedCount++;
        }
      }
    }

    try {
      await saveAdminSettingsToFirestore({ hiddenPartIds: hidden });
      showToast(`Scrubbed ${deletedCount} hardware items from active database.`, "success");
      setSelectedKeys([]);
    } catch (e) {
      console.error(e);
    }
  };

  const openDossierWithOrigin = (part: Part, tab: "overview" | "gallery" | "specs" | "contact" | "control" = "overview", e?: React.MouseEvent) => {
    playSynthBeep(850, 0.05);
    if (e) {
      setDossierClickCoords({ x: e.clientX, y: e.clientY });
    } else {
      setDossierClickCoords(null);
    }
    setDossierInitialTab(tab);
    setActiveDossierPart(part);
  };

  const handleOpenDossierDirect = (part: Part, tab: "overview" | "gallery" | "specs" | "contact" | "control" = "overview") => {
    openDossierWithOrigin(part, tab);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. TOP BANNER & ACTION HUB */}
      <div className="p-6 bg-stone-900 border-2 border-stone-950 text-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 mb-1">
            <Wrench className="w-3.5 h-3.5 text-amber-500" />
            <span>Motorsport Performance & Upgrades Desk</span>
          </div>
          <h2 className="text-2xl font-serif font-black uppercase text-white">
            Performance Hardware Administration
          </h2>
          <p className="text-xs text-stone-300 font-medium max-w-2xl mt-1">
            Manage aftermarket parts, calibrate valuations, curate homepage featured hardware, and moderate community-listed turbos, carbon wings, and exhausts.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              playSynthBeep(900, 0.05);
              setShowAddForm(prev => !prev);
            }}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-mono font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-sm border border-amber-500"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? "Close Intake Console" : "+ Add New Hardware"}</span>
          </button>

          <div className="px-3 py-1.5 bg-stone-800 border border-stone-700 rounded text-center">
            <span className="text-[9px] font-mono uppercase text-stone-400 block">Total Hardware</span>
            <span className="text-lg font-serif font-black text-amber-400">{parts.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-stone-800 border border-stone-700 rounded text-center">
            <span className="text-[9px] font-mono uppercase text-stone-400 block">User Listed</span>
            <span className="text-lg font-serif font-black text-emerald-400">{userParts.length}</span>
          </div>
        </div>
      </div>

      {/* SUB-DESK NAVIGATION TABS */}
      {(() => {
        const pendingCount = parts.filter(p => p.isUserListing && (p.moderationStatus === "pending_verification" || p.status === "pending")).length;
        const lowStockCount = parts.filter(p => (p.stockStatus === "in_stock" || !p.stockStatus) && (p.stockCount !== undefined && p.stockCount <= 2)).length;

        const tabs = [
          { id: "catalog", label: "Catalog & Grid Hub", icon: Layers, badge: null },
          { id: "cross_linking", label: "Vehicle Matcher Matrix", icon: Car, badge: null },
          { id: "supply_chain", label: "Live Stock & Logistics", icon: Package, badge: lowStockCount > 0 ? `${lowStockCount} Low` : null, badgeColor: "bg-red-500 text-white" },
          { id: "moderation", label: "Moderation Queue", icon: ShieldCheck, badge: pendingCount > 0 ? `${pendingCount} Pending` : null, badgeColor: "bg-amber-500 text-stone-950" },
          { id: "analytics", label: "Demand & Price Audit", icon: TrendingUp, badge: null }
        ];

        return (
          <div className="flex items-center gap-1.5 border-b-2 border-stone-950 pb-2 overflow-x-auto">
            {tabs.map(t => {
              const Icon = t.icon;
              const isActive = deskActiveTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    playSynthBeep(850, 0.05);
                    setDeskActiveTab(t.id as any);
                  }}
                  className={`px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-2 transition cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-stone-950 text-white border-stone-950 shadow-[3px_3px_0px_0px_rgba(217,119,6,1)]"
                      : "bg-[#FAF8F5] text-stone-700 border-stone-300 hover:border-stone-950 hover:bg-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-stone-500"}`} />
                  <span>{t.label}</span>
                  {t.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.badgeColor}`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* VIEW 1: VEHICLE CROSS-LINKING MATRIX */}
      {deskActiveTab === "cross_linking" && (
        <VehicleCrossLinkingMatrix
          parts={parts}
          onOpenPartDossier={(p, t) => handleOpenDossierDirect(p, t as any)}
          showToast={showToast}
        />
      )}

      {/* VIEW 2: LIVE STOCK & SUPPLY CHAIN DESK */}
      {deskActiveTab === "supply_chain" && (
        <StockSupplyChainDesk
          parts={parts}
          onOpenPartDossier={(p, t) => handleOpenDossierDirect(p, t as any)}
          showToast={showToast}
        />
      )}

      {/* VIEW 3: MODERATION APPROVAL QUEUE */}
      {deskActiveTab === "moderation" && (
        <ModerationApprovalQueue
          parts={parts}
          onOpenPartDossier={(p, t) => handleOpenDossierDirect(p, t as any)}
          showToast={showToast}
        />
      )}

      {/* VIEW 4: PART ANALYTICS & PRICE AUDIT DESK */}
      {deskActiveTab === "analytics" && (
        <PartAnalyticsDesk
          parts={parts}
          onOpenPartDossier={(p, t) => handleOpenDossierDirect(p, t as any)}
          showToast={showToast}
        />
      )}

      {/* VIEW 5: CORE CATALOG & GRID VIEW */}
      {deskActiveTab === "catalog" && (
        <>
      {/* 2. INLINE ADD HARDWARE INTAKE CONSOLE */}
      {showAddForm && (
        <div className="bg-[#FAF8F5] border-2 border-stone-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <div className="flex items-center justify-between border-b-2 border-stone-950 pb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-serif font-black uppercase text-stone-950">
                Motorsport Hardware Intake Console
              </h3>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 text-stone-500 hover:text-stone-950 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddNewHardware} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Hardware Title *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Garrett G35-1050 Turbocharger"
                required
                className="w-full px-3 py-2 bg-white border border-stone-300 font-medium focus:border-stone-950 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Brand / Manufacturer *</label>
              <input
                type="text"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="e.g. Garrett, Brembo, Ohlins, HKS"
                className="w-full px-3 py-2 bg-white border border-stone-300 font-medium focus:border-stone-950 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Category Classification</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 font-medium focus:border-stone-950 outline-none"
              >
                {PART_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Rarity Classification</label>
              <select
                value={newRarity}
                onChange={(e) => setNewRarity(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-stone-300 font-medium focus:border-stone-950 outline-none"
              >
                <option value="Common">Common</option>
                <option value="Uncommon">Uncommon</option>
                <option value="Rare">Rare</option>
                <option value="Epic">Epic</option>
                <option value="Legendary">Legendary</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Condition Rating</label>
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(Number(e.target.value) as any)}
                className="w-full px-3 py-2 bg-white border border-stone-300 font-medium focus:border-stone-950 outline-none"
              >
                <option value={5}>5 Stars - Brand New / Sealed</option>
                <option value={4}>4 Stars - Excellent Condition</option>
                <option value={3}>3 Stars - Good (Light Dyno Wear)</option>
                <option value={2}>2 Stars - Fair (Rebuild Recommended)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Price Valuation (₹ INR) *</label>
              <input
                type="text"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="145000"
                required
                className="w-full px-3 py-2 bg-white border border-stone-300 font-medium focus:border-stone-950 outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Chassis & Vehicle Compatibility</label>
              <input
                type="text"
                value={newFitment}
                onChange={(e) => setNewFitment(e.target.value)}
                placeholder="e.g. BMW M3 G80, Nissan GT-R R35, Universal..."
                className="w-full px-3 py-2 bg-white border border-stone-300 font-medium focus:border-stone-950 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">OEM / Aftermarket Part Number</label>
              <input
                type="text"
                value={newPartNumber}
                onChange={(e) => setNewPartNumber(e.target.value)}
                placeholder="e.g. GRT-G35-1050-85"
                className="w-full px-3 py-2 bg-white border border-stone-300 font-medium focus:border-stone-950 outline-none font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-3">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Primary Photograph URL</label>
              <input
                type="text"
                value={newImage}
                onChange={(e) => setNewImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-white border border-stone-300 font-medium focus:border-stone-950 outline-none font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-3">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Engineering Narrative & Description</label>
              <textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Precision engineered motorsport component for high performance applications..."
                className="w-full px-3 py-2 bg-white border border-stone-300 font-medium focus:border-stone-950 outline-none"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingPart}
                className="px-6 py-2 bg-stone-950 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAddingPart ? "Registering Hardware..." : "Register Hardware Component"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. HOMEPAGE FEATURED HARDWARE SHOWCASE (3 ITEMS PINNED) */}
      <div className="p-5 bg-[#FAF8F5] border-2 border-stone-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-stone-950 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-mono font-black uppercase tracking-wider text-stone-950">
                Home Page Featured Hardware Showcase ({pinnedParts.length} / 6 items)
              </h3>
            </div>
            <p className="text-[11px] text-stone-600 font-sans mt-0.5">
              Live motorsport showcase displayed prominently on the marketplace homepage. Use arrows to reorder.
            </p>
          </div>

          <button
            onClick={handleResetHomePinned}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer self-start sm:self-auto"
            title="Reset homepage showcase to default 3 parts"
          >
            <RefreshCw className="w-3 h-3 text-stone-600" />
            <span>Reset to Default 3 Parts</span>
          </button>
        </div>

        {pinnedParts.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-stone-500 bg-stone-100 border border-dashed border-stone-300">
            No parts pinned to the homepage showcase. Click "🏠 Pin Home" on any card below to feature it.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedParts.map((part, idx) => {
              const partKey = `${part.isUserListing ? "user" : "default"}-${part.isUserListing ? part.listingId : part.id}`;
              const displayImage = part.photos && part.photos.length > 0 ? part.photos[0].src : (part.image || "");
              
              return (
                <div 
                  key={partKey} 
                  className="bg-white border-2 border-stone-900 p-3 flex flex-col justify-between shadow-sm relative group"
                >
                  <div className="flex gap-3">
                    <div className="w-20 h-20 bg-stone-900 shrink-0 border border-stone-300 overflow-hidden relative">
                      <img src={displayImage} alt={part.title} className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 px-1 bg-stone-950/90 text-amber-400 font-mono text-[9px] font-bold">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-mono font-bold text-amber-800 uppercase block truncate">
                        {part.brand} • {part.category}
                      </span>
                      <h4 className="font-serif font-black text-stone-950 text-xs uppercase truncate mt-0.5">
                        {part.title}
                      </h4>
                      <p className="text-xs font-mono font-extrabold text-stone-900 mt-1">
                        ₹{part.price.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Reorder and Unpin Controls */}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-stone-200">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMovePinnedPart(idx, "left")}
                        disabled={idx === 0}
                        className={`p-1 border rounded text-[10px] font-mono cursor-pointer transition ${
                          idx === 0 ? "opacity-30 border-stone-200 cursor-not-allowed" : "bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-800"
                        }`}
                        title="Move Left in showcase"
                      >
                        <ArrowUp className="w-3 h-3 rotate-[-90deg]" />
                      </button>

                      <button
                        onClick={() => handleMovePinnedPart(idx, "right")}
                        disabled={idx === pinnedParts.length - 1}
                        className={`p-1 border rounded text-[10px] font-mono cursor-pointer transition ${
                          idx === pinnedParts.length - 1 ? "opacity-30 border-stone-200 cursor-not-allowed" : "bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-800"
                        }`}
                        title="Move Right in showcase"
                      >
                        <ArrowDown className="w-3 h-3 rotate-[-90deg]" />
                      </button>

                      <span className="text-[10px] font-mono text-stone-500 font-bold ml-1">
                        Slot {idx + 1}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleFeaturedHome(partKey)}
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-mono font-bold uppercase rounded cursor-pointer transition"
                      title="Unpin from homepage"
                    >
                      Unpin ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. FILTER AND SEARCH BAR */}
      <div className="p-4 bg-[#FAF8F5] border-2 border-stone-900 flex flex-wrap items-center justify-between gap-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hardware by brand, title, or fitment..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-stone-900 font-medium"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-300 text-xs text-stone-800 font-medium"
          >
            <option value="all">All Categories ({parts.length})</option>
            {PART_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-300 text-xs text-stone-800 font-medium"
          >
            <option value="all">All Rarity Tiers</option>
            <option value="Common">Common</option>
            <option value="Uncommon">Uncommon</option>
            <option value="Rare">Rare</option>
            <option value="Epic">Epic</option>
            <option value="Legendary">Legendary</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-stone-300 text-xs text-stone-800 font-medium"
          >
            <option value="all">All Inventory ({parts.length})</option>
            <option value="defaults">Default Factory Specs</option>
            <option value="user">User Community Submissions</option>
            <option value="hidden">Archived / Hidden</option>
          </select>
        </div>

        <div className="text-xs font-mono text-stone-600">
          Showing <strong className="text-stone-950 font-bold">{filteredParts.length}</strong> of {parts.length} components
        </div>
      </div>

      {/* 5. BULK SELECTION CONTROL BAR */}
      <div className="bg-[#FAF8F5] border-2 border-stone-900 p-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-amber-600 rounded border-stone-400 cursor-pointer"
            />
            <span className="font-mono text-xs font-black uppercase tracking-wider text-stone-900">
              SELECT ALL PARTS / EVERY HARDWARE ITEM ({filteredParts.length})
            </span>
          </label>
        </div>

        <div>
          {selectedKeys.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mr-1.5 self-center font-mono">
                Selection Actions ({selectedKeys.length}):
              </span>
              
              <button
                onClick={handleBulkApprove}
                className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[9px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shadow-xs font-mono"
                title="Approve selected user postings"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Approve
              </button>

              <button
                onClick={handleBulkHold}
                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 text-[9px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shadow-xs font-mono"
                title="Hold / Unapprove selected user postings"
              >
                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                Hold
              </button>

              <button
                onClick={handleBulkVerify}
                className="px-2.5 py-1.5 bg-purple-900 hover:bg-purple-800 text-white text-[9px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shadow-xs font-mono"
                title="Award verified badge to selected items"
              >
                <CheckCircle className="w-3.5 h-3.5 text-purple-300" />
                Verify
              </button>

              <button
                onClick={handleBulkHide}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shadow-xs font-mono"
                title="Hide selected items from public view"
              >
                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                Archive Static
              </button>

              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-1 border border-red-800 shadow-xs font-mono"
                title="Permanently scrub all selected items from platform database"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-100" />
                Scrub Forever
              </button>

              <button
                onClick={() => {
                  playSynthBeep(500, 0.05);
                  setSelectedKeys([]);
                }}
                className="text-[9px] font-bold text-stone-500 hover:text-stone-950 underline ml-2 cursor-pointer uppercase tracking-wider font-mono"
              >
                Clear
              </button>
            </div>
          ) : (
            <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest italic font-mono">
              CHECK INDIVIDUAL CARDS OR SELECT ALL TO UNLOCK BULK ACTIONS
            </span>
          )}
        </div>
      </div>

      {/* 6. 2-COLUMN HARDWARE CARDS GRID (EXACT MATCHING SCREENSHOT) */}
      {filteredParts.length === 0 ? (
        <div className="bg-[#FAF8F5] border-2 border-stone-950 p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
          <Wrench className="w-8 h-8 text-stone-400 mx-auto" />
          <h3 className="text-base font-serif font-black uppercase text-stone-950">
            No Matching Hardware Found
          </h3>
          <p className="text-stone-500 text-xs font-mono uppercase">
            Try adjusting your search criteria or resetting filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
              setRarityFilter("all");
              setSourceFilter("all");
            }}
            className="px-4 py-2 bg-stone-950 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredParts.map((part) => {
            const partKey = `${part.isUserListing ? "user" : "default"}-${part.isUserListing ? part.listingId : part.id}`;
            const numId = typeof part.id === "number" ? part.id : parseInt(part.id as string);
            const isHidden = !part.isUserListing && hiddenPartIds.includes(numId);
            const isHomeFeatured = 
              featuredHomeIds.includes(partKey) || 
              featuredHomeIds.includes(String(part.id)) || 
              featuredHomeIds.includes(`default-${part.id}`) || 
              featuredHomeIds.includes(`user-${part.listingId}`);
            
            const displayImage = part.photos && part.photos.length > 0 
              ? part.photos[0].src 
              : (part.image || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800");

            return (
              <div 
                key={partKey}
                className={`bg-[#FAF8F5] border-2 flex flex-col sm:flex-row transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                  isHidden 
                    ? "border-amber-300 opacity-65 bg-stone-100" 
                    : part.isUserListing
                      ? "border-stone-900"
                      : "border-stone-900"
                }`}
              >
                {/* Image box */}
                <div className="w-full sm:w-44 h-44 shrink-0 relative bg-stone-200">
                  <img 
                    src={displayImage} 
                    alt={part.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800";
                    }}
                  />
                  <div className="absolute top-2 left-2 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 border text-white font-mono bg-stone-950">
                    {part.isUserListing ? "FIRESTORE POST" : "HARDCODED STATIC"}
                  </div>

                  {/* Interactive Card Selection Checkbox overlay */}
                  <div className="absolute top-2 right-2 z-10 bg-stone-950/85 backdrop-blur-xs p-1.5 border border-stone-700 rounded-sm hover:bg-stone-900 transition flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedKeys.includes(partKey)}
                      onChange={() => {
                        playSynthBeep(850, 0.05);
                        toggleSelectPart(partKey);
                      }}
                      className="w-3.5 h-3.5 accent-amber-600 rounded border-stone-500 cursor-pointer"
                      title="Toggle select hardware item"
                    />
                  </div>

                  {(part.badge || part.rarity) && (
                    <div className="absolute bottom-2 left-2 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 border text-stone-900 bg-amber-400 border-amber-500 font-mono">
                      [ {part.badge ? (part.badge === "premium" ? "PREMIUM" : part.badge === "hot" ? "HOT DEAL" : "VERIFIED") : part.rarity.toUpperCase()} ]
                    </div>
                  )}
                </div>

                {/* Info panel */}
                <div className="flex-grow p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="text-[9px] font-mono text-stone-600 uppercase font-bold tracking-widest">
                        {part.brand || "OEM"} • {part.category.toUpperCase().replace("_", " ")}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                        {part.isUserListing ? (
                          <>
                            {(part.status === "pending" || !part.status) && (
                              <span className="uppercase px-2 py-0.5 border bg-amber-100 text-amber-800 border-amber-200">
                                Pending Approval
                              </span>
                            )}
                            {part.status === "active" && (
                              <span className="uppercase px-2 py-0.5 border bg-emerald-100 text-emerald-800 border-emerald-200">
                                Approved & Active
                              </span>
                            )}
                            {part.status === "hidden" && (
                              <span className="uppercase px-2 py-0.5 border bg-red-100 text-red-800 border-red-300 font-extrabold flex items-center gap-1">
                                <EyeOff className="w-3 h-3 text-red-600" />
                                Hidden by Admin
                              </span>
                            )}
                          </>
                        ) : (
                          <span className={`uppercase px-2 py-0.5 ${
                            isHidden ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-900"
                          }`}>
                            {isHidden ? "Hidden Catalog" : "Visible Catalog"}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-serif font-black text-stone-900 text-md uppercase leading-tight mt-1">
                      {part.title}
                    </h3>
                    <p className="text-stone-950 font-extrabold text-xs font-mono mt-1">
                      ₹{part.price.toLocaleString("en-IN")} INR
                    </p>
                    <p className="text-[10px] text-stone-600 line-clamp-1 mt-1 font-sans">
                      {part.description || (part.compatibleVehicles ? `Fitment: ${part.compatibleVehicles}` : "High-performance motorsport upgrade component.")}
                    </p>
                  </div>

                  {/* Controls block (FULL INTERACTIVE CONTROLS AS REQUESTED) */}
                  <div className="pt-2 border-t border-stone-900/10 flex flex-wrap gap-1.5">
                    {/* View Button (Opens Dossier Modal at origin) */}
                    <button
                      onClick={(e) => openDossierWithOrigin(part, "overview", e)}
                      className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-[10px] font-bold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition text-stone-800"
                      title="Examine Part Dossier Overview"
                    >
                      <Eye className="w-3 h-3 text-stone-700" />
                      View
                    </button>

                    {/* Edit Spec Button */}
                    <button
                      onClick={() => {
                        playSynthBeep(900, 0.05);
                        handleOpenEdit(part);
                      }}
                      className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 border border-amber-500 text-stone-950 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition"
                      title="Calibrate Hardware Specifications"
                    >
                      <Wrench className="w-3 h-3 text-stone-950" />
                      Edit Spec
                    </button>

                    {/* Control Tab Shortcut Button */}
                    <button
                      onClick={(e) => openDossierWithOrigin(part, "control", e)}
                      className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-900 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition"
                      title="Open Part Control Tab"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Control Tab
                    </button>

                    {part.isUserListing && part.listingId ? (
                      <>
                        {/* Approve / Unapprove */}
                        <button
                          onClick={() => handleToggleUserListingApproval(part)}
                          className={`px-2 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-0.5 font-mono transition ${
                            part.status === "pending" || !part.status
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                              : "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
                          }`}
                          title={part.status === "pending" ? "Approve the part for public catalog" : "Mark as pending / hide from buyers"}
                        >
                          {part.status === "pending" || !part.status ? (
                            <>
                              <Check className="w-3 h-3" />
                              Approve
                            </>
                          ) : (
                            "Unapprove"
                          )}
                        </button>

                        {/* Hide / Unhide */}
                        <button
                          onClick={() => handleToggleUserListingHide(part)}
                          className={`px-2 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                            part.status === "hidden"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                              : "bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                          }`}
                          title={part.status === "hidden" ? "Unhide part and make active" : "Hide part from public view"}
                        >
                          <EyeOff className="w-3 h-3" />
                          {part.status === "hidden" ? "Unhide" : "Hide"}
                        </button>

                        {/* Verify */}
                        <button
                          onClick={() => handleToggleUserPartVerified(part)}
                          className={`px-2 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                            part.badge === "verified"
                              ? "bg-purple-700 text-white border-purple-800"
                              : "bg-[#FAF8F5] hover:bg-purple-50 border-stone-300 text-stone-700"
                          }`}
                        >
                          <CheckCircle className={`w-3.5 h-3.5 ${part.badge === "verified" ? "text-purple-300 fill-purple-300/20" : "text-stone-400"}`} />
                          <span>{part.badge === "verified" ? "Verified" : "Verify"}</span>
                        </button>

                        {/* Feature */}
                        <button
                          onClick={() => handleToggleUserPartFeatured(part)}
                          className={`px-2 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                            part.badge === "premium"
                              ? "bg-amber-400 border-amber-600 text-stone-950 font-bold"
                              : "bg-[#FAF8F5] hover:bg-amber-50 border-stone-300 text-stone-700"
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          {part.badge === "premium" ? "★ Featured" : "☆ Feature"}
                        </button>

                        {/* Hot Deal */}
                        <button
                          onClick={() => handleToggleUserPartUrgent(part)}
                          className={`px-2 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                            part.badge === "hot"
                              ? "bg-red-600 border-red-700 text-white"
                              : "bg-[#FAF8F5] hover:bg-red-50 border-stone-300 text-stone-600"
                          }`}
                        >
                          Hot Deal
                        </button>

                        {/* Home Pin */}
                        <button
                          onClick={() => handleToggleFeaturedHome(`user-${part.listingId}`)}
                          className={`px-2 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                            isHomeFeatured
                              ? "bg-[#D97706] text-white border-[#B45309]"
                              : "bg-[#FAF8F5] hover:bg-stone-100 border-stone-300 text-stone-700"
                          }`}
                        >
                          <span className="text-[11px]">🏠</span>
                          {isHomeFeatured ? "Pinned" : "Pin Home"}
                        </button>

                        {/* Remove */}
                        <button
                          onClick={() => handleDeleteUserPart(part.listingId!)}
                          className="px-2 py-1.5 bg-red-50 hover:bg-red-100 border border-red-300 text-red-600 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono ml-auto transition"
                        >
                          <Trash2 className="w-3 h-3.5" />
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Verify for Default */}
                        <button
                          onClick={() => handleToggleDefaultBadge(part.id, "verified")}
                          className={`px-2 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                            part.badge === "verified"
                              ? "bg-purple-700 text-white border-purple-800"
                              : "bg-[#FAF8F5] hover:bg-purple-50 border-stone-300 text-stone-700"
                          }`}
                        >
                          <CheckCircle className={`w-3.5 h-3.5 ${part.badge === "verified" ? "text-purple-300 fill-purple-300/20" : "text-stone-400"}`} />
                          <span>{part.badge === "verified" ? "Verified" : "Verify"}</span>
                        </button>

                        {/* Feature for Default */}
                        <button
                          onClick={() => handleToggleDefaultBadge(part.id, "premium")}
                          className={`px-2 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                            part.badge === "premium"
                              ? "bg-amber-400 border-amber-600 text-stone-950 font-bold"
                              : "bg-[#FAF8F5] hover:bg-amber-50 border-stone-300 text-stone-700"
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          {part.badge === "premium" ? "★ Featured" : "☆ Feature"}
                        </button>

                        {/* Hot Deal for Default */}
                        <button
                          onClick={() => handleToggleDefaultBadge(part.id, "hot")}
                          className={`px-2 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                            part.badge === "hot"
                              ? "bg-red-600 border-red-700 text-white"
                              : "bg-[#FAF8F5] hover:bg-red-50 border-stone-300 text-stone-600"
                          }`}
                        >
                          Hot Deal
                        </button>

                        {/* Home Pin for Default */}
                        <button
                          onClick={() => handleToggleFeaturedHome(`default-${part.id}`)}
                          className={`px-2 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition ${
                            isHomeFeatured
                              ? "bg-[#D97706] text-white border-[#B45309]"
                              : "bg-[#FAF8F5] hover:bg-stone-100 border-stone-300 text-stone-700"
                          }`}
                        >
                          <span className="text-[11px]">🏠</span>
                          {isHomeFeatured ? "Pinned" : "Pin Home"}
                        </button>

                        {/* Restore / Hide for Default */}
                        <button
                          onClick={() => handleToggleHideDefault(part.id)}
                          className={`px-2 py-1.5 border text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono ml-auto transition ${
                            isHidden
                              ? "bg-green-100 hover:bg-green-200 text-green-900 border-green-300"
                              : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                          }`}
                        >
                          {isHidden ? "Restore" : "Hide"}
                        </button>

                        {/* Remove for Default */}
                        <button
                          onClick={() => handleRemoveDefaultPart(part.id)}
                          className="px-2 py-1.5 bg-red-50 hover:bg-red-100 border border-red-300 text-red-600 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center gap-1 font-mono transition"
                          title="Archive hardware item"
                        >
                          <Trash2 className="w-3 h-3.5" />
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
      </>
      )}

      {/* 7. FULL PART DOSSIER MODAL WITH TABS & CONTROL DESK */}
      {activeDossierPart && (
        <PartDossierModal
          part={activeDossierPart}
          initialTab={dossierInitialTab}
          clickCoordinates={dossierClickCoords}
          currentUser={currentUser}
          isAdmin={true}
          onClose={() => setActiveDossierPart(null)}
          onPartUpdated={() => {
            // refresh event
          }}
        />
      )}

      {/* 8. EDIT PART SPEC MODAL */}
      {editingPart && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans" id="admin-edit-part-modal">
          <div 
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs transition-opacity"
            onClick={() => setEditingPart(null)}
          />
          <div className="min-h-full w-full flex items-center justify-center p-3 sm:p-6 pointer-events-none">
            <div className="relative z-10 my-auto pointer-events-auto bg-[#FAF8F5] border-2 border-stone-950 max-w-xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between border-b-2 border-stone-950 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block">
                    CALIBRATION DESK
                  </span>
                  <h3 className="text-lg font-serif font-black text-stone-950 uppercase">
                    Edit Performance Part Specifications
                  </h3>
                </div>
                <button
                  onClick={() => setEditingPart(null)}
                  className="p-1.5 text-stone-500 hover:text-stone-950 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 font-sans text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Hardware Title *</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Brand *</label>
                    <input
                      type="text"
                      value={editBrand}
                      onChange={(e) => setEditBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Price (₹ INR) *</label>
                    <input
                      type="text"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none"
                    >
                      {PART_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Rarity</label>
                    <select
                      value={editRarity}
                      onChange={(e) => setEditRarity(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none"
                    >
                      <option value="Common">Common</option>
                      <option value="Uncommon">Uncommon</option>
                      <option value="Rare">Rare</option>
                      <option value="Epic">Epic</option>
                      <option value="Legendary">Legendary</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Compatible Chassis / Fitment</label>
                  <input
                    type="text"
                    value={editFitment}
                    onChange={(e) => setEditFitment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Image URL</label>
                  <input
                    type="text"
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Description</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-300">
                <button
                  type="button"
                  onClick={() => setEditingPart(null)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-6 py-2 bg-stone-950 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isSaving ? "Saving Specs..." : "Save Calibration"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
