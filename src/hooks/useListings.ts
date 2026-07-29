import { useState, useEffect } from "react";
import { subscribeToRealtimeCatalog, AdminSettingsData } from "../lib/catalogSync";
import { UserListing } from "../types";

export interface UseListingsResult {
  userListings: UserListing[];
  overrides: Record<string, any>;
  adminSettings: AdminSettingsData;
  loading: boolean;
  error: Error | null;
}

/**
 * Custom Hook: useListings
 * Provides real-time synchronization with Firebase Firestore collections (`listings`, `catalog_overrides`, `admin_settings`).
 * Keeps vehicle listings, user profiles, and platform settings live across all tabs and components without page refreshes.
 */
export function useListings(): UseListingsResult {
  const [userListings, setUserListings] = useState<UserListing[]>([]);
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [adminSettings, setAdminSettings] = useState<AdminSettingsData>({
    hiddenDefaultIds: [],
    removedDefaultIds: [],
    defaultBadges: {},
    homeFeaturedIds: [],
    isFreePassEnabled: true,
    isSecureShieldEnabled: true,
    isEmiCalculatorEnabled: true,
    isWhatsAppConnectEnabled: true,
    isAiAssistantEnabled: true,
    isSimranFreeModeEnabled: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    try {
      const unsubscribe = subscribeToRealtimeCatalog(({ userListings: newListings, overrides: newOverrides, adminSettings: newSettings }) => {
        if (!isMounted) return;
        setUserListings(newListings);
        setOverrides(newOverrides);
        setAdminSettings(newSettings);
        setLoading(false);
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (err: any) {
      if (isMounted) {
        setError(err);
        setLoading(false);
      }
    }
  }, []);

  return {
    userListings,
    overrides,
    adminSettings,
    loading,
    error,
  };
}
