import type { Address } from '@photon/addresses';
import type { Transaction } from '@photon/transactions';

/**
 * Core wallet provider interface
 */
export interface WalletProvider {
  name: string;
  icon?: string;
  url?: string;
  publicKey: Address | null;
  connected: boolean;
  connecting: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
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
}

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

/**
 * Detected wallet instance
 */
export interface DetectedWallet {
  provider: WalletProvider;
  metadata: WalletMetadata;
}

/**
 * Wallet connection options
 */
export interface WalletConnectionOptions {
  onlyIfTrusted?: boolean;
  timeout?: number;
  autoConnect?: boolean;
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
