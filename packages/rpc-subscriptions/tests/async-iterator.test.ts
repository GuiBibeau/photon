/**
 * Tests for AsyncIterator behavior and memory management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { address } from '@photon/addresses';
import { WebSocketSubscriptionClient } from '../src/client.js';
import { MockWebSocket } from './mocks/websocket.js';
import {
  accountSubscribe,
  signatureSubscribe,
  slotSubscribe,
} from '../src/subscription-methods.js';
import type {
  AccountChangeNotification,
  SignatureNotification,
  SlotNotification,
} from '../src/types.js';

describe('AsyncIterator Behavior', () => {
  let client: WebSocketSubscriptionClient;
  let ws: MockWebSocket;

  beforeEach(async () => {
    MockWebSocket.reset();

    client = new WebSocketSubscriptionClient({
      url: 'ws://localhost:8900',
      WebSocketImpl: MockWebSocket as any,
    });

    await client.connect();
    ws = MockWebSocket.lastInstance as MockWebSocket;
  });

  afterEach(async () => {
    await client.disconnect();
    MockWebSocket.reset();
  });

  describe('Iterator Protocol', () => {
    it('should implement AsyncIterableIterator interface', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);

      // Check that it has the required methods
      expect(typeof iterator.next).toBe('function');
      expect(typeof iterator.return).toBe('function');
      expect(typeof iterator.throw).toBe('function');
      expect(typeof iterator[Symbol.asyncIterator]).toBe('function');

      // Check that Symbol.asyncIterator returns itself
      expect(iterator[Symbol.asyncIterator]()).toBe(iterator);

      await iterator.return();
    });

    it('should handle next() calls correctly', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send notification
      const notification: AccountChangeNotification = {
        lamports: 1000000000n,
        data: 'test',
        owner: address('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 123n,
      };
      ws.simulateNotification(1, notification);
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Get next value
      const result = await iterator.next();
      expect(result.done).toBe(false);
      expect(result.value).toEqual(notification);

      await iterator.return();
    });

    it('should handle return() correctly', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Return with value
      const returnValue: AccountChangeNotification = {
        lamports: 999n,
        data: 'return-value',
        owner: address('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 100n,
      };

      const result = await iterator.return(returnValue);
      expect(result.done).toBe(true);
      expect(result.value).toEqual(returnValue);

      // Subsequent next() should return done
      const nextResult = await iterator.next();
      expect(nextResult.done).toBe(true);
    });

    it('should handle throw() correctly', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Throw error
      const error = new Error('Test error');
      const result = await iterator.throw(error);
      expect(result.done).toBe(true);

      // Subsequent next() should return done
      const nextResult = await iterator.next();
      expect(nextResult.done).toBe(true);
    });
  });

  describe('Queue Management', () => {
    it('should queue values when consumer is slow', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);
      const updates: AccountChangeNotification[] = [];

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send multiple notifications quickly
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

      // Consume all queued values
      for (let i = 0; i < 5; i++) {
        const result = await iterator.next();
        if (!result.done) {
          updates.push(result.value);
        }
      }

      expect(updates).toHaveLength(5);
      expect(updates[0].data).toBe('data-0');
      expect(updates[4].data).toBe('data-4');

      await iterator.return();
    });

    it('should handle concurrent next() calls', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Call next() multiple times before any data arrives
      const promises = [iterator.next(), iterator.next(), iterator.next()];

      // Send notifications
      for (let i = 0; i < 3; i++) {
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

      // All promises should resolve
      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(results.every((r) => !r.done)).toBe(true);
      expect(results[0].value.data).toBe('data-0');
      expect(results[1].value.data).toBe('data-1');
      expect(results[2].value.data).toBe('data-2');

      await iterator.return();
    });
  });

  describe('Error Propagation', () => {
    it('should propagate errors to iterator', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Disable auto-response
      ws.autoRespond = false;

      // Get the subscription request
      const subRequest = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'accountSubscribe';
      });
      expect(subRequest).toBeDefined();
      const requestId = JSON.parse(subRequest as string).id;

      // Send error response
      ws.simulateError(requestId, -32000, 'Subscription error');
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Next call should throw
      await expect(iterator.next()).rejects.toThrow('Subscription error');
    });

    it('should handle error in handler', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const errors: Error[] = [];

      // Use direct subscription with error handler
      await client.subscribe(
        'accountSubscribe',
        [testAddress],
        () => {
          throw new Error('Handler error');
        },
        (error) => {
          errors.push(error);
        },
      );

      // Send notification
      const notification: AccountChangeNotification = {
        lamports: 1000000000n,
        data: 'test',
        owner: address('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 123n,
      };
      ws.simulateNotification(1, notification);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Handler error');
    });
  });

  describe('For-Await-Of Loop', () => {
    it('should work with for-await-of syntax', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);
      const updates: AccountChangeNotification[] = [];

      // Start consuming
      const consumePromise = (async () => {
        for await (const update of iterator) {
          updates.push(update);
          if (updates.length >= 3) {
            break;
          }
        }
      })();

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send notifications
      for (let i = 0; i < 3; i++) {
        const notification: AccountChangeNotification = {
          lamports: BigInt(i * 1000000000),
          data: `data-${i}`,
          owner: address('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: BigInt(100 + i),
        };
        ws.simulateNotification(1, notification);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      await consumePromise;

      expect(updates).toHaveLength(3);
      expect(updates[0].data).toBe('data-0');
      expect(updates[2].data).toBe('data-2');
    });

    it('should cleanup on break', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);

      // Start consuming
      const consumePromise = (async () => {
        for await (const _ of iterator) {
          break; // Immediate break
        }
      })();

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send notification to trigger loop
      const notification: AccountChangeNotification = {
        lamports: 1000000000n,
        data: 'test',
        owner: address('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 123n,
      };
      ws.simulateNotification(1, notification);
      await new Promise((resolve) => setTimeout(resolve, 20));

      await consumePromise;

      // Check for unsubscribe
      const hasUnsubscribe = ws.sentMessages.some((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'accountUnsubscribe';
      });

      expect(hasUnsubscribe).toBe(true);
    });

    it('should cleanup on exception', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);

      // Start consuming with exception
      const consumePromise = (async () => {
        try {
          for await (const _ of iterator) {
            throw new Error('Consumer error');
          }
        } catch {
          // Expected
        }
      })();

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send notification to trigger loop
      const notification: AccountChangeNotification = {
        lamports: 1000000000n,
        data: 'test',
        owner: address('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 123n,
      };
      ws.simulateNotification(1, notification);
      await new Promise((resolve) => setTimeout(resolve, 20));

      await consumePromise;

      // Iterator should be closed
      const result = await iterator.next();
      expect(result.done).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with long-running subscriptions', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);
      const consumedCount = { value: 0 };

      // Start consuming
      const consumePromise = (async () => {
        for await (const _ of iterator) {
          consumedCount.value++;
          if (consumedCount.value >= 100) {
            break;
          }
        }
      })();

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send many notifications
      for (let i = 0; i < 100; i++) {
        const notification: AccountChangeNotification = {
          lamports: BigInt(i),
          data: `data-${i}`,
          owner: address('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: BigInt(i),
        };
        ws.simulateNotification(1, notification);

        // Process in batches
        if (i % 10 === 9) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
      await consumePromise;

      expect(consumedCount.value).toBe(100);
    });

    it('should cleanup resources on rapid subscribe/unsubscribe', async () => {
      const testAddress = address('11111111111111111111111111111111');

      for (let i = 0; i < 10; i++) {
        const iterator = accountSubscribe(client, testAddress);

        // Wait for subscription
        await new Promise((resolve) => setTimeout(resolve, 20));

        // Immediately unsubscribe
        await iterator.return();
      }

      // Check that all unsubscribes were sent
      const unsubscribeCount = ws.sentMessages.filter((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'accountUnsubscribe';
      }).length;

      expect(unsubscribeCount).toBe(10);
    });

    it('should handle multiple iterators without interference', async () => {
      const address1 = address('11111111111111111111111111111111');
      const address2 = address('So11111111111111111111111111111111111111112');

      const updates1: AccountChangeNotification[] = [];
      const updates2: AccountChangeNotification[] = [];

      const iterator1 = accountSubscribe(client, address1);
      const iterator2 = accountSubscribe(client, address2);

      // Start consuming both
      const consume1 = (async () => {
        for await (const update of iterator1) {
          updates1.push(update);
          if (updates1.length >= 2) {
            break;
          }
        }
      })();

      const consume2 = (async () => {
        for await (const update of iterator2) {
          updates2.push(update);
          if (updates2.length >= 2) {
            break;
          }
        }
      })();

      // Wait for subscriptions
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send notifications to different subscriptions
      const notification1: AccountChangeNotification = {
        lamports: 1000n,
        data: 'iter1-data',
        owner: address('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 100n,
      };

      const notification2: AccountChangeNotification = {
        lamports: 2000n,
        data: 'iter2-data',
        owner: '22222222222222222222222222222222',
        executable: false,
        rentEpoch: 200n,
      };

      // Subscriptions get different IDs
      ws.simulateNotification(1, notification1);
      ws.simulateNotification(1, notification1);
      ws.simulateNotification(2, notification2);
      ws.simulateNotification(2, notification2);

      await new Promise((resolve) => setTimeout(resolve, 20));
      await Promise.all([consume1, consume2]);

      expect(updates1).toHaveLength(2);
      expect(updates2).toHaveLength(2);
      expect(updates1[0].data).toBe('iter1-data');
      expect(updates2[0].data).toBe('iter2-data');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty iterator (immediate return)', async () => {
      const testAddress = address('11111111111111111111111111111111');
      const iterator = accountSubscribe(client, testAddress);

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Immediately return
      const result = await iterator.return();
      expect(result.done).toBe(true);

      // Should not process any notifications after return
      const notification: AccountChangeNotification = {
        lamports: 1000n,
        data: 'should-not-receive',
        owner: address('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 100n,
      };
      ws.simulateNotification(1, notification);

      const nextResult = await iterator.next();
      expect(nextResult.done).toBe(true);
    });

    it('should handle iterator with only errors', async () => {
      const signature = 'test-signature';
      const iterator = signatureSubscribe(client, signature);
      const notifications: SignatureNotification[] = [];

      // Start consuming
      const consumePromise = (async () => {
        for await (const notification of iterator) {
          notifications.push(notification);
          if (notifications.length >= 3) {
            break;
          }
        }
      })();

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send only error notifications
      for (let i = 0; i < 3; i++) {
        const errorNotification: SignatureNotification = {
          err: { InsufficientFunds: {} },
        };
        ws.simulateNotification(1, errorNotification);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      await consumePromise;

      expect(notifications).toHaveLength(3);
      expect(notifications.every((n) => n.err !== null)).toBe(true);
    });

    it('should handle very fast producer', async () => {
      const iterator = slotSubscribe(client);
      const slots: SlotNotification[] = [];

      // Start slow consumer
      const consumePromise = (async () => {
        for await (const slot of iterator) {
          // Simulate slow processing
          await new Promise((resolve) => setTimeout(resolve, 10));
          slots.push(slot);
          if (slots.length >= 5) {
            break;
          }
        }
      })();

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send many notifications quickly
      for (let i = 0; i < 20; i++) {
        const notification: SlotNotification = {
          slot: BigInt(100000 + i),
          parent: BigInt(99999 + i),
          root: BigInt(99900 + i),
        };
        ws.simulateNotification(1, notification);
      }
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Switch to real timers for setTimeout
      vi.useRealTimers();
      await consumePromise;
      // vi.useFakeTimers(); - not using fake timers for this test

      // Should have consumed first 5 despite 20 being sent
      expect(slots).toHaveLength(5);
      expect(slots[0].slot).toBe(100000n);
      expect(slots[4].slot).toBe(100004n);
    });
  });
});
