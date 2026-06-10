/**
 * Spec для lib/edge-inference.ts (#150) — ONNX Runtime Web emotion inference.
 *
 * Модуль держит singleton session/currentBackend на module-scope, поэтому
 * каждый тест использует jest.isolateModules для чистого состояния.
 *
 * onnxruntime-web мокается целиком — реальный WebGPU/WASM недоступен в jsdom.
 */

const makeMockTensor = jest.fn();
const mockSessionRun = jest.fn();
const mockSessionRelease = jest.fn();
const mockSessionCreate = jest.fn();

jest.mock('onnxruntime-web', () => ({
  Tensor: jest.fn().mockImplementation((type, data, dims) => {
    makeMockTensor(type, data, dims);
    return { type, data, dims };
  }),
  InferenceSession: {
    create: (...args: any[]) => mockSessionCreate(...args),
  },
}));

describe('edge-inference (#150)', () => {
  let originalWarn: typeof console.warn;
  let originalLog: typeof console.log;

  beforeEach(() => {
    jest.resetModules();
    mockSessionCreate.mockReset();
    mockSessionRun.mockReset();
    mockSessionRelease.mockReset();
    makeMockTensor.mockReset();
    originalWarn = console.warn;
    originalLog = console.log;
    console.warn = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    console.warn = originalWarn;
    console.log = originalLog;
    // Сбрасываем gpu чтобы не утекало между тестами
    if ((global.navigator as any)?.gpu) {
      delete (global.navigator as any).gpu;
    }
  });

  // jsdom держит navigator как non-configurable getter — мутируем поле gpu
  const setGpuSupport = (supported: boolean) => {
    if (supported) {
      Object.defineProperty(global.navigator, 'gpu', {
        configurable: true,
        value: {},
      });
    } else if ((global.navigator as any).gpu) {
      delete (global.navigator as any).gpu;
    }
  };

  describe('isWebGPUSupported', () => {
    it('true когда navigator.gpu существует', () => {
      setGpuSupport(true);
      const { isWebGPUSupported } = require('../edge-inference');
      expect(isWebGPUSupported()).toBe(true);
    });

    it('false когда gpu отсутствует', () => {
      setGpuSupport(false);
      const { isWebGPUSupported } = require('../edge-inference');
      expect(isWebGPUSupported()).toBe(false);
    });
  });

  describe('initInference', () => {
    it('пробует WebGPU первым когда поддерживается', async () => {
      setGpuSupport(true);
      mockSessionCreate.mockResolvedValueOnce({ run: mockSessionRun, release: mockSessionRelease });

      const { initInference } = require('../edge-inference');
      const backend = await initInference('/models/fer.onnx');

      expect(backend).toBe('webgpu');
      expect(mockSessionCreate).toHaveBeenCalledWith(
        '/models/fer.onnx',
        expect.objectContaining({ executionProviders: ['webgpu'] }),
      );
    });

    it('фоллбек на WASM когда WebGPU недоступен', async () => {
      setGpuSupport(false);
      mockSessionCreate.mockResolvedValueOnce({ run: mockSessionRun, release: mockSessionRelease });

      const { initInference } = require('../edge-inference');
      const backend = await initInference('/models/fer.onnx');

      expect(backend).toBe('wasm');
      expect(mockSessionCreate).toHaveBeenCalledWith(
        '/models/fer.onnx',
        expect.objectContaining({ executionProviders: ['wasm'] }),
      );
      expect(mockSessionCreate).toHaveBeenCalledTimes(1);
    });

    it('фоллбек на WASM когда WebGPU инициализация падает', async () => {
      setGpuSupport(true);
      mockSessionCreate
        .mockRejectedValueOnce(new Error('webgpu not really supported'))
        .mockResolvedValueOnce({ run: mockSessionRun, release: mockSessionRelease });

      const { initInference } = require('../edge-inference');
      const backend = await initInference();

      expect(backend).toBe('wasm');
      expect(mockSessionCreate).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenCalled();
    });

    it('кидает Error когда все бэкенды недоступны', async () => {
      setGpuSupport(true);
      mockSessionCreate.mockRejectedValue(new Error('any backend failure'));

      const { initInference } = require('../edge-inference');
      await expect(initInference()).rejects.toThrow(/Не удалось инициализировать/);
    });

    it('повторный init — no-op (singleton)', async () => {
      setGpuSupport(false);
      mockSessionCreate.mockResolvedValue({ run: mockSessionRun, release: mockSessionRelease });

      const { initInference } = require('../edge-inference');
      const first = await initInference();
      const second = await initInference();

      expect(first).toBe(second);
      expect(mockSessionCreate).toHaveBeenCalledTimes(1);
    });

    it('использует дефолтный путь /models/fer.onnx', async () => {
      setGpuSupport(false);
      mockSessionCreate.mockResolvedValue({ run: mockSessionRun, release: mockSessionRelease });

      const { initInference } = require('../edge-inference');
      await initInference();
      expect(mockSessionCreate).toHaveBeenCalledWith('/models/fer.onnx', expect.any(Object));
    });
  });

  describe('preprocessFrame', () => {
    it('возвращает Float32Array длиной 48*48 = 2304', () => {
      const { preprocessFrame } = require('../edge-inference');
      const imageData = {
        data: new Uint8ClampedArray(64 * 64 * 4),
        width: 64,
        height: 64,
      } as unknown as ImageData;

      const result = preprocessFrame(imageData);
      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(48 * 48);
    });

    it('нормализует pixel в [0, 1]', () => {
      const { preprocessFrame } = require('../edge-inference');
      // Полностью белый фрейм 48x48 → все значения должны быть = 1
      const w = 48;
      const data = new Uint8ClampedArray(w * w * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255; // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
        data[i + 3] = 255; // A
      }
      const result = preprocessFrame({ data, width: w, height: w } as unknown as ImageData);
      expect(result[0]).toBeCloseTo(1.0, 5);
      expect(result[result.length - 1]).toBeCloseTo(1.0, 5);
    });

    it('конвертация RGB→Grayscale по BT.601 (0.299R + 0.587G + 0.114B)', () => {
      const { preprocessFrame } = require('../edge-inference');
      // 48x48 чисто-красный (R=255) → ожидаем gray = 255 * 0.299 / 255 = 0.299
      const w = 48;
      const data = new Uint8ClampedArray(w * w * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;
      }
      const result = preprocessFrame({ data, width: w, height: w } as unknown as ImageData);
      expect(result[0]).toBeCloseTo(0.299, 4);
    });

    it('масштабирует down-sample больших изображений в 48x48', () => {
      const { preprocessFrame } = require('../edge-inference');
      // 96x96 → должно стать 48x48
      const data = new Uint8ClampedArray(96 * 96 * 4);
      const result = preprocessFrame({ data, width: 96, height: 96 } as unknown as ImageData);
      expect(result.length).toBe(2304);
    });

    it('масштабирует up-sample мелких изображений', () => {
      const { preprocessFrame } = require('../edge-inference');
      const data = new Uint8ClampedArray(24 * 24 * 4);
      const result = preprocessFrame({ data, width: 24, height: 24 } as unknown as ImageData);
      expect(result.length).toBe(2304);
    });
  });

  describe('predict', () => {
    it('бросает если session не инициализирована', async () => {
      const { predict } = require('../edge-inference');
      await expect(predict(new Float32Array(2304))).rejects.toThrow(/не инициализирован/i);
    });

    it('создаёт Tensor с формой [1, 1, 48, 48]', async () => {
      setGpuSupport(false);
      mockSessionRun.mockResolvedValue({
        output: { data: new Float32Array([0, 0, 0, 5, 0, 0, 0]) },
      });
      mockSessionCreate.mockResolvedValue({ run: mockSessionRun, release: mockSessionRelease });

      const { initInference, predict } = require('../edge-inference');
      await initInference();
      const input = new Float32Array(2304);
      await predict(input);

      expect(makeMockTensor).toHaveBeenCalledWith('float32', input, [1, 1, 48, 48]);
    });

    it('возвращает доминантную эмоцию по argmax после softmax', async () => {
      setGpuSupport(false);
      // Модель индексы: anger, disgust, fear, joy, neutral, sadness, surprise
      // Высокий logit на joy (index 3)
      mockSessionRun.mockResolvedValue({
        output: { data: new Float32Array([0, 0, 0, 10, 0, 0, 0]) },
      });
      mockSessionCreate.mockResolvedValue({ run: mockSessionRun, release: mockSessionRelease });

      const { initInference, predict } = require('../edge-inference');
      await initInference();
      const result = await predict(new Float32Array(2304));

      expect(result.dominant).toBe('joy');
      expect(result.joy).toBeGreaterThan(0.9);
      expect(result.confidence).toBeCloseTo(result.joy, 5);
    });

    it('softmax: сумма всех эмоций ≈ 1', async () => {
      setGpuSupport(false);
      mockSessionRun.mockResolvedValue({
        output: { data: new Float32Array([1, 1, 1, 1, 1, 1, 1]) },
      });
      mockSessionCreate.mockResolvedValue({ run: mockSessionRun, release: mockSessionRelease });

      const { initInference, predict } = require('../edge-inference');
      await initInference();
      const result = await predict(new Float32Array(2304));

      const sum =
        result.joy +
        result.sadness +
        result.anger +
        result.fear +
        result.surprise +
        result.disgust +
        result.neutral;
      expect(sum).toBeCloseTo(1, 5);
    });

    it('равные logits → равные вероятности (1/7 каждая)', async () => {
      setGpuSupport(false);
      mockSessionRun.mockResolvedValue({
        output: { data: new Float32Array([0, 0, 0, 0, 0, 0, 0]) },
      });
      mockSessionCreate.mockResolvedValue({ run: mockSessionRun, release: mockSessionRelease });

      const { initInference, predict } = require('../edge-inference');
      await initInference();
      const result = await predict(new Float32Array(2304));

      expect(result.joy).toBeCloseTo(1 / 7, 5);
      expect(result.sadness).toBeCloseTo(1 / 7, 5);
    });
  });

  describe('dispose / getBackend', () => {
    it('dispose: вызывает session.release и обнуляет состояние', async () => {
      setGpuSupport(false);
      mockSessionCreate.mockResolvedValue({ run: mockSessionRun, release: mockSessionRelease });

      const { initInference, dispose, predict } = require('../edge-inference');
      await initInference();
      await dispose();

      expect(mockSessionRelease).toHaveBeenCalled();
      // После dispose повторный predict должен снова бросить (session=null)
      await expect(predict(new Float32Array(2304))).rejects.toThrow(/не инициализирован/i);
    });

    it('dispose: no-op когда session не была создана', async () => {
      const { dispose } = require('../edge-inference');
      await expect(dispose()).resolves.toBeUndefined();
      expect(mockSessionRelease).not.toHaveBeenCalled();
    });

    it('getBackend: "unknown" до init', () => {
      const { getBackend } = require('../edge-inference');
      expect(getBackend()).toBe('unknown');
    });

    it('getBackend: возвращает выбранный бэкенд после init', async () => {
      setGpuSupport(false);
      mockSessionCreate.mockResolvedValue({ run: mockSessionRun, release: mockSessionRelease });

      const { initInference, getBackend } = require('../edge-inference');
      await initInference();
      expect(getBackend()).toBe('wasm');
    });
  });
});
