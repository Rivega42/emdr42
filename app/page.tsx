'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Динамическая загрузка компонентов для избежания SSR проблем
const EMDRCanvas = dynamic(() => import('@/components/EMDRCanvas'), { ssr: false })

export default function Home() {
  const [isStarted, setIsStarted] = useState(false)
  const [pattern, setPattern] = useState('horizontal')
  const [speed, setSpeed] = useState(1.0)

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center text-white mb-10">
          <h1 className="text-5xl font-bold mb-4">🧠 EMDR-AI Therapy Assistant</h1>
          <p className="text-xl opacity-90">Адаптивная система виртуальной терапии</p>
        </div>

        {/* Canvas Area */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-8 min-h-[400px] flex items-center justify-center">
          {isStarted ? (
            <EMDRCanvas pattern={pattern} speed={speed} />
          ) : (
            <div className="text-white text-center">
              <p className="text-2xl mb-4">Добро пожаловать в EMDR-AI</p>
              <p className="opacity-80">Нажмите "Начать сессию" для запуска</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pattern Selection */}
          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-3">Паттерн движения</h3>
            <select 
              className="w-full p-2 border rounded-lg"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            >
              <option value="horizontal">Горизонтальный</option>
              <option value="infinity">Бесконечность</option>
              <option value="butterfly">Бабочка</option>
              <option value="spiral">Спираль</option>
            </select>
          </div>

          {/* Speed Control */}
          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-3">Скорость</h3>
            <input 
              type="range" 
              min="0.3" 
              max="2" 
              step="0.1" 
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
            <span className="text-sm text-gray-600">{speed.toFixed(1)} Hz</span>
          </div>

          {/* Avatar Selection */}
          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-3">Аватар терапевта</h3>
            <select className="w-full p-2 border rounded-lg">
              <option value="professional">Профессиональный</option>
              <option value="friendly">Дружелюбный</option>
              <option value="mentor">Наставник</option>
              <option value="abstract">Абстрактный</option>
            </select>
          </div>

          {/* Control Buttons */}
          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-3">Управление</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setIsStarted(!isStarted)}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  isStarted 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isStarted ? 'Остановить' : 'Начать сессию'}
              </button>
            </div>
          </div>
        </div>

        {/* Emotion Indicator */}
        <div className="fixed top-4 right-4 bg-black/70 text-white p-4 rounded-xl min-w-[200px]">
          <h4 className="font-semibold mb-2">Эмоциональное состояние</h4>
          <div className="space-y-1 text-sm">
            <div>Стресс: <span className="text-yellow-400">--</span></div>
            <div>Вовлеченность: <span className="text-green-400">--</span></div>
            <div>Позитивность: <span className="text-blue-400">--</span></div>
          </div>
        </div>
      </div>
    </main>
  )
}