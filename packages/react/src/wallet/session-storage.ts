import type { Address } from '@photon/addresses';
import type { Session } from './security-types';

/**
 * Local storage keys
 */
const STORAGE_KEYS = {
  SESSIONS: 'photon_wallet_sessions',
  LAST_WALLET: 'photon_last_wallet',
  AUTO_CONNECT: 'photon_auto_connect',
  EXPLICITLY_DISCONNECTED: 'photon_explicitly_disconnected',
  CONNECTION_STATE: 'photon_connection_state',
} as const;

/**
 * Session storage for wallet connections
 */
export interface SessionStorage {
  // Session management
  createSession(publicKey: Address, walletName: string, duration: number): Session;
  getSession(sessionId: string): Session | null;
  getActiveSessions(): Session[];
  validateSession(sessionId: string): boolean;
  refreshSession(sessionId: string): boolean;
  revokeSession(sessionId: string): void;
  clearExpiredSessions(): void;
  clearAll(): void;

  // Preferences
  saveLastWallet(walletName: string): void;
  getLastWallet(): string | null;
  setAutoConnect(enabled: boolean): void;
  getAutoConnect(): boolean;
  
  // Connection state management
  setExplicitlyDisconnected(disconnected: boolean): void;
  isExplicitlyDisconnected(): boolean;
  setConnectionState(connected: boolean, walletName?: string): void;
  getConnectionState(): { connected: boolean; walletName?: string } | null;
}

/**
 * Create session storage instance
 */
export function createSessionStorage(defaultDuration: number): SessionStorage {
  // Check if localStorage is available
  const isStorageAvailable = (() => {
    try {
      const test = '__photon_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  })();

  // In-memory fallback for environments without localStorage
  const memoryStorage = new Map<string, string>();

  const storage = {
    getItem(key: string): string | null {
      if (isStorageAvailable) {
        return localStorage.getItem(key);
      }
      return memoryStorage.get(key) || null;
    },
    setItem(key: string, value: string): void {
      if (isStorageAvailable) {
        localStorage.setItem(key, value);
      } else {
        memoryStorage.set(key, value);
      }
    },
    removeItem(key: string): void {
      if (isStorageAvailable) {
        localStorage.removeItem(key);
      } else {
        memoryStorage.delete(key);
      }
    },
  };

  /**
   * Load sessions from storage
   */
  function loadSessions(): Session[] {
    try {
      const data = storage.getItem(STORAGE_KEYS.SESSIONS);
      if (!data) {
        return [];
      }

      const sessions = JSON.parse(data) as Session[];
      return sessions.filter((session) => {
        // Validate session structure
        return (
          session.id &&
          session.publicKey &&
          session.walletName &&
          session.createdAt &&
          session.expiresAt
        );
      });
    } catch {
      return [];
    }
  }

  /**
   * Save sessions to storage
   */
  function saveSessions(sessions: Session[]): void {
    try {
      storage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  }

  /**
   * Generate session ID
   */
  function generateSessionId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get current timestamp
   */
  function now(): number {
    return Date.now();
  }

  return {
    /**
     * Create a new session
     */
    createSession(publicKey: Address, walletName: string, duration: number): Session {
      const sessionId = generateSessionId();
      const timestamp = now();

      const session: Session = {
        id: sessionId,
        publicKey,
        walletName,
        createdAt: timestamp,
        expiresAt: timestamp + duration,
        lastActivity: timestamp,
        metadata:
          typeof navigator !== 'undefined' && typeof window !== 'undefined'
            ? {
                userAgent: navigator.userAgent,
                origin: window.location.origin,
              }
            : undefined,
      };

      const sessions = loadSessions();

      // Remove any existing sessions for this wallet
      const filtered = sessions.filter((s) => s.walletName !== walletName);
      filtered.push(session);

      saveSessions(filtered);

      return session;
    },

    /**
     * Get a session by ID
     */
    getSession(sessionId: string): Session | null {
      const sessions = loadSessions();
      return sessions.find((s) => s.id === sessionId) || null;
    },

    /**
     * Get all active (non-expired) sessions
     */
    getActiveSessions(): Session[] {
      const sessions = loadSessions();
      const timestamp = now();

      return sessions.filter((session) => session.expiresAt > timestamp);
    },

    /**
     * Validate if a session is still valid
     */
    validateSession(sessionId: string): boolean {
      const session = this.getSession(sessionId);
      if (!session) {
        return false;
      }

      const timestamp = now();
      return session.expiresAt > timestamp;
    },

    /**
     * Refresh session expiry time
     */
    refreshSession(sessionId: string): boolean {
      const sessions = loadSessions();
      const sessionIndex = sessions.findIndex((s) => s.id === sessionId);

      if (sessionIndex === -1) {
        return false;
      }

      const session = sessions[sessionIndex];
      const timestamp = now();

      if (!session || session.expiresAt <= timestamp) {
        return false;
      }

      // Extend session
      session.lastActivity = timestamp;
      session.expiresAt = timestamp + defaultDuration;

      saveSessions(sessions);
      return true;
    },

    /**
     * Revoke a session
     */
    revokeSession(sessionId: string): void {
      const sessions = loadSessions();
      const filtered = sessions.filter((s) => s.id !== sessionId);
      saveSessions(filtered);
    },

    /**
     * Clear expired sessions
     */
    clearExpiredSessions(): void {
      const sessions = loadSessions();
      const timestamp = now();
      const active = sessions.filter((session) => session.expiresAt > timestamp);
      saveSessions(active);
    },

    /**
     * Clear all sessions
     */
    clearAll(): void {
      storage.removeItem(STORAGE_KEYS.SESSIONS);
      storage.removeItem(STORAGE_KEYS.LAST_WALLET);
      storage.removeItem(STORAGE_KEYS.AUTO_CONNECT);
    },

    /**
     * Save last connected wallet
     */
    saveLastWallet(walletName: string): void {
      storage.setItem(STORAGE_KEYS.LAST_WALLET, walletName);
    },

    /**
     * Get last connected wallet
     */
    getLastWallet(): string | null {
      return storage.getItem(STORAGE_KEYS.LAST_WALLET);
    },

    /**
     * Set auto-connect preference
     */
    setAutoConnect(enabled: boolean): void {
      storage.setItem(STORAGE_KEYS.AUTO_CONNECT, enabled ? 'true' : 'false');
    },

    /**
     * Get auto-connect preference
     */
    getAutoConnect(): boolean {
      const value = storage.getItem(STORAGE_KEYS.AUTO_CONNECT);
      return value === 'true';
    },
    
    /**
     * Set explicitly disconnected flag
     */
    setExplicitlyDisconnected(disconnected: boolean): void {
      if (disconnected) {
        storage.setItem(STORAGE_KEYS.EXPLICITLY_DISCONNECTED, 'true');
        // Also clear connection state when explicitly disconnected
        storage.removeItem(STORAGE_KEYS.CONNECTION_STATE);
      } else {
        storage.removeItem(STORAGE_KEYS.EXPLICITLY_DISCONNECTED);
      }
    },
    
    /**
     * Check if explicitly disconnected
     */
    isExplicitlyDisconnected(): boolean {
      return storage.getItem(STORAGE_KEYS.EXPLICITLY_DISCONNECTED) === 'true';
    },
    
    /**
     * Set connection state
     */
    setConnectionState(connected: boolean, walletName?: string): void {
      if (connected && walletName) {
        storage.setItem(STORAGE_KEYS.CONNECTION_STATE, JSON.stringify({ connected, walletName }));
        // Clear explicitly disconnected flag when connecting
        storage.removeItem(STORAGE_KEYS.EXPLICITLY_DISCONNECTED);
      } else {
        storage.removeItem(STORAGE_KEYS.CONNECTION_STATE);
      }
    },
    
    /**
     * Get connection state
     */
    getConnectionState(): { connected: boolean; walletName?: string } | null {
      try {
        const state = storage.getItem(STORAGE_KEYS.CONNECTION_STATE);
        return state ? JSON.parse(state) : null;
      } catch {
        return null;
      }
    },
  };
}
