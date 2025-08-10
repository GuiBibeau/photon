import { describe, it, expect } from 'vitest';
import { address } from '@photon/addresses';
import {
  TokenInstruction,
  type InitializeMintInstructionData,
  type InitializeAccountInstructionData,
  type TransferInstructionData,
  type TransferCheckedInstructionData,
  type MintToInstructionData,
  type MintToCheckedInstructionData,
  type BurnInstructionData,
  type BurnCheckedInstructionData,
  type ApproveInstructionData,
  type ApproveCheckedInstructionData,
  type SetAuthorityInstructionData,
  type CloseAccountInstructionData,
  type FreezeAccountInstructionData,
  type ThawAccountInstructionData,
  type RevokeInstructionData,
  type SyncNativeInstructionData,
  type InitializeMint2InstructionData,
  type InitializeAccount3InstructionData,
  type InitializeMultisigInstructionData,
  type TransferCheckedWithFeeInstructionData,
  type UpdateDefaultAccountStateInstructionData,
  type CloseMintInstructionData,
} from '../src/instructions';
import { AuthorityType, AccountState } from '../src/types';

describe('SPL Token Instructions', () => {
  describe('TokenInstruction enum', () => {
    it('should have correct values for basic instructions', () => {
      expect(TokenInstruction.InitializeMint).toBe(0);
      expect(TokenInstruction.InitializeAccount).toBe(1);
      expect(TokenInstruction.InitializeMultisig).toBe(2);
      expect(TokenInstruction.Transfer).toBe(3);
      expect(TokenInstruction.Approve).toBe(4);
      expect(TokenInstruction.Revoke).toBe(5);
      expect(TokenInstruction.SetAuthority).toBe(6);
      expect(TokenInstruction.MintTo).toBe(7);
      expect(TokenInstruction.Burn).toBe(8);
      expect(TokenInstruction.CloseAccount).toBe(9);
      expect(TokenInstruction.FreezeAccount).toBe(10);
      expect(TokenInstruction.ThawAccount).toBe(11);
    });

    it('should have correct values for checked instructions', () => {
      expect(TokenInstruction.TransferChecked).toBe(12);
      expect(TokenInstruction.ApproveChecked).toBe(13);
      expect(TokenInstruction.MintToChecked).toBe(14);
      expect(TokenInstruction.BurnChecked).toBe(15);
    });

    it('should have correct values for v2 instructions', () => {
      expect(TokenInstruction.InitializeAccount2).toBe(16);
      expect(TokenInstruction.SyncNative).toBe(17);
      expect(TokenInstruction.InitializeAccount3).toBe(18);
      expect(TokenInstruction.InitializeMultisig2).toBe(19);
      expect(TokenInstruction.InitializeMint2).toBe(20);
    });

    it('should have correct values for Token-2022 instructions', () => {
      expect(TokenInstruction.GetAccountDataSize).toBe(21);
      expect(TokenInstruction.InitializeImmutableOwner).toBe(22);
      expect(TokenInstruction.Reallocate).toBe(23);
      expect(TokenInstruction.CreateNativeMint).toBe(24);
      expect(TokenInstruction.InitializeNonTransferableMint).toBe(25);
      expect(TokenInstruction.EnableCpiGuard).toBe(26);
      expect(TokenInstruction.DisableCpiGuard).toBe(27);
      expect(TokenInstruction.EnableRequiredMemoTransfers).toBe(28);
      expect(TokenInstruction.DisableRequiredMemoTransfers).toBe(29);
    });

    it('should have correct values for transfer fee instructions', () => {
      expect(TokenInstruction.TransferCheckedWithFee).toBe(30);
      expect(TokenInstruction.WithdrawWithheldTokensFromMint).toBe(31);
      expect(TokenInstruction.WithdrawWithheldTokensFromAccounts).toBe(32);
      expect(TokenInstruction.HarvestWithheldTokensToMint).toBe(33);
    });

    it('should have correct values for extension configuration instructions', () => {
      expect(TokenInstruction.UpdateDefaultAccountState).toBe(34);
      expect(TokenInstruction.UpdateTransferHook).toBe(35);
      expect(TokenInstruction.UpdateMetadataPointer).toBe(36);
      expect(TokenInstruction.InitializeMetadata).toBe(37);
      expect(TokenInstruction.UpdateMetadataField).toBe(38);
      expect(TokenInstruction.RemoveMetadataField).toBe(39);
      expect(TokenInstruction.UpdateMetadataAuthority).toBe(40);
      expect(TokenInstruction.PuffMetadata).toBe(41);
      expect(TokenInstruction.UpdateInterestRate).toBe(42);
      expect(TokenInstruction.InitializePermanentDelegate).toBe(43);
    });

    it('should have correct values for group instructions', () => {
      expect(TokenInstruction.UpdateGroupPointer).toBe(44);
      expect(TokenInstruction.UpdateGroupMemberPointer).toBe(45);
      expect(TokenInstruction.InitializeGroup).toBe(46);
      expect(TokenInstruction.UpdateGroupMaxSize).toBe(47);
      expect(TokenInstruction.UpdateGroupAuthority).toBe(48);
      expect(TokenInstruction.InitializeGroupMember).toBe(49);
    });

    it('should have correct value for close mint', () => {
      expect(TokenInstruction.CloseMint).toBe(50);
    });
  });

  describe('Instruction Data Types', () => {
    it('should create InitializeMint instruction data', () => {
      const mintAuthority = address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx');
      const freezeAuthority = address('Gv1KWf8DT1jKv5pKBmGaTmVszqa56Xn8YGx2Pg7i7qAk');

      const data: InitializeMintInstructionData = {
        instruction: TokenInstruction.InitializeMint,
        decimals: 9,
        mintAuthority,
        freezeAuthority,
      };

      expect(data.instruction).toBe(TokenInstruction.InitializeMint);
      expect(data.decimals).toBe(9);
      expect(data.mintAuthority).toBe(mintAuthority);
      expect(data.freezeAuthority).toBe(freezeAuthority);
    });

    it('should create InitializeAccount instruction data', () => {
      const data: InitializeAccountInstructionData = {
        instruction: TokenInstruction.InitializeAccount,
      };

      expect(data.instruction).toBe(TokenInstruction.InitializeAccount);
    });

    it('should create Transfer instruction data', () => {
      const data: TransferInstructionData = {
        instruction: TokenInstruction.Transfer,
        amount: 1000000n,
      };

      expect(data.instruction).toBe(TokenInstruction.Transfer);
      expect(data.amount).toBe(1000000n);
    });

    it('should create TransferChecked instruction data', () => {
      const data: TransferCheckedInstructionData = {
        instruction: TokenInstruction.TransferChecked,
        amount: 1000000n,
        decimals: 9,
      };

      expect(data.instruction).toBe(TokenInstruction.TransferChecked);
      expect(data.amount).toBe(1000000n);
      expect(data.decimals).toBe(9);
    });

    it('should create MintTo instruction data', () => {
      const data: MintToInstructionData = {
        instruction: TokenInstruction.MintTo,
        amount: 5000000n,
      };

      expect(data.instruction).toBe(TokenInstruction.MintTo);
      expect(data.amount).toBe(5000000n);
    });

    it('should create MintToChecked instruction data', () => {
      const data: MintToCheckedInstructionData = {
        instruction: TokenInstruction.MintToChecked,
        amount: 5000000n,
        decimals: 6,
      };

      expect(data.instruction).toBe(TokenInstruction.MintToChecked);
      expect(data.amount).toBe(5000000n);
      expect(data.decimals).toBe(6);
    });

    it('should create Burn instruction data', () => {
      const data: BurnInstructionData = {
        instruction: TokenInstruction.Burn,
        amount: 100000n,
      };

      expect(data.instruction).toBe(TokenInstruction.Burn);
      expect(data.amount).toBe(100000n);
    });

    it('should create BurnChecked instruction data', () => {
      const data: BurnCheckedInstructionData = {
        instruction: TokenInstruction.BurnChecked,
        amount: 100000n,
        decimals: 9,
      };

      expect(data.instruction).toBe(TokenInstruction.BurnChecked);
      expect(data.amount).toBe(100000n);
      expect(data.decimals).toBe(9);
    });

    it('should create Approve instruction data', () => {
      const data: ApproveInstructionData = {
        instruction: TokenInstruction.Approve,
        amount: 500000n,
      };

      expect(data.instruction).toBe(TokenInstruction.Approve);
      expect(data.amount).toBe(500000n);
    });

    it('should create ApproveChecked instruction data', () => {
      const data: ApproveCheckedInstructionData = {
        instruction: TokenInstruction.ApproveChecked,
        amount: 500000n,
        decimals: 6,
      };

      expect(data.instruction).toBe(TokenInstruction.ApproveChecked);
      expect(data.amount).toBe(500000n);
      expect(data.decimals).toBe(6);
    });

    it('should create SetAuthority instruction data', () => {
      const newAuthority = address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx');

      const data: SetAuthorityInstructionData = {
        instruction: TokenInstruction.SetAuthority,
        authorityType: AuthorityType.MintTokens,
        newAuthority,
      };

      expect(data.instruction).toBe(TokenInstruction.SetAuthority);
      expect(data.authorityType).toBe(AuthorityType.MintTokens);
      expect(data.newAuthority).toBe(newAuthority);
    });

    it('should create SetAuthority instruction data with no new authority', () => {
      const data: SetAuthorityInstructionData = {
        instruction: TokenInstruction.SetAuthority,
        authorityType: AuthorityType.FreezeAccount,
        // newAuthority is optional (setting to None)
      };

      expect(data.instruction).toBe(TokenInstruction.SetAuthority);
      expect(data.authorityType).toBe(AuthorityType.FreezeAccount);
      expect(data.newAuthority).toBeUndefined();
    });

    it('should create CloseAccount instruction data', () => {
      const data: CloseAccountInstructionData = {
        instruction: TokenInstruction.CloseAccount,
      };

      expect(data.instruction).toBe(TokenInstruction.CloseAccount);
    });

    it('should create FreezeAccount instruction data', () => {
      const data: FreezeAccountInstructionData = {
        instruction: TokenInstruction.FreezeAccount,
      };

      expect(data.instruction).toBe(TokenInstruction.FreezeAccount);
    });

    it('should create ThawAccount instruction data', () => {
      const data: ThawAccountInstructionData = {
        instruction: TokenInstruction.ThawAccount,
      };

      expect(data.instruction).toBe(TokenInstruction.ThawAccount);
    });

    it('should create Revoke instruction data', () => {
      const data: RevokeInstructionData = {
        instruction: TokenInstruction.Revoke,
      };

      expect(data.instruction).toBe(TokenInstruction.Revoke);
    });

    it('should create SyncNative instruction data', () => {
      const data: SyncNativeInstructionData = {
        instruction: TokenInstruction.SyncNative,
      };

      expect(data.instruction).toBe(TokenInstruction.SyncNative);
    });

    it('should create InitializeMint2 instruction data', () => {
      const mintAuthority = address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx');
      const freezeAuthority = address('Gv1KWf8DT1jKv5pKBmGaTmVszqa56Xn8YGx2Pg7i7qAk');

      const data: InitializeMint2InstructionData = {
        instruction: TokenInstruction.InitializeMint2,
        decimals: 6,
        mintAuthority,
        freezeAuthority,
      };

      expect(data.instruction).toBe(TokenInstruction.InitializeMint2);
      expect(data.decimals).toBe(6);
      expect(data.mintAuthority).toBe(mintAuthority);
      expect(data.freezeAuthority).toBe(freezeAuthority);
    });

    it('should create InitializeAccount3 instruction data', () => {
      const owner = address('5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx');

      const data: InitializeAccount3InstructionData = {
        instruction: TokenInstruction.InitializeAccount3,
        owner,
      };

      expect(data.instruction).toBe(TokenInstruction.InitializeAccount3);
      expect(data.owner).toBe(owner);
    });

    it('should create InitializeMultisig instruction data', () => {
      const data: InitializeMultisigInstructionData = {
        instruction: TokenInstruction.InitializeMultisig,
        m: 2,
      };

      expect(data.instruction).toBe(TokenInstruction.InitializeMultisig);
      expect(data.m).toBe(2);
    });

    it('should create TransferCheckedWithFee instruction data', () => {
      const data: TransferCheckedWithFeeInstructionData = {
        instruction: TokenInstruction.TransferCheckedWithFee,
        amount: 1000000n,
        decimals: 6,
        fee: 5000n,
      };

      expect(data.instruction).toBe(TokenInstruction.TransferCheckedWithFee);
      expect(data.amount).toBe(1000000n);
      expect(data.decimals).toBe(6);
      expect(data.fee).toBe(5000n);
    });

    it('should create UpdateDefaultAccountState instruction data', () => {
      const data: UpdateDefaultAccountStateInstructionData = {
        instruction: TokenInstruction.UpdateDefaultAccountState,
        state: AccountState.Frozen,
      };

      expect(data.instruction).toBe(TokenInstruction.UpdateDefaultAccountState);
      expect(data.state).toBe(AccountState.Frozen);
    });

    it('should create CloseMint instruction data', () => {
      const data: CloseMintInstructionData = {
        instruction: TokenInstruction.CloseMint,
      };

      expect(data.instruction).toBe(TokenInstruction.CloseMint);
    });
  });
});
