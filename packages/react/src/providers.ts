import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Address } from '@photon/addresses';
import type {
  WalletProvider as WalletProviderInterface,
  DetectedWallet,
  WalletConnectionOptions,
} from './types';
import { createWalletConnectionManager, type ConnectionManagerConfig } from './wallet/connection';
import { detectWallets } from './wallet/detector';

/**
 * Wallet context value
 */
export interface WalletContextValue {
  wallets: DetectedWallet[];
  wallet: WalletProviderInterface | null;
  publicKey: Address | null;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  autoConnect: boolean;
  error: Error | null;

  select(walletName: string): void;
  connect(walletName?: string, options?: WalletConnectionOptions): Promise<void>;
  disconnect(): Promise<void>;
  refreshWallets(): Promise<void>;
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
  connectionConfig?: ConnectionManagerConfig;
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

/**
 * Wallet Provider Component
 */
export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  autoConnect = false,
  onError,
  connectionConfig,
}) => {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<Address | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Create connection manager instance
  const connectionManager = useMemo(() => {
    return createWalletConnectionManager({
      ...connectionConfig,
      autoConnect: false, // We'll handle auto-connect ourselves
    });
  }, [connectionConfig]);

  // Get current wallet provider
  const wallet = useMemo(() => {
    if (!selectedWallet) {
      return null;
    }
    return connectionManager.getWallet(selectedWallet) || null;
  }, [selectedWallet, connectionManager]);

  // Detect wallets on mount
  useEffect(() => {
    const detectAndSetWallets = async () => {
      try {
        const detectedWallets = await detectWallets({
          timeout: 3000,
          pollInterval: 100,
          detectWalletStandard: true,
          detectWindowInjection: true,
        });

        // Register wallets with connection manager
        detectedWallets.forEach((wallet) => {
          connectionManager.registerWallet(wallet);
        });

        setWallets(detectedWallets);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to detect wallets');
        setError(error);
        onError?.(error);
      }
    };

    detectAndSetWallets();
  }, [connectionManager, onError]);

  // Setup event listeners
  useEffect(() => {
    const handleConnect = (data: unknown) => {
      const { wallet: walletName, publicKey: pk } = data as {
        wallet: string;
        publicKey: Address | null;
      };
      setSelectedWallet(walletName);
      setPublicKey(pk);
      setConnected(true);
      setConnecting(false);
      setError(null);
    };

    const handleDisconnect = () => {
      setConnected(false);
      setPublicKey(null);
      setDisconnecting(false);
    };

    const handleAccountChanged = (data: unknown) => {
      const { publicKey: pk } = data as { publicKey: Address | null };
      setPublicKey(pk);
    };

    const handleError = (data: unknown) => {
      const { error: err } = data as { error: Error };
      setError(err);
      onError?.(err);
    };

    connectionManager.on('connect', handleConnect);
    connectionManager.on('disconnect', handleDisconnect);
    connectionManager.on('accountChanged', handleAccountChanged);
    connectionManager.on('error', handleError);

    return () => {
      connectionManager.off('connect', handleConnect);
      connectionManager.off('disconnect', handleDisconnect);
      connectionManager.off('accountChanged', handleAccountChanged);
      connectionManager.off('error', handleError);
    };
  }, [connectionManager, onError]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && !connected && !connecting) {
      const performAutoConnect = async () => {
        try {
          setConnecting(true);
          await connectionManager.autoConnect();
        } catch (_err) {
          // Silent failure for auto-connect - no logging needed
        } finally {
          setConnecting(false);
        }
      };

      performAutoConnect();
    }
  }, [autoConnect, connected, connecting, connectionManager]);

  // Select wallet
  const select = useCallback((walletName: string) => {
    setSelectedWallet(walletName);
  }, []);

  // Connect to wallet
  const connect = useCallback(
    async (walletName?: string, options?: WalletConnectionOptions) => {
      const targetWallet = walletName || selectedWallet;
      if (!targetWallet) {
        const err = new Error('No wallet selected');
        setError(err);
        throw err;
      }

      try {
        setConnecting(true);
        setError(null);
        await connectionManager.connect(targetWallet, options);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Connection failed');
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setConnecting(false);
      }
    },
    [selectedWallet, connectionManager, onError],
  );

  // Disconnect from wallet
  const disconnect = useCallback(async () => {
    try {
      setDisconnecting(true);
      setError(null);
      await connectionManager.disconnect();
      setSelectedWallet(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Disconnection failed');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setDisconnecting(false);
    }
  }, [connectionManager, onError]);

  // Refresh wallet list
  const refreshWallets = useCallback(async () => {
    try {
      const detectedWallets = await detectWallets({
        timeout: 1000,
        pollInterval: 100,
        detectWalletStandard: true,
        detectWindowInjection: true,
      });

      // Register new wallets with connection manager
      detectedWallets.forEach((wallet) => {
        connectionManager.registerWallet(wallet);
      });

      setWallets(detectedWallets);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh wallets');
      setError(error);
      onError?.(error);
    }
  }, [connectionManager, onError]);

  const contextValue = useMemo<WalletContextValue>(
    () => ({
      wallets,
      wallet,
      publicKey,
      connected,
      connecting,
      disconnecting,
      autoConnect,
      error,
      select,
      connect,
      disconnect,
      refreshWallets,
    }),
    [
      wallets,
      wallet,
      publicKey,
      connected,
      connecting,
      disconnecting,
      autoConnect,
      error,
      select,
      connect,
      disconnect,
      refreshWallets,
    ],
  );

  return React.createElement(WalletContext.Provider, { value: contextValue }, children);
};
