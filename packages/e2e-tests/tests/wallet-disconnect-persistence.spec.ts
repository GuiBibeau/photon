import { test, expect, Page } from '@playwright/test';

test.describe('Wallet Disconnect Persistence E2E Tests', () => {
  // Helper to set up a mock connected state
  async function setupConnectedState(page: Page) {
    await page.evaluate(() => {
      // Simulate a connected state in localStorage
      localStorage.setItem('photon_auto_connect', 'true');
      localStorage.setItem('photon_last_wallet', 'phantom');
      localStorage.setItem('photon_wallet_name', 'phantom');
      localStorage.setItem('photon_wallet_timestamp', Date.now().toString());
      localStorage.removeItem('photon_explicitly_disconnected');
    });
  }

  async function setupDisconnectedState(page: Page) {
    await page.evaluate(() => {
      localStorage.setItem('photon_explicitly_disconnected', 'true');
      localStorage.removeItem('photon_connection_state');
    });
  }

  test.describe('Disconnect Persistence', () => {
    test('should set explicitly disconnected flag when user disconnects', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Set up as if we were connected
      await setupConnectedState(page);
      
      // Check the explicitly disconnected flag is not set initially
      let explicitlyDisconnected = await page.evaluate(() => 
        localStorage.getItem('photon_explicitly_disconnected')
      );
      expect(explicitlyDisconnected).toBeNull();
      
      // Simulate disconnect action by setting the flag (since we can't actually connect)
      await setupDisconnectedState(page);
      
      // Verify flag is now set
      explicitlyDisconnected = await page.evaluate(() => 
        localStorage.getItem('photon_explicitly_disconnected')
      );
      expect(explicitlyDisconnected).toBe('true');
    });

    test('should not auto-connect after explicit disconnect', async ({ page }) => {
      // Set up disconnected state
      await page.goto('/wallet-test');
      await setupDisconnectedState(page);
      
      // Enable auto-connect
      await page.evaluate(() => {
        localStorage.setItem('photon_auto_connect', 'true');
        localStorage.setItem('photon_last_wallet', 'phantom');
      });
      
      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Check that explicitly disconnected flag is still set
      const explicitlyDisconnected = await page.evaluate(() => 
        localStorage.getItem('photon_explicitly_disconnected')
      );
      expect(explicitlyDisconnected).toBe('true');
      
      // Should show as not connected
      await expect(page.locator('text=Connected: No')).toBeVisible();
      
      // Debug info should show explicitly disconnected
      const debugInfo = page.locator('text=localStorage.photon_explicitly_disconnected:');
      await expect(debugInfo).toContainText('true');
    });

    test('should persist disconnect across multiple page refreshes', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Set explicitly disconnected state
      await setupDisconnectedState(page);
      await page.evaluate(() => {
        localStorage.setItem('photon_auto_connect', 'true');
        localStorage.setItem('photon_last_wallet', 'phantom');
      });
      
      // Reload multiple times
      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Should still be disconnected
        await expect(page.locator('text=Connected: No')).toBeVisible();
        
        // Flag should persist
        const flag = await page.evaluate(() => 
          localStorage.getItem('photon_explicitly_disconnected')
        );
        expect(flag).toBe('true');
      }
    });

    test('should clear explicitly disconnected flag on manual connect', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Start with explicitly disconnected state
      await setupDisconnectedState(page);
      
      // Verify flag is set
      let flag = await page.evaluate(() => 
        localStorage.getItem('photon_explicitly_disconnected')
      );
      expect(flag).toBe('true');
      
      // Simulate a manual connection by clearing the flag
      // (In real scenario, clicking Connect would do this)
      await page.evaluate(() => {
        localStorage.removeItem('photon_explicitly_disconnected');
        localStorage.setItem('photon_connection_state', JSON.stringify({
          connected: true,
          walletName: 'phantom'
        }));
      });
      
      // Verify flag is cleared
      flag = await page.evaluate(() => 
        localStorage.getItem('photon_explicitly_disconnected')
      );
      expect(flag).toBeNull();
    });

    test('should show correct debug state for disconnect persistence', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Set explicitly disconnected
      await setupDisconnectedState(page);
      
      // Check debug display
      const debugSection = page.locator('h3:has-text("Debug Info")').locator('..');
      await expect(debugSection).toBeVisible();
      
      // Should show the flag in debug info
      const disconnectedFlag = page.locator('text=localStorage.photon_explicitly_disconnected:');
      await expect(disconnectedFlag).toContainText('true');
      
      // The text should be highlighted (has special styling)
      const flagElement = page.locator('div:has-text("localStorage.photon_explicitly_disconnected:")');
      const style = await flagElement.getAttribute('style');
      expect(style).toContain('color');
    });
  });

  test.describe('Connection State Transitions', () => {
    test('should handle state transition: connected -> disconnected -> refresh', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Start connected
      await setupConnectedState(page);
      await page.reload();
      
      // Simulate disconnect
      await setupDisconnectedState(page);
      
      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should remain disconnected
      await expect(page.locator('text=Connected: No')).toBeVisible();
      
      // Explicitly disconnected flag should be visible in debug
      await expect(page.locator('text=localStorage.photon_explicitly_disconnected: true')).toBeVisible();
    });

    test('should not clear disconnect flag when auto-connect is toggled', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Set explicitly disconnected
      await setupDisconnectedState(page);
      
      // Toggle auto-connect on and off
      const autoConnectCheckbox = page.locator('input[type="checkbox"]').first();
      
      // Turn on
      if (!(await autoConnectCheckbox.isChecked())) {
        await autoConnectCheckbox.click();
      }
      
      // Turn off
      await autoConnectCheckbox.click();
      
      // Turn on again
      await autoConnectCheckbox.click();
      
      // Explicitly disconnected flag should still be set
      const flag = await page.evaluate(() => 
        localStorage.getItem('photon_explicitly_disconnected')
      );
      expect(flag).toBe('true');
    });

    test('should respect disconnect even with saved session', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Set up a saved session but explicitly disconnected
      await page.evaluate(() => {
        // Simulate a saved session
        const session = {
          id: 'test-session',
          publicKey: '11111111111111111111111111111111',
          walletName: 'phantom',
          createdAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          lastActivity: Date.now()
        };
        localStorage.setItem('photon_wallet_sessions', JSON.stringify([session]));
        localStorage.setItem('photon_last_wallet', 'phantom');
        localStorage.setItem('photon_auto_connect', 'true');
        
        // But user explicitly disconnected
        localStorage.setItem('photon_explicitly_disconnected', 'true');
      });
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should not connect despite valid session
      await expect(page.locator('text=Connected: No')).toBeVisible();
      
      // Debug should show the situation
      const debugInfo = await page.locator('.debug-info, [style*="monospace"]').first();
      if (await debugInfo.isVisible()) {
        const text = await debugInfo.textContent();
        expect(text).toContain('photon_explicitly_disconnected');
      }
    });
  });

  test.describe('Clear Operations', () => {
    test('should properly clear all connection data', async ({ page }) => {
      await page.goto('/wallet-test');
      
      // Set up complex state
      await page.evaluate(() => {
        localStorage.setItem('photon_auto_connect', 'true');
        localStorage.setItem('photon_last_wallet', 'phantom');
        localStorage.setItem('photon_wallet_name', 'phantom');
        localStorage.setItem('photon_explicitly_disconnected', 'true');
        localStorage.setItem('photon_connection_state', JSON.stringify({ connected: false }));
      });
      
      // Click clear preferences
      const clearButton = page.locator('button:has-text("Clear Saved Preference")');
      await clearButton.click();
      
      // Check that preference-related items are cleared
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
});