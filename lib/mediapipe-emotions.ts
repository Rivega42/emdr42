/**
 * MediaPipe Face Mesh Emotion Detection
 *
 * Uses 468 facial landmarks from @mediapipe/tasks-vision to compute
 * geometric features and classify emotions via rule-based thresholds.
 * Replaces face-api.js for better performance (30+ FPS on mobile).
 */

export interface MediaPipeEmotionResult {
  dominant: string;
  confidence: number;
  emotions: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    surprised: number;
    fearful: number;
    disgusted: number;
  };
  features: {
    browRaise: number;
    browFurrow: number;
    eyeOpenness: number;
    mouthOpen: number;
    mouthWidth: number;
    lipCornerUp: number;
  };
}

// Key landmark indices for facial features
const LANDMARKS = {
  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  leftBrowInner: 107,
  leftBrowOuter: 70,
  rightBrowInner: 336,
  rightBrowOuter: 300,
  noseTip: 1,
  lipTop: 13,
  lipBottom: 14,
  mouthLeft: 61,
  mouthRight: 291,
  leftLipCorner: 61,
  rightLipCorner: 291,
  chin: 152,
  foreheadCenter: 10,
};

/** EMA (Exponential Moving Average) smoother. */
class EmaSmoother {
  private values: Record<string, number> = {};
  private alpha: number;

  constructor(alpha = 0.3) {
    this.alpha = alpha;
  }

  smooth(key: string, raw: number): number {
    if (!(key in this.values)) {
      this.values[key] = raw;
      return raw;
    }
    this.values[key] = this.alpha * raw + (1 - this.alpha) * this.values[key];
    return this.values[key];
  }
}

/** Baseline calibration from first N frames. */
class BaselineCalibrator {
  private samples: Record<string, number[]> = {};
  private baselines: Record<string, number> = {};
  private calibrated = false;
  private targetFrames: number;

  constructor(targetFrames = 30) {
    this.targetFrames = targetFrames;
  }

  addSample(features: Record<string, number>): void {
    if (this.calibrated) return;
    for (const [key, val] of Object.entries(features)) {
      if (!this.samples[key]) this.samples[key] = [];
      this.samples[key].push(val);
    }
    const firstKey = Object.keys(this.samples)[0];
    if (firstKey && this.samples[firstKey].length >= this.targetFrames) {
      for (const [key, vals] of Object.entries(this.samples)) {
        this.baselines[key] = vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      this.calibrated = true;
    }
  }

  isCalibrated(): boolean {
    return this.calibrated;
  }

  normalize(key: string, value: number): number {
    const baseline = this.baselines[key];
    if (baseline === undefined || baseline === 0) return value;
    return value / baseline;
  }
}

export class MediaPipeEmotionDetector {
  private smoother = new EmaSmoother(0.3);
  private calibrator = new BaselineCalibrator(30);

  /**
   * Compute emotions from a set of 468 face landmarks.
   * Each landmark is {x, y, z} in normalized image coordinates.
   */
  detect(
    landmarks: Array<{ x: number; y: number; z: number }>,
  ): MediaPipeEmotionResult {
    if (landmarks.length < 468) {
      return this.neutralResult();
    }

    // Extract geometric features
    const features = this.extractFeatures(landmarks);

    // Feed to calibrator
    this.calibrator.addSample(features);

    // Smooth features
    const smoothed: Record<string, number> = {};
    for (const [key, val] of Object.entries(features)) {
      smoothed[key] = this.smoother.smooth(key, val);
    }

    // Normalize against baseline if calibrated
    const normalized: Record<string, number> = {};
    for (const [key, val] of Object.entries(smoothed)) {
      normalized[key] = this.calibrator.isCalibrated()
        ? this.calibrator.normalize(key, val)
        : val;
    }

    // Classify emotions
    const emotions = this.classify(normalized);

    // Find dominant
    let dominant = 'neutral';
    let maxScore = 0;
    for (const [emotion, score] of Object.entries(emotions)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = emotion;
      }
    }

    return {
      dominant,
      confidence: Math.min(1, maxScore),
      emotions,
      features: {
        browRaise: smoothed.browRaise ?? 0,
        browFurrow: smoothed.browFurrow ?? 0,
        eyeOpenness: smoothed.eyeOpenness ?? 0,
        mouthOpen: smoothed.mouthOpen ?? 0,
        mouthWidth: smoothed.mouthWidth ?? 0,
        lipCornerUp: smoothed.lipCornerUp ?? 0,
      },
    };
  }

  private extractFeatures(
    lm: Array<{ x: number; y: number; z: number }>,
  ): Record<string, number> {
    const dist = (a: number, b: number) => {
      const pa = lm[a];
      const pb = lm[b];
      return Math.sqrt((pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2);
    };

    // Face height for normalization
    const faceHeight = dist(LANDMARKS.foreheadCenter, LANDMARKS.chin);
    const norm = faceHeight > 0 ? faceHeight : 1;

    return {
      eyeOpenness:
        (dist(LANDMARKS.leftEyeTop, LANDMARKS.leftEyeBottom) +
          dist(LANDMARKS.rightEyeTop, LANDMARKS.rightEyeBottom)) /
        (2 * norm),
      browRaise:
        (dist(LANDMARKS.leftBrowInner, LANDMARKS.leftEyeTop) +
          dist(LANDMARKS.rightBrowInner, LANDMARKS.rightEyeTop)) /
        (2 * norm),
      browFurrow: dist(LANDMARKS.leftBrowInner, LANDMARKS.rightBrowInner) / norm,
      mouthOpen: dist(LANDMARKS.lipTop, LANDMARKS.lipBottom) / norm,
      mouthWidth: dist(LANDMARKS.mouthLeft, LANDMARKS.mouthRight) / norm,
      lipCornerUp:
        (lm[LANDMARKS.noseTip].y -
          (lm[LANDMARKS.leftLipCorner].y + lm[LANDMARKS.rightLipCorner].y) / 2) /
        norm,
    };
  }

  private classify(f: Record<string, number>): MediaPipeEmotionResult['emotions'] {
    // Rule-based thresholds (relative to normalized baseline ~1.0)
    const happy = Math.max(
      0,
      (f.lipCornerUp > 1.1 ? 0.4 : 0) +
        (f.mouthWidth > 1.1 ? 0.3 : 0) +
        (f.eyeOpenness < 0.95 ? 0.2 : 0), // squint in genuine smile
    );

    const surprised = Math.max(
      0,
      (f.eyeOpenness > 1.15 ? 0.4 : 0) +
        (f.browRaise > 1.15 ? 0.3 : 0) +
        (f.mouthOpen > 1.3 ? 0.3 : 0),
    );

    const angry = Math.max(
      0,
      (f.browFurrow < 0.9 ? 0.4 : 0) +
        (f.eyeOpenness < 0.9 ? 0.3 : 0) +
        (f.lipCornerUp < 0.9 ? 0.2 : 0),
    );

    const sad = Math.max(
      0,
      (f.lipCornerUp < 0.9 ? 0.4 : 0) +
        (f.browRaise < 0.9 ? 0.3 : 0) +
        (f.mouthWidth < 0.95 ? 0.2 : 0),
    );

    const fearful = Math.max(
      0,
      (f.eyeOpenness > 1.1 ? 0.3 : 0) +
        (f.browRaise > 1.1 ? 0.3 : 0) +
        (f.mouthOpen > 1.1 ? 0.2 : 0) +
        (f.browFurrow < 0.95 ? 0.1 : 0),
    );

    const disgusted = Math.max(
      0,
      (f.browFurrow < 0.9 ? 0.3 : 0) +
        (f.lipCornerUp < 0.85 ? 0.4 : 0) +
        (f.mouthOpen > 1.05 ? 0.2 : 0),
    );

    const totalExpressive = happy + surprised + angry + sad + fearful + disgusted;
    const neutral = Math.max(0, 1 - totalExpressive);

    return { neutral, happy, sad, angry, surprised, fearful, disgusted };
  }

  private neutralResult(): MediaPipeEmotionResult {
    return {
      dominant: 'neutral',
      confidence: 0,
      emotions: { neutral: 1, happy: 0, sad: 0, angry: 0, surprised: 0, fearful: 0, disgusted: 0 },
      features: { browRaise: 0, browFurrow: 0, eyeOpenness: 0, mouthOpen: 0, mouthWidth: 0, lipCornerUp: 0 },
    };
  }
}
