import React from 'react';
import { Button } from '../../components/buttons/Button';
import { Card } from '../../components/cards/Card';
import { Disclaimer } from '../../components/feedback/Disclaimer';

/**
 * Главная страница EMDR42 — «Лунная ночь».
 * Иконки — lucide (data-lucide), createIcons() вызывает хост-страница.
 */

function LucideIcon({ name }) {
  return <i data-lucide={name}></i>;
}

export function LandingNav() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={`l-nav${scrolled ? ' l-nav--scrolled' : ''}`}>
      <div className="l-container l-nav__inner">
        <a className="l-logo" href="#" aria-label="EMDR-AI — главная">
          <span className="l-logo__mark" aria-hidden="true"></span>
          <span className="l-logo__word">EMDR-AI</span>
        </a>
        <div className="l-nav__links">
          <a className="l-nav__link l-nav__link--about" href="#about">О проекте</a>
          <a className="l-nav__link" href="#login">Войти</a>
          <Button variant="primary" size="sm" href="#register">Регистрация</Button>
        </div>
      </div>
    </nav>
  );
}

export function LandingHero() {
  return (
    <header className="l-hero" data-screen-label="Hero — Лунная ночь">
      <span className="l-hero__moon" aria-hidden="true"></span>
      <span className="l-hero__path" aria-hidden="true"></span>
      <div className="l-container l-hero__inner">
        <h1 className="l-hero__title">EMDR-AI Терапия</h1>
        <p className="l-hero__sub">
          Платформа виртуальной EMDR-терапии с ИИ-ассистентом и распознаванием
          эмоций в реальном времени
        </p>
        <div className="l-hero__cta">
          <Button variant="primary" size="lg" href="#session">Начать сессию</Button>
          <Button variant="ghost" size="lg" href="#about">Узнать больше</Button>
        </div>
        <div className="l-disclaimer">
          <Disclaimer />
        </div>
      </div>
    </header>
  );
}

const FEATURES = [
  {
    icon: 'shield',
    title: 'Приватность прежде всего',
    text: 'Распознавание эмоций работает локально в браузере. Видео не покидает ваше устройство.',
  },
  {
    icon: 'waves',
    title: 'Адаптивная терапия',
    text: 'ИИ подбирает паттерны и интенсивность BLS на основе ваших реальных эмоциональных реакций.',
  },
  {
    icon: 'audio-lines',
    title: 'Мультисенсорный подход',
    text: 'Визуальная стимуляция в сочетании с билатеральным аудио для усиления терапевтического эффекта.',
  },
  {
    icon: 'activity',
    title: 'Отслеживание прогресса',
    text: 'Детальная аналитика SUDS/VOC, эмоциональных трендов и истории сессий.',
  },
  {
    icon: 'sparkles',
    title: 'Геймификация',
    text: 'Система достижений и уровней делает процесс терапии вовлекающим.',
  },
  {
    icon: 'heart-pulse',
    title: 'Клинически обоснованно',
    text: 'Протокол EMDRIA из 8 фаз со встроенными механизмами безопасности и crisis-детекцией.',
  },
];

export function LandingFeatures() {
  return (
    <section className="l-features" id="about" data-screen-label="Почему EMDR-AI">
      <div className="l-container">
        <h2 className="l-features__title">Почему EMDR-AI</h2>
        <div className="l-features__grid">
          {FEATURES.map((f) => (
            <Card key={f.title} icon={<LucideIcon name={f.icon} />} title={f.title}>
              {f.text}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingCta() {
  return (
    <section className="l-cta" data-screen-label="CTA — путь восстановления">
      <span className="l-cta__path" aria-hidden="true"></span>
      <div className="l-container">
        <h2 className="l-cta__title">Готовы начать путь восстановления?</h2>
        <p className="l-cta__sub">Присоединяйтесь к тем, кто нашёл поддержку через нашу платформу.</p>
        <Button variant="primary" size="lg" href="#register">Попробовать бесплатно</Button>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="l-footer" data-screen-label="Footer">
      <div className="l-container">
        <p>© {new Date().getFullYear()} EMDR-AI Therapy Assistant</p>
        <div className="l-footer__links">
          <a href="#terms">Условия использования</a>
          <a href="#privacy">Политика конфиденциальности</a>
          <a href="#consent">Информированное согласие</a>
          <a href="#about">О проекте</a>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
  });
  return (
    <div className="l-page">
      <LandingNav />
      <LandingHero />
      <main>
        <LandingFeatures />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
