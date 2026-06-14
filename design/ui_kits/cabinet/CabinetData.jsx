import React from 'react';

/**
 * Демо-данные и иконки кабинета EMDR42.
 * Иконки — path-данные lucide (штрих 1.5px), инлайном для стабильной
 * работы с интерактивным React-деревом.
 */

const CABINET_ICON_PATHS = {
  'layout-dashboard': <><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></>,
  'activity': <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>,
  'sliders': <><line x1="21" x2="14" y1="4" y2="4"></line><line x1="10" x2="3" y1="4" y2="4"></line><line x1="21" x2="12" y1="12" y2="12"></line><line x1="8" x2="3" y1="12" y2="12"></line><line x1="21" x2="16" y1="20" y2="20"></line><line x1="12" x2="3" y1="20" y2="20"></line><line x1="14" x2="14" y1="2" y2="6"></line><line x1="8" x2="8" y1="10" y2="14"></line><line x1="16" x2="16" y1="18" y2="22"></line></>,
  'users': <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></>,
  'clipboard': <><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></>,
  'shield': <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>,
  'moon': <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>,
  'sun': <><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></>,
  'menu': <><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></>,
  'log-out': <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></>,
  'heart': <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>,
  'flame': <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>,
  'sparkles': <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>,
  'lock': <><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></>,
  'audio-lines': <><path d="M2 10v3"></path><path d="M6 6v11"></path><path d="M10 3v18"></path><path d="M14 8v7"></path><path d="M18 5v13"></path><path d="M22 10v3"></path></>,
  'download': <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></>,
  'bot': <><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></>,
  'message': <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path>,
  'alert': <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.73-2Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></>,
  'arrow-right': <><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></>,
  'arrow-left': <><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></>,
  'search': <><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></>,
  'user-plus': <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" x2="19" y1="8" y2="14"></line><line x1="22" x2="16" y1="11" y2="11"></line></>,
  'waves': <><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path></>,
  'play': <polygon points="6 3 20 12 6 21 6 3"></polygon>,
  'pause': <><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></>,
  'eye': <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></>,
  'volume': <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></>,
  'volume-x': <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="22" x2="16" y1="9" y2="15"></line><line x1="16" x2="22" y1="9" y2="15"></line></>,
  'minus': <line x1="5" x2="19" y1="12" y2="12"></line>,
  'plus': <><line x1="12" x2="12" y1="5" y2="19"></line><line x1="5" x2="19" y1="12" y2="12"></line></>,
  'x': <><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></>,
  'wind': <><path d="M12.8 19.6A2 2 0 1 0 14 16H2"></path><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"></path><path d="M9.8 4.4A2 2 0 1 1 11 8H2"></path></>,
  'shield-check': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></>,
  'smile': <><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" x2="9.01" y1="9" y2="9"></line><line x1="15" x2="15.01" y1="9" y2="9"></line></>,
  'monitor': <><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></>,
  'headphones': <><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 0 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path></>,
  'zap': <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>,
  'move-horizontal': <><polyline points="18 8 22 12 18 16"></polyline><polyline points="6 8 2 12 6 16"></polyline><line x1="2" x2="22" y1="12" y2="12"></line></>,
  'square': <rect width="16" height="16" x="4" y="4" rx="2"></rect>,
  'camera': <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></>,
};

export function CIcon({ name, size = 18, style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {CABINET_ICON_PATHS[name] || <circle cx="12" cy="12" r="9"></circle>}
    </svg>
  );
}

/* ---------- демо-данные ---------- */

export const CABINET_USER = { name: 'Анна', fullName: 'Анна Ковалёва', role: 'Пациент' };

export const CABINET_SESSIONS = [
  { id: 's8', date: '9 июня, 19:40', phase: 'Десенсибилизация', sudsFrom: 5, sudsTo: 2.5, minutes: 38, status: 'done' },
  { id: 's7', date: '2 июня, 20:15', phase: 'Десенсибилизация', sudsFrom: 4.5, sudsTo: 2, minutes: 42, status: 'done' },
  { id: 's6', date: '30 мая, 19:05', phase: 'Оценка', sudsFrom: 5, sudsTo: 3, minutes: 31, status: 'done' },
  { id: 's5', date: '26 мая, 18:50', phase: 'Подготовка', sudsFrom: 6, sudsTo: 3, minutes: 27, status: 'interrupted' },
  { id: 's4', date: '23 мая, 19:20', phase: 'Подготовка', sudsFrom: 6, sudsTo: 3.5, minutes: 35, status: 'done' },
];

export const CABINET_CHART = {
  labels: ['12.05', '16.05', '19.05', '23.05', '26.05', '30.05', '02.06', '09.06'],
  before: [8, 7, 7.5, 6, 6, 5, 4.5, 5],
  after: [5, 4, 5, 3.5, 3, 3, 2, 2.5],
};

export const CABINET_ACHIEVEMENTS = [
  { id: 'a1', icon: 'sparkles', title: 'Первая сессия', desc: 'Завершите первую EMDR-сессию', unlocked: true },
  { id: 'a2', icon: 'moon', title: 'Неделя покоя', desc: 'Серия из 7 дней', unlocked: true },
  { id: 'a3', icon: 'waves', title: 'Глубокая работа', desc: '10 завершённых сессий', unlocked: true },
  { id: 'a4', icon: 'flame', title: 'Месяц с собой', desc: 'Серия из 30 дней', unlocked: false },
  { id: 'a5', icon: 'activity', title: 'Устойчивость', desc: 'SUDS ниже 3 в пяти сессиях подряд', unlocked: false },
  { id: 'a6', icon: 'heart', title: 'Опора', desc: 'Заполните план безопасности', unlocked: false },
];

export const CABINET_PATIENTS = [
  { id: 'p1', name: 'Анна К.', email: 'anna@…', status: 'active', last: '9 июня', sessions: 24, suds: -2.1 },
  { id: 'p2', name: 'Михаил Р.', email: 'mikhail@…', status: 'paused', last: '28 мая', sessions: 11, suds: -0.8 },
  { id: 'p3', name: 'Ольга С.', email: 'olga@…', status: 'active', last: '8 июня', sessions: 17, suds: -1.6 },
  { id: 'p4', name: 'Дмитрий В.', email: 'dmitry@…', status: 'active', last: '6 июня', sessions: 6, suds: -0.4 },
  { id: 'p5', name: 'Елена Т.', email: 'elena@…', status: 'discharged', last: '14 апреля', sessions: 32, suds: -3.4 },
];

export const CABINET_REVIEW = {
  patient: 'Анна К.',
  date: '9 июня 2026, 19:40',
  minutes: 38,
  pattern: 'Горизонтальный, 0.8 Гц',
  /* 0-индекс: 5 = фаза 6 «Сканирование тела» */
  phase: 5,
  suds: { from: 7, to: 3 },
  voc: { from: 2, to: 5 },
  stress: { labels: ['0', '', '10', '', '20', '', '30', 'мин'], data: [0.55, 0.7, 0.8, 0.65, 0.5, 0.45, 0.3, 0.25] },
  timeline: [
    { id: 't1', time: '19:41', type: 'ai', icon: 'bot', text: 'Начинаем с проверки ресурсного состояния. Вспомните безопасное место, о котором мы говорили.' },
    { id: 't2', time: '19:44', type: 'patient', icon: 'message', text: 'Готова. Образ — берег вечером, как в прошлый раз.' },
    { id: 't3', time: '19:46', type: 'bls', icon: 'play', text: 'BLS запущена: горизонтальный паттерн, 0.8 Гц, 24 движения в сете.' },
    { id: 't4', time: '19:58', type: 'suds', icon: 'activity', text: 'SUDS записан: 5. Снижение на 2 пункта от начала сессии.' },
    { id: 't5', time: '20:04', type: 'alert', icon: 'alert', text: 'Кратковременный рост напряжения. ИИ снизил скорость стимуляции, предложена пауза с дыханием.' },
    { id: 't6', time: '20:12', type: 'phase', icon: 'waves', text: 'Переход к фазе 6 — сканирование тела.' },
    { id: 't7', time: '20:18', type: 'suds', icon: 'activity', text: 'Финальный SUDS: 3 · VOC: 5 из 7.' },
  ],
};

export const CABINET_SESSION = {
  patientName: 'Анна',
  phaseIndex: 3,
  phaseName: 'Десенсибилизация',
  elapsed: '14:32',
  emotion: 'Спокойствие',
  defaultSpeed: 0.8,
  stressStream: {
    labels: ['0', '', '5', '', '10', '', '14', 'мин'],
    data: [0.7, 0.75, 0.62, 0.55, 0.6, 0.48, 0.42, 0.4],
  },
};

export const CABINET_ADMIN = {
  metrics: [
    { label: 'Всего пользователей', value: '412', delta: '+18 за неделю', tone: 'neutral' },
    { label: 'Активных сессий', value: '7', hint: 'прямо сейчас' },
    { label: 'Сессий сегодня', value: '56', delta: '+12% к среднему', tone: 'good' },
    { label: 'Safety alerts', value: '3', delta: 'за 24 часа', tone: 'warn' },
  ],
  sessionsTrend: { labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], data: [44, 52, 47, 61, 56, 38, 41] },
  system: [
    { label: 'API сервер', ok: true },
    { label: 'База данных', ok: true },
    { label: 'Redis', ok: true },
    { label: 'LiveKit (WebRTC)', ok: false },
  ],
  users: [
    { id: 'u1', name: 'Анна Ковалёва', email: 'anna@…', role: 'Пациент', active: true, created: '12.01.2026' },
    { id: 'u2', name: 'Сергей Ильин', email: 'sergey@…', role: 'Терапевт', active: true, created: '03.11.2025' },
    { id: 'u3', name: 'Михаил Романов', email: 'mikhail@…', role: 'Пациент', active: true, created: '21.02.2026' },
    { id: 'u4', name: 'Елена Титова', email: 'elena@…', role: 'Пациент', active: false, created: '08.09.2025' },
  ],
  alerts: [
    { id: 'al1', user: 'М. Романов', text: 'Рост стресса во время фазы 4 — сессия мягко приостановлена', time: 'сегодня, 14:12', kind: 'stress' },
    { id: 'al2', user: 'Д. Волков', text: 'Ручная остановка сессии пациентом', time: 'сегодня, 11:03', kind: 'manual' },
    { id: 'al3', user: 'О. Смирнова', text: 'Признаки диссоциации — показан grounding-протокол', time: 'вчера, 21:48', kind: 'dissociation' },
  ],
};
