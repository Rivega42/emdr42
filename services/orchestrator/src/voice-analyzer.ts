/**
 * Voice Analyzer
 *
 * Analyzes voice patterns in real-time: pauses, speech rate, volume.
 * Feeds metrics to SessionHandler for AI context enrichment.
 */

export interface VoiceMetrics {
  /** Words per minute calculated from recent transcriptions */
  speechRate: number;
  /** Current pause duration in seconds (0 if speaking) */
  currentPauseDuration: number;
  /** Number of pauses in this session */
  pauseCount: number;
  /** Longest pause in seconds */
  longestPause: number;
  /** Pause classification */
  pauseType: 'none' | 'short' | 'medium' | 'long';
  /** Volume trend relative to baseline */
  volumeTrend: 'rising' | 'falling' | 'stable';
  /** Current RMS energy (0-1 normalized) */
  volumeLevel: number;
}

interface TranscriptEntry {
  text: string;
  timestamp: number;
  wordCount: number;
}

const PAUSE_SHORT_MS = 2000;
const PAUSE_MEDIUM_MS = 5000;
const BASELINE_WINDOW_MS = 30_000;

export class VoiceAnalyzer {
  private transcripts: TranscriptEntry[] = [];
  private lastTranscriptTime = 0;
  private pauseCount = 0;
  private longestPauseMs = 0;
  private volumeSamples: number[] = [];
  private baselineVolume = 0;
  private baselineSet = false;
  private sessionStartTime: number;

  constructor() {
    this.sessionStartTime = Date.now();
  }

  /**
   * Record a finalized transcript from STT.
   */
  recordTranscript(text: string): void {
    const now = Date.now();
    const words = text.trim().split(/\s+/).filter(Boolean);

    // Track pause between transcripts
    if (this.lastTranscriptTime > 0) {
      const gap = now - this.lastTranscriptTime;
      if (gap > PAUSE_SHORT_MS) {
        this.pauseCount++;
        if (gap > this.longestPauseMs) {
          this.longestPauseMs = gap;
        }
      }
    }

    this.transcripts.push({
      text,
      timestamp: now,
      wordCount: words.length,
    });

    this.lastTranscriptTime = now;

    // Keep only last 2 minutes of transcripts
    const cutoff = now - 120_000;
    this.transcripts = this.transcripts.filter((t) => t.timestamp > cutoff);
  }

  /**
   * Record audio volume (RMS energy from PCM chunk).
   */
  recordVolume(rms: number): void {
    this.volumeSamples.push(rms);

    // Set baseline from first 30 seconds
    if (!this.baselineSet && Date.now() - this.sessionStartTime > BASELINE_WINDOW_MS) {
      if (this.volumeSamples.length > 0) {
        this.baselineVolume =
          this.volumeSamples.reduce((a, b) => a + b, 0) / this.volumeSamples.length;
        this.baselineSet = true;
      }
    }

    // Keep only last 100 samples
    if (this.volumeSamples.length > 100) {
      this.volumeSamples = this.volumeSamples.slice(-100);
    }
  }

  /**
   * Get current voice metrics snapshot.
   */
  getMetrics(): VoiceMetrics {
    const now = Date.now();

    // Speech rate (words per minute from last 60 seconds)
    const recentCutoff = now - 60_000;
    const recentTranscripts = this.transcripts.filter((t) => t.timestamp > recentCutoff);
    const totalWords = recentTranscripts.reduce((sum, t) => sum + t.wordCount, 0);
    const timeSpanMinutes = recentTranscripts.length > 0
      ? (now - recentTranscripts[0].timestamp) / 60_000
      : 1;
    const speechRate = timeSpanMinutes > 0 ? Math.round(totalWords / timeSpanMinutes) : 0;

    // Current pause
    const currentPauseMs = this.lastTranscriptTime > 0 ? now - this.lastTranscriptTime : 0;
    const currentPauseDuration = currentPauseMs / 1000;

    let pauseType: VoiceMetrics['pauseType'] = 'none';
    if (currentPauseMs > PAUSE_MEDIUM_MS) pauseType = 'long';
    else if (currentPauseMs > PAUSE_SHORT_MS) pauseType = 'medium';
    else if (currentPauseMs > 1000) pauseType = 'short';

    // Volume
    const recentVolume = this.volumeSamples.length > 0
      ? this.volumeSamples.slice(-10).reduce((a, b) => a + b, 0) /
        Math.min(this.volumeSamples.length, 10)
      : 0;

    let volumeTrend: VoiceMetrics['volumeTrend'] = 'stable';
    if (this.baselineSet && this.baselineVolume > 0) {
      const ratio = recentVolume / this.baselineVolume;
      if (ratio > 1.2) volumeTrend = 'rising';
      else if (ratio < 0.8) volumeTrend = 'falling';
    }

    return {
      speechRate,
      currentPauseDuration: Math.round(currentPauseDuration * 10) / 10,
      pauseCount: this.pauseCount,
      longestPause: Math.round(this.longestPauseMs / 100) / 10,
      pauseType,
      volumeTrend,
      volumeLevel: Math.min(1, recentVolume),
    };
  }

  /**
   * Format metrics for AI context.
   */
  formatForContext(): string {
    const m = this.getMetrics();
    const parts: string[] = [
      `Voice: speech_rate=${m.speechRate}wpm`,
      `pauses=${m.pauseCount}`,
      `longest_pause=${m.longestPause}s`,
      `volume_trend=${m.volumeTrend}`,
    ];

    if (m.pauseType === 'long') {
      parts.push('WARNING: prolonged silence (>5s) — possible dissociation');
    }

    return parts.join(', ');
  }
}
