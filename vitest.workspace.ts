import { defineWorkspace } from 'vitest/config';

// Exclude integration tests by default (unless INCLUDE_INTEGRATION is set)
const packages = process.env.INCLUDE_INTEGRATION
  ? ['packages/*']
  : ['packages/*', '!packages/integration'];

export default defineWorkspace(packages);
