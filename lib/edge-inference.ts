/**
 * Edge-инференс для распознавания эмоций на устройстве пользователя.
 * Использует ONNX Runtime Web с поддержкой WebGPU/WASM.
 *
 * Приоритет бэкендов:
 * 1. WebGPU — максимальная производительность (если поддерживается)
 * 2. WASM — универсальный fallback
 *
 * Модель: FER (Facial Expression Recognition) в формате ONNX
 * Вход: 48x48 grayscale → Выход: 7 эмоций + confidence
 */

import * as ort from 'onnxruntime-web';

export interface EmotionPrediction {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
  neutral: number;
  dominant: string;
  confidence: number;
}

const EMOTION_LABELS = ['anger', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise'] as const;

let session: ort.InferenceSession | null = null;
let currentBackend: string = 'unknown';

/** Проверка поддержки WebGPU */
export function isWebGPUSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/** Инициализация ONNX Runtime с автоопределением бэкенда */
export async function initInference(modelPath: string = '/models/fer.onnx'): Promise<string> {
  if (session) return currentBackend;

  // Попробовать WebGPU, затем WASM
  const backends: ort.InferenceSession.ExecutionProviderConfig[] = [];
  if (isWebGPUSupported()) {
    backends.push('webgpu');
  }
  backends.push('wasm');

  for (const backend of backends) {
    try {
      session = await ort.InferenceSession.create(modelPath, {
        executionProviders: [backend],
      });
      currentBackend = typeof backend === 'string' ? backend : 'wasm';
      console.log(`[INFERENCE] Инициализирован с бэкендом: ${currentBackend}`);
      return currentBackend;
    } catch (e) {
      console.warn(`[INFERENCE] Бэкенд ${backend} недоступен:`, e);
    }
  }

  throw new Error('Не удалось инициализировать ONNX Runtime');
}

/** Предобработка кадра: извлечение 48x48 grayscale из ImageData */
export function preprocessFrame(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData;
  const targetSize = 48;
  const result = new Float32Array(targetSize * targetSize);

  // Масштабирование и конвертация в grayscale
  const scaleX = width / targetSize;
  const scaleY = height / targetSize;

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIdx = (srcY * width + srcX) * 4;

      // RGB → Grayscale (ITU-R BT.601)
      const gray = 0.299 * data[srcIdx] + 0.587 * data[srcIdx + 1] + 0.114 * data[srcIdx + 2];
      result[y * targetSize + x] = gray / 255.0;
    }
  }

  return result;
}

/** Инференс: получить предсказание эмоций из предобработанных данных */
export async function predict(input: Float32Array): Promise<EmotionPrediction> {
  if (!session) {
    throw new Error('ONNX Runtime не инициализирован. Вызовите initInference() сначала.');
  }

  const tensor = new ort.Tensor('float32', input, [1, 1, 48, 48]);
  const results = await session.run({ input: tensor });

  // Softmax по выходу модели
  const output = results[Object.keys(results)[0]];
  const scores = Array.from(output.data as Float32Array);
  const probabilities = softmax(scores);

  const prediction: Record<string, number> = {};
  let maxIdx = 0;
  let maxVal = 0;

  for (let i = 0; i < EMOTION_LABELS.length; i++) {
    prediction[EMOTION_LABELS[i]] = probabilities[i];
    if (probabilities[i] > maxVal) {
      maxVal = probabilities[i];
      maxIdx = i;
    }
  }

  return {
    joy: prediction.joy ?? 0,
    sadness: prediction.sadness ?? 0,
    anger: prediction.anger ?? 0,
    fear: prediction.fear ?? 0,
    surprise: prediction.surprise ?? 0,
    disgust: prediction.disgust ?? 0,
    neutral: prediction.neutral ?? 0,
    dominant: EMOTION_LABELS[maxIdx],
    confidence: maxVal,
  };
}

/** Освобождение ресурсов */
export async function dispose(): Promise<void> {
  if (session) {
    await session.release();
    session = null;
  }
}

/** Получить текущий бэкенд */
export function getBackend(): string {
  return currentBackend;
}

// --- Утилиты ---

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}
