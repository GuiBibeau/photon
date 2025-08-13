// Types for Mobile Wallet Adapter Protocol
// Address and Transaction types are imported where needed

/**
 * Mobile Wallet Adapter (MWA) Protocol Types
 * Serverless Android wallet connection via localhost WebSocket
 */

/**
 * MWA session configuration
 */
export interface MWASessionConfig {
  // Network binding (always localhost for security)
  host: '127.0.0.1' | 'localhost';
  // Port range: 49152-65535 (ephemeral ports)
  port: number;
  // Session timeout in milliseconds
  timeout?: number;
  // Encryption parameters
  encryption?: MWAEncryptionConfig;
}

/**
 * MWA encryption configuration for secure sessions
 */
export interface MWAEncryptionConfig {
  // ECDH key exchange parameters
  algorithm: 'ECDH';
  curve: 'P-256';
  // AES encryption for session
  sessionCipher: 'AES-128-GCM';
}

/**
 * Android Intent for wallet connection
 */
export interface AndroidIntent {
  action: 'android.intent.action.VIEW';
  uri: string; // solana-wallet://...
  category?: 'android.intent.category.BROWSABLE';
  flags?: number;
  extras?: Record<string, unknown>;
}

/**
 * MWA connection request
 */
export interface MWAConnectionRequest {
  type: 'HELLO_REQ';
  publicKey: Uint8Array; // ECDH public key
  associationToken: string;
  appIdentity?: AppIdentity;
}

/**
 * MWA connection response
 */
export interface MWAConnectionResponse {
  type: 'HELLO_RSP';
  publicKey: Uint8Array; // Wallet's ECDH public key
  associationToken: string;
}

/**
 * App identity for MWA
 */
export interface AppIdentity {
  identityName?: string;
  iconUri?: string;
  identityUri?: string;
  cluster?: 'mainnet-beta' | 'testnet' | 'devnet';
}

/**
 * MWA authorization request
 */
export interface MWAAuthorizationRequest {
  type: 'authorize';
  appIdentity: AppIdentity;
  cluster?: string;
  features?: string[];
  addresses?: string[];
  authToken?: string;
}

/**
 * MWA authorization response
 */
export interface MWAAuthorizationResponse {
  type: 'authorize_response';
  authToken: string;
  accounts: MWAAccount[];
  walletUriBase?: string;
  cluster?: string;
}

/**
 * MWA account representation
 */
export interface MWAAccount {
  address: string;
  displayAddress?: string;
  displayAddressFormat?: 'base58' | 'base64';
  accountLabel?: string;
  icon?: string;
  chains?: string[];
  features?: string[];
}

/**
 * MWA sign transaction request
 */
export interface MWASignTransactionRequest {
  type: 'sign_transactions';
  authToken: string;
  transactions: string[]; // Base64 encoded transactions
  minContextSlot?: number;
}

/**
 * MWA sign transaction response
 */
export interface MWASignTransactionResponse {
  type: 'sign_transactions_response';
  signedTransactions: string[]; // Base64 encoded signed transactions
}

/**
 * MWA sign message request
 */
export interface MWASignMessageRequest {
  type: 'sign_messages';
  authToken: string;
  addresses: string[];
  messages: string[]; // Base64 encoded messages
}

/**
 * MWA sign message response
 */
export interface MWASignMessageResponse {
  type: 'sign_messages_response';
  signedMessages: string[]; // Base64 encoded signatures
}

/**
 * MWA error response
 */
export interface MWAErrorResponse {
  type: 'error';
  errorCode: MWAErrorCode;
  errorMessage?: string;
}

/**
 * MWA error codes
 */
export enum MWAErrorCode {
  // Authorization errors
  AUTHORIZATION_NOT_VALID = -1,
  NOT_AUTHORIZED = -2,

  // Request errors
  TOO_MANY_PAYLOADS = -3,
  REQUEST_TOO_LARGE = -4,

  // Session errors
  SESSION_CLOSED = -5,
  SESSION_TIMEOUT = -6,

  // User errors
  USER_DECLINED = -7,

  // System errors
  INTERNAL_ERROR = -100,
}

/**
 * Deep link configuration for mobile wallets
 */
export interface DeepLinkWalletConfig {
  // Wallet identifier
  walletName: string;

  // URL schemes (custom)
  scheme: string; // e.g., 'phantom://', 'solflare://'

  // Universal Link base (requires server)
  universalLink?: string; // e.g., 'https://phantom.app/ul/v1'

  // Supported actions
  supportedActions: DeepLinkAction[];

  // Platform support
  platforms: MobilePlatform[];
}

/**
 * Deep link action types
 */
export type DeepLinkAction =
  | 'connect'
  | 'disconnect'
  | 'signTransaction'
  | 'signAllTransactions'
  | 'signMessage'
  | 'signIn';

/**
 * Mobile platforms
 */
export type MobilePlatform = 'ios' | 'android';

/**
 * Deep link request parameters
 */
export interface DeepLinkRequest {
  action: DeepLinkAction;
  params: {
    // Common parameters
    dapp_name?: string;
    dapp_url?: string;
    cluster?: string;

    // Connection parameters
    public_key?: string;
    session?: string;

    // Transaction parameters
    transaction?: string; // Base64 encoded
    transactions?: string[]; // Base64 encoded array

    // Message parameters
    message?: string; // Base64 encoded
    display?: 'utf8' | 'hex';

    // Return URL for result
    redirect_link?: string;
  };
}

/**
 * Deep link response via redirect
 */
export interface DeepLinkResponse {
  // Success response
  signature?: string;
  signatures?: string[];
  public_key?: string;
  session?: string;

  // Error response
  error?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Mobile connection method
 */
export type MobileConnectionMethod =
  | 'mwa' // Mobile Wallet Adapter (Android)
  | 'deep-link-custom' // Custom URL schemes (serverless)
  | 'deep-link-universal' // Universal Links (requires server)
  | 'in-app-browser'; // Wallet's built-in browser

/**
 * Mobile wallet detection result
 */
export interface MobileWalletDetection {
  method: MobileConnectionMethod;
  available: boolean;
  walletName?: string;
  appInstalled?: boolean;
  limitations?: string[];
}

/**
 * iOS-specific limitations
 */
export interface IOSLimitations {
  // No localhost WebSocket support
  noLocalWebSocket: true;
  // No MWA protocol support
  noMWA: true;
  // Background connection drops
  backgroundDrops: true;
  // Requires Universal Links for verified deep links
  requiresUniversalLinks: boolean;
}

/**
 * Android capabilities
 */
export interface AndroidCapabilities {
  // Supports MWA protocol
  mwaSupport: true;
  // Allows localhost WebSocket
  localWebSocket: true;
  // Intent-based communication
  intents: true;
  // Custom URL schemes without verification
  customSchemes: true;
}

/**
 * Platform detection result
 */
export interface PlatformDetection {
  platform: 'ios' | 'android' | 'unknown';
  version?: string;
  inWalletBrowser: boolean;
  walletApp?: string;
  capabilities: IOSLimitations | AndroidCapabilities | null;
}

/**
 * Association token for mobile connections
 */
export interface AssociationToken {
  token: string;
  publicKey: Uint8Array;
  privateKey: CryptoKey; // WebCrypto key
  expiresAt: number;
}

/**
 * Generate association token for mobile connection
 */
export interface AssociationTokenGenerator {
  generate(): Promise<AssociationToken>;
  deriveSharedSecret(peerPublicKey: Uint8Array, privateKey: CryptoKey): Promise<Uint8Array>;
  deriveSessionKey(sharedSecret: Uint8Array): Promise<CryptoKey>;
}
