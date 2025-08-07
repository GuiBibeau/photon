/**
 * Tests for subscription methods.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { address } from '@photon/addresses';
import {
  accountSubscribe,
  signatureSubscribe,
  programSubscribe,
  slotSubscribe,
  rootSubscribe,
  logsSubscribe,
  bufferSubscription,
} from '../src/subscription-methods.js';
import { WebSocketSubscriptionClient } from '../src/client.js';
import { MockWebSocket } from './mocks/websocket.js';
import type {
  AccountChangeNotification,
  SignatureNotification,
  ProgramAccountChangeNotification,
  SlotNotification,
  LogNotification,
} from '../src/types.js';

describe('Subscription Methods', () => {
  let client: WebSocketSubscriptionClient;
  let ws: MockWebSocket;

  beforeEach(async () => {
    MockWebSocket.reset();

    client = new WebSocketSubscriptionClient({
      url: 'ws://localhost:8900',
      WebSocketImpl: MockWebSocket as any,
    });

    // Connect and get WebSocket instance
    await client.connect();
    ws = MockWebSocket.lastInstance as MockWebSocket;
  });

  afterEach(async () => {
    await client.disconnect();
    MockWebSocket.reset();
  });

  describe('accountSubscribe', () => {
    it('should subscribe to account changes', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const updates: AccountChangeNotification[] = [];

      const iterator = accountSubscribe(client, testAddress, {
        commitment: 'confirmed',
        encoding: 'base64',
      });

      // Start consuming
      const consumePromise = (async () => {
        for await (const update of iterator) {
          updates.push(update);
          if (updates.length >= 2) {
            break;
          }
        }
      })();

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Simulate account updates
      const notification1: AccountChangeNotification = {
        lamports: 1000000000n,
        data: 'SGVsbG8gV29ybGQ=',
        owner: address('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 123n,
      };

      const notification2: AccountChangeNotification = {
        lamports: 2000000000n,
        data: 'VGVzdCBEYXRh',
        owner: address('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 124n,
      };

      ws.simulateNotification(1, notification1);
      await new Promise((resolve) => setTimeout(resolve, 20));

      ws.simulateNotification(1, notification2);
      await new Promise((resolve) => setTimeout(resolve, 20));

      await consumePromise;

      expect(updates).toHaveLength(2);
      expect(updates[0]).toEqual(notification1);
      expect(updates[1]).toEqual(notification2);
    });

    it('should handle account subscription with no options', async () => {
      const testAddress = address('11111111111111111111111111111111');

      const iterator = accountSubscribe(client, testAddress);

      // Check that subscription was created
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(ws.sentMessages.length).toBeGreaterThan(0);

      const lastMessage = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1]);
      expect(lastMessage.method).toBe('accountSubscribe');
      expect(lastMessage.params[0]).toBe(testAddress);
      expect(lastMessage.params[1]).toEqual({});

      // Clean up
      await iterator.return();
    });
  });

  describe('signatureSubscribe', () => {
    it('should subscribe to signature confirmations', async () => {
      const signature = 'test-signature-123';
      const notifications: SignatureNotification[] = [];

      const iterator = signatureSubscribe(client, signature, {
        commitment: 'confirmed',
      });

      // Start consuming
      const consumePromise = (async () => {
        for await (const notification of iterator) {
          notifications.push(notification);
          if (notification.err === null) {
            break;
          }
        }
      })();

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Simulate notifications
      const pendingNotification: SignatureNotification = {
        err: { InsufficientFunds: {} },
      };

      const confirmedNotification: SignatureNotification = {
        err: null,
      };

      ws.simulateNotification(1, pendingNotification);
      await new Promise((resolve) => setTimeout(resolve, 20));

      ws.simulateNotification(1, confirmedNotification);
      await new Promise((resolve) => setTimeout(resolve, 20));

      await consumePromise;

      expect(notifications).toHaveLength(2);
      expect(notifications[0].err).toBeDefined();
      expect(notifications[1].err).toBeNull();
    });

    it('should auto-close on finalized confirmation', async () => {
      const signature = 'test-signature-456';
      const notifications: SignatureNotification[] = [];

      const iterator = signatureSubscribe(client, signature, {
        commitment: 'finalized',
      });

      // Start consuming
      const consumePromise = (async () => {
        for await (const notification of iterator) {
          notifications.push(notification);
        }
      })();

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Simulate finalized notification
      const finalizedNotification: SignatureNotification = {
        err: null,
      };

      ws.simulateNotification(1, finalizedNotification);
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Use queueMicrotask to allow the auto-close to happen
      await new Promise((resolve) => queueMicrotask(resolve));
      await new Promise((resolve) => setTimeout(resolve, 20));

      await consumePromise;

      expect(notifications).toHaveLength(1);
      expect(notifications[0].err).toBeNull();
    });
  });

  describe('programSubscribe', () => {
    it('should subscribe to program account changes', async () => {
      const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const updates: ProgramAccountChangeNotification[] = [];

      const iterator = programSubscribe(client, programId, {
        commitment: 'confirmed',
        filters: [
          {
            dataSize: 165,
          },
        ],
      });

      // Start consuming
      const consumePromise = (async () => {
        for await (const update of iterator) {
          updates.push(update);
          if (updates.length >= 2) {
            break;
          }
        }
      })();

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Simulate updates
      const update1: ProgramAccountChangeNotification = {
        pubkey: '8VpRYGPWnbQVbj1m8JvyqQpXz9JzDqRtGmHqSGSm1Unv',
        account: {
          lamports: 2039280n,
          data: 'base64-encoded-data',
          owner: programId,
          executable: false,
          rentEpoch: 123n,
        },
      };

      const update2: ProgramAccountChangeNotification = {
        pubkey: 'AnotherAccountAddress123456789',
        account: {
          lamports: 3039280n,
          data: 'more-base64-data',
          owner: programId,
          executable: false,
          rentEpoch: 124n,
        },
      };

      ws.simulateNotification(1, update1);
      await new Promise((resolve) => setTimeout(resolve, 20));

      ws.simulateNotification(1, update2);
      await new Promise((resolve) => setTimeout(resolve, 20));

      await consumePromise;

      expect(updates).toHaveLength(2);
      expect(updates[0].pubkey).toBe(update1.pubkey);
      expect(updates[0].account.lamports).toBe(update1.account.lamports);
      expect(updates[1].pubkey).toBe(update2.pubkey);
    });

    it('should handle program subscription without filters', async () => {
      const programId = address('11111111111111111111111111111111');

      const iterator = programSubscribe(client, programId);

      // Check subscription message
      await new Promise((resolve) => setTimeout(resolve, 20));
      const lastMessage = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1]);
      expect(lastMessage.method).toBe('programSubscribe');
      expect(lastMessage.params[0]).toBe(programId);
      expect(lastMessage.params[1]).toEqual({});

      // Clean up
      await iterator.return();
    });
  });

  describe('slotSubscribe', () => {
    it('should subscribe to new slots', async () => {
      const slots: SlotNotification[] = [];

      const iterator = slotSubscribe(client);

      // Start consuming
      const consumePromise = (async () => {
        for await (const slot of iterator) {
          slots.push(slot);
          if (slots.length >= 3) {
            break;
          }
        }
      })();

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Simulate slot notifications
      const slot1: SlotNotification = {
        slot: 12345678n,
        parent: 12345677n,
        root: 12345600n,
      };

      const slot2: SlotNotification = {
        slot: 12345679n,
        parent: 12345678n,
        root: 12345601n,
      };

      const slot3: SlotNotification = {
        slot: 12345680n,
        parent: 12345679n,
        root: 12345602n,
      };

      ws.simulateNotification(1, slot1);
      await new Promise((resolve) => setTimeout(resolve, 20));

      ws.simulateNotification(1, slot2);
      await new Promise((resolve) => setTimeout(resolve, 20));

      ws.simulateNotification(1, slot3);
      await new Promise((resolve) => setTimeout(resolve, 20));

      await consumePromise;

      expect(slots).toHaveLength(3);
      expect(slots[0].slot).toBe(12345678n);
      expect(slots[1].slot).toBe(12345679n);
      expect(slots[2].slot).toBe(12345680n);
    });
  });

  describe('rootSubscribe', () => {
    it('should subscribe to root slots', async () => {
      const roots: number[] = [];

      const iterator = rootSubscribe(client);

      // Start consuming
      const consumePromise = (async () => {
        for await (const root of iterator) {
          roots.push(root);
          if (roots.length >= 3) {
            break;
          }
        }
      })();

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Simulate root notifications
      ws.simulateNotification(1, 12345600);
      await new Promise((resolve) => setTimeout(resolve, 20));

      ws.simulateNotification(1, 12345601);
      await new Promise((resolve) => setTimeout(resolve, 20));

      ws.simulateNotification(1, 12345602);
      await new Promise((resolve) => setTimeout(resolve, 20));

      await consumePromise;

      expect(roots).toEqual([12345600, 12345601, 12345602]);
    });
  });

  describe('logsSubscribe', () => {
    it('should subscribe to transaction logs with filter', async () => {
      const logs: LogNotification[] = [];
      const programId = address('11111111111111111111111111111111');

      const iterator = logsSubscribe(
        client,
        { mentions: [programId] },
        { commitment: 'confirmed' },
      );

      // Start consuming
      const consumePromise = (async () => {
        for await (const log of iterator) {
          logs.push(log);
          if (logs.length >= 2) {
            break;
          }
        }
      })();

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Check subscription params
      const lastMessage = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1]);
      expect(lastMessage.method).toBe('logsSubscribe');
      expect(lastMessage.params[0]).toEqual({ mentions: [programId] });
      expect(lastMessage.params[1]).toEqual({ commitment: 'confirmed' });

      // Simulate log notifications
      const log1: LogNotification = {
        signature: 'sig1',
        err: null,
        logs: ['Program log: Hello', 'Program log: World'],
      };

      const log2: LogNotification = {
        signature: 'sig2',
        err: { InstructionError: [0, 'Custom'] },
        logs: ['Program log: Error occurred'],
      };

      ws.simulateNotification(1, log1);
      await new Promise((resolve) => setTimeout(resolve, 20));

      ws.simulateNotification(1, log2);
      await new Promise((resolve) => setTimeout(resolve, 20));

      await consumePromise;

      expect(logs).toHaveLength(2);
      expect(logs[0].signature).toBe('sig1');
      expect(logs[0].err).toBeNull();
      expect(logs[1].signature).toBe('sig2');
      expect(logs[1].err).toBeDefined();
    });

    it('should handle different log filter types', async () => {
      // Test "all" filter
      const iterator1 = logsSubscribe(client, 'all');
      await new Promise((resolve) => setTimeout(resolve, 20));
      let message = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1]);
      expect(message.params[0]).toBe('all');
      await iterator1.return();

      // Test "allWithVotes" filter
      const iterator2 = logsSubscribe(client, 'allWithVotes');
      await new Promise((resolve) => setTimeout(resolve, 20));
      message = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1]);
      expect(message.params[0]).toBe('allWithVotes');
      await iterator2.return();
    });
  });

  describe('bufferSubscription', () => {
    it('should buffer subscription data', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const baseIterator = accountSubscribe(client, testAddress);

      const bufferedIterator = bufferSubscription(baseIterator, {
        bufferSize: 3,
        overflowStrategy: 'drop-oldest',
      });

      const updates: AccountChangeNotification[] = [];

      // Start consuming slowly
      const consumePromise = (async () => {
        for await (const update of bufferedIterator) {
          updates.push(update);
          // Simulate slow processing
          await new Promise((resolve) => setTimeout(resolve, 10));
          if (updates.length >= 3) {
            break;
          }
        }
      })();

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send multiple updates quickly
      for (let i = 0; i < 5; i++) {
        const notification: AccountChangeNotification = {
          lamports: BigInt(i * 1000000000),
          data: `data-${i}`,
          owner: address('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: BigInt(100 + i),
        };
        ws.simulateNotification(1, notification);
      }

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Complete consumption
      await consumePromise;

      expect(updates).toHaveLength(3);
    });

    it('should handle drop-newest overflow strategy', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const baseIterator = accountSubscribe(client, testAddress);

      const bufferedIterator = bufferSubscription(baseIterator, {
        bufferSize: 2,
        overflowStrategy: 'drop-newest',
      });

      const updates: AccountChangeNotification[] = [];

      // Don't consume immediately to build up buffer
      let startConsume = false;
      const consumePromise = (async () => {
        while (!startConsume) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        for await (const update of bufferedIterator) {
          updates.push(update);
          if (updates.length >= 2) {
            break;
          }
        }
      })();

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send updates that will overflow
      for (let i = 0; i < 4; i++) {
        const notification: AccountChangeNotification = {
          lamports: BigInt(i * 1000000000),
          data: `data-${i}`,
          owner: address('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: BigInt(100 + i),
        };
        ws.simulateNotification(1, notification);
      }

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Start consuming
      startConsume = true;
      await consumePromise;

      expect(updates).toHaveLength(2);
    });
  });
});
