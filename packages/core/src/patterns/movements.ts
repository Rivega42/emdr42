/**
 * EMDR Movement Patterns
 * Core movement patterns for bilateral stimulation
 */

import { Vector3 } from 'three';

export interface MovementPattern {
  name: string;
  description: string;
  calculate: (time: number, speed: number, size: number) => Vector3;
  defaultSpeed: number;
  recommendedFor: string[];
}

export class MovementPatterns {
  private static patterns: Map<string, MovementPattern> = new Map();

  static {
    // Initialize all patterns
    this.registerPattern({
      name: 'horizontal',
      description: 'Classic EMDR horizontal movement',
      calculate: (time: number, speed: number, size: number) => {
        const effectiveTime = time * speed;
        return new Vector3(
          Math.sin(effectiveTime) * size,
          0,
          0
        );
      },
      defaultSpeed: 1.0,
      recommendedFor: ['trauma', 'anxiety', 'classic_emdr']
    });

    this.registerPattern({
      name: 'infinity',
      description: 'Figure-eight infinity pattern',
      calculate: (time: number, speed: number, size: number) => {
        const effectiveTime = time * speed;
        return new Vector3(
          Math.sin(effectiveTime) * size,
          Math.sin(effectiveTime * 2) * size * 0.5,
          0
        );
      },
      defaultSpeed: 0.8,
      recommendedFor: ['relaxation', 'meditation', 'gentle_processing']
    });

    this.registerPattern({
      name: 'diagonal',
      description: 'Diagonal movement for reduced eye strain',
      calculate: (time: number, speed: number, size: number) => {
        const effectiveTime = time * speed;
        return new Vector3(
          Math.sin(effectiveTime) * size,
          Math.sin(effectiveTime) * size * 0.5,
          0
        );
      },
      defaultSpeed: 0.9,
      recommendedFor: ['long_sessions', 'eye_comfort']
    });

    this.registerPattern({
      name: 'circular',
      description: 'Circular motion for deep relaxation',
      calculate: (time: number, speed: number, size: number) => {
        const effectiveTime = time * speed;
        return new Vector3(
          Math.cos(effectiveTime) * size,
          Math.sin(effectiveTime) * size,
          0
        );
      },
      defaultSpeed: 0.7,
      recommendedFor: ['relaxation', 'sleep', 'anxiety_relief']
    });

    this.registerPattern({
      name: 'butterfly',
      description: 'Butterfly wings pattern',
      calculate: (time: number, speed: number, size: number) => {
        const effectiveTime = time * speed;
        const scale = Math.sin(effectiveTime * 0.5) + 1.5;
        return new Vector3(
          Math.sin(effectiveTime) * Math.cos(effectiveTime) * size * scale,
          Math.sin(effectiveTime) * Math.sin(effectiveTime) * size,
          0
        );
      },
      defaultSpeed: 0.6,
      recommendedFor: ['creative_processing', 'gentle_therapy']
    });

    this.registerPattern({
      name: 'spiral',
      description: 'Expanding and contracting spiral',
      calculate: (time: number, speed: number, size: number) => {
        const effectiveTime = time * speed;
        const radius = (Math.sin(effectiveTime * 0.3) + 1) * size * 0.5;
        return new Vector3(
          Math.cos(effectiveTime * 3) * radius,
          Math.sin(effectiveTime * 3) * radius,
          0
        );
      },
      defaultSpeed: 0.5,
      recommendedFor: ['deep_processing', 'hypnotic_state']
    });

    this.registerPattern({
      name: 'wave',
      description: 'Natural wave-like motion',
      calculate: (time: number, speed: number, size: number) => {
        const effectiveTime = time * speed;
        return new Vector3(
          Math.sin(effectiveTime) * size,
          Math.sin(effectiveTime * 3) * Math.cos(effectiveTime * 2) * size * 0.3,
          0
        );
      },
      defaultSpeed: 0.8,
      recommendedFor: ['natural_rhythm', 'breathing_sync']
    });

    this.registerPattern({
      name: 'lissajous',
      description: 'Complex Lissajous curve pattern',
      calculate: (time: number, speed: number, size: number) => {
        const effectiveTime = time * speed;
        return new Vector3(
          Math.sin(effectiveTime * 3 + Math.PI / 2) * size,
          Math.sin(effectiveTime * 2) * size * 0.8,
          0
        );
      },
      defaultSpeed: 0.6,
      recommendedFor: ['advanced_users', 'complex_processing']
    });

    this.registerPattern({
      name: 'pendulum',
      description: 'Natural pendulum swing',
      calculate: (time: number, speed: number, size: number) => {
        const effectiveTime = time * speed;
        const angle = Math.sin(effectiveTime) * Math.PI / 3;
        return new Vector3(
          Math.sin(angle) * size,
          (1 - Math.cos(angle)) * size * 0.3,
          0
        );
      },
      defaultSpeed: 0.7,
      recommendedFor: ['grounding', 'stabilization']
    });

    this.registerPattern({
      name: 'random_smooth',
      description: 'Smooth random movement',
      calculate: (time: number, speed: number, size: number) => {
        const effectiveTime = time * speed;
        // Use multiple sine waves with different frequencies for pseudo-random smooth movement
        const x = (
          Math.sin(effectiveTime * 1.1) * 0.3 +
          Math.sin(effectiveTime * 2.3) * 0.3 +
          Math.sin(effectiveTime * 3.7) * 0.4
        ) * size;
        const y = (
          Math.sin(effectiveTime * 1.7) * 0.3 +
          Math.sin(effectiveTime * 2.1) * 0.3 +
          Math.sin(effectiveTime * 3.3) * 0.4
        ) * size * 0.7;
        return new Vector3(x, y, 0);
      },
      defaultSpeed: 0.5,
      recommendedFor: ['exploration', 'novelty_seeking']
    });
  }

  static registerPattern(pattern: MovementPattern): void {
    this.patterns.set(pattern.name, pattern);
  }

  static getPattern(name: string): MovementPattern | undefined {
    return this.patterns.get(name);
  }

  static getAllPatterns(): MovementPattern[] {
    return Array.from(this.patterns.values());
  }

  static getPatternNames(): string[] {
    return Array.from(this.patterns.keys());
  }

  static getRecommendedPatterns(condition: string): MovementPattern[] {
    return this.getAllPatterns().filter(pattern =>
      pattern.recommendedFor.includes(condition)
    );
  }

  /**
   * Adaptive pattern selection based on user state
   */
  static selectAdaptivePattern(
    stress: number,
    engagement: number,
    previousPattern: string
  ): string {
    // High stress: use calming patterns
    if (stress > 0.7) {
      const calmingPatterns = ['circular', 'wave', 'pendulum'];
      return calmingPatterns[Math.floor(Math.random() * calmingPatterns.length)];
    }

    // Low engagement: use more stimulating patterns
    if (engagement < 0.3) {
      const stimulatingPatterns = ['butterfly', 'lissajous', 'random_smooth'];
      const filtered = stimulatingPatterns.filter(p => p !== previousPattern);
      return filtered[Math.floor(Math.random() * filtered.length)];
    }

    // Default: classic patterns
    const defaultPatterns = ['horizontal', 'infinity', 'diagonal'];
    return defaultPatterns[Math.floor(Math.random() * defaultPatterns.length)];
  }

  /**
   * Calculate optimal speed based on user metrics
   */
  static calculateOptimalSpeed(
    baseSpeed: number,
    heartRate?: number,
    stress?: number
  ): number {
    let speed = baseSpeed;

    // Adjust based on heart rate if available
    if (heartRate) {
      const normalHR = 70;
      const hrRatio = heartRate / normalHR;
      if (hrRatio > 1.3) {
        speed *= 0.8; // Slow down for high HR
      } else if (hrRatio < 0.9) {
        speed *= 1.1; // Speed up for low HR
      }
    }

    // Adjust based on stress level
    if (stress !== undefined) {
      if (stress > 0.7) {
        speed *= 0.85; // Slow down for high stress
      } else if (stress < 0.3) {
        speed *= 1.05; // Slightly faster for low stress
      }
    }

    // Clamp speed to reasonable range
    return Math.max(0.3, Math.min(2.0, speed));
  }
}

export default MovementPatterns;
