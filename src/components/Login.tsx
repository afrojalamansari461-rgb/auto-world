import React, { useState } from "react";
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
  Car
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { 
  auth, 
  signInWithPopup, 
  googleProvider 
} from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

interface LoginProps {
  onNavigate?: (page: string) => void;
  onSuccess?: () => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

export default function Login({ onNavigate, onSuccess, showToast }: LoginProps) {
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  
  // UI Interaction States
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log("Logged in user:", userCredential.user);

      const successMsg = `Welcome back, ${userCredential.user.displayName || userCredential.user.email || 'Connoisseur'}!`;
      setSuccessMessage("Authentication successful. Redirecting to showroom...");
      
      if (showToast) {
        showToast(successMsg, "success");
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onNavigate) onNavigate("home");
        else navigate("/");
      }, 1000);

    } catch (error: any) {
      console.error("Firebase Auth Sign In error:", error);
      
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
      const successMsg = `Welcome, ${result.user.displayName || "Collector"}!`;
      setSuccessMessage("Google authentication successful!");
      
      if (showToast) showToast(successMsg, "success");

      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onNavigate) onNavigate("home");
        else navigate("/");
      }, 1000);
    } catch (error: any) {
      console.error("Google auth failed:", error);
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

  // Advanced Animation Variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.15
      }
    }
  };

  const fadeUp = {
    hidden: { y: 20, opacity: 0 },
    show: { 
      y: 0, 
      opacity: 1, 
      transition: { type: "spring", stiffness: 300, damping: 24 } 
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f4f2ec] text-[#1a1a1a] font-sans selection:bg-[#c5a059]/20 selection:text-[#1a1a1a] overflow-hidden">
      
      {/* LEFT: The Editorial Image */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 1 }}
        className="hidden md:flex w-1/2 relative flex-col justify-between overflow-hidden bg-black"
      >
        {/* IMPORTANT: Place your image file in the 'public' folder of your Next.js / Vite project */}
        {/* Then update this src to exactly match the filename, e.g., src="/showroom-car.jpg" */}
        <img 
          src="/showroom-car.jpg" 
          alt="Auto World Showroom" 
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>

        {/* Top Logo */}
        <div className="relative z-10 p-10">
          <Link 
            to="/" 
            onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate("home"); } }}
            className="flex items-center gap-3 group cursor-pointer inline-flex"
          >
            <div>
              <h2 className="text-white font-bold tracking-[0.3em] uppercase text-lg leading-none">Auto World</h2>
              <p className="text-[#c5a059] text-[8px] tracking-[0.4em] uppercase font-bold mt-1">Est. 1962 • Fine Motors</p>
            </div>
          </Link>
        </div>

        {/* Bottom Quote */}
        <div className="relative z-10 p-10 max-w-md">
          <div className="w-12 h-[1px] bg-[#c5a059] mb-6"></div>
          <p className="text-3xl text-gray-200 font-serif italic leading-snug">
            "The pursuit of timeless mechanics, unyielding craftsmanship, and pure..."
          </p>
        </div>
      </motion.div>

      {/* RIGHT: Animated Form & Footer */}
      <div className="w-full md:w-1/2 h-screen flex flex-col p-8 lg:p-16 overflow-y-auto">
        
        {/* Center Form Area */}
        <div className="flex-grow flex items-center justify-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="w-full max-w-sm">
            
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
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#1a1a1a] text-[#f4f2ec] text-[11px] tracking-[0.2em] uppercase font-bold py-4 rounded hover:bg-black transition-colors flex justify-center items-center gap-2 shadow-lg cursor-pointer"
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
                </button>
              </motion.div>
            </form>

            <motion.div variants={fadeUp} className="mt-8">
              <div className="relative flex py-5 items-center">
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
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
                <span>{isGoogleSigningIn ? "Connecting Google..." : "Google Account"}</span>
              </button>

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
            <Link to="#" onClick={(e) => { e.preventDefault(); if (showToast) showToast("Terms of Service viewed", "info"); }} className="hover:text-black transition-colors">Terms</Link>
            <Link to="#" onClick={(e) => { e.preventDefault(); if (showToast) showToast("Privacy Policy viewed", "info"); }} className="hover:text-black transition-colors">Privacy</Link>
            <a href="mailto:concierge@autoworld.com" className="hover:text-black transition-colors">Support</a>
          </div>
        </motion.footer>

      </div>
    </div>
);
}
