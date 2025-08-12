import { useState, useCallback } from 'react';
import { createSolanaRpc } from '@photon/rpc';
import { address } from '@photon/addresses';

export function RpcDemo() {
  const [rpcUrl, setRpcUrl] = useState('https://api.devnet.solana.com');
  const [accountAddress, setAccountAddress] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!accountAddress) {
      alert('Please enter an account address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rpc = createSolanaRpc(rpcUrl);
      const addr = address(accountAddress);

      // Fetch balance
      const result = await rpc.getBalance(addr);

      // Convert lamports to SOL
      const solBalance = (Number(result.value) / 1e9).toFixed(9);
      setBalance(solBalance);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [rpcUrl, accountAddress]);

  const fetchAccountInfo = useCallback(async () => {
    if (!accountAddress) {
      alert('Please enter an account address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rpc = createSolanaRpc(rpcUrl);
      const addr = address(accountAddress);

      // Fetch account info
      const result = await rpc.getAccountInfo(addr);

      if (result.value) {
        setAccountInfo({
          lamports: result.value.lamports,
          owner: result.value.owner,
          executable: result.value.executable,
          rentEpoch: result.value.rentEpoch,
          dataLength: result.value.data
            ? typeof result.value.data === 'string'
              ? result.value.data.length
              : (result.value.data as Uint8Array).length
            : 0,
        });
      } else {
        setAccountInfo({ message: 'Account not found' });
      }
    } catch (err) {
      console.error('Error fetching account info:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [rpcUrl, accountAddress]);

  const fetchBlockHeight = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rpc = createSolanaRpc(rpcUrl);

      // Fetch current block height
      const result = await rpc.getBlockHeight();

      setAccountInfo({
        currentBlockHeight: result,
        message: `Current block height: ${result}`,
      });
    } catch (err) {
      console.error('Error fetching block height:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [rpcUrl]);

  const fetchVersion = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rpc = createSolanaRpc(rpcUrl);

      // Fetch node version
      const result = await rpc.getVersion();

      setAccountInfo({
        solanaCore: result['solana-core'],
        featureSet: result['feature-set'],
      });
    } catch (err) {
      console.error('Error fetching version:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [rpcUrl]);

  return (
    <div className="demo-section">
      <h2>RPC Client Demo</h2>

      <div className="demo-group">
        <h3>RPC Configuration</h3>
        <select value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} className="select-field">
          <option value="https://api.devnet.solana.com">Devnet</option>
          <option value="https://api.testnet.solana.com">Testnet</option>
          <option value="https://api.mainnet-beta.solana.com">Mainnet Beta</option>
          <option value="http://localhost:8899">Localhost</option>
        </select>
      </div>

      <div className="demo-group">
        <h3>Account Operations</h3>
        <input
          type="text"
          value={accountAddress}
          onChange={(e) => setAccountAddress(e.target.value)}
          placeholder="Account Address (e.g., 11111111111111111111111111111111)"
          className="input-field"
        />
        <div className="button-group">
          <button onClick={fetchBalance} disabled={loading} className="secondary-btn">
            Get Balance
          </button>
          <button onClick={fetchAccountInfo} disabled={loading} className="secondary-btn">
            Get Account Info
          </button>
        </div>
      </div>

      <div className="demo-group">
        <h3>Network Operations</h3>
        <div className="button-group">
          <button onClick={fetchBlockHeight} disabled={loading} className="secondary-btn">
            Get Block Height
          </button>
          <button onClick={fetchVersion} disabled={loading} className="secondary-btn">
            Get Version
          </button>
        </div>
      </div>

      {loading && <div className="status">Loading...</div>}

      {error && <div className="status error">Error: {error}</div>}

      {balance !== null && (
        <div className="info-box">
          <p>
            <strong>Balance:</strong> <span className="value">{balance} SOL</span>
          </p>
        </div>
      )}

      {accountInfo && (
        <div className="info-box">
          <p>
            <strong>Account Info:</strong>
          </p>
          <pre className="code-preview">{JSON.stringify(accountInfo, null, 2)}</pre>
        </div>
      )}

      <div className="info-box">
        <p>
          <strong>Available RPC Methods:</strong>
        </p>
        <ul>
          <li>getBalance - Get account balance</li>
          <li>getAccountInfo - Get detailed account information</li>
          <li>getBlockHeight - Get current block height</li>
          <li>getVersion - Get node version info</li>
          <li>getLatestBlockhash - Get latest blockhash</li>
          <li>getSignatureStatuses - Check transaction status</li>
          <li>sendTransaction - Send signed transaction</li>
          <li>And many more...</li>
        </ul>
      </div>
    </div>
  );
}
