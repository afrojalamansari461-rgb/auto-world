import React, { useState, useEffect } from "react";
import { 
  X, ShieldCheck, Star, Sparkles, MapPin, Phone, Mail, 
  MessageCircle, Copy, Check, Wrench, Cpu, Zap, Flame, Disc, 
  Layers, Sliders, Activity, Wind, Lightbulb, Share2, Info, 
  ExternalLink, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle, Trash2,
  Lock, Eye, EyeOff, Save, ArrowLeft, CheckCircle, Home, Plus, Image as ImageIcon,
  Edit2, Upload, ArrowUp, ArrowDown
} from "lucide-react";
import { Part, PART_RARITY_TIERS, PART_CONDITION_LABELS, PART_CATEGORIES } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { saveAdminSettingsToFirestore, loadAdminSettingsFromFirestore, savePartOverride } from "../lib/catalogSync";

interface PartDossierModalProps {
  part: Part | null;
  onClose: () => void;
  currentUser?: any;
  isAdmin?: boolean;
  onPartUpdated?: () => void;
  initialTab?: "overview" | "gallery" | "specs" | "contact" | "control";
  clickCoordinates?: { x: number; y: number } | null;
  hasPaidPass?: boolean;
  onRequestPass?: () => void;
}

export const MOTORSPORT_IMAGE_PRESETS = [
  { label: "Twin Turbocharger Unit", category: "turbo", url: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80" },
  { label: "Titanium Valved Exhaust", category: "exhaust", url: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80" },
  { label: "Carbon Swan-Neck GT Wing", category: "spoiler", url: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80" },
  { label: "BBS Forged Centerlock Wheels", category: "wheels", url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80" },
  { label: "Cosworth Billet Race Engine", category: "engine", url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80" },
  { label: "NOS Nitrous Oxide Bottle", category: "nitro", url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80" },
  { label: "Laser Diode Matrix Headlight", category: "headlight", url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80" },
  { label: "Öhlins TTX Track Coilovers", category: "suspension", url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80" },
  { label: "Carbon Ceramic BBK Brakes", category: "brakes", url: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80" }
];

export default function PartDossierModal({
  part,
  onClose,
  currentUser,
  isAdmin = false, // Strictly default to false for security
  onPartUpdated,
  initialTab = "overview",
  clickCoordinates,
  hasPaidPass = false,
  onRequestPass
}: PartDossierModalProps) {
  // Check whether the logged-in user is the verified owner or an authorized administrator
  const isAuthorizedAdmin = Boolean(
    isAdmin === true ||
    (currentUser?.email && currentUser.email.toLowerCase() === "afrojalamansari461@gmail.com") ||
    (currentUser?.role && ["owner", "co-owner", "super admin", "inventory manager", "admin"].includes(String(currentUser.role).toLowerCase()))
  );

  const [activeTab, setActiveTab] = useState<"overview" | "gallery" | "specs" | "contact" | "control">(
    initialTab === "control" && !isAuthorizedAdmin ? "overview" : initialTab
  );
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adminStatusMessage, setAdminStatusMessage] = useState("");
  const [isSavingSpec, setIsSavingSpec] = useState(false);

  // Edit Spec State inside the Control Tab
  const [editTitle, setEditTitle] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editCategory, setEditCategory] = useState("turbochargers");
  const [editRarity, setEditRarity] = useState<"Common" | "Uncommon" | "Rare" | "Epic" | "Legendary">("Rare");
  const [editCondition, setEditCondition] = useState(5);
  const [editPrice, setEditPrice] = useState("");
  const [editFitment, setEditFitment] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPartNumber, setEditPartNumber] = useState("");
  const [editWarranty, setEditWarranty] = useState("");
  const [editImage, setEditImage] = useState("");
  
  // Interactive Multi-Image Gallery State
  const [editPhotos, setEditPhotos] = useState<{ src: string; alt?: string }[]>([]);
  const [newPhotoUrlInput, setNewPhotoUrlInput] = useState("");
  const [bulkPhotoUrlsInput, setBulkPhotoUrlsInput] = useState("");
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
  const [editingPhotoValue, setEditingPhotoValue] = useState("");

  // Pinned Homepage status state
  const [isPinnedHome, setIsPinnedHome] = useState(false);

  useEffect(() => {
    if (part) {
      setEditTitle(part.title || "");
      setEditBrand(part.brand || "");
      setEditCategory(part.category || "turbochargers");
      setEditRarity((part.rarity as any) || "Rare");
      setEditCondition(part.condition || 5);
      setEditPrice(String(part.price || ""));
      setEditFitment(part.compatibleVehicles || "");
      setEditDescription(part.description || "");
      setEditPartNumber(part.partNumber || "");
      setEditWarranty(part.warranty || "");
      
      const initialPhotos: { src: string; alt?: string }[] = 
        part.photos && part.photos.length > 0 
          ? [...part.photos] 
          : (part.image ? [{ src: part.image, alt: part.title }] : [{ src: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800", alt: part.title }]);
      
      setEditPhotos(initialPhotos);
      setEditImage(initialPhotos[0]?.src || part.image || "");

      // Check if pinned on homepage
      const partKey = `${part.isUserListing ? "user" : "default"}-${part.isUserListing ? part.listingId : part.id}`;
      try {
        const storedPinned = localStorage.getItem("autoworld_home_featured_parts");
        if (storedPinned) {
          const list = JSON.parse(storedPinned);
          setIsPinnedHome(
            list.includes(partKey) || 
            list.includes(String(part.id)) || 
            list.includes(`default-${part.id}`) || 
            list.includes(`user-${part.listingId}`)
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [part]);

  useEffect(() => {
    if (initialTab === "control" && !isAuthorizedAdmin) {
      setActiveTab("overview");
    } else {
      setActiveTab(initialTab);
    }
  }, [initialTab, isAuthorizedAdmin]);

  // If a non-admin somehow switches to control, redirect to overview
  useEffect(() => {
    if (activeTab === "control" && !isAuthorizedAdmin) {
      setActiveTab("overview");
    }
  }, [activeTab, isAuthorizedAdmin]);

  if (!part) return null;

  const rarityInfo = PART_RARITY_TIERS[part.rarity] || PART_RARITY_TIERS.Common;
  const conditionInfo = PART_CONDITION_LABELS[part.condition] || PART_CONDITION_LABELS[5];
  
  // Aggregate photos
  const photosList: string[] = [];
  if (part.photos && part.photos.length > 0) {
    part.photos.forEach(p => photosList.push(p.src));
  }
  if (photosList.length === 0 && part.image) {
    photosList.push(part.image);
  }
  if (photosList.length === 0) {
    photosList.push("https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800");
  }

  const categoryMeta = PART_CATEGORIES.find(c => c.id === part.category);

  const handleCopyRef = () => {
    const refCode = `PART-AW0${part.id}`;
    navigator.clipboard.writeText(refCode);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const getWhatsAppUrl = () => {
    const cleanPhone = (part.sellerPhone || "+919820011988").replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(
      `Hello ${part.sellerName || "Seller"}, I am inquiring about the "${part.title}" (Ref #PART-AW0${part.id}, ₹${part.price.toLocaleString("en-IN")}) listed on Auto World Motorsport Marketplace. Is this item still available and ready for immediate dispatch?`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  // --- Control Actions ---
  const handleToggleVerified = async () => {
    try {
      if (part.isUserListing && part.listingId) {
        const nextVal = part.badge !== "verified";
        await updateDoc(doc(db, "parts", part.listingId), { verified: nextVal });
        setAdminStatusMessage(nextVal ? "Awarded Verified Badge!" : "Removed Verified Badge");
      } else {
        const adminSettings = await loadAdminSettingsFromFirestore();
        const currentBadges = { ...(adminSettings.partBadges || {}) };
        const isCurrent = currentBadges[String(part.id)] === "verified";
        if (isCurrent) {
          delete currentBadges[String(part.id)];
          setAdminStatusMessage("Removed Verified Badge from catalog");
        } else {
          currentBadges[String(part.id)] = "verified";
          setAdminStatusMessage("Awarded Verified Badge to factory component!");
        }
        await saveAdminSettingsToFirestore({ partBadges: currentBadges });
      }
      setTimeout(() => setAdminStatusMessage(""), 3500);
      if (onPartUpdated) onPartUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFeatured = async () => {
    try {
      if (part.isUserListing && part.listingId) {
        const nextVal = part.badge !== "premium";
        await updateDoc(doc(db, "parts", part.listingId), { featured: nextVal });
        setAdminStatusMessage(nextVal ? "Marked as Featured Hardware!" : "Removed Featured Status");
      } else {
        const adminSettings = await loadAdminSettingsFromFirestore();
        const currentBadges = { ...(adminSettings.partBadges || {}) };
        const isCurrent = currentBadges[String(part.id)] === "premium";
        if (isCurrent) {
          delete currentBadges[String(part.id)];
          setAdminStatusMessage("Removed Featured Flag");
        } else {
          currentBadges[String(part.id)] = "premium";
          setAdminStatusMessage("Flagged as Featured Component!");
        }
        await saveAdminSettingsToFirestore({ partBadges: currentBadges });
      }
      setTimeout(() => setAdminStatusMessage(""), 3500);
      if (onPartUpdated) onPartUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleHotDeal = async () => {
    try {
      if (part.isUserListing && part.listingId) {
        const nextVal = part.badge !== "hot";
        await updateDoc(doc(db, "parts", part.listingId), { urgent: nextVal });
        setAdminStatusMessage(nextVal ? "Tagged as Hot Deal!" : "Removed Hot Deal Tag");
      } else {
        const adminSettings = await loadAdminSettingsFromFirestore();
        const currentBadges = { ...(adminSettings.partBadges || {}) };
        const isCurrent = currentBadges[String(part.id)] === "hot";
        if (isCurrent) {
          delete currentBadges[String(part.id)];
          setAdminStatusMessage("Removed Hot Deal Tag");
        } else {
          currentBadges[String(part.id)] = "hot";
          setAdminStatusMessage("Tagged as Hot Deal!");
        }
        await saveAdminSettingsToFirestore({ partBadges: currentBadges });
      }
      setTimeout(() => setAdminStatusMessage(""), 3500);
      if (onPartUpdated) onPartUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleApproval = async () => {
    if (!part.isUserListing || !part.listingId) {
      setAdminStatusMessage("Factory catalog parts are permanently approved.");
      setTimeout(() => setAdminStatusMessage(""), 3000);
      return;
    }
    const isPending = part.status === "pending" || !part.status;
    const nextStatus = isPending ? "active" : "pending";
    try {
      await updateDoc(doc(db, "parts", part.listingId), { status: nextStatus });
      setAdminStatusMessage(nextStatus === "active" ? "Approved for Public Marketplace!" : "Moved to Pending Review Hold");
      setTimeout(() => setAdminStatusMessage(""), 3500);
      if (onPartUpdated) onPartUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleHide = async () => {
    try {
      if (part.isUserListing && part.listingId) {
        const nextStatus = part.status === "hidden" ? "active" : "hidden";
        await updateDoc(doc(db, "parts", part.listingId), { status: nextStatus });
        setAdminStatusMessage(nextStatus === "hidden" ? "Hidden from public catalog." : "Unhidden and live in catalog!");
      } else {
        const numId = typeof part.id === "number" ? part.id : parseInt(part.id as string);
        const stored = localStorage.getItem("autoWorld_hidden_parts") || "[]";
        let list: number[] = JSON.parse(stored);
        if (list.includes(numId)) {
          list = list.filter(id => id !== numId);
          setAdminStatusMessage("Restored part to public catalog!");
        } else {
          list.push(numId);
          setAdminStatusMessage("Archived / Hidden part from marketplace.");
        }
        localStorage.setItem("autoWorld_hidden_parts", JSON.stringify(list));
        await saveAdminSettingsToFirestore({ hiddenPartIds: list });
        window.dispatchEvent(new Event("autoWorld_db_update"));
      }
      setTimeout(() => setAdminStatusMessage(""), 3500);
      if (onPartUpdated) onPartUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePinHome = async () => {
    const partKey = `${part.isUserListing ? "user" : "default"}-${part.isUserListing ? part.listingId : part.id}`;
    try {
      const stored = localStorage.getItem("autoworld_home_featured_parts");
      let list: string[] = stored ? JSON.parse(stored) : ["1", "2", "3"];
      const isAlready = list.includes(partKey) || list.includes(String(part.id)) || list.includes(`default-${part.id}`) || list.includes(`user-${part.listingId}`);
      
      let nextList: string[];
      if (isAlready) {
        nextList = list.filter(id => id !== partKey && id !== String(part.id) && id !== `default-${part.id}` && id !== `user-${part.listingId}`);
        setIsPinnedHome(false);
        setAdminStatusMessage("Unpinned from Homepage Showcase");
      } else {
        nextList = [partKey, ...list.filter(id => id !== partKey)].slice(0, 6);
        setIsPinnedHome(true);
        setAdminStatusMessage("📌 Pinned to Homepage Showcase!");
      }
      localStorage.setItem("autoworld_home_featured_parts", JSON.stringify(nextList));
      await saveAdminSettingsToFirestore({ homeFeaturedPartIds: nextList });
      window.dispatchEvent(new Event("autoWorld_db_update"));
      setTimeout(() => setAdminStatusMessage(""), 3500);
      if (onPartUpdated) onPartUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  // Photo Studio Handlers
  const handleSetPrimaryPhoto = (index: number) => {
    if (index === 0 || index >= editPhotos.length) return;
    const selected = editPhotos[index];
    const rest = editPhotos.filter((_, i) => i !== index);
    const newPhotos = [selected, ...rest];
    setEditPhotos(newPhotos);
    setEditImage(selected.src);
    setAdminStatusMessage(`Set photo #${index + 1} as Primary Cover`);
    setTimeout(() => setAdminStatusMessage(""), 2500);
  };

  const handleMovePhoto = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= editPhotos.length) return;
    const newPhotos = [...editPhotos];
    const [moved] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, moved);
    setEditPhotos(newPhotos);
    if (toIndex === 0 || fromIndex === 0) {
      setEditImage(newPhotos[0].src);
    }
  };

  const handleRemovePhoto = (index: number) => {
    if (editPhotos.length <= 1) {
      setAdminStatusMessage("Hardware must have at least 1 primary photograph.");
      setTimeout(() => setAdminStatusMessage(""), 3000);
      return;
    }
    const newPhotos = editPhotos.filter((_, i) => i !== index);
    setEditPhotos(newPhotos);
    if (index === 0 && newPhotos.length > 0) {
      setEditImage(newPhotos[0].src);
    }
    setAdminStatusMessage("Photograph removed from hardware gallery.");
    setTimeout(() => setAdminStatusMessage(""), 2500);
  };

  const handleAddSinglePhoto = () => {
    const url = newPhotoUrlInput.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:image")) {
      setAdminStatusMessage("Please enter a valid HTTP/HTTPS image URL");
      setTimeout(() => setAdminStatusMessage(""), 3000);
      return;
    }
    const newPhotos = [...editPhotos, { src: url, alt: editTitle || part.title }];
    setEditPhotos(newPhotos);
    setNewPhotoUrlInput("");
    setAdminStatusMessage("Added new photograph to hardware gallery!");
    setTimeout(() => setAdminStatusMessage(""), 2500);
  };

  const handleAddPresetPhoto = (preset: { label: string; url: string }) => {
    const isAlready = editPhotos.some(p => p.src === preset.url);
    if (isAlready) {
      setAdminStatusMessage("Preset photograph is already in the gallery.");
      setTimeout(() => setAdminStatusMessage(""), 2500);
      return;
    }
    const newPhotos = [...editPhotos, { src: preset.url, alt: preset.label }];
    setEditPhotos(newPhotos);
    setAdminStatusMessage(`Added "${preset.label}" photograph to gallery!`);
    setTimeout(() => setAdminStatusMessage(""), 2500);
  };

  const handleAddBulkPhotos = () => {
    if (!bulkPhotoUrlsInput.trim()) return;
    const lines = bulkPhotoUrlsInput
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:image"));
    if (lines.length === 0) {
      setAdminStatusMessage("No valid image URLs detected.");
      setTimeout(() => setAdminStatusMessage(""), 3000);
      return;
    }
    const additional = lines.map(src => ({ src, alt: editTitle || part.title }));
    const newPhotos = [...editPhotos, ...additional];
    setEditPhotos(newPhotos);
    setBulkPhotoUrlsInput("");
    setShowBulkInput(false);
    setAdminStatusMessage(`Added ${additional.length} photographs to gallery!`);
    setTimeout(() => setAdminStatusMessage(""), 3000);
  };

  const handleSaveEditedPhotoUrl = (index: number) => {
    if (!editingPhotoValue.trim()) return;
    const newPhotos = [...editPhotos];
    newPhotos[index] = { ...newPhotos[index], src: editingPhotoValue.trim() };
    setEditPhotos(newPhotos);
    if (index === 0) {
      setEditImage(editingPhotoValue.trim());
    }
    setEditingPhotoIndex(null);
    setEditingPhotoValue("");
    setAdminStatusMessage("Updated photo URL.");
    setTimeout(() => setAdminStatusMessage(""), 2500);
  };

  const handleSaveSpecForm = async () => {
    if (!isAuthorizedAdmin) {
      setAdminStatusMessage("Unauthorized: Admin clearance required.");
      setTimeout(() => setAdminStatusMessage(""), 3000);
      return;
    }
    setIsSavingSpec(true);
    const numPrice = parseInt(editPrice.replace(/[^0-9]/g, "")) || part.price;
    const finalPhotos = editPhotos.length > 0
      ? editPhotos
      : (editImage.trim() ? [{ src: editImage.trim(), alt: editTitle || part.title }] : []);
    const primaryCover = editImage.trim() || finalPhotos[0]?.src || part.image;

    const payload: Partial<Part> = {
      title: editTitle.trim() || part.title,
      brand: editBrand.trim() || part.brand,
      category: editCategory.trim() || part.category,
      rarity: editRarity,
      condition: editCondition,
      price: numPrice,
      compatibleVehicles: editFitment.trim() || part.compatibleVehicles,
      description: editDescription.trim() || part.description,
      partNumber: editPartNumber.trim() || part.partNumber,
      warranty: editWarranty.trim() || part.warranty,
      image: primaryCover,
      photos: finalPhotos
    };

    try {
      if (part.isUserListing && part.listingId) {
        await updateDoc(doc(db, "parts", part.listingId), payload);
      } else {
        await savePartOverride(part.id, payload);
      }
      setAdminStatusMessage("Hardware specifications & image gallery committed!");
      setTimeout(() => setAdminStatusMessage(""), 3500);
      if (onPartUpdated) onPartUpdated();
    } catch (e) {
      console.error("Failed to save spec:", e);
      setAdminStatusMessage("Error updating hardware specs.");
    } finally {
      setIsSavingSpec(false);
    }
  };

  const handleAdminDelete = async () => {
    if (!window.confirm("Permanently scrub this performance hardware item from the database?")) return;
    setIsDeleting(true);
    try {
      if (part.isUserListing && part.listingId) {
        await deleteDoc(doc(db, "parts", part.listingId));
      } else {
        const numId = typeof part.id === "number" ? part.id : parseInt(part.id as string);
        const stored = localStorage.getItem("autoWorld_hidden_parts") || "[]";
        const list: number[] = JSON.parse(stored);
        if (!list.includes(numId)) {
          list.push(numId);
          localStorage.setItem("autoWorld_hidden_parts", JSON.stringify(list));
        }
        await saveAdminSettingsToFirestore({ hiddenPartIds: list });
        window.dispatchEvent(new Event("autoWorld_db_update"));
      }
      if (onPartUpdated) onPartUpdated();
      onClose();
    } catch (e) {
      console.error("Failed to delete part:", e);
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-stone-950/85 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 20 }}
          transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.85 }}
          style={
            clickCoordinates
              ? {
                  transformOrigin: `${clickCoordinates.x}px ${clickCoordinates.y}px`,
                }
              : undefined
          }
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl bg-[#FAF8F5] text-[#1A1A1A] rounded-xl shadow-2xl border-2 border-stone-950 overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans"
        >
          {/* Top Dossier Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b-2 border-stone-950 bg-[#F4F1EA] gap-3 shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-700 font-extrabold">
                MOTORSPORT HARDWARE DOSSIER • REF #PART-AW0{part.id}
              </span>
              <span className={`px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded border ${rarityInfo.badgeClass}`}>
                {part.rarity} TIER
              </span>
              {part.badge && (
                <span className="px-2 py-0.5 text-[9px] font-mono font-extrabold uppercase tracking-wider bg-amber-400 text-stone-950 border border-amber-600 rounded">
                  [ {part.badge.toUpperCase()} ]
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {adminStatusMessage && (
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded border border-emerald-300 animate-pulse">
                  {adminStatusMessage}
                </span>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded bg-white hover:bg-stone-200 border border-stone-400 text-stone-700 hover:text-stone-950 transition cursor-pointer"
                title="Close Dossier"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-Navigation Tabs Bar */}
          <div className="px-6 py-2.5 bg-stone-950 text-stone-100 flex items-center justify-between flex-wrap gap-2 shrink-0 border-b border-stone-800">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "overview"
                    ? "bg-amber-400 text-stone-950 shadow-sm"
                    : "text-stone-300 hover:text-white hover:bg-stone-800"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Overview
              </button>

              <button
                onClick={() => setActiveTab("gallery")}
                className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "gallery"
                    ? "bg-amber-400 text-stone-950 shadow-sm"
                    : "text-stone-300 hover:text-white hover:bg-stone-800"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Gallery ({photosList.length})
              </button>

              <button
                onClick={() => setActiveTab("specs")}
                className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "specs"
                    ? "bg-amber-400 text-stone-950 shadow-sm"
                    : "text-stone-300 hover:text-white hover:bg-stone-800"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Technical Specs
              </button>

              <button
                onClick={() => setActiveTab("contact")}
                className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "contact"
                    ? "bg-amber-400 text-stone-950 shadow-sm"
                    : "text-stone-300 hover:text-white hover:bg-stone-800"
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                Merchant & Contact
              </button>

              {/* CONTROL TAB (RESTRICTED: ONLY RENDERED FOR VERIFIED ADMIN/OWNER) */}
              {isAuthorizedAdmin && (
                <button
                  onClick={() => setActiveTab("control")}
                  className={`px-3.5 py-1.5 text-xs font-mono font-extrabold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "control"
                      ? "bg-amber-400 text-stone-950 ring-2 ring-amber-300"
                      : "text-amber-400 hover:text-white hover:bg-stone-800 border border-amber-500/40"
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-500" />
                  <span>Control Tab</span>
                  <span className="px-1 py-0.5 bg-amber-500/20 text-[9px] text-amber-300 rounded border border-amber-500/30">
                    Admin
                  </span>
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-stone-400">
              <span>VALUATION:</span>
              <strong className="text-amber-400 text-xs">₹{part.price.toLocaleString("en-IN")} INR</strong>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-6">
            
            {/* 1. OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-6 font-sans">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Media Showcase on Left */}
                  <div className="lg:col-span-6 space-y-3">
                    <div className="relative h-72 sm:h-80 w-full rounded-lg overflow-hidden bg-stone-900 border-2 border-stone-900 shadow-md group">
                      <img
                        src={photosList[activePhotoIndex]}
                        alt={part.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800";
                        }}
                      />
                      
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        <span className={`px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded border ${rarityInfo.badgeClass}`}>
                          {part.rarity}
                        </span>
                        {part.badge === "verified" && (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            Accredited
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-stone-950/80 text-stone-200 text-[9px] font-mono uppercase tracking-widest rounded border border-stone-700">
                        {part.category.replace("_", " ")}
                      </div>

                      {photosList.length > 1 && (
                        <>
                          <button
                            onClick={() => setActivePhotoIndex(prev => prev === 0 ? photosList.length - 1 : prev - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-stone-950/80 hover:bg-stone-900 text-white rounded-full transition cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setActivePhotoIndex(prev => prev === photosList.length - 1 ? 0 : prev + 1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-stone-950/80 hover:bg-stone-900 text-white rounded-full transition cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Thumbnail Strip */}
                    {photosList.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {photosList.map((src, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActivePhotoIndex(idx)}
                            className={`w-16 h-16 rounded border-2 overflow-hidden shrink-0 transition ${
                              activePhotoIndex === idx ? "border-amber-500 ring-2 ring-amber-400/40 scale-105" : "border-stone-300 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={src} alt="thumbnail" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Spec Sheet on Right */}
                  <div className="lg:col-span-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 font-extrabold">
                          {part.brand || "OEM PERFORMANCE"}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= part.condition ? "text-amber-500 fill-amber-500" : "text-stone-300"
                              }`}
                            />
                          ))}
                          <span className="text-xs font-mono text-stone-600 ml-1.5 font-bold">
                            {part.condition}/5
                          </span>
                        </div>
                      </div>

                      <h2 className="text-2xl font-serif font-black text-stone-950 uppercase mt-1 leading-tight">
                        {part.title}
                      </h2>

                      <div className="mt-3 flex items-baseline gap-3">
                        <span className="text-3xl font-serif font-black text-stone-950">
                          ₹{part.price.toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs font-mono text-stone-500 uppercase font-bold">
                          INR Valuation
                        </span>
                      </div>
                    </div>

                    {/* Quick Specs Matrix */}
                    <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-[#F4F1EA] border border-stone-300 rounded text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase block">Category:</span>
                        <strong className="text-stone-900 uppercase font-bold">{part.category.replace("_", " ")}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase block">Condition Rating:</span>
                        <strong className="text-stone-900 font-bold">{conditionInfo.title}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase block">Part Number / SKU:</span>
                        <strong className="text-stone-900 font-bold">{part.partNumber || `AW-P-${part.id}`}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase block">Warranty / Guarantee:</span>
                        <strong className="text-stone-900 font-bold">{part.warranty || "Standard 6-Month Track Warranty"}</strong>
                      </div>
                    </div>

                    {/* Fitment Box */}
                    <div className="p-3 bg-white border border-stone-300 rounded text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-stone-600">
                        <Wrench className="w-3.5 h-3.5 text-amber-600" />
                        <span>Target Fitment & Chassis Matrix</span>
                      </div>
                      <p className="font-mono text-stone-900 font-semibold pl-5">
                        {part.compatibleVehicles || "Universal High-Performance Application"}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {hasPaidPass || isAuthorizedAdmin ? (
                        <a
                          href={getWhatsAppUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp Seller</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (onRequestPass) {
                              onRequestPass();
                            }
                          }}
                          className="py-3 bg-stone-900 hover:bg-stone-850 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition shadow-sm border border-amber-500/40 cursor-pointer"
                        >
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>Unlock Seller (₹1)</span>
                        </button>
                      )}

                      <button
                        onClick={handleCopyRef}
                        className="py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition"
                      >
                        {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedRef ? "Reference Copied!" : "Copy Reference"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description Narrative */}
                <div className="space-y-2 pt-4 border-t border-stone-300">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-800">
                    Engineering Breakdown & Narrative
                  </h3>
                  <div className="p-4 bg-white border border-stone-300 rounded text-xs text-stone-700 leading-relaxed font-sans whitespace-pre-line">
                    {part.description || "High-performance aftermarket component designed for extreme motorsport tolerance and street performance."}
                  </div>
                </div>
              </div>
            )}

            {/* 2. GALLERY TAB */}
            {activeTab === "gallery" && (
              <div className="space-y-6 font-sans">
                <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block">
                      MEDIA VAULT & INSPECTION HIGH-RES
                    </span>
                    <h3 className="text-lg font-serif font-black text-stone-950 uppercase">
                      Component Photographic Records
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-stone-500 font-bold">
                    {photosList.length} Photographic Angle{photosList.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {photosList.map((photo, idx) => (
                    <div key={idx} className="bg-stone-900 border-2 border-stone-900 rounded overflow-hidden group relative">
                      <div className="aspect-video">
                        <img 
                          src={photo} 
                          alt={`${part.title} shot ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                      <div className="p-2.5 bg-stone-950 text-stone-300 text-[10px] font-mono flex items-center justify-between">
                        <span>Shot #{idx + 1}</span>
                        <span className="text-amber-400 font-bold">Auto World Verified</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-[#F4F1EA] border border-stone-300 rounded flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-stone-700 space-y-1">
                    <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">Audit Certified Media Vault</h4>
                    <p className="text-[10px] text-stone-600 leading-relaxed font-mono">
                      Each photograph uploaded for Ref #PART-AW0{part.id} has undergone geometric aspect analysis and timestamp verification.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. TECHNICAL SPECS TAB */}
            {activeTab === "specs" && (
              <div className="space-y-6 font-sans">
                <div className="border-b border-stone-300 pb-3">
                  <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block">
                    ENGINEERING & DYNO CALIBRATION
                  </span>
                  <h3 className="text-lg font-serif font-black text-stone-950 uppercase">
                    Technical Specifications
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-stone-300 rounded space-y-3">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5 border-b border-stone-200 pb-2">
                      <Cpu className="w-4 h-4 text-amber-600" />
                      Core Mechanical Attributes
                    </h4>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500">Manufacturer / Brand:</span>
                        <span className="font-bold text-stone-900">{part.brand || "OEM Factory"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500">Category Classification:</span>
                        <span className="font-bold text-stone-900 uppercase">{part.category.replace("_", " ")}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500">Rarity Classification:</span>
                        <span className="font-bold text-amber-700 uppercase">{part.rarity}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500">Physical Condition:</span>
                        <span className="font-bold text-stone-900">{conditionInfo.title} ({part.condition}/5)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-stone-500">SKU / Serial Index:</span>
                        <span className="font-bold text-stone-900">{part.partNumber || `AW-P-${part.id}`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-stone-300 rounded space-y-3">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5 border-b border-stone-200 pb-2">
                      <Wrench className="w-4 h-4 text-amber-600" />
                      Fitment & Warranty Clearance
                    </h4>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500">Warranty Coverage:</span>
                        <span className="font-bold text-emerald-700">{part.warranty || "6-Month Manufacturer Backed"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500">Inspection Status:</span>
                        <span className="font-bold text-stone-900">Passed Level 3 Mechanical Check</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500">Origin / Sourcing:</span>
                        <span className="font-bold text-stone-900">{part.isUserListing ? "Community Tuner Vault" : "Direct OEM Distributor"}</span>
                      </div>
                      <div className="pt-2">
                        <span className="text-stone-500 block text-[10px] uppercase">Chassis Compatibility:</span>
                        <p className="font-bold text-stone-900 mt-1">{part.compatibleVehicles || "Universal Specification"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {part.specifications && Object.keys(part.specifications).length > 0 && (
                  <div className="p-4 bg-stone-950 text-stone-100 rounded space-y-3 border border-stone-800">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
                      Dyno & Material Engineering Metrics
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                      {Object.entries(part.specifications).map(([key, val]) => (
                        <div key={key} className="p-2 bg-stone-900 rounded border border-stone-800">
                          <span className="text-[10px] text-stone-400 uppercase block">{key}:</span>
                          <span className="text-stone-100 font-bold">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. MERCHANT & CONTACT TAB */}
            {activeTab === "contact" && (
              <div className="space-y-6 font-sans">
                <div className="border-b border-stone-300 pb-3">
                  <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block">
                    SELLER ACCREDITATION & DISPATCH
                  </span>
                  <h3 className="text-lg font-serif font-black text-stone-950 uppercase">
                    Merchant & Tuner Coordinates
                  </h3>
                </div>

                <div className="p-6 bg-white border border-stone-300 rounded space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-stone-900 text-amber-400 font-serif font-black flex items-center justify-center text-lg shadow">
                        {(part.sellerName || "M").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-stone-950 flex items-center gap-1.5">
                          <span>{part.sellerName || "Verified Automotive Tuner"}</span>
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-xs text-stone-500 flex items-center gap-1 font-mono">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span>{part.location || "Mumbai, India"}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold uppercase">
                      Auto World Vetted Seller
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 bg-[#FAF8F5] border border-stone-200 rounded space-y-1">
                      <span className="text-[10px] text-stone-500 uppercase">Direct Telephone:</span>
                      <div className="font-bold text-stone-900 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-amber-700" />
                          <span>
                            {hasPaidPass || isAuthorizedAdmin 
                              ? (part.sellerPhone || "+91 98200 11988")
                              : "+91 ••••• •••••"}
                          </span>
                        </div>
                        {!hasPaidPass && !isAuthorizedAdmin && (
                          <span className="px-2 py-0.5 bg-amber-200 text-stone-900 text-[9px] font-bold uppercase rounded-xs">
                            Pass Required
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-[#FAF8F5] border border-stone-200 rounded space-y-1">
                      <span className="text-[10px] text-stone-500 uppercase">Dispatch Email:</span>
                      <div className="font-bold text-stone-900 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-amber-700" />
                          <span>
                            {hasPaidPass || isAuthorizedAdmin 
                              ? (part.sellerEmail || "dispatch@autoworld.com")
                              : "••••••••@autoworld.com"}
                          </span>
                        </div>
                        {!hasPaidPass && !isAuthorizedAdmin && (
                          <span className="px-2 py-0.5 bg-amber-200 text-stone-900 text-[9px] font-bold uppercase rounded-xs">
                            Pass Required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    {hasPaidPass || isAuthorizedAdmin ? (
                      <a
                        href={getWhatsAppUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition shadow-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Start Direct WhatsApp Callback</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRequestPass) {
                            onRequestPass();
                          }
                        }}
                        className="w-full py-3.5 bg-stone-900 hover:bg-stone-850 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition shadow-sm border border-amber-500/40 cursor-pointer"
                      >
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>Unlock Tuner Coordinates & WhatsApp (₹1 Buyer Pass)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. CONTROL TAB (THE LEVEL 5 ADMIN CONTROL PANEL REQUESTED) */}
            {activeTab === "control" && (
              <div className="space-y-6 font-sans">
                {/* Header Banner */}
                <div className="p-4 bg-stone-950 border-2 border-stone-900 text-stone-100 rounded space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
                        Level 5 Backoffice Hardware Clearance Controls
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400">
                      ID: {part.isUserListing ? `USER-${part.listingId}` : `DEFAULT-${part.id}`}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 font-sans">
                    Execute live moderation overrides, award verified badge credentials, calibrate pricing, edit metadata, or purge items from the public marketplace.
                  </p>
                </div>

                {/* Fast Action Buttons Bar */}
                <div className="p-4 bg-white border border-stone-300 rounded space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-600 block">
                    Fast Live Toggles & Accreditation:
                  </span>
                  
                  <div className="flex flex-wrap gap-2">
                    {/* Approve / Pending toggle */}
                    {part.isUserListing && (
                      <button
                        onClick={handleToggleApproval}
                        className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 ${
                          part.status === "active"
                            ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300"
                            : "bg-emerald-700 hover:bg-emerald-800 text-white"
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {part.status === "active" ? "Approved (Active)" : "Approve Hardware"}
                      </button>
                    )}

                    {/* Verified Badge */}
                    <button
                      onClick={handleToggleVerified}
                      className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 ${
                        part.badge === "verified"
                          ? "bg-purple-700 text-white border border-purple-800 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                          : "bg-stone-100 hover:bg-purple-50 text-stone-800 border border-stone-300"
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {part.badge === "verified" ? "Verified Accredited" : "Verify Badge"}
                    </button>

                    {/* Featured / Star */}
                    <button
                      onClick={handleToggleFeatured}
                      className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 ${
                        part.badge === "premium"
                          ? "bg-amber-400 text-stone-950 font-extrabold border border-amber-600"
                          : "bg-stone-100 hover:bg-amber-50 text-stone-800 border border-stone-300"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {part.badge === "premium" ? "★ Featured Highlight" : "☆ Mark Featured"}
                    </button>

                    {/* Hot Deal */}
                    <button
                      onClick={handleToggleHotDeal}
                      className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 ${
                        part.badge === "hot"
                          ? "bg-red-600 text-white font-extrabold"
                          : "bg-stone-100 hover:bg-red-50 text-stone-800 border border-stone-300"
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      {part.badge === "hot" ? "Hot Deal Tagged" : "Hot Deal Tag"}
                    </button>

                    {/* Pin to Homepage */}
                    <button
                      onClick={handleTogglePinHome}
                      className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 ${
                        isPinnedHome
                          ? "bg-amber-600 text-white font-extrabold"
                          : "bg-stone-100 hover:bg-amber-50 text-stone-800 border border-stone-300"
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      {isPinnedHome ? "🏠 Pinned on Home" : "🏠 Pin to Home"}
                    </button>

                    {/* Hide / Archive toggle */}
                    <button
                      onClick={handleToggleHide}
                      className="px-3 py-2 bg-stone-100 hover:bg-amber-100 text-amber-900 border border-stone-300 text-xs font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      {part.status === "hidden" ? "Unhide Part" : "Archive / Hide"}
                    </button>

                    {/* Delete / Scrub */}
                    <button
                      onClick={handleAdminDelete}
                      disabled={isDeleting}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeleting ? "Scrubbing..." : "Scrub Item"}</span>
                    </button>
                  </div>
                </div>

                {/* SECTION 1: INTERACTIVE IMAGE & MEDIA GALLERY STUDIO */}
                <div className="p-6 bg-white border border-stone-300 rounded space-y-5 font-sans text-xs">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3 flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-amber-600" />
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-700">
                          MEDIA MANAGEMENT STUDIO
                        </span>
                      </div>
                      <h4 className="text-sm font-serif font-black uppercase text-stone-950">
                        Hardware Photographic Assets ({editPhotos.length} Angle{editPhotos.length > 1 ? "s" : ""})
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBulkInput(!showBulkInput)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-[11px] font-mono font-bold uppercase rounded flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{showBulkInput ? "Hide Bulk Input" : "Bulk Add URLs"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSpecForm}
                        disabled={isSavingSpec}
                        className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-extrabold text-[11px] uppercase rounded flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5 text-stone-950" />
                        <span>{isSavingSpec ? "Saving..." : "Save Gallery"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Bulk Input Drawer */}
                  {showBulkInput && (
                    <div className="p-4 bg-[#FAF8F5] border border-amber-300 rounded space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-amber-900 uppercase">
                          Paste Multiple Image URLs (one per line or comma-separated):
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowBulkInput(false)}
                          className="text-stone-400 hover:text-stone-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={bulkPhotoUrlsInput}
                        onChange={(e) => setBulkPhotoUrlsInput(e.target.value)}
                        placeholder="https://example.com/angle1.jpg&#10;https://example.com/angle2.jpg&#10;https://example.com/angle3.jpg"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs font-mono focus:border-stone-900 outline-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddBulkPhotos}
                          className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-mono font-bold text-xs uppercase rounded transition cursor-pointer"
                        >
                          Add Bulk Images
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Visual Photo Cards Grid */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-stone-600 block">
                      Active Photographic Inventory:
                    </span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {editPhotos.map((photo, idx) => (
                        <div 
                          key={idx}
                          className={`relative rounded-lg border-2 overflow-hidden bg-stone-900 shadow-sm flex flex-col justify-between ${
                            idx === 0 ? "border-amber-500 ring-2 ring-amber-400/40" : "border-stone-800"
                          }`}
                        >
                          {/* Image preview */}
                          <div className="aspect-video w-full relative bg-stone-950 overflow-hidden">
                            <img
                              src={photo.src}
                              alt={photo.alt || `Photo #${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800";
                              }}
                            />
                            
                            {/* Position & Cover Badge */}
                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-stone-950/85 text-stone-200 text-[10px] font-mono font-bold rounded border border-stone-700">
                                #{idx + 1}
                              </span>
                              {idx === 0 && (
                                <span className="px-2 py-0.5 bg-amber-400 text-stone-950 text-[10px] font-mono font-extrabold rounded border border-amber-600 flex items-center gap-1 shadow-sm">
                                  <Star className="w-3 h-3 fill-stone-950" />
                                  PRIMARY COVER
                                </span>
                              )}
                            </div>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="absolute top-2 right-2 p-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded transition cursor-pointer shadow"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Photo Controls Bar */}
                          <div className="p-2.5 bg-stone-950 border-t border-stone-800 space-y-2">
                            {editingPhotoIndex === idx ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  value={editingPhotoValue}
                                  onChange={(e) => setEditingPhotoValue(e.target.value)}
                                  className="w-full px-2 py-1 bg-stone-900 border border-amber-400 text-stone-100 text-[10px] font-mono rounded outline-none"
                                  placeholder="https://..."
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingPhotoIndex(null)}
                                    className="px-2 py-0.5 bg-stone-800 text-stone-300 text-[10px] font-mono rounded"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditedPhotoUrl(idx)}
                                    className="px-2.5 py-0.5 bg-amber-400 text-stone-950 text-[10px] font-mono font-bold rounded"
                                  >
                                    Update URL
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                                <div className="flex items-center gap-1">
                                  {idx !== 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetPrimaryPhoto(idx)}
                                      className="px-2 py-1 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded transition cursor-pointer"
                                      title="Set as Main Cover"
                                    >
                                      ★ Make Cover
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPhotoIndex(idx);
                                      setEditingPhotoValue(photo.src);
                                    }}
                                    className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded transition cursor-pointer flex items-center gap-1"
                                    title="Edit URL"
                                  >
                                    <Edit2 className="w-3 h-3 text-amber-400" />
                                    <span>Edit</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-0.5 ml-auto">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMovePhoto(idx, idx - 1)}
                                    className="p-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-stone-200 rounded transition cursor-pointer"
                                    title="Move Left"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === editPhotos.length - 1}
                                    onClick={() => handleMovePhoto(idx, idx + 1)}
                                    className="p-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-stone-200 rounded transition cursor-pointer"
                                    title="Move Right"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add New Single Photo URL Box */}
                  <div className="p-3.5 bg-[#FAF8F5] border border-stone-300 rounded space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-stone-700 block">
                      Add Single Custom Photograph URL:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newPhotoUrlInput}
                        onChange={(e) => setNewPhotoUrlInput(e.target.value)}
                        placeholder="https://images.unsplash.com/... or https://..."
                        className="flex-1 px-3 py-2 bg-white border border-stone-300 text-xs font-mono rounded focus:border-stone-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddSinglePhoto}
                        className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white font-mono font-bold text-xs uppercase rounded flex items-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Add Angle</span>
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Motorsport Image Presets */}
                  <div className="space-y-2 pt-2 border-t border-stone-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[10px] font-mono font-bold uppercase text-stone-700">
                        1-Click High-Definition Motorsport Presets:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {MOTORSPORT_IMAGE_PRESETS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleAddPresetPhoto(preset)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 hover:border-amber-400 text-stone-800 text-[10px] font-mono rounded border border-stone-300 transition cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-amber-600" />
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: LIVE SPECIFICATION EDITOR FORM */}
                <div className="p-6 bg-white border border-stone-300 rounded space-y-4 font-sans text-xs">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3 flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-amber-700 block">LIVE DOSSIER WRITER</span>
                      <h4 className="text-sm font-serif font-black uppercase text-stone-950">
                        Edit Hardware Specifications & Metadata
                      </h4>
                    </div>
                    <button
                      onClick={handleSaveSpecForm}
                      disabled={isSavingSpec}
                      className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isSavingSpec ? "Saving Changes..." : "Save All Specifications"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Hardware Title *</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none rounded"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Brand / Tuner *</label>
                      <input
                        type="text"
                        value={editBrand}
                        onChange={(e) => setEditBrand(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none rounded"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Category Classification</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none rounded"
                      >
                        {PART_CATEGORIES.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Rarity Tier</label>
                      <select
                        value={editRarity}
                        onChange={(e) => setEditRarity(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none rounded"
                      >
                        <option value="Common">Common</option>
                        <option value="Uncommon">Uncommon</option>
                        <option value="Rare">Rare</option>
                        <option value="Epic">Epic</option>
                        <option value="Legendary">Legendary</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Condition (1 to 5 Stars)</label>
                      <select
                        value={editCondition}
                        onChange={(e) => setEditCondition(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none rounded"
                      >
                        <option value={5}>5 Stars - Brand New / Sealed</option>
                        <option value={4}>4 Stars - Excellent (Minor Test Dyno Runs)</option>
                        <option value={3}>3 Stars - Good (Light Road Wear)</option>
                        <option value={2}>2 Stars - Fair (Rebuild Recommended)</option>
                        <option value={1}>1 Star - Core Only for Rebuilding</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Price Valuation (₹ INR) *</label>
                      <input
                        type="text"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none rounded"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Chassis & Vehicle Compatibility</label>
                      <input
                        type="text"
                        value={editFitment}
                        onChange={(e) => setEditFitment(e.target.value)}
                        placeholder="e.g. BMW M3 G80, Nissan GT-R R35, Universal..."
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none rounded"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Primary Cover Image URL</label>
                      <input
                        type="text"
                        value={editImage}
                        onChange={(e) => setEditImage(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none rounded font-mono"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Engineering Narrative / Description</label>
                      <textarea
                        rows={3}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-medium focus:border-stone-900 outline-none rounded font-sans"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-200 flex justify-end gap-3">
                    <button
                      onClick={handleSaveSpecForm}
                      disabled={isSavingSpec}
                      className="px-6 py-2.5 bg-stone-950 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isSavingSpec ? "Saving Changes..." : "Commit All Changes to Database"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3.5 bg-[#F4F1EA] border-t-2 border-stone-950 flex items-center justify-between text-xs text-stone-600 shrink-0">
            <span className="font-mono text-[10px] text-stone-500">
              Auto World Verified Motorsports Marketplace Archive
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-stone-950 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer"
            >
              Close Dossier
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
