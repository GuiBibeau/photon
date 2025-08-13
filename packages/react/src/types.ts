import type { Address } from '@photon/addresses';
import type { Transaction } from '@photon/transactions';
import type { Signature } from '@photon/crypto';

/**
 * Wallet event types
 */
export type WalletEvent = 'connect' | 'disconnect' | 'accountChanged' | 'error';

/**
 * Event listener callback
 */
export type WalletEventListener<T = unknown> = (data: T) => void;

/**
 * Core wallet provider interface
 * Extends concepts from SDK's Signer interface for compatibility
 */
export interface WalletProvider {
  // Identity
  name: string;
  icon?: string;
  url?: string;

  // State
  publicKey: Address | null;
  connected: boolean;
  connecting: boolean;

  // Feature support flags
  features?: WalletFeatures;

  // Connection methods
  connect(options?: { onlyIfTrusted?: boolean }): Promise<void>;
  disconnect(): Promise<void>;

  // Transaction signing
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
  sendTransaction?(transaction: Transaction, options?: SendTransactionOptions): Promise<string>;

  // Message signing
  signMessage(message: Uint8Array): Promise<Signature>;
  signIn?(message?: SignInMessage): Promise<SignInOutput>;

  // Event handling
  on(event: WalletEvent, listener: WalletEventListener): void;
  off(event: WalletEvent, listener: WalletEventListener): void;
  emit?(event: WalletEvent, data?: unknown): void;
}

/**
 * Wallet feature support flags
 */
export interface WalletFeatures {
  // Core features
  signTransaction: boolean;
  signAllTransactions?: boolean;
  signMessage: boolean;
  signIn?: boolean;

  // Advanced features
  sendTransaction?: boolean;
  simulateTransaction?: boolean;

  // Transaction types
  versionedTransactions?: boolean;
  addressLookupTables?: boolean;

  // Mobile features
  deepLinking?: boolean;
  mobileWalletAdapter?: boolean;

  // Security features
  encryptDecrypt?: boolean;
  multisig?: boolean;
}

/**
 * Options for sending transactions
 */
export interface SendTransactionOptions {
  skipPreflight?: boolean;
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  minContextSlot?: number;
}

/**
 * Sign-in with Solana (SIWS) message
 */
export interface SignInMessage {
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
  resources?: string[];
}

/**
 * Output from sign-in operation
 */
export interface SignInOutput {
  account: {
    address: string;
    publicKey: Uint8Array;
    chains?: string[];
    features?: string[];
  };
  signedMessage: Uint8Array;
  signature: Uint8Array;
}

/**
 * Wallet metadata for display
 */
export interface WalletMetadata {
  name: string;
  icon?: string;
  url?: string;
  readyState: WalletReadyState;
  isInstalled: boolean;
  isMobile: boolean;
  platforms?: WalletPlatform[];
  version?: string;
  features?: WalletFeatures;
}

/**
 * Supported platforms for wallet
 */
export type WalletPlatform = 'browser-extension' | 'ios' | 'android' | 'desktop' | 'hardware';

/**
 * Wallet ready states
 */
export enum WalletReadyState {
  /**
   * Wallet is installed and ready
   */
  Installed = 'Installed',
  /**
   * Wallet is not installed
   */
  NotDetected = 'NotDetected',
  /**
   * Wallet is still loading
   */
  Loadable = 'Loadable',
  /**
   * Wallet is not supported on this platform
   */
  Unsupported = 'Unsupported',
}

/**
 * Wallet connection errors
 */
export class WalletError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

export class WalletConnectionError extends WalletError {
  constructor(message: string = 'Failed to connect wallet') {
    super(message, 'CONNECTION_FAILED');
  }
}

export class WalletDisconnectedError extends WalletError {
  constructor(message: string = 'Wallet is not connected') {
    super(message, 'DISCONNECTED');
  }
}

export class WalletNotReadyError extends WalletError {
  constructor(message: string = 'Wallet is not ready') {
    super(message, 'NOT_READY');
  }
}

export class WalletSignTransactionError extends WalletError {
  constructor(message: string = 'Failed to sign transaction') {
    super(message, 'SIGN_FAILED');
  }
}

export class WalletSignMessageError extends WalletError {
  constructor(message: string = 'Failed to sign message') {
    super(message, 'SIGN_MESSAGE_FAILED');
  }
}

export class WalletTimeoutError extends WalletError {
  constructor(message: string = 'Wallet operation timed out') {
    super(message, 'TIMEOUT');
  }
}

export class WalletUserRejectedError extends WalletError {
  constructor(message: string = 'User rejected the request') {
    super(message, 'USER_REJECTED');
  }
}

export class WalletNotInstalledError extends WalletError {
  constructor(walletName?: string) {
    const message = walletName
      ? `${walletName} wallet is not installed`
      : 'Wallet is not installed';
    super(message, 'NOT_INSTALLED');
  }
}

export class WalletNetworkError extends WalletError {
  constructor(message: string = 'Network error occurred') {
    super(message, 'NETWORK_ERROR');
  }
}

export class WalletInvalidTransactionError extends WalletError {
  constructor(message: string = 'Invalid transaction') {
    super(message, 'INVALID_TRANSACTION');
  }
}

export class WalletRateLimitError extends WalletError {
  constructor(message: string = 'Too many connection attempts') {
    super(message, 'RATE_LIMITED');
  }
}

export class WalletMobileConnectionError extends WalletError {
  constructor(message: string = 'Mobile wallet connection failed') {
    super(message, 'MOBILE_CONNECTION_FAILED');
  }
}

/**
 * Detected wallet instance
 */
export interface DetectedWallet {
  provider: WalletProvider;
  metadata: WalletMetadata;
  detectionMethod: 'window-injection' | 'wallet-standard' | 'mobile-app' | 'deep-link';
}

/**
 * Wallet connection options
 */
export interface WalletConnectionOptions {
  onlyIfTrusted?: boolean;
  timeout?: number;
  autoConnect?: boolean;
  eagerness?: 'eager' | 'lazy';
  sessionDuration?: number; // milliseconds
}

/**
 * Transaction status for hooks
 */
export type TransactionStatus =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'sending'
  | 'confirming'
  | 'confirmed'
  | 'failed';

/**
 * Token balance information
 */
export interface TokenBalance {
  mint: Address;
  amount: bigint;
  decimals: number;
  uiAmount: number;
  symbol?: string;
  name?: string;
  logoUri?: string;
}

/**
 * Token metadata
 */
export interface TokenMetadata {
  mint: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
  description?: string;
  website?: string;
  coingeckoId?: string;
}

/**
 * Swap route information
 */
export interface SwapRoute {
  inputMint: Address;
  outputMint: Address;
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  marketInfos: MarketInfo[];
}

/**
 * Market information for swaps
 */
export interface MarketInfo {
  id: string;
  label: string;
  inputMint: Address;
  outputMint: Address;
  notEnoughLiquidity: boolean;
  inAmount: bigint;
  outAmount: bigint;
  priceImpact: number;
  lpFee: bigint;
  platformFee: bigint;
}
