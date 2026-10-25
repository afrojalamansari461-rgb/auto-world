import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gauge,
  Zap,
  Cog,
  Calendar,
  Cpu,
  Palette,
  User,
  Shield,
  Bike,
  Activity,
  Layers,
  ChevronDown,
} from "lucide-react";
import { Vehicle } from "../types";
import { CountUp } from "./CountUp";
import { SmoothAccordion, EDITORIAL_EASE } from "./AnimationWrapper";

interface SpecGridProps {
  vehicle: Vehicle;
  columnsClassName?: string;
  isCompact?: boolean;
  animated?: boolean;
  delayChildren?: number;
}

export interface SpecMetricItem {
  id: string;
  category: string;
  value: React.ReactNode;
  rawStringValue?: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: (delay: number = 0.12) => ({
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: delay,
    },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export const SpecGrid: React.FC<SpecGridProps> = ({
  vehicle,
  columnsClassName = "grid-cols-2 sm:grid-cols-3 gap-3",
  isCompact = false,
  animated = true,
  delayChildren = 0.12,
}) => {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const isBicycle =
    vehicle.category === "bicycle" ||
    vehicle.fuel?.toLowerCase().includes("human") ||
    vehicle.fuel?.toLowerCase().includes("pedal");

  const metrics: SpecMetricItem[] = isBicycle
    ? [
        {
          id: "frame_size",
          category: "Frame Size",
          value: vehicle.frameSize || "Standard",
          icon: Bike,
          description:
            "Chassis height classification tailored to rider body height and posture for ergonomic comfort.",
          badge: "Ergonomics",
        },
        {
          id: "cycle_style",
          category: "Cycle Style",
          value: vehicle.bicycleType || vehicle.make || "Bicycle",
          icon: Layers,
          description:
            "Specialized bicycle geometry optimized for mountain trails, road endurance, or urban commuting.",
          badge: "Geometry",
        },
        {
          id: "drivetrain",
          category: "Drivetrain / Gears",
          value: vehicle.gears || vehicle.transmission || "Pedal Drive",
          icon: Cog,
          description:
            "Precision derailleur cassette and gear ratio system regulating pedal cadence efficiency.",
          badge: "Gearing",
        },
        {
          id: "model_year",
          category: "Model Year",
          value: vehicle.year,
          icon: Calendar,
          description: "Original manufacturing and factory release year of the bicycle chassis.",
          badge: "Chassis Vintage",
        },
        ...(vehicle.frameMaterial
          ? [
              {
                id: "frame_material",
                category: "Frame Material",
                value: vehicle.frameMaterial,
                icon: Shield,
                description:
                  "Metallurgical composition determining frame stiffness and weight.",
                badge: "Metallurgy",
              },
            ]
          : []),
        ...(vehicle.brakeType
          ? [
              {
                id: "brake_system",
                category: "Brake System",
                value: vehicle.brakeType,
                icon: Activity,
                description:
                  "Stopping mechanism providing responsive braking safety.",
                badge: "Safety",
              },
            ]
          : []),
      ]
    : [
        {
          id: "mileage",
          category: "Mileage Run",
          value: <CountUp to={vehicle.mileage} />,
          rawStringValue: `${vehicle.mileage.toLocaleString("en-IN")} km`,
          icon: Gauge,
          description:
            "Total cumulative distance recorded on the odometer. Verified against authorized service intervals.",
          badge: "Odometer Index",
        },
        {
          id: "fuel",
          category: "Power / Fuel Type",
          value: vehicle.fuel,
          icon: Zap,
          description:
            "Primary energy source powering the drivetrain (Petrol, Diesel, Electric, Hybrid, CNG).",
          badge: "Powertrain",
        },
        {
          id: "transmission",
          category: "Transmission",
          value: vehicle.transmission,
          icon: Cog,
          description:
            "Gearbox mechanism regulating torque and power transfer to the drive wheels.",
          badge: "Drivetrain",
        },
        {
          id: "year",
          category: "Production Year",
          value: vehicle.year,
          icon: Calendar,
          description:
            "Original factory assembly and first RTO registration calendar year.",
          badge: "Vintage",
        },
        ...(vehicle.engine
          ? [
              {
                id: "engine",
                category: "Engine / Displacement",
                value: vehicle.engine,
                icon: Cpu,
                description:
                  "Engine cylinder displacement volume in cubic centimeters (cc) or EV battery output in kWh.",
                badge: "Displacement",
              },
            ]
          : []),
        ...(vehicle.color
          ? [
              {
                id: "color",
                category: "Exterior Finish",
                value: vehicle.color,
                icon: Palette,
                description:
                  "Factory original paint code and exterior color finish inspected by micron gauge.",
                badge: "Paintwork",
              },
            ]
          : []),
        ...(vehicle.owners
          ? [
              {
                id: "owners",
                category: "Owner History",
                value: vehicle.owners,
                icon: User,
                description:
                  "Total count of previous legal titleholders recorded on the regional transport registry.",
                badge: "Title Registry",
              },
            ]
          : []),
        ...(vehicle.regNumber
          ? [
              {
                id: "regNumber",
                category: "Registration Plate",
                value: vehicle.regNumber,
                icon: Shield,
                description:
                  "Official RTO state registration license plate ID issued to this vehicle.",
                badge: "Legal Compliance",
              },
            ]
          : []),
      ];

  const Container = animated ? motion.div : "div";
  const Item = animated ? motion.div : "div";

  const gridContent = (
    <Container
      variants={animated ? containerVariants : undefined}
      initial={animated ? "hidden" : undefined}
      animate={animated ? "show" : undefined}
      custom={delayChildren}
      className={`grid ${columnsClassName} text-xs text-[#0F0F10]`}
    >
      {metrics.map((item) => {
        const IconComponent = item.icon;
        const isExpanded = expandedItemId === item.id;

        return (
          <Item
            key={item.id}
            variants={animated ? itemVariants : undefined}
            onClick={() =>
              setExpandedItemId((prev) => (prev === item.id ? null : item.id))
            }
            className="relative p-3.5 border border-[#0F0F10]/15 hover:border-[#0F0F10] bg-white text-[#0F0F10] flex flex-col justify-between transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center justify-between gap-1 pb-1">
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.16em] flex items-center gap-1.5 text-stone-500">
                <IconComponent className="w-3.5 h-3.5 shrink-0 text-[#0F0F10]" />
                {item.category}
              </span>

              <div className="flex items-center gap-1">
                {item.badge && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 uppercase tracking-wider bg-[#F6F5F2] text-stone-600 border border-[#0F0F10]/10">
                    {item.badge}
                  </span>
                )}
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-stone-400"
                >
                  <ChevronDown className="w-3 h-3" />
                </motion.span>
              </div>
            </div>

            <div className="pt-1">
              <span className="font-extrabold block text-sm sm:text-base leading-tight text-[#0F0F10] font-mono tabular-nums">
                {item.value}
              </span>
            </div>

            {/* Smooth Height-Animating Micro-Accordion for Telemetry Notes */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: {
                      height: { duration: 0.26, ease: EDITORIAL_EASE },
                      opacity: { duration: 0.2, delay: 0.04 },
                    },
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: {
                      height: { duration: 0.2, ease: [0.4, 0, 1, 1] },
                      opacity: { duration: 0.12 },
                    },
                  }}
                  className="overflow-hidden"
                >
                  <p className="mt-2.5 pt-2 border-t border-[#0F0F10]/10 text-[10px] leading-relaxed text-stone-600 font-sans">
                    {item.description}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Item>
        );
      })}
    </Container>
  );

  if (isCompact) {
    return <div className="space-y-3 font-sans">{gridContent}</div>;
  }

  return (
    <SmoothAccordion
      title={
        <span className="text-xs font-mono font-extrabold uppercase tracking-[0.2em] text-[#0F0F10]">
          MECHANICAL &amp; CHASSIS TELEMETRY MATRIX
        </span>
      }
      subtitle="Click any specification cell to expand technical verification notes"
      badge={
        <span className="px-2 py-0.5 bg-[#0F0F10] text-[#F6F5F2] text-[9px] font-mono uppercase tracking-widest">
          {metrics.length} METRICS
        </span>
      }
      defaultOpen={true}
    >
      {gridContent}
    </SmoothAccordion>
  );
};

export default SpecGrid;
