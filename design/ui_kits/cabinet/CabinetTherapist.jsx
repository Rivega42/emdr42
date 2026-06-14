import React from 'react';
import { Button } from '../../components/buttons/Button';
import { Badge } from '../../components/feedback/Badge';
import { Input } from '../../components/forms/Input';
import { DataTable } from '../../components/data/table/DataTable';
import { TrendChart } from '../../components/data/chart/TrendChart';
import { PhaseTimeline } from '../../components/data/phases/PhaseTimeline';
import { CIcon, CABINET_PATIENTS, CABINET_REVIEW } from './CabinetData';

const STATUS_BADGE = {
  active: <Badge variant="success">Активен</Badge>,
  paused: <Badge variant="warning">Пауза</Badge>,
  discharged: <Badge>Выписан</Badge>,
};

/* ---------- Patients (терапевт) ---------- */

export function CabinetPatients({ onNavigate }) {
  const [search, setSearch] = React.useState('');
  const filtered = CABINET_PATIENTS.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <h1 className="c-h1">Мои пациенты</h1>
          <p className="c-sub">Назначенные пациенты и тренд их состояния</p>
        </div>
        <Button variant="primary" size="sm"><CIcon name="user-plus" size={16} /> Пригласить по ссылке</Button>
      </div>

      <Input
        placeholder="Поиск по имени…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 360 }}
      />

      <DataTable
        columns={[
          { key: 'name', label: 'Имя' },
          { key: 'status', label: 'Статус' },
          { key: 'last', label: 'Последняя сессия' },
          { key: 'sessions', label: 'Сессий', align: 'center' },
          { key: 'suds', label: 'Тренд SUDS', align: 'right' },
        ]}
        rows={filtered.map((p) => ({
          id: p.id,
          name: <strong style={{ fontWeight: 500 }}>{p.name}</strong>,
          status: STATUS_BADGE[p.status],
          last: <span className="is-muted">{p.last}</span>,
          sessions: <span className="is-num">{p.sessions}</span>,
          suds:
            p.suds < -1 ? (
              <span className="is-num" style={{ color: 'var(--success)' }}>↓ {Math.abs(p.suds).toFixed(1)}</span>
            ) : (
              <span className="is-num is-muted">↓ {Math.abs(p.suds).toFixed(1)}</span>
            ),
        }))}
        onRowClick={() => onNavigate('review')}
        empty="По запросу никого не нашлось"
      />
      <p className="c-sub">Нажмите на строку, чтобы открыть разбор последней сессии пациента.</p>
    </>
  );
}

/* ---------- Session review (терапевт) ---------- */

export function CabinetReview({ onNavigate }) {
  const r = CABINET_REVIEW;
  const [notes, setNotes] = React.useState('Хорошая переносимость BLS. На следующей сессии — продолжить с мишенью «дорога домой», начать с проверки ресурса.');

  return (
    <>
      <div>
        <a
          className="c-link"
          href="#patients"
          onClick={(e) => { e.preventDefault(); onNavigate('patients'); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <CIcon name="arrow-left" size={15} /> К списку пациентов
        </a>
      </div>

      <div className="c-panel">
        <div className="c-panel__head">
          <h1 className="c-panel__title" style={{ fontSize: 'var(--text-lg)' }}>Разбор сессии — {r.patient}</h1>
          <Badge variant="success">Завершена</Badge>
        </div>
        <div className="c-grid-4" style={{ marginBottom: 'var(--space-6)' }}>
          <div><div className="e-metric__label">Дата</div><div style={{ marginTop: 4 }}>{r.date}</div></div>
          <div><div className="e-metric__label">Длительность</div><div style={{ marginTop: 4 }}>{r.minutes} минут</div></div>
          <div><div className="e-metric__label">Паттерн BLS</div><div style={{ marginTop: 4 }}>{r.pattern}</div></div>
          <div><div className="e-metric__label">Фаза EMDRIA</div><div style={{ marginTop: 4 }}>6 — сканирование тела</div></div>
        </div>
        <PhaseTimeline current={r.phase} />
      </div>

      <div className="c-grid-2">
        <div className="c-panel">
          <h2 className="c-panel__title">Таймлайн сессии</h2>
          <div className="c-tl">
            {r.timeline.map((ev, i) => (
              <div className={`c-tl__item${ev.type === 'alert' ? ' c-tl__item--alert' : ''}`} key={ev.id}>
                <div className="c-tl__rail">
                  <span className="c-tl__icon"><CIcon name={ev.icon} size={15} /></span>
                  {i < r.timeline.length - 1 && <span className="c-tl__line"></span>}
                </div>
                <div className="c-tl__body">
                  <div className="c-tl__meta">{ev.time}</div>
                  <p className="c-tl__text">{ev.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="c-panel">
            <h2 className="c-panel__title">SUDS / VOC</h2>
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div>
                <div className="e-metric__label">SUDS — дистресс</div>
                <div className="c-delta" style={{ marginTop: 4 }}>
                  <span className="c-delta__from">{r.suds.from}</span>
                  <CIcon name="arrow-right" />
                  <span className="c-delta__to">{r.suds.to}</span>
                </div>
              </div>
              <div>
                <div className="e-metric__label">VOC — убеждение, из 7</div>
                <div className="c-delta" style={{ marginTop: 4 }}>
                  <span className="c-delta__from">{r.voc.from}</span>
                  <CIcon name="arrow-right" />
                  <span className="c-delta__to">{r.voc.to}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="c-panel">
            <h2 className="c-panel__title">Уровень напряжения</h2>
            <TrendChart
              labels={r.stress.labels}
              series={[{ name: 'Напряжение', data: r.stress.data }]}
              yMax={1}
              yTicks={[0, 0.5, 1]}
              height={150}
              legend={false}
            />
          </div>

          <div className="c-panel">
            <h2 className="c-panel__title">Заметки терапевта</h2>
            <textarea
              className="c-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label="Заметки терапевта"
              placeholder="Ваши наблюдения по сессии…"
            ></textarea>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Button variant="primary" size="sm">Сохранить заметки</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
