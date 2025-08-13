import type { Transaction } from '@photon/transactions';
import type { WalletProvider } from '../types';

/**
 * Wallet Standard specification interfaces
 * Based on the Wallet Standard protocol for automatic wallet detection
 */

/**
 * Wallet Standard wallet interface
 */
export interface StandardWallet {
  // Identity
  readonly name: string;
  readonly icon: WalletIcon;
  readonly version: '1.0.0';
  readonly chains: string[];

  // Features
  readonly features: StandardWalletFeatures;

  // Accounts
  readonly accounts: readonly WalletAccount[];

  // Events
  on<E extends keyof WalletEvents>(event: E, listener: WalletEvents[E]): () => void;
}

/**
 * Wallet icon definition
 */
export type WalletIcon = `data:image/${string};base64,${string}` | `https://${string}`;

/**
 * Wallet account representation
 */
export interface WalletAccount {
  readonly address: string;
  readonly publicKey: Uint8Array;
  readonly chains: readonly string[];
  readonly features: readonly string[];
  readonly label?: string;
  readonly icon?: WalletIcon;
}

/**
 * Standard wallet features
 */
export interface StandardWalletFeatures {
  'standard:connect'?: StandardConnectFeature;
  'standard:disconnect'?: StandardDisconnectFeature;
  'standard:events'?: StandardEventsFeature;
  'solana:signTransaction'?: SolanaSignTransactionFeature;
  'solana:signMessage'?: SolanaSignMessageFeature;
  'solana:signIn'?: SolanaSignInFeature;
  [feature: string]: unknown;
}

/**
 * Connect feature
 */
export interface StandardConnectFeature {
  version: '1.0.0';
  connect(options?: StandardConnectOptions): Promise<StandardConnectOutput>;
}

export interface StandardConnectOptions {
  silent?: boolean;
}

export interface StandardConnectOutput {
  accounts: readonly WalletAccount[];
}

/**
 * Disconnect feature
 */
export interface StandardDisconnectFeature {
  version: '1.0.0';
  disconnect(): Promise<void>;
}

/**
 * Events feature
 */
export interface StandardEventsFeature {
  version: '1.0.0';
  on<E extends keyof WalletEvents>(event: E, listener: WalletEvents[E]): () => void;
}

/**
 * Solana sign transaction feature
 */
export interface SolanaSignTransactionFeature {
  version: '1.0.0';
  chains: readonly string[];
  signTransaction(options: {
    transaction: Transaction;
    account: WalletAccount;
    chain?: string;
  }): Promise<{ signedTransaction: Transaction }>;
}

/**
 * Solana sign message feature
 */
export interface SolanaSignMessageFeature {
  version: '1.0.0';
  signMessage(options: {
    message: Uint8Array;
    account: WalletAccount;
  }): Promise<{ signedMessage: Uint8Array; signature: Uint8Array }>;
}

/**
 * Solana sign-in feature
 */
export interface SolanaSignInFeature {
  version: '1.0.0';
  signIn(options?: SolanaSignInOptions): Promise<SolanaSignInOutput>;
}

export interface SolanaSignInOptions {
  domain?: string;
  address?: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: readonly string[];
}

export interface SolanaSignInOutput {
  account: WalletAccount;
  signedMessage: Uint8Array;
  signature: Uint8Array;
}

/**
 * Wallet events
 */
export interface WalletEvents {
  change(properties: WalletEventProperties): void;
}

export interface WalletEventProperties {
  accounts?: readonly WalletAccount[];
  chains?: readonly string[];
  features?: readonly string[];
}

/**
 * Window interface for Wallet Standard
 */
export interface WindowWithWalletStandard extends Window {
  navigator: NavigatorWithWallets;
  addEventListener(
    type: 'wallet-standard:register-wallet',
    listener: (event: RegisterWalletEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  dispatchEvent(event: Event): boolean;
}

/**
 * Navigator with wallets
 */
export interface NavigatorWithWallets extends Navigator {
  wallets?: WalletStandardRegistry;
}

/**
 * Wallet registry
 */
export interface WalletStandardRegistry {
  get(): readonly StandardWallet[];
  on<E extends keyof WalletRegistryEvents>(event: E, listener: WalletRegistryEvents[E]): () => void;
}

/**
 * Registry events
 */
export interface WalletRegistryEvents {
  register(wallet: StandardWallet): void;
  unregister(wallet: StandardWallet): void;
}

/**
 * Wallet registration event
 */
export interface RegisterWalletEvent extends Event {
  readonly type: 'wallet-standard:register-wallet';
  readonly detail: RegisterWalletEventDetail;
  readonly registerWallet: (wallet: StandardWallet) => void;
}

export interface RegisterWalletEventDetail {
  wallet: StandardWallet;
}

/**
 * Convert a Standard Wallet to WalletProvider interface
 */
export function standardWalletToProvider(wallet: StandardWallet): WalletProvider | null {
  // Check if wallet supports required Solana features
  if (!wallet.features['solana:signTransaction'] || !wallet.features['solana:signMessage']) {
    return null;
  }

  // This is a type adapter - actual implementation will be in RW-2
  return null;
}

/**
 * Check if a wallet implements Wallet Standard
 */
export function isWalletStandard(wallet: unknown): wallet is StandardWallet {
  if (typeof wallet !== 'object' || wallet === null) {
    return false;
  }

  const w = wallet as StandardWallet;
  return (
    typeof w.name === 'string' &&
    typeof w.version === 'string' &&
    Array.isArray(w.chains) &&
    typeof w.features === 'object' &&
    Array.isArray(w.accounts) &&
    typeof w.on === 'function'
  );
}

/**
 * Detection configuration for Wallet Standard
 */
export interface WalletStandardDetectionConfig {
  timeout?: number;
  eager?: boolean;
}

/**
 * Detect Wallet Standard compliant wallets
 */
export async function detectWalletStandard(
  _config?: WalletStandardDetectionConfig,
): Promise<StandardWallet[]> {
  // Implementation will be completed in RW-2
  return [];
}
