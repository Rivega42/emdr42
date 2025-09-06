/**
 * Emotion Recognition Module
 * Integration with MorphCast SDK for privacy-first emotion detection
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

export class EmotionRecognitionService extends EventEmitter {
  private isInitialized = false;
  private morphcastSDK: any = null;
  private currentProfile: EmotionProfile | null = null;
  private calibrationData: EmotionData[] = [];
  private isCalibrating = false;
  private updateInterval: NodeJS.Timeout | null = null;
  
  constructor(private config: {
    licenseKey: string;
    updateFrequency?: number; // ms
    calibrationDuration?: number; // ms
    enableLocalStorage?: boolean;
  }) {
    super();
    this.config.updateFrequency = config.updateFrequency || 100;
    this.config.calibrationDuration = config.calibrationDuration || 30000;
    this.config.enableLocalStorage = config.enableLocalStorage ?? true;
  }

  /**
   * Initialize MorphCast SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load MorphCast SDK
      // @ts-ignore - SDK will be loaded dynamically
      await window.CY.loader()
        .licenseKey(this.config.licenseKey)
        .addModule(window.CY.modules().FACE_EMOTION.name)
        .addModule(window.CY.modules().FACE_ATTENTION.name)
        .addModule(window.CY.modules().FACE_FEATURES.name)
        .load();

      // @ts-ignore
      this.morphcastSDK = window.CY;
      this.isInitialized = true;
      
      // Load existing profile if available
      if (this.config.enableLocalStorage) {
        this.loadProfile();
      }

      // Start emotion tracking
      this.startTracking();
      
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize MorphCast SDK:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start emotion tracking
   */
  private startTracking(): void {
    if (!this.morphcastSDK) return;

    this.updateInterval = setInterval(() => {
      this.updateEmotionData();
    }, this.config.updateFrequency);
  }

  /**
   * Stop emotion tracking
   */
  stopTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update emotion data from MorphCast
   */
  private async updateEmotionData(): Promise<void> {
    if (!this.morphcastSDK) return;

    try {
      // Get raw emotion data from MorphCast
      const rawEmotions = await this.morphcastSDK.getEmotions();
      const attention = await this.morphcastSDK.getAttention();
      const features = await this.morphcastSDK.getFaceFeatures();

      const emotionData: EmotionData = {
        timestamp: Date.now(),
        emotions: {
          joy: rawEmotions.Happy || 0,
          sadness: rawEmotions.Sad || 0,
          anger: rawEmotions.Angry || 0,
          fear: rawEmotions.Fear || 0,
          surprise: rawEmotions.Surprise || 0,
          disgust: rawEmotions.Disgust || 0
        },
        dimensions: {
          valence: this.calculateValence(rawEmotions),
          arousal: this.calculateArousal(rawEmotions, features),
          dominance: this.calculateDominance(rawEmotions, features)
        },
        behavioral: {
          attention: attention.attention || 0,
          engagement: this.calculateEngagement(attention, rawEmotions),
          positivity: this.calculatePositivity(rawEmotions),
          stress: this.calculateStress(rawEmotions, features)
        },
        confidence: features.confidence || 0
      };

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
      
    } catch (error) {
      console.error('Error updating emotion data:', error);
      this.emit('error', error);
    }
  }

  /**
   * Calculate emotional valence
   */
  private calculateValence(emotions: any): number {
    const positive = (emotions.Happy || 0) + (emotions.Surprise || 0) * 0.5;
    const negative = (emotions.Sad || 0) + (emotions.Angry || 0) + 
                    (emotions.Fear || 0) + (emotions.Disgust || 0);
    
    const total = positive + negative;
    if (total === 0) return 0;
    
    return (positive - negative) / total;
  }

  /**
   * Calculate arousal level
   */
  private calculateArousal(emotions: any, features: any): number {
    const highArousal = (emotions.Angry || 0) + (emotions.Fear || 0) + 
                       (emotions.Surprise || 0);
    const lowArousal = (emotions.Sad || 0) * 0.5;
    
    let arousal = (highArousal - lowArousal) / 3;
    
    // Adjust based on facial features if available
    if (features?.eyeOpenness) {
      arousal = arousal * 0.8 + features.eyeOpenness * 0.2;
    }
    
    return Math.max(0, Math.min(1, arousal));
  }

  /**
   * Calculate dominance level
   */
  private calculateDominance(emotions: any, features: any): number {
    const dominant = (emotions.Angry || 0) * 0.8 + (emotions.Disgust || 0) * 0.5;
    const submissive = (emotions.Fear || 0) + (emotions.Sad || 0) * 0.7;
    
    const dominance = (dominant - submissive + 1) / 2;
    return Math.max(0, Math.min(1, dominance));
  }

  /**
   * Calculate engagement level
   */
  private calculateEngagement(attention: any, emotions: any): number {
    const attentionScore = attention.attention || 0;
    const emotionalIntensity = Object.values(emotions)
      .reduce((sum: number, val: any) => sum + (val || 0), 0) / 6;
    
    return attentionScore * 0.7 + emotionalIntensity * 0.3;
  }

  /**
   * Calculate positivity index
   */
  private calculatePositivity(emotions: any): number {
    const positive = emotions.Happy || 0;
    const negative = (emotions.Sad || 0) + (emotions.Angry || 0) + 
                    (emotions.Fear || 0) + (emotions.Disgust || 0);
    
    if (positive + negative === 0) return 0.5;
    return positive / (positive + negative);
  }

  /**
   * Calculate stress level
   */
  private calculateStress(emotions: any, features: any): number {
    const stressEmotions = (emotions.Fear || 0) * 1.2 + 
                          (emotions.Angry || 0) + 
                          (emotions.Sad || 0) * 0.8 +
                          (emotions.Disgust || 0) * 0.6;
    
    let stress = stressEmotions / 3;
    
    // Adjust based on facial tension if available
    if (features?.facialTension) {
      stress = stress * 0.7 + features.facialTension * 0.3;
    }
    
    return Math.max(0, Math.min(1, stress));
  }

  /**
   * Calculate emotional volatility
   */
  private calculateVolatility(): number {
    if (!this.currentProfile || this.currentProfile.history.length < 10) {
      return 0;
    }

    const recent = this.currentProfile.history.slice(-10);
    const values = recent.map(e => e.dimensions.valence);
    
    // Calculate standard deviation
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Detect emotional triggers
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
        intensity: data.behavioral.stress
      });
      
      this.emit('triggerDetected', {
        type: 'stress_spike',
        data: data
      });
    }

    // Check for attention drop
    if (data.behavioral.attention < 0.2 && 
        this.currentProfile.baseline.behavioral.attention > 0.5) {
      
      this.currentProfile.triggers.push({
        emotionSignature: data,
        timestamp: data.timestamp,
        context: 'attention_loss',
        intensity: 1 - data.behavioral.attention
      });
      
      this.emit('triggerDetected', {
        type: 'attention_loss',
        data: data
      });
    }
  }

  /**
   * Check for alerts
   */
  private checkAlerts(data: EmotionData): void {
    // High stress alert
    if (data.behavioral.stress > 0.85) {
      this.emit('alert', {
        type: 'high_stress',
        severity: 'warning',
        data: data
      });
    }

    // Dissociation alert
    if (data.behavioral.attention < 0.1 && data.behavioral.engagement < 0.1) {
      this.emit('alert', {
        type: 'dissociation',
        severity: 'critical',
        data: data
      });
    }

    // Low confidence alert
    if (data.confidence < 0.3) {
      this.emit('alert', {
        type: 'low_confidence',
        severity: 'info',
        data: data
      });
    }
  }

  /**
   * Start calibration
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
          volatility: 0
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
   * Calculate baseline from calibration data
   */
  private calculateBaseline(data: EmotionData[]): EmotionData {
    if (data.length === 0) {
      throw new Error('No calibration data available');
    }

    const baseline: EmotionData = {
      timestamp: Date.now(),
      emotions: {
        joy: 0, sadness: 0, anger: 0, 
        fear: 0, surprise: 0, disgust: 0
      },
      dimensions: { valence: 0, arousal: 0, dominance: 0 },
      behavioral: { 
        attention: 0, engagement: 0, 
        positivity: 0, stress: 0 
      },
      confidence: 0
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
   * Save profile to local storage
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
   * Load profile from local storage
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
   * Get current emotion data
   */
  getCurrentEmotions(): EmotionData | null {
    return this.currentProfile?.current || null;
  }

  /**
   * Get emotion profile
   */
  getProfile(): EmotionProfile | null {
    return this.currentProfile;
  }

  /**
   * Get emotion history
   */
  getHistory(limit?: number): EmotionData[] {
    if (!this.currentProfile) return [];
    
    const history = this.currentProfile.history;
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get detected triggers
   */
  getTriggers(): TriggerPattern[] {
    return this.currentProfile?.triggers || [];
  }

  /**
   * Reset profile
   */
  resetProfile(): void {
    this.currentProfile = null;
    if (this.config.enableLocalStorage) {
      localStorage.removeItem('emdr_emotion_profile');
    }
    this.emit('profileReset');
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopTracking();
    this.removeAllListeners();
    this.morphcastSDK = null;
    this.isInitialized = false;
  }
}

export default EmotionRecognitionService;
