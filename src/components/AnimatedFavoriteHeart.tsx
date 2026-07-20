import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Check } from "lucide-react";

interface AnimatedFavoriteHeartProps {
  isFav: boolean;
  className?: string;
  isMono?: boolean;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
}

export function AnimatedFavoriteHeart({ isFav, className = "w-4.5 h-4.5", isMono = true }: AnimatedFavoriteHeartProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const [showCheck, setShowCheck] = useState(false);
  const prevIsFav = useRef(isFav);

  useEffect(() => {
    // Only trigger animation when transitioning from false to true (successfully favorited)
    if (isFav && !prevIsFav.current) {
      // Trigger checkmark animation
      setShowCheck(true);
      const checkTimeout = setTimeout(() => setShowCheck(false), 1500);

      // Trigger confetti burst
      const colors = isMono
        ? [
            "#000000", // Pure black
            "#1C1917", // Stone-900
            "#444444", // Medium dark gray
            "#78716C", // Stone-500
            "#292524", // Stone-800
            "#0C0A09", // Stone-950
            "#57534E", // Stone-600
            "#A8A29E", // Stone-400
          ]
        : [
            "#FBBF24", // Gold
            "#34D399", // Emerald
            "#F87171", // Red
            "#A78BFA", // Purple
            "#60A5FA", // Blue
            "#F59E0B", // Amber
            "#F472B6", // Pink
            "#2DD4BF", // Teal
          ];

      const newParticles: ConfettiParticle[] = Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 360) / 12 + (Math.random() * 15 - 7.5); // Spread evenly + subtle variance
        const radians = (angle * Math.PI) / 180;
        const velocity = 25 + Math.random() * 25; // Random distance multiplier
        return {
          id: Date.now() + i,
          x: Math.cos(radians) * velocity,
          y: Math.sin(radians) * velocity,
          color: colors[i % colors.length],
          size: 4 + Math.random() * 5, // Size between 4px and 9px
          delay: Math.random() * 0.1,
        };
      });

      setParticles(newParticles);

      // Clean up particles
      const particlesTimeout = setTimeout(() => {
        setParticles([]);
      }, 1200);

      return () => {
        clearTimeout(checkTimeout);
        clearTimeout(particlesTimeout);
      };
    }

    prevIsFav.current = isFav;
  }, [isFav, isMono]);

  return (
    <div className="relative inline-flex items-center justify-center overflow-visible">
      {/* Heart Icon Container with scale pop */}
      <motion.div
        animate={isFav ? { scale: [1, 1.35, 0.95, 1.05, 1] } : { scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative"
      >
        <Heart
          className={`${className} transition-colors duration-300 ${
            isFav
              ? isMono
                ? "fill-current text-current"
                : "fill-red-500 text-red-500"
              : "text-current"
          }`}
        />
      </motion.div>

      {/* Floating Check-mark feedback */}
      <AnimatePresence>
        {showCheck && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -22, scale: [0.5, 1.2, 1, 0.8] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className={`absolute z-30 flex items-center justify-center rounded-full p-0.5 shadow-sm ${
              isMono ? "bg-black text-white border border-stone-800" : "bg-emerald-500 text-white"
            }`}
          >
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confetti Particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
            animate={{
              opacity: [1, 1, 0],
              x: p.x,
              y: p.y - 10, // Drift slightly up due to air resistance
              scale: [0, 1.2, 0.5],
              rotate: [0, 180 + Math.random() * 180],
            }}
            transition={{
              duration: 0.8 + Math.random() * 0.3,
              ease: "easeOut",
              delay: p.delay,
            }}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px", // Mix of circles and squares
              zIndex: 20,
              pointerEvents: "none",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
