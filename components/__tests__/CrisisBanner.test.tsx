/**
 * Spec для components/ui/CrisisBanner (#150) — кризисный баннер с hotlines (#147).
 *
 * Покрывает:
 * - compact кнопка по дефолту (expanded=false)
 * - открытие диалога по клику
 * - expanded=true → fetch /crisis/hotlines + рендер hotline списка
 * - fallback на международный Befrienders при ошибке API
 * - закрытие диалога через × + onClose callback
 * - условные ветки UI (emergencyNumber, available247, sms, online, phone)
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Мокаем lib/api.getCrisisHotlines
jest.mock('@/lib/api', () => ({
  api: {
    getCrisisHotlines: jest.fn(),
  },
}));

import { api } from '@/lib/api';
import { CrisisBanner } from '@/components/ui/CrisisBanner';

const mockHotlinesUS = {
  country: 'United States',
  countryCode: 'US',
  emergencyNumber: '911',
  hotlines: [
    {
      name: '988 Suicide & Crisis Lifeline',
      phone: '988',
      sms: '988',
      online: 'https://988lifeline.org',
      languages: ['en', 'es'],
      available247: true,
    },
    {
      name: 'Crisis Text Line',
      phone: '',
      sms: 'HOME to 741741',
      languages: ['en'],
      available247: true,
    },
  ],
};

beforeEach(() => {
  (api.getCrisisHotlines as jest.Mock).mockReset();
});

describe('CrisisBanner (#150)', () => {
  describe('compact mode (expanded=false)', () => {
    it('по умолчанию показывает compact-кнопку "Кризис? Помощь"', () => {
      render(<CrisisBanner />);
      const btn = screen.getByRole('button', { name: /открыть crisis hotlines/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent(/Кризис\? Помощь/);
    });

    it('не делает API-запрос пока кнопка не нажата', () => {
      render(<CrisisBanner />);
      expect(api.getCrisisHotlines).not.toHaveBeenCalled();
    });

    it('клик по compact-кнопке открывает dialog (не дёргает API в compact path)', async () => {
      render(<CrisisBanner />);
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /открыть crisis hotlines/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Нужна помощь прямо сейчас/i)).toBeInTheDocument();
      // expanded=false → useEffect не запросит, покажет "Загрузка…"
      expect(screen.getByText(/Загрузка линий помощи/i)).toBeInTheDocument();
    });
  });

  describe('expanded mode (expanded=true)', () => {
    it('сразу показывает dialog и запрашивает hotlines', async () => {
      (api.getCrisisHotlines as jest.Mock).mockResolvedValueOnce(mockHotlinesUS);

      render(<CrisisBanner expanded />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(api.getCrisisHotlines).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(screen.getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument();
      });
    });

    it('рендерит emergencyNumber как tel: ссылку', async () => {
      (api.getCrisisHotlines as jest.Mock).mockResolvedValueOnce(mockHotlinesUS);
      render(<CrisisBanner expanded />);

      const emergency = await screen.findByRole('link', { name: '911' });
      expect(emergency).toHaveAttribute('href', 'tel:911');
    });

    it('рендерит phone hotline как tel: ссылку с удалёнными пробелами', async () => {
      (api.getCrisisHotlines as jest.Mock).mockResolvedValueOnce({
        ...mockHotlinesUS,
        hotlines: [
          {
            name: 'Test Hotline',
            phone: '1 800 273 8255',
            languages: ['en'],
            available247: true,
          },
        ],
      });
      render(<CrisisBanner expanded />);

      const phoneLink = await screen.findByRole('link', { name: /1 800 273 8255/ });
      expect(phoneLink).toHaveAttribute('href', 'tel:18002738255');
    });

    it('показывает "24/7 · бесплатно" для available247 hotline', async () => {
      (api.getCrisisHotlines as jest.Mock).mockResolvedValueOnce(mockHotlinesUS);
      render(<CrisisBanner expanded />);

      await waitFor(() => {
        const indicators = screen.getAllByText(/24\/7.*бесплатно/i);
        expect(indicators.length).toBe(2); // обе hotlines available247
      });
    });

    it('показывает SMS-строку если sms заполнен', async () => {
      (api.getCrisisHotlines as jest.Mock).mockResolvedValueOnce(mockHotlinesUS);
      render(<CrisisBanner expanded />);
      await waitFor(() => {
        expect(screen.getByText(/HOME to 741741/i)).toBeInTheDocument();
      });
    });

    it('online ссылка имеет target="_blank" и rel="noopener noreferrer"', async () => {
      (api.getCrisisHotlines as jest.Mock).mockResolvedValueOnce(mockHotlinesUS);
      render(<CrisisBanner expanded />);

      const onlineLink = await screen.findByRole('link', { name: /Онлайн-чат/ });
      expect(onlineLink).toHaveAttribute('href', 'https://988lifeline.org');
      expect(onlineLink).toHaveAttribute('target', '_blank');
      expect(onlineLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('hotline без phone не рендерит tel-ссылку', async () => {
      (api.getCrisisHotlines as jest.Mock).mockResolvedValueOnce(mockHotlinesUS);
      render(<CrisisBanner expanded />);

      await waitFor(() => {
        // Crisis Text Line — phone='' → tel-link не рендерится
        expect(screen.queryByRole('link', { name: /Crisis Text Line/i })).toBeNull();
      });
    });
  });

  describe('error fallback', () => {
    it('при ошибке API использует Befrienders Worldwide international fallback', async () => {
      (api.getCrisisHotlines as jest.Mock).mockRejectedValueOnce(new Error('network'));
      render(<CrisisBanner expanded />);

      await waitFor(() => {
        expect(screen.getByText('Befrienders Worldwide')).toBeInTheDocument();
      });
      // Fallback emergencyNumber = 112
      expect(screen.getByRole('link', { name: '112' })).toHaveAttribute('href', 'tel:112');
      // Online-чат пробрасывается
      const onlineLink = screen.getByRole('link', { name: /Онлайн-чат/ });
      expect(onlineLink).toHaveAttribute('href', 'https://www.befrienders.org');
    });
  });

  describe('close behaviour', () => {
    it('клик × закрывает диалог и возвращает compact-кнопку', async () => {
      (api.getCrisisHotlines as jest.Mock).mockResolvedValueOnce(mockHotlinesUS);
      render(<CrisisBanner expanded />);
      const user = userEvent.setup();

      await screen.findByText('988 Suicide & Crisis Lifeline');
      await user.click(screen.getByRole('button', { name: /Закрыть/i }));

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByRole('button', { name: /открыть crisis hotlines/i })).toBeInTheDocument();
    });

    it('onClose вызывается при закрытии', async () => {
      const onClose = jest.fn();
      (api.getCrisisHotlines as jest.Mock).mockResolvedValueOnce(mockHotlinesUS);
      render(<CrisisBanner expanded onClose={onClose} />);
      const user = userEvent.setup();

      await screen.findByText('988 Suicide & Crisis Lifeline');
      await user.click(screen.getByRole('button', { name: /Закрыть/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('диалог имеет role="dialog", aria-modal="true" и aria-labelledby', async () => {
      (api.getCrisisHotlines as jest.Mock).mockResolvedValueOnce(mockHotlinesUS);
      render(<CrisisBanner expanded />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'crisis-title');
      expect(screen.getByText(/Нужна помощь прямо сейчас/i)).toHaveAttribute('id', 'crisis-title');
    });

    it('compact-кнопка имеет aria-label "Открыть crisis hotlines"', () => {
      render(<CrisisBanner />);
      expect(screen.getByLabelText('Открыть crisis hotlines')).toBeInTheDocument();
    });
  });
});
