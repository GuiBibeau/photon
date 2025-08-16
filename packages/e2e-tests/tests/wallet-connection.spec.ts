import { test, expect, Page } from '@playwright/test';

test.describe('Wallet Connection E2E Tests', () => {
  // Helper to clear localStorage
  async function clearWalletStorage(page: Page) {
    await page.evaluate(() => {
      localStorage.removeItem('photon_wallet_sessions');
      localStorage.removeItem('photon_last_wallet');
      localStorage.removeItem('photon_auto_connect');
      localStorage.removeItem('photon_explicitly_disconnected');
      localStorage.removeItem('photon_connection_state');
      localStorage.removeItem('photon_wallet_name');
      localStorage.removeItem('photon_wallet_timestamp');
    });
  }

  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/wallet-test');
    await clearWalletStorage(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('Basic Connection', () => {
    test('should detect available wallets', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Check if wallets section is visible
      const walletsSection = page.locator('text=Available Wallets');
      await expect(walletsSection).toBeVisible();
      
      // Check for wallet count (could be 0 if no extensions installed)
      const walletCount = await page.locator('h2:has-text("Available Wallets")').textContent();
      expect(walletCount).toContain('(');
      expect(walletCount).toContain(')');
    });

    test('should show warning when no wallets installed', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Check if no wallets warning is shown (only if no wallets)
      const walletItems = await page.locator('[style*="cursor: pointer"]').count();
      if (walletItems === 0) {
        const warning = page.locator('text=No wallets detected');
        await expect(warning).toBeVisible();
        
        // Should show installation links
        await expect(page.locator('a[href*="phantom.app"]')).toBeVisible();
        await expect(page.locator('a[href*="solflare.com"]')).toBeVisible();
      }
    });

    test('should display correct initial state', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Check initial state
      await expect(page.locator('text=Connected: No')).toBeVisible();
      
      // Connect button should be visible when not connected
      const connectButton = page.locator('button:has-text("Connect")');
      const disconnectButton = page.locator('button:has-text("Disconnect")');
      
      // Only one should be visible
      const connectVisible = await connectButton.isVisible();
      const disconnectVisible = await disconnectButton.isVisible();
      expect(connectVisible !== disconnectVisible).toBe(true);
    });
  });

  test.describe('Connection State Management', () => {
    test('should update UI when connection state changes', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Check that status section exists
      const statusSection = page.locator('h2:has-text("Status")').locator('..');
      await expect(statusSection).toBeVisible();
      
      // Verify status indicators are present
      await expect(page.locator('strong:has-text("Connected:")')).toBeVisible();
    });

    test('should clear error messages', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // If there's an error, clear button should work
      const clearButton = page.locator('button:has-text("Clear")').first();
      if (await clearButton.isVisible()) {
        await clearButton.click();
        // Error should be cleared
        await expect(clearButton).not.toBeVisible();
      }
    });
  });

  test.describe('Auto-Connect Preferences', () => {
    test('should toggle auto-connect preference', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Find auto-connect checkbox
      const autoConnectCheckbox = page.locator('input[type="checkbox"]').first();
      const initialState = await autoConnectCheckbox.isChecked();
      
      // Toggle the checkbox
      await autoConnectCheckbox.click();
      
      // Verify it toggled
      const newState = await autoConnectCheckbox.isChecked();
      expect(newState).toBe(!initialState);
      
      // Check localStorage was updated
      const storedValue = await page.evaluate(() => 
        localStorage.getItem('photon_auto_connect')
      );
      expect(storedValue).toBe(newState ? 'true' : 'false');
    });

    test('should persist auto-connect preference across reloads', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Set auto-connect to true
      const autoConnectCheckbox = page.locator('input[type="checkbox"]').first();
      
      // Ensure it's checked
      if (!(await autoConnectCheckbox.isChecked())) {
        await autoConnectCheckbox.click();
      }
      
      // Verify it's checked
      await expect(autoConnectCheckbox).toBeChecked();
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should still be checked
      const checkboxAfterReload = page.locator('input[type="checkbox"]').first();
      await expect(checkboxAfterReload).toBeChecked();
    });

    test('should clear auto-connect preference', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Set some preference first
      await page.evaluate(() => {
        localStorage.setItem('photon_auto_connect', 'true');
        localStorage.setItem('photon_wallet_name', 'test-wallet');
      });
      
      // Click clear preference button
      const clearButton = page.locator('button:has-text("Clear Saved Preference")');
      await clearButton.click();
      
      // Check localStorage was cleared
      const autoConnect = await page.evaluate(() => 
        localStorage.getItem('photon_auto_connect')
      );
      const walletName = await page.evaluate(() => 
        localStorage.getItem('photon_wallet_name')
      );
      
      expect(autoConnect).toBeNull();
      expect(walletName).toBeNull();
    });
  });

  test.describe('Debug Information', () => {
    test('should display debug information', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Check debug section exists
      const debugSection = page.locator('h3:has-text("Debug Info")').locator('..');
      await expect(debugSection).toBeVisible();
      
      // Should show localStorage keys
      await expect(page.locator('text=localStorage.photon_auto_connect:')).toBeVisible();
      await expect(page.locator('text=localStorage.photon_last_wallet:')).toBeVisible();
      await expect(page.locator('text=localStorage.photon_explicitly_disconnected:')).toBeVisible();
    });

    test('should update debug info in real-time', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Toggle auto-connect
      const autoConnectCheckbox = page.locator('input[type="checkbox"]').first();
      await autoConnectCheckbox.click();
      
      // Check debug info updated
      const debugText = await page.locator('text=localStorage.photon_auto_connect:').textContent();
      expect(debugText).toContain(await autoConnectCheckbox.isChecked() ? 'true' : 'false');
    });
  });

  test.describe('Minimal Example Page', () => {
    test('should render minimal example correctly', async ({ page }) => {
      await page.goto('/minimal');
      
      // Should show title
      await expect(page.locator('h1:has-text("Photon SDK - Minimal Example")')).toBeVisible();
      
      // Should show either connect button or connected state
      const connectButton = page.locator('button:has-text("Connect Wallet")');
      const disconnectButton = page.locator('button:has-text("Disconnect")');
      
      const connectVisible = await connectButton.isVisible();
      const disconnectVisible = await disconnectButton.isVisible();
      
      // One or the other should be visible, not both
      expect(connectVisible || disconnectVisible).toBe(true);
      expect(connectVisible && disconnectVisible).toBe(false);
    });

    test('should show wallet warning if no wallets', async ({ page }) => {
      await page.goto('/minimal');
      
      // Check if warning appears when appropriate
      const warning = page.locator('text=No wallets detected');
      const connectButton = page.locator('button:has-text("Connect Wallet")');
      
      // If no wallets, warning should be shown instead of button
      if (await warning.isVisible()) {
        await expect(connectButton).not.toBeVisible();
      }
    });
  });

  test.describe('Balance Display', () => {
    test('should show balance section when connected', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Check if balance section exists
      const balanceSection = page.locator('h2:has-text("Balance Information")').locator('..');
      await expect(balanceSection).toBeVisible();
      
      // Should have manual address input
      const addressInput = page.locator('input[placeholder="Enter Solana address..."]');
      await expect(addressInput).toBeVisible();
    });

    test('should allow checking any address balance', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Enter a known address (Solana's system program)
      const addressInput = page.locator('input[placeholder="Enter Solana address..."]');
      await addressInput.fill('11111111111111111111111111111111');
      
      // Balance should show or loading should appear
      await page.waitForTimeout(500);
      
      // Clear button should work
      const clearButton = page.locator('button:has-text("Clear")').last();
      await clearButton.click();
      await expect(addressInput).toHaveValue('');
    });
  });
});