'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  ActivityIcon,
  AudioLinesIcon,
  HeartHandIcon,
  HeartPulseIcon,
  ShieldIcon,
  SparklesIcon,
  WavesIcon,
} from '@/components/ui/icons';

/* Главная страница в дизайн-системе «Лунная ночь» (design/ui_kits/landing). */

const FEATURES = [
  {
    icon: ShieldIcon,
    title: 'Приватность прежде всего',
    description: 'Распознавание эмоций работает локально в браузере. Видео не покидает ваше устройство.',
  },
  {
    icon: WavesIcon,
    title: 'Адаптивная терапия',
    description: 'ИИ подбирает паттерны и интенсивность BLS на основе ваших реальных эмоциональных реакций.',
  },
  {
    icon: AudioLinesIcon,
    title: 'Мультисенсорный подход',
    description: 'Визуальная стимуляция в сочетании с билатеральным аудио для усиления терапевтического эффекта.',
  },
  {
    icon: ActivityIcon,
    title: 'Отслеживание прогресса',
    description: 'Детальная аналитика SUDS/VOC, эмоциональных трендов и истории сессий.',
  },
  {
    icon: SparklesIcon,
    title: 'Геймификация',
    description: 'Система достижений и уровней делает процесс терапии вовлекающим.',
  },
  {
    icon: HeartPulseIcon,
    title: 'Клинически обоснованно',
    description: 'Протокол EMDRIA из 8 фаз со встроенными механизмами безопасности и crisis-детекцией.',
  },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="l-page">
      {/* Навигация */}
      <nav className={`l-nav${scrolled ? ' l-nav--scrolled' : ''}`}>
        <div className="l-container l-nav__inner">
          <Link href="/" className="l-logo" aria-label="EMDR-AI главная">
            <span className="l-logo__mark" aria-hidden="true"></span>
            <span className="l-logo__word">EMDR-AI</span>
          </Link>
          <div className="l-nav__links">
            <Link href="/about" className="l-nav__link l-nav__link--about">
              О проекте
            </Link>
            <Link href="/login" className="l-nav__link">
              Войти
            </Link>
            <ThemeToggle />
            <Link href="/register" className="e-btn e-btn--primary e-btn--sm">
              Регистрация
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — сцена «Лунная ночь» */}
      <header className="l-hero">
        <span className="l-hero__moon" aria-hidden="true"></span>
        <span className="l-hero__path" aria-hidden="true"></span>
        <div className="l-container l-hero__inner">
          <h1 className="l-hero__title">EMDR-AI Терапия</h1>
          <p className="l-hero__sub">
            Платформа виртуальной EMDR-терапии с ИИ-ассистентом и распознаванием эмоций в реальном времени
          </p>

          <div className="l-hero__cta">
            <Link href="/session" className="e-btn e-btn--primary e-btn--lg">
              Начать сессию
            </Link>
            <Link href="/about" className="e-btn e-btn--ghost e-btn--lg">
              Узнать больше
            </Link>
          </div>

          {/* Медицинский disclaimer — смысловой якорь доверия, не прячется */}
          <div className="l-disclaimer">
            <div className="e-disclaimer" role="note">
              <span className="e-disclaimer__icon" aria-hidden="true">
                <HeartHandIcon />
              </span>
              <div>
                <strong>Важно:</strong> EMDR-AI — вспомогательный инструмент и не заменяет профессиональную
                психотерапевтическую помощь. В кризисной ситуации звоните: RU <strong>8-800-2000-122</strong> ·
                US <strong>988</strong> · UK <strong>116 123</strong> ·{' '}
                <a href="https://www.befrienders.org" target="_blank" rel="noopener noreferrer">
                  befrienders.org
                </a>
                .
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Features Section */}
        <section className="l-features" id="features">
          <div className="l-container">
            <h2 className="l-features__title">Почему EMDR-AI</h2>

            <div className="l-features__grid">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="e-card e-card--hoverable">
                  <div className="e-card__icon" aria-hidden="true">
                    <Icon />
                  </div>
                  <h3 className="e-card__title">{title}</h3>
                  <p className="e-card__text">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="l-cta">
          <span className="l-cta__path" aria-hidden="true"></span>
          <div className="l-container">
            <h2 className="l-cta__title">Готовы начать путь восстановления?</h2>
            <p className="l-cta__sub">Присоединяйтесь к тем, кто нашёл поддержку через нашу платформу.</p>
            <Link href="/register" className="e-btn e-btn--primary e-btn--lg">
              Попробовать бесплатно
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="l-footer">
        <div className="l-container">
          <p>© {new Date().getFullYear()} EMDR-AI Therapy Assistant</p>
          <div className="l-footer__links">
            <Link href="/legal/terms">Условия использования</Link>
            <Link href="/legal/privacy">Политика конфиденциальности</Link>
            <Link href="/legal/consent">Информированное согласие</Link>
            <Link href="/about">О проекте</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
