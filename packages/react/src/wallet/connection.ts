import type { WalletProvider, WalletConnectionOptions } from '../types';

/**
 * Connection manager for wallet operations
 */
export class WalletConnectionManager {
  private wallets: Map<string, WalletProvider> = new Map();
  private currentWallet: WalletProvider | null = null;

  /**
   * Register a wallet provider
   */
  registerWallet(name: string, provider: WalletProvider): void {
    this.wallets.set(name, provider);
  }

  /**
   * Get all registered wallets
   */
  getWallets(): WalletProvider[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Get a specific wallet by name
   */
  getWallet(name: string): WalletProvider | undefined {
    return this.wallets.get(name);
  }

  /**
   * Connect to a wallet
   */
  async connect(_walletName: string, _options?: WalletConnectionOptions): Promise<void> {
    // Implementation will be completed in RW-3
  }

  /**
   * Disconnect from current wallet
   */
  async disconnect(): Promise<void> {
    // Implementation will be completed in RW-3
  }

  /**
   * Get current connected wallet
   */
  getCurrentWallet(): WalletProvider | null {
    return this.currentWallet;
  }

  /**
   * Switch to a different wallet
   */
  async switchWallet(_walletName: string): Promise<void> {
    // Implementation will be completed in RW-3
  }
}

/**
 * Create a new wallet connection manager instance
 */
export function createWalletConnectionManager(): WalletConnectionManager {
  return new WalletConnectionManager();
}
