import { describe, it, expect } from 'vitest';
import { usedFunction, unusedFunction, USED_CONSTANT, UNUSED_CONSTANT } from '../src/index';

describe('Error Module Exports', () => {
  it('should export usedFunction correctly', () => {
    expect(usedFunction()).toBe('This function is used');
    expect(typeof usedFunction).toBe('function');
  });

  it('should export unusedFunction correctly', () => {
    expect(unusedFunction()).toBe('This function is not used');
    expect(typeof unusedFunction).toBe('function');
  });

  it('should export USED_CONSTANT correctly', () => {
    expect(USED_CONSTANT).toBe('USED');
    expect(typeof USED_CONSTANT).toBe('string');
  });

  it('should export UNUSED_CONSTANT correctly', () => {
    expect(UNUSED_CONSTANT).toBe('UNUSED');
    expect(typeof UNUSED_CONSTANT).toBe('string');
  });
});