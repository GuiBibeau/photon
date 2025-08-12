import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { KeyPair } from '@photon/crypto';
import type { Address } from '@photon/addresses';
import { createSolanaRpc } from '@photon/rpc';
import { getBalance } from '../utils/faucet';

interface WalletState {
  keyPair: KeyPair | null;
  address: string;
  balance: number | null;
  name: string;
}

interface AppContextType {
  // RPC
  rpcUrl: string;
  setRpcUrl: (url: string) => void;
  rpc: ReturnType<typeof createSolanaRpc>;

  // Wallet
  wallet: WalletState | null;
  setWallet: (wallet: WalletState | null) => void;
  refreshBalance: () => Promise<void>;

  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [rpcUrl, setRpcUrl] = useState('https://api.devnet.solana.com');
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const rpc = createSolanaRpc(rpcUrl);

  const refreshBalance = useCallback(async () => {
    if (wallet?.address) {
      try {
        const balance = await getBalance(wallet.address as Address, rpcUrl);
        setWallet((prev) => (prev ? { ...prev, balance } : null));
      } catch (error) {
        console.error('Failed to refresh balance:', error);
        // Set balance to 0 if fetch fails
        setWallet((prev) => (prev ? { ...prev, balance: 0 } : null));
      }
    }
  }, [wallet?.address, rpcUrl]);

  // Refresh balance when wallet or RPC changes
  useEffect(() => {
    if (wallet?.address) {
      refreshBalance();
    }
  }, [wallet?.address, rpcUrl, refreshBalance]);

  // Auto-refresh balance every 10 seconds
  useEffect(() => {
    if (!wallet?.address) {
      return;
    }

    const interval = setInterval(() => {
      refreshBalance();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [wallet?.address, refreshBalance]);

  return (
    <AppContext.Provider
      value={{
        rpcUrl,
        setRpcUrl,
        rpc,
        wallet,
        setWallet,
        refreshBalance,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
