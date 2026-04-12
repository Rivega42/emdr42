'use client';

// Wrapper around Web Audio API for bilateral audio stimulation during EMDR sessions.
// Handles initialization, binaural beats, and bilateral audio panning synced with visual BLS.

export class AudioBlsController {
  private audioContext: AudioContext | null = null;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private leftGain: GainNode | null = null;
  private rightGain: GainNode | null = null;
  private leftPanner: StereoPannerNode | null = null;
  private rightPanner: StereoPannerNode | null = null;
  private isPlaying = false;
  private animationId: number | null = null;
  private currentSpeed = 1.0;

  // Initialize Web Audio API
  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();

    // Binaural beat: base frequency + slightly offset for beat effect
    const baseFreq = 200;
    const beatFreq = 6; // theta (6Hz) for meditation/EMDR

    // Left channel
    this.leftOsc = this.audioContext.createOscillator();
    this.leftGain = this.audioContext.createGain();
    this.leftPanner = this.audioContext.createStereoPanner();
    this.leftOsc.frequency.value = baseFreq;
    this.leftGain.gain.value = 0;
    this.leftPanner.pan.value = -1;
    this.leftOsc.connect(this.leftGain).connect(this.leftPanner).connect(this.audioContext.destination);
    this.leftOsc.start();

    // Right channel
    this.rightOsc = this.audioContext.createOscillator();
    this.rightGain = this.audioContext.createGain();
    this.rightPanner = this.audioContext.createStereoPanner();
    this.rightOsc.frequency.value = baseFreq + beatFreq;
    this.rightGain.gain.value = 0;
    this.rightPanner.pan.value = 1;
    this.rightOsc.connect(this.rightGain).connect(this.rightPanner).connect(this.audioContext.destination);
    this.rightOsc.start();
  }

  // Start bilateral audio (alternating left-right synchronized with visual BLS)
  startBilateral(speed: number = 1.0): void {
    if (!this.audioContext || this.isPlaying) return;
    this.isPlaying = true;
    this.currentSpeed = speed;

    const volume = 0.3;

    const animate = () => {
      if (!this.isPlaying || !this.leftGain || !this.rightGain) return;

      const time = this.audioContext!.currentTime;
      // Alternate left-right at BLS speed
      const phase = Math.sin(time * this.currentSpeed * Math.PI * 2);

      // Smooth crossfade between left and right
      this.leftGain.gain.value = Math.max(0, phase) * volume;
      this.rightGain.gain.value = Math.max(0, -phase) * volume;

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  // Stop bilateral audio
  stopBilateral(): void {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.leftGain) this.leftGain.gain.value = 0;
    if (this.rightGain) this.rightGain.gain.value = 0;
  }

  // Update speed (takes effect on next animation frame)
  updateSpeed(speed: number): void {
    this.currentSpeed = speed;
  }

  // Update binaural beat frequency
  setBeatFrequency(type: 'delta' | 'theta' | 'alpha' | 'beta'): void {
    const beats = { delta: 2, theta: 6, alpha: 10, beta: 20 };
    if (this.rightOsc && this.leftOsc) {
      this.rightOsc.frequency.value = this.leftOsc.frequency.value + beats[type];
    }
  }

  // Cleanup
  dispose(): void {
    this.stopBilateral();
    this.leftOsc?.stop();
    this.rightOsc?.stop();
    this.audioContext?.close();
    this.audioContext = null;
  }
}
