import React, { useRef, useState, useEffect, ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  Variants,
  HTMLMotionProps,
} from "motion/react";
import { ChevronDown } from "lucide-react";

/**
 * 1. CORE SPRING & TRANSITION PRESETS
 * Engineered for a precision Swiss-editorial automotive platform.
 */
export const SWISS_SPRING = {
  type: "spring" as const,
  stiffness: 100,
  damping: 15,
  mass: 0.85,
};

export const MICRO_SPRING = {
  type: "spring" as const,
  stiffness: 360,
  damping: 26,
};

export const EDITORIAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * 2. PAGE ROUTING CROSS-FADE VARIANTS
 * Smooth cross-fade with subtle vertical calibration. Never snaps.
 */
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: EDITORIAL_EASE,
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.26,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/**
 * 3. STAGGERED LIST REVEAL VARIANTS
 * Items stagger in smoothly from the bottom with spring physics (stiffness: 100, damping: 15).
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (staggerDelay: number = 0.08) => ({
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.04,
    },
  }),
};

export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: SWISS_SPRING,
  },
};

/**
 * 4. MODAL & DRAWER PHYSICS VARIANTS
 * Slight scale-up and fade-in, paired with a 0px -> 4px backdrop blur transition.
 */
export const modalBackdropVariants: Variants = {
  hidden: {
    opacity: 0,
    backdropFilter: "blur(0px)",
  },
  visible: {
    opacity: 1,
    backdropFilter: "blur(4px)",
    transition: {
      duration: 0.32,
      ease: EDITORIAL_EASE,
    },
  },
  exit: {
    opacity: 0,
    backdropFilter: "blur(0px)",
    transition: {
      duration: 0.24,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export const modalPanelVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 18,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 26,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 12,
    transition: {
      duration: 0.22,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/**
 * 5. PAGE TRANSITION WRAPPER COMPONENT
 */
interface PageTransitionProps {
  routeKey: string;
  children: ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  routeKey,
  children,
  className = "",
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * 6. STAGGER CONTAINER & ITEM COMPONENTS
 */
interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  staggerDelay?: number;
  children: ReactNode;
  viewportOnce?: boolean;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  staggerDelay = 0.08,
  children,
  className = "",
  viewportOnce = true,
  ...rest
}) => {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: viewportOnce, margin: "-40px" }}
      custom={staggerDelay}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<HTMLMotionProps<"div">> = ({
  children,
  className = "",
  ...rest
}) => {
  return (
    <motion.div variants={staggerItemVariants} className={className} {...rest}>
      {children}
    </motion.div>
  );
};

/**
 * 7. VIEWPORT FADE-IN-UP REVEAL
 */
interface FadeInUpProps extends HTMLMotionProps<"div"> {
  delay?: number;
  yOffset?: number;
  children: ReactNode;
}

export const FadeInUp: React.FC<FadeInUpProps> = ({
  delay = 0,
  yOffset = 24,
  children,
  className = "",
  ...rest
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{
        ...SWISS_SPRING,
        delay,
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

/**
 * 8. MAGNETIC & TACTILE BUTTON
 * Scale-down (scale: 0.98) on tap + subtle magnetic cursor pull on hover.
 */
interface MagneticButtonProps extends HTMLMotionProps<"button"> {
  magneticStrength?: number;
  children: ReactNode;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  magneticStrength = 0.18,
  children,
  className = "",
  onMouseMove,
  onMouseLeave,
  ...rest
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.5 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ref.current && magneticStrength > 0) {
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * magneticStrength);
      y.set((e.clientY - centerY) * magneticStrength);
    }
    onMouseMove?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    x.set(0);
    y.set(0);
    onMouseLeave?.(e);
  };

  return (
    <motion.button
      ref={ref}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.98 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      {...rest}
    >
      {children}
    </motion.button>
  );
};

/**
 * 9. PARALLAX HERO IMAGE
 * Subtle scroll-linked parallax for edge-to-edge vehicle hero photography.
 */
interface ParallaxHeroImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  intensity?: number;
  overlayClassName?: string;
}

export const ParallaxHeroImage: React.FC<ParallaxHeroImageProps> = ({
  src,
  alt,
  className = "",
  containerClassName = "",
  intensity = 12,
  overlayClassName = "bg-gradient-to-t from-[#0F0F10] via-[#0F0F10]/45 to-transparent",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${intensity}%`]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.02, 1.1]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName}`}
    >
      <motion.img
        src={src}
        alt={alt}
        style={{ y, scale }}
        className={`w-full h-full object-cover will-change-transform ${className}`}
        referrerPolicy="no-referrer"
      />
      {overlayClassName && (
        <div className={`absolute inset-0 pointer-events-none ${overlayClassName}`} />
      )}
    </div>
  );
};

/**
 * 10. SMOOTH HEIGHT-ANIMATING ACCORDION
 * Used in SpecGrid, InspectionReportModal, and technical dossiers.
 */
interface SmoothAccordionProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}

export const SmoothAccordion: React.FC<SmoothAccordionProps> = ({
  title,
  subtitle,
  badge,
  defaultOpen = true,
  children,
  className = "",
  headerClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-[#0F0F10]/15 bg-[#FAF9F6] overflow-hidden ${className}`}>
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        whileTap={{ scale: 0.995 }}
        aria-expanded={isOpen}
        className={`w-full px-5 py-4 flex items-center justify-between gap-4 text-left transition-colors hover:bg-[#0F0F10]/[0.03] cursor-pointer ${headerClassName}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            {title}
            {badge}
          </div>
          {subtitle && (
            <div className="text-[11px] text-stone-500 mt-0.5 font-sans">
              {subtitle}
            </div>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={MICRO_SPRING}
          className="w-7 h-7 border border-[#0F0F10]/15 flex items-center justify-center shrink-0 text-[#0F0F10]"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="accordion-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { duration: 0.32, ease: EDITORIAL_EASE },
                opacity: { duration: 0.24, delay: 0.06 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.26, ease: [0.4, 0, 1, 1] },
                opacity: { duration: 0.16 },
              },
            }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 border-t border-[#0F0F10]/10">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * 11. REAL-TIME FINANCIAL TRADING TICKER PRICE FLASH
 * Flashes green on upward bid/valuation movement, red on downward movement,
 * with strict tabular-nums alignment.
 */
interface AnimatedPriceFlashProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatLocale?: string;
}

export const AnimatedPriceFlash: React.FC<AnimatedPriceFlashProps> = ({
  value,
  prefix = "₹",
  suffix = "",
  className = "",
  formatLocale = "en-IN",
}) => {
  const prevValueRef = useRef<number>(value);
  const [flashDirection, setFlashDirection] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      const direction = value > prevValueRef.current ? "up" : "down";
      setFlashDirection(direction);
      prevValueRef.current = value;

      const timer = setTimeout(() => {
        setFlashDirection(null);
      }, 950);

      return () => clearTimeout(timer);
    }
  }, [value]);

  const flashBg =
    flashDirection === "up"
      ? "rgba(16, 185, 129, 0.24)"
      : flashDirection === "down"
      ? "rgba(213, 0, 28, 0.24)"
      : "rgba(0, 0, 0, 0)";

  const flashColor =
    flashDirection === "up"
      ? "#10B981"
      : flashDirection === "down"
      ? "#D5001C"
      : undefined;

  return (
    <motion.span
      key={value}
      initial={{ scale: 1.04 }}
      animate={{
        scale: 1,
        backgroundColor: flashBg,
        color: flashColor,
      }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`inline-block tabular-nums font-mono tracking-tight transition-colors px-1 -mx-1 ${className}`}
    >
      {prefix}
      {value.toLocaleString(formatLocale)}
      {suffix}
    </motion.span>
  );
};
