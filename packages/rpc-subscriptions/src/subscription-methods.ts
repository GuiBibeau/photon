/**
 * High-level subscription methods that return AsyncIterators for ergonomic consumption.
 */

import type { Address } from '@photon/addresses';
import type { WebSocketSubscriptionClient } from './client.js';
import type {
  AccountChangeNotification,
  AccountSubscriptionOptions,
  LogNotification,
  LogsFilter,
  LogsSubscriptionOptions,
  ProgramAccountChangeNotification,
  ProgramSubscriptionOptions,
  SignatureNotification,
  SignatureSubscriptionOptions,
  SlotNotification,
} from './types.js';

/**
 * Subscription iterator that manages cleanup on break.
 */
class SubscriptionIterator<T> implements AsyncIterableIterator<T> {
  private queue: T[] = [];
  private resolvers: Array<(value: IteratorResult<T>) => void> = [];
  private closed = false;
  private error: Error | null = null;
  private cleanupFn: (() => void) | undefined;

  constructor(cleanupFn?: () => void) {
    this.cleanupFn = cleanupFn;
  }

  /**
   * Push a new value to the iterator.
   */
  push(value: T): void {
    if (this.closed) {
      return;
    }

    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver({ value, done: false });
    } else {
      this.queue.push(value);
    }
  }

  /**
   * Signal an error to the iterator.
   */
  throwError(error: Error): void {
    this.error = error;
    this.closed = true;
    this.cleanup();

    // Reject all pending resolvers
    while (this.resolvers.length > 0) {
      const resolver = this.resolvers.shift();
      resolver?.({ value: undefined as T, done: true });
    }
  }

  /**
   * Throw method for AsyncIterator interface.
   */
  async throw(e?: unknown): Promise<IteratorResult<T>> {
    this.throwError(e instanceof Error ? e : new Error(String(e)));
    return { value: undefined as T, done: true };
  }

  /**
   * Close the iterator.
   */
  async return(value?: T): Promise<IteratorResult<T>> {
    this.closed = true;
    this.cleanup();
    return { value: value as T, done: true };
  }

  /**
   * Get the next value from the iterator.
   */
  async next(): Promise<IteratorResult<T>> {
    if (this.error) {
      throw this.error;
    }

    if (this.closed) {
      return { value: undefined as T, done: true };
    }

    if (this.queue.length > 0) {
      const value = this.queue.shift() as T;
      return { value, done: false };
    }

    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  /**
   * Make the iterator iterable.
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }

  /**
   * Cleanup resources.
   */
  private cleanup(): void {
    if (this.cleanupFn !== undefined) {
      this.cleanupFn();
      this.cleanupFn = undefined;
    }
  }
}

/**
 * Subscribe to account changes and return an AsyncIterator.
 *
 * @param client - WebSocket subscription client
 * @param address - Account address to monitor
 * @param options - Subscription options
 * @returns AsyncIterator of account updates
 *
 * @example
 * ```typescript
 * for await (const update of accountSubscribe(client, address)) {
 *   console.log('Account updated:', update);
 * }
 * ```
 */
export function accountSubscribe(
  client: WebSocketSubscriptionClient,
  address: Address,
  options?: AccountSubscriptionOptions,
): AsyncIterableIterator<AccountChangeNotification> {
  let subscriptionId: number | null = null;

  const cleanup = async () => {
    if (subscriptionId !== null) {
      try {
        await client.unsubscribe(subscriptionId, 'accountUnsubscribe');
      } catch {
        // Ignore unsubscribe errors during cleanup
      }
      subscriptionId = null;
    }
  };

  // Set up the cleanup function
  const iteratorWithCleanup = new SubscriptionIterator<AccountChangeNotification>(cleanup);

  // Start the subscription
  (async () => {
    try {
      subscriptionId = await client.subscribe(
        'accountSubscribe',
        [address, options ?? {}],
        (data: AccountChangeNotification) => {
          iteratorWithCleanup.push(data);
        },
        (error: Error) => {
          iteratorWithCleanup.throwError(error);
        },
      );
    } catch (error) {
      iteratorWithCleanup.throwError(error as Error);
    }
  })();

  return iteratorWithCleanup;
}

/**
 * Subscribe to signature confirmations and return an AsyncIterator.
 *
 * @param client - WebSocket subscription client
 * @param signature - Transaction signature to monitor
 * @param options - Subscription options
 * @returns AsyncIterator of signature notifications
 *
 * @example
 * ```typescript
 * for await (const notification of signatureSubscribe(client, signature)) {
 *   if (notification.err === null) {
 *     console.log('Transaction confirmed!');
 *     break;
 *   }
 * }
 * ```
 */
export function signatureSubscribe(
  client: WebSocketSubscriptionClient,
  signature: string,
  options?: SignatureSubscriptionOptions,
): AsyncIterableIterator<SignatureNotification> {
  let subscriptionId: number | null = null;

  const cleanup = async () => {
    if (subscriptionId !== null) {
      try {
        await client.unsubscribe(subscriptionId, 'signatureUnsubscribe');
      } catch {
        // Ignore unsubscribe errors during cleanup
      }
      subscriptionId = null;
    }
  };

  const iteratorWithCleanup = new SubscriptionIterator<SignatureNotification>(cleanup);

  // Start the subscription
  (async () => {
    try {
      subscriptionId = await client.subscribe(
        'signatureSubscribe',
        [signature, options ?? {}],
        (data: SignatureNotification) => {
          iteratorWithCleanup.push(data);
          // Auto-close on finalized confirmation
          if (options?.commitment === 'finalized' && data.err === null) {
            // Schedule close after value is consumed
            queueMicrotask(() => iteratorWithCleanup.return());
          }
        },
        (error: Error) => {
          iteratorWithCleanup.throwError(error);
        },
      );
    } catch (error) {
      iteratorWithCleanup.throwError(error as Error);
    }
  })();

  return iteratorWithCleanup;
}

/**
 * Subscribe to program account changes and return an AsyncIterator.
 *
 * @param client - WebSocket subscription client
 * @param programId - Program ID to monitor
 * @param options - Subscription options with filters
 * @returns AsyncIterator of program account updates
 *
 * @example
 * ```typescript
 * for await (const update of programSubscribe(client, programId, { filters })) {
 *   console.log('Program account updated:', update.pubkey, update.account);
 * }
 * ```
 */
export function programSubscribe(
  client: WebSocketSubscriptionClient,
  programId: Address,
  options?: ProgramSubscriptionOptions,
): AsyncIterableIterator<ProgramAccountChangeNotification> {
  let subscriptionId: number | null = null;

  const cleanup = async () => {
    if (subscriptionId !== null) {
      try {
        await client.unsubscribe(subscriptionId, 'programUnsubscribe');
      } catch {
        // Ignore unsubscribe errors during cleanup
      }
      subscriptionId = null;
    }
  };

  const iteratorWithCleanup = new SubscriptionIterator<ProgramAccountChangeNotification>(cleanup);

  // Start the subscription
  (async () => {
    try {
      subscriptionId = await client.subscribe(
        'programSubscribe',
        [programId, options ?? {}],
        (data: ProgramAccountChangeNotification) => {
          iteratorWithCleanup.push(data);
        },
        (error: Error) => {
          iteratorWithCleanup.throwError(error);
        },
      );
    } catch (error) {
      iteratorWithCleanup.throwError(error as Error);
    }
  })();

  return iteratorWithCleanup;
}

/**
 * Subscribe to new slots and return an AsyncIterator.
 *
 * @param client - WebSocket subscription client
 * @returns AsyncIterator of slot notifications
 *
 * @example
 * ```typescript
 * for await (const slot of slotSubscribe(client)) {
 *   console.log('New slot:', slot.slot);
 * }
 * ```
 */
export function slotSubscribe(
  client: WebSocketSubscriptionClient,
): AsyncIterableIterator<SlotNotification> {
  let subscriptionId: number | null = null;

  const cleanup = async () => {
    if (subscriptionId !== null) {
      try {
        await client.unsubscribe(subscriptionId, 'slotUnsubscribe');
      } catch {
        // Ignore unsubscribe errors during cleanup
      }
      subscriptionId = null;
    }
  };

  const iteratorWithCleanup = new SubscriptionIterator<SlotNotification>(cleanup);

  // Start the subscription
  (async () => {
    try {
      subscriptionId = await client.subscribe(
        'slotSubscribe',
        [],
        (data: SlotNotification) => {
          iteratorWithCleanup.push(data);
        },
        (error: Error) => {
          iteratorWithCleanup.throwError(error);
        },
      );
    } catch (error) {
      iteratorWithCleanup.throwError(error as Error);
    }
  })();

  return iteratorWithCleanup;
}

/**
 * Subscribe to root slots and return an AsyncIterator.
 *
 * @param client - WebSocket subscription client
 * @returns AsyncIterator of root slot numbers
 *
 * @example
 * ```typescript
 * for await (const root of rootSubscribe(client)) {
 *   console.log('New root slot:', root);
 * }
 * ```
 */
export function rootSubscribe(client: WebSocketSubscriptionClient): AsyncIterableIterator<number> {
  let subscriptionId: number | null = null;

  const cleanup = async () => {
    if (subscriptionId !== null) {
      try {
        await client.unsubscribe(subscriptionId, 'rootUnsubscribe');
      } catch {
        // Ignore unsubscribe errors during cleanup
      }
      subscriptionId = null;
    }
  };

  const iteratorWithCleanup = new SubscriptionIterator<number>(cleanup);

  // Start the subscription
  (async () => {
    try {
      subscriptionId = await client.subscribe(
        'rootSubscribe',
        [],
        (data: number) => {
          iteratorWithCleanup.push(data);
        },
        (error: Error) => {
          iteratorWithCleanup.throwError(error);
        },
      );
    } catch (error) {
      iteratorWithCleanup.throwError(error as Error);
    }
  })();

  return iteratorWithCleanup;
}

/**
 * Subscribe to transaction logs and return an AsyncIterator.
 *
 * @param client - WebSocket subscription client
 * @param filter - Logs filter (all, allWithVotes, or mentions)
 * @param options - Subscription options
 * @returns AsyncIterator of log notifications
 *
 * @example
 * ```typescript
 * for await (const log of logsSubscribe(client, { mentions: [programId] })) {
 *   console.log('Transaction logs:', log.signature, log.logs);
 * }
 * ```
 */
export function logsSubscribe(
  client: WebSocketSubscriptionClient,
  filter: LogsFilter,
  options?: LogsSubscriptionOptions,
): AsyncIterableIterator<LogNotification> {
  let subscriptionId: number | null = null;

  const cleanup = async () => {
    if (subscriptionId !== null) {
      try {
        await client.unsubscribe(subscriptionId, 'logsUnsubscribe');
      } catch {
        // Ignore unsubscribe errors during cleanup
      }
      subscriptionId = null;
    }
  };

  const iteratorWithCleanup = new SubscriptionIterator<LogNotification>(cleanup);

  // Start the subscription
  (async () => {
    try {
      subscriptionId = await client.subscribe(
        'logsSubscribe',
        [filter, options ?? {}],
        (data: LogNotification) => {
          iteratorWithCleanup.push(data);
        },
        (error: Error) => {
          iteratorWithCleanup.throwError(error);
        },
      );
    } catch (error) {
      iteratorWithCleanup.throwError(error as Error);
    }
  })();

  return iteratorWithCleanup;
}

/**
 * Options for buffered subscriptions.
 */
export interface BufferedSubscriptionOptions {
  /** Maximum number of items to buffer (default: 100) */
  bufferSize?: number;
  /** Buffer overflow strategy: 'drop-oldest' or 'drop-newest' (default: 'drop-oldest') */
  overflowStrategy?: 'drop-oldest' | 'drop-newest';
}

/**
 * Create a buffered version of any subscription iterator.
 * Useful for handling bursts of data without blocking.
 *
 * @param iterator - Source iterator
 * @param options - Buffer options
 * @returns Buffered iterator
 */
export function bufferSubscription<T>(
  iterator: AsyncIterableIterator<T>,
  options?: BufferedSubscriptionOptions,
): AsyncIterableIterator<T> {
  const bufferSize = options?.bufferSize ?? 100;
  const overflowStrategy = options?.overflowStrategy ?? 'drop-oldest';
  const buffer: T[] = [];
  const bufferedIterator = new SubscriptionIterator<T>();

  // Start consuming from source iterator
  (async () => {
    try {
      for await (const item of iterator) {
        if (buffer.length >= bufferSize) {
          if (overflowStrategy === 'drop-oldest') {
            buffer.shift();
          } else {
            continue; // Drop newest by not adding
          }
        }
        buffer.push(item);

        // Immediately push if there's no backpressure
        if (buffer.length === 1) {
          const value = buffer.shift() as T;
          bufferedIterator.push(value);
        }
      }
    } catch (error) {
      bufferedIterator.throwError(error as Error);
    } finally {
      // Push remaining buffered items
      while (buffer.length > 0) {
        const value = buffer.shift() as T;
        bufferedIterator.push(value);
      }
      bufferedIterator.return();
    }
  })();

  return bufferedIterator;
}
