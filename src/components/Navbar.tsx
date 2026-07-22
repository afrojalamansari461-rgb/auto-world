import React, { useState, useEffect } from "react";
import { Car, Menu, X, Crown, Phone, Home, Search, Tag, Mail, LogIn, LogOut, User as UserIcon, ShieldAlert, Heart } from "lucide-react";
import { User } from "firebase/auth";
import { auth, signOut } from "../firebase";
import { motion, AnimatePresence } from "motion/react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  subscriptionActive: boolean;
  currentUser: User | null;
  onSignInClick: () => void;
}

export default function Navbar({ activeTab, setActiveTab, subscriptionActive, currentUser, onSignInClick }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoadingTabs, setIsLoadingTabs] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingTabs(false);
    }, 850);
    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Auth sign-out failed: ", err);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isUserAdmin = currentUser?.email === "afrojalamansari461@gmail.com";

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "buy", label: "Buy", icon: Search },
    { id: "sell", label: "Sell", icon: Tag },
    { id: "premium", label: "Premium", icon: Crown },
    { id: "favorites", label: "Favorites", icon: Heart },
    { id: "contact", label: "Contact", icon: Mail },
  ];

  if (isUserAdmin) {
    navItems.push({ id: "admin", label: "Admin Panel", icon: ShieldAlert });
  }

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTabClick(tabId);
    }
  };

  return (
    <nav
      id="main-navbar"
      aria-label="Primary website navigation"
      className={`sticky top-0 z-[100] transition-all duration-300 ${
        isScrolled
          ? "bg-[#FAF8F5]/95 backdrop-blur-md shadow-md py-2.5 border-b border-stone-900/15"
          : "bg-[#F4F1EA]/90 backdrop-blur-sm border-b border-stone-900/10 py-3.5"
      }`}
    >
      <div className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex justify-between items-center gap-2 lg:gap-6">
          {/* Logo with Advanced Animated "AutoWorld" */}
          <motion.button
            id="nav-logo"
            aria-label="AutoWorld homepage"
            onClick={() => handleTabClick("home")}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="flex items-center gap-3 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 py-1 select-none shrink-0"
          >
            <motion.div 
              variants={{
                rest: { scale: 1, rotate: 0, backgroundColor: "#1c1917" },
                hover: { scale: 1.12, rotate: 6, backgroundColor: "#0c0a09" },
                tap: { scale: 0.92 }
              }}
              transition={{ type: "spring", stiffness: 400, damping: 16 }}
              className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center text-white transition-shadow shadow-md group-hover:shadow-lg group-hover:shadow-stone-900/20"
            >
              <Car className="w-5 h-5 text-[#F4F1EA] transition-transform duration-300 group-hover:scale-110" />
            </motion.div>

            <div className="relative flex flex-col justify-center">
              <span className="text-xl lg:text-2xl font-black font-serif uppercase tracking-tight text-stone-900 flex items-center">
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

              {/* Advanced Kinetic Underline Indicator */}
              <motion.span 
                className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-gradient-to-r from-stone-900 via-amber-500 to-stone-900 rounded-full origin-left"
                variants={{
                  rest: { scaleX: 0, opacity: 0 },
                  hover: { scaleX: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }
                }}
              />
            </div>
          </motion.button>

          {/* Desktop Navigation Links - Shown on laptop/desktop (lg+) */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2 mx-auto" role="tablist" aria-label="Main navigation tabs">
            {isLoadingTabs ? (
              navItems.map((item, idx) => (
                <div 
                  key={`shimmer-${item.id}`} 
                  className="w-20 lg:w-24 h-8 bg-stone-200/60 rounded-full relative overflow-hidden flex items-center justify-center"
                >
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear", delay: idx * 0.1 }}
                  />
                  <div className="w-12 h-2.5 bg-stone-300/50 rounded-full" />
                </div>
              ))
            ) : (
              navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    id={`nav-link-${item.id}`}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${item.id}`}
                    tabIndex={0}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleTabClick(item.id)}
                    onKeyDown={(e) => handleKeyDown(e, item.id)}
                    className={`relative flex items-center gap-1.5 lg:gap-2 px-3 lg:px-3.5 py-1.5 text-xs lg:text-[13px] font-sans uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-full whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                      isActive
                        ? "text-stone-950 font-black"
                        : "text-stone-600 hover:text-stone-950 hover:bg-stone-900/5 font-semibold"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 transition-colors ${isActive ? "text-stone-900" : "text-stone-500"}`} />
                    <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-stone-900/10 rounded-full border border-stone-900/15 z-0"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })
            )}
          </div>

          {/* Right Actions Section - Shown on laptop/desktop (lg+) */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
            {currentUser ? (
              <motion.div 
                id="user-profile-menu" 
                layout
                className="flex items-center gap-2 p-1 pl-2.5 bg-stone-100 hover:bg-stone-200/70 rounded-full border border-stone-200/90 transition shadow-2xs shrink-0"
              >
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || "User Avatar"} className="w-5.5 h-5.5 rounded-full border border-stone-300 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5.5 h-5.5 rounded-full bg-stone-900 text-[#F4F1EA] flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-900 truncate max-w-[80px] xl:max-w-[110px]">
                  {currentUser.displayName || "User"}
                </span>
                <button 
                  onClick={handleSignOut} 
                  title="Sign Out"
                  aria-label="Sign out of AutoWorld account" 
                  className="flex items-center gap-1 px-2.5 py-1 bg-red-100/90 hover:bg-red-600 hover:text-white text-red-700 font-bold text-[10px] uppercase tracking-wider rounded-full transition cursor-pointer shrink-0"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onSignInClick}
                aria-label="Sign in to your account"
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-stone-800 hover:text-stone-950 hover:bg-stone-900/5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                <LogIn className="w-3.5 h-3.5 text-stone-600" />
                Sign In
              </motion.button>
            )}

            {subscriptionActive ? (
              <motion.div 
                layout
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-full border border-amber-500/40 shadow-sm whitespace-nowrap shrink-0"
              >
                <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                Premium
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleTabClick("premium")}
                aria-label="Upgrade to AutoWorld Premium Plan"
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border border-amber-600/35 bg-amber-500/10 text-amber-950 hover:bg-amber-500/20 transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              >
                <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
                Go Premium
              </motion.button>
            )}
          </div>

          {/* Mobile & Tablet Hamburger Toggle Button (lg:hidden) */}
          <motion.button
            id="mobile-menu-toggle"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-full hover:bg-stone-200/60 text-stone-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 shrink-0"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile & Tablet Menu Drawer (lg:hidden) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="lg:hidden border-t border-stone-900/10 bg-[#FAF8F5] shadow-xl absolute top-full left-0 right-0 overflow-hidden py-4 px-4 flex flex-col gap-2"
            role="tablist"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`mobile-nav-link-${item.id}`}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-sans uppercase tracking-widest transition ${
                    isActive
                      ? "bg-stone-900 text-white font-extrabold shadow-sm"
                      : "text-stone-700 hover:bg-stone-100 font-bold"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}

            <hr className="border-stone-900/10 my-1" />
            <div className="flex flex-col gap-2">
              {currentUser ? (
                <div className="flex items-center justify-between p-3 bg-stone-100 rounded-xl border border-stone-200">
                  <div className="flex items-center gap-2">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt={currentUser.displayName || "Avatar"} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold">
                        {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <span className="text-xs font-bold uppercase text-stone-900 truncate max-w-[140px]">{currentUser.displayName || "User"}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    aria-label="Sign out of AutoWorld account"
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] uppercase font-bold tracking-wider rounded-lg transition cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignInClick}
                  aria-label="Sign in with Google account"
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-stone-900 text-white text-xs font-sans uppercase tracking-widest transition-all font-bold rounded-xl cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In with Google
                </button>
              )}

              {subscriptionActive ? (
                <div className="flex items-center justify-center gap-2 py-3 px-5 bg-stone-950 text-amber-400 text-xs tracking-widest uppercase font-bold rounded-xl border border-amber-500/30">
                  <Crown className="w-4 h-4 fill-amber-400 text-amber-400" />
                  Premium Active Pass
                </div>
              ) : (
                <button
                  onClick={() => handleTabClick("premium")}
                  aria-label="Upgrade to AutoWorld Premium Plan"
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-600/30 text-amber-950 text-xs font-sans uppercase tracking-widest transition-all font-bold rounded-xl cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-amber-600" />
                  Go Premium Plan
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
