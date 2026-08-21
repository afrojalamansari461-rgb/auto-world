import React, { useState, useEffect } from "react";
import { Car, Crown, Phone, Home, Search, Tag, Mail, LogIn, LogOut, User as UserIcon, ShieldAlert, ShieldCheck, Heart, Building2, Zap, Repeat } from "lucide-react";
import { User } from "firebase/auth";
import { auth, signOut } from "../firebase";
import { motion } from "motion/react";
import { UserRole, OWNER_EMAIL } from "../lib/userRoles";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  subscriptionActive: boolean;
  currentUser: User | null;
  userRole?: UserRole;
  onSignInClick: () => void;
}

export default function Navbar({ activeTab, setActiveTab, subscriptionActive, currentUser, userRole, onSignInClick }: NavbarProps) {
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

  const isUserOwner = currentUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() || userRole === "Owner";
  const isCoOwner = userRole === "Co-Owner";
  const isSuperAdmin = userRole === "Super Admin";
  const isStaffMember = userRole && userRole !== "User";

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "buy", label: "Buy", icon: Search },
    { id: "sell", label: "Sell", icon: Tag },
    { id: "premium", label: "Premium", icon: Crown },
    { id: "favorites", label: "Favorites", icon: Heart },
    { id: "contact", label: "Contact", icon: Mail },
  ];

  if (isUserOwner) {
    navItems.push({ id: "admin", label: "Admin Panel", icon: ShieldAlert });
    navItems.push({ id: "office", label: "Office Room", icon: Building2 });
  } else if (isCoOwner || isSuperAdmin) {
    navItems.push({ id: "admin", label: "Admin Panel", icon: ShieldAlert });
  } else if (currentUser && isStaffMember) {
    navItems.push({ id: "office", label: "Office Room", icon: Building2 });
  }

  const mobileNavItems = [
    { id: "home", label: "HOME", icon: Home },
    { id: "buy", label: "BUY", icon: Search },
    { id: "sell", label: "SELL", icon: Tag },
    { id: "premium", label: "PREMIUM", icon: Crown },
    { id: "favorites", label: "FAVORITES", icon: Heart },
    { id: "contact", label: "CONTACT", icon: Mail },
  ];

  if (isUserOwner) {
    mobileNavItems.push({ id: "admin", label: "ADMIN", icon: ShieldCheck });
    mobileNavItems.push({ id: "office", label: "OFFICE", icon: Building2 });
  } else if (isCoOwner || isSuperAdmin) {
    mobileNavItems.push({ id: "admin", label: "ADMIN", icon: ShieldCheck });
  } else if (currentUser && isStaffMember) {
    mobileNavItems.push({ id: "office", label: "OFFICE", icon: Building2 });
  }

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTabClick(tabId);
    }
  };

  return (
    <>
      <nav
        id="main-navbar"
        aria-label="Primary website navigation"
        className={`sticky top-0 z-[100] transition-all duration-300 w-full max-w-full overflow-x-clip ${
          isScrolled
            ? "bg-[#FAF8F5]/95 backdrop-blur-md shadow-md py-2 border-b border-stone-900/15"
            : "bg-[#F4F1EA]/90 backdrop-blur-sm border-b border-stone-900/10 py-2.5"
        }`}
      >
        <div className="max-w-[1650px] mx-auto px-2.5 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center gap-1.5 md:gap-3 lg:gap-4">
            {/* Logo with Advanced Animated "AutoWorld" */}
            <motion.button
              id="nav-logo"
              aria-label="AutoWorld homepage"
              onClick={() => handleTabClick("home")}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="flex items-center gap-2 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 py-1 select-none shrink-0"
            >
              <motion.div 
                variants={{
                  rest: { scale: 1, rotate: 0, backgroundColor: "#1c1917" },
                  hover: { scale: 1.12, rotate: 6, backgroundColor: "#0c0a09" },
                  tap: { scale: 0.92 }
                }}
                transition={{ type: "spring", stiffness: 400, damping: 16 }}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-stone-900 rounded-lg flex items-center justify-center text-white transition-shadow shadow-md group-hover:shadow-lg group-hover:shadow-stone-900/20 shrink-0"
              >
                <Car className="w-4 h-4 sm:w-5 sm:h-5 text-[#F4F1EA] transition-transform duration-300 group-hover:scale-110" />
              </motion.div>

              <div className="relative flex flex-col justify-center">
                <span className="text-lg sm:text-xl lg:text-2xl font-black font-serif uppercase tracking-tight text-stone-900 flex items-center">
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
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-stone-900 via-amber-500 to-stone-900 rounded-full origin-left"
                  variants={{
                    rest: { scaleX: 0, opacity: 0 },
                    hover: { scaleX: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }
                  }}
                />
              </div>
            </motion.button>

            {/* Desktop & Tablet Navigation Links - Shown on md+ (tablets, laptops, desktops) */}
            <div className="hidden md:flex items-center gap-0.5 md:gap-1 lg:gap-1.5 xl:gap-2 mx-auto min-w-0" role="tablist" aria-label="Main navigation tabs">
              {isLoadingTabs ? (
                navItems.map((item, idx) => (
                  <div 
                    key={`shimmer-${item.id}`} 
                    className="w-14 md:w-16 lg:w-20 h-7 bg-stone-200/60 rounded-full relative overflow-hidden flex items-center justify-center"
                  >
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "linear", delay: idx * 0.1 }}
                    />
                    <div className="w-8 md:w-10 h-2 bg-stone-300/50 rounded-full" />
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
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleTabClick(item.id)}
                      onKeyDown={(e) => handleKeyDown(e, item.id)}
                      className={`relative flex items-center gap-1 md:gap-1 lg:gap-1.5 px-2 md:px-2.5 lg:px-3 py-1.5 text-[10px] md:text-[11px] lg:text-xs font-sans uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-full whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                        isActive
                          ? "text-stone-950 font-black"
                          : "text-stone-600 hover:text-stone-950 hover:bg-stone-900/5 font-semibold"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? "text-stone-900" : "text-stone-500"}`} />
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

            {/* Right Actions Section - Responsive for Mobile, Tablet & Desktop */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {currentUser ? (
                <div 
                  id="user-profile-menu" 
                  className="flex items-center gap-1.5 sm:gap-2 p-1 sm:pl-2 pl-1.5 bg-stone-100/95 hover:bg-stone-200/80 rounded-full border border-stone-300 shadow-2xs shrink-0 max-w-[210px] xs:max-w-[240px] sm:max-w-[320px] md:max-w-[380px]"
                >
                  {/* Profile Picture (PFP) */}
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt={currentUser.displayName || currentUser.email || "User Avatar"} 
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-stone-300 object-cover shrink-0" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-stone-900 text-[#F4F1EA] flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                      {currentUser.displayName 
                        ? currentUser.displayName.charAt(0).toUpperCase() 
                        : (currentUser.email ? currentUser.email.charAt(0).toUpperCase() : "U")}
                    </div>
                  )}

                  {/* Email ID */}
                  <div className="flex items-center min-w-0 pr-0.5">
                    <span 
                      title={currentUser.email || currentUser.displayName || "User"}
                      className="text-[9px] xs:text-[10px] sm:text-[11px] font-bold text-stone-800 truncate max-w-[65px] xs:max-w-[85px] sm:max-w-[140px] md:max-w-[180px] font-mono leading-tight"
                    >
                      {currentUser.email || currentUser.displayName || "User"}
                    </span>
                  </div>

                  {/* Beside Email: Sign Out Button */}
                  <button 
                    onClick={handleSignOut} 
                    title="Sign Out"
                    aria-label="Sign out of AutoWorld account" 
                    className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-red-100 hover:bg-red-600 hover:text-white text-red-700 font-bold text-[9px] sm:text-[10px] uppercase tracking-wider rounded-full transition-colors cursor-pointer shrink-0"
                  >
                    <LogOut className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                    <span className="whitespace-nowrap">Sign Out</span>
                  </button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onSignInClick}
                  aria-label="Sign in to your account"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-800 hover:text-stone-950 border border-stone-800 hover:bg-stone-900 hover:text-[#f4f2ec] rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                >
                  <LogIn className="w-3.5 h-3.5 text-stone-600" />
                  <span>Sign In</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sticky Bottom Navigation Bar (Phone size < md / 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] w-full bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-xl h-16 px-1 sm:px-3 pb-safe">
        <div className="flex justify-between items-center w-full max-w-md sm:max-w-lg mx-auto h-full overflow-x-auto no-scrollbar">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={`bottom-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`relative flex flex-col items-center justify-center h-full flex-1 min-w-[52px] py-1 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer border-t-2 select-none ${
                  isActive
                    ? "border-black text-black font-black bg-stone-100/70"
                    : "border-transparent text-stone-400 hover:text-stone-700 font-bold"
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mb-0.5 transition-colors ${isActive ? "text-black" : "text-stone-400"}`} />
                <span className="truncate max-w-[56px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
