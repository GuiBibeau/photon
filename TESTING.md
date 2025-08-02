# Testing with Vitest

This project uses Vitest for unit testing with the following configuration:

## Running Tests

From the root directory:
```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

From a specific package:
```bash
cd packages/[package-name]
pnpm test
```

## Configuration

- **Test Framework**: Vitest v3.2.4
- **Test Environment**: jsdom (for browser API compatibility)
- **Coverage Provider**: V8
- **Coverage Reporters**: text, lcov, html

## Coverage Thresholds

- **Default**: 80% for lines, functions, branches, and statements
- **Critical modules** (crypto, transactions): 100% coverage required

## Test Structure

Place test files in:
- `packages/[package-name]/tests/*.test.ts`
- `packages/[package-name]/tests/*.spec.ts`
- Or alongside source files as `*.test.ts` or `*.spec.ts`

## Example Test

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature', () => {
  it('should work correctly', () => {
    expect(true).toBe(true);
  });
});
```