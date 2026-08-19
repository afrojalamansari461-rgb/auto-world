import React, { useState } from "react";
import { 
  CheckCircle2, AlertCircle, Search, ExternalLink, Link2, 
  Car, Sliders, ShieldCheck, Sparkles, Filter, Check, Eye
} from "lucide-react";
import { Part, Vehicle, DEFAULT_VEHICLES, COMMON_ENGINE_CODES, COMMON_CHASSIS_CODES } from "../../types";

interface VehicleCrossLinkingMatrixProps {
  parts: Part[];
  vehicles?: Vehicle[];
  onOpenPartDossier: (part: Part, tab?: "overview" | "specs" | "control") => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function VehicleCrossLinkingMatrix({
  parts,
  vehicles = DEFAULT_VEHICLES,
  onOpenPartDossier,
  showToast
}: VehicleCrossLinkingMatrixProps) {
  const [selectedEngine, setSelectedEngine] = useState<string>("all");
  const [selectedChassis, setSelectedChassis] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [selectedCarFilter, setSelectedCarFilter] = useState<string>("all");

  // Helper to test if a part matches a vehicle
  const getCompatibilityScore = (part: Part, vehicle: Vehicle): { score: number; matchReason: string; isBoltOn: boolean } => {
    let score = 0;
    const reasons: string[] = [];

    const partText = `${part.title} ${part.compatibleVehicles} ${(part.engineCodes || []).join(" ")} ${(part.chassisCodes || []).join(" ")}`.toLowerCase();
    const vehicleText = `${vehicle.make} ${vehicle.model} ${vehicle.engine || ""} ${vehicle.title}`.toLowerCase();

    // Check engine match
    if (part.engineCodes && part.engineCodes.length > 0) {
      for (const code of part.engineCodes) {
        const cleanCode = code.split(" ")[0].toLowerCase();
        if (vehicleText.includes(cleanCode)) {
          score += 50;
          reasons.push(`Engine Code Match: ${code}`);
          break;
        }
      }
    }

    // Check chassis code match
    if (part.chassisCodes && part.chassisCodes.length > 0) {
      for (const code of part.chassisCodes) {
        const cleanChassis = code.split(" ")[0].toLowerCase();
        if (vehicleText.includes(cleanChassis) || vehicle.model.toLowerCase().includes(cleanChassis)) {
          score += 40;
          reasons.push(`Chassis Code Match: ${code}`);
          break;
        }
      }
    }

    // Check direct model / make mention in fitment text
    if (partText.includes(vehicle.make.toLowerCase()) || (vehicle.model && partText.includes(vehicle.model.toLowerCase()))) {
      score += 30;
      reasons.push(`Model Match: ${vehicle.make} ${vehicle.model}`);
    }

    // Cap score at 100
    const finalScore = Math.min(100, score);
    const isBoltOn = finalScore >= 60;
    const matchReason = reasons.length > 0 ? reasons.join(" • ") : "Universal / Custom Bracket Required";

    return { score: finalScore, matchReason, isBoltOn };
  };

  const filteredParts = parts.filter(p => {
    if (selectedEngine !== "all" && !(p.engineCodes || []).includes(selectedEngine)) return false;
    if (selectedChassis !== "all" && !(p.chassisCodes || []).includes(selectedChassis)) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const match = p.title.toLowerCase().includes(q) || 
        p.brand.toLowerCase().includes(q) || 
        p.compatibleVehicles.toLowerCase().includes(q) ||
        (p.engineCodes || []).some(e => e.toLowerCase().includes(q)) ||
        (p.chassisCodes || []).some(c => c.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const activeVehicles = vehicles.filter(v => {
    if (selectedCarFilter !== "all" && String(v.id) !== selectedCarFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-stone-900 text-stone-100 p-5 rounded-lg border-2 border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-400 text-stone-950 rounded">
              Auto World Matrix
            </span>
            <h2 className="text-lg font-serif font-black tracking-tight text-white uppercase">
              Compatibility & Vehicle Cross-Linking Matrix
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl font-sans">
            Automatically link high-performance parts to vehicles in stock based on engine and chassis code architecture.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-amber-400 bg-stone-950 px-3 py-2 rounded border border-stone-800 shrink-0">
          <Link2 className="w-4 h-4 text-amber-400" />
          <span>Active Cross-Matches: <strong>{filteredParts.length * activeVehicles.length} Pairs</strong></span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-stone-300 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Text Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search engine code, chassis, part..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded text-xs focus:border-stone-900 outline-none"
            />
          </div>

          {/* Engine Code Filter */}
          <div>
            <select
              value={selectedEngine}
              onChange={(e) => setSelectedEngine(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded text-xs focus:border-stone-900 outline-none"
            >
              <option value="all">All Engine Architectures</option>
              {COMMON_ENGINE_CODES.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Chassis Code Filter */}
          <div>
            <select
              value={selectedChassis}
              onChange={(e) => setSelectedChassis(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded text-xs focus:border-stone-900 outline-none"
            >
              <option value="all">All Chassis Platforms</option>
              {COMMON_CHASSIS_CODES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Vehicle Match Target */}
          <div>
            <select
              value={selectedCarFilter}
              onChange={(e) => setSelectedCarFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded text-xs focus:border-stone-900 outline-none"
            >
              <option value="all">Match All Vehicles ({vehicles.length})</option>
              {vehicles.map(v => (
                <option key={v.id} value={String(v.id)}>{v.make} {v.model} ({v.year})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Tag Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-stone-200 text-[11px] font-mono">
          <span className="text-stone-500 font-bold uppercase text-[10px]">Popular Platforms:</span>
          {["B58 3.0L Turbo", "EA888 Gen 3/4", "2.2L mHawk Diesel", "2JZ-GTE", "G80 / G82 M3", "MQB Platform", "Thar Gen-2 4x4"].map(tag => (
            <button
              key={tag}
              onClick={() => {
                if (COMMON_ENGINE_CODES.includes(tag)) {
                  setSelectedEngine(selectedEngine === tag ? "all" : tag);
                } else if (COMMON_CHASSIS_CODES.includes(tag)) {
                  setSelectedChassis(selectedChassis === tag ? "all" : tag);
                } else {
                  setSearchFilter(searchFilter === tag ? "" : tag);
                }
              }}
              className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                selectedEngine === tag || selectedChassis === tag || searchFilter === tag
                  ? "bg-amber-400 text-stone-950 font-bold border-amber-500"
                  : "bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300"
              }`}
            >
              {tag}
            </button>
          ))}
          {(selectedEngine !== "all" || selectedChassis !== "all" || searchFilter || selectedCarFilter !== "all") && (
            <button
              onClick={() => {
                setSelectedEngine("all");
                setSelectedChassis("all");
                setSearchFilter("");
                setSelectedCarFilter("all");
              }}
              className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded border border-red-300 ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Cross-Linking Table & Cards */}
      <div className="space-y-4">
        {filteredParts.map(part => {
          return (
            <div key={part.id} className="bg-white rounded-lg border border-stone-300 shadow-sm overflow-hidden">
              {/* Part Header Bar */}
              <div className="p-4 bg-[#FAF8F5] border-b border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={part.image || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800"}
                    alt={part.title}
                    className="w-12 h-12 rounded object-cover border border-stone-300 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded uppercase">
                        {part.brand}
                      </span>
                      <span className="text-xs font-mono font-bold text-stone-500">
                        REF #{part.partNumber || `PART-AW0${part.id}`}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-stone-950 font-serif">
                      {part.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-stone-500 block">PRICE</span>
                    <strong className="text-xs text-stone-900">₹{part.price.toLocaleString("en-IN")}</strong>
                  </div>
                  <button
                    onClick={() => onOpenPartDossier(part, "specs")}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded text-xs font-mono font-bold uppercase cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3 text-amber-400" />
                    Inspect Specs
                  </button>
                </div>
              </div>

              {/* Tag Architecture Badges */}
              <div className="p-4 bg-white border-b border-stone-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block mb-1.5">
                    Engine Code Fitment:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {part.engineCodes && part.engineCodes.length > 0 ? (
                      part.engineCodes.map(e => (
                        <span key={e} className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[11px] font-mono font-semibold">
                          🔧 {e}
                        </span>
                      ))
                    ) : (
                      <span className="text-stone-400 font-mono text-[11px]">Universal / Not specified</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block mb-1.5">
                    Chassis Platform Fitment:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {part.chassisCodes && part.chassisCodes.length > 0 ? (
                      part.chassisCodes.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-mono font-semibold">
                          🚗 {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-stone-400 font-mono text-[11px]">Universal Fit</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Inventory Cross-Match Matrix */}
              <div className="p-4 bg-[#FCFBF9]">
                <span className="text-[10px] font-mono font-bold uppercase text-stone-600 block mb-2">
                  Matching Marketplace Showroom Inventory ({activeVehicles.length} vehicles checked):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeVehicles.map(vehicle => {
                    const { score, matchReason, isBoltOn } = getCompatibilityScore(part, vehicle);
                    return (
                      <div 
                        key={vehicle.id} 
                        className={`p-3 rounded border transition ${
                          isBoltOn 
                            ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200" 
                            : score > 0 
                            ? "bg-amber-50/40 border-amber-200" 
                            : "bg-white border-stone-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-stone-900 font-serif">
                                {vehicle.make} {vehicle.model}
                              </span>
                              <span className="text-[10px] font-mono text-stone-500">
                                {vehicle.year}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-600 font-mono block mt-0.5">
                              {vehicle.engine || "Standard Powertrain"}
                            </span>
                          </div>

                          <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                            score >= 60 
                              ? "bg-emerald-600 text-white" 
                              : score > 0 
                              ? "bg-amber-500 text-white" 
                              : "bg-stone-200 text-stone-700"
                          }`}>
                            {score}% Match
                          </span>
                        </div>

                        <div className="mt-2 text-[10px] font-mono flex items-center justify-between text-stone-600 border-t border-stone-200/60 pt-1.5">
                          <span className="truncate max-w-[180px]" title={matchReason}>
                            {matchReason}
                          </span>
                          <button
                            onClick={() => {
                              showToast(`Linked ${part.title} to ${vehicle.make} ${vehicle.model}!`, "success");
                            }}
                            className="text-stone-900 hover:text-amber-600 font-bold uppercase flex items-center gap-0.5 cursor-pointer ml-1"
                          >
                            <Link2 className="w-3 h-3" />
                            Link
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {filteredParts.length === 0 && (
          <div className="p-8 text-center bg-white rounded-lg border border-stone-300">
            <AlertCircle className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-stone-800">No performance hardware matches this engine or chassis platform.</p>
            <p className="text-xs text-stone-500 mt-1">Try resetting the search filters above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
