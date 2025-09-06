# 🏗️ Архитектура системы EMDR-AI Therapy Assistant

## 📋 Содержание

1. [Обзор системы](#обзор-системы)
2. [Архитектурные принципы](#архитектурные-принципы)
3. [Компоненты системы](#компоненты-системы)
4. [Технологический стек](#технологический-стек)
5. [Диаграммы архитектуры](#диаграммы-архитектуры)
6. [Безопасность](#безопасность)
7. [Масштабируемость](#масштабируемость)

## 🎯 Обзор системы

EMDR-AI Therapy Assistant - это многослойная система, построенная на принципах микросервисной архитектуры с акцентом на приватность, масштабируемость и клиническую эффективность.

### Ключевые архитектурные решения

- **Privacy-First**: Вся обработка эмоциональных данных происходит локально
- **Микросервисная архитектура**: Независимые, масштабируемые компоненты
- **Progressive Web App**: Кроссплатформенность без установки
- **Edge Computing**: Минимизация латентности

## 🎨 Архитектурные принципы

### 1. Конфиденциальность данных
```
┌─────────────────────────────────────┐
│         Локальная обработка         │
├─────────────────────────────────────┤
│  • MorphCast SDK в браузере         │
│  • Локальное ML на устройстве       │
│  • Шифрование данных перед передачей │
│  • Zero-knowledge архитектура        │
└─────────────────────────────────────┘
```

### 2. Отказоустойчивость
- Circuit Breaker паттерн для внешних сервисов
- Graceful degradation при недоступности компонентов
- Автоматическое восстановление сессий
- Offline-first подход

### 3. Адаптивность
- Real-time персонализация на основе эмоций
- A/B тестирование терапевтических протоколов
- Машинное обучение для оптимизации

## 🔧 Компоненты системы

### Frontend Layer
```typescript
// Основные компоненты Frontend
interface FrontendArchitecture {
  core: {
    framework: 'React 18',
    stateManagement: 'Redux Toolkit',
    routing: 'React Router 6',
    ui: 'Material-UI + Custom Components'
  },
  
  therapeuticModules: {
    emdrRenderer: 'Canvas/WebGL визуализация',
    emotionRecognition: 'MorphCast SDK интеграция',
    audioEngine: 'Tone.js + Web Audio API',
    avatarSystem: 'Three.js 3D аватары'
  },
  
  dataLayer: {
    localState: 'Redux + RTK Query',
    persistence: 'IndexedDB + Encryption',
    sync: 'Background Sync API'
  }
}
```

### Backend Services

#### 1. API Gateway
```yaml
apiGateway:
  responsibilities:
    - Аутентификация и авторизация
    - Rate limiting
    - Request routing
    - Response caching
  technology: Kong/Nginx + Lua
```

#### 2. Core Services
```yaml
coreServices:
  therapyEngine:
    description: "Ядро терапевтической логики"
    responsibilities:
      - Управление сессиями
      - Протоколы EMDR
      - Адаптивная персонализация
    technology: Node.js + NestJS
    
  mlService:
    description: "Машинное обучение и аналитика"
    responsibilities:
      - Обучение моделей персонализации
      - Предиктивная аналитика
      - Рекомендательная система
    technology: Python + FastAPI + TensorFlow
    
  userService:
    description: "Управление пользователями"
    responsibilities:
      - Профили пользователей
      - Прогресс терапии
      - Настройки приватности
    technology: Node.js + Express
```

### Data Layer
```yaml
dataStorage:
  primary:
    type: PostgreSQL 15
    purpose: Пользовательские данные, метаданные сессий
    encryption: AES-256 at rest
    
  cache:
    type: Redis Cluster
    purpose: Сессии, временные данные
    
  analytics:
    type: ClickHouse
    purpose: Аналитика использования (анонимизированная)
    
  media:
    type: MinIO/S3
    purpose: Медиафайлы, аватары, ресурсы
```

## 💻 Технологический стек

### Frontend
```json
{
  "framework": {
    "main": "React 18",
    "typescript": "5.0+",
    "build": "Vite",
    "pwa": "Workbox"
  },
  "ui": {
    "components": "Material-UI v5",
    "styling": "Emotion + CSS-in-JS",
    "animations": "Framer Motion",
    "3d": "Three.js"
  },
  "audio": {
    "engine": "Tone.js",
    "processing": "Web Audio API",
    "spatial": "Web Audio Spatialization"
  },
  "ml": {
    "emotions": "MorphCast SDK",
    "local": "TensorFlow.js",
    "computervision": "MediaPipe"
  }
}
```

### Backend
```json
{
  "runtime": "Node.js 20 LTS",
  "framework": "NestJS",
  "database": {
    "primary": "PostgreSQL 15",
    "cache": "Redis 7",
    "search": "Elasticsearch"
  },
  "messaging": {
    "queue": "Bull + Redis",
    "realtime": "Socket.io",
    "events": "EventEmitter3"
  },
  "ml": {
    "runtime": "Python 3.11",
    "framework": "FastAPI",
    "ml": "TensorFlow/PyTorch",
    "nlp": "spaCy + Transformers"
  }
}
```

### DevOps & Infrastructure
```yaml
containerization:
  runtime: Docker
  orchestration: Kubernetes
  service_mesh: Istio

monitoring:
  metrics: Prometheus + Grafana
  logging: ELK Stack
  tracing: Jaeger
  errors: Sentry

deployment:
  ci_cd: GitHub Actions
  infrastructure: Terraform
  cloud: AWS/GCP
  cdn: CloudFlare
```

## 📊 Диаграммы архитектуры

### Высокоуровневая архитектура
```
┌─────────────────────────────────────────────┐
│           Пользовательский слой             │
├─────────────────────────────────────────────┤
│  PWA Client  │  Mobile App  │  Web Portal   │
├─────────────────────────────────────────────┤
│              API Gateway                    │
├─────────────────────────────────────────────┤
│  Therapy     │  ML Service  │  User Service │
│  Engine      │             │               │
├─────────────────────────────────────────────┤
│  PostgreSQL  │  Redis      │  MinIO        │
└─────────────────────────────────────────────┘
```

### Поток данных эмоций
```
Browser → MorphCast SDK → Local Processing → 
Encrypted Aggregation → Backend Analytics → 
ML Model Training → Personalization Update → 
Real-time Adaptation
```

### Архитектура безопасности
```
┌─────────────────────────────────────────┐
│         Клиентская сторона              │
│  ┌─────────────────────────────────┐    │
│  │     Локальная обработка         │    │
│  │  • MorphCast (эмоции)          │    │
│  │  • TensorFlow.js (ML)          │    │
│  │  • Web Crypto API (шифрование)  │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
              │ TLS 1.3
              ▼
┌─────────────────────────────────────────┐
│           Серверная сторона             │
│  ┌─────────────────────────────────┐    │
│  │      Зашифрованное хранение      │    │
│  │  • AES-256 шифрование           │    │
│  │  • Ключи управляются HSM        │    │
│  │  • Анонимизация данных          │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## 🔒 Безопасность

### Принципы безопасности
1. **Zero Trust Architecture**
2. **Defense in Depth**
3. **Privacy by Design**
4. **Minimal Data Collection**

### Реализация
```typescript
interface SecurityMeasures {
  authentication: {
    method: 'OAuth 2.0 + PKCE',
    mfa: 'TOTP/SMS/Биометрия',
    sessions: 'JWT с коротким TTL'
  },
  
  encryption: {
    transit: 'TLS 1.3',
    rest: 'AES-256-GCM',
    keys: 'HSM + Key Rotation'
  },
  
  privacy: {
    processing: 'Локальная обработка эмоций',
    storage: 'Минимальные персональные данные',
    sharing: 'Explicit consent only'
  },
  
  monitoring: {
    intrusion: 'Real-time detection',
    anomaly: 'ML-based behavior analysis',
    audit: 'Comprehensive logging'
  }
}
```

## ⚡ Масштабируемость

### Горизонтальное масштабирование
```yaml
scalability:
  frontend:
    distribution: Global CDN
    caching: Edge caching + Service Worker
    optimization: Code splitting + Lazy loading
    
  backend:
    load_balancing: Layer 7 load balancer
    auto_scaling: Kubernetes HPA
    database: Read replicas + Sharding
    
  performance:
    targets:
      response_time: "< 100ms для критических API"
      availability: "99.9% uptime"
      concurrent_users: "100,000+ одновременно"
```

### Оптимизация производительности
```typescript
const PerformanceOptimizations = {
  frontend: {
    bundleSize: 'Tree shaking + Code splitting',
    rendering: 'React.memo + useMemo',
    assets: 'WebP + Progressive images',
    animations: 'GPU acceleration'
  },
  
  backend: {
    caching: 'Multi-layer caching strategy',
    database: 'Connection pooling + Query optimization',
    apis: 'Response compression + Pagination',
    cdn: 'Static asset optimization'
  },
  
  ml: {
    inference: 'Model quantization',
    loading: 'Lazy model loading',
    optimization: 'WebAssembly для критических путей'
  }
};
```

## 🔄 API Design

### RESTful API структура
```typescript
interface APIEndpoints {
  // Аутентификация
  'POST /auth/login': AuthRequest,
  'POST /auth/logout': void,
  'POST /auth/refresh': RefreshRequest,
  
  // Терапевтические сессии
  'POST /therapy/sessions': CreateSessionRequest,
  'GET /therapy/sessions/:id': SessionResponse,
  'PUT /therapy/sessions/:id': UpdateSessionRequest,
  
  // Пользовательские данные
  'GET /users/profile': UserProfile,
  'PUT /users/preferences': UserPreferences,
  'GET /users/progress': ProgressData,
  
  // Аналитика (анонимизированная)
  'POST /analytics/events': AnalyticsEvent[],
  'GET /analytics/insights': UserInsights
}
```

### WebSocket Events
```typescript
interface WebSocketEvents {
  // Real-time терапия
  'session:start': SessionConfig,
  'session:update': EmotionalState,
  'session:adapt': AdaptationInstructions,
  'session:end': SessionSummary,
  
  // Система уведомлений
  'notification:reminder': TherapyReminder,
  'notification:milestone': Achievement,
  'notification:emergency': CrisisAlert
}
```

## 📈 Мониторинг и наблюдаемость

### Ключевые метрики
```yaml
business_metrics:
  - session_completion_rate
  - user_engagement_score
  - therapy_effectiveness_index
  - user_retention_rate

technical_metrics:
  - api_response_time
  - error_rate
  - system_availability
  - resource_utilization

clinical_metrics:
  - emotion_recognition_accuracy
  - adaptation_response_time
  - safety_protocol_triggers
  - therapeutic_outcome_correlation
```

## 🚀 Развертывание

### Окружения
```yaml
environments:
  development:
    purpose: Локальная разработка
    infrastructure: Docker Compose
    
  staging:
    purpose: Тестирование и QA
    infrastructure: Kubernetes (minikube)
    
  production:
    purpose: Продуктовая среда
    infrastructure: Managed Kubernetes (EKS/GKE)
    redundancy: Multi-region deployment
```

---

**Дата создания**: Сентябрь 2025  
**Версия**: 1.0  
**Статус**: В разработке

*Этот документ описывает текущую архитектуру системы и будет обновляться по мере развития проекта.*