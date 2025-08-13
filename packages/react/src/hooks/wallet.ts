import { useState, useCallback } from 'react';
import type { Address } from '@photon/addresses';

/**
 * useWallet hook interface
 */
export interface UseWalletResult {
  connected: boolean;
  connecting: boolean;
  publicKey: Address | null;
  wallet: string | null;
  error: Error | null;

  connect(walletName?: string): Promise<void>;
  disconnect(): Promise<void>;
  select(walletName: string): void;
  autoConnect(): Promise<void>;
}

/**
 * Primary wallet connection hook
 * Manages wallet connection state and operations
 */
export function useWallet(): UseWalletResult {
  // Placeholder implementation - will be completed in RW-4
  const [connected] = useState(false);
  const [connecting] = useState(false);
  const [publicKey] = useState<Address | null>(null);
  const [wallet] = useState<string | null>(null);
  const [error] = useState<Error | null>(null);

  const connect = useCallback(async (_walletName?: string) => {
    // Implementation to follow
  }, []);

  const disconnect = useCallback(async () => {
    // Implementation to follow
  }, []);

  const select = useCallback((_walletName: string) => {
    // Implementation to follow
  }, []);

  const autoConnect = useCallback(async () => {
    // Implementation to follow
  }, []);

  return {
    connected,
    connecting,
    publicKey,
    wallet,
    error,
    connect,
    disconnect,
    select,
    autoConnect,
  };
}
