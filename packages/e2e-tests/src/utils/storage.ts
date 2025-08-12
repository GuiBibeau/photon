/**
 * Local storage utilities for persisting keypairs
 */

const STORAGE_KEY = 'photon_demo_wallets';

export interface StoredWallet {
  name: string;
  address: string;
  privateKey: string; // Base64 encoded private key
  publicKey?: string; // Base64 encoded public key (optional for backward compatibility)
  createdAt: number;
}

export function getStoredWallets(): StoredWallet[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load wallets:', error);
    return [];
  }
}

export function saveWallet(wallet: StoredWallet): void {
  try {
    const wallets = getStoredWallets();
    // Check if wallet already exists
    const exists = wallets.some((w) => w.address === wallet.address);
    if (!exists) {
      wallets.push(wallet);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
    }
  } catch (error) {
    console.error('Failed to save wallet:', error);
  }
}

export function deleteWallet(address: string): void {
  try {
    const wallets = getStoredWallets();
    const filtered = wallets.filter((w) => w.address !== address);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete wallet:', error);
  }
}

export function clearAllWallets(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear wallets:', error);
  }
}

// Convert CryptoKey to storable format
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Export both keys from a CryptoKeyPair
export async function exportKeyPair(
  keyPair: CryptoKeyPair,
): Promise<{ privateKey: string; publicKey: string }> {
  const privateExported = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const publicExported = await crypto.subtle.exportKey('raw', keyPair.publicKey);

  return {
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privateExported))),
    publicKey: btoa(String.fromCharCode(...new Uint8Array(publicExported))),
  };
}

// Import private key from storage
export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  const binaryString = atob(base64Key);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return crypto.subtle.importKey('pkcs8', bytes, { name: 'Ed25519' }, false, ['sign']);
}

// Import a full CryptoKeyPair from storage
export async function importKeyPair(
  privateKeyBase64: string,
  publicKeyBase64: string,
): Promise<CryptoKeyPair> {
  // Import private key
  const privateBinaryString = atob(privateKeyBase64);
  const privateBytes = new Uint8Array(privateBinaryString.length);
  for (let i = 0; i < privateBinaryString.length; i++) {
    privateBytes[i] = privateBinaryString.charCodeAt(i);
  }

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateBytes,
    { name: 'Ed25519' },
    true, // Make extractable
    ['sign'],
  );

  // Import public key
  const publicBinaryString = atob(publicKeyBase64);
  const publicBytes = new Uint8Array(publicBinaryString.length);
  for (let i = 0; i < publicBinaryString.length; i++) {
    publicBytes[i] = publicBinaryString.charCodeAt(i);
  }

  const publicKey = await crypto.subtle.importKey('raw', publicBytes, { name: 'Ed25519' }, true, [
    'verify',
  ]);

  return { privateKey, publicKey };
}
