import React from 'react';
import { Badge } from '../../components/feedback/Badge';
import { Sidebar } from '../../components/navigation/Sidebar';
import { CIcon, CABINET_USER } from './CabinetData';

/**
 * Каркас кабинета: sidebar + header + контент.
 * Свечение в каркасе отсутствует — оно зарезервировано
 * за одним primary-действием экрана.
 */

const NAV_SECTIONS = [
  {
    items: [
      { id: 'dashboard', label: 'Главная', icon: <CIcon name="layout-dashboard" /> },
      { id: 'session', label: 'Сессия', icon: <CIcon name="play" /> },
      { id: 'progress', label: 'Прогресс', icon: <CIcon name="activity" /> },
      { id: 'settings', label: 'Настройки', icon: <CIcon name="sliders" /> },
    ],
  },
  {
    title: 'Терапевт',
    items: [
      { id: 'patients', label: 'Пациенты', icon: <CIcon name="users" /> },
      { id: 'monitor', label: 'Наблюдение', icon: <CIcon name="eye" /> },
      { id: 'review', label: 'Разбор сессии', icon: <CIcon name="clipboard" /> },
    ],
  },
  {
    title: 'Администрирование',
    items: [{ id: 'admin', label: 'Платформа', icon: <CIcon name="shield" /> }],
  },
];

const SCREEN_TITLES = {
  dashboard: 'Главная',
  session: 'EMDR-сессия',
  progress: 'Прогресс',
  settings: 'Настройки',
  patients: 'Мои пациенты',
  monitor: 'Наблюдение за сессией',
  review: 'Разбор сессии',
  admin: 'Панель администратора',
};

const SCREEN_ROLES = {
  dashboard: 'Пациент',
  session: 'Пациент',
  progress: 'Пациент',
  settings: 'Пациент',
  patients: 'Терапевт',
  monitor: 'Терапевт',
  review: 'Терапевт',
  admin: 'Админ',
};

export function CabinetShell({ screen, onNavigate, theme, onToggleTheme, children }) {
  const [sideOpen, setSideOpen] = React.useState(false);

  const navigate = (id) => {
    setSideOpen(false);
    onNavigate(id);
  };

  return (
    <div className="c-app">
      <div className={`c-side${sideOpen ? ' c-side--open' : ''}`}>
        <Sidebar
          sections={NAV_SECTIONS}
          activeId={screen === 'review' ? 'review' : screen}
          onSelect={navigate}
          header={
            <div className="c-side__logo">
              <span className="c-side__logo-mark" aria-hidden="true"></span>
              <span className="c-side__logo-word">EMDR-AI</span>
            </div>
          }
          footer={
            <div className="c-side__footer">
              <button type="button" className="e-sidebar__item">
                <CIcon name="log-out" />
                <span>Выйти</span>
              </button>
            </div>
          }
        />
      </div>
      {sideOpen && <button className="c-scrim" aria-label="Закрыть меню" onClick={() => setSideOpen(false)}></button>}

      <div className="c-main">
        <header className="c-header">
          <div className="c-header__left">
            <button className="c-iconbtn c-burger" aria-label="Открыть меню" onClick={() => setSideOpen(true)}>
              <CIcon name="menu" />
            </button>
            <span className="c-header__title">{SCREEN_TITLES[screen] || ''}</span>
          </div>
          <div className="c-header__right">
            <button
              className="c-iconbtn"
              aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
              onClick={onToggleTheme}
            >
              <CIcon name={theme === 'light' ? 'moon' : 'sun'} />
            </button>
            <div className="c-header__user">
              <span className="c-header__name">{CABINET_USER.fullName}</span>
              <Badge variant="accent">{SCREEN_ROLES[screen] || 'Пациент'}</Badge>
            </div>
          </div>
        </header>
        <main className="c-content" data-screen-label={SCREEN_TITLES[screen]}>
          {children}
        </main>
      </div>
    </div>
  );
}
