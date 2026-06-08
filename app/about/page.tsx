'use client';

import React from 'react';
import Link from 'next/link';

const FeatureDetail: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm">{description}</p>
  </div>
);

const Step: React.FC<{ number: string; title: string; description: string }> = ({ number, title, description }) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center" aria-hidden="true">
      <span className="text-white font-bold">{number}</span>
    </div>
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  </div>
);

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors text-sm sm:text-base">
              &larr; На главную
            </Link>
            <nav className="flex gap-3 sm:gap-6" aria-label="Основная навигация">
              <Link href="/session" className="text-gray-500 hover:text-gray-900 text-sm sm:text-base">Сессия</Link>
              <Link href="/register" className="text-gray-500 hover:text-gray-900 text-sm sm:text-base">Регистрация</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-6">О платформе EMDR-AI</h1>
          <p className="text-xl text-gray-500">
            Делаем EMDR-терапию доступнее через технологии и клинически обоснованный подход.
          </p>
        </div>

        <section className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Что такое EMDR</h2>
          <div className="text-gray-600 space-y-4">
            <p>
              EMDR (Eye Movement Desensitization and Reprocessing, десенсибилизация и переработка с помощью движений
              глаз) — научно обоснованный метод психотерапии, разработанный Франсин Шапиро в конце 1980-х. Он помогает
              при посттравматическом стрессовом расстройстве (ПТСР), тревожности и других последствиях травматических
              переживаний.
            </p>
            <p>
              Во время сессии пациент удерживает в памяти тяжёлое воспоминание, одновременно следя за билатеральной
              стимуляцией (движения глаз, тэппинг, аудио). Это помогает мозгу переработать травматическую память и
              уменьшить её эмоциональную заряженность.
            </p>
            <p>EMDR признана эффективной следующими организациями:</p>
            <ul className="list-disc list-inside ml-4">
              <li>Всемирная организация здравоохранения (ВОЗ)</li>
              <li>Американская психиатрическая ассоциация</li>
              <li>Министерство по делам ветеранов США</li>
              <li>Международное общество изучения травматического стресса (ISTSS)</li>
            </ul>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Наш подход</h2>
          <div className="text-gray-600 space-y-4">
            <p>
              EMDR-AI сочетает традиционный протокол EMDR с современными технологиями, чтобы сделать терапию
              персонализированной и доступной:
            </p>
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <FeatureDetail
                title="Адаптация через ИИ"
                description="Распознавание эмоций в реальном времени подстраивает паттерн и скорость BLS под ваше состояние."
              />
              <FeatureDetail
                title="Приватность прежде всего"
                description="Распознавание работает локально в браузере через ONNX/WebGPU. Видео не покидает ваше устройство."
              />
              <FeatureDetail
                title="Мультисенсорность"
                description="Визуальная стимуляция + билатеральное аудио + опциональный тэппинг для глубокой проработки."
              />
              <FeatureDetail
                title="Клиническая безопасность"
                description="Встроенные механизмы детекции диссоциации, crisis hotlines и автоматической paus'ы при риске."
              />
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Как это работает</h2>
          <div className="space-y-6">
            <Step
              number="1"
              title="Первичная калибровка"
              description="Система устанавливает ваш эмоциональный baseline на основе данных камеры (приватно, локально)."
            />
            <Step
              number="2"
              title="Выбор паттерна"
              description="Выбираете визуальный паттерн или доверяете AI-ассистенту подобрать оптимальный под вашу фазу."
            />
            <Step
              number="3"
              title="Направляемая сессия"
              description="Следите за движущимся объектом, удерживая целевое воспоминание. Система адаптируется в реальном времени."
            />
            <Step
              number="4"
              title="Интеграция"
              description="После BLS-сета — упражнения на grounding, проверка SUDS/VOC, ресурсная установка."
            />
            <Step
              number="5"
              title="Трекинг прогресса"
              description="Детальная аналитика по сессиям, эмоциональные тренды, сравнение с прошлыми сессиями."
            />
          </div>
        </section>

        <section className="bg-amber-50 border border-amber-200 rounded-lg p-8 mb-8" role="note">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Безопасность и этика</h2>
          <div className="text-gray-700 space-y-4">
            <p className="font-semibold text-gray-900">
              Важно: EMDR-AI — вспомогательный инструмент, а не замена профессиональной терапии.
            </p>
            <p>
              Платформа может быть полезна для снижения стресса и эмоциональной регуляции. Но не должна быть
              единственным лечением при серьёзных психических расстройствах. Мы настоятельно рекомендуем:
            </p>
            <ul className="list-disc list-inside ml-4">
              <li>Консультироваться со специалистом перед началом</li>
              <li>Использовать платформу как дополнение к терапии, а не замену</li>
              <li>Немедленно прекращать сессию при усилении дистресса</li>
              <li>Обращаться за помощью при суицидальных мыслях или самоповреждении</li>
            </ul>
            <p className="font-semibold">Линии помощи при кризисе:</p>
            <ul className="list-none ml-4 space-y-1">
              <li>🇷🇺 Россия: 8-800-2000-122 (бесплатно, круглосуточно)</li>
              <li>🇺🇸 США: 988 (Suicide &amp; Crisis Lifeline)</li>
              <li>🇬🇧 Великобритания: 116 123 (Samaritans)</li>
              <li>
                🌍 Другие страны:{' '}
                <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="underline">
                  findahelpline.com
                </a>
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Наша миссия</h2>
          <div className="text-gray-600 space-y-4">
            <p>
              Мы считаем, что помощь в работе с травмой должна быть доступна всем — независимо от географии,
              финансовых возможностей и обстоятельств.
            </p>
            <p>
              Мы строим EMDR-AI совместно с клиническими психологами, сертифицированными EMDR-терапевтами и
              технологами — сохраняя высокие стандарты безопасности и конфиденциальности.
            </p>
          </div>
        </section>

        <div className="text-center mt-12">
          <Link
            href="/register"
            className="inline-block px-12 py-5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg rounded-md transition-colors"
          >
            Попробовать бесплатно
          </Link>
        </div>
      </div>
    </div>
  );
}
