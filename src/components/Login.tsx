import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Crown, 
  Shield, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Car,
  FolderPlus,
  Upload
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { 
  auth, 
  signInWithPopup, 
  googleProvider 
} from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { subscribeToRealtimeCatalog, saveAdminSettingsToFirestore } from "../lib/catalogSync";
import { OWNER_EMAIL } from "../lib/userRoles";
import AuthPolicyModal from "./AuthPolicyModal";

interface LoginProps {
  onNavigate?: (page: string) => void;
  onSuccess?: () => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

export default function Login({ onNavigate, onSuccess, showToast }: LoginProps) {
  const navigate = useNavigate();
  const isOwner = auth.currentUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

  // Dynamic Site Customization State
  const [loginQuote, setLoginQuote] = useState(() => {
    return localStorage.getItem("autoWorld_login_quote") || "The pursuit of timeless mechanics, unyielding craftsmanship, and pure motorcar majesty.";
  });
  const [loginCarImage, setLoginCarImage] = useState(() => {
    return localStorage.getItem("autoWorld_login_car_image") || "/monochrome-car.jpg";
  });

  // Modal Policy State
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyTab, setPolicyTab] = useState<"terms" | "privacy" | "support">("terms");

  useEffect(() => {
    const unsub = subscribeToRealtimeCatalog(({ adminSettings }) => {
      if (adminSettings.loginQuote) {
        setLoginQuote(adminSettings.loginQuote);
      }
      if (adminSettings.loginCarImage) {
        setLoginCarImage(adminSettings.loginCarImage);
      }
    });

    const handleLocalUpdate = () => {
      const storedQuote = localStorage.getItem("autoWorld_login_quote");
      if (storedQuote) setLoginQuote(storedQuote);
      const storedImage = localStorage.getItem("autoWorld_login_car_image");
      if (storedImage) setLoginCarImage(storedImage);
    };
    window.addEventListener("autoWorld_db_update", handleLocalUpdate);

    return () => {
      unsub();
      window.removeEventListener("autoWorld_db_update", handleLocalUpdate);
    };
  }, []);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  
  // UI Interaction States
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDirectImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      if (showToast) showToast("Please select a valid image file (PNG, JPG, WEBP, etc.)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const dataUrl = reader.result;
        setLoginCarImage(dataUrl);
        try {
          localStorage.setItem("autoWorld_login_car_image", dataUrl);
        } catch (err) {}
        saveAdminSettingsToFirestore({ loginCarImage: dataUrl });
        window.dispatchEvent(new Event("autoWorld_db_update"));
        if (showToast) showToast(`Login background updated from file "${file.name}"!`, "success");
      }
    };
    reader.readAsDataURL(file);
  };
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Failsafe & Submission Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent full page reload
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setIsSubmitting(true);
    setIsTransitioning(true); // Initiate cinematic background video fade-out transition immediately on Sign In click

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log("Logged in user:", userCredential.user);

      setIsLoginSuccess(true);

      const successMsg = `Welcome back, ${userCredential.user.displayName || userCredential.user.email || 'Connoisseur'}!`;
      setSuccessMessage("Authentication successful. Redirecting to showroom...");
      
      if (showToast) {
        showToast(successMsg, "success");
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onNavigate) onNavigate("home");
        else navigate("/");
      }, 1200);

    } catch (error: any) {
      console.error("Firebase Auth Sign In error:", error);
      setIsTransitioning(false); // Restore background on auth failure
      setIsLoginSuccess(false);
      
      let friendlyError = "Authentication failed. Please verify your credentials.";
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        friendlyError = "Invalid email or password. Please check your details and try again.";
      } else if (error.code === "auth/too-many-requests") {
        friendlyError = "Too many failed attempts. Please wait a moment before trying again.";
      } else if (error.message) {
        friendlyError = error.message;
      }

      setErrorMessage(friendlyError);
      if (showToast) showToast(friendlyError, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google OAuth Handler
  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setIsLoginSuccess(true);
      setIsTransitioning(true);

      const successMsg = `Welcome, ${result.user.displayName || "Collector"}!`;
      setSuccessMessage("Google authentication successful!");
      
      if (showToast) showToast(successMsg, "success");

      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onNavigate) onNavigate("home");
        else navigate("/");
      }, 1200);
    } catch (error: any) {
      console.error("Google auth failed:", error);
      setIsTransitioning(false);
      setIsLoginSuccess(false);
      const msg = "Google sign-in was canceled or encountered an issue.";
      setErrorMessage(msg);
      if (showToast) showToast(msg, "error");
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleToggleToSignUp = (e: React.MouseEvent) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate("signup");
    }
  };

  // Advanced Animation Variants for Subtle Entrance
  const staggerContainer = {
    hidden: { opacity: 0, y: 22, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const fadeUp = {
    hidden: { y: 16, opacity: 0 },
    show: { 
      y: 0, 
      opacity: 1, 
      transition: { type: "spring", stiffness: 280, damping: 22 } 
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f4f2ec] text-[#1a1a1a] font-sans selection:bg-[#c5a059]/20 selection:text-[#1a1a1a] overflow-hidden">
      
      {/* LEFT: The Editorial Media with Cinematic Transition */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }} 
        animate={{ 
          opacity: 1,
          x: 0
        }} 
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex w-1/2 relative flex-col justify-between overflow-hidden bg-black"
      >
        {/* Background Media with AnimatePresence orchestrated exit transition on successful login */}
        <AnimatePresence mode="wait">
          {!isLoginSuccess ? (
            <motion.div
              key="active-bg-video"
              initial={{ opacity: 0 }}
              animate={{
                opacity: isTransitioning ? 0 : 1,
                scale: isTransitioning ? 1.08 : 1,
                filter: isTransitioning ? "blur(16px)" : "blur(0px)",
              }}
              exit={{
                opacity: 0,
                scale: 1.15,
                filter: "blur(24px)",
                transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] }
              }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black"
            >
              <img 
                src={loginCarImage || "/monochrome-car.jpg"} 
                alt="Ultra HD sports car side profile" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center scale-100"
              />
            </motion.div>
          ) : (
            <motion.div
              key="success-bg-unlocked"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 w-full h-full z-0 bg-[#0d0d0d] flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "backOut" }}
                className="w-16 h-16 rounded-full border border-[#c5a059] flex items-center justify-center bg-black/60 backdrop-blur-md mb-4 shadow-[0_0_30px_rgba(197,160,89,0.3)]"
              >
                <Sparkles className="w-8 h-8 text-[#c5a059] animate-pulse" />
              </motion.div>
              <p className="text-[#c5a059] text-[10px] tracking-[0.4em] uppercase font-bold mb-2">Showroom Unlocked</p>
              <h3 className="text-2xl font-serif text-white font-semibold tracking-wide">Welcome to Auto World</h3>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle overlay ensuring typography contrast while keeping the monochrome studio car reflection crisp */}
        <motion.div 
          animate={{ opacity: isTransitioning ? 0.95 : 0.35 }}
          transition={{ duration: 0.9 }}
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 z-10 pointer-events-none"
        />

        {/* Top Logo - z-20 floating above overlay with interactive hover */}
        <motion.div 
          animate={{ opacity: isTransitioning ? 0.3 : 1, y: isTransitioning ? -10 : 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-20 p-10 flex items-center justify-between gap-4"
        >
          <motion.button 
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            onClick={(e) => { e.preventDefault(); if (onNavigate) onNavigate("home"); else navigate("/"); }}
            className="flex items-center gap-3 group cursor-pointer focus:outline-none select-none text-left"
          >
            <motion.div 
              variants={{
                rest: { scale: 1, rotate: 0, backgroundColor: "#1c1917" },
                hover: { scale: 1.12, rotate: 6, backgroundColor: "#c5a059" },
                tap: { scale: 0.92 }
              }}
              transition={{ type: "spring", stiffness: 400, damping: 16 }}
              className="w-10 h-10 bg-stone-900 border border-stone-700 rounded-lg flex items-center justify-center text-white shadow-md group-hover:shadow-amber-500/20"
            >
              <Car className="w-5 h-5 text-[#F4F1EA] group-hover:text-stone-950 transition-colors" />
            </motion.div>

            <div className="relative flex flex-col justify-center">
              <span className="text-2xl font-black font-serif uppercase tracking-tight text-white flex items-center">
                <motion.span
                  className="inline-block"
                  variants={{
                    rest: { y: 0, color: "#ffffff" },
                    hover: { y: -2, color: "#ffffff", transition: { type: "spring", stiffness: 400, damping: 14 } }
                  }}
                >
                  Auto
                </motion.span>
                <motion.span
                  className="inline-block font-serif font-normal italic ml-0.5 text-stone-300"
                  variants={{
                    rest: { x: 0, rotate: 0, color: "#d6d3d1" },
                    hover: { x: 4, rotate: -3, color: "#c5a059", transition: { type: "spring", stiffness: 350, damping: 12 } }
                  }}
                >
                  World
                </motion.span>
              </span>
              <p className="text-[#c5a059] text-[8px] tracking-[0.3em] uppercase font-bold">Est. 1962 • Fine Motors</p>

              <motion.span 
                className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 rounded-full origin-left"
                variants={{
                  rest: { scaleX: 0, opacity: 0 },
                  hover: { scaleX: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }
                }}
              />
            </div>
          </motion.button>

          {/* Quick Upload Background Image From My Files (Owner Only) */}
          {isOwner && (
            <label className="px-3 py-1.5 bg-stone-950/80 hover:bg-black text-amber-400 border border-amber-500/60 hover:border-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-all hover:scale-105 active:scale-95 shrink-0">
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Upload Image from File</span>
              <span className="sm:hidden">Change Image</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleDirectImageUpload}
              />
            </label>
          )}
        </motion.div>

        {/* Bottom Quote - z-20 floating above overlay */}
        <motion.div 
          animate={{ opacity: isTransitioning ? 0.2 : 1, y: isTransitioning ? 15 : 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-20 p-10 max-w-md"
        >
          <div className="w-12 h-[1px] bg-[#c5a059] mb-6"></div>
          <p className="text-3xl text-gray-200 font-serif italic leading-snug">
            "{loginQuote}"
          </p>
        </motion.div>
      </motion.div>

      {/* RIGHT: Animated Form & Footer */}
      <div className="w-full md:w-1/2 h-screen flex flex-col p-6 sm:p-8 lg:p-16 overflow-y-auto">
        
        {/* Center Form Area */}
        <div className="flex-grow flex items-center justify-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="w-full max-w-sm">
            
            {/* Mobile Website Logo Header - Responsive replacing car image with identical website hover animation */}
            <motion.div variants={fadeUp} className="md:hidden mb-6">
              <motion.button
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={() => {
                  if (onNavigate) onNavigate("home");
                  else navigate("/");
                }}
                className="w-full flex items-center gap-3.5 group cursor-pointer py-3 px-4 bg-[#FAF8F5] border-2 border-stone-300 rounded-xl shadow-sm hover:border-stone-900 transition-all select-none text-left"
              >
                <motion.div 
                  variants={{
                    rest: { scale: 1, rotate: 0, backgroundColor: "#1c1917" },
                    hover: { scale: 1.12, rotate: 6, backgroundColor: "#0c0a09" },
                    tap: { scale: 0.92 }
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 16 }}
                  className="w-11 h-11 bg-stone-900 rounded-lg flex items-center justify-center text-white transition-shadow shadow-md group-hover:shadow-lg group-hover:shadow-stone-900/20 shrink-0"
                >
                  <Car className="w-6 h-6 text-[#F4F1EA] transition-transform duration-300 group-hover:scale-110" />
                </motion.div>

                <div className="relative flex flex-col justify-center">
                  <span className="text-2xl font-black font-serif uppercase tracking-tight text-stone-900 flex items-center">
                    <motion.span
                      className="inline-block"
                      variants={{
                        rest: { y: 0, color: "#1c1917" },
                        hover: { y: -2, color: "#000000", transition: { type: "spring", stiffness: 400, damping: 14 } }
                      }}
                    >
                      Auto
                    </motion.span>
                    <motion.span
                      className="inline-block font-serif font-normal italic ml-0.5 text-stone-600"
                      variants={{
                        rest: { x: 0, rotate: 0, color: "#525252" },
                        hover: { x: 4, rotate: -3, color: "#d97706", transition: { type: "spring", stiffness: 350, damping: 12 } }
                      }}
                    >
                      World
                    </motion.span>
                  </span>

                  <p className="text-[#c5a059] text-[8px] tracking-[0.25em] uppercase font-bold mt-0.5">Est. 1962 • Fine Motors</p>

                  {/* Kinetic Underline Indicator */}
                  <motion.span 
                    className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-gradient-to-r from-stone-900 via-amber-500 to-stone-900 rounded-full origin-left"
                    variants={{
                      rest: { scaleX: 0, opacity: 0 },
                      hover: { scaleX: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }
                    }}
                  />
                </div>
              </motion.button>
            </motion.div>

            <motion.div variants={fadeUp} className="mb-8">
              <p className="text-[#c5a059] text-[10px] tracking-[0.2em] font-bold uppercase mb-2">✦ Collector Sign In</p>
              <h1 className="text-5xl font-serif font-bold text-[#1a1a1a] mb-3">Welcome Back.</h1>
              <p className="text-sm text-gray-500 pr-4">Enter your credentials to manage your garage, monitor active bids, and view curated acquisitions.</p>
            </motion.div>

            {/* Error State Banner */}
            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-3.5 bg-rose-50 border-l-2 border-rose-600 text-rose-900 text-xs flex items-start gap-2.5 rounded-r shadow-sm"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-snug font-medium">{errorMessage}</p>
                </motion.div>
              )}

              {successMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-3.5 bg-emerald-50 border-l-2 border-emerald-600 text-emerald-900 text-xs flex items-start gap-2.5 rounded-r shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-snug font-medium">{successMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div variants={fadeUp} className="relative group pt-4">
                <input 
                  type="email" 
                  id="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                  className="peer w-full py-2 bg-transparent text-[#1a1a1a] border-b border-gray-300 focus:border-black focus:outline-none transition-colors placeholder-transparent" 
                  placeholder="Email" 
                />
                <label 
                  htmlFor="email" 
                  className="absolute left-0 -top-1 text-[10px] tracking-widest uppercase font-bold text-[#c5a059] peer-placeholder-shown:top-2 peer-placeholder-shown:text-xs peer-placeholder-shown:text-gray-400 peer-focus:-top-1 peer-focus:text-[10px] peer-focus:text-[#c5a059] transition-all"
                >
                  Email Address
                </label>
              </motion.div>

              <motion.div variants={fadeUp} className="relative group pt-4">
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  className="peer w-full py-2 bg-transparent text-[#1a1a1a] border-b border-gray-300 focus:border-black focus:outline-none transition-colors placeholder-transparent pr-8" 
                  placeholder="Password" 
                />
                <label 
                  htmlFor="password" 
                  className="absolute left-0 -top-1 text-[10px] tracking-widest uppercase font-bold text-[#c5a059] peer-placeholder-shown:top-2 peer-placeholder-shown:text-xs peer-placeholder-shown:text-gray-400 peer-focus:-top-1 peer-focus:text-[10px] peer-focus:text-[#c5a059] transition-all"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-3 p-1 text-gray-400 hover:text-black transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </motion.div>

              <motion.div variants={fadeUp} className="flex justify-between items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-black" 
                  />
                  <span className="text-xs text-gray-500">Remember this device</span>
                </label>
                <button 
                  type="button"
                  onClick={() => {
                    if (showToast) showToast("Password reset instructions sent if email exists.", "info");
                  }}
                  className="text-[10px] tracking-widest uppercase font-bold text-gray-400 hover:text-black transition-colors border-b border-transparent hover:border-black"
                >
                  Forgot Key?
                </button>
              </motion.div>

              <motion.div variants={fadeUp} className="pt-4">
                <motion.button 
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#1a1a1a] text-[#f4f2ec] text-[11px] tracking-[0.2em] uppercase font-bold py-4 rounded hover:bg-black transition-all flex justify-center items-center gap-2 shadow-lg cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-[#f4f2ec] border-t-transparent rounded-full animate-spin" />
                      Signing In...
                    </span>
                  ) : (
                    <>
                      <span>Sign In To Showroom</span> <span className="text-[#c5a059]">→</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>

            <motion.div variants={fadeUp} className="mt-8">
              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink-0 mx-4 text-[9px] tracking-[0.3em] uppercase text-gray-400 font-bold">Or Continue With</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.015, backgroundColor: "#fafafa" }}
                whileTap={{ scale: 0.985 }}
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSigningIn}
                className="w-full bg-white border border-gray-300 text-[#1a1a1a] text-xs font-bold py-3.5 rounded hover:bg-gray-50 transition-colors flex justify-center items-center gap-3 shadow-sm cursor-pointer"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
                <span>{isGoogleSigningIn ? "Connecting Google..." : "Google Account"}</span>
              </motion.button>

              <div className="mt-6 text-center text-[10px] tracking-widest uppercase font-bold text-gray-500">
                <p>Do not have an account? <Link to="/signup" onClick={handleToggleToSignUp} className="text-black hover:text-[#c5a059] border-b border-black hover:border-[#c5a059] transition-colors pb-0.5">Create One Here</Link></p>
              </div>
            </motion.div>

          </motion.div>
        </div>

        {/* Bottom Functional Footer */}
        <motion.footer 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-auto pt-6 border-t border-gray-200 flex justify-between items-center w-full max-w-sm mx-auto text-[9px] tracking-[0.2em] uppercase text-gray-400 font-bold"
        >
          <span>© 2026 Auto World</span>
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={() => { setPolicyTab("terms"); setPolicyModalOpen(true); }} 
              className="hover:text-black transition-colors cursor-pointer"
            >
              Terms
            </button>
            <button 
              type="button" 
              onClick={() => { setPolicyTab("privacy"); setPolicyModalOpen(true); }} 
              className="hover:text-black transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button 
              type="button" 
              onClick={() => { setPolicyTab("support"); setPolicyModalOpen(true); }} 
              className="hover:text-black transition-colors cursor-pointer"
            >
              Support
            </button>
          </div>
        </motion.footer>

      </div>

      {/* Policy & Support Modal */}
      <AuthPolicyModal
        isOpen={policyModalOpen}
        activeTab={policyTab}
        onClose={() => setPolicyModalOpen(false)}
        onSelectTab={(tab) => setPolicyTab(tab)}
        showToast={showToast}
      />
    </div>
  );
}
