import { useState, useEffect } from 'react';
import { useWallet, useBalance } from '@photon/react';
import type { Address } from '@photon/addresses';

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
  const [manualAddress, setManualAddress] = useState<string>('');
  const [refreshInterval, setRefreshInterval] = useState<number>(0);
  const [disconnectClickCount, setDisconnectClickCount] = useState<number>(0);

  // Debug connected state changes
  useEffect(() => {
    console.log('Connected state changed:', {
      connected,
      connecting,
      publicKey: publicKey?.toString(),
      wallet,
    });
  }, [connected, connecting, publicKey, wallet]);

  // Use balance hook defaults to connected wallet when no address provided
  const walletBalanceConfig = refreshInterval > 0 ? { refreshInterval } : undefined;
  const walletBalance = useBalance(undefined, walletBalanceConfig);

  // Use balance hook for manual address (if provided)
  const manualBalance = useBalance(manualAddress ? (manualAddress as Address) : undefined);

  const handleConnect = async () => {
    try {
      console.log('Starting connection with wallet:', selectedWallet);
      await connect(selectedWallet || undefined);
      console.log('Connection successful, connected state:', connected);
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handleDisconnect = async () => {
    const clickNum = disconnectClickCount + 1;
    setDisconnectClickCount(clickNum);
    console.log(`[UI Disconnect] Click #${clickNum} - Starting disconnect...`);
    console.log(`[UI Disconnect] Current state before disconnect:`, { connected, connecting, wallet });
    
    try {
      await disconnect();
      console.log(`[UI Disconnect] Click #${clickNum} - Disconnect completed, connected state:`, connected);
    } catch (err) {
      console.error(`[UI Disconnect] Click #${clickNum} - Failed to disconnect:`, err);
    }
  };

  const handleAutoConnect = async () => {
    try {
      console.log('Attempting auto-connect...');
      const lastWallet = localStorage.getItem('photon_wallet_name');
      if (!lastWallet) {
        console.log('No previous wallet found in storage');
        return;
      }
      console.log('Trying to reconnect to:', lastWallet);
      await autoConnect();
      console.log('Auto-connect completed');
    } catch (err) {
      console.error('Failed to auto-connect:', err);
    }
  };

  const toggleAutoConnect = () => {
    const newValue = !autoConnectEnabled;
    console.log('Toggling autoConnect:', { current: autoConnectEnabled, new: newValue });
    setAutoConnect(newValue);
    setAutoConnectEnabled(newValue);
    
    // Verify it was saved
    const savedValue = getAutoConnectPreference();
    console.log('Saved autoConnect preference:', savedValue);
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

      {/* Balance Display - useBalance Hook Demo */}
      <div
        style={{
          padding: '15px',
          marginBottom: '20px',
          background: '#e8f5e9',
          borderRadius: '8px',
          color: '#333',
          border: '1px solid #4caf50',
        }}
      >
        <h2 style={{ color: '#2e7d32', marginTop: 0 }}>Balance Information (useBalance Hook)</h2>

        {/* Connected Wallet Balance */}
        {connected && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#333', marginBottom: '10px' }}>Connected Wallet Balance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px' }}>
              <strong>Balance:</strong>
              <span>
                {walletBalance.isLoading ? (
                  'Loading...'
                ) : walletBalance.error ? (
                  <span style={{ color: '#d32f2f' }}>Error: {walletBalance.error.message}</span>
                ) : (
                  <>
                    {walletBalance.balance ?? 0} SOL
                    {walletBalance.lamports && (
                      <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '10px' }}>
                        ({walletBalance.lamports.toString()} lamports)
                      </span>
                    )}
                  </>
                )}
              </span>

              {walletBalance.lastUpdate && (
                <>
                  <strong>Last Updated:</strong>
                  <span style={{ fontSize: '0.9em' }}>
                    {walletBalance.lastUpdate.toLocaleTimeString()}
                  </span>
                </>
              )}
            </div>

            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => walletBalance.refetch()}
                disabled={walletBalance.isLoading}
                style={{
                  padding: '8px 16px',
                  cursor: walletBalance.isLoading ? 'not-allowed' : 'pointer',
                  background: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  opacity: walletBalance.isLoading ? 0.6 : 1,
                }}
              >
                {walletBalance.isLoading ? 'Refreshing...' : 'Refresh Balance'}
              </button>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Auto-refresh interval (ms):</span>
                <input
                  type="number"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  placeholder="0 (disabled)"
                  style={{
                    padding: '6px',
                    width: '120px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {/* Manual Address Balance Check */}
        <div>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>Check Any Address</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Enter Solana address..."
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontFamily: 'monospace',
                fontSize: '0.9em',
              }}
            />
            <button
              onClick={() => setManualAddress('')}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.9em',
              }}
            >
              Clear
            </button>
          </div>

          {manualAddress && (
            <div style={{ padding: '10px', background: 'white', borderRadius: '4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px' }}>
                <strong>Balance:</strong>
                <span>
                  {manualBalance.isLoading ? (
                    'Loading...'
                  ) : manualBalance.error ? (
                    <span style={{ color: '#d32f2f' }}>Error: {manualBalance.error.message}</span>
                  ) : (
                    <>
                      {manualBalance.balance ?? 0} SOL
                      {manualBalance.lamports && (
                        <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '10px' }}>
                          ({manualBalance.lamports.toString()} lamports)
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>

              <button
                onClick={() => manualBalance.refetch()}
                disabled={manualBalance.isLoading}
                style={{
                  marginTop: '10px',
                  padding: '6px 12px',
                  cursor: manualBalance.isLoading ? 'not-allowed' : 'pointer',
                  background: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.85em',
                  opacity: manualBalance.isLoading ? 0.6 : 1,
                }}
              >
                {manualBalance.isLoading ? 'Checking...' : 'Check Balance'}
              </button>
            </div>
          )}
        </div>
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
          <div style={{ 
            padding: '20px', 
            background: '#fff3cd', 
            borderRadius: '6px',
            border: '1px solid #ffc107'
          }}>
            <p style={{ color: '#856404', margin: 0, fontWeight: 'bold' }}>
              ⚠️ No wallets detected
            </p>
            <p style={{ color: '#856404', margin: '10px 0 0 0' }}>
              Please install a Solana wallet extension to test wallet connection:
            </p>
            <ul style={{ color: '#856404', marginTop: '10px' }}>
              <li><a href="https://phantom.app/" target="_blank" rel="noopener noreferrer">Phantom</a></li>
              <li><a href="https://solflare.com/" target="_blank" rel="noopener noreferrer">Solflare</a></li>
              <li><a href="https://www.backpack.app/" target="_blank" rel="noopener noreferrer">Backpack</a></li>
            </ul>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {availableWallets.map((w: any) => (
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
        <div style={{ marginBottom: '10px', fontSize: '0.85em', color: '#666' }}>
          Debug: connected = {String(connected)}, connecting = {String(connecting)}
        </div>
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
                disabled={autoConnecting || !localStorage.getItem('photon_wallet_name')}
                style={{
                  padding: '10px 20px',
                  cursor: autoConnecting || !localStorage.getItem('photon_wallet_name') ? 'not-allowed' : 'pointer',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1em',
                  opacity: autoConnecting || !localStorage.getItem('photon_wallet_name') ? 0.6 : 1,
                }}
                title={!localStorage.getItem('photon_wallet_name') ? 'No previous wallet connection found' : 'Reconnect to last used wallet'}
              >
                {autoConnecting ? 'Auto Connecting...' : 'Auto Connect (Last Wallet)'}
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
        <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#666' }}>
          <strong>Auto-Connect Preference:</strong> When enabled, the wallet will automatically reconnect on page refresh
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={autoConnectEnabled}
              onChange={toggleAutoConnect}
              style={{ width: '18px', height: '18px' }}
            />
            <span>Enable Auto-Connect on Page Load</span>
          </label>
          
          <span style={{ 
            padding: '4px 8px', 
            background: autoConnectEnabled ? '#4caf50' : '#f44336',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.85em',
            fontWeight: 'bold'
          }}>
            {autoConnectEnabled ? 'ON' : 'OFF'}
          </span>

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

      {/* Debug Info */}
      <div
        style={{
          padding: '15px',
          marginBottom: '20px',
          background: '#e3f2fd',
          borderRadius: '8px',
          color: '#333',
          border: '1px solid #90caf9',
        }}
      >
        <h3 style={{ marginTop: 0, color: '#1976d2' }}>Debug Info</h3>
        <div style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
          <div>localStorage.photon_auto_connect: {localStorage.getItem('photon_auto_connect') || 'null'}</div>
          <div>localStorage.photon_last_wallet: {localStorage.getItem('photon_last_wallet') || 'null'}</div>
          <div>localStorage.photon_wallet_name: {localStorage.getItem('photon_wallet_name') || 'null'}</div>
          <div style={{ color: '#ff5722', fontWeight: 'bold' }}>
            localStorage.photon_explicitly_disconnected: {localStorage.getItem('photon_explicitly_disconnected') || 'null'}
          </div>
          <div>localStorage.photon_connection_state: {localStorage.getItem('photon_connection_state') || 'null'}</div>
          <div>Hook autoConnectEnabled: {autoConnectEnabled.toString()}</div>
          <div>Hook getAutoConnectPreference(): {getAutoConnectPreference().toString()}</div>
          <div>Available wallets count: {availableWallets.length}</div>
          <div>Selected wallet: {selectedWallet || 'none'}</div>
          <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>
            Disconnect button click count: {disconnectClickCount}
          </div>
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
