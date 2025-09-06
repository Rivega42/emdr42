/**
 * Audio & ASMR Service
 * Binaural beats, spatial audio, and ASMR effects
 */

import * as Tone from 'tone';

export interface AudioConfig {
  binauralEnabled: boolean;
  binauralFrequency: 'delta' | 'theta' | 'alpha' | 'beta';
  spatialEnabled: boolean;
  asmrEnabled: boolean;
  asmrType: ASMRType;
  volume: number;
  fadeTime: number;
}

export type ASMRType = 
  | 'whisper' 
  | 'tapping' 
  | 'rain' 
  | 'ocean' 
  | 'forest' 
  | 'white_noise'
  | 'breathing'
  | 'heartbeat';

export interface BinauralFrequencies {
  delta: { base: number; beat: number; description: string };
  theta: { base: number; beat: number; description: string };
  alpha: { base: number; beat: number; description: string };
  beta: { base: number; beat: number; description: string };
}

export class AudioASMRService {
  private isInitialized = false;
  private binauralSynths: { left: Tone.Oscillator; right: Tone.Oscillator } | null = null;
  private spatialPanner: Tone.Panner | null = null;
  private asmrPlayer: Tone.Player | null = null;
  private noiseGenerator: Tone.Noise | null = null;
  private masterGain: Tone.Gain | null = null;
  private reverb: Tone.Reverb | null = null;
  private filter: Tone.Filter | null = null;
  
  private config: AudioConfig = {
    binauralEnabled: false,
    binauralFrequency: 'theta',
    spatialEnabled: false,
    asmrEnabled: false,
    asmrType: 'rain',
    volume: 0.5,
    fadeTime: 2
  };

  private readonly frequencies: BinauralFrequencies = {
    delta: { 
      base: 200, 
      beat: 2, 
      description: 'Deep sleep and healing (0.5-4 Hz)' 
    },
    theta: { 
      base: 200, 
      beat: 6, 
      description: 'Meditation and REM sleep (4-8 Hz)' 
    },
    alpha: { 
      base: 200, 
      beat: 10, 
      description: 'Relaxation and visualization (8-13 Hz)' 
    },
    beta: { 
      base: 200, 
      beat: 20, 
      description: 'Focus and alertness (13-30 Hz)' 
    }
  };

  private asmrSounds: Map<ASMRType, string> = new Map([
    ['whisper', '/assets/audio/asmr/whisper.mp3'],
    ['tapping', '/assets/audio/asmr/tapping.mp3'],
    ['rain', '/assets/audio/asmr/rain.mp3'],
    ['ocean', '/assets/audio/asmr/ocean.mp3'],
    ['forest', '/assets/audio/asmr/forest.mp3'],
    ['white_noise', 'generated'],
    ['breathing', '/assets/audio/asmr/breathing.mp3'],
    ['heartbeat', '/assets/audio/asmr/heartbeat.mp3']
  ]);

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Tone.js and audio nodes
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start Tone.js audio context
      await Tone.start();
      
      // Create master gain
      this.masterGain = new Tone.Gain(this.config.volume).toDestination();
      
      // Create effects
      this.reverb = new Tone.Reverb({
        decay: 2,
        wet: 0.3
      }).connect(this.masterGain);
      
      this.filter = new Tone.Filter({
        frequency: 2000,
        type: 'lowpass'
      }).connect(this.reverb);
      
      // Create spatial panner
      this.spatialPanner = new Tone.Panner(0).connect(this.filter);
      
      // Initialize binaural oscillators
      this.initializeBinaural();
      
      // Initialize noise generator for white noise
      this.noiseGenerator = new Tone.Noise('white').connect(this.filter);
      
      this.isInitialized = true;
      console.log('Audio service initialized');
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
      throw error;
    }
  }

  /**
   * Initialize binaural beat oscillators
   */
  private initializeBinaural(): void {
    const freq = this.frequencies[this.config.binauralFrequency];
    
    // Left ear - base frequency
    const leftOsc = new Tone.Oscillator(freq.base, 'sine');
    const leftPanner = new Tone.Panner(-1).connect(this.masterGain);
    leftOsc.connect(leftPanner);
    
    // Right ear - base + beat frequency
    const rightOsc = new Tone.Oscillator(freq.base + freq.beat, 'sine');
    const rightPanner = new Tone.Panner(1).connect(this.masterGain);
    rightOsc.connect(rightPanner);
    
    this.binauralSynths = { left: leftOsc, right: rightOsc };
  }

  /**
   * Start binaural beats
   */
  async startBinaural(frequency?: 'delta' | 'theta' | 'alpha' | 'beta'): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    if (frequency && frequency !== this.config.binauralFrequency) {
      this.config.binauralFrequency = frequency;
      await this.updateBinauralFrequency();
    }
    
    if (this.binauralSynths) {
      const fadeTime = `+${this.config.fadeTime}`;
      this.binauralSynths.left.start(fadeTime);
      this.binauralSynths.right.start(fadeTime);
      this.binauralSynths.left.volume.rampTo(-20, this.config.fadeTime);
      this.binauralSynths.right.volume.rampTo(-20, this.config.fadeTime);
    }
    
    this.config.binauralEnabled = true;
  }

  /**
   * Stop binaural beats
   */
  async stopBinaural(): Promise<void> {
    if (!this.binauralSynths) return;
    
    const fadeTime = this.config.fadeTime;
    this.binauralSynths.left.volume.rampTo(-Infinity, fadeTime);
    this.binauralSynths.right.volume.rampTo(-Infinity, fadeTime);
    
    setTimeout(() => {
      this.binauralSynths?.left.stop();
      this.binauralSynths?.right.stop();
    }, fadeTime * 1000);
    
    this.config.binauralEnabled = false;
  }

  /**
   * Update binaural frequency
   */
  private async updateBinauralFrequency(): Promise<void> {
    const wasPlaying = this.config.binauralEnabled;
    
    if (wasPlaying) {
      await this.stopBinaural();
    }
    
    // Dispose old oscillators
    if (this.binauralSynths) {
      this.binauralSynths.left.dispose();
      this.binauralSynths.right.dispose();
    }
    
    // Create new oscillators with new frequency
    this.initializeBinaural();
    
    if (wasPlaying) {
      await this.startBinaural();
    }
  }

  /**
   * Start ASMR sound
   */
  async startASMR(type?: ASMRType): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    if (type) {
      this.config.asmrType = type;
    }
    
    // Stop existing ASMR if playing
    if (this.config.asmrEnabled) {
      await this.stopASMR();
    }
    
    const soundPath = this.asmrSounds.get(this.config.asmrType);
    
    if (soundPath === 'generated') {
      // Use noise generator for white noise
      if (this.noiseGenerator) {
        this.noiseGenerator.start(`+${this.config.fadeTime}`);
        this.noiseGenerator.volume.rampTo(-20, this.config.fadeTime);
      }
    } else if (soundPath) {
      // Load and play audio file
      this.asmrPlayer = new Tone.Player({
        url: soundPath,
        loop: true,
        autostart: false,
        fadeIn: this.config.fadeTime,
        fadeOut: this.config.fadeTime
      }).connect(this.spatialPanner || this.filter!);
      
      await Tone.loaded();
      this.asmrPlayer.start(`+${this.config.fadeTime}`);
    }
    
    this.config.asmrEnabled = true;
  }

  /**
   * Stop ASMR sound
   */
  async stopASMR(): Promise<void> {
    const fadeTime = this.config.fadeTime;
    
    if (this.asmrPlayer) {
      this.asmrPlayer.volume.rampTo(-Infinity, fadeTime);
      setTimeout(() => {
        this.asmrPlayer?.stop();
        this.asmrPlayer?.dispose();
        this.asmrPlayer = null;
      }, fadeTime * 1000);
    }
    
    if (this.noiseGenerator && this.config.asmrType === 'white_noise') {
      this.noiseGenerator.volume.rampTo(-Infinity, fadeTime);
      setTimeout(() => {
        this.noiseGenerator?.stop();
      }, fadeTime * 1000);
    }
    
    this.config.asmrEnabled = false;
  }

  /**
   * Update spatial panning position
   */
  updateSpatialPosition(x: number): void {
    if (!this.spatialPanner) return;
    
    // Clamp x between -1 and 1
    const position = Math.max(-1, Math.min(1, x));
    this.spatialPanner.pan.rampTo(position, 0.1);
  }

  /**
   * Sync audio with movement pattern
   */
  syncWithMovement(time: number, pattern: string, speed: number): void {
    if (!this.config.spatialEnabled) return;
    
    let panPosition = 0;
    
    switch (pattern) {
      case 'horizontal':
        panPosition = Math.sin(time * speed);
        break;
      case 'infinity':
        panPosition = Math.sin(time * speed);
        break;
      case 'circular':
        panPosition = Math.cos(time * speed);
        break;
      default:
        panPosition = Math.sin(time * speed);
    }
    
    this.updateSpatialPosition(panPosition);
  }

  /**
   * Create breathing guide sound
   */
  async startBreathingGuide(
    inhaleTime: number = 4,
    holdTime: number = 7,
    exhaleTime: number = 8
  ): Promise<void> {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: inhaleTime,
        decay: 0,
        sustain: 1,
        release: exhaleTime
      }
    }).connect(this.masterGain!);
    
    const loop = new Tone.Loop((time) => {
      // Inhale
      synth.triggerAttack('C3', time);
      
      // Hold
      synth.triggerRelease(time + inhaleTime + holdTime);
    }, inhaleTime + holdTime + exhaleTime);
    
    loop.start(0);
    Tone.Transport.start();
  }

  /**
   * Generate click track for bilateral stimulation
   */
  async startClickTrack(bpm: number = 60): Promise<void> {
    const click = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: {
        attack: 0.0006,
        decay: 0.05,
        sustain: 0
      }
    }).connect(this.spatialPanner!);
    
    let side = -1;
    
    const loop = new Tone.Loop((time) => {
      this.updateSpatialPosition(side);
      click.triggerAttackRelease('C2', '32n', time);
      side *= -1; // Alternate sides
    }, 60 / bpm);
    
    loop.start(0);
    Tone.Transport.start();
  }

  /**
   * Play therapeutic tone
   */
  async playTherapeuticTone(
    frequency: number = 528, // Love frequency
    duration: number = 10
  ): Promise<void> {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 2,
        decay: 1,
        sustain: 0.5,
        release: 2
      }
    }).connect(this.reverb!);
    
    synth.triggerAttackRelease(frequency, duration);
  }

  /**
   * Update master volume
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.rampTo(this.config.volume, 0.5);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<AudioConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };
    
    // Apply changes
    if (config.volume !== undefined) {
      this.setVolume(config.volume);
    }
    
    if (config.binauralFrequency && config.binauralFrequency !== oldConfig.binauralFrequency) {
      await this.updateBinauralFrequency();
    }
    
    if (config.binauralEnabled !== undefined && config.binauralEnabled !== oldConfig.binauralEnabled) {
      if (config.binauralEnabled) {
        await this.startBinaural();
      } else {
        await this.stopBinaural();
      }
    }
    
    if (config.asmrEnabled !== undefined && config.asmrEnabled !== oldConfig.asmrEnabled) {
      if (config.asmrEnabled) {
        await this.startASMR();
      } else {
        await this.stopASMR();
      }
    }
  }

  /**
   * Stop all audio
   */
  async stopAll(): Promise<void> {
    await this.stopBinaural();
    await this.stopASMR();
    Tone.Transport.stop();
    Tone.Transport.cancel();
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    this.stopAll();
    
    // Dispose all Tone.js objects
    this.binauralSynths?.left.dispose();
    this.binauralSynths?.right.dispose();
    this.spatialPanner?.dispose();
    this.asmrPlayer?.dispose();
    this.noiseGenerator?.dispose();
    this.masterGain?.dispose();
    this.reverb?.dispose();
    this.filter?.dispose();
    
    this.isInitialized = false;
  }

  /**
   * Create custom ASMR sequence
   */
  async playASMRSequence(sequence: {
    type: ASMRType;
    duration: number;
    panPosition?: number;
  }[]): Promise<void> {
    for (const step of sequence) {
      await this.startASMR(step.type);
      
      if (step.panPosition !== undefined) {
        this.updateSpatialPosition(step.panPosition);
      }
      
      await new Promise(resolve => setTimeout(resolve, step.duration * 1000));
    }
  }

  /**
   * Adaptive audio based on emotional state
   */
  adaptToEmotionalState(emotionData: {
    stress: number;
    arousal: number;
    valence: number;
  }): void {
    // Adjust binaural frequency based on stress
    if (emotionData.stress > 0.7) {
      this.updateConfig({ binauralFrequency: 'delta' }); // Deep relaxation
    } else if (emotionData.stress > 0.5) {
      this.updateConfig({ binauralFrequency: 'theta' }); // Meditation
    } else if (emotionData.stress > 0.3) {
      this.updateConfig({ binauralFrequency: 'alpha' }); // Relaxation
    }
    
    // Adjust ASMR based on arousal
    if (emotionData.arousal < 0.3) {
      // Low arousal - use stimulating sounds
      this.updateConfig({ asmrType: 'tapping' });
    } else if (emotionData.arousal > 0.7) {
      // High arousal - use calming sounds
      this.updateConfig({ asmrType: 'ocean' });
    }
    
    // Adjust volume based on valence
    const volume = 0.3 + (emotionData.valence + 1) * 0.2; // Range: 0.3 - 0.7
    this.setVolume(volume);
  }
}

export default AudioASMRService;
