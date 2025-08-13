import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Address } from '@photon/addresses';
import type { DetectedWallet, WalletConnectionOptions, WalletReadyState } from '../types';
import { useWalletContext } from '../providers';
import { detectMobilePlatform } from '../wallet/detector';

/**
 * Available wallet information
 */
export interface AvailableWallet {
  name: string;
  icon?: string | undefined;
  url?: string | undefined;
  readyState: WalletReadyState;
  isInstalled: boolean;
  isMobile: boolean;
  isCurrentPlatform: boolean;
}

/**
 * Auto-connect options
 */
export interface AutoConnectOptions {
  enabled: boolean;
  eagerness?: 'eager' | 'lazy';
  onlyIfTrusted?: boolean;
  timeout?: number;
}

/**
 * useWallet hook interface
 */
export interface UseWalletResult {
  // State
  connected: boolean;
  connecting: boolean;
  publicKey: Address | null;
  wallet: string | null;
  error: Error | null;
  autoConnecting: boolean;

  // Available wallets
  availableWallets: AvailableWallet[];

  // Platform detection
  isMobile: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';

  // Connection methods
  connect(walletName?: string): Promise<void>;
  disconnect(): Promise<void>;
  select(walletName: string): void;
  autoConnect(): Promise<void>;

  // Auto-connect control
  setAutoConnect(enabled: boolean): void;
  getAutoConnectPreference(): boolean;
  clearAutoConnectPreference(): void;

  // Utility methods
  refreshWallets(): Promise<void>;
  clearError(): void;
}

/**
 * Primary wallet connection hook
 * Manages wallet connection state and operations
 *
 * @example
 * ```tsx
 * function WalletButton() {
 *   const {
 *     connected,
 *     connecting,
 *     publicKey,
 *     availableWallets,
 *     connect,
 *     disconnect
 *   } = useWallet();
 *
 *   if (connected) {
 *     return (
 *       <button onClick={disconnect}>
 *         {publicKey?.slice(0, 8)}... Disconnect
 *       </button>
 *     );
 *   }
 *
 *   return (
 *     <div>
 *       {availableWallets.map(wallet => (
 *         <button
 *           key={wallet.name}
 *           onClick={() => connect(wallet.name)}
 *           disabled={connecting || !wallet.isInstalled}
 *         >
 *           Connect {wallet.name}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWallet(): UseWalletResult {
  const context = useWalletContext();
  const [localError, setLocalError] = useState<Error | null>(null);
  const [autoConnecting, setAutoConnecting] = useState(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  // Combine context error with local error
  const error = context.error || localError;

  // Platform detection
  const platformInfo = useMemo(() => {
    const detection = detectMobilePlatform();
    const isMobile = detection.platform === 'ios' || detection.platform === 'android';
    const platform = detection.platform === 'unknown' ? 'desktop' : detection.platform;
    return { isMobile, platform: platform as UseWalletResult['platform'] };
  }, []);

  // Process available wallets
  const availableWallets = useMemo<AvailableWallet[]>(() => {
    return context.wallets.map((detectedWallet: DetectedWallet) => {
      const { metadata } = detectedWallet;

      // Check if wallet is available on current platform
      let isCurrentPlatform = true;
      if (platformInfo.isMobile) {
        // On mobile, check if wallet supports mobile
        isCurrentPlatform = metadata.isMobile || false;
      } else {
        // On desktop, wallet should be installed
        isCurrentPlatform = metadata.isInstalled;
      }

      return {
        name: metadata.name,
        icon: metadata.icon,
        url: metadata.url,
        readyState: metadata.readyState,
        isInstalled: metadata.isInstalled,
        isMobile: metadata.isMobile || false,
        isCurrentPlatform,
      };
    });
  }, [context.wallets, platformInfo.isMobile]);

  // Get current wallet name
  const walletName = useMemo(() => {
    return context.wallet?.name || null;
  }, [context.wallet]);

  // Connect with error handling
  const connect = useCallback(
    async (walletName?: string, options?: WalletConnectionOptions) => {
      try {
        setLocalError(null);

        // If no wallet specified and none selected, try to select first available
        let targetWallet = walletName;
        if (!targetWallet && !context.wallet) {
          const firstAvailable = availableWallets.find((w) => w.isInstalled && w.isCurrentPlatform);
          if (firstAvailable) {
            context.select(firstAvailable.name);
            targetWallet = firstAvailable.name;
          }
        }

        await context.connect(targetWallet, options);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to connect');
        setLocalError(error);
        throw error;
      }
    },
    [context, availableWallets],
  );

  // Disconnect with error handling
  const disconnect = useCallback(async () => {
    try {
      setLocalError(null);
      await context.disconnect();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to disconnect');
      setLocalError(error);
      throw error;
    }
  }, [context]);

  // Select wallet
  const select = useCallback(
    (walletName: string) => {
      setLocalError(null);
      context.select(walletName);
    },
    [context],
  );

  // Auto-connect functionality with enhanced options
  const autoConnect = useCallback(async () => {
    // Prevent multiple auto-connect attempts
    if (autoConnecting || context.connected || context.connecting) {
      return;
    }

    try {
      setLocalError(null);
      setAutoConnecting(true);

      // Check if auto-connect is enabled in storage
      const autoConnectEnabled = context.sessionStorage?.getAutoConnect() || context.autoConnect;
      if (!autoConnectEnabled) {
        return;
      }

      // Get saved session from storage
      const sessions = context.sessionStorage?.getActiveSessions() || [];
      const lastWallet = context.sessionStorage?.getLastWallet();

      // Try to find a valid session
      let targetSession = null;
      if (sessions.length > 0) {
        // Sort by last activity and find most recent valid session
        const sortedSessions = sessions.sort((a, b) => b.lastActivity - a.lastActivity);
        targetSession = sortedSessions.find((session) => {
          const elapsed = Date.now() - session.createdAt;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours default expiry
          return elapsed < maxAge;
        });
      }

      // If no valid session but we have a last wallet, try that
      if (!targetSession && lastWallet) {
        const timestamp = localStorage.getItem('photon_wallet_timestamp');
        if (timestamp) {
          const elapsed = Date.now() - parseInt(timestamp, 10);
          const maxAge = 24 * 60 * 60 * 1000;
          if (elapsed < maxAge) {
            targetSession = { walletName: lastWallet };
          }
        }
      }

      if (targetSession) {
        // Check if wallet is available
        const wallet = availableWallets.find(
          (w) => w.name === targetSession.walletName && w.isInstalled && w.isCurrentPlatform,
        );

        if (wallet) {
          // Set timeout for auto-connect attempt (5 seconds default)
          const timeout = 5000;
          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error('Auto-connect timeout')), timeout);
          });

          // Attempt connection with onlyIfTrusted flag
          const connectPromise = connect(targetSession.walletName, { onlyIfTrusted: true });

          await Promise.race([connectPromise, timeoutPromise]);

          // Save successful connection
          context.sessionStorage?.saveLastWallet(targetSession.walletName);
          return;
        }
      }
    } catch (_err) {
      // Silent failure for auto-connect
      // Clear invalid session if needed
      if (_err instanceof Error && _err.message !== 'Auto-connect timeout') {
        localStorage.removeItem('photon_wallet_name');
        localStorage.removeItem('photon_wallet_timestamp');
      }
    } finally {
      setAutoConnecting(false);
      setAutoConnectAttempted(true);
    }
  }, [autoConnecting, context, availableWallets, connect]);

  // Save wallet selection for auto-connect
  useEffect(() => {
    if (context.connected && walletName) {
      // Save wallet preference
      localStorage.setItem('photon_wallet_name', walletName);
      localStorage.setItem('photon_wallet_timestamp', Date.now().toString());
      context.sessionStorage?.saveLastWallet(walletName);
    } else if (!context.connected) {
      // Only clear if user explicitly disconnected (not on page load)
      if (autoConnectAttempted) {
        localStorage.removeItem('photon_wallet_name');
        localStorage.removeItem('photon_wallet_timestamp');
      }
    }
  }, [context.connected, walletName, context.sessionStorage, autoConnectAttempted]);

  // Refresh wallets
  const refreshWallets = useCallback(async () => {
    try {
      setLocalError(null);
      await context.refreshWallets();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh wallets');
      setLocalError(error);
      throw error;
    }
  }, [context]);

  // Clear error
  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  // Set auto-connect preference
  const setAutoConnect = useCallback(
    (enabled: boolean) => {
      context.sessionStorage?.setAutoConnect(enabled);
      if (!enabled) {
        // Clear stored sessions when disabling auto-connect
        localStorage.removeItem('photon_wallet_name');
        localStorage.removeItem('photon_wallet_timestamp');
      }
    },
    [context.sessionStorage],
  );

  // Get auto-connect preference
  const getAutoConnectPreference = useCallback((): boolean => {
    return context.sessionStorage?.getAutoConnect() || false;
  }, [context.sessionStorage]);

  // Clear auto-connect preference
  const clearAutoConnectPreference = useCallback(() => {
    context.sessionStorage?.setAutoConnect(false);
    localStorage.removeItem('photon_wallet_name');
    localStorage.removeItem('photon_wallet_timestamp');
    context.sessionStorage?.clearAll();
  }, [context.sessionStorage]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (!autoConnectAttempted && !context.connected && !context.connecting) {
      // Check stored preference
      const storedAutoConnect = context.sessionStorage?.getAutoConnect();
      const shouldAutoConnect =
        storedAutoConnect !== undefined ? storedAutoConnect : context.autoConnect;

      if (shouldAutoConnect) {
        // Use eager or lazy connection based on configuration
        const eagerness = context.connectionConfig?.eagerness || 'lazy';

        if (eagerness === 'eager') {
          // Connect immediately
          autoConnect();
        } else {
          // Wait for wallets to be detected first
          if (availableWallets.length > 0) {
            autoConnect();
          }
        }
      } else {
        setAutoConnectAttempted(true);
      }
    }
  }, [
    autoConnectAttempted,
    context.connected,
    context.connecting,
    context.autoConnect,
    context.sessionStorage,
    context.connectionConfig,
    availableWallets.length,
    autoConnect,
  ]);

  return {
    // State
    connected: context.connected,
    connecting: context.connecting,
    publicKey: context.publicKey,
    wallet: walletName,
    error,
    autoConnecting,

    // Available wallets
    availableWallets,

    // Platform detection
    isMobile: platformInfo.isMobile,
    platform: platformInfo.platform,

    // Connection methods
    connect,
    disconnect,
    select,
    autoConnect,

    // Auto-connect control
    setAutoConnect,
    getAutoConnectPreference,
    clearAutoConnectPreference,

    // Utility methods
    refreshWallets,
    clearError,
  };
}
