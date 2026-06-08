import { useState, useEffect } from "react";
import { Car, Menu, X, Crown, Phone, Home, Search, Tag, Mail } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  subscriptionActive: boolean;
}

export default function Navbar({ activeTab, setActiveTab, subscriptionActive }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
  ];

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
            <div className="w-9 h-9 bg-stone-900 flex items-center justify-center text-white transition-all group-hover:scale-105">
              <Car className="w-5 h-5 text-[#F4F1EA]" />
            </div>
            <span className="text-xl font-bold tracking-tighter uppercase font-serif text-stone-900">
              Auto<span className="font-light italic text-stone-500">World</span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-sans uppercase tracking-[0.15em] transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "border-b-2 border-stone-900 text-stone-900 font-bold"
                      : "text-stone-600 hover:text-[#1A1A1A] hover:underline"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right Accents */}
          <div className="hidden md:flex items-center gap-3">
            {subscriptionActive ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-stone-100 text-xs font-sans uppercase tracking-widest font-bold">
                <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                PREMIUM ACTIVE
              </div>
            ) : (
              <button
                onClick={() => handleTabClick("premium")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 hover:bg-stone-900 hover:text-white border border-stone-900 text-stone-900 text-xs font-sans uppercase tracking-widest transition-all cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                Go Premium
              </button>
            )}
            <button
              onClick={() => handleTabClick("sell")}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-serif italic text-xs uppercase tracking-widest transition-all cursor-pointer border border-stone-900"
            >
              List Car Free
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 hover:bg-stone-200/50 text-stone-900 transition"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-stone-900/10 bg-[#FAF8F5] shadow-lg absolute top-full left-0 right-0 py-4 px-4 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-link-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-3 px-4 py-2 text-xs font-sans uppercase tracking-widest transition ${
                  isActive
                    ? "bg-stone-900 text-white font-bold"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
          <hr className="border-stone-900/10 my-1" />
          <div className="flex flex-col gap-2">
            {subscriptionActive ? (
              <div className="flex items-center justify-center gap-2 p-2 bg-stone-950 text-[#F4F1EA] text-xs tracking-widest uppercase">
                <Crown className="w-4 h-4 fill-amber-500 text-amber-500" />
                Premium Active Pass
              </div>
            ) : (
              <button
                onClick={() => handleTabClick("premium")}
                className="w-full flex items-center justify-center gap-2 p-2 hover:bg-stone-900 hover:text-white border border-stone-900 text-stone-900 text-xs font-sans uppercase tracking-widest transition-all"
              >
                <Crown className="w-4 h-4 text-amber-600" />
                Go Premium Plan
              </button>
            )}
            <button
              onClick={() => handleTabClick("sell")}
              className="w-full text-center p-2 bg-stone-900 text-white font-serif italic text-xs tracking-widest uppercase"
            >
              List Car Free
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
