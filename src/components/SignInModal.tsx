import React, { useState } from "react";
import { X, LogIn, Sparkles, User, AlertTriangle, ShieldCheck, Mail, Lock, ChevronDown, ChevronUp, ExternalLink, Settings, Database, Key } from "lucide-react";
import firebaseConfig from "../../firebase-applet-config.json";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { 
  signInWithPopup, 
  auth, 
  googleProvider, 
  signInAnonymously, 
  updateProfile 
} from "../firebase";
import { motion, AnimatePresence } from "motion/react";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function SignInModal({ isOpen, onClose, showToast }: SignInModalProps) {
  // Navigation tabs: "guest" | "email"
  const [activeSubTab, setActiveSubTab] = useState<"guest" | "email">("guest");

  // Guest inputs
  const [guestName, setGuestName] = useState("");
  const [isSigningInGuest, setIsSigningInGuest] = useState(false);

  // Google inputs
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [unauthorizedDomainError, setUnauthorizedDomainError] = useState(false);

  // Email inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSigningInEmail, setIsSigningInEmail] = useState(false);

  // Connection & Setup diagnostics
  const [firebaseError, setFirebaseError] = useState<{ code: string; message: string; type: "auth" | "firestore" } | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setUnauthorizedDomainError(false);
    setFirebaseError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      
      // Auto-check if Google user is our administrator
      if (auth.currentUser?.email === "afrojalamansari461@gmail.com") {
        showToast("Welcome Administrator! Full website control active.", "success");
      } else {
        showToast("Google connection verified successfully!", "success");
      }
      onClose();
    } catch (err: any) {
      const errCode = err.code || "auth/unknown";
      const isExpectedAuthIssue = ["auth/unauthorized-domain", "auth/popup-blocked", "auth/popup-closed-by-user", "auth/user-cancelled"].includes(errCode);
      if (isExpectedAuthIssue) {
        console.warn("Google auth configuration warning:", err);
      } else {
        console.error("Google auth failed:", err);
      }
      const errMsg = err.message || "";
      setFirebaseError({ code: errCode, message: errMsg, type: "auth" });
      setShowTroubleshoot(true);
      
      if (err.code === "auth/unauthorized-domain") {
        setUnauthorizedDomainError(true);
        showToast("Domain unauthorized by Firebase. Please use Email/Password option instead.", "error");
      } else if (err.code === "auth/popup-blocked") {
        showToast("Popup blocked. Please permit popups or use Email/Password sign-in.", "error");
      } else if (err.code === "auth/popup-closed-by-user") {
        showToast("Sign-in popup closed by user before completion. If this persists, please use Email Pass Auth or open in a new tab.", "info");
      } else if (errMsg.includes("INTERNAL ASSERTION FAILED") || errMsg.includes("Pending promise was never set")) {
        showToast("Auth state conflicts in the iframe sandbox. Please Reload the page or open in a New Tab to login.", "error");
      } else {
        showToast(err.message || "An error occurred during Google authentication.", "error");
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGuestSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningInGuest(true);
    setUnauthorizedDomainError(false);
    setFirebaseError(null);
    const displayName = guestName.trim() || "Guest Member";
    try {
      await signInAnonymously(auth);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName,
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`
        });
      }

      showToast(`Welcome, ${displayName}! Guest session verified.`, "success");
      onClose();
    } catch (err: any) {
      console.error("Guest session failed:", err);
      const errMsg = err.message || "";
      const errCode = err.code || "auth/unknown";
      setFirebaseError({ code: errCode, message: errMsg, type: "auth" });
      setShowTroubleshoot(true);
      showToast(err.message || "An error occurred creating guest session.", "error");
    } finally {
      setIsSigningInGuest(false);
    }
  };

  // Handles standard secure Email and Password Registration / Authentication
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFirebaseError(null);
    if (!email || !password) {
      showToast("Please enter values for email and password fields.", "error");
      return;
    }
    if (password.length < 6) {
      showToast("Password must include at least 6 characters.", "error");
      return;
    }

    setIsSigningInEmail(true);
    try {
      if (isRegistering) {
        // Create user
        await createUserWithEmailAndPassword(auth, email, password);
        
        // Auto update displayName based on username prefix
        const calculatedName = email.split("@")[0];
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: calculatedName,
            photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(calculatedName)}`
          });
        }
        showToast("Secure user account created and login confirmed!", "success");
      } else {
        // Sign in
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Access authorized! Logged in successfully.", "success");
      }

      // If user is Owner email, show special welcome
      if (email.toLowerCase() === "afrojalamansari461@gmail.com") {
        showToast("Owner credentials confirmed! Admin console unlocked.", "success");
      }

      onClose();
    } catch (err: any) {
      console.error("Email auth failed:", err);
      const errMsg = err.message || "";
      const errCode = err.code || "auth/unknown";
      setFirebaseError({ code: errCode, message: errMsg, type: "auth" });
      setShowTroubleshoot(true);
      
      let errorMsg = err.message;
      if (err.code === "auth/wrong-password") {
        errorMsg = "Incorrect password. Please verify and retry.";
      } else if (err.code === "auth/user-not-found") {
        errorMsg = "No account found matching this email address.";
      } else if (err.code === "auth/email-already-in-use") {
        errorMsg = "This email is already registered. Please login instead.";
      }
      showToast(errorMsg || "Authentication operation failed.", "error");
    } finally {
      setIsSigningInEmail(false);
    }
  };

  // Passcode operations removed under production-grade security architecture.

  return (
    <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#F4F1EA] border-2 border-stone-90 w-full max-w-md shadow-2xl relative max-h-[95vh] overflow-y-auto p-6 sm:p-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-905 hover:text-stone-500 font-mono text-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-stone-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <LogIn className="w-6 h-6 text-[#F4F1EA]" />
          </div>
          <h2 className="text-2xl font-serif font-black uppercase tracking-tight text-stone-950">
            Sign In to Auto<span className="font-light italic text-stone-500">World</span>
          </h2>
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mt-1">
            Secure client ledger & owner workspace console
          </p>
        </div>

        {/* Dynamic sub tab layout */}
        <div className="flex border-b border-stone-300 mb-5 text-[10px] font-bold uppercase tracking-wider font-mono" id="subtab-header">
          <button
            id="guest-tab"
            onClick={() => setActiveSubTab("guest")}
            className={`flex-1 pb-3 text-center transition ${
              activeSubTab === "guest"
                ? "border-b-2 border-stone-905 text-stone-900 font-extrabold"
                : "text-stone-450 hover:text-stone-800"
            }`}
          >
            Guest Session
          </button>
          
          <button
            id="email-tab"
            onClick={() => setActiveSubTab("email")}
            className={`flex-1 pb-3 text-center transition ${
              activeSubTab === "email"
                ? "border-b-2 border-stone-905 text-stone-900 font-extrabold"
                : "text-stone-450 hover:text-stone-800"
            }`}
          >
            Email Pass Auth
          </button>
        </div>

        {/* Sub panels */}
        <AnimatePresence mode="wait">
          {activeSubTab === "guest" && (
            <motion.div
              key="guest-panel"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningInGoogle || isSigningInGuest}
                className="w-full py-3.5 bg-white border-2 border-stone-900 hover:bg-stone-50 text-stone-900 flex items-center justify-center gap-3 font-sans text-xs uppercase font-extrabold tracking-widest cursor-pointer transition disabled:opacity-55"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="100%" height="100%">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.14-.42-.23-.87-.23-1.35z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {isSigningInGoogle ? "Connecting..." : "Sign in with Google"}
              </button>

              {/* Iframe connection safety tip */}
              {typeof window !== "undefined" && window.self !== window.top && (
                <div className="p-3.5 bg-[#FFFDF9] border border-amber-200 text-[11px] text-stone-700 leading-relaxed font-sans space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] tracking-wider text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Iframe Preview Sandbox Note
                  </div>
                  <p>
                    Google authentication popups are often restricted by page frame sandbox policies. 
                    If you get a <strong>popup-closed-by-user</strong> or <strong>assertion error</strong>, please:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 font-medium text-stone-800">
                    <li>Click the <strong>Open in a new tab</strong> button at the top-right of the preview interface.</li>
                    <li>Or sign up/login instantly using the reliable, fully offline-ready <strong>Email Pass Auth</strong> tab above!</li>
                  </ul>
                </div>
              )}

              {/* Error Banner for Authorized Domains */}
              {unauthorizedDomainError && (
                <div className="p-4 bg-red-50 border-2 border-red-800 rounded-sm text-stone-900 text-xs leading-relaxed font-sans space-y-3 shadow-md text-left">
                  <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-wider text-red-800 border-b pb-1.5 border-red-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    Domain Unauthorized in Firebase
                  </div>
                  <p className="text-[11px] text-stone-700">
                    Firebase Authentication has rejected this Google Sign-In request because this host domain is not in your Firebase Project's authorized domains list.
                  </p>
                  <div className="bg-white p-2.5 border border-stone-300 font-sans space-y-2 text-[10.5px]">
                    <p className="font-bold text-stone-950">How to authorize this domain:</p>
                    <ol className="list-decimal pl-4.5 space-y-1 text-stone-605 font-medium text-[10px] sm:text-[10.5px]">
                      <li>
                        Go to your{" "}
                        <a 
                          href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-amber-800 hover:underline font-bold inline-flex items-center gap-0.5"
                        >
                          Firebase Console Auth settings <ExternalLink className="w-3 h-3 inline-block" />
                        </a>.
                      </li>
                      <li>Click the <strong className="text-stone-850">Settings</strong> tab.</li>
                      <li>Select <strong className="text-stone-850">Authorized domains</strong> from the left list.</li>
                      <li>Click <strong className="text-stone-850">Add domain</strong> and enter:</li>
                    </ol>
                    <div className="space-y-2 mt-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-stone-500">Development Iframe Host:</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="text" 
                            readOnly 
                            value={typeof window !== 'undefined' ? window.location.hostname : 'No location state'} 
                            className="font-mono text-[10px] bg-stone-100 text-stone-850 px-2.5 py-1.5 select-all border border-stone-300 flex-1 rounded font-bold"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                navigator.clipboard.writeText(window.location.hostname);
                                showToast("Copied development domain!", "success");
                              }
                            }}
                            className="px-2 py-1.5 bg-stone-900 text-white font-mono text-[9px] font-bold uppercase tracking-wider hover:bg-stone-800 rounded shrink-0 cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      {typeof window !== 'undefined' && window.location.hostname.includes("-dev-") && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-stone-500">Shared Preview Host:</span>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="text" 
                              readOnly 
                              value={window.location.hostname.replace("-dev-", "-pre-")} 
                              className="font-mono text-[10px] bg-stone-100 text-stone-850 px-2.5 py-1.5 select-all border border-stone-300 flex-1 rounded font-bold"
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(window.location.hostname.replace("-dev-", "-pre-"));
                                showToast("Copied shared preview domain!", "success");
                              }}
                              className="px-2 py-1.5 bg-stone-900 text-white font-mono text-[9px] font-bold uppercase tracking-wider hover:bg-stone-800 rounded shrink-0 cursor-pointer"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-stone-800 text-[10.5px]">
                    Alternative: You can use the "Email Pass Auth" or "Guest Session" options above instantly without any Firebase configuration!
                  </p>
                </div>
              )}

              <div className="relative flex items-center justify-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-stone-300"></span>
                </div>
                <span className="relative px-3 bg-[#F4F1EA] text-[9px] font-bold text-stone-500 uppercase tracking-widest">
                  OR USE ANONYMOUS PASS
                </span>
              </div>

              {/* Guest Submission Box */}
              <form onSubmit={handleGuestSignIn} className="space-y-4">
                <div className="bg-white border-2 border-stone-900 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Bypass Login Restrictions
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase font-bold tracking-wider text-stone-705 mb-1">
                      Enter Display/Guest Name
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Afroj"
                        maxLength={35}
                        required
                        className="w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border-2 border-stone-300 focus:border-stone-900 text-stone-900 text-xs font-sans outline-none font-bold"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSigningInGoogle || isSigningInGuest}
                  className="w-full py-3.5 bg-stone-900 hover:bg-stone-850 text-white flex items-center justify-center gap-2 font-sans text-xs uppercase font-extrabold tracking-widest cursor-pointer transition disabled:opacity-55"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isSigningInGuest ? "Connecting..." : "Initiate Guest Connection"}
                </button>
              </form>
            </motion.div>
          )}

          {activeSubTab === "email" && (
            <motion.div
              key="email-panel"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              {/* Email / Password Form (100% reliable) */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="bg-white border-2 border-stone-900 p-4.5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono">
                      {isRegistering ? "CREATE SECURE ACCOUNT" : "AUTHENTICATE CREDENTIALS"}
                    </span>
                  </div>

                  {/* Input Email */}
                  <div className="space-y-1">
                    <label className="block text-[8.5px] uppercase font-bold tracking-wider text-stone-605">
                      Email Address
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3.5 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="afrojalamansari461@gmail.com"
                        className="w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border-2 border-stone-300 focus:border-stone-900 text-stone-900 text-xs font-sans font-semibold outline-none"
                      />
                    </div>
                  </div>

                  {/* Input Password */}
                  <div className="space-y-1">
                    <label className="block text-[8.5px] uppercase font-bold tracking-wider text-stone-605">
                      Passcode/Password
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 w-4 h-4 text-stone-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border-2 border-stone-300 focus:border-stone-900 text-stone-900 text-xs font-sans outline-none"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="text-[10px] font-bold underline font-mono text-stone-800 hover:text-stone-950 cursor-pointer"
                    >
                      {isRegistering ? "Already have an account? Log In" : "Need an account? Sign Up Free"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSigningInEmail}
                  className="w-full py-3.5 bg-stone-900 hover:bg-stone-850 text-white flex items-center justify-center gap-2 font-sans text-xs uppercase font-extrabold tracking-widest cursor-pointer transition disabled:opacity-55"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isSigningInEmail 
                    ? "Authenticating..." 
                    : isRegistering 
                      ? "Register & Login" 
                      : "Login to Account"
                  }
                </button>
              </form>
            </motion.div>
          )}

          /* Passcode panel logic removed under production-grade security architecture. */
        </AnimatePresence>

        {/* Diagnostic console toggler and panel */}
        <div className="mt-5 space-y-3 font-sans">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
              className="text-[9.5px] font-mono text-stone-600 hover:text-stone-950 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 shrink-0 text-stone-500" />
              {showTroubleshoot ? "Hide Troubleshooter Console" : "Troubleshoot Firebase Configuration"}
              {showTroubleshoot ? <ChevronUp className="w-3 h-3 text-stone-900" /> : <ChevronDown className="w-3 h-3 text-stone-900" />}
            </button>
          </div>

          {(firebaseError || showTroubleshoot) && (
            <div className="p-4 bg-[#FAF8F5] border-2 border-amber-600 rounded-sm font-sans space-y-3 shadow-md text-stone-900 text-xs text-left">
              <div className="flex items-center justify-between border-b pb-2 border-stone-200">
                <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] tracking-wider text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Firebase Setup Diagnostic Console
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFirebaseError(null);
                    setShowTroubleshoot(false);
                  }}
                  className="text-[9px] font-mono hover:text-stone-950 font-bold animate-pulse"
                >
                  [Dismiss]
                </button>
              </div>

              {firebaseError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-955 font-medium space-y-1 rounded-sm">
                  <p className="font-bold flex items-center gap-1.5 text-red-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-650 shrink-0" />
                    Detected Code: {firebaseError.code}
                  </p>
                  <p className="text-[10px] leading-relaxed font-mono tracking-tight bg-stone-50/50 p-1 block break-all">{firebaseError.message}</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="font-sans leading-relaxed text-[11px] text-stone-700">
                  Your website targets Firebase Project ID: <strong className="font-mono text-amber-900 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 font-bold">{firebaseConfig.projectId}</strong>. 
                  Please verify these 4 services are enabled inside your Firebase Dashboard project console:
                </p>

                <div className="space-y-3 pl-1">
                  {/* Step 1: Email Auth */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-4.5 h-4.5 rounded-full bg-stone-900 text-[#F4F1EA] text-[9px] font-black font-mono flex items-center justify-center shrink-0 mt-0.5">1</div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-stone-950 text-[11.5px] flex items-center gap-1.5">
                        Email & Password Sign-in
                        {firebaseError?.code === "auth/operation-not-allowed" && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-900 text-[8px] font-bold uppercase tracking-wider rounded">Detected Failure</span>
                        )}
                      </p>
                      <p className="text-[10px] text-stone-600 leading-normal font-medium font-semibold">
                        Go to <strong className="text-stone-850">Build &gt; Authentication &gt; Sign-in method</strong>, add new provider <strong>Email/Password</strong>, set status to enabled, and save.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Anonymous Guest */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-4.5 h-4.5 rounded-full bg-stone-900 text-[#F4F1EA] text-[9px] font-black font-mono flex items-center justify-center shrink-0 mt-0.5">2</div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-stone-950 text-[11.5px] flex items-center gap-1.5">
                        Anonymous Guest Sessions
                        {firebaseError?.code === "auth/admin-restricted-operation" && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-900 text-[8px] font-bold uppercase tracking-wider rounded">Detected Failure</span>
                        )}
                      </p>
                      <p className="text-[10px] text-stone-600 leading-normal font-medium font-semibold">
                        In <strong className="text-stone-850">Authentication &gt; Sign-in method</strong>, click <strong>Anonymous</strong>, enable and click save.
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Google auth provider */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-4.5 h-4.5 rounded-full bg-stone-900 text-[#F4F1EA] text-[9px] font-black font-mono flex items-center justify-center shrink-0 mt-0.5">3</div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-stone-950 text-[11.5px] flex items-center gap-1.5">
                        Google Provider Configuration
                        {firebaseError?.code === "auth/configuration-not-found" && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-900 text-[8px] font-bold uppercase tracking-wider rounded">Detected Failure</span>
                        )}
                      </p>
                      <p className="text-[10px] text-stone-600 leading-normal font-medium font-semibold">
                        In <strong className="text-stone-850">Authentication &gt; Sign-in method</strong>, add <strong>Google</strong>, specify support email addresses, and save.
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Firestore database */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-4.5 h-4.5 rounded-full bg-stone-900 text-[#F4F1EA] text-[9px] font-black font-mono flex items-center justify-center shrink-0 mt-0.5">4</div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-stone-950 text-[11.5px] flex items-center gap-1.5">
                        Cloud Firestore Instance
                      </p>
                      <p className="text-[10px] text-stone-600 leading-normal font-medium font-semibold">
                        Navigate to <strong className="text-stone-850">Build &gt; Firestore Database</strong>, click <strong>Create database</strong>, specify region, start in test/production rules and complete database start.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Direct buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-[9.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    Configure Auth <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </a>
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-2.5 bg-white border border-stone-300 text-stone-900 hover:bg-stone-50 text-[9.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    Start Firestore <ExternalLink className="w-3.5 h-3.5 text-stone-900" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Notice */}
        <div className="mt-6 pt-4 border-t border-stone-900/10 text-center">
          <p className="text-[9.5px] text-stone-500 uppercase tracking-widest font-sans leading-relaxed">
            Authorized administrator operations strictly logged inside Cloud Firestore security nodes.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
