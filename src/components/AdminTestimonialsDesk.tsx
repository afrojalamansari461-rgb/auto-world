import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Edit3,
  Star,
  Clock,
  Sliders,
  RefreshCw,
  Car,
  Wrench,
  MapPin,
  Check,
  X,
  Play,
  Pause,
  GripVertical,
  Sparkles,
  Search,
  Layers,
  ChevronsUp,
  ArrowUpDown,
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import {
  BuyerTestimonial,
  TestimonialsConfig,
  DEFAULT_TESTIMONIALS,
  DEFAULT_TESTIMONIALS_CONFIG,
  subscribeToTestimonials,
  saveTestimonialsData,
  updateTestimonialStatusInFirestore,
  reorderApprovedTestimonialsInFirestore,
  submitNewBuyerTestimonial,
  deleteSingleTestimonialFromFirestore,
  normalizeTestimonialRanks,
  TestimonialStatus,
} from "../lib/testimonialsService";
import { recordAuditLog } from "./AdminAuditLogs";
import { User } from "firebase/auth";

export interface AdminTestimonialsDeskProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  currentUser: User | null;
}

export function AdminTestimonialsDashboard({
  showToast,
  currentUser,
}: AdminTestimonialsDeskProps) {
  const [items, setItems] = useState<BuyerTestimonial[]>([]);
  const [config, setConfig] = useState<TestimonialsConfig>(DEFAULT_TESTIMONIALS_CONFIG);
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved" | "hidden" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<BuyerTestimonial | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; label: string } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("Live");

  // New / Edit Form state
  const [formName, setFormName] = useState("");
  const [formTitle, setFormTitle] = useState("Verified Collector & Enthusiast");
  const [formLocation, setFormLocation] = useState("Mumbai, MH");
  const [formCategory, setFormCategory] = useState<"Vehicle Acquisition" | "Motorsport Hardware">("Vehicle Acquisition");
  const [formPurchasedItem, setFormPurchasedItem] = useState("");
  const [formDossierRef, setFormDossierRef] = useState("REF #AW-VERIFIED");
  const [formRating, setFormRating] = useState(5.0);
  const [formComment, setFormComment] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState(
    "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=600&auto=format&fit=crop&q=80"
  );
  const [formPhotoLabel, setFormPhotoLabel] = useState("Verified Handover Proof");

  useEffect(() => {
    const unsub = subscribeToTestimonials(({ items: loadedItems, config: loadedConfig }) => {
      const sorted = [...loadedItems].sort(
        (a, b) => (a.order ?? a.rank ?? 999) - (b.order ?? b.rank ?? 999)
      );
      setItems(sorted);
      setConfig(loadedConfig);
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    });
    return () => unsub();
  }, []);

  const pendingTestimonials = items.filter((i) => i.status === "pending");
  const approvedTestimonials = items
    .filter((i) => i.status === "approved")
    .sort((a, b) => (a.order ?? a.rank ?? 999) - (b.order ?? b.rank ?? 999));
  const approvedVisibleCount = approvedTestimonials.filter((i) => i.visible !== false).length;
  const hiddenCount = approvedTestimonials.filter((i) => i.visible === false).length;
  const rejectedTestimonials = items.filter((i) => i.status === "rejected");

  const handleUpdateConfig = async (patch: Partial<TestimonialsConfig>, toastMessage?: string) => {
    const nextConfig = { ...config, ...patch };
    setConfig(nextConfig);
    await saveTestimonialsData(items, nextConfig);
    if (toastMessage) {
      showToast(toastMessage, "success");
    }
  };

  // Approve a pending or rejected testimonial -> updates status in Firestore so it displays in HomeTab carousel
  const handleApprove = async (item: BuyerTestimonial) => {
    const updated = await updateTestimonialStatusInFirestore(item.id, "approved", items, config);
    setItems(updated);
    await recordAuditLog(
      currentUser?.email || "Admin",
      "Approve Testimonial",
      `Approved buyer testimonial from "${item.buyerName}" for "${item.purchasedItem}" in Firestore.`
    );
    showToast(`Approved "${item.buyerName}" — Now live in HomeTab Carousel!`, "success");
  };

  // Reject a pending or approved testimonial -> updates status in Firestore so it does not display in HomeTab carousel
  const handleReject = async (item: BuyerTestimonial) => {
    const updated = await updateTestimonialStatusInFirestore(item.id, "rejected", items, config);
    setItems(updated);
    await recordAuditLog(
      currentUser?.email || "Admin",
      "Reject Testimonial",
      `Rejected buyer testimonial from "${item.buyerName}" in Firestore.`
    );
    showToast(`Rejected testimonial from "${item.buyerName}". Removed from HomeTab display.`, "info");
  };

  // Bulk approve all pending testimonials
  const handleApproveAllPending = async () => {
    if (pendingTestimonials.length === 0) return;
    const count = pendingTestimonials.length;
    const next = items.map((t) =>
      t.status === "pending"
        ? { ...t, status: "approved" as TestimonialStatus, visible: true }
        : t
    );
    const normalized = normalizeTestimonialRanks(next);
    setItems(normalized);
    await saveTestimonialsData(normalized, config);
    await recordAuditLog(
      currentUser?.email || "Admin",
      "Bulk Approve Testimonials",
      `Approved all ${count} pending buyer testimonials in Firestore.`
    );
    showToast(`Approved all ${count} pending testimonials! Now live on HomeTab.`, "success");
  };

  // Bulk reject all pending testimonials
  const handleRejectAllPending = async () => {
    if (pendingTestimonials.length === 0) return;
    const count = pendingTestimonials.length;
    const next = items.map((t) =>
      t.status === "pending"
        ? { ...t, status: "rejected" as TestimonialStatus, visible: false }
        : t
    );
    const normalized = normalizeTestimonialRanks(next);
    setItems(normalized);
    await saveTestimonialsData(normalized, config);
    showToast(`Rejected all ${count} pending testimonials.`, "info");
  };

  // Simulate a new incoming pending submission for instant moderation testing
  const handleSimulatePendingSubmission = async () => {
    const samples = [
      {
        buyerName: "Aaravindh राजे (Pune)",
        buyerTitle: "GT Racing Collector",
        location: "Koregaon Park, Pune",
        purchasedItem: "2022 Ferrari F8 Tributo (Rosso Corsa)",
        itemCategory: "Vehicle Acquisition" as const,
        rating: 5.0,
        comment:
          "Verified the 7-year Ferrari Genuine Maintenance log and carbon tub inspection report via Auto World before flying down. Direct owner handover was effortless.",
        purchaseDate: "Verified Oct 2026",
        dossierRef: "REF #AW-F8TRIB",
        verifiedPurchase: true,
        verificationImages: [
          {
            id: `v-sim-${Date.now()}`,
            label: "Showroom Handover Proof",
            type: "delivery_photo" as const,
            imageUrl:
              "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&auto=format&fit=crop&q=80",
            verified: true,
          },
        ],
      },
      {
        buyerName: "Zubin Daruwala",
        buyerTitle: "Time Attack Builder",
        location: "Bandra West, Mumbai",
        purchasedItem: "Eventuri Carbon Kevlar Intake System (BMW G80 M3)",
        itemCategory: "Motorsport Hardware" as const,
        rating: 4.9,
        comment:
          "Authentic weave and MAF sensor tolerances verified via seller dossier. Dropped intake air temps by 8°C on our coastal highway run.",
        purchaseDate: "Verified Oct 2026",
        dossierRef: "REF #PART-EVG80",
        verifiedPurchase: true,
        verificationImages: [
          {
            id: `v-sim-${Date.now()}`,
            label: "Carbon Intake Serial Plaque",
            type: "chassis_plaque" as const,
            imageUrl:
              "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&auto=format&fit=crop&q=80",
            verified: true,
          },
        ],
      },
    ];
    const pick = samples[Math.floor(Math.random() * samples.length)];
    await submitNewBuyerTestimonial(pick, false);
    showToast(`Simulated new pending review from "${pick.buyerName}" in Moderation Queue!`, "info");
  };

  // Drag-and-drop reorder handler (Framer Motion Reorder.Group)
  const handleFramerDragReorder = async (newOrderedApproved: BuyerTestimonial[]) => {
    // Immediately update local state for smooth 60fps drag feedback
    const rankedApproved = newOrderedApproved.map((item, idx) => ({
      ...item,
      order: idx + 1,
      rank: idx + 1,
    }));
    const approvedIds = new Set(rankedApproved.map((i) => i.id));
    const others = items.filter((i) => !approvedIds.has(i.id));
    setItems([...rankedApproved, ...others]);

    // Persist new rank sequence to Firestore
    await reorderApprovedTestimonialsInFirestore(rankedApproved, items, config);
    setConfig((prev) => ({ ...prev, sortMode: "custom_order" }));
  };

  // HTML5 Drag-and-Drop handlers for Approved Cards & Sequence Pills
  const handleHtmlDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleHtmlDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleHtmlDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const currentApproved = [...approvedTestimonials];
    const fromIdx = currentApproved.findIndex((i) => i.id === draggedId);
    const toIdx = currentApproved.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedId(null);
      return;
    }

    const [moved] = currentApproved.splice(fromIdx, 1);
    currentApproved.splice(toIdx, 0, moved);
    setDraggedId(null);

    const updated = await reorderApprovedTestimonialsInFirestore(currentApproved, items, config);
    setItems(updated);
    setConfig((prev) => ({ ...prev, sortMode: "custom_order" }));
    showToast(
      `Reordered "${moved.buyerName}" to Rank #${toIdx + 1} in HomeTab Carousel!`,
      "success"
    );
  };

  // Rank-based reordering: Move Up / Move Down / Move to Rank #1
  const handleMoveApprovedRank = async (itemId: string, direction: "up" | "down" | "top") => {
    const ordered = [...approvedTestimonials];
    const idx = ordered.findIndex((i) => i.id === itemId);
    if (idx === -1) return;

    if (direction === "up" && idx > 0) {
      const temp = ordered[idx - 1];
      ordered[idx - 1] = ordered[idx];
      ordered[idx] = temp;
    } else if (direction === "down" && idx < ordered.length - 1) {
      const temp = ordered[idx + 1];
      ordered[idx + 1] = ordered[idx];
      ordered[idx] = temp;
    } else if (direction === "top" && idx > 0) {
      const [picked] = ordered.splice(idx, 1);
      ordered.unshift(picked);
    } else {
      return;
    }

    const updated = await reorderApprovedTestimonialsInFirestore(ordered, items, config);
    setItems(updated);
    setConfig((prev) => ({ ...prev, sortMode: "custom_order" }));
    const newRank = ordered.findIndex((i) => i.id === itemId) + 1;
    showToast(`Updated carousel rank to #${newRank} in Firestore!`, "success");
  };

  // Direct Rank Assignment (#1..#N)
  const handleSetExactApprovedRank = async (itemId: string, newRankNumber: number) => {
    const ordered = [...approvedTestimonials];
    const idx = ordered.findIndex((i) => i.id === itemId);
    if (idx === -1) return;

    const clampedIndex = Math.max(0, Math.min(ordered.length - 1, newRankNumber - 1));
    const [picked] = ordered.splice(idx, 1);
    ordered.splice(clampedIndex, 0, picked);

    const updated = await reorderApprovedTestimonialsInFirestore(ordered, items, config);
    setItems(updated);
    setConfig((prev) => ({ ...prev, sortMode: "custom_order" }));
    showToast(`Assigned "${picked.buyerName}" to Rank #${clampedIndex + 1} in HomeTab Carousel!`, "success");
  };

  // Preset Rank Sorters for Approved Testimonials
  const handlePresetSortApproved = async (preset: "rating" | "newest" | "reverse") => {
    const ordered = [...approvedTestimonials];
    if (preset === "rating") {
      ordered.sort((a, b) => b.rating - a.rating);
    } else if (preset === "newest") {
      ordered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (preset === "reverse") {
      ordered.reverse();
    }

    const updated = await reorderApprovedTestimonialsInFirestore(ordered, items, config);
    setItems(updated);
    setConfig((prev) => ({ ...prev, sortMode: "custom_order" }));
    showToast(`Applied ${preset.toUpperCase()} rank sequence to HomeTab Carousel!`, "success");
  };

  // Toggle visibility (Show / Hide on HomeTab)
  const handleToggleVisible = async (item: BuyerTestimonial) => {
    const nextVisible = !item.visible;
    const next = items.map((t) =>
      t.id === item.id
        ? {
            ...t,
            visible: nextVisible,
            status: nextVisible && t.status !== "approved" ? ("approved" as TestimonialStatus) : t.status,
          }
        : t
    );
    const normalized = normalizeTestimonialRanks(next);
    setItems(normalized);
    await saveTestimonialsData(normalized, config);
    showToast(
      nextVisible
        ? `Testimonial by ${item.buyerName} is now VISIBLE on HomeTab.`
        : `Testimonial by ${item.buyerName} is now HIDDEN from HomeTab.`,
      "info"
    );
  };

  // Toggle Verified Purchase Badge
  const handleToggleVerifiedBadge = async (item: BuyerTestimonial) => {
    const nextVer = !item.verifiedPurchase;
    const next = items.map((t) =>
      t.id === item.id ? { ...t, verifiedPurchase: nextVer } : t
    );
    setItems(next);
    await saveTestimonialsData(next, config);
    showToast(
      nextVer
        ? `Verified Purchase badge enabled for ${item.buyerName}.`
        : `Verified Purchase badge removed for ${item.buyerName}.`,
      "info"
    );
  };

  // Delete testimonial
  const handleDelete = async (item: BuyerTestimonial) => {
    const next = normalizeTestimonialRanks(items.filter((t) => t.id !== item.id));
    setItems(next);
    await saveTestimonialsData(next, config);
    await deleteSingleTestimonialFromFirestore(item.id);
    await recordAuditLog(
      currentUser?.email || "Admin",
      "Delete Testimonial",
      `Deleted testimonial from "${item.buyerName}".`
    );
    showToast(`Deleted testimonial from ${item.buyerName}.`, "info");
  };

  // Open Edit Form
  const handleStartEdit = (item: BuyerTestimonial) => {
    setEditingItem(item);
    setIsAddingNew(false);
    setFormName(item.buyerName);
    setFormTitle(item.buyerTitle);
    setFormLocation(item.location);
    setFormCategory(item.itemCategory);
    setFormPurchasedItem(item.purchasedItem);
    setFormDossierRef(item.dossierRef);
    setFormRating(item.rating);
    setFormComment(item.comment);
    setFormPhotoUrl(item.verificationImages[0]?.imageUrl || "");
    setFormPhotoLabel(item.verificationImages[0]?.label || "Verified Handover Proof");
  };

  const handleStartAddNew = () => {
    setEditingItem(null);
    setIsAddingNew(true);
    setFormName("");
    setFormTitle("Verified Collector & Enthusiast");
    setFormLocation("Mumbai, MH");
    setFormCategory("Vehicle Acquisition");
    setFormPurchasedItem("");
    setFormDossierRef("REF #AW-VERIFIED");
    setFormRating(5.0);
    setFormComment("");
    setFormPhotoUrl("https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=600&auto=format&fit=crop&q=80");
    setFormPhotoLabel("Verified Handover Proof");
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPurchasedItem.trim() || !formComment.trim()) {
      showToast("Please fill in Buyer Name, Purchased Item, and Review Comment.", "error");
      return;
    }

    if (editingItem) {
      const next = items.map((t) =>
        t.id === editingItem.id
          ? {
              ...t,
              buyerName: formName.trim(),
              buyerTitle: formTitle.trim(),
              location: formLocation.trim(),
              itemCategory: formCategory,
              purchasedItem: formPurchasedItem.trim(),
              dossierRef: formDossierRef.trim(),
              rating: Number(formRating),
              comment: formComment.trim(),
              verificationImages: formPhotoUrl.trim()
                ? [
                    {
                      id: t.verificationImages[0]?.id || `v-${Date.now()}`,
                      label: formPhotoLabel.trim() || "Verified Proof",
                      type: "delivery_photo" as const,
                      imageUrl: formPhotoUrl.trim(),
                      verified: true,
                    },
                    ...t.verificationImages.slice(1),
                  ]
                : t.verificationImages,
            }
          : t
      );
      setItems(next);
      await saveTestimonialsData(next, config);
      setEditingItem(null);
      showToast("Testimonial updated in Firestore!", "success");
    } else {
      const newEntry: BuyerTestimonial = {
        id: `test-admin-${Date.now()}`,
        buyerName: formName.trim(),
        buyerTitle: formTitle.trim() || "Verified Collector",
        location: formLocation.trim() || "Mumbai, MH",
        itemCategory: formCategory,
        purchasedItem: formPurchasedItem.trim(),
        dossierRef: formDossierRef.trim() || "REF #AW-VERIFIED",
        rating: Number(formRating),
        comment: formComment.trim(),
        purchaseDate: "Verified Oct 2026",
        status: "approved",
        visible: true,
        verifiedPurchase: true,
        order: 1,
        rank: 1,
        createdAt: new Date().toISOString(),
        verificationImages: formPhotoUrl.trim()
          ? [
              {
                id: `v-adm-${Date.now()}`,
                label: formPhotoLabel.trim() || "Verified Proof",
                type: "delivery_photo",
                imageUrl: formPhotoUrl.trim(),
                verified: true,
              },
            ]
          : [],
      };
      const next = normalizeTestimonialRanks([newEntry, ...items]);
      setItems(next);
      await saveTestimonialsData(next, config);
      setIsAddingNew(false);
      showToast("Added & published new verified testimonial at Rank #1!", "success");
    }
  };

  const handleRestoreDefaults = async () => {
    const normalized = normalizeTestimonialRanks(DEFAULT_TESTIMONIALS);
    setItems(normalized);
    setConfig(DEFAULT_TESTIMONIALS_CONFIG);
    await saveTestimonialsData(normalized, DEFAULT_TESTIMONIALS_CONFIG);
    showToast("Restored default Verified Buyer Testimonials & pending queue!", "success");
  };

  const matchesSearch = (item: BuyerTestimonial) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.buyerName.toLowerCase().includes(q) ||
      item.purchasedItem.toLowerCase().includes(q) ||
      item.comment.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.dossierRef.toLowerCase().includes(q)
    );
  };

  const filteredPending = pendingTestimonials.filter(matchesSearch);
  const filteredApproved = approvedTestimonials.filter((item) => {
    if (filterTab === "hidden") return item.visible === false && matchesSearch(item);
    if (filterTab === "approved") return item.visible !== false && matchesSearch(item);
    return matchesSearch(item);
  });
  const filteredRejected = rejectedTestimonials.filter(matchesSearch);

  return (
    <div id="admin-testimonials-dashboard" className="space-y-6 font-sans">
      {/* 1. ADMIN TESTIMONIALS DASHBOARD COMMAND HEADER */}
      <div className="bg-stone-950 text-[#F4F1EA] border-2 border-stone-900 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-stone-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-amber-500 text-stone-950 text-[10px] font-mono font-black uppercase tracking-widest rounded">
                ADMIN TESTIMONIALS DASHBOARD
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase tracking-widest rounded">
                ● FIRESTORE SYNC: {lastSyncedAt}
              </span>
              {pendingTestimonials.length > 0 && (
                <span className="px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-mono font-black uppercase tracking-widest rounded animate-pulse">
                  ● {pendingTestimonials.length} PENDING MODERATION
                </span>
              )}
            </div>
            <h2 className="text-2xl font-serif font-black tracking-tight">
              Admin Testimonials Dashboard — Moderation & Carousel Reordering
            </h2>
            <p className="text-xs text-stone-400 max-w-2xl">
              Review pending buyer testimonials with 1-click Approve or Reject synced to Firestore, and drag-and-drop or rank-reorder approved testimonials to control the exact display sequence in the HomeTab carousel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSimulatePendingSubmission}
              className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
              title="Simulate a new buyer testimonial entering the Pending Queue"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>+ Simulate Pending Review</span>
            </button>
            <button
              type="button"
              onClick={handleStartAddNew}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Approved Review</span>
            </button>
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
              title="Reset to default curated testimonials & pending queue"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Master Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Control 1: Master Section Show/Hide */}
          <div className="p-4 bg-stone-900/90 border border-stone-800 rounded-xl flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-bold">
                Home Section Display
              </span>
              <span
                className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded ${
                  config.isSectionVisible
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-red-500/20 text-red-300 border border-red-500/40"
                }`}
              >
                {config.isSectionVisible ? "VISIBLE" : "HIDDEN"}
              </span>
            </div>
            <p className="text-[11px] text-stone-300">
              Show or hide the entire Testimonials section on the HomeTab.
            </p>
            <button
              type="button"
              onClick={() =>
                handleUpdateConfig(
                  { isSectionVisible: !config.isSectionVisible },
                  config.isSectionVisible
                    ? "Testimonials section hidden on Home page."
                    : "Testimonials section is now visible on Home page!"
                )
              }
              className={`w-full py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition ${
                config.isSectionVisible
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700"
              }`}
            >
              {config.isSectionVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{config.isSectionVisible ? "Section: SHOWN" : "Section: HIDDEN"}</span>
            </button>
          </div>

          {/* Control 2: Auto-Scrolling Carousel Toggle */}
          <div className="p-4 bg-stone-900/90 border border-stone-800 rounded-xl flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-bold">
                Auto-Scroll Carousel
              </span>
              <span
                className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded ${
                  config.isAutoScrollEnabled
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-stone-800 text-stone-400"
                }`}
              >
                {config.isAutoScrollEnabled ? "ACTIVE" : "PAUSED"}
              </span>
            </div>
            <p className="text-[11px] text-stone-300">
              Continuous Framer Motion carousel with automatic pause-on-hover.
            </p>
            <button
              type="button"
              onClick={() =>
                handleUpdateConfig(
                  { isAutoScrollEnabled: !config.isAutoScrollEnabled },
                  config.isAutoScrollEnabled
                    ? "Carousel auto-scroll paused."
                    : "Carousel auto-scroll enabled!"
                )
              }
              className={`w-full py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition ${
                config.isAutoScrollEnabled
                  ? "bg-amber-500 hover:bg-amber-400 text-stone-950"
                  : "bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700"
              }`}
            >
              {config.isAutoScrollEnabled ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{config.isAutoScrollEnabled ? "Auto-Scroll: ON" : "Auto-Scroll: OFF"}</span>
            </button>
          </div>

          {/* Control 3: Scroll Speed Selector */}
          <div className="p-4 bg-stone-900/90 border border-stone-800 rounded-xl flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-bold">
                Carousel Velocity
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                {config.scrollSpeed}
              </span>
            </div>
            <p className="text-[11px] text-stone-300">
              Adjust marquee glide velocity & hover pause sensitivity.
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {(["slow", "normal", "fast"] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() =>
                    handleUpdateConfig({ scrollSpeed: spd }, `Carousel speed set to ${spd.toUpperCase()}.`)
                  }
                  className={`py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer transition ${
                    config.scrollSpeed === spd
                      ? "bg-amber-500 text-stone-950"
                      : "bg-stone-800 text-stone-400 hover:text-white"
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>
          </div>

          {/* Control 4: Display Ordering Mode */}
          <div className="p-4 bg-stone-900/90 border border-stone-800 rounded-xl flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-bold">
                Display Sequence Mode
              </span>
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-[11px] text-stone-300">
              Control how approved reviews are sequenced in HomeTab.
            </p>
            <select
              value={config.sortMode}
              onChange={(e) =>
                handleUpdateConfig(
                  { sortMode: e.target.value as TestimonialsConfig["sortMode"] },
                  "Updated testimonial ordering mode in Firestore!"
                )
              }
              className="w-full py-2 px-2.5 bg-stone-800 border border-stone-700 rounded-lg text-xs font-mono text-amber-300 font-bold focus:outline-none"
            >
              <option value="custom_order">Drag & Rank Sequence (#1, #2...)</option>
              <option value="newest">Newest Submissions First</option>
              <option value="highest_rated">Highest Rating First</option>
              <option value="random">Randomized Order</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. ADD / EDIT TESTIMONIAL MODAL / DRAWER */}
      <AnimatePresence>
        {(isAddingNew || editingItem) && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSaveForm}
            className="bg-[#FAF8F5] border-2 border-stone-950 rounded-2xl p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-300">
              <h3 className="text-lg font-serif font-black text-stone-950">
                {editingItem
                  ? `Edit Testimonial: ${editingItem.buyerName}`
                  : "Add New Verified Testimonial (Admin Direct Publish)"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsAddingNew(false);
                }}
                className="p-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-stone-700 block mb-1">
                  Buyer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs font-medium text-stone-950"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-stone-700 block mb-1">
                  Buyer Role / Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs font-medium text-stone-950"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-stone-700 block mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs font-medium text-stone-950"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-stone-700 block mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) =>
                    setFormCategory(e.target.value as "Vehicle Acquisition" | "Motorsport Hardware")
                  }
                  className="w-full px-3 py-2 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs font-bold text-stone-950"
                >
                  <option value="Vehicle Acquisition">Vehicle Acquisition</option>
                  <option value="Motorsport Hardware">Motorsport Hardware</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono uppercase font-bold text-stone-700 block mb-1">
                  Vehicle or Motorsport Part Purchased *
                </label>
                <input
                  type="text"
                  required
                  value={formPurchasedItem}
                  onChange={(e) => setFormPurchasedItem(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs font-medium text-stone-950"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-stone-700 block mb-1">
                  Star Rating (1.0 - 5.0)
                </label>
                <select
                  value={formRating}
                  onChange={(e) => setFormRating(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs font-bold text-stone-950"
                >
                  <option value={5.0}>5.0 ★</option>
                  <option value={4.9}>4.9 ★</option>
                  <option value={4.8}>4.8 ★</option>
                  <option value={4.5}>4.5 ★</option>
                  <option value={4.0}>4.0 ★</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase font-bold text-stone-700 block mb-1">
                Review Comment *
              </label>
              <textarea
                rows={3}
                required
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                className="w-full p-3 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs text-stone-950"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-stone-700 block mb-1">
                  Verification Image URL
                </label>
                <input
                  type="text"
                  value={formPhotoUrl}
                  onChange={(e) => setFormPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs font-mono text-stone-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-stone-700 block mb-1">
                  Verification Image Caption
                </label>
                <input
                  type="text"
                  value={formPhotoLabel}
                  onChange={(e) => setFormPhotoLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs text-stone-950"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsAddingNew(false);
                }}
                className="px-4 py-2 bg-stone-200 text-stone-800 rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-stone-950 text-[#F4F1EA] rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                {editingItem ? "Save Changes" : "Publish Verified Review"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* 3. FILTER TABS & SEARCH BAR */}
      <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "Full Dashboard View", count: items.length },
            {
              id: "pending",
              label: "Pending Moderation Queue",
              count: pendingTestimonials.length,
              badgeClass: "bg-amber-500 text-stone-950",
            },
            {
              id: "approved",
              label: "Approved & Reorder Studio",
              count: approvedVisibleCount,
              badgeClass: "bg-emerald-600 text-white",
            },
            { id: "hidden", label: "Hidden", count: hiddenCount },
            { id: "rejected", label: "Rejected", count: rejectedTestimonials.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id as typeof filterTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition ${
                filterTab === tab.id
                  ? "bg-stone-950 text-[#F4F1EA] shadow-xs"
                  : "bg-[#F4F1EA] text-stone-700 hover:bg-stone-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded ${
                  tab.badgeClass && tab.count > 0
                    ? tab.badgeClass
                    : filterTab === tab.id
                    ? "bg-stone-800 text-stone-200"
                    : "bg-stone-300 text-stone-800"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search buyer, vehicle, city..."
            className="w-full pl-9 pr-3 py-2 bg-[#F4F1EA] border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-950"
          />
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. SECTION A: PENDING TESTIMONIALS MODERATION QUEUE (APPROVE / REJECT) */}
      {/* =================================================================== */}
      {(filterTab === "all" || filterTab === "pending") && (
        <div className="bg-[#FAF8F5] border-2 border-amber-500 rounded-2xl p-6 shadow-md space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-300">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 font-black shadow-xs">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-900 border border-amber-400 rounded text-[10px] font-mono font-black uppercase tracking-widest">
                    MODERATION QUEUE • FIRESTORE STATUS: PENDING
                  </span>
                  <span className="text-xs font-mono font-bold text-stone-600">
                    ({filteredPending.length} Pending)
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-serif font-black text-stone-950 mt-0.5">
                  Pending Testimonials Awaiting Approval
                </h3>
                <p className="text-xs text-stone-600">
                  Approve or Reject each pending buyer submission below. Only approved entries (`status: "approved"`) are published to the HomeTab carousel.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {pendingTestimonials.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleApproveAllPending}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve All ({pendingTestimonials.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectAllPending}
                    className="px-3.5 py-2.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject All</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleSimulatePendingSubmission}
                className="px-3.5 py-2.5 bg-stone-950 hover:bg-stone-800 text-amber-400 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Sample Pending</span>
              </button>
            </div>
          </div>

          {filteredPending.length === 0 ? (
            <div className="p-8 bg-[#F4F1EA] border border-dashed border-stone-300 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-serif font-bold text-stone-900">
                All Pending Testimonials Have Been Moderated
              </h4>
              <p className="text-xs text-stone-600 max-w-md mx-auto">
                New buyer submissions from the HomeTab form will appear here automatically. Click "+ Add Sample Pending" above to test the moderation queue anytime.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPending.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50/50 border-2 border-amber-400 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xs"
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-amber-500 text-stone-950 text-[10px] font-mono font-black uppercase tracking-wider rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending Approval
                      </span>

                      <div className="flex items-center gap-0.5 bg-[#FAF8F5] px-2.5 py-0.5 rounded border border-stone-300">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= Math.round(item.rating)
                                ? "text-amber-500 fill-amber-500"
                                : "text-stone-300"
                            }`}
                          />
                        ))}
                        <span className="text-[11px] font-mono font-bold text-stone-900 ml-1">
                          {item.rating.toFixed(1)}
                        </span>
                      </div>

                      <span className="text-[11px] font-mono text-stone-600">
                        {item.dossierRef} • {item.purchaseDate}
                      </span>

                      {item.transactionRole && (
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold uppercase rounded">
                          {item.transactionRole}
                        </span>
                      )}

                      {item.buyerEmail && (
                        <span className="px-2 py-0.5 bg-stone-900 text-amber-300 text-[10px] font-mono font-bold rounded">
                          Gmail: {item.buyerEmail}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h4 className="text-base font-serif font-black text-stone-950">
                          {item.buyerName}
                        </h4>
                        <span className="text-xs text-stone-600 font-medium">
                          ({item.buyerTitle})
                        </span>
                        <span className="text-xs font-mono text-amber-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                      </div>
                      <div className="text-xs font-serif font-bold text-stone-900 mt-0.5 flex items-center gap-1.5">
                        {item.itemCategory === "Vehicle Acquisition" ? (
                          <Car className="w-3.5 h-3.5 text-amber-700" />
                        ) : (
                          <Wrench className="w-3.5 h-3.5 text-amber-700" />
                        )}
                        <span>{item.purchasedItem}</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-800 italic bg-[#FAF8F5] p-3.5 rounded-xl border border-amber-300/80 leading-relaxed">
                      "{item.comment}"
                    </p>

                    {item.verificationImages && item.verificationImages.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-600 font-bold">
                          Verification Proof:
                        </span>
                        {item.verificationImages.map((vImg) => (
                          <button
                            key={vImg.id}
                            type="button"
                            onClick={() =>
                              setPreviewImageModal({ url: vImg.imageUrl, label: vImg.label })
                            }
                            className="flex items-center gap-2 px-2.5 py-1 bg-[#FAF8F5] hover:bg-stone-200 border border-stone-300 rounded-lg text-left cursor-pointer transition"
                          >
                            <img
                              src={vImg.imageUrl}
                              alt={vImg.label}
                              className="w-6 h-6 rounded object-cover border border-stone-300"
                            />
                            <span className="text-[10px] font-sans font-bold text-stone-900">
                              {vImg.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Approve / Reject Action Buttons */}
                  <div className="flex sm:flex-row lg:flex-col items-stretch justify-end gap-2.5 shrink-0 lg:w-52 pt-3 lg:pt-0 border-t lg:border-t-0 border-amber-300/60">
                    <button
                      type="button"
                      onClick={() => handleApprove(item)}
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(item)}
                      className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition shadow-xs"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="py-2 px-3 bg-[#FAF8F5] hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-[11px] font-mono font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Details</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. SECTION B: APPROVED TESTIMONIALS — DRAG-AND-DROP & RANK REORDERING */}
      {/* =================================================================== */}
      {(filterTab === "all" || filterTab === "approved" || filterTab === "hidden") && (
        <div className="bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl p-6 shadow-md space-y-6">
          {/* Header & Preset Rank Sorters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-stone-950 text-amber-400 text-[10px] font-mono font-black uppercase tracking-widest rounded flex items-center gap-1.5">
                  <ArrowUpDown className="w-3 h-3" />
                  DRAG-AND-DROP & RANK REORDERING SYSTEM
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold uppercase rounded">
                  {approvedVisibleCount} Live in HomeTab Carousel
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-black text-stone-950">
                Approved Testimonials Carousel Sequence Controller
              </h3>
              <p className="text-xs text-stone-600">
                Drag and drop any testimonial card using the grip handle or select an exact Rank (#1, #2, #3...) to control the exact playback sequence in the HomeTab carousel.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold mr-1">
                Quick Rank Sort:
              </span>
              <button
                type="button"
                onClick={() => handlePresetSortApproved("rating")}
                className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-stone-950 text-stone-800 hover:text-amber-400 border border-stone-300 rounded-lg text-[11px] font-mono font-bold uppercase cursor-pointer transition"
              >
                ★ Top Rated First
              </button>
              <button
                type="button"
                onClick={() => handlePresetSortApproved("newest")}
                className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-stone-950 text-stone-800 hover:text-amber-400 border border-stone-300 rounded-lg text-[11px] font-mono font-bold uppercase cursor-pointer transition"
              >
                Newest First
              </button>
              <button
                type="button"
                onClick={() => handlePresetSortApproved("reverse")}
                className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-stone-950 text-stone-800 hover:text-amber-400 border border-stone-300 rounded-lg text-[11px] font-mono font-bold uppercase cursor-pointer transition"
              >
                Reverse Order
              </button>
            </div>
          </div>

          {/* LIVE HOMETAB CAROUSEL SEQUENCE STRIP (DRAGGABLE PILLS) */}
          {approvedTestimonials.length > 0 && (
            <div className="p-4 bg-stone-950 text-[#F4F1EA] rounded-xl space-y-2.5 border border-stone-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Live HomeTab Carousel Display Sequence (Drag Pills or Cards Below to Reorder)
                </span>
                <span className="text-[10px] font-mono text-stone-400">
                  Sequence #1 → #{approvedTestimonials.length}
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {approvedTestimonials.map((item, idx) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleHtmlDragStart(item.id)}
                    onDragOver={(e) => handleHtmlDragOver(e, item.id)}
                    onDrop={(e) => handleHtmlDrop(e, item.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono shrink-0 cursor-grab active:cursor-grabbing transition ${
                      dragOverId === item.id
                        ? "bg-amber-500 text-stone-950 border-amber-300 scale-105"
                        : item.visible !== false
                        ? "bg-stone-900 text-stone-100 border-stone-700 hover:border-amber-400"
                        : "bg-stone-900/50 text-stone-500 border-stone-800 line-through"
                    }`}
                    title="Drag pill to reorder position in HomeTab carousel"
                  >
                    <GripVertical className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="px-1.5 py-0.5 bg-amber-500 text-stone-950 text-[10px] font-black rounded">
                      #{idx + 1}
                    </span>
                    <span className="font-bold truncate max-w-[130px]">{item.buyerName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DRAG-AND-DROP & RANK-BASED LIST OF APPROVED TESTIMONIALS */}
          {filteredApproved.length === 0 ? (
            <div className="p-10 text-center bg-[#F4F1EA] border border-dashed border-stone-300 rounded-xl space-y-2">
              <ShieldCheck className="w-8 h-8 text-stone-400 mx-auto" />
              <h4 className="text-sm font-serif font-bold text-stone-800">
                No Approved Testimonials Match Filter
              </h4>
              <p className="text-xs text-stone-500">
                Approve pending submissions above or clear your search filter.
              </p>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={filteredApproved}
              onReorder={handleFramerDragReorder}
              className="space-y-4"
            >
              {filteredApproved.map((item, idx) => {
                const currentRank = approvedTestimonials.findIndex((a) => a.id === item.id) + 1;
                const isLiveOnHome = item.visible !== false;

                return (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    draggable
                    onDragStart={() => handleHtmlDragStart(item.id)}
                    onDragOver={(e) => handleHtmlDragOver(e, item.id)}
                    onDrop={(e) => handleHtmlDrop(e, item.id)}
                    className={`bg-[#FAF8F5] border-2 rounded-2xl p-5 transition-colors shadow-xs select-none ${
                      dragOverId === item.id
                        ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-400"
                        : isLiveOnHome
                        ? "border-stone-300 hover:border-stone-900"
                        : "border-stone-200 opacity-75"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                      {/* Left: Drag Handle + Rank Controller + Content */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Drag-and-Drop & Rank Number Column */}
                        <div className="flex flex-col items-center gap-1.5 bg-[#F4F1EA] border-2 border-stone-300 rounded-xl p-2.5 shrink-0">
                          {/* Tactile Drag Handle */}
                          <div
                            className="flex items-center gap-1 px-2 py-1 bg-stone-200/80 hover:bg-stone-300 text-stone-700 rounded cursor-grab active:cursor-grabbing text-[9px] font-mono font-bold uppercase tracking-wider"
                            title="Drag card up or down to reorder in HomeTab carousel"
                          >
                            <GripVertical className="w-3.5 h-3.5 text-stone-900" />
                            <span>Drag</span>
                          </div>

                          <span className="text-[9px] font-mono uppercase text-stone-500 font-bold mt-0.5">
                            Rank
                          </span>

                          {/* Direct Rank Selector (#1..#N) */}
                          <select
                            value={currentRank || idx + 1}
                            onChange={(e) =>
                              handleSetExactApprovedRank(item.id, Number(e.target.value))
                            }
                            className="bg-stone-950 text-amber-400 font-mono text-xs font-black px-2 py-1 rounded-lg cursor-pointer border border-stone-800"
                            title="Assign exact rank position in HomeTab carousel"
                          >
                            {approvedTestimonials.map((_, posIdx) => (
                              <option key={posIdx + 1} value={posIdx + 1}>
                                #{posIdx + 1}
                              </option>
                            ))}
                          </select>

                          {/* Up / Down / Top Rank Buttons */}
                          <div className="flex items-center gap-1 pt-1">
                            <button
                              type="button"
                              disabled={currentRank <= 1}
                              onClick={() => handleMoveApprovedRank(item.id, "up")}
                              className="p-1 bg-white hover:bg-stone-950 text-stone-700 hover:text-white border border-stone-300 rounded cursor-pointer transition disabled:opacity-40"
                              title="Move Up 1 Rank"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={currentRank >= approvedTestimonials.length}
                              onClick={() => handleMoveApprovedRank(item.id, "down")}
                              className="p-1 bg-white hover:bg-stone-950 text-stone-700 hover:text-white border border-stone-300 rounded cursor-pointer transition disabled:opacity-40"
                              title="Move Down 1 Rank"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          {currentRank > 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveApprovedRank(item.id, "top")}
                              className="w-full py-0.5 px-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-900 hover:text-stone-950 border border-amber-400 rounded text-[8.5px] font-mono font-black uppercase flex items-center justify-center gap-0.5 cursor-pointer transition mt-0.5"
                              title="Promote immediately to Rank #1"
                            >
                              <ChevronsUp className="w-2.5 h-2.5" />
                              <span>#1 Top</span>
                            </button>
                          )}
                        </div>

                        {/* Review Details */}
                        <div className="flex-1 min-w-0 space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 bg-stone-950 text-amber-400 text-[10px] font-mono font-black uppercase rounded">
                              Carousel Rank #{currentRank}
                            </span>

                            {isLiveOnHome ? (
                              <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Approved • Live on HomeTab
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-stone-200 text-stone-700 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                                <EyeOff className="w-3 h-3" />
                                Approved • Hidden
                              </span>
                            )}

                            {/* Star Rating */}
                            <div className="flex items-center gap-0.5 bg-[#F4F1EA] px-2.5 py-0.5 rounded-md border border-stone-200">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${
                                    s <= Math.round(item.rating)
                                      ? "text-amber-500 fill-amber-500"
                                      : "text-stone-300"
                                  }`}
                                />
                              ))}
                              <span className="text-[11px] font-mono font-bold text-stone-900 ml-1">
                                {item.rating.toFixed(1)}
                              </span>
                            </div>

                            <span className="text-[11px] font-mono text-stone-500">
                              {item.dossierRef} • {item.purchaseDate}
                            </span>
                          </div>

                          <div>
                            <div className="flex flex-wrap items-baseline gap-2">
                              <h4 className="text-base font-serif font-black text-stone-950">
                                {item.buyerName}
                              </h4>
                              <span className="text-xs text-stone-600 font-medium">
                                ({item.buyerTitle})
                              </span>
                              <span className="text-xs font-mono text-amber-800 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {item.location}
                              </span>
                            </div>
                            <div className="text-xs font-serif font-bold text-stone-800 mt-0.5 flex items-center gap-1.5">
                              {item.itemCategory === "Vehicle Acquisition" ? (
                                <Car className="w-3.5 h-3.5 text-amber-700" />
                              ) : (
                                <Wrench className="w-3.5 h-3.5 text-amber-700" />
                              )}
                              <span>{item.purchasedItem}</span>
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-stone-700 italic bg-[#F4F1EA] p-3.5 rounded-xl border border-stone-200/90 leading-relaxed">
                            "{item.comment}"
                          </p>

                          {/* Verification Images Attachments */}
                          {item.verificationImages && item.verificationImages.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2.5 pt-1">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                                Verification Proof:
                              </span>
                              {item.verificationImages.map((vImg) => (
                                <button
                                  key={vImg.id}
                                  type="button"
                                  onClick={() =>
                                    setPreviewImageModal({ url: vImg.imageUrl, label: vImg.label })
                                  }
                                  className="flex items-center gap-2 px-2.5 py-1 bg-[#F4F1EA] hover:bg-stone-200 border border-stone-300 rounded-lg text-left cursor-pointer transition group"
                                >
                                  <img
                                    src={vImg.imageUrl}
                                    alt={vImg.label}
                                    className="w-7 h-7 rounded object-cover border border-stone-300"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=600&auto=format&fit=crop&q=80";
                                    }}
                                  />
                                  <div>
                                    <span className="text-[10px] font-sans font-bold text-stone-900 block group-hover:underline">
                                      {vImg.label}
                                    </span>
                                    <span className="text-[9px] font-mono text-emerald-700 block">
                                      Inspect Proof
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Moderation & Display Controls */}
                      <div className="flex flex-wrap lg:flex-col items-stretch justify-end gap-2 shrink-0 lg:w-52 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-200">
                        <button
                          type="button"
                          onClick={() => handleToggleVisible(item)}
                          className={`py-2 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition border ${
                            item.visible !== false
                              ? "bg-stone-900 hover:bg-stone-800 text-[#F4F1EA] border-stone-950"
                              : "bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-600"
                          }`}
                        >
                          {item.visible !== false ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hide from Home</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Unhide / Show</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleVerifiedBadge(item)}
                          className={`py-2 px-3 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition border ${
                            item.verifiedPurchase
                              ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                              : "bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200"
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>
                            {item.verifiedPurchase ? "Verified Badge: ON" : "Verified Badge: OFF"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReject(item)}
                          className="py-2 px-3 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject / Unpublish</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="py-2 px-2.5 bg-[#F4F1EA] hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-[11px] font-mono font-bold uppercase flex items-center justify-center gap-1 cursor-pointer transition"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="py-2 px-2.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 rounded-xl text-[11px] font-mono font-bold uppercase flex items-center justify-center gap-1 cursor-pointer transition"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. SECTION C: REJECTED TESTIMONIALS ARCHIVE (WITH RE-APPROVE OPTION) */}
      {/* =================================================================== */}
      {(filterTab === "all" || filterTab === "rejected") && filteredRejected.length > 0 && (
        <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-serif font-black uppercase tracking-wider text-stone-900">
                Rejected Testimonials ({filteredRejected.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-stone-500">
              Excluded from HomeTab Carousel
            </span>
          </div>

          <div className="space-y-3">
            {filteredRejected.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-[#F4F1EA] border border-stone-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-80"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded text-[9px] font-mono font-bold uppercase">
                      Rejected
                    </span>
                    <strong className="text-xs font-serif text-stone-900">
                      {item.buyerName}
                    </strong>
                    <span className="text-xs text-stone-500">• {item.purchasedItem}</span>
                  </div>
                  <p className="text-xs text-stone-600 italic">"{item.comment}"</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApprove(item)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 rounded-xl text-xs font-mono font-bold uppercase cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Image Lightbox Modal */}
      <AnimatePresence>
        {previewImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImageModal(null)}
            className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl"
            >
              <div className="p-4 bg-stone-950 text-[#F4F1EA] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">
                    {previewImageModal.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewImageModal(null)}
                  className="text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <img
                  src={previewImageModal.url}
                  alt={previewImageModal.label}
                  className="w-full h-80 object-cover rounded-xl border border-stone-300"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminTestimonialsDashboard;
