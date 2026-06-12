import { Car, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Github } from "lucide-react";

interface FooterProps {
  setActiveTab: (tab: string) => void;
  onOpenLegal?: (docName: "privacy" | "terms" | "fraud" | "support") => void;
}

export default function Footer({ setActiveTab, onOpenLegal }: FooterProps) {
  const handleLinkClick = (tabId: string) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer id="app-footer" className="bg-stone-950 text-stone-400 pt-16 pb-8 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Section 1: Brand details */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-stone-900 border border-stone-880 flex items-center justify-center text-[#F4F1EA]">
                <Car className="w-5 h-5 text-[#F4F1EA]" />
              </div>
              <span className="text-xl font-bold font-serif tracking-tighter text-white">
                Auto<span className="font-light italic text-stone-450">World</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-stone-400 font-sans">
              The premier marketplace for buying and selling certified vehicles. Enjoy frictionless transactions, detailed digital inspections, and verified buyer contacts.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <a href="#" className="w-8 h-8 bg-stone-900 hover:bg-[#F4F1EA] hover:text-stone-950 flex items-center justify-center text-stone-400 border border-stone-850 transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-stone-900 hover:bg-[#F4F1EA] hover:text-stone-950 flex items-center justify-center text-stone-400 border border-stone-850 transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="https://www.instagram.com/l_afroj_l/" 
                target="_blank" 
                rel="noopener noreferrer"
                title="Follow Afroj on Instagram"
                className="w-8 h-8 bg-stone-900 hover:bg-[#F4F1EA] hover:text-stone-950 flex items-center justify-center text-stone-400 border border-stone-850 transition-all"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-stone-900 hover:bg-[#F4F1EA] hover:text-stone-950 flex items-center justify-center text-stone-400 border border-stone-850 transition-all">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Section 2: Quick navigation */}
          <div>
            <h3 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-4 font-sans">Quick Links</h3>
            <ul className="space-y-2.5 text-xs font-sans uppercase tracking-widest">
              <li>
                <button onClick={() => handleLinkClick("home")} className="hover:text-white transition cursor-pointer text-stone-400 hover:underline">
                  Home Page
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick("buy")} className="hover:text-white transition cursor-pointer text-stone-400 hover:underline">
                  Browse Vehicles
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick("sell")} className="hover:text-white transition cursor-pointer text-stone-400 hover:underline">
                  Sell Your Car
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick("premium")} className="hover:text-white transition cursor-pointer text-stone-400 hover:underline">
                  Premium Deals
                </button>
              </li>
            </ul>
          </div>

          {/* Section 3: Legal terms */}
          <div>
            <h3 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-4 font-sans">Legal & Support</h3>
            <ul className="space-y-2.5 text-xs font-sans uppercase tracking-widest">
              <li>
                <button 
                  onClick={() => onOpenLegal ? onOpenLegal("privacy") : handleLinkClick("contact")} 
                  className="hover:text-white transition text-stone-400 block text-left w-full hover:underline cursor-pointer bg-transparent border-none p-0 normal-case"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenLegal ? onOpenLegal("terms") : handleLinkClick("contact")} 
                  className="hover:text-white transition text-stone-400 block text-left w-full hover:underline cursor-pointer bg-transparent border-none p-0 normal-case"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenLegal ? onOpenLegal("fraud") : handleLinkClick("contact")} 
                  className="hover:text-white transition text-stone-400 block text-left w-full hover:underline cursor-pointer bg-transparent border-none p-0 normal-case"
                >
                  Fraud Protection
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenLegal ? onOpenLegal("support") : handleLinkClick("contact")} 
                  className="hover:text-white transition text-stone-400 block text-left w-full hover:underline cursor-pointer bg-transparent border-none p-0 normal-case"
                >
                  FAQs & Support
                </button>
              </li>
            </ul>
          </div>

          {/* Section 4: Contact details */}
          <div>
            <h3 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-4 font-sans">Contact Channels</h3>
            <ul className="space-y-3 text-xs text-stone-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#F4F1EA] shrink-0 mt-0.5" />
                <span>
                  123 Auto Avenue, Corporate Square<br />
                  Mumbai, Maharashtra 400001
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#F4F1EA] shrink-0" />
                <span>+91 1800 123 4567</span>
              </li>
              <li className="flex items-center gap-2.5 mb-2">
                <Mail className="w-4 h-4 text-[#F4F1EA] shrink-0" />
                <span className="font-mono">support@autoworld.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-stone-900 text-center text-[10px] text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans uppercase tracking-widest">
          <p>© {new Date().getFullYear()} Auto World. All rights reserved. Crafted by <span className="text-[#F4F1EA] font-semibold transition-colors duration-200">Afroj</span>.</p>
          <p className="italic text-stone-500 font-serif">
            Precision • Quality • Verity
          </p>
        </div>
      </div>
    </footer>
  );
}
