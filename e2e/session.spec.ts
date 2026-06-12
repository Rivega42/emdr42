import { test, expect } from '@playwright/test';

test.describe('EMDR-сессия', () => {
  test('страница сессии отображает заголовок и режимы запуска', async ({ page }) => {
    await page.goto('/session');
    await expect(page.locator('h1')).toContainText('EMDR Session');
    await expect(page.getByRole('button', { name: 'Start AI-Guided Session' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'BLS Only (Offline)' })).toBeVisible();
  });

  test('офлайн BLS-режим запускается', async ({ page }) => {
    await page.goto('/session');
    await page.getByRole('button', { name: 'BLS Only (Offline)' }).click();
    // Появляются контролы офлайн-BLS
    await expect(page.locator('body')).toContainText('BLS Only Mode');
  });
});

test.describe('EMDR-сессия — мобильный вид', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('офлайн BLS работает на мобильном', async ({ page }) => {
    await page.goto('/session');
    await page.getByRole('button', { name: 'BLS Only (Offline)' }).click();
    await expect(page.locator('body')).toContainText('BLS Only Mode');
  });
});
