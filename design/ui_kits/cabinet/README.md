# UI kit — Личный кабинет EMDR42

Рекреация защищённой зоны emdr42.ru (`app/(protected)/*` репозитория
[Rivega42/emdr42](https://github.com/Rivega42/emdr42)) в системе «Лунная ночь».
Структура, копирайтинг и данные экранов — из реального кода; визуальный слой — новый.

В ЛК «лунная дорожка» НЕ используется. Свечение — только у одного primary-действия
на экран и у прогресса (бар цели/уровня, текущая фаза EMDRIA, unlocked-достижения).

## Файлы
- `CabinetApp.jsx` — роутер экранов + темы (night/dawn, localStorage `emdr42-ds-theme`).
- `CabinetShell.jsx` — sidebar (`Sidebar` из системы) + header (бургер на мобильном,
  переключатель темы, роль-бейдж).
- `CabinetPatient.jsx` — экраны Dashboard / Progress / Settings.
- `CabinetTherapist.jsx` — Patients (таблица, клик по строке → разбор) / Session review.
- `CabinetSession.jsx` — `SessionPatient` (иммерсивная EMDR-сессия: луна-орб как BLS-мишень,
  билатеральное аудио, SUDS-опрос, контролы) и `SessionMonitor` (live-наблюдение терапевта:
  зеркало BLS, эмоциональный поток, SUDS/VOC, управление стимуляцией, вмешательство).
- `CabinetAdmin.jsx` — админ: метрики, график, пользователи, safety alerts.
- `CabinetData.jsx` — демо-данные + `CIcon` (инлайн path-данные lucide, штрих 1.5px —
  инлайном, чтобы интерактивные ре-рендеры React не конфликтовали с lucide.createIcons).
- `cabinet.css` — лейаут (классы `c-*`), не входит в styles.css.
- `mount.js` — монтирование без Babel; `window.__CABINET_SCREEN` / `__CABINET_THEME`.
- `index.html` — интерактивный клик-чрез (все 6 экранов); `dawn.html` — светлая тема;
  `mobile.html` — превью 375; `progress|settings|patients|session-review|admin.html` —
  отдельные экраны для карточек.

## Правила
- Рост тревоги — только `--warning`/`--danger` soft-тона, никакого алого.
- Danger-зона настроек — приглушённый danger (`.c-danger`), без паники.
- Кризисная плашка (`.c-crisis`) — тёплая умбра, различима в обеих темах.
- Touch-targets ≥ 44px; фокус-кольца; анимации уважают prefers-reduced-motion.
