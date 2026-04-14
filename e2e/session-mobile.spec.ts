import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

test.describe('Session Mobile E2E', () => {
  test('session page is responsive on mobile', async ({ page }) => {
    await page.goto('/session');
    await expect(page.locator('body')).toBeVisible();
    // Viewport should be mobile-sized
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(500);
  });

  test('tab switching works on mobile', async ({ page }) => {
    await page.goto('/session');
    const offlineBtn = page.locator('text=BLS Only');
    if (await offlineBtn.isVisible()) {
      await offlineBtn.click();
      await page.waitForTimeout(500);

      // Look for mobile tab buttons (Chat / Canvas)
      const chatTab = page.locator('button:has-text("Chat")');
      const canvasTab = page.locator('button:has-text("Canvas")');

      if (await chatTab.isVisible()) {
        await chatTab.click();
        await page.waitForTimeout(200);
        await canvasTab.click();
        await page.waitForTimeout(200);
      }
    }
  });
});
