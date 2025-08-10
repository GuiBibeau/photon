import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import {
  MAX_SUPPLY,
  AccountState,
  AuthorityType,
  ExtensionType,
  type TokenAccount,
  type MintAccount,
  type Multisig,
  type TransferFeeConfig,
  type InterestBearingConfig,
  type DefaultAccountState,
  type PermanentDelegateExtension,
  type TransferHookExtension,
  type MetadataPointerExtension,
  type TokenMetadataExtension,
  type MintCloseAuthorityExtension,
  type NonTransferableExtension,
  type CpiGuardExtension,
  type ImmutableOwnerExtension,
  type MemoTransferExtension,
} from '../src/types';
import { asMintAddress } from '../src/constants';

describe('SPL Token Types', () => {
  describe('Constants', () => {
    it('should have correct MAX_SUPPLY value', () => {
      expect(MAX_SUPPLY).toBe(18446744073709551615n);
      expect(MAX_SUPPLY).toBe(2n ** 64n - 1n);
    });
  });

  describe('AccountState enum', () => {
    it('should have correct values', () => {
      expect(AccountState.Uninitialized).toBe(0);
      expect(AccountState.Initialized).toBe(1);
      expect(AccountState.Frozen).toBe(2);
    });
  });

  describe('AuthorityType enum', () => {
    it('should have correct values for basic authorities', () => {
      expect(AuthorityType.MintTokens).toBe(0);
      expect(AuthorityType.FreezeAccount).toBe(1);
      expect(AuthorityType.AccountOwner).toBe(2);
      expect(AuthorityType.CloseAccount).toBe(3);
      expect(AuthorityType.TransferTokens).toBe(4);
    });

    it('should have correct values for Token-2022 authorities', () => {
      expect(AuthorityType.CloseMint).toBe(5);
      expect(AuthorityType.TransferFeeConfig).toBe(6);
      expect(AuthorityType.WithheldWithdraw).toBe(7);
      expect(AuthorityType.InterestRate).toBe(8);
      expect(AuthorityType.PermanentDelegate).toBe(9);
      expect(AuthorityType.MetadataPointer).toBe(10);
      expect(AuthorityType.GroupPointer).toBe(11);
      expect(AuthorityType.GroupMemberPointer).toBe(12);
    });
  });

  describe('ExtensionType enum', () => {
    it('should have correct values for all extensions', () => {
      expect(ExtensionType.Uninitialized).toBe(0);
      expect(ExtensionType.TransferFeeConfig).toBe(1);
      expect(ExtensionType.TransferFeeAmount).toBe(2);
      expect(ExtensionType.MintCloseAuthority).toBe(3);
      expect(ExtensionType.ConfidentialTransferMint).toBe(4);
      expect(ExtensionType.ConfidentialTransferAccount).toBe(5);
      expect(ExtensionType.DefaultAccountState).toBe(6);
      expect(ExtensionType.ImmutableOwner).toBe(7);
      expect(ExtensionType.MemoTransfer).toBe(8);
      expect(ExtensionType.NonTransferable).toBe(9);
      expect(ExtensionType.InterestBearingConfig).toBe(10);
      expect(ExtensionType.CpiGuard).toBe(11);
      expect(ExtensionType.PermanentDelegate).toBe(12);
      expect(ExtensionType.NonTransferableAccount).toBe(13);
      expect(ExtensionType.TransferHook).toBe(14);
      expect(ExtensionType.TransferHookAccount).toBe(15);
      expect(ExtensionType.MetadataPointer).toBe(16);
      expect(ExtensionType.TokenMetadata).toBe(17);
      expect(ExtensionType.GroupPointer).toBe(18);
      expect(ExtensionType.GroupMemberPointer).toBe(19);
      expect(ExtensionType.TokenGroup).toBe(20);
      expect(ExtensionType.TokenGroupMember).toBe(21);
    });
  });

  describe('TokenAccount interface', () => {
    it('should create valid token account object', () => {
      const mintAddress = asMintAddress(address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'));
      const ownerAddress = address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx');

      const tokenAccount: TokenAccount = {
        mint: mintAddress,
        owner: ownerAddress,
        amount: 1000000n,
        state: AccountState.Initialized,
      };

      expect(tokenAccount.mint).toBe(mintAddress);
      expect(tokenAccount.owner).toBe(ownerAddress);
      expect(tokenAccount.amount).toBe(1000000n);
      expect(tokenAccount.state).toBe(AccountState.Initialized);
    });

    it('should support optional fields', () => {
      const mintAddress = asMintAddress(address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'));
      const ownerAddress = address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx');
      const delegateAddress = address('Gv1KWf8DT1jKv5pKBmGaTmVszqa56Xn8YGx2Pg7i7qAk');
      const closeAuthority = address('8Dyk6haF4WHKC3xfVfWYvBHBGJqPSKRudLQxMQJqGhvT');

      const tokenAccount: TokenAccount = {
        mint: mintAddress,
        owner: ownerAddress,
        amount: 1000000n,
        delegate: delegateAddress,
        state: AccountState.Initialized,
        isNative: false,
        delegatedAmount: 500000n,
        closeAuthority,
      };

      expect(tokenAccount.delegate).toBe(delegateAddress);
      expect(tokenAccount.isNative).toBe(false);
      expect(tokenAccount.delegatedAmount).toBe(500000n);
      expect(tokenAccount.closeAuthority).toBe(closeAuthority);
    });
  });

  describe('MintAccount interface', () => {
    it('should create valid mint account object', () => {
      const freezeAuthority = address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx');
      const mintAuthority = address('Gv1KWf8DT1jKv5pKBmGaTmVszqa56Xn8YGx2Pg7i7qAk');

      const mintAccount: MintAccount = {
        supply: 1000000000n,
        decimals: 9,
        isInitialized: true,
        freezeAuthority,
        mintAuthority,
      };

      expect(mintAccount.supply).toBe(1000000000n);
      expect(mintAccount.decimals).toBe(9);
      expect(mintAccount.isInitialized).toBe(true);
      expect(mintAccount.freezeAuthority).toBe(freezeAuthority);
      expect(mintAccount.mintAuthority).toBe(mintAuthority);
    });

    it('should support extensions array', () => {
      const mintAccount: MintAccount = {
        supply: 1000000000n,
        decimals: 6,
        isInitialized: true,
        extensions: [
          {
            type: ExtensionType.TransferFeeConfig,
          } as TransferFeeConfig,
          {
            type: ExtensionType.NonTransferable,
          } as NonTransferableExtension,
        ],
      };

      expect(mintAccount.extensions).toHaveLength(2);
      expect(mintAccount.extensions?.[0].type).toBe(ExtensionType.TransferFeeConfig);
      expect(mintAccount.extensions?.[1].type).toBe(ExtensionType.NonTransferable);
    });
  });

  describe('Multisig interface', () => {
    it('should create valid multisig object', () => {
      const signer1 = address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx');
      const signer2 = address('Gv1KWf8DT1jKv5pKBmGaTmVszqa56Xn8YGx2Pg7i7qAk');
      const signer3 = address('8Dyk6haF4WHKC3xfVfWYvBHBGJqPSKRudLQxMQJqGhvT');

      const multisig: Multisig = {
        m: 2,
        n: 3,
        isInitialized: true,
        signers: [signer1, signer2, signer3],
      };

      expect(multisig.m).toBe(2);
      expect(multisig.n).toBe(3);
      expect(multisig.isInitialized).toBe(true);
      expect(multisig.signers).toHaveLength(3);
      expect(multisig.signers[0]).toBe(signer1);
      expect(multisig.signers[1]).toBe(signer2);
      expect(multisig.signers[2]).toBe(signer3);
    });
  });

  describe('Token Extensions', () => {
    it('should create transfer fee config extension', () => {
      const transferFeeConfig: TransferFeeConfig = {
        type: ExtensionType.TransferFeeConfig,
        transferFeeConfigAuthority: address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx'),
        withdrawWithheldAuthority: address('Gv1KWf8DT1jKv5pKBmGaTmVszqa56Xn8YGx2Pg7i7qAk'),
        withheldAmount: 1000000n,
        olderTransferFee: {
          epoch: 100n,
          maximumFee: 5000n,
          transferFeeBasisPoints: 50,
        },
        newerTransferFee: {
          epoch: 200n,
          maximumFee: 10000n,
          transferFeeBasisPoints: 100,
        },
      };

      expect(transferFeeConfig.type).toBe(ExtensionType.TransferFeeConfig);
      expect(transferFeeConfig.withheldAmount).toBe(1000000n);
      expect(transferFeeConfig.newerTransferFee.transferFeeBasisPoints).toBe(100);
    });

    it('should create interest bearing config extension', () => {
      const interestConfig: InterestBearingConfig = {
        type: ExtensionType.InterestBearingConfig,
        rateAuthority: address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx'),
        initializationTimestamp: 1700000000,
        preUpdateAverageRate: 250,
        lastUpdateTimestamp: 1700001000,
        currentRate: 300,
      };

      expect(interestConfig.type).toBe(ExtensionType.InterestBearingConfig);
      expect(interestConfig.currentRate).toBe(300);
    });

    it('should create default account state extension', () => {
      const defaultState: DefaultAccountState = {
        type: ExtensionType.DefaultAccountState,
        state: AccountState.Frozen,
      };

      expect(defaultState.type).toBe(ExtensionType.DefaultAccountState);
      expect(defaultState.state).toBe(AccountState.Frozen);
    });

    it('should create permanent delegate extension', () => {
      const permanentDelegate: PermanentDelegateExtension = {
        type: ExtensionType.PermanentDelegate,
        delegate: address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx'),
      };

      expect(permanentDelegate.type).toBe(ExtensionType.PermanentDelegate);
      expect(permanentDelegate.delegate).toBeDefined();
    });

    it('should create transfer hook extension', () => {
      const transferHook: TransferHookExtension = {
        type: ExtensionType.TransferHook,
        authority: address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx'),
        programId: address('Gv1KWf8DT1jKv5pKBmGaTmVszqa56Xn8YGx2Pg7i7qAk'),
      };

      expect(transferHook.type).toBe(ExtensionType.TransferHook);
      expect(transferHook.programId).toBeDefined();
    });

    it('should create metadata pointer extension', () => {
      const metadataPointer: MetadataPointerExtension = {
        type: ExtensionType.MetadataPointer,
        authority: address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx'),
        metadataAddress: address('Gv1KWf8DT1jKv5pKBmGaTmVszqa56Xn8YGx2Pg7i7qAk'),
      };

      expect(metadataPointer.type).toBe(ExtensionType.MetadataPointer);
      expect(metadataPointer.metadataAddress).toBeDefined();
    });

    it('should create token metadata extension', () => {
      const mintAddress = asMintAddress(address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'));

      const tokenMetadata: TokenMetadataExtension = {
        type: ExtensionType.TokenMetadata,
        updateAuthority: address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx'),
        mint: mintAddress,
        name: 'Test Token',
        symbol: 'TEST',
        uri: 'https://example.com/metadata.json',
        additionalMetadata: [
          ['key1', 'value1'],
          ['key2', 'value2'],
        ],
      };

      expect(tokenMetadata.type).toBe(ExtensionType.TokenMetadata);
      expect(tokenMetadata.name).toBe('Test Token');
      expect(tokenMetadata.symbol).toBe('TEST');
      expect(tokenMetadata.additionalMetadata).toHaveLength(2);
    });

    it('should create mint close authority extension', () => {
      const mintCloseAuth: MintCloseAuthorityExtension = {
        type: ExtensionType.MintCloseAuthority,
        closeAuthority: address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx'),
      };

      expect(mintCloseAuth.type).toBe(ExtensionType.MintCloseAuthority);
      expect(mintCloseAuth.closeAuthority).toBeDefined();
    });

    it('should create non-transferable extension', () => {
      const nonTransferable: NonTransferableExtension = {
        type: ExtensionType.NonTransferable,
      };

      expect(nonTransferable.type).toBe(ExtensionType.NonTransferable);
    });

    it('should create CPI guard extension', () => {
      const cpiGuard: CpiGuardExtension = {
        type: ExtensionType.CpiGuard,
        lockCpi: true,
      };

      expect(cpiGuard.type).toBe(ExtensionType.CpiGuard);
      expect(cpiGuard.lockCpi).toBe(true);
    });

    it('should create immutable owner extension', () => {
      const immutableOwner: ImmutableOwnerExtension = {
        type: ExtensionType.ImmutableOwner,
      };

      expect(immutableOwner.type).toBe(ExtensionType.ImmutableOwner);
    });

    it('should create memo transfer extension', () => {
      const memoTransfer: MemoTransferExtension = {
        type: ExtensionType.MemoTransfer,
        requireIncomingTransferMemos: true,
      };

      expect(memoTransfer.type).toBe(ExtensionType.MemoTransfer);
      expect(memoTransfer.requireIncomingTransferMemos).toBe(true);
    });
  });
});
