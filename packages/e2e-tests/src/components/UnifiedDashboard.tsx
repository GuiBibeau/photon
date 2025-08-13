import { useState, useEffect } from 'react';
import { generateKeyPair, verifySignature, createSignature, type KeyPair } from '@photon/crypto';
import { encodeBase58, decodeBase58 } from '@photon/codecs/primitives/base58';
import { address, getAddressBytes, type Address } from '@photon/addresses';
import {
  createTransactionMessage,
  setTransactionMessageFeePayer,
  appendTransactionMessageInstruction,
  setTransactionMessageLifetimeUsingBlockhash,
  blockhash,
  type Instruction,
} from '@photon/transaction-messages';
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from '@photon/spl-token';
import { signTransaction, sendAndConfirmTransaction } from '@photon/transactions';
import { importCryptoKeySignerFromKeyPair } from '@photon/signers';
import { useApp } from '../context/useApp';
import {
  getStoredWallets,
  saveWallet,
  deleteWallet,
  exportKeyPair,
  importKeyPair,
  importPrivateKey,
  type StoredWallet,
} from '../utils/storage';
import { requestAirdrop } from '../utils/faucet';
import '../styles/BentoGrid.css';

export function UnifiedDashboard() {
  const { rpcUrl, setRpcUrl, rpc, wallet, setWallet, refreshBalance, isLoading, setIsLoading } =
    useApp();

  // Wallet state
  const [walletName, setWalletName] = useState('');
  const [storedWallets, setStoredWallets] = useState<StoredWallet[]>([]);
  const [copied, setCopied] = useState(false);

  // Signing state
  const [messageToSign, setMessageToSign] = useState('Hello Solana!');
  const [signature, setSignature] = useState<string>('');
  const [verifyMessage, setVerifyMessage] = useState('Hello Solana!');
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // RPC state
  const [queryAddress, setQueryAddress] = useState('');
  const [accountInfo, setAccountInfo] = useState<unknown>(null);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);

  // Token state
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenDecimals, setTokenDecimals] = useState('6');
  const [mintAmount, setMintAmount] = useState('1000');
  const [createdMint, setCreatedMint] = useState<string>('');
  const [, setMintKeypair] = useState<KeyPair | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string>('');
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // Token transfer state
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Token balance check state
  const [checkBalanceAddress, setCheckBalanceAddress] = useState('');
  const [checkBalanceMint, setCheckBalanceMint] = useState('');
  const [checkedBalance, setCheckedBalance] = useState<string>('');
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  // Status messages
  const [statusMessage, setStatusMessage] = useState('');

  // Load stored wallets on mount
  useEffect(() => {
    setStoredWallets(getStoredWallets());
  }, []);

  // Copy address to clipboard
  const handleCopyAddress = async () => {
    if (!wallet?.address) {
      return;
    }

    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setStatusMessage('Address copied!');
      setTimeout(() => {
        setCopied(false);
        setStatusMessage('');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setStatusMessage('Failed to copy address');
    }
  };

  // Generate new wallet
  const handleGenerateWallet = async () => {
    try {
      setIsLoading(true);
      const kp = await generateKeyPair({ extractable: true });
      const addr = await kp.getAddress();

      setWallet({
        keyPair: kp,
        address: addr,
        balance: null,
        name: 'New Wallet',
      });

      setStatusMessage('Wallet generated successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Failed to generate wallet:', error);
      setStatusMessage('Failed to generate wallet');
    } finally {
      setIsLoading(false);
    }
  };

  // Save current wallet
  const handleSaveWallet = async () => {
    if ((!wallet?.keyPair && !wallet?.signer) || !wallet.address || !walletName) {
      setStatusMessage('Please generate a wallet and enter a name');
      return;
    }

    try {
      // Only allow saving wallets that were generated (have a keyPair)
      if (!wallet.keyPair) {
        setStatusMessage('Cannot save imported wallets');
        return;
      }

      const { privateKey, publicKey } = await exportKeyPair(wallet.keyPair.cryptoKeyPair);

      const storedWallet: StoredWallet = {
        name: walletName,
        address: wallet.address,
        privateKey,
        publicKey,
        createdAt: Date.now(),
      };

      saveWallet(storedWallet);
      setStoredWallets(getStoredWallets());
      setWalletName('');
      setStatusMessage('Wallet saved!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save wallet:', error);
      setStatusMessage('Failed to save wallet');
    }
  };

  // Load wallet from storage
  const handleLoadWallet = async (storedWallet: StoredWallet) => {
    try {
      setIsLoading(true);

      // Check if we have both keys (new format) or just private key (old format)
      let cryptoKeyPair: CryptoKeyPair;

      if (storedWallet.publicKey) {
        // New format with both keys
        cryptoKeyPair = await importKeyPair(storedWallet.privateKey, storedWallet.publicKey);
      } else {
        // Old format - we need to generate a new keypair because we can't derive public from private
        // This won't work for signing existing transactions, so we should warn the user
        setStatusMessage('Warning: Old wallet format. Please re-save this wallet.');
        await importPrivateKey(storedWallet.privateKey);
        // Generate a new keypair and hope it matches (it won't)
        const newKp = await generateKeyPair({ extractable: true });
        cryptoKeyPair = newKp.cryptoKeyPair;
      }

      // Import the KeyPair class to wrap the CryptoKeyPair
      const { KeyPair } = await import('@photon/crypto');
      const kp = new KeyPair(cryptoKeyPair);

      setWallet({
        keyPair: kp,
        address: storedWallet.address,
        balance: null,
        name: storedWallet.name,
      });

      setStatusMessage(`Loaded: ${storedWallet.name}`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Failed to load wallet:', error);
      setStatusMessage('Failed to load wallet');
    } finally {
      setIsLoading(false);
    }
  };

  // Request airdrop
  const handleAirdrop = async () => {
    if (!wallet?.address) {
      setStatusMessage('No wallet connected');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Requesting airdrop...');

    try {
      const result = await requestAirdrop(wallet.address as Address, rpcUrl, 1);

      if (result.success) {
        setStatusMessage('Airdrop successful! Confirming...');
        setTimeout(async () => {
          await refreshBalance();
          setStatusMessage('');
        }, 3000);
      } else {
        setStatusMessage(`Airdrop failed: ${result.error}`);
        setTimeout(() => setStatusMessage(''), 5000);
      }
    } catch {
      setStatusMessage('Failed to request airdrop');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign message
  const handleSign = async () => {
    if (!wallet?.keyPair && !wallet?.signer) {
      setStatusMessage('No wallet connected');
      return;
    }

    try {
      const message = new TextEncoder().encode(messageToSign);

      // Use signer if available, otherwise use keypair
      let sig;
      if (wallet.signer) {
        sig = await wallet.signer.sign(message);
      } else if (wallet.keyPair) {
        sig = await wallet.keyPair.sign(message);
      } else {
        throw new Error('No signing capability available');
      }

      setSignature(encodeBase58(sig));
      setStatusMessage('Message signed!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Failed to sign:', error);
      setStatusMessage('Failed to sign message');
    }
  };

  // Verify signature
  const handleVerify = async () => {
    if ((!wallet?.keyPair && !wallet?.signer) || !signature) {
      setStatusMessage('Sign a message first');
      return;
    }

    try {
      const message = new TextEncoder().encode(verifyMessage);
      const sig = decodeBase58(signature);

      // Get public key bytes from signer or keypair
      let publicKeyBytes;
      if (wallet.signer) {
        publicKeyBytes = await wallet.signer.getPublicKeyBytes();
      } else if (wallet.keyPair) {
        publicKeyBytes = await wallet.keyPair.getPublicKeyBytes();
      } else {
        throw new Error('Cannot get public key bytes');
      }

      const valid = await verifySignature(publicKeyBytes, message, createSignature(sig));
      setIsValid(valid);
      setStatusMessage(valid ? 'Signature valid!' : 'Invalid signature');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Verification error:', error);
      setIsValid(false);
      setStatusMessage('Verification failed');
    }
  };

  // Fetch account info
  const handleFetchAccount = async () => {
    if (!queryAddress) {
      setStatusMessage('Enter an address');
      return;
    }

    try {
      setIsLoading(true);
      const addr = address(queryAddress);
      const result = await rpc.getAccountInfo(addr);

      if (result.value) {
        setAccountInfo({
          lamports: result.value.lamports,
          owner: result.value.owner,
          executable: result.value.executable,
          dataLength: result.value.data
            ? typeof result.value.data === 'string'
              ? result.value.data.length
              : (result.value.data as Uint8Array).length
            : 0,
        });
        setStatusMessage('Account fetched!');
      } else {
        setAccountInfo({ message: 'Account not found' });
        setStatusMessage('Account not found');
      }
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Failed to fetch account:', error);
      setStatusMessage('Failed to fetch account');
    } finally {
      setIsLoading(false);
    }
  };

  // Get block height
  const handleGetBlockHeight = async () => {
    try {
      setIsLoading(true);
      const height = await rpc.getBlockHeight();
      setBlockHeight(height);
      setStatusMessage(`Block height: ${height}`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Failed to get block height:', error);
      setStatusMessage('Failed to get block height');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new token mint (REAL)
  const handleCreateToken = async () => {
    if (!wallet?.address || (!wallet?.keyPair && !wallet?.signer) || !tokenName || !tokenSymbol) {
      setStatusMessage('Please connect wallet and fill in token details');
      return;
    }

    // Check if we're on a network that supports token creation
    if (rpcUrl.includes('mainnet')) {
      setStatusMessage('⚠️ Token creation on mainnet requires SOL for fees');
      return;
    }

    setIsCreatingToken(true);
    setStatusMessage('Creating token on-chain...');

    try {
      // Generate a new keypair for the mint
      const newMintKeypair = await generateKeyPair({ extractable: false });
      const mintAddress = await newMintKeypair.getAddress();

      console.log('========================================');
      console.log('🪙 Creating New Token ON-CHAIN');
      console.log('========================================');
      console.log('Token Name:', tokenName);
      console.log('Symbol:', tokenSymbol);
      console.log('Decimals:', tokenDecimals);
      console.log('Mint Address:', mintAddress);
      console.log('Authority:', wallet.address);
      console.log('Network:', rpcUrl);
      console.log('');

      // Get recent blockhash
      console.log('Fetching recent blockhash...');
      const blockHashResult = await rpc.getLatestBlockhash();
      const recentBlockhash = blockHashResult.value.blockhash;
      const lastValidBlockHeight = blockHashResult.value.lastValidBlockHeight;
      console.log('Blockhash:', recentBlockhash);

      // Build mint initialization instruction
      // For imported wallets, use the signer's address directly
      let owner: Address;
      if (wallet.signer) {
        owner = await wallet.signer.getPublicKey();
      } else {
        owner = address(wallet.address);
      }
      const mint = address(mintAddress);
      const decimals = parseInt(tokenDecimals);

      // Import needed for proper encoding
      const { u32, u64 } = await import('@photon/codecs/primitives');
      const { TOKEN_PROGRAM_ADDRESS } = await import('@photon/addresses');

      // Calculate rent exemption (minimum for mint account)
      const rentLamports = 1461600; // ~0.00146 SOL for mint account
      const mintAccountSize = 82; // SPL Token mint account size

      // Create account instruction data encoding
      // System Program CreateAccount instruction layout:
      // [4 bytes instruction_index] [8 bytes lamports] [8 bytes space] [32 bytes owner]
      const createAccountData = new Uint8Array(4 + 8 + 8 + 32);
      let offset = 0;

      // Instruction index (0 for CreateAccount)
      createAccountData.set(u32.encode(0), offset);
      offset += 4;

      // Lamports to transfer
      createAccountData.set(u64.encode(BigInt(rentLamports)), offset);
      offset += 8;

      // Space (account size)
      createAccountData.set(u64.encode(BigInt(mintAccountSize)), offset);
      offset += 8;

      // Owner program (Token Program)
      const tokenProgramBytes = getAddressBytes(TOKEN_PROGRAM_ADDRESS);
      createAccountData.set(tokenProgramBytes, offset);

      const createAccountIx: Instruction = {
        programId: address('11111111111111111111111111111111'), // System program
        accounts: [
          { pubkey: owner, isSigner: true, isWritable: true },
          { pubkey: mint, isSigner: true, isWritable: true },
        ],
        data: createAccountData,
      };

      const initMintInstruction = createInitializeMintInstruction(mint, {
        decimals,
        mintAuthority: owner,
        freezeAuthority: null, // Set to null to simplify
      });

      console.log('Create Account Instruction:', {
        programId: createAccountIx.programId,
        accounts: createAccountIx.accounts,
        dataLength: createAccountIx.data.length,
        data: Array.from(createAccountIx.data).slice(0, 20), // First 20 bytes for brevity
      });

      console.log('Initialize Mint Instruction:', {
        programId: initMintInstruction.programId,
        accounts: initMintInstruction.accounts,
        dataLength: initMintInstruction.data.length,
        data: Array.from(initMintInstruction.data).slice(0, 20), // First 20 bytes for brevity
      });

      // Build the transaction message
      const message = createTransactionMessage('legacy');
      console.log('Initial message:', message);

      const messageWithFeePayer = setTransactionMessageFeePayer(owner, message);
      console.log('After setting fee payer:', messageWithFeePayer);

      const messageWithInstructions = appendTransactionMessageInstruction(
        initMintInstruction,
        appendTransactionMessageInstruction(createAccountIx, messageWithFeePayer),
      );
      console.log('After adding instructions:', messageWithInstructions);

      const finalMessage = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash(recentBlockhash),
          lastValidBlockHeight: BigInt(lastValidBlockHeight),
        },
        messageWithInstructions,
      );
      console.log('After setting lifetime:', finalMessage);
      console.log('Fee payer in final message:', finalMessage.feePayer);

      // Sign the transaction with both wallet and mint keypair
      console.log('Signing transaction...');

      // Use the signer if available (for imported wallets), otherwise create from keypair
      let walletSigner;
      if (wallet.signer) {
        console.log('Using imported wallet signer');
        walletSigner = wallet.signer;
      } else if (wallet.keyPair) {
        console.log('Creating signer from keypair');
        walletSigner = await importCryptoKeySignerFromKeyPair(wallet.keyPair);
      } else {
        throw new Error('Wallet keypair or signer not available');
      }

      const mintSigner = await importCryptoKeySignerFromKeyPair(newMintKeypair);

      console.log('Wallet signer public key:', walletSigner.publicKey);
      console.log('Mint signer public key:', mintSigner.publicKey);
      console.log('Fee payer in message:', finalMessage.feePayer);
      console.log('Do they match?', walletSigner.publicKey === finalMessage.feePayer);

      // Now finalMessage is properly typed as CompileableTransactionMessage
      const signedTx = await signTransaction([walletSigner, mintSigner], finalMessage);

      // Send and confirm
      console.log('Sending transaction to network...');
      const signature = await sendAndConfirmTransaction(
        signedTx,
        rpc,
        {
          skipPreflight: false,
          preflightCommitment: 'processed',
        },
        {
          commitment: 'processed',
          timeout: 30000,
        },
      );

      console.log('✅ Transaction confirmed!');
      console.log('Signature:', signature);
      console.log('Mint created at:', mintAddress);
      console.log('========================================');

      // Save the mint details
      setCreatedMint(mintAddress);
      setMintKeypair(newMintKeypair);

      setStatusMessage(
        `✅ Token "${tokenSymbol}" created on-chain! Mint: ${mintAddress.slice(0, 8)}...`,
      );

      // Check token balance after creation
      setTimeout(() => handleCheckTokenBalance(), 2000);
    } catch (error) {
      console.error('Failed to create token:', error);
      setStatusMessage(
        `❌ Failed to create token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsCreatingToken(false);
      setTimeout(() => setStatusMessage(''), 7000);
    }
  };

  // Mint tokens to wallet (REAL)
  const handleMintTokens = async () => {
    if (!wallet?.address || (!wallet?.keyPair && !wallet?.signer) || !createdMint || !mintAmount) {
      setStatusMessage('Create a token first, then specify amount');
      return;
    }

    setIsMinting(true);
    setStatusMessage('Minting tokens on-chain...');

    try {
      // For imported wallets, use the signer's address directly
      let owner: Address;
      if (wallet.signer) {
        // Signer already has the proper Address type
        owner = await wallet.signer.getPublicKey();
      } else {
        // For generated wallets, create Address from string
        owner = address(wallet.address);
      }

      const mint = address(createdMint);
      const amount = BigInt(parseInt(mintAmount) * Math.pow(10, parseInt(tokenDecimals)));

      // Get the associated token address for this wallet/mint combo
      const ata = await getAssociatedTokenAddress(mint, owner);

      console.log('========================================');
      console.log('🏭 Minting Tokens ON-CHAIN');
      console.log('========================================');
      console.log('Mint:', createdMint);
      console.log('To Wallet:', wallet.address);
      console.log('Token Account:', ata);
      console.log('Amount:', mintAmount, tokenSymbol || 'tokens');
      console.log('Raw Amount:', amount.toString(), 'smallest units');
      console.log('Network:', rpcUrl);
      console.log('');

      // Check if mint account exists with retry
      console.log('Checking if mint account exists...');
      let mintAccountInfo = await rpc.getAccountInfo(mint, { commitment: 'processed' });

      // Retry up to 5 times with 1 second delay
      let retries = 0;
      while (!mintAccountInfo.value && retries < 5) {
        console.log(`Mint not found yet, retrying... (${retries + 1}/5)`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        mintAccountInfo = await rpc.getAccountInfo(mint, { commitment: 'processed' });
        retries++;
      }

      if (!mintAccountInfo.value) {
        throw new Error(
          'Mint account does not exist. Please create the token first or wait for the transaction to be confirmed.',
        );
      }
      console.log('✓ Mint account found:', mintAccountInfo.value.owner);

      // Get recent blockhash
      console.log('Fetching recent blockhash...');
      const blockHashResult = await rpc.getLatestBlockhash();
      const recentBlockhash = blockHashResult.value.blockhash;
      const lastValidBlockHeight = blockHashResult.value.lastValidBlockHeight;

      const instructions: Instruction[] = [
        // Create associated token account if it doesn't exist
        createAssociatedTokenAccountIdempotentInstruction(
          owner, // payer
          ata, // associated token account
          owner, // owner
          mint, // mint
        ),
        // Mint tokens
        createMintToInstruction({
          mint,
          destination: ata,
          authority: owner,
          amount,
        }),
      ];

      // Build the transaction
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(owner, message);

      let messageWithInstructions = messageWithFeePayer;
      instructions.forEach((ix) => {
        messageWithInstructions = appendTransactionMessageInstruction(ix, messageWithInstructions);
      });

      const finalMessage = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash(recentBlockhash),
          lastValidBlockHeight: BigInt(lastValidBlockHeight),
        },
        messageWithInstructions,
      );

      // Sign the transaction
      console.log('Signing transaction...');

      // Use the signer if available (for imported wallets), otherwise create from keypair
      let walletSigner;
      if (wallet.signer) {
        walletSigner = wallet.signer;
      } else if (wallet.keyPair) {
        walletSigner = await importCryptoKeySignerFromKeyPair(wallet.keyPair);
      } else {
        throw new Error('Wallet keypair or signer not available');
      }
      // Now finalMessage is properly typed as CompileableTransactionMessage
      const signedTx = await signTransaction([walletSigner], finalMessage);

      // Send and confirm
      console.log('Sending transaction to network...');
      const signature = await sendAndConfirmTransaction(
        signedTx,
        rpc,
        {
          skipPreflight: false,
          preflightCommitment: 'processed',
        },
        {
          commitment: 'processed',
          timeout: 30000,
        },
      );

      console.log('✅ Minting transaction confirmed!');
      console.log('Signature:', signature);
      console.log('========================================');

      // Add a small delay to ensure the account state is fully updated
      console.log('Waiting for account state to update...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update balance after successful mint
      await handleCheckTokenBalance();

      setStatusMessage(`✅ Minted ${mintAmount} ${tokenSymbol || 'tokens'} on-chain!`);
    } catch (error) {
      console.error('Failed to mint tokens:', error);
      setStatusMessage(
        `❌ Failed to mint: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsMinting(false);
      setTimeout(() => setStatusMessage(''), 7000);
    }
  };

  // Check token balance (REAL)
  const handleCheckTokenBalance = async () => {
    if (!wallet?.address || !createdMint) {
      setStatusMessage('Create a token and connect wallet first');
      return;
    }

    try {
      // For imported wallets, use the signer's address directly
      let owner: Address;
      if (wallet.signer) {
        owner = await wallet.signer.getPublicKey();
      } else {
        owner = address(wallet.address);
      }
      const mint = address(createdMint);

      // Get the associated token address
      const ata = await getAssociatedTokenAddress(mint, owner);

      console.log('========================================');
      console.log('💰 Checking Token Balance ON-CHAIN');
      console.log('========================================');
      console.log('Token:', createdMint);
      console.log('Wallet:', wallet.address);
      console.log('Token Account:', ata);
      console.log('Network:', rpcUrl);
      console.log('');

      // Fetch the token account info from the network with explicit base64 encoding
      const accountInfo = await rpc.getAccountInfo(ata, {
        encoding: 'base64',
        commitment: 'processed',
      });

      if (accountInfo.value) {
        // Parse token account data (simplified - in production use proper parsing)
        // Token accounts have balance at bytes 64-72 (u64)
        const data = accountInfo.value.data;
        let balance = '0';

        // Handle both string and array formats
        let bytes: Uint8Array;
        if (typeof data === 'string') {
          // Base64 encoded data
          const decoded = atob(data);
          bytes = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
          }
        } else if (Array.isArray(data) && data.length === 2 && typeof data[0] === 'string') {
          // Array format: [data, encoding]
          const decoded = atob(data[0]);
          bytes = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
          }
        } else if (data instanceof Uint8Array) {
          // Already decoded
          bytes = data;
        } else {
          console.error('Unexpected data format:', data);
          bytes = new Uint8Array(0);
        }

        // Read u64 at offset 64
        if (bytes.length >= 72) {
          const balanceBytes = bytes.slice(64, 72);
          const balanceBigInt = new DataView(balanceBytes.buffer).getBigUint64(0, true);
          balance = (Number(balanceBigInt) / Math.pow(10, parseInt(tokenDecimals))).toString();
        }

        setTokenBalance(balance);
        console.log('✅ Token Account Found!');
        console.log('Balance:', balance, tokenSymbol || 'tokens');
        setStatusMessage(`Balance: ${balance} ${tokenSymbol || 'tokens'}`);
      } else {
        console.log('❌ Token account not found (not created yet)');
        setTokenBalance('0');
        setStatusMessage('Token account not found - mint some tokens first!');
      }

      console.log('========================================');
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (error) {
      console.error('Failed to check balance:', error);
      setStatusMessage('❌ Failed to check balance');
    }
  };

  // Send tokens to another wallet
  const handleSendTokens = async () => {
    if (!wallet?.address || !createdMint || !recipientAddress || !transferAmount) {
      setStatusMessage('Please fill in all fields');
      return;
    }

    try {
      setIsTransferring(true);

      // For imported wallets, use the signer's address directly
      let sender: Address;
      if (wallet.signer) {
        sender = await wallet.signer.getPublicKey();
      } else {
        sender = address(wallet.address);
      }
      const recipient = address(recipientAddress);
      const mint = address(createdMint);
      const amount = BigInt(parseFloat(transferAmount) * Math.pow(10, parseInt(tokenDecimals)));

      // Get ATAs for sender and recipient
      const senderAta = await getAssociatedTokenAddress(mint, sender);
      const recipientAta = await getAssociatedTokenAddress(mint, recipient);

      console.log('========================================');
      console.log('💸 Sending Tokens ON-CHAIN');
      console.log('========================================');
      console.log('From:', wallet.address);
      console.log('To:', recipientAddress);
      console.log('Amount:', transferAmount, tokenSymbol || 'tokens');
      console.log('Mint:', createdMint);
      console.log('');

      // Get recent blockhash
      const blockHashResult = await rpc.getLatestBlockhash();
      const recentBlockhash = blockHashResult.value.blockhash;
      const lastValidBlockHeight = blockHashResult.value.lastValidBlockHeight;

      const instructions: Instruction[] = [
        // Create recipient's associated token account if it doesn't exist
        createAssociatedTokenAccountIdempotentInstruction(
          sender, // payer
          recipientAta, // associated token account
          recipient, // owner
          mint, // mint
        ),
        // Transfer tokens
        createTransferInstruction({
          source: senderAta,
          destination: recipientAta,
          owner: sender,
          amount,
        }),
      ];

      // Build and send transaction
      const message = createTransactionMessage('legacy');
      const messageWithFeePayer = setTransactionMessageFeePayer(sender, message);

      let messageWithInstructions = messageWithFeePayer;
      instructions.forEach((ix) => {
        messageWithInstructions = appendTransactionMessageInstruction(ix, messageWithInstructions);
      });

      const finalMessage = setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash(recentBlockhash),
          lastValidBlockHeight: BigInt(lastValidBlockHeight),
        },
        messageWithInstructions,
      );

      // Use the signer if available (for imported wallets), otherwise create from keypair
      let walletSigner;
      if (wallet.signer) {
        walletSigner = wallet.signer;
      } else if (wallet.keyPair) {
        walletSigner = await importCryptoKeySignerFromKeyPair(wallet.keyPair);
      } else {
        throw new Error('Wallet keypair or signer not available');
      }
      const signedTx = await signTransaction([walletSigner], finalMessage);

      const signature = await sendAndConfirmTransaction(
        signedTx,
        rpc,
        {
          skipPreflight: false,
          preflightCommitment: 'processed',
        },
        {
          commitment: 'processed',
          timeout: 30000,
        },
      );

      console.log('✅ Transfer transaction confirmed!');
      console.log('Signature:', signature);
      console.log('========================================');

      // Update balances
      await handleCheckTokenBalance();

      setStatusMessage(
        `✅ Sent ${transferAmount} ${tokenSymbol || 'tokens'} to ${recipientAddress.slice(0, 8)}...`,
      );
      setTransferAmount('');
    } catch (error) {
      console.error('Failed to send tokens:', error);
      setStatusMessage(
        `❌ Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsTransferring(false);
      setTimeout(() => setStatusMessage(''), 7000);
    }
  };

  // Check token balance for any wallet
  const handleCheckAnyBalance = async () => {
    if (!checkBalanceAddress || !checkBalanceMint) {
      setStatusMessage('Please enter both wallet address and token mint');
      return;
    }

    try {
      setIsCheckingBalance(true);

      const owner = address(checkBalanceAddress);
      const mint = address(checkBalanceMint);

      // Get the associated token address
      const ata = await getAssociatedTokenAddress(mint, owner);

      console.log('========================================');
      console.log('🔍 Checking Token Balance for External Wallet');
      console.log('========================================');
      console.log('Wallet:', checkBalanceAddress);
      console.log('Token Mint:', checkBalanceMint);
      console.log('Token Account:', ata);
      console.log('');

      // Fetch the token account info from the network
      const accountInfo = await rpc.getAccountInfo(ata, {
        encoding: 'base64',
        commitment: 'processed',
      });

      if (accountInfo.value) {
        const data = accountInfo.value.data;
        let balance = '0';

        // Handle both string and array formats
        let bytes: Uint8Array;
        if (typeof data === 'string') {
          const decoded = atob(data);
          bytes = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
          }
        } else if (Array.isArray(data) && data.length === 2 && typeof data[0] === 'string') {
          const decoded = atob(data[0]);
          bytes = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
          }
        } else if (data instanceof Uint8Array) {
          bytes = data;
        } else {
          console.error('Unexpected data format:', data);
          bytes = new Uint8Array(0);
        }

        // Read u64 at offset 64
        // Note: We need to know the decimals for proper display
        // For now, assume 6 decimals unless it's the current mint
        const decimals = checkBalanceMint === createdMint ? parseInt(tokenDecimals) : 6;
        if (bytes.length >= 72) {
          const balanceBytes = bytes.slice(64, 72);
          const balanceBigInt = new DataView(balanceBytes.buffer).getBigUint64(0, true);
          balance = (Number(balanceBigInt) / Math.pow(10, decimals)).toString();
        }

        setCheckedBalance(balance);
        console.log('✅ Token Account Found!');
        console.log('Balance:', balance, 'tokens');
        setStatusMessage(`Balance: ${balance} tokens`);
      } else {
        console.log('❌ Token account not found');
        setCheckedBalance('0');
        setStatusMessage('Token account not found for this wallet');
      }

      console.log('========================================');
    } catch (error) {
      console.error('Failed to check balance:', error);
      setStatusMessage(
        `❌ Failed to check balance: ${error instanceof Error ? error.message : 'Invalid address'}`,
      );
      setCheckedBalance('');
    } finally {
      setIsCheckingBalance(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  return (
    <div className="bento-container">
      {/* RPC Selector - Top Bar */}
      <div className="bento-item rpc-selector">
        <h3>🌐 Network</h3>
        <select
          value={rpcUrl}
          onChange={(e) => setRpcUrl(e.target.value)}
          className="network-select"
        >
          <option value="https://api.devnet.solana.com">Devnet</option>
          <option value="https://api.testnet.solana.com">Testnet</option>
          <option value="https://api.mainnet-beta.solana.com">Mainnet Beta</option>
          <option value="http://localhost:8899">Localhost</option>
        </select>
        <span className="network-status">● Connected</span>
      </div>

      {/* Active Wallet - Main Card */}
      <div className="bento-item wallet-main">
        <h3>👛 Active Wallet</h3>
        {wallet ? (
          <>
            <div className="wallet-info">
              <p className="wallet-name">{wallet.name}</p>
              <div className="wallet-address">
                <span>
                  {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                </span>
                <button onClick={handleCopyAddress} className="btn-tiny" title="Copy full address">
                  {copied ? '✓' : '📋'}
                </button>
              </div>
              <p className="wallet-balance">
                {wallet.balance !== null ? `${wallet.balance.toFixed(4)} SOL` : 'Loading...'}
                <button
                  onClick={refreshBalance}
                  disabled={isLoading}
                  className="btn-tiny"
                  style={{ marginLeft: '0.5rem' }}
                  title="Refresh balance"
                >
                  ↻
                </button>
              </p>
            </div>
            <div className="wallet-actions">
              <button onClick={handleAirdrop} disabled={isLoading} className="btn-primary">
                Airdrop 1 SOL
              </button>
              <button onClick={() => setWallet(null)} className="btn-secondary">
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <div className="wallet-empty">
            <p>No wallet connected</p>
            <button onClick={handleGenerateWallet} className="btn-primary">
              Generate New
            </button>
          </div>
        )}
      </div>

      {/* Wallet Manager */}
      <div className="bento-item wallet-manager">
        <h3>💾 Saved Wallets</h3>
        <div className="wallet-save">
          <input
            type="text"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            placeholder="Wallet name"
            className="input-small"
          />
          <button onClick={handleSaveWallet} disabled={!wallet} className="btn-small">
            Save
          </button>
        </div>
        <div className="wallet-list">
          {storedWallets.map((w) => (
            <div key={w.address} className="wallet-item">
              <span>{w.name}</span>
              <div className="wallet-item-actions">
                <button onClick={() => handleLoadWallet(w)} className="btn-tiny">
                  Load
                </button>
                <button
                  onClick={() => {
                    deleteWallet(w.address);
                    setStoredWallets(getStoredWallets());
                  }}
                  className="btn-tiny btn-danger"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signing Demo */}
      <div className="bento-item signing-demo">
        <h3>✍️ Sign & Verify</h3>
        <div className="signing-section">
          <input
            type="text"
            value={messageToSign}
            onChange={(e) => setMessageToSign(e.target.value)}
            placeholder="Message to sign"
            className="input-full"
          />
          <button onClick={handleSign} disabled={!wallet} className="btn-secondary">
            Sign
          </button>
        </div>
        {signature && (
          <>
            <p className="signature-display">{signature.slice(0, 20)}...</p>
            <div className="verify-section">
              <input
                type="text"
                value={verifyMessage}
                onChange={(e) => setVerifyMessage(e.target.value)}
                placeholder="Message to verify"
                className="input-full"
              />
              <button onClick={handleVerify} className="btn-secondary">
                Verify
              </button>
              {isValid !== null && (
                <span className={`verify-result ${isValid ? 'valid' : 'invalid'}`}>
                  {isValid ? '✓' : '✗'}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* RPC Operations */}
      <div className="bento-item rpc-operations">
        <h3>🔍 RPC Queries</h3>
        <div className="rpc-section">
          <input
            type="text"
            value={queryAddress}
            onChange={(e) => setQueryAddress(e.target.value)}
            placeholder="Account address"
            className="input-full"
          />
          <button onClick={handleFetchAccount} className="btn-secondary">
            Get Info
          </button>
        </div>
        {accountInfo ? (
          <pre className="code-display">{JSON.stringify(accountInfo, null, 2)}</pre>
        ) : null}
        <button onClick={handleGetBlockHeight} className="btn-secondary">
          Get Block Height
        </button>
        {blockHeight && <p>Height: {blockHeight}</p>}
      </div>

      {/* Token Creator */}
      <div className="bento-item token-builder">
        <h3>🪙 Token Creator & Minter</h3>

        {!createdMint ? (
          <>
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: '#f0f9ff',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#0369a1',
              }}
            >
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>📚 Create Your Own Token:</p>
              <p style={{ margin: '0', lineHeight: '1.6' }}>
                Design and deploy your own SPL token (Solana's token standard). This demo simulates
                the process - in production, these transactions would be sent to the network.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <label
                  style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  Token Name
                </label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g., My Awesome Token"
                  className="input-full"
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  Symbol
                </label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  placeholder="e.g., MAT"
                  className="input-full"
                  style={{ fontSize: '0.9rem' }}
                  maxLength={10}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  Decimals
                </label>
                <select
                  value={tokenDecimals}
                  onChange={(e) => setTokenDecimals(e.target.value)}
                  className="input-full"
                  style={{ fontSize: '0.9rem' }}
                >
                  <option value="0">0 (NFT-like)</option>
                  <option value="2">2 (like cents)</option>
                  <option value="6">6 (like USDC)</option>
                  <option value="9">9 (like SOL)</option>
                </select>
                <small style={{ color: '#999', fontSize: '0.75rem' }}>
                  Decimals determine the smallest unit of your token
                </small>
              </div>
            </div>

            <button
              onClick={handleCreateToken}
              disabled={!wallet || isCreatingToken}
              className="btn-primary"
              style={{ marginTop: '0.75rem' }}
            >
              {!wallet
                ? 'Connect Wallet First'
                : isCreatingToken
                  ? '⏳ Creating...'
                  : '🚀 Create Token'}
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: '#dcfce7',
                borderRadius: '6px',
              }}
            >
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#16a34a' }}>
                ✅ Token Created!
              </p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#333' }}>
                <strong>Name:</strong> {tokenName} ({tokenSymbol})
              </p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#333' }}>
                <strong>Mint:</strong>
                <span style={{ fontFamily: 'monospace', marginLeft: '0.5rem' }}>
                  {createdMint.slice(0, 8)}...{createdMint.slice(-8)}
                </span>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdMint);
                    setStatusMessage('Mint address copied!');
                    setTimeout(() => setStatusMessage(''), 2000);
                  }}
                  className="btn-tiny"
                  style={{ marginLeft: '0.5rem' }}
                  title="Copy mint address"
                >
                  📋
                </button>
              </p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#333' }}>
                <strong>Balance:</strong> {tokenBalance || '0'} {tokenSymbol}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label
                  style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  Amount to Mint
                </label>
                <input
                  type="text"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="e.g., 1000"
                  className="input-full"
                  style={{ fontSize: '0.9rem' }}
                />
                <small style={{ color: '#999', fontSize: '0.75rem' }}>
                  Enter amount in whole tokens (decimals handled automatically)
                </small>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleMintTokens}
                  disabled={isMinting}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  {isMinting ? '⏳ Minting...' : '🏭 Mint Tokens'}
                </button>
                <button
                  onClick={handleCheckTokenBalance}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  💰 Check Balance
                </button>
              </div>

              <button
                onClick={() => {
                  setCreatedMint('');
                  setTokenBalance('');
                  setTokenName('');
                  setTokenSymbol('');
                  setMintAmount('1000');
                }}
                className="btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                🔄 Create New Token
              </button>
            </div>
          </>
        )}
      </div>

      {/* Send Tokens Card */}
      <div className="bento-item send-tokens">
        <h3>💸 Send Tokens</h3>

        {!createdMint ? (
          <p style={{ fontSize: '0.9rem', color: '#666' }}>Create a token first to send</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label
                  style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  Token: {tokenSymbol || 'TOKEN'}
                </label>
                <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{createdMint}</code>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  Your Balance
                </label>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>
                  {tokenBalance || '0'} {tokenSymbol || 'tokens'}
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="Enter recipient wallet address"
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  Amount to Send
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.0"
                  min="0"
                  step="0.000001"
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                />
              </div>

              <button
                onClick={handleSendTokens}
                disabled={
                  !wallet ||
                  !createdMint ||
                  !recipientAddress ||
                  !transferAmount ||
                  isTransferring ||
                  parseFloat(transferAmount) > parseFloat(tokenBalance || '0')
                }
                style={{ marginTop: '0.5rem' }}
              >
                {isTransferring ? '⏳ Sending...' : '💸 Send Tokens'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Check Any Token Balance Card */}
      <div className="bento-item check-balance">
        <h3>🔍 Check Token Balance</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label
              style={{
                fontSize: '0.85rem',
                color: '#666',
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              Wallet Address
            </label>
            <input
              type="text"
              value={checkBalanceAddress}
              onChange={(e) => setCheckBalanceAddress(e.target.value)}
              placeholder="Enter wallet address to check"
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: '0.85rem',
                color: '#666',
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              Token Mint Address
            </label>
            <input
              type="text"
              value={checkBalanceMint}
              onChange={(e) => setCheckBalanceMint(e.target.value)}
              placeholder={createdMint || 'Enter token mint address'}
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
            />
            {createdMint && (
              <button
                onClick={() => setCheckBalanceMint(createdMint)}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', marginTop: '0.25rem', padding: '0.25rem 0.5rem' }}
              >
                Use Current Token
              </button>
            )}
          </div>

          {checkedBalance && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #0ea5e9',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                Balance:
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
                {checkedBalance} tokens
              </div>
            </div>
          )}

          <button
            onClick={handleCheckAnyBalance}
            disabled={!checkBalanceAddress || !checkBalanceMint || isCheckingBalance}
            style={{ marginTop: '0.5rem' }}
          >
            {isCheckingBalance ? '⏳ Checking...' : '🔍 Check Balance'}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bento-item status-bar">
        <div className="status-content">
          {isLoading && <span className="loading-spinner">⟳</span>}
          <span className="status-text">{statusMessage || `Connected to: ${rpcUrl}`}</span>
        </div>
      </div>
    </div>
  );
}
