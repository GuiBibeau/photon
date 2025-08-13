import type { DetectedWallet, WalletMetadata, WalletProvider } from '../types';
import { WalletReadyState } from '../types';

/**
 * Known wallet window properties
 */
interface WindowWithWallets extends Window {
  phantom?: { solana?: WalletProvider };
  solflare?: WalletProvider;
  backpack?: WalletProvider;
  glow?: WalletProvider;
  braveSolana?: WalletProvider;
  solana?: WalletProvider;
}

/**
 * Wallet detection configuration
 */
export interface WalletDetectorConfig {
  timeout?: number;
  pollInterval?: number;
}

/**
 * Detect installed browser wallets
 */
export async function detectWallets(config?: WalletDetectorConfig): Promise<DetectedWallet[]> {
  const { timeout: _timeout = 3000, pollInterval: _pollInterval = 100 } = config || {};
  const detectedWallets: DetectedWallet[] = [];

  // Implementation will be completed in RW-2
  // This is a placeholder that shows the structure

  return detectedWallets;
}

/**
 * Check if a specific wallet is installed
 */
export function isWalletInstalled(walletName: string): boolean {
  const win = window as WindowWithWallets;

  switch (walletName.toLowerCase()) {
    case 'phantom':
      return !!win.phantom?.solana;
    case 'solflare':
      return !!win.solflare;
    case 'backpack':
      return !!win.backpack;
    case 'glow':
      return !!win.glow;
    case 'brave':
      return !!win.braveSolana;
    default:
      return false;
  }
}

/**
 * Get wallet metadata
 */
export function getWalletMetadata(walletName: string): WalletMetadata {
  // Placeholder implementation - will be completed in RW-2
  return {
    name: walletName,
    readyState: WalletReadyState.NotDetected,
    isInstalled: false,
    isMobile: false,
  };
}
