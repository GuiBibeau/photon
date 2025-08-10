/**
 * Test validator management utilities
 */
import { spawn, type ChildProcess } from 'child_process';
import { rm } from 'fs/promises';
import { join } from 'path';

let validatorProcess: ChildProcess | null = null;
const LEDGER_PATH = join(__dirname, '../../test-ledger');
const RPC_PORT = 8899;
const RPC_URL = `http://127.0.0.1:${RPC_PORT}`;

export interface ValidatorOptions {
  resetLedger?: boolean;
  quiet?: boolean;
  rpcPort?: number;
  /** Pre-funded accounts in lamports */
  accounts?: Array<{
    pubkey: string;
    lamports: number;
  }>;
}

/**
 * Start the Solana test validator
 */
export async function startValidator(options: ValidatorOptions = {}): Promise<void> {
  const { resetLedger = true, quiet = true, rpcPort = RPC_PORT, accounts = [] } = options;

  // Stop any existing validator
  await stopValidator();

  // Reset ledger if requested
  if (resetLedger) {
    await rm(LEDGER_PATH, { recursive: true, force: true });
  }

  const args = ['--ledger', LEDGER_PATH, '--rpc-port', String(rpcPort)];

  if (quiet) {
    args.push('--quiet');
  }

  // Add pre-funded accounts
  for (const account of accounts) {
    args.push('--account', account.pubkey, String(account.lamports));
  }

  validatorProcess = spawn('solana-test-validator', args, {
    stdio: quiet ? 'ignore' : 'inherit',
    detached: false,
  });

  // Wait for validator to be ready
  await waitForValidator(rpcPort);
}

/**
 * Stop the test validator
 */
export async function stopValidator(): Promise<void> {
  if (validatorProcess) {
    validatorProcess.kill('SIGTERM');

    // Wait for process to exit
    await new Promise<void>((resolve) => {
      if (!validatorProcess) {
        resolve();
        return;
      }

      validatorProcess.on('exit', () => {
        validatorProcess = null;
        resolve();
      });

      // Force kill after timeout
      setTimeout(() => {
        if (validatorProcess) {
          validatorProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);
    });
  }
}

/**
 * Reset the validator with a fresh ledger
 */
export async function resetValidator(options: ValidatorOptions = {}): Promise<void> {
  await stopValidator();
  await startValidator({ ...options, resetLedger: true });
}

/**
 * Wait for the validator to be ready
 */
async function waitForValidator(port: number, maxAttempts = 30): Promise<void> {
  const url = `http://127.0.0.1:${port}`;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result === 'ok') {
          return;
        }
      }
    } catch {
      // Validator not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Validator failed to start after ${maxAttempts} attempts`);
}

/**
 * Get the RPC URL for the test validator
 */
export function getValidatorUrl(): string {
  return RPC_URL;
}

/**
 * Ensure the validator is cleaned up on process exit
 */
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    if (validatorProcess) {
      validatorProcess.kill('SIGKILL');
    }
  });
}
