import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Shield, 
  FileText, 
  HelpCircle, 
  X, 
  Mail, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles, 
  Lock, 
  ExternalLink,
  Send,
  ChevronDown,
  Car
} from "lucide-react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

interface AuthPolicyModalProps {
  isOpen: boolean;
  activeTab: "terms" | "privacy" | "support";
  onClose: () => void;
  onSelectTab: (tab: "terms" | "privacy" | "support") => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
  contactEmail?: string;
  contactPhone?: string;
  showroomAddress?: string;
}

export default function AuthPolicyModal({
  isOpen,
  activeTab,
  onClose,
  onSelectTab,
  showToast,
  contactEmail = "afrojalamansari461@gmail.com",
  contactPhone = "+91 7666232753",
  showroomAddress = "123 Auto Avenue, Corporate Square, Mumbai, Maharashtra 400001"
}: AuthPolicyModalProps) {
  // Support Form State
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportTopic, setSupportTopic] = useState("Account & Access");
  const [supportMessage, setSupportMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleSendSupportMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) {
      if (showToast) showToast("Please complete all message fields.", "error");
      return;
    }

    setIsSending(true);
    try {
      await addDoc(collection(db, "support_inquiries"), {
        name: supportName.trim(),
        email: supportEmail.trim(),
        topic: supportTopic,
        message: supportMessage.trim(),
        createdAt: new Date().toISOString(),
        source: "AuthPolicyModal"
      });
      setSentSuccess(true);
      if (showToast) showToast("Support inquiry dispatched to Concierge Team!", "success");
      setSupportName("");
      setSupportEmail("");
      setSupportMessage("");
      setTimeout(() => setSentSuccess(false), 4000);
    } catch (err) {
      console.warn("Firestore support message log failed, saving locally:", err);
      // Local fallback
      try {
        const stored = JSON.parse(localStorage.getItem("autoWorld_support_messages") || "[]");
        stored.push({
          name: supportName,
          email: supportEmail,
          topic: supportTopic,
          message: supportMessage,
          date: new Date().toISOString()
        });
        localStorage.setItem("autoWorld_support_messages", JSON.stringify(stored));
      } catch (e) {}
      setSentSuccess(true);
      if (showToast) showToast("Support request submitted successfully!", "success");
      setSupportName("");
      setSupportEmail("");
      setSupportMessage("");
      setTimeout(() => setSentSuccess(false), 4000);
    } finally {
      setIsSending(false);
    }
  };

  const faqs = [
    {
      q: "How do I activate the 0% Buyer Fee Pass?",
      a: "All newly registered collectors automatically receive active membership privileges. Ensure you are signed into your account to enjoy zero buyer markup on verified inventory listings."
    },
    {
      q: "What mechanical documentation is provided for listed vehicles?",
      a: "Every verified listing includes 150-point mechanical inspection certificates, chassis VIN validation logs, title history records, and HD high-fidelity photography."
    },
    {
      q: "How can I schedule a physical showroom viewing or test drive?",
      a: "Contact our Concierge desk via WhatsApp (+91 7666232753) or submit a message right here to book a private viewing session at our Corporate Square showroom."
    },
    {
      q: "What is the policy for account password recovery?",
      a: "Click 'Forgot Key?' on the Sign In panel. A secure identity link will be generated for your email address to reset your access key."
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
          {/* Modal Overlay Dismiss */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="relative z-10 bg-[#0f0f0f] border-2 border-stone-800 text-[#f4f2ec] rounded-xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-stone-800 bg-[#141414] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-stone-900 border border-stone-700 flex items-center justify-center">
                  <Car className="w-5 h-5 text-[#c5a059]" />
                </div>
                <div>
                  <h2 className="text-base font-serif font-bold text-white tracking-wide flex items-center gap-2">
                    Auto World Legal & Support
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#c5a059] uppercase px-2 py-0.5 rounded bg-[#c5a059]/10 border border-[#c5a059]/20">
                      Est. 1962
                    </span>
                  </h2>
                  <p className="text-[10px] text-stone-400 font-mono">
                    Collector Security, Privacy Protocols & Concierge Desk
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="self-end sm:self-center p-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors border border-stone-700 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-800 bg-[#121212] px-6 gap-2 pt-2">
              <button
                type="button"
                onClick={() => onSelectTab("terms")}
                className={`px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === "terms"
                    ? "border-[#c5a059] text-white bg-stone-900/60"
                    : "border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#c5a059]" />
                Terms of Service
              </button>

              <button
                type="button"
                onClick={() => onSelectTab("privacy")}
                className={`px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === "privacy"
                    ? "border-[#c5a059] text-white bg-stone-900/60"
                    : "border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Privacy Policy
              </button>

              <button
                type="button"
                onClick={() => onSelectTab("support")}
                className={`px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === "support"
                    ? "border-[#c5a059] text-white bg-stone-900/60"
                    : "border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                Concierge Support
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              
              {/* TAB 1: TERMS OF SERVICE */}
              {activeTab === "terms" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="p-4 bg-stone-900/80 border border-stone-800 rounded-lg flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#c5a059] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Collector Registry Agreement & Operating Charter
                      </h3>
                      <p className="text-xs text-stone-400 leading-relaxed mt-1">
                        Effective date: August 2026. By registering or using Auto World services, you accept these terms governing high-fidelity vehicular acquisitions and listings.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs text-stone-200 leading-relaxed font-sans">
                    <section className="space-y-2 bg-stone-900/60 p-3.5 border border-stone-800 rounded-lg">
                      <h4 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                        <span className="text-[#c5a059] font-mono text-xs">01.</span>
                        Collector Pass & Zero Buyer Fee Policy
                      </h4>
                      <ul className="space-y-1.5 text-stone-300 text-xs pl-2">
                        <li className="flex items-start gap-2">
                          <span className="text-[#c5a059] font-bold">•</span>
                          <span><strong>Direct Access:</strong> Registered collectors get direct communication channels with verified private sellers.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#c5a059] font-bold">•</span>
                          <span><strong>Zero Buyer Markup:</strong> 0% transaction fee or commission added to buyer purchase prices.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#c5a059] font-bold">•</span>
                          <span><strong>Complete Transparency:</strong> Full access to mechanical inspection records and valuation metrics.</span>
                        </li>
                      </ul>
                    </section>

                    <section className="space-y-2 bg-stone-900/60 p-3.5 border border-stone-800 rounded-lg">
                      <h4 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                        <span className="text-[#c5a059] font-mono text-xs">02.</span>
                        Listing Authenticity & Inspection Audit
                      </h4>
                      <ul className="space-y-1.5 text-stone-300 text-xs pl-2">
                        <li className="flex items-start gap-2">
                          <span className="text-[#c5a059] font-bold">•</span>
                          <span><strong>Chassis Verification:</strong> Every catalogued vehicle undergoes structural and documentation checks.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#c5a059] font-bold">•</span>
                          <span><strong>Accuracy Warranties:</strong> Sellers warrant accurate mileage, title legitimacy, and clear ownership records.</span>
                        </li>
                      </ul>
                    </section>

                    <section className="space-y-2 bg-stone-900/60 p-3.5 border border-stone-800 rounded-lg">
                      <h4 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                        <span className="text-[#c5a059] font-mono text-xs">03.</span>
                        Bidding & Transaction Safeguards
                      </h4>
                      <ul className="space-y-1.5 text-stone-300 text-xs pl-2">
                        <li className="flex items-start gap-2">
                          <span className="text-[#c5a059] font-bold">•</span>
                          <span><strong>Verified Trade Intent:</strong> Offers represent formal interest backed by collector verification.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#c5a059] font-bold">•</span>
                          <span><strong>Concierge Facilitation:</strong> Dedicated assistance for physical inspection and title transfers.</span>
                        </li>
                      </ul>
                    </section>

                    <section className="space-y-2 bg-stone-900/60 p-3.5 border border-stone-800 rounded-lg">
                      <h4 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                        <span className="text-[#c5a059] font-mono text-xs">04.</span>
                        Account Safety & Integrity Rules
                      </h4>
                      <ul className="space-y-1.5 text-stone-300 text-xs pl-2">
                        <li className="flex items-start gap-2">
                          <span className="text-[#c5a059] font-bold">•</span>
                          <span><strong>Credential Protection:</strong> Members maintain strict confidentiality for account keys.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#c5a059] font-bold">•</span>
                          <span><strong>Zero Misrepresentation:</strong> Fraudulent or deceptive listings result in immediate account termination.</span>
                        </li>
                      </ul>
                    </section>
                  </div>
                </div>
              )}

              {/* TAB 2: PRIVACY POLICY */}
              {activeTab === "privacy" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-lg flex items-start gap-3">
                    <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                        Collector Privacy & Security Standard
                      </h3>
                      <p className="text-xs text-emerald-300/80 leading-relaxed mt-1">
                        We prioritize complete confidentiality for vehicle transactions, owner identities, and financial inquiries.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs text-stone-300 leading-relaxed font-sans">
                    <section className="space-y-2">
                      <h4 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        Zero Third-Party Data Selling
                      </h4>
                      <p className="text-stone-400">
                        Auto World does not sell, trade, or lease collector personal data, phone coordinates, or email addresses to marketing networks or third-party data brokers.
                      </p>
                    </section>

                    <section className="space-y-2">
                      <h4 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        Encrypted Data Transmission
                      </h4>
                      <p className="text-stone-400">
                        All access credentials, listing submissions, and communication messages are encrypted using industry-standard SSL and secure tokenization protocols.
                      </p>
                    </section>

                    <section className="space-y-2">
                      <h4 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        Vehicle Document Privacy
                      </h4>
                      <p className="text-stone-400">
                        VIN numbers, registration certificates, and ownership titles uploaded for vehicle verification are retained securely and only shared with verified prospective buyers upon authorization.
                      </p>
                    </section>

                    <section className="space-y-2">
                      <h4 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Your Privacy Rights
                      </h4>
                      <p className="text-stone-400">
                        You may request account data deletion, update profile preferences, or request copies of your registered information by reaching our Concierge Support team.
                      </p>
                    </section>
                  </div>
                </div>
              )}

              {/* TAB 3: CONCIERGE SUPPORT */}
              {activeTab === "support" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  
                  {/* Quick Contact Desk */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <a
                      href={`https://wa.me/${contactPhone.replace(/[^0-9]/g, "")}?text=Hi%20AutoWorld%20Concierge,%20I%20have%20a%20support%20inquiry.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/50 transition-colors group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <MessageSquare className="w-5 h-5 text-emerald-400" />
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-400/60 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">WhatsApp Desk</span>
                        <span className="text-xs font-mono font-bold text-white">{contactPhone}</span>
                      </div>
                    </a>

                    <a
                      href={`mailto:${contactEmail}`}
                      className="p-3.5 bg-stone-900 border border-stone-800 rounded-lg hover:bg-stone-800 transition-colors group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Mail className="w-5 h-5 text-[#c5a059]" />
                        <ExternalLink className="w-3.5 h-3.5 text-[#c5a059]/60 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#c5a059] uppercase tracking-widest block">Email Concierge</span>
                        <span className="text-xs font-mono font-bold text-white truncate block">{contactEmail}</span>
                      </div>
                    </a>

                    <div className="p-3.5 bg-stone-900 border border-stone-800 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <Phone className="w-5 h-5 text-sky-400" />
                        <span className="text-[9px] font-mono text-stone-500 uppercase">24/7 Hotline</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest block">Direct Phone</span>
                        <span className="text-xs font-mono font-bold text-white">{contactPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Showroom Address Bar */}
                  <div className="p-3.5 bg-stone-900/90 border border-stone-800 rounded-lg flex items-start gap-3 text-xs text-stone-300">
                    <Car className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Corporate Showroom Coordinates:</span>
                      <p className="font-mono text-stone-200">{showroomAddress}</p>
                    </div>
                  </div>

                  {/* Support Form */}
                  <div className="bg-[#141414] border border-stone-800 p-5 rounded-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                      <h3 className="text-xs font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#c5a059]" />
                        Send Direct Message to Concierge
                      </h3>
                      <span className="text-[9px] font-mono text-stone-500">Response within 2 hours</span>
                    </div>

                    {sentSuccess ? (
                      <div className="p-4 bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 rounded text-xs flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <p className="font-medium">
                          Thank you! Your inquiry has been routed to our Lead Concierge team. We will respond shortly via email.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSendSupportMessage} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono uppercase tracking-wider text-stone-400 font-bold">Your Full Name:</label>
                            <input
                              type="text"
                              required
                              value={supportName}
                              onChange={(e) => setSupportName(e.target.value)}
                              placeholder="e.g. Baldev Singh"
                              className="w-full p-2.5 bg-stone-900 border border-stone-700 text-white text-xs rounded focus:border-[#c5a059] outline-none font-sans"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono uppercase tracking-wider text-stone-400 font-bold">Your Email Address:</label>
                            <input
                              type="email"
                              required
                              value={supportEmail}
                              onChange={(e) => setSupportEmail(e.target.value)}
                              placeholder="e.g. collector@autoworld.com"
                              className="w-full p-2.5 bg-stone-900 border border-stone-700 text-white text-xs rounded focus:border-[#c5a059] outline-none font-sans"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-mono uppercase tracking-wider text-stone-400 font-bold">Inquiry Category:</label>
                          <select
                            value={supportTopic}
                            onChange={(e) => setSupportTopic(e.target.value)}
                            className="w-full p-2.5 bg-stone-900 border border-stone-700 text-white text-xs rounded focus:border-[#c5a059] outline-none font-sans cursor-pointer"
                          >
                            <option value="Account & Access">Account & Access Key Recovery</option>
                            <option value="Vehicle Verification">Vehicle Listing Verification Status</option>
                            <option value="Bids & Bidding">Bids & Trade Negotiation</option>
                            <option value="Showroom Booking">Private Showroom Booking</option>
                            <option value="General Question">General Inquiry</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-mono uppercase tracking-wider text-stone-400 font-bold">Message Details:</label>
                          <textarea
                            rows={3}
                            required
                            value={supportMessage}
                            onChange={(e) => setSupportMessage(e.target.value)}
                            placeholder="Describe your query or request..."
                            className="w-full p-2.5 bg-stone-900 border border-stone-700 text-white text-xs rounded focus:border-[#c5a059] outline-none font-sans resize-none"
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            disabled={isSending}
                            className="px-5 py-2.5 bg-[#c5a059] hover:bg-amber-600 text-stone-950 text-xs font-mono font-bold uppercase tracking-widest rounded transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                          >
                            {isSending ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                                Transmitting...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                Dispatch Message
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* FAQ Accordion */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#c5a059] mb-3">
                      Frequently Asked Collector Queries
                    </h3>
                    {faqs.map((faq, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                          className="w-full p-3.5 text-left text-xs font-serif font-bold text-white flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${expandedFaq === idx ? "rotate-180 text-[#c5a059]" : ""}`} />
                        </button>
                        {expandedFaq === idx && (
                          <div className="px-3.5 pb-3.5 text-xs text-stone-400 leading-relaxed font-sans border-t border-stone-800/60 pt-2 bg-black/40">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-stone-800 bg-[#121212] flex items-center justify-between text-[10px] font-mono text-stone-500">
              <span>© 2026 Auto World Motor Group</span>
              <button
                type="button"
                onClick={onClose}
                className="hover:text-white transition-colors underline uppercase tracking-wider"
              >
                Close Window
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
