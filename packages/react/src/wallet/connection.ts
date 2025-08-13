import type { Address } from '@photon/addresses';
import type {
  WalletProvider,
  WalletConnectionOptions,
  WalletEventListener,
  DetectedWallet,
} from '../types';
import {
  WalletConnectionError,
  WalletDisconnectedError,
  WalletTimeoutError,
  WalletUserRejectedError,
  WalletRateLimitError,
} from '../types';
import type {
  SecurityManager,
  ConnectionAttempt,
  RateLimitConfig,
  Session,
} from './security-types';
import { detectWallets, validateProvider } from './detector';
import { createSecurityManager } from './security';
import { createSessionStorage } from './session-storage';

/**
 * Connection state for each wallet
 */
interface WalletConnectionState {
  provider: WalletProvider;
  connected: boolean;
  connecting: boolean;
  publicKey: Address | null;
  session?: Session;
  lastConnectionAttempt?: number;
  retryCount: number;
  backoffDelay: number;
}

/**
 * Event emitter for connection events
 */
interface ConnectionEventEmitter {
  on(event: string, listener: WalletEventListener): void;
  off(event: string, listener: WalletEventListener): void;
  emit(event: string, data?: unknown): void;
}

/**
 * Connection manager configuration
 */
export interface ConnectionManagerConfig {
  autoConnect?: boolean;
  eagerness?: 'eager' | 'lazy';
  sessionDuration?: number; // milliseconds, default 24h
  rateLimit?: RateLimitConfig;
  allowedOrigins?: string[];
  detectOnInit?: boolean;
}

/**
 * Connection manager for wallet operations
 */
export class WalletConnectionManager implements ConnectionEventEmitter {
  private wallets: Map<string, WalletConnectionState> = new Map();
  private currentWallet: string | null = null;
  private eventListeners: Map<string, Set<WalletEventListener>> = new Map();
  private securityManager: SecurityManager;
  private sessionStorage: ReturnType<typeof createSessionStorage>;
  private config: ConnectionManagerConfig;
  private connectionAttempts: Map<string, ConnectionAttempt[]> = new Map();
  private globalConnectionCount = 0;
  private lastGlobalReset = Date.now();

  constructor(config?: ConnectionManagerConfig) {
    this.config = {
      autoConnect: false,
      eagerness: 'lazy',
      sessionDuration: 24 * 60 * 60 * 1000, // 24 hours
      detectOnInit: true,
      rateLimit: {
        maxAttempts: 5,
        timeWindow: 60000, // 1 minute
        perWallet: true,
        globalMaxAttempts: 10,
        backoff: {
          initialDelay: 1000,
          maxDelay: 30000,
          multiplier: 2,
          resetOnSuccess: true,
        },
      },
      ...config,
    };

    this.securityManager = createSecurityManager(
      this.config.rateLimit || {
        maxAttempts: 5,
        timeWindow: 60000,
        perWallet: true,
      },
    );
    this.sessionStorage = createSessionStorage(this.config.sessionDuration || 24 * 60 * 60 * 1000);

    if (this.config.detectOnInit) {
      this.detectAndRegisterWallets();
    }

    if (this.config.autoConnect) {
      this.autoConnect();
    }
  }

  /**
   * Detect and register available wallets
   */
  private async detectAndRegisterWallets(): Promise<void> {
    try {
      const detectedWallets = await detectWallets({
        timeout: 3000,
        pollInterval: 100,
        detectWalletStandard: true,
        detectWindowInjection: true,
        allowMultipleIdentifiers: false,
      });

      for (const wallet of detectedWallets) {
        this.registerWallet(wallet);
      }
    } catch (error) {
      console.error('Failed to detect wallets:', error);
    }
  }

  /**
   * Register a wallet provider
   */
  registerWallet(wallet: DetectedWallet): void {
    const { provider, metadata } = wallet;
    const walletName = metadata.name.toLowerCase();

    // Validate provider for security
    const validation = validateProvider(provider);
    if (!validation.isValid && validation.securityRisk === 'high') {
      console.warn(`Wallet ${metadata.name} failed security validation:`, validation.issues);
      return;
    }

    const state: WalletConnectionState = {
      provider,
      connected: false,
      connecting: false,
      publicKey: null,
      retryCount: 0,
      backoffDelay: this.config.rateLimit?.backoff?.initialDelay || 1000,
    };

    this.wallets.set(walletName, state);

    // Setup event listeners for the wallet
    this.setupWalletEventListeners(walletName, provider);
  }

  /**
   * Setup event listeners for a wallet provider
   */
  private setupWalletEventListeners(walletName: string, provider: WalletProvider): void {
    // Connect event
    provider.on('connect', () => {
      const state = this.wallets.get(walletName);
      if (state) {
        state.connected = true;
        state.publicKey = provider.publicKey;
        this.emit('connect', { wallet: walletName, publicKey: provider.publicKey });
      }
    });

    // Disconnect event
    provider.on('disconnect', () => {
      const state = this.wallets.get(walletName);
      if (state) {
        state.connected = false;
        state.publicKey = null;
        delete state.session;
        if (this.currentWallet === walletName) {
          this.currentWallet = null;
        }
        this.emit('disconnect', { wallet: walletName });
      }
    });

    // Account changed event
    provider.on('accountChanged', (data) => {
      const publicKey = data as Address | null;
      const state = this.wallets.get(walletName);
      if (state) {
        state.publicKey = publicKey;
        this.emit('accountChanged', { wallet: walletName, publicKey });
      }
    });

    // Error event
    provider.on('error', (data) => {
      const error = data as Error;
      this.emit('error', { wallet: walletName, error });
    });
  }

  /**
   * Get all registered wallets
   */
  getWallets(): WalletProvider[] {
    return Array.from(this.wallets.values()).map((state) => state.provider);
  }

  /**
   * Get wallet states for UI
   */
  getWalletStates(): Map<string, WalletConnectionState> {
    return new Map(this.wallets);
  }

  /**
   * Get a specific wallet by name
   */
  getWallet(name: string): WalletProvider | undefined {
    const state = this.wallets.get(name.toLowerCase());
    return state?.provider;
  }

  /**
   * Check rate limiting for connection attempts
   */
  private checkRateLimit(walletName: string): void {
    const now = Date.now();
    const { rateLimit } = this.config;

    if (!rateLimit) {
      return;
    }

    // Check global rate limit
    if (now - this.lastGlobalReset > rateLimit.timeWindow) {
      this.globalConnectionCount = 0;
      this.lastGlobalReset = now;
    }

    if (rateLimit.globalMaxAttempts && this.globalConnectionCount >= rateLimit.globalMaxAttempts) {
      throw new WalletRateLimitError('Global connection rate limit exceeded');
    }

    // Check per-wallet rate limit
    if (rateLimit.perWallet) {
      const attempts = this.connectionAttempts.get(walletName) || [];
      const recentAttempts = attempts.filter(
        (attempt) => now - attempt.timestamp < rateLimit.timeWindow,
      );

      if (recentAttempts.length >= rateLimit.maxAttempts) {
        throw new WalletRateLimitError(
          `Too many connection attempts for ${walletName}. Please wait before trying again.`,
        );
      }

      this.connectionAttempts.set(walletName, recentAttempts);
    }
  }

  /**
   * Record a connection attempt
   */
  private recordConnectionAttempt(walletName: string, success: boolean, errorCode?: string): void {
    const attempt: ConnectionAttempt = {
      identifier: walletName,
      timestamp: Date.now(),
      success,
      walletName,
      ...(errorCode ? { errorCode } : {}),
    };

    const attempts = this.connectionAttempts.get(walletName) || [];
    attempts.push(attempt);
    this.connectionAttempts.set(walletName, attempts);

    if (!success) {
      this.globalConnectionCount++;
    }
  }

  /**
   * Apply exponential backoff delay
   */
  private async applyBackoff(walletName: string): Promise<void> {
    const state = this.wallets.get(walletName);
    if (!state || !this.config.rateLimit?.backoff) {
      return;
    }

    if (state.retryCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, state.backoffDelay));

      // Increase backoff for next attempt
      const { multiplier, maxDelay } = this.config.rateLimit.backoff;
      state.backoffDelay = Math.min(state.backoffDelay * multiplier, maxDelay);
      state.retryCount++;
    }
  }

  /**
   * Reset backoff for successful connection
   */
  private resetBackoff(walletName: string): void {
    const state = this.wallets.get(walletName);
    if (!state || !this.config.rateLimit?.backoff?.resetOnSuccess) {
      return;
    }

    state.retryCount = 0;
    state.backoffDelay = this.config.rateLimit.backoff.initialDelay;
  }

  /**
   * Connect to a wallet
   */
  async connect(walletName: string, options?: WalletConnectionOptions): Promise<void> {
    const normalizedName = walletName.toLowerCase();
    const state = this.wallets.get(normalizedName);

    if (!state) {
      throw new WalletConnectionError(`Wallet ${walletName} is not registered`);
    }

    if (state.connected) {
      this.currentWallet = normalizedName;
      return;
    }

    if (state.connecting) {
      throw new WalletConnectionError(`Already connecting to ${walletName}`);
    }

    try {
      // Check rate limiting
      this.checkRateLimit(normalizedName);

      // Apply backoff if needed
      await this.applyBackoff(normalizedName);

      // Verify origin if configured
      if (this.config.allowedOrigins) {
        const isAllowed = this.securityManager.verifyOrigin(this.config.allowedOrigins);
        if (!isAllowed) {
          throw new WalletConnectionError('Connection not allowed from this origin');
        }
      }

      state.connecting = true;
      state.lastConnectionAttempt = Date.now();

      // Set timeout for connection
      const timeout = options?.timeout || 30000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new WalletTimeoutError()), timeout);
      });

      // Attempt connection
      const connectionPromise = state.provider.connect(
        options?.onlyIfTrusted !== undefined ? { onlyIfTrusted: options.onlyIfTrusted } : undefined,
      );

      await Promise.race([connectionPromise, timeoutPromise]);

      // Connection successful
      state.connected = true;
      state.connecting = false;
      state.publicKey = state.provider.publicKey;
      this.currentWallet = normalizedName;

      // Create session
      if (state.publicKey) {
        state.session = this.sessionStorage.createSession(
          state.publicKey,
          normalizedName,
          options?.sessionDuration || this.config.sessionDuration || 24 * 60 * 60 * 1000,
        );
      }

      // Record successful attempt
      this.recordConnectionAttempt(normalizedName, true);
      this.resetBackoff(normalizedName);

      // Emit connection event
      this.emit('connect', {
        wallet: normalizedName,
        publicKey: state.publicKey,
      });
    } catch (error) {
      state.connecting = false;
      state.retryCount++;

      // Record failed attempt
      let errorCode = 'UNKNOWN';
      if (error instanceof WalletTimeoutError) {
        errorCode = 'TIMEOUT';
      } else if (error instanceof WalletUserRejectedError) {
        errorCode = 'USER_REJECTED';
      } else if (error instanceof WalletRateLimitError) {
        errorCode = 'RATE_LIMITED';
      }

      this.recordConnectionAttempt(normalizedName, false, errorCode);

      throw error;
    }
  }

  /**
   * Disconnect from current wallet
   */
  async disconnect(): Promise<void> {
    if (!this.currentWallet) {
      throw new WalletDisconnectedError('No wallet is connected');
    }

    const state = this.wallets.get(this.currentWallet);
    if (!state) {
      throw new WalletDisconnectedError('Wallet state not found');
    }

    try {
      await state.provider.disconnect();

      // Clear session
      if (state.session) {
        this.sessionStorage.revokeSession(state.session.id);
      }

      state.connected = false;
      state.publicKey = null;
      delete state.session;

      const previousWallet = this.currentWallet;
      this.currentWallet = null;

      // Emit disconnect event
      this.emit('disconnect', { wallet: previousWallet });
    } catch (error) {
      throw new WalletConnectionError(
        `Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get current connected wallet
   */
  getCurrentWallet(): WalletProvider | null {
    if (!this.currentWallet) {
      return null;
    }
    const state = this.wallets.get(this.currentWallet);
    return state?.provider || null;
  }

  /**
   * Get current wallet state
   */
  getCurrentWalletState(): WalletConnectionState | null {
    if (!this.currentWallet) {
      return null;
    }
    return this.wallets.get(this.currentWallet) || null;
  }

  /**
   * Switch to a different wallet
   */
  async switchWallet(walletName: string, options?: WalletConnectionOptions): Promise<void> {
    const normalizedName = walletName.toLowerCase();

    // If switching to the same wallet, do nothing
    if (this.currentWallet === normalizedName) {
      const state = this.wallets.get(normalizedName);
      if (state?.connected) {
        return;
      }
    }

    // Disconnect from current wallet if connected
    if (this.currentWallet) {
      await this.disconnect();
    }

    // Connect to new wallet
    await this.connect(walletName, options);
  }

  /**
   * Auto-connect to previously connected wallet
   */
  async autoConnect(): Promise<void> {
    try {
      // Check for saved session
      const sessions = this.sessionStorage.getActiveSessions();
      if (sessions.length === 0) {
        return;
      }

      // Try to reconnect to the most recent session
      const mostRecent = sessions.sort((a, b) => b.lastActivity - a.lastActivity)[0];

      if (mostRecent) {
        const state = this.wallets.get(mostRecent.walletName);
        if (state) {
          try {
            await this.connect(mostRecent.walletName, {
              onlyIfTrusted: true,
            });
          } catch (_error) {
            // Silent failure for auto-connect
            // Silent failure for auto-connect
            this.sessionStorage.revokeSession(mostRecent.id);
          }
        }
      }
    } catch (error) {
      console.error('Auto-connect error:', error);
    }
  }

  /**
   * Event emitter implementation
   */
  on(event: string, listener: WalletEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(listener);
    }
  }

  off(event: string, listener: WalletEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }

  /**
   * Clear all sessions and reset state
   */
  reset(): void {
    this.sessionStorage.clearAll();
    this.connectionAttempts.clear();
    this.globalConnectionCount = 0;
    this.lastGlobalReset = Date.now();

    // Reset all wallet states
    for (const [, state] of this.wallets) {
      state.connected = false;
      state.connecting = false;
      state.publicKey = null;
      delete state.session;
      state.retryCount = 0;
      state.backoffDelay = this.config.rateLimit?.backoff?.initialDelay || 1000;
    }

    this.currentWallet = null;
  }
}

/**
 * Create a new wallet connection manager instance
 */
export function createWalletConnectionManager(
  config?: ConnectionManagerConfig,
): WalletConnectionManager {
  return new WalletConnectionManager(config);
}
