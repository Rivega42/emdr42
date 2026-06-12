import { test, expect } from '@playwright/test';

test.describe('Страница About', () => {
  test('отображает h1 «О платформе EMDR-AI»', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1')).toContainText('О платформе EMDR-AI');
  });

  test('safety-секция: «не заменяет профессиональную терапию» / кризисные линии', async ({
    page,
  }) => {
    await page.goto('/about');
    // Дисклеймер «дополнение к терапии, а не замена»
    await expect(page.locator('body')).toContainText('дополнение к терапии, а не замену');
    // Кризисная линия (РФ)
    await expect(page.locator('body')).toContainText('8-800-2000-122');
  });

  test('ссылка «На главную» возвращает на /', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('link', { name: /на главную/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
