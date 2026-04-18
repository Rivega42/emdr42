'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * CrisisBanner (#147).
 *
 * Показывает сверху на любой странице:
 *  - Всегда: compact link "Кризис? Помощь →"
 *  - При activateByKeyword=true: full banner с hotline для страны пользователя
 *
 * Использует /crisis/hotlines для определения страны + hotlines.
 */

interface Hotline {
  name: string;
  phone: string;
  sms?: string;
  online?: string;
  languages: string[];
  available247: boolean;
}

interface HotlineData {
  country: string;
  countryCode: string;
  emergencyNumber: string;
  hotlines: Hotline[];
}

interface CrisisBannerProps {
  /** Если true — показывается полный banner с hotlines. Иначе compact. */
  expanded?: boolean;
  /** Callback для закрытия full banner. */
  onClose?: () => void;
}

export const CrisisBanner: React.FC<CrisisBannerProps> = ({ expanded = false, onClose }) => {
  const [data, setData] = useState<HotlineData | null>(null);
  const [open, setOpen] = useState(expanded);

  useEffect(() => {
    if (expanded && !data) {
      api.getCrisisHotlines().then(setData).catch(() => {
        // Fallback на международный
        setData({
          country: 'International',
          countryCode: 'XX',
          emergencyNumber: '112',
          hotlines: [
            {
              name: 'Befrienders Worldwide',
              phone: '',
              online: 'https://www.befrienders.org',
              languages: ['multi'],
              available247: true,
            },
          ],
        });
      });
    }
  }, [expanded, data]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold flex items-center gap-2"
        aria-label="Открыть crisis hotlines"
      >
        <span aria-hidden="true">🆘</span>
        Кризис? Помощь
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-labelledby="crisis-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-white border border-red-200 rounded-lg max-w-md w-full shadow-lg overflow-hidden">
        <div className="bg-red-600 text-white p-4 flex items-center justify-between">
          <div>
            <h2 id="crisis-title" className="font-bold text-lg">Нужна помощь прямо сейчас?</h2>
            <p className="text-xs opacity-90 mt-1">
              Если вы в кризисе, пожалуйста обратитесь
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Закрыть"
            className="text-white/80 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {data ? (
            <>
              {data.emergencyNumber && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-xs text-red-600 font-semibold uppercase mb-1">Экстренные службы</div>
                  <a
                    href={`tel:${data.emergencyNumber}`}
                    className="text-2xl font-bold text-red-700 hover:underline"
                  >
                    {data.emergencyNumber}
                  </a>
                </div>
              )}

              {data.hotlines.map((h, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-md">
                  <div className="font-semibold text-gray-900 text-sm">{h.name}</div>
                  {h.available247 && (
                    <div className="text-xs text-green-600 mt-0.5">24/7 · бесплатно</div>
                  )}
                  {h.phone && (
                    <a
                      href={`tel:${h.phone.replace(/\s/g, '')}`}
                      className="block text-lg font-bold text-gray-900 hover:underline mt-2"
                    >
                      📞 {h.phone}
                    </a>
                  )}
                  {h.sms && (
                    <div className="text-sm text-gray-600 mt-1">💬 SMS: {h.sms}</div>
                  )}
                  {h.online && (
                    <a
                      href={h.online}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-blue-600 hover:underline mt-1"
                    >
                      🌐 Онлайн-чат →
                    </a>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="text-center text-gray-500 py-4">Загрузка линий помощи…</div>
          )}

          <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
            Если у вас активные мысли о суициде или самоповреждении — позвоните прямо сейчас.
            Вы не одни.
          </div>
        </div>
      </div>
    </div>
  );
};
