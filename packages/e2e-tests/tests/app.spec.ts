import { test, expect } from '@playwright/test';

test.describe('Photon SDK E2E Tests', () => {
  test('should render the app', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Check that the main title is visible
    await expect(page.getByRole('heading', { name: '⚡ Photon SDK' })).toBeVisible();
    await expect(page.getByText('Lightweight Solana Development Kit')).toBeVisible();
  });

  test('should have the correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Vite + React + TS');
  });
});
