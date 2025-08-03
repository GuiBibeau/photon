import { describe, it, expect } from 'vitest';
import {
  createAddressFormatError,
  createAddressLengthError,
  createAddressValidationError,
  createSignatureFormatError,
  createSignatureLengthError,
  createSignatureValidationError,
  createTransactionSizeError,
  createInsufficientSignaturesError,
  createDuplicateSignatureError,
  createInvalidAccountIndexError,
  createInvalidInstructionDataError,
  createInvalidKeypairError,
  validateBase58Format,
  validateAddressFormat,
  validateSignatureFormat,
} from '../src/validation-mapper';
import { SolanaError } from '../src/error';

describe('Validation Mapper', () => {
  describe('Address Validation Errors', () => {
    describe('createAddressFormatError', () => {
      it('should create format error with default reason', () => {
        const error = createAddressFormatError('invalid-address');

        expect(error).toBeInstanceOf(SolanaError);
        expect(error.code).toBe('INVALID_ADDRESS_FORMAT');
        expect(error.context).toEqual({
          address: 'invalid-address',
          reason: 'Invalid base58 encoding or format',
        });
      });

      it('should create format error with custom reason', () => {
        const error = createAddressFormatError('addr', 'Contains invalid characters');

        expect(error.context).toEqual({
          address: 'addr',
          reason: 'Contains invalid characters',
        });
      });
    });

    describe('createAddressLengthError', () => {
      it('should create length error with correct context', () => {
        const error = createAddressLengthError('shortaddr', 10);

        expect(error.code).toBe('INVALID_ADDRESS_LENGTH');
        expect(error.context).toEqual({
          address: 'shortaddr',
          length: 10,
          expected: 32,
        });
      });
    });

    describe('createAddressValidationError', () => {
      it('should create length error for length-related reasons', () => {
        const error = createAddressValidationError('addr', 'Invalid length: 10 bytes');

        expect(error.code).toBe('INVALID_ADDRESS_LENGTH');
        expect(error.context?.length).toBe(10);
      });

      it('should create format error for format-related reasons', () => {
        const formatReasons = [
          'Invalid format',
          'Invalid base58 encoding',
          'Invalid encoding format',
        ];

        formatReasons.forEach((reason) => {
          const error = createAddressValidationError('addr', reason);
          expect(error.code).toBe('INVALID_ADDRESS_FORMAT');
          expect(error.context?.reason).toBe(reason);
        });
      });

      it('should create generic error for other reasons', () => {
        const error = createAddressValidationError('addr', 'Unknown validation error');

        expect(error.code).toBe('INVALID_ADDRESS');
        expect(error.context).toEqual({
          address: 'addr',
          reason: 'Unknown validation error',
        });
      });
    });
  });

  describe('Signature Validation Errors', () => {
    describe('createSignatureFormatError', () => {
      it('should create format error with default reason', () => {
        const error = createSignatureFormatError('invalid-sig');

        expect(error.code).toBe('INVALID_SIGNATURE');
        expect(error.context).toEqual({
          signature: 'invalid-sig',
          reason: 'Invalid signature format',
        });
      });

      it('should create format error with custom reason', () => {
        const error = createSignatureFormatError('sig', 'Invalid encoding');

        expect(error.context).toEqual({
          signature: 'sig',
          reason: 'Invalid encoding',
        });
      });
    });

    describe('createSignatureLengthError', () => {
      it('should create length error with correct context', () => {
        const error = createSignatureLengthError('shortsig', 32);

        expect(error.code).toBe('INVALID_SIGNATURE_LENGTH');
        expect(error.context).toEqual({
          signature: 'shortsig',
          length: 32,
          expected: 64,
        });
      });
    });

    describe('createSignatureValidationError', () => {
      it('should create length error for length-related reasons', () => {
        const error = createSignatureValidationError('sig', 'Invalid length: 32 bytes');

        expect(error.code).toBe('INVALID_SIGNATURE_LENGTH');
        expect(error.context?.length).toBe(32);
      });

      it('should create format error for format-related reasons', () => {
        const error = createSignatureValidationError('sig', 'Invalid base58 format');

        expect(error.code).toBe('INVALID_SIGNATURE');
        expect(error.context?.reason).toBe('Invalid base58 format');
      });

      it('should create generic error for other reasons', () => {
        const error = createSignatureValidationError('sig', 'Verification failed');

        expect(error.code).toBe('INVALID_SIGNATURE');
        expect(error.context).toEqual({
          signature: 'sig',
          reason: 'Verification failed',
        });
      });
    });
  });

  describe('Transaction Validation Errors', () => {
    describe('createTransactionSizeError', () => {
      it('should create size error with correct context', () => {
        const error = createTransactionSizeError(1500, 1232);

        expect(error.code).toBe('TRANSACTION_TOO_LARGE');
        expect(error.context).toEqual({
          size: 1500,
          maxSize: 1232,
          bytesOver: 268,
        });
      });
    });

    describe('createInsufficientSignaturesError', () => {
      it('should create insufficient signatures error', () => {
        const error = createInsufficientSignaturesError(3, 1);

        expect(error.code).toBe('INSUFFICIENT_SIGNATURES');
        expect(error.context).toEqual({
          required: 3,
          found: 1,
          missing: 2,
        });
      });
    });

    describe('createDuplicateSignatureError', () => {
      it('should create duplicate signature error without indexes', () => {
        const error = createDuplicateSignatureError('duplicate-sig');

        expect(error.code).toBe('DUPLICATE_SIGNATURE');
        expect(error.context).toEqual({
          signature: 'duplicate-sig',
          indexes: undefined,
        });
      });

      it('should create duplicate signature error with indexes', () => {
        const error = createDuplicateSignatureError('duplicate-sig', [0, 2]);

        expect(error.context).toEqual({
          signature: 'duplicate-sig',
          indexes: [0, 2],
        });
      });
    });

    describe('createInvalidAccountIndexError', () => {
      it('should create invalid account index error', () => {
        const error = createInvalidAccountIndexError(5, 3);

        expect(error.code).toBe('INVALID_ACCOUNT_INDEX');
        expect(error.context).toEqual({
          index: 5,
          maxIndex: 3,
        });
      });

      it('should create error without max index', () => {
        const error = createInvalidAccountIndexError(10);

        expect(error.context).toEqual({
          index: 10,
          maxIndex: undefined,
        });
      });
    });

    describe('createInvalidInstructionDataError', () => {
      it('should create instruction data error with default reason', () => {
        const error = createInvalidInstructionDataError();

        expect(error.code).toBe('INVALID_INSTRUCTION_DATA');
        expect(error.context).toEqual({
          reason: 'Invalid instruction data format or encoding',
        });
      });

      it('should create instruction data error with custom reason', () => {
        const error = createInvalidInstructionDataError('Missing required fields');

        expect(error.context).toEqual({
          reason: 'Missing required fields',
        });
      });
    });

    describe('createInvalidKeypairError', () => {
      it('should create keypair error with default reason', () => {
        const error = createInvalidKeypairError();

        expect(error.code).toBe('INVALID_KEYPAIR');
        expect(error.context).toEqual({
          reason: 'Keypair validation failed',
        });
      });

      it('should create keypair error with custom reason', () => {
        const error = createInvalidKeypairError('Invalid private key');

        expect(error.context).toEqual({
          reason: 'Invalid private key',
        });
      });
    });
  });

  describe('Validation Utilities', () => {
    describe('validateBase58Format', () => {
      it('should return true for valid base58 strings', () => {
        const validBase58 = [
          '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
          '11111111111111111111111111111111',
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        ];

        validBase58.forEach((str) => {
          expect(validateBase58Format(str)).toBe(true);
        });
      });

      it('should return false for invalid base58 strings', () => {
        const invalidBase58 = [
          '', // Empty string
          '0OIl', // Contains invalid characters
          'Hello World!', // Contains spaces and punctuation
          '++==', // Contains invalid symbols
          'address-with-hyphens',
        ];

        invalidBase58.forEach((str) => {
          expect(validateBase58Format(str)).toBe(false);
        });
      });
    });

    describe('validateAddressFormat', () => {
      it('should not throw for valid address formats', () => {
        const validAddresses = [
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          '11111111111111111111111111111111',
          '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        ];

        validAddresses.forEach((address) => {
          expect(() => validateAddressFormat(address)).not.toThrow();
        });
      });

      it('should throw for non-string addresses', () => {
        expect(() => validateAddressFormat(123 as any)).toThrow(SolanaError);
        expect(() => validateAddressFormat(null as any)).toThrow(SolanaError);
        expect(() => validateAddressFormat(undefined as any)).toThrow(SolanaError);
      });

      it('should throw for empty addresses', () => {
        expect(() => validateAddressFormat('')).toThrow(SolanaError);

        try {
          validateAddressFormat('');
        } catch (error) {
          expect(error).toBeInstanceOf(SolanaError);
          expect((error as SolanaError).code).toBe('INVALID_ADDRESS');
        }
      });

      it('should throw for invalid base58 addresses', () => {
        expect(() => validateAddressFormat('invalid0OIl')).toThrow(SolanaError);

        try {
          validateAddressFormat('invalid0OIl');
        } catch (error) {
          expect(error).toBeInstanceOf(SolanaError);
          expect((error as SolanaError).code).toBe('INVALID_ADDRESS_FORMAT');
        }
      });
    });

    describe('validateSignatureFormat', () => {
      it('should not throw for valid signature formats', () => {
        const validSignatures = [
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        ];

        validSignatures.forEach((signature) => {
          expect(() => validateSignatureFormat(signature)).not.toThrow();
        });
      });

      it('should throw for non-string signatures', () => {
        expect(() => validateSignatureFormat(123 as any)).toThrow(SolanaError);
      });

      it('should throw for empty signatures', () => {
        expect(() => validateSignatureFormat('')).toThrow(SolanaError);

        try {
          validateSignatureFormat('');
        } catch (error) {
          expect(error).toBeInstanceOf(SolanaError);
          expect((error as SolanaError).code).toBe('INVALID_SIGNATURE');
        }
      });

      it('should throw for invalid base58 signatures', () => {
        expect(() => validateSignatureFormat('invalid0OIl')).toThrow(SolanaError);

        try {
          validateSignatureFormat('invalid0OIl');
        } catch (error) {
          expect(error).toBeInstanceOf(SolanaError);
          expect((error as SolanaError).code).toBe('INVALID_SIGNATURE');
        }
      });
    });
  });
});
