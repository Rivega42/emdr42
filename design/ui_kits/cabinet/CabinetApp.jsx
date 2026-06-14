import React from 'react';
import { CabinetShell } from './CabinetShell';
import { CabinetDashboard, CabinetProgress, CabinetSettings } from './CabinetPatient';
import { CabinetPatients, CabinetReview } from './CabinetTherapist';
import { CabinetAdmin } from './CabinetAdmin';
import { SessionPatient, SessionMonitor } from './CabinetSession';

/**
 * Личный кабинет EMDR42 — интерактивный клик-чрез по 6 экранам.
 * options.fixedTheme — зафиксировать тему (для карточек-превью),
 * иначе тема читается/пишется в localStorage('emdr42-ds-theme').
 */
export function CabinetApp({ initialScreen = 'dashboard', fixedTheme = null }) {
  const [screen, setScreen] = React.useState(initialScreen);
  const [theme, setTheme] = React.useState(() => {
    if (fixedTheme) return fixedTheme;
    try {
      return localStorage.getItem('emdr42-ds-theme') || 'night';
    } catch (e) {
      return 'night';
    }
  });

  React.useEffect(() => {
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    if (!fixedTheme) {
      try { localStorage.setItem('emdr42-ds-theme', theme); } catch (e) { /* noop */ }
    }
  }, [theme, fixedTheme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'night' : 'light');

  // Активная сессия пациента — полноэкранный иммерсивный режим без shell.
  if (screen === 'session') {
    return <SessionPatient onExit={() => setScreen('dashboard')} />;
  }

  return (
    <CabinetShell screen={screen} onNavigate={setScreen} theme={theme} onToggleTheme={toggleTheme}>
      {screen === 'dashboard' && <CabinetDashboard onNavigate={setScreen} />}
      {screen === 'progress' && <CabinetProgress />}
      {screen === 'settings' && <CabinetSettings />}
      {screen === 'patients' && <CabinetPatients onNavigate={setScreen} />}
      {screen === 'review' && <CabinetReview onNavigate={setScreen} />}
      {screen === 'monitor' && <SessionMonitor />}
      {screen === 'admin' && <CabinetAdmin />}
    </CabinetShell>
  );
}
