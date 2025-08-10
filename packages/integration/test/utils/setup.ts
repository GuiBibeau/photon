/**
 * Global test setup and teardown
 * This file is optional and can be enabled in vitest.config.ts
 */
import { startValidator, stopValidator } from './validator.js';

/**
 * Setup function called once before all tests
 */
export async function setup() {
  console.log('Starting global test validator...');

  // Start validator with clean ledger
  await startValidator({
    resetLedger: true,
    quiet: true,
  });

  console.log('Global test validator ready');
}

/**
 * Teardown function called once after all tests
 */
export async function teardown() {
  console.log('Stopping global test validator...');
  await stopValidator();
  console.log('Global test validator stopped');
}
