import { describe, it, expect } from 'vitest';

describe('React package setup', () => {
  it('should have test environment configured', () => {
    expect(true).toBe(true);
  });

  it('should have jsdom environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });
});
