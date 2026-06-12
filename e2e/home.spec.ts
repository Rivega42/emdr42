import { test, expect } from '@playwright/test';

test.describe('Главная страница', () => {
  test('отображает h1 и навигацию', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('EMDR-AI Терапия');
    await expect(page.locator('nav').first()).toBeVisible();
  });

  test('навигация «Войти» ведёт на /login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Войти' }).first().click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('навигация «Регистрация» ведёт на /register', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Регистрация' }).first().click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('«Начать сессию» ведёт на /session', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: 'Начать сессию' }).first();
    await cta.scrollIntoViewIfNeeded();
    await cta.click();
    await page.waitForURL(/\/session$/, { timeout: 10_000 });
  });

  test('медицинский disclaimer присутствует', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText('не заменяет профессиональную');
  });
});
