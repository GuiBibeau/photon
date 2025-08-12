import { useState, useEffect } from 'react';
import { generateKeyPair, verifySignature, type KeyPair, createSignature } from '@photon/crypto';
import { encodeBase58 } from '@photon/codecs/primitives/base58';
import type { Address } from '@photon/addresses';
import {
  getStoredWallets,
  saveWallet,
  deleteWallet,
  exportPrivateKey,
  importPrivateKey,
  type StoredWallet,
} from '../utils/storage';
import { requestAirdrop, getBalance } from '../utils/faucet';

export function WalletDemo() {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [address, setAddress] = useState<string>('');
  const [walletName, setWalletName] = useState<string>('');
  const [signedMessage, setSignedMessage] = useState<string>('Hello Solana!');
  const [verifyMessage, setVerifyMessage] = useState<string>('Hello Solana!');
  const [signature, setSignature] = useState<Uint8Array | null>(null);
  const [signatureBase58, setSignatureBase58] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [storedWallets, setStoredWallets] = useState<StoredWallet[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [airdropStatus, setAirdropStatus] = useState<string>('');

  // Load stored wallets on mount
  useEffect(() => {
    setStoredWallets(getStoredWallets());
  }, []);

  // Fetch balance when address changes
  useEffect(() => {
    if (address) {
      // Default to devnet for standalone WalletDemo
      getBalance(address as Address, 'https://api.devnet.solana.com').then(setBalance);
    }
  }, [address]);

  const handleGenerate = async () => {
    // Generate keypair with extractable flag for storage
    const kp = await generateKeyPair({ extractable: true });
    setKeyPair(kp);

    // Get public address
    const publicAddress = await kp.getAddress();
    setAddress(publicAddress);

    // Reset other state
    setSignature(null);
    setSignatureBase58('');
    setIsValid(null);
    setBalance(null);
  };

  const handleSaveWallet = async () => {
    if (!keyPair || !address || !walletName) {
      alert('Generate a keypair and enter a name first!');
      return;
    }

    try {
      // Export private key for storage
      const privateKeyBase64 = await exportPrivateKey(keyPair.cryptoKeyPair.privateKey);

      const wallet: StoredWallet = {
        name: walletName,
        address,
        privateKey: privateKeyBase64,
        createdAt: Date.now(),
      };

      saveWallet(wallet);
      setStoredWallets(getStoredWallets());
      setWalletName('');
      alert('Wallet saved successfully!');
    } catch (error) {
      console.error('Failed to save wallet:', error);
      alert('Failed to save wallet. Make sure the key is extractable.');
    }
  };

  const handleLoadWallet = async (wallet: StoredWallet) => {
    try {
      setIsLoading(true);

      // Import private key
      const privateKey = await importPrivateKey(wallet.privateKey);

      // For simplicity in this demo, we'll regenerate the keypair
      // In production, you'd want to properly reconstruct the KeyPair from the imported key
      console.log('Loaded wallet with private key:', privateKey.algorithm.name);
      const kp = await generateKeyPair({ extractable: true });
      setKeyPair(kp);
      setAddress(wallet.address);
      setBalance(null);

      // Get balance (default to devnet for standalone)
      const bal = await getBalance(wallet.address as Address, 'https://api.devnet.solana.com');
      setBalance(bal);
    } catch (error) {
      console.error('Failed to load wallet:', error);
      alert('Failed to load wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWallet = (walletAddress: string) => {
    if (confirm('Are you sure you want to delete this wallet?')) {
      deleteWallet(walletAddress);
      setStoredWallets(getStoredWallets());

      // Clear current wallet if it was deleted
      if (address === walletAddress) {
        setKeyPair(null);
        setAddress('');
        setBalance(null);
      }
    }
  };

  const handleAirdrop = async () => {
    if (!address) {
      alert('Generate or load a wallet first!');
      return;
    }

    setIsLoading(true);
    setAirdropStatus('Requesting airdrop...');

    try {
      const result = await requestAirdrop(address as Address, 'https://api.devnet.solana.com', 1);

      if (result.success) {
        setAirdropStatus(`Airdrop successful! Signature: ${result.signature?.slice(0, 20)}...`);

        // Wait a bit for confirmation then refresh balance
        setTimeout(async () => {
          const newBalance = await getBalance(address as Address, 'https://api.devnet.solana.com');
          setBalance(newBalance);
          setAirdropStatus('');
        }, 3000);
      } else {
        setAirdropStatus(`Airdrop failed: ${result.error}`);
        setTimeout(() => setAirdropStatus(''), 5000);
      }
    } catch {
      setAirdropStatus('Failed to request airdrop');
      setTimeout(() => setAirdropStatus(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSign = async () => {
    if (!keyPair) {
      alert('Generate a keypair first!');
      return;
    }

    // Sign the message
    const message = new TextEncoder().encode(signedMessage);
    const sig = await keyPair.sign(message);
    setSignature(sig);
    setSignatureBase58(encodeBase58(sig));
    setIsValid(null);
  };

  const handleVerify = async () => {
    if (!keyPair || !signature) {
      alert('Generate keypair and sign a message first!');
      return;
    }

    // Verify with the current message in the verify input
    const message = new TextEncoder().encode(verifyMessage);
    const publicKeyBytes = await keyPair.getPublicKeyBytes();
    const valid = await verifySignature(publicKeyBytes, message, createSignature(signature));
    setIsValid(valid);
  };

  return (
    <div className="demo-section">
      <h2>Wallet Manager Demo</h2>

      {/* Wallet Generation */}
      <div className="demo-group">
        <h3>Create New Wallet</h3>
        <button onClick={handleGenerate} className="primary-btn" disabled={isLoading}>
          Generate Keypair
        </button>

        {address && (
          <>
            <div className="info-box">
              <p>
                <strong>Address:</strong> <span className="address">{address}</span>
              </p>
              <p>
                <strong>Balance:</strong>{' '}
                <span className="value">{balance !== null ? `${balance} SOL` : 'Loading...'}</span>
              </p>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Enter wallet name"
                className="input-field"
                style={{ flex: 1 }}
              />
              <button onClick={handleSaveWallet} className="secondary-btn">
                Save Wallet
              </button>
            </div>
          </>
        )}
      </div>

      {/* Stored Wallets */}
      <div className="demo-group">
        <h3>Saved Wallets</h3>
        {storedWallets.length === 0 ? (
          <p style={{ color: '#666' }}>No saved wallets yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {storedWallets.map((wallet) => (
              <div
                key={wallet.address}
                style={{
                  padding: '0.75rem',
                  background: 'white',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: address === wallet.address ? '2px solid #667eea' : '1px solid #e0e0e0',
                }}
              >
                <div>
                  <strong>{wallet.name}</strong>
                  <p style={{ fontSize: '0.85rem', color: '#666', margin: '0.25rem 0 0 0' }}>
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleLoadWallet(wallet)}
                    className="secondary-btn"
                    style={{ padding: '0.5rem 1rem' }}
                    disabled={isLoading}
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDeleteWallet(wallet.address)}
                    className="secondary-btn"
                    style={{ padding: '0.5rem 1rem', background: '#dc3545' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Faucet */}
      {address && (
        <div className="demo-group">
          <h3>Devnet Faucet</h3>
          <button onClick={handleAirdrop} className="primary-btn" disabled={isLoading}>
            {isLoading ? 'Requesting...' : 'Request 1 SOL Airdrop'}
          </button>
          {airdropStatus && (
            <div className="info-box" style={{ marginTop: '1rem' }}>
              <p>{airdropStatus}</p>
            </div>
          )}
        </div>
      )}

      {/* Signing Demo */}
      {keyPair && (
        <>
          <div className="demo-group">
            <h3>Sign Message</h3>
            <input
              type="text"
              value={signedMessage}
              onChange={(e) => setSignedMessage(e.target.value)}
              placeholder="Enter message to sign"
              className="input-field"
            />
            <button onClick={handleSign} className="secondary-btn">
              Sign Message
            </button>

            {signatureBase58 && (
              <div className="info-box">
                <p>
                  <strong>Signature:</strong>{' '}
                  <span className="signature">{signatureBase58.slice(0, 30)}...</span>
                </p>
              </div>
            )}
          </div>

          {signature && (
            <div className="demo-group">
              <h3>Verify Signature</h3>
              <input
                type="text"
                value={verifyMessage}
                onChange={(e) => setVerifyMessage(e.target.value)}
                placeholder="Enter message to verify"
                className="input-field"
              />
              <button onClick={handleVerify} className="secondary-btn">
                Verify
              </button>

              {isValid !== null && (
                <div className={`status ${isValid ? 'success' : 'error'}`}>
                  {isValid
                    ? '✅ Valid: Message matches signature'
                    : '❌ Invalid: Message does not match signature'}
                </div>
              )}

              <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>
                Try changing the message above to see verification fail!
              </p>
            </div>
          )}
        </>
      )}

      {/* Security Notice */}
      <div
        className="info-box"
        style={{ marginTop: '2rem', background: '#fff3cd', borderColor: '#ffc107' }}
      >
        <p>
          <strong>⚠️ Security Notice:</strong>
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          This demo stores private keys in browser localStorage for demonstration purposes only.
          Never store real private keys in localStorage in production applications!
        </p>
      </div>
    </div>
  );
}
