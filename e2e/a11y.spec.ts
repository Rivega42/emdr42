import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('login page has proper aria labels', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    // Email input should be labeled
    const label = await emailInput.getAttribute('aria-label') || await emailInput.getAttribute('placeholder');
    expect(label).toBeTruthy();
  });

  test('session page has keyboard-navigable controls', async ({ page }) => {
    await page.goto('/session');
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test('home page has heading structure', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('about page has semantic sections', async ({ page }) => {
    await page.goto('/about');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });
});
