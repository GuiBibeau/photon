import './App.css';
import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { WalletProvider } from '@photon/react';
import { UnifiedDashboard } from './components/UnifiedDashboard';
import { WalletTestPage } from './pages/WalletTestPage';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'wallet-test'>('dashboard');

  return (
    <WalletProvider autoConnect={true}>
      <AppProvider>
        <div className="app">
          <header className="app-header">
            <h1>⚡ Photon SDK</h1>
            <p>Lightweight Solana Development Kit</p>
            <nav style={{ marginTop: '10px' }}>
              <button
                onClick={() => setCurrentPage('dashboard')}
                style={{
                  marginRight: '10px',
                  padding: '8px 16px',
                  background: currentPage === 'dashboard' ? '#007bff' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentPage('wallet-test')}
                style={{
                  padding: '8px 16px',
                  background: currentPage === 'wallet-test' ? '#007bff' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Wallet Test (useWallet Hook)
              </button>
            </nav>
          </header>

          {currentPage === 'dashboard' ? <UnifiedDashboard /> : <WalletTestPage />}
        </div>
      </AppProvider>
    </WalletProvider>
  );
}

export default App;
