import { useCallback, useRef, useState } from 'react';
import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { Signer } from '@photon/signers';
import type { CompileableTransactionMessage } from '@photon/transaction-messages';
import {
  signTransaction,
  partiallySignTransaction,
  addSignaturesToTransaction,
  isFullySigned,
  getMissingSigners,
  type Transaction,
  type PartialSignResult,
  type SignTransactionOptions,
} from '@photon/transactions';
import { useWallet } from './wallet';
import { useWalletContext } from '../providers';
import { walletToSigner } from '../wallet/signer-adapter';
import { detectMobilePlatform } from '../wallet/detector';

/**
 * Transaction signing state
 */
export type TransactionSigningState = 'idle' | 'preparing' | 'signing' | 'signed' | 'failed';

/**
 * Batch signing result
 */
export interface BatchSigningResult {
  transactions: Transaction[];
  failedIndices: number[];
  errors: Map<number, Error>;
}

/**
 * Mobile signing context
 */
export interface MobileSigningContext {
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  isInAppBrowser: boolean;
  requiresAppSwitch: boolean;
  sessionId: string | undefined;
}

/**
 * Transaction version support
 */
export type TransactionVersion = 'legacy' | 'versioned';

/**
 * Transaction signing options with enhanced features
 */
export interface EnhancedSigningOptions extends SignTransactionOptions {
  /**
   * Support for versioned transactions
   * @default 'legacy'
   */
  version?: TransactionVersion;

  /**
   * Whether to handle address lookup tables
   * @default false
   */
  handleAddressLookupTables?: boolean;

  /**
   * Timeout for signing operation (ms)
   * @default 30000
   */
  timeout?: number;

  /**
   * Mobile-specific options
   */
  mobile?: {
    handleAppSwitch?: boolean;
    preserveState?: boolean;
    returnUrl?: string;
  };
}

/**
 * useTransactionSigner hook result
 */
export interface UseTransactionSignerResult {
  // State
  state: TransactionSigningState;
  isSigningTransaction: boolean;
  error: Error | null;

  // Current transaction
  currentTransaction: Transaction | null;
  isSigned: boolean;
  missingSigners: Address[];

  // Mobile context
  mobileContext: MobileSigningContext;

  // Sign single transaction
  signTransaction(
    message: CompileableTransactionMessage,
    options?: EnhancedSigningOptions,
  ): Promise<Transaction>;

  // Sign with additional signers
  signWithSigners(
    message: CompileableTransactionMessage,
    additionalSigners: Signer[],
    options?: EnhancedSigningOptions,
  ): Promise<Transaction>;

  // Batch signing
  signBatch(
    messages: CompileableTransactionMessage[],
    options?: EnhancedSigningOptions,
  ): Promise<BatchSigningResult>;

  // Partial signing for multi-sig
  partialSign(
    message: CompileableTransactionMessage,
    signers?: Signer[],
  ): Promise<PartialSignResult>;

  // Add signatures to existing transaction
  addSignatures(transaction: Transaction, signatures: Map<Address, Signature>): Transaction;

  // Utility methods
  clearError(): void;
  reset(): void;
}

/**
 * Hook for transaction signing with wallet integration
 * Implements RW-8: Build transaction signer from react-tasks.md
 *
 * @example
 * ```tsx
 * function TransferButton() {
 *   const { signTransaction, state, error } = useTransactionSigner();
 *   const [recipient, setRecipient] = useState('');
 *
 *   const handleTransfer = async () => {
 *     try {
 *       // Build transaction message with SDK
 *       const message = createTransactionMessage({
 *         instructions: [
 *           createTransferInstruction(...)
 *         ],
 *         feePayer: wallet.publicKey,
 *         recentBlockhash: blockhash
 *       });
 *
 *       // Sign transaction
 *       const signedTx = await signTransaction(message);
 *
 *       // Send transaction...
 *     } catch (error) {
 *       console.error('Failed to sign:', error);
 *     }
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleTransfer}
 *       disabled={state === 'signing'}
 *     >
 *       {state === 'signing' ? 'Signing...' : 'Transfer'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTransactionSigner(): UseTransactionSignerResult {
  const { connected, publicKey } = useWallet();
  const context = useWalletContext();
  const [state, setState] = useState<TransactionSigningState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);

  // Mobile context detection
  const mobileContext = useRef<MobileSigningContext>({
    platform: (() => {
      const platform = detectMobilePlatform();
      return platform.platform;
    })(),
    isInAppBrowser: /webview|wv/i.test(navigator.userAgent),
    requiresAppSwitch: (() => {
      const platform = detectMobilePlatform();
      return (
        (platform.platform === 'ios' || platform.platform === 'android') &&
        !/webview|wv/i.test(navigator.userAgent)
      );
    })(),
    sessionId: (() => {
      const platform = detectMobilePlatform();
      const requiresAppSwitch =
        (platform.platform === 'ios' || platform.platform === 'android') &&
        !/webview|wv/i.test(navigator.userAgent);
      return requiresAppSwitch ? generateSessionId() : undefined;
    })(),
  }).current;

  // Get wallet signer
  const getWalletSigner = useCallback((): Signer => {
    if (!connected || !context.wallet || !publicKey) {
      throw new Error('Wallet not connected');
    }

    // Convert wallet provider to SDK Signer interface
    return walletToSigner(context.wallet);
  }, [connected, context.wallet, publicKey]);

  // Sign transaction with wallet
  const signTransactionWithWallet = useCallback(
    async (
      message: CompileableTransactionMessage,
      options: EnhancedSigningOptions = {},
    ): Promise<Transaction> => {
      try {
        setState('preparing');
        setError(null);

        // Get wallet signer
        const walletSigner = getWalletSigner();

        // Handle mobile app switching if needed
        if (mobileContext.requiresAppSwitch && options.mobile?.handleAppSwitch) {
          // Save state before app switch
          if (options.mobile.preserveState && mobileContext.sessionId) {
            saveSigningState(mobileContext.sessionId, message);
          }
        }

        setState('signing');

        // Create signing promise with timeout
        const timeout = options.timeout || 30000;
        const signingOptions: SignTransactionOptions = {};
        if (options.abortOnError !== undefined) {
          signingOptions.abortOnError = options.abortOnError;
        }
        if (options.verifySignatures !== undefined) {
          signingOptions.verifySignatures = options.verifySignatures;
        }
        const signingPromise = signTransaction([walletSigner], message, signingOptions);

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Transaction signing timeout')), timeout);
        });

        // Sign with timeout
        const signedTransaction = await Promise.race([signingPromise, timeoutPromise]);

        setCurrentTransaction(signedTransaction);
        setState('signed');

        // Handle mobile return
        if (mobileContext.requiresAppSwitch && options.mobile?.returnUrl) {
          // Redirect back to app after signing
          window.location.href = options.mobile.returnUrl;
        }

        return signedTransaction;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to sign transaction');
        setError(error);
        setState('failed');
        throw error;
      }
    },
    [getWalletSigner, mobileContext],
  );

  // Sign with additional signers
  const signWithSigners = useCallback(
    async (
      message: CompileableTransactionMessage,
      additionalSigners: Signer[],
      options: EnhancedSigningOptions = {},
    ): Promise<Transaction> => {
      try {
        setState('preparing');
        setError(null);

        // Combine wallet signer with additional signers
        const walletSigner = getWalletSigner();
        const allSigners = [walletSigner, ...additionalSigners];

        setState('signing');

        // Sign with all signers
        const signingOptions: SignTransactionOptions = {};
        if (options.abortOnError !== undefined) {
          signingOptions.abortOnError = options.abortOnError;
        }
        if (options.verifySignatures !== undefined) {
          signingOptions.verifySignatures = options.verifySignatures;
        }
        const signedTransaction = await signTransaction(allSigners, message, signingOptions);

        setCurrentTransaction(signedTransaction);
        setState('signed');

        return signedTransaction;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to sign with multiple signers');
        setError(error);
        setState('failed');
        throw error;
      }
    },
    [getWalletSigner],
  );

  // Batch signing
  const signBatch = useCallback(
    async (
      messages: CompileableTransactionMessage[],
      options: EnhancedSigningOptions = {},
    ): Promise<BatchSigningResult> => {
      try {
        setState('preparing');
        setError(null);

        const walletSigner = getWalletSigner();
        const transactions: Transaction[] = [];
        const failedIndices: number[] = [];
        const errors = new Map<number, Error>();

        setState('signing');

        // Sign each transaction
        for (let i = 0; i < messages.length; i++) {
          try {
            const batchSigningOptions: SignTransactionOptions = {
              abortOnError: false, // Continue with other transactions
            };
            if (options.verifySignatures !== undefined) {
              batchSigningOptions.verifySignatures = options.verifySignatures;
            }
            const message = messages[i];
            if (!message) {
              continue;
            }
            const signedTx = await signTransaction([walletSigner], message, batchSigningOptions);
            transactions.push(signedTx);
          } catch (err) {
            const error = err instanceof Error ? err : new Error(`Failed to sign transaction ${i}`);
            errors.set(i, error);
            failedIndices.push(i);

            // Create empty transaction for failed signing
            const failedMessage = messages[i];
            if (failedMessage) {
              transactions.push({
                message: failedMessage,
                signatures: new Map(),
              });
            }

            if (options.abortOnError !== false) {
              setError(error);
              setState('failed');
              throw error;
            }
          }
        }

        setState(failedIndices.length > 0 ? 'failed' : 'signed');

        return {
          transactions,
          failedIndices,
          errors,
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Batch signing failed');
        setError(error);
        setState('failed');
        throw error;
      }
    },
    [getWalletSigner],
  );

  // Partial signing for multi-sig
  const partialSign = useCallback(
    async (
      message: CompileableTransactionMessage,
      signers?: Signer[],
    ): Promise<PartialSignResult> => {
      try {
        setState('preparing');
        setError(null);

        // Use provided signers or just wallet signer
        const signersToUse = signers || [getWalletSigner()];

        setState('signing');

        // Perform partial signing
        const result = await partiallySignTransaction(signersToUse, message);

        setCurrentTransaction(result.transaction);
        setState(result.failedSigners.length > 0 ? 'failed' : 'signed');

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Partial signing failed');
        setError(error);
        setState('failed');
        throw error;
      }
    },
    [getWalletSigner],
  );

  // Add signatures to existing transaction
  const addSignatures = useCallback(
    (transaction: Transaction, signatures: Map<Address, Signature>): Transaction => {
      const updatedTransaction = addSignaturesToTransaction(transaction, signatures);
      setCurrentTransaction(updatedTransaction);
      return updatedTransaction;
    },
    [],
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setCurrentTransaction(null);
  }, []);

  // Get missing signers for current transaction
  const missingSigners = currentTransaction ? getMissingSigners(currentTransaction) : [];

  // Check if current transaction is fully signed
  const isSigned = currentTransaction ? isFullySigned(currentTransaction) : false;

  return {
    // State
    state,
    isSigningTransaction: state === 'signing',
    error,

    // Current transaction
    currentTransaction,
    isSigned,
    missingSigners,

    // Mobile context
    mobileContext,

    // Methods
    signTransaction: signTransactionWithWallet,
    signWithSigners,
    signBatch,
    partialSign,
    addSignatures,
    clearError,
    reset,
  };
}

// Helper functions

/**
 * Generate session ID for mobile signing state preservation
 */
function generateSessionId(): string {
  return `sign_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Save signing state for mobile app switches
 */
function saveSigningState(sessionId: string, message: CompileableTransactionMessage): void {
  try {
    // Store minimal state that can be recovered
    sessionStorage.setItem(
      `photon_signing_${sessionId}`,
      JSON.stringify({
        timestamp: Date.now(),
        messageHash: hashMessage(message),
      }),
    );
  } catch (err) {
    console.warn('Failed to save signing state:', err);
  }
}

/**
 * Create a simple hash of the message for state recovery
 */
function hashMessage(message: CompileableTransactionMessage): string {
  // Simple hash for identification purposes
  const str = JSON.stringify({
    feePayer: message.feePayer,
    instructionCount: message.instructions?.length || 0,
  });

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash.toString(36);
}
