import { defineWorkspace } from 'vitest/config';

// Exclude integration tests when running in CI
const packages = process.env.CI ? ['packages/*', '!packages/integration'] : ['packages/*'];

export default defineWorkspace(packages);
