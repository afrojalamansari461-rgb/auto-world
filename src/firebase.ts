import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously, updateProfile } from "firebase/auth";
import { initializeFirestore, getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, uploadBytes, getDownloadURL } from "firebase/storage";
import firebaseAppletConfig from "../firebase-applet-config.json";

// Web app's Firebase configuration merging applet config and environment variables
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey || "AIzaSyDDXQDJ3RGDPWkBbS90oXwrN5sC3ZenGpg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain || "auto-worldd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId || "auto-worldd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket || "auto-worldd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId || "534691190568",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId || "1:534691190568:web:4c75cf6993d00c5b3ce21d",
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || "(default)",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Keep user logged in across page reloads and browser sessions until explicit sign out
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("[Firebase Auth Persistence Error]:", err);
});

// Initialize Firestore with specific databaseId and long-polling resilience for container/iframe environments
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

export const storage = getStorage(app);
export { ref, uploadBytesResumable, uploadBytes, getDownloadURL };
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Helper to determine if an auth error is a benign user cancellation or popup dismissal
export const isAuthPopupCancellation = (error: any): boolean => {
  if (!error) return false;
  const code = error.code || "";
  const msg = typeof error === "string" ? error : (error.message || String(error));
  return (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/user-cancelled" ||
    code === "auth/popup-blocked" ||
    msg.includes("popup-closed-by-user") ||
    msg.includes("cancelled-popup-request") ||
    msg.includes("user-cancelled") ||
    msg.includes("popup-blocked")
  );
};

export default app;

// Standard login / logout functions
export { signInWithPopup, signOut, signInAnonymously, updateProfile };

// Connectivity check constraint per Firebase Integration Skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    const code = error?.code || "";
    if (
      code === "unavailable" ||
      msg.includes("the client is offline") ||
      msg.includes("unavailable") ||
      msg.includes("Could not reach Cloud Firestore")
    ) {
      console.warn("[Firebase Check] Local Firestore client is operating in offline mode or awaiting network reconnect.");
    } else {
      console.warn("[Firebase Check] Connection test notice:", msg);
    }
  }
}

// Safely schedule connectivity test without blocking runtime bootstrapping
if (typeof window !== "undefined") {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 1000);
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  const isConnectivityIssue = errMessage.toLowerCase().includes("offline") || 
                              errMessage.toLowerCase().includes("unavailable") || 
                              errMessage.toLowerCase().includes("could not reach") ||
                              errMessage.toLowerCase().includes("network");

  if (isConnectivityIssue) {
    console.warn("Firestore Connectivity/Offline Notice: ", JSON.stringify(errInfo));
  } else {
    console.error("Firestore Error: ", JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}
