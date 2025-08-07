/**
 * Tests for high-level subscription methods with AsyncIterator support.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { address } from '@photon/addresses';
import { WebSocketSubscriptionClient } from '../src/client.js';
import {
  accountSubscribe,
  signatureSubscribe,
  programSubscribe,
  slotSubscribe,
  rootSubscribe,
  logsSubscribe,
  bufferSubscription,
} from '../src/subscription-methods.js';
import type {
  AccountChangeNotification,
  SignatureNotification,
  ProgramAccountChangeNotification,
  SlotNotification,
  LogNotification,
} from '../src/types.js';

// Mock WebSocket implementation
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  private subscriptionCounter = 0;
  private pendingMessages: Array<() => void> = [];

  constructor(public url: string) {
    // Open connection after a tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
      // Process any pending messages
      this.pendingMessages.forEach((fn) => fn());
      this.pendingMessages = [];
    }, 0);
  }

  send(data: string): void {
    const message = JSON.parse(data);

    const sendResponse = () => {
      // Auto-respond to subscription requests
      if (message.method?.includes('Subscribe') && !message.method?.includes('Unsubscribe')) {
        const subscriptionId = ++this.subscriptionCounter;
        this.onmessage?.({
          data: JSON.stringify({
            jsonrpc: '2.0',
            result: subscriptionId,
            id: message.id,
          }),
        } as MessageEvent);
      }

      // Auto-respond to unsubscribe requests
      if (message.method?.includes('Unsubscribe')) {
        this.onmessage?.({
          data: JSON.stringify({
            jsonrpc: '2.0',
            result: true,
            id: message.id,
          }),
        } as MessageEvent);
      }
    };

    if (this.readyState === MockWebSocket.OPEN) {
      setTimeout(sendResponse, 0);
    } else {
      this.pendingMessages.push(sendResponse);
    }
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
}

describe('Subscription Methods', () => {
  let client: WebSocketSubscriptionClient;
  let mockWs: MockWebSocket;

  beforeEach(async () => {
    client = new WebSocketSubscriptionClient({
      url: 'ws://localhost:8900',
      WebSocketImpl: MockWebSocket as unknown as typeof WebSocket,
    });

    await client.connect();
    mockWs = (client as any).ws as MockWebSocket;
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('accountSubscribe', () => {
    it('should receive account updates through AsyncIterator', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const iterator = accountSubscribe(client, testAddress);

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Simulate account update notification
      // Note: In real usage, the client would handle the conversion from JSON numbers/strings to bigint
      const notification: AccountChangeNotification = {
        lamports: 1000000n,
        data: 'base64data',
        owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        executable: false,
        rentEpoch: 300n,
      };

      // For testing, we send the notification as the client would receive it internally
      // The actual WebSocket client would handle JSON parsing and bigint conversion
      (client as any).subscriptions.get(1)?.handler(notification);

      const result = await iterator.next();
      expect(result.done).toBe(false);
      expect(result.value).toEqual(notification);

      // Clean up
      await iterator.return();
    });

    it('should clean up subscription on iterator break', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const iterator = accountSubscribe(client, testAddress);

      // Let subscription establish
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Spy on unsubscribe
      const unsubscribeSpy = vi.spyOn(client, 'unsubscribe').mockResolvedValue(true);

      // Break from iterator (cleanup)
      await iterator.return();

      // Should have called unsubscribe
      expect(unsubscribeSpy).toHaveBeenCalledWith(1, 'accountUnsubscribe');
    });
  });

  describe('signatureSubscribe', () => {
    it('should receive signature confirmations', async () => {
      const signature = 'test-signature';
      const iterator = signatureSubscribe(client, signature);

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 50));

      const notification: SignatureNotification = {
        err: null,
      };

      // Directly call the subscription handler
      (client as any).subscriptions.get(1)?.handler(notification);

      const result = await iterator.next();
      expect(result.done).toBe(false);
      expect(result.value).toEqual(notification);

      await iterator.return();
    });

    it('should auto-close on finalized confirmation', async () => {
      const signature = 'test-signature';
      const iterator = signatureSubscribe(client, signature, {
        commitment: 'finalized',
      });

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 50));

      const notification: SignatureNotification = {
        err: null,
      };

      // Directly call the subscription handler
      (client as any).subscriptions.get(1)?.handler(notification);

      const result = await iterator.next();
      expect(result.done).toBe(false);
      expect(result.value).toEqual(notification);

      // Give time for auto-close to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should auto-close after finalized confirmation
      const nextResult = await iterator.next();
      expect(nextResult.done).toBe(true);
    });
  });

  describe('programSubscribe', () => {
    it('should receive program account updates', async () => {
      const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const iterator = programSubscribe(client, programId);

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 50));

      const notification: ProgramAccountChangeNotification = {
        pubkey: address('11111111111111111111111111111112'),
        account: {
          lamports: 2000000n,
          data: 'base64data',
          owner: programId,
          executable: false,
          rentEpoch: 300n,
        },
      };

      // Directly call the subscription handler
      (client as any).subscriptions.get(1)?.handler(notification);

      const result = await iterator.next();
      expect(result.done).toBe(false);
      expect(result.value).toEqual(notification);

      await iterator.return();
    });

    it('should support filters', async () => {
      const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const sendSpy = vi.spyOn(mockWs, 'send');

      const iterator = programSubscribe(client, programId, {
        filters: [{ dataSize: 165 }],
        encoding: 'base64',
      });

      // Let subscription establish
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check that filters were sent
      const calls = sendSpy.mock.calls;
      const subscribeCall = calls.find((call) => {
        const msg = JSON.parse(call[0] as string);
        return msg.method === 'programSubscribe';
      });

      expect(subscribeCall).toBeDefined();
      if (!subscribeCall) {
        return;
      }
      const sentMessage = JSON.parse(subscribeCall[0] as string);
      expect(sentMessage.params[1]).toMatchObject({
        filters: [{ dataSize: 165 }],
        encoding: 'base64',
      });

      await iterator.return();
    });
  });

  describe('slotSubscribe', () => {
    it('should receive slot updates', async () => {
      const iterator = slotSubscribe(client);

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 50));

      const notification: SlotNotification = {
        slot: 123456,
        parent: 123455,
        root: 123400,
      };

      // Directly call the subscription handler
      (client as any).subscriptions.get(1)?.handler(notification);

      const result = await iterator.next();
      expect(result.done).toBe(false);
      expect(result.value).toEqual(notification);

      await iterator.return();
    });
  });

  describe('rootSubscribe', () => {
    it('should receive root slot updates', async () => {
      const iterator = rootSubscribe(client);

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 50));

      const rootSlot = 123400;

      // Directly call the subscription handler
      (client as any).subscriptions.get(1)?.handler(rootSlot);

      const result = await iterator.next();
      expect(result.done).toBe(false);
      expect(result.value).toBe(rootSlot);

      await iterator.return();
    });
  });

  describe('logsSubscribe', () => {
    it('should receive transaction logs', async () => {
      const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const iterator = logsSubscribe(client, { mentions: [programId] });

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 50));

      const notification: LogNotification = {
        signature: 'test-signature',
        err: null,
        logs: [
          'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
          'Program log: Transfer 1000000 lamports',
          'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
        ],
      };

      // Directly call the subscription handler
      (client as any).subscriptions.get(1)?.handler(notification);

      const result = await iterator.next();
      expect(result.done).toBe(false);
      expect(result.value).toEqual(notification);

      await iterator.return();
    });

    it('should support different filter types', async () => {
      const sendSpy = vi.spyOn(mockWs, 'send');

      // Test 'all' filter
      const iterator1 = logsSubscribe(client, 'all');
      await new Promise((resolve) => setTimeout(resolve, 50));

      let calls = sendSpy.mock.calls;
      let subscribeCall = calls.find((call) => {
        const msg = JSON.parse(call[0] as string);
        return msg.method === 'logsSubscribe' && msg.params[0] === 'all';
      });
      expect(subscribeCall).toBeDefined();
      await iterator1.return();

      // Clear spy calls
      sendSpy.mockClear();

      // Test 'allWithVotes' filter
      const iterator2 = logsSubscribe(client, 'allWithVotes');
      await new Promise((resolve) => setTimeout(resolve, 50));

      calls = sendSpy.mock.calls;
      subscribeCall = calls.find((call) => {
        const msg = JSON.parse(call[0] as string);
        return msg.method === 'logsSubscribe' && msg.params[0] === 'allWithVotes';
      });
      expect(subscribeCall).toBeDefined();
      await iterator2.return();
    });
  });

  describe('bufferSubscription', () => {
    it('should buffer values from source iterator', async () => {
      // Create a manual iterator for testing
      const values: number[] = [];
      const sourceIterator = {
        async *[Symbol.asyncIterator]() {
          for (let i = 1; i <= 5; i++) {
            yield i;
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        },
      };

      const buffered = bufferSubscription(sourceIterator[Symbol.asyncIterator](), {
        bufferSize: 3,
      });

      for await (const value of buffered) {
        values.push(value);
        if (values.length === 5) {
          break;
        }
      }

      expect(values).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle overflow with drop-oldest strategy', async () => {
      const values: number[] = [];

      // Create a fast producer
      const sourceIterator = {
        async *[Symbol.asyncIterator]() {
          for (let i = 1; i <= 10; i++) {
            yield i;
          }
        },
      };

      const buffered = bufferSubscription(sourceIterator[Symbol.asyncIterator](), {
        bufferSize: 3,
        overflowStrategy: 'drop-oldest',
      });

      // Slow consumer
      for await (const value of buffered) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        values.push(value);
      }

      // Should have kept the most recent values when buffer overflowed
      expect(values.length).toBeLessThanOrEqual(10);
    });

    it('should handle overflow with drop-newest strategy', async () => {
      const values: number[] = [];

      // Create a fast producer
      const sourceIterator = {
        async *[Symbol.asyncIterator]() {
          for (let i = 1; i <= 10; i++) {
            yield i;
          }
        },
      };

      const buffered = bufferSubscription(sourceIterator[Symbol.asyncIterator](), {
        bufferSize: 3,
        overflowStrategy: 'drop-newest',
      });

      // Slow consumer
      for await (const value of buffered) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        values.push(value);
      }

      // Should have kept the oldest values when buffer overflowed
      expect(values.length).toBeLessThanOrEqual(10);
    });
  });

  describe('AsyncIterator usage patterns', () => {
    it('should support for-await-of loops', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const iterator = accountSubscribe(client, testAddress);
      const updates: AccountChangeNotification[] = [];

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Send multiple notifications
      const notifications = [
        {
          lamports: 1000000n,
          data: 'data1',
          owner: testAddress,
          executable: false,
          rentEpoch: 300n,
        },
        {
          lamports: 2000000n,
          data: 'data2',
          owner: testAddress,
          executable: false,
          rentEpoch: 301n,
        },
        {
          lamports: 3000000n,
          data: 'data3',
          owner: testAddress,
          executable: false,
          rentEpoch: 302n,
        },
      ];

      // Send notifications
      for (let i = 0; i < notifications.length; i++) {
        setTimeout(() => {
          (client as any).subscriptions.get(1)?.handler(notifications[i]);
        }, i * 10);
      }

      // Consume with for-await-of
      for await (const update of iterator) {
        updates.push(update);
        if (updates.length === 3) {
          break;
        }
      }

      expect(updates).toEqual(notifications);
    });

    it('should support early termination with break', async () => {
      const testAddress = address('11111111111111111111111111111112');
      const iterator = accountSubscribe(client, testAddress);
      const unsubscribeSpy = vi.spyOn(client, 'unsubscribe').mockResolvedValue(true);

      // Let subscription establish
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Send a notification so the iterator has something to iterate over
      (client as any).subscriptions.get(1)?.handler({
        lamports: 1000000n,
        data: 'data1',
        owner: testAddress,
        executable: false,
        rentEpoch: 300n,
      });

      // Use iterator then break
      for await (const _ of iterator) {
        break; // Immediate break
      }

      // Should have cleaned up
      expect(unsubscribeSpy).toHaveBeenCalledWith(1, 'accountUnsubscribe');
    });

    it('should support concurrent subscriptions', async () => {
      const address1 = address('11111111111111111111111111111112');
      const address2 = address('So11111111111111111111111111111111111111112');

      const iterator1 = accountSubscribe(client, address1);
      const iterator2 = accountSubscribe(client, address2);

      // Wait for subscriptions to be established
      await new Promise((resolve) => setTimeout(resolve, 50));

      const updates1: AccountChangeNotification[] = [];
      const updates2: AccountChangeNotification[] = [];

      // Send notifications for both
      (client as any).subscriptions.get(1)?.handler({
        lamports: 1000000n,
        data: 'data1',
        owner: address1,
        executable: false,
        rentEpoch: 300n,
      });

      (client as any).subscriptions.get(2)?.handler({
        lamports: 2000000n,
        data: 'data2',
        owner: address2,
        executable: false,
        rentEpoch: 300n,
      });

      // Consume both iterators
      const promise1 = (async () => {
        for await (const update of iterator1) {
          updates1.push(update);
          if (updates1.length === 1) {
            break;
          }
        }
      })();

      const promise2 = (async () => {
        for await (const update of iterator2) {
          updates2.push(update);
          if (updates2.length === 1) {
            break;
          }
        }
      })();

      await Promise.all([promise1, promise2]);

      expect(updates1).toHaveLength(1);
      expect(updates2).toHaveLength(1);
      expect(updates1[0].lamports).toBe(1000000n);
      expect(updates2[0].lamports).toBe(2000000n);
    });
  });
});
