import React, { useState, useEffect } from "react";
import { Car, Menu, X, Crown, Phone, Home, Search, Tag, Mail, LogIn, LogOut, User as UserIcon, ShieldAlert } from "lucide-react";
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
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "buy", label: "Buy", icon: Search },
    { id: "sell", label: "Sell", icon: Tag },
    { id: "premium", label: "Premium", icon: Crown },
    { id: "contact", label: "Contact", icon: Mail },
    ...(currentUser?.email === "afrojalamansari461@gmail.com"
      ? [{ id: "admin", label: "Admin Panel", icon: ShieldAlert }]
      : []),
  ];

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
          ? "bg-[#FAF8F5]/95 backdrop-blur-md shadow-sm py-3 border-b border-stone-900/15"
          : "bg-[#F4F1EA] border-b border-stone-900/10 py-4"
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <button
            id="nav-logo"
            aria-label="AutoWorld homepage"
            onClick={() => handleTabClick("home")}
            className="flex items-center gap-3 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 3 }}
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 bg-stone-900 flex items-center justify-center text-white transition-all shadow-sm"
            >
              <Car className="w-5 h-5 text-[#F4F1EA]" />
            </motion.div>
            <span className="text-xl font-bold tracking-tighter uppercase font-serif text-stone-900">
              Auto<span className="font-light italic text-stone-600">World</span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4" role="tablist" aria-label="Main navigation tabs">
            {isLoadingTabs ? (
              navItems.map((item, idx) => (
                <div 
                  key={`shimmer-${item.id}`} 
                  className="w-24 h-9 bg-stone-200/55 border border-stone-300/30 relative overflow-hidden flex items-center justify-center rounded-none"
                >
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear", delay: idx * 0.12 }}
                  />
                  <div className="w-14 h-3 bg-stone-300/40 rounded-none" />
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
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTabClick(item.id)}
                    onKeyDown={(e) => handleKeyDown(e, item.id)}
                    className={`relative flex items-center gap-2 px-3.5 py-2.5 text-xs lg:text-[13px] font-sans uppercase tracking-[0.1em] transition-all duration-200 cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-stone-900 focus-visible:outline-offset-2 ${
                      isActive
                        ? "text-stone-950 font-black"
                        : "text-stone-600 hover:text-purple-700 hover:bg-purple-50/40 font-bold"
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-stone-900" : "text-stone-500 hover:text-purple-600"}`} />
                    <span className="relative z-10">{item.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-stone-900"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                  </motion.button>
                );
              })
            )}
          </div>

          {/* Right Accents */}
          <div className="hidden md:flex items-center gap-3.5 lg:gap-5">
            {currentUser ? (
              <motion.div 
                id="user-profile-menu" 
                layout
                className="flex items-center gap-2.5 px-3.5 py-1.5 bg-[#FAF8F5] border border-stone-300 shadow-sm"
              >
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || "User Avatar"} className="w-6 h-6 rounded-full border border-stone-300" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-[#F4F1EA] flex items-center justify-center text-[10px] font-bold">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <div className="flex flex-col items-start leading-[1.1]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-900 truncate max-w-[90px]">{currentUser.displayName || "User"}</span>
                  <button onClick={handleSignOut} aria-label="Sign out of AutoWorld account" className="text-[9px] uppercase tracking-widest font-bold text-red-650 hover:underline cursor-pointer">Sign Out</button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onSignInClick}
                aria-label="Sign in to your account"
                className="flex items-center gap-1.5 px-4 py-2 hover:bg-stone-900 hover:text-white border border-stone-900 text-stone-900 text-xs lg:text-[13px] font-sans uppercase tracking-[0.1em] transition-all cursor-pointer font-bold bg-[#FAF8F5] shadow-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-stone-900"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </motion.button>
            )}

            {subscriptionActive ? (
              <motion.div 
                layout
                className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-stone-100 text-xs lg:text-[13px] font-sans uppercase tracking-widest font-bold border border-stone-900 shadow-sm rounded-sm"
              >
                <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                PREMIUM ACTIVE
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleTabClick("premium")}
                aria-label="Upgrade to AutoWorld Premium Plan"
                className="flex items-center gap-1.5 px-4 py-2 hover:bg-stone-900 hover:text-white border border-stone-900 text-stone-900 text-xs lg:text-[13px] font-sans uppercase tracking-widest transition-all cursor-pointer bg-[#FAF8F5]/50 focus:outline-none focus-visible:outline-2 focus-visible:outline-stone-900 font-bold"
              >
                <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-350" />
                Go Premium
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.03, y: -0.5 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleTabClick("sell")}
              aria-label="List your vehicle for sale free"
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-serif italic text-xs lg:text-[13px] uppercase tracking-widest transition-all cursor-pointer border border-stone-900 shadow-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-stone-900 font-bold"
            >
              List Car Free
            </motion.button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <motion.button
            id="mobile-menu-toggle"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-3.5 hover:bg-stone-200/50 text-stone-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden border-t border-stone-900/10 bg-[#FAF8F5] shadow-lg absolute top-full left-0 right-0 overflow-hidden py-4 px-4 flex flex-col gap-2.5"
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
                  className={`flex items-center gap-3 px-5 py-3.5 text-xs font-sans uppercase tracking-widest transition ${
                    isActive
                      ? "bg-stone-900 text-white font-extrabold"
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
                <div className="flex items-center justify-between p-3.5 bg-[#FAF8F5] border border-stone-200">
                  <div className="flex items-center gap-2">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt={currentUser.displayName || "Avatar"} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold">
                        {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <span className="text-xs font-bold uppercase text-stone-900">{currentUser.displayName || "User"}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    aria-label="Sign out of AutoWorld account"
                    className="flex items-center gap-1.5 px-4.5 py-3.5 bg-red-50 hover:bg-red-100 text-red-650 text-[11px] uppercase font-bold tracking-wider rounded-sm transition cursor-pointer"
                  >
                    <LogIn className="w-3 h-3" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignInClick}
                  aria-label="Sign in with Google account"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-stone-900 text-white text-xs font-sans uppercase tracking-widest transition-all font-bold cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In with Google
                </button>
              )}

              {subscriptionActive ? (
                <div className="flex items-center justify-center gap-2 py-3.5 px-5 bg-stone-950 text-[#F4F1EA] text-xs tracking-widest uppercase font-bold">
                  <Crown className="w-4 h-4 fill-amber-500 text-amber-500" />
                  Premium Active Pass
                </div>
              ) : (
                <button
                  onClick={() => handleTabClick("premium")}
                  aria-label="Upgrade to AutoWorld Premium Plan"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-5 hover:bg-stone-900 hover:text-white border border-stone-900 text-stone-900 text-xs font-sans uppercase tracking-widest transition-all font-bold cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-amber-600" />
                  Go Premium Plan
                </button>
              )}
              <button
                onClick={() => handleTabClick("sell")}
                aria-label="List your car free"
                className="w-full text-center py-3.5 px-5 bg-stone-900 text-white font-serif italic text-xs tracking-widest uppercase font-bold cursor-pointer"
              >
                List Car Free
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
