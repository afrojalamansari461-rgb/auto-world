/**
 * Auto World Acoustic Engine & Exhaust Audio System
 * Supports HTML5 Audio playback (for uploaded files & recordings)
 * and Web Audio API procedural synthesis (for preset engine profiles and interactive revving).
 */

export interface EnginePreset {
  id: string;
  name: string;
  category: "suv" | "car" | "motorcycle" | "supercar" | "diesel" | "electric";
  cylinderConfig: string;
  displacement: string;
  description: string;
  idleRpm: number;
  maxRpm: number;
  hasTurbo: boolean;
  hasSupercharger?: boolean;
  baseFreq: number; // fundamental combustion pulse frequency at idle
}

export const ENGINE_PRESETS: EnginePreset[] = [
  {
    id: "preset:diesel_mhawk",
    name: "2.2L mHawk Turbo-Diesel Growl",
    category: "diesel",
    cylinderConfig: "Inline-4 Turbo Diesel",
    displacement: "2184 cc",
    description: "Deep low-end compression clatter, distinctive diesel rumble, and spooling turbo boost whistle.",
    idleRpm: 850,
    maxRpm: 4500,
    hasTurbo: true,
    baseFreq: 28.3,
  },
  {
    id: "preset:re_single_thump",
    name: "349cc Single-Cylinder Classic Thump",
    category: "motorcycle",
    cylinderConfig: "Single-Cylinder Air-Cooled",
    displacement: "349 cc",
    description: "Rhythmic heavy bass thumps, vintage slow-stroke cadence, and raw mechanical valve tap.",
    idleRpm: 1050,
    maxRpm: 6800,
    hasTurbo: false,
    baseFreq: 17.5,
  },
  {
    id: "preset:bmw_twinpower_turbo",
    name: "2.0L TwinPower Turbocharged Spool & Burble",
    category: "car",
    cylinderConfig: "Inline-4 Twin-Scroll Turbo",
    displacement: "1998 cc",
    description: "Crisp European sports induction, rapid rev acceleration, turbo blow-off hiss, and exhaust over-run burbles.",
    idleRpm: 800,
    maxRpm: 7000,
    hasTurbo: true,
    baseFreq: 26.6,
  },
  {
    id: "preset:v8_muscle",
    name: "5.0L V8 Naturally Aspirated Crossplane Roar",
    category: "supercar",
    cylinderConfig: "V8 Crossplane N/A",
    displacement: "5038 cc",
    description: "Thunderous low-frequency baritone idle, chest-thumping mechanical syncopation, and aggressive wide-open-throttle scream.",
    idleRpm: 750,
    maxRpm: 7500,
    hasTurbo: false,
    baseFreq: 25.0,
  },
  {
    id: "preset:inline6_scream",
    name: "3.0L Twin-Turbo Inline-6 High Rev Screamer",
    category: "car",
    cylinderConfig: "Inline-6 Twin Turbo",
    displacement: "2993 cc",
    description: "Silky-smooth harmonic balance, high-pitched metallic wail at redline, and crisp gearshift pops.",
    idleRpm: 700,
    maxRpm: 7800,
    hasTurbo: true,
    baseFreq: 35.0,
  },
  {
    id: "preset:superbike_inline4",
    name: "1000cc Superbike 14,000 RPM Screamer",
    category: "motorcycle",
    cylinderConfig: "Inline-4 DOHC 16V",
    displacement: "999 cc",
    description: "Ultra-high revving hyperbike scream, razor-sharp throttle response, and screaming top-end urgency.",
    idleRpm: 1300,
    maxRpm: 14200,
    hasTurbo: false,
    baseFreq: 43.3,
  },
  {
    id: "preset:electric_pulse",
    name: "Dual-Motor Electric Hyper-Drive Whine",
    category: "electric",
    cylinderConfig: "Permanent Magnet AC Synchronous",
    displacement: "Dual Electric Motors",
    description: "Futuristic spaceship electromagnetic torque whine, instantaneous power surge, and inverter harmonics.",
    idleRpm: 0,
    maxRpm: 18000,
    hasTurbo: false,
    baseFreq: 60.0,
  }
];

export interface AudioPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  rpm: number;
  frequencyData: Uint8Array;
}

class EngineAudioController {
  private audioCtx: AudioContext | null = null;
  private currentAudioEl: HTMLAudioElement | null = null;
  private isSynthPlaying = false;
  private synthInterval: number | null = null;
  private currentPreset: EnginePreset | null = null;
  private currentRpm = 900;
  private targetRpm = 900;
  private gainNode: GainNode | null = null;
  private masterVolume = 0.85;
  private isMuted = false;
  
  // Web Audio Nodes for synthesis
  private oscNodes: OscillatorNode[] = [];
  private noiseNode: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  private analyzerNode: AnalyserNode | null = null;
  private frequencyArray: Uint8Array = new Uint8Array(32);

  private stateListeners: ((state: AudioPlaybackState) => void)[] = [];
  private activeSourceUrl = "";

  public subscribe(callback: (state: AudioPlaybackState) => void) {
    this.stateListeners.push(callback);
    return () => {
      this.stateListeners = this.stateListeners.filter(cb => cb !== callback);
    };
  }

  private notify(currentTime = 0, duration = 10) {
    if (this.analyzerNode) {
      this.analyzerNode.getByteFrequencyData(this.frequencyArray as any);
    } else {
      // Simulate frequency pulses if analyzer is not connected
      if (this.isSynthPlaying || (this.currentAudioEl && !this.currentAudioEl.paused)) {
        for (let i = 0; i < this.frequencyArray.length; i++) {
          const factor = Math.sin(Date.now() / 150 + i * 0.4);
          this.frequencyArray[i] = Math.min(255, Math.max(20, Math.floor(120 + factor * 80 + (this.currentRpm / 8000) * 55)));
        }
      } else {
        this.frequencyArray.fill(0);
      }
    }

    const state: AudioPlaybackState = {
      isPlaying: this.isSynthPlaying || Boolean(this.currentAudioEl && !this.currentAudioEl.paused),
      currentTime,
      duration,
      rpm: Math.round(this.currentRpm),
      frequencyData: this.frequencyArray
    };

    this.stateListeners.forEach(cb => cb(state));
  }

  private initAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Generates a soft tube-style distortion curve for authentic combustion cylinder grit
   */
  private makeDistortionCurve(amount = 40): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  /**
   * Plays either an uploaded/recorded audio file or a synthesized preset
   */
  public async play(sourceUrl: string, presetType?: string): Promise<void> {
    this.stop();
    this.activeSourceUrl = sourceUrl;

    // Check if it's a procedural preset
    if (sourceUrl.startsWith("preset:") || sourceUrl.startsWith("synth:")) {
      const preset = ENGINE_PRESETS.find(p => p.id === sourceUrl || p.category === presetType) || ENGINE_PRESETS[0];
      this.playSynthPreset(preset);
      return;
    }

    // Otherwise, play via standard HTML5 Audio with Web Audio analyzer
    try {
      const audio = new Audio(sourceUrl);
      this.currentAudioEl = audio;
      audio.volume = this.isMuted ? 0 : this.masterVolume;
      audio.crossOrigin = "anonymous";

      const ctx = this.initAudioContext();
      this.analyzerNode = ctx.createAnalyser();
      this.analyzerNode.fftSize = 64;
      this.frequencyArray = new Uint8Array(this.analyzerNode.frequencyBinCount);

      try {
        const sourceNode = ctx.createMediaElementSource(audio);
        sourceNode.connect(this.analyzerNode);
        this.analyzerNode.connect(ctx.destination);
      } catch (err) {
        // In case cross-origin prevents Web Audio connection, audio will still play natively
      }

      audio.ontimeupdate = () => {
        this.notify(audio.currentTime, audio.duration || 10);
      };

      audio.onended = () => {
        this.stop();
      };

      audio.onerror = () => {
        // If external audio fails to load, gracefully fall back to procedural sound
        const matchedPreset = ENGINE_PRESETS.find(p => p.category === presetType) || ENGINE_PRESETS[0];
        this.playSynthPreset(matchedPreset);
      };

      await audio.play();
      this.notify(0, audio.duration || 10);
    } catch (err) {
      // Fallback
      const matchedPreset = ENGINE_PRESETS.find(p => p.category === presetType) || ENGINE_PRESETS[0];
      this.playSynthPreset(matchedPreset);
    }
  }

  /**
   * Procedural Audio Synthesis Engine for Engine Rumbles, Revs, and Exhaust Notes
   */
  private playSynthPreset(preset: EnginePreset) {
    const ctx = this.initAudioContext();
    this.currentPreset = preset;
    this.currentRpm = preset.idleRpm;
    this.targetRpm = preset.idleRpm;
    this.isSynthPlaying = true;

    // Master Gain
    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume * 0.75, ctx.currentTime);

    // Analyzer for UI visualizer
    this.analyzerNode = ctx.createAnalyser();
    this.analyzerNode.fftSize = 64;
    this.frequencyArray = new Uint8Array(this.analyzerNode.frequencyBinCount);

    // Waveshaper Distortion for raw exhaust grit
    this.distortionNode = ctx.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(preset.category === 'diesel' ? 60 : 35) as any;
    this.distortionNode.oversample = '4x';

    // Lowpass / Bandpass filter simulating engine cylinder block and exhaust muffler chamber
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(260, ctx.currentTime);
    this.filterNode.Q.setValueAtTime(preset.category === 'electric' ? 3 : 1.8, ctx.currentTime);

    // Connect Main Synth Chain
    this.distortionNode.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.analyzerNode);
    this.analyzerNode.connect(ctx.destination);

    this.oscNodes = [];

    if (preset.category === 'electric') {
      // Electric Drive: Dual Sine / Triangle oscillator with high pitch sweep
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(140, ctx.currentTime);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(280, ctx.currentTime);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.4, ctx.currentTime);

      osc1.connect(oscGain);
      osc2.connect(oscGain);
      oscGain.connect(this.filterNode);

      osc1.start();
      osc2.start();
      this.oscNodes.push(osc1, osc2);
    } else {
      // Combustion Engine: Multi-harmonic pulse synthesis (Fundamental + 2nd + 3rd + Sub-bass harmonics)
      const baseFreq = preset.baseFreq;

      // 1. Primary cylinder combustion pulse (Sawtooth)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);

      // 2. Secondary exhaust pulse (Triangle for body)
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);

      // 3. Sub-bass rumble (Square with low volume for deep vibration)
      const osc3 = ctx.createOscillator();
      osc3.type = 'square';
      osc3.frequency.setValueAtTime(baseFreq * 0.5, ctx.currentTime);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.65, ctx.currentTime);

      osc1.connect(this.distortionNode);
      osc2.connect(this.distortionNode);
      osc3.connect(this.distortionNode);

      osc1.start();
      osc2.start();
      osc3.start();
      this.oscNodes.push(osc1, osc2, osc3);

      // 4. White noise for turbo / intake suction
      if (preset.hasTurbo) {
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1200, ctx.currentTime);
        noiseFilter.Q.setValueAtTime(4.0, ctx.currentTime);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.04, ctx.currentTime);

        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.gainNode);

        whiteNoise.start();
        this.noiseNode = whiteNoise;
      }
    }

    // Auto-schedule dynamic idle blips and smooth animation
    let elapsedSeconds = 0;
    const intervalMs = 40;

    this.synthInterval = window.setInterval(() => {
      elapsedSeconds += intervalMs / 1000;

      // Smoothly interpolate RPM towards target RPM
      const rpmDiff = this.targetRpm - this.currentRpm;
      this.currentRpm += rpmDiff * 0.14;

      // Subtle idle breathing pulse (+/- 35 RPM)
      const idleJitter = Math.sin(elapsedSeconds * 4) * 30 + Math.cos(elapsedSeconds * 7.3) * 20;
      const effectiveRpm = Math.max(preset.idleRpm * 0.8, this.currentRpm + (this.targetRpm === preset.idleRpm ? idleJitter : 0));

      // Update oscillator frequencies based on RPM
      if (ctx.state === 'running') {
        const rpmRatio = effectiveRpm / Math.max(1, preset.idleRpm);
        const baseFreq = preset.baseFreq * rpmRatio;

        if (this.oscNodes.length >= 3) {
          this.oscNodes[0].frequency.setTargetAtTime(baseFreq, ctx.currentTime, 0.03);
          this.oscNodes[1].frequency.setTargetAtTime(baseFreq * 2, ctx.currentTime, 0.03);
          this.oscNodes[2].frequency.setTargetAtTime(baseFreq * 0.5, ctx.currentTime, 0.03);
        } else if (this.oscNodes.length >= 2) {
          // Electric
          this.oscNodes[0].frequency.setTargetAtTime(120 + effectiveRpm * 0.15, ctx.currentTime, 0.03);
          this.oscNodes[1].frequency.setTargetAtTime(240 + effectiveRpm * 0.3, ctx.currentTime, 0.03);
        }

        // Open filter on higher RPM for throatier sound
        if (this.filterNode) {
          const filterCutoff = preset.category === 'electric' 
            ? 800 + (effectiveRpm / preset.maxRpm) * 3500 
            : 220 + (effectiveRpm / preset.maxRpm) * 1800;
          this.filterNode.frequency.setTargetAtTime(filterCutoff, ctx.currentTime, 0.04);
        }
      }

      this.notify(elapsedSeconds % 12, 12);

      // Auto settle throttle back to idle after user released rev
      if (this.targetRpm > preset.idleRpm) {
        this.targetRpm = Math.max(preset.idleRpm, this.targetRpm - 180);
      }
    }, intervalMs);
  }

  /**
   * Throttle Blip / Engine Rev
   * Simulates pressing the gas pedal in neutral!
   */
  public rev(targetMultiplier = 0.75) {
    if (!this.isSynthPlaying || !this.currentPreset) {
      // If playing standard audio or stopped, trigger rev playback with synth
      if (this.activeSourceUrl) {
        const preset = ENGINE_PRESETS.find(p => p.id === this.activeSourceUrl) || ENGINE_PRESETS[0];
        this.playSynthPreset(preset);
      }
    }

    if (this.currentPreset) {
      const maxPossibleRpm = this.currentPreset.maxRpm;
      const idleRpm = this.currentPreset.idleRpm;
      this.targetRpm = Math.min(maxPossibleRpm, idleRpm + (maxPossibleRpm - idleRpm) * targetMultiplier);
    }
  }

  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.currentAudioEl) {
      this.currentAudioEl.volume = this.isMuted ? 0 : this.masterVolume;
    }
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume * 0.75, this.audioCtx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.setVolume(this.masterVolume);
    return this.isMuted;
  }

  public stop(): void {
    if (this.currentAudioEl) {
      this.currentAudioEl.pause();
      this.currentAudioEl.currentTime = 0;
      this.currentAudioEl = null;
    }

    if (this.synthInterval !== null) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }

    this.oscNodes.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.oscNodes = [];

    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
      } catch (e) {}
      this.noiseNode = null;
    }

    this.isSynthPlaying = false;
    this.currentPreset = null;
    this.currentRpm = 0;
    this.targetRpm = 0;
    this.notify(0, 0);
  }

  public getIsPlaying(): boolean {
    return this.isSynthPlaying || Boolean(this.currentAudioEl && !this.currentAudioEl.paused);
  }
}

export const engineAudio = new EngineAudioController();
