import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type React from 'react';
import { createElement } from 'react';
import type { Address } from '@photon/addresses';
import { useSignMessage } from '../src/hooks/message-signing';
import { WalletProvider } from '../src/providers';
import type { WalletProvider as WalletProviderType, SignInOutput } from '../src/types';

// Mock the crypto module
vi.mock('@photon/crypto', async () => {
  const actual = await vi.importActual('@photon/crypto');
  return {
    ...actual,
    verifySignature: vi.fn().mockResolvedValue(true),
    createSignature: vi.fn((bytes: Uint8Array) => bytes),
    isValidSignature: vi.fn((sig: unknown) => sig instanceof Uint8Array && sig.length === 64),
  };
});

// Mock wallet detector
vi.mock('../src/wallet/detector', () => ({
  detectMobilePlatform: vi.fn(() => ({
    platform: 'desktop',
    isMobile: false,
    isInAppBrowser: false,
  })),
  detectWallets: vi.fn(() => Promise.resolve([])),
}));

describe('useSignMessage', () => {
  let mockWallet: Partial<WalletProviderType>;
  let mockSignature: Uint8Array;

  beforeEach(() => {
    // Create a valid 64-byte signature
    mockSignature = new Uint8Array(64).fill(1);

    // Setup mock wallet
    mockWallet = {
      name: 'Test Wallet',
      publicKey: 'TestPublicKey' as Address,
      connected: true,
      connecting: false,
      signMessage: vi.fn().mockResolvedValue(mockSignature),
      signIn: undefined,
      signTransaction: vi.fn(),
      signAllTransactions: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      features: {
        signTransaction: true,
        signMessage: true,
      },
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createWrapper = (wallet: Partial<WalletProviderType> | null = mockWallet) => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(
        WalletProvider,
        {
          wallets: wallet
            ? [
                {
                  provider: wallet as WalletProviderType,
                  metadata: {
                    name: wallet.name || 'Test Wallet',
                    readyState: 'Installed' as const,
                    isInstalled: true,
                    isMobile: false,
                  },
                },
              ]
            : [],
          autoConnect: false,
        },
        children,
      );
    return wrapper;
  };

  describe('Initial State', () => {
    it('should have idle state initially', () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.isSigningMessage).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentMessage).toBeNull();
      expect(result.current.currentSignature).toBeNull();
    });
  });

  describe('signMessage', () => {
    it('should sign a string message', async () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      let signature: Uint8Array | undefined;
      const message = 'Hello Solana!';

      await act(async () => {
        signature = await result.current.signMessage(message);
      });

      expect(mockWallet.signMessage).toHaveBeenCalledWith(new TextEncoder().encode(message));
      expect(signature).toEqual(mockSignature);
      expect(result.current.state).toBe('signed');
      expect(result.current.currentSignature).toEqual(mockSignature);
    });

    it('should sign a Uint8Array message', async () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      const message = new Uint8Array([1, 2, 3, 4, 5]);
      let signature: Uint8Array | undefined;

      await act(async () => {
        signature = await result.current.signMessage(message);
      });

      expect(mockWallet.signMessage).toHaveBeenCalledWith(message);
      expect(signature).toEqual(mockSignature);
      expect(result.current.currentMessage).toEqual(message);
    });

    it('should throw error when wallet not connected', async () => {
      const disconnectedWallet = { ...mockWallet, connected: false };
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(disconnectedWallet),
      });

      await act(async () => {
        await expect(result.current.signMessage('test')).rejects.toThrow('Wallet not connected');
      });

      expect(result.current.state).toBe('failed');
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should throw error when wallet does not support message signing', async () => {
      const noSignWallet = { ...mockWallet, signMessage: undefined };
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(noSignWallet),
      });

      await act(async () => {
        await expect(result.current.signMessage('test')).rejects.toThrow(
          'Wallet does not support message signing',
        );
      });
    });

    it('should handle signing timeout', async () => {
      const slowWallet = {
        ...mockWallet,
        signMessage: vi.fn(() => new Promise((resolve) => setTimeout(resolve, 5000))),
      };
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(slowWallet),
      });

      await act(async () => {
        await expect(result.current.signMessage('test', { timeout: 100 })).rejects.toThrow(
          'Message signing timeout',
        );
      });

      expect(result.current.state).toBe('failed');
    });

    it('should validate signature format', async () => {
      const invalidSignature = new Uint8Array(32); // Wrong size
      const badWallet = {
        ...mockWallet,
        signMessage: vi.fn().mockResolvedValue(invalidSignature),
      };
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(badWallet),
      });

      await act(async () => {
        await expect(result.current.signMessage('test')).rejects.toThrow(
          'Invalid signature format received from wallet',
        );
      });
    });
  });

  describe('buildSIWSMessage', () => {
    it('should build a valid SIWS message', () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      const options = {
        domain: 'example.com',
        address: 'SoLaNaAdDrEsS123' as Address,
        statement: 'Sign in to Example App',
        uri: 'https://example.com',
        version: '1',
        chainId: 'mainnet',
        nonce: 'abc12345',
        issuedAt: '2024-01-01T00:00:00.000Z',
      };

      const message = result.current.buildSIWSMessage(options);

      expect(message).toContain('example.com wants you to sign in with your Solana account:');
      expect(message).toContain('SoLaNaAdDrEsS123');
      expect(message).toContain('Sign in to Example App');
      expect(message).toContain('URI: https://example.com');
      expect(message).toContain('Version: 1');
      expect(message).toContain('Chain ID: mainnet');
      expect(message).toContain('Nonce: abc12345');
      expect(message).toContain('Issued At: 2024-01-01T00:00:00.000Z');
    });

    it('should include optional fields when provided', () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      const options = {
        domain: 'example.com',
        address: 'SoLaNaAdDrEsS123' as Address,
        expirationTime: '2024-01-02T00:00:00.000Z',
        notBefore: '2024-01-01T00:00:00.000Z',
        requestId: 'request-123',
        resources: ['https://example.com/api', 'https://example.com/data'],
      };

      const message = result.current.buildSIWSMessage(options);

      expect(message).toContain('Expiration Time: 2024-01-02T00:00:00.000Z');
      expect(message).toContain('Not Before: 2024-01-01T00:00:00.000Z');
      expect(message).toContain('Request ID: request-123');
      expect(message).toContain('Resources:');
      expect(message).toContain('- https://example.com/api');
      expect(message).toContain('- https://example.com/data');
    });

    it('should generate nonce and issuedAt if not provided', () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      const options = {
        domain: 'example.com',
        address: 'SoLaNaAdDrEsS123' as Address,
      };

      const message = result.current.buildSIWSMessage(options);

      expect(message).toMatch(/Nonce: [A-Za-z0-9]{8}/);
      expect(message).toMatch(/Issued At: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('parseSIWSMessage', () => {
    it('should parse a SIWS message correctly', () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      const message = `example.com wants you to sign in with your Solana account:
SoLaNaAdDrEsS123

Sign in to Example App

URI: https://example.com
Version: 1
Chain ID: mainnet
Nonce: abc12345
Issued At: 2024-01-01T00:00:00.000Z
Expiration Time: 2024-01-02T00:00:00.000Z
Not Before: 2024-01-01T00:00:00.000Z
Request ID: request-123
Resources:
- https://example.com/api
- https://example.com/data`;

      const parsed = result.current.parseSIWSMessage(message);

      expect(parsed.domain).toBe('example.com');
      expect(parsed.address).toBe('SoLaNaAdDrEsS123');
      expect(parsed.statement).toBe('Sign in to Example App');
      expect(parsed.uri).toBe('https://example.com');
      expect(parsed.version).toBe('1');
      expect(parsed.chainId).toBe('mainnet');
      expect(parsed.nonce).toBe('abc12345');
      expect(parsed.issuedAt).toBe('2024-01-01T00:00:00.000Z');
      expect(parsed.expirationTime).toBe('2024-01-02T00:00:00.000Z');
      expect(parsed.notBefore).toBe('2024-01-01T00:00:00.000Z');
      expect(parsed.requestId).toBe('request-123');
      expect(parsed.resources).toEqual(['https://example.com/api', 'https://example.com/data']);
    });
  });

  describe('signInWithSolana', () => {
    it('should use native signIn when available', async () => {
      const signInOutput: SignInOutput = {
        account: {
          address: 'SoLaNaAdDrEsS123',
          publicKey: new Uint8Array(32),
          chains: ['mainnet'],
          features: ['signMessage'],
        },
        signedMessage: new Uint8Array([1, 2, 3]),
        signature: mockSignature,
      };

      const walletWithSignIn = {
        ...mockWallet,
        signIn: vi.fn().mockResolvedValue(signInOutput),
      };

      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(walletWithSignIn),
      });

      let output: SignInOutput | undefined;

      await act(async () => {
        output = await result.current.signInWithSolana({
          domain: 'example.com',
          statement: 'Sign in to Example App',
        });
      });

      expect(walletWithSignIn.signIn).toHaveBeenCalled();
      expect(output).toEqual(signInOutput);
      expect(result.current.state).toBe('signed');
    });

    it('should fallback to manual SIWS when signIn not available', async () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      let output: SignInOutput | undefined;

      await act(async () => {
        output = await result.current.signInWithSolana({
          domain: 'example.com',
          statement: 'Sign in to Example App',
        });
      });

      expect(mockWallet.signMessage).toHaveBeenCalled();
      expect(output).toBeDefined();
      expect(output?.account.address).toBe('TestPublicKey');
      expect(output?.signature).toEqual(mockSignature);
    });

    it('should throw error when wallet not connected', async () => {
      const disconnectedWallet = { ...mockWallet, connected: false };
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(disconnectedWallet),
      });

      await act(async () => {
        await expect(result.current.signInWithSolana()).rejects.toThrow('Wallet not connected');
      });
    });
  });

  describe('verifySignature', () => {
    it('should verify a signature successfully', async () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      let verificationResult: any;

      await act(async () => {
        verificationResult = await result.current.verifySignature(
          'test message',
          mockSignature,
          'TestPublicKey' as Address,
        );
      });

      expect(verificationResult.isValid).toBe(true);
      expect(verificationResult.publicKey).toBe('TestPublicKey');
      expect(verificationResult.error).toBeUndefined();
    });

    it('should use connected wallet public key when not provided', async () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      let verificationResult: any;

      await act(async () => {
        verificationResult = await result.current.verifySignature('test message', mockSignature);
      });

      expect(verificationResult.isValid).toBe(true);
      expect(verificationResult.publicKey).toBe('TestPublicKey');
    });

    it('should return error when no public key available', async () => {
      const noKeyWallet = { ...mockWallet, publicKey: null };
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(noKeyWallet),
      });

      let verificationResult: any;

      await act(async () => {
        verificationResult = await result.current.verifySignature('test message', mockSignature);
      });

      expect(verificationResult.isValid).toBe(false);
      expect(verificationResult.publicKey).toBeNull();
      expect(verificationResult.error).toBeInstanceOf(Error);
      expect(verificationResult.error.message).toBe('No public key available for verification');
    });
  });

  describe('State Management', () => {
    it('should reset state correctly', async () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      // Sign a message first
      await act(async () => {
        await result.current.signMessage('test');
      });

      expect(result.current.state).toBe('signed');
      expect(result.current.currentSignature).not.toBeNull();

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.currentSignature).toBeNull();
      expect(result.current.currentMessage).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should clear error', async () => {
      const errorWallet = {
        ...mockWallet,
        signMessage: vi.fn().mockRejectedValue(new Error('Test error')),
      };
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(errorWallet),
      });

      // Trigger an error
      await act(async () => {
        try {
          await result.current.signMessage('test');
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).not.toBeNull();

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Mobile Support', () => {
    beforeEach(() => {
      // Mock mobile platform
      vi.doMock('../src/wallet/detector', () => ({
        detectMobilePlatform: vi.fn(() => ({
          platform: 'android',
          isMobile: true,
          isInAppBrowser: false,
        })),
      }));
    });

    it('should handle mobile app switch with state preservation', async () => {
      const { result } = renderHook(() => useSignMessage(), {
        wrapper: createWrapper(),
      });

      const message = 'Mobile test message';

      await act(async () => {
        const promise = result.current.signMessage(message, {
          mobile: {
            handleAppSwitch: true,
            preserveState: true,
            returnUrl: 'https://example.com/return',
          },
        });

        // Simulate successful signing
        await promise;
      });

      // Check that session storage was used for state preservation
      expect(result.current.state).toBe('signed');
    });
  });
});
