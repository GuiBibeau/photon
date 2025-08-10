# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed with PNPM workspaces (`pnpm-workspace.yaml`).
- Packages live in `packages/*`, each with `src/`, `tests/`, `dist/`, `tsup.config.ts`, and `vitest.config.ts`.
- Root config: `eslint.config.mjs`, `.prettierrc.json`, `.editorconfig`, `tsconfig.*`, `vitest.shared.ts`, `vitest.workspace.ts`.
- Examples in `examples/`; CI and hooks via `.github/`, `.husky/`, and `lint-staged`.

## Build, Test, and Development Commands
- Install: `pnpm install` (Node 20+; see `.nvmrc`).
- Build all: `pnpm build` (runs `pnpm -r build` via tsup in each package).
- Test all: `pnpm test` | watch: `pnpm test:watch` | coverage: `pnpm test:coverage`.
- Per-package tests: `pnpm -r test` (and `:watch`, `:coverage`).
- Lint/format: `pnpm lint`, `pnpm lint:fix`, `pnpm format`, `pnpm format:fix`.
- Typecheck/clean/dev: `pnpm typecheck`, `pnpm clean`, `pnpm dev`.

## Coding Style & Naming Conventions
- TypeScript-first; prefer `type`-only imports and named exports.
- Disallow `any` (except in tests); avoid non-null assertions.
- 2-space indent, single quotes, semicolons, trailing commas, width 100 (see `.prettierrc.json`).
- No `console` except `console.warn/error`; prefer `const`, strict equality, and immutability.
- Place package code under `src/`; use descriptive, kebab-case filenames.

## Testing Guidelines
- Framework: Vitest (`jsdom` env). Tests under `packages/<name>/tests` or `*.{test,spec}.ts`.
- Coverage thresholds: 80% lines/functions/branches/statements per file (see `vitest.shared.ts`).
- Run: `pnpm test` for all packages, `pnpm test:coverage` for reports (text, lcov, html).

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat(scope): message`, `fix(scope): message`, `test: ...`, `docs: ...`.
- Reference tickets when relevant: `feat(sysvars): implement ... (SDK-55)` and include PR number if applicable.
- PRs: clear description, affected packages, rationale, linked issues, and any screenshots (when relevant).
- Require: passing CI, updated/added tests, lint/format clean, and no coverage regressions.

## Security & Configuration Tips
- Target Web Standards; avoid Node polyfills. Crypto uses native WebCrypto.
- Ensure Husky is active (`pnpm prepare`); `lint-staged` formats staged files.
