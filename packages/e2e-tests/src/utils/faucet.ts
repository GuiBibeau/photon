/**
 * Faucet utilities for getting devnet SOL
 */

import type { Address } from '@photon/addresses';

export interface AirdropResult {
  success: boolean;
  signature?: string;
  error?: string;
  amount: number;
}

/**
 * Request an airdrop of SOL
 * @param address - The address to receive SOL
 * @param rpcUrl - The RPC URL to use
 * @param amount - Amount in SOL (default 1 SOL, max 2 SOL)
 */
export async function requestAirdrop(
  address: Address,
  rpcUrl: string,
  amount: number = 1,
): Promise<AirdropResult> {
  try {
    // Check if airdrop is supported (only devnet and localhost)
    if (
      !rpcUrl.includes('devnet') &&
      !rpcUrl.includes('localhost') &&
      !rpcUrl.includes('127.0.0.1')
    ) {
      return {
        success: false,
        error: 'Airdrop only available on devnet and localhost',
        amount: 0,
      };
    }

    // Devnet allows max 2 SOL per request
    const lamports = Math.min(amount * 1_000_000_000, 2_000_000_000);

    // Make RPC request for airdrop
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'requestAirdrop',
        params: [address, lamports],
      }),
    });

    const result = await response.json();

    if (result.error) {
      return {
        success: false,
        error: result.error.message || 'Airdrop failed',
        amount: 0,
      };
    }

    return {
      success: true,
      signature: result.result,
      amount: lamports / 1_000_000_000,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      amount: 0,
    };
  }
}

/**
 * Check airdrop status
 */
export async function checkAirdropStatus(
  signature: string,
  rpcUrl: string,
): Promise<'confirmed' | 'pending' | 'failed'> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignatureStatuses',
        params: [[signature]],
      }),
    });

    const result = await response.json();

    if (result.result?.value?.[0]) {
      const status = result.result.value[0];
      if (status.confirmationStatus === 'finalized' || status.confirmationStatus === 'confirmed') {
        return 'confirmed';
      }
      if (status.err) {
        return 'failed';
      }
    }

    return 'pending';
  } catch {
    return 'failed';
  }
}

/**
 * Get account balance
 */
export async function getBalance(address: Address, rpcUrl: string): Promise<number> {
  try {
    console.log(`Fetching balance for ${address} from ${rpcUrl}`);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      }),
    });

    const result = await response.json();
    console.log('Balance response:', result);

    if (result.result?.value !== undefined) {
      const balanceInSol = result.result.value / 1_000_000_000; // Convert lamports to SOL
      console.log(`Balance: ${balanceInSol} SOL`);
      return balanceInSol;
    }

    if (result.error) {
      console.error('RPC error:', result.error);
    }

    return 0;
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    return 0;
  }
}
