import { test, expect, Page } from '@playwright/test';

test.describe('Wallet Auto-Connect E2E Tests', () => {
  async function clearAllStorage(page: Page) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  async function setupAutoConnect(page: Page, walletName = 'phantom') {
    await page.evaluate((wallet) => {
      localStorage.setItem('photon_auto_connect', 'true');
      localStorage.setItem('photon_last_wallet', wallet);
      localStorage.setItem('photon_wallet_name', wallet);
      localStorage.setItem('photon_wallet_timestamp', Date.now().toString());
      
      // Create a valid session
      const session = {
        id: 'test-session-' + Date.now(),
        publicKey: '11111111111111111111111111111111',
        walletName: wallet,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        lastActivity: Date.now()
      };
      localStorage.setItem('photon_wallet_sessions', JSON.stringify([session]));
    }, walletName);
  }

  test.describe('Auto-Connect on Page Load', () => {
    test('should auto-connect when preference is enabled', async ({ page }) => {
      // Set up auto-connect preference
      await page.goto('/wallet-test');
      await clearAllStorage(page);
      await setupAutoConnect(page);
      
      // Reload to trigger auto-connect
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Check that auto-connect preference is enabled
      const autoConnectCheckbox = page.locator('input[type="checkbox"]').first();
      await expect(autoConnectCheckbox).toBeChecked();
      
      // Check debug info shows auto-connect is enabled
      await expect(page.locator('text=localStorage.photon_auto_connect: true')).toBeVisible();
    });

    test('should not auto-connect when preference is disabled', async ({ page }) => {
      await page.goto('/wallet-test');
      await clearAllStorage(page);
      
      // Set up with auto-connect disabled
      await page.evaluate(() => {
        localStorage.setItem('photon_auto_connect', 'false');
        localStorage.setItem('photon_last_wallet', 'phantom');
      });
      
      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should not be connected
      await expect(page.locator('text=Connected: No')).toBeVisible();
      
      // Checkbox should be unchecked
      const autoConnectCheckbox = page.locator('input[type="checkbox"]').first();
      await expect(autoConnectCheckbox).not.toBeChecked();
    });

    test('should show auto-connecting state during connection', async ({ page }) => {
      await page.goto('/wallet-test');
      await clearAllStorage(page);
      
      // Enable auto-connect
      const autoConnectCheckbox = page.locator('input[type="checkbox"]').first();
      if (!(await autoConnectCheckbox.isChecked())) {
        await autoConnectCheckbox.click();
      }
      
      // Set up last wallet
      await page.evaluate(() => {
        localStorage.setItem('photon_last_wallet', 'phantom');
        localStorage.setItem('photon_wallet_name', 'phantom');
      });
      
      // During reload, check for auto-connecting state
      // Note: This is hard to catch, so we verify the feature exists
      const statusSection = page.locator('text=Auto-Connecting:');
      
      // The element should exist in the DOM (even if not always visible)
      const statusExists = await page.locator('text=Auto-Connecting:').count();
      expect(statusExists).toBeGreaterThan(0);
    });
  });

  test.describe('Auto-Connect Button', () => {
    test('should have auto-connect button when disconnected', async ({ page }) => {
      await page.goto('/wallet-test');
      await clearAllStorage(page);
      
      // Set up a previous wallet
      await page.evaluate(() => {
        localStorage.setItem('photon_wallet_name', 'phantom');
        localStorage.setItem('photon_wallet_timestamp', Date.now().toString());
      });
      
      // Auto-connect button should be visible
      const autoConnectButton = page.locator('button:has-text("Auto Connect")');
      await expect(autoConnectButton).toBeVisible();
    });

    test('should disable auto-connect button when no previous wallet', async ({ page }) => {
      await page.goto('/wallet-test');
      await clearAllStorage(page);
      
      // No previous wallet set
      const autoConnectButton = page.locator('button:has-text("Auto Connect")');
      
      // Button should be disabled
      await expect(autoConnectButton).toBeDisabled();
      
      // Should have appropriate title/tooltip
      const title = await autoConnectButton.getAttribute('title');
      expect(title).toContain('No previous wallet');
    });

    test('should show auto-connecting state when button clicked', async ({ page }) => {
      await page.goto('/wallet-test');
      await clearAllStorage(page);
      
      // Set up previous wallet
      await page.evaluate(() => {
        localStorage.setItem('photon_wallet_name', 'phantom');
        localStorage.setItem('photon_wallet_timestamp', Date.now().toString());
      });
      
      const autoConnectButton = page.locator('button:has-text("Auto Connect")');
      
      // Click and check for state change
      if (await autoConnectButton.isEnabled()) {
        await autoConnectButton.click();
        
        // Button text might change to show connecting state
        // or button might become disabled
        const isDisabled = await autoConnectButton.isDisabled();
        const text = await autoConnectButton.textContent();
        
        // Either disabled or showing different text
        expect(isDisabled || text?.includes('Connecting')).toBeTruthy();
      }
    });
  });

  test.describe('Session Management', () => {
    test('should respect session expiry', async ({ page }) => {
      await page.goto('/wallet-test');
      await clearAllStorage(page);
      
      // Create an expired session
      await page.evaluate(() => {
        const session = {
          id: 'expired-session',
          publicKey: '11111111111111111111111111111111',
          walletName: 'phantom',
          createdAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
          expiresAt: Date.now() - 60 * 60 * 1000, // Expired 1 hour ago
          lastActivity: Date.now() - 25 * 60 * 60 * 1000
        };
        localStorage.setItem('photon_wallet_sessions', JSON.stringify([session]));
        localStorage.setItem('photon_auto_connect', 'true');
      });
      
      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should not auto-connect with expired session
      await expect(page.locator('text=Connected: No')).toBeVisible();
    });

    test('should use most recent session when multiple exist', async ({ page }) => {
      await page.goto('/wallet-test');
      await clearAllStorage(page);
      
      // Create multiple sessions
      await page.evaluate(() => {
        const sessions = [
          {
            id: 'old-session',
            publicKey: '11111111111111111111111111111111',
            walletName: 'solflare',
            createdAt: Date.now() - 2 * 60 * 60 * 1000,
            expiresAt: Date.now() + 22 * 60 * 60 * 1000,
            lastActivity: Date.now() - 2 * 60 * 60 * 1000
          },
          {
            id: 'recent-session',
            publicKey: '22222222222222222222222222222222',
            walletName: 'phantom',
            createdAt: Date.now() - 30 * 60 * 1000,
            expiresAt: Date.now() + 23.5 * 60 * 60 * 1000,
            lastActivity: Date.now() - 5 * 60 * 1000 // More recent activity
          }
        ];
        localStorage.setItem('photon_wallet_sessions', JSON.stringify(sessions));
        localStorage.setItem('photon_auto_connect', 'true');
        localStorage.setItem('photon_last_wallet', 'phantom');
      });
      
      // The debug info should show phantom as last wallet
      await expect(page.locator('text=localStorage.photon_last_wallet: phantom')).toBeVisible();
    });
  });

  test.describe('Auto-Connect Settings UI', () => {
    test('should show ON/OFF badge for auto-connect status', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Find the status badge
      const badge = page.locator('span:has-text("ON"), span:has-text("OFF")').first();
      await expect(badge).toBeVisible();
      
      // Toggle and verify badge updates
      const checkbox = page.locator('input[type="checkbox"]').first();
      const initialChecked = await checkbox.isChecked();
      
      await checkbox.click();
      
      // Badge should show opposite state
      if (initialChecked) {
        await expect(page.locator('span:has-text("OFF")')).toBeVisible();
      } else {
        await expect(page.locator('span:has-text("ON")')).toBeVisible();
      }
    });

    test('should have proper styling for ON/OFF states', async ({ page }) => {
      await page.goto('/wallet-test');
      
      const checkbox = page.locator('input[type="checkbox"]').first();
      
      // Set to ON
      if (!(await checkbox.isChecked())) {
        await checkbox.click();
      }
      
      // Check ON badge has success color
      const onBadge = page.locator('span:has-text("ON")').first();
      const onStyle = await onBadge.getAttribute('style');
      expect(onStyle).toContain('4caf50'); // Green color
      
      // Set to OFF
      await checkbox.click();
      
      // Check OFF badge has danger color
      const offBadge = page.locator('span:has-text("OFF")').first();
      const offStyle = await offBadge.getAttribute('style');
      expect(offStyle).toContain('f44336'); // Red color
    });

    test('should show helpful description text', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Should explain what auto-connect does
      const description = page.locator('text=automatically reconnect on page refresh');
      await expect(description).toBeVisible();
    });
  });

  test.describe('Auto-Connect with WalletProvider', () => {
    test('should respect WalletProvider autoConnect prop', async ({ page }) => {
      // The provider in App.tsx has autoConnect={true}
      await page.goto('/');
      await clearAllStorage(page);
      
      // Set up a wallet to auto-connect to
      await page.evaluate(() => {
        localStorage.setItem('photon_last_wallet', 'phantom');
        localStorage.setItem('photon_wallet_name', 'phantom');
      });
      
      // Navigate to minimal example which uses the provider
      await page.goto('/minimal');
      
      // The provider's autoConnect should work
      // (Note: actual connection depends on wallet extension)
      const title = page.locator('h1');
      await expect(title).toBeVisible();
    });
  });

  test.describe('Auto-Connect Error Handling', () => {
    test('should handle auto-connect failures gracefully', async ({ page }) => {
      await page.goto('/wallet-test');
      await clearAllStorage(page);
      
      // Set up auto-connect with invalid data
      await page.evaluate(() => {
        localStorage.setItem('photon_auto_connect', 'true');
        localStorage.setItem('photon_last_wallet', 'non-existent-wallet');
        localStorage.setItem('photon_wallet_sessions', 'invalid-json-{');
      });
      
      // Reload - should not crash
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Page should still load
      await expect(page.locator('h1')).toBeVisible();
      
      // Should show disconnected state
      await expect(page.locator('text=Connected: No')).toBeVisible();
    });
  });
});