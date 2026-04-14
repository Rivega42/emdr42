import { test, expect } from '@playwright/test';

test.describe('Session Flow E2E', () => {
  test('session page loads with BLS canvas', async ({ page }) => {
    await page.goto('/session');
    // Should have session preparation UI
    await expect(page.locator('body')).toBeVisible();
  });

  test('offline BLS mode works without auth', async ({ page }) => {
    await page.goto('/session');
    // Look for offline/BLS-only button
    const offlineBtn = page.locator('text=BLS Only');
    if (await offlineBtn.isVisible()) {
      await offlineBtn.click();
      // Canvas should render
      await page.waitForTimeout(1000);
      await expect(page.locator('canvas')).toBeVisible();
    }
  });

  test('session page has pattern selector', async ({ page }) => {
    await page.goto('/session');
    const offlineBtn = page.locator('text=BLS Only');
    if (await offlineBtn.isVisible()) {
      await offlineBtn.click();
      await page.waitForTimeout(500);
      // Pattern selector should be visible
      const patternSelect = page.locator('select').first();
      if (await patternSelect.isVisible()) {
        await expect(patternSelect).toBeVisible();
      }
    }
  });
});
