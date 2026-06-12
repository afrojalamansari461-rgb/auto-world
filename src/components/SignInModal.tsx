import React, { useState } from "react";
import { X, LogIn, Sparkles, User, AlertTriangle, ShieldCheck, Mail } from "lucide-react";
import { signInWithPopup, auth, googleProvider, signInAnonymously, updateProfile } from "../firebase";
import { motion } from "motion/react";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function SignInModal({ isOpen, onClose, showToast }: SignInModalProps) {
  const [guestName, setGuestName] = useState("");
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [isSigningInGuest, setIsSigningInGuest] = useState(false);
  const [unauthorizedDomainError, setUnauthorizedDomainError] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setUnauthorizedDomainError(false);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast("Access formulated — logged in with Google securely!", "success");
      onClose();
    } catch (err: any) {
      console.error("Google auth failed:", err);
      if (err.code === "auth/unauthorized-domain") {
        setUnauthorizedDomainError(true);
        showToast("Domain unauthorized by Firebase project policies.", "error");
      } else if (err.code === "auth/popup-blocked") {
        showToast("Popup blocked by your browser. Please allow popups for this site.", "error");
      } else {
        showToast(err.message || "An error occurred during authentication.", "error");
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGuestSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningInGuest(true);
    setUnauthorizedDomainError(false);
    const displayName = guestName.trim() || "Guest Member";
    try {
      // Sign in anonymously to get real Firebase auth credentials so Firestore lets them read/write
      await signInAnonymously(auth);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName,
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`
        });
      }
      showToast(`Welcome aboard, ${displayName}! Guest session activated.`, "success");
      onClose();
    } catch (err: any) {
      console.error("Guest session failed:", err);
      showToast(err.message || "An error occurred creating your guest session.", "error");
    } finally {
      setIsSigningInGuest(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-[#F4F1EA] border-2 border-stone-900 w-full max-w-md shadow-2xl relative max-h-[92vh] overflow-y-auto p-6 sm:p-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-900 hover:text-stone-605 font-mono text-lg cursor-pointer"
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
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-550 mt-1">
            Unlock premium features & catalog access
          </p>
        </div>

        <div className="space-y-5">
          {/* OPTION 1: Google login */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningInGoogle || isSigningInGuest}
            className="w-full py-4 bg-white border-2 border-stone-900 hover:bg-stone-50 text-stone-900 flex items-center justify-center gap-3 font-sans text-xs uppercase font-extrabold tracking-widest cursor-pointer transition disabled:opacity-55"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="100%" height="100%">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.14-.42-.23-.87-.23-1.35z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {isSigningInGoogle ? "Connecting..." : "Sign in with Google"}
          </button>

          {/* Error Banner for Netlify deploys with unauthorized domains */}
          {unauthorizedDomainError && (
            <div className="p-4 bg-amber-50 border-l-4 border-amber-600 text-amber-950 text-xs leading-relaxed font-sans space-y-2">
              <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-wider text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-605" />
                Netlify / Custom Host Domain Error
              </div>
              <p>
                This occurs because Netlify's host name isn't whitelisted in your Firebase Console yet.
              </p>
              <p className="font-semibold text-stone-800">To fix this permanent resolution:</p>
              <ol className="list-decimal list-inside pl-1 space-y-1 text-[11px]">
                <li>Open your Firebase Console.</li>
                <li>Go to <strong>Authentication</strong> &gt; <strong>Settings</strong> tab.</li>
                <li>Add <code className="bg-stone-200 px-1 font-mono text-[10px] rounded">{window.location.hostname}</code> to <strong>Authorized Domains</strong>.</li>
              </ol>
              <p className="pt-1 text-[11px] italic text-[#63625f]">
                Meanwhile, you can use our instant <strong>Guest Pass Access</strong> below right now! It works flawlessly on Netlify instantly.
              </p>
            </div>
          )}

          {/* Divider with labels */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-300"></span>
            </div>
            <span className="relative px-3 bg-[#F4F1EA] text-[10px] font-bold text-stone-500 uppercase tracking-widest font-sans">
              OR CHOOSE INSTANT GUEST PASS
            </span>
          </div>

          {/* OPTION 2: Instant guest login */}
          <form onSubmit={handleGuestSignIn} className="space-y-4">
            <div className="bg-white border-2 border-stone-805 p-4 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-amber-550" />
                Netlify-Optimized Guest Account
              </div>
              <p className="text-xs text-stone-605 leading-relaxed">
                Logs you in using standard Firebase anonymous authentication. Bypass browser blocks and domain whitelist restrictions immediately.
              </p>
              <div>
                <label className="block text-[9px] uppercase font-bold tracking-wider text-stone-705 mb-1">
                  Enter Your Display Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Afroj"
                    maxLength={35}
                    className="w-full pl-9 pr-4 py-2 border-2 border-stone-300 focus:border-stone-900 bg-[#FAF8F5] text-stone-900 text-xs font-sans outline-none placeholder:text-stone-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSigningInGoogle || isSigningInGuest}
              className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center gap-2 font-sans text-xs uppercase font-extrabold tracking-widest cursor-pointer transition disabled:opacity-55"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {isSigningInGuest ? "Connecting..." : "Initiate Guest Connection"}
            </button>
          </form>
        </div>

        {/* Bottom Notice */}
        <div className="mt-6 pt-4 border-t border-stone-900/10 text-center">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest font-sans leading-relaxed">
            By signing in, you agree to store state and query active collections inside AI Studio Firestore.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
