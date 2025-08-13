// Re-export types (except WalletProvider which conflicts with the component)
export type {
  WalletProvider as WalletProviderInterface,
  WalletMetadata,
  DetectedWallet,
  WalletConnectionOptions,
  TransactionStatus,
  TokenBalance,
  TokenMetadata,
  SwapRoute,
  MarketInfo,
} from './types';

// Re-export values (enums and error classes)
export {
  WalletReadyState,
  WalletError,
  WalletConnectionError,
  WalletDisconnectedError,
  WalletNotReadyError,
  WalletSignTransactionError,
  WalletSignMessageError,
  WalletTimeoutError,
} from './types';

// Re-export providers (includes WalletProvider component)
export * from './providers';

// Re-export all hooks
export * from './hooks';

// Re-export wallet utilities
export * from './wallet';
