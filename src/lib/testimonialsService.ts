import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, deleteDoc, onSnapshot, collection, getDocs, getDoc } from "firebase/firestore";
import { OWNER_EMAIL } from "./userRoles";

export type TestimonialStatus = "pending" | "approved" | "rejected";

export interface VerificationAttachment {
  id: string;
  label: string;
  type: "delivery_photo" | "invoice_proof" | "chassis_plaque";
  imageUrl: string;
  verified: boolean;
}

export interface VerifiedTransactionLog {
  id: string;
  role: "Verified Buyer" | "Verified Seller";
  itemTitle: string;
  itemCategory: "Vehicle Acquisition" | "Motorsport Hardware";
  dossierRef: string;
  dateLabel: string;
  location?: string;
  source: string;
}

export interface BuyerTestimonial {
  id: string;
  buyerName: string;
  buyerTitle: string;
  buyerEmail?: string;
  buyerUid?: string;
  transactionRole?: "Verified Buyer" | "Verified Seller";
  location: string;
  purchasedItem: string;
  itemCategory: "Vehicle Acquisition" | "Motorsport Hardware";
  rating: number;
  comment: string;
  purchaseDate: string;
  dossierRef: string;
  status: TestimonialStatus;
  visible: boolean;
  verifiedPurchase: boolean;
  featured?: boolean;
  order: number;
  rank?: number;
  createdAt: string;
  verificationImages: VerificationAttachment[];
}

export interface TestimonialsConfig {
  isSectionVisible: boolean;
  isAutoScrollEnabled: boolean;
  pauseOnHover: boolean;
  scrollSpeed: "slow" | "normal" | "fast";
  sortMode: "custom_order" | "newest" | "highest_rated" | "random";
  sectionBadge: string;
  sectionTitle: string;
  sectionSubtitle: string;
  allowPublicSubmissions: boolean;
}

export const DEFAULT_TESTIMONIALS_CONFIG: TestimonialsConfig = {
  isSectionVisible: true,
  isAutoScrollEnabled: true,
  pauseOnHover: true,
  scrollSpeed: "normal",
  sortMode: "custom_order",
  sectionBadge: "Authenticated Ledger Feedback",
  sectionTitle: "Verified Buyer Testimonials",
  sectionSubtitle:
    "Unedited dispatches from collectors, enthusiasts, and motorsport builders who completed verified acquisitions through Auto World.",
  allowPublicSubmissions: true,
};

export const DEFAULT_TESTIMONIALS: BuyerTestimonial[] = [
  {
    id: "test-1",
    buyerName: "Vikramaditya Singhania",
    buyerTitle: "Private Collector & Enthusiast",
    location: "Mumbai, MH",
    purchasedItem: "2022 Porsche 911 GT3 Touring (992)",
    itemCategory: "Vehicle Acquisition",
    rating: 5.0,
    comment:
      "The mechanical dossier and paint-depth telemetry provided on Auto World were spot-on. I connected directly with the owner in Worli, verified the service ledger at Porsche Centre Mumbai, and closed the deal with zero middleman friction.",
    purchaseDate: "Verified Oct 2026",
    dossierRef: "REF #AW-992GT3",
    status: "approved",
    visible: true,
    verifiedPurchase: true,
    featured: true,
    order: 1,
    rank: 1,
    createdAt: "2026-10-12T10:30:00.000Z",
    verificationImages: [
      {
        id: "v-1a",
        label: "Showroom Handover Bay",
        type: "delivery_photo",
        imageUrl: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=600&auto=format&fit=crop&q=80",
        verified: true,
      },
      {
        id: "v-1b",
        label: "Porsche Centre Inspection Stamp",
        type: "invoice_proof",
        imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80",
        verified: true,
      },
    ],
  },
  {
    id: "test-2",
    buyerName: "Rohan Deshmukh",
    buyerTitle: "Track Day Driver",
    location: "Pune, MH",
    purchasedItem: "Akrapovič Evolution Line Titanium Exhaust",
    itemCategory: "Motorsport Hardware",
    rating: 5.0,
    comment:
      "Finding authentic titanium exhaust hardware without counterfeit risk is tough in India. The part dossier included serial laser-etching photos and fitment verification. Installed on my M3 Competition—flawless acoustic resonance.",
    purchaseDate: "Verified Sep 2026",
    dossierRef: "REF #PART-AW04",
    status: "approved",
    visible: true,
    verifiedPurchase: true,
    featured: true,
    order: 2,
    rank: 2,
    createdAt: "2026-09-25T14:20:00.000Z",
    verificationImages: [
      {
        id: "v-2a",
        label: "Laser-Etched Serial Plaque",
        type: "chassis_plaque",
        imageUrl: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&auto=format&fit=crop&q=80",
        verified: true,
      },
    ],
  },
  {
    id: "test-3",
    buyerName: "Arundhati Nair",
    buyerTitle: "Architect & Grand Tourer Owner",
    location: "Bengaluru, KA",
    purchasedItem: "2021 Mercedes-AMG E63 S 4MATIC+",
    itemCategory: "Vehicle Acquisition",
    rating: 4.9,
    comment:
      "Refreshingly transparent compared to conventional classifieds. Every service invoice, cold-start video inquiry, and odometer log matched the seller's declaration to the kilometer. Best luxury automotive platform in the country.",
    purchaseDate: "Verified Oct 2026",
    dossierRef: "REF #AW-E63AMG",
    status: "approved",
    visible: true,
    verifiedPurchase: true,
    featured: false,
    order: 3,
    rank: 3,
    createdAt: "2026-10-04T09:15:00.000Z",
    verificationImages: [
      {
        id: "v-3a",
        label: "AMG V8 Biturbo Engine Plaque",
        type: "delivery_photo",
        imageUrl: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&auto=format&fit=crop&q=80",
        verified: true,
      },
    ],
  },
  {
    id: "test-4",
    buyerName: "Kabir Malhotra",
    buyerTitle: "Motorsport Tuner",
    location: "New Delhi, DL",
    purchasedItem: "Brembo GT-R Billet 6-Piston Carbon Ceramic Kit",
    itemCategory: "Motorsport Hardware",
    rating: 5.0,
    comment:
      "Sourced a rare Brembo billet caliper kit directly from a verified performance workshop in Gurugram via Auto World. Zero commission markup, instant WhatsApp telemetry exchange, and pristine rotor tolerances.",
    purchaseDate: "Verified Aug 2026",
    dossierRef: "REF #PART-AW09",
    status: "approved",
    visible: true,
    verifiedPurchase: true,
    featured: false,
    order: 4,
    rank: 4,
    createdAt: "2026-08-19T16:45:00.000Z",
    verificationImages: [
      {
        id: "v-4a",
        label: "Billet Caliper Fitment Check",
        type: "chassis_plaque",
        imageUrl: "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=600&auto=format&fit=crop&q=80",
        verified: true,
      },
    ],
  },
  {
    id: "test-5",
    buyerName: "Devansh Reddy",
    buyerTitle: "Automotive Historian",
    location: "Hyderabad, TS",
    purchasedItem: "2020 BMW M2 Competition (Hockenheim Silver)",
    itemCategory: "Vehicle Acquisition",
    rating: 5.0,
    comment:
      "From the first inquiry to physical inspection in Jubilee Hills, the experience felt like a curated concours auction rather than a used car site. The verified owner badge gave me complete peace of mind.",
    purchaseDate: "Verified Sep 2026",
    dossierRef: "REF #AW-F87M2C",
    status: "approved",
    visible: true,
    verifiedPurchase: true,
    featured: false,
    order: 5,
    rank: 5,
    createdAt: "2026-09-14T11:10:00.000Z",
    verificationImages: [
      {
        id: "v-5a",
        label: "Jubilee Hills Handover",
        type: "delivery_photo",
        imageUrl: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&auto=format&fit=crop&q=80",
        verified: true,
      },
    ],
  },
  {
    id: "test-6",
    buyerName: "Siddharth Chokshi",
    buyerTitle: "Time Attack Competitor",
    location: "Chennai, TN",
    purchasedItem: "Öhlins Road & Track DFV Coilover System",
    itemCategory: "Motorsport Hardware",
    rating: 4.9,
    comment:
      "Picked up a freshly serviced Öhlins DFV suspension setup before our weekend stint at MMRT. The seller provided dyno damping curves right through the direct WhatsApp link. Phenomenal enthusiast community.",
    purchaseDate: "Verified Oct 2026",
    dossierRef: "REF #PART-AW12",
    status: "approved",
    visible: true,
    verifiedPurchase: true,
    featured: false,
    order: 6,
    rank: 6,
    createdAt: "2026-10-18T08:00:00.000Z",
    verificationImages: [
      {
        id: "v-6a",
        label: "Shock Dyno Verification Graph",
        type: "invoice_proof",
        imageUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&auto=format&fit=crop&q=80",
        verified: true,
      },
    ],
  },
  {
    id: "test-pending-1",
    buyerName: "Harshvardhan Oberoi",
    buyerTitle: "Supercar Collector & Track Enthusiast",
    location: "Worli, Mumbai",
    purchasedItem: "2023 Porsche 718 Cayman GT4 RS (Weissach Package)",
    itemCategory: "Vehicle Acquisition",
    rating: 5.0,
    comment:
      "Inspected the carbon-weave Weissach aero package and PCCB rotor life indicator directly with the seller's race engineer. Complete cold-start and PDK telemetry matched the Auto World dossier 100%. Seamless escrow & RTO transfer.",
    purchaseDate: "Verified Oct 2026",
    dossierRef: "REF #AW-718GT4RS",
    status: "pending",
    visible: false,
    verifiedPurchase: true,
    featured: true,
    order: 7,
    rank: 7,
    createdAt: "2026-10-28T15:40:00.000Z",
    verificationImages: [
      {
        id: "v-p1a",
        label: "Weissach Delivery Bay Handover",
        type: "delivery_photo",
        imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80",
        verified: true,
      },
      {
        id: "v-p1b",
        label: "Chassis & Weissach Serial Plaque",
        type: "chassis_plaque",
        imageUrl: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=600&auto=format&fit=crop&q=80",
        verified: true,
      },
    ],
  },
  {
    id: "test-pending-2",
    buyerName: "Meera Krishnan",
    buyerTitle: "Rally & Tarmac Spec Builder",
    location: "Coimbatore, TN",
    purchasedItem: "BBS FI-R 20\" Forged Magnesium-Alloy Wheel Set",
    itemCategory: "Motorsport Hardware",
    rating: 4.9,
    comment:
      "Verified the authentic German TUV laser stamp and radial runout report before dispatch from Bengaluru. Saved nearly 9.4 kg of unsprung rotational mass on my G80 M3. Packaging and crate protection were museum grade.",
    purchaseDate: "Verified Oct 2026",
    dossierRef: "REF #PART-BBSFIR",
    status: "pending",
    visible: false,
    verifiedPurchase: true,
    featured: false,
    order: 8,
    rank: 8,
    createdAt: "2026-10-29T02:15:00.000Z",
    verificationImages: [
      {
        id: "v-p2a",
        label: "BBS Forged Serial Stamp Proof",
        type: "chassis_plaque",
        imageUrl: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&auto=format&fit=crop&q=80",
        verified: true,
      },
    ],
  },
];

const STORAGE_KEY_ITEMS = "autoWorld_testimonials_items_v2";
const STORAGE_KEY_CONFIG = "autoWorld_testimonials_config_v2";
const SEED_PENDING_KEY = "autoWorld_testimonials_pending_seeded_v2";

export function normalizeTestimonialRanks(items: BuyerTestimonial[]): BuyerTestimonial[] {
  // Keep approved items ranked 1..K in their current relative order, followed by pending/rejected items
  const approved = items
    .filter((i) => i.status === "approved")
    .sort((a, b) => (a.order ?? a.rank ?? 999) - (b.order ?? b.rank ?? 999))
    .map((item, idx) => ({
      ...item,
      order: idx + 1,
      rank: idx + 1,
    }));

  const others = items
    .filter((i) => i.status !== "approved")
    .map((item, idx) => ({
      ...item,
      order: approved.length + idx + 1,
      rank: approved.length + idx + 1,
    }));

  return [...approved, ...others];
}

export function getLocalTestimonials(): BuyerTestimonial[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to read local testimonials:", e);
  }
  return DEFAULT_TESTIMONIALS;
}

export function getLocalTestimonialsConfig(): TestimonialsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...DEFAULT_TESTIMONIALS_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.warn("Failed to read local testimonials config:", e);
  }
  return DEFAULT_TESTIMONIALS_CONFIG;
}

export async function saveTestimonialsData(
  items: BuyerTestimonial[],
  config?: TestimonialsConfig
): Promise<void> {
  const finalConfig = config || getLocalTestimonialsConfig();
  const normalizedItems = items.map((item, idx) => ({
    ...item,
    order: item.order ?? idx + 1,
    rank: item.rank ?? item.order ?? idx + 1,
  }));

  try {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(normalizedItems));
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(finalConfig));
  } catch (e) {
    console.warn("Failed to write testimonials to localStorage:", e);
  }

  window.dispatchEvent(new Event("autoWorld_testimonials_updated"));

  try {
    const ref = doc(db, "admin_settings", "testimonials");
    await setDoc(
      ref,
      {
        items: normalizedItems,
        config: finalConfig,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Firestore admin_settings/testimonials sync notice:", err);
  }
}

export async function syncSingleTestimonialToFirestore(item: BuyerTestimonial): Promise<void> {
  try {
    const itemRef = doc(db, "testimonials", item.id);
    await setDoc(
      itemRef,
      {
        ...item,
        rank: item.rank ?? item.order,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.WRITE, `testimonials/${item.id}`);
    } catch {
      // Fallback handled gracefully via admin_settings/testimonials
    }
  }
}

export async function deleteSingleTestimonialFromFirestore(testimonialId: string): Promise<void> {
  try {
    const itemRef = doc(db, "testimonials", testimonialId);
    await deleteDoc(itemRef);
  } catch (err) {
    console.warn("Firestore testimonials delete notice:", err);
  }
}

export async function updateTestimonialStatusInFirestore(
  testimonialId: string,
  newStatus: TestimonialStatus,
  currentItems?: BuyerTestimonial[],
  currentConfig?: TestimonialsConfig
): Promise<BuyerTestimonial[]> {
  const list = currentItems || getLocalTestimonials();
  const cfg = currentConfig || getLocalTestimonialsConfig();

  const approvedCount = list.filter((i) => i.status === "approved" && i.id !== testimonialId).length;

  const updated = list.map((item) => {
    if (item.id !== testimonialId) return item;
    const isNowApproved = newStatus === "approved";
    return {
      ...item,
      status: newStatus,
      visible: isNowApproved ? true : false,
      order: isNowApproved ? approvedCount + 1 : item.order,
      rank: isNowApproved ? approvedCount + 1 : item.rank,
    };
  });

  const normalized = normalizeTestimonialRanks(updated);
  await saveTestimonialsData(normalized, cfg);

  const targetItem = normalized.find((i) => i.id === testimonialId);
  if (targetItem) {
    await syncSingleTestimonialToFirestore(targetItem);
  }

  return normalized;
}

export async function reorderApprovedTestimonialsInFirestore(
  newOrderedApproved: BuyerTestimonial[],
  allItems?: BuyerTestimonial[],
  currentConfig?: TestimonialsConfig
): Promise<BuyerTestimonial[]> {
  const list = allItems || getLocalTestimonials();
  const cfg = currentConfig || getLocalTestimonialsConfig();

  // Assign sequential ranks 1..N to the reordered approved list
  const rankedApproved = newOrderedApproved.map((item, idx) => ({
    ...item,
    order: idx + 1,
    rank: idx + 1,
  }));

  const approvedIds = new Set(rankedApproved.map((i) => i.id));
  const remaining = list
    .filter((i) => !approvedIds.has(i.id))
    .map((item, idx) => ({
      ...item,
      order: rankedApproved.length + idx + 1,
      rank: rankedApproved.length + idx + 1,
    }));

  const combined = [...rankedApproved, ...remaining];
  const nextConfig: TestimonialsConfig = {
    ...cfg,
    sortMode: "custom_order",
  };

  await saveTestimonialsData(combined, nextConfig);
  return combined;
}

export async function submitNewBuyerTestimonial(
  submission: Omit<BuyerTestimonial, "id" | "status" | "visible" | "order" | "createdAt">,
  autoApprove = false
): Promise<BuyerTestimonial> {
  const currentItems = getLocalTestimonials();
  const maxOrder = currentItems.reduce((max, item) => Math.max(max, item.order || 0), 0);

  const newEntry: BuyerTestimonial = {
    ...submission,
    id: `test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    status: autoApprove ? "approved" : "pending",
    visible: autoApprove ? true : false,
    order: maxOrder + 1,
    rank: maxOrder + 1,
    createdAt: new Date().toISOString(),
  };

  const nextItems = normalizeTestimonialRanks([newEntry, ...currentItems]);
  await saveTestimonialsData(nextItems);
  await syncSingleTestimonialToFirestore(newEntry);
  return newEntry;
}

export function subscribeToTestimonials(
  callback: (data: { items: BuyerTestimonial[]; config: TestimonialsConfig }) => void
): () => void {
  const emitLocal = () => {
    callback({
      items: getLocalTestimonials(),
      config: getLocalTestimonialsConfig(),
    });
  };

  emitLocal();

  const handleLocalEvent = () => {
    emitLocal();
  };

  window.addEventListener("autoWorld_testimonials_updated", handleLocalEvent);

  const unsubFirestore = onSnapshot(
    doc(db, "admin_settings", "testimonials"),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let updated = false;
        if (Array.isArray(data.items) && data.items.length > 0) {
          let loadedItems: BuyerTestimonial[] = data.items;
          // Ensure initial pending demo entries are seeded once if upgrading from v1
          try {
            const alreadySeeded = localStorage.getItem(SEED_PENDING_KEY);
            if (!alreadySeeded) {
              localStorage.setItem(SEED_PENDING_KEY, "true");
              const existingIds = new Set(loadedItems.map((i) => i.id));
              const missingDefaults = DEFAULT_TESTIMONIALS.filter(
                (d) => d.status === "pending" && !existingIds.has(d.id)
              );
              if (missingDefaults.length > 0) {
                loadedItems = normalizeTestimonialRanks([...loadedItems, ...missingDefaults]);
                saveTestimonialsData(loadedItems, data.config || DEFAULT_TESTIMONIALS_CONFIG);
              }
            }
          } catch {}

          try {
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(loadedItems));
            updated = true;
          } catch {}
        }
        if (data.config && typeof data.config === "object") {
          try {
            const mergedConfig = { ...DEFAULT_TESTIMONIALS_CONFIG, ...data.config };
            localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(mergedConfig));
            updated = true;
          } catch {}
        }
        if (updated) {
          emitLocal();
        }
      } else {
        // Seed initial defaults into Firestore if document doesn't exist yet
        saveTestimonialsData(DEFAULT_TESTIMONIALS, DEFAULT_TESTIMONIALS_CONFIG);
      }
    },
    (err) => {
      console.warn("Testimonials snapshot listener notice:", err);
    }
  );

  return () => {
    window.removeEventListener("autoWorld_testimonials_updated", handleLocalEvent);
    unsubFirestore();
  };
}

export function getPublicDisplayTestimonials(
  items: BuyerTestimonial[],
  config: TestimonialsConfig
): BuyerTestimonial[] {
  // Strictly display ONLY approved & visible testimonials in the HomeTab carousel
  const approvedAndVisible = items.filter(
    (item) => item.status === "approved" && item.visible !== false
  );

  if (config.sortMode === "newest") {
    return [...approvedAndVisible].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  if (config.sortMode === "highest_rated") {
    return [...approvedAndVisible].sort((a, b) => b.rating - a.rating);
  }
  if (config.sortMode === "random") {
    return [...approvedAndVisible].sort(() => Math.random() - 0.5);
  }
  // Default: custom_order / rank sequence controlled by Admin Drag-and-Drop & Rank Reordering
  return [...approvedAndVisible].sort(
    (a, b) => (a.order ?? a.rank ?? 999) - (b.order ?? b.rank ?? 999)
  );
}

/**
 * Verifies whether a signed-in user (by Gmail / email and UID) has any recorded
 * buying or selling logs across Firestore and local transaction records.
 */
export async function verifyUserBuyerSellerLogs(
  uid: string,
  email: string
): Promise<VerifiedTransactionLog[]> {
  const logs: VerifiedTransactionLog[] = [];
  const seenKeys = new Set<string>();
  const cleanEmail = (email || "").trim().toLowerCase();

  const addLog = (entry: VerifiedTransactionLog) => {
    const key = `${entry.role}-${entry.itemTitle.toLowerCase()}-${entry.dossierRef}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      logs.push(entry);
    }
  };

  if (!uid && !cleanEmail) {
    return logs;
  }

  // 0. Check Official Admin Verified Deal & Handover Ledger (localStorage + Firestore admin_settings/control_systems)
  try {
    const rawControl = localStorage.getItem("autoWorld_admin_control_systems_v1");
    if (rawControl) {
      const parsedControl = JSON.parse(rawControl);
      if (Array.isArray(parsedControl?.dealsLedger)) {
        parsedControl.dealsLedger.forEach((deal: any) => {
          const bMail = (deal.buyerGmail || "").trim().toLowerCase();
          const sMail = (deal.sellerGmail || "").trim().toLowerCase();
          if (bMail && bMail === cleanEmail) {
            addLog({
              id: `handover-buy-${deal.id}`,
              role: "Verified Buyer",
              itemTitle: deal.itemTitle,
              itemCategory:
                deal.itemType === "part" ? "Motorsport Hardware" : "Vehicle Acquisition",
              dossierRef: deal.dossierRef || `REF #${deal.id}`,
              dateLabel: `Official Handover (${deal.handoverDate || "Verified"})`,
              location: deal.location || "Mumbai, India",
              source: "Official Handover Ledger",
            });
          } else if (sMail && sMail === cleanEmail) {
            addLog({
              id: `handover-sell-${deal.id}`,
              role: "Verified Seller",
              itemTitle: deal.itemTitle,
              itemCategory:
                deal.itemType === "part" ? "Motorsport Hardware" : "Vehicle Acquisition",
              dossierRef: deal.dossierRef || `REF #${deal.id}`,
              dateLabel: `Official Sale Handover (${deal.handoverDate || "Verified"})`,
              location: deal.location || "Mumbai, India",
              source: "Official Handover Ledger",
            });
          }
        });
      }
    }
  } catch {}

  try {
    const controlSnap = await getDoc(doc(db, "admin_settings", "control_systems"));
    if (controlSnap.exists()) {
      const controlData = controlSnap.data();
      if (Array.isArray(controlData?.dealsLedger)) {
        controlData.dealsLedger.forEach((deal: any) => {
          const bMail = (deal.buyerGmail || "").trim().toLowerCase();
          const sMail = (deal.sellerGmail || "").trim().toLowerCase();
          if (bMail && bMail === cleanEmail) {
            addLog({
              id: `fs-handover-buy-${deal.id}`,
              role: "Verified Buyer",
              itemTitle: deal.itemTitle,
              itemCategory:
                deal.itemType === "part" ? "Motorsport Hardware" : "Vehicle Acquisition",
              dossierRef: deal.dossierRef || `REF #${deal.id}`,
              dateLabel: `Official Handover (${deal.handoverDate || "Verified"})`,
              location: deal.location || "Mumbai, India",
              source: "Official Handover Ledger",
            });
          } else if (sMail && sMail === cleanEmail) {
            addLog({
              id: `fs-handover-sell-${deal.id}`,
              role: "Verified Seller",
              itemTitle: deal.itemTitle,
              itemCategory:
                deal.itemType === "part" ? "Motorsport Hardware" : "Vehicle Acquisition",
              dossierRef: deal.dossierRef || `REF #${deal.id}`,
              dateLabel: `Official Sale Handover (${deal.handoverDate || "Verified"})`,
              location: deal.location || "Mumbai, India",
              source: "Official Handover Ledger",
            });
          }
        });
      }
    }
  } catch {}

  // 1. Check Local Storage Vehicle Listings (Sold / Listed by this Gmail or UID)
  const localListingKeys = ["autoWorld_listings", "autoworld_user_listings"];
  for (const storageKey of localListingKeys) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            const sellerMail = (item.sellerEmail || "").trim().toLowerCase();
            const buyerMail = (item.buyerEmail || "").trim().toLowerCase();
            if (sellerMail === cleanEmail || item.userId === uid) {
              addLog({
                id: `loc-sell-${item.id || Date.now()}`,
                role: "Verified Seller",
                itemTitle: item.title || `${item.year || ""} ${item.make || ""} ${item.model || ""}`.trim(),
                itemCategory: "Vehicle Acquisition",
                dossierRef: `REF #AW-${String(item.id || "VEH").slice(0, 6).toUpperCase()}`,
                dateLabel: item.status === "sold" ? "Sold Vehicle Log" : "Verified Seller Listing Log",
                location: item.location,
                source: "Vehicle Seller Ledger",
              });
            } else if (buyerMail && buyerMail === cleanEmail) {
              addLog({
                id: `loc-buy-${item.id || Date.now()}`,
                role: "Verified Buyer",
                itemTitle: item.title || `${item.year || ""} ${item.make || ""} ${item.model || ""}`.trim(),
                itemCategory: "Vehicle Acquisition",
                dossierRef: `REF #AW-${String(item.id || "VEH").slice(0, 6).toUpperCase()}`,
                dateLabel: "Purchased Vehicle Log",
                location: item.location,
                source: "Vehicle Buyer Ledger",
              });
            }
          });
        }
      }
    } catch {}
  }

  // 2. Check Local Storage Parts Listings
  try {
    const rawParts = localStorage.getItem("autoWorld_user_parts");
    if (rawParts) {
      const parsedParts = JSON.parse(rawParts);
      if (Array.isArray(parsedParts)) {
        parsedParts.forEach((part: any) => {
          const sellerMail = (part.sellerEmail || "").trim().toLowerCase();
          const buyerMail = (part.buyerEmail || "").trim().toLowerCase();
          if (sellerMail === cleanEmail || part.userId === uid) {
            addLog({
              id: `loc-part-sell-${part.id || Date.now()}`,
              role: "Verified Seller",
              itemTitle: part.title || "Motorsport Performance Hardware",
              itemCategory: "Motorsport Hardware",
              dossierRef: `REF #PART-${String(part.id || "HW").slice(0, 6).toUpperCase()}`,
              dateLabel: part.status === "sold" ? "Sold Hardware Log" : "Listed Hardware Log",
              location: part.location,
              source: "Motorsport Hardware Ledger",
            });
          } else if (buyerMail && buyerMail === cleanEmail) {
            addLog({
              id: `loc-part-buy-${part.id || Date.now()}`,
              role: "Verified Buyer",
              itemTitle: part.title || "Motorsport Performance Hardware",
              itemCategory: "Motorsport Hardware",
              dossierRef: `REF #PART-${String(part.id || "HW").slice(0, 6).toUpperCase()}`,
              dateLabel: "Purchased Hardware Log",
              location: part.location,
              source: "Motorsport Hardware Ledger",
            });
          }
        });
      }
    }
  } catch {}

  // 3. Check Local Buyer Pass / Subscription / Test Drive Logs
  try {
    const hasLocalPass =
      localStorage.getItem(`autoWorld_buyerPass_${uid}`) === "true" ||
      localStorage.getItem("autoWorld_buyerPass_guest_active") === "true";
    if (hasLocalPass) {
      addLog({
        id: `pass-${uid}`,
        role: "Verified Buyer",
        itemTitle: "Verified Buyer Pass • Direct Owner Acquisition",
        itemCategory: "Vehicle Acquisition",
        dossierRef: `REF #PASS-${uid.slice(0, 6).toUpperCase()}`,
        dateLabel: "Active Buyer Pass Holder",
        source: "Buyer Pass Registry",
      });
    }

    const rawSub = localStorage.getItem("autoWorld_subscription");
    if (rawSub) {
      const sub = JSON.parse(rawSub);
      if (sub && sub.status === "active") {
        addLog({
          id: `sub-${uid}`,
          role: "Verified Buyer",
          itemTitle: `Auto World ${sub.plan || "Premium"} Acquisition Member`,
          itemCategory: "Vehicle Acquisition",
          dossierRef: `REF #VIP-${uid.slice(0, 6).toUpperCase()}`,
          dateLabel: "Verified Premium Member",
          source: "Membership Ledger",
        });
      }
    }
  } catch {}

  // 4. Query Firestore Collections for Gmail / UID Buy & Sell Logs
  try {
    const [listingsSnap, partsSnap, passSnap, subSnap, exchangesSnap, offersSnap, auctionsSnap, loansSnap] =
      await Promise.allSettled([
        getDocs(collection(db, "listings")),
        getDocs(collection(db, "parts")),
        getDoc(doc(db, "buyer_passes", uid)),
        getDoc(doc(db, "subscriptions", uid)),
        getDocs(collection(db, "exchanges")),
        getDocs(collection(db, "trade_offers")),
        getDocs(collection(db, "auctions")),
        getDocs(collection(db, "loanLeads")),
      ]);

    // Vehicles in Firestore
    if (listingsSnap.status === "fulfilled") {
      listingsSnap.value.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const sellerMail = (data.sellerEmail || "").trim().toLowerCase();
        const buyerMail = (data.buyerEmail || "").trim().toLowerCase();
        if (sellerMail === cleanEmail || data.userId === uid) {
          addLog({
            id: `fs-listing-sell-${docSnap.id}`,
            role: "Verified Seller",
            itemTitle: data.title || `${data.year || ""} ${data.make || ""} ${data.model || ""}`.trim(),
            itemCategory: "Vehicle Acquisition",
            dossierRef: `REF #AW-${docSnap.id.slice(0, 6).toUpperCase()}`,
            dateLabel: data.status === "sold" ? "Sold on Auto World" : "Listed on Auto World",
            location: data.location,
            source: "Firestore Vehicle Ledger",
          });
        } else if (buyerMail && buyerMail === cleanEmail) {
          addLog({
            id: `fs-listing-buy-${docSnap.id}`,
            role: "Verified Buyer",
            itemTitle: data.title || `${data.year || ""} ${data.make || ""} ${data.model || ""}`.trim(),
            itemCategory: "Vehicle Acquisition",
            dossierRef: `REF #AW-${docSnap.id.slice(0, 6).toUpperCase()}`,
            dateLabel: "Purchased on Auto World",
            location: data.location,
            source: "Firestore Vehicle Ledger",
          });
        }
      });
    }

    // Parts in Firestore
    if (partsSnap.status === "fulfilled") {
      partsSnap.value.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const sellerMail = (data.sellerEmail || "").trim().toLowerCase();
        const buyerMail = (data.buyerEmail || "").trim().toLowerCase();
        if (sellerMail === cleanEmail || data.userId === uid) {
          addLog({
            id: `fs-part-sell-${docSnap.id}`,
            role: "Verified Seller",
            itemTitle: data.title || "Motorsport Hardware",
            itemCategory: "Motorsport Hardware",
            dossierRef: `REF #PART-${docSnap.id.slice(0, 6).toUpperCase()}`,
            dateLabel: data.status === "sold" ? "Sold Hardware" : "Listed Hardware",
            location: data.location,
            source: "Firestore Parts Ledger",
          });
        } else if (buyerMail && buyerMail === cleanEmail) {
          addLog({
            id: `fs-part-buy-${docSnap.id}`,
            role: "Verified Buyer",
            itemTitle: data.title || "Motorsport Hardware",
            itemCategory: "Motorsport Hardware",
            dossierRef: `REF #PART-${docSnap.id.slice(0, 6).toUpperCase()}`,
            dateLabel: "Purchased Hardware",
            location: data.location,
            source: "Firestore Parts Ledger",
          });
        }
      });
    }

    // Buyer Pass in Firestore
    if (passSnap.status === "fulfilled" && passSnap.value.exists()) {
      const passData = passSnap.value.data() as any;
      if (passData?.paid) {
        addLog({
          id: `fs-pass-${uid}`,
          role: "Verified Buyer",
          itemTitle: "Verified Buyer Pass • Direct Vehicle Acquisition",
          itemCategory: "Vehicle Acquisition",
          dossierRef: `REF #PASS-${(passData.transactionId || uid).slice(0, 6).toUpperCase()}`,
          dateLabel: "Verified Buyer Pass Log",
          source: "Firestore Buyer Pass",
        });
      }
    }

    // Subscription in Firestore
    if (subSnap.status === "fulfilled" && subSnap.value.exists()) {
      const subData = subSnap.value.data() as any;
      if (subData?.status === "active") {
        addLog({
          id: `fs-sub-${uid}`,
          role: "Verified Buyer",
          itemTitle: `${subData.plan || "Premium"} Membership Acquisition`,
          itemCategory: "Vehicle Acquisition",
          dossierRef: `REF #SUB-${uid.slice(0, 6).toUpperCase()}`,
          dateLabel: "Active Premium Member",
          source: "Firestore Subscriptions",
        });
      }
    }

    // Exchange Requests in Firestore
    if (exchangesSnap.status === "fulfilled") {
      exchangesSnap.value.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const creatorMail = (data.creatorEmail || "").trim().toLowerCase();
        if (creatorMail === cleanEmail || data.creatorUid === uid) {
          addLog({
            id: `fs-exch-${docSnap.id}`,
            role: "Verified Seller",
            itemTitle: data.offeredVehicleTitle || data.title || "Exchange Vehicle Trade-In",
            itemCategory: "Vehicle Acquisition",
            dossierRef: `REF #EXCH-${docSnap.id.slice(0, 6).toUpperCase()}`,
            dateLabel: "Verified Exchange Log",
            location: data.location,
            source: "Exchange Ledger",
          });
        }
      });
    }

    // Trade Offers in Firestore
    if (offersSnap.status === "fulfilled") {
      offersSnap.value.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const propMail = (data.proposerEmail || "").trim().toLowerCase();
        if (propMail === cleanEmail || data.proposerUid === uid || data.targetCreatorUid === uid) {
          addLog({
            id: `fs-offer-${docSnap.id}`,
            role: "Verified Buyer",
            itemTitle: data.proposerVehicleTitle || "Trade-In Vehicle Acquisition",
            itemCategory: "Vehicle Acquisition",
            dossierRef: `REF #TRD-${docSnap.id.slice(0, 6).toUpperCase()}`,
            dateLabel: "Verified Trade Offer Log",
            source: "Trade-In Ledger",
          });
        }
      });
    }

    // Auctions in Firestore
    if (auctionsSnap.status === "fulfilled") {
      auctionsSnap.value.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const sellerMail = (data.sellerEmail || "").trim().toLowerCase();
        const highestBidderMail = (data.highestBidderEmail || "").trim().toLowerCase();
        if (sellerMail === cleanEmail || data.sellerUid === uid) {
          addLog({
            id: `fs-auc-sell-${docSnap.id}`,
            role: "Verified Seller",
            itemTitle: data.title || `${data.year || ""} ${data.make || ""} ${data.model || ""}`.trim(),
            itemCategory: "Vehicle Acquisition",
            dossierRef: `REF #AUC-${docSnap.id.slice(0, 6).toUpperCase()}`,
            dateLabel: "Verified Auction Seller",
            location: data.location,
            source: "Auction Floor Ledger",
          });
        } else if (highestBidderMail === cleanEmail || data.highestBidderUid === uid) {
          addLog({
            id: `fs-auc-buy-${docSnap.id}`,
            role: "Verified Buyer",
            itemTitle: data.title || `${data.year || ""} ${data.make || ""} ${data.model || ""}`.trim(),
            itemCategory: "Vehicle Acquisition",
            dossierRef: `REF #AUC-${docSnap.id.slice(0, 6).toUpperCase()}`,
            dateLabel: "Verified Auction Bidder/Buyer",
            location: data.location,
            source: "Auction Floor Ledger",
          });
        }
      });
    }

    // Finance / Loan Pre-Approval Leads in Firestore
    if (loansSnap.status === "fulfilled") {
      loansSnap.value.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const leadMail = (data.email || "").trim().toLowerCase();
        if ((leadMail && leadMail === cleanEmail) || data.userId === uid) {
          addLog({
            id: `fs-loan-${docSnap.id}`,
            role: "Verified Buyer",
            itemTitle: data.vehicleTitle || "Financed Vehicle Acquisition",
            itemCategory: "Vehicle Acquisition",
            dossierRef: `REF #FIN-${docSnap.id.slice(0, 6).toUpperCase()}`,
            dateLabel: "Verified Finance Application",
            location: data.city,
            source: "Finance Ledger",
          });
        }
      });
    }
  } catch (err) {
    console.warn("Verification log lookup warning:", err);
  }

  // 5. Platform Owner Gmail always has verified access
  if (cleanEmail === OWNER_EMAIL.toLowerCase() && logs.length === 0) {
    addLog({
      id: "owner-verified-log",
      role: "Verified Buyer",
      itemTitle: "2023 Porsche 911 GT3 RS (Owner Fleet)",
      itemCategory: "Vehicle Acquisition",
      dossierRef: "REF #AW-OWNER",
      dateLabel: "Verified Owner Ledger",
      location: "Mumbai, MH",
      source: "Executive Registry",
    });
  }

  return logs;
}

