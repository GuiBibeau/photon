import { useCallback, useRef, useState } from 'react';
import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import { verifySignature as verifySig, isValidSignature } from '@photon/crypto';
import type { SignInMessage, SignInOutput } from '../types';
import { useWallet } from './wallet';
import { useWalletContext } from '../providers';
import { detectMobilePlatform } from '../wallet/detector';

/**
 * Message signing state
 */
export type MessageSigningState = 'idle' | 'signing' | 'signed' | 'failed';

/**
 * SIWS (Sign-In with Solana) message builder options
 */
export interface SIWSMessageOptions {
  domain: string;
  address: Address;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

/**
 * Message signing options
 */
export interface SignMessageOptions {
  /**
   * Display format for the message in wallet UI
   * @default 'utf8'
   */
  display?: 'utf8' | 'hex';

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
 * Signature verification result
 */
export interface SignatureVerificationResult {
  isValid: boolean;
  publicKey: Address | null;
  error?: Error;
}

/**
 * useSignMessage hook result
 */
export interface UseSignMessageResult {
  // State
  state: MessageSigningState;
  isSigningMessage: boolean;
  error: Error | null;

  // Current signing context
  currentMessage: Uint8Array | null;
  currentSignature: Signature | null;

  // Core functions
  signMessage(message: string | Uint8Array, options?: SignMessageOptions): Promise<Signature>;
  signInWithSolana(options?: Partial<SIWSMessageOptions>): Promise<SignInOutput>;
  verifySignature(
    message: string | Uint8Array,
    signature: Signature,
    publicKey?: Address,
  ): Promise<SignatureVerificationResult>;

  // SIWS utilities
  buildSIWSMessage(options: SIWSMessageOptions): string;
  parseSIWSMessage(message: string): Partial<SIWSMessageOptions>;

  // State management
  reset(): void;
  clearError(): void;
}

/**
 * Hook for message signing operations
 * Handles both simple message signing and Sign-In with Solana (SIWS) flows
 *
 * @example
 * ```tsx
 * function SignMessageButton() {
 *   const { signMessage, signInWithSolana, verifySignature, state, error } = useSignMessage();
 *   const { publicKey } = useWallet();
 *
 *   // Simple message signing
 *   const handleSign = async () => {
 *     try {
 *       const signature = await signMessage('Hello Solana!');
 *       console.log('Signature:', signature);
 *     } catch (err) {
 *       console.error('Failed to sign:', err);
 *     }
 *   };
 *
 *   // Sign-In with Solana
 *   const handleSignIn = async () => {
 *     try {
 *       const result = await signInWithSolana({
 *         domain: window.location.host,
 *         statement: 'Sign in to our app',
 *       });
 *       console.log('Signed in:', result.account.address);
 *     } catch (err) {
 *       console.error('Sign-in failed:', err);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleSign} disabled={state === 'signing'}>
 *         Sign Message
 *       </button>
 *       <button onClick={handleSignIn} disabled={state === 'signing'}>
 *         Sign In with Solana
 *       </button>
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSignMessage(): UseSignMessageResult {
  const context = useWalletContext();
  const { connected, publicKey } = useWallet();

  // State
  const [state, setState] = useState<MessageSigningState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [currentMessage, setCurrentMessage] = useState<Uint8Array | null>(null);
  const [currentSignature, setCurrentSignature] = useState<Signature | null>(null);

  // Mobile context
  const mobileContext = useRef({
    sessionId: undefined as string | undefined,
    statePreserved: false,
  });

  // Platform detection
  const platform = detectMobilePlatform();

  /**
   * Convert string message to Uint8Array
   */
  const encodeMessage = useCallback((message: string | Uint8Array): Uint8Array => {
    if (typeof message === 'string') {
      return new TextEncoder().encode(message);
    }
    return message;
  }, []);

  /**
   * Sign a message
   */
  const signMessage = useCallback(
    async (message: string | Uint8Array, options: SignMessageOptions = {}): Promise<Signature> => {
      if (!connected || !context.wallet) {
        throw new Error('Wallet not connected');
      }

      if (!context.wallet.signMessage) {
        throw new Error('Wallet does not support message signing');
      }

      const { timeout = 30000, mobile = {} } = options;

      try {
        setState('signing');
        setError(null);

        // Encode message
        const messageBytes = encodeMessage(message);
        setCurrentMessage(messageBytes);

        // Handle mobile-specific logic
        const isMobile = platform.platform === 'ios' || platform.platform === 'android';
        if (isMobile && mobile.handleAppSwitch) {
          // Save state for recovery after app switch
          if (mobile.preserveState) {
            mobileContext.current.sessionId = crypto.randomUUID();
            mobileContext.current.statePreserved = true;

            // Store in session storage for recovery
            sessionStorage.setItem(
              'photon_signing_session',
              JSON.stringify({
                sessionId: mobileContext.current.sessionId,
                message: Array.from(messageBytes),
                timestamp: Date.now(),
                returnUrl: mobile.returnUrl,
              }),
            );
          }
        }

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Message signing timeout')), timeout);
        });

        // Sign message with timeout
        const signPromise = context.wallet.signMessage(messageBytes);
        const signature = await Promise.race([signPromise, timeoutPromise]);

        // Validate signature format
        if (!isValidSignature(signature)) {
          throw new Error('Invalid signature format received from wallet');
        }

        setCurrentSignature(signature);
        setState('signed');

        // Clear mobile session if successful
        if (mobileContext.current.statePreserved) {
          sessionStorage.removeItem('photon_signing_session');
          mobileContext.current.statePreserved = false;
        }

        return signature;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to sign message');
        setError(error);
        setState('failed');
        throw error;
      }
    },
    [connected, context.wallet, encodeMessage, platform.platform],
  );

  /**
   * Build a SIWS message according to the standard format
   */
  const buildSIWSMessage = useCallback((options: SIWSMessageOptions): string => {
    const {
      domain,
      address,
      statement,
      uri,
      version = '1',
      chainId = 'mainnet',
      nonce,
      issuedAt,
      expirationTime,
      notBefore,
      requestId,
      resources,
    } = options;

    const lines: string[] = [];

    // Required fields
    lines.push(`${domain} wants you to sign in with your Solana account:`);
    lines.push(address.toString());

    // Optional statement
    if (statement) {
      lines.push('');
      lines.push(statement);
    }

    lines.push('');

    // Optional URI
    if (uri) {
      lines.push(`URI: ${uri}`);
    }

    // Version
    lines.push(`Version: ${version}`);

    // Chain ID
    lines.push(`Chain ID: ${chainId}`);

    // Nonce (generate if not provided)
    const finalNonce = nonce || generateNonce();
    lines.push(`Nonce: ${finalNonce}`);

    // Issued At (use current time if not provided)
    const finalIssuedAt = issuedAt || new Date().toISOString();
    lines.push(`Issued At: ${finalIssuedAt}`);

    // Optional fields
    if (expirationTime) {
      lines.push(`Expiration Time: ${expirationTime}`);
    }

    if (notBefore) {
      lines.push(`Not Before: ${notBefore}`);
    }

    if (requestId) {
      lines.push(`Request ID: ${requestId}`);
    }

    // Resources
    if (resources && resources.length > 0) {
      lines.push('Resources:');
      resources.forEach((resource) => {
        lines.push(`- ${resource}`);
      });
    }

    return lines.join('\n');
  }, []);

  /**
   * Parse a SIWS message to extract its components
   */
  const parseSIWSMessage = useCallback((message: string): Partial<SIWSMessageOptions> => {
    const lines = message.split('\n');
    const result: Partial<SIWSMessageOptions> = {};

    // Parse domain and address from first two lines
    const domainMatch = lines[0]?.match(/^(.+) wants you to sign in with your Solana account:$/);
    if (domainMatch && domainMatch[1]) {
      result.domain = domainMatch[1];
    }

    if (lines[1]) {
      // Address is on the second line
      result.address = lines[1] as Address;
    }

    // Parse statement (between address and empty line before fields)
    let statementStart = 2;
    let statementEnd = 2;
    for (let i = 2; i < lines.length; i++) {
      if (lines[i] === '') {
        if (i > 2 && lines[i - 1] && lines[i - 1] !== '') {
          statementEnd = i;
          break;
        }
        statementStart = i + 1;
      }
    }

    if (statementEnd > statementStart) {
      result.statement = lines.slice(statementStart, statementEnd).join('\n');
    }

    // Parse fields
    lines.forEach((line) => {
      if (line.startsWith('URI: ')) {
        result.uri = line.substring(5);
      } else if (line.startsWith('Version: ')) {
        result.version = line.substring(9);
      } else if (line.startsWith('Chain ID: ')) {
        result.chainId = line.substring(10);
      } else if (line.startsWith('Nonce: ')) {
        result.nonce = line.substring(7);
      } else if (line.startsWith('Issued At: ')) {
        result.issuedAt = line.substring(11);
      } else if (line.startsWith('Expiration Time: ')) {
        result.expirationTime = line.substring(17);
      } else if (line.startsWith('Not Before: ')) {
        result.notBefore = line.substring(12);
      } else if (line.startsWith('Request ID: ')) {
        result.requestId = line.substring(12);
      }
    });

    // Parse resources
    const resourcesIndex = lines.indexOf('Resources:');
    if (resourcesIndex !== -1) {
      result.resources = [];
      for (let i = resourcesIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line && line.startsWith('- ')) {
          result.resources.push(line.substring(2));
        } else {
          break;
        }
      }
    }

    return result;
  }, []);

  /**
   * Sign-In with Solana (SIWS)
   */
  const signInWithSolana = useCallback(
    async (options: Partial<SIWSMessageOptions> = {}): Promise<SignInOutput> => {
      if (!connected || !publicKey || !context.wallet) {
        throw new Error('Wallet not connected');
      }

      // Check if wallet supports SIWS natively
      if (context.wallet.signIn) {
        // Use native SIWS support
        const signInMessage: SignInMessage = {
          domain: options.domain || window.location.host,
          address: options.address?.toString() || publicKey.toString(),
          uri: options.uri || window.location.origin,
          version: options.version || '1',
          chainId: options.chainId || 'mainnet',
          nonce: options.nonce || generateNonce(),
          issuedAt: options.issuedAt || new Date().toISOString(),
        };

        // Add optional fields only if defined
        if (options.statement !== undefined) {
          signInMessage.statement = options.statement;
        }
        if (options.expirationTime !== undefined) {
          signInMessage.expirationTime = options.expirationTime;
        }
        if (options.notBefore !== undefined) {
          signInMessage.notBefore = options.notBefore;
        }
        if (options.requestId !== undefined) {
          signInMessage.requestId = options.requestId;
        }
        if (options.resources !== undefined) {
          signInMessage.resources = options.resources;
        }

        try {
          setState('signing');
          setError(null);

          const result = await context.wallet.signIn(signInMessage);

          setState('signed');
          return result;
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Sign-in failed');
          setError(error);
          setState('failed');
          throw error;
        }
      } else {
        // Fallback: Build and sign SIWS message manually
        const fullOptions: SIWSMessageOptions = {
          domain: options.domain || window.location.host,
          address: options.address || publicKey,
          uri: options.uri || window.location.origin,
          version: options.version || '1',
          chainId: options.chainId || 'mainnet',
          nonce: options.nonce || generateNonce(),
          issuedAt: options.issuedAt || new Date().toISOString(),
        };

        // Add optional fields only if defined
        if (options.statement !== undefined) {
          fullOptions.statement = options.statement;
        }
        if (options.expirationTime !== undefined) {
          fullOptions.expirationTime = options.expirationTime;
        }
        if (options.notBefore !== undefined) {
          fullOptions.notBefore = options.notBefore;
        }
        if (options.requestId !== undefined) {
          fullOptions.requestId = options.requestId;
        }
        if (options.resources !== undefined) {
          fullOptions.resources = options.resources;
        }

        const message = buildSIWSMessage(fullOptions);
        const messageBytes = encodeMessage(message);
        const signature = await signMessage(messageBytes);

        // Get the detected wallet for metadata
        const detectedWallet = context.wallets.find((w) => w.provider === context.wallet);

        // Build SignInOutput
        const output: SignInOutput = {
          account: {
            address: publicKey.toString(),
            publicKey: publicKey as unknown as Uint8Array, // Address to bytes conversion
            chains: [fullOptions.chainId || 'mainnet'],
            features: detectedWallet?.metadata.features
              ? Object.keys(detectedWallet.metadata.features).filter(
                  (key) =>
                    detectedWallet?.metadata.features?.[
                      key as keyof typeof detectedWallet.metadata.features
                    ],
                )
              : [],
          },
          signedMessage: messageBytes,
          signature,
        };

        return output;
      }
    },
    [connected, publicKey, context.wallet, buildSIWSMessage, encodeMessage, signMessage],
  );

  /**
   * Verify a signature
   */
  const verifySignature = useCallback(
    async (
      message: string | Uint8Array,
      signature: Signature,
      publicKey?: Address,
    ): Promise<SignatureVerificationResult> => {
      try {
        // Use provided public key or connected wallet's public key
        const keyToVerify = publicKey || context.publicKey;

        if (!keyToVerify) {
          return {
            isValid: false,
            publicKey: null,
            error: new Error('No public key available for verification'),
          };
        }

        const messageBytes = encodeMessage(message);
        const isValid = await verifySig(keyToVerify, messageBytes, signature);

        return {
          isValid,
          publicKey: keyToVerify,
        };
      } catch (err) {
        return {
          isValid: false,
          publicKey: null,
          error: err instanceof Error ? err : new Error('Verification failed'),
        };
      }
    },
    [context.publicKey, encodeMessage],
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setCurrentMessage(null);
    setCurrentSignature(null);

    // Clear mobile session
    if (mobileContext.current.statePreserved) {
      sessionStorage.removeItem('photon_signing_session');
      mobileContext.current.statePreserved = false;
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle mobile app switch recovery
  useCallback(() => {
    const isMobile = platform.platform === 'ios' || platform.platform === 'android';
    if (!isMobile) {
      return;
    }

    const storedSession = sessionStorage.getItem('photon_signing_session');
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);

        // Check if session is still valid (5 minutes)
        const elapsed = Date.now() - session.timestamp;
        if (elapsed < 5 * 60 * 1000) {
          // Restore state
          mobileContext.current.sessionId = session.sessionId;
          setCurrentMessage(new Uint8Array(session.message));

          // Clear storage
          sessionStorage.removeItem('photon_signing_session');
        }
      } catch {
        // Invalid session data
        sessionStorage.removeItem('photon_signing_session');
      }
    }
  }, [platform.platform]);

  return {
    // State
    state,
    isSigningMessage: state === 'signing',
    error,

    // Current signing context
    currentMessage,
    currentSignature,

    // Core functions
    signMessage,
    signInWithSolana,
    verifySignature,

    // SIWS utilities
    buildSIWSMessage,
    parseSIWSMessage,

    // State management
    reset,
    clearError,
  };
}

/**
 * Generate a cryptographically secure nonce
 */
function generateNonce(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let nonce = '';
  for (let i = 0; i < length; i++) {
    const idx = array[i];
    if (idx !== undefined) {
      nonce += chars[idx % chars.length];
    }
  }

  return nonce;
}
