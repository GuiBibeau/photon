import { useState, useCallback, useEffect, useRef } from 'react';
import type { Address } from '@photon/addresses';
import { useWalletContext } from '../providers';

/**
 * useBalance hook configuration
 */
export interface UseBalanceConfig {
  /** Enable auto-refresh at specified interval (in milliseconds) */
  refreshInterval?: number;
  /** Use WebSocket subscription for real-time updates (when available) */
  enableSubscription?: boolean;
  /** Custom RPC commitment level */
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

/**
 * useBalance hook interface
 */
export interface UseBalanceResult {
  /** Balance in SOL (not lamports) */
  balance: number | null;
  /** Balance in lamports */
  lamports: bigint | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Manually refetch balance */
  refetch(): Promise<void>;
  /** Last update timestamp */
  lastUpdate: Date | null;
}

/**
 * Convert lamports to SOL
 */
const LAMPORTS_PER_SOL = 1_000_000_000n;

function lamportsToSol(lamports: bigint): number {
  // Convert to SOL with proper decimal handling
  const sol = Number(lamports) / Number(LAMPORTS_PER_SOL);
  // Round to 9 decimal places to avoid floating point issues
  return Math.round(sol * 1e9) / 1e9;
}

/**
 * Hook for fetching and monitoring SOL balance
 *
 * @param address - Address to fetch balance for (defaults to connected wallet)
 * @param config - Hook configuration options
 * @returns Balance information and refetch function
 *
 * @example
 * ```tsx
 * function BalanceDisplay() {
 *   const { balance, isLoading, error, refetch } = useBalance();
 *
 *   if (isLoading) return <div>Loading balance...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <p>Balance: {balance} SOL</p>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With auto-refresh every 10 seconds
 * function AutoRefreshBalance() {
 *   const { balance } = useBalance(undefined, {
 *     refreshInterval: 10000
 *   });
 *   return <div>{balance} SOL</div>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Check balance of specific address
 * function AddressBalance({ address }: { address: Address }) {
 *   const { balance, lamports } = useBalance(address);
 *   return (
 *     <div>
 *       <p>{balance} SOL</p>
 *       <p>{lamports} lamports</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBalance(address?: Address, config?: UseBalanceConfig): UseBalanceResult {
  const { publicKey, rpc, commitment: defaultCommitment } = useWalletContext();
  const [balance, setBalance] = useState<number | null>(null);
  const [lamports, setLamports] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Use provided address or connected wallet's public key
  const targetAddress = address || publicKey;

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Store interval ID for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Store subscription ID for cleanup (future WebSocket implementation)
  const subscriptionRef = useRef<number | null>(null);

  // Cache key to detect address changes
  const cacheKeyRef = useRef<string | null>(null);

  // Commitment level to use
  const commitment = config?.commitment || defaultCommitment;

  // Fetch balance function
  const fetchBalance = useCallback(async () => {
    if (!targetAddress || !rpc) {
      setBalance(null);
      setLamports(null);
      setError(null);
      setLastUpdate(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Call RPC to get balance
      const response = await rpc.getBalance(targetAddress, { commitment });

      if (!isMountedRef.current) {
        return;
      }

      // Response.value contains the balance in lamports as bigint
      const balanceLamports = response.value;

      // Convert to SOL
      const balanceSol = lamportsToSol(balanceLamports);

      setLamports(balanceLamports);
      setBalance(balanceSol);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }

      const error = err instanceof Error ? err : new Error('Failed to fetch balance');
      setError(error);
      setBalance(null);
      setLamports(null);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [targetAddress, rpc, commitment]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  // Effect to fetch balance on mount and when address changes
  useEffect(() => {
    const addressKey = targetAddress?.toString() || null;

    // Check if address has changed
    if (cacheKeyRef.current !== addressKey) {
      cacheKeyRef.current = addressKey;

      // Reset state when address changes
      setBalance(null);
      setLamports(null);
      setError(null);
      setLastUpdate(null);

      // Fetch new balance
      if (addressKey) {
        fetchBalance();
      }
    }
  }, [targetAddress, fetchBalance]);

  // Effect for auto-refresh interval
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up new interval if configured
    if (config?.refreshInterval && targetAddress && rpc) {
      intervalRef.current = setInterval(() => {
        fetchBalance();
      }, config.refreshInterval);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [config?.refreshInterval, targetAddress, rpc, fetchBalance]);

  // Effect for WebSocket subscription (placeholder for future implementation)
  useEffect(() => {
    if (!config?.enableSubscription || !targetAddress || !rpc) {
      return;
    }

    // TODO: Implement WebSocket subscription when RPC subscriptions package is ready
    // This will be implemented in task RW-10 part 3
    // For now, we'll use polling as a fallback

    return () => {
      // Cleanup subscription when component unmounts
      if (subscriptionRef.current !== null) {
        // TODO: Unsubscribe from WebSocket
        subscriptionRef.current = null;
      }
    };
  }, [config?.enableSubscription, targetAddress, rpc]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Clear subscription
      if (subscriptionRef.current !== null) {
        // TODO: Unsubscribe from WebSocket
        subscriptionRef.current = null;
      }
    };
  }, []);

  return {
    balance,
    lamports,
    isLoading,
    error,
    refetch,
    lastUpdate,
  };
}

/**
 * Hook for fetching multiple balances in a single request
 *
 * @param addresses - Array of addresses to fetch balances for
 * @param config - Hook configuration options
 * @returns Map of addresses to balance information
 *
 * @example
 * ```tsx
 * function MultipleBalances({ addresses }: { addresses: Address[] }) {
 *   const balances = useMultipleBalances(addresses);
 *
 *   return (
 *     <div>
 *       {addresses.map(addr => (
 *         <div key={addr}>
 *           {addr}: {balances.get(addr)?.balance || 0} SOL
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMultipleBalances(
  addresses: Address[],
  config?: UseBalanceConfig,
): Map<string, { balance: number; lamports: bigint }> {
  const { rpc, commitment: defaultCommitment } = useWalletContext();
  const [balances, setBalances] = useState<Map<string, { balance: number; lamports: bigint }>>(
    new Map(),
  );

  const commitment = config?.commitment || defaultCommitment;

  const fetchBalances = useCallback(async () => {
    if (!rpc || addresses.length === 0) {
      setBalances(new Map());
      return;
    }

    try {
      // Batch fetch balances using multiple RPC calls
      // TODO: When getMultipleAccounts is available, use that instead
      const balancePromises = addresses.map(async (addr) => {
        try {
          const response = await rpc.getBalance(addr, { commitment });
          return { address: addr.toString(), lamports: response.value };
        } catch {
          return { address: addr.toString(), lamports: 0n };
        }
      });

      const results = await Promise.all(balancePromises);

      const newBalances = new Map<string, { balance: number; lamports: bigint }>();
      results.forEach(({ address, lamports }) => {
        newBalances.set(address, {
          balance: lamportsToSol(lamports),
          lamports,
        });
      });

      setBalances(newBalances);
    } catch {
      // Silently fail and keep existing balances
    }
  }, [addresses, rpc, commitment]);

  // Fetch on mount and when addresses change
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Auto-refresh interval
  useEffect(() => {
    if (!config?.refreshInterval) {
      return;
    }

    const interval = setInterval(fetchBalances, config.refreshInterval);
    return () => clearInterval(interval);
  }, [config?.refreshInterval, fetchBalances]);

  return balances;
}
