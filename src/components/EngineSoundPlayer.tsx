import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Flame,
  Gauge,
  Sparkles,
  Radio,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { engineAudio, AudioPlaybackState, ENGINE_PRESETS } from "../lib/engineAudio";

interface EngineSoundPlayerProps {
  soundUrl?: string;
  soundTitle?: string;
  soundType?: string;
  vehicleTitle?: string;
  className?: string;
  variant?: "banner" | "compact" | "full";
  autoExpand?: boolean;
}

export const EngineSoundPlayer: React.FC<EngineSoundPlayerProps> = ({
  soundUrl,
  soundTitle,
  soundType,
  vehicleTitle,
  className = "",
  variant = "banner",
  autoExpand = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 10,
    rpm: 900,
    frequencyData: new Uint8Array(16)
  });
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isRevving, setIsRevving] = useState(false);
  const revTimeoutRef = useRef<number | null>(null);

  // If no sound is configured, render nothing (strictly respects user request)
  if (!soundUrl) {
    return null;
  }

  // Subscribe to audio engine updates
  useEffect(() => {
    const unsubscribe = engineAudio.subscribe((state) => {
      setPlaybackState(state);
      setIsPlaying(state.isPlaying);
    });

    return () => {
      unsubscribe();
      // Ensure audio stops if component unmounts
      engineAudio.stop();
    };
  }, []);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      engineAudio.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (!isExpanded && variant === "banner") {
        setIsExpanded(true);
      }
      await engineAudio.play(soundUrl, soundType);
    }
  };

  const handleRevThrottle = () => {
    setIsRevving(true);
    engineAudio.rev(0.85);

    if (revTimeoutRef.current) {
      window.clearTimeout(revTimeoutRef.current);
    }

    revTimeoutRef.current = window.setTimeout(() => {
      setIsRevving(false);
    }, 450);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    engineAudio.setVolume(val);
    if (isMuted && val > 0) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    const muted = engineAudio.toggleMute();
    setIsMuted(muted);
  };

  // Find preset metadata if applicable
  const matchedPreset = ENGINE_PRESETS.find(p => p.id === soundUrl || p.category === soundType);
  const displayTitle = soundTitle || matchedPreset?.name || "Authentic Engine & Exhaust Note";
  const displayConfig = matchedPreset?.cylinderConfig || (soundType ? soundType.toUpperCase() : "Acoustic Audio");

  // Calculate RPM percentage for gauge
  const maxDisplayRpm = matchedPreset?.maxRpm || 8000;
  const currentRpm = playbackState.rpm || (isPlaying ? 900 : 0);
  const rpmPercent = Math.min(100, Math.max(0, (currentRpm / maxDisplayRpm) * 100));

  return (
    <div
      id="engine-sound-player-container"
      className={`bg-stone-900 border-2 border-stone-800 text-[#F4F1EA] overflow-hidden shadow-lg transition-all ${className}`}
    >
      {/* Top Banner Row */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 space-y-3">
        <div className="flex items-start justify-between gap-3 min-w-0">
          {/* Play/Stop button and Title info */}
          <div className="flex items-start gap-3 min-w-0 flex-1 overflow-hidden">
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? "Stop engine sound" : "Listen to engine sound"}
              className={`w-11 h-11 shrink-0 flex items-center justify-center border text-stone-950 cursor-pointer font-bold transition-all shadow-sm mt-0.5 ${
                isPlaying
                  ? "bg-amber-400 border-amber-300 hover:bg-amber-350 scale-105"
                  : "bg-[#F4F1EA] border-stone-300 hover:bg-amber-400 hover:border-amber-300"
              }`}
            >
              {isPlaying ? (
                <Square className="w-4 h-4 fill-stone-950 text-stone-950" />
              ) : (
                <Play className="w-4 h-4 fill-stone-950 text-stone-950 ml-0.5" />
              )}
            </button>

            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Radio className={`w-2.5 h-2.5 ${isPlaying ? "animate-pulse text-amber-300" : ""}`} />
                  Acoustic Exhaust Profile
                </span>
                {displayConfig && (
                  <span className="text-[9px] font-mono text-stone-400 uppercase shrink-0 truncate max-w-[120px]">
                    [{displayConfig}]
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-2 flex-wrap min-w-0">
                <h4 className="text-xs sm:text-sm font-sans font-bold text-stone-100 tracking-tight leading-snug break-words overflow-hidden text-ellipsis line-clamp-2">
                  {displayTitle}
                </h4>
                {isPlaying && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono text-[8px] uppercase tracking-widest font-bold animate-pulse shrink-0">
                    LIVE AUDIO
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Expand Details Toggle (Always top-right) */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label="Toggle acoustic engine dashboard"
            className="p-2 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white border border-stone-700 cursor-pointer shrink-0 flex items-center gap-1.5 text-[10px] font-mono"
          >
            <span className="hidden sm:inline font-bold">{isExpanded ? "Close" : "Cockpit"}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Action Controls Toolbar Row */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800/80 flex-wrap">
          {/* Animated Equalizer Waves */}
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5 h-6 px-2 py-1 bg-stone-950 border border-stone-800 rounded-xs">
              {[35, 75, 45, 90, 60, 100, 50, 80, 40].map((height, i) => {
                const freqVal = playbackState.frequencyData[i % playbackState.frequencyData.length] || 0;
                const barHeight = isPlaying ? Math.max(15, (freqVal / 255) * 100) : 15;
                return (
                  <motion.div
                    key={i}
                    animate={{ height: `${barHeight}%` }}
                    transition={{ duration: 0.08 }}
                    className={`w-1 rounded-xs transition-colors ${
                      isPlaying
                        ? i % 3 === 0
                          ? "bg-amber-400"
                          : i % 2 === 0
                          ? "bg-amber-500"
                          : "bg-amber-300"
                        : "bg-stone-700"
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-[9px] font-mono text-stone-400 uppercase hidden sm:inline">
              {isPlaying ? "Live Frequency" : "Audio Standby"}
            </span>
          </div>

          {/* Quick Rev Button */}
          <button
            type="button"
            onClick={handleRevThrottle}
            disabled={!isPlaying}
            className={`px-3.5 py-1.5 text-[10px] font-mono font-extrabold uppercase tracking-wider flex items-center gap-1.5 border transition cursor-pointer shrink-0 ${
              isPlaying
                ? isRevving
                  ? "bg-amber-400 text-stone-950 border-amber-300 scale-95"
                  : "bg-stone-800 hover:bg-stone-750 text-amber-400 border-amber-500/40 hover:border-amber-400"
                : "bg-stone-950/60 text-stone-600 border-stone-800 cursor-not-allowed"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 shrink-0 ${isPlaying ? "text-amber-400" : "text-stone-600"} ${isRevving ? "animate-bounce" : ""}`} />
            <span>Rev Throttle</span>
          </button>
        </div>
      </div>

      {/* Expanded Interactive Cockpit Console */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="border-t border-stone-800 bg-stone-950 p-3 sm:p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tachometer / RPM Live Gauge */}
              <div className="bg-stone-900 border border-stone-800 p-3 flex flex-col justify-between min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-1 text-[10px] font-mono uppercase text-stone-400 pb-2 border-b border-stone-800 min-w-0">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold tracking-wider shrink-0">
                    <Gauge className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Tachometer</span>
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] font-mono text-stone-400 shrink-0">
                    Max: {maxDisplayRpm.toLocaleString()} RPM
                  </span>
                </div>

                <div className="py-3 flex flex-col items-center justify-center text-center min-w-0 overflow-hidden">
                  <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 tracking-tight flex items-baseline gap-1">
                    <span>{currentRpm.toLocaleString()}</span>
                    <span className="text-xs text-stone-400 font-normal">RPM</span>
                  </div>
                  <span className="text-[9px] sm:text-[9.5px] font-mono uppercase tracking-wider text-stone-300 mt-1 px-2 py-0.5 bg-stone-950/80 border border-stone-800 max-w-full truncate">
                    {currentRpm > 4500 ? "🔥 High-RPM Surge" : currentRpm > 2000 ? "⚡ Acceleration Spool" : isPlaying ? "✓ Stable Idle Rumbling" : "Engine Off"}
                  </span>
                </div>

                {/* Linear RPM Gauge Progress Bar */}
                <div className="w-full bg-stone-950 h-2.5 border border-stone-800 overflow-hidden relative">
                  <motion.div
                    className={`h-full transition-all duration-75 ${
                      rpmPercent > 80 ? "bg-red-500" : rpmPercent > 50 ? "bg-amber-400" : "bg-emerald-500"
                    }`}
                    style={{ width: `${rpmPercent}%` }}
                  />
                </div>
              </div>

              {/* Interactive Gas Pedal & Audio Controls */}
              <div className="bg-stone-900 border border-stone-800 p-3 flex flex-col justify-between min-w-0 space-y-3 overflow-hidden">
                <div className="flex items-center justify-between gap-1 text-[10px] font-mono uppercase text-stone-400 pb-2 border-b border-stone-800 min-w-0">
                  <span className="text-stone-200 font-bold tracking-wider truncate">
                    Throttle & Volume
                  </span>
                  <span className="text-amber-400 font-mono text-[9px] shrink-0 font-bold px-1.5 py-0.2 bg-amber-400/10 border border-amber-400/20">
                    {Math.round(volume * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-2.5 py-0.5 min-w-0">
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    aria-label="Toggle mute"
                    className="p-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 border border-stone-700 cursor-pointer shrink-0"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-amber-400" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full min-w-0 accent-amber-400 bg-stone-950 h-2 cursor-pointer"
                  />
                </div>

                {/* Big Interactive Rev Pedal Button with strict word wrapping and overflow protection */}
                <div className="w-full min-w-0 overflow-hidden">
                  <button
                    type="button"
                    onClick={handleRevThrottle}
                    disabled={!isPlaying}
                    id="engine-sound-gas-pedal-btn"
                    className={`w-full py-2.5 px-2.5 font-mono text-[10.5px] sm:text-xs font-black uppercase tracking-wider border flex items-center justify-center gap-1.5 cursor-pointer transition text-center shadow-sm active:scale-98 overflow-hidden break-words ${
                      isPlaying
                        ? isRevving
                          ? "bg-amber-400 text-stone-950 border-amber-300 shadow-md shadow-amber-500/30"
                          : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 border-amber-400"
                        : "bg-stone-800 text-stone-600 border-stone-700 cursor-not-allowed"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 shrink-0" />
                    <span className="break-words overflow-hidden text-ellipsis leading-tight line-clamp-2">
                      {isRevving ? "BLIPPING THROTTLE!" : "PRESS GAS PEDAL (REV)"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Mechanical Acoustic Profile Notes (Spans full width for clean typography) */}
              <div className="sm:col-span-2 bg-stone-900 border border-stone-800 p-3 flex flex-col justify-between text-xs space-y-2 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-1 text-[10px] font-mono uppercase text-stone-400 pb-2 border-b border-stone-800 min-w-0">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5 tracking-wider truncate">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    Acoustic Blueprint
                  </span>
                  <span className="px-2 py-0.5 bg-amber-400/10 text-amber-400 border border-amber-400/30 text-[8px] sm:text-[8.5px] font-mono font-bold uppercase tracking-wider shrink-0">
                    Audio Verified
                  </span>
                </div>

                <p className="text-[11px] sm:text-xs text-stone-300 leading-relaxed font-sans font-medium py-1 break-words overflow-hidden">
                  {matchedPreset?.description || "Authentic exhaust note recording captured directly from the engine bay and exhaust tailpipes for realistic acoustic appraisal."}
                </p>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[9px] sm:text-[9.5px] font-mono text-stone-500 border-t border-stone-800/80 min-w-0">
                  <span className="truncate min-w-0">Vehicle: {vehicleTitle || "Selected Listing"}</span>
                  <span className="text-amber-500 shrink-0 font-bold">Auto World Acoustics</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EngineSoundPlayer;
