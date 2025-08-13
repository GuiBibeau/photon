import { useState } from 'react';
import { useWallet } from '@photon/react';

export function WalletTestPage() {
  const {
    connected,
    connecting,
    autoConnecting,
    publicKey,
    wallet,
    error,
    availableWallets,
    isMobile,
    platform,
    connect,
    disconnect,
    select,
    autoConnect,
    setAutoConnect,
    getAutoConnectPreference,
    clearAutoConnectPreference,
    refreshWallets,
    clearError,
  } = useWallet();

  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [autoConnectEnabled, setAutoConnectEnabled] = useState(getAutoConnectPreference());

  const handleConnect = async () => {
    try {
      await connect(selectedWallet || undefined);
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleAutoConnect = async () => {
    try {
      await autoConnect();
    } catch (err) {
      console.error('Failed to auto-connect:', err);
    }
  };

  const toggleAutoConnect = () => {
    const newValue = !autoConnectEnabled;
    setAutoConnect(newValue);
    setAutoConnectEnabled(newValue);
  };

  const handleRefreshWallets = async () => {
    try {
      await refreshWallets();
    } catch (err) {
      console.error('Failed to refresh wallets:', err);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#333' }}>Wallet Connection - useWallet Hook</h1>

      {/* Connection Status */}
      <div
        style={{
          padding: '15px',
          marginBottom: '20px',
          background: '#f0f0f0',
          borderRadius: '8px',
          color: '#333',
        }}
      >
        <h2 style={{ color: '#333', marginTop: 0 }}>Status</h2>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px', color: '#333' }}
        >
          <strong>Connected:</strong>
          <span style={{ color: connected ? 'green' : '#666' }}>{connected ? 'Yes' : 'No'}</span>

          {connecting && (
            <>
              <strong>Connecting:</strong>
              <span>In Progress...</span>
            </>
          )}

          {autoConnecting && (
            <>
              <strong>Auto-Connecting:</strong>
              <span>In Progress...</span>
            </>
          )}

          {wallet && (
            <>
              <strong>Wallet:</strong>
              <span>{wallet}</span>
            </>
          )}

          {publicKey && (
            <>
              <strong>Address:</strong>
              <span
                style={{
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  fontSize: '0.9em',
                }}
              >
                {publicKey.toString()}
              </span>
            </>
          )}
        </div>

        {error && (
          <div
            style={{
              marginTop: '10px',
              padding: '10px',
              background: '#ffcccc',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              <strong>Error:</strong> {error.message}
            </span>
            <button
              onClick={clearError}
              style={{
                padding: '4px 8px',
                cursor: 'pointer',
                background: 'white',
                color: '#333',
                border: '1px solid #999',
                borderRadius: '4px',
                fontSize: '0.85em',
                fontWeight: 500,
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Available Wallets */}
      <div
        style={{
          padding: '15px',
          marginBottom: '20px',
          background: '#f0f0f0',
          borderRadius: '8px',
          color: '#333',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
          }}
        >
          <h2 style={{ color: '#333', margin: 0 }}>
            Available Wallets ({availableWallets.length})
          </h2>
          <button
            onClick={handleRefreshWallets}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              background: 'white',
              color: '#333',
              border: '1px solid #999',
              borderRadius: '4px',
              fontSize: '0.9em',
              fontWeight: 500,
            }}
          >
            Refresh
          </button>
        </div>

        {availableWallets.length === 0 ? (
          <p style={{ color: '#666', margin: 0 }}>
            No wallets detected. Please install a Solana wallet extension.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {availableWallets.map((w) => (
              <div
                key={w.name}
                style={{
                  padding: '12px',
                  background: selectedWallet === w.name ? '#007bff' : 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: selectedWallet === w.name ? 'white' : '#333',
                  border: '1px solid #ddd',
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  setSelectedWallet(w.name);
                  select(w.name);
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      fontSize: '1.1em',
                      color: selectedWallet === w.name ? 'white' : '#333',
                    }}
                  >
                    {w.name}
                  </strong>
                  <div
                    style={{
                      fontSize: '0.85em',
                      marginTop: '2px',
                      color: selectedWallet === w.name ? 'rgba(255,255,255,0.8)' : '#666',
                    }}
                  >
                    {w.isInstalled ? '✓ Installed' : 'Not Installed'}
                    {w.isMobile && ' • Mobile'}
                    {w.isCurrentPlatform && ' • Available'}
                  </div>
                </div>
                {w.url && (
                  <a
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.85em',
                      color: selectedWallet === w.name ? 'white' : '#007bff',
                      textDecoration: 'underline',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Website ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          padding: '15px',
          marginBottom: '20px',
          background: '#f0f0f0',
          borderRadius: '8px',
          color: '#333',
        }}
      >
        <h2 style={{ color: '#333', marginTop: 0 }}>Actions</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {!connected ? (
            <>
              <button
                onClick={handleConnect}
                disabled={connecting || availableWallets.length === 0}
                style={{
                  padding: '10px 20px',
                  cursor: connecting || availableWallets.length === 0 ? 'not-allowed' : 'pointer',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1em',
                  opacity: connecting || availableWallets.length === 0 ? 0.6 : 1,
                }}
              >
                {connecting ? 'Connecting...' : 'Connect'}
                {selectedWallet && ` with ${selectedWallet}`}
              </button>

              <button
                onClick={handleAutoConnect}
                disabled={autoConnecting}
                style={{
                  padding: '10px 20px',
                  cursor: autoConnecting ? 'not-allowed' : 'pointer',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1em',
                  opacity: autoConnecting ? 0.6 : 1,
                }}
              >
                {autoConnecting ? 'Auto Connecting...' : 'Auto Connect'}
              </button>
            </>
          ) : (
            <button
              onClick={handleDisconnect}
              style={{
                padding: '10px 20px',
                cursor: 'pointer',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1em',
              }}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Settings */}
      <div
        style={{
          padding: '15px',
          marginBottom: '20px',
          background: '#f0f0f0',
          borderRadius: '8px',
          color: '#333',
        }}
      >
        <h2 style={{ color: '#333', marginTop: 0 }}>Settings</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={autoConnectEnabled}
              onChange={toggleAutoConnect}
              style={{ width: '18px', height: '18px' }}
            />
            <span>Enable Auto-Connect</span>
          </label>

          <button
            onClick={clearAutoConnectPreference}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              background: 'white',
              color: '#333',
              border: '1px solid #999',
              borderRadius: '4px',
              fontSize: '0.9em',
              fontWeight: 500,
            }}
          >
            Clear Saved Preference
          </button>
        </div>
      </div>

      {/* Platform Info */}
      {(isMobile || platform !== 'desktop') && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            background: '#fff3cd',
            borderRadius: '8px',
            color: '#856404',
            border: '1px solid #ffeaa7',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Platform Information</h3>
          <p style={{ margin: 0 }}>
            <strong>Platform:</strong> {platform}
            {isMobile && ' (Mobile device detected)'}
          </p>
          {platform === 'ios' && (
            <p style={{ marginTop: '10px', marginBottom: 0 }}>
              <strong>Note:</strong> iOS has limited wallet support. For best experience, use the
              wallet's in-app browser.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
