import { describe, it, expect } from 'vitest';

// Example test to verify Vitest setup
describe('Vitest Setup', () => {
  it('should run a basic test', () => {
    expect(true).toBe(true);
  });

  it('should handle arithmetic operations', () => {
    expect(1 + 1).toBe(2);
    expect(5 - 3).toBe(2);
    expect(2 * 3).toBe(6);
    expect(10 / 2).toBe(5);
  });

  it('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
    expect(arr).toEqual([1, 2, 3]);
  });

  it('should handle objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toHaveProperty('name', 'test');
    expect(obj).toMatchObject({ value: 42 });
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('hello');
    await expect(promise).resolves.toBe('hello');
  });
});