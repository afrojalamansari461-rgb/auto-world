import { doc, getDoc, onSnapshot, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_VEHICLES, DEFAULT_PARTS } from "../types";

// ============================================================================
// 1. VERIFIED DEAL & HANDOVER LEDGER
// ============================================================================
export interface DealHandoverRecord {
  id: string;
  itemType: "vehicle" | "part";
  itemId: string | number;
  itemTitle: string;
  itemImage?: string;
  dossierRef: string;
  listedPrice: number;
  finalSalePrice: number;
  buyerGmail: string;
  buyerName: string;
  buyerPhone?: string;
  sellerGmail?: string;
  sellerName?: string;
  handoverDate: string;
  location: string;
  warrantyTier:
    | "None"
    | "6-Month Powertrain"
    | "12-Month Comprehensive"
    | "24-Month Concierge VIP";
  vipPerksUnlocked: boolean;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

// ============================================================================
// 2. HOMEPAGE LAYOUT, SECTION VISIBILITY & BANNER CONTROL
// ============================================================================
export type HomepageSectionId =
  | "hero"
  | "featured_cars"
  | "motorsport_parts"
  | "how_it_works"
  | "stats"
  | "testimonials"
  | "premium_promo";

export interface HomepageSectionConfig {
  id: HomepageSectionId;
  label: string;
  description: string;
  visible: boolean;
  order: number;
  customTitle?: string;
  customSubtitle?: string;
}

export interface HomepageStatItem {
  id: string;
  value: string;
  label: string;
}

export interface ScheduledPromoBanner {
  enabled: boolean;
  badgeText: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaTargetTab: "buy" | "sell" | "premium" | "loan" | "compare";
  startTime: string; // ISO string or ""
  endTime: string;   // ISO string or ""
  theme: "obsidianGold" | "emeraldVault" | "crimsonTrack";
}

export interface HomepageLayoutConfig {
  sections: HomepageSectionConfig[];
  stats: HomepageStatItem[];
  promoBanner: ScheduledPromoBanner;
}

// ============================================================================
// 3. DYNAMIC PRICING, PROMO CODES & FLASH SALE CONTROLLER
// ============================================================================
export interface PromoCodeRecord {
  id: string;
  code: string;
  description: string;
  discountType: "percent" | "flat";
  discountValue: number; // e.g. 50 for 50% or 250 for ₹250
  appliesTo: "all" | "buyer_pass" | "premium";
  active: boolean;
  usageCount: number;
  maxUses: number;
  expiryDate?: string;
}

export interface PricingAndPromoConfig {
  buyerPassPrice: number;
  proMonthlyPrice: number;
  proYearlyPrice: number;
  businessMonthlyPrice: number;
  businessYearlyPrice: number;
  flashSaleEnabled: boolean;
  flashSaleBadgeText: string;
  flashSaleDiscountPercent: number;
  flashSaleTargetCategory: "all" | "car" | "suv" | "motorcycle" | "truck" | "parts";
  flashSaleSubtext: string;
  promoCodes: PromoCodeRecord[];
}

// ============================================================================
// 4. SELLER KYC, DEALERSHIP BADGE & TRUST VERIFICATION DESK
// ============================================================================
export type SellerTrustTier =
  | "Verified Owner"
  | "Certified Dealership"
  | "Gold Collector"
  | "Unverified";

export interface SellerVerificationRecord {
  id: string;
  sellerEmail: string;
  sellerName: string;
  sellerPhone?: string;
  city?: string;
  badgeTier: SellerTrustTier;
  kycStatus: "Approved" | "Pending Review" | "Rejected";
  rcOrGstNumber?: string;
  inspectionNotes?: string;
  verifiedAt: string;
}

// ============================================================================
// 5. TEST DRIVE, CALLBACK & BUYER INQUIRY ASSIGNMENT DESK (CRM)
// ============================================================================
export type CrmInquiryStatus =
  | "New"
  | "Contacted"
  | "Test Drive Scheduled"
  | "Closed Deal";

export interface CrmInquiryRecord {
  id: string;
  refCode: string;
  inquiryType: "Test Drive" | "Callback Request" | "Direct Inquiry";
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  targetItemTitle: string;
  targetItemPrice?: number;
  preferredSlot?: string;
  locationOrAddress?: string;
  notes?: string;
  assignedAdvisor: string;
  status: CrmInquiryStatus;
  createdAt: string;
}

// ============================================================================
// 6. REPORTED LISTINGS, FRAUD GUARD & USER BLACKLIST CONTROL
// ============================================================================
export interface ListingReportRecord {
  id: string;
  listingKey: string; // e.g. "default-1" or "user-abc123" or "part-101"
  itemType: "vehicle" | "part";
  itemId: string | number;
  itemTitle: string;
  listedPrice: number;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  reporterEmail?: string;
  reporterName?: string;
  reason:
    | "Suspicious / Fake Price"
    | "Already Sold Vehicle"
    | "Counterfeit / Misrepresented Spec"
    | "Unresponsive / Spam Seller"
    | "Duplicate Listing";
  details: string;
  status: "Open" | "Frozen" | "RC/VIN Requested" | "Resolved" | "Dismissed";
  ownershipProofRequested?: boolean;
  adminNotes?: string;
  createdAt: string;
}

export interface BlacklistEntry {
  id: string;
  targetType: "gmail" | "phone";
  value: string; // lowercase email or normalized digits
  displayValue: string;
  reason: string;
  status: "Banned" | "Suspended";
  addedBy: string;
  createdAt: string;
}

export interface FraudGuardConfig {
  reports: ListingReportRecord[];
  frozenListingKeys: string[];
  rcRequestedListingKeys: string[];
  blacklist: BlacklistEntry[];
}

// ============================================================================
// 7. LIVE "MAKE AN OFFER / COUNTER-OFFER" & TRADE-IN UPGRADE DESK
// ============================================================================
export type NegotiationOfferStatus =
  | "Pending Seller Review"
  | "Countered"
  | "Accepted"
  | "Rejected";

export interface NegotiationOfferRecord {
  id: string;
  itemType: "vehicle" | "part";
  itemId: string | number;
  itemTitle: string;
  listedPrice: number;
  buyerOfferPrice: number;
  counterOfferPrice?: number;
  counterOfferMessage?: string;
  paymentMode: "Full Cash / RTGS" | "Pre-Approved Loan" | "Trade-In + Cash";
  tradeInSummary?: string;
  tradeInEstimatedValue?: number;
  netPayableAfterTradeIn?: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  buyerNotes?: string;
  status: NegotiationOfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TradeInEstimatorInput {
  segment: "hatchback" | "sedan" | "compact_suv" | "luxury_suv" | "sports" | "superbike";
  carTitle: string;
  regYear: number;
  kmDriven: number;
  condition: "mint" | "good" | "fair";
  owners: 1 | 2 | 3;
  originalApproxValue: number;
  targetVehiclePrice: number;
  interestRateApr?: number;
  tenureMonths?: number;
}

export interface TradeInEstimatorResult {
  estimatedTradeInValue: number;
  minRangeValue: number;
  maxRangeValue: number;
  netPayableUpgradeDiff: number;
  cashbackToBuyer: number;
  standardMonthlyEmi: number;
  upgradeReducedMonthlyEmi: number;
  monthlyEmiSavings: number;
  summaryLabel: string;
}

// ============================================================================
// MASTER STATE INTERFACE
// ============================================================================
export interface AdminControlSystemsState {
  dealsLedger: DealHandoverRecord[];
  homepageLayout: HomepageLayoutConfig;
  pricingAndPromo: PricingAndPromoConfig;
  sellerVerifications: SellerVerificationRecord[];
  crmInquiries: CrmInquiryRecord[];
  fraudGuard: FraudGuardConfig;
  negotiationOffers: NegotiationOfferRecord[];
  updatedAt: string;
}

const STORAGE_KEY = "autoWorld_admin_control_systems_v1";
const FIRESTORE_COLLECTION = "admin_settings";
const FIRESTORE_DOC_ID = "control_systems";

export const DEFAULT_ADMIN_CONTROL_SYSTEMS: AdminControlSystemsState = {
  dealsLedger: [
    {
      id: "DEAL-AW-9041",
      itemType: "vehicle",
      itemId: 1,
      itemTitle: "2023 Porsche 911 Carrera S (992)",
      itemImage: "/vehicles/porsche-911-992.jpg",
      dossierRef: "AW-992-CS",
      listedPrice: 18500000,
      finalSalePrice: 18150000,
      buyerGmail: "vikramaditya.singhania@gmail.com",
      buyerName: "Vikramaditya Singhania",
      buyerPhone: "+91 98201 44510",
      sellerGmail: "vault@autoworld.in",
      sellerName: "Auto World Crest Vault",
      handoverDate: "2025-02-14",
      location: "Worli, Mumbai",
      warrantyTier: "24-Month Concierge VIP",
      vipPerksUnlocked: true,
      notes: "111-Point Porsche Centre check completed; full ceramic protection applied prior to flatbed delivery.",
      recordedBy: "afrojalamansari461@gmail.com",
      createdAt: "2025-02-14T14:30:00.000Z",
    },
    {
      id: "DEAL-AW-9042",
      itemType: "part",
      itemId: 101,
      itemTitle: "Akrapovič Evolution Line Titanium Exhaust",
      itemImage: "/parts/akrapovic-exhaust.jpg",
      dossierRef: "PART-AKR-882",
      listedPrice: 645000,
      finalSalePrice: 620000,
      buyerGmail: "rohan.deshmukh.gt@gmail.com",
      buyerName: "Dr. Rohan Deshmukh",
      buyerPhone: "+91 98230 77812",
      sellerGmail: "motorsport@autoworld.in",
      sellerName: "Apex Performance Lab Pune",
      handoverDate: "2025-02-18",
      location: "Koregaon Park, Pune",
      warrantyTier: "12-Month Comprehensive",
      vipPerksUnlocked: true,
      notes: "Serial number holographic laser tag verified prior to dispatch.",
      recordedBy: "afrojalamansari461@gmail.com",
      createdAt: "2025-02-18T11:15:00.000Z",
    },
  ],
  homepageLayout: {
    sections: [
      {
        id: "hero",
        label: "Editorial Split Hero & Search Console",
        description: "Primary headline, editorial narrative, and quick Buy/Sell search widget.",
        visible: true,
        order: 1,
      },
      {
        id: "featured_cars",
        label: "Featured Premium Collections (Vehicles)",
        description: "Curated showcase of flagship pre-owned automobiles.",
        visible: true,
        order: 2,
        customTitle: "Featured Premium Collections",
        customSubtitle: "Pristine Specimens Currently Catalogued",
      },
      {
        id: "motorsport_parts",
        label: "Curated Motorsport Parts & Upgrades",
        description: "OEM components, titanium exhausts, forged wheels, and performance hardware.",
        visible: true,
        order: 3,
        customTitle: "Curated Motorsport Parts & Upgrades",
        customSubtitle:
          "Factory OEM components, high-flow turbochargers, aero kits, and verified performance hardware.",
      },
      {
        id: "how_it_works",
        label: "How It Works (4-Step Process)",
        description: "Step-by-step guide explaining vehicle verification and direct owner contact.",
        visible: true,
        order: 4,
        customTitle: "Simple Steps to Buy or Sell",
        customSubtitle: "How It Works",
      },
      {
        id: "stats",
        label: "Live Platform Statistics Counter Bar",
        description: "High-contrast numerical counter bar showcasing total inventory and deal metrics.",
        visible: true,
        order: 5,
      },
      {
        id: "testimonials",
        label: "Verified Buyer & Seller Testimonials",
        description: "Authenticated reviews carousel and verified transaction submission form.",
        visible: true,
        order: 6,
      },
      {
        id: "premium_promo",
        label: "Premium Membership Upgrade Banner",
        description: "Call-to-action section highlighting VIP membership perks and direct access.",
        visible: true,
        order: 7,
        customTitle: "Upgrade to Premium Membership",
        customSubtitle: "Auto World Premium",
      },
    ],
    stats: [
      { id: "stat-1", value: "10k+", label: "Cars Listed" },
      { id: "stat-2", value: "50k+", label: "Successful Deals" },
      { id: "stat-3", value: "100%", label: "Verified Listings" },
      { id: "stat-4", value: "4.9/5", label: "User Rating" },
    ],
    promoBanner: {
      enabled: false,
      badgeText: "CONCIERGE DISPATCH",
      headline: "Verified Collector Handover & Zero-Markup Direct Owner Deals Active",
      subtext: "Use code FESTIVAL50 for 50% OFF Premium Memberships or FREEBUYPASS for complimentary Buyer Pass access.",
      ctaLabel: "Explore Inventory",
      ctaTargetTab: "buy",
      startTime: "",
      endTime: "",
      theme: "obsidianGold",
    },
  },
  pricingAndPromo: {
    buyerPassPrice: 1,
    proMonthlyPrice: 499,
    proYearlyPrice: 4799,
    businessMonthlyPrice: 1999,
    businessYearlyPrice: 19199,
    flashSaleEnabled: true,
    flashSaleBadgeText: "FESTIVE PRICE DROP",
    flashSaleDiscountPercent: 8,
    flashSaleTargetCategory: "all",
    flashSaleSubtext: "Direct owner price benefits & complimentary RTO transfer concierge",
    promoCodes: [
      {
        id: "PROMO-1",
        code: "FESTIVAL50",
        description: "50% Festive Discount on Premium Tiers & Buyer Pass",
        discountType: "percent",
        discountValue: 50,
        appliesTo: "all",
        active: true,
        usageCount: 18,
        maxUses: 500,
      },
      {
        id: "PROMO-2",
        code: "FREEBUYPASS",
        description: "100% Instant Waiver on ₹1 Buyer Pass",
        discountType: "percent",
        discountValue: 100,
        appliesTo: "buyer_pass",
        active: true,
        usageCount: 42,
        maxUses: 1000,
      },
      {
        id: "PROMO-3",
        code: "VIP250",
        description: "Flat ₹250 Off on Any Annual or Monthly Premium Plan",
        discountType: "flat",
        discountValue: 250,
        appliesTo: "premium",
        active: true,
        usageCount: 9,
        maxUses: 200,
      },
    ],
  },
  sellerVerifications: [
    {
      id: "KYC-101",
      sellerEmail: "afrojalamansari461@gmail.com",
      sellerName: "Afroj Alam (Auto World Founder Vault)",
      sellerPhone: "+91 76662 32753",
      city: "Mumbai, Maharashtra",
      badgeTier: "Gold Collector",
      kycStatus: "Approved",
      rcOrGstNumber: "27AABCA9921K1Z5",
      inspectionNotes: "Executive Custodial Vault & Direct Concierge Inventory.",
      verifiedAt: "2025-01-10T10:00:00.000Z",
    },
    {
      id: "KYC-102",
      sellerEmail: "sales@bavariamotors.in",
      sellerName: "Bavaria Motors Certified",
      sellerPhone: "+91 98201 11223",
      city: "Worli, Mumbai",
      badgeTier: "Certified Dealership",
      kycStatus: "Approved",
      rcOrGstNumber: "27BBBCM4410P1Z2",
      inspectionNotes: "Authorized Luxury Pre-Owned Showroom with 7-Bay Service Center.",
      verifiedAt: "2025-01-18T12:00:00.000Z",
    },
    {
      id: "KYC-103",
      sellerEmail: "rajesh.sharma.motors@gmail.com",
      sellerName: "Rajesh Sharma",
      sellerPhone: "+91 98111 45678",
      city: "New Delhi",
      badgeTier: "Verified Owner",
      kycStatus: "Approved",
      rcOrGstNumber: "DL-01-CX-8821 (RC Verified)",
      inspectionNotes: "Single-owner service history and Vahan RC hypothecation clearance verified.",
      verifiedAt: "2025-02-02T09:30:00.000Z",
    },
  ],
  crmInquiries: [
    {
      id: "CRM-201",
      refCode: "TD-849201",
      inquiryType: "Test Drive",
      customerName: "Aarav Mehta",
      customerPhone: "+91 98204 55190",
      customerEmail: "aarav.mehta@gmail.com",
      targetItemTitle: "2022 Mercedes-Benz G63 AMG",
      targetItemPrice: 24500000,
      preferredSlot: "Tomorrow Morning (10:00 AM - 1:00 PM)",
      locationOrAddress: "Bandra West, Mumbai (Doorstep Valet)",
      notes: "Requesting cold-start inspection and service history binder.",
      assignedAdvisor: "Afroj Alam (Lead Desk)",
      status: "Test Drive Scheduled",
      createdAt: "2025-02-20T09:15:00.000Z",
    },
    {
      id: "CRM-202",
      refCode: "CB-519044",
      inquiryType: "Callback Request",
      customerName: "Karanveer Luthra",
      customerPhone: "+91 98112 88310",
      customerEmail: "karan.luthra@gmail.com",
      targetItemTitle: "2021 BMW M3 Competition (G80)",
      targetItemPrice: 11800000,
      preferredSlot: "ASAP (Within 15 minutes)",
      locationOrAddress: "Gurugram, Haryana",
      notes: "Interested in trade-in valuation against 2019 Audi RS5.",
      assignedAdvisor: "Concierge North Desk",
      status: "New",
      createdAt: "2025-02-22T15:40:00.000Z",
    },
  ],
  fraudGuard: {
    reports: [
      {
        id: "REP-701",
        listingKey: "default-999",
        itemType: "vehicle",
        itemId: 999,
        itemTitle: "2020 Range Rover Autobiography LWB",
        listedPrice: 4200000,
        sellerName: "QuickFlip Auto Brokers",
        sellerEmail: "quickflip.unverified@gmail.com",
        sellerPhone: "+91 90000 11111",
        reporterEmail: "collector.mumbai@gmail.com",
        reporterName: "Siddharth Verma",
        reason: "Suspicious / Fake Price",
        details: "Listed price is 60% below market valuation; seller asked for advance token via unverified link.",
        status: "RC/VIN Requested",
        ownershipProofRequested: true,
        adminNotes: "Requested Vahan RC copy and chassis stamping photo before allowing reactivation.",
        createdAt: "2025-02-21T16:20:00.000Z",
      },
    ],
    frozenListingKeys: [],
    rcRequestedListingKeys: ["default-999"],
    blacklist: [
      {
        id: "BLK-01",
        targetType: "gmail",
        value: "scam.broker.demo@gmail.com",
        displayValue: "scam.broker.demo@gmail.com",
        reason: "Attempted advance deposit phishing & fake odometer certificate.",
        status: "Banned",
        addedBy: "afrojalamansari461@gmail.com",
        createdAt: "2025-02-01T10:00:00.000Z",
      },
    ],
  },
  negotiationOffers: [
    {
      id: "OFFER-AW-8104",
      itemType: "vehicle",
      itemId: 1,
      itemTitle: "2022 Mercedes-Benz C-Class C300d AMG Line",
      listedPrice: 5400000,
      buyerOfferPrice: 5100000,
      counterOfferPrice: 5250000,
      counterOfferMessage: "Includes complimentary 1-year comprehensive zero-dep insurance renewal and ceramic coat.",
      paymentMode: "Trade-In + Cash",
      tradeInSummary: "2019 Honda Civic ZX CVT (34,000 km • 1st Owner • Mint)",
      tradeInEstimatedValue: 1320000,
      netPayableAfterTradeIn: 3780000,
      buyerName: "Karanvir Oberoi",
      buyerEmail: "karanvir.oberoi@gmail.com",
      buyerPhone: "+91 98204 11290",
      sellerName: "Auto World Certified Vault",
      sellerEmail: "afrojalamansari461@gmail.com",
      sellerPhone: "+91 98230 44556",
      buyerNotes: "Ready for immediate RTGS settlement + trade-in inspection this Friday.",
      status: "Countered",
      createdAt: "2025-02-20T10:30:00.000Z",
      updatedAt: "2025-02-20T12:15:00.000Z",
    },
    {
      id: "OFFER-AW-8109",
      itemType: "vehicle",
      itemId: 2,
      itemTitle: "2023 BMW M340i xDrive Shadow Edition",
      listedPrice: 6850000,
      buyerOfferPrice: 6550000,
      paymentMode: "Full Cash / RTGS",
      buyerName: "Siddharth Malhotra",
      buyerEmail: "siddharth.m.drive@gmail.com",
      buyerPhone: "+91 98112 77845",
      sellerName: "Bavaria Performance Mumbai",
      sellerEmail: "afrojalamansari461@gmail.com",
      sellerPhone: "+91 98230 44556",
      buyerNotes: "Full liquid funds ready; no loan required if offer is accepted.",
      status: "Pending Seller Review",
      createdAt: "2025-02-21T09:15:00.000Z",
      updatedAt: "2025-02-21T09:15:00.000Z",
    },
  ],
  updatedAt: new Date().toISOString(),
};

function mergeWithDefaults(raw: Partial<AdminControlSystemsState> | null | undefined): AdminControlSystemsState {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_ADMIN_CONTROL_SYSTEMS;
  }

  return {
    dealsLedger: Array.isArray(raw.dealsLedger)
      ? raw.dealsLedger
      : DEFAULT_ADMIN_CONTROL_SYSTEMS.dealsLedger,
    homepageLayout: {
      sections:
        Array.isArray(raw.homepageLayout?.sections) && raw.homepageLayout!.sections.length > 0
          ? raw.homepageLayout!.sections
          : DEFAULT_ADMIN_CONTROL_SYSTEMS.homepageLayout.sections,
      stats:
        Array.isArray(raw.homepageLayout?.stats) && raw.homepageLayout!.stats.length > 0
          ? raw.homepageLayout!.stats
          : DEFAULT_ADMIN_CONTROL_SYSTEMS.homepageLayout.stats,
      promoBanner: {
        ...DEFAULT_ADMIN_CONTROL_SYSTEMS.homepageLayout.promoBanner,
        ...(raw.homepageLayout?.promoBanner || {}),
      },
    },
    pricingAndPromo: {
      ...DEFAULT_ADMIN_CONTROL_SYSTEMS.pricingAndPromo,
      ...(raw.pricingAndPromo || {}),
      promoCodes: Array.isArray(raw.pricingAndPromo?.promoCodes)
        ? raw.pricingAndPromo!.promoCodes
        : DEFAULT_ADMIN_CONTROL_SYSTEMS.pricingAndPromo.promoCodes,
    },
    sellerVerifications: Array.isArray(raw.sellerVerifications)
      ? raw.sellerVerifications
      : DEFAULT_ADMIN_CONTROL_SYSTEMS.sellerVerifications,
    crmInquiries: Array.isArray(raw.crmInquiries)
      ? raw.crmInquiries
      : DEFAULT_ADMIN_CONTROL_SYSTEMS.crmInquiries,
    fraudGuard: {
      reports: Array.isArray(raw.fraudGuard?.reports)
        ? raw.fraudGuard!.reports
        : DEFAULT_ADMIN_CONTROL_SYSTEMS.fraudGuard.reports,
      frozenListingKeys: Array.isArray(raw.fraudGuard?.frozenListingKeys)
        ? raw.fraudGuard!.frozenListingKeys
        : DEFAULT_ADMIN_CONTROL_SYSTEMS.fraudGuard.frozenListingKeys,
      rcRequestedListingKeys: Array.isArray(raw.fraudGuard?.rcRequestedListingKeys)
        ? raw.fraudGuard!.rcRequestedListingKeys
        : DEFAULT_ADMIN_CONTROL_SYSTEMS.fraudGuard.rcRequestedListingKeys,
      blacklist: Array.isArray(raw.fraudGuard?.blacklist)
        ? raw.fraudGuard!.blacklist
        : DEFAULT_ADMIN_CONTROL_SYSTEMS.fraudGuard.blacklist,
    },
    negotiationOffers: Array.isArray(raw.negotiationOffers)
      ? raw.negotiationOffers
      : DEFAULT_ADMIN_CONTROL_SYSTEMS.negotiationOffers,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function loadLocalControlSystems(): AdminControlSystemsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return mergeWithDefaults(JSON.parse(raw));
    }
  } catch (e) {
    console.warn("Failed to load local AdminControlSystemsState:", e);
  }
  return DEFAULT_ADMIN_CONTROL_SYSTEMS;
}

export function saveLocalControlSystems(state: AdminControlSystemsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save local AdminControlSystemsState:", e);
  }
  window.dispatchEvent(new CustomEvent("autoworld_control_systems_updated", { detail: state }));
}

export async function saveControlSystemsState(
  updater:
    | AdminControlSystemsState
    | ((prev: AdminControlSystemsState) => AdminControlSystemsState)
): Promise<AdminControlSystemsState> {
  const current = loadLocalControlSystems();
  const next: AdminControlSystemsState = {
    ...(typeof updater === "function" ? updater(current) : updater),
    updatedAt: new Date().toISOString(),
  };

  saveLocalControlSystems(next);

  try {
    await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID), next, { merge: true });
  } catch (e) {
    console.warn("Firestore sync for control_systems fell back to localStorage:", e);
  }

  return next;
}

export function subscribeToControlSystems(
  callback: (state: AdminControlSystemsState) => void
): () => void {
  callback(loadLocalControlSystems());

  let unsubFirestore = () => {};
  try {
    unsubFirestore = onSnapshot(
      doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID),
      (snap) => {
        if (snap.exists()) {
          const merged = mergeWithDefaults(snap.data() as Partial<AdminControlSystemsState>);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {}
          callback(merged);
        }
      },
      () => {
        callback(loadLocalControlSystems());
      }
    );
  } catch (e) {
    console.warn("subscribeToControlSystems fallback:", e);
  }

  const handleLocalEvent = () => {
    callback(loadLocalControlSystems());
  };
  window.addEventListener("autoworld_control_systems_updated", handleLocalEvent);

  return () => {
    unsubFirestore();
    window.removeEventListener("autoworld_control_systems_updated", handleLocalEvent);
  };
}

// ============================================================================
// HELPER 1: ASSIGN BUYER GMAIL & MARK VEHICLE / PART AS SOLD
// ============================================================================
export async function recordVerifiedDealHandover(
  input: Omit<DealHandoverRecord, "id" | "createdAt">
): Promise<DealHandoverRecord> {
  const cleanBuyerGmail = input.buyerGmail.trim().toLowerCase();
  const cleanSellerGmail = (input.sellerGmail || "").trim().toLowerCase();
  const newDeal: DealHandoverRecord = {
    ...input,
    buyerGmail: cleanBuyerGmail,
    sellerGmail: cleanSellerGmail,
    id: `DEAL-AW-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
  };

  await saveControlSystemsState((prev) => ({
    ...prev,
    dealsLedger: [newDeal, ...prev.dealsLedger],
  }));

  // Also mark the target vehicle or part as SOLD and stamp buyerEmail on it
  try {
    if (input.itemType === "vehicle") {
      const strId = String(input.itemId);
      // Check if it's a default vehicle (numeric id <= 999)
      const numId = Number(input.itemId);
      const isDefault = !isNaN(numId) && DEFAULT_VEHICLES.some((v) => v.id === numId);
      if (isDefault) {
        const overridesRaw = localStorage.getItem("autoWorld_default_overrides");
        const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
        overrides[strId] = {
          ...(overrides[strId] || {}),
          status: "sold",
          badge: "sold",
          buyerEmail: cleanBuyerGmail,
          buyerName: input.buyerName,
          soldPrice: input.finalSalePrice,
          handoverDate: input.handoverDate,
        };
        localStorage.setItem("autoWorld_default_overrides", JSON.stringify(overrides));
      } else {
        // User listing in localStorage + Firestore
        for (const key of ["autoWorld_listings", "autoworld_user_listings"]) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const updated = list.map((item: any) =>
                String(item.id) === strId || String(item.listingId) === strId
                  ? {
                      ...item,
                      status: "sold",
                      buyerEmail: cleanBuyerGmail,
                      buyerName: input.buyerName,
                      soldPrice: input.finalSalePrice,
                      handoverDate: input.handoverDate,
                    }
                  : item
              );
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        }
        await updateDoc(doc(db, "listings", strId), {
          status: "sold",
          buyerEmail: cleanBuyerGmail,
          buyerName: input.buyerName,
          soldPrice: input.finalSalePrice,
          handoverDate: input.handoverDate,
        }).catch(() => {});
      }
    } else {
      // Part handover
      const strId = String(input.itemId);
      const numId = Number(input.itemId);
      const isDefaultPart = !isNaN(numId) && DEFAULT_PARTS.some((p) => p.id === numId);
      if (isDefaultPart) {
        const overridesRaw = localStorage.getItem("autoWorld_part_overrides");
        const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
        overrides[strId] = {
          ...(overrides[strId] || {}),
          status: "sold",
          buyerEmail: cleanBuyerGmail,
          buyerName: input.buyerName,
          soldPrice: input.finalSalePrice,
          handoverDate: input.handoverDate,
        };
        localStorage.setItem("autoWorld_part_overrides", JSON.stringify(overrides));
      } else {
        const raw = localStorage.getItem("autoWorld_user_parts");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const updated = list.map((item: any) =>
              String(item.id) === strId
                ? {
                    ...item,
                    status: "sold",
                    buyerEmail: cleanBuyerGmail,
                    buyerName: input.buyerName,
                    soldPrice: input.finalSalePrice,
                    handoverDate: input.handoverDate,
                  }
                : item
            );
            localStorage.setItem("autoWorld_user_parts", JSON.stringify(updated));
          }
        }
        await updateDoc(doc(db, "parts", strId), {
          status: "sold",
          buyerEmail: cleanBuyerGmail,
          buyerName: input.buyerName,
          soldPrice: input.finalSalePrice,
          handoverDate: input.handoverDate,
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn("Handover catalog sync non-fatal warning:", e);
  }

  window.dispatchEvent(new Event("autoWorld_db_update"));
  window.dispatchEvent(new CustomEvent("autoworld_testimonials_updated"));
  return newDeal;
}

// ============================================================================
// HELPER 2: VALIDATE & REDEEM PROMO CODE
// ============================================================================
export function validatePromoCode(
  rawCode: string,
  baseAmount: number,
  context: "buyer_pass" | "premium"
): {
  valid: boolean;
  finalAmount: number;
  discountSaved: number;
  promo?: PromoCodeRecord;
  message: string;
} {
  const clean = rawCode.trim().toUpperCase();
  if (!clean) {
    return {
      valid: false,
      finalAmount: baseAmount,
      discountSaved: 0,
      message: "Please enter a promo code.",
    };
  }

  const state = loadLocalControlSystems();
  const promo = state.pricingAndPromo.promoCodes.find(
    (p) => p.code.toUpperCase() === clean
  );

  if (!promo) {
    return {
      valid: false,
      finalAmount: baseAmount,
      discountSaved: 0,
      message: `Promo code "${clean}" was not found.`,
    };
  }

  if (!promo.active) {
    return {
      valid: false,
      finalAmount: baseAmount,
      discountSaved: 0,
      message: `Promo code "${clean}" is currently paused by Admin.`,
    };
  }

  if (promo.maxUses > 0 && promo.usageCount >= promo.maxUses) {
    return {
      valid: false,
      finalAmount: baseAmount,
      discountSaved: 0,
      message: `Promo code "${clean}" has reached its maximum redemption limit.`,
    };
  }

  if (promo.expiryDate) {
    const exp = new Date(promo.expiryDate).getTime();
    if (!isNaN(exp) && Date.now() > exp) {
      return {
        valid: false,
        finalAmount: baseAmount,
        discountSaved: 0,
        message: `Promo code "${clean}" has expired.`,
      };
    }
  }

  if (promo.appliesTo !== "all" && promo.appliesTo !== context) {
    return {
      valid: false,
      finalAmount: baseAmount,
      discountSaved: 0,
      message: `Promo code "${clean}" is only valid for ${
        promo.appliesTo === "buyer_pass" ? "Buyer Pass" : "Premium Memberships"
      }.`,
    };
  }

  let discountSaved = 0;
  if (promo.discountType === "percent") {
    discountSaved = Math.round((baseAmount * promo.discountValue) / 100);
  } else {
    discountSaved = promo.discountValue;
  }

  discountSaved = Math.min(baseAmount, Math.max(0, discountSaved));
  const finalAmount = Math.max(0, baseAmount - discountSaved);

  return {
    valid: true,
    finalAmount,
    discountSaved,
    promo,
    message:
      finalAmount === 0
        ? `Code ${clean} applied! 100% Instant Waiver unlocked (₹0 payable).`
        : `Code ${clean} applied! You saved ₹${discountSaved.toLocaleString("en-IN")}.`,
  };
}

export async function incrementPromoCodeUsage(code: string): Promise<void> {
  const clean = code.trim().toUpperCase();
  await saveControlSystemsState((prev) => ({
    ...prev,
    pricingAndPromo: {
      ...prev.pricingAndPromo,
      promoCodes: prev.pricingAndPromo.promoCodes.map((p) =>
        p.code.toUpperCase() === clean ? { ...p, usageCount: (p.usageCount || 0) + 1 } : p
      ),
    },
  }));
}

// ============================================================================
// HELPER 3: SELLER KYC & TRUST BADGE LOOKUP
// ============================================================================
export function getSellerTrustBadge(
  sellerEmail?: string,
  sellerName?: string
): SellerVerificationRecord | null {
  const state = loadLocalControlSystems();
  const cleanEmail = (sellerEmail || "").trim().toLowerCase();
  const cleanName = (sellerName || "").trim().toLowerCase();

  for (const record of state.sellerVerifications) {
    if (record.kycStatus !== "Approved" || record.badgeTier === "Unverified") continue;
    if (cleanEmail && record.sellerEmail.trim().toLowerCase() === cleanEmail) {
      return record;
    }
    if (
      cleanName &&
      cleanName.length >= 3 &&
      (record.sellerName.trim().toLowerCase().includes(cleanName) ||
        cleanName.includes(record.sellerName.trim().toLowerCase()))
    ) {
      return record;
    }
  }
  return null;
}

// ============================================================================
// HELPER 4: LOG UNIFIED CRM INQUIRY (TEST DRIVE / CALLBACK / DIRECT)
// ============================================================================
export async function logCrmInquiry(
  entry: Omit<CrmInquiryRecord, "id" | "createdAt" | "status" | "assignedAdvisor"> & {
    status?: CrmInquiryStatus;
    assignedAdvisor?: string;
  }
): Promise<CrmInquiryRecord> {
  const record: CrmInquiryRecord = {
    ...entry,
    id: `CRM-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    status: entry.status || (entry.inquiryType === "Test Drive" ? "Test Drive Scheduled" : "New"),
    assignedAdvisor: entry.assignedAdvisor || "Afroj Alam (Lead Desk)",
    createdAt: new Date().toISOString(),
  };

  await saveControlSystemsState((prev) => ({
    ...prev,
    crmInquiries: [record, ...prev.crmInquiries],
  }));

  return record;
}

// ============================================================================
// HELPER 5: SUBMIT FRAUD / SUSPICIOUS LISTING REPORT & CHECK BLACKLIST
// ============================================================================
export async function submitListingFraudReport(
  input: Omit<ListingReportRecord, "id" | "status" | "createdAt">
): Promise<ListingReportRecord> {
  const report: ListingReportRecord = {
    ...input,
    id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
    status: "Open",
    createdAt: new Date().toISOString(),
  };

  await saveControlSystemsState((prev) => ({
    ...prev,
    fraudGuard: {
      ...prev.fraudGuard,
      reports: [report, ...prev.fraudGuard.reports],
    },
  }));

  return report;
}

export function checkIsUserBlacklisted(
  email?: string | null,
  phone?: string | null
): BlacklistEntry | null {
  const state = loadLocalControlSystems();
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPhone = (phone || "").replace(/[^0-9]/g, "");

  for (const item of state.fraudGuard.blacklist) {
    if (item.targetType === "gmail" && cleanEmail && item.value.toLowerCase() === cleanEmail) {
      return item;
    }
    if (
      item.targetType === "phone" &&
      cleanPhone &&
      cleanPhone.length >= 8 &&
      item.value.replace(/[^0-9]/g, "").endsWith(cleanPhone.slice(-10))
    ) {
      return item;
    }
  }
  return null;
}

export function isPromoBannerCurrentlyActive(banner: ScheduledPromoBanner): {
  active: boolean;
  remainingText?: string;
} {
  if (!banner.enabled) return { active: false };
  const now = Date.now();

  if (banner.startTime) {
    const startMs = new Date(banner.startTime).getTime();
    if (!isNaN(startMs) && now < startMs) {
      return { active: false };
    }
  }

  if (banner.endTime) {
    const endMs = new Date(banner.endTime).getTime();
    if (!isNaN(endMs)) {
      if (now > endMs) {
        return { active: false };
      }
      const diffSec = Math.max(0, Math.floor((endMs - now) / 1000));
      const hours = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      return {
        active: true,
        remainingText: hours > 24 ? `${Math.ceil(hours / 24)}d left` : `${hours}h ${mins}m left`,
      };
    }
  }

  return { active: true };
}

// ============================================================================
// HELPER 6: INSTANT TRADE-IN + UPGRADE NET-PAYABLE & EMI CALCULATOR
// ============================================================================
export function calculateTradeInValuation(input: TradeInEstimatorInput): TradeInEstimatorResult {
  const currentYear = new Date().getFullYear();
  const ageYears = Math.max(0, currentYear - input.regYear);

  // Base retention curve per year of age (Indian market depreciation schedule)
  const ageRetention = Math.max(0.24, Math.pow(0.875, ageYears));

  // Mileage adjustment factor
  const km = Math.max(0, input.kmDriven);
  let mileageFactor = 1.0;
  if (km <= 20000) mileageFactor = 1.05;
  else if (km <= 45000) mileageFactor = 1.0;
  else if (km <= 75000) mileageFactor = 0.92;
  else if (km <= 100000) mileageFactor = 0.84;
  else mileageFactor = 0.75;

  // Condition adjustment
  const conditionFactor =
    input.condition === "mint" ? 1.06 : input.condition === "good" ? 0.98 : 0.86;

  // Ownership serial adjustment
  const ownerFactor = input.owners === 1 ? 1.03 : input.owners === 2 ? 0.94 : 0.85;

  // Segment demand multiplier (SUVs & sports hold higher resale in India)
  const segmentMultiplier: Record<TradeInEstimatorInput["segment"], number> = {
    hatchback: 0.96,
    sedan: 0.94,
    compact_suv: 1.04,
    luxury_suv: 1.02,
    sports: 1.06,
    superbike: 0.95,
  };

  const rawEstimate =
    input.originalApproxValue *
    ageRetention *
    mileageFactor *
    conditionFactor *
    ownerFactor *
    (segmentMultiplier[input.segment] || 1.0);

  // Round to nearest ₹5,000
  const estimatedTradeInValue = Math.max(
    45000,
    Math.round(rawEstimate / 5000) * 5000
  );
  const minRangeValue = Math.round((estimatedTradeInValue * 0.95) / 5000) * 5000;
  const maxRangeValue = Math.round((estimatedTradeInValue * 1.05) / 5000) * 5000;

  const targetPrice = Math.max(0, input.targetVehiclePrice);
  const netPayableUpgradeDiff = Math.max(0, targetPrice - estimatedTradeInValue);
  const cashbackToBuyer = Math.max(0, estimatedTradeInValue - targetPrice);

  // Monthly EMI calculation (default 80% LTV on standard vs net upgrade balance, 9.2% APR, 60 months)
  const apr = input.interestRateApr ?? 9.2;
  const months = input.tenureMonths ?? 60;
  const monthlyRate = apr / 12 / 100;

  const computeEmi = (principal: number): number => {
    if (principal <= 0) return 0;
    if (monthlyRate <= 0) return Math.round(principal / months);
    const factor = Math.pow(1 + monthlyRate, months);
    return Math.round((principal * monthlyRate * factor) / (factor - 1));
  };

  // Standard scenario: 20% downpayment, 80% financed
  const standardLoanPrincipal = Math.round(targetPrice * 0.8);
  const standardMonthlyEmi = computeEmi(standardLoanPrincipal);

  // With Trade-In: Trade-In acts as direct equity reduction on the target vehicle
  const upgradeLoanPrincipal = Math.max(0, netPayableUpgradeDiff);
  const upgradeReducedMonthlyEmi = computeEmi(upgradeLoanPrincipal);
  const monthlyEmiSavings = Math.max(0, standardMonthlyEmi - upgradeReducedMonthlyEmi);

  const condLabel =
    input.condition === "mint" ? "Mint" : input.condition === "good" ? "Good" : "Fair";
  const summaryLabel = `${input.regYear} ${input.carTitle || "Trade-In Vehicle"} (${km.toLocaleString("en-IN")} km • ${input.owners === 1 ? "1st" : input.owners === 2 ? "2nd" : "3rd+"} Owner • ${condLabel})`;

  return {
    estimatedTradeInValue,
    minRangeValue,
    maxRangeValue,
    netPayableUpgradeDiff,
    cashbackToBuyer,
    standardMonthlyEmi,
    upgradeReducedMonthlyEmi,
    monthlyEmiSavings,
    summaryLabel,
  };
}

// ============================================================================
// HELPER 7: LIVE "MAKE AN OFFER / COUNTER-OFFER" NEGOTIATION DESK ACTIONS
// ============================================================================
export async function submitPriceNegotiationOffer(
  input: Omit<NegotiationOfferRecord, "id" | "status" | "createdAt" | "updatedAt">
): Promise<NegotiationOfferRecord> {
  const now = new Date().toISOString();
  const offer: NegotiationOfferRecord = {
    ...input,
    buyerEmail: (input.buyerEmail || "").trim().toLowerCase(),
    id: `OFFER-AW-${Math.floor(1000 + Math.random() * 9000)}`,
    status: "Pending Seller Review",
    createdAt: now,
    updatedAt: now,
  };

  await saveControlSystemsState((prev) => ({
    ...prev,
    negotiationOffers: [offer, ...(prev.negotiationOffers || [])],
    crmInquiries: [
      {
        id: `CRM-OFFER-${Date.now()}`,
        refCode: offer.id,
        inquiryType: "Direct Inquiry",
        customerName: offer.buyerName,
        customerPhone: offer.buyerPhone,
        customerEmail: offer.buyerEmail,
        targetItemTitle: offer.itemTitle,
        targetItemPrice: offer.listedPrice,
        preferredSlot: offer.paymentMode,
        locationOrAddress: offer.tradeInSummary
          ? `Offer: ₹${offer.buyerOfferPrice.toLocaleString("en-IN")} | Trade-In: ${offer.tradeInSummary}`
          : `Binding Offer: ₹${offer.buyerOfferPrice.toLocaleString("en-IN")}`,
        notes: offer.buyerNotes || `Submitted binding offer of ₹${offer.buyerOfferPrice.toLocaleString("en-IN")}`,
        assignedAdvisor: offer.sellerName || "Afroj Alam (Lead Desk)",
        status: "New",
        createdAt: now,
      },
      ...prev.crmInquiries,
    ],
  }));

  return offer;
}

export async function respondToNegotiationOffer(
  offerId: string,
  status: NegotiationOfferStatus,
  counterOfferPrice?: number,
  counterOfferMessage?: string
): Promise<void> {
  const now = new Date().toISOString();
  await saveControlSystemsState((prev) => ({
    ...prev,
    negotiationOffers: (prev.negotiationOffers || []).map((o) =>
      o.id === offerId
        ? {
            ...o,
            status,
            counterOfferPrice:
              counterOfferPrice !== undefined ? counterOfferPrice : o.counterOfferPrice,
            counterOfferMessage:
              counterOfferMessage !== undefined ? counterOfferMessage : o.counterOfferMessage,
            updatedAt: now,
          }
        : o
    ),
  }));
}

export async function acceptSellerCounterOffer(offerId: string): Promise<void> {
  const now = new Date().toISOString();
  await saveControlSystemsState((prev) => ({
    ...prev,
    negotiationOffers: (prev.negotiationOffers || []).map((o) =>
      o.id === offerId
        ? {
            ...o,
            buyerOfferPrice: o.counterOfferPrice || o.buyerOfferPrice,
            status: "Accepted",
            updatedAt: now,
          }
        : o
    ),
  }));
}

