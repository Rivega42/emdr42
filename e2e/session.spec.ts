import { test, expect } from '@playwright/test';

test.describe('EMDR-сессия', () => {
  test('страница сессии отображает кнопки запуска', async ({ page }) => {
    await page.goto('/session');
    await expect(page.locator('h1')).toContainText('EMDR Session');
    await expect(page.locator('text=Start AI-Guided Session')).toBeVisible();
    await expect(page.locator('text=BLS Only (Offline)')).toBeVisible();
  });

  test('офлайн BLS-режим запускается', async ({ page }) => {
    await page.goto('/session');
    await page.click('text=BLS Only (Offline)');
    // Должны появиться контролы BLS
    await expect(page.locator('text=BLS Only Mode')).toBeVisible();
    await expect(page.locator('select[aria-label]')).toBeVisible();
  });

  test('кнопка назад возвращает на главную', async ({ page }) => {
    await page.goto('/session');
    await page.click('text=Back to Home');
    await expect(page).toHaveURL('/');
  });
});

test.describe('EMDR-сессия — мобильный вид', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('офлайн BLS работает на мобильном', async ({ page }) => {
    await page.goto('/session');
    await page.click('text=BLS Only (Offline)');
    await expect(page.locator('text=BLS Only Mode')).toBeVisible();
  });
});
