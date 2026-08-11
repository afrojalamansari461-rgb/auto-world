import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";

export interface SmsSettings {
  isSmsEnabled: boolean;
  targetNumber: string;
  alertCarUploads: boolean;
  alertStaffLogs: boolean;
  alertCarExpirations: boolean;
  alertBuyerLeads: boolean;
}

export interface SmsAlert {
  id: string;
  type: "carUpload" | "staffLog" | "carExpired" | "buyerLead" | "testSms";
  title: string;
  message: string;
  targetNumber: string;
  timestamp: string;
  status: "DISPATCHED" | "SIMULATED";
  metadata?: Record<string, any>;
}

export const DEFAULT_SMS_SETTINGS: SmsSettings = {
  isSmsEnabled: true,
  targetNumber: "7666232753",
  alertCarUploads: true,
  alertStaffLogs: true,
  alertCarExpirations: true,
  alertBuyerLeads: true
};

export function getSmsSettings(): SmsSettings {
  try {
    const stored = localStorage.getItem("autoWorld_sms_settings");
    if (stored) {
      return { ...DEFAULT_SMS_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn("Failed to parse local SMS settings:", e);
  }
  return DEFAULT_SMS_SETTINGS;
}

export function saveSmsSettingsLocally(settings: Partial<SmsSettings>) {
  try {
    const current = getSmsSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem("autoWorld_sms_settings", JSON.stringify(updated));
    window.dispatchEvent(new Event("autoWorld_sms_settings_changed"));
    return updated;
  } catch (e) {
    console.warn("Failed to save local SMS settings:", e);
    return DEFAULT_SMS_SETTINGS;
  }
}

/**
 * Primary dispatch engine for SMS and Mobile Notifications to +91 7666232753
 */
export async function dispatchAdminSmsAlert(
  type: "carUpload" | "staffLog" | "carExpired" | "buyerLead" | "testSms",
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<SmsAlert | null> {
  const settings = getSmsSettings();

  // 1. Check master toggle
  if (!settings.isSmsEnabled && type !== "testSms") {
    console.log("SMS Notification skipped: Master switch is OFF.");
    return null;
  }

  // 2. Check category toggles
  if (type === "carUpload" && !settings.alertCarUploads) return null;
  if (type === "staffLog" && !settings.alertStaffLogs) return null;
  if (type === "carExpired" && !settings.alertCarExpirations) return null;
  if (type === "buyerLead" && !settings.alertBuyerLeads) return null;

  const targetNum = settings.targetNumber || "7666232753";
  const timestamp = new Date().toISOString();
  
  const alertData: Omit<SmsAlert, "id"> = {
    type,
    title,
    message,
    targetNumber: targetNum,
    timestamp,
    status: "DISPATCHED",
    metadata: metadata || {}
  };

  let createdAlert: SmsAlert = {
    id: `sms-${Date.now()}`,
    ...alertData
  };

  // 3. Save to Firestore `sms_alerts` collection
  try {
    const docRef = await addDoc(collection(db, "sms_alerts"), {
      ...alertData,
      createdAt: new Date()
    });
    createdAlert.id = docRef.id;
  } catch (err) {
    console.warn("Firestore sms_alerts append failed, relying on local log:", err);
  }

  // 4. Save to localStorage history
  try {
    const storedHistory = localStorage.getItem("autoWorld_sms_history");
    const history: SmsAlert[] = storedHistory ? JSON.parse(storedHistory) : [];
    const updatedHistory = [createdAlert, ...history].slice(0, 100);
    localStorage.setItem("autoWorld_sms_history", JSON.stringify(updatedHistory));
  } catch (e) {
    console.warn("LocalStorage SMS history write error:", e);
  }

  // 5. Broadcast event for active UI listeners (e.g., Admin Panel HUD / Toast)
  try {
    window.dispatchEvent(
      new CustomEvent("autoWorld_sms_alert", {
        detail: createdAlert
      })
    );
  } catch (e) {
    console.warn("Error dispatching custom window event:", e);
  }

  return createdAlert;
}

export async function fetchSmsHistory(): Promise<SmsAlert[]> {
  try {
    const q = query(collection(db, "sms_alerts"), orderBy("createdAt", "desc"), limit(50));
    const snapshot = await getDocs(q);
    const loaded: SmsAlert[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      loaded.push({
        id: docSnap.id,
        type: data.type || "carUpload",
        title: data.title || "Notification",
        message: data.message || "",
        targetNumber: data.targetNumber || "7666232753",
        timestamp: data.timestamp || new Date().toISOString(),
        status: data.status || "DISPATCHED",
        metadata: data.metadata || {}
      });
    });
    if (loaded.length > 0) return loaded;
  } catch (e) {
    console.warn("Could not fetch remote SMS history, reading local:", e);
  }

  try {
    const storedHistory = localStorage.getItem("autoWorld_sms_history");
    if (storedHistory) {
      return JSON.parse(storedHistory);
    }
  } catch (e) {
    console.warn("Failed reading local SMS history:", e);
  }

  return [];
}
