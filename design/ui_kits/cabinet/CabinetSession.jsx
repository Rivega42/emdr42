import React from 'react';
import { Button } from '../../components/buttons/Button';
import { Badge } from '../../components/feedback/Badge';
import { PhaseTimeline, EMDRIA_PHASES } from '../../components/data/phases/PhaseTimeline';
import { TrendChart } from '../../components/data/chart/TrendChart';
import { CIcon, CABINET_SESSION } from './CabinetData';

/* Длительность одного прохода BLS из частоты (Гц): полупериод в секундах. */
function blsDuration(hz) {
  return (1 / hz).toFixed(2) + 's';
}

/* ============ Экран пациента: активная EMDR-сессия ============ */

export function SessionPatient({ onExit }) {
  const s = CABINET_SESSION;
  const [paused, setPaused] = React.useState(false);
  const [speed, setSpeed] = React.useState(s.defaultSpeed);
  const [audio, setAudio] = React.useState(true);
  const [side, setSide] = React.useState('L');
  const [showSuds, setShowSuds] = React.useState(false);
  const [suds, setSuds] = React.useState(null);

  // билатеральное аудио: переключение активной стороны в такт
  React.useEffect(() => {
    if (paused || !audio) return;
    const id = setInterval(() => setSide((p) => (p === 'L' ? 'R' : 'L')), (1000 / speed) / 2);
    return () => clearInterval(id);
  }, [paused, audio, speed]);

  const orbClass =
    's-orb' + (paused ? ' s-orb--paused' : ' s-orb--run');

  return (
    <div className="s-screen" data-screen-label="EMDR-сессия (пациент)">
      <div className="s-top">
        <div className="s-phase">
          <span className="s-phase__eyebrow">Фаза {s.phaseIndex + 1} из 8</span>
          <span className="s-phase__name">{s.phaseName}</span>
        </div>
        <div className="s-top__right">
          <span className="s-watch"><CIcon name="eye" size={14} /> Терапевт наблюдает</span>
          <span className="s-timer">{s.elapsed}</span>
          <button className="c-iconbtn" aria-label="Завершить сессию" onClick={onExit}><CIcon name="x" /></button>
        </div>
      </div>

      <div className="s-stage">
        <div className="s-self" aria-label="Ваша камера и текущая эмоция">
          <div className="s-self__cam">
            <span className="s-self__live">камера локально</span>
            <CIcon name="smile" size={26} />
          </div>
          <div className="s-self__foot">
            <span className="s-self__label">Состояние</span>
            <span className="s-self__emotion">{s.emotion}</span>
          </div>
        </div>

        <div className="s-track">
          <span
            className={orbClass}
            style={{ '--bls-duration': blsDuration(speed) }}
            aria-hidden="true"
          ></span>
        </div>

        <p className="s-reduced-note">Анимация движения отключена в настройках системы — следуйте за точкой взглядом в своём темпе.</p>

        <div className="s-audio" aria-hidden="true">
          <div className="s-audio__side">
            <span className={`s-audio__dot${audio && !paused && side === 'L' ? ' s-audio__dot--on' : ''}`}></span>
            Лево
          </div>
          <div className="s-audio__side">
            <span className={`s-audio__dot${audio && !paused && side === 'R' ? ' s-audio__dot--on' : ''}`}></span>
            Право
          </div>
        </div>

        {showSuds && (
          <div className="s-suds" role="dialog" aria-label="Оценка уровня напряжения">
            <p className="s-suds__q">Насколько сильно беспокоит образ сейчас?</p>
            <p className="s-suds__hint">Шкала SUDS — от 0 (спокойно) до 10 (максимальное напряжение)</p>
            <div className="s-suds__scale">
              {Array.from({ length: 11 }).map((_, n) => (
                <button
                  key={n}
                  className={`s-suds__n${suds === n ? ' s-suds__n--sel' : ''}`}
                  onClick={() => { setSuds(n); setTimeout(() => setShowSuds(false), 450); }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="s-suds__legend"><span>0 — спокойно</span><span>10 — очень тяжело</span></div>
          </div>
        )}
      </div>

      <div className="s-controls">
        <button className="s-ctl" onClick={() => setSpeed((v) => Math.max(0.4, +(v - 0.2).toFixed(1)))}>
          <span className="s-ctl__btn"><CIcon name="minus" /></span>
          Медленнее
        </button>
        <button className="s-ctl s-ctl--primary" onClick={() => setPaused((p) => !p)}>
          <span className="s-ctl__btn"><CIcon name={paused ? 'play' : 'pause'} /></span>
          {paused ? 'Продолжить' : 'Пауза'}
        </button>
        <button className="s-ctl" onClick={() => setSpeed((v) => Math.min(1.6, +(v + 0.2).toFixed(1)))}>
          <span className="s-ctl__btn"><CIcon name="plus" /></span>
          Быстрее
        </button>
        <button className="s-ctl" onClick={() => setAudio((a) => !a)}>
          <span className="s-ctl__btn"><CIcon name={audio ? 'volume' : 'volume-x'} /></span>
          Звук {audio ? 'вкл' : 'выкл'}
        </button>
        <button className="s-ctl" onClick={() => setShowSuds((v) => !v)}>
          <span className="s-ctl__btn"><CIcon name="activity" /></span>
          Оценить SUDS
        </button>
        <button className="s-ctl s-ctl--stop" onClick={onExit}>
          <span className="s-ctl__btn"><CIcon name="x" /></span>
          Завершить
        </button>
      </div>
    </div>
  );
}

/* ============ Экран терапевта: наблюдение за сессией ============ */

const BLS_CHANNELS = [
  { id: 'visual', label: 'Визуальная', icon: 'monitor' },
  { id: 'audio', label: 'Аудио', icon: 'headphones' },
  { id: 'tactile', label: 'Тактильная', icon: 'zap' },
];

const BLS_PATTERNS = [
  { id: 'horizontal', label: 'Горизонтальный' },
  { id: 'diagonal', label: 'Диагональный' },
  { id: 'circular', label: 'Круговой' },
  { id: 'infinity', label: 'Восьмёрка' },
];

const ORB_COLORS = [
  { id: 'moon', label: 'Лунный', value: 'var(--accent)' },
  { id: 'mist', label: 'Туманный', value: '#eafaf2' },
  { id: 'warm', label: 'Тёплый', value: 'var(--warm-text)' },
];

export function SessionMonitor() {
  const s = CABINET_SESSION;
  const [running, setRunning] = React.useState(true);
  const [channels, setChannels] = React.useState(['visual', 'audio']);
  const [speed, setSpeed] = React.useState(s.defaultSpeed);
  const [amplitude, setAmplitude] = React.useState(80);
  const [size, setSize] = React.useState(56);
  const [brightness, setBrightness] = React.useState(70);
  const [pattern, setPattern] = React.useState('horizontal');
  const [orbColor, setOrbColor] = React.useState('moon');
  const [volume, setVolume] = React.useState(60);
  const [balance, setBalance] = React.useState(0);
  const [setLength, setSetLength] = React.useState(24);

  const toggleChannel = (id) =>
    setChannels((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const orbVal = ORB_COLORS.find((c) => c.id === orbColor).value;
  const orbRunning = running && channels.includes('visual');

  return (
    <>
      <div className="m-head">
        <div>
          <h1 className="c-h1">Наблюдение — Анна К.</h1>
          <p className="c-sub">Сессия идёт · фаза {s.phaseIndex + 1} «{s.phaseName}» · {s.elapsed}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span className="m-secure"><CIcon name="shield-check" size={14} /> Защищённое соединение</span>
          <span className="m-live"><span className="m-live__dot"></span> LIVE</span>
        </div>
      </div>

      <div className="c-panel">
        <PhaseTimeline current={s.phaseIndex} />
      </div>

      <div className="m-grid">
        {/* ЛЕВО: видео пациента + зеркало BLS + эмоциональный поток */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="c-panel">
            <h2 className="c-panel__title">Камера пациента</h2>
            <div className="m-cam">
              <span className="m-cam__face" aria-hidden="true"></span>
              <span className="m-cam__detect" data-label={s.emotion + ' · 92%'} aria-hidden="true"></span>
              <div className="m-cam__bar m-cam__bar--top">
                <span className="m-cam__live">LIVE · Анна К.</span>
                <span className="m-cam__chip"><CIcon name="lock" /> локально на устройстве</span>
              </div>
              <div className="m-cam__bar m-cam__bar--bottom">
                <span className="m-cam__local"><CIcon name="camera" size={13} /> 1280×720 · 30 к/с</span>
                <span className="m-cam__emotion">Эмоция: {s.emotion}</span>
              </div>
            </div>
            <p className="c-sub" style={{ marginTop: 'var(--space-3)' }}>
              Видео не покидает устройство пациента — терапевт видит зеркало потока и метки эмоций, распознанных локально.
            </p>
          </div>

          <div className="c-panel">
            <h2 className="c-panel__title">Что видит пациент</h2>
            <div className="m-mirror">
              <span className="m-mirror__tag">BLS · {speed.toFixed(1)} Гц · {BLS_PATTERNS.find((p) => p.id === pattern).label}</span>
              <div className="m-mirror__track" style={{ left: `${(100 - amplitude) / 2}%`, right: `${(100 - amplitude) / 2}%` }}>
                <span
                  className={'m-mirror__orb' + (orbRunning ? ' m-mirror__orb--run' : '')}
                  style={{
                    '--bls-duration': blsDuration(speed),
                    width: `${size * 0.55}px`, height: `${size * 0.55}px`,
                    background: `radial-gradient(circle at 42% 38%, #eafaf2, ${orbVal} 72%)`,
                    boxShadow: `0 0 ${10 + brightness * 0.25}px ${brightness * 0.08}px color-mix(in oklab, ${orbVal} ${40 + brightness * 0.4}%, transparent)`,
                    opacity: orbRunning ? 1 : 0.35,
                    left: orbRunning ? undefined : '50%',
                  }}
                  aria-hidden="true"
                ></span>
              </div>
            </div>
          </div>

          <div className="c-panel">
            <h2 className="c-panel__title">Эмоциональный поток</h2>
            <div className="m-emotion" style={{ marginBottom: 'var(--space-4)' }}>
              <span className="m-emotion__val">{s.emotion}</span>
              <span className="m-emotion__sub">доминирующая эмоция · обновляется локально на устройстве пациента</span>
            </div>
            <TrendChart
              labels={s.stressStream.labels}
              series={[{ name: 'Напряжение', data: s.stressStream.data }]}
              yMax={1}
              yTicks={[0, 0.5, 1]}
              height={150}
              legend={false}
            />
          </div>
        </div>

        {/* ПРАВО: показатели + пульт BLS + вмешательство */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="c-panel">
            <h2 className="c-panel__title">Показатели</h2>
            <div className="m-readouts">
              <div className="m-readout"><div className="m-readout__label">SUDS сейчас</div><div className="m-readout__val" style={{ color: 'var(--accent)' }}>4</div></div>
              <div className="m-readout"><div className="m-readout__label">SUDS старт</div><div className="m-readout__val is-muted">7</div></div>
              <div className="m-readout"><div className="m-readout__label">VOC</div><div className="m-readout__val">4 / 7</div></div>
              <div className="m-readout"><div className="m-readout__label">Сетов BLS</div><div className="m-readout__val">12</div></div>
            </div>
          </div>

          <div className="c-panel">
            <h2 className="c-panel__title">Пульт билатеральной стимуляции</h2>
            <div className="m-bls">
              {/* запуск сета */}
              <div className="m-runbar">
                <Button variant={running ? 'secondary' : 'primary'} onClick={() => setRunning((r) => !r)}>
                  <CIcon name={running ? 'pause' : 'play'} size={16} /> {running ? 'Пауза' : 'Запустить'}
                </Button>
                <Button variant="secondary" onClick={() => setRunning(false)}>
                  <CIcon name="square" size={16} /> Стоп
                </Button>
              </div>

              <hr className="m-divider" />

              {/* каналы стимуляции */}
              <div className="m-blsgroup">
                <span className="m-blsgroup__head">Каналы стимуляции</span>
                <div className="m-seg">
                  {BLS_CHANNELS.map((ch) => (
                    <button
                      key={ch.id}
                      className={'m-seg__btn' + (channels.includes(ch.id) ? ' m-seg__btn--on' : '')}
                      onClick={() => toggleChannel(ch.id)}
                      aria-pressed={channels.includes(ch.id)}
                    >
                      <CIcon name={ch.icon} /> {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="m-divider" />

              {/* движение мишени */}
              <div className="m-blsgroup">
                <span className="m-blsgroup__head">Движение мишени</span>
                <div className="m-control">
                  <span className="m-control__label">Скорость <b>{speed.toFixed(1)} Гц</b></span>
                  <input className="m-range" type="range" min="0.4" max="1.6" step="0.1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Скорость BLS" />
                </div>
                <div className="m-control">
                  <span className="m-control__label">Амплитуда хода <b>{amplitude}%</b></span>
                  <input className="m-range" type="range" min="30" max="100" step="1" value={amplitude} onChange={(e) => setAmplitude(Number(e.target.value))} aria-label="Амплитуда хода" />
                </div>
                <div className="e-field">
                  <label className="e-field__label" htmlFor="m-pattern">Паттерн</label>
                  <select id="m-pattern" className="e-input" value={pattern} onChange={(e) => setPattern(e.target.value)}>
                    {BLS_PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <hr className="m-divider" />

              {/* вид мишени */}
              <div className="m-blsgroup">
                <span className="m-blsgroup__head">Вид мишени</span>
                <div className="m-control">
                  <span className="m-control__label">Размер <b>{size} px</b></span>
                  <input className="m-range" type="range" min="32" max="80" step="2" value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Размер мишени" />
                </div>
                <div className="m-control">
                  <span className="m-control__label">Яркость свечения <b>{brightness}%</b></span>
                  <input className="m-range" type="range" min="20" max="100" step="1" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} aria-label="Яркость свечения" />
                </div>
                <div className="m-control">
                  <span className="m-control__label">Цвет</span>
                  <div className="m-swatches">
                    {ORB_COLORS.map((c) => (
                      <button
                        key={c.id}
                        className={'m-swatch' + (orbColor === c.id ? ' m-swatch--on' : '')}
                        style={{ background: c.value }}
                        onClick={() => setOrbColor(c.id)}
                        aria-label={'Цвет: ' + c.label}
                        aria-pressed={orbColor === c.id}
                      ></button>
                    ))}
                  </div>
                </div>
              </div>

              <hr className="m-divider" />

              {/* аудио */}
              <div className="m-blsgroup">
                <span className="m-blsgroup__head">Билатеральное аудио</span>
                <div className="m-control">
                  <span className="m-control__label">Громкость <b>{volume}%</b></span>
                  <input className="m-range" type="range" min="0" max="100" step="1" value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Громкость аудио" disabled={!channels.includes('audio')} />
                </div>
                <div className="m-control">
                  <span className="m-control__label">Баланс L / R <b>{balance === 0 ? 'центр' : (balance < 0 ? `L ${-balance}` : `R ${balance}`)}</b></span>
                  <input className="m-range" type="range" min="-50" max="50" step="1" value={balance} onChange={(e) => setBalance(Number(e.target.value))} aria-label="Баланс лево-право" disabled={!channels.includes('audio')} />
                </div>
              </div>

              <hr className="m-divider" />

              {/* длина сета */}
              <div className="m-blsgroup">
                <span className="m-blsgroup__head">Длина сета</span>
                <div className="m-stepper">
                  <button className="m-stepper__btn" onClick={() => setSetLength((n) => Math.max(8, n - 2))} aria-label="Уменьшить"><CIcon name="minus" /></button>
                  <span className="m-stepper__val">{setLength} <span className="m-stepper__unit">проходов</span></span>
                  <button className="m-stepper__btn" onClick={() => setSetLength((n) => Math.min(60, n + 2))} aria-label="Увеличить"><CIcon name="plus" /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="c-panel">
            <h2 className="c-panel__title">Вмешательство</h2>
            <div className="m-actions">
              <Button variant="secondary"><CIcon name="wind" size={16} /> Предложить заземление</Button>
              <Button variant="secondary"><CIcon name="message" size={16} /> Сообщение пациенту</Button>
              <Button variant="danger"><CIcon name="heart" size={16} /> Кризисный протокол</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
