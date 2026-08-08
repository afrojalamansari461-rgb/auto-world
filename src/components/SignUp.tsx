import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
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
  Check,
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
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { subscribeToRealtimeCatalog, saveAdminSettingsToFirestore } from "../lib/catalogSync";
import AuthPolicyModal from "./AuthPolicyModal";

interface SignUpProps {
  onNavigate?: (page: string) => void;
  onSuccess?: () => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

export default function SignUp({ onNavigate, onSuccess, showToast }: SignUpProps) {
  const navigate = useNavigate();

  // Dynamic Site Customization State for Register Mode
  const [registerQuote, setRegisterQuote] = useState(() => {
    return localStorage.getItem("autoWorld_register_quote") || "Join an elite global registry of automobile connoisseurs, verified collectors, and fine motor enthusiasts.";
  });
  const [registerCarImage, setRegisterCarImage] = useState(() => {
    return localStorage.getItem("autoWorld_register_car_image") || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80";
  });

  // Modal Policy State
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyTab, setPolicyTab] = useState<"terms" | "privacy" | "support">("terms");

  useEffect(() => {
    const unsub = subscribeToRealtimeCatalog(({ adminSettings }) => {
      if (adminSettings.registerQuote) setRegisterQuote(adminSettings.registerQuote);
      if (adminSettings.registerCarImage) setRegisterCarImage(adminSettings.registerCarImage);
    });

    const handleLocalUpdate = () => {
      const storedQuote = localStorage.getItem("autoWorld_register_quote");
      if (storedQuote) setRegisterQuote(storedQuote);
      const storedImage = localStorage.getItem("autoWorld_register_car_image");
      if (storedImage) setRegisterCarImage(storedImage);
    };
    window.addEventListener("autoWorld_db_update", handleLocalUpdate);

    return () => {
      unsub();
      window.removeEventListener("autoWorld_db_update", handleLocalUpdate);
    };
  }, []);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  // UI Interaction States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setRegisterCarImage(dataUrl);
        try {
          localStorage.setItem("autoWorld_register_car_image", dataUrl);
        } catch (err) {}
        saveAdminSettingsToFirestore({ registerCarImage: dataUrl });
        window.dispatchEvent(new Event("autoWorld_db_update"));
        if (showToast) showToast(`Register background updated from file "${file.name}"!`, "success");
      }
    };
    reader.readAsDataURL(file);
  };

  // Form Failsafe & Submission Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent full page reload
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Please enter your display/registry name.");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-type to confirm.");
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("Please agree to the Collector Registry Terms to register.");
      return;
    }

    setIsSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Update User Display Name Profile
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: fullName.trim()
        });
      }

      const welcomeMsg = `Registry Entry Confirmed! Welcome to Auto World, ${fullName.trim()}.`;
      setSuccessMessage("Registration complete! Redirecting to showroom...");

      if (showToast) {
        showToast(welcomeMsg, "success");
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onNavigate) onNavigate("home");
        else navigate("/");
      }, 1000);

    } catch (error: any) {
      console.error("Firebase Registration Error:", error);

      let friendlyError = "Registration failed. Please check your details and try again.";
      if (error.code === "auth/email-already-in-use") {
        friendlyError = "An account with this email address already exists. Please sign in instead.";
      } else if (error.code === "auth/invalid-email") {
        friendlyError = "The provided email address is invalid.";
      } else if (error.code === "auth/weak-password") {
        friendlyError = "The password is too weak. Please use a stronger combination.";
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
      const successMsg = `Welcome, ${result.user.displayName || "Collector"}!`;
      setSuccessMessage("Google authentication successful!");

      if (showToast) showToast(successMsg, "success");

      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onNavigate) onNavigate("home");
        else navigate("/");
      }, 1000);
    } catch (error: any) {
      console.error("Google registration failed:", error);
      const msg = "Google sign-up was canceled or encountered an issue.";
      setErrorMessage(msg);
      if (showToast) showToast(msg, "error");
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleToggleToLogin = (e: React.MouseEvent) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate("login");
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
      
      {/* LEFT: The Editorial Image */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex w-1/2 relative flex-col justify-between overflow-hidden bg-black"
      >
        <img 
          src={registerCarImage} 
          alt="Auto World Showroom Registry" 
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
          onError={(e) => { (e.target as any).src = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80"; }}
        />
        {/* Dark overlay ensuring image contrast */}
        <div className="absolute inset-0 bg-black/60 z-10 pointer-events-none"></div>

        {/* Top Logo - z-20 floating above overlay with interactive hover */}
        <div className="relative z-20 p-10 flex items-center justify-between gap-4">
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

          {/* Quick Upload Background Image From My Files */}
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
        </div>

        {/* Bottom Quote - z-20 floating above overlay */}
        <div className="relative z-20 p-10 max-w-md">
          <div className="w-12 h-[1px] bg-[#c5a059] mb-6"></div>
          <p className="text-2xl lg:text-3xl text-gray-200 font-serif italic leading-snug">
            "{registerQuote}"
          </p>
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#c5a059] mt-4">
            — Collector Registry Charter
          </p>
        </div>
      </motion.div>

      {/* RIGHT: Animated Form & Footer */}
      <div className="w-full md:w-1/2 h-screen flex flex-col p-6 sm:p-8 lg:p-16 overflow-y-auto">
        
        {/* Center Form Area */}
        <div className="flex-grow flex items-center justify-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="w-full max-w-sm my-auto py-4">
            
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

            <motion.div variants={fadeUp} className="mb-6">
              <p className="text-[#c5a059] text-[10px] tracking-[0.2em] font-bold uppercase mb-2">✦ Create Account</p>
              <h1 className="text-4xl sm:text-5xl font-serif font-bold text-[#1a1a1a] mb-2 leading-tight">Create Account.</h1>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">Create a free account to save favorite cars, post listings, and contact sellers.</p>
            </motion.div>

          {/* Notifications */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3.5 bg-rose-50 border-l-2 border-rose-600 text-rose-900 text-xs flex items-start gap-2.5 rounded-r shadow-sm"
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
                className="mb-4 p-3.5 bg-emerald-50 border-l-2 border-emerald-600 text-emerald-900 text-xs flex items-start gap-2.5 rounded-r shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-snug font-medium">{successMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Name Field */}
            <motion.div variants={fadeUp} className="relative group pt-3">
              <input 
                type="text" 
                id="fullName" 
                required 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onFocus={() => setFocusedInput("fullName")}
                onBlur={() => setFocusedInput(null)}
                className="peer w-full py-2 bg-transparent text-[#1a1a1a] text-xs font-medium border-b border-gray-300 focus:border-black focus:outline-none transition-colors placeholder-transparent" 
                placeholder="Name" 
              />
              <label 
                htmlFor="fullName" 
                className={`absolute left-0 pointer-events-none transition-all duration-300 ${
                  focusedInput === "fullName" || fullName.length > 0
                    ? "-top-1 text-[10px] tracking-widest uppercase font-bold text-[#c5a059]"
                    : "top-4 text-xs text-gray-400 font-sans"
                }`}
              >
                Full Name
              </label>
              <User className={`absolute right-0 top-4 w-4 h-4 transition-colors duration-300 pointer-events-none ${
                focusedInput === "fullName" ? "text-black" : "text-gray-400"
              }`} />
            </motion.div>

            {/* Email Field */}
            <motion.div variants={fadeUp} className="relative group pt-3">
              <input 
                type="email" 
                id="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedInput("email")}
                onBlur={() => setFocusedInput(null)}
                className="peer w-full py-2 bg-transparent text-[#1a1a1a] text-xs font-medium border-b border-gray-300 focus:border-black focus:outline-none transition-colors placeholder-transparent" 
                placeholder="Email" 
              />
              <label 
                htmlFor="email" 
                className={`absolute left-0 pointer-events-none transition-all duration-300 ${
                  focusedInput === "email" || email.length > 0
                    ? "-top-1 text-[10px] tracking-widest uppercase font-bold text-[#c5a059]"
                    : "top-4 text-xs text-gray-400 font-sans"
                }`}
              >
                Email Address
              </label>
              <Mail className={`absolute right-0 top-4 w-4 h-4 transition-colors duration-300 pointer-events-none ${
                focusedInput === "email" ? "text-black" : "text-gray-400"
              }`} />
            </motion.div>

            {/* Password Field */}
            <motion.div variants={fadeUp} className="relative group pt-3">
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedInput("password")}
                onBlur={() => setFocusedInput(null)}
                className="peer w-full py-2 bg-transparent text-[#1a1a1a] text-xs font-medium border-b border-gray-300 focus:border-black focus:outline-none transition-colors placeholder-transparent pr-8" 
                placeholder="Password" 
              />
              <label 
                htmlFor="password" 
                className={`absolute left-0 pointer-events-none transition-all duration-300 ${
                  focusedInput === "password" || password.length > 0
                    ? "-top-1 text-[10px] tracking-widest uppercase font-bold text-[#c5a059]"
                    : "top-4 text-xs text-gray-400 font-sans"
                }`}
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

            {/* Confirm Password Field */}
            <motion.div variants={fadeUp} className="relative group pt-3">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                id="confirmPassword" 
                required 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusedInput("confirmPassword")}
                onBlur={() => setFocusedInput(null)}
                className="peer w-full py-2 bg-transparent text-[#1a1a1a] text-xs font-medium border-b border-gray-300 focus:border-black focus:outline-none transition-colors placeholder-transparent pr-8" 
                placeholder="Confirm Password" 
              />
              <label 
                htmlFor="confirmPassword" 
                className={`absolute left-0 pointer-events-none transition-all duration-300 ${
                  focusedInput === "confirmPassword" || confirmPassword.length > 0
                    ? "-top-1 text-[10px] tracking-widest uppercase font-bold text-[#c5a059]"
                    : "top-4 text-xs text-gray-400 font-sans"
                }`}
              >
                Confirm Password
              </label>
              
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-0 top-3 p-1 text-gray-400 hover:text-black transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </motion.div>

            {/* Terms Agreement */}
            <motion.div variants={fadeUp} className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-3.5 h-3.5 accent-black cursor-pointer" 
                />
                <span className="text-xs text-gray-500 group-hover:text-black transition-colors">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPolicyTab("terms");
                      setPolicyModalOpen(true);
                    }}
                    className="underline text-stone-900 font-bold hover:text-[#c5a059] cursor-pointer"
                  >
                    Collector Registry Terms
                  </button>
                </span>
              </label>
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={fadeUp} className="pt-2">
              <motion.button 
                type="submit" 
                disabled={isSubmitting}
                whileHover={{ scale: 1.015, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-[#1a1a1a] text-[#f4f2ec] text-[11px] tracking-[0.2em] uppercase font-bold py-4 rounded hover:bg-black transition-colors flex justify-center items-center gap-2 shadow-lg cursor-pointer group"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-[#f4f2ec] border-t-transparent rounded-full animate-spin" />
                    Processing Registry...
                  </span>
                ) : (
                  <>
                    <span>Create Collector Account</span>
                    <ArrowRight className="w-4 h-4 text-[#c5a059] group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Google Divider & Button */}
          <motion.div variants={fadeUp} className="mt-6">
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-[9px] tracking-[0.3em] uppercase text-gray-400 font-bold">Or Continue With</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            
            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSigningIn}
              className="w-full bg-white border border-gray-300 text-[#1a1a1a] text-xs font-bold py-3.5 rounded hover:bg-gray-50 transition-colors flex justify-center items-center gap-3 shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleSigningIn ? "Connecting Google..." : "Google Account"}</span>
            </button>
          </motion.div>

          {/* Toggle to Login */}
          <motion.div variants={fadeUp} className="text-center mt-5">
            <p className="text-xs text-gray-500">
              Already a registered collector?{" "}
              <Link
                to="/login"
                onClick={handleToggleToLogin}
                className="font-bold text-[#1a1a1a] hover:text-[#c5a059] underline tracking-wide uppercase text-[11px] font-mono transition-colors cursor-pointer ml-1"
              >
                Sign In
              </Link>
            </p>
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
