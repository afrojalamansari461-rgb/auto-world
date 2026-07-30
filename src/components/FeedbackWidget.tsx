import React, { useState } from "react";
import Modal from "./Modal";
import { 
  MessageSquare, Bug, Sparkles, HelpCircle, Heart, User, Mail, 
  Send, Shield, CheckCircle2 
} from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import emailjs from "@emailjs/browser";
import { motion, AnimatePresence } from "motion/react";

interface FeedbackWidgetProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  currentUser: any;
}

export default function FeedbackWidget({ showToast, currentUser }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Form states
  const [category, setCategory] = useState<string>("SUGGESTION");
  const [message, setMessage] = useState<string>("");
  const [name, setName] = useState<string>(currentUser?.displayName || "");
  const [email, setEmail] = useState<string>(currentUser?.email || "");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Submit feedback to Firebase & EmailJS
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // STOP THE PAGE FROM REFRESHING
    if (!message.trim()) {
      showToast("Please provide your feedback message before submitting.", "error");
      return;
    }
    setIsSubmitting(true);

    const templateParams = {
      user_name: name || 'Anonymous',
      user_email: email || 'No email provided',
      feedback_category: category,
      message: message
    };

    // 1. Try Firebase First
    try {
      await addDoc(collection(db, 'userFeedback'), {
        category,
        message,
        name: name || 'Anonymous',
        email: email || 'No email provided',
        createdAt: new Date(),
        status: 'unread'
      });
      console.log("Saved to Firebase successfully.");
    } catch (firebaseError) {
      console.error("Firebase save failed, but continuing to EmailJS:", firebaseError);
    }

    // 2. Try EmailJS Second (Always runs)
    try {
      await emailjs.send(
        'service_sjgb8kl', 
        'template_mjf4x7s', 
        templateParams,
        'gZB_lAYiLgfP1Y6cA'
      );
      console.log("EmailJS sent successfully.");
      
      // Cleanup UI
      setIsSuccess(true);
      showToast("Thank you! Your feedback has been submitted.", "success");
      setCategory('SUGGESTION');
      setMessage('');
      setName(currentUser?.displayName || '');
      setEmail(currentUser?.email || '');

      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (emailError) {
      console.error("EmailJS failed:", emailError);
      showToast("Failed to send email alert. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: "SUGGESTION", label: "Suggestion", icon: Sparkles, color: "text-emerald-600 bg-emerald-100/60" },
    { id: "BUG_REPORT", label: "Bug Report", icon: Bug, color: "text-red-650 bg-red-100/60" },
    { id: "QUESTION", label: "Question", icon: HelpCircle, color: "text-sky-650 bg-sky-100/60" },
    { id: "PRAISE", label: "Praise", icon: Heart, color: "text-rose-500 bg-rose-100/60" }
  ];

  return (
    <>
      {/* Floating Action Feedback Trigger Button (Bottom-Right) */}
      <div className="fixed bottom-20 sm:bottom-24 lg:bottom-6 right-4 sm:right-6 z-[180]" id="feedback-floating-hub">
        <motion.button
          id="feedback-widget-trigger"
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Provide user feedback and view system architecture"
          className="flex items-center gap-2 bg-[#FAF8F5] border-2 border-stone-900 text-stone-900 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-none shadow-[-4px_4px_0px_0px_rgba(26,26,26,1)] hover:bg-stone-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-950 font-sans font-bold text-xs uppercase tracking-wider"
        >
          <MessageSquare className="w-4 h-4 text-emerald-600 animate-bounce" />
          <span>Feedback Hub</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <Modal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            containerClassName="w-full max-w-lg"
            overlayClassName="bg-stone-950/60 backdrop-blur-xs"
            id="feedback-overlay-portal"
          >
            <motion.div
              id="feedback-dialog-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-[#FAF8F5] border-2 border-stone-900 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col justify-between"
              role="dialog"
              aria-modal="true"
              aria-label="User feedback submit dialog"
            >
              {/* Header block */}
              <div className="p-6 border-b-2 border-stone-900 bg-stone-900 text-[#F4F1EA] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h3 className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-widest">Connect with our developers</h3>
                    <h2 className="text-lg font-serif font-black tracking-tight uppercase leading-none mt-0.5">User Feedback Hub</h2>
                  </div>
                </div>
                <button
                  id="close-feedback-widget"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close feedback widget overlay dialog"
                  className="w-8 h-8 flex items-center justify-center bg-stone-800 hover:bg-stone-700 cursor-pointer border border-stone-700 font-mono text-[#F4F1EA] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  ✕
                </button>
              </div>

              {/* Content Panel Area */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {isSuccess ? (
                  <div className="text-center py-10 space-y-4" id="feedback-success-banner">
                    <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto animate-bounce" />
                    <h4 className="text-md font-serif font-black uppercase text-stone-900 tracking-tight">Feedback Submitted!</h4>
                    <p className="text-stone-600 text-xs max-w-sm mx-auto leading-relaxed">
                      Thank you for your feedback! Your submission has been saved directly to our Cloud Firestore database and sent to our team.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5" id="feedback-main-form">
                    {/* Category Choice */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block font-mono">
                        Categorize your feedback *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {categories.map((cat) => {
                          const Icon = cat.icon;
                          const isSelected = category === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setCategory(cat.id)}
                              className={`p-2.5 border flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center transition ${
                                isSelected 
                                  ? "border-stone-900 bg-stone-100 ring-1 ring-stone-900 font-bold text-stone-900" 
                                  : "border-stone-300 bg-transparent text-stone-600 hover:bg-stone-50"
                              }`}
                            >
                              <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-600" : "text-stone-500"}`} />
                              <span className="text-[9px] uppercase tracking-wider block leading-none font-semibold">
                                {cat.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Message input area */}
                    <div className="space-y-2">
                      <label htmlFor="feedback-message" className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block font-mono">
                        Detailed Input / Message *
                      </label>
                      <textarea
                        id="feedback-message"
                        required
                        rows={4}
                        maxLength={1000}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe your report, WCAG accessibility issue, feature request, or question here..."
                        className="w-full p-3 bg-stone-50 text-stone-900 text-xs border border-stone-300 focus:border-stone-900 outline-none placeholder:text-stone-400 font-sans leading-relaxed resize-none"
                      />
                      <div className="flex justify-between items-center text-[9px] text-stone-400 font-mono">
                        <span>* Mandatory Input</span>
                        <span>{message.length}/1000 characters</span>
                      </div>
                    </div>

                    {/* Contact information inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="feedback-name" className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block font-mono">
                          Your Name <span className="text-[9px] text-stone-400 lowercase">(optional)</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                          <input
                            id="feedback-name"
                            type="text"
                            placeholder="e.g. Afroj"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-stone-50 text-stone-900 text-xs border border-stone-300 focus:border-stone-900 outline-none placeholder:text-stone-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="feedback-email" className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block font-mono">
                          Email Address <span className="text-[9px] text-stone-400 lowercase">(optional)</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                          <input
                            id="feedback-email"
                            type="email"
                            placeholder="e.g. user@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-stone-50 text-stone-900 text-xs border border-stone-300 focus:border-stone-900 outline-none placeholder:text-stone-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit button */}
                    <button
                      id="feedback-submit-btn"
                      type="submit"
                      disabled={isSubmitting || !message.trim()}
                      className="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-[#F4F1EA] text-xs font-bold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2 transition"
                    >
                      <Send className="w-4 h-4 text-emerald-500" />
                      {isSubmitting ? "SUBMITTING..." : "SUBMIT FEEDBACK"}
                    </button>
                  </form>
                )}
              </div>

              {/* Secure footer badge */}
              <div className="p-5 border-t border-stone-250 bg-stone-100/60 text-[9px] text-stone-500 font-mono uppercase tracking-widest leading-relaxed flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  SSL Enforced Pipeline
                </span>
                <span className="text-stone-400">Google Cloud Firestore v1</span>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
