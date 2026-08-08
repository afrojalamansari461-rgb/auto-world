import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously, updateProfile } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Web app's Firebase configuration strictly using environment variables
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDDXQDJ3RGDPWkBbS90oXwrN5sC3ZenGpg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "auto-worldd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "auto-worldd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "auto-worldd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "534691190568",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:534691190568:web:4c75cf6993d00c5b3ce21d",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Keep user logged in across page reloads and browser sessions until explicit sign out
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("[Firebase Auth Persistence Error]:", err);
});
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

// Standard login / logout functions
export { signInWithPopup, signOut, signInAnonymously, updateProfile };

// Connectivity check constraint
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("[Firebase Check] Local Firestore client is currently working offline. Please check your Firestore Console setup if this is unexpected.");
    }
  }
}
testConnection();

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
