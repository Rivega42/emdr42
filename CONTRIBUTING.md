# 🤝 Руководство контрибьютора

Спасибо за интерес к проекту EMDR-AI Therapy Assistant! Мы рады вашему участию в создании революционной платформы для ментального здоровья.

## 📋 Содержание

1. [Кодекс поведения](#кодекс-поведения)
2. [Как начать](#как-начать)
3. [Процесс разработки](#процесс-разработки)
4. [Стандарты кода](#стандарты-кода)
5. [Тестирование](#тестирование)
6. [Документация](#документация)
7. [Pull Requests](#pull-requests)
8. [Issues](#issues)

## 📜 Кодекс поведения

### Наши принципы

- **Уважение**: Относимся с уважением ко всем участникам
- **Инклюзивность**: Приветствуем разнообразие мнений и опыта
- **Конструктивность**: Даем полезную обратную связь
- **Профессионализм**: Поддерживаем высокие стандарты
- **Эмпатия**: Помним, что за кодом стоят люди

### Недопустимое поведение

- Оскорбления и личные атаки
- Дискриминация любого рода
- Троллинг и harassment
- Публикация личной информации
- Неэтичное поведение

## 🚀 Как начать

### 1. Настройка окружения

```bash
# Клонирование репозитория
git clone https://github.com/Rivega42/emdr42.git
cd emdr42

# Установка зависимостей
npm install

# Копирование конфигурации
cp .env.example .env

# Запуск в dev режиме
npm run dev
```

### 2. Требования

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (опционально)
- Git

### 3. Структура проекта

```
emdr42/
├── apps/
│   ├── web/           # Frontend приложение
│   ├── api/           # Backend API
│   └── mobile/        # React Native app
├── packages/
│   ├── ui/            # UI компоненты
│   ├── core/          # Бизнес логика
│   └── utils/         # Утилиты
├── docs/              # Документация
├── scripts/           # Скрипты
└── tests/             # E2E тесты
```

## 💻 Процесс разработки

### 1. Выбор задачи

1. Проверьте [Issues](https://github.com/Rivega42/emdr42/issues)
2. Ищите метки `good first issue` для начала
3. Комментируйте issue перед началом работы
4. Если issue нет - создайте новый

### 2. Создание ветки

```bash
# Формат: type/description-issue-number
git checkout -b feature/add-emdr-pattern-123
git checkout -b fix/emotion-recognition-456
git checkout -b docs/update-api-789
```

### 3. Коммиты

Используем [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Формат: type(scope): description

feat(emdr): add butterfly movement pattern
fix(auth): resolve JWT token expiration issue
docs(api): update authentication endpoints
style(ui): format button components
refactor(core): optimize emotion processing
test(e2e): add session flow tests
chore(deps): update dependencies
```

### 4. Разработка

- Пишите чистый, читаемый код
- Следуйте принципам SOLID
- Добавляйте комментарии для сложной логики
- Обновляйте тесты
- Проверяйте производительность

## 📏 Стандарты кода

### TypeScript/JavaScript

```typescript
// ✅ Хорошо
export const calculateEmotionScore = (
  emotions: EmotionData[]
): number => {
  if (!emotions.length) {
    return 0;
  }
  
  return emotions.reduce(
    (sum, emotion) => sum + emotion.value,
    0
  ) / emotions.length;
};

// ❌ Плохо
export function calc(e) {
  var sum = 0;
  for(var i = 0; i < e.length; i++)
    sum += e[i].value;
  return sum / e.length;
}
```

### React Components

```tsx
// ✅ Хорошо
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  return (
    <button
      className={cn('button', `button--${variant}`)}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {label}
    </button>
  );
};
```

### CSS/SCSS

```scss
// ✅ Хорошо
.button {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
  
  &--primary {
    background: var(--color-primary);
    color: var(--color-white);
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

## 🧪 Тестирование

### Unit Tests

```typescript
describe('EmotionProcessor', () => {
  it('should calculate average emotion score', () => {
    const emotions = [
      { type: 'joy', value: 0.8 },
      { type: 'sadness', value: 0.2 }
    ];
    
    const score = calculateEmotionScore(emotions);
    
    expect(score).toBe(0.5);
  });
  
  it('should handle empty array', () => {
    expect(calculateEmotionScore([])).toBe(0);
  });
});
```

### E2E Tests

```typescript
describe('EMDR Session Flow', () => {
  it('should complete full session', () => {
    cy.visit('/session');
    cy.get('[data-testid="start-button"]').click();
    cy.get('[data-testid="pattern-selector"]').select('horizontal');
    cy.get('[data-testid="session-timer"]').should('be.visible');
    // ...
  });
});
```

### Запуск тестов

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📚 Документация

### Код документация

```typescript
/**
 * Рассчитывает адаптивную скорость EMDR паттерна
 * на основе эмоционального состояния пользователя
 * 
 * @param emotionState - Текущее эмоциональное состояние
 * @param baseSpeed - Базовая скорость в Hz
 * @returns Адаптированная скорость движения
 * 
 * @example
 * const speed = calculateAdaptiveSpeed(
 *   { stress: 0.7, engagement: 0.5 },
 *   1.0
 * );
 * // Returns: 0.8
 */
export const calculateAdaptiveSpeed = (
  emotionState: EmotionState,
  baseSpeed: number
): number => {
  // Implementation
};
```

### API документация

- Используем Swagger/OpenAPI
- Примеры запросов и ответов
- Коды ошибок и их описания

## 📤 Pull Requests

### Чеклист PR

- [ ] Код соответствует стандартам проекта
- [ ] Все тесты проходят
- [ ] Добавлены новые тесты (если применимо)
- [ ] Обновлена документация
- [ ] Нет конфликтов с main
- [ ] PR имеет понятное описание
- [ ] Связан с issue

### Шаблон PR

```markdown
## Описание
Краткое описание изменений

## Тип изменений
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Как тестировать
1. Шаг 1
2. Шаг 2
3. ...

## Чеклист
- [ ] Мой код следует стандартам проекта
- [ ] Я провел self-review
- [ ] Я добавил тесты
- [ ] Все тесты проходят

## Screenshots (если применимо)

## Related Issues
Closes #123
```

## 🐛 Issues

### Создание Issue

#### Bug Report

```markdown
## Описание бага
Четкое описание проблемы

## Шаги воспроизведения
1. Перейти на '...'
2. Нажать на '...'
3. Увидеть ошибку

## Ожидаемое поведение
Что должно происходить

## Screenshots
Если применимо

## Окружение
- OS: [e.g. iOS]
- Browser: [e.g. chrome, safari]
- Version: [e.g. 22]

## Дополнительный контекст
Любая дополнительная информация
```

#### Feature Request

```markdown
## Описание функции
Что вы хотите добавить и почему

## Решаемая проблема
Какую проблему это решает

## Альтернативы
Какие альтернативы вы рассматривали

## Дополнительный контекст
Любая дополнительная информация
```

## 🏆 Признание

### Контрибьюторы

Все контрибьюторы добавляются в:
- README.md
- CONTRIBUTORS.md
- Страница "О проекте"

### Уровни контрибуции

- 🥉 **Bronze**: 1-5 merged PRs
- 🥈 **Silver**: 6-20 merged PRs
- 🥇 **Gold**: 21-50 merged PRs
- 💎 **Diamond**: 50+ merged PRs
- 🌟 **Core Team**: Основная команда

## 📞 Контакты

### Связь с командой

- **Discord**: [Присоединиться](https://discord.gg/emdr-ai)
- **Email**: dev@emdr-ai.com
- **GitHub Discussions**: [Обсуждения](https://github.com/Rivega42/emdr42/discussions)

### Получение помощи

1. Проверьте документацию
2. Поищите в Issues
3. Спросите в Discord
4. Создайте Issue

## 📖 Полезные ресурсы

### Для изучения

- [EMDR основы](https://www.emdr.com/what-is-emdr/)
- [React документация](https://react.dev/)
- [TypeScript handbook](https://www.typescriptlang.org/docs/)
- [NestJS документация](https://nestjs.com/)
- [MorphCast SDK](https://www.morphcast.com/)

### Инструменты

- [VS Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [pgAdmin](https://www.pgadmin.org/)

## ⚖️ Лицензия

Внося вклад в проект, вы соглашаетесь, что ваш код будет лицензирован под MIT License.

---

**Спасибо за ваш вклад в улучшение ментального здоровья человечества! 💚**

*Последнее обновление: 06.09.2025*