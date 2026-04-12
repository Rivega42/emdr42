import { test, expect } from '@playwright/test';

test.describe('Главная страница', () => {
  test('отображает заголовок и навигацию', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('EMDR-AI');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('навигация Sign In ведёт на страницу входа', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/login');
  });

  test('навигация Sign Up ведёт на страницу регистрации', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/register');
  });

  test('кнопка Start Free Session ведёт на страницу сессии', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Start Free Session');
    await expect(page).toHaveURL('/session');
  });
});
