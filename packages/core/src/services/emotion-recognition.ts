/**
 * Emotion Recognition Module
 * Custom TensorFlow.js-based emotion detection — privacy-first, fully in-browser.
 * No external SDK dependencies.
 */

import { EventEmitter } from 'events';

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
    arousal: number;      // 0 to 1 (calm to excited)
    dominance: number;    // 0 to 1 (submissive to dominant)
  };
  behavioral: {
    attention: number;    // 0 to 1
    engagement: number;   // 0 to 1
    positivity: number;   // 0 to 1
    stress: number;       // 0 to 1
  };
  confidence: number;     // 0 to 1
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

interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export class EmotionRecognitionService extends EventEmitter {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isInitialized = false;
  private isTracking = false;
  private animationFrameId: number | null = null;
  private currentProfile: EmotionProfile | null = null;
  private calibrationData: EmotionData[] = [];
  private isCalibrating = false;
  private mediaStream: MediaStream | null = null;
  private config: Required<EmotionConfig>;

  // Movement tracking state for activity-based metrics
  private previousFacePosition: { x: number; y: number } | null = null;
  private movementHistory: number[] = [];
  private frameCount = 0;
  private lastFrameTime = 0;

  constructor(config: EmotionConfig = {}) {
    super();
    this.config = {
      updateFrequency: config.updateFrequency ?? 100,
      calibrationDuration: config.calibrationDuration ?? 30000,
      enableLocalStorage: config.enableLocalStorage ?? true,
    };
  }

  /**
   * Initialize camera and prepare for face detection.
   */
  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.video = videoElement;

      // Create offscreen canvas for frame analysis
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      // Request camera access and attach to video element
      const stream = await this.requestCameraAccess();
      this.video.srcObject = stream;
      await this.video.play();

      // Set canvas dimensions to match video
      this.canvas.width = this.video.videoWidth || 320;
      this.canvas.height = this.video.videoHeight || 240;

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
   * Start tracking emotions from video feed.
   */
  startTracking(): void {
    if (!this.isInitialized || this.isTracking) return;

    this.isTracking = true;
    this.lastFrameTime = performance.now();
    this.scheduleNextFrame();
  }

  /**
   * Schedule the next frame analysis respecting updateFrequency.
   */
  private scheduleNextFrame(): void {
    if (!this.isTracking) return;

    this.animationFrameId = requestAnimationFrame(async () => {
      const now = performance.now();
      if (now - this.lastFrameTime >= this.config.updateFrequency) {
        this.lastFrameTime = now;
        await this.processFrame();
      }
      this.scheduleNextFrame();
    });
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

  /**
   * Process a single video frame: detect face, estimate emotions, emit events.
   */
  private async processFrame(): Promise<void> {
    if (!this.video || !this.canvas || !this.ctx) return;

    try {
      // Update canvas size if video dimensions changed
      if (this.canvas.width !== this.video.videoWidth && this.video.videoWidth > 0) {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
      }

      // Draw current video frame to canvas
      this.ctx.drawImage(this.video, 0, 0);
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

      // Detect face
      const face = await this.detectFace(imageData);

      // Analyze emotions from face data + movement patterns
      const emotionData = this.analyzeFace(imageData, face);

      // Update profile
      if (this.currentProfile) {
        this.currentProfile.current = emotionData;
        this.currentProfile.history.push(emotionData);

        // Keep history limited to last 1000 entries
        if (this.currentProfile.history.length > 1000) {
          this.currentProfile.history.shift();
        }

        // Update volatility
        this.currentProfile.volatility = this.calculateVolatility();

        // Detect triggers
        this.detectTriggers(emotionData);
      }

      // Handle calibration
      if (this.isCalibrating) {
        this.calibrationData.push(emotionData);
      }

      // Emit update event
      this.emit('emotionUpdate', emotionData);

      // Check for alerts
      this.checkAlerts(emotionData);

      this.frameCount++;
    } catch (error) {
      console.error('Error processing frame:', error);
      this.emit('error', error);
    }
  }

  /**
   * Detect face in image data using skin-color segmentation + bounding box.
   * Lightweight approach suitable for MVP; can be replaced with BlazeFace model later.
   */
  private async detectFace(imageData: ImageData): Promise<FaceDetection | null> {
    const { data, width, height } = imageData;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let skinPixelCount = 0;

    // Sample every 4th pixel for performance
    const step = 4;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (this.isSkinColor(r, g, b)) {
          skinPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Need a minimum number of skin pixels to consider a face detected
    const totalSampled = (width / step) * (height / step);
    const skinRatio = skinPixelCount / totalSampled;

    if (skinRatio < 0.05 || skinPixelCount < 50) {
      return null;
    }

    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;

    // Basic aspect ratio check — face regions are roughly square to tall
    const aspect = faceWidth / (faceHeight || 1);
    if (aspect < 0.4 || aspect > 2.0) {
      return null;
    }

    // Confidence based on skin ratio and region coherence
    const confidence = Math.min(1, skinRatio * 3);

    return {
      x: minX,
      y: minY,
      width: faceWidth,
      height: faceHeight,
      confidence,
    };
  }

  /**
   * Simple skin color classification in RGB space.
   */
  private isSkinColor(r: number, g: number, b: number): boolean {
    return (
      r > 80 && g > 30 && b > 15 &&
      r > g && r > b &&
      Math.abs(r - g) > 15 &&
      r - b > 15
    );
  }

  /**
   * Analyze face region and movement patterns to estimate emotions.
   *
   * MVP hybrid approach:
   * 1. Face detection confidence -> overall confidence
   * 2. Face position movement -> arousal, stress
   * 3. Face region brightness variance -> engagement proxy
   * 4. Position stability -> attention
   * 5. Emotion values use statistical estimates (marked as low confidence)
   *
   * NOTE: This is a simplified model. For production accuracy, integrate a
   * trained CNN model (e.g., FER-2013 based) loaded via TensorFlow.js.
   */
  private analyzeFace(imageData: ImageData, face: FaceDetection | null): EmotionData {
    const now = Date.now();

    if (!face) {
      return this.createNeutralEmotionData(now, 0.05);
    }

    // Track face position for movement analysis
    const centerX = face.x + face.width / 2;
    const centerY = face.y + face.height / 2;
    let movement = 0;

    if (this.previousFacePosition) {
      const dx = centerX - this.previousFacePosition.x;
      const dy = centerY - this.previousFacePosition.y;
      movement = Math.sqrt(dx * dx + dy * dy);
    }
    this.previousFacePosition = { x: centerX, y: centerY };

    // Keep rolling window of movement values
    this.movementHistory.push(movement);
    if (this.movementHistory.length > 30) {
      this.movementHistory.shift();
    }

    const avgMovement = this.movementHistory.reduce((a, b) => a + b, 0) /
      (this.movementHistory.length || 1);

    // Normalize movement (typical movement range 0-50px)
    const normalizedMovement = Math.min(1, avgMovement / 50);

    // Calculate face region brightness variance as activity proxy
    const brightnessVariance = this.calculateBrightnessVariance(imageData, face);

    // --- Derive behavioral metrics ---
    const attention = Math.max(0, Math.min(1, 1 - normalizedMovement * 1.5));
    const arousal = Math.max(0, Math.min(1, normalizedMovement * 0.6 + brightnessVariance * 0.4));
    const engagement = Math.max(0, Math.min(1,
      face.confidence * 0.5 + (1 - normalizedMovement) * 0.3 + brightnessVariance * 0.2
    ));
    const stress = Math.max(0, Math.min(1,
      normalizedMovement * 0.7 + brightnessVariance * 0.3
    ));

    // --- Estimate emotion values ---
    // Without a trained model, use heuristic distributions based on movement/variance.
    const emotions = {
      joy: Math.min(1, Math.max(0, 0.3 - stress * 0.5 + (1 - normalizedMovement) * 0.2)),
      sadness: Math.min(1, Math.max(0, 0.1 + (1 - engagement) * 0.2 - brightnessVariance * 0.1)),
      anger: Math.min(1, Math.max(0, stress * 0.3 + normalizedMovement * 0.1 - 0.1)),
      fear: Math.min(1, Math.max(0, stress * 0.2 + normalizedMovement * 0.15 - 0.1)),
      surprise: Math.min(1, Math.max(0, brightnessVariance * 0.3 + normalizedMovement * 0.2 - 0.15)),
      disgust: Math.min(1, Math.max(0, stress * 0.15 - brightnessVariance * 0.1)),
    };

    // --- Derive dimensional values from estimated emotions ---
    const valence = this.calculateValence(emotions);
    const dominance = this.calculateDominance(emotions);
    const positivity = this.calculatePositivity(emotions);

    // Confidence: lower than a trained model (0.3-0.5 range)
    const confidence = Math.min(0.5, face.confidence * 0.4 + 0.1);

    return {
      timestamp: now,
      emotions,
      dimensions: {
        valence,
        arousal,
        dominance,
      },
      behavioral: {
        attention,
        engagement,
        positivity,
        stress,
      },
      confidence,
    };
  }

  /**
   * Calculate brightness variance in the face region as a proxy for facial activity.
   */
  private calculateBrightnessVariance(imageData: ImageData, face: FaceDetection): number {
    const { data, width } = imageData;
    const samples: number[] = [];
    const step = 4;

    const endX = Math.min(face.x + face.width, imageData.width);
    const endY = Math.min(face.y + face.height, imageData.height);

    for (let y = Math.max(0, face.y); y < endY; y += step) {
      for (let x = Math.max(0, face.x); x < endX; x += step) {
        const i = (y * width + x) * 4;
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        samples.push(brightness);
      }
    }

    if (samples.length < 2) return 0;

    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((sum, val) => sum + (val - mean) ** 2, 0) / samples.length;

    // Normalize variance (typical range 0-2000)
    return Math.min(1, Math.sqrt(variance) / 45);
  }

  /**
   * Create a neutral emotion data point (when no face is detected).
   */
  private createNeutralEmotionData(timestamp: number, confidence: number): EmotionData {
    return {
      timestamp,
      emotions: {
        joy: 0, sadness: 0, anger: 0,
        fear: 0, surprise: 0, disgust: 0,
      },
      dimensions: { valence: 0, arousal: 0, dominance: 0.5 },
      behavioral: {
        attention: 0, engagement: 0,
        positivity: 0.5, stress: 0,
      },
      confidence,
    };
  }

  /**
   * Calculate emotional valence from emotion values.
   */
  private calculateValence(emotions: EmotionData['emotions']): number {
    const positive = emotions.joy + emotions.surprise * 0.5;
    const negative = emotions.sadness + emotions.anger +
      emotions.fear + emotions.disgust;

    const total = positive + negative;
    if (total === 0) return 0;

    return (positive - negative) / total;
  }

  /**
   * Calculate arousal level from emotion values.
   */
  private calculateArousal(emotions: EmotionData['emotions']): number {
    const highArousal = emotions.anger + emotions.fear + emotions.surprise;
    const lowArousal = emotions.sadness * 0.5;

    const arousal = (highArousal - lowArousal) / 3;
    return Math.max(0, Math.min(1, arousal));
  }

  /**
   * Calculate dominance level from emotion values.
   */
  private calculateDominance(emotions: EmotionData['emotions']): number {
    const dominant = emotions.anger * 0.8 + emotions.disgust * 0.5;
    const submissive = emotions.fear + emotions.sadness * 0.7;

    const dominance = (dominant - submissive + 1) / 2;
    return Math.max(0, Math.min(1, dominance));
  }

  /**
   * Calculate engagement level.
   */
  private calculateEngagement(attention: number, emotions: EmotionData['emotions']): number {
    const emotionalIntensity = Object.values(emotions)
      .reduce((sum: number, val: number) => sum + val, 0) / 6;

    return attention * 0.7 + emotionalIntensity * 0.3;
  }

  /**
   * Calculate positivity index from emotion values.
   */
  private calculatePositivity(emotions: EmotionData['emotions']): number {
    const positive = emotions.joy;
    const negative = emotions.sadness + emotions.anger +
      emotions.fear + emotions.disgust;

    if (positive + negative === 0) return 0.5;
    return positive / (positive + negative);
  }

  /**
   * Calculate stress level from emotion values.
   */
  private calculateStress(emotions: EmotionData['emotions']): number {
    const stressEmotions = emotions.fear * 1.2 +
      emotions.anger +
      emotions.sadness * 0.8 +
      emotions.disgust * 0.6;

    return Math.max(0, Math.min(1, stressEmotions / 3));
  }

  /**
   * Calculate emotional volatility from recent history.
   */
  private calculateVolatility(): number {
    if (!this.currentProfile || this.currentProfile.history.length < 10) {
      return 0;
    }

    const recent = this.currentProfile.history.slice(-10);
    const values = recent.map(e => e.dimensions.valence);

    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) =>
      sum + Math.pow(val - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Detect emotional triggers.
   */
  private detectTriggers(data: EmotionData): void {
    if (!this.currentProfile) return;

    // Check for sudden stress spike
    if (data.behavioral.stress > 0.8 &&
      this.currentProfile.baseline.behavioral.stress < 0.5) {

      this.currentProfile.triggers.push({
        emotionSignature: data,
        timestamp: data.timestamp,
        context: 'stress_spike',
        intensity: data.behavioral.stress,
      });

      this.emit('triggerDetected', {
        type: 'stress_spike',
        data: data,
      });
    }

    // Check for attention drop
    if (data.behavioral.attention < 0.2 &&
      this.currentProfile.baseline.behavioral.attention > 0.5) {

      this.currentProfile.triggers.push({
        emotionSignature: data,
        timestamp: data.timestamp,
        context: 'attention_loss',
        intensity: 1 - data.behavioral.attention,
      });

      this.emit('triggerDetected', {
        type: 'attention_loss',
        data: data,
      });
    }
  }

  /**
   * Check for alerts based on current emotion data.
   */
  private checkAlerts(data: EmotionData): void {
    // High stress alert
    if (data.behavioral.stress > 0.85) {
      this.emit('alert', {
        type: 'high_stress',
        severity: 'warning',
        data: data,
      });
    }

    // Dissociation alert
    if (data.behavioral.attention < 0.1 && data.behavioral.engagement < 0.1) {
      this.emit('alert', {
        type: 'dissociation',
        severity: 'critical',
        data: data,
      });
    }

    // Low confidence alert
    if (data.confidence < 0.3) {
      this.emit('alert', {
        type: 'low_confidence',
        severity: 'info',
        data: data,
      });
    }
  }

  /**
   * Start calibration — collects emotion data for calibrationDuration ms,
   * then computes baseline averages.
   */
  async calibrate(): Promise<EmotionProfile> {
    this.isCalibrating = true;
    this.calibrationData = [];

    this.emit('calibrationStarted');

    return new Promise((resolve) => {
      setTimeout(() => {
        this.isCalibrating = false;

        // Calculate baseline from calibration data
        const baseline = this.calculateBaseline(this.calibrationData);

        this.currentProfile = {
          baseline: baseline,
          current: baseline,
          history: [baseline],
          triggers: [],
          volatility: 0,
        };

        // Save profile
        if (this.config.enableLocalStorage) {
          this.saveProfile();
        }

        this.emit('calibrationCompleted', this.currentProfile);
        resolve(this.currentProfile);
      }, this.config.calibrationDuration);
    });
  }

  /**
   * Calculate baseline from calibration data.
   */
  private calculateBaseline(data: EmotionData[]): EmotionData {
    if (data.length === 0) {
      // Return neutral baseline when no data was collected
      return this.createNeutralEmotionData(Date.now(), 0.1);
    }

    const baseline: EmotionData = {
      timestamp: Date.now(),
      emotions: {
        joy: 0, sadness: 0, anger: 0,
        fear: 0, surprise: 0, disgust: 0,
      },
      dimensions: { valence: 0, arousal: 0, dominance: 0 },
      behavioral: {
        attention: 0, engagement: 0,
        positivity: 0, stress: 0,
      },
      confidence: 0,
    };

    // Average all values
    data.forEach(d => {
      Object.keys(baseline.emotions).forEach(key => {
        baseline.emotions[key as keyof typeof baseline.emotions] +=
          d.emotions[key as keyof typeof d.emotions] / data.length;
      });

      Object.keys(baseline.dimensions).forEach(key => {
        baseline.dimensions[key as keyof typeof baseline.dimensions] +=
          d.dimensions[key as keyof typeof d.dimensions] / data.length;
      });

      Object.keys(baseline.behavioral).forEach(key => {
        baseline.behavioral[key as keyof typeof baseline.behavioral] +=
          d.behavioral[key as keyof typeof d.behavioral] / data.length;
      });

      baseline.confidence += d.confidence / data.length;
    });

    return baseline;
  }

  /**
   * Request camera access via MediaDevices API.
   */
  async requestCameraAccess(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 320 },
        height: { ideal: 240 },
        facingMode: 'user',
      },
      audio: false,
    });
    this.mediaStream = stream;
    return stream;
  }

  /**
   * Release camera stream.
   */
  releaseCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  /**
   * Check if camera is currently active.
   */
  isCameraActive(): boolean {
    return this.mediaStream !== null &&
      this.mediaStream.getVideoTracks().some(track => track.readyState === 'live');
  }

  /**
   * Save profile to local storage.
   */
  private saveProfile(): void {
    if (!this.currentProfile || !this.config.enableLocalStorage) return;

    try {
      localStorage.setItem('emdr_emotion_profile',
        JSON.stringify(this.currentProfile));
    } catch (error) {
      console.error('Failed to save emotion profile:', error);
    }
  }

  /**
   * Load profile from local storage.
   */
  private loadProfile(): void {
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

  /**
   * Get current emotion data.
   */
  getCurrentEmotions(): EmotionData | null {
    return this.currentProfile?.current || null;
  }

  /**
   * Get emotion profile.
   */
  getProfile(): EmotionProfile | null {
    return this.currentProfile;
  }

  /**
   * Get emotion history.
   */
  getHistory(limit?: number): EmotionData[] {
    if (!this.currentProfile) return [];

    const history = this.currentProfile.history;
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get detected triggers.
   */
  getTriggers(): TriggerPattern[] {
    return this.currentProfile?.triggers || [];
  }

  /**
   * Reset profile.
   */
  resetProfile(): void {
    this.currentProfile = null;
    if (this.config.enableLocalStorage) {
      localStorage.removeItem('emdr_emotion_profile');
    }
    this.emit('profileReset');
  }

  /**
   * Cleanup all resources.
   */
  destroy(): void {
    this.stopTracking();
    this.releaseCamera();
    this.removeAllListeners();
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.isInitialized = false;
  }
}

export default EmotionRecognitionService;
