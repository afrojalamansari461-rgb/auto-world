import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, onSnapshot, collection, getDoc } from "firebase/firestore";
import { UserListing } from "../types";

export interface AdminSettingsData {
  hiddenDefaultIds: number[];
  removedDefaultIds: number[];
  defaultBadges: Record<string, string | null>;
  homeFeaturedIds: string[];
}

// 1. Save spec overrides for default catalog items to Firestore
export async function saveCatalogOverride(vehicleId: number | string, overrideData: Record<string, any>) {
  const docId = String(vehicleId);
  try {
    const overrideRef = doc(db, "catalog_overrides", docId);
    await setDoc(overrideRef, {
      id: vehicleId,
      ...overrideData,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Also cache locally
    try {
      const storedStr = localStorage.getItem("autoWorld_default_overrides") || "{}";
      const currentMap = JSON.parse(storedStr);
      currentMap[docId] = { ...currentMap[docId], ...overrideData };
      localStorage.setItem("autoWorld_default_overrides", JSON.stringify(currentMap));
    } catch (e) {
      console.warn("Local storage cache write error:", e);
    }

    // Trigger local update event for current window
    window.dispatchEvent(new Event("autoWorld_db_update"));
  } catch (err) {
    console.error("Failed to save catalog override to Firestore:", err);
    handleFirestoreError(err, OperationType.WRITE, `catalog_overrides/${docId}`);
  }
}

// 2. Save global Admin settings (hidden defaults, badges, home featured) to Firestore
export async function saveAdminSettingsToFirestore(settings: Partial<AdminSettingsData>) {
  try {
    const adminRef = doc(db, "admin_settings", "catalog");
    await setDoc(adminRef, {
      ...settings,
      lastUpdated: new Date().toISOString()
    }, { merge: true });

    // Mirror to localStorage
    try {
      if (settings.hiddenDefaultIds) {
        localStorage.setItem("autoWorld_hidden_defaults", JSON.stringify(settings.hiddenDefaultIds));
      }
      if (settings.removedDefaultIds) {
        localStorage.setItem("autoWorld_removed_defaults", JSON.stringify(settings.removedDefaultIds));
      }
      if (settings.defaultBadges) {
        localStorage.setItem("autoWorld_default_badges", JSON.stringify(settings.defaultBadges));
      }
      if (settings.homeFeaturedIds) {
        localStorage.setItem("autoWorld_home_featured_ids", JSON.stringify(settings.homeFeaturedIds));
      }
    } catch (e) {
      console.warn("Local storage settings sync error:", e);
    }

    window.dispatchEvent(new Event("autoWorld_db_update"));
  } catch (err) {
    console.error("Failed to save admin settings to Firestore:", err);
    handleFirestoreError(err, OperationType.WRITE, "admin_settings/catalog");
  }
}

// 3. Real-time subscriber for Firestore catalog data
export function subscribeToRealtimeCatalog(
  onData: (data: {
    userListings: UserListing[];
    overrides: Record<string, any>;
    adminSettings: AdminSettingsData;
  }) => void
) {
  let userListings: UserListing[] = [];
  let overrides: Record<string, any> = {};
  let adminSettings: AdminSettingsData = {
    hiddenDefaultIds: [],
    removedDefaultIds: [],
    defaultBadges: {},
    homeFeaturedIds: []
  };

  const emit = () => {
    onData({
      userListings: [...userListings],
      overrides: { ...overrides },
      adminSettings: { ...adminSettings }
    });
  };

  // Listen to listings collection
  const unsubListings = onSnapshot(
    collection(db, "listings"),
    (snapshot) => {
      const items: UserListing[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as UserListing);
      });
      userListings = items;
      emit();
    },
    (err) => {
      console.warn("Listings snapshot listener error:", err);
    }
  );

  // Listen to catalog_overrides collection
  const unsubOverrides = onSnapshot(
    collection(db, "catalog_overrides"),
    (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.id !== undefined) {
          map[String(data.id)] = data;
        }
      });
      overrides = map;
      emit();
    },
    (err) => {
      console.warn("Catalog overrides snapshot listener error:", err);
    }
  );

  // Listen to admin_settings/catalog doc
  const unsubSettings = onSnapshot(
    doc(db, "admin_settings", "catalog"),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        adminSettings = {
          hiddenDefaultIds: Array.isArray(data.hiddenDefaultIds) ? data.hiddenDefaultIds : [],
          removedDefaultIds: Array.isArray(data.removedDefaultIds) ? data.removedDefaultIds : [],
          defaultBadges: data.defaultBadges && typeof data.defaultBadges === "object" ? data.defaultBadges : {},
          homeFeaturedIds: Array.isArray(data.homeFeaturedIds) ? data.homeFeaturedIds : []
        };
      }
      emit();
    },
    (err) => {
      console.warn("Admin settings snapshot listener error:", err);
    }
  );

  return () => {
    unsubListings();
    unsubOverrides();
    unsubSettings();
  };
}
