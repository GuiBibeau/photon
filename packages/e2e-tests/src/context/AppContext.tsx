import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { KeyPair } from '@photon/crypto';
import type { Address } from '@photon/addresses';
import type { CryptoKeySigner } from '@photon/signers';
import { createSolanaRpc } from '@photon/rpc';
import { getBalance } from '../utils/faucet';
import { importWalletFromPrivateKey } from '../utils/wallet-import';

interface WalletState {
  keyPair: KeyPair | null;
  signer?: CryptoKeySigner;
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
  const [privateKeyError, setPrivateKeyError] = useState<string | null>(null);

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

  // Load wallet from environment variable on mount
  useEffect(() => {
    const loadWalletFromEnv = async () => {
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;

      if (!privateKey) {
        console.log('No VITE_PRIVATE_KEY environment variable found');
        return;
      }

      setIsLoading(true);
      setPrivateKeyError(null);

      try {
        console.log('Loading wallet from environment variable...');
        const { signer, address } = await importWalletFromPrivateKey(privateKey);

        // Get initial balance
        const balance = await getBalance(address, rpcUrl);

        setWallet({
          keyPair: null, // No KeyPair for imported wallets
          signer,
          address: address as string,
          balance,
          name: 'Imported Wallet',
        });

        console.log('Wallet loaded successfully:', address);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to load wallet from environment variable:', errorMessage);
        setPrivateKeyError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletFromEnv();
  }, []); // Only run once on mount

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
      {privateKeyError && (
        <div
          style={{
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            padding: '12px',
            margin: '12px',
            color: '#c00',
          }}
        >
          <strong>Warning:</strong> Failed to load wallet from VITE_PRIVATE_KEY: {privateKeyError}
        </div>
      )}
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
