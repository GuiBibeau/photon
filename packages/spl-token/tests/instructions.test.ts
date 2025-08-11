import { describe, it, expect } from 'vitest';
import { address, TOKEN_PROGRAM_ADDRESS } from '@photon/addresses';
import {
  createInitializeMintInstruction,
  createInitializeAccountInstruction,
  createTransferInstruction,
  createMintToInstruction,
  createBurnInstruction,
  createApproveInstruction,
  createRevokeInstruction,
  createCloseAccountInstruction,
  createSetAuthorityInstruction,
  createFreezeAccountInstruction,
  createThawAccountInstruction,
} from '../src/instructions';
import { TokenInstruction, AuthorityType } from '../src/types';
import { u8, u64 } from '@photon/codecs/primitives';

describe('SPL Token Instructions', () => {
  const mint = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const tokenAccount = address('2Uw1bpnsXxu3e1RFca5fUCQXCpUoz8qFd3jWwcKjNPKR');
  const owner = address('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
  const authority = address('5yNHjPkDjCHiRsmkfVKcCiUiCcRQXM3BfBBYBJqDWDkD');
  const delegate = address('DhPEStQcLvVMEqWsKvTG93VQkVjJHgBHxTYJYFBH8EUx');
  const destination = address('FGyh1FfooV7AtVrYjFGmjMxbELC8RMxNp4xY5WY4L4md');

  describe('createInitializeMintInstruction', () => {
    it('should create initialize mint instruction with freeze authority', () => {
      const freezeAuthority = address('7UT4ujaxzCZVzwiVW37kDK8zzkaKFDcPPnLii7VNDb5w');
      const instruction = createInitializeMintInstruction(mint, {
        decimals: 9,
        mintAuthority: authority,
        freezeAuthority,
      });

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(2);
      expect(instruction.accounts[0].pubkey).toBe(mint);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[0].isSigner).toBe(false);

      // Check instruction data
      const [instructionType] = u8.decode(instruction.data.slice(0, 1));
      expect(instructionType).toBe(TokenInstruction.InitializeMint);

      const [decimals] = u8.decode(instruction.data.slice(1, 2));
      expect(decimals).toBe(9);
    });

    it('should create initialize mint instruction without freeze authority', () => {
      const instruction = createInitializeMintInstruction(mint, {
        decimals: 6,
        mintAuthority: authority,
        freezeAuthority: null,
      });

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(2);

      // Check instruction data
      const [instructionType] = u8.decode(instruction.data.slice(0, 1));
      expect(instructionType).toBe(TokenInstruction.InitializeMint);

      const [decimals] = u8.decode(instruction.data.slice(1, 2));
      expect(decimals).toBe(6);

      // Check freeze authority option is 0 (none)
      const [freezeOption] = u8.decode(instruction.data.slice(34, 35));
      expect(freezeOption).toBe(0);
    });
  });

  describe('createInitializeAccountInstruction', () => {
    it('should create initialize account instruction', () => {
      const instruction = createInitializeAccountInstruction(tokenAccount, mint, owner);

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(4);
      expect(instruction.accounts[0].pubkey).toBe(tokenAccount);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[1].pubkey).toBe(mint);
      expect(instruction.accounts[2].pubkey).toBe(owner);

      const [instructionType] = u8.decode(instruction.data);
      expect(instructionType).toBe(TokenInstruction.InitializeAccount);
    });
  });

  describe('createTransferInstruction', () => {
    it('should create transfer instruction', () => {
      const amount = 1000000n;
      const instruction = createTransferInstruction({
        amount,
        source: tokenAccount,
        destination,
        owner,
      });

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(3);
      expect(instruction.accounts[0].pubkey).toBe(tokenAccount);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[1].pubkey).toBe(destination);
      expect(instruction.accounts[1].isWritable).toBe(true);
      expect(instruction.accounts[2].pubkey).toBe(owner);
      expect(instruction.accounts[2].isSigner).toBe(true);

      const [instructionType] = u8.decode(instruction.data.slice(0, 1));
      expect(instructionType).toBe(TokenInstruction.Transfer);

      const [decodedAmount] = u64.decode(instruction.data.slice(1, 9));
      expect(decodedAmount).toBe(amount);
    });

    it('should create transfer instruction with additional signers', () => {
      const signer1 = address('BFi8Tw2DVsMmKJf27cq3w3dSPqJLXqKLDGkQv1N4GD4q');
      const signer2 = address('CMBXzfbr8L4rvW3JnPLTNpB9zqhWLh36SnPgrA7gs3QF');

      const instruction = createTransferInstruction({
        amount: 500000n,
        source: tokenAccount,
        destination,
        owner,
        signers: [signer1, signer2],
      });

      expect(instruction.accounts).toHaveLength(5);
      expect(instruction.accounts[3].pubkey).toBe(signer1);
      expect(instruction.accounts[3].isSigner).toBe(true);
      expect(instruction.accounts[4].pubkey).toBe(signer2);
      expect(instruction.accounts[4].isSigner).toBe(true);
    });
  });

  describe('createMintToInstruction', () => {
    it('should create mint to instruction', () => {
      const amount = 1000000000n;
      const instruction = createMintToInstruction({
        amount,
        mint,
        destination: tokenAccount,
        authority,
      });

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(3);
      expect(instruction.accounts[0].pubkey).toBe(mint);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[1].pubkey).toBe(tokenAccount);
      expect(instruction.accounts[1].isWritable).toBe(true);
      expect(instruction.accounts[2].pubkey).toBe(authority);
      expect(instruction.accounts[2].isSigner).toBe(true);

      const [instructionType] = u8.decode(instruction.data.slice(0, 1));
      expect(instructionType).toBe(TokenInstruction.MintTo);

      const [decodedAmount] = u64.decode(instruction.data.slice(1, 9));
      expect(decodedAmount).toBe(amount);
    });
  });

  describe('createBurnInstruction', () => {
    it('should create burn instruction', () => {
      const amount = 500000n;
      const instruction = createBurnInstruction({
        amount,
        account: tokenAccount,
        mint,
        owner,
      });

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(3);
      expect(instruction.accounts[0].pubkey).toBe(tokenAccount);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[1].pubkey).toBe(mint);
      expect(instruction.accounts[1].isWritable).toBe(true);
      expect(instruction.accounts[2].pubkey).toBe(owner);
      expect(instruction.accounts[2].isSigner).toBe(true);

      const [instructionType] = u8.decode(instruction.data.slice(0, 1));
      expect(instructionType).toBe(TokenInstruction.Burn);

      const [decodedAmount] = u64.decode(instruction.data.slice(1, 9));
      expect(decodedAmount).toBe(amount);
    });
  });

  describe('createApproveInstruction', () => {
    it('should create approve instruction', () => {
      const amount = 100000n;
      const instruction = createApproveInstruction({
        amount,
        account: tokenAccount,
        delegate,
        owner,
      });

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(3);
      expect(instruction.accounts[0].pubkey).toBe(tokenAccount);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[1].pubkey).toBe(delegate);
      expect(instruction.accounts[1].isWritable).toBe(false);
      expect(instruction.accounts[2].pubkey).toBe(owner);
      expect(instruction.accounts[2].isSigner).toBe(true);

      const [instructionType] = u8.decode(instruction.data.slice(0, 1));
      expect(instructionType).toBe(TokenInstruction.Approve);

      const [decodedAmount] = u64.decode(instruction.data.slice(1, 9));
      expect(decodedAmount).toBe(amount);
    });
  });

  describe('createRevokeInstruction', () => {
    it('should create revoke instruction', () => {
      const instruction = createRevokeInstruction(tokenAccount, owner);

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(2);
      expect(instruction.accounts[0].pubkey).toBe(tokenAccount);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[1].pubkey).toBe(owner);
      expect(instruction.accounts[1].isSigner).toBe(true);

      const [instructionType] = u8.decode(instruction.data);
      expect(instructionType).toBe(TokenInstruction.Revoke);
    });
  });

  describe('createCloseAccountInstruction', () => {
    it('should create close account instruction', () => {
      const instruction = createCloseAccountInstruction(tokenAccount, destination, owner);

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(3);
      expect(instruction.accounts[0].pubkey).toBe(tokenAccount);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[1].pubkey).toBe(destination);
      expect(instruction.accounts[1].isWritable).toBe(true);
      expect(instruction.accounts[2].pubkey).toBe(owner);
      expect(instruction.accounts[2].isSigner).toBe(true);

      const [instructionType] = u8.decode(instruction.data);
      expect(instructionType).toBe(TokenInstruction.CloseAccount);
    });
  });

  describe('createSetAuthorityInstruction', () => {
    it('should create set authority instruction with new authority', () => {
      const newAuthority = address('H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm');
      const instruction = createSetAuthorityInstruction(
        mint,
        AuthorityType.MintTokens,
        authority,
        newAuthority,
      );

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(2);
      expect(instruction.accounts[0].pubkey).toBe(mint);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[1].pubkey).toBe(authority);
      expect(instruction.accounts[1].isSigner).toBe(true);

      const [instructionType] = u8.decode(instruction.data.slice(0, 1));
      expect(instructionType).toBe(TokenInstruction.SetAuthority);

      const [authorityType] = u8.decode(instruction.data.slice(1, 2));
      expect(authorityType).toBe(AuthorityType.MintTokens);

      const [newAuthorityOption] = u8.decode(instruction.data.slice(2, 3));
      expect(newAuthorityOption).toBe(1); // Has new authority
    });

    it('should create set authority instruction to remove authority', () => {
      const instruction = createSetAuthorityInstruction(
        mint,
        AuthorityType.FreezeAccount,
        authority,
        null,
      );

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);

      const [newAuthorityOption] = u8.decode(instruction.data.slice(2, 3));
      expect(newAuthorityOption).toBe(0); // No new authority
    });
  });

  describe('createFreezeAccountInstruction', () => {
    it('should create freeze account instruction', () => {
      const instruction = createFreezeAccountInstruction(tokenAccount, mint, authority);

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(3);
      expect(instruction.accounts[0].pubkey).toBe(tokenAccount);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[1].pubkey).toBe(mint);
      expect(instruction.accounts[1].isWritable).toBe(false);
      expect(instruction.accounts[2].pubkey).toBe(authority);
      expect(instruction.accounts[2].isSigner).toBe(true);

      const [instructionType] = u8.decode(instruction.data);
      expect(instructionType).toBe(TokenInstruction.FreezeAccount);
    });
  });

  describe('createThawAccountInstruction', () => {
    it('should create thaw account instruction', () => {
      const instruction = createThawAccountInstruction(tokenAccount, mint, authority);

      expect(instruction.programId).toBe(TOKEN_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(3);
      expect(instruction.accounts[0].pubkey).toBe(tokenAccount);
      expect(instruction.accounts[0].isWritable).toBe(true);
      expect(instruction.accounts[1].pubkey).toBe(mint);
      expect(instruction.accounts[1].isWritable).toBe(false);
      expect(instruction.accounts[2].pubkey).toBe(authority);
      expect(instruction.accounts[2].isSigner).toBe(true);

      const [instructionType] = u8.decode(instruction.data);
      expect(instructionType).toBe(TokenInstruction.ThawAccount);
    });
  });
});
