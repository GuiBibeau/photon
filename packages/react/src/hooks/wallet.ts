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
 * useWallet hook interface
 */
export interface UseWalletResult {
  // State
  connected: boolean;
  connecting: boolean;
  publicKey: Address | null;
  wallet: string | null;
  error: Error | null;

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

  // Auto-connect functionality
  const autoConnect = useCallback(async () => {
    try {
      setLocalError(null);

      // Try to auto-connect using saved session
      if (context.autoConnect) {
        // Check if we have a saved session in localStorage
        const savedWallet = localStorage.getItem('photon_wallet_name');
        const savedTimestamp = localStorage.getItem('photon_wallet_timestamp');

        if (savedWallet && savedTimestamp) {
          const timestamp = parseInt(savedTimestamp, 10);
          const elapsed = Date.now() - timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours

          if (elapsed < maxAge) {
            // Check if wallet is available
            const wallet = availableWallets.find((w) => w.name === savedWallet && w.isInstalled);

            if (wallet) {
              await connect(savedWallet, { onlyIfTrusted: true });
              return;
            }
          }
        }
      }
    } catch (_err) {
      // Silent failure for auto-connect - no logging needed
    }
  }, [context.autoConnect, availableWallets, connect]);

  // Save wallet selection for auto-connect
  useEffect(() => {
    if (context.connected && walletName) {
      localStorage.setItem('photon_wallet_name', walletName);
      localStorage.setItem('photon_wallet_timestamp', Date.now().toString());
    } else if (!context.connected) {
      localStorage.removeItem('photon_wallet_name');
      localStorage.removeItem('photon_wallet_timestamp');
    }
  }, [context.connected, walletName]);

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

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (context.autoConnect && !context.connected && !context.connecting) {
      autoConnect();
    }
  }, [context.autoConnect, context.connected, context.connecting, autoConnect]);

  return {
    // State
    connected: context.connected,
    connecting: context.connecting,
    publicKey: context.publicKey,
    wallet: walletName,
    error,

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

    // Utility methods
    refreshWallets,
    clearError,
  };
}
