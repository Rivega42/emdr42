/**
 * Emotion Recognition Module
 * face-api.js powered emotion detection with 98 affects circumplex mapping.
 * Runs entirely in-browser — privacy-first approach.
 */

import { EventEmitter } from 'events';

// face-api.js is loaded as a browser global via CDN or bundled dependency.
// We declare the minimal typings we need here to avoid hard import-time errors
// in SSR/Node contexts (face-api.js requires DOM APIs).
declare const faceapi: any;

// ---------------------------------------------------------------------------
// Interfaces (backward compatible — existing fields untouched)
// ---------------------------------------------------------------------------

export interface EmotionData {
  timestamp: number;
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
  };
  dimensions: {
    valence: number;      // -1 to 1 (negative to positive)
    arousal: number;       // -1 to 1 (low to high energy)
    dominance: number;     // 0 to 1 (submissive to dominant)
  };
  behavioral: {
    attention: number;     // 0 to 1
    engagement: number;    // 0 to 1
    positivity: number;    // 0 to 1
    stress: number;        // 0 to 1
  };
  confidence: number;      // 0 to 1
  affects98?: Record<string, number>;       // 98 affect probabilities
  basicExpressions?: Record<string, number>; // raw face-api.js 7 expressions
}

export interface EmotionProfile {
  baseline: EmotionData;
  current: EmotionData;
  history: EmotionData[];
  triggers: TriggerPattern[];
  volatility: number;
}

export interface TriggerPattern {
  emotionSignature: Partial<EmotionData>;
  timestamp: number;
  context?: string;
  intensity: number;
}

export interface EmotionConfig {
  updateFrequency?: number;       // ms between frame analyses (default: 100)
  calibrationDuration?: number;   // ms for calibration period (default: 30000)
  enableLocalStorage?: boolean;   // persist profile (default: true)
}

// ---------------------------------------------------------------------------
// 98 affects mapping (arousal / valence coordinates from circumplex model)
// ---------------------------------------------------------------------------

const affects98: Record<string, { arousal: number; valence: number }> = {
  'Adventurous': { arousal: 0.4, valence: 0.6 },
  'Afraid': { arousal: 0.7, valence: -0.6 },
  'Alarmed': { arousal: 0.8, valence: -0.5 },
  'Ambitious': { arousal: 0.5, valence: 0.4 },
  'Amorous': { arousal: 0.3, valence: 0.7 },
  'Amused': { arousal: 0.3, valence: 0.6 },
  'Angry': { arousal: 0.7, valence: -0.7 },
  'Annoyed': { arousal: 0.4, valence: -0.4 },
  'Anxious': { arousal: 0.6, valence: -0.3 },
  'Apathetic': { arousal: -0.6, valence: -0.2 },
  'Aroused': { arousal: 0.8, valence: 0.3 },
  'Ashamed': { arousal: -0.2, valence: -0.6 },
  'Astonished': { arousal: 0.7, valence: 0.2 },
  'At Ease': { arousal: -0.3, valence: 0.4 },
  'Attentive': { arousal: 0.2, valence: 0.3 },
  'Bellicose': { arousal: 0.6, valence: -0.5 },
  'Bitter': { arousal: 0.1, valence: -0.7 },
  'Bored': { arousal: -0.5, valence: -0.3 },
  'Calm': { arousal: -0.4, valence: 0.3 },
  'Compassionate': { arousal: 0.1, valence: 0.6 },
  'Conceited': { arousal: 0.2, valence: 0.1 },
  'Confident': { arousal: 0.3, valence: 0.5 },
  'Conscientious': { arousal: 0.2, valence: 0.4 },
  'Contemplative': { arousal: -0.1, valence: 0.2 },
  'Contemptuous': { arousal: 0.2, valence: -0.6 },
  'Content': { arousal: -0.2, valence: 0.6 },
  'Convinced': { arousal: 0.1, valence: 0.4 },
  'Courageous': { arousal: 0.5, valence: 0.5 },
  'Defiant': { arousal: 0.5, valence: -0.3 },
  'Dejected': { arousal: -0.4, valence: -0.5 },
  'Delighted': { arousal: 0.5, valence: 0.8 },
  'Depressed': { arousal: -0.6, valence: -0.7 },
  'Desperate': { arousal: 0.5, valence: -0.8 },
  'Despondent': { arousal: -0.5, valence: -0.6 },
  'Determined': { arousal: 0.4, valence: 0.3 },
  'Disappointed': { arousal: -0.2, valence: -0.5 },
  'Discontented': { arousal: -0.1, valence: -0.4 },
  'Disgusted': { arousal: 0.3, valence: -0.7 },
  'Dissatisfied': { arousal: 0.0, valence: -0.4 },
  'Distressed': { arousal: 0.6, valence: -0.6 },
  'Distrustful': { arousal: 0.2, valence: -0.3 },
  'Doubtful': { arousal: 0.1, valence: -0.2 },
  'Droopy': { arousal: -0.7, valence: -0.3 },
  'Embarrassed': { arousal: 0.3, valence: -0.4 },
  'Enraged': { arousal: 0.9, valence: -0.8 },
  'Enthusiastic': { arousal: 0.7, valence: 0.7 },
  'Envious': { arousal: 0.3, valence: -0.5 },
  'Excited': { arousal: 0.8, valence: 0.6 },
  'Expectant': { arousal: 0.3, valence: 0.2 },
  'Feel Guilt': { arousal: -0.1, valence: -0.5 },
  'Feel Well': { arousal: 0.1, valence: 0.7 },
  'Feeling Superior': { arousal: 0.3, valence: 0.2 },
  'Friendly': { arousal: 0.2, valence: 0.7 },
  'Frustrated': { arousal: 0.5, valence: -0.6 },
  'Glad': { arousal: 0.4, valence: 0.7 },
  'Gloomy': { arousal: -0.3, valence: -0.6 },
  'Happy': { arousal: 0.4, valence: 0.8 },
  'Hateful': { arousal: 0.6, valence: -0.8 },
  'Hesitant': { arousal: 0.0, valence: -0.1 },
  'Hopeful': { arousal: 0.2, valence: 0.5 },
  'Hostile': { arousal: 0.7, valence: -0.7 },
  'Impatient': { arousal: 0.5, valence: -0.2 },
  'Impressed': { arousal: 0.4, valence: 0.5 },
  'Indignant': { arousal: 0.4, valence: -0.5 },
  'Insulted': { arousal: 0.5, valence: -0.6 },
  'Interested': { arousal: 0.3, valence: 0.4 },
  'Jealous': { arousal: 0.4, valence: -0.6 },
  'Joyous': { arousal: 0.6, valence: 0.9 },
  'Languid': { arousal: -0.6, valence: 0.1 },
  'Lonely': { arousal: -0.3, valence: -0.5 },
  'Lovestruck': { arousal: 0.4, valence: 0.8 },
  'Lusting': { arousal: 0.7, valence: 0.5 },
  'Melancholic': { arousal: -0.4, valence: -0.4 },
  'Miserable': { arousal: -0.2, valence: -0.8 },
  'Passive': { arousal: -0.5, valence: 0.0 },
  'Peaceful': { arousal: -0.5, valence: 0.5 },
  'Pensive': { arousal: -0.2, valence: 0.1 },
  'Placid': { arousal: -0.6, valence: 0.3 },
  'Pleased': { arousal: 0.2, valence: 0.6 },
  'Polite': { arousal: 0.0, valence: 0.4 },
  'Quiet': { arousal: -0.4, valence: 0.1 },
  'Relaxed': { arousal: -0.5, valence: 0.6 },
  'Reverent': { arousal: -0.1, valence: 0.3 },
  'Sad': { arousal: -0.3, valence: -0.6 },
  'Satisfied': { arousal: -0.1, valence: 0.7 },
  'Scared': { arousal: 0.8, valence: -0.7 },
  'Serene': { arousal: -0.4, valence: 0.6 },
  'Sleepy': { arousal: -0.8, valence: 0.0 },
  'Solemn': { arousal: -0.2, valence: 0.0 },
  'Still': { arousal: -0.7, valence: 0.2 },
  'Surprised': { arousal: 0.8, valence: 0.1 },
  'Suspicious': { arousal: 0.3, valence: -0.3 },
  'Tense': { arousal: 0.7, valence: -0.4 },
  'Terrified': { arousal: 0.9, valence: -0.9 },
  'Tired': { arousal: -0.7, valence: -0.2 },
  'Tranquil': { arousal: -0.6, valence: 0.4 },
  'Troubled': { arousal: 0.4, valence: -0.4 },
  'Vigorous': { arousal: 0.8, valence: 0.4 },
};

// ---------------------------------------------------------------------------
// Basic emotion -> arousal/valence mapping
// ---------------------------------------------------------------------------

const emotionToAV: Record<string, { arousal: number; valence: number }> = {
  neutral:   { arousal: 0,   valence: 0 },
  happy:     { arousal: 0.4, valence: 0.8 },
  sad:       { arousal: -0.3, valence: -0.6 },
  angry:     { arousal: 0.7, valence: -0.7 },
  fearful:   { arousal: 0.8, valence: -0.5 },
  disgusted: { arousal: 0.3, valence: -0.7 },
  surprised: { arousal: 0.8, valence: 0.1 },
};

// ---------------------------------------------------------------------------
// CDN URL for face-api.js model weights
// ---------------------------------------------------------------------------

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class EmotionRecognitionService extends EventEmitter {
  private video: HTMLVideoElement | null = null;
  private isInitialized = false;
  private isTracking = false;
  private animationFrameId: number | null = null;
  private currentProfile: EmotionProfile | null = null;
  private calibrationData: EmotionData[] = [];
  private isCalibrating = false;
  private mediaStream: MediaStream | null = null;
  private modelsLoaded = false;
  private config: Required<EmotionConfig>;

  constructor(config: EmotionConfig = {}) {
    super();
    this.config = {
      updateFrequency: config.updateFrequency ?? 100,
      calibrationDuration: config.calibrationDuration ?? 30000,
      enableLocalStorage: config.enableLocalStorage ?? true,
    };
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  /**
   * Load face-api.js models from CDN and prepare for detection.
   */
  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.video = videoElement;

      // Load face-api.js models (only once)
      if (!this.modelsLoaded) {
        await this.loadModels();
        this.modelsLoaded = true;
      }

      // Request camera access and attach to video element
      const stream = await this.requestCameraAccess();
      this.video.srcObject = stream;
      await this.video.play();

      this.isInitialized = true;

      // Load existing profile if available
      if (this.config.enableLocalStorage) {
        this.loadProfile();
      }

      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize emotion recognition:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Load face-api.js neural network models from CDN.
   */
  private async loadModels(): Promise<void> {
    if (typeof faceapi === 'undefined') {
      throw new Error(
        'face-api.js is not loaded. Add the script tag or import face-api.js before initializing.'
      );
    }

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
  }

  // -------------------------------------------------------------------------
  // Tracking
  // -------------------------------------------------------------------------

  /**
   * Start tracking emotions from video feed.
   */
  startTracking(): void {
    if (!this.isInitialized || this.isTracking) return;
    this.isTracking = true;
    this.detectFrame();
  }

  /**
   * Stop tracking emotions.
   */
  stopTracking(): void {
    this.isTracking = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // -------------------------------------------------------------------------
  // Detection loop
  // -------------------------------------------------------------------------

  /**
   * Detect faces and expressions each frame via requestAnimationFrame.
   */
  private async detectFrame(): Promise<void> {
    if (!this.isTracking || !this.video) return;

    try {
      const detections = await faceapi
        .detectAllFaces(
          this.video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 })
        )
        .withFaceLandmarks()
        .withFaceExpressions();

      let emotionData: EmotionData;

      if (detections.length > 0) {
        const detection = detections[0];
        const expressions: Record<string, number> = detection.expressions;
        const faceScore: number = detection.detection.score;
        emotionData = this.processExpressions(expressions, faceScore);
      } else {
        emotionData = this.createNeutralEmotionData(Date.now(), 0);
      }

      // Update profile
      if (this.currentProfile) {
        this.currentProfile.current = emotionData;
        this.currentProfile.history.push(emotionData);
        if (this.currentProfile.history.length > 1000) {
          this.currentProfile.history.shift();
        }
        this.currentProfile.volatility = this.calculateVolatility();
        this.detectTriggers(emotionData);
      }

      // Calibration
      if (this.isCalibrating) {
        this.calibrationData.push(emotionData);
      }

      this.emit('emotionUpdate', emotionData);
      this.checkAlerts(emotionData);

      // Emit raw detections for visualization
      this.emit('faceDetections', detections);
    } catch (error) {
      console.error('Error processing frame:', error);
      this.emit('error', error);
    }

    // Schedule next frame respecting updateFrequency
    if (this.isTracking) {
      this.animationFrameId = window.setTimeout(() => {
        requestAnimationFrame(() => this.detectFrame());
      }, this.config.updateFrequency) as unknown as number;
    }
  }

  // -------------------------------------------------------------------------
  // Expression processing
  // -------------------------------------------------------------------------

  /**
   * Convert face-api.js 7 basic expressions into full EmotionData.
   */
  private processExpressions(
    expressions: Record<string, number>,
    faceScore: number
  ): EmotionData {
    const now = Date.now();

    // --- Arousal / Valence from weighted basic emotions ---
    let weightedArousal = 0;
    let weightedValence = 0;
    let totalWeight = 0;

    for (const [emotion, confidence] of Object.entries(expressions)) {
      const av = emotionToAV[emotion];
      if (av) {
        weightedArousal += av.arousal * confidence;
        weightedValence += av.valence * confidence;
        totalWeight += confidence;
      }
    }

    const arousal = totalWeight > 0 ? weightedArousal / totalWeight : 0;
    const valence = totalWeight > 0 ? weightedValence / totalWeight : 0;

    // --- 98 affects ---
    const affects = this.calculateAffectProbabilities(arousal, valence);

    // --- Behavioral metrics ---
    const attention = Math.max(0, Math.min(1, (50 + arousal * 25 + valence * 25) / 100));

    const angle = 17 * Math.PI / 180;
    const positivity = Math.max(0, Math.min(1,
      (valence * Math.cos(angle) - arousal * Math.sin(angle) + 1) / 2
    ));

    const emotionalIntensity = Object.values(expressions)
      .reduce((sum, val) => sum + val, 0) / 7;
    const engagement = Math.max(0, Math.min(1,
      attention * 0.5 + emotionalIntensity * 0.5
    ));

    const stress = Math.max(0, Math.min(1,
      (expressions.fearful ?? 0) * 1.2 +
      (expressions.angry ?? 0) +
      (expressions.sad ?? 0) * 0.8 +
      (expressions.disgusted ?? 0) * 0.6
    ) / 3);

    // --- Dominance ---
    const dominant = (expressions.angry ?? 0) * 0.8 + (expressions.disgusted ?? 0) * 0.5;
    const submissive = (expressions.fearful ?? 0) + (expressions.sad ?? 0) * 0.7;
    const dominance = Math.max(0, Math.min(1, (dominant - submissive + 1) / 2));

    // --- Map face-api expression names to our interface ---
    const emotions = {
      joy: expressions.happy ?? 0,
      sadness: expressions.sad ?? 0,
      anger: expressions.angry ?? 0,
      fear: expressions.fearful ?? 0,
      surprise: expressions.surprised ?? 0,
      disgust: expressions.disgusted ?? 0,
    };

    return {
      timestamp: now,
      emotions,
      dimensions: { valence, arousal, dominance },
      behavioral: { attention, engagement, positivity, stress },
      confidence: faceScore,
      affects98: affects,
      basicExpressions: { ...expressions },
    };
  }

  // -------------------------------------------------------------------------
  // 98 Affects — Gaussian probability on circumplex
  // -------------------------------------------------------------------------

  private calculateAffectProbabilities(
    arousal: number,
    valence: number
  ): Record<string, number> {
    const sigma = 0.3;
    const result: Record<string, number> = {};

    for (const [affect, position] of Object.entries(affects98)) {
      const distance = Math.sqrt(
        (arousal - position.arousal) ** 2 +
        (valence - position.valence) ** 2
      );
      result[affect] = Math.exp(-(distance * distance) / (2 * sigma * sigma));
    }

    // Normalize
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (const key of Object.keys(result)) {
        result[key] /= sum;
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Neutral data
  // -------------------------------------------------------------------------

  private createNeutralEmotionData(timestamp: number, confidence: number): EmotionData {
    return {
      timestamp,
      emotions: { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, disgust: 0 },
      dimensions: { valence: 0, arousal: 0, dominance: 0.5 },
      behavioral: { attention: 0, engagement: 0, positivity: 0.5, stress: 0 },
      confidence,
      affects98: this.calculateAffectProbabilities(0, 0),
      basicExpressions: {
        neutral: 1, happy: 0, sad: 0, angry: 0,
        fearful: 0, disgusted: 0, surprised: 0,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Volatility & triggers
  // -------------------------------------------------------------------------

  calculateVolatility(): number {
    if (!this.currentProfile || this.currentProfile.history.length < 10) return 0;

    const recent = this.currentProfile.history.slice(-10);
    const values = recent.map(e => e.dimensions.valence);
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  detectTriggers(data: EmotionData): void {
    if (!this.currentProfile) return;

    if (
      data.behavioral.stress > 0.8 &&
      this.currentProfile.baseline.behavioral.stress < 0.5
    ) {
      this.currentProfile.triggers.push({
        emotionSignature: data,
        timestamp: data.timestamp,
        context: 'stress_spike',
        intensity: data.behavioral.stress,
      });
      this.emit('triggerDetected', { type: 'stress_spike', data });
    }

    if (
      data.behavioral.attention < 0.2 &&
      this.currentProfile.baseline.behavioral.attention > 0.5
    ) {
      this.currentProfile.triggers.push({
        emotionSignature: data,
        timestamp: data.timestamp,
        context: 'attention_loss',
        intensity: 1 - data.behavioral.attention,
      });
      this.emit('triggerDetected', { type: 'attention_loss', data });
    }
  }

  // -------------------------------------------------------------------------
  // Alerts
  // -------------------------------------------------------------------------

  checkAlerts(data: EmotionData): void {
    if (data.behavioral.stress > 0.85) {
      this.emit('alert', { type: 'high_stress', severity: 'warning', data });
    }
    if (data.behavioral.attention < 0.1 && data.behavioral.engagement < 0.1) {
      this.emit('alert', { type: 'dissociation', severity: 'critical', data });
    }
    if (data.confidence < 0.3) {
      this.emit('alert', { type: 'low_confidence', severity: 'info', data });
    }
  }

  // -------------------------------------------------------------------------
  // Calibration
  // -------------------------------------------------------------------------

  async calibrate(): Promise<EmotionProfile> {
    this.isCalibrating = true;
    this.calibrationData = [];
    this.emit('calibrationStarted');

    return new Promise((resolve) => {
      setTimeout(() => {
        this.isCalibrating = false;

        const baseline = this.calculateBaseline(this.calibrationData);

        this.currentProfile = {
          baseline,
          current: baseline,
          history: [baseline],
          triggers: [],
          volatility: 0,
        };

        if (this.config.enableLocalStorage) {
          this.saveProfile();
        }

        this.emit('calibrationCompleted', this.currentProfile);
        resolve(this.currentProfile);
      }, this.config.calibrationDuration);
    });
  }

  private calculateBaseline(data: EmotionData[]): EmotionData {
    if (data.length === 0) {
      return this.createNeutralEmotionData(Date.now(), 0.1);
    }

    const baseline: EmotionData = {
      timestamp: Date.now(),
      emotions: { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, disgust: 0 },
      dimensions: { valence: 0, arousal: 0, dominance: 0 },
      behavioral: { attention: 0, engagement: 0, positivity: 0, stress: 0 },
      confidence: 0,
    };

    data.forEach(d => {
      for (const key of Object.keys(baseline.emotions) as (keyof typeof baseline.emotions)[]) {
        baseline.emotions[key] += d.emotions[key] / data.length;
      }
      for (const key of Object.keys(baseline.dimensions) as (keyof typeof baseline.dimensions)[]) {
        baseline.dimensions[key] += d.dimensions[key] / data.length;
      }
      for (const key of Object.keys(baseline.behavioral) as (keyof typeof baseline.behavioral)[]) {
        baseline.behavioral[key] += d.behavioral[key] / data.length;
      }
      baseline.confidence += d.confidence / data.length;
    });

    return baseline;
  }

  // -------------------------------------------------------------------------
  // Camera
  // -------------------------------------------------------------------------

  async requestCameraAccess(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    });
    this.mediaStream = stream;
    return stream;
  }

  releaseCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  isCameraActive(): boolean {
    return this.mediaStream !== null &&
      this.mediaStream.getVideoTracks().some(track => track.readyState === 'live');
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  saveProfile(): void {
    if (!this.currentProfile || !this.config.enableLocalStorage) return;
    try {
      localStorage.setItem('emdr_emotion_profile', JSON.stringify(this.currentProfile));
    } catch (error) {
      console.error('Failed to save emotion profile:', error);
    }
  }

  loadProfile(): void {
    if (!this.config.enableLocalStorage) return;
    try {
      const saved = localStorage.getItem('emdr_emotion_profile');
      if (saved) {
        this.currentProfile = JSON.parse(saved);
        this.emit('profileLoaded', this.currentProfile);
      }
    } catch (error) {
      console.error('Failed to load emotion profile:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  getCurrentEmotions(): EmotionData | null {
    return this.currentProfile?.current ?? null;
  }

  getProfile(): EmotionProfile | null {
    return this.currentProfile;
  }

  getHistory(limit?: number): EmotionData[] {
    if (!this.currentProfile) return [];
    const history = this.currentProfile.history;
    return limit ? history.slice(-limit) : history;
  }

  getTriggers(): TriggerPattern[] {
    return this.currentProfile?.triggers ?? [];
  }

  resetProfile(): void {
    this.currentProfile = null;
    if (this.config.enableLocalStorage) {
      localStorage.removeItem('emdr_emotion_profile');
    }
    this.emit('profileReset');
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  destroy(): void {
    this.stopTracking();
    this.releaseCamera();
    this.removeAllListeners();
    this.video = null;
    this.isInitialized = false;
  }
}

export default EmotionRecognitionService;
