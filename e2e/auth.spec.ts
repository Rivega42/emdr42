import { test, expect } from '@playwright/test';

test.describe('Аутентификация', () => {
  test('страница входа отображает форму', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Welcome Back');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('страница регистрации отображает форму', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('ссылка на регистрацию со страницы входа', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Sign up for free');
    await expect(page).toHaveURL('/register');
  });

  test('ссылка на вход со страницы регистрации', async ({ page }) => {
    await page.goto('/register');
    await page.click('text=Sign in');
    await expect(page).toHaveURL('/login');
  });

  test('ссылка забыли пароль', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Forgot password?');
    await expect(page).toHaveURL('/forgot-password');
  });
});
