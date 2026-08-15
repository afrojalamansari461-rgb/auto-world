import React, { useState, useEffect, useRef } from "react";
import { 
  Wrench, Cpu, Zap, Flame, Disc, Layers, Sliders, Activity, 
  Wind, Lightbulb, Upload, Trash2, Check, ArrowLeft, ArrowRight, 
  Star, DollarSign, MapPin, Phone, Mail, FileText, CheckCircle2, 
  ShieldCheck, AlertTriangle, Image as ImageIcon, Plus, RefreshCw, 
  Eye, Edit, X, ExternalLink, MessageCircle, Sparkles, Tag, HelpCircle
} from "lucide-react";
import { 
  Part, UserPartListing, PART_CATEGORIES, PART_BRANDS, 
  PART_RARITY_TIERS, PART_CONDITION_LABELS 
} from "../types";
import type { User as FirebaseUser } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import { setDoc, doc, collection, query, where, getDocs, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

interface PartsUploadWizardProps {
  currentUser: FirebaseUser | null;
  subscriptionActive: boolean;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onSignInClick?: () => void;
  onViewPartDossier?: (part: Part) => void;
}

// Helper function to compress images before upload
const compressBase64Url = (dataUrl: string, maxDim = 600, quality = 0.6): Promise<string> => {
  if (!dataUrl || !dataUrl.startsWith("data:image")) return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

const MOTORSPORT_IMAGE_PRESETS = [
  { label: "Twin Turbo Kit", url: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800" },
  { label: "Carbon GT Wing", url: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800" },
  { label: "Titanium Exhaust", url: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800" },
  { label: "Ceramic Brakes", url: "https://images.unsplash.com/photo-1600793575654-910699b5e4d4?w=800" },
  { label: "Forged Racing Wheels", url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800" },
  { label: "Coilover Suspension", url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800" }
];

export default function PartsUploadWizard({
  currentUser,
  subscriptionActive,
  showToast,
  onSignInClick,
  onViewPartDossier
}: PartsUploadWizardProps) {
  const [subTab, setSubTab] = useState<"wizard" | "myParts">("wizard");
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myPartsList, setMyPartsList] = useState<UserPartListing[]>([]);
  const [loadingMyParts, setLoadingMyParts] = useState(false);
  const [editingPart, setEditingPart] = useState<UserPartListing | null>(null);

  // Form States
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Part["category"]>("turbo");
  const [brand, setBrand] = useState("Garrett");
  const [customBrand, setCustomBrand] = useState("");
  const [rarity, setRarity] = useState<Part["rarity"]>("Rare");
  const [partNumber, setPartNumber] = useState("");
  
  // Step 2: Specs & Fitment
  const [compatibleVehicles, setCompatibleVehicles] = useState("");
  const [material, setMaterial] = useState("Forged Aerospace Alloy");
  const [powerGain, setPowerGain] = useState("+65 WHP / 90 Nm Torque");
  const [weight, setWeight] = useState("4.2 kg (Ultralight)");
  const [dimensions, setDimensions] = useState("Standard OEM Bolt-On");
  const [warranty, setWarranty] = useState("1 Year Manufacturer Warranty");

  // Step 3: Condition & Description
  const [condition, setCondition] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [description, setDescription] = useState("");

  // Step 4: Photos
  const [photos, setPhotos] = useState<Array<{ id: string; src: string; isPrimary: boolean }>>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 5: Valuation & Seller
  const [price, setPrice] = useState<string>("");
  const [negotiable, setNegotiable] = useState<"yes" | "no">("no");
  const [sellerName, setSellerName] = useState(currentUser?.displayName || "");
  const [sellerPhone, setSellerPhone] = useState("+91 98200 11988");
  const [sellerEmail, setSellerEmail] = useState(currentUser?.email || "");
  const [location, setLocation] = useState("Mumbai, Maharashtra");

  // Sync user details on auth
  useEffect(() => {
    if (currentUser) {
      if (!sellerName && currentUser.displayName) setSellerName(currentUser.displayName);
      if (!sellerEmail && currentUser.email) setSellerEmail(currentUser.email);
    }
  }, [currentUser]);

  // Real-time listener for user's listed parts
  useEffect(() => {
    if (!currentUser) {
      setMyPartsList([]);
      return;
    }
    setLoadingMyParts(true);
    const q = query(collection(db, "parts"), where("userId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: UserPartListing[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as UserPartListing);
      });
      setMyPartsList(items);
      setLoadingMyParts(false);
    }, (err) => {
      console.warn("My parts listener error:", err);
      setLoadingMyParts(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawBase64 = event.target?.result as string;
        const compressed = await compressBase64Url(rawBase64);
        setPhotos(prev => [
          ...prev,
          {
            id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            src: compressed,
            isPrimary: prev.length === 0
          }
        ]);
      };
      reader.readAsDataURL(file);
    }
    setUploadingImage(false);
  };

  const handleAddPresetImage = (url: string) => {
    setPhotos(prev => [
      ...prev,
      {
        id: `preset-${Date.now()}`,
        src: url,
        isPrimary: prev.length === 0
      }
    ]);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (updated.length > 0 && !updated.some(p => p.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated;
    });
  };

  const handleEditPart = (part: UserPartListing) => {
    setEditingPart(part);
    setTitle(part.title || "");
    setCategory(part.category || "turbo");
    setBrand(part.brand || "Garrett Motion");
    setRarity(part.rarity || "Rare");
    setPartNumber(part.partNumber || "");
    setCompatibleVehicles(part.compatibleVehicles || "");
    if (part.specifications) {
      setMaterial(part.specifications["Material Composition"] || "Forged Aerospace Alloy");
      setPowerGain(part.specifications["Power Output / Downforce"] || "+65 WHP / 90 Nm Torque");
      setWeight(part.specifications["Net Weight"] || "4.2 kg");
      setDimensions(part.specifications["Fitment Dimensions"] || "Standard OEM Fitment");
    }
    setWarranty(part.warranty || "1 Year Manufacturer Warranty");
    setCondition((part.condition as any) || 5);
    setDescription(part.description || "");
    if (part.photos && part.photos.length > 0) {
      setPhotos(part.photos.map((p, idx) => ({
        id: (p as any).id || `photo-${idx}`,
        src: p.src,
        isPrimary: (p as any).isPrimary ?? idx === 0
      })));
    } else if (part.image) {
      setPhotos([{ id: "p1", src: part.image, isPrimary: true }]);
    }
    setPrice(String(part.price || ""));
    setNegotiable((part.negotiable as any) || "no");
    setSellerName(part.sellerName || "");
    setSellerPhone(part.sellerPhone || "");
    setSellerEmail(part.sellerEmail || "");
    setLocation(part.location || "");
    setCurrentStep(1);
    setSubTab("wizard");
  };

  const resetForm = () => {
    setTitle("");
    setCategory("turbo");
    setBrand("Garrett");
    setCustomBrand("");
    setRarity("Rare");
    setPartNumber("");
    setCompatibleVehicles("");
    setMaterial("Forged Aerospace Alloy");
    setPowerGain("+65 WHP / 90 Nm Torque");
    setWeight("4.2 kg");
    setDimensions("Standard OEM Fitment");
    setWarranty("1 Year Manufacturer Warranty");
    setCondition(5);
    setDescription("");
    setPhotos([]);
    setPrice("");
    setNegotiable("no");
    setCurrentStep(1);
    setEditingPart(null);
  };

  // Submit to Firestore
  const handleSubmitPart = async () => {
    if (!currentUser) {
      showToast("Please authenticate your account to publish hardware.", "error");
      if (onSignInClick) onSignInClick();
      return;
    }

    if (!title.trim()) {
      showToast("Please enter a descriptive part title.", "error");
      setCurrentStep(1);
      return;
    }

    const numericPrice = parseInt(price.replace(/[^0-9]/g, "")) || 0;
    if (numericPrice <= 0) {
      showToast("Please enter a valid asking price.", "error");
      setCurrentStep(5);
      return;
    }

    setIsSubmitting(true);
    const finalBrand = brand === "Other" && customBrand ? customBrand : brand;
    const partId = editingPart ? editingPart.id : `part-${Date.now()}`;

    const partPayload: UserPartListing = {
      id: partId,
      userId: currentUser.uid,
      title: title.trim(),
      category,
      rarity,
      condition,
      brand: finalBrand,
      price: numericPrice,
      compatibleVehicles: compatibleVehicles.trim() || "Universal Specification",
      description: description.trim() || "Performance hardware inspected and verified for immediate dispatch.",
      negotiable,
      status: "active",
      photos: photos.map(p => ({ id: p.id, src: p.src, isPrimary: p.isPrimary })),
      featured: subscriptionActive,
      urgent: false,
      verified: true,
      partNumber: partNumber.trim() || "OEM-PROTOTYPE",
      warranty: warranty.trim() || "Standard 1 Year Warranty",
      specifications: {
        "Material Composition": material,
        "Power Output / Downforce": powerGain,
        "Net Weight": weight,
        "Fitment Dimensions": dimensions
      },
      sellerName: sellerName.trim() || currentUser.displayName || "Motorsport Tuner",
      sellerPhone: sellerPhone.trim() || "+91 98200 11988",
      sellerEmail: sellerEmail.trim() || currentUser.email || "tuner@autoworld.com",
      location: location.trim() || "Mumbai, Maharashtra",
      datePosted: editingPart?.datePosted || new Date().toISOString(),
      createdAt: editingPart?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "parts", partId), partPayload);
      showToast(editingPart ? "Performance Part updated successfully!" : "Performance Part listed live on Auto World Marketplace!", "success");
      resetForm();
      setSubTab("myParts");
    } catch (err) {
      console.error("Failed to publish part listing:", err);
      handleFirestoreError(err, OperationType.WRITE, `parts/${partId}`);
      showToast("Failed to save part. Please check requirements.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePart = async (partId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this performance part?")) return;
    try {
      await deleteDoc(doc(db, "parts", partId));
      showToast("Hardware part deleted from marketplace.", "info");
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Could not delete part.", "error");
    }
  };

  const handleToggleStatus = async (part: UserPartListing) => {
    const nextStatus = part.status === "active" ? "sold" : "active";
    try {
      await updateDoc(doc(db, "parts", part.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      showToast(`Part marked as ${nextStatus.toUpperCase()}`, "info");
    } catch (e) {
      console.error("Status toggle error:", e);
    }
  };

  const rarityMeta = PART_RARITY_TIERS[rarity];

  return (
    <div className="space-y-8 font-sans">
      
      {/* Sub Tab Switcher: 5-Step Wizard vs My Listed Parts */}
      <div className="flex items-center justify-between border-b border-stone-300 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSubTab("wizard"); setEditingPart(null); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2 border ${
              subTab === "wizard"
                ? "bg-stone-950 text-[#F4F1EA] border-stone-950 shadow-xs"
                : "bg-white text-stone-600 border-stone-300 hover:border-stone-400"
            }`}
          >
            <Plus className="w-4 h-4 text-amber-500" />
            <span>{editingPart ? "Edit Hardware Listing" : "5-Step Hardware Wizard"}</span>
          </button>

          <button
            onClick={() => setSubTab("myParts")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2 border ${
              subTab === "myParts"
                ? "bg-stone-950 text-[#F4F1EA] border-stone-950 shadow-xs"
                : "bg-white text-stone-600 border-stone-300 hover:border-stone-400"
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>My Listed Hardware ({myPartsList.length})</span>
          </button>
        </div>

        {subTab === "wizard" && (
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-stone-500">
            <span className="font-bold text-amber-700">STEP 0{currentStep} / 05</span>
            <span>•</span>
            <span>{["Classification", "Dyno Specs", "Condition", "Photos", "Valuation"][currentStep - 1]}</span>
          </div>
        )}
      </div>

      {/* VIEW: MY LISTED HARDWARE */}
      {subTab === "myParts" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif font-black text-stone-950">My Listed Performance Hardware</h2>
              <p className="text-xs text-stone-600 font-sans mt-0.5">
                Manage your active aftermarket upgrades, update valuations, or mark items as sold.
              </p>
            </div>
            <button
              onClick={() => { resetForm(); setSubTab("wizard"); }}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>List Another Part</span>
            </button>
          </div>

          {loadingMyParts ? (
            <div className="p-12 text-center text-stone-500 font-mono text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
              <span>Synchronizing motorsport hardware inventory...</span>
            </div>
          ) : myPartsList.length === 0 ? (
            <div className="p-12 text-center bg-[#FAF8F5] border border-dashed border-stone-300 rounded-lg space-y-3">
              <Wrench className="w-8 h-8 text-stone-400 mx-auto" />
              <div className="text-sm font-bold text-stone-800">No Hardware Components Listed Yet</div>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                You haven't published any performance parts yet. Use our 5-step wizard to list turbochargers, wings, exhausts, and racing hardware.
              </p>
              <button
                onClick={() => { resetForm(); setSubTab("wizard"); }}
                className="mt-2 px-5 py-2.5 bg-stone-950 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-stone-800 transition cursor-pointer"
              >
                Launch 5-Step Wizard
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPartsList.map((part) => {
                const rMeta = PART_RARITY_TIERS[part.rarity] || PART_RARITY_TIERS.Common;
                const pImage = part.photos && part.photos.length > 0 ? part.photos[0].src : "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800";
                
                return (
                  <div
                    key={part.id}
                    className="bg-[#FAF8F5] border border-stone-300 rounded-lg overflow-hidden flex flex-col justify-between shadow-xs hover:border-amber-700 transition"
                  >
                    <div className="relative h-44 bg-stone-900">
                      <img src={pImage} alt={part.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border shadow ${rMeta.badgeClass}`}>
                          {part.rarity}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                          part.status === "active" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40" : "bg-stone-800 text-stone-300"
                        }`}>
                          {part.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-amber-800 font-bold uppercase">
                          <span>{part.brand}</span>
                          <span>₹{part.price.toLocaleString("en-IN")}</span>
                        </div>
                        <h4 className="font-serif font-black text-stone-950 text-base mt-1 line-clamp-1">
                          {part.title}
                        </h4>
                        <div className="text-[11px] text-stone-600 font-mono mt-1 truncate">
                          Fitment: {part.compatibleVehicles}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-stone-200 flex items-center justify-between gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            if (onViewPartDossier) {
                              onViewPartDossier({
                                ...part,
                                isUserListing: true,
                                listingId: part.id
                              } as Part);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-stone-950 text-white text-[10px] font-bold uppercase tracking-wider rounded hover:bg-stone-800 transition cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Dossier</span>
                        </button>

                        <button
                          onClick={() => handleEditPart(part)}
                          className="px-2.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase tracking-wider rounded hover:bg-amber-200 transition cursor-pointer flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3 text-amber-700" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(part)}
                          className="px-2 py-1.5 bg-stone-200 text-stone-800 text-[10px] font-bold uppercase tracking-wider rounded hover:bg-stone-300 transition cursor-pointer"
                        >
                          {part.status === "active" ? "Mark Sold" : "Reactivate"}
                        </button>

                        <button
                          onClick={() => handleDeletePart(part.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                          title="Delete Part"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: 5-STEP HARDWARE UPLOAD WIZARD */}
      {subTab === "wizard" && (
        <div className="bg-[#FAF8F5] border border-stone-300 rounded-xl p-6 sm:p-8 space-y-8 shadow-sm">
          
          {/* Step Progress Bar */}
          <div className="grid grid-cols-5 gap-2 border-b border-stone-300 pb-6">
            {[
              { num: 1, title: "Classification & Tier" },
              { num: 2, title: "Dyno Specs & Fitment" },
              { num: 3, title: "Condition & Log" },
              { num: 4, title: "Hardware Media" },
              { num: 5, title: "Valuation & Live" }
            ].map((st) => (
              <div
                key={st.num}
                onClick={() => setCurrentStep(st.num)}
                className={`cursor-pointer pb-1 border-b-2 transition ${
                  currentStep === st.num
                    ? "border-amber-700 text-amber-900 font-bold"
                    : currentStep > st.num
                    ? "border-emerald-600 text-emerald-800"
                    : "border-stone-200 text-stone-400"
                }`}
              >
                <div className="text-[10px] font-mono uppercase tracking-wider">Step 0{st.num}</div>
                <div className="text-xs font-serif font-bold truncate hidden sm:block">{st.title}</div>
              </div>
            ))}
          </div>

          {/* STEP 1: Classification & Rarity Tier */}
          {currentStep === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <h3 className="text-xl font-serif font-black text-stone-950">Classification & Rarity Tier</h3>
                <p className="text-xs text-stone-600">Specify the hardware category, brand heritage, and rarity grading.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Part Title / Nomenclature *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Garrett GT2860R Dual Ball Bearing Turbocharger Kit"
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Hardware Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  >
                    {PART_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label} ({cat.description})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Manufacturer / Tuner Brand *
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  >
                    {PART_BRANDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {brand === "Other" && (
                    <input
                      type="text"
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      placeholder="Enter custom tuner brand name"
                      className="w-full mt-2 px-4 py-2.5 bg-white border border-stone-300 rounded text-xs text-stone-950"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Rarity & Performance Grading *
                  </label>
                  <select
                    value={rarity}
                    onChange={(e) => setRarity(e.target.value as any)}
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700 font-bold"
                  >
                    <option value="Common">Common Tier (Standard OEM/Street Spec)</option>
                    <option value="Uncommon">Uncommon Tier (Enthusiast Bolt-On)</option>
                    <option value="Rare">Rare Tier (Track/Dyno Tuned Hardware)</option>
                    <option value="Epic">Epic Tier (Billet/Carbon High-End Racing)</option>
                    <option value="Legendary">Legendary Tier (FIA/Limited Homologation Spec)</option>
                  </select>
                  <div className="mt-2 p-2.5 bg-stone-100 rounded border border-stone-200 flex items-center justify-between">
                    <span className="text-[11px] text-stone-600 font-medium">Badge Preview:</span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded border ${rarityMeta.badgeClass}`}>
                      {rarityMeta.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Part Number / OEM SKU
                  </label>
                  <input
                    type="text"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="e.g. GRT-GT2860-01"
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700 font-mono"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Dyno Specs & Fitment */}
          {currentStep === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <h3 className="text-xl font-serif font-black text-stone-950">Dyno Specifications & Fitment</h3>
                <p className="text-xs text-stone-600">Provide precise compatibility data and dyno power improvements.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Compatible Vehicle Models & Chassis *
                  </label>
                  <input
                    type="text"
                    value={compatibleVehicles}
                    onChange={(e) => setCompatibleVehicles(e.target.value)}
                    placeholder="e.g. Nissan GT-R R35 / 370Z / Universal T4 Flange"
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  />
                  <span className="text-[10px] text-stone-500 font-mono">Tip: Mention chassis codes (e.g. G80, MK4, R34) or Universal for cross-compatibility.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Material Composition
                  </label>
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="e.g. Dry Pre-Preg Carbon Fiber / Full Inconel"
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Power Output / Dyno Gain
                  </label>
                  <input
                    type="text"
                    value={powerGain}
                    onChange={(e) => setPowerGain(e.target.value)}
                    placeholder="e.g. +75 WHP / 250 kg Downforce @ 200 km/h"
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Hardware Net Weight
                  </label>
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 3.8 kg (Ultra-Lightweight)"
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Warranty Terms
                  </label>
                  <input
                    type="text"
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    placeholder="e.g. 1 Year Tuner Replacement Warranty"
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Condition & Mechanical Narrative */}
          {currentStep === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <h3 className="text-xl font-serif font-black text-stone-950">Condition Rating & Narrative</h3>
                <p className="text-xs text-stone-600">Rate the physical wear and describe installation/testing history.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Condition Star Rating (1 to 5) *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {([1, 2, 3, 4, 5] as const).map((star) => {
                      const cInfo = PART_CONDITION_LABELS[star];
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setCondition(star)}
                          className={`p-3 rounded border text-left transition cursor-pointer ${
                            condition === star
                              ? "bg-amber-50 border-amber-600 ring-2 ring-amber-600/30"
                              : "bg-white border-stone-300 hover:border-stone-400"
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${s <= star ? "text-amber-500 fill-amber-500" : "text-stone-300"}`}
                              />
                            ))}
                          </div>
                          <div className="text-xs font-bold text-stone-900">{cInfo.title}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Engineering Description & Condition Log *
                  </label>
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide full details on dyno tests, mileage on part, mounting hardware included, and any ECU mapping requirements..."
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700 font-sans"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Hardware Photography */}
          {currentStep === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <h3 className="text-xl font-serif font-black text-stone-950">Hardware Media & Photography</h3>
                <p className="text-xs text-stone-600">Upload high-resolution images of the physical item or choose sample presets.</p>
              </div>

              {/* Upload Dropzone */}
              <div className="p-8 bg-white border-2 border-dashed border-stone-300 rounded-lg text-center space-y-3">
                <ImageIcon className="w-10 h-10 text-amber-700 mx-auto" />
                <div className="text-xs sm:text-sm font-bold text-stone-900">
                  Upload Physical Hardware Photos
                </div>
                <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                  Drag and drop JPG/PNG images or browse files. Images are automatically optimized.
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select Images</span>
                </button>
              </div>

              {/* Quick Preset Presets */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold block">
                  Or pick high-fidelity motorsport sample presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  {MOTORSPORT_IMAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleAddPresetImage(preset.url)}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded text-xs font-medium text-stone-800 transition cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Previews */}
              {photos.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Attached Hardware Photos ({photos.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {photos.map((photo, idx) => (
                      <div key={photo.id} className="relative rounded-lg overflow-hidden border-2 border-stone-300 bg-stone-900 group h-32">
                        <img src={photo.src} alt="Hardware" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {photo.isPrimary && (
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-amber-600 text-white text-[9px] font-mono font-bold rounded">
                            PRIMARY
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 5: Valuation & Tuner Dossier */}
          {currentStep === 5 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <h3 className="text-xl font-serif font-black text-stone-950">Valuation & Merchant Dossier</h3>
                <p className="text-xs text-stone-600">Set your asking valuation and confirm contact details for prospective buyers.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Asking Valuation (INR ₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-serif font-black text-lg">₹</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 85000"
                      className="w-full pl-8 pr-4 py-3 bg-white border border-stone-300 rounded text-base font-serif font-black text-stone-950 focus:outline-none focus:border-amber-700"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Pricing Terms
                  </label>
                  <select
                    value={negotiable}
                    onChange={(e) => setNegotiable(e.target.value as any)}
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  >
                    <option value="no">Firm Valuation (Non-Negotiable)</option>
                    <option value="yes">Price Negotiable for Serious Buyers</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Seller / Tuner Name *
                  </label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="e.g. Apex Motorsports Mumbai"
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Direct Phone / WhatsApp Contact *
                  </label>
                  <input
                    type="text"
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    placeholder="e.g. +91 98200 11988"
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Seller Email
                  </label>
                  <input
                    type="email"
                    value={sellerEmail}
                    onChange={(e) => setSellerEmail(e.target.value)}
                    placeholder="e.g. contact@apexmotorsports.com"
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Dispatch Location / City *
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded text-sm text-stone-950 focus:outline-none focus:border-amber-700"
                  />
                </div>
              </div>

              {/* Summary Dossier Preview */}
              <div className="p-4 bg-stone-100 rounded-lg border border-stone-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold">
                    MARKETPLACE PUBLISHING DOSSIER PREVIEW
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${rarityMeta.badgeClass}`}>
                    {rarityMeta.label}
                  </span>
                </div>
                <div className="text-sm font-serif font-black text-stone-950">{title || "Untitled Performance Component"}</div>
                <div className="text-xs text-stone-600 font-mono">
                  {brand} • {category} • ₹{(parseInt(price) || 0).toLocaleString("en-IN")} • {compatibleVehicles || "Universal"}
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-stone-300 pt-6">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-900 text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </button>
            ) : <div />}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-6 py-2.5 bg-stone-950 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitPart}
                className="px-8 py-3 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold uppercase tracking-widest rounded transition cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? "Broadcasting Hardware..." : editingPart ? "Update Listing" : "Publish to Auto World"}</span>
              </button>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
