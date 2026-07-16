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
  const [stage, setStage] = useState(0);

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

  useEffect(() => {
    if (!isOpen) return;

    // Play startup sequence chime
    playBeep(440, 0.15, "sawtooth");
    setTimeout(() => playBeep(554, 0.15, "sawtooth"), 100);
    setTimeout(() => playBeep(659, 0.15, "sawtooth"), 200);
    setTimeout(() => playBeep(880, 0.35, "sine"), 300);

    // Dynamic terminal stages loader
    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (percent === 100) {
      setStage(3);
      playBeep(1200, 0.25, "sine");
      setTimeout(() => playBeep(1500, 0.3, "sine"), 80);
    } else if (percent > 65) {
      setStage(2);
    } else if (percent > 30) {
      setStage(1);
    }
  }, [percent]);

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
        className="fixed inset-0 bg-stone-950/98 backdrop-blur-xl z-[999] flex flex-col items-center justify-center p-4 overflow-hidden select-none"
      >
        {/* Animated matrix grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111111_1px,transparent_1px),linear-gradient(to_bottom,#111111_1px,transparent_1px)] bg-[size:32px_32px] opacity-60 pointer-events-none" />
        
        {/* Glowing atmospheric circles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: "2s" }} />

        {/* Center Console Shield Card */}
        <div className="w-full max-w-lg relative z-10 font-mono text-[#F4F1EA]">
          <div className="border border-stone-800 bg-stone-950/80 backdrop-blur-md p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Holographic scanner laser line effect */}
            <motion.div 
              initial={{ top: "-10%" }}
              animate={{ top: "110%" }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-amber-500/30 blur-xs shadow-[0_0_10px_#f59e0b] pointer-events-none"
            />

            {/* Shield and warning icons */}
            <div className="flex flex-col items-center mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 14,
                  mass: 0.9,
                  delay: 0.1,
                }}
                className="w-20 h-20 bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center rounded-full shadow-[0_0_30px_rgba(245,158,11,0.2)] mb-4"
              >
                <ShieldAlert className="w-10 h-10 text-amber-500 animate-pulse" />
              </motion.div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-amber-500">
                SYSTEM ADMINISTRATOR INTENT DETECTED
              </span>
            </div>

            {/* Diagnostic Logs Panel */}
            <div className="space-y-3.5 mb-6 border-y border-stone-800/80 py-4">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-stone-400">AUTHORIZED ADMIN:</span>
                <span className="text-white font-bold font-sans">afrojalamansari461@gmail.com</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-stone-400">ACCESS LEVEL:</span>
                <span className="text-amber-500 font-bold">LEVEL-5 ROOT AUTHORITY</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-stone-400">WORKSPACE SHELL:</span>
                <span className="text-purple-400">CLOUD_RUN_SECURE_INGRESS</span>
              </div>
              
              {/* Dynamic Loading Logs */}
              <div className="bg-stone-900/60 p-3 border border-stone-850/80 rounded-sm text-[9px] font-mono text-stone-300 space-y-1">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-stone-500" />
                  <span>$ autoworld-dossier --init-root-session</span>
                </div>
                <div className="text-stone-400 h-12 overflow-hidden flex flex-col justify-end space-y-0.5 leading-tight">
                  {stage >= 0 && <span className="text-stone-500">Initializing core security handshake... OK</span>}
                  {stage >= 1 && <span className="text-stone-400">Establishing verified Firestore tunnels... READY</span>}
                  {stage >= 2 && <span className="text-purple-400">Binding Level-5 dossier specs override rules... ENFORCED</span>}
                  {stage >= 3 && <span className="text-emerald-400 font-extrabold animate-pulse">ADMIN GRAND ENTRY SEQUENCE INITIATED</span>}
                </div>
              </div>
            </div>

            {/* Centered Grand Greeting Block with Spring Stagger */}
            <AnimatePresence>
              {stage >= 3 && (
                <motion.div
                  initial={{ opacity: 0, filter: "blur(8px)", y: 20 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 16 }}
                  className="text-center space-y-2.5 my-6 p-4 bg-amber-500/5 border border-amber-500/20"
                >
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block bg-amber-500/10 py-1 max-w-xs mx-auto">
                    ✓ SECURE HANDSHAKE COMPLETED
                  </span>
                  
                  {/* Cinematic Welcome Administrator text reveal effect */}
                  <div className="flex justify-center overflow-hidden py-1">
                    <motion.h3 
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                      className="text-lg sm:text-xl font-mono font-black tracking-widest text-amber-500 uppercase whitespace-nowrap border-r-2 border-amber-500 pr-1 animate-pulse"
                      style={{ textShadow: "0 0 10px rgba(245, 158, 11, 0.5)" }}
                    >
                      WELCOME ADMINISTRATOR
                    </motion.h3>
                  </div>

                  <p className="text-[10px] text-stone-400 leading-normal max-w-sm mx-auto uppercase">
                    Operator: afrojalamansari461@gmail.com
                  </p>
                  <p className="text-[9px] text-stone-500 leading-normal max-w-sm mx-auto">
                    Full database editing triggers, hidden specification toggles, and premium override pipelines are decrypted and ready.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slider / Progress percentage */}
            <div className="space-y-1.5 mt-4">
              <div className="flex justify-between items-center text-[10px] font-bold text-stone-400">
                <span>SYSTEM HANDSHAKE PROGRESS</span>
                <span className="font-mono text-white text-xs">
                  <CountUp to={percent} duration={1.5} formatter={(val) => `${val}%`} />
                </span>
              </div>
              <div className="h-1 bg-stone-900 overflow-hidden relative border border-stone-850">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 via-amber-500 to-emerald-500"
                  style={{ width: `${percent}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Interactive Access Trigger */}
            <div className="mt-8">
              <button
                disabled={percent < 100}
                onClick={handleAuthorize}
                className={`w-full py-3.5 font-bold uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
                  percent === 100
                    ? "bg-amber-500 hover:bg-amber-600 text-stone-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                    : "bg-stone-900 text-stone-500 border border-stone-850 cursor-not-allowed"
                }`}
              >
                <Lock className={`w-4 h-4 ${percent === 100 ? "hidden" : "block"}`} />
                {percent === 100 ? (
                  <>
                    <span>DECRYPT BACKOFFICE DOSSIERS</span>
                    <ArrowRight className="w-4 h-4 animate-bounce-horizontal" />
                  </>
                ) : (
                  <span>DECRYPTING CREDENTIALS...</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
