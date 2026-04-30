'use client';

import React from 'react';
import Link from 'next/link';

const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
      <div className="text-4xl mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Навигация */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2" aria-label="EMDR-AI главная">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center" aria-hidden="true">
              <span className="text-white text-lg">🧠</span>
            </div>
            <span className="text-lg font-bold text-gray-900">EMDR-AI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/about" className="text-gray-500 hover:text-gray-900 text-sm transition-colors hidden sm:inline">
              О проекте
            </Link>
            <Link href="/login" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
              Войти
            </Link>
            <Link href="/register" className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-md transition-colors">
              Регистрация
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              EMDR-AI Терапия
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 mb-8 max-w-3xl mx-auto">
              Платформа виртуальной EMDR-терапии с ИИ-ассистентом и распознаванием эмоций в реальном времени
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/session"
                className="px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors"
              >
                Начать сессию
              </Link>
              <Link
                href="/about"
                className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-md transition-colors"
              >
                Узнать больше
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Медицинский disclaimer */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900" role="note">
          <strong>Важно:</strong> EMDR-AI — вспомогательный инструмент и не заменяет профессиональную психотерапевтическую
          помощь. В кризисной ситуации звоните: 🇷🇺 8-800-2000-122 · 🇺🇸 988 · 🇬🇧 116 123 · 🌍{' '}
          <a href="https://www.befrienders.org" target="_blank" rel="noopener noreferrer" className="underline">
            befrienders.org
          </a>
          .
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
            Почему EMDR-AI
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon="🧠"
              title="Приватность прежде всего"
              description="Распознавание эмоций работает локально в браузере. Видео не покидает ваше устройство."
            />
            <FeatureCard
              icon="🎯"
              title="Адаптивная терапия"
              description="ИИ подбирает паттерны и интенсивность BLS на основе ваших реальных эмоциональных реакций."
            />
            <FeatureCard
              icon="🎵"
              title="Мультисенсорный подход"
              description="Визуальная стимуляция в сочетании с билатеральным аудио для усиления терапевтического эффекта."
            />
            <FeatureCard
              icon="📊"
              title="Отслеживание прогресса"
              description="Детальная аналитика SUDS/VOC, эмоциональных трендов и истории сессий."
            />
            <FeatureCard
              icon="🏆"
              title="Геймификация"
              description="Система достижений и уровней делает процесс терапии вовлекающим."
            />
            <FeatureCard
              icon="🔒"
              title="Клинически обоснованно"
              description="Протокол EMDRIA из 8 фаз со встроенными механизмами безопасности и crisis-детекцией."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Готовы начать путь восстановления?
          </h2>
          <p className="text-xl text-gray-500 mb-8">
            Присоединяйтесь к тем, кто нашёл поддержку через нашу платформу.
          </p>
          <Link
            href="/register"
            className="inline-block px-12 py-5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg rounded-md transition-colors"
          >
            Попробовать бесплатно
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-4">
        <div className="max-w-7xl mx-auto text-sm text-gray-500 text-center space-y-2">
          <p>© {new Date().getFullYear()} EMDR-AI Therapy Assistant</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/legal/terms" className="hover:text-gray-900">Условия использования</Link>
            <Link href="/legal/privacy" className="hover:text-gray-900">Политика конфиденциальности</Link>
            <Link href="/legal/consent" className="hover:text-gray-900">Информированное согласие</Link>
            <Link href="/about" className="hover:text-gray-900">О проекте</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
