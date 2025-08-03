/* eslint-disable no-console */
import { describe, it, expect, beforeEach } from 'vitest';
import { generateKeyPair } from '../src/key-generation.js';
import { testEd25519Support } from '../src/compatibility.js';

// Performance test configuration
const BENCHMARK_ITERATIONS = 10;
const BENCHMARK_TIMEOUT = 30000; // 30 seconds

describe('crypto performance benchmarks', () => {
  beforeEach(async () => {
    // Skip performance tests if Ed25519 is not supported
    const isSupported = await testEd25519Support();
    if (!isSupported) {
      console.warn('Ed25519 not supported, skipping performance tests');
      return;
    }
  }, BENCHMARK_TIMEOUT);

  describe('key generation performance', () => {
    it(
      'should generate keys within reasonable time',
      async () => {
        const isSupported = await testEd25519Support();
        if (!isSupported) {
          return;
        }

        const startTime = performance.now();
        const keyPair = await generateKeyPair();
        const endTime = performance.now();

        const generationTime = endTime - startTime;

        // Key generation should complete within 1 second for a single key
        expect(generationTime).toBeLessThan(1000);
        expect(keyPair).toBeDefined();

        console.log(`Single key generation: ${generationTime.toFixed(2)}ms`);
      },
      BENCHMARK_TIMEOUT,
    );

    it(
      'should generate multiple keys efficiently',
      async () => {
        const isSupported = await testEd25519Support();
        if (!isSupported) {
          return;
        }

        const startTime = performance.now();

        const keyPromises = Array(BENCHMARK_ITERATIONS)
          .fill(0)
          .map(() => generateKeyPair());

        const keyPairs = await Promise.all(keyPromises);

        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const averageTime = totalTime / BENCHMARK_ITERATIONS;

        expect(keyPairs).toHaveLength(BENCHMARK_ITERATIONS);
        expect(averageTime).toBeLessThan(1000); // Average should be under 1 second

        console.log(`Generated ${BENCHMARK_ITERATIONS} keys in ${totalTime.toFixed(2)}ms`);
        console.log(`Average time per key: ${averageTime.toFixed(2)}ms`);
      },
      BENCHMARK_TIMEOUT,
    );

    it(
      'should generate extractable vs non-extractable keys at similar speeds',
      async () => {
        const isSupported = await testEd25519Support();
        if (!isSupported) {
          return;
        }

        // Test non-extractable keys
        const nonExtractableStart = performance.now();
        await Promise.all(
          Array(5)
            .fill(0)
            .map(() => generateKeyPair({ extractable: false })),
        );
        const nonExtractableTime = performance.now() - nonExtractableStart;

        // Test extractable keys
        const extractableStart = performance.now();
        await Promise.all(
          Array(5)
            .fill(0)
            .map(() => generateKeyPair({ extractable: true })),
        );
        const extractableTime = performance.now() - extractableStart;

        // Times should be relatively similar (within 100% of each other)
        // This is a loose check since performance can vary significantly in test environments
        const timeDifference = Math.abs(extractableTime - nonExtractableTime);
        const averageTime = (extractableTime + nonExtractableTime) / 2;
        const percentageDifference = averageTime > 0 ? (timeDifference / averageTime) * 100 : 0;

        expect(percentageDifference).toBeLessThan(100);

        console.log(`Non-extractable keys: ${nonExtractableTime.toFixed(2)}ms`);
        console.log(`Extractable keys: ${extractableTime.toFixed(2)}ms`);
        console.log(`Difference: ${percentageDifference.toFixed(1)}%`);
      },
      BENCHMARK_TIMEOUT,
    );
  });

  describe('signing performance', () => {
    it(
      'should sign messages efficiently',
      async () => {
        const isSupported = await testEd25519Support();
        if (!isSupported) {
          return;
        }

        const keyPair = await generateKeyPair();
        const message = new Uint8Array([1, 2, 3, 4, 5]);

        const startTime = performance.now();

        const signatures = await Promise.all(
          Array(BENCHMARK_ITERATIONS)
            .fill(0)
            .map(() => keyPair.sign(message)),
        );

        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const averageTime = totalTime / BENCHMARK_ITERATIONS;

        expect(signatures).toHaveLength(BENCHMARK_ITERATIONS);
        expect(averageTime).toBeLessThan(100); // Should be very fast

        console.log(`Signed ${BENCHMARK_ITERATIONS} messages in ${totalTime.toFixed(2)}ms`);
        console.log(`Average signing time: ${averageTime.toFixed(2)}ms`);
      },
      BENCHMARK_TIMEOUT,
    );

    it(
      'should handle different message sizes efficiently',
      async () => {
        const isSupported = await testEd25519Support();
        if (!isSupported) {
          return;
        }

        const keyPair = await generateKeyPair();
        const messageSizes = [32, 256, 1024, 4096, 16384]; // Different sizes in bytes

        for (const size of messageSizes) {
          const message = new Uint8Array(size).fill(42);

          const startTime = performance.now();
          const signature = await keyPair.sign(message);
          const endTime = performance.now();

          const signingTime = endTime - startTime;

          expect(signature).toBeInstanceOf(Uint8Array);
          expect(signature.length).toBe(64);

          // Signing should be consistently fast regardless of message size
          expect(signingTime).toBeLessThan(100);

          console.log(`Signed ${size}-byte message in ${signingTime.toFixed(2)}ms`);
        }
      },
      BENCHMARK_TIMEOUT,
    );
  });

  describe('public key operations performance', () => {
    it(
      'should extract public key bytes efficiently',
      async () => {
        const isSupported = await testEd25519Support();
        if (!isSupported) {
          return;
        }

        const keyPair = await generateKeyPair();

        const startTime = performance.now();

        // First call (should export from WebCrypto)
        const publicKeyBytes1 = await keyPair.getPublicKeyBytes();

        // Subsequent calls (should use cache)
        const publicKeyBytes2 = await keyPair.getPublicKeyBytes();
        const publicKeyBytes3 = await keyPair.getPublicKeyBytes();

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        expect(publicKeyBytes1).toBeInstanceOf(Uint8Array);
        expect(publicKeyBytes1).toBe(publicKeyBytes2); // Same reference (cached)
        expect(publicKeyBytes2).toBe(publicKeyBytes3); // Same reference (cached)
        expect(totalTime).toBeLessThan(100);

        console.log(`Public key operations completed in ${totalTime.toFixed(2)}ms`);
      },
      BENCHMARK_TIMEOUT,
    );

    it(
      'should derive addresses efficiently',
      async () => {
        const isSupported = await testEd25519Support();
        if (!isSupported) {
          return;
        }

        const keyPair = await generateKeyPair();

        const startTime = performance.now();

        // First call (should derive from public key)
        const address1 = await keyPair.getAddress();

        // Subsequent calls (should use cache)
        const address2 = await keyPair.getAddress();

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        expect(typeof address1).toBe('string');
        expect(address1).toBe(address2); // Same reference (cached)
        expect(totalTime).toBeLessThan(100);

        console.log(`Address derivation completed in ${totalTime.toFixed(2)}ms`);
      },
      BENCHMARK_TIMEOUT,
    );
  });

  describe('memory usage', () => {
    it(
      'should not leak memory during key generation',
      async () => {
        const isSupported = await testEd25519Support();
        if (!isSupported) {
          return;
        }

        // This is a basic memory leak test
        // In a real environment, you'd use more sophisticated memory monitoring

        const initialMemory = (globalThis as any).performance?.memory?.usedJSHeapSize || 0;

        // Generate many keys
        const keyPairs = [];
        for (let i = 0; i < 50; i++) {
          const keyPair = await generateKeyPair();
          keyPairs.push(keyPair);
        }

        // Use the keys to ensure they're not optimized away
        for (const keyPair of keyPairs) {
          await keyPair.getPublicKeyBytes();
        }

        const finalMemory = (globalThis as any).performance?.memory?.usedJSHeapSize || 0;

        if (initialMemory > 0 && finalMemory > 0) {
          const memoryIncrease = finalMemory - initialMemory;
          const memoryPerKey = memoryIncrease / keyPairs.length;

          // Each key pair should use a reasonable amount of memory
          expect(memoryPerKey).toBeLessThan(10000); // Less than 10KB per key pair

          console.log(`Memory increase: ${memoryIncrease} bytes for ${keyPairs.length} keys`);
          console.log(`Average memory per key: ${memoryPerKey.toFixed(0)} bytes`);
        } else {
          console.log('Memory monitoring not available in this environment');
        }

        expect(keyPairs).toHaveLength(50);
      },
      BENCHMARK_TIMEOUT,
    );
  });

  describe('concurrent operations', () => {
    it(
      'should handle concurrent key generation',
      async () => {
        const isSupported = await testEd25519Support();
        if (!isSupported) {
          return;
        }

        const concurrentCount = 10;

        const startTime = performance.now();

        // Generate keys concurrently
        const keyPromises = Array(concurrentCount)
          .fill(0)
          .map((_, index) => generateKeyPair({ extractable: index % 2 === 0 }));

        const keyPairs = await Promise.all(keyPromises);

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        expect(keyPairs).toHaveLength(concurrentCount);

        // Concurrent generation should be faster than sequential
        // (though this depends on the browser's WebCrypto implementation)
        console.log(`Generated ${concurrentCount} keys concurrently in ${totalTime.toFixed(2)}ms`);

        // Verify all keys are unique
        const publicKeys = await Promise.all(keyPairs.map((kp) => kp.getPublicKeyBytes()));

        const uniqueKeys = new Set(publicKeys.map((pk) => Array.from(pk).join(',')));

        expect(uniqueKeys.size).toBe(concurrentCount);
      },
      BENCHMARK_TIMEOUT,
    );
  });
});
