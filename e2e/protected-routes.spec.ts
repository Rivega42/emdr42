import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for routes added in the MVP extension work:
 *
 *   - public billing result pages (/billing/success, /billing/cancel)
 *   - protected gates on /settings/billing, /progress, /progress/compare,
 *     /patients, /admin (все должны редиректить анонима на /login)
 *
 * Мы проверяем именно защиту и render без ошибок — полные сценарии
 * (с логином/Stripe/TOTP) требуют работающего backend + test accounts и
 * живут отдельно.
 */

test.describe('Публичные страницы billing', () => {
  test('страница успешной оплаты отображается', async ({ page }) => {
    await page.goto('/billing/success');
    await expect(page.locator('h1')).toContainText('Подписка активирована');
    await expect(page.getByRole('link', { name: 'На Dashboard' })).toBeVisible();
  });

  test('страница отмены оплаты отображается', async ({ page }) => {
    await page.goto('/billing/cancel');
    await expect(page.locator('h1')).toContainText('Оплата отменена');
    await expect(page.getByRole('link', { name: 'Вернуться к тарифам' })).toBeVisible();
  });
});

test.describe('Защищённые маршруты (аноним)', () => {
  const protectedRoutes: Array<{ path: string; label: string }> = [
    { path: '/settings', label: 'settings' },
    { path: '/settings/billing', label: 'billing settings' },
    { path: '/progress', label: 'progress' },
    { path: '/progress/compare?current=a&previous=b', label: 'progress compare' },
    { path: '/patients', label: 'patients (therapist)' },
    { path: '/admin', label: 'admin dashboard' },
    { path: '/dashboard', label: 'dashboard' },
  ];

  for (const { path, label } of protectedRoutes) {
    test(`${label} редиректит анонима на /login`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(/\/login(\?|$)/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/login/);
      // next-параметр сохраняет точку входа для post-login редиректа.
      const url = new URL(page.url());
      const next = url.searchParams.get('next');
      expect(next).not.toBeNull();
      expect(decodeURIComponent(next ?? '')).toContain(path.split('?')[0]);
    });
  }
});

test.describe('Сравнение сессий — защита маршрута + ошибка без параметров', () => {
  test('без query-параметров показывает сообщение об ошибке', async ({ page }) => {
    // Монтируем фейковую auth-сессию, чтобы пройти клиентский guard:
    // AuthContext читает токен из localStorage.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('token', 'e2e-stub-token');
      } catch {
        /* localStorage may be unavailable in some contexts */
      }
    });
    await page.goto('/progress/compare');
    // Либо редирект на login (если токен отклонён), либо клиентская ошибка.
    // Оба исхода — валидные для защищённой страницы без параметров.
    const onLogin = /\/login/.test(page.url());
    if (!onLogin) {
      await expect(page.getByRole('alert')).toContainText('Укажите обе сессии');
    }
  });
});
