# React Wallet SDK - Task List (Serverless)

## Epic 1: Core Wallet Connection Infrastructure

### ✅ RW-1: Define wallet provider interfaces

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `wallet`, `core`  
**Dependencies**: SDK core modules

**Description**:
Create TypeScript interfaces for wallet providers that abstract browser extension wallets while maintaining zero dependencies.

**Acceptance Criteria**:
- Define `WalletProvider` interface:
  - Connection methods
  - Event emitters
  - Public key access
  - Transaction signing
- Create `WalletMetadata` type:
  - Name, icon, URL
  - Ready state
  - Feature support flags
- Add provider detection types:
  - Window injection patterns
  - Wallet Standard events
  - Mobile deep links
- Error types:
  - Connection errors
  - User rejection
  - Timeout errors
- Compatibility with SDK types:
  - Use SDK's Address type
  - Use SDK's Transaction types
  - Use SDK's Signer interface

---

### ✅ RW-2: Implement wallet detector

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `wallet`, `detection`  
**Dependencies**: RW-1

**Description**:
Build a comprehensive wallet detection system that identifies installed browser wallets and their capabilities.

**Acceptance Criteria**:
- Browser wallet detection:
  - Phantom (`window.phantom.solana`)
  - Solflare (`window.solflare`)
  - Backpack (`window.backpack`)
  - Glow (`window.glow`)
  - Brave (`window.braveSolana`)
- Wallet Standard support:
  - Listen for `wallet-standard:register-wallet`
  - Dispatch `wallet-standard:app-ready`
  - Parse wallet features
- Detection strategies:
  - Immediate detection on load
  - Delayed detection (100ms intervals)
  - Maximum wait time (3 seconds)
- Provider validation:
  - Check for multiple identifiers (security)
  - Validate required methods
  - Detect potential hijacking
- Return detected wallets:
  - Name and metadata
  - Provider reference
  - Feature capabilities
- Mobile detection:
  - Check user agent
  - Available deep links
  - Platform capabilities

---

### ✅ RW-3: Create connection manager

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `wallet`, `connection`  
**Dependencies**: RW-2

**Description**:
Implement the core connection management logic for handling wallet connections, disconnections, and state.

**Acceptance Criteria**:
- Connection flow:
  - Request connection permission
  - Handle user approval/rejection
  - Extract public key
  - Store connection state
- Multi-wallet support:
  - Track multiple providers
  - Switch between wallets
  - Maintain separate states
- Event handling:
  - `connect` events
  - `disconnect` events
  - `accountChanged` events
  - Error events
- Session persistence:
  - Save to localStorage
  - Restore on page reload
  - Expiry handling (24h)
  - Clear on disconnect
- Security:
  - Origin verification
  - Connection rate limiting (5 attempts/minute)
  - Provider validation
  - Exponential backoff on failures

---

### ✅ RW-4: Build useWallet hook

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `wallet`, `hook`  
**Dependencies**: RW-3

**Description**:
Create the primary React hook for wallet connection management with comprehensive state and methods.

**Acceptance Criteria**:
- Hook state:
  - `connected: boolean`
  - `connecting: boolean`
  - `publicKey: Address | null`
  - `wallet: string | null`
  - `error: Error | null`
- Connection methods:
  - `connect(walletName?: string)`
  - `disconnect()`
  - `select(walletName: string)`
  - `autoConnect()`
- Available wallets:
  - List detected wallets
  - Installation status
  - Ready state
  - Platform availability
- Event subscriptions:
  - Auto-cleanup on unmount
  - Reconnection handling
  - Error recovery
- TypeScript support:
  - Full type inference
  - Generic wallet types
- Connection strategy:
  - Detect optimal method
  - Platform-specific logic

---

### ✅ RW-5: Implement auto-connect logic

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `wallet`, `ux`  
**Dependencies**: RW-4

**Description**:
Build intelligent auto-connection that remembers user preferences and reconnects appropriately.

**Acceptance Criteria**:
- Preference storage:
  - Save last connected wallet
  - Connection timestamp
  - Auto-connect preference
- Reconnection logic:
  - Check saved preferences
  - Validate expiry (24h default)
  - Attempt silent reconnection
  - Fall back gracefully
- User control:
  - Enable/disable auto-connect
  - Clear preferences
  - Eager vs lazy connection
- Only-if-trusted mode:
  - Use `onlyIfTrusted` flag
  - No popup if untrusted
  - Silent failure handling
- Loading states:
  - Show connecting state
  - Timeout after 5 seconds

---

## Epic 2: Security & Validation

### ✅ RW-6: Implement wallet verification

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `security`, `wallet`  
**Dependencies**: RW-2

**Description**:
Add comprehensive security checks to prevent wallet hijacking and validate provider authenticity.

**Acceptance Criteria**:
- Provider validation:
  - Check single identifier only
  - Validate required methods
  - Verify method signatures
  - Detect suspicious patterns
- Custom scheme security:
  - Acknowledge hijacking risk
  - Implement verification flow
  - Public key consistency check
  - Session validation
- Origin verification:
  - Check window.location.origin
  - Allowed origins list
  - Reject unknown origins
- Security alerts:
  - Multiple identifiers warning
  - Suspicious behavior detection
  - User notification system
- Audit logging:
  - Connection attempts
  - Validation failures
  - Security events

---

### ✅ RW-7: Add connection rate limiting

**Priority**: High | **Story Points**: 2 | **Labels**: `feature`, `security`, `wallet`  
**Dependencies**: RW-6

**Description**:
Implement rate limiting to prevent connection spam and abuse.

**Acceptance Criteria**:
- Rate limit implementation:
  - 5 attempts per minute
  - Per-wallet tracking
  - Global limit (10/minute)
- Exponential backoff:
  - Start at 1 second
  - Double on each failure
  - Max 30 seconds
  - Reset on success
- Storage mechanism:
  - Track in memory
  - Optional localStorage
  - Clear old entries
- User feedback:
  - Show cooldown timer
  - Clear error messages
  - Retry availability
- Override mechanism:
  - Manual retry option
  - Clear rate limit

---

## Epic 3: Transaction Signing

### ✅  RW-8: Build transaction signer

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `wallet`, `transactions`  
**Dependencies**: RW-4, SDK transactions

**Description**:
Implement transaction signing that integrates with the SDK's transaction system.

**Acceptance Criteria**:
- Sign transaction:
  - Accept SDK Transaction type
  - Request wallet signature
  - Handle user approval
  - Return signed transaction
- Batch signing:
  - Sign multiple transactions
  - Atomic operation
  - Progress tracking
- Integration with SDK:
  - Use SDK's Transaction type
  - Compatible with SDK's RPC
  - Proper serialization
- Mobile considerations:
  - Handle app switches
  - Maintain state
  - Recovery on return
- Error handling:
  - User rejection
  - Invalid transaction
  - Wallet errors
  - Timeout handling
- Version support:
  - Legacy transactions
  - Versioned transactions
  - Address lookup tables

---

### ✅ RW-9: Add message signing

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `wallet`, `auth`  
**Dependencies**: RW-8

**Description**:
Implement message signing for authentication and proof of ownership.

**Acceptance Criteria**:
- Sign message:
  - Accept string or Uint8Array
  - UTF-8 encoding
  - Request signature
  - Return signature bytes
- Sign-in with Solana:
  - SIWS message format
  - Domain binding
  - Nonce generation
  - Expiry handling
- Signature verification:
  - Verify with public key
  - Use SDK crypto module
  - Return boolean
- Mobile handling:
  - Deep link for signing
  - Return URL with signature
  - State preservation
- Use cases:
  - Authentication
  - Terms acceptance
  - Proof of ownership
- Type safety:
  - Message types
  - Signature format

---

## Epic 4: Essential Wallet Operations

### RW-10: Create useBalance hook

**Priority**: Highest | **Story Points**: 3 | **Labels**: `feature`, `wallet`, `balance`  
**Dependencies**: RW-4, SDK RPC

**Description**:
Build a React hook for fetching and monitoring SOL balance with real-time updates.

**Acceptance Criteria**:
- Balance fetching:
  - Get SOL balance
  - Use SDK's RPC client
  - Handle null accounts
  - Convert lamports to SOL
- Real-time updates:
  - WebSocket subscription
  - Balance changes
  - Auto-refresh option
  - Polling fallback
- Hook interface:
  - `balance: number | null`
  - `isLoading: boolean`
  - `error: Error | null`
  - `refetch()`
- Performance:
  - Cache results
  - Dedupe requests
  - Stale-while-revalidate
- Multiple addresses:
  - Support address array
  - Batch RPC calls

---

### RW-11: Implement useSendSOL hook

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `wallet`, `transfer`  
**Dependencies**: RW-8, SDK transactions

**Description**:
Create a hook for sending SOL with automatic transaction building and confirmation.

**Acceptance Criteria**:
- Transaction building:
  - System transfer instruction
  - Use SDK's transaction builder
  - Set proper fee payer
  - Recent blockhash
- Send function:
  - `sendSOL(to: Address, amount: number)`
  - Convert SOL to lamports
  - Build transaction
  - Sign and send
- Confirmation:
  - Wait for confirmation
  - Configurable commitment
  - Return signature
  - Track status
- Hook state:
  - `isLoading: boolean`
  - `error: Error | null`
  - `signature: string | null`
  - `status: 'idle' | 'signing' | 'sending' | 'confirming' | 'confirmed'`
- Error handling:
  - Insufficient balance
  - Network errors
  - User rejection

---

### RW-12: Add useAirdrop hook

**Priority**: Medium | **Story Points**: 2 | **Labels**: `feature`, `wallet`, `devnet`  
**Dependencies**: RW-4, SDK RPC

**Description**:
Implement airdrop functionality for development and testing on devnet/testnet.

**Acceptance Criteria**:
- Airdrop request:
  - Check network (devnet/testnet only)
  - Request airdrop RPC call
  - Configurable amount
  - Return signature
- Confirmation:
  - Wait for confirmation
  - Update balance
  - Success notification
- Rate limiting:
  - Track recent requests
  - Prevent spam
  - Show cooldown
- Hook interface:
  - `requestAirdrop(amount?: number)`
  - `isLoading: boolean`
  - `canRequest: boolean`
  - `lastRequest: Date | null`
- Network validation:
  - Disable on mainnet
  - Show appropriate message

---

### RW-13: Create useTransactionHistory hook

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `wallet`, `history`  
**Dependencies**: RW-4, SDK RPC

**Description**:
Build a hook for fetching and displaying recent transactions for the connected wallet.

**Acceptance Criteria**:
- Fetch transactions:
  - Get signatures for address
  - Configurable limit
  - Parse transaction details
  - Sort by timestamp
- Transaction data:
  - Signature
  - Timestamp
  - Status (success/error)
  - Fee amount
  - Instructions summary
- Pagination:
  - Load more functionality
  - Before/after cursors
  - Infinite scroll support
- Real-time updates:
  - New transaction detection
  - WebSocket subscription
  - Prepend to list
- Filtering:
  - By status
  - By date range
  - By program

---

## Epic 5: SPL Token Operations

### RW-14: Build useTokenBalances hook

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `tokens`, `balance`  
**Dependencies**: RW-4, SDK RPC

**Description**:
Create a comprehensive hook for fetching all SPL token balances for the connected wallet.

**Acceptance Criteria**:
- Fetch token accounts:
  - Get all token accounts by owner
  - Parse account data
  - Extract mint and amount
  - Handle associated token accounts
- Token metadata:
  - Fetch from token list
  - Name, symbol, decimals
  - Logo URLs
  - Coingecko ID
- Balance formatting:
  - Convert from raw amount
  - Apply decimals
  - Human-readable format
- Performance:
  - Batch metadata fetching
  - Cache token info
  - Progressive loading
- Hook interface:
  - `tokens: TokenBalance[]`
  - `isLoading: boolean`
  - `refetch()`
  - `totalValue: number`

---

### RW-15: Implement useSendToken hook

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `tokens`, `transfer`  
**Dependencies**: RW-14, SDK transactions

**Description**:
Create a hook for sending SPL tokens with automatic ATA creation if needed.

**Acceptance Criteria**:
- Token transfer:
  - Build transfer instruction
  - Handle token program
  - Apply proper decimals
  - Check sufficient balance
- ATA handling:
  - Check recipient ATA exists
  - Create if missing
  - Add creation instruction
  - Calculate additional fee
- Transaction flow:
  - Build complete transaction
  - Get wallet signature
  - Send and confirm
  - Return signature
- Hook interface:
  - `sendToken(mint, to, amount)`
  - `isLoading: boolean`
  - `requiresATACreation: boolean`
  - `estimatedFee: number`
- Error handling:
  - Insufficient token balance
  - ATA creation failure

---

### RW-16: Add useCreateTokenAccount hook

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `tokens`, `accounts`  
**Dependencies**: RW-4, SDK transactions

**Description**:
Implement token account creation with support for both regular and associated token accounts.

**Acceptance Criteria**:
- Create token account:
  - Generate new account keypair
  - Calculate rent exemption
  - Build creation instructions
  - Initialize token account
- Associated token account:
  - Derive ATA address
  - Check if exists
  - Create idempotently
  - Return address
- Hook interface:
  - `createTokenAccount(mint, owner?)`
  - `createATA(mint, owner?)`
  - `accountAddress: Address | null`
  - `isLoading: boolean`
- Cost estimation:
  - Calculate rent
  - Show to user
  - Include in transaction
- Batch creation:
  - Multiple accounts
  - Single transaction

---

### RW-17: Create useTokenMetadata hook

**Priority**: Medium | **Story Points**: 3 | **Labels**: `feature`, `tokens`, `metadata`  
**Dependencies**: RW-14

**Description**:
Build a hook for fetching and caching token metadata from various sources.

**Acceptance Criteria**:
- Metadata sources:
  - Solana token list
  - On-chain metadata (Metaplex)
  - Fallback to Coingecko
  - Jupiter token API
- Data structure:
  - Name, symbol, decimals
  - Logo URL
  - Description
  - Website, social links
- Caching strategy:
  - Memory cache
  - LocalStorage cache
  - TTL (24 hours)
  - Cache invalidation
- Hook interface:
  - `useTokenMetadata(mint)`
  - `metadata: TokenMetadata | null`
  - `isLoading: boolean`
  - `refetch()`
- Batch fetching:
  - Multiple mints
  - Dedupe requests

---

### RW-18: Implement useWrapSOL hook

**Priority**: Medium | **Story Points**: 3 | **Labels**: `feature`, `tokens`, `wsol`  
**Dependencies**: RW-15

**Description**:
Create functionality for wrapping and unwrapping SOL to wSOL for DeFi operations.

**Acceptance Criteria**:
- Wrap SOL:
  - Create wSOL account
  - Transfer SOL
  - Sync native instruction
  - Return wSOL balance
- Unwrap wSOL:
  - Close wSOL account
  - Return SOL to wallet
  - Clean up account
- Auto-wrap detection:
  - Check if wSOL needed
  - Suggest wrapping
  - Calculate amount
- Hook interface:
  - `wrapSOL(amount)`
  - `unwrapSOL(amount?)`
  - `wsolBalance: number`
  - `hasWSolAccount: boolean`
- Transaction optimization:
  - Combine with other instructions
  - Minimize accounts

---

## Epic 6: DeFi Integrations

### RW-19: Build useTokenPrice hook

**Priority**: High | **Story Points**: 5 | **Labels**: `feature`, `defi`, `oracle`  
**Dependencies**: RW-14, SDK RPC

**Description**:
Implement price fetching from on-chain oracles (Pyth, Switchboard) and APIs.

**Acceptance Criteria**:
- Oracle integration:
  - Pyth price feeds
  - Switchboard aggregator
  - Parse price data
  - Handle confidence intervals
- API fallbacks:
  - Jupiter price API
  - Coingecko API
  - Configurable source priority
- Price updates:
  - Real-time via WebSocket
  - Polling interval
  - Price change events
- Hook interface:
  - `useTokenPrice(mint)`
  - `price: number | null`
  - `priceChange24h: number`
  - `lastUpdate: Date`
- Batch pricing:
  - Multiple tokens
  - Single request
  - Portfolio value

---

### RW-20: Create useSwap hook

**Priority**: High | **Story Points**: 8 | **Labels**: `feature`, `defi`, `swap`  
**Dependencies**: RW-19, SDK transactions

**Description**:
Build token swapping functionality using Jupiter or Raydium aggregators.

**Acceptance Criteria**:
- Quote fetching:
  - Get swap routes
  - Calculate output amount
  - Show price impact
  - Slippage setting
- Route selection:
  - Best price route
  - Alternative routes
  - Split routes
  - Direct pairs
- Transaction building:
  - Build swap transaction
  - Set compute budget
  - Add priority fee
  - Handle versioned txs
- Hook interface:
  - `getQuote(inputMint, outputMint, amount)`
  - `executeSwap(quote, slippage)`
  - `routes: SwapRoute[]`
  - `priceImpact: number`
- Error handling:
  - Insufficient liquidity
  - High price impact warning
  - Slippage exceeded

---

### RW-21: Add useTokenAllowance hook

**Priority**: Medium | **Story Points**: 3 | **Labels**: `feature`, `defi`, `delegation`  
**Dependencies**: RW-14, SDK RPC

**Description**:
Implement checking and managing token delegation/allowances for DeFi protocols.

**Acceptance Criteria**:
- Check allowance:
  - Get delegate amount
  - Parse delegation data
  - Check expiry
  - Return remaining
- Approve tokens:
  - Create approve instruction
  - Set delegate and amount
  - Build transaction
  - Sign and send
- Revoke approval:
  - Remove delegation
  - Clear amount
  - Security best practice
- Hook interface:
  - `getAllowance(mint, delegate)`
  - `approve(mint, delegate, amount)`
  - `revoke(mint, delegate)`
  - `allowance: number`
- Multiple delegates:
  - Track all delegations
  - Show in UI

---

### RW-22: Implement useBurnTokens hook

**Priority**: Low | **Story Points**: 2 | **Labels**: `feature`, `tokens`, `burn`  
**Dependencies**: RW-14, SDK transactions

**Description**:
Create functionality for permanently burning SPL tokens.

**Acceptance Criteria**:
- Burn tokens:
  - Build burn instruction
  - Verify ownership
  - Confirm amount
  - Execute burn
- Safety checks:
  - Confirmation dialog
  - Amount validation
  - Irreversibility warning
- Hook interface:
  - `burnTokens(mint, amount)`
  - `canBurn: boolean`
  - `isLoading: boolean`
  - Confirmation callback
- Close empty accounts:
  - Detect zero balance
  - Offer to close
  - Recover rent

---

## Epic 7: Stablecoin Operations

### RW-23: Create useStablecoins hook

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `stablecoin`, `balance`  
**Dependencies**: RW-14

**Description**:
Specialized hook for stablecoin operations with proper decimal handling and compliance features.

**Acceptance Criteria**:
- Known stablecoins:
  - USDC (6 decimals)
  - USDT (6 decimals)
  - USDH (8 decimals)
  - PAI, UXD, etc.
- Balance aggregation:
  - Total USD value
  - Individual balances
  - Formatted display
- Compliance features:
  - Memo support
  - Transfer limits
  - KYC indicators
- Hook interface:
  - `stablecoins: StablecoinBalance[]`
  - `totalUSD: number`
  - `sendWithMemo(token, to, amount, memo)`
- Special handling:
  - USDC native vs wrapped
  - Cross-chain variants

---

### RW-24: Add memo support

**Priority**: Medium | **Story Points**: 3 | **Labels**: `feature`, `stablecoin`, `compliance`  
**Dependencies**: RW-23, SDK transactions

**Description**:
Implement memo instructions for compliance and reference tracking in transfers.

**Acceptance Criteria**:
- Memo instruction:
  - Create memo instruction
  - Add to transaction
  - UTF-8 encoding
  - Size limits (500 bytes)
- Integration:
  - Combine with transfers
  - Optional parameter
  - UI input field
- Compliance presets:
  - Invoice numbers
  - Reference IDs
  - Regulatory notes
- Validation:
  - Character limits
  - Encoding validation
  - Special characters
- History tracking:
  - Store memo locally
  - Search by memo

---

## Epic 8: Transaction Management

### RW-25: Build useTransaction hook

**Priority**: Highest | **Story Points**: 5 | **Labels**: `feature`, `transactions`, `core`  
**Dependencies**: RW-8, SDK RPC

**Description**:
Create a comprehensive hook for transaction lifecycle management.

**Acceptance Criteria**:
- Transaction states:
  - `idle` - Initial state
  - `preparing` - Building transaction
  - `signing` - Awaiting signature
  - `sending` - Broadcasting
  - `confirming` - Waiting confirmation
  - `confirmed` - Success
  - `failed` - Error occurred
- Confirmation handling:
  - Monitor status
  - WebSocket subscription
  - Retry on failure
  - Timeout handling
- Mobile considerations:
  - Handle app switches
  - State persistence
  - Recovery on return
- Hook interface:
  - `execute(instructions)`
  - `status: TransactionStatus`
  - `signature: string | null`
  - `error: Error | null`
  - `reset()`
- Options:
  - Commitment level
  - Timeout duration
  - Retry attempts
  - Priority fee

---

### RW-26: Implement useSimulateTransaction hook

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `transactions`, `simulation`  
**Dependencies**: RW-25, SDK RPC

**Description**:
Add transaction simulation to preview effects before execution.

**Acceptance Criteria**:
- Simulation:
  - Call simulateTransaction RPC
  - Parse results
  - Show compute units
  - Display logs
- Balance changes:
  - Pre/post balances
  - Token changes
  - Fee calculation
- Error detection:
  - Parse error logs
  - Identify failing instruction
  - Suggest fixes
- Hook interface:
  - `simulate(transaction)`
  - `simulationResult: SimulationResult`
  - `computeUnits: number`
  - `logs: string[]`
- UI integration:
  - Preview modal
  - Change summary

---

### RW-27: Add priority fee management

**Priority**: Medium | **Story Points**: 3 | **Labels**: `feature`, `transactions`, `fees`  
**Dependencies**: RW-25

**Description**:
Implement dynamic priority fee calculation and management for faster transaction processing.

**Acceptance Criteria**:
- Fee estimation:
  - Get recent priority fees
  - Calculate percentiles
  - Suggest fee levels
  - Auto-adjustment
- Fee levels:
  - Low (25th percentile)
  - Medium (50th)
  - High (75th)
  - Custom amount
- Integration:
  - Add to all transactions
  - Compute budget instruction
  - Display in UI
- Hook interface:
  - `usePriorityFee()`
  - `suggestedFee: number`
  - `setFeeLevel(level)`
  - `customFee: number`
- Market conditions:
  - Network congestion
  - Update frequency

---

## Epic 9: Advanced Features

### RW-28: Create useWalletMultiSig hook

**Priority**: Low | **Story Points**: 5 | **Labels**: `feature`, `wallet`, `multisig`  
**Dependencies**: RW-8

**Description**:
Support for multi-signature wallets and partial transaction signing.

**Acceptance Criteria**:
- Partial signing:
  - Sign with subset of signers
  - Collect signatures
  - Combine signatures
  - Track progress
- Multi-sig detection:
  - Identify multi-sig accounts
  - Required signers count
  - Current signers
- Coordination:
  - Share unsigned transaction
  - Import partial signatures
  - Complete when ready
- Hook interface:
  - `signers: Signer[]`
  - `requiredSignatures: number`
  - `addSignature(signature)`
  - `isComplete: boolean`

---

### RW-29: Implement offline transaction support

**Priority**: Low | **Story Points**: 3 | **Labels**: `feature`, `transactions`, `offline`  
**Dependencies**: RW-25

**Description**:
Enable transaction creation and signing in offline mode for air-gapped security.

**Acceptance Criteria**:
- Offline building:
  - Create without RPC
  - Manual blockhash input
  - Export unsigned
  - JSON format
- Import/export:
  - JSON format
  - Base64 encoding
  - File download/upload
  - Copy/paste support
- Signing flow:
  - Import to offline device
  - Sign transaction
  - Export signed
  - Broadcast online
- Security:
  - Verify transaction integrity
  - Blockhash validation

---

## Epic 10: Testing & Documentation

### RW-30: Write unit tests

**Priority**: Highest | **Story Points**: 8 | **Labels**: `test`, `quality`  
**Dependencies**: All hooks

**Description**:
Comprehensive unit testing for all hooks and utilities.

**Test Coverage**:
- Hook testing:
  - State management
  - Effect cleanup
  - Error handling
  - Edge cases
- Wallet mocking:
  - Mock providers
  - Simulated events
  - Error injection
- Transaction testing:
  - Building
  - Signing
  - Confirmation
- Mobile flows:
  - Deep link handling
  - App switch simulation
  - MWA protocol mocking
- Integration:
  - With SDK modules
  - Type safety

---

### RW-31: Create integration tests

**Priority**: High | **Story Points**: 5 | **Labels**: `test`, `integration`  
**Dependencies**: RW-30

**Description**:
End-to-end testing with real wallet connections on devnet.

**Test Scenarios**:
- Connection flows:
  - Browser wallets
  - Mobile wallets (Android)
  - iOS limitations
  - Reconnection
  - Switching wallets
- Transactions:
  - SOL transfers
  - Token operations
  - DeFi interactions
- Error recovery:
  - Network failures
  - Timeout handling
  - Retry logic
- Performance:
  - Bundle size (<30KB)
  - Render performance
  - Memory leaks
  - Tree-shaking verification

---

### RW-32: Write hook documentation

**Priority**: High | **Story Points**: 5 | **Labels**: `doc`, `dx`  
**Dependencies**: All hooks

**Description**:
Create comprehensive documentation with examples for all hooks.

**Documentation Sections**:
- Getting started:
  - Installation
  - Basic setup
  - First connection
- Hook reference:
  - All hooks documented
  - Parameters
  - Return values
  - Examples
- Mobile guide:
  - Android MWA setup
  - iOS limitations
  - Deep linking
  - Best practices
- Recipes:
  - Common patterns
  - Error handling
  - Performance tips
- Migration guide:
  - From wallet-adapter
  - Breaking changes

---

### RW-33: Build example application

**Priority**: Medium | **Story Points**: 5 | **Labels**: `doc`, `examples`  
**Dependencies**: RW-32

**Description**:
Create a full-featured example application demonstrating all SDK capabilities.

**Example Features**:
- Wallet connection:
  - Multi-wallet selector
  - Auto-connect
  - Mobile support demo
  - Platform detection
- Token operations:
  - Balance display
  - Send tokens
  - Swap interface
- Transaction history:
  - Recent transactions
  - Filter and search
- Mobile showcase:
  - Android MWA demo
  - iOS fallback demo
  - Deep link examples
- Code snippets:
  - Copy-paste ready
  - TypeScript examples

---

## Epic 11: Mobile Wallet Support (Serverless)

### RW-34: Add mobile wallet detection

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `wallet`, `mobile`  
**Dependencies**: RW-2

**Description**:
Extend wallet detection to identify mobile wallet apps and available connection methods.

**Acceptance Criteria**:
- User agent detection:
  - iOS/Android detection
  - In-app browser detection
  - Mobile browser detection
  - Platform version checking
- Deep link support:
  - Build deep link URLs
  - Custom URL schemes only
  - Handle URL schemes
- Mobile wallet registry:
  - Phantom Mobile (phantom://)
  - Solflare Mobile (solflare://)
  - Glow Mobile (glow://)
  - Trust Wallet (trust://)
  - Backpack (backpack://)
- Connection strategy:
  - Same-device only
  - No QR code generation
  - Direct deep linking
- Platform capabilities:
  - Android MWA support detection
  - iOS limitation detection
  - Fallback strategies

---

### RW-35: Implement Android MWA Protocol

**Priority**: High | **Story Points**: 8 | **Labels**: `feature`, `wallet`, `mobile`, `android`  
**Dependencies**: RW-34

**Description**:
Build support for Solana's Mobile Wallet Adapter protocol for completely serverless Android connections.

**Acceptance Criteria**:
- Intent broadcasting:
  - Create `solana-wallet://` URI
  - Broadcast Android Intent
  - Handle wallet selection
- Local WebSocket server:
  - Bind to 127.0.0.1
  - Use ports 49152-65535
  - Temporary server lifecycle
  - Auto-cleanup on disconnect
- Security implementation:
  - ECDH key exchange
  - AES-128-GCM encryption
  - Session establishment
  - Authorization tokens
- Connection flow:
  - Intent → Wallet opens
  - Wallet starts local server
  - dApp connects to localhost
  - Encrypted session established
- Error handling:
  - Wallet not installed
  - Connection timeout (30s)
  - Port binding failures
  - Session errors

---

### RW-36: Implement deep linking (Custom Schemes)

**Priority**: High | **Story Points**: 5 | **Labels**: `feature`, `wallet`, `mobile`  
**Dependencies**: RW-34

**Description**:
Build deep linking functionality for mobile wallet connections using custom URL schemes only (no Universal Links).

**Acceptance Criteria**:
- Custom URL schemes:
  - phantom://connect
  - solflare://connect
  - glow://connect
  - backpack://connect
- Connection data:
  - Generate session token
  - Encode connection params
  - Base64 encoding
  - Return URL handling
- Connection flow:
  - Build deep link URL
  - Trigger app switch
  - Handle return data
  - Parse response
  - Complete handshake
- Security considerations:
  - Accept scheme hijacking risk
  - Validate response data
  - Session token verification
- Error handling:
  - App not installed (redirect to store)
  - User cancellation
  - Timeout (30 seconds)
  - Invalid response

---

### RW-37: Handle iOS limitations

**Priority**: High | **Story Points**: 3 | **Labels**: `feature`, `wallet`, `mobile`, `ios`  
**Dependencies**: RW-36

**Description**:
Implement graceful degradation and user guidance for iOS platform limitations.

**Acceptance Criteria**:
- Limitation detection:
  - No localhost WebSocket support
  - No MWA protocol
  - Background connection drops
  - In-app browser requirements
- User messaging:
  - Clear explanation of limitations
  - Suggest in-app browser usage
  - Guide to wallet app browsers
- Fallback strategies:
  - Prioritize in-app browsers
  - Custom URL schemes only
  - No persistent connections
  - Session recovery guidance
- Wallet-specific guidance:
  - Phantom in-app browser
  - Solflare in-app browser
  - Instructions per wallet
- Connection persistence:
  - Save minimal state
  - Quick reconnection
  - Handle app switches

---

## Summary

This comprehensive task list covers the complete implementation of a **fully serverless, zero-dependency** React wallet SDK for Solana. The tasks have been reorganized into a recommended implementation order that prioritizes core functionality before mobile enhancements.

## Recommended Implementation Order

### Phase 1: Core Foundation (Desktop-First)
1. **Epic 1: Core Wallet Connection** (RW-1 through RW-5) ✅ - Essential browser wallet connection
2. **Epic 2: Security & Validation** (RW-6 through RW-7) - Critical security foundation
3. **Epic 3: Transaction Signing** (RW-8 through RW-9) - Core signing capabilities

### Phase 2: Essential Features
4. **Epic 4: Essential Operations** (RW-10 through RW-13) - Balance, transfers, history
5. **Epic 5: SPL Token Operations** (RW-14 through RW-18) - Token functionality
6. **Epic 6: DeFi Integrations** (RW-19 through RW-22) - Swaps, pricing, allowances

### Phase 3: Advanced Features
7. **Epic 7: Stablecoin Operations** (RW-23 through RW-24) - Specialized stablecoin support
8. **Epic 8: Transaction Management** (RW-25 through RW-27) - Advanced transaction features
9. **Epic 9: Advanced Features** (RW-28 through RW-29) - Multi-sig, offline support

### Phase 4: Production Readiness
10. **Epic 10: Testing & Documentation** (RW-30 through RW-33) - Tests, docs, examples

### Phase 5: Mobile Enhancement
11. **Epic 11: Mobile Wallet Support** (RW-34 through RW-37) - Android MWA, iOS handling

## Key Benefits of This Order

- **Faster Time to Value**: Desktop support provides immediate functionality
- **Incremental Complexity**: Build from simple to complex features
- **Better Testing**: Thoroughly test core hooks before adding mobile complexity
- **Risk Mitigation**: Mobile limitations (especially iOS) won't block core development
- **Clean Architecture**: Mobile becomes an enhancement layer, not a core dependency

The modular design allows for incremental releases while maintaining a consistent, type-safe API that leverages the existing SDK's primitives and stays 100% serverless.