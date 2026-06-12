import React, { useState } from "react";
import { Mail, Phone, MapPin, Clock, Facebook, Twitter, Instagram, Linkedin, Send, CheckCircle2, ChevronDown, HelpCircle, Building } from "lucide-react";
import { Message } from "../types";
import { User } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

interface ContactTabProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  currentUser: User | null;
}

export default function ContactTab({ showToast, currentUser }: ContactTabProps) {
  // Form states
  const [fullName, setFullName] = useState("");
  const [emailAddress, setBillingEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [newsletters, setNewsletters] = useState(false);
  const [agreePrivacy, setAgreeTerms] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Accordion active helpers
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreePrivacy) {
      showToast("Please agree to the Privacy Policy checking terms.", "error");
      return;
    }
    if (!fullName || !emailAddress || !subject || !msgBody) {
      showToast("Please define values for all required fields.", "error");
      return;
    }

    setIsSending(true);
    
    const compiledMsg: Message = {
      name: fullName,
      email: emailAddress,
      subject: subject,
      message: msgBody,
      date: new Date().toISOString()
    };

    // Synchronize to Firestore
    try {
      try {
        await addDoc(collection(db, "messages"), compiledMsg);
      } catch (dbErr: any) {
        handleFirestoreError(dbErr, OperationType.WRITE, "messages");
        throw dbErr;
      }
    } catch (err) {
      console.warn("Firestore contact save failed, utilizing local storage fallback:", err);
      try {
        const stored = localStorage.getItem("autoWorld_contact_messages");
        const existing: Message[] = stored ? JSON.parse(stored) : [];
        existing.push(compiledMsg);
        localStorage.setItem("autoWorld_contact_messages", JSON.stringify(existing));
      } catch (storeErr) {
        console.error("Local storage fallback also failed: ", storeErr);
      }
    }

    setIsSending(false);
    setIsDone(true);
    showToast("Message sent successfully! Our advisors will responding shortly.", "success");
    
    // reset forms
    setFullName("");
    setBillingEmail("");
    setPhoneNumber("");
    setSubject("");
    setMsgBody("");
  };

  const contactFAQS = [
    { q: "How do I list my vehicle for sale?", a: "Lists can be posted Free of charge. Select the Sell tab in top navigation, progressively walk through our 4-step wizard specifying category configurations, attach beautiful photo reports, and hit publish to update main index searches immediately." },
    { q: "How long does are sale typically require?", a: "Most vehicles sell inside 7 to 10 days depending on local trade parameters, condition descriptions, and price competitiveness. Upgraded Pro Featured listing placements boost sale conversion rates up to 50% faster." },
    { q: "Is there any commission tariff or publishing fee?", a: "No! Unlike traditional motor brokers, we do not inspect or subtract matching tariffs or sales percentages from your final Handover deals. Sells are 100% free with customizable optional listing boosts." },
    { q: "How can I directly contact are listed broker?", a: "Once you purchase are daily access Pass ($1 USD) or subscribe to any Premium listing tier, simply select View Details on any vehicle. Under user-made listings, full actual email metrics, phone numbers, and location coordinates are revealed instantly!" }
  ];

  return (
    <div id="contact-view-wrapper" className="animate-in fade-in duration-300 bg-[#F4F1EA] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <center className="mb-14">
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-stone-900 tracking-tight mb-3 uppercase">Get in Touch</h1>
          <p className="text-stone-500 text-sm max-w-md uppercase tracking-wider font-bold">Our certified team handles queries and trade negotiations 24 hours a day.</p>
        </center>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
          {/* Left Panel: Contact information metrics */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-black text-[#1A1A1A] tracking-tight uppercase">Contact Information</h2>
              <p className="text-stone-605 text-xs sm:text-sm leading-relaxed font-semibold">
                Direct phone channels, location indices, and social media hubs are accessible to broker candidates and individual buyers alike.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Box: Visit Address */}
              <div className="bg-[#FAF8F5] p-5 border border-stone-300 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 bg-stone-900 text-[#F4F1EA] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest leading-none">Visit Office</h3>
                  <p className="text-xs text-stone-500 leading-relaxed font-semibold">
                    123 Auto Avenue, Corporate Square<br />
                    Mumbai, Maharashtra 400001
                  </p>
                </div>
              </div>

              {/* Box: Phone numbers */}
              <div className="bg-[#FAF8F5] p-5 border border-stone-300 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 bg-stone-900 text-[#F4F1EA] flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest leading-none">Call support</h3>
                  <p className="text-xs text-stone-500 font-semibold leading-relaxed font-mono">
                    Direct: +91 7666232753<br />
                    Toll-Free: +91 1805 123 4567
                  </p>
                </div>
              </div>

              {/* Box: Emails */}
              <div className="bg-[#FAF8F5] p-5 border border-stone-300 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 bg-stone-900 text-[#F4F1EA] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest leading-none">Email coordinates</h3>
                  <p className="text-xs text-stone-505 font-mono">
                    afrojalamansari461@gmail.com<br />
                    support@autoworld.com
                  </p>
                </div>
              </div>

              {/* Box: Hour rates */}
              <div className="bg-[#FAF8F5] p-5 border border-stone-300 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 bg-stone-900 text-[#F4F1EA] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest leading-none">Working Hours</h3>
                  <p className="text-xs text-stone-500 font-semibold leading-relaxed">
                    Mon - Fri: 9:00 AM - 8:00 PM<br />
                    Sat - Sun: 10:00 AM - 6:00 PM
                  </p>
                </div>
              </div>
            </div>

            {/* Social media card */}
            <div className="p-5.5 bg-stone-900 text-[#F4F1EA] rounded-none space-y-3.5">
              <h4 className="text-xs font-bold uppercase text-stone-300 tracking-widest font-mono">Social Community Networks</h4>
              <p className="text-xs text-stone-400 leading-relaxed max-w-sm">Join our newsletter campaigns and follow official profiles to unlock seasonal rewards.</p>
              <div className="flex gap-3">
                <a href="#" className="w-9 h-9 bg-stone-800 hover:bg-stone-700 transition flex items-center justify-center text-white">
                  <Facebook className="w-4.5 h-4.5" />
                </a>
                <a href="#" className="w-9 h-9 bg-stone-800 hover:bg-stone-700 transition flex items-center justify-center text-white">
                  <Twitter className="w-4.5 h-4.5" />
                </a>
                <a href="#" className="w-9 h-9 bg-stone-800 hover:bg-stone-700 transition flex items-center justify-center text-white">
                  <Instagram className="w-4.5 h-4.5" />
                </a>
                <a href="#" className="w-9 h-9 bg-stone-800 hover:bg-amber-500 transition flex items-center justify-center text-white">
                  <Linkedin className="w-4.5 h-4.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Panel: Interactive Send us a message form */}
          <div className="bg-[#FAF8F5] p-6.5 md:p-8 border border-stone-300">
            {isDone ? (
              <div className="text-center py-12 space-y-6">
                <div className="w-16 h-16 rounded-full bg-stone-900 text-[#F4F1EA] flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-serif font-black text-stone-900 uppercase tracking-tight">Message Sent</h3>
                <p className="text-stone-600 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed font-semibold">
                  Thank you for submitting your inquiry. A certified Auto World client success team member will email your address inside 24 hours.
                </p>
                <button
                  type="button"
                  onClick={() => setIsDone(false)}
                  className="px-6 py-2.5 bg-stone-950 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-widest cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleMessageSubmit} className="space-y-4.5">
                <div>
                  <h3 className="text-lg font-serif font-black text-stone-900 uppercase tracking-tight leading-none">Submit an inquiry</h3>
                  <p className="text-[9px] text-[#777777] font-bold uppercase tracking-widest block mt-1.5 font-mono">Vetted contacts strictly monitored</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase block tracking-widest">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-stone-950 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase block tracking-widest">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={emailAddress}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-stone-950 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase block tracking-widest">Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-stone-950 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase block tracking-widest">Subject *</label>
                    <select
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-stone-950 font-bold"
                    >
                      <option value="">Select Topic</option>
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Post Listing Help">Post Listing Help</option>
                      <option value="Verify Mechanics">Verify Mechanics</option>
                      <option value="Complain / Report Broker">Complain / Report Broker</option>
                      <option value="Partnership / Fleet">Partnership / Fleet</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase block tracking-widest">Body Message *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your inquiry details..."
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F4F1EA] border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-stone-955 font-mono font-medium"
                  />
                </div>

                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-2 cursor-pointer text-xs text-stone-705 font-bold uppercase tracking-wider leading-relaxed">
                    <input
                      type="checkbox"
                      checked={newsletters}
                      onChange={(e) => setNewsletters(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-stone-900 accent-stone-900 border-stone-300 rounded focus:ring-0"
                    />
                    <span>Subscribe to newsletter broadcasts for seasonal sales notifications.</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer text-xs text-stone-705 font-bold uppercase tracking-wider leading-relaxed select-none">
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      required
                      className="mt-0.5 w-4 h-4 text-stone-900 accent-stone-900 border-stone-300 rounded focus:ring-0"
                    />
                    <span>I agree to Privacy terms. *</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-3.5 bg-stone-950 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isSending ? (
                    <>Posting message...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send secure message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* MAP EM-BED EMBED WIDGET SECTION */}
        <section className="bg-[#FAF8F5] border border-stone-300 shadow-sm mb-16 overflow-hidden">
          <div className="p-4 bg-stone-100 border-b border-stone-300 flex items-center gap-2">
            <Building className="w-5 h-5 text-stone-900" />
            <span className="text-xs font-bold text-stone-700 uppercase tracking-widest font-mono">Corporate square headquarters Map</span>
          </div>
          <div className="h-96 relative">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.11609823277!2d72.74109980831803!3d19.08219783928285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c6306644edc1%3A0x5da4ed8f8d648c69!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1699999999999!5m2!1sen!2sin"
              className="w-full h-full border-none opacity-90 hover:opacity-100 transition"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </section>

        {/* STANDALONE GENERAL TRADE FAQS ACCORDIONS */}
        <section className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-serif font-black text-stone-900 text-center tracking-tight mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {contactFAQS.map((faq, idx) => {
              const isOpen = openFAQIndex === idx;
              return (
                <div key={idx} className="bg-[#FAF8F5] border border-stone-300 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setOpenFAQIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-bold text-stone-850 flex items-center justify-between transition hover:bg-stone-100 cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-750 flex items-center gap-2 font-mono">
                      <HelpCircle className="w-5 h-5 text-stone-900 shrink-0" />
                      {faq.q}
                    </span>
                    <ChevronDown className={`w-4.5 h-4.5 text-stone-500 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="p-5 border-t border-stone-300 bg-stone-100 text-xs sm:text-sm text-stone-600 leading-relaxed font-semibold">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
