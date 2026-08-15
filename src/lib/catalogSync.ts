import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, onSnapshot, collection, getDoc } from "firebase/firestore";
import { UserListing, UserPartListing } from "../types";

export interface AdminSettingsData {
  hiddenDefaultIds: number[];
  removedDefaultIds: number[];
  defaultBadges: Record<string, string | null>;
  homeFeaturedIds: string[];
  hiddenPartIds?: (number | string)[];
  removedPartIds?: (number | string)[];
  partBadges?: Record<string, string | null>;
  homeFeaturedPartIds?: string[];
  isFreePassEnabled?: boolean;
  isSecureShieldEnabled?: boolean;
  isEmiCalculatorEnabled?: boolean;
  isWhatsAppConnectEnabled?: boolean;
  isAiAssistantEnabled?: boolean;
  isSimranFreeModeEnabled?: boolean;
  isSmsNotificationsEnabled?: boolean;
  [key: string]: any;
  footerEmail?: string;
  footerPhone?: string;
  loginQuote?: string;
  loginAuthor?: string;
  loginCarImage?: string;
  registerQuote?: string;
  registerAuthor?: string;
  registerCarImage?: string;
  customDialogues?: Array<{ quote: string; movie: string; character: string; type: string }>;
  customFaqs?: Array<{ q: string; a: string }>;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge?: string;
  announcementText?: string;
  isAnnouncementEnabled?: boolean;
  showroomAddress?: string;
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

// 1b. Save spec overrides for default parts catalog items to Firestore
export async function savePartOverride(partId: number | string, overrideData: Record<string, any>) {
  const docId = String(partId);
  try {
    const overrideRef = doc(db, "catalog_overrides", `part_${docId}`);
    await setDoc(overrideRef, {
      id: partId,
      isPart: true,
      ...overrideData,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    try {
      const storedStr = localStorage.getItem("autoWorld_part_overrides") || "{}";
      const currentMap = JSON.parse(storedStr);
      currentMap[docId] = { ...currentMap[docId], ...overrideData };
      localStorage.setItem("autoWorld_part_overrides", JSON.stringify(currentMap));
    } catch (e) {
      console.warn("Local storage part overrides write error:", e);
    }

    window.dispatchEvent(new Event("autoWorld_db_update"));
  } catch (err) {
    console.error("Failed to save part override to Firestore:", err);
    handleFirestoreError(err, OperationType.WRITE, `catalog_overrides/part_${docId}`);
  }
}

// 2. Save global Admin settings (hidden defaults, badges, home featured) to Firestore
export async function loadAdminSettingsFromFirestore(): Promise<Partial<AdminSettingsData>> {
  try {
    const adminRef = doc(db, "admin_settings", "catalog");
    const snap = await getDoc(adminRef);
    if (snap.exists()) {
      return snap.data() as Partial<AdminSettingsData>;
    }
  } catch (err) {
    console.warn("Failed to load admin settings from Firestore, using local fallback:", err);
  }
  try {
    const storedBadges = localStorage.getItem("autoWorld_part_badges");
    const storedHidden = localStorage.getItem("autoWorld_hidden_parts");
    const storedHome = localStorage.getItem("autoworld_home_featured_parts");
    return {
      partBadges: storedBadges ? JSON.parse(storedBadges) : {},
      hiddenPartIds: storedHidden ? JSON.parse(storedHidden) : [],
      homeFeaturedPartIds: storedHome ? JSON.parse(storedHome) : ["1", "2", "3"]
    };
  } catch (e) {
    return {};
  }
}

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
      if (settings.hiddenPartIds) {
        localStorage.setItem("autoWorld_hidden_parts", JSON.stringify(settings.hiddenPartIds));
      }
      if (settings.removedPartIds) {
        localStorage.setItem("autoWorld_removed_parts", JSON.stringify(settings.removedPartIds));
      }
      if (settings.partBadges) {
        localStorage.setItem("autoWorld_part_badges", JSON.stringify(settings.partBadges));
      }
      if (settings.homeFeaturedPartIds) {
        localStorage.setItem("autoWorld_home_featured_parts", JSON.stringify(settings.homeFeaturedPartIds));
      }
      if (settings.isFreePassEnabled !== undefined) {
        localStorage.setItem("autoWorld_is_free_pass", JSON.stringify(settings.isFreePassEnabled));
      }
      if (settings.isSecureShieldEnabled !== undefined) {
        localStorage.setItem("autoWorld_is_secure_shield", JSON.stringify(settings.isSecureShieldEnabled));
      }
      if (settings.isEmiCalculatorEnabled !== undefined) {
        localStorage.setItem("autoWorld_is_emi_calculator", JSON.stringify(settings.isEmiCalculatorEnabled));
      }
      if (settings.isWhatsAppConnectEnabled !== undefined) {
        localStorage.setItem("autoWorld_is_whatsapp_connect", JSON.stringify(settings.isWhatsAppConnectEnabled));
      }
      if (settings.isAiAssistantEnabled !== undefined) {
        localStorage.setItem("autoWorld_is_ai_assistant", JSON.stringify(settings.isAiAssistantEnabled));
      }
      if (settings.isSimranFreeModeEnabled !== undefined) {
        localStorage.setItem("autoWorld_is_simran_free_mode", JSON.stringify(settings.isSimranFreeModeEnabled));
      }
      if (settings.footerEmail !== undefined) {
        localStorage.setItem("autoWorld_footer_email", settings.footerEmail);
      }
      if (settings.footerPhone !== undefined) {
        localStorage.setItem("autoWorld_footer_phone", settings.footerPhone);
      }
      if (settings.loginQuote !== undefined) {
        localStorage.setItem("autoWorld_login_quote", settings.loginQuote);
      }
      if (settings.loginAuthor !== undefined) {
        localStorage.setItem("autoWorld_login_author", settings.loginAuthor);
      }
      if (settings.loginCarImage !== undefined) {
        localStorage.setItem("autoWorld_login_car_image", settings.loginCarImage);
      }
      if (settings.registerQuote !== undefined) {
        localStorage.setItem("autoWorld_register_quote", settings.registerQuote);
      }
      if (settings.registerAuthor !== undefined) {
        localStorage.setItem("autoWorld_register_author", settings.registerAuthor);
      }
      if (settings.registerCarImage !== undefined) {
        localStorage.setItem("autoWorld_register_car_image", settings.registerCarImage);
      }
      if (settings.customDialogues !== undefined) {
        localStorage.setItem("autoWorld_custom_dialogues", JSON.stringify(settings.customDialogues));
      }
      if (settings.customFaqs !== undefined) {
        localStorage.setItem("autoWorld_custom_faqs", JSON.stringify(settings.customFaqs));
      }
      if (settings.heroTitle !== undefined) {
        localStorage.setItem("autoWorld_hero_title", settings.heroTitle);
      }
      if (settings.heroSubtitle !== undefined) {
        localStorage.setItem("autoWorld_hero_subtitle", settings.heroSubtitle);
      }
      if (settings.heroBadge !== undefined) {
        localStorage.setItem("autoWorld_hero_badge", settings.heroBadge);
      }
      if (settings.announcementText !== undefined) {
        localStorage.setItem("autoWorld_announcement_text", settings.announcementText);
      }
      if (settings.isAnnouncementEnabled !== undefined) {
        localStorage.setItem("autoWorld_is_announcement_enabled", JSON.stringify(settings.isAnnouncementEnabled));
      }
      if (settings.showroomAddress !== undefined) {
        localStorage.setItem("autoWorld_showroom_address", settings.showroomAddress);
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

// 3. Real-time subscriber for Firestore catalog & parts data
export function subscribeToRealtimeCatalog(
  onData: (data: {
    userListings: UserListing[];
    userParts?: UserPartListing[];
    overrides: Record<string, any>;
    partOverrides?: Record<string, any>;
    adminSettings: AdminSettingsData;
  }) => void
) {
  let userListings: UserListing[] = [];
  let userParts: UserPartListing[] = [];
  let overrides: Record<string, any> = {};
  let partOverrides: Record<string, any> = {};
  let adminSettings: AdminSettingsData = {
    hiddenDefaultIds: [],
    removedDefaultIds: [],
    defaultBadges: {},
    homeFeaturedIds: [],
    hiddenPartIds: [],
    removedPartIds: [],
    partBadges: {},
    homeFeaturedPartIds: []
  };

  const emit = () => {
    onData({
      userListings: [...userListings],
      userParts: [...userParts],
      overrides: { ...overrides },
      partOverrides: { ...partOverrides },
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

  // Listen to parts collection
  const unsubParts = onSnapshot(
    collection(db, "parts"),
    (snapshot) => {
      const items: UserPartListing[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as UserPartListing);
      });
      userParts = items;
      emit();
    },
    (err) => {
      console.warn("Parts snapshot listener error:", err);
    }
  );

  // Listen to catalog_overrides collection
  const unsubOverrides = onSnapshot(
    collection(db, "catalog_overrides"),
    (snapshot) => {
      const map: Record<string, any> = {};
      const pMap: Record<string, any> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.id !== undefined) {
          if (docSnap.id.startsWith("part_")) {
            pMap[String(data.id)] = data;
          } else {
            map[String(data.id)] = data;
          }
        }
      });
      overrides = map;
      partOverrides = pMap;
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
          homeFeaturedIds: Array.isArray(data.homeFeaturedIds) ? data.homeFeaturedIds : [],
          hiddenPartIds: Array.isArray(data.hiddenPartIds) ? data.hiddenPartIds : [],
          removedPartIds: Array.isArray(data.removedPartIds) ? data.removedPartIds : [],
          partBadges: data.partBadges && typeof data.partBadges === "object" ? data.partBadges : {},
          homeFeaturedPartIds: Array.isArray(data.homeFeaturedPartIds) ? data.homeFeaturedPartIds : [],
          isFreePassEnabled: data.isFreePassEnabled !== undefined ? Boolean(data.isFreePassEnabled) : true,
          isSecureShieldEnabled: data.isSecureShieldEnabled !== undefined ? Boolean(data.isSecureShieldEnabled) : true,
          isEmiCalculatorEnabled: data.isEmiCalculatorEnabled !== undefined ? Boolean(data.isEmiCalculatorEnabled) : true,
          isWhatsAppConnectEnabled: data.isWhatsAppConnectEnabled !== undefined ? Boolean(data.isWhatsAppConnectEnabled) : true,
          isAiAssistantEnabled: data.isAiAssistantEnabled !== undefined ? Boolean(data.isAiAssistantEnabled) : true,
          isSimranFreeModeEnabled: data.isSimranFreeModeEnabled !== undefined ? Boolean(data.isSimranFreeModeEnabled) : false,
          footerEmail: data.footerEmail || undefined,
          footerPhone: data.footerPhone || undefined,
          loginQuote: data.loginQuote || undefined,
          loginAuthor: data.loginAuthor || undefined,
          loginCarImage: data.loginCarImage || undefined,
          customDialogues: Array.isArray(data.customDialogues) ? data.customDialogues : undefined,
          customFaqs: Array.isArray(data.customFaqs) ? data.customFaqs : undefined,
          heroTitle: data.heroTitle || undefined,
          heroSubtitle: data.heroSubtitle || undefined,
          heroBadge: data.heroBadge || undefined,
          announcementText: data.announcementText || undefined,
          isAnnouncementEnabled: data.isAnnouncementEnabled !== undefined ? Boolean(data.isAnnouncementEnabled) : false,
          showroomAddress: data.showroomAddress || undefined
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
    unsubParts();
    unsubOverrides();
    unsubSettings();
  };
}
