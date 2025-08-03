// Core key generation functionality
export { generateKeyPair } from './key-generation.js';

// KeyPair wrapper class
export { KeyPair } from './keypair.js';

// Browser compatibility utilities
export {
  checkCryptoCompatibility,
  assertCryptoSupport,
  testEd25519Support,
} from './compatibility.js';

// Message signing functionality
export {
  signBytes,
  signBatch,
  createSignatureValidator,
  createSignature,
  isValidSignature,
} from './signing.js';

// Signature verification functionality
export { verifySignature, verifyBatch, createVerifier } from './signing.js';

// Type definitions
export type {
  KeyGenerationOptions,
  Signature,
  Address,
  IKeyPair,
  CryptoCompatibility,
  SigningOptions,
  BatchSigningOptions,
  BatchSigningResult,
  VerificationOptions,
  BatchVerificationOptions,
  BatchVerificationResult,
  PublicKeyInput,
  VerificationItem,
} from './types.js';
