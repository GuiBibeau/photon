import { useState, useCallback } from 'react';
import type { Address } from '@photon/addresses';
import type { TokenBalance } from '../types';

/**
 * useTokenBalances hook interface
 */
export interface UseTokenBalancesResult {
  tokens: TokenBalance[];
  isLoading: boolean;
  totalValue: number;
  refetch(): void;
}

/**
 * Hook for fetching all SPL token balances
 */
export function useTokenBalances(): UseTokenBalancesResult {
  // Placeholder implementation - will be completed in RW-15
  const [tokens] = useState<TokenBalance[]>([]);
  const [isLoading] = useState(false);
  const [totalValue] = useState(0);

  const refetch = useCallback(() => {
    // Implementation to follow
  }, []);

  return {
    tokens,
    isLoading,
    totalValue,
    refetch,
  };
}

/**
 * useSendToken hook interface
 */
export interface UseSendTokenResult {
  sendToken(mint: Address, to: Address, amount: number): Promise<string>;
  isLoading: boolean;
  requiresATACreation: boolean;
  estimatedFee: number;
}

/**
 * Hook for sending SPL tokens
 */
export function useSendToken(): UseSendTokenResult {
  // Placeholder implementation - will be completed in RW-16
  const [isLoading] = useState(false);
  const [requiresATACreation] = useState(false);
  const [estimatedFee] = useState(0);

  const sendToken = useCallback(
    async (_mint: Address, _to: Address, _amount: number): Promise<string> => {
      // Implementation to follow
      return '';
    },
    [],
  );

  return {
    sendToken,
    isLoading,
    requiresATACreation,
    estimatedFee,
  };
}
