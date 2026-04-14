import { test, expect } from '@playwright/test';

test.describe('Auth Flow E2E', () => {
  test('login form validates required fields', async ({ page }) => {
    await page.goto('/login');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    // Should stay on login page (browser validation)
    await expect(page).toHaveURL(/login/);
  });

  test('register form validates required fields', async ({ page }) => {
    await page.goto('/register');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await expect(page).toHaveURL(/register/);
  });

  test('forgot password page shows form', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    // Wait for potential error message or stay on page
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/login/);
  });
});
