import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, Terminal, Lock, Cpu, Server, Activity, ArrowRight, Volume2 } from "lucide-react";
import { CountUp } from "./CountUp";

interface AdminGrandEntryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminGrandEntry: React.FC<AdminGrandEntryProps> = ({ isOpen, onClose }) => {
  const [percent, setPercent] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);

  // Audio synthesizer helper
  const playBeep = (freq = 800, duration = 0.1, type: OscillatorType = "sine") => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Web Audio API disabled or blocked:", e);
    }
  };

  const logTemplates = [
    "[SYS_READY] INITIALIZING AUTOMOTIVE LEDGER ARCHITECTURE CORE...",
    "[DB_STATE] SECURING WEB AUDIO CHANNELS & AMPLITUDES...",
    "[INDEX_SYNC] CONNECTING DYNAMIC FIRESTORE LISTINGS CHANNELS...",
    "[MEM_ALLOC] ALLOCATING NEON GRID COORDINATES AND POLAR MATRICES...",
    "[MEM_ALLOC] ALLOCATING NEON GRID COORDINATES AND POLAR MATRICES...",
    "[AUTH_OK] USER VERIFIED: LEVEL 5 ROOT AUTHORITY BINDING COMPLETED.",
    "[RENDER_INIT] PREPARING BULK CONTROLS FOR ALL PLATFORM SPECIMENS...",
    "[COMPLETE] BOOT SEQUENCES ALIGNED. ACTIVE SYSTEM MONITORING ARMED."
  ];

  useEffect(() => {
    if (!isOpen) {
      setPercent(0);
      setVisibleLogs([]);
      return;
    }

    // Play startup sequence chime
    playBeep(440, 0.15, "sawtooth");
    setTimeout(() => playBeep(554, 0.15, "sawtooth"), 100);
    setTimeout(() => playBeep(659, 0.15, "sawtooth"), 200);
    setTimeout(() => playBeep(880, 0.35, "sine"), 300);

    // Dynamic terminal logs loader
    let logIdx = 0;
    const logInterval = setInterval(() => {
      if (logIdx < logTemplates.length) {
        setVisibleLogs((prev) => [...prev, logTemplates[logIdx]]);
        playBeep(440 + logIdx * 80, 0.08, "triangle");
        logIdx++;
      } else {
        clearInterval(logInterval);
      }
    }, 350);

    // Dynamic progress bar
    const progressInterval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        const increment = Math.floor(Math.random() * 8) + 4;
        const next = prev + increment;
        if (next >= 100) {
          playBeep(1200, 0.35, "sine");
          return 100;
        }
        playBeep(600 + prev * 3, 0.04, "sine");
        return next;
      });
    }, 120);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
    };
  }, [isOpen]);

  const handleAuthorize = () => {
    // Play final exit chord
    playBeep(900, 0.1, "triangle");
    setTimeout(() => playBeep(1300, 0.1, "triangle"), 70);
    setTimeout(() => playBeep(1700, 0.45, "sine"), 140);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 bg-[#090807] text-[#FAF8F5] z-[999] flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden font-mono"
      >
        {/* Elegant Background Grid & Matrix effects */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.035)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
        
        {/* Continuous scanning line that sweeps vertically */}
        <motion.div 
          animate={{ y: ["-10%", "110%", "-10%"] }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
          className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/80 to-transparent shadow-[0_0_20px_rgba(168,85,247,0.7)] pointer-events-none"
          style={{ top: 0 }}
        />

        {/* Glowing framing borders that pulsate and frame the screen */}
        <div className="absolute inset-4 sm:inset-6 border border-stone-900 pointer-events-none rounded-xs">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-500/50 animate-pulse" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-500/50 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-500/50 animate-pulse" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-500/50 animate-pulse" />
          
          {/* Floating micro indicators on border edges */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
          <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: "1s" }} />
        </div>

        {/* TOP BAR INFORMATION HUD */}
        <div className="flex items-center justify-between w-full z-10 px-4 pt-2">
          <div className="flex items-start gap-3.5 text-stone-500">
            <div className="p-2 border border-stone-800 bg-stone-950/70 rounded-xs flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-500 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-[9px] text-stone-400 font-extrabold uppercase tracking-[0.2em] block">CHRONOMETER</span>
              <span className="text-sm text-purple-400 font-black tracking-widest font-mono">
                {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="text-[8px] text-stone-600 block tracking-wider uppercase font-mono">LATENCY: 12ms // VERIFIED</span>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[9px] text-stone-400 font-extrabold uppercase tracking-[0.2em] block">CONNECTION INGRESS</span>
            <span className="text-xs text-[#FAF8F5] font-black tracking-widest">PORT 3000 // STANDALONE</span>
            <span className="text-[8px] text-stone-600 block tracking-wider uppercase font-mono">PROTOCOLS: ENCRYPTED CRYPTO L5</span>
          </div>
        </div>

        {/* MAIN CENTRAL WORKSPACE CONSOLE */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full z-10 my-4 px-2">
          <div className="border-2 border-purple-500/40 bg-[#0c0a09]/95 p-6 sm:p-8 w-full shadow-[0_0_80px_rgba(168,85,247,0.2)] space-y-6 relative rounded-xs">
            {/* Active target rect lines */}
            <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-purple-500" />
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-purple-500" />
            <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-purple-500" />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-purple-500" />

            {/* Header branding */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] font-black uppercase tracking-[0.2em]">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                CLEARANCE: CERTIFIED OWNER
              </div>
              <p className="text-[9px] text-stone-400 font-bold uppercase tracking-[0.25em] block">
                ESTABLISHING SECURE ADMIN SESSION
              </p>

              {/* Glowing spinning radar gauge */}
              <div className="relative w-20 h-20 mx-auto my-4 flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="absolute inset-0 border-2 border-purple-500/40 border-t-purple-500 border-b-purple-500 rounded-full"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="absolute inset-1.5 border border-purple-500/20 border-l-purple-500/60 border-r-purple-500/60 rounded-full"
                />
                <div className="w-13 h-13 bg-stone-950/90 border border-stone-800 rounded-full flex items-center justify-center relative shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  <ShieldAlert className="w-6 h-6 text-purple-400 animate-pulse" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-widest text-[#FAF8F5] leading-none">
                ADMIN CONTROL DECK
              </h2>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-950/80 border border-purple-500/40 text-purple-200 text-[10px] font-black uppercase tracking-widest rounded-xs">
                SYSTEM OWNER: <span className="text-white font-extrabold bg-purple-900/50 px-1 py-0.5 rounded-xs">AFROJ ALAM</span>
              </div>
            </div>

            {/* Custom terminal console logs display */}
            <div className="bg-[#060505] border border-stone-850 p-3.5 h-28 overflow-y-auto font-mono text-[9px] text-left space-y-1.5 rounded-xs select-text scrollbar-thin">
              {visibleLogs.map((log, idx) => (
                <div key={idx} className="text-stone-300 leading-normal flex items-start gap-1.5 font-mono">
                  <span className="text-purple-500 select-none shrink-0">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
              {percent < 100 && (
                <div className="inline-block w-1.5 h-3 bg-purple-500 animate-pulse" />
              )}
            </div>

            {/* Calibration progress bar */}
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between text-[9px] text-stone-400 font-bold uppercase tracking-wider font-mono">
                <span>SYNCING LEDGER INDEXES</span>
                <span className="text-purple-400 font-black">{Math.min(100, percent)}%</span>
              </div>
              <div className="w-full h-2 bg-[#120f0d] border border-stone-850 p-0.5 rounded-none overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-400 shadow-[0_0_12px_rgba(168,85,247,0.8)] transition-all duration-150 ease-out"
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
            </div>

            {/* Interactive entrance activation button */}
            <div className="pt-2">
              <button
                onClick={handleAuthorize}
                className={`w-full py-3.5 border text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer font-mono flex items-center justify-center gap-2 ${
                  percent >= 100
                    ? "border-purple-500 bg-purple-500/10 hover:bg-purple-500 hover:text-stone-950 text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.3)] active:scale-95"
                    : "border-stone-850 bg-stone-950/40 text-stone-600 cursor-not-allowed"
                }`}
                disabled={percent < 100}
              >
                <span>ENTER WORKSPACE</span>
              </button>
            </div>
          </div>
        </div>

        {/* HUD BOTTOM BAR */}
        <div className="flex items-center justify-between w-full z-10 px-4 pb-2 text-[8px] text-stone-500 font-mono select-none">
          <span className="uppercase">AUTOWORLD PLATFORM ENGINE v2.4 // LEDGER MASTER CONTROLS</span>
          <span className="hidden sm:inline uppercase">SYSTEM INFRASTRUCTURE STATUS: STABLE AND DEPLOYED ON PORT 3000</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
