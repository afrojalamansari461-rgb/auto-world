import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Download,
  Award,
  FileText,
  Wrench,
  Zap,
  Cpu,
} from "lucide-react";
import { Vehicle } from "../types";
import {
  SmoothAccordion,
  modalBackdropVariants,
  modalPanelVariants,
  MagneticButton,
} from "./AnimationWrapper";

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
  const [downloadFeedback, setDownloadFeedback] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow === "hidden" ? "" : originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const categories = [
    {
      title: "01 / Engine, Transmission & Drivetrain",
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
      title: "02 / Brakes, Tyres & Suspension",
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
      title: "03 / Electricals, Climate & Telemetry",
      score: "100/100",
      icon: Zap,
      status: "PASSED",
      checks: [
        "Battery health test: 12.8V output with 98% CCA",
        "Air Conditioning cooling pull-down: 4.2°C at vents",
        "OBD2 scanner diagnostic report: 0 fault codes stored",
        "All exterior matrix LEDs & cockpit switchgear functional",
      ],
    },
    {
      title: "04 / Bodywork, Chassis Frame & Metallurgy",
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
    setDownloadFeedback(true);
    setTimeout(() => setDownloadFeedback(false), 3000);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && vehicle && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop Blur Transition: 0px -> 4px */}
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-[#0F0F10]/80"
          />

          {/* Modal Panel Physics */}
          <motion.div
            variants={modalPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 bg-[#F6F5F2] border-2 border-[#0F0F10] w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 bg-[#0F0F10] text-[#F6F5F2] flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-[#D5001C] text-white flex items-center justify-center font-bold shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-serif font-extrabold uppercase tracking-tight text-white">
                      100-Point Technical Certification
                    </h3>
                    <span className="px-2 py-0.5 bg-white/10 text-white border border-white/20 text-[9px] font-mono font-bold uppercase tracking-[0.18em]">
                      GRADE A+ CERTIFIED
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-stone-400 uppercase tracking-wider mt-0.5 tabular-nums">
                    REF AW-{vehicle.id} • {vehicle.title} ({vehicle.year})
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                aria-label="Close inspection report"
                className="w-9 h-9 bg-white/10 hover:bg-[#D5001C] text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Content Body with Smooth Height-Animating Accordions */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {/* Summary Score Card */}
              <div className="p-5 bg-[#0F0F10] text-[#F6F5F2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#0F0F10]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white text-[#0F0F10] flex items-center justify-center font-mono font-extrabold text-xl shrink-0 tabular-nums">
                    98%
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#D5001C] font-bold block">
                      MASTER TECHNICIAN AUDIT
                    </span>
                    <h4 className="text-base font-serif font-extrabold text-white uppercase tracking-tight">
                      Mechanical &amp; Structural Clearance Passed
                    </h4>
                    <p className="text-[11px] font-mono text-stone-400 mt-0.5 tabular-nums">
                      INSPECTED ON {new Date().toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>

                <MagneticButton
                  onClick={handleDownloadPDF}
                  magneticStrength={0.08}
                  className="px-4 py-3 bg-[#D5001C] hover:bg-[#b80018] text-white text-[11px] font-sans font-extrabold uppercase tracking-[0.16em] transition-colors cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadFeedback ? "Dossier Queued" : "Export PDF Dossier"}</span>
                </MagneticButton>
              </div>

              {/* Smooth Height-Animating Accordions for Audit Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-mono font-extrabold uppercase tracking-[0.22em] text-stone-500">
                    TECHNICAL AUDIT BREAKDOWN (EXPANDABLE MODULES)
                  </h4>
                  <span className="text-[10px] font-mono text-stone-500 tabular-nums">
                    4 / 4 PASSED
                  </span>
                </div>

                <div className="space-y-2.5">
                  {categories.map((cat, idx) => {
                    const Icon = cat.icon;
                    return (
                      <SmoothAccordion
                        key={idx}
                        defaultOpen={idx === 0 || idx === 1}
                        title={
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-[#0F0F10] shrink-0" />
                            <span className="text-xs sm:text-sm font-serif font-extrabold uppercase tracking-tight text-[#0F0F10]">
                              {cat.title}
                            </span>
                          </div>
                        }
                        badge={
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-[11px] font-mono font-extrabold text-[#0F0F10] tabular-nums">
                              {cat.score}
                            </span>
                            <span className="px-2 py-0.5 bg-[#0F0F10] text-[#F6F5F2] text-[9px] font-mono font-bold uppercase tracking-wider">
                              {cat.status}
                            </span>
                          </div>
                        }
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                          {cat.checks.map((check, cIdx) => (
                            <div
                              key={cIdx}
                              className="flex items-start gap-2 text-xs text-stone-700 font-sans"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0F0F10] shrink-0 mt-0.5" />
                              <span>{check}</span>
                            </div>
                          ))}
                        </div>
                      </SmoothAccordion>
                    );
                  })}
                </div>
              </div>

              {/* Guarantee Footer */}
              <div className="p-4 bg-white border border-[#0F0F10]/20 text-xs text-[#0F0F10] flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#D5001C] shrink-0" />
                <p className="leading-relaxed">
                  Every certified vehicle includes a{" "}
                  <strong>7-Day Return Mandate</strong> and{" "}
                  <strong>12-Month Comprehensive Powertrain Warranty</strong> backed by
                  AutoWorld.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
