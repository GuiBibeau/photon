import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

export const Route = createRootRoute({
  component: () => (
    <>
      <header className="app-header">
        <h1>⚡ Photon SDK</h1>
        <p>Lightweight Solana Development Kit</p>
        <nav style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <Link
            to="/"
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
            activeProps={{
              style: {
                background: '#007bff',
              },
            }}
          >
            Dashboard
          </Link>
          <Link
            to="/minimal"
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
            activeProps={{
              style: {
                background: '#007bff',
              },
            }}
          >
            Minimal Example
          </Link>
          <Link
            to="/wallet-test"
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
            activeProps={{
              style: {
                background: '#007bff',
              },
            }}
          >
            Wallet Test (useWallet Hook)
          </Link>
        </nav>
      </header>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  ),
});