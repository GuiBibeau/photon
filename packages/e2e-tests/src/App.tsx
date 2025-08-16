import './App.css';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { AppProvider } from './context/AppContext';
import { WalletProvider } from '@photon/react';
import { routeTree } from './routeTree.gen';

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <WalletProvider 
      autoConnect={true}
      rpcEndpoint="https://api.devnet.solana.com"
      commitment="confirmed"
    >
      <AppProvider>
        <div className="app">
          <RouterProvider router={router} />
        </div>
      </AppProvider>
    </WalletProvider>
  );
}

export default App;
