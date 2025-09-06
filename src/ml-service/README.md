# 🤖 ML Service - EMDR-AI Therapy Assistant

## 🧠 Машинное обучение и аналитика

Python-based микросервис для обработки эмоциональных данных, персонализации терапевтических протоколов и предиктивной аналитики.

## 🛠️ Технологический стек

- **Framework**: FastAPI
- **Language**: Python 3.11+
- **ML/DL**: TensorFlow, PyTorch, scikit-learn
- **Data**: Pandas, NumPy, SciPy
- **NLP**: spaCy, Transformers (Hugging Face)
- **Computer Vision**: OpenCV, MediaPipe
- **API**: FastAPI + Uvicorn
- **Database**: PostgreSQL (via SQLAlchemy)
- **Cache**: Redis
- **Queue**: Celery + Redis
- **Monitoring**: MLflow, Weights & Biases

## 📁 Структура проекта

```
ml-service/
├── src/
│   ├── api/                # FastAPI endpoints
│   │   ├── emotion/        # Эмоциональная аналитика
│   │   ├── personalization/ # Персонализация
│   │   ├── safety/         # Протоколы безопасности
│   │   └── analytics/      # Аналитика и insights
│   ├── models/             # ML модели
│   │   ├── emotion_classifier/
│   │   ├── personalization_engine/
│   │   ├── safety_monitor/
│   │   └── progress_predictor/
│   ├── services/           # Бизнес-логика
│   │   ├── emotion_processor.py
│   │   ├── pattern_optimizer.py
│   │   ├── safety_analyzer.py
│   │   └── progress_tracker.py
│   ├── utils/              # Утилиты
│   │   ├── data_preprocessing.py
│   │   ├── feature_engineering.py
│   │   ├── model_utils.py
│   │   └── visualization.py
│   ├── core/               # Конфигурация
│   │   ├── config.py
│   │   ├── database.py
│   │   └── redis.py
│   └── schemas/            # Pydantic модели
├── models/                 # Сохраненные модели
├── data/                   # Данные для обучения
├── notebooks/              # Jupyter notebooks
├── tests/                  # Тесты
├── scripts/               # Скрипты для обучения
└── requirements.txt       # Зависимости
```

## 🚀 Быстрый старт

```bash
# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Установка зависимостей
pip install -r requirements.txt

# Запуск в режиме разработки
uvicorn src.main:app --reload --host 0.0.0.0 --port 8001

# Запуск Celery worker
celery -A src.core.celery worker --loglevel=info

# Запуск Flower (мониторинг Celery)
celery -A src.core.celery flower
```

## 🧪 API Endpoints

### Эмоциональная аналитика
```python
POST   /emotion/analyze          # Анализ эмоциональных данных
POST   /emotion/batch-process    # Пакетная обработка
GET    /emotion/patterns         # Эмоциональные паттерны
POST   /emotion/predict          # Предсказание эмоций
```

### Персонализация
```python
POST   /personalization/optimize   # Оптимизация параметров
GET    /personalization/profile    # Профиль пользователя
POST   /personalization/adapt      # Адаптация в реальном времени
POST   /personalization/recommend  # Рекомендации
```

### Безопасность
```python
POST   /safety/analyze            # Анализ рисков
POST   /safety/alert              # Предупреждения
GET    /safety/thresholds         # Пороговые значения
POST   /safety/intervention       # Интервенции
```

### Аналитика
```python
GET    /analytics/dashboard       # Данные для дашборда
POST   /analytics/insights        # Генерация insights
POST   /analytics/export          # Экспорт данных
GET    /analytics/trends          # Тренды и паттерны
```

## 🤖 ML Модели

### 1. Emotion Classifier
```python
class EmotionClassifier:
    """
    Классификация эмоций на основе данных MorphCast
    """
    def __init__(self):
        self.model = self.load_model('emotion_classifier_v1.pkl')
        self.feature_extractor = EmotionFeatureExtractor()
    
    def predict(self, emotion_data: dict) -> EmotionPrediction:
        features = self.feature_extractor.extract(emotion_data)
        prediction = self.model.predict(features)
        return EmotionPrediction(
            emotions=prediction.emotions,
            confidence=prediction.confidence,
            dimensions=prediction.dimensions
        )
```

### 2. Personalization Engine
```python
class PersonalizationEngine:
    """
    Персонализация терапевтических протоколов
    """
    def __init__(self):
        self.user_profiler = UserProfiler()
        self.pattern_optimizer = PatternOptimizer()
        self.effectiveness_predictor = EffectivenessPredictor()
    
    def optimize_session(self, user_id: str, emotion_state: dict) -> SessionConfig:
        user_profile = self.user_profiler.get_profile(user_id)
        optimal_params = self.pattern_optimizer.optimize(
            user_profile, emotion_state
        )
        effectiveness = self.effectiveness_predictor.predict(
            user_profile, optimal_params
        )
        
        return SessionConfig(
            pattern_type=optimal_params.pattern_type,
            speed=optimal_params.speed,
            intensity=optimal_params.intensity,
            duration=optimal_params.duration,
            predicted_effectiveness=effectiveness
        )
```

### 3. Safety Monitor
```python
class SafetyMonitor:
    """
    Мониторинг безопасности в реальном времени
    """
    def __init__(self):
        self.risk_classifier = RiskClassifier()
        self.crisis_detector = CrisisDetector()
        self.intervention_recommender = InterventionRecommender()
    
    def analyze_safety(self, emotion_data: dict, session_context: dict) -> SafetyAnalysis:
        risk_level = self.risk_classifier.predict(emotion_data)
        crisis_probability = self.crisis_detector.predict(emotion_data, session_context)
        
        if crisis_probability > 0.8:
            intervention = self.intervention_recommender.recommend_immediate()
        elif risk_level > 0.6:
            intervention = self.intervention_recommender.recommend_cautious()
        else:
            intervention = None
            
        return SafetyAnalysis(
            risk_level=risk_level,
            crisis_probability=crisis_probability,
            recommended_intervention=intervention,
            should_pause_session=crisis_probability > 0.7
        )
```

### 4. Progress Predictor
```python
class ProgressPredictor:
    """
    Предсказание прогресса терапии
    """
    def __init__(self):
        self.trajectory_model = TrajectoryModel()
        self.milestone_predictor = MilestonePredictor()
        self.outcome_forecaster = OutcomeForecaster()
    
    def predict_progress(self, user_history: list, current_state: dict) -> ProgressPrediction:
        trajectory = self.trajectory_model.predict(user_history)
        next_milestone = self.milestone_predictor.predict(user_history, current_state)
        long_term_outcome = self.outcome_forecaster.predict(trajectory)
        
        return ProgressPrediction(
            trajectory=trajectory,
            next_milestone=next_milestone,
            estimated_completion=long_term_outcome.completion_date,
            confidence_interval=long_term_outcome.confidence_interval
        )
```

## 📊 Схемы данных

### Эмоциональные данные
```python
class EmotionData(BaseModel):
    timestamp: datetime
    emotions: Dict[str, float]  # joy, sadness, anger, fear, surprise, disgust
    dimensions: Dict[str, float]  # valence, arousal, attention
    context: Optional[Dict[str, Any]] = None
    session_id: str
    user_id: str

class EmotionPrediction(BaseModel):
    emotions: Dict[str, float]
    confidence: float
    dimensions: Dict[str, float]
    predicted_changes: Dict[str, float]
    recommendations: List[str]
```

### Конфигурация сессии
```python
class SessionConfig(BaseModel):
    pattern_type: str  # horizontal, infinity, butterfly, etc.
    speed: float  # Hz
    intensity: float  # 0-1
    duration: int  # seconds
    colors: Dict[str, str]
    audio_config: Optional[AudioConfig] = None
    safety_thresholds: SafetyThresholds
    predicted_effectiveness: float

class AudioConfig(BaseModel):
    binaural_frequency: Optional[float] = None
    asmr_type: Optional[str] = None
    volume: float = 0.5
    spatial_audio: bool = True
```

### Анализ безопасности
```python
class SafetyAnalysis(BaseModel):
    risk_level: float  # 0-1
    crisis_probability: float  # 0-1
    recommended_intervention: Optional[Intervention] = None
    should_pause_session: bool
    warning_signs: List[str]
    protective_factors: List[str]
    next_check_in: datetime

class Intervention(BaseModel):
    type: str  # grounding, breathing, emergency_contact
    instructions: str
    duration: int
    priority: str  # low, medium, high, critical
```

## 🔄 Обработка данных

### Пайплайн обработки эмоций
```python
class EmotionProcessingPipeline:
    def __init__(self):
        self.preprocessor = EmotionPreprocessor()
        self.feature_engineer = FeatureEngineer()
        self.classifier = EmotionClassifier()
        self.postprocessor = EmotionPostprocessor()
    
    async def process(self, raw_data: dict) -> ProcessedEmotion:
        # 1. Предобработка
        cleaned_data = self.preprocessor.clean(raw_data)
        
        # 2. Feature engineering
        features = self.feature_engineer.extract(cleaned_data)
        
        # 3. Классификация
        prediction = self.classifier.predict(features)
        
        # 4. Постобработка
        result = self.postprocessor.process(prediction, cleaned_data)
        
        return result
```

### Обучение моделей
```python
class ModelTrainer:
    def __init__(self, config: TrainingConfig):
        self.config = config
        self.data_loader = DataLoader()
        self.validator = ModelValidator()
        self.deployer = ModelDeployer()
    
    def train_emotion_classifier(self):
        # Загрузка данных
        train_data, val_data = self.data_loader.load_emotion_data()
        
        # Обучение модели
        model = EmotionClassifierModel(self.config.emotion_model_config)
        model.fit(train_data, validation_data=val_data)
        
        # Валидация
        metrics = self.validator.validate(model, val_data)
        
        # Деплой если метрики приемлемые
        if metrics.accuracy > 0.85:
            self.deployer.deploy(model, 'emotion_classifier')
            
        return model, metrics
```

## 📈 Мониторинг и логирование

### MLflow интеграция
```python
import mlflow
import mlflow.tensorflow

class ExperimentTracker:
    def __init__(self):
        mlflow.set_tracking_uri("http://mlflow-server:5000")
        mlflow.set_experiment("emdr-personalization")
    
    def log_experiment(self, model, metrics, params):
        with mlflow.start_run():
            # Логирование параметров
            mlflow.log_params(params)
            
            # Логирование метрик
            mlflow.log_metrics(metrics)
            
            # Сохранение модели
            mlflow.tensorflow.log_model(
                model, 
                "model",
                registered_model_name="PersonalizationEngine"
            )
```

### Метрики производительности
```python
class PerformanceMonitor:
    def __init__(self):
        self.metrics_collector = MetricsCollector()
        
    def track_prediction_latency(self, func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            latency = time.time() - start_time
            
            self.metrics_collector.record_latency(
                function_name=func.__name__,
                latency=latency
            )
            return result
        return wrapper
    
    def track_model_accuracy(self, predictions, ground_truth):
        accuracy = calculate_accuracy(predictions, ground_truth)
        self.metrics_collector.record_accuracy(accuracy)
```

## 🧪 Тестирование

### Unit тесты
```bash
pytest tests/unit/           # Unit тесты
pytest tests/integration/    # Интеграционные тесты
pytest tests/models/         # Тесты моделей
```

### Тестирование моделей
```python
class TestEmotionClassifier:
    def test_emotion_prediction_accuracy(self):
        classifier = EmotionClassifier()
        test_data = load_test_emotion_data()
        
        predictions = classifier.predict_batch(test_data.features)
        accuracy = calculate_accuracy(predictions, test_data.labels)
        
        assert accuracy > 0.85
    
    def test_prediction_latency(self):
        classifier = EmotionClassifier()
        test_input = generate_test_emotion_data()
        
        start_time = time.time()
        prediction = classifier.predict(test_input)
        latency = time.time() - start_time
        
        assert latency < 0.1  # 100ms
```

## 🔧 Конфигурация

### Settings
```python
class Settings(BaseSettings):
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8001
    debug: bool = False
    
    # Database
    database_url: str
    redis_url: str
    
    # ML Models
    model_path: str = "/app/models"
    model_cache_ttl: int = 3600
    
    # External APIs
    morphcast_api_key: str
    openai_api_key: str
    
    # Monitoring
    mlflow_tracking_uri: str
    wandb_project: str
    
    class Config:
        env_file = ".env"
```

## 🐳 Docker

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Установка Python зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY . .

# Создание пользователя
RUN useradd --create-home --shell /bin/bash ml-user
USER ml-user

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

## 📚 Исследования и эксперименты

### Jupyter Notebooks
```
notebooks/
├── 01_data_exploration.ipynb      # Исследование данных
├── 02_emotion_analysis.ipynb      # Анализ эмоций
├── 03_personalization_experiments.ipynb  # Эксперименты персонализации
├── 04_safety_modeling.ipynb       # Моделирование безопасности
└── 05_progress_prediction.ipynb   # Предсказание прогресса
```

### Скрипты обучения
```bash
# Обучение emotion classifier
python scripts/train_emotion_classifier.py

# Обучение personalization engine
python scripts/train_personalization_engine.py

# Обучение safety monitor
python scripts/train_safety_monitor.py

# Автоматическое переобучение
python scripts/automated_retraining.py
```

## 🔄 CI/CD для ML

### Model versioning
```python
class ModelVersionManager:
    def __init__(self):
        self.registry = ModelRegistry()
    
    def deploy_model(self, model, model_name: str, version: str):
        # Валидация модели
        validation_results = self.validate_model(model)
        
        if validation_results.passed:
            # Регистрация в MLflow
            self.registry.register_model(model, model_name, version)
            
            # A/B тестирование
            self.start_ab_test(model_name, version)
        else:
            raise ModelValidationError("Model failed validation")
```

### Автоматическое переобучение
```python
@celery.task
def retrain_models():
    """
    Периодическое переобучение моделей
    """
    trainer = ModelTrainer()
    
    # Проверка необходимости переобучения
    if trainer.should_retrain():
        # Переобучение
        new_models = trainer.train_all_models()
        
        # Валидация
        validation_results = trainer.validate_models(new_models)
        
        # Деплой если улучшение значительное
        for model_name, metrics in validation_results.items():
            if metrics.improvement > 0.05:  # 5% улучшение
                trainer.deploy_model(new_models[model_name], model_name)
```

## 📊 Дашборд мониторинга

### Streamlit дашборд
```python
import streamlit as st
import plotly.graph_objects as go

def create_monitoring_dashboard():
    st.title("EMDR-AI ML Service Monitoring")
    
    # Метрики моделей
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Emotion Classifier Accuracy", "87.3%", "2.1%")
    
    with col2:
        st.metric("Personalization Effectiveness", "91.7%", "1.8%")
    
    with col3:
        st.metric("Safety Alert Precision", "94.2%", "0.5%")
    
    # Графики производительности
    performance_chart = create_performance_chart()
    st.plotly_chart(performance_chart, use_container_width=True)
    
    # Логи в реальном времени
    st.subheader("Real-time Logs")
    log_container = st.empty()
    
    while True:
        logs = get_recent_logs()
        log_container.text(logs)
        time.sleep(5)
```

---

**Статус**: 🚧 В разработке  
**Последнее обновление**: 2025-09-06