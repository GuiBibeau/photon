import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type {
  DetectedWallet,
  WalletMetadata,
  WalletProvider,
  WalletFeatures,
  WalletPlatform,
} from '../types';
import { WalletReadyState } from '../types';
import type { StandardWallet, WalletAccount } from './standard-types';
import type { PlatformDetection, IOSLimitations, AndroidCapabilities } from './mobile-types';

/**
 * Provider object injected by wallets
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface InjectedProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  isGlow?: boolean;
  isBrave?: boolean;
  isCoinbaseWallet?: boolean;
  isExodus?: boolean;
  isTrust?: boolean;

  publicKey: { toString(): string } | null;
  isConnected: boolean;

  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: any }>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions?(transactions: any[]): Promise<any[]>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  sendTransaction?(transaction: any, connection: any, options?: any): Promise<string>;

  on(event: string, callback: (...args: any[]) => void): void;
  off?(event: string, callback: (...args: any[]) => void): void;
  removeListener?(event: string, callback: (...args: any[]) => void): void;
  emit?(event: string, ...args: any[]): void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Known wallet window properties
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */
export interface WindowWithWallets extends Window {
  // Common injection patterns
  phantom?: {
    solana?: InjectedProvider;
    ethereum?: any; // Some wallets inject both
  };
  solflare?: InjectedProvider | { solana?: InjectedProvider };
  backpack?: InjectedProvider;
  glow?: InjectedProvider | { solana?: InjectedProvider };
  braveSolana?: InjectedProvider;
  coinbaseSolana?: InjectedProvider;
  exodus?: { solana?: InjectedProvider };
  trustwallet?: { solana?: InjectedProvider };

  // Legacy or alternative patterns
  solana?: InjectedProvider;
  wallet?: InjectedProvider;

  // Wallet Standard
  navigator: {
    wallets?: {
      get(): readonly StandardWallet[];
      on(event: string, callback: Function): () => void;
    };
  } & Navigator;
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */

/**
 * Wallet detection configuration
 */
export interface WalletDetectorConfig {
  timeout?: number;
  pollInterval?: number;
  detectWalletStandard?: boolean;
  detectWindowInjection?: boolean;
  allowMultipleIdentifiers?: boolean; // Security flag
}

/**
 * Provider validation result
 */
export interface ProviderValidationResult {
  isValid: boolean;
  issues: string[];
  securityRisk: 'low' | 'medium' | 'high';
  detectedIdentifiers: string[];
}

/**
 * Wallet detection strategy
 */
export type DetectionStrategy = 'immediate' | 'delayed' | 'manual';

/**
 * Detection result with metadata
 */
export interface DetectionResult {
  wallet: DetectedWallet;
  detectionTime: number; // milliseconds
  strategy: DetectionStrategy;
}

/**
 * Detect installed browser wallets
 */
export async function detectWallets(config?: WalletDetectorConfig): Promise<DetectedWallet[]> {
  const {
    timeout = 3000,
    pollInterval = 100,
    detectWalletStandard = true,
    detectWindowInjection = true,
    allowMultipleIdentifiers = false,
  } = config || {};

  const detectedWallets = new Map<string, DetectedWallet>();
  const startTime = Date.now();

  // 1. Immediate detection of window-injected wallets
  if (detectWindowInjection) {
    const immediateWallets = detectWindowInjectedWallets(allowMultipleIdentifiers);
    immediateWallets.forEach((wallet) => {
      detectedWallets.set(wallet.metadata.name, wallet);
    });
  }

  // 2. Setup Wallet Standard detection
  if (detectWalletStandard) {
    const standardWallets = await detectWalletStandardWallets();
    standardWallets.forEach((wallet) => {
      if (!detectedWallets.has(wallet.metadata.name)) {
        detectedWallets.set(wallet.metadata.name, wallet);
      }
    });
  }

  // 3. Delayed detection for wallets that inject late
  if (detectWindowInjection && timeout > 0) {
    await performDelayedDetection(
      detectedWallets,
      timeout,
      pollInterval,
      startTime,
      allowMultipleIdentifiers,
    );
  }

  return Array.from(detectedWallets.values());
}

/**
 * Detect window-injected wallets immediately
 */
function detectWindowInjectedWallets(allowMultipleIdentifiers: boolean): DetectedWallet[] {
  const wallets: DetectedWallet[] = [];
  const win = window as WindowWithWallets;

  // Check for Phantom
  if (win.phantom?.solana) {
    const validation = validateProvider(win.phantom.solana);
    if (validation.isValid || (allowMultipleIdentifiers && validation.issues.length === 1)) {
      wallets.push(createDetectedWallet('phantom', win.phantom.solana, 'window-injection'));
    }
  }

  // Check for Solflare
  const solflareProvider =
    typeof win.solflare === 'object' && win.solflare !== null && 'solana' in win.solflare
      ? win.solflare.solana
      : win.solflare;
  if (solflareProvider && typeof solflareProvider === 'object') {
    const validation = validateProvider(solflareProvider);
    if (validation.isValid || (allowMultipleIdentifiers && validation.issues.length === 1)) {
      wallets.push(
        createDetectedWallet('solflare', solflareProvider as InjectedProvider, 'window-injection'),
      );
    }
  }

  // Check for Backpack
  if (win.backpack) {
    const validation = validateProvider(win.backpack);
    if (validation.isValid || (allowMultipleIdentifiers && validation.issues.length === 1)) {
      wallets.push(createDetectedWallet('backpack', win.backpack, 'window-injection'));
    }
  }

  // Check for Glow
  const glowProvider =
    typeof win.glow === 'object' && win.glow !== null && 'solana' in win.glow
      ? win.glow.solana
      : win.glow;
  if (glowProvider && typeof glowProvider === 'object') {
    const validation = validateProvider(glowProvider);
    if (validation.isValid || (allowMultipleIdentifiers && validation.issues.length === 1)) {
      wallets.push(
        createDetectedWallet('glow', glowProvider as InjectedProvider, 'window-injection'),
      );
    }
  }

  // Check for Brave
  if (win.braveSolana) {
    const validation = validateProvider(win.braveSolana);
    if (validation.isValid || (allowMultipleIdentifiers && validation.issues.length === 1)) {
      wallets.push(createDetectedWallet('brave', win.braveSolana, 'window-injection'));
    }
  }

  // Check for Coinbase
  if (win.coinbaseSolana) {
    const validation = validateProvider(win.coinbaseSolana);
    if (validation.isValid || (allowMultipleIdentifiers && validation.issues.length === 1)) {
      wallets.push(createDetectedWallet('coinbase', win.coinbaseSolana, 'window-injection'));
    }
  }

  // Check for Exodus
  if (win.exodus?.solana) {
    const validation = validateProvider(win.exodus.solana);
    if (validation.isValid || (allowMultipleIdentifiers && validation.issues.length === 1)) {
      wallets.push(createDetectedWallet('exodus', win.exodus.solana, 'window-injection'));
    }
  }

  // Check for Trust Wallet
  if (win.trustwallet?.solana) {
    const validation = validateProvider(win.trustwallet.solana);
    if (validation.isValid || (allowMultipleIdentifiers && validation.issues.length === 1)) {
      wallets.push(createDetectedWallet('trust', win.trustwallet.solana, 'window-injection'));
    }
  }

  return wallets;
}

/**
 * Detect Wallet Standard compliant wallets
 */
async function detectWalletStandardWallets(): Promise<DetectedWallet[]> {
  const wallets: DetectedWallet[] = [];
  const win = window as WindowWithWallets;

  // Check if Wallet Standard is available
  const registry = win.navigator?.wallets;
  if (!registry) {
    // Dispatch app-ready event to trigger wallet registration
    win.dispatchEvent(new Event('wallet-standard:app-ready'));

    // Wait a bit for wallets to register
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check again
    if (!win.navigator?.wallets) {
      return wallets;
    }
  }

  // Get all registered wallets
  const standardWallets = win.navigator.wallets?.get() || [];

  for (const standardWallet of standardWallets) {
    // Check if wallet supports Solana
    if (!standardWallet.chains.some((chain) => chain.startsWith('solana:'))) {
      continue;
    }

    // Check for required features
    if (
      !standardWallet.features['solana:signTransaction'] ||
      !standardWallet.features['solana:signMessage']
    ) {
      continue;
    }

    // Create a provider adapter for the standard wallet
    const provider = createStandardWalletProvider(standardWallet);
    if (provider) {
      wallets.push({
        provider,
        metadata: {
          name: standardWallet.name,
          icon: standardWallet.icon,
          readyState: WalletReadyState.Installed,
          isInstalled: true,
          isMobile: false,
          features: extractWalletFeatures(standardWallet),
        },
        detectionMethod: 'wallet-standard',
      });
    }
  }

  // Listen for new wallet registrations
  win.navigator.wallets?.on('register', (_wallet: StandardWallet) => {
    // This will be handled by the connection manager
    // New wallet registered: _wallet.name
  });

  return wallets;
}

/**
 * Perform delayed detection for late-injecting wallets
 */
async function performDelayedDetection(
  detectedWallets: Map<string, DetectedWallet>,
  timeout: number,
  pollInterval: number,
  startTime: number,
  allowMultipleIdentifiers: boolean,
): Promise<void> {
  while (Date.now() - startTime < timeout) {
    const newWallets = detectWindowInjectedWallets(allowMultipleIdentifiers);

    for (const wallet of newWallets) {
      if (!detectedWallets.has(wallet.metadata.name)) {
        detectedWallets.set(wallet.metadata.name, wallet);
        // Detected wallet after delay
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

/**
 * Create a detected wallet object
 */
function createDetectedWallet(
  walletName: string,
  provider: InjectedProvider,
  detectionMethod: DetectedWallet['detectionMethod'],
): DetectedWallet {
  const walletInfo = KNOWN_WALLETS[walletName as keyof typeof KNOWN_WALLETS];
  const walletProvider = createInjectedWalletProvider(walletName, provider);

  return {
    provider: walletProvider,
    metadata: {
      name: walletInfo?.name || walletName,
      icon: walletInfo?.icon,
      url: walletInfo?.url,
      readyState: WalletReadyState.Installed,
      isInstalled: true,
      isMobile: isMobileDevice(),
      features: extractProviderFeatures(provider),
    },
    detectionMethod,
  };
}

/**
 * Create a WalletProvider from an injected provider
 */
function createInjectedWalletProvider(
  walletName: string,
  provider: InjectedProvider,
): WalletProvider {
  const walletInfo = KNOWN_WALLETS[walletName as keyof typeof KNOWN_WALLETS];

  return {
    name: walletInfo?.name || walletName,
    icon: walletInfo?.icon,
    url: walletInfo?.url,
    publicKey: null,
    connected: provider.isConnected || false,
    connecting: false,
    features: extractProviderFeatures(provider),

    async connect(options) {
      const result = await provider.connect(options);
      // Update publicKey after connection
      this.publicKey = result.publicKey ? parseAddress(result.publicKey.toString()) : null;
      this.connected = true;
    },

    async disconnect() {
      await provider.disconnect();
      this.publicKey = null;
      this.connected = false;
    },

    async signTransaction(transaction) {
      const signedTx = await provider.signTransaction(transaction);
      return signedTx;
    },

    async signAllTransactions(transactions) {
      if (provider.signAllTransactions) {
        return await provider.signAllTransactions(transactions);
      }
      // Fallback to signing one by one
      const signed = [];
      for (const tx of transactions) {
        signed.push(await provider.signTransaction(tx));
      }
      return signed;
    },

    async signMessage(message) {
      const result = await provider.signMessage(message);
      return result.signature as Signature;
    },

    on(event, listener) {
      provider.on(event, listener);
    },

    off(event, listener) {
      if (provider.off) {
        provider.off(event, listener);
      } else if (provider.removeListener) {
        provider.removeListener(event, listener);
      }
    },
  };
}

/**
 * Create a WalletProvider from a Wallet Standard wallet
 */
function createStandardWalletProvider(wallet: StandardWallet): WalletProvider | null {
  try {
    const features = wallet.features;

    // Required features
    const connectFeature = features['standard:connect'];
    const disconnectFeature = features['standard:disconnect'];
    const signTransactionFeature = features['solana:signTransaction'];
    const signMessageFeature = features['solana:signMessage'];

    if (!connectFeature || !disconnectFeature || !signTransactionFeature || !signMessageFeature) {
      return null;
    }

    let currentAccount: WalletAccount | null = null;

    const provider: WalletProvider = {
      name: wallet.name,
      icon: wallet.icon,
      publicKey: null,
      connected: false,
      connecting: false,
      features: extractWalletFeatures(wallet),

      async connect(options) {
        const connectOptions =
          options?.onlyIfTrusted !== undefined ? { silent: options.onlyIfTrusted } : {};
        const result = await connectFeature.connect(connectOptions);
        if (result.accounts.length > 0) {
          currentAccount = result.accounts[0] ?? null;
          this.publicKey = currentAccount ? parseAddress(currentAccount.address) : null;
          this.connected = true;
        }
      },

      async disconnect() {
        await disconnectFeature.disconnect();
        currentAccount = null;
        this.publicKey = null;
        this.connected = false;
      },

      async signTransaction(transaction) {
        if (!currentAccount) {
          throw new Error('Wallet not connected');
        }
        const result = await signTransactionFeature.signTransaction({
          transaction,
          account: currentAccount,
        });
        return result.signedTransaction;
      },

      async signAllTransactions(transactions) {
        if (!currentAccount) {
          throw new Error('Wallet not connected');
        }
        const signed = [];
        for (const tx of transactions) {
          const result = await signTransactionFeature.signTransaction({
            transaction: tx,
            account: currentAccount,
          });
          signed.push(result.signedTransaction);
        }
        return signed;
      },

      async signMessage(message) {
        if (!currentAccount) {
          throw new Error('Wallet not connected');
        }
        const result = await signMessageFeature.signMessage({
          message,
          account: currentAccount,
        });
        return result.signature as Signature;
      },

      on(event, listener) {
        if (features['standard:events']) {
          features['standard:events'].on('change', (props) => {
            if (event === 'accountChanged' && props.accounts) {
              listener(props.accounts);
            }
          });
        }
      },

      off() {
        // Wallet Standard uses return function from on() for cleanup
      },
    };

    return provider;
  } catch (_error) {
    // Failed to create standard wallet provider
    return null;
  }
}

/**
 * Extract features from an injected provider
 */
function extractProviderFeatures(provider: InjectedProvider): WalletFeatures {
  return {
    signTransaction: typeof provider.signTransaction === 'function',
    signAllTransactions: typeof provider.signAllTransactions === 'function',
    signMessage: typeof provider.signMessage === 'function',
    sendTransaction: typeof provider.sendTransaction === 'function',
  };
}

/**
 * Extract features from a Wallet Standard wallet
 */
function extractWalletFeatures(wallet: StandardWallet): WalletFeatures {
  const features = wallet.features;
  return {
    signTransaction: !!features['solana:signTransaction'],
    signAllTransactions: false, // Standard doesn't have batch signing
    signMessage: !!features['solana:signMessage'],
    signIn: !!features['solana:signIn'],
    versionedTransactions: true, // Most standard wallets support this
    addressLookupTables: true,
  };
}

/**
 * Check if running on a mobile device
 */
function isMobileDevice(): boolean {
  const userAgent = (typeof window !== 'undefined' ? window.navigator.userAgent : '').toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
}

/**
 * Parse address string to Address type
 */
function parseAddress(address: string): Address {
  // This should use the SDK's address parsing
  // For now, return as-is with proper typing
  return address as Address;
}

/**
 * Check if a specific wallet is installed
 */
export function isWalletInstalled(walletName: string): boolean {
  const win = window as WindowWithWallets;

  switch (walletName.toLowerCase()) {
    case 'phantom':
      return !!win.phantom?.solana;
    case 'solflare':
      return !!win.solflare;
    case 'backpack':
      return !!win.backpack;
    case 'glow':
      return !!win.glow;
    case 'brave':
      return !!win.braveSolana;
    default:
      return false;
  }
}

/**
 * Get wallet metadata
 */
export function getWalletMetadata(walletName: string): WalletMetadata {
  const walletInfo = KNOWN_WALLETS[walletName.toLowerCase() as keyof typeof KNOWN_WALLETS];
  const isInstalled = isWalletInstalled(walletName);
  const isMobile = isMobileDevice();

  return {
    name: walletInfo?.name || walletName,
    icon: walletInfo?.icon,
    url: walletInfo?.url,
    readyState: isInstalled ? WalletReadyState.Installed : WalletReadyState.NotDetected,
    isInstalled,
    isMobile,
    platforms: getPlatformSupport(walletName),
  };
}

/**
 * Get platform support for a wallet
 */
function getPlatformSupport(walletName: string): WalletPlatform[] {
  const platforms: WalletPlatform[] = [];
  const wallet = walletName.toLowerCase();

  // Most wallets support browser extensions
  if (['phantom', 'solflare', 'backpack', 'glow', 'brave'].includes(wallet)) {
    platforms.push('browser-extension');
  }

  // Mobile app support
  if (['phantom', 'solflare', 'glow', 'trust'].includes(wallet)) {
    platforms.push('ios', 'android');
  }

  // Backpack has mobile but limited
  if (wallet === 'backpack') {
    platforms.push('android');
  }

  // Hardware wallet support
  if (['solflare'].includes(wallet)) {
    platforms.push('hardware');
  }

  return platforms;
}

/**
 * Validate a provider for security issues
 */
export function validateProvider(provider: unknown): ProviderValidationResult {
  const result: ProviderValidationResult = {
    isValid: false,
    issues: [],
    securityRisk: 'low',
    detectedIdentifiers: [],
  };

  if (!provider || typeof provider !== 'object') {
    result.issues.push('Provider is not an object');
    return result;
  }

  const p = provider as InjectedProvider;

  // Check required methods
  const requiredMethods = ['connect', 'disconnect', 'signTransaction', 'signMessage'];
  for (const method of requiredMethods) {
    if (typeof p[method as keyof InjectedProvider] !== 'function') {
      result.issues.push(`Missing required method: ${method}`);
    }
  }

  // Check for multiple wallet identifiers (potential hijacking)
  const identifiers = [
    'isPhantom',
    'isSolflare',
    'isBackpack',
    'isGlow',
    'isBrave',
    'isCoinbaseWallet',
    'isExodus',
    'isTrust',
  ];

  for (const id of identifiers) {
    if (p[id as keyof InjectedProvider]) {
      result.detectedIdentifiers.push(id);
    }
  }

  if (result.detectedIdentifiers.length > 1) {
    result.issues.push('Multiple wallet identifiers detected');
    result.securityRisk = 'high';
  } else if (result.detectedIdentifiers.length === 0) {
    result.issues.push('No wallet identifier found');
    result.securityRisk = 'medium';
  }

  result.isValid = result.issues.length === 0;
  return result;
}

/**
 * Known wallet registry
 */
export const KNOWN_WALLETS = {
  phantom: {
    name: 'Phantom',
    url: 'https://phantom.app',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.svg',
    deepLink: 'phantom://',
  },
  solflare: {
    name: 'Solflare',
    url: 'https://solflare.com',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/solflare.svg',
    deepLink: 'solflare://',
  },
  backpack: {
    name: 'Backpack',
    url: 'https://backpack.app',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/backpack.svg',
    deepLink: 'backpack://',
  },
  glow: {
    name: 'Glow',
    url: 'https://glow.app',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/glow.svg',
    deepLink: 'glow://',
  },
  brave: {
    name: 'Brave',
    url: 'https://brave.com/wallet',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/brave.svg',
    deepLink: null,
  },
  coinbase: {
    name: 'Coinbase Wallet',
    url: 'https://www.coinbase.com/wallet',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/coinbase.svg',
    deepLink: 'coinbasewallet://',
  },
  exodus: {
    name: 'Exodus',
    url: 'https://exodus.com',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/exodus.svg',
    deepLink: null,
  },
  trust: {
    name: 'Trust Wallet',
    url: 'https://trustwallet.com',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/trust.svg',
    deepLink: 'trust://',
  },
} as const;

/**
 * Mobile detection utilities
 */
export function detectMobilePlatform(): PlatformDetection {
  const userAgent = (typeof window !== 'undefined' ? window.navigator.userAgent : '').toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);

  // Check if running in a wallet's in-app browser
  const inWalletBrowser = checkInWalletBrowser();

  if (isIOS) {
    const version = getIOSVersion(userAgent);
    const result: PlatformDetection = {
      platform: 'ios',
      inWalletBrowser,
      capabilities: {
        noLocalWebSocket: true,
        noMWA: true,
        backgroundDrops: true,
        requiresUniversalLinks: false, // We're using custom schemes only
      } as IOSLimitations,
    };
    if (version) {
      result.version = version;
    }
    if (inWalletBrowser) {
      const walletApp = detectWalletApp(userAgent);
      if (walletApp) {
        result.walletApp = walletApp;
      }
    }
    return result;
  }

  if (isAndroid) {
    const version = getAndroidVersion(userAgent);
    const result: PlatformDetection = {
      platform: 'android',
      inWalletBrowser,
      capabilities: {
        mwaSupport: true,
        localWebSocket: true,
        intents: true,
        customSchemes: true,
      } as AndroidCapabilities,
    };
    if (version) {
      result.version = version;
    }
    if (inWalletBrowser) {
      const walletApp = detectWalletApp(userAgent);
      if (walletApp) {
        result.walletApp = walletApp;
      }
    }
    return result;
  }

  return {
    platform: 'unknown',
    inWalletBrowser: false,
    capabilities: null,
  };
}

/**
 * Check if running in a wallet's in-app browser
 */
function checkInWalletBrowser(): boolean {
  const userAgent = (typeof window !== 'undefined' ? window.navigator.userAgent : '').toLowerCase();

  // Known wallet in-app browser signatures
  const walletSignatures = ['phantom', 'solflare', 'glow', 'trust', 'backpack'];

  return walletSignatures.some((sig) => userAgent.includes(sig));
}

/**
 * Detect which wallet app the browser is running in
 */
function detectWalletApp(userAgent: string): string | undefined {
  const ua = userAgent.toLowerCase();

  if (ua.includes('phantom')) {
    return 'phantom';
  }
  if (ua.includes('solflare')) {
    return 'solflare';
  }
  if (ua.includes('glow')) {
    return 'glow';
  }
  if (ua.includes('trust')) {
    return 'trust';
  }
  if (ua.includes('backpack')) {
    return 'backpack';
  }

  return undefined;
}

/**
 * Get iOS version from user agent
 */
function getIOSVersion(userAgent: string): string | undefined {
  const match = userAgent.match(/os (\d+)_(\d+)/);
  if (match) {
    return `${match[1]}.${match[2]}`;
  }
  return undefined;
}

/**
 * Get Android version from user agent
 */
function getAndroidVersion(userAgent: string): string | undefined {
  const match = userAgent.match(/android (\d+(?:\.\d+)?)/i);
  if (match) {
    return match[1];
  }
  return undefined;
}
