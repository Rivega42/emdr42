# 📋 Technical Backlog

> Идеи и технические решения для будущей реализации.
> Приоритизировать по мере необходимости.

---

## 🧠 Emotion Recognition — альтернативы face-api.js

### Проблема
- face-api.js устарел (2019), использует CPU
- 15-20 FPS на среднем устройстве
- Высокое энергопотребление на мобильных

### Решения (по сложности)

#### 1. Rule-based классификатор на MediaPipe landmarks (1-2 дня)

MediaPipe Face Mesh даёт 468 точек лица. Из них вычисляем геометрические признаки:

```typescript
// lib/emotion-rules.ts
interface LandmarkFeatures {
  browRaise: number;      // Поднятие бровей
  browFurrow: number;     // Сведение бровей
  eyeOpenness: number;    // Открытость глаз
  mouthOpen: number;      // Открытость рта
  mouthWidth: number;     // Ширина рта
  lipCornerUp: number;    // Уголки губ вверх/вниз
  noseWrinkle: number;    // Морщины у носа
}

function extractFeatures(landmarks: NormalizedLandmark[]): LandmarkFeatures {
  const faceHeight = distance(landmarks[10], landmarks[152]);
  const faceWidth = distance(landmarks[234], landmarks[454]);
  
  return {
    browRaise: distance(landmarks[66], landmarks[105]) / faceHeight,
    browFurrow: distance(landmarks[66], landmarks[107]) / faceWidth,
    eyeOpenness: (
      distance(landmarks[159], landmarks[145]) + 
      distance(landmarks[386], landmarks[374])
    ) / 2 / faceHeight,
    mouthOpen: distance(landmarks[13], landmarks[14]) / faceHeight,
    mouthWidth: distance(landmarks[61], landmarks[291]) / faceWidth,
    lipCornerUp: (
      (landmarks[61].y + landmarks[291].y) / 2 - landmarks[0].y
    ) / faceHeight,
    noseWrinkle: distance(landmarks[168], landmarks[6]) / faceHeight,
  };
}

function classifyEmotion(f: LandmarkFeatures): EmotionScores {
  const scores: EmotionScores = {
    neutral: 0.3,
    happy: 0,
    sad: 0,
    angry: 0,
    fearful: 0,
    disgusted: 0,
    surprised: 0,
  };

  // Happy: wide mouth, corners up
  if (f.mouthWidth > 0.38 && f.lipCornerUp > 0.015) {
    scores.happy = 0.6 + f.mouthWidth * 0.5;
    scores.neutral -= 0.3;
  }

  // Surprised: raised brows, open eyes, open mouth
  if (f.browRaise > 0.22 && f.eyeOpenness > 0.035 && f.mouthOpen > 0.05) {
    scores.surprised = 0.7;
    scores.neutral -= 0.3;
  }

  // Angry: furrowed brows, tense mouth
  if (f.browFurrow > 0.25 && f.mouthOpen < 0.02) {
    scores.angry = 0.6;
    scores.neutral -= 0.3;
  }

  // Sad: corners down, low brows
  if (f.lipCornerUp < -0.01 && f.browRaise < 0.15) {
    scores.sad = 0.5;
    scores.neutral -= 0.2;
  }

  // Normalize
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(scores)) {
    scores[key as keyof EmotionScores] /= total;
  }

  return scores;
}
```

**Точность:** ~70-75%
**Скорость:** 60+ FPS
**Размер:** 0 (только MediaPipe ~2MB)

#### 2. ML классификатор на landmarks (3-5 дней)

Обучить RandomForest/MLP на геометрических признаках:

```python
# train_emotion_classifier.py
import mediapipe as mp
from sklearn.ensemble import RandomForestClassifier
from skl2onnx import convert_sklearn
import numpy as np

# Загрузить FER2013 или AffectNet
# Извлечь landmarks через MediaPipe
# Обучить классификатор

def extract_landmark_features(image):
    """Извлекает 468 landmarks → 100 ключевых расстояний/углов"""
    with mp.solutions.face_mesh.FaceMesh() as face_mesh:
        results = face_mesh.process(image)
        if not results.multi_face_landmarks:
            return None
        
        landmarks = results.multi_face_landmarks[0].landmark
        
        # Извлекаем 100 ключевых признаков
        features = []
        for i, j in KEY_LANDMARK_PAIRS:
            features.append(distance(landmarks[i], landmarks[j]))
        for i, j, k in KEY_ANGLES:
            features.append(angle(landmarks[i], landmarks[j], landmarks[k]))
        
        return np.array(features)

# Обучение
X = np.array([extract_landmark_features(img) for img in dataset.images])
y = dataset.labels

clf = RandomForestClassifier(n_estimators=100, max_depth=15)
clf.fit(X, y)

# Экспорт в ONNX для браузера
onnx_model = convert_sklearn(clf, initial_types=[("input", FloatTensorType([None, 100]))])
with open("emotion_rf.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())
```

**Точность:** ~80-85%
**Скорость:** 60+ FPS
**Размер:** <1MB

#### 3. Fine-tuned MobileNet (1 неделя)

```python
# train_mobilenet_emotion.py
import tensorflow as tf

# Загрузить FER2013 (48x48 grayscale → 48x48x3)
(X_train, y_train), (X_test, y_test) = load_fer2013()

# Base model
base = tf.keras.applications.MobileNetV2(
    input_shape=(48, 48, 3),
    include_top=False,
    weights="imagenet"
)
base.trainable = False

# Classifier head
model = tf.keras.Sequential([
    base,
    tf.keras.layers.GlobalAveragePooling2D(),
    tf.keras.layers.Dense(128, activation="relu"),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(7, activation="softmax")
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-4),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

model.fit(X_train, y_train, epochs=20, validation_data=(X_test, y_test))

# Export to ONNX
import tf2onnx
tf2onnx.convert.from_keras(model, output_path="emotion_mobilenet.onnx")
```

**Точность:** ~85-90%
**Скорость:** 30-60 FPS (с WebGPU)
**Размер:** 3-5MB

### Рекомендация

1. **MVP:** Rule-based (вариант 1) + temporal smoothing
2. **v1.0:** ML классификатор (вариант 2) если нужна точность
3. **v2.0:** MobileNet (вариант 3) для максимальной точности

### Temporal Smoothing (обязательно для всех вариантов)

```typescript
// lib/emotion-smoother.ts
class EmotionSmoother {
  private history: EmotionScores[] = [];
  private readonly windowSize = 5;
  private readonly emaAlpha = 0.3;

  smooth(raw: EmotionScores): EmotionScores {
    this.history.push(raw);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    // Median filter для устранения выбросов
    const median = this.calculateMedian(this.history);
    
    // EMA для плавности
    if (!this.lastSmoothed) {
      this.lastSmoothed = median;
      return median;
    }

    const smoothed: EmotionScores = {} as EmotionScores;
    for (const key of Object.keys(median)) {
      smoothed[key] = 
        this.emaAlpha * median[key] + 
        (1 - this.emaAlpha) * this.lastSmoothed[key];
    }

    this.lastSmoothed = smoothed;
    return smoothed;
  }
}
```

---

## 🎥 WebRTC P2P vs LiveKit SFU

### Когда P2P
- 1:1 терапевт↔пациент
- Низкая latency критична
- Минимизация серверных расходов

### Когда SFU (LiveKit)
- Групповые сессии 3+ человек
- Нужна server-side запись
- Сложные NAT (symmetric) у обоих участников

### Hybrid подход

```typescript
// lib/connection-strategy.ts
async function selectConnectionStrategy(
  sessionType: "individual" | "group",
  participantCount: number
): Promise<"p2p" | "sfu"> {
  if (sessionType === "group" || participantCount > 2) {
    return "sfu";
  }

  // Тест P2P connectivity
  const p2pTest = await testP2PConnectivity();
  if (p2pTest.success && p2pTest.latency < 150) {
    return "p2p";
  }

  return "sfu"; // Fallback
}
```

---

## 🔐 Privacy & Security Backlog

### E2E шифрование чата
- Signal Protocol (Double Ratchet)
- Библиотека: `@aspect-apps/libsignal-protocol-typescript`
- Ключи генерируются на клиенте, сервер видит только ciphertext

### HIPAA Compliance
- PHI encryption at rest (pgcrypto)
- Audit logging всех операций с данными
- Data retention policies (7 лет по HIPAA)
- Right to erasure (GDPR Art. 17)

### Zero-knowledge архитектура
- Emotion data НЕ шифруем E2E (нужна для safety monitoring)
- Чат, заметки, target memory — E2E
- Сервер не может прочитать терапевтический контент

---

## 📊 Analytics & Monitoring Backlog

### Session Analytics
- Emotion heatmaps по времени сессии
- SUDS/VOC progression graphs
- Pattern effectiveness tracking
- Therapist performance metrics

### Safety Analytics
- False positive rate для safety alerts
- Response time на critical alerts
- Dissociation detection accuracy

### Infrastructure Monitoring
- Prometheus + Grafana (уже в docker-compose)
- Custom metrics для WebRTC quality
- Error tracking (Sentry)

---

## 🏗️ Architecture Backlog

### Monorepo улучшения
- pnpm workspaces
- Turborepo для кэширования
- Changesets для versioning

### Event-driven
- Redis Pub/Sub для real-time events
- BullMQ для job queues
- Event sourcing для audit log

### Микросервисы (когда вырастем)
- auth-service
- session-service  
- emotion-service
- notification-service
- analytics-service

---

## 📱 Mobile & Offline Backlog

### PWA
- Service Worker для offline
- IndexedDB для локального хранения
- Background sync при reconnect

### React Native (future)
- Нативные уведомления
- Лучший доступ к камере
- Фоновый режим для audio

---

## Ссылки на Issues

| Тема | Issue |
|------|-------|
| Emotion accuracy | #52 |
| Full audit | #53 |
| pnpm + Turborepo | #54 |
| tRPC | #55 |
| Offline-first | #56 |
| WebRTC P2P | #57 |
| WebGPU/ONNX | #58 |
| HIPAA/GDPR | #59 |
| Микросервисы | #60 |
| E2E encryption | #61 |
| Event-driven | #62 |
| Storybook | #63 |
| Playwright E2E | #64 |
| OpenAPI | #65 |

---

*Последнее обновление: 2026-04-12*
