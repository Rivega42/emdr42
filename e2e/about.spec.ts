import { test, expect } from '@playwright/test';

test.describe('Страница About', () => {
  test('отображает информацию о EMDR', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1')).toContainText('About EMDR-AI');
    await expect(page.locator('text=What is EMDR?')).toBeVisible();
  });

  test('отображает предупреждение о безопасности', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('text=Safety')).toBeVisible();
    await expect(page.locator('text=not a replacement for professional therapy')).toBeVisible();
  });

  test('ссылка Home возвращает на главную', async ({ page }) => {
    await page.goto('/about');
    await page.click('text=Home');
    await expect(page).toHaveURL('/');
  });
});
