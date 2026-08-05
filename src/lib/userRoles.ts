import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, updateDoc, onSnapshot, collection, getDoc } from "firebase/firestore";
import { User } from "firebase/auth";

export type UserRole = 
  | "Owner"
  | "Super Admin"
  | "Inventory Manager"
  | "Sales & Leads Specialist"
  | "Support Agent"
  | "Content Moderator"
  | "Finance Specialist"
  | "Marketing & Social Media Lead"
  | "User";

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
    id: "Super Admin",
    label: "Super Admin",
    description: "Senior platform executive. Oversees inventory, buyer leads, customer support, review moderation, and financing.",
    badgeBg: "bg-purple-500/15",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/40"
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

export const THE_7_ASSIGNABLE_ROLES: UserRole[] = [
  "Super Admin",
  "Inventory Manager",
  "Sales & Leads Specialist",
  "Support Agent",
  "Content Moderator",
  "Finance Specialist",
  "Marketing & Social Media Lead",
  "User"
];

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
