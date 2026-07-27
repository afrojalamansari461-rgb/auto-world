import { db } from "../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { UserListing } from "../types";

export const EXPIRATION_DAYS = 30;
export const THIRTY_DAYS_MS = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
export const WARNING_DAYS = 3;

export interface ExpirationDetails {
  isExpired: boolean;
  isNearExpiry: boolean; // <= 3 days remaining
  daysRemaining: number;
  expiryDateStr: string;
  expiryDateObj: Date;
  postedDateObj: Date;
  isPremiumOrFeatured: boolean;
}

/**
 * Calculates listing expiration details based on posting timestamp and premium/featured status.
 */
export function getListingExpirationDetails(
  datePostedStr?: string | null,
  isPremiumOrFeatured: boolean = false
): ExpirationDetails {
  const now = Date.now();
  
  let postedTime = Date.now();
  if (datePostedStr) {
    const parsed = new Date(datePostedStr).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      postedTime = parsed;
    }
  }

  const postedDateObj = new Date(postedTime);
  const expiryDateObj = new Date(postedTime + THIRTY_DAYS_MS);
  
  const expiryDateStr = expiryDateObj.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  if (isPremiumOrFeatured) {
    return {
      isExpired: false,
      isNearExpiry: false,
      daysRemaining: 999,
      expiryDateStr: "Unlimited (Premium Tier)",
      expiryDateObj,
      postedDateObj,
      isPremiumOrFeatured: true
    };
  }

  const ageMs = now - postedTime;
  const isExpired = ageMs >= THIRTY_DAYS_MS;
  const remainingMs = Math.max(0, THIRTY_DAYS_MS - ageMs);
  const daysRemaining = isExpired ? 0 : Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  const isNearExpiry = !isExpired && daysRemaining <= WARNING_DAYS;

  return {
    isExpired,
    isNearExpiry,
    daysRemaining,
    expiryDateStr,
    expiryDateObj,
    postedDateObj,
    isPremiumOrFeatured: false
  };
}

/**
 * Cloud Function / Periodic Background Task logic.
 * Queries 'listings' collection in Firestore, filters for items where 'createdAt'/'datePosted'
 * is older than 30 days and 'featured' status is not true, and automatically updates their status to 'hidden'.
 */
export async function run30DayExpirationTask(): Promise<{ expiredCount: number; updatedIds: string[] }> {
  let expiredCount = 0;
  const updatedIds: string[] = [];

  try {
    const snapshot = await getDocs(collection(db, "listings"));
    const updates: Promise<void>[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserListing;
      const isFeatured = Boolean(data.featured || data.urgent || data.verified);
      const datePosted = data.datePosted || (data as any).createdAt;

      if (!isFeatured && datePosted && data.status !== "hidden") {
        const postedTime = new Date(datePosted).getTime();
        if (!isNaN(postedTime) && Date.now() - postedTime >= THIRTY_DAYS_MS) {
          const docRef = doc(db, "listings", docSnap.id);
          updates.push(
            setDoc(
              docRef,
              {
                status: "hidden",
                autoHiddenAt: new Date().toISOString(),
                expirationReason: "30_day_free_tier_expiry"
              },
              { merge: true }
            )
          );
          expiredCount++;
          updatedIds.push(docSnap.id);
        }
      }
    });

    if (updates.length > 0) {
      await Promise.all(updates);
      window.dispatchEvent(new Event("autoWorld_db_update"));
    }
  } catch (err) {
    console.warn("Firestore 30-day expiration task executed in offline mode:", err);
  }

  // LocalStorage fallback sync
  try {
    const storedListingsStr = localStorage.getItem("autoworld_user_listings");
    if (storedListingsStr) {
      const localListings: UserListing[] = JSON.parse(storedListingsStr);
      let localModified = false;

      const updatedLocal = localListings.map((item) => {
        const isFeatured = Boolean(item.featured || item.urgent || item.verified);
        const datePosted = item.datePosted || (item as any).createdAt;

        if (!isFeatured && datePosted && item.status !== "hidden") {
          const postedTime = new Date(datePosted).getTime();
          if (!isNaN(postedTime) && Date.now() - postedTime >= THIRTY_DAYS_MS) {
            localModified = true;
            if (!updatedIds.includes(item.id)) {
              expiredCount++;
              updatedIds.push(item.id);
            }
            return { ...item, status: "hidden" as const };
          }
        }
        return item;
      });

      if (localModified) {
        localStorage.setItem("autoworld_user_listings", JSON.stringify(updatedLocal));
        window.dispatchEvent(new Event("autoWorld_db_update"));
      }
    }
  } catch (e) {
    console.warn("LocalStorage expiration update error:", e);
  }

  return { expiredCount, updatedIds };
}
