import React, { createContext, useContext, type ReactNode } from 'react';
import type { WalletProvider as WalletProviderInterface } from './types';

/**
 * Wallet context value
 */
export interface WalletContextValue {
  wallets: WalletProviderInterface[];
  wallet: WalletProviderInterface | null;
  publicKey: string | null;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  autoConnect: boolean;

  select(walletName: string): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

/**
 * Wallet context
 */
const WalletContext = createContext<WalletContextValue | undefined>(undefined);

/**
 * Wallet provider props
 */
export interface WalletProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Use wallet context hook
 */
export function useWalletContext(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
}

// Placeholder for the actual provider implementation
// This will be implemented when we create the connection manager
export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  // Implementation will follow in RW-3
  return React.createElement(React.Fragment, null, children);
};
