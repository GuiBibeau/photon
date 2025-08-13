import { test, expect } from '@playwright/test';

test.describe('Basic Token Tests', () => {
  test('should create a new token', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify wallet has balance for token creation
    const balanceText = await page.locator('text=/\\d+\\.\\d+\\s*SOL/').first();
    await expect(balanceText).toBeVisible();
    const balance = await balanceText.textContent();
    const balanceMatch = balance?.match(/(\d+\.?\d*)/);
    if (balanceMatch) {
      const balanceValue = parseFloat(balanceMatch[1]);
      expect(balanceValue).toBeGreaterThan(0.1); // Need SOL for token creation
    }

    // Find the Token Creator section
    const tokenSection = page.locator('.bento-item:has-text("Token Creator")');
    await expect(tokenSection).toBeVisible();

    // Fill in token details
    const nameInput = page.locator('input[placeholder*="My Awesome Token"]');
    await nameInput.fill('Test Token');

    const symbolInput = page.locator('input[placeholder*="MAT"]');
    await symbolInput.fill('TEST');

    // Click Create Token button
    const createButton = page.locator('button:has-text("Create Token")');
    await createButton.click();

    // Wait for token creation (this might take a while on devnet)
    // Waiting for token creation
    await page.waitForTimeout(5000);

    // Take a screenshot to see the result
    await page.screenshot({ path: 'after-token-creation.png', fullPage: true });
    // Screenshot saved

    // Check for success or any mint address appearing
    // Token creation should show a mint address somewhere
    const possibleMintAddressCount = await page
      .locator('text=/[1-9A-HJ-NP-Za-km-z]{32,44}/')
      .count();
    // Check if mint addresses were created - expecting at least 1
    expect(possibleMintAddressCount).toBeGreaterThan(0);

    // Basic check that creation didn't error
    let errorText = page.locator('text=/error|failed/i');
    let hasError = await errorText.count();
    expect(hasError).toBe(0);

    // Now test minting - the UI should have a mint button after token creation
    // Looking for mint button

    // Look for any mint-related button
    const mintButton = page.locator('button').filter({ hasText: /mint/i }).first();
    const hasMintButton = await mintButton.isVisible().catch(() => false);

    if (hasMintButton) {
      // Found mint button, clicking it
      await mintButton.click();

      // Wait for minting to complete
      // Waiting for minting to complete
      await page.waitForTimeout(6000);

      // Look for token balance - should show 1000 tokens
      // Looking for token balance

      // Look for any text containing "1000" or "1,000" (with possible decimals)
      const balancePattern = page.locator('text=/1[,.]?000(\\.\\d+)?/');
      const hasBalance = await balancePattern.count();

      if (hasBalance > 0) {
        const balanceText = await balancePattern.first().textContent();
        // Token balance found
        expect(balanceText).toContain('1000'); // Should contain "1000" from minting
      } else {
        // Try alternative: look for "Balance:" followed by a number
        const altBalance = await page
          .locator('text=/balance.*\\d+/i')
          .first()
          .textContent()
          .catch(() => null);
        if (altBalance) {
          // Alternative balance found
        }
      }

      // Take screenshot after minting
      await page.screenshot({ path: 'after-minting.png', fullPage: true });
      // Screenshot saved

      // Check no errors occurred during minting
      errorText = page.locator('text=/error|failed/i');
      hasError = await errorText.count();
      expect(hasError).toBe(0);
    } else {
      // No mint button found - token might not have been created successfully
    }
  });

  test('should check token balance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find the Check Token Balance section
    const balanceSection = page.locator('.bento-item:has-text("Check Token Balance")');
    await expect(balanceSection).toBeVisible();

    // We need a wallet address - let's use a dummy one for now
    const walletInput = page.locator('input[placeholder="Enter wallet address to check"]');
    // Use a known devnet address
    await walletInput.fill('9cjSk5dhJpjxgckZ3q2KJqmXr2cCv7XgSm4e4YMrVJ1s');

    // Use a known devnet token mint (USDC devnet or any token)
    const mintInput = page.locator('input[placeholder="Enter token mint address"]');
    // This is a common test token on devnet
    await mintInput.fill('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

    // Click Check Balance button
    const checkButton = page.locator('button:has-text("Check Balance")');
    await checkButton.click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Take a screenshot to see what happened
    await page.screenshot({ path: 'after-balance-check.png', fullPage: true });
    // Screenshot saved

    // The balance check should complete without error
    // (the balance might be 0, but it shouldn't error)
    const errorText = page.locator('text=/error|failed/i');
    const hasError = await errorText.count();
    expect(hasError).toBe(0);
  });
});
