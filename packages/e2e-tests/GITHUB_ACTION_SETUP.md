# GitHub Action E2E Tests Setup

## Setting up the Private Key Secret

The E2E tests require a funded Solana wallet on devnet to run. Follow these steps to configure the GitHub Action:

### 1. Get your Private Key

If you already have a private key in your `.env` file:
```bash
# Your .env file should contain:
VITE_PRIVATE_KEY=your-base58-encoded-private-key-here
```

The private key should be the base58-encoded secret key (typically 88 characters long).

### 2. Add the Secret to GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:
   - **Name**: `SOLANA_TEST_PRIVATE_KEY`
   - **Value**: Your base58-encoded private key (the same value from VITE_PRIVATE_KEY)
5. Click **Add secret**

### 3. Ensure Sufficient Balance

The wallet needs at least **2 SOL on devnet** to run all tests successfully:
- ~0.5 SOL for token creation and minting
- ~1 SOL for transfer tests
- ~0.5 SOL buffer for fees

To get devnet SOL:
```bash
# Using Solana CLI
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet

# Or use https://faucet.solana.com/
```

## GitHub Action Workflow

The E2E test workflow (`.github/workflows/e2e-tests.yml`) will:

1. **Trigger on**:
   - Push to main or develop branches
   - Pull requests to main or develop
   - Manual workflow dispatch

2. **Run tests**:
   - Install dependencies
   - Build all packages
   - Install Playwright with Chromium
   - Run E2E tests with the wallet from the secret

3. **Generate artifacts**:
   - Upload test reports (kept for 7 days)
   - Upload test videos on failure (kept for 3 days)

## Running the Action Manually

You can manually trigger the workflow:
1. Go to **Actions** tab in your repository
2. Select **E2E Tests** workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

## Viewing Test Results

After the workflow runs:
1. Click on the workflow run
2. Check the **Run E2E tests** step for test output
3. Download artifacts:
   - **playwright-report**: HTML test report
   - **test-videos**: Videos of failed tests (if any)

## Troubleshooting

### Tests Failing Due to Insufficient Balance
- Check the wallet balance on [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)
- Airdrop more SOL if needed

### Private Key Not Working
- Ensure the key is base58-encoded (not a JSON array)
- Verify the key works locally first
- Check that the secret name matches exactly: `SOLANA_TEST_PRIVATE_KEY`

### Timeout Issues
- The workflow has a 15-minute timeout
- Individual tests have 60-second timeouts
- If tests consistently timeout, you may need to increase these values

## Security Notes

⚠️ **Important Security Considerations**:
- Only use a **test wallet** for CI/CD
- Never use a mainnet wallet with real funds
- Keep minimal SOL balance (2-3 SOL) on devnet
- Rotate test keys periodically
- The secret is encrypted and only accessible to workflows

## Local Testing

Before pushing, test locally:
```bash
# Set up .env file
echo "VITE_PRIVATE_KEY=your-key-here" > packages/e2e-tests/.env

# Run tests
cd packages/e2e-tests
pnpm test
```

## Monitoring Costs

Even though it's devnet SOL (free), monitor usage:
- Token creation: ~0.05 SOL per token
- Transfers: ~0.000005 SOL per transfer
- Account creation: ~0.002 SOL per account

The tests should use less than 0.1 SOL per run.