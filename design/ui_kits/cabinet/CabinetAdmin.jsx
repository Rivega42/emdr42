import React from 'react';
import { Badge } from '../../components/feedback/Badge';
import { MetricCard } from '../../components/data/metric/MetricCard';
import { TrendChart } from '../../components/data/chart/TrendChart';
import { DataTable } from '../../components/data/table/DataTable';
import { CIcon, CABINET_ADMIN } from './CabinetData';

/* ---------- Admin ---------- */

export function CabinetAdmin() {
  const a = CABINET_ADMIN;
  return (
    <>
      <div>
        <h1 className="c-h1">Панель администратора</h1>
        <p className="c-sub">Обзор платформы и управление</p>
      </div>

      <div className="c-grid-4">
        {a.metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} delta={m.delta} deltaTone={m.tone} hint={m.hint} />
        ))}
      </div>

      <div className="c-grid-2">
        <div className="c-panel">
          <h2 className="c-panel__title">Сессий за неделю</h2>
          <TrendChart
            labels={a.sessionsTrend.labels}
            series={[{ name: 'Сессии', data: a.sessionsTrend.data }]}
            yMax={70}
            yTicks={[0, 35, 70]}
            height={180}
            legend={false}
          />
        </div>
        <div className="c-panel">
          <h2 className="c-panel__title">Состояние системы</h2>
          <div className="c-syschecks">
            {a.system.map((s) => (
              <div className="c-syscheck" key={s.label}>
                <span>{s.label}</span>
                {s.ok ? <Badge variant="success">работает</Badge> : <Badge variant="warm">планируется</Badge>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="c-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="c-panel__head" style={{ padding: 'var(--space-5) var(--space-6) 0' }}>
          <h2 className="c-panel__title">Пользователи</h2>
          <span className="c-sub">412 всего · показаны недавние</span>
        </div>
        <DataTable
          style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}
          columns={[
            { key: 'name', label: 'Имя' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Роль' },
            { key: 'state', label: 'Статус' },
            { key: 'created', label: 'Регистрация', align: 'right' },
          ]}
          rows={a.users.map((u) => ({
            id: u.id,
            name: <strong style={{ fontWeight: 500 }}>{u.name}</strong>,
            email: <span className="is-muted">{u.email}</span>,
            role: u.role === 'Терапевт' ? <Badge variant="accent">Терапевт</Badge> : <Badge>{u.role}</Badge>,
            state: u.active ? <Badge variant="success">Активен</Badge> : <Badge>Неактивен</Badge>,
            created: <span className="is-muted is-num">{u.created}</span>,
          }))}
        />
      </div>

      <div className="c-panel">
        <h2 className="c-panel__title">Недавние safety alerts</h2>
        <div className="c-tl">
          {a.alerts.map((al, i) => (
            <div className="c-tl__item c-tl__item--alert" key={al.id}>
              <div className="c-tl__rail">
                <span className="c-tl__icon"><CIcon name="alert" size={15} /></span>
                {i < a.alerts.length - 1 && <span className="c-tl__line"></span>}
              </div>
              <div className="c-tl__body">
                <div className="c-tl__meta">{al.time} · {al.user}</div>
                <p className="c-tl__text">{al.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
