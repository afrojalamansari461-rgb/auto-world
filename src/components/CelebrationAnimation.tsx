import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { Sparkles, CheckCircle2, ShieldCheck, Award } from "lucide-react";

export const fireCelebrationConfetti = () => {
  // First burst: Center spray with rich gold, emerald, and silver colors
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#D97706", "#059669", "#F59E0B", "#10B981", "#E5E7EB", "#F3F4F6"],
    scalar: 1.1,
  });

  // Second burst: Side canons delayed by 200ms
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#F59E0B", "#059669", "#FFFFFF", "#D97706"],
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#F59E0B", "#059669", "#FFFFFF", "#D97706"],
    });
  }, 200);

  // Third subtle sparkle burst at 450ms
  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      origin: { y: 0.5 },
      shapes: ["circle", "square"],
      colors: ["#34D399", "#FBBF24", "#F59E0B"],
      scalar: 0.85,
    });
  }, 450);
};

interface CelebrationAnimationProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  iconType?: "callback" | "shield" | "check";
  onComplete?: () => void;
}

export const CelebrationAnimation: React.FC<CelebrationAnimationProps> = ({
  title = "Request Confirmed!",
  subtitle = "Thank you! Our concierge team has received your submission.",
  badgeText = "SUCCESSFULLY LOGGED",
  iconType = "check",
}) => {
  useEffect(() => {
    fireCelebrationConfetti();
  }, []);

  return (
    <div className="relative py-6 px-4 text-center overflow-hidden flex flex-col items-center justify-center">
      {/* Background Animated Glow */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.8, 1.2, 1], opacity: [0, 0.6, 0.3] }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute w-64 h-64 rounded-full bg-radial from-amber-400/30 via-emerald-400/20 to-transparent blur-2xl pointer-events-none"
      />

      {/* Floating Sparkle Elements */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="relative z-10"
      >
        {/* Pulsing Central Icon Container */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center mb-3">
          {/* Animated Expanding Ripple 1 */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 border-emerald-500/60"
          />
          {/* Animated Expanding Ripple 2 */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 border-amber-500/50"
          />

          {/* Icon Shield/Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="w-18 h-18 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-500 p-0.5 shadow-xl flex items-center justify-center"
          >
            <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center text-emerald-400">
              {iconType === "shield" ? (
                <ShieldCheck className="w-9 h-9 text-amber-400" />
              ) : iconType === "callback" ? (
                <Award className="w-9 h-9 text-emerald-400" />
              ) : (
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              )}
            </div>
          </motion.div>

          {/* Floating Sparkles around icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
            className="absolute inset-0 pointer-events-none"
          >
            <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 drop-shadow-md" />
            <Sparkles className="w-4 h-4 text-emerald-400 absolute -bottom-1 -left-1 drop-shadow-md" />
          </motion.div>
        </div>

        {/* Badge Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-emerald-100 via-amber-100 to-emerald-100 text-stone-900 border border-amber-300 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xs mb-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>{badgeText}</span>
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
        </motion.div>

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-xl sm:text-2xl font-serif font-bold text-stone-950"
        >
          {title}
        </motion.h3>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto mt-1 leading-relaxed"
        >
          {subtitle}
        </motion.p>
      </motion.div>
    </div>
  );
};
