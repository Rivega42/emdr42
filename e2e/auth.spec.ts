import { test, expect } from '@playwright/test';

test.describe('Аутентификация', () => {
  test('страница входа отображает форму', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Вход');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('страница регистрации отображает форму', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h2')).toContainText('Создать аккаунт');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('ссылка на регистрацию со страницы входа', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Зарегистрироваться' }).click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('ссылка на вход со страницы регистрации', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: 'Войти' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('ссылка «Забыли пароль» ведёт на /forgot-password', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /забыли пароль/i }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });
});
