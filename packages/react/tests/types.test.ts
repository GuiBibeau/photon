import { describe, it, expect } from 'vitest';
import {
  WalletError,
  WalletConnectionError,
  WalletDisconnectedError,
  WalletNotReadyError,
  WalletSignTransactionError,
  WalletSignMessageError,
  WalletTimeoutError,
  WalletUserRejectedError,
  WalletNotInstalledError,
  WalletNetworkError,
  WalletInvalidTransactionError,
  WalletRateLimitError,
  WalletMobileConnectionError,
  WalletReadyState,
  type WalletFeatures,
  type SignInMessage,
} from '../src/types';

describe('Wallet types', () => {
  describe('Error classes', () => {
    it('should create WalletError with message and code', () => {
      const error = new WalletError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('WalletError');
    });

    it('should create WalletConnectionError', () => {
      const error = new WalletConnectionError();
      expect(error.message).toBe('Failed to connect wallet');
      expect(error.code).toBe('CONNECTION_FAILED');
    });

    it('should create WalletDisconnectedError', () => {
      const error = new WalletDisconnectedError();
      expect(error.message).toBe('Wallet is not connected');
      expect(error.code).toBe('DISCONNECTED');
    });

    it('should create WalletNotReadyError', () => {
      const error = new WalletNotReadyError();
      expect(error.message).toBe('Wallet is not ready');
      expect(error.code).toBe('NOT_READY');
    });

    it('should create WalletSignTransactionError', () => {
      const error = new WalletSignTransactionError();
      expect(error.message).toBe('Failed to sign transaction');
      expect(error.code).toBe('SIGN_FAILED');
    });

    it('should create WalletSignMessageError', () => {
      const error = new WalletSignMessageError();
      expect(error.message).toBe('Failed to sign message');
      expect(error.code).toBe('SIGN_MESSAGE_FAILED');
    });

    it('should create WalletTimeoutError', () => {
      const error = new WalletTimeoutError();
      expect(error.message).toBe('Wallet operation timed out');
      expect(error.code).toBe('TIMEOUT');
    });

    it('should create WalletUserRejectedError', () => {
      const error = new WalletUserRejectedError();
      expect(error.message).toBe('User rejected the request');
      expect(error.code).toBe('USER_REJECTED');
    });

    it('should create WalletNotInstalledError with wallet name', () => {
      const error = new WalletNotInstalledError('Phantom');
      expect(error.message).toBe('Phantom wallet is not installed');
      expect(error.code).toBe('NOT_INSTALLED');
    });

    it('should create WalletNotInstalledError without wallet name', () => {
      const error = new WalletNotInstalledError();
      expect(error.message).toBe('Wallet is not installed');
      expect(error.code).toBe('NOT_INSTALLED');
    });

    it('should create WalletNetworkError', () => {
      const error = new WalletNetworkError();
      expect(error.message).toBe('Network error occurred');
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('should create WalletInvalidTransactionError', () => {
      const error = new WalletInvalidTransactionError();
      expect(error.message).toBe('Invalid transaction');
      expect(error.code).toBe('INVALID_TRANSACTION');
    });

    it('should create WalletRateLimitError', () => {
      const error = new WalletRateLimitError();
      expect(error.message).toBe('Too many connection attempts');
      expect(error.code).toBe('RATE_LIMITED');
    });

    it('should create WalletMobileConnectionError', () => {
      const error = new WalletMobileConnectionError();
      expect(error.message).toBe('Mobile wallet connection failed');
      expect(error.code).toBe('MOBILE_CONNECTION_FAILED');
    });
  });

  describe('WalletReadyState enum', () => {
    it('should have all expected states', () => {
      expect(WalletReadyState.Installed).toBe('Installed');
      expect(WalletReadyState.NotDetected).toBe('NotDetected');
      expect(WalletReadyState.Loadable).toBe('Loadable');
      expect(WalletReadyState.Unsupported).toBe('Unsupported');
    });
  });

  describe('WalletFeatures interface', () => {
    it('should define wallet feature flags', () => {
      const features: WalletFeatures = {
        signTransaction: true,
        signAllTransactions: true,
        signMessage: true,
        signIn: false,
        sendTransaction: true,
        versionedTransactions: true,
        addressLookupTables: false,
        deepLinking: true,
        mobileWalletAdapter: false,
      };

      expect(features.signTransaction).toBe(true);
      expect(features.versionedTransactions).toBe(true);
      expect(features.mobileWalletAdapter).toBe(false);
    });
  });

  describe('SignInMessage interface', () => {
    it('should define SIWS message fields', () => {
      const message: SignInMessage = {
        domain: 'example.com',
        address: '11111111111111111111111111111111',
        statement: 'Sign in to Example App',
        uri: 'https://example.com',
        version: '1',
        chainId: 'solana:mainnet',
        nonce: 'randomNonce123',
        issuedAt: new Date().toISOString(),
      };

      expect(message.domain).toBe('example.com');
      expect(message.chainId).toBe('solana:mainnet');
      expect(message.nonce).toBe('randomNonce123');
    });
  });
});
