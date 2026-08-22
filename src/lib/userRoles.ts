import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, updateDoc, onSnapshot, collection, getDoc } from "firebase/firestore";
import { User } from "firebase/auth";

export type UserRole = 
  | "Owner"
  | "Co-Owner"
  | "Super Admin"
  | "Auction Floor Director"
  | "Trade-In & Exchange Valuer"
  | "Parts Specialist"
  | "Inventory Manager"
  | "Sales & Leads Specialist"
  | "Support Agent"
  | "Content Moderator"
  | "Finance Specialist"
  | "Marketing & Social Media Lead"
  | "User";

export interface RoleSOP {
  clearanceLevel: "Level 5 (Super Root)" | "Level 4 (Executive)" | "Level 3 (Operational Lead)" | "Level 2 (Specialist Desk)" | "Level 1 (Support Desk)";
  badgeColor: string;
  coreResponsibilities: string[];
  dailyTasks: string[];
  sopGuidelines: string[];
  quickActions: { label: string; tabTarget: string; actionDesc: string }[];
}

export const ROLE_SOPS: Record<UserRole, RoleSOP> = {
  "Owner": {
    clearanceLevel: "Level 5 (Super Root)",
    badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    coreResponsibilities: [
      "Ultimate platform ownership, system architecture, database security rules and root ledger management",
      "Executive role assignments, staff clearance level overrides, and access control governance",
      "Global catalog price overrides, financial reconciliation, and dealer network compliance"
    ],
    dailyTasks: [
      "Review daily audit logs and system transaction ledgers",
      "Authorize high-value vehicle and prototype parts verification requests",
      "Evaluate staff role performance and manage platform operational credentials"
    ],
    sopGuidelines: [
      "Always verify user identity before escalating clearance to administrative roles.",
      "Execute database rule deployments only during verified catalog maintenance windows.",
      "Maintain strict oversight on financial ledger exports and Escrow vehicle disbursements."
    ],
    quickActions: [
      { label: "Admin Operations Desk", tabTarget: "admin", actionDesc: "Full administrative suite access" },
      { label: "Staff Office Suite", tabTarget: "office", actionDesc: "Manage staff roles and operational logs" }
    ]
  },
  "Co-Owner": {
    clearanceLevel: "Level 4 (Executive)",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    coreResponsibilities: [
      "Executive platform oversight and operational workflow management",
      "Inventory verification audit, leads triage, and partner dealer management"
    ],
    dailyTasks: [
      "Review flagged vehicle and parts submissions",
      "Oversee customer VIP test drive approvals",
      "Coordinate with Parts Specialists on high-rarity performance hardware authentication"
    ],
    sopGuidelines: [
      "Enforce Auto World luxury editorial standards on all published media assets.",
      "Escalate database schema and security modifications directly to the Owner."
    ],
    quickActions: [
      { label: "Inventory Desk", tabTarget: "admin", actionDesc: "Inspect vehicle & parts catalog" },
      { label: "Staff Office", tabTarget: "office", actionDesc: "Review team workflows" }
    ]
  },
  "Super Admin": {
    clearanceLevel: "Level 4 (Executive)",
    badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    coreResponsibilities: [
      "Complete operational authority over listings, lead desks, customer reviews, and financing queries",
      "Audit trail tracking and catalog content quality governance"
    ],
    dailyTasks: [
      "Process pending user vehicle and performance parts listings within 2 hours of submission",
      "Review reported suspicious buyer or seller accounts",
      "Ensure all showcase photos meet minimum 1920x1080 resolution criteria"
    ],
    sopGuidelines: [
      "Perform cross-checks on vehicle VINs against state transport databases before granting 'Verified' badge.",
      "Check that performance parts include legitimate part numbers and manufacturer warranties."
    ],
    quickActions: [
      { label: "Admin Console", tabTarget: "admin", actionDesc: "Manage platform data" },
      { label: "Staff Lounge", tabTarget: "office", actionDesc: "View operational SOPs" }
    ]
  },
  "Auction Floor Director": {
    clearanceLevel: "Level 3 (Operational Lead)",
    badgeColor: "text-amber-300 bg-amber-500/10 border-amber-500/40",
    coreResponsibilities: [
      "Live Flash Auction floor curation, weekly 24-hour drop schedules, and reserve price governance",
      "Real-time bid stream monitoring, anti-sniping protection enforcement, and winner settlement authorization",
      "Verification of reserve price indicators and transparent public bidding feed records"
    ],
    dailyTasks: [
      "Schedule and launch weekly 24-hour verified flash auctions for certified premium supercars and collector vehicles",
      "Monitor live floor bids, verify bidder security deposits, and resolve tie-break bids",
      "Settle completed auctions, generate winning lot digital certificates, and trigger Escrow vehicle handovers"
    ],
    sopGuidelines: [
      "Never initiate a flash auction without a certified 100-point inspection and verified RTO NOC clearance.",
      "Ensure reserve price indicators dynamically update in real time to guarantee transparent bidding floor trust.",
      "Lock finalized winning bids immediately upon countdown timer expiry."
    ],
    quickActions: [
      { label: "Live Auction Floor", tabTarget: "auction", actionDesc: "Monitor active bidding floor" },
      { label: "Auction Admin Desk", tabTarget: "admin", actionDesc: "Configure auction timers & reserves" }
    ]
  },
  "Trade-In & Exchange Valuer": {
    clearanceLevel: "Level 3 (Operational Lead)",
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/40",
    coreResponsibilities: [
      "Peer-to-Peer Car Exchange Hub moderation and mutual trade-in matchmaking governance",
      "Algorithmic valuation delta verification (calculating cash differences between vehicle pairs)",
      "Inspection and mutual trade agreement certification between swapping car owners"
    ],
    dailyTasks: [
      "Review incoming vehicle exchange requests and verify offered vehicle condition parity",
      "Audit automated value delta calculations to ensure fair trade-in economics for both parties",
      "Facilitate P2P trade offers, inspect mutual vehicle dossiers, and certify swap agreements"
    ],
    sopGuidelines: [
      "Validate both vehicles' RTO hypothecation status prior to approving trade-in match agreements.",
      "Ensure cash difference directions (who pays whom how much) are transparently disclosed to both parties."
    ],
    quickActions: [
      { label: "P2P Exchange Hub", tabTarget: "exchange", actionDesc: "Inspect live trade-in swipe matches" },
      { label: "Exchange Operations", tabTarget: "admin", actionDesc: "Manage trade-in listings & offers" }
    ]
  },
  "Parts Specialist": {
    clearanceLevel: "Level 2 (Specialist Desk)",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    coreResponsibilities: [
      "Dedicated management of the Motorsport Parts & Performance Hardware Marketplace",
      "Authentication of high-performance components, OEM part numbers, turbo specs, and forged alloys",
      "Grading parts by Condition (1-5 Stars) and Rarity Tiers (Common to Legendary Prototype)",
      "Pinning top performance components to the Auto World curated homepage showcase"
    ],
    dailyTasks: [
      "Review incoming user performance parts submissions for accurate fitment and vehicle compatibility",
      "Audit hardware specifications: material grade, power gains (HP/Torque), and bolt patterns (PCD)",
      "Verify seller contact authenticity and respond to technical buyer parts inquiries",
      "Manage parts pricing integrity and identify rare/epic motorsport components"
    ],
    sopGuidelines: [
      "Never approve a 'Legendary' or 'Epic' tier component without verified manufacturer part numbers.",
      "Verify that downforce, horsepower, and torque claims are supported by dyno sheets or manufacturer specs.",
      "Ensure universal vs vehicle-specific fitment flags are strictly accurate to prevent buyer misfits.",
      "Update parts status to 'sold' immediately upon transaction confirmation to keep registry clean."
    ],
    quickActions: [
      { label: "Motorsport Parts Desk", tabTarget: "admin", actionDesc: "Manage all motorsport parts listings" },
      { label: "Browse Parts Catalog", tabTarget: "buy", actionDesc: "View live public parts inventory" },
      { label: "List New Component", tabTarget: "sell", actionDesc: "Launch 5-step parts upload wizard" }
    ]
  },
  "Inventory Manager": {
    clearanceLevel: "Level 3 (Operational Lead)",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    coreResponsibilities: [
      "Master vehicle catalog curation, stock levels, specs calibration, and 100-point inspection audits",
      "Management of vehicle price adjustments, mileage updates, and premium featured slots"
    ],
    dailyTasks: [
      "Inspect new vehicle intake submissions and assign accurate condition scoring",
      "Verify RTO registration records, road tax status, and single-owner paperwork",
      "Manage homepage featured showcase rotation weekly"
    ],
    sopGuidelines: [
      "Vehicle mileage must be cross-referenced with service booklet records before certification.",
      "Ensure all vehicle price listings are in standard INR (₹) notation with complete tax status."
    ],
    quickActions: [
      { label: "Vehicle Catalog", tabTarget: "admin", actionDesc: "Edit vehicle registry" },
      { label: "Showroom Inventory", tabTarget: "buy", actionDesc: "Review live showroom cars" }
    ]
  },
  "Sales & Leads Specialist": {
    clearanceLevel: "Level 2 (Specialist Desk)",
    badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    coreResponsibilities: [
      "Direct buyer communication, VIP test-drive scheduling, price negotiation, and trade-in valuations",
      "Conversion tracking for buyer leads and Secure Shield inspection bookings"
    ],
    dailyTasks: [
      "Follow up on all new contact inquiries and WhatsApp buyer chats within 15 minutes",
      "Schedule physical showroom viewing appointments and accompany VIP clients on test drives",
      "Coordinate with finance desk on customer loan pre-approvals"
    ],
    sopGuidelines: [
      "Collect valid driving license copies before handing over keys for test drives.",
      "Document all buyer negotiation notes in the lead record."
    ],
    quickActions: [
      { label: "Buyer Leads Desk", tabTarget: "admin", actionDesc: "View customer inquiry leads" },
      { label: "Showroom Catalog", tabTarget: "buy", actionDesc: "Check available vehicle inventory" }
    ]
  },
  "Support Agent": {
    clearanceLevel: "Level 1 (Support Desk)",
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    coreResponsibilities: [
      "Customer desk support, ticketing, inquiry routing, and general buyer inquiries",
      "Showroom appointment assistance and user feedback tracking"
    ],
    dailyTasks: [
      "Respond to platform feedback tickets and general contact forms",
      "Assist buyers with account logins, saved garage items, and pass access",
      "Route technical parts questions to the Parts Specialist"
    ],
    sopGuidelines: [
      "Maintain a polite, professional, and luxury-tier communication tone at all times.",
      "Escalate unresolved transaction disputes to Super Admin within 1 hour."
    ],
    quickActions: [
      { label: "Support Inquiries", tabTarget: "admin", actionDesc: "Manage buyer tickets" },
      { label: "Help Center", tabTarget: "home", actionDesc: "Review user FAQs" }
    ]
  },
  "Content Moderator": {
    clearanceLevel: "Level 2 (Specialist Desk)",
    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    coreResponsibilities: [
      "Editorial quality control, moderation of user submissions, customer reviews, and FAQ content"
    ],
    dailyTasks: [
      "Review all public comments, seller descriptions, and uploaded images for policy compliance",
      "Ensure zero profanity, misleading claims, or copyright infringement"
    ],
    sopGuidelines: [
      "Reject listings with low-quality watermarked photos or blurry images.",
      "Check seller descriptions for adherence to Auto World luxury tone standards."
    ],
    quickActions: [
      { label: "Content Queue", tabTarget: "admin", actionDesc: "Audit listings and reviews" }
    ]
  },
  "Finance Specialist": {
    clearanceLevel: "Level 2 (Specialist Desk)",
    badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    coreResponsibilities: [
      "EMI calculations, loan approvals, bank partner liaisons, and Escrow transaction handling"
    ],
    dailyTasks: [
      "Process EMI financing applications and verify buyer income documents",
      "Update bank interest rate tables and calculate personalized down-payment schedules"
    ],
    sopGuidelines: [
      "Ensure all financial records adhere to RBI lending regulations.",
      "Maintain strict confidentiality of buyer bank records and salary slips."
    ],
    quickActions: [
      { label: "Financing Desk", tabTarget: "admin", actionDesc: "Manage loan requests" }
    ]
  },
  "Marketing & Social Media Lead": {
    clearanceLevel: "Level 2 (Specialist Desk)",
    badgeColor: "text-pink-400 bg-pink-500/10 border-pink-500/30",
    coreResponsibilities: [
      "Showcase banner curation, social media announcements, promotional badges, and referral campaigns"
    ],
    dailyTasks: [
      "Generate high-resolution social share cards for newly listed supercar & performance hardware",
      "Track marketing campaign conversions and seasonal festival promotions"
    ],
    sopGuidelines: [
      "Use approved typography (Fraunces serif & Plus Jakarta Sans) and brand gold accents.",
      "Feature vehicles with verified high-demand badges for maximum engagement."
    ],
    quickActions: [
      { label: "Marketing Hub", tabTarget: "admin", actionDesc: "Manage showcase promotions" }
    ]
  },
  "User": {
    clearanceLevel: "Level 1 (Support Desk)",
    badgeColor: "text-stone-400 bg-stone-500/10 border-stone-500/30",
    coreResponsibilities: [
      "Standard client and registered enthusiast member of Auto World platform"
    ],
    dailyTasks: [
      "Browse curated motor vehicles and motorsport hardware catalog",
      "Manage personal Saved Garage, submit vehicle/parts listings, and request test drives"
    ],
    sopGuidelines: [
      "Provide accurate vehicle & contact information when listing cars or components."
    ],
    quickActions: [
      { label: "Browse Catalog", tabTarget: "buy", actionDesc: "Explore vehicles and parts" },
      { label: "Saved Garage", tabTarget: "favorites", actionDesc: "View your saved fleet" }
    ]
  }
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
  status: "active" | "suspended";
  createdAt: string;
  lastLogin: string;
}

export const OWNER_EMAIL = "afrojalamansari461@gmail.com";

export const ALL_ROLES: { id: UserRole; label: string; description: string; badgeBg: string; textColor: string; borderColor: string }[] = [
  {
    id: "Owner",
    label: "Owner",
    description: "Full system super-root access. Controls site settings, role assignments, financial ledgers, and catalog overrides.",
    badgeBg: "bg-amber-500/15",
    textColor: "text-amber-500",
    borderColor: "border-amber-500/40"
  },
  {
    id: "Co-Owner",
    label: "Co-Owner",
    description: "Executive Partner. Accesses Admin Panel operations (inventory, leads, content, audit), but restricted from reassigning user roles or global system resets.",
    badgeBg: "bg-amber-600/15",
    textColor: "text-amber-400",
    borderColor: "border-amber-600/40"
  },
  {
    id: "Super Admin",
    label: "Super Admin",
    description: "Senior platform executive. Oversees inventory, buyer leads, customer support, review moderation, and financing.",
    badgeBg: "bg-purple-500/15",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/40"
  },
  {
    id: "Auction Floor Director",
    label: "Auction Floor Director",
    description: "Live Bidding Floor Master. Oversees weekly 24-hour flash auctions, reserve indicators, real-time bid streams, anti-sniping timers, and winning lot settlements.",
    badgeBg: "bg-amber-500/15",
    textColor: "text-amber-300",
    borderColor: "border-amber-500/40"
  },
  {
    id: "Trade-In & Exchange Valuer",
    label: "Trade-In & Exchange Valuer",
    description: "P2P Car Swap & Match Specialist. Audits vehicle condition equivalence, certifies algorithmic cash delta calculations, and moderates swap offers.",
    badgeBg: "bg-cyan-500/15",
    textColor: "text-cyan-400",
    borderColor: "border-cyan-500/40"
  },
  {
    id: "Parts Specialist",
    label: "Parts Specialist",
    description: "Motorsport & Hardware Lead. Authenticates performance parts, validates OEM numbers, assigns rarity tiers, and curates featured components.",
    badgeBg: "bg-amber-500/15",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/40"
  },
  {
    id: "Inventory Manager",
    label: "Inventory Manager",
    description: "Catalog & Stock Officer. Controls vehicle listings, pricing, mileage, specs, feature badges, and featured listings.",
    badgeBg: "bg-emerald-500/15",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/40"
  },
  {
    id: "Sales & Leads Specialist",
    label: "Sales & Leads",
    description: "Buyer Relations Specialist. Manages test drive bookings, buyer trade-in offers, price requests, and passes.",
    badgeBg: "bg-blue-500/15",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/40"
  },
  {
    id: "Support Agent",
    label: "Support Agent",
    description: "Customer Desk Officer. Answers buyer support tickets, contact messages, showroom appointments, and service logs.",
    badgeBg: "bg-cyan-500/15",
    textColor: "text-cyan-400",
    borderColor: "border-cyan-500/40"
  },
  {
    id: "Content Moderator",
    label: "Content Moderator",
    description: "Quality & Review Officer. Approves/rejects user vehicle listings, manages testimonials, dialogues, and FAQs.",
    badgeBg: "bg-rose-500/15",
    textColor: "text-rose-400",
    borderColor: "border-rose-500/40"
  },
  {
    id: "Finance Specialist",
    label: "Finance Specialist",
    description: "Loan & Valuation Officer. Reviews EMI calculations, bank loan application leads, pricing quotes, and deal metrics.",
    badgeBg: "bg-indigo-500/15",
    textColor: "text-indigo-400",
    borderColor: "border-indigo-500/40"
  },
  {
    id: "Marketing & Social Media Lead",
    label: "Marketing & Social Lead",
    description: "Campaign & Branding Officer. Creates promotional banners, social share posts, deal badges, and tracks marketing referral leads.",
    badgeBg: "bg-pink-500/15",
    textColor: "text-pink-400",
    borderColor: "border-pink-500/40"
  },
  {
    id: "User",
    label: "User (Customer)",
    description: "Standard registered customer. Has access to personal Saved Garage, My Listings, Test Drive requests, and Account.",
    badgeBg: "bg-stone-500/15",
    textColor: "text-stone-300",
    borderColor: "border-stone-500/40"
  }
];

export const ALL_ASSIGNABLE_ROLES: UserRole[] = [
  "Co-Owner",
  "Super Admin",
  "Auction Floor Director",
  "Trade-In & Exchange Valuer",
  "Parts Specialist",
  "Inventory Manager",
  "Sales & Leads Specialist",
  "Support Agent",
  "Content Moderator",
  "Finance Specialist",
  "Marketing & Social Media Lead",
  "User"
];

export const THE_7_ASSIGNABLE_ROLES = ALL_ASSIGNABLE_ROLES;

// Synchronize authenticated user to Firestore 'users' collection
export async function syncUserToFirestore(user: User): Promise<UserRole> {
  if (!user || !user.uid) return "User";

  const userRef = doc(db, "users", user.uid);
  const isOwnerEmail = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  
  try {
    const docSnap = await getDoc(userRef);
    const nowIso = new Date().toISOString();

    if (docSnap.exists()) {
      const data = docSnap.data();
      let role: UserRole = isOwnerEmail ? "Owner" : (data.role || "User");
      
      await updateDoc(userRef, {
        displayName: user.displayName || data.displayName || user.email?.split("@")[0] || "User",
        email: user.email || data.email || "",
        photoURL: user.photoURL || data.photoURL || null,
        lastLogin: nowIso,
        role: role
      });

      return role;
    } else {
      const initialRole: UserRole = isOwnerEmail ? "Owner" : "User";
      const newUserProfile: UserProfile = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        photoURL: user.photoURL || null,
        role: initialRole,
        status: "active",
        createdAt: nowIso,
        lastLogin: nowIso
      };

      await setDoc(userRef, newUserProfile);
      return initialRole;
    }
  } catch (err) {
    console.warn("User sync to Firestore failed or working offline:", err);
    return isOwnerEmail ? "Owner" : "User";
  }
}

// Subscribe to live users list in Firestore for Admin Panel
export function subscribeToUserRoles(onUsersChange: (users: UserProfile[]) => void) {
  return onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      const userList: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        userList.push({
          ...data,
          uid: docSnap.id
        });
      });
      // Sort: Owner first, then staff roles, then standard users
      userList.sort((a, b) => {
        if (a.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) return -1;
        if (b.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) return 1;
        if (a.role === "Owner") return -1;
        if (b.role === "Owner") return 1;
        if (a.role !== "User" && b.role === "User") return -1;
        if (a.role === "User" && b.role !== "User") return 1;
        return (a.displayName || a.email).localeCompare(b.displayName || b.email);
      });
      onUsersChange(userList);
    },
    (err) => {
      console.warn("User roles snapshot listener notice:", err);
    }
  );
}

// Update a specific user's assigned role in Firestore
export async function updateUserRole(uid: string, newRole: UserRole): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: new Date().toISOString()
    });
    window.dispatchEvent(new Event("autoWorld_db_update"));
  } catch (err) {
    console.error("Failed to update user role:", err);
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

// Subscribe to logged-in user's role updates in real-time
export function subscribeToCurrentRole(uid: string, onRoleChange: (role: UserRole) => void) {
  const userRef = doc(db, "users", uid);
  return onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.role) {
          onRoleChange(data.role as UserRole);
        }
      }
    },
    (err) => {
      console.warn("Current user role subscription notice:", err);
    }
  );
}

// Authorized roles that can control, schedule, launch, pause, and moderate auctions
export const AUCTION_CONTROLLER_ROLES: UserRole[] = [
  "Owner",
  "Co-Owner",
  "Super Admin",
  "Auction Floor Director"
];

/**
 * Checks if a given user has authority to manage auctions globally
 */
export function canManageAuctions(role?: UserRole, userEmail?: string | null): boolean {
  if (userEmail && userEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    return true;
  }
  if (!role) return false;
  return AUCTION_CONTROLLER_ROLES.includes(role);
}

/**
 * Checks if a given user can control a specific auction lot
 */
export function canControlAuctionLot(
  lot?: { sellerUid?: string; controlledByRole?: string[] } | null,
  role?: UserRole,
  userEmail?: string | null,
  userUid?: string | null
): boolean {
  if (canManageAuctions(role, userEmail)) return true;
  if (!lot) return false;
  if (userEmail && lot.sellerUid && lot.sellerUid.toLowerCase() === userEmail.toLowerCase()) return true;
  if (userUid && lot.sellerUid && lot.sellerUid === userUid) return true;
  if (lot.controlledByRole && role && lot.controlledByRole.includes(role)) return true;
  return false;
}

