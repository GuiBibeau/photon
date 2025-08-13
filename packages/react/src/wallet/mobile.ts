import type { Address } from '@photon/addresses';

/**
 * Mobile wallet connection configuration
 */
export interface MobileWalletConfig {
  appUrl?: string;
  associationToken?: string;
  cluster?: 'mainnet-beta' | 'testnet' | 'devnet';
}

/**
 * Deep link configuration for mobile wallets
 */
export interface DeepLinkConfig {
  walletName: string;
  action: 'connect' | 'signTransaction' | 'signMessage';
  params: Record<string, string>;
  returnUrl?: string;
}

/**
 * Check if running on mobile device
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if running in mobile wallet browser
 */
export function isInMobileWalletBrowser(): boolean {
  // Check for common mobile wallet user agents
  const userAgent = navigator.userAgent;
  return (
    userAgent.includes('Phantom') ||
    userAgent.includes('Solflare') ||
    userAgent.includes('Glow') ||
    userAgent.includes('Trust')
  );
}

/**
 * Generate deep link URL for mobile wallet
 */
export function generateDeepLink(config: DeepLinkConfig): string {
  // Implementation will be completed in RW-7
  const { walletName, action, params, returnUrl } = config;

  // Placeholder implementation
  const baseUrl = getWalletDeepLinkBase(walletName);
  const queryParams = new URLSearchParams(params);

  if (returnUrl) {
    queryParams.set('return_url', returnUrl);
  }

  return `${baseUrl}${action}?${queryParams.toString()}`;
}

/**
 * Get wallet-specific deep link base URL
 */
function getWalletDeepLinkBase(walletName: string): string {
  const deepLinkMap: Record<string, string> = {
    phantom: 'phantom://',
    solflare: 'solflare://',
    glow: 'glow://',
    trust: 'trust://',
  };

  return deepLinkMap[walletName.toLowerCase()] || '';
}

/**
 * Generate association token for mobile connection
 */
export async function generateAssociationToken(): Promise<string> {
  // Implementation will be completed in RW-7
  // This will use WebCrypto to generate ECDH keys
  return '';
}

/**
 * QR code data for mobile wallet connection
 */
export interface QRCodeData {
  url: string;
  associationToken: string;
  sessionId: string;
  reflectorUrl?: string;
}

/**
 * Generate QR code data for mobile connection
 */
export function generateQRCodeData(_walletAddress?: Address): QRCodeData {
  // Implementation will be completed in RW-8
  return {
    url: '',
    associationToken: '',
    sessionId: '',
  };
}
