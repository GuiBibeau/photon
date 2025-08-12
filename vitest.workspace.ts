import { defineWorkspace } from 'vitest/config';

// Exclude integration tests when running in CI
const packages = process.env.CI
  ? ['packages/*', '!packages/integration', '!packages/e2e-tests']
  : ['packages/*', '!packages/e2e-tests'];

export default defineWorkspace(packages);
