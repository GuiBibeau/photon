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

// Type definitions
export type {
  KeyGenerationOptions,
  Signature,
  Address,
  IKeyPair,
  CryptoCompatibility,
} from './types.js';
