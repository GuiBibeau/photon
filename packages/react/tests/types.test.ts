import { describe, it, expect } from 'vitest';
import {
  WalletError,
  WalletConnectionError,
  WalletDisconnectedError,
  WalletNotReadyError,
  WalletSignTransactionError,
  WalletSignMessageError,
  WalletTimeoutError,
  WalletReadyState,
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
  });

  describe('WalletReadyState enum', () => {
    it('should have all expected states', () => {
      expect(WalletReadyState.Installed).toBe('Installed');
      expect(WalletReadyState.NotDetected).toBe('NotDetected');
      expect(WalletReadyState.Loadable).toBe('Loadable');
      expect(WalletReadyState.Unsupported).toBe('Unsupported');
    });
  });
});
