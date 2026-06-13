import { useState, useEffect } from "react";
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

  const isUserAdmin = currentUser?.email === "afrojalamansari461@gmail.com";

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "buy", label: "Buy", icon: Search },
    { id: "sell", label: "Sell", icon: Tag },
    { id: "premium", label: "Premium", icon: Crown },
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

  return (
    <nav
      id="main-navbar"
      className={`sticky top-0 z-[100] transition-all duration-300 ${
        isScrolled
          ? "bg-[#FAF8F5]/95 backdrop-blur-md shadow-sm py-3 border-b border-stone-900/15"
          : "bg-[#F4F1EA] border-b border-stone-900/10 py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <button
            id="nav-logo"
            onClick={() => handleTabClick("home")}
            className="flex items-center gap-3 group cursor-pointer focus:outline-none"
          >
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 3 }}
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 bg-stone-900 flex items-center justify-center text-white transition-all shadow-sm"
            >
              <Car className="w-5 h-5 text-[#F4F1EA]" />
            </motion.div>
            <span className="text-xl font-bold tracking-tighter uppercase font-serif text-stone-900">
              Auto<span className="font-light italic text-stone-500">World</span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-sans uppercase tracking-[0.12em] transition-colors duration-200 cursor-pointer ${
                    isActive
                      ? "text-stone-900 font-extrabold"
                      : "text-stone-600 hover:text-stone-950 font-medium"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="relative z-10">{item.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Accents */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <motion.div 
                id="user-profile-menu" 
                layout
                className="flex items-center gap-2 px-3 py-1 bg-[#FAF8F5] border border-stone-300 shadow-sm"
              >
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || "User Avatar"} className="w-6 h-6 rounded-full border border-stone-300" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-[#F4F1EA] flex items-center justify-center text-[10px] font-bold">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <div className="flex flex-col items-start leading-[1.1]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-stone-900 truncate max-w-[80px]">{currentUser.displayName || "User"}</span>
                  <button onClick={handleSignOut} className="text-[8px] uppercase tracking-widest font-bold text-red-600 hover:underline">Sign Out</button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSignInClick}
                className="flex items-center gap-1.5 px-3.5 py-1.5 hover:bg-stone-900 hover:text-white border border-stone-900 text-stone-900 text-xs font-sans uppercase tracking-[0.1em] transition-all cursor-pointer font-bold bg-[#FAF8F5] shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </motion.button>
            )}

            {subscriptionActive ? (
              <motion.div 
                layout
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-stone-100 text-xs font-sans uppercase tracking-widest font-bold border border-stone-900 shadow-sm rounded-sm"
              >
                <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                PREMIUM ACTIVE
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTabClick("premium")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 hover:bg-stone-900 hover:text-white border border-stone-900 text-stone-900 text-xs font-sans uppercase tracking-widest transition-all cursor-pointer bg-[#FAF8F5]/50"
              >
                <Crown className="w-3.5 h-3.5 text-amber-605 fill-amber-350" />
                Go Premium
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTabClick("sell")}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-serif italic text-xs uppercase tracking-widest transition-all cursor-pointer border border-stone-900 shadow-sm"
            >
              List Car Free
            </motion.button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <motion.button
            id="mobile-menu-toggle"
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 hover:bg-stone-200/50 text-stone-900 transition"
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
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`mobile-nav-link-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-xs font-sans uppercase tracking-widest transition ${
                    isActive
                      ? "bg-stone-900 text-white font-extrabold"
                      : "text-stone-700 hover:bg-stone-100 font-medium"
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
                <div className="flex items-center justify-between p-2.5 bg-[#FAF8F5] border border-stone-200">
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
                    className="flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-650 text-[10px] uppercase font-bold tracking-wider rounded-sm transition"
                  >
                    <LogIn className="w-3 h-3" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignInClick}
                  className="w-full flex items-center justify-center gap-2 p-2.5 bg-stone-900 text-white text-xs font-sans uppercase tracking-widest transition-all font-bold"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In with Google
                </button>
              )}

              {subscriptionActive ? (
                <div className="flex items-center justify-center gap-2 p-2.5 bg-stone-950 text-[#F4F1EA] text-xs tracking-widest uppercase font-bold">
                  <Crown className="w-4 h-4 fill-amber-500 text-amber-500" />
                  Premium Active Pass
                </div>
              ) : (
                <button
                  onClick={() => handleTabClick("premium")}
                  className="w-full flex items-center justify-center gap-2 p-2.5 hover:bg-stone-900 hover:text-white border border-stone-900 text-stone-900 text-xs font-sans uppercase tracking-widest transition-all font-bold"
                >
                  <Crown className="w-4 h-4 text-amber-600" />
                  Go Premium Plan
                </button>
              )}
              <button
                onClick={() => handleTabClick("sell")}
                className="w-full text-center p-2.5 bg-stone-900 text-white font-serif italic text-xs tracking-widest uppercase font-bold"
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
