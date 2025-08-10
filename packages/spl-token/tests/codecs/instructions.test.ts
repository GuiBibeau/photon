import { describe, it, expect } from 'vitest';
import {
  initializeMintCodec,
  initializeAccountCodec,
  initializeMultisigCodec,
  transferCodec,
  approveCodec,
  revokeCodec,
  setAuthorityCodec,
  mintToCodec,
  burnCodec,
  closeAccountCodec,
  freezeAccountCodec,
  thawAccountCodec,
  transferCheckedCodec,
  approveCheckedCodec,
  mintToCheckedCodec,
  burnCheckedCodec,
  initializeAccount2Codec,
  syncNativeCodec,
  initializeAccount3Codec,
  initializeMultisig2Codec,
  initializeMint2Codec,
  decodeTokenInstruction,
  encodeTokenInstruction,
  type InitializeMintData,
  type InitializeMultisigData,
  type TransferData,
  type ApproveData,
  type SetAuthorityData,
  type MintToData,
  type BurnData,
  type TransferCheckedData,
  type ApproveCheckedData,
  type MintToCheckedData,
  type BurnCheckedData,
  type InitializeAccount2Data,
  type InitializeAccount3Data,
  type InitializeMultisig2Data,
  type InitializeMint2Data,
  type TokenInstructionData,
} from '../../src/codecs/instructions';
import { TokenInstruction, AuthorityType } from '../../src/instructions';

describe('Instruction Codecs', () => {
  describe('initializeMintCodec', () => {
    it('should encode and decode initialize mint instruction', () => {
      const mintAuthority = new Uint8Array(32).fill(1);
      const freezeAuthority = new Uint8Array(32).fill(2);

      const data: InitializeMintData = {
        decimals: 9,
        mintAuthority,
        freezeAuthority,
      };

      const encoded = initializeMintCodec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.InitializeMint);

      const [decoded] = initializeMintCodec.decode(encoded);
      expect(decoded.decimals).toBe(9);
      expect(decoded.mintAuthority).toEqual(mintAuthority);
      expect(decoded.freezeAuthority).toEqual(freezeAuthority);
    });

    it('should encode without freeze authority', () => {
      const data: InitializeMintData = {
        decimals: 6,
        mintAuthority: new Uint8Array(32).fill(3),
      };

      const encoded = initializeMintCodec.encode(data);
      const [decoded] = initializeMintCodec.decode(encoded);

      expect(decoded.freezeAuthority).toBeUndefined();
    });
  });

  describe('initializeAccountCodec', () => {
    it('should encode and decode initialize account instruction', () => {
      const encoded = initializeAccountCodec.encode();
      expect(encoded.length).toBe(1);
      expect(encoded[0]).toBe(TokenInstruction.InitializeAccount);

      const [decoded, bytesRead] = initializeAccountCodec.decode(encoded);
      expect(decoded).toBeUndefined();
      expect(bytesRead).toBe(1);
    });
  });

  describe('initializeMultisigCodec', () => {
    it('should encode and decode initialize multisig instruction', () => {
      const data: InitializeMultisigData = { m: 2 };

      const encoded = initializeMultisigCodec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.InitializeMultisig);
      expect(encoded[1]).toBe(2);

      const [decoded, bytesRead] = initializeMultisigCodec.decode(encoded);
      expect(decoded.m).toBe(2);
      expect(bytesRead).toBe(2);
    });
  });

  describe('transferCodec', () => {
    it('should encode and decode transfer instruction', () => {
      const data: TransferData = { amount: 1000000n };

      const encoded = transferCodec.encode(data);
      expect(encoded.length).toBe(9);
      expect(encoded[0]).toBe(TokenInstruction.Transfer);

      const [decoded, bytesRead] = transferCodec.decode(encoded);
      expect(decoded.amount).toBe(1000000n);
      expect(bytesRead).toBe(9);
    });

    it('should handle max amount', () => {
      const data: TransferData = { amount: 18446744073709551615n }; // Max u64

      const encoded = transferCodec.encode(data);
      const [decoded] = transferCodec.decode(encoded);

      expect(decoded.amount).toBe(18446744073709551615n);
    });
  });

  describe('approveCodec', () => {
    it('should encode and decode approve instruction', () => {
      const data: ApproveData = { amount: 500000n };

      const encoded = approveCodec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.Approve);

      const [decoded] = approveCodec.decode(encoded);
      expect(decoded.amount).toBe(500000n);
    });
  });

  describe('revokeCodec', () => {
    it('should encode and decode revoke instruction', () => {
      const encoded = revokeCodec.encode();
      expect(encoded.length).toBe(1);
      expect(encoded[0]).toBe(TokenInstruction.Revoke);

      const [decoded, bytesRead] = revokeCodec.decode(encoded);
      expect(decoded).toBeUndefined();
      expect(bytesRead).toBe(1);
    });
  });

  describe('setAuthorityCodec', () => {
    it('should encode and decode set authority instruction', () => {
      const newAuthority = new Uint8Array(32).fill(5);
      const data: SetAuthorityData = {
        authorityType: AuthorityType.MintTokens,
        newAuthority,
      };

      const encoded = setAuthorityCodec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.SetAuthority);

      const [decoded] = setAuthorityCodec.decode(encoded);
      expect(decoded.authorityType).toBe(AuthorityType.MintTokens);
      expect(decoded.newAuthority).toEqual(newAuthority);
    });

    it('should encode remove authority (no new authority)', () => {
      const data: SetAuthorityData = {
        authorityType: AuthorityType.FreezeAccount,
      };

      const encoded = setAuthorityCodec.encode(data);
      const [decoded] = setAuthorityCodec.decode(encoded);

      expect(decoded.newAuthority).toBeUndefined();
    });

    it('should handle all authority types', () => {
      const authorityTypes = [
        AuthorityType.MintTokens,
        AuthorityType.FreezeAccount,
        AuthorityType.AccountOwner,
        AuthorityType.CloseAccount,
        AuthorityType.TransferTokens,
        AuthorityType.CloseMint,
        AuthorityType.TransferFeeConfig,
        AuthorityType.WithheldWithdraw,
        AuthorityType.InterestRate,
        AuthorityType.PermanentDelegate,
        AuthorityType.MetadataPointer,
      ];

      for (const authorityType of authorityTypes) {
        const data: SetAuthorityData = {
          authorityType,
          newAuthority: new Uint8Array(32).fill(authorityType),
        };

        const encoded = setAuthorityCodec.encode(data);
        const [decoded] = setAuthorityCodec.decode(encoded);

        expect(decoded.authorityType).toBe(authorityType);
      }
    });
  });

  describe('mintToCodec', () => {
    it('should encode and decode mint to instruction', () => {
      const data: MintToData = { amount: 10000000n };

      const encoded = mintToCodec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.MintTo);

      const [decoded] = mintToCodec.decode(encoded);
      expect(decoded.amount).toBe(10000000n);
    });
  });

  describe('burnCodec', () => {
    it('should encode and decode burn instruction', () => {
      const data: BurnData = { amount: 100000n };

      const encoded = burnCodec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.Burn);

      const [decoded] = burnCodec.decode(encoded);
      expect(decoded.amount).toBe(100000n);
    });
  });

  describe('closeAccountCodec', () => {
    it('should encode and decode close account instruction', () => {
      const encoded = closeAccountCodec.encode();
      expect(encoded[0]).toBe(TokenInstruction.CloseAccount);

      const [decoded, bytesRead] = closeAccountCodec.decode(encoded);
      expect(decoded).toBeUndefined();
      expect(bytesRead).toBe(1);
    });
  });

  describe('freezeAccountCodec', () => {
    it('should encode and decode freeze account instruction', () => {
      const encoded = freezeAccountCodec.encode();
      expect(encoded[0]).toBe(TokenInstruction.FreezeAccount);

      const [decoded] = freezeAccountCodec.decode(encoded);
      expect(decoded).toBeUndefined();
    });
  });

  describe('thawAccountCodec', () => {
    it('should encode and decode thaw account instruction', () => {
      const encoded = thawAccountCodec.encode();
      expect(encoded[0]).toBe(TokenInstruction.ThawAccount);

      const [decoded] = thawAccountCodec.decode(encoded);
      expect(decoded).toBeUndefined();
    });
  });

  describe('transferCheckedCodec', () => {
    it('should encode and decode transfer checked instruction', () => {
      const data: TransferCheckedData = {
        amount: 1500000n,
        decimals: 6,
      };

      const encoded = transferCheckedCodec.encode(data);
      expect(encoded.length).toBe(10);
      expect(encoded[0]).toBe(TokenInstruction.TransferChecked);

      const [decoded, bytesRead] = transferCheckedCodec.decode(encoded);
      expect(decoded.amount).toBe(1500000n);
      expect(decoded.decimals).toBe(6);
      expect(bytesRead).toBe(10);
    });
  });

  describe('approveCheckedCodec', () => {
    it('should encode and decode approve checked instruction', () => {
      const data: ApproveCheckedData = {
        amount: 2000000n,
        decimals: 9,
      };

      const encoded = approveCheckedCodec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.ApproveChecked);

      const [decoded] = approveCheckedCodec.decode(encoded);
      expect(decoded.amount).toBe(2000000n);
      expect(decoded.decimals).toBe(9);
    });
  });

  describe('mintToCheckedCodec', () => {
    it('should encode and decode mint to checked instruction', () => {
      const data: MintToCheckedData = {
        amount: 5000000n,
        decimals: 8,
      };

      const encoded = mintToCheckedCodec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.MintToChecked);

      const [decoded] = mintToCheckedCodec.decode(encoded);
      expect(decoded.amount).toBe(5000000n);
      expect(decoded.decimals).toBe(8);
    });
  });

  describe('burnCheckedCodec', () => {
    it('should encode and decode burn checked instruction', () => {
      const data: BurnCheckedData = {
        amount: 300000n,
        decimals: 7,
      };

      const encoded = burnCheckedCodec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.BurnChecked);

      const [decoded] = burnCheckedCodec.decode(encoded);
      expect(decoded.amount).toBe(300000n);
      expect(decoded.decimals).toBe(7);
    });
  });

  describe('initializeAccount2Codec', () => {
    it('should encode and decode initialize account 2 instruction', () => {
      const owner = new Uint8Array(32).fill(10);
      const data: InitializeAccount2Data = { owner };

      const encoded = initializeAccount2Codec.encode(data);
      expect(encoded.length).toBe(33);
      expect(encoded[0]).toBe(TokenInstruction.InitializeAccount2);

      const [decoded, bytesRead] = initializeAccount2Codec.decode(encoded);
      expect(decoded.owner).toEqual(owner);
      expect(bytesRead).toBe(33);
    });
  });

  describe('syncNativeCodec', () => {
    it('should encode and decode sync native instruction', () => {
      const encoded = syncNativeCodec.encode();
      expect(encoded[0]).toBe(TokenInstruction.SyncNative);

      const [decoded] = syncNativeCodec.decode(encoded);
      expect(decoded).toBeUndefined();
    });
  });

  describe('initializeAccount3Codec', () => {
    it('should encode and decode initialize account 3 instruction', () => {
      const owner = new Uint8Array(32).fill(11);
      const data: InitializeAccount3Data = { owner };

      const encoded = initializeAccount3Codec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.InitializeAccount3);

      const [decoded] = initializeAccount3Codec.decode(encoded);
      expect(decoded.owner).toEqual(owner);
    });
  });

  describe('initializeMultisig2Codec', () => {
    it('should encode and decode initialize multisig 2 instruction', () => {
      const data: InitializeMultisig2Data = { m: 3 };

      const encoded = initializeMultisig2Codec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.InitializeMultisig2);
      expect(encoded[1]).toBe(3);

      const [decoded] = initializeMultisig2Codec.decode(encoded);
      expect(decoded.m).toBe(3);
    });
  });

  describe('initializeMint2Codec', () => {
    it('should encode and decode initialize mint 2 instruction', () => {
      const mintAuthority = new Uint8Array(32).fill(12);
      const freezeAuthority = new Uint8Array(32).fill(13);

      const data: InitializeMint2Data = {
        decimals: 5,
        mintAuthority,
        freezeAuthority,
      };

      const encoded = initializeMint2Codec.encode(data);
      expect(encoded[0]).toBe(TokenInstruction.InitializeMint2);

      const [decoded] = initializeMint2Codec.decode(encoded);
      expect(decoded.decimals).toBe(5);
      expect(decoded.mintAuthority).toEqual(mintAuthority);
      expect(decoded.freezeAuthority).toEqual(freezeAuthority);
    });
  });

  describe('decodeTokenInstruction', () => {
    it('should decode all instruction types', () => {
      const testCases: Array<[TokenInstructionData, Uint8Array]> = [
        [
          {
            type: 'InitializeMint',
            data: { decimals: 9, mintAuthority: new Uint8Array(32).fill(1) },
          },
          initializeMintCodec.encode({ decimals: 9, mintAuthority: new Uint8Array(32).fill(1) }),
        ],
        [{ type: 'InitializeAccount', data: undefined }, initializeAccountCodec.encode()],
        [{ type: 'Transfer', data: { amount: 1000n } }, transferCodec.encode({ amount: 1000n })],
        [{ type: 'Approve', data: { amount: 500n } }, approveCodec.encode({ amount: 500n })],
        [{ type: 'Revoke', data: undefined }, revokeCodec.encode()],
        [{ type: 'MintTo', data: { amount: 10000n } }, mintToCodec.encode({ amount: 10000n })],
        [{ type: 'Burn', data: { amount: 100n } }, burnCodec.encode({ amount: 100n })],
        [{ type: 'CloseAccount', data: undefined }, closeAccountCodec.encode()],
        [{ type: 'FreezeAccount', data: undefined }, freezeAccountCodec.encode()],
        [{ type: 'ThawAccount', data: undefined }, thawAccountCodec.encode()],
        [
          { type: 'TransferChecked', data: { amount: 1500n, decimals: 6 } },
          transferCheckedCodec.encode({ amount: 1500n, decimals: 6 }),
        ],
        [{ type: 'SyncNative', data: undefined }, syncNativeCodec.encode()],
      ];

      for (const [expected, encoded] of testCases) {
        const decoded = decodeTokenInstruction(encoded);
        expect(decoded.type).toBe(expected.type);

        if (expected.data && decoded.data) {
          if ('amount' in expected.data && 'amount' in decoded.data) {
            expect(decoded.data.amount).toBe(expected.data.amount);
          }
          if ('decimals' in expected.data && 'decimals' in decoded.data) {
            expect(decoded.data.decimals).toBe(expected.data.decimals);
          }
        }
      }
    });

    it('should throw error for unknown instruction', () => {
      const unknownInstruction = new Uint8Array([255]); // Invalid instruction type

      expect(() => decodeTokenInstruction(unknownInstruction)).toThrow(
        'Unknown token instruction type',
      );
    });

    it('should decode with offset', () => {
      const padding = new Uint8Array(5).fill(0xff);
      const instruction = transferCodec.encode({ amount: 999n });
      const buffer = new Uint8Array(padding.length + instruction.length);
      buffer.set(padding);
      buffer.set(instruction, padding.length);

      const decoded = decodeTokenInstruction(buffer, padding.length);
      expect(decoded.type).toBe('Transfer');
      expect((decoded.data as TransferData).amount).toBe(999n);
    });
  });

  describe('encodeTokenInstruction', () => {
    it('should encode all instruction types', () => {
      const testCases: TokenInstructionData[] = [
        { type: 'InitializeMint', data: { decimals: 9, mintAuthority: new Uint8Array(32) } },
        { type: 'InitializeAccount', data: undefined },
        { type: 'InitializeMultisig', data: { m: 2 } },
        { type: 'Transfer', data: { amount: 1000n } },
        { type: 'Approve', data: { amount: 500n } },
        { type: 'Revoke', data: undefined },
        { type: 'SetAuthority', data: { authorityType: AuthorityType.MintTokens } },
        { type: 'MintTo', data: { amount: 10000n } },
        { type: 'Burn', data: { amount: 100n } },
        { type: 'CloseAccount', data: undefined },
        { type: 'FreezeAccount', data: undefined },
        { type: 'ThawAccount', data: undefined },
        { type: 'TransferChecked', data: { amount: 1500n, decimals: 6 } },
        { type: 'ApproveChecked', data: { amount: 2000n, decimals: 9 } },
        { type: 'MintToChecked', data: { amount: 5000n, decimals: 8 } },
        { type: 'BurnChecked', data: { amount: 300n, decimals: 7 } },
        { type: 'InitializeAccount2', data: { owner: new Uint8Array(32) } },
        { type: 'SyncNative', data: undefined },
        { type: 'InitializeAccount3', data: { owner: new Uint8Array(32) } },
        { type: 'InitializeMultisig2', data: { m: 3 } },
        { type: 'InitializeMint2', data: { decimals: 5, mintAuthority: new Uint8Array(32) } },
      ];

      for (const instruction of testCases) {
        const encoded = encodeTokenInstruction(instruction);
        expect(encoded).toBeDefined();
        expect(encoded.length).toBeGreaterThan(0);

        // Verify round-trip
        const decoded = decodeTokenInstruction(encoded);
        expect(decoded.type).toBe(instruction.type);
      }
    });

    it('should throw error for unknown instruction type', () => {
      const badInstruction = { type: 'UnknownInstruction', data: {} } as any;

      expect(() => encodeTokenInstruction(badInstruction)).toThrow(
        'Unknown token instruction type',
      );
    });
  });

  describe('round-trip encoding and decoding', () => {
    it('should round-trip all instruction types', () => {
      const instructions: TokenInstructionData[] = [
        {
          type: 'InitializeMint',
          data: {
            decimals: 9,
            mintAuthority: new Uint8Array(32).fill(1),
            freezeAuthority: new Uint8Array(32).fill(2),
          },
        },
        {
          type: 'Transfer',
          data: { amount: 123456789n },
        },
        {
          type: 'SetAuthority',
          data: {
            authorityType: AuthorityType.CloseAccount,
            newAuthority: new Uint8Array(32).fill(3),
          },
        },
        {
          type: 'TransferChecked',
          data: {
            amount: 987654321n,
            decimals: 6,
          },
        },
      ];

      for (const original of instructions) {
        const encoded = encodeTokenInstruction(original);
        const decoded = decodeTokenInstruction(encoded);

        expect(decoded.type).toBe(original.type);

        // Deep equality check for data
        if (original.data && decoded.data) {
          expect(decoded.data).toEqual(original.data);
        }
      }
    });
  });
});
