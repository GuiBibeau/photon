import type { DetectedWallet, WalletMetadata } from '../types';
import { WalletReadyState } from '../types';
import type { StandardWallet } from './standard-types';

/**
 * Provider object injected by wallets
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface InjectedProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  isGlow?: boolean;
  isBrave?: boolean;
  isCoinbaseWallet?: boolean;
  isExodus?: boolean;
  isTrust?: boolean;

  publicKey: { toString(): string } | null;
  isConnected: boolean;

  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: any }>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions?(transactions: any[]): Promise<any[]>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  sendTransaction?(transaction: any, connection: any, options?: any): Promise<string>;

  on(event: string, callback: (...args: any[]) => void): void;
  off?(event: string, callback: (...args: any[]) => void): void;
  removeListener?(event: string, callback: (...args: any[]) => void): void;
  emit?(event: string, ...args: any[]): void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Known wallet window properties
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */
export interface WindowWithWallets extends Window {
  // Common injection patterns
  phantom?: {
    solana?: InjectedProvider;
    ethereum?: any; // Some wallets inject both
  };
  solflare?: InjectedProvider | { solana?: InjectedProvider };
  backpack?: InjectedProvider;
  glow?: InjectedProvider | { solana?: InjectedProvider };
  braveSolana?: InjectedProvider;
  coinbaseSolana?: InjectedProvider;
  exodus?: { solana?: InjectedProvider };
  trustwallet?: { solana?: InjectedProvider };

  // Legacy or alternative patterns
  solana?: InjectedProvider;
  wallet?: InjectedProvider;

  // Wallet Standard
  navigator: {
    wallets?: {
      get(): readonly StandardWallet[];
      on(event: string, callback: Function): () => void;
    };
  } & Navigator;
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */

/**
 * Wallet detection configuration
 */
export interface WalletDetectorConfig {
  timeout?: number;
  pollInterval?: number;
  detectWalletStandard?: boolean;
  detectWindowInjection?: boolean;
  allowMultipleIdentifiers?: boolean; // Security flag
}

/**
 * Provider validation result
 */
export interface ProviderValidationResult {
  isValid: boolean;
  issues: string[];
  securityRisk: 'low' | 'medium' | 'high';
  detectedIdentifiers: string[];
}

/**
 * Wallet detection strategy
 */
export type DetectionStrategy = 'immediate' | 'delayed' | 'manual';

/**
 * Detection result with metadata
 */
export interface DetectionResult {
  wallet: DetectedWallet;
  detectionTime: number; // milliseconds
  strategy: DetectionStrategy;
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

/**
 * Validate a provider for security issues
 */
export function validateProvider(provider: unknown): ProviderValidationResult {
  const result: ProviderValidationResult = {
    isValid: false,
    issues: [],
    securityRisk: 'low',
    detectedIdentifiers: [],
  };

  if (!provider || typeof provider !== 'object') {
    result.issues.push('Provider is not an object');
    return result;
  }

  const p = provider as InjectedProvider;

  // Check required methods
  const requiredMethods = ['connect', 'disconnect', 'signTransaction', 'signMessage'];
  for (const method of requiredMethods) {
    if (typeof p[method as keyof InjectedProvider] !== 'function') {
      result.issues.push(`Missing required method: ${method}`);
    }
  }

  // Check for multiple wallet identifiers (potential hijacking)
  const identifiers = [
    'isPhantom',
    'isSolflare',
    'isBackpack',
    'isGlow',
    'isBrave',
    'isCoinbaseWallet',
    'isExodus',
    'isTrust',
  ];

  for (const id of identifiers) {
    if (p[id as keyof InjectedProvider]) {
      result.detectedIdentifiers.push(id);
    }
  }

  if (result.detectedIdentifiers.length > 1) {
    result.issues.push('Multiple wallet identifiers detected');
    result.securityRisk = 'high';
  } else if (result.detectedIdentifiers.length === 0) {
    result.issues.push('No wallet identifier found');
    result.securityRisk = 'medium';
  }

  result.isValid = result.issues.length === 0;
  return result;
}

/**
 * Known wallet registry
 */
export const KNOWN_WALLETS = {
  phantom: {
    name: 'Phantom',
    url: 'https://phantom.app',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.svg',
    deepLink: 'phantom://',
  },
  solflare: {
    name: 'Solflare',
    url: 'https://solflare.com',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/solflare.svg',
    deepLink: 'solflare://',
  },
  backpack: {
    name: 'Backpack',
    url: 'https://backpack.app',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/backpack.svg',
    deepLink: 'backpack://',
  },
  glow: {
    name: 'Glow',
    url: 'https://glow.app',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/glow.svg',
    deepLink: 'glow://',
  },
  brave: {
    name: 'Brave',
    url: 'https://brave.com/wallet',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/brave.svg',
    deepLink: null,
  },
} as const;
