// Web Audio API Procedural Synthesizer for Chopstick Fly Catcher

export const getAssetUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const baseUrl = import.meta.env.BASE_URL || './';
  return baseUrl.endsWith('/') ? `${baseUrl}${cleanPath}` : `${baseUrl}/${cleanPath}`;
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  // Loaded fly audio buffers by category
  private flyBuffers: AudioBuffer[] = [];
  private landedDrinkBuffers: AudioBuffer[] = [];
  private landedDumplingBuffers: AudioBuffer[] = [];
  private capturedBuffers: AudioBuffer[] = [];
  private ninjaBuffers: AudioBuffer[] = [];
  
  // Continuous fly buzzing nodes mapped by Fly ID
  private flyBuzzers: Map<string, {
    source?: AudioBufferSourceNode;
    osc1?: OscillatorNode;
    osc2?: OscillatorNode;
    gain: GainNode;
    panner: StereoPannerNode | null;
    soundIndex: number;
    category: 'flying' | 'landed_drink' | 'landed_dumpling' | 'captured';
  }> = new Map();

  // Zen Flute state
  private fluteTimer: number | null = null;
  private isFlutePlaying = false;
  private activeFluteOscs: { osc: OscillatorNode; gain: GainNode }[] = [];
  private activeFlybyAudio: HTMLAudioElement | null = null;

  // Master volume variables (0 to 1)
  private masterVolume = 0.5;
  private musicVolume = 0.3;
  private sfxVolume = 0.6;
  private soundEnabled = true;

  constructor() {
    // Lazy initialized on first interaction
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.soundEnabled ? this.masterVolume : 0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.loadAllFlySounds();
    } catch (e) {
      console.error('Failed to initialize Web Audio API:', e);
    }
  }

  private async discoverSoundsInFolder(folderPath: string, filePrefix: string, maxProbe = 20): Promise<AudioBuffer[]> {
    if (!this.ctx) return [];
    const buffers: AudioBuffer[] = [];
    
    for (let i = 1; i <= maxProbe; i++) {
      let primaryUrl = getAssetUrl(`sounds/flies/${folderPath}/${filePrefix}_${i}.mp3`);
      let response = await fetch(primaryUrl).catch(() => null);

      if (!response || !response.ok) {
        // Fallback paths for flat structure / legacy folders
        if (folderPath === 'flying') {
          const fallbackUrl = getAssetUrl(`sounds/flies/${filePrefix}_${i}.mp3`);
          response = await fetch(fallbackUrl).catch(() => null);
        } else if (folderPath === 'ninja') {
          const fallbackUrl = getAssetUrl(`sounds/flies/Flyby/flyBy_sound_${i}.mp3`);
          response = await fetch(fallbackUrl).catch(() => null);
        }
      }

      if (!response || !response.ok) {
        break; // Stop checking after first non-existent index
      }

      try {
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        buffers.push(audioBuffer);
      } catch (e) {
        console.warn(`Dynamic audio decode stopped at ${folderPath}/${filePrefix}_${i}.mp3:`, e);
        break;
      }
    }
    return buffers;
  }

  private async loadAllFlySounds() {
    if (!this.ctx) return;
    this.flyBuffers = await this.discoverSoundsInFolder('flying', 'fly_sound');
    this.landedDrinkBuffers = await this.discoverSoundsInFolder('landed_drink', 'landed_drink');
    this.landedDumplingBuffers = await this.discoverSoundsInFolder('landed_dumpling', 'landed_dumpling');
    this.capturedBuffers = await this.discoverSoundsInFolder('captured', 'captured');
    this.ninjaBuffers = await this.discoverSoundsInFolder('ninja', 'ninja');

    // Fallbacks if specific state folders are missing or empty
    if (this.landedDrinkBuffers.length === 0) this.landedDrinkBuffers = this.flyBuffers;
    if (this.landedDumplingBuffers.length === 0) this.landedDumplingBuffers = this.flyBuffers;
    if (this.capturedBuffers.length === 0) this.capturedBuffers = this.flyBuffers;

    console.log(`Fly sounds loaded: flying=${this.flyBuffers.length}, drink=${this.landedDrinkBuffers.length}, dumpling=${this.landedDumplingBuffers.length}, captured=${this.capturedBuffers.length}, ninja=${this.ninjaBuffers.length}`);
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(enabled ? this.masterVolume : 0, this.ctx.currentTime);
    }
  }

  setVolumes(master: number, music: number, sfx: number) {
    this.masterVolume = master;
    this.musicVolume = music;
    this.sfxVolume = sfx;

    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.masterGain) this.masterGain.gain.setValueAtTime(this.soundEnabled ? master : 0, now);
      if (this.musicGain) this.musicGain.gain.setValueAtTime(music, now);
      if (this.sfxGain) this.sfxGain.gain.setValueAtTime(sfx, now);
    }
  }

  // Generate a wooden chopsticks click / clack sound
  playClack() {
    this.resume();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // We synthesize wood clacking using a short burst of bandpass filtered noise
    // coupled with a sharp high-frequency oscillator click.
    const bufferSize = ctx.sampleRate * 0.05; // 50ms buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.Q.setValueAtTime(5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    // Wood body resonance - a low pitch sound
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(180, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(110, now + 0.02);

    bodyGain.gain.setValueAtTime(0.5, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.01, now + 0.025);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.sfxGain);

    // High snap component
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();

    snapOsc.type = 'sine';
    snapOsc.frequency.setValueAtTime(2200, now);
    snapOsc.frequency.exponentialRampToValueAtTime(600, now + 0.01);

    snapGain.gain.setValueAtTime(0.6, now);
    snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.015);

    snapOsc.connect(snapGain);
    snapGain.connect(this.sfxGain);

    // Start all
    noise.start(now);
    bodyOsc.start(now);
    snapOsc.start(now);

    noise.stop(now + 0.05);
    bodyOsc.stop(now + 0.05);
    snapOsc.stop(now + 0.05);
  }

  // Play catching-success splash sound
  playCatch(type: 'standard' | 'rare' | 'combo') {
    this.resume();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (type === 'rare') {
      // Golden, shiny ascending pentatonic chime
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51]; // C5, E5, G5, B5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.04 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.4);
      });
    } else if (type === 'combo') {
      // Powerful dynamic sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Standard satisfying splash catch
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);

      // Add a little splash pop
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popOsc.type = 'sine';
      popOsc.frequency.setValueAtTime(1200, now);
      popOsc.frequency.setValueAtTime(1500, now + 0.02);

      popGain.gain.setValueAtTime(0.15, now);
      popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      popOsc.connect(popGain);
      popGain.connect(this.sfxGain);
      popOsc.start(now);
      popOsc.stop(now + 0.06);
    }
  }

  // Play general retro arcade sounds
  playSfx(effect: 'time-warning' | 'game-over' | 'frenzy' | 'levelup') {
    this.resume();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (effect === 'time-warning') {
      // Short caution beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (effect === 'game-over') {
      // Sad sliding tones
      const freqs = [330, 293.66, 261.63, 196]; // E4, D4, C4, G3
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        gain.gain.setValueAtTime(0.2, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.15 + 0.18);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.2);
      });
    } else if (effect === 'frenzy' || effect === 'levelup') {
      // Awesome rising arcade effect
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.5);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(205, now);
      osc2.frequency.exponentialRampToValueAtTime(1610, now + 0.5);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.55);
      osc2.stop(now + 0.55);
    }
  }

  // Play dumpling munch sound
  playMunch() {
    this.resume();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    [0, 0.08].forEach((delay) => {
      const bufferSize = ctx.sampleRate * 0.04;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600 + Math.random() * 200, now + delay);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.035);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);
      noise.start(now + delay);
      noise.stop(now + delay + 0.04);
    });
  }

  // Play matcha tea gulp sound
  playGulp() {
    this.resume();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private getBuffersForCategory(category: 'flying' | 'landed_drink' | 'landed_dumpling' | 'captured'): AudioBuffer[] {
    switch (category) {
      case 'landed_drink':
        return this.landedDrinkBuffers.length > 0 ? this.landedDrinkBuffers : this.flyBuffers;
      case 'landed_dumpling':
        return this.landedDumplingBuffers.length > 0 ? this.landedDumplingBuffers : this.flyBuffers;
      case 'captured':
        return this.capturedBuffers.length > 0 ? this.capturedBuffers : this.flyBuffers;
      case 'flying':
      default:
        return this.flyBuffers;
    }
  }

  private startSourceForBuzzer(
    flyId: string,
    buzzer: {
      source?: AudioBufferSourceNode;
      gain: GainNode;
      soundIndex: number;
      category: 'flying' | 'landed_drink' | 'landed_dumpling' | 'captured';
    },
    pitch: number
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const buffers = this.getBuffersForCategory(buzzer.category);

    if (buffers.length === 0) return;

    // Pick random sound index different from current soundIndex if >1 sound available
    let nextIndex = Math.floor(Math.random() * buffers.length);
    if (buffers.length > 1 && nextIndex === buzzer.soundIndex) {
      nextIndex = (nextIndex + 1) % buffers.length;
    }
    buzzer.soundIndex = nextIndex;

    const source = ctx.createBufferSource();
    source.buffer = buffers[nextIndex];
    source.loop = false; // Non-looping, when ended we trigger next sound randomly

    const targetRate = pitch / 100;
    source.playbackRate.setValueAtTime(targetRate, ctx.currentTime);
    source.connect(buzzer.gain);

    source.onended = () => {
      const currentBuzzer = this.flyBuzzers.get(flyId);
      if (currentBuzzer && currentBuzzer.source === source) {
        this.startSourceForBuzzer(flyId, currentBuzzer, pitch);
      }
    };

    buzzer.source = source;
    try {
      source.start(0);
    } catch (e) {}
  }

  // Continuous Fly Buzzing Management with State Categories
  updateFlyBuzz(flyId: string, options: {
    pitch: number;      // around 80 - 150 Hz
    volumeMultiplier: number; // 0 to 1 based on speed/proximity
    panX: number;       // -1 (left) to 1 (right)
    isActive: boolean;
    soundCategory?: 'flying' | 'landed_drink' | 'landed_dumpling' | 'captured';
  }) {
    this.resume();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const category = options.soundCategory || 'flying';

    // Handle Deactivation
    if (!options.isActive || options.volumeMultiplier <= 0.01) {
      this.stopFlyBuzz(flyId);
      return;
    }

    let buzzer = this.flyBuzzers.get(flyId);

    if (!buzzer) {
      const gain = ctx.createGain();
      
      let panner: StereoPannerNode | null = null;
      try {
        if (ctx.createStereoPanner) {
          panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(options.panX, now);
          panner.connect(this.sfxGain);
          gain.connect(panner);
        } else {
          gain.connect(this.sfxGain);
        }
      } catch (e) {
        gain.connect(this.sfxGain);
      }

      gain.gain.setValueAtTime(0, now);

      buzzer = { gain, panner, soundIndex: -1, category };
      this.flyBuzzers.set(flyId, buzzer);

      const categoryBuffers = this.getBuffersForCategory(category);
      if (categoryBuffers.length > 0) {
        this.startSourceForBuzzer(flyId, buzzer, options.pitch);
      } else {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(options.pitch, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(options.pitch * 1.5 + 4, now);
        osc1.connect(gain);
        osc2.connect(gain);
        osc1.start(now);
        osc2.start(now);
        buzzer.osc1 = osc1;
        buzzer.osc2 = osc2;
      }
    } else if (buzzer.category !== category) {
      // Smoothly transition buffer when changing fly state category
      if (buzzer.source) {
        try {
          buzzer.source.onended = null;
          buzzer.source.stop();
          buzzer.source.disconnect();
        } catch (e) {}
      }
      buzzer.category = category;
      const categoryBuffers = this.getBuffersForCategory(category);
      if (categoryBuffers.length > 0) {
        this.startSourceForBuzzer(flyId, buzzer, options.pitch);
      }
    }

    // Dynamic Updates - cap volume so it isn't deafening
    const targetVolume = Math.min(options.volumeMultiplier * 0.18, 0.28);
    buzzer.gain.gain.setTargetAtTime(targetVolume, now, 0.1);
    
    if (buzzer.source) {
      const targetRate = options.pitch / 100;
      buzzer.source.playbackRate.setTargetAtTime(targetRate, now, 0.15);
    } else {
      if (buzzer.osc1 && buzzer.osc2) {
        buzzer.osc1.frequency.setTargetAtTime(options.pitch, now, 0.15);
        buzzer.osc2.frequency.setTargetAtTime(options.pitch * 1.5 + 4, now, 0.15);
      }
    }

    if (buzzer.panner) {
      const clampedPan = Math.max(-1, Math.min(1, options.panX));
      buzzer.panner.pan.setTargetAtTime(clampedPan, now, 0.15);
    }
  }

  stopFlyBuzz(flyId: string) {
    const buzzer = this.flyBuzzers.get(flyId);
    if (buzzer) {
      try {
        const now = this.ctx ? this.ctx.currentTime : 0;
        buzzer.gain.gain.cancelScheduledValues(now);
        buzzer.gain.gain.setValueAtTime(buzzer.gain.gain.value, now);
        buzzer.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        setTimeout(() => {
          try {
            if (buzzer.source) {
              buzzer.source.stop();
              buzzer.source.disconnect();
            }
            if (buzzer.osc1) {
              buzzer.osc1.stop();
              buzzer.osc1.disconnect();
            }
            if (buzzer.osc2) {
              buzzer.osc2.stop();
              buzzer.osc2.disconnect();
            }
            buzzer.gain.disconnect();
            if (buzzer.panner) buzzer.panner.disconnect();
          } catch (err) {}
        }, 200);
      } catch (e) {}
      this.flyBuzzers.delete(flyId);
    }
  }

  clearAllBuzzers() {
    Array.from(this.flyBuzzers.keys()).forEach(id => this.stopFlyBuzz(id));
  }

  cleanupDeadBuzzers(activeFlyIds: Set<string>) {
    Array.from(this.flyBuzzers.keys()).forEach((id) => {
      if (!activeFlyIds.has(id)) {
        this.stopFlyBuzz(id);
      }
    });
  }

  // Tranquil Zen Dojo Flute Synthesizer (Shakuhachi-inspired)
  startZenFluteMelody() {
    this.resume();
    if (this.isFlutePlaying || !this.ctx || !this.musicGain || !this.soundEnabled) return;
    this.isFlutePlaying = true;

    // Pentatonic scale notes (A minor pentatonic: A4, C5, D5, E5, G5, A5)
    const scale = [440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
    
    const playNextNote = () => {
      if (!this.isFlutePlaying || !this.ctx || !this.musicGain) return;

      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Decide note, duration, and silence
      const noteIdx = Math.floor(Math.random() * scale.length);
      const freq = scale[noteIdx];
      const duration = 1.5 + Math.random() * 2.5; // 1.5 to 4 seconds long notes
      const rest = 1.0 + Math.random() * 2.5;     // silence between notes

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Shakuhachi has a slightly breathing, organic feel - triangle wave + a subtle bandpass-filtered noise breathe
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      // Gentle pitch vibrato
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.setValueAtTime(4.5 + Math.random() * 1.5, now); // 4.5 - 6Hz vibrato
      vibratoGain.gain.setValueAtTime(freq * 0.008, now); // vibrato depth
      
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);

      // Low pass filter to make it sound warm and wooden
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 1.8, now);

      // Smooth attack and release for wind-instrument feel
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + duration * 0.25); // soft attack
      gain.gain.setValueAtTime(0.08, now + duration * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // smooth decay

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      vibrato.start(now);
      osc.start(now);

      vibrato.stop(now + duration);
      osc.stop(now + duration);

      const oscObj = { osc, gain };
      this.activeFluteOscs.push(oscObj);

      // Cleanup osc after finish
      setTimeout(() => {
        this.activeFluteOscs = this.activeFluteOscs.filter(o => o !== oscObj);
        try {
          osc.disconnect();
          vibrato.disconnect();
          vibratoGain.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (e) {}
      }, (duration + 0.5) * 1000);

      // Schedule next note
      this.fluteTimer = window.setTimeout(playNextNote, (duration + rest) * 1000);
    };

    playNextNote();
  }

  stopZenFluteMelody() {
    this.isFlutePlaying = false;
    if (this.fluteTimer) {
      clearTimeout(this.fluteTimer);
      this.fluteTimer = null;
    }

    // Smoothly fade out any actively sounding notes
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.activeFluteOscs.forEach(({ gain }) => {
        try {
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        } catch (e) {}
      });
    }

    setTimeout(() => {
      this.activeFluteOscs.forEach(({ osc, gain }) => {
        try {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        } catch (e) {}
      });
      this.activeFluteOscs = [];
    }, 600);
  }

  getNinjaClipCount(): number {
    return this.ninjaBuffers.length;
  }

  playNinjaClipForLevel(level: number, onEnded: () => void) {
    this.resume();
    this.stopFlybyNarration();

    if (!this.ctx || !this.sfxGain || !this.soundEnabled) {
      onEnded();
      return;
    }

    const bufferIndex = level - 1;
    if (bufferIndex >= 0 && bufferIndex < this.ninjaBuffers.length) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = this.ninjaBuffers[bufferIndex];
        source.connect(this.sfxGain);
        source.onended = () => {
          onEnded();
        };
        source.start(0);
        return;
      } catch (e) {
        console.warn(`Failed playing ninja buffer for level ${level}:`, e);
      }
    }

    // Fallback to flyBy_sound_1 narration if buffer index not present
    this.playFlybyNarration(onEnded);
  }

  // Play flyby narration sound
  playFlybyNarration(onEnded: () => void) {
    this.resume();
    this.stopFlybyNarration(); // stop any existing first
    
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) {
      onEnded();
      return;
    }
    
    const soundUrl = getAssetUrl('sounds/flies/flyBy_sound_1.mp3');

    try {
      const audio = new Audio(soundUrl);
      this.activeFlybyAudio = audio;
      
      const sourceNode = this.ctx.createMediaElementSource(audio);
      sourceNode.connect(this.sfxGain);
      
      audio.play().catch(e => {
        console.warn("Failed to play flyBy_sound_1.mp3:", e);
        onEnded();
      });

      audio.addEventListener('ended', () => {
        this.activeFlybyAudio = null;
        onEnded();
      });
    } catch (e) {
      console.warn("MediaElementSource failed (could be already created):", e);
      const audio = new Audio(soundUrl);
      this.activeFlybyAudio = audio;
      audio.play().catch(onEnded);
      audio.addEventListener('ended', () => {
        this.activeFlybyAudio = null;
        onEnded();
      });
    }
  }

  stopFlybyNarration() {
    if (this.activeFlybyAudio) {
      try {
        this.activeFlybyAudio.pause();
        this.activeFlybyAudio.currentTime = 0;
      } catch (e) {}
      this.activeFlybyAudio = null;
    }
  }
}

export const audio = new AudioEngine();
