# E2E Tests for Photon React SDK

This directory contains end-to-end tests for the Photon React SDK wallet functionality.

## Test Files

### Core Wallet Tests
- **`wallet-connection.spec.ts`** - Basic wallet connection flow
  - Wallet detection
  - Connection state management
  - UI updates
  - Error handling
  - Debug information display

- **`wallet-disconnect-persistence.spec.ts`** - Disconnect state persistence
  - Explicitly disconnected flag management
  - Persistence across page refreshes
  - No auto-reconnect after manual disconnect
  - State transitions

- **`wallet-auto-connect.spec.ts`** - Auto-connect functionality
  - Auto-connect on page load
  - Session management
  - Preference storage
  - Auto-connect button behavior
  - Error handling

### Other Tests
- **`wallet-basic.spec.ts`** - Basic wallet operations (legacy)
- **`simple-wallet.spec.ts`** - Simple wallet flow
- **`token-basic.spec.ts`** - Token operations
- **`app.spec.ts`** - General app tests

## Running Tests

```bash
# Run all e2e tests
pnpm test

# Run specific test file
pnpm playwright test wallet-connection.spec.ts

# Run tests with UI
pnpm test:ui

# Run tests in headed mode (see browser)
pnpm test:headed

# Debug tests
pnpm test:debug
```

## Test Philosophy

These e2e tests provide more value than mock-based unit tests for wallet functionality because they:

1. **Test real user interactions** - Click buttons, toggle settings, navigate pages
2. **Verify actual localStorage behavior** - Test persistence across page reloads
3. **Check real UI updates** - Ensure the UI reflects the actual state
4. **Test integration between components** - Verify hooks, providers, and components work together
5. **Catch real-world issues** - Like wallet extensions auto-reconnecting

## Migration from Mock Tests

The mock-based tests in `packages/react/tests/` have been minimized in favor of these e2e tests. The mock tests now reference these e2e tests as the source of truth for testing wallet functionality.

## Test Coverage

The e2e tests cover:
- ✅ Wallet detection and connection
- ✅ Disconnect persistence across refreshes
- ✅ Auto-connect preferences and behavior
- ✅ Balance display and updates
- ✅ Error handling and recovery
- ✅ Debug information display
- ✅ Settings management
- ✅ Multiple page navigation

## Future Improvements

When wallet extensions become available in the test environment:
- Add tests for actual wallet connection (not just UI)
- Test transaction signing
- Test message signing
- Test balance fetching from real wallets
- Test multi-wallet scenarios