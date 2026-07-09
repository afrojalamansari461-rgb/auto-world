import React, { useState, useEffect, useRef } from "react";
import { Sparkles, CheckCircle, AlertTriangle, RefreshCw, BarChart2, Check, ArrowRight, X, ShieldCheck, AlertCircle, ThumbsUp } from "lucide-react";

interface Correction {
  original: string;
  suggestion: string;
  reason: string;
}

interface KeywordDensity {
  keyword: string;
  count: number;
  percentage: string;
}

interface SEOAnalysis {
  keywordDensity: KeywordDensity[];
  suggestedKeywords: string[];
  optimizedTitle: string;
  optimizedMetaDescription: string;
  structureFeedback: string;
}

interface ListingAIAssistantProps {
  title: string;
  description: string;
  vehicleType: string;
  make: string;
  model: string;
  year?: string;
  fuelType?: string;
  transmission?: string;
  mileage?: string;
  photos?: { src: string; alt: string }[];
  onUpdateTitle: (newTitle: string) => void;
  onUpdateDescription: (newDesc: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function ListingAIAssistant({
  title,
  description,
  vehicleType,
  make,
  model,
  year,
  fuelType,
  transmission,
  mileage,
  photos,
  onUpdateTitle,
  onUpdateDescription,
  showToast
}: ListingAIAssistantProps) {
  // Real-time spellcheck states
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [isSpellchecking, setIsSpellchecking] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // SEO Analysis states
  const [seoResult, setSeoResult] = useState<SEOAnalysis | null>(null);
  const [targetKeywords, setTargetKeywords] = useState("");
  const [isAnalyzingSEO, setIsAnalyzingSEO] = useState(false);

  // Accuracy Verification states
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Active assistant panel tab ("spell" | "seo" | "verify")
  const [activeSubTab, setActiveSubTab] = useState<"spell" | "seo" | "verify">("spell");

  // Real-time spellcheck debouncer
  useEffect(() => {
    if (!description || description.trim().length < 10) {
      setCorrections([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSpellchecking(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/spellcheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: description })
        });
        
        if (!response.ok) {
          throw new Error("Spellcheck query failed");
        }

        const data = await response.json();
        setCorrections(data.corrections || []);
      } catch (err) {
        console.warn("Spelling check error:", err);
      } finally {
        setIsSpellchecking(false);
      }
    }, 1500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [description]);

  // Run SEO Audit
  const handleRunSEOAudit = async () => {
    if (!description || description.trim().length === 0) {
      showToast("Please enter a vehicle description first to run SEO audit.", "error");
      return;
    }

    setIsAnalyzingSEO(true);
    try {
      const response = await fetch("/api/seo-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: description,
          title: title,
          targetKeywords: targetKeywords || `${make} ${model} ${vehicleType}`.trim()
        })
      });

      if (!response.ok) {
        throw new Error("SEO query failed");
      }

      const data = await response.json();
      setSeoResult(data);
      showToast("Successfully completed SEO auditing!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Could not calculate SEO parameters. Please try again.", "error");
    } finally {
      setIsAnalyzingSEO(false);
    }
  };

  // Run Vetting & Accuracy Verification Audit
  const handleRunVerification = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch("/api/verify-car", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make,
          model,
          year,
          description,
          transmission,
          fuelType,
          mileage,
          photosCount: photos ? photos.length : 0,
          photosInfo: photos ? photos.map(p => ({ alt: p.alt })) : []
        })
      });

      if (!response.ok) {
        throw new Error("Verification query failed");
      }

      const data = await response.json();
      setVerificationResult(data);
      showToast("Verification scan completed!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Could not calculate verification parameters. Please try again.", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  // Run verification when switching tab if result not loaded
  useEffect(() => {
    if (activeSubTab === "verify") {
      handleRunVerification();
    }
  }, [activeSubTab, make, model, year, description, transmission, fuelType, mileage, photos?.length]);

  // Apply spelling correction
  const handleApplyCorrection = (original: string, suggestion: string) => {
    // Escape special characters for regex matching
    const escapeRegex = (string: string) => {
      return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
    };

    try {
      const regex = new RegExp(`\\b${escapeRegex(original)}\\b`, "g");
      const updatedDesc = description.replace(regex, suggestion);
      onUpdateDescription(updatedDesc);
      
      // Remove corrected item from lists to avoid stuck states
      setCorrections(prev => prev.filter(c => c.original !== original));
      showToast(`Applied correction: "${suggestion}"`, "success");
    } catch (err) {
      // Fallback simple replace
      const updatedDesc = description.replace(original, suggestion);
      onUpdateDescription(updatedDesc);
      setCorrections(prev => prev.filter(c => c.original !== original));
    }
  };

  // Keyboard accessibility helper for buttons
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div 
      id="listing-ai-assistant-wrapper" 
      className="mt-6 border border-stone-300 bg-[#FAF8F5] p-5 font-sans"
      aria-label="AI Writing and SEO Assistant"
    >
      <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
          <h3 className="text-xs uppercase tracking-widest font-black text-stone-900">AI Writing & SEO Coach</h3>
        </div>
        <div className="flex flex-wrap gap-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "spell"}
            aria-controls="spell-panel"
            id="tab-spell"
            onClick={() => setActiveSubTab("spell")}
            onKeyDown={(e) => handleKeyDown(e, () => setActiveSubTab("spell"))}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
              activeSubTab === "spell"
                ? "bg-stone-900 text-[#F4F1EA] border-stone-900"
                : "bg-[#F4F1EA] text-stone-600 hover:bg-stone-200 border-stone-300"
            }`}
          >
            Spelling & Grammar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "seo"}
            aria-controls="seo-panel"
            id="tab-seo"
            onClick={() => setActiveSubTab("seo")}
            onKeyDown={(e) => handleKeyDown(e, () => setActiveSubTab("seo"))}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
              activeSubTab === "seo"
                ? "bg-stone-900 text-[#F4F1EA] border-stone-900"
                : "bg-[#F4F1EA] text-stone-600 hover:bg-stone-200 border-stone-300"
            }`}
          >
            SEO Optimizer
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "verify"}
            aria-controls="verify-panel"
            id="tab-verify"
            onClick={() => setActiveSubTab("verify")}
            onKeyDown={(e) => handleKeyDown(e, () => setActiveSubTab("verify"))}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
              activeSubTab === "verify"
                ? "bg-stone-900 text-[#F4F1EA] border-stone-900"
                : "bg-[#F4F1EA] text-stone-600 hover:bg-stone-200 border-stone-300"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Accuracy Verifier
          </button>
        </div>
      </div>

      {/* Spellcheck View */}
      {activeSubTab === "spell" && (
        <div 
          id="spell-panel" 
          role="tabpanel" 
          aria-labelledby="tab-spell"
          className="space-y-3"
        >
          <div className="flex justify-between items-center text-[11px] text-stone-500">
            <span>Dynamic grammar checking:</span>
            {isSpellchecking ? (
              <span className="flex items-center gap-1.5 font-mono text-stone-600">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                Scanning content...
              </span>
            ) : description.trim().length >= 10 ? (
              <span className="flex items-center gap-1 font-mono text-emerald-600 font-bold">
                <CheckCircle className="w-3.5 h-3.5" />
                Dossier analysis matches rule templates
              </span>
            ) : (
              <span>Write 10+ characters to begin check</span>
            )}
          </div>

          {corrections.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {corrections.map((item, idx) => (
                <div 
                  key={idx} 
                  className="bg-red-50/70 dark:bg-amber-950/20 border border-red-200/50 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="line-through text-red-650 font-bold bg-red-100/60 px-1 py-0.5 rounded text-[11px]">{item.original}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-emerald-700 font-black bg-emerald-100/60 px-1 py-0.5 rounded text-[11px]">{item.suggestion}</span>
                    </div>
                    <p className="text-[11px] text-stone-600 font-medium leading-tight">{item.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyCorrection(item.original, item.suggestion)}
                    onKeyDown={(e) => handleKeyDown(e, () => handleApplyCorrection(item.original, item.suggestion))}
                    className="px-2.5 py-1.5 bg-emerald-650 hover:bg-emerald-700 text-white font-bold uppercase text-[9px] tracking-widest cursor-pointer whitespace-nowrap"
                    aria-label={`Apply suggestion: replace ${item.original} with ${item.suggestion}`}
                  >
                    Apply Suggestion
                  </button>
                </div>
              ))}
            </div>
          ) : (
            description.trim().length >= 10 && !isSpellchecking && (
              <div className="bg-stone-100/50 p-4 border border-stone-200 text-center">
                <p className="text-[11px] text-stone-550 uppercase tracking-widest font-bold">No issues found. Your listing text is grammatically clear!</p>
              </div>
            )
          )}
        </div>
      )}

      {/* SEO Optimizer View */}
      {activeSubTab === "seo" && (
        <div 
          id="seo-panel" 
          role="tabpanel" 
          aria-labelledby="tab-seo"
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-end gap-3 bg-[#F4F1EA] p-3 border border-stone-300">
            <div className="w-full space-y-1">
              <label htmlFor="target-keywords-input" className="text-[9px] font-black uppercase tracking-widest text-[#555555]">Target SEO Keywords</label>
              <input
                id="target-keywords-input"
                type="text"
                placeholder={`e.g. ${make ? make : 'Tesla'} ${model ? model : 'Model 3'} for sale`}
                value={targetKeywords}
                onChange={(e) => setTargetKeywords(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-stone-300 text-xs text-stone-900"
              />
            </div>
            <button
              type="button"
              disabled={isAnalyzingSEO}
              onClick={handleRunSEOAudit}
              onKeyDown={(e) => handleKeyDown(e, handleRunSEOAudit)}
              className="w-full sm:w-auto px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm transition whitespace-nowrap cursor-pointer"
            >
              {isAnalyzingSEO ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Auditing...
                </>
              ) : (
                <>
                  <BarChart2 className="w-3.5 h-3.5" />
                  Run SEO Audit
                </>
              )}
            </button>
          </div>

          {seoResult ? (
            <div className="space-y-4 border-t border-stone-200 pt-3">
              {/* Density and Suggested Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Density block */}
                <div className="bg-[#F3F4F6]/50 border border-stone-200 p-3 space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-700">Keyword Density Audit</h4>
                  {seoResult.keywordDensity && seoResult.keywordDensity.length > 0 ? (
                    <div className="space-y-1.5">
                      {seoResult.keywordDensity.map((kd, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] font-mono">
                          <span className="font-semibold text-stone-800">{kd.keyword}</span>
                          <span className="text-stone-500">{kd.count} times ({kd.percentage})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-500">No matching keyword density verified.</p>
                  )}
                </div>

                {/* Suggested block */}
                <div className="bg-[#F3F4F6]/50 border border-stone-200 p-3 space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-700">Recommended Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {seoResult.suggestedKeywords && seoResult.suggestedKeywords.map((kw, idx) => (
                      <span 
                        key={idx} 
                        className="bg-[#FAF8F5] border border-stone-300 text-stone-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      >
                        +{kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title & Description suggestions */}
              <div className="space-y-3 bg-[#FAF8F5] border border-stone-200 p-4">
                <div className="space-y-1 lg:space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#555555]">Optimized Meta Title</span>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateTitle(seoResult.optimizedTitle);
                        showToast("Applied recommended SEO title!", "success");
                      }}
                      className="text-[9px] text-[#2563EB] font-bold uppercase tracking-wider hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Check className="w-3 h-3" /> Apply Title
                    </button>
                  </div>
                  <div className="bg-[#F4F1EA] p-2.5 border border-stone-300 text-[11px] font-medium text-stone-800 leading-snug">
                    {seoResult.optimizedTitle}
                  </div>
                </div>

                <div className="space-y-1 lg:space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#555555]">Optimized Meta Description</span>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateDescription(seoResult.optimizedMetaDescription);
                        showToast("Applied recommended SEO description!", "info");
                      }}
                      className="text-[9px] text-[#2563EB] font-bold uppercase tracking-wider hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Check className="w-3 h-3" /> Apply Description
                    </button>
                  </div>
                  <div className="bg-[#F4F1EA] p-2.5 border border-stone-300 text-[11px] font-medium text-stone-800 leading-relaxed">
                    {seoResult.optimizedMetaDescription}
                  </div>
                </div>
              </div>

              {/* Heading Structure Feedback */}
              <div className="bg-[#EFF6FF]/65 dark:bg-stone-900/40 border border-blue-200 p-3.5 space-y-1 text-xs">
                <h4 className="font-bold text-blue-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-blue-600" /> Page Structure & Content Suggestions
                </h4>
                <p className="text-[11px] text-stone-650 leading-relaxed font-semibold">
                  {seoResult.structureFeedback}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-stone-100/50 p-4 border border-stone-200 text-center">
              <p className="text-[11px] text-stone-550 uppercase tracking-widest font-bold">Initiate an SEO audit above to receive keyword scoring recommendations!</p>
            </div>
          )}
        </div>
      )}

      {/* Accuracy Verification View */}
      {activeSubTab === "verify" && (
        <div 
          id="verify-panel" 
          role="tabpanel" 
          aria-labelledby="tab-verify"
          className="space-y-4"
        >
          {isVerifying ? (
            <div className="bg-stone-150 p-6 border border-stone-200 text-center flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
              <p className="text-[11px] text-stone-700 uppercase tracking-widest font-black">AI Automotive Vetting Audit in Progress...</p>
              <p className="text-[10px] text-stone-500 font-mono">Cross-referencing brand chronological timelines, specification matching templates, and upload configurations.</p>
            </div>
          ) : verificationResult ? (
            <div className="space-y-4 border-t border-stone-200 pt-4">
              {/* Overall Score Badge */}
              <div className={`p-4 border flex flex-col md:flex-row items-center justify-between gap-4 ${
                verificationResult.overallStatus === "approved"
                  ? "bg-emerald-50/70 border-emerald-200"
                  : verificationResult.overallStatus === "warning"
                    ? "bg-amber-50/70 border-amber-200"
                    : "bg-red-50/70 border-red-200"
              }`}>
                <div className="space-y-1 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white ${
                      verificationResult.overallStatus === "approved"
                        ? "bg-emerald-650"
                        : verificationResult.overallStatus === "warning"
                          ? "bg-amber-600"
                          : "bg-red-600"
                    }`}>
                      {verificationResult.overallStatus === "approved"
                        ? "Verified Accuracy Approved"
                        : verificationResult.overallStatus === "warning"
                          ? "Discrepancy Warnings Flagged"
                          : "Vetting Check Incomplete"}
                    </span>
                    {verificationResult.fallback && (
                      <span className="bg-stone-250 text-stone-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest font-mono">
                        Rule Engine
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide mt-1">
                    {verificationResult.vettingMessage}
                  </h4>
                </div>
                <div className="flex flex-col items-center justify-center bg-white border border-stone-300 p-3 w-28 shrink-0 shadow-sm">
                  <span className="text-[9px] text-stone-500 uppercase tracking-widest font-bold">Accuracy Score</span>
                  <span className={`text-2xl font-black font-mono leading-none mt-1 ${
                    verificationResult.overallStatus === "approved"
                      ? "text-emerald-700"
                      : verificationResult.overallStatus === "warning"
                        ? "text-amber-600"
                        : "text-red-650"
                  }`}>
                    {verificationResult.accuracyScore}%
                  </span>
                </div>
              </div>

              {/* 1. Name and Production Year Check */}
              <div className="bg-white border border-stone-200 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  {verificationResult.nameCheck.isValid && verificationResult.nameCheck.makeModelMatch ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                      Name & Chronology Verification
                    </h5>
                    <p className="text-[11px] text-stone-600 leading-relaxed font-medium">
                      {verificationResult.nameCheck.details}
                    </p>
                    {verificationResult.nameCheck.suggestedCorrectName && (
                      <div className="text-[10px] text-stone-500 font-mono mt-1">
                        Suggested Name: <strong className="text-stone-800">{verificationResult.nameCheck.suggestedCorrectName}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Specs Consistency Checklist */}
              <div className="bg-white border border-stone-200 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  {verificationResult.infoCheck.isValid ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 w-full">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-stone-900">
                      Specification & Information Integrity
                    </h5>
                    <p className="text-[11px] text-stone-600 leading-relaxed font-medium">
                      {verificationResult.infoCheck.details}
                    </p>

                    {/* Contradictions list if present */}
                    {verificationResult.infoCheck.specInconsistencies && verificationResult.infoCheck.specInconsistencies.length > 0 && (
                      <div className="mt-2 space-y-1 bg-red-50/50 border border-red-105 p-2.5">
                        <span className="text-[9px] font-black text-red-700 uppercase tracking-widest block mb-1">Contradiction Alerts:</span>
                        {verificationResult.infoCheck.specInconsistencies.map((item: string, i: number) => (
                          <div key={i} className="text-[10px] text-red-800 font-semibold flex items-center gap-1">
                            <span className="text-red-500">•</span> {item}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Improvements suggestions list */}
                    {verificationResult.infoCheck.suggestedImprovements && verificationResult.infoCheck.suggestedImprovements.length > 0 && (
                      <div className="mt-2 space-y-1 bg-blue-50/50 border border-blue-105 p-2.5">
                        <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest block mb-1">Suggested Additions to text:</span>
                        {verificationResult.infoCheck.suggestedImprovements.map((item: string, i: number) => (
                          <div key={i} className="text-[10px] text-blue-800 font-medium flex items-center gap-1">
                            <span className="text-blue-500">+</span> {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Image Appropriateness Audit */}
              <div className="bg-white border border-stone-200 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  {verificationResult.imageCheck.isValid && verificationResult.imageCheck.isAppropriate ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-stone-900">
                      Asset Photography & Snapshot Verification
                    </h5>
                    <p className="text-[11px] text-stone-600 leading-relaxed font-medium">
                      {verificationResult.imageCheck.details}
                    </p>
                    {verificationResult.imageCheck.imageSuggestions && verificationResult.imageCheck.imageSuggestions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {verificationResult.imageCheck.imageSuggestions.map((item: string, i: number) => (
                          <div key={i} className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
                            <span className="text-amber-500 font-bold">•</span> {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Re-verify action */}
              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={handleRunVerification}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Re-verify Accuracy
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-stone-100/50 p-4 border border-stone-200 text-center">
              <p className="text-[11px] text-stone-550 uppercase tracking-widest font-bold">Initiate an accuracy scan above to check if your listings name, info, and pictures are accurate.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
