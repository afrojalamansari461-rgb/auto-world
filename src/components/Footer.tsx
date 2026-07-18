import React, { useState } from "react";
import { Car, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Send, Check, Heart, ShieldCheck, Sparkles } from "lucide-react";

interface FooterProps {
  setActiveTab: (tab: string) => void;
  onOpenLegal?: (docName: "privacy" | "terms" | "fraud" | "support") => void;
}

export default function Footer({ setActiveTab, onOpenLegal }: FooterProps) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(() => {
    return localStorage.getItem("autoWorld_newsletter_subscribed") === "true";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLinkClick = (tabId: string) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;

    setIsSubmitting(true);
    setTimeout(() => {
      localStorage.setItem("autoWorld_newsletter_subscribed", "true");
      setIsSubscribed(true);
      setIsSubmitting(false);
      setEmail("");
    }, 900);
  };

  return (
    <footer id="app-footer" className="bg-stone-950 text-stone-400 pt-20 pb-10 border-t border-stone-900 font-sans relative overflow-hidden">
      {/* Subtle glowing mesh background accent */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none select-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none select-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Upper Segment: Brand Accent & Live Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-16 border-b border-stone-900 items-start">
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-900 border border-stone-800 flex items-center justify-center text-[#F4F1EA] shadow-inner">
                <Car className="w-5 h-5 text-[#F4F1EA]" />
              </div>
              <span className="text-2xl font-black font-serif tracking-tight text-white uppercase">
                Auto<span className="font-light italic text-stone-500">World</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-stone-400 max-w-md font-serif italic">
              "Establishing unparalleled trust and seamless transactional clarity for premium motoring specimens across the subcontinent."
            </p>
            
            {/* Trust Badging */}
            <div className="inline-flex items-center gap-3 px-3.5 py-2 bg-stone-900/60 border border-stone-800/80 rounded-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <p className="text-[10px] font-mono tracking-widest text-white uppercase font-bold">Vetted Trust Index</p>
                <p className="text-[11px] text-stone-400 font-medium">100% Verified Secure Transactions</p>
              </div>
            </div>
          </div>

          {/* Premium Functional Newsletter Component */}
          <div className="lg:col-span-7 bg-stone-900/40 border border-stone-900 p-6 md:p-8 rounded-none relative">
            <div className="absolute top-3 right-3 text-stone-800 pointer-events-none">
              <Sparkles className="w-5 h-5" />
            </div>
            
            <h3 className="text-xs font-bold tracking-[0.25em] text-stone-200 uppercase mb-2">
              The Auto World dispatch
            </h3>
            <p className="text-xs text-stone-400 mb-6 leading-relaxed max-w-xl">
              Subscribe to unlock early access notification alerts on luxury spec drop arrivals, exclusive pricing adjustments, and curated editorial reviews.
            </p>

            {isSubscribed ? (
              <div className="bg-stone-950/80 border border-emerald-500/30 p-4 flex items-center gap-3.5 animate-fadeIn">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <Check className="w-4.5 h-4.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Aboard the Registry Fleet</p>
                  <p className="text-[11px] text-stone-400">You are configured to receive high-tier vehicle allocation briefings.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  required
                  placeholder="Enter your executive email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-stone-950 border border-stone-800 px-4 py-3 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all font-mono"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-white text-stone-950 hover:bg-[#F4F1EA] text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border border-white"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent animate-spin rounded-full" />
                  ) : (
                    <>
                      Enlist
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Middle Segment: Structured Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 py-16">
          {/* Column 1: Core Navigation */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-5 font-sans pb-2 border-b border-stone-900">
              Fleet Navigation
            </h4>
            <ul className="space-y-3 text-[11px] font-sans uppercase tracking-widest">
              <li>
                <button onClick={() => handleLinkClick("home")} className="group flex items-center justify-between text-stone-400 hover:text-white transition w-full text-left cursor-pointer hover:underline">
                  <span>Home Portal</span>
                  <span className="text-stone-700 group-hover:text-stone-500 font-mono text-[9px] transition-colors">01</span>
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick("buy")} className="group flex items-center justify-between text-stone-400 hover:text-white transition w-full text-left cursor-pointer hover:underline">
                  <span>Master Inventory</span>
                  <span className="text-stone-700 group-hover:text-stone-500 font-mono text-[9px] transition-colors">02</span>
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick("sell")} className="group flex items-center justify-between text-stone-400 hover:text-white transition w-full text-left cursor-pointer hover:underline">
                  <span>List Vehicle specimen</span>
                  <span className="text-stone-700 group-hover:text-stone-500 font-mono text-[9px] transition-colors">03</span>
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick("premium")} className="group flex items-center justify-between text-stone-400 hover:text-white transition w-full text-left cursor-pointer hover:underline">
                  <span>Verified Passes</span>
                  <span className="text-stone-700 group-hover:text-stone-500 font-mono text-[9px] transition-colors">04</span>
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick("favorites")} className="group flex items-center justify-between text-stone-400 hover:text-white transition w-full text-left cursor-pointer hover:underline text-purple-400/90 font-bold">
                  <span className="flex items-center gap-1.5 text-purple-300">
                    <Heart className="w-3.5 h-3.5 text-purple-400 fill-purple-400/30" />
                    Saved Garage
                  </span>
                  <span className="text-stone-700 group-hover:text-stone-500 font-mono text-[9px] transition-colors">05</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Legal Operations */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-5 font-sans pb-2 border-b border-stone-900">
              Executive Terms
            </h4>
            <ul className="space-y-3 text-[11px] font-sans uppercase tracking-widest">
              <li>
                <button 
                  onClick={() => onOpenLegal ? onOpenLegal("privacy") : handleLinkClick("contact")} 
                  className="hover:text-white transition text-stone-400 text-left w-full hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenLegal ? onOpenLegal("terms") : handleLinkClick("contact")} 
                  className="hover:text-white transition text-stone-400 text-left w-full hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  Terms of Sale
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenLegal ? onOpenLegal("fraud") : handleLinkClick("contact")} 
                  className="hover:text-white transition text-stone-400 text-left w-full hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  Fraud Guard Info
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenLegal ? onOpenLegal("support") : handleLinkClick("contact")} 
                  className="hover:text-white transition text-stone-400 text-left w-full hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  Resolution Desk
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Communication Channels */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-5 font-sans pb-2 border-b border-stone-900">
              Registry Headquarters
            </h4>
            <ul className="space-y-4 text-xs text-stone-400">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  123 Auto Avenue, Corporate Square,<br />
                  Mumbai, Maharashtra 400001
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-stone-500 shrink-0" />
                <span className="font-mono">+91 7666232753</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-stone-500 shrink-0" />
                <a href="mailto:afrojalamansari461@gmail.com" className="font-mono text-stone-300 hover:text-white transition hover:underline">
                  afrojalamansari461@gmail.com
                </a>
              </li>
            </ul>

            {/* Social Network */}
            <div className="flex items-center gap-2.5 mt-6 pt-6 border-t border-stone-900">
              <span className="text-[10px] uppercase font-mono tracking-wider text-stone-600 mr-2">Channels:</span>
              <a 
                href="#" 
                className="w-8 h-8 bg-stone-900 flex items-center justify-center text-stone-400 border border-stone-850 transition-all duration-300 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] hover:scale-110 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(24,119,242,0.3)] cursor-pointer" 
                title="Facebook Connect"
              >
                <Facebook className="w-4 h-4 transition-transform duration-300" />
              </a>
              <a 
                href="#" 
                className="w-8 h-8 bg-stone-900 flex items-center justify-center text-stone-400 border border-stone-850 transition-all duration-300 hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2] hover:scale-110 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(29,161,242,0.3)] cursor-pointer" 
                title="Twitter Channel"
              >
                <Twitter className="w-4 h-4 transition-transform duration-300" />
              </a>
              <a 
                href="https://www.instagram.com/l_afroj_l/" 
                target="_blank" 
                rel="noopener noreferrer"
                title="Follow Afroj on Instagram"
                className="w-8 h-8 bg-stone-900 flex items-center justify-center text-stone-400 border border-stone-850 transition-all duration-300 hover:bg-gradient-to-tr hover:from-[#405DE6] hover:via-[#E1306C] hover:to-[#F77737] hover:text-white hover:border-transparent hover:scale-110 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(225,48,108,0.3)] cursor-pointer"
              >
                <Instagram className="w-4 h-4 transition-transform duration-300" />
              </a>
              <a 
                href="#" 
                className="w-8 h-8 bg-stone-900 flex items-center justify-center text-stone-400 border border-stone-850 transition-all duration-300 hover:bg-[#0077B5] hover:text-white hover:border-[#0077B5] hover:scale-110 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,119,181,0.3)] cursor-pointer" 
                title="Linkedin Registry"
              >
                <Linkedin className="w-4 h-4 transition-transform duration-300" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom copyright Segment */}
        <div className="pt-10 border-t border-stone-900 text-[10px] text-stone-600 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans uppercase tracking-widest">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} Auto World Inc. All rights reserved. Vetted craftsmanship by{" "}
            <span className="text-stone-350 font-bold hover:text-white transition-colors">Afroj</span>.
          </p>
          <div className="flex items-center gap-1.5 italic text-[10px] text-stone-500 font-serif normal-case tracking-normal">
            <span>Precision engineering</span>
            <span className="w-1 h-1 bg-purple-500 rounded-full" />
            <span>Uncompromising quality</span>
            <span className="w-1 h-1 bg-purple-500 rounded-full" />
            <span>Absolute verity</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
