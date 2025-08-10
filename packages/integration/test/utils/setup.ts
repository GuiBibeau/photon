/**
 * Global test setup and teardown
 * This file is optional and can be enabled in vitest.config.ts
 */
import { startValidator, stopValidator } from './validator.js';

/**
 * Setup function called once before all tests
 */
export async function setup() {
  // Start validator with clean ledger
  await startValidator({
    resetLedger: true,
    quiet: true,
  });
}

/**
 * Teardown function called once after all tests
 */
export async function teardown() {
  await stopValidator();
}
