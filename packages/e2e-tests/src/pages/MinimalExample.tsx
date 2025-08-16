import { useWallet, useBalance } from '@photon/react';

/**
 * Minimal wallet connection example
 * Shows the absolute minimum code needed to connect a wallet and display balance
 */
export function MinimalExample() {
  const { 
    connected, 
    publicKey, 
    connect, 
    disconnect,
    availableWallets 
  } = useWallet();
  
  const { balance, isLoading } = useBalance();

  // If connected, show wallet info and disconnect button
  if (connected) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Connected! ✅</h1>
        <p style={{ fontFamily: 'monospace', fontSize: '14px' }}>
          {publicKey?.toString()}
        </p>
        <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
          {isLoading ? 'Loading...' : `${balance ?? 0} SOL`}
        </p>
        <button 
          onClick={disconnect}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  // If not connected, show connect button
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Photon SDK - Minimal Example</h1>
      <p>The simplest possible wallet connection</p>
      
      {availableWallets.length === 0 ? (
        <p style={{ color: '#856404', background: '#fff3cd', padding: '12px', borderRadius: '8px' }}>
          No wallets detected. Please install Phantom, Solflare, or Backpack.
        </p>
      ) : (
        <button 
          onClick={() => connect()}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}