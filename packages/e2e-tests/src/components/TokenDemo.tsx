import { useState, useCallback } from 'react';
import { address } from '@photon/addresses';
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@photon/spl-token';
import {
  createTransactionMessage,
  setTransactionMessageFeePayer,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
} from '@photon/transaction-messages';

export function TokenDemo() {
  const [mintAddress, setMintAddress] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('1000000');
  const [decimals, setDecimals] = useState('6');
  const [mintDestination, setMintDestination] = useState('');
  const [mintAmount, setMintAmount] = useState('1000000000');
  const [transactionPreview, setTransactionPreview] = useState<string>('');

  const buildMintTransaction = useCallback(() => {
    try {
      if (!mintAddress || !ownerAddress) {
        alert('Please enter mint and owner addresses');
        return;
      }

      // Create transaction message
      let message = createTransactionMessage('legacy');

      // Set fee payer
      const owner = address(ownerAddress);
      message = setTransactionMessageFeePayer(owner, message);

      // Add initialize mint instruction
      const mint = address(mintAddress);
      const initMintInstruction = createInitializeMintInstruction(mint, {
        decimals: parseInt(decimals),
        mintAuthority: owner,
        freezeAuthority: null,
      });

      appendTransactionMessageInstruction(initMintInstruction, message);

      // Show preview
      const preview = {
        feePayer: ownerAddress,
        instructions: [
          {
            program: 'Token Program',
            type: 'InitializeMint',
            accounts: {
              mint: mintAddress,
              decimals,
              mintAuthority: ownerAddress,
            },
          },
        ],
      };

      setTransactionPreview(JSON.stringify(preview, null, 2));
    } catch (error) {
      console.error('Error building mint transaction:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  }, [mintAddress, ownerAddress, decimals]);

  const buildMintTokensTransaction = useCallback(() => {
    try {
      if (!mintAddress || !ownerAddress || !mintDestination) {
        alert('Please enter mint address, mint authority, and destination address');
        return;
      }

      // Create transaction message
      let message = createTransactionMessage('legacy');

      // Set fee payer
      const owner = address(ownerAddress);
      message = setTransactionMessageFeePayer(owner, message);

      // Add mint to instruction
      const mint = address(mintAddress);
      const destination = address(mintDestination);

      const mintToInstruction = createMintToInstruction({
        mint,
        destination,
        authority: owner,
        amount: BigInt(mintAmount),
      });

      appendTransactionMessageInstruction(mintToInstruction, message);

      // Show preview
      const preview = {
        feePayer: ownerAddress,
        instructions: [
          {
            program: 'Token Program',
            type: 'MintTo',
            accounts: {
              mint: mintAddress,
              destination: mintDestination,
              authority: ownerAddress,
              amount: mintAmount,
            },
          },
        ],
      };

      setTransactionPreview(JSON.stringify(preview, null, 2));
    } catch (error) {
      console.error('Error building mint tokens transaction:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  }, [mintAddress, ownerAddress, mintDestination, mintAmount]);

  const buildTransferTransaction = useCallback(() => {
    try {
      if (!ownerAddress || !recipientAddress || !mintAddress) {
        alert('Please enter all addresses');
        return;
      }

      // Create transaction message
      let message = createTransactionMessage('legacy');

      // Set fee payer
      const owner = address(ownerAddress);
      const recipient = address(recipientAddress);
      const mint = address(mintAddress);

      message = setTransactionMessageFeePayer(owner, message);

      // Mock ATAs (in real app, would derive these)
      const sourceAta = address('7UT4ujaxzCZVzwiVW37kDK8zzkaKFDcPPnLii7VNDb5w');
      const destAta = address('H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm');

      // Create instructions
      const instructions = [
        // Create destination ATA if needed
        createAssociatedTokenAccountIdempotentInstruction(
          owner, // payer
          destAta,
          recipient,
          mint,
        ),
        // Transfer tokens
        createTransferInstruction({
          amount: BigInt(amount),
          source: sourceAta,
          destination: destAta,
          owner,
        }),
      ];

      appendTransactionMessageInstructions(instructions, message);

      // Show preview
      const preview = {
        feePayer: ownerAddress,
        instructions: [
          {
            program: 'Associated Token Program',
            type: 'CreateAccountIdempotent',
            accounts: {
              payer: ownerAddress,
              owner: recipientAddress,
              mint: mintAddress,
            },
          },
          {
            program: 'Token Program',
            type: 'Transfer',
            accounts: {
              source: sourceAta,
              destination: destAta,
              owner: ownerAddress,
              amount,
            },
          },
        ],
      };

      setTransactionPreview(JSON.stringify(preview, null, 2));
    } catch (error) {
      console.error('Error building transfer transaction:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  }, [ownerAddress, recipientAddress, mintAddress, amount]);

  return (
    <div className="demo-section">
      <h2>SPL Token Demo</h2>

      <div className="demo-group">
        <h3>Token Mint Configuration</h3>
        <input
          type="text"
          value={mintAddress}
          onChange={(e) => setMintAddress(e.target.value)}
          placeholder="Mint Address (e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)"
          className="input-field"
        />
        <input
          type="text"
          value={ownerAddress}
          onChange={(e) => setOwnerAddress(e.target.value)}
          placeholder="Owner Address"
          className="input-field"
        />
        <input
          type="number"
          value={decimals}
          onChange={(e) => setDecimals(e.target.value)}
          placeholder="Decimals"
          className="input-field small"
        />
        <button onClick={buildMintTransaction} className="secondary-btn">
          Build Initialize Mint Transaction
        </button>
      </div>

      <div className="demo-group">
        <h3>Mint Tokens</h3>
        <input
          type="text"
          value={mintDestination}
          onChange={(e) => setMintDestination(e.target.value)}
          placeholder="Destination Token Account Address"
          className="input-field"
        />
        <input
          type="text"
          value={mintAmount}
          onChange={(e) => setMintAmount(e.target.value)}
          placeholder="Amount to Mint (in smallest units)"
          className="input-field"
        />
        <button onClick={buildMintTokensTransaction} className="secondary-btn">
          Build Mint Tokens Transaction
        </button>
      </div>

      <div className="demo-group">
        <h3>Token Transfer</h3>
        <input
          type="text"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          placeholder="Recipient Address"
          className="input-field"
        />
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (in smallest units)"
          className="input-field"
        />
        <button onClick={buildTransferTransaction} className="secondary-btn">
          Build Transfer Transaction
        </button>
      </div>

      {transactionPreview && (
        <div className="demo-group">
          <h3>Transaction Preview</h3>
          <pre className="code-preview">{transactionPreview}</pre>
        </div>
      )}

      <div className="info-box">
        <p>
          <strong>Note:</strong> This demo builds transaction instructions using the Photon SDK.
        </p>
        <p>In a real application, you would:</p>
        <ul>
          <li>Connect to a wallet (Phantom, Solflare, etc.)</li>
          <li>Derive actual ATAs using PDA functions</li>
          <li>Sign and send transactions to the network</li>
        </ul>
      </div>
    </div>
  );
}
