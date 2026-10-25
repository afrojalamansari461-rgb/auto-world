import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart } from "lucide-react";

interface AnimatedFavoriteHeartProps {
  isFav: boolean;
  className?: string;
  isMono?: boolean;
}

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
}

export function AnimatedFavoriteHeart({
  isFav,
  className = "w-4.5 h-4.5",
  isMono = false,
}: AnimatedFavoriteHeartProps) {
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const [pulseRing, setPulseRing] = useState(false);
  const prevIsFav = useRef(isFav);

  useEffect(() => {
    if (isFav && !prevIsFav.current) {
      setPulseRing(true);
      const ringTimeout = setTimeout(() => setPulseRing(false), 650);

      const colors = isMono
        ? ["#0F0F10", "#D5001C", "#3F3F46", "#D5001C", "#18181B", "#71717A"]
        : ["#D5001C", "#FF2A44", "#0F0F10", "#990014", "#D5001C", "#52525B"];

      const newParticles: BurstParticle[] = Array.from({ length: 10 }).map((_, i) => {
        const angle = (i * 360) / 10 + (Math.random() * 12 - 6);
        const radians = (angle * Math.PI) / 180;
        const distance = 18 + Math.random() * 14;
        return {
          id: Date.now() + i,
          x: Math.cos(radians) * distance,
          y: Math.sin(radians) * distance,
          color: colors[i % colors.length],
          size: 3 + Math.random() * 3.5,
          delay: i * 0.012,
        };
      });

      setParticles(newParticles);
      const particlesTimeout = setTimeout(() => setParticles([]), 750);

      prevIsFav.current = isFav;
      return () => {
        clearTimeout(ringTimeout);
        clearTimeout(particlesTimeout);
      };
    }

    prevIsFav.current = isFav;
  }, [isFav, isMono]);

  return (
    <div className="relative inline-flex items-center justify-center overflow-visible select-none">
      {/* Expanding Precision Shockwave Ring */}
      <AnimatePresence>
        {pulseRing && (
          <motion.span
            initial={{ scale: 0.4, opacity: 0.9 }}
            animate={{ scale: 2.35, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 22,
            }}
            className="absolute inset-0 rounded-full border-2 border-[#D5001C] pointer-events-none z-10"
          />
        )}
      </AnimatePresence>

      {/* Complex Spring Heart Pop + Color Fill Transition */}
      <motion.div
        initial={false}
        animate={
          isFav
            ? {
                scale: [1, 0.72, 1.38, 0.92, 1.06, 1],
                rotate: [0, -10, 8, -3, 0],
              }
            : {
                scale: 1,
                rotate: 0,
              }
        }
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 14,
          mass: 0.7,
        }}
        className="relative z-20 flex items-center justify-center"
      >
        <Heart
          className={`${className} transition-colors duration-300 ${
            isFav
              ? "fill-[#D5001C] text-[#D5001C]"
              : "fill-transparent text-current"
          }`}
        />
      </motion.div>

      {/* Spring Micro-Particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
            animate={{
              opacity: [1, 1, 0],
              x: p.x,
              y: p.y,
              scale: [0, 1.25, 0.3],
            }}
            exit={{ opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 16,
              delay: p.delay,
            }}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              zIndex: 15,
              pointerEvents: "none",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
