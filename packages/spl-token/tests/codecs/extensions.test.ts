import { describe, it, expect } from 'vitest';
import {
  transferFeeConfigCodec,
  interestBearingConfigCodec,
  defaultAccountStateCodec,
  mintCloseAuthorityCodec,
  permanentDelegateCodec,
  transferHookCodec,
  metadataPointerCodec,
  nonTransferableCodec,
  cpiGuardCodec,
  immutableOwnerCodec,
  memoTransferCodec,
  getExtensionCodec,
  createExtensionTlvCodec,
  getExtensionSize,
  isExtensionSupported,
  extensionSupport,
} from '../../src/codecs/extensions';
import { ExtensionType, AccountState } from '../../src/types';
import type {
  TransferFeeConfig,
  InterestBearingConfig,
  DefaultAccountState,
  MintCloseAuthority,
  PermanentDelegate,
  TransferHook,
  MetadataPointer,
  NonTransferable,
  CpiGuard,
  ImmutableOwner,
  MemoTransfer,
} from '../../src/types';

describe('Extension Codecs', () => {
  describe('transferFeeConfigCodec', () => {
    it('should encode and decode transfer fee config', () => {
      const config: TransferFeeConfig = {
        type: ExtensionType.TransferFeeConfig,
        transferFeeConfigAuthority: new Uint8Array(32).fill(1),
        withdrawWithheldAuthority: new Uint8Array(32).fill(2),
        withheldAmount: 1000000n,
        olderTransferFee: {
          epoch: 100n,
          maximumFee: 10000n,
          transferFeeBasisPoints: 50, // 0.5%
        },
        newerTransferFee: {
          epoch: 200n,
          maximumFee: 20000n,
          transferFeeBasisPoints: 100, // 1%
        },
      };

      const encoded = transferFeeConfigCodec.encode(config);
      const [decoded] = transferFeeConfigCodec.decode(encoded);

      expect(decoded.type).toBe(ExtensionType.TransferFeeConfig);
      expect(decoded.transferFeeConfigAuthority).toEqual(config.transferFeeConfigAuthority);
      expect(decoded.withdrawWithheldAuthority).toEqual(config.withdrawWithheldAuthority);
      expect(decoded.withheldAmount).toBe(config.withheldAmount);
      expect(decoded.olderTransferFee).toEqual(config.olderTransferFee);
      expect(decoded.newerTransferFee).toEqual(config.newerTransferFee);
    });

    it('should handle optional authorities', () => {
      const config: TransferFeeConfig = {
        type: ExtensionType.TransferFeeConfig,
        transferFeeConfigAuthority: undefined,
        withdrawWithheldAuthority: undefined,
        withheldAmount: 0n,
        olderTransferFee: {
          epoch: 0n,
          maximumFee: 0n,
          transferFeeBasisPoints: 0,
        },
        newerTransferFee: {
          epoch: 0n,
          maximumFee: 0n,
          transferFeeBasisPoints: 0,
        },
      };

      const encoded = transferFeeConfigCodec.encode(config);
      const [decoded] = transferFeeConfigCodec.decode(encoded);

      expect(decoded.transferFeeConfigAuthority).toBeUndefined();
      expect(decoded.withdrawWithheldAuthority).toBeUndefined();
    });
  });

  describe('interestBearingConfigCodec', () => {
    it('should encode and decode interest bearing config', () => {
      const config: InterestBearingConfig = {
        type: ExtensionType.InterestBearingConfig,
        rateAuthority: new Uint8Array(32).fill(3),
        initializationTimestamp: 1700000000n,
        preUpdateAverageRate: 500, // 5%
        lastUpdateTimestamp: 1700100000n,
        currentRate: 600, // 6%
      };

      const encoded = interestBearingConfigCodec.encode(config);
      const [decoded] = interestBearingConfigCodec.decode(encoded);

      expect(decoded.type).toBe(ExtensionType.InterestBearingConfig);
      expect(decoded.rateAuthority).toEqual(config.rateAuthority);
      expect(decoded.initializationTimestamp).toBe(config.initializationTimestamp);
      expect(decoded.preUpdateAverageRate).toBe(config.preUpdateAverageRate);
      expect(decoded.lastUpdateTimestamp).toBe(config.lastUpdateTimestamp);
      expect(decoded.currentRate).toBe(config.currentRate);
    });

    it('should handle no rate authority', () => {
      const config: InterestBearingConfig = {
        type: ExtensionType.InterestBearingConfig,
        rateAuthority: undefined,
        initializationTimestamp: 0n,
        preUpdateAverageRate: 0,
        lastUpdateTimestamp: 0n,
        currentRate: 0,
      };

      const encoded = interestBearingConfigCodec.encode(config);
      const [decoded] = interestBearingConfigCodec.decode(encoded);

      expect(decoded.rateAuthority).toBeUndefined();
    });

    it('should handle negative timestamps', () => {
      const config: InterestBearingConfig = {
        type: ExtensionType.InterestBearingConfig,
        rateAuthority: undefined,
        initializationTimestamp: -1000n,
        preUpdateAverageRate: 100,
        lastUpdateTimestamp: -500n,
        currentRate: 200,
      };

      const encoded = interestBearingConfigCodec.encode(config);
      const [decoded] = interestBearingConfigCodec.decode(encoded);

      expect(decoded.initializationTimestamp).toBe(-1000n);
      expect(decoded.lastUpdateTimestamp).toBe(-500n);
    });
  });

  describe('defaultAccountStateCodec', () => {
    it('should encode and decode initialized state', () => {
      const config: DefaultAccountState = {
        type: ExtensionType.DefaultAccountState,
        state: AccountState.Initialized,
      };

      const encoded = defaultAccountStateCodec.encode(config);
      const [decoded] = defaultAccountStateCodec.decode(encoded);

      expect(decoded.type).toBe(ExtensionType.DefaultAccountState);
      expect(decoded.state).toBe(AccountState.Initialized);
    });

    it('should encode and decode frozen state', () => {
      const config: DefaultAccountState = {
        type: ExtensionType.DefaultAccountState,
        state: AccountState.Frozen,
      };

      const encoded = defaultAccountStateCodec.encode(config);
      const [decoded] = defaultAccountStateCodec.decode(encoded);

      expect(decoded.state).toBe(AccountState.Frozen);
    });

    it('should encode and decode uninitialized state', () => {
      const config: DefaultAccountState = {
        type: ExtensionType.DefaultAccountState,
        state: AccountState.Uninitialized,
      };

      const encoded = defaultAccountStateCodec.encode(config);
      const [decoded] = defaultAccountStateCodec.decode(encoded);

      expect(decoded.state).toBe(AccountState.Uninitialized);
    });
  });

  describe('mintCloseAuthorityCodec', () => {
    it('should encode and decode mint close authority', () => {
      const config: MintCloseAuthority = {
        type: ExtensionType.MintCloseAuthority,
        closeAuthority: new Uint8Array(32).fill(4),
      };

      const encoded = mintCloseAuthorityCodec.encode(config);
      const [decoded] = mintCloseAuthorityCodec.decode(encoded);

      expect(decoded.type).toBe(ExtensionType.MintCloseAuthority);
      expect(decoded.closeAuthority).toEqual(config.closeAuthority);
    });

    it('should handle no close authority', () => {
      const config: MintCloseAuthority = {
        type: ExtensionType.MintCloseAuthority,
        closeAuthority: undefined,
      };

      const encoded = mintCloseAuthorityCodec.encode(config);
      const [decoded] = mintCloseAuthorityCodec.decode(encoded);

      expect(decoded.closeAuthority).toBeUndefined();
    });
  });

  describe('permanentDelegateCodec', () => {
    it('should encode and decode permanent delegate', () => {
      const config: PermanentDelegate = {
        type: ExtensionType.PermanentDelegate,
        delegate: new Uint8Array(32).fill(5),
      };

      const encoded = permanentDelegateCodec.encode(config);
      const [decoded] = permanentDelegateCodec.decode(encoded);

      expect(decoded.type).toBe(ExtensionType.PermanentDelegate);
      expect(decoded.delegate).toEqual(config.delegate);
    });
  });

  describe('transferHookCodec', () => {
    it('should encode and decode transfer hook', () => {
      const config: TransferHook = {
        type: ExtensionType.TransferHook,
        authority: new Uint8Array(32).fill(6),
        programId: new Uint8Array(32).fill(7),
      };

      const encoded = transferHookCodec.encode(config);
      const [decoded] = transferHookCodec.decode(encoded);

      expect(decoded.type).toBe(ExtensionType.TransferHook);
      expect(decoded.authority).toEqual(config.authority);
      expect(decoded.programId).toEqual(config.programId);
    });

    it('should handle optional fields', () => {
      const config: TransferHook = {
        type: ExtensionType.TransferHook,
        authority: undefined,
        programId: undefined,
      };

      const encoded = transferHookCodec.encode(config);
      const [decoded] = transferHookCodec.decode(encoded);

      expect(decoded.authority).toBeUndefined();
      expect(decoded.programId).toBeUndefined();
    });
  });

  describe('metadataPointerCodec', () => {
    it('should encode and decode metadata pointer', () => {
      const config: MetadataPointer = {
        type: ExtensionType.MetadataPointer,
        authority: new Uint8Array(32).fill(8),
        metadataAddress: new Uint8Array(32).fill(9),
      };

      const encoded = metadataPointerCodec.encode(config);
      const [decoded] = metadataPointerCodec.decode(encoded);

      expect(decoded.type).toBe(ExtensionType.MetadataPointer);
      expect(decoded.authority).toEqual(config.authority);
      expect(decoded.metadataAddress).toEqual(config.metadataAddress);
    });

    it('should handle optional fields', () => {
      const config: MetadataPointer = {
        type: ExtensionType.MetadataPointer,
        authority: undefined,
        metadataAddress: undefined,
      };

      const encoded = metadataPointerCodec.encode(config);
      const [decoded] = metadataPointerCodec.decode(encoded);

      expect(decoded.authority).toBeUndefined();
      expect(decoded.metadataAddress).toBeUndefined();
    });
  });

  describe('nonTransferableCodec', () => {
    it('should encode and decode non-transferable extension', () => {
      const config: NonTransferable = {
        type: ExtensionType.NonTransferable,
      };

      const encoded = nonTransferableCodec.encode(config);
      // NonTransferable is an empty extension, so it encodes to 0 bytes
      expect(encoded.length).toBe(0);

      const [decoded] = nonTransferableCodec.decode(encoded);
      expect(decoded.type).toBe(ExtensionType.NonTransferable);
    });
  });

  describe('cpiGuardCodec', () => {
    it('should encode and decode CPI guard enabled', () => {
      const config: CpiGuard = {
        type: ExtensionType.CpiGuard,
        lockCpi: true,
      };

      const encoded = cpiGuardCodec.encode(config);
      const [decoded] = cpiGuardCodec.decode(encoded);

      expect(decoded.type).toBe(ExtensionType.CpiGuard);
      expect(decoded.lockCpi).toBe(true);
    });

    it('should encode and decode CPI guard disabled', () => {
      const config: CpiGuard = {
        type: ExtensionType.CpiGuard,
        lockCpi: false,
      };

      const encoded = cpiGuardCodec.encode(config);
      const [decoded] = cpiGuardCodec.decode(encoded);

      expect(decoded.lockCpi).toBe(false);
    });
  });

  describe('immutableOwnerCodec', () => {
    it('should encode and decode immutable owner extension', () => {
      const config: ImmutableOwner = {
        type: ExtensionType.ImmutableOwner,
      };

      const encoded = immutableOwnerCodec.encode(config);
      const [decoded] = immutableOwnerCodec.decode(encoded);

      expect(decoded.type).toBe(ExtensionType.ImmutableOwner);
    });
  });

  describe('memoTransferCodec', () => {
    it('should encode and decode memo transfer required', () => {
      const config: MemoTransfer = {
        type: ExtensionType.MemoTransfer,
        requireIncomingTransferMemos: true,
      };

      const encoded = memoTransferCodec.encode(config);
      const [decoded] = memoTransferCodec.decode(encoded);

      expect(decoded.type).toBe(ExtensionType.MemoTransfer);
      expect(decoded.requireIncomingTransferMemos).toBe(true);
    });

    it('should encode and decode memo transfer not required', () => {
      const config: MemoTransfer = {
        type: ExtensionType.MemoTransfer,
        requireIncomingTransferMemos: false,
      };

      const encoded = memoTransferCodec.encode(config);
      const [decoded] = memoTransferCodec.decode(encoded);

      expect(decoded.requireIncomingTransferMemos).toBe(false);
    });
  });

  describe('getExtensionCodec', () => {
    it('should get codec for all extension types', () => {
      const extensionTypes = [
        ExtensionType.TransferFeeConfig,
        ExtensionType.InterestBearingConfig,
        ExtensionType.DefaultAccountState,
        ExtensionType.MintCloseAuthority,
        ExtensionType.PermanentDelegate,
        ExtensionType.TransferHook,
        ExtensionType.MetadataPointer,
        ExtensionType.NonTransferable,
        ExtensionType.CpiGuard,
        ExtensionType.ImmutableOwner,
        ExtensionType.MemoTransfer,
      ];

      for (const type of extensionTypes) {
        const codec = getExtensionCodec(type);
        expect(codec).toBeDefined();
      }
    });

    it('should return undefined for unknown extension type', () => {
      const codec = getExtensionCodec(9999 as ExtensionType);
      expect(codec).toBeUndefined();
    });
  });

  describe('createExtensionTlvCodec', () => {
    it('should create TLV codec for extension', () => {
      const tlvCodec = createExtensionTlvCodec(ExtensionType.CpiGuard, cpiGuardCodec);

      const config: CpiGuard = {
        type: ExtensionType.CpiGuard,
        lockCpi: true,
      };

      const encoded = tlvCodec.encode(config);

      // Check TLV header
      expect(encoded[0]).toBe(ExtensionType.CpiGuard & 0xff);
      expect(encoded[1]).toBe((ExtensionType.CpiGuard >> 8) & 0xff);

      const [decoded, bytesRead] = tlvCodec.decode(encoded);
      expect(decoded.lockCpi).toBe(true);
      expect(bytesRead).toBeGreaterThan(4); // Header + data
    });
  });

  describe('getExtensionSize', () => {
    it('should calculate size for fixed-size extension', () => {
      const size = getExtensionSize(ExtensionType.CpiGuard, {
        type: ExtensionType.CpiGuard,
        lockCpi: true,
      });

      expect(size).toBeGreaterThan(4); // At least TLV header
    });

    it('should calculate size for variable-size extension', () => {
      const config: TransferFeeConfig = {
        type: ExtensionType.TransferFeeConfig,
        transferFeeConfigAuthority: new Uint8Array(32),
        withdrawWithheldAuthority: new Uint8Array(32),
        withheldAmount: 0n,
        olderTransferFee: {
          epoch: 0n,
          maximumFee: 0n,
          transferFeeBasisPoints: 0,
        },
        newerTransferFee: {
          epoch: 0n,
          maximumFee: 0n,
          transferFeeBasisPoints: 0,
        },
      };

      const size = getExtensionSize(ExtensionType.TransferFeeConfig, config);
      expect(size).toBeGreaterThan(4);
    });

    it('should return 0 for unknown extension', () => {
      const size = getExtensionSize(9999 as ExtensionType);
      expect(size).toBe(0);
    });
  });

  describe('isExtensionSupported', () => {
    it('should check mint extension support', () => {
      // Mint-only extensions
      expect(isExtensionSupported(ExtensionType.TransferFeeConfig, 'mint')).toBe(true);
      expect(isExtensionSupported(ExtensionType.TransferFeeConfig, 'token')).toBe(false);

      expect(isExtensionSupported(ExtensionType.InterestBearingConfig, 'mint')).toBe(true);
      expect(isExtensionSupported(ExtensionType.InterestBearingConfig, 'token')).toBe(false);

      expect(isExtensionSupported(ExtensionType.DefaultAccountState, 'mint')).toBe(true);
      expect(isExtensionSupported(ExtensionType.DefaultAccountState, 'token')).toBe(false);

      expect(isExtensionSupported(ExtensionType.MintCloseAuthority, 'mint')).toBe(true);
      expect(isExtensionSupported(ExtensionType.MintCloseAuthority, 'token')).toBe(false);

      expect(isExtensionSupported(ExtensionType.PermanentDelegate, 'mint')).toBe(true);
      expect(isExtensionSupported(ExtensionType.PermanentDelegate, 'token')).toBe(false);

      expect(isExtensionSupported(ExtensionType.TransferHook, 'mint')).toBe(true);
      expect(isExtensionSupported(ExtensionType.TransferHook, 'token')).toBe(false);

      expect(isExtensionSupported(ExtensionType.MetadataPointer, 'mint')).toBe(true);
      expect(isExtensionSupported(ExtensionType.MetadataPointer, 'token')).toBe(false);

      expect(isExtensionSupported(ExtensionType.NonTransferable, 'mint')).toBe(true);
      expect(isExtensionSupported(ExtensionType.NonTransferable, 'token')).toBe(false);
    });

    it('should check token account extension support', () => {
      // Token account-only extensions
      expect(isExtensionSupported(ExtensionType.CpiGuard, 'token')).toBe(true);
      expect(isExtensionSupported(ExtensionType.CpiGuard, 'mint')).toBe(false);

      expect(isExtensionSupported(ExtensionType.ImmutableOwner, 'token')).toBe(true);
      expect(isExtensionSupported(ExtensionType.ImmutableOwner, 'mint')).toBe(false);

      expect(isExtensionSupported(ExtensionType.MemoTransfer, 'token')).toBe(true);
      expect(isExtensionSupported(ExtensionType.MemoTransfer, 'mint')).toBe(false);
    });

    it('should return false for unknown extension', () => {
      expect(isExtensionSupported(9999 as ExtensionType, 'mint')).toBe(false);
      expect(isExtensionSupported(9999 as ExtensionType, 'token')).toBe(false);
    });
  });

  describe('extensionSupport matrix', () => {
    it('should have correct support matrix', () => {
      // Verify the support matrix is complete
      const mintExtensions = [
        ExtensionType.TransferFeeConfig,
        ExtensionType.InterestBearingConfig,
        ExtensionType.DefaultAccountState,
        ExtensionType.MintCloseAuthority,
        ExtensionType.PermanentDelegate,
        ExtensionType.TransferHook,
        ExtensionType.MetadataPointer,
        ExtensionType.NonTransferable,
      ];

      const tokenExtensions = [
        ExtensionType.CpiGuard,
        ExtensionType.ImmutableOwner,
        ExtensionType.MemoTransfer,
      ];

      for (const ext of mintExtensions) {
        expect(extensionSupport[ext]).toBeDefined();
        expect(extensionSupport[ext].mint).toBe(true);
        expect(extensionSupport[ext].token).toBe(false);
      }

      for (const ext of tokenExtensions) {
        expect(extensionSupport[ext]).toBeDefined();
        expect(extensionSupport[ext].mint).toBe(false);
        expect(extensionSupport[ext].token).toBe(true);
      }
    });
  });
});
