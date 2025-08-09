/**
 * Transaction message builder utilities for Photon SDK.
 *
 * This module provides an immutable, type-safe transaction message builder
 * with support for both legacy and versioned (v0) transactions.
 */

// Core types
export type {
  TransactionVersion,
  Blockhash,
  AccountMeta,
  Instruction,
  AddressLookupTable,
  BaseTransactionMessage,
  TransactionMessage,
  TransactionMessageWithFeePayer,
  TransactionMessageWithLifetime,
  CompileableTransactionMessage,
  BlockhashInfo,
} from './types.js';

// Type utilities
export { blockhash, hasFeePayer, hasLifetime, isCompileable } from './types.js';

// Creation
export { createTransactionMessage } from './create.js';

// Fee payer
export { setTransactionMessageFeePayer } from './fee-payer.js';

// Lifetime
export { setTransactionMessageLifetimeUsingBlockhash } from './lifetime.js';

// Instructions
export {
  appendTransactionMessageInstruction,
  prependTransactionMessageInstruction,
  insertTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  estimateTransactionMessageSize,
} from './instructions.js';
