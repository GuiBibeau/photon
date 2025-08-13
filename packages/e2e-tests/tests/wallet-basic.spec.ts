import { test, expect } from '@playwright/test';

test.describe('Basic Wallet Tests', () => {
  test('should have preloaded wallet with balance', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for wallet to load

    // Check that we have a balance displayed
    const balanceText = await page.locator('text=/\\d+\\.\\d+\\s*SOL/').first();
    await expect(balanceText).toBeVisible({ timeout: 5000 });

    // Get the balance value
    const balance = await balanceText.textContent();
    // Found balance

    // Extract numeric value and verify it's > 0.1 SOL
    const balanceMatch = balance?.match(/(\d+\.?\d*)/);
    if (balanceMatch) {
      const balanceValue = parseFloat(balanceMatch[1]);
      expect(balanceValue).toBeGreaterThan(0.1);
      // Balance value is > 0.1 SOL
    }
  });

  test('should sign and verify a message', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find the sign & verify section
    const signSection = page.locator('.bento-item:has-text("Sign & Verify")');
    await expect(signSection).toBeVisible();

    // Enter a message to sign
    const messageInput = page.locator('input[placeholder="Message to sign"]');
    await messageInput.fill('Test message from Playwright');

    // Click the Sign button
    const signButton = page.locator('button:has-text("Sign")');
    await signButton.click();

    // Wait for signature to appear (should show in the UI somewhere)
    await page.waitForTimeout(1000);

    // Take a screenshot to see what happened
    await page.screenshot({ path: 'after-sign.png' });
    // Screenshot saved

    // Basic check that signing didn't error
    const errorText = page.locator('text=/error|failed/i');
    const hasError = await errorText.count();
    expect(hasError).toBe(0);
  });

  test('should interact with RPC queries', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find the RPC Queries section
    const rpcSection = page.locator('.bento-item:has-text("RPC Queries")');
    await expect(rpcSection).toBeVisible();

    // Click Get Block Height button
    const blockHeightButton = page.locator('button:has-text("Get Block Height")');
    await blockHeightButton.click();

    // Wait for response
    await page.waitForTimeout(1000);

    // Check that we got some response (no error)
    const errorText = page.locator('text=/error|failed/i');
    const hasError = await errorText.count();
    expect(hasError).toBe(0);
  });
});
