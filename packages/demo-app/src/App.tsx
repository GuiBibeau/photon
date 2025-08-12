import './App.css';
import { AppProvider } from './context/AppContext';
import { UnifiedDashboard } from './components/UnifiedDashboard';

function App() {
  return (
    <AppProvider>
      <div className="app">
        <header className="app-header">
          <h1>⚡ Photon SDK</h1>
          <p>Lightweight Solana Development Kit</p>
        </header>

        <UnifiedDashboard />
      </div>
    </AppProvider>
  );
}

export default App;
