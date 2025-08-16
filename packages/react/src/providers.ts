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
import type { RpcClient, Commitment } from '@photon/rpc';
import { createSolanaRpc } from '@photon/rpc';
import type {
  WalletProvider as WalletProviderInterface,
  DetectedWallet,
  WalletConnectionOptions,
} from './types';
import { createWalletConnectionManager, type ConnectionManagerConfig } from './wallet/connection';
import { detectWallets } from './wallet/detector';
import type { createSessionStorage } from './wallet/session-storage';

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
  sessionStorage?: ReturnType<typeof createSessionStorage>;
  connectionConfig?: ConnectionManagerConfig;
  rpc: RpcClient | null;
  rpcEndpoint: string | null;
  commitment: Commitment;

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
  rpcEndpoint?: string;
  commitment?: Commitment;
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
  rpcEndpoint = 'https://api.mainnet-beta.solana.com',
  commitment = 'confirmed',
}) => {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<Address | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  // Create RPC client instance
  const rpc = useMemo(() => {
    if (!rpcEndpoint) {
      return null;
    }
    return createSolanaRpc(rpcEndpoint, { commitment });
  }, [rpcEndpoint, commitment]);

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
          timeout: 500, // Reduced from 3000ms for faster initial detection
          pollInterval: 50, // Check more frequently
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
      console.log('[Provider Event] handleConnect fired:', {
        walletName,
        publicKey: pk?.toString(),
      });

      // Check if we're explicitly disconnected
      if (connectionManager.sessionStorage?.isExplicitlyDisconnected()) {
        console.log('[Provider Event] Ignoring connect - explicitly disconnected');
        return;
      }

      // Save connection state
      connectionManager.sessionStorage?.setConnectionState(true, walletName);

      setSelectedWallet(walletName);
      setPublicKey(pk);
      setConnected(true);
      setConnecting(false);
      setError(null);
    };

    const handleDisconnect = () => {
      console.log('[Provider Event] handleDisconnect fired');
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

  // Auto-connect when wallets are available
  useEffect(() => {
    // Skip if already attempted or no wallets
    if (autoConnectAttempted || wallets.length === 0) {
      if (wallets.length === 0) {
        console.log('[Provider Auto-connect] No wallets detected yet, waiting...');
      }
      return;
    }

    // Check if user explicitly disconnected (persists across page refreshes)
    const isExplicitlyDisconnected = connectionManager.sessionStorage?.isExplicitlyDisconnected();
    const shouldAutoConnect = autoConnect || connectionManager.sessionStorage?.getAutoConnect();

    console.log('[Provider Auto-connect]', {
      shouldAutoConnect,
      connected,
      connecting,
      walletsAvailable: wallets.length,
      hasLastWallet: !!connectionManager.sessionStorage?.getLastWallet(),
      explicitlyDisconnected: isExplicitlyDisconnected,
    });

    // Skip auto-connect if user manually disconnected
    if (isExplicitlyDisconnected) {
      console.log('[Provider] Skipping auto-connect - user explicitly disconnected');
      setAutoConnectAttempted(true); // Mark as attempted to prevent future attempts
      return;
    }

    if (shouldAutoConnect && !connected && !connecting) {
      setAutoConnectAttempted(true); // Mark as attempted

      const performAutoConnect = async () => {
        try {
          console.log('[Provider] Starting auto-connect...');
          setConnecting(true);
          await connectionManager.autoConnect();
          console.log('[Provider] Auto-connect completed');
        } catch (err) {
          console.log('[Provider] Auto-connect failed:', err);
        } finally {
          setConnecting(false);
        }
      };

      // Small delay to let wallet registration complete
      setTimeout(performAutoConnect, 100);
    }
  }, [wallets.length, autoConnectAttempted, autoConnect, connected, connecting, connectionManager]); // Run when wallets are detected

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
        // Clear explicitly disconnected flag when manually connecting
        connectionManager.sessionStorage?.setExplicitlyDisconnected(false);
        console.log('[Provider.connect] Cleared explicitly disconnected flag');

        setConnecting(true);
        setError(null);
        await connectionManager.connect(targetWallet, options);

        // Save connection state
        connectionManager.sessionStorage?.setConnectionState(true, targetWallet);
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
    console.log('[Provider.disconnect] Starting disconnect');
    console.log('[Provider.disconnect] Current state:', { connected, connecting, disconnecting });

    // Set explicitly disconnected flag FIRST
    connectionManager.sessionStorage?.setExplicitlyDisconnected(true);
    console.log('[Provider.disconnect] Set explicitly disconnected flag');

    try {
      setDisconnecting(true);
      setError(null);
      console.log('[Provider.disconnect] Calling connectionManager.disconnect()');
      await connectionManager.disconnect();
      console.log('[Provider.disconnect] connectionManager.disconnect() completed');
      setSelectedWallet(null);
      console.log('[Provider.disconnect] Reset selectedWallet to null');

      // Clear connection state
      connectionManager.sessionStorage?.setConnectionState(false);
    } catch (err) {
      console.error('[Provider.disconnect] Error:', err);
      const error = err instanceof Error ? err : new Error('Disconnection failed');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setDisconnecting(false);
      console.log('[Provider.disconnect] Finished, disconnecting set to false');
    }
  }, [connectionManager, onError, connected, connecting, disconnecting]);

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
      sessionStorage: connectionManager.sessionStorage,
      connectionConfig: connectionConfig ?? ({} as ConnectionManagerConfig),
      rpc,
      rpcEndpoint,
      commitment,
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
      connectionManager.sessionStorage,
      connectionConfig,
      rpc,
      rpcEndpoint,
      commitment,
      select,
      connect,
      disconnect,
      refreshWallets,
    ],
  );

  return React.createElement(WalletContext.Provider, { value: contextValue }, children);
};
