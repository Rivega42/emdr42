import React from 'react';
import { Button } from '../../components/buttons/Button';
import { Badge } from '../../components/feedback/Badge';
import { Input } from '../../components/forms/Input';
import { Switch } from '../../components/forms/Switch';
import { MetricCard } from '../../components/data/metric/MetricCard';
import { TrendChart } from '../../components/data/chart/TrendChart';
import { Achievement } from '../../components/data/achievements/Achievement';
import { CIcon, CABINET_SESSIONS, CABINET_CHART, CABINET_ACHIEVEMENTS } from './CabinetData';

/* ---------- общие куски ---------- */

function SessionRows({ sessions }) {
  return (
    <div className="c-sessions">
      {sessions.map((s) => (
        <div className="c-session-row" key={s.id}>
          <span className="c-session-row__date">{s.date}</span>
          <span className="c-session-row__meta c-session-row__hide-m">{s.phase}</span>
          <span className="c-session-row__meta c-session-row__hide-m">
            SUDS {s.sudsFrom} → <strong style={{ color: 'var(--accent)' }}>{s.sudsTo}</strong>
          </span>
          {s.status === 'done' ? (
            <Badge variant="success">Завершена</Badge>
          ) : (
            <Badge variant="warning">Прервана</Badge>
          )}
        </div>
      ))}
    </div>
  );
}

function CrisisLine() {
  return (
    <div className="c-crisis" role="note">
      <CIcon name="heart" />
      <span>
        Если вам тяжело прямо сейчас — позвоните <a href="tel:88002000122">8-800-2000-122</a> (бесплатно, круглосуточно) или откройте <a href="https://www.befrienders.org" target="_blank" rel="noopener noreferrer">befrienders.org</a>.
      </span>
    </div>
  );
}

/* ---------- Dashboard ---------- */

export function CabinetDashboard({ onNavigate }) {
  return (
    <>
      <div>
        <h1 className="c-h1">С возвращением, Анна</h1>
        <p className="c-sub">Вы занимаетесь 6 дней подряд. Продолжайте в своём темпе.</p>
      </div>

      <div className="c-grid-4">
        <MetricCard label="Сессий на этой неделе" value="3" />
        <MetricCard label="Текущий streak" value="6 дней" hint="Лучшая серия — 11 дней" />
        <MetricCard label="Общее время" value="4.5 ч" />
        <MetricCard label="Уровень" value="4" hint="120 XP до уровня 5" />
      </div>

      <div className="c-grid-2">
        <div className="c-panel">
          <h2 className="c-panel__title">Начать новую сессию</h2>
          <p className="c-sub" style={{ marginBottom: 'var(--space-6)' }}>
            EMDR-сессия с ИИ-ассистентом и адаптивной билатеральной стимуляцией.
            Длится 25–45 минут, остановить можно в любой момент.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Button variant="primary">Начать новую сессию</Button>
            <Button variant="ghost">Направляемая сессия</Button>
          </div>
        </div>
        <div className="c-panel">
          <h2 className="c-panel__title">Цель дня</h2>
          <p className="c-sub" style={{ marginBottom: 'var(--space-4)' }}>
            Одна сессия сегодня — серия сохранится.
          </p>
          <div className="c-bar" aria-hidden="true">
            <div className="c-bar__fill" style={{ width: '0%' }}></div>
          </div>
          <p className="c-sub" style={{ marginTop: 'var(--space-2)' }}>
            Откройте сессию, чтобы начать
          </p>
        </div>
      </div>

      <div className="c-panel">
        <div className="c-panel__head">
          <h2 className="c-panel__title">Недавние сессии</h2>
          <a className="c-link" href="#progress" onClick={(e) => { e.preventDefault(); onNavigate('progress'); }}>
            Все сессии →
          </a>
        </div>
        <SessionRows sessions={CABINET_SESSIONS.slice(0, 4)} />
      </div>

      <CrisisLine />
    </>
  );
}

/* ---------- Progress ---------- */

export function CabinetProgress() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <h1 className="c-h1">Прогресс</h1>
          <p className="c-sub">История ваших сессий и достижения</p>
        </div>
        <span className="c-streak"><CIcon name="flame" /> 6 дней подряд</span>
      </div>

      <div className="c-grid-4">
        <MetricCard label="Всего сессий" value="24" delta="4 на этой неделе" deltaTone="neutral" />
        <MetricCard label="Завершено" value="21" hint="88% всех сессий" />
        <MetricCard label="Среднее снижение SUDS" value="2.1" delta="спокойнее с апреля" deltaTone="good" trend={[1.2, 1.4, 1.3, 1.7, 1.9, 2.0, 2.1]} />
        <MetricCard label="Средний прирост VOC" value="1.4" deltaTone="good" trend={[0.8, 1.0, 0.9, 1.2, 1.3, 1.4, 1.4]} />
      </div>

      <div className="c-panel">
        <h2 className="c-panel__title">Динамика SUDS по сессиям</h2>
        <TrendChart
          labels={CABINET_CHART.labels}
          series={[
            { name: 'SUDS до сессии', data: CABINET_CHART.before },
            { name: 'SUDS после', data: CABINET_CHART.after, tone: 'warm' },
          ]}
          yMax={10}
          height={210}
        />
      </div>

      <div className="c-panel">
        <div className="c-panel__head">
          <h2 className="c-panel__title">Уровень 4</h2>
          <span className="c-sub">880 XP · до уровня 5 — 120 XP</span>
        </div>
        <div className="c-bar" role="progressbar" aria-valuenow={88} aria-valuemin={0} aria-valuemax={100} aria-label="Прогресс уровня">
          <div className="c-bar__fill" style={{ width: '88%' }}></div>
        </div>
      </div>

      <div className="c-panel">
        <h2 className="c-panel__title">Последние сессии</h2>
        <SessionRows sessions={CABINET_SESSIONS} />
      </div>

      <div className="c-panel">
        <h2 className="c-panel__title">Достижения</h2>
        <div className="c-grid-achv">
          {CABINET_ACHIEVEMENTS.map((a) => (
            <Achievement
              key={a.id}
              title={a.title}
              description={a.desc}
              unlocked={a.unlocked}
              icon={<CIcon name={a.unlocked ? a.icon : 'lock'} size={20} />}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- Settings ---------- */

export function CabinetSettings() {
  const [therapy, setTherapy] = React.useState({ adaptive: true, binaural: false, sounds: true });
  const [notif, setNotif] = React.useState({ email: true, push: false, sms: false });
  const [privacy, setPrivacy] = React.useState({ analytics: false });
  const [speed, setSpeed] = React.useState(0.8);

  return (
    <>
      <div>
        <h1 className="c-h1">Настройки</h1>
        <p className="c-sub">Профиль, терапия, уведомления и ваши данные</p>
      </div>

      <div className="c-panel">
        <h2 className="c-panel__title">Профиль</h2>
        <div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 480 }}>
          <Input label="Имя" defaultValue="Анна Ковалёва" />
          <Input label="Email" type="email" defaultValue="anna@example.com" disabled hint="Для смены email свяжитесь с поддержкой" />
        </div>
      </div>

      <div className="c-panel">
        <h2 className="c-panel__title">Настройки терапии</h2>
        <Switch label="Адаптивный режим" description="ИИ подстраивает паттерн и скорость под ваше эмоциональное состояние" checked={therapy.adaptive} onChange={(v) => setTherapy({ ...therapy, adaptive: v })} />
        <Switch label="Билатеральное аудио" description="Звуковые частоты для усиления терапевтического эффекта" checked={therapy.binaural} onChange={(v) => setTherapy({ ...therapy, binaural: v })} />
        <Switch label="Звуковые эффекты" description="Фоновые звуки во время сессий" checked={therapy.sounds} onChange={(v) => setTherapy({ ...therapy, sounds: v })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)', maxWidth: 480 }}>
          <div className="e-field">
            <label className="e-field__label" htmlFor="bls-pattern">Паттерн BLS</label>
            <select id="bls-pattern" className="e-input" defaultValue="horizontal">
              <option value="horizontal">Горизонтальный</option>
              <option value="diagonal">Диагональный</option>
              <option value="circular">Круговой</option>
            </select>
          </div>
          <div className="e-field">
            <label className="e-field__label" htmlFor="bls-speed">Скорость · {speed.toFixed(1)} Гц</label>
            <input
              id="bls-speed"
              type="range"
              min="0.4"
              max="1.6"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ accentColor: 'var(--accent)', minHeight: 44 }}
            />
          </div>
        </div>
      </div>

      <div className="c-panel">
        <h2 className="c-panel__title">Уведомления</h2>
        <Switch label="Email" description="Напоминания о сессиях и еженедельный отчёт" checked={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} />
        <Switch label="Push" description="Браузерные уведомления" checked={notif.push} onChange={(v) => setNotif({ ...notif, push: v })} />
        <Switch label="SMS" description="Только для экстренных уведомлений" checked={notif.sms} onChange={(v) => setNotif({ ...notif, sms: v })} />
      </div>

      <div className="c-panel">
        <h2 className="c-panel__title">Приватность и данные</h2>
        <Switch label="Анонимная аналитика" description="Помогает улучшать платформу. Персональные данные не передаются." checked={privacy.analytics} onChange={(v) => setPrivacy({ analytics: v })} />
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="secondary"><CIcon name="download" size={16} /> Скачать свои данные</Button>
          <p className="c-sub" style={{ marginTop: 'var(--space-2)' }}>GDPR ст. 15 — полный экспорт в JSON</p>
        </div>
      </div>

      <div className="c-danger">
        <h2 className="c-danger__title">Удаление аккаунта</h2>
        <p className="c-danger__text">
          Данные будут удалены через 30 дней. В течение этого срока удаление можно отменить, написав в поддержку.
        </p>
        <Button variant="danger">Удалить аккаунт</Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary">Сохранить</Button>
      </div>
    </>
  );
}
