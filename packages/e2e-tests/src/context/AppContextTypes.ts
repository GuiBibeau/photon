import type { KeyPair } from '@photon/crypto';
import type { CryptoKeySigner } from '@photon/signers';
import type { createSolanaRpc } from '@photon/rpc';
import { createContext } from 'react';

export interface WalletState {
  keyPair: KeyPair | null;
  signer?: CryptoKeySigner;
  address: string;
  balance: number | null;
  name: string;
}

export interface AppContextType {
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

export const AppContext = createContext<AppContextType | undefined>(undefined);
