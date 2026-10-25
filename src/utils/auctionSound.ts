// Web Audio API Synthesizer for Live Auction Sound Effects
// Works without any external audio files, completely zero-latency and 100% cross-browser compatible.

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    console.warn("AudioContext unavailable", e);
    return null;
  }
}

export function isAuctionSoundEnabled(): boolean {
  try {
    const saved = localStorage.getItem("autoworld_auction_sound_enabled");
    if (saved !== null) {
      soundEnabled = saved === "true";
    }
  } catch (e) {
    // fallback
  }
  return soundEnabled;
}

export function setAuctionSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  try {
    localStorage.setItem("autoworld_auction_sound_enabled", String(enabled));
  } catch (e) {
    // fallback
  }
}

// 1. Heavy Wooden Gavel Strike on bid / hammer down
export function playGavelStrike() {
  if (!isAuctionSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    
    // Impact oscillator (low thump)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);

    // High frequency wood crack
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(3, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(t);
    whiteNoise.stop(t + 0.06);
  } catch (e) {
    console.warn("Gavel audio error", e);
  }
}

// 2. High-Chime Bid Placed Sound
export function playBidSuccessChime() {
  if (!isAuctionSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [587.33, 880.00, 1174.66]; // D5, A5, D6
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch (e) {
    console.warn("Bid sound error", e);
  }
}

// 3. Outbid Warning Tone
export function playOutbidWarning() {
  if (!isAuctionSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(330, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  } catch (e) {
    console.warn("Outbid audio error", e);
  }
}

// 4. Final 10-Second Countdown Ticking Heartbeat
export function playCountdownTick(isFinalThree = false) {
  if (!isAuctionSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(isFinalThree ? 1200 : 800, t);

    gain.gain.setValueAtTime(isFinalThree ? 0.35 : 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  } catch (e) {
    console.warn("Countdown audio error", e);
  }
}

// 5. Grand Victory Fanfare on Lot Settled
export function playVictoryFanfare() {
  if (!isAuctionSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const chords = [
      { freq: 523.25, time: 0 },    // C5
      { freq: 659.25, time: 0.12 }, // E5
      { freq: 783.99, time: 0.24 }, // G5
      { freq: 1046.50, time: 0.36 } // C6
    ];

    chords.forEach(({ freq, time }) => {
      const t = ctx.currentTime + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.5);
    });
  } catch (e) {
    console.warn("Victory fanfare error", e);
  }
}

// 6. Sports Exhaust Engine Rev Sound Simulator
export function playEngineRevSound() {
  if (!isAuctionSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "triangle";

    // Idle -> High Rev -> Idle
    osc1.frequency.setValueAtTime(65, t);
    osc1.frequency.exponentialRampToValueAtTime(320, t + 0.6);
    osc1.frequency.exponentialRampToValueAtTime(140, t + 1.2);
    osc1.frequency.exponentialRampToValueAtTime(450, t + 1.7);
    osc1.frequency.exponentialRampToValueAtTime(70, t + 2.4);

    osc2.frequency.setValueAtTime(130, t);
    osc2.frequency.exponentialRampToValueAtTime(640, t + 0.6);
    osc2.frequency.exponentialRampToValueAtTime(280, t + 1.2);
    osc2.frequency.exponentialRampToValueAtTime(900, t + 1.7);
    osc2.frequency.exponentialRampToValueAtTime(140, t + 2.4);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(2800, t + 0.6);
    filter.frequency.exponentialRampToValueAtTime(800, t + 1.2);
    filter.frequency.exponentialRampToValueAtTime(3800, t + 1.7);
    filter.frequency.exponentialRampToValueAtTime(350, t + 2.4);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0.45, t + 0.5);
    gain.gain.linearRampToValueAtTime(0.3, t + 1.2);
    gain.gain.linearRampToValueAtTime(0.55, t + 1.7);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 2.5);
    osc2.stop(t + 2.5);
  } catch (e) {
    console.warn("Engine sound error", e);
  }
}
