import React from "react";
import { Gauge, Zap, Cog, Calendar, Cpu, Palette, User, Shield, Bike, Activity, Layers } from "lucide-react";
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

  return (
    <div className="space-y-3 font-sans">
      {/* Spec Grid */}
      <div className={`grid ${columnsClassName} text-xs text-stone-800`}>
        {metrics.map((item) => {
          const IconComponent = item.icon;

          return (
            <div
              key={item.id}
              className="relative p-3.5 border border-stone-300 bg-[#FAF8F5] text-stone-900 flex flex-col justify-between"
            >
              {/* Category Header with Icon and Badge */}
              <div className="flex items-center justify-between gap-1 pb-1">
                <span className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-stone-500">
                  <IconComponent className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  {item.category}
                </span>

                {item.badge && (
                  <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-none uppercase tracking-wider bg-stone-200 text-stone-600">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Spec Value */}
              <div className="pt-1">
                <span className="font-bold block text-sm sm:text-base leading-tight text-stone-950 font-sans">
                  {item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpecGrid;
