import React from "react";
import { X, ShieldCheck, CheckCircle2, Download, Award, FileText, Wrench, Zap, Cpu } from "lucide-react";
import { Vehicle } from "../types";

interface InspectionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

export const InspectionReportModal: React.FC<InspectionReportModalProps> = ({
  isOpen,
  onClose,
  vehicle,
}) => {
  if (!isOpen || !vehicle) return null;

  const categories = [
    {
      title: "Engine, Transmission & Drivetrain",
      score: "100/100",
      icon: Wrench,
      status: "PASSED",
      checks: [
        "Engine compression & cylinder balance verified",
        "Transmission clutch & torque converter smooth engagement",
        "Zero oil seepage / coolant leakage recorded",
        "Exhaust emissions within Bharat Stage VI compliance",
      ],
    },
    {
      title: "Brakes, Tyres & Suspension",
      score: "98/100",
      icon: ShieldCheck,
      status: "PASSED",
      checks: [
        "Brake pad thickness: Front 8.5mm, Rear 8.0mm (85%+ life)",
        "ABS & EBD electronic sensor response optimal",
        "All 4 tyres tread depth > 6.2mm with uniform wear",
        "Shock absorbers & steering rack zero play or noise",
      ],
    },
    {
      title: "Electricals, AC & Battery",
      score: "100/100",
      icon: Zap,
      status: "PASSED",
      checks: [
        "Battery health test: 12.8V output with 98% CCA",
        "Air Conditioning cooling pull-down: 4.2°C at vents",
        "OBD2 scanner diagnostic report: 0 fault codes stored",
        "All exterior LED headlights & interior ambient lighting functional",
      ],
    },
    {
      title: "Bodywork, Frame & Structure",
      score: "96/100",
      icon: Cpu,
      status: "PASSED",
      checks: [
        "Non-accidental chassis: A/B/C pillar geometry 100% factory match",
        "Original paint thickness reading across panels (80-120 microns)",
        "Zero rust or structural corrosion undercarriage inspection",
        "All glass seals & weatherstripping original OEM specification",
      ],
    },
  ];

  const handleDownloadPDF = () => {
    alert(`Downloading AutoWorld 100-Point Inspection Report PDF for AW-${vehicle.id} (${vehicle.title})...`);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-950 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                  100-Point Certification Report
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                  GRADE A+ CERTIFIED
                </span>
              </div>
              <p className="text-xs text-stone-300">
                AW-{vehicle.id} • {vehicle.title} ({vehicle.year})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Summary Score Card */}
          <div className="p-4 bg-gradient-to-br from-emerald-900 to-stone-900 text-white rounded-xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-700/50">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-300 border-2 border-emerald-400 flex items-center justify-center font-extrabold text-xl shrink-0">
                98%
              </div>
              <div>
                <h4 className="text-base font-bold text-white leading-tight">
                  AutoWorld Shield Inspection Passed
                </h4>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Inspected by Certified Master Technicians on {new Date().toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-2 shadow-xs shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Certificate</span>
            </button>
          </div>

          {/* Breakdown Categories */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-stone-600">
              Technical Audit Breakdown
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {categories.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-stone-250 rounded-xl shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h5 className="text-xs sm:text-sm font-bold text-stone-900">
                          {cat.title}
                        </h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-emerald-700">
                          {cat.score}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                          {cat.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-stone-150">
                      {cat.checks.map((check, cIdx) => (
                        <div key={cIdx} className="flex items-start gap-1.5 text-xs text-stone-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{check}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guarantee Footer */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center gap-3">
            <FileText className="w-5 h-5 text-amber-700 shrink-0" />
            <p className="leading-snug">
              Every certified vehicle includes a <strong>7-Day Return Guarantee</strong> and <strong>12-Month Comprehensive Engine & Gearbox Warranty</strong> backed by AutoWorld.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
