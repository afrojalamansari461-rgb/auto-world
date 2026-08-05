import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Info, Gauge, Zap, Cog, Calendar, Cpu, Palette, User, Shield, Bike, Activity, Layers, HelpCircle } from "lucide-react";
import { Vehicle } from "../types";
import { CountUp } from "./CountUp";

interface SpecGridProps {
  vehicle: Vehicle;
  columnsClassName?: string;
  isCompact?: boolean;
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

export const SpecGrid: React.FC<SpecGridProps> = ({
  vehicle,
  columnsClassName = "grid-cols-2 sm:grid-cols-3 gap-3",
  isCompact = false
}) => {
  const [hoveredSpecId, setHoveredSpecId] = useState<string | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);

  const isBicycle =
    vehicle.category === "bicycle" ||
    vehicle.fuel?.toLowerCase().includes("human") ||
    vehicle.fuel?.toLowerCase().includes("pedal");

  // Build metrics array based on vehicle category
  const metrics: SpecMetricItem[] = isBicycle
    ? [
        {
          id: "frame_size",
          category: "Frame Size",
          value: vehicle.frameSize || "Standard",
          icon: Bike,
          description: "Chassis height classification tailored to rider body height and posture for ergonomic comfort.",
          badge: "Ergonomics"
        },
        {
          id: "cycle_style",
          category: "Cycle Style",
          value: vehicle.bicycleType || vehicle.make || "Bicycle",
          icon: Layers,
          description: "Specialized bicycle geometry optimized for mountain trails, road endurance, or urban commuting.",
          badge: "Geometry"
        },
        {
          id: "drivetrain",
          category: "Drivetrain / Gears",
          value: vehicle.gears || vehicle.transmission || "Pedal Drive",
          icon: Cog,
          description: "Precision derailleur cassette and gear ratio system regulating pedal cadence efficiency.",
          badge: "Gearing"
        },
        {
          id: "model_year",
          category: "Model Year",
          value: vehicle.year,
          icon: Calendar,
          description: "Original manufacturing and factory release year of the bicycle chassis.",
          badge: "Chassis Vintage"
        },
        ...(vehicle.frameMaterial
          ? [
              {
                id: "frame_material",
                category: "Frame Material",
                value: vehicle.frameMaterial,
                icon: Shield,
                description: "Metallurgical composition (e.g. Aircraft Aluminum, Carbon Composite) determining frame stiffness and weight.",
                badge: "Metallurgy"
              }
            ]
          : []),
        ...(vehicle.brakeType
          ? [
              {
                id: "brake_system",
                category: "Brake System",
                value: vehicle.brakeType,
                icon: Activity,
                description: "Stopping mechanism (Hydraulic Disc, Mechanical V-Brake) providing responsive braking safety.",
                badge: "Safety"
              }
            ]
          : [])
      ]
    : [
        {
          id: "mileage",
          category: "Mileage Run",
          value: <CountUp to={vehicle.mileage} />,
          rawStringValue: `${vehicle.mileage.toLocaleString("en-IN")} km`,
          icon: Gauge,
          description: "Total cumulative distance recorded on the odometer. Lower values indicate minimal mechanical wear.",
          badge: "Odometer Index"
        },
        {
          id: "fuel",
          category: "Power / Fuel Type",
          value: vehicle.fuel,
          icon: Zap,
          description: "Primary energy source powering the drivetrain (Petrol, Diesel, Electric, Hybrid, CNG).",
          badge: "Powertrain"
        },
        {
          id: "transmission",
          category: "Transmission",
          value: vehicle.transmission,
          icon: Cog,
          description: "Gearbox mechanism (Automatic, Manual, DCT, AMT) regulating power transfer to the drive wheels.",
          badge: "Drivetrain"
        },
        {
          id: "year",
          category: "Production Year",
          value: vehicle.year,
          icon: Calendar,
          description: "Original factory assembly and first RTO registration calendar year.",
          badge: "Vintage"
        },
        ...(vehicle.engine
          ? [
              {
                id: "engine",
                category: "Engine / Displacement",
                value: vehicle.engine,
                icon: Cpu,
                description: "Engine cylinder displacement volume in cubic centimeters (cc) or EV battery output in kWh.",
                badge: "Displacement"
              }
            ]
          : []),
        ...(vehicle.color
          ? [
              {
                id: "color",
                category: "Exterior Finish",
                value: vehicle.color,
                icon: Palette,
                description: "Factory original paint code and exterior color finish.",
                badge: "Paintwork"
              }
            ]
          : []),
        ...(vehicle.owners
          ? [
              {
                id: "owners",
                category: "Owner History",
                value: vehicle.owners,
                icon: User,
                description: "Total count of previous legal titleholders recorded on the regional transport registry.",
                badge: "Title Registry"
              }
            ]
          : []),
        ...(vehicle.regNumber
          ? [
              {
                id: "regNumber",
                category: "Registration Plate",
                value: vehicle.regNumber,
                icon: Shield,
                description: "Official RTO state registration license plate ID issued to this vehicle.",
                badge: "Legal Compliance"
              }
            ]
          : [])
      ];

  const activeSpec = metrics.find((m) => m.id === (hoveredSpecId || selectedSpecId)) || null;

  return (
    <div className="space-y-3 font-sans">
      {/* Spec Grid */}
      <div className={`grid ${columnsClassName} text-xs text-stone-800`}>
        {metrics.map((item) => {
          const isHovered = hoveredSpecId === item.id;
          const isSelected = selectedSpecId === item.id;
          const isActive = isHovered || isSelected;

          const IconComponent = item.icon;

          return (
            <motion.div
              key={item.id}
              onClick={() => setSelectedSpecId(isSelected ? null : item.id)}
              onMouseEnter={() => setHoveredSpecId(item.id)}
              onMouseLeave={() => setHoveredSpecId(null)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`relative p-3.5 border transition-all duration-200 cursor-pointer select-none group flex flex-col justify-between ${
                isActive
                  ? "bg-stone-900 text-white border-stone-950 shadow-md ring-2 ring-amber-500/80 z-20"
                  : "bg-[#FAF8F5] text-stone-900 border-stone-300 hover:bg-stone-100 hover:border-stone-800"
              }`}
            >
              {/* Category Header with Icon and Tooltip Badge */}
              <div className="flex items-center justify-between gap-1 pb-1">
                <span
                  className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                    isActive ? "text-amber-400 font-mono" : "text-stone-500 group-hover:text-stone-900"
                  }`}
                >
                  <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-amber-400" : "text-amber-600"}`} />
                  {item.category}
                </span>

                <div className="flex items-center gap-1">
                  {item.badge && (
                    <span
                      className={`text-[8px] font-mono px-1.5 py-0.2 rounded-none uppercase tracking-wider ${
                        isActive ? "bg-amber-400 text-stone-950 font-bold" : "bg-stone-200 text-stone-600 group-hover:bg-stone-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <HelpCircle
                    className={`w-3 h-3 transition-opacity ${
                      isActive ? "text-amber-400 opacity-100" : "text-stone-400 opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </div>
              </div>

              {/* Spec Value */}
              <div className="pt-1">
                <span
                  className={`font-bold block text-sm sm:text-base leading-tight ${
                    isActive ? "text-white font-serif" : "text-stone-950 font-sans"
                  }`}
                >
                  {item.value}
                </span>
              </div>

              {/* Mini Tooltip overlay on desktop when card is hovered */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -bottom-12 left-0 right-0 z-30 p-2 bg-stone-950 text-amber-300 text-[9px] font-mono leading-tight border border-amber-500 shadow-xl pointer-events-none hidden md:block"
                  >
                    <div className="flex items-start gap-1">
                      <Info className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <span>{item.description}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Selected/Hovered Metric Detail Drawer Tooltip Bar */}
      <AnimatePresence mode="wait">
        {activeSpec && (
          <motion.div
            key={activeSpec.id}
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-stone-900 border-2 border-amber-500 text-white font-sans flex items-start gap-3 shadow-md">
              <div className="p-1.5 bg-amber-500 text-stone-950 shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                    SPEC METRIC BREAKDOWN: {activeSpec.category.toUpperCase()}
                  </span>
                  <span className="text-[9px] font-mono text-stone-400 uppercase">
                    Auto World Inspection Standard
                  </span>
                </div>
                <p className="text-xs text-stone-200 leading-relaxed font-medium">
                  {activeSpec.description}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpecGrid;
