# Copilot instructions for `react-incremental-funnel`

## Repository context
- This repo is a reusable **TypeScript React library** for incremental customer funnel flows in frontend apps (not a standalone app).
- Language profile is TypeScript-first (~99.5% TypeScript) with small JavaScript usage.
- Tooling/runtime in repo:
  - **Package manager:** npm (`package-lock.json` present; use `npm ci` in CI-style flows)
  - **Build:** `tsdown` (`npm run build`)
  - **Tests:** Vitest (`npm test`)
  - **Lint:** ESLint + `typescript-eslint` (`npm run lint`)
  - **Typecheck:** `tsc --noEmit` (`npm run typecheck`)

## Command truth source (run in this order)
Use repository root unless noted.

1. **Install/Bootstrap**
   - `npm ci`
   - Runtime references from workflows:
     - PR CI uses Node **22** (`.github/workflows/ci.yml`)
     - release/publish workflows use Node **24** (`.github/workflows/release.yml`, `publish.yml`)
   - Success: dependencies install with no lockfile changes.

2. **Library validation**
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
   - Success: all commands exit 0; vitest reports passing tests; `dist/` is rebuilt.

3. **PR parity checks (matches CI job)**
   - `npm run build:examples`
   - `npm pack --dry-run`
   - Success: both Vite examples build; pack dry-run lists expected package contents.

### Common failure modes and mitigations
- **`npm ci` fails:** ensure lockfile and `package.json` are in sync; rerun from repo root.
- **Lint/type errors:** run `npm run lint` and `npm run typecheck` before tests/build; fix root cause instead of bypassing rules.
- **Example build failures:** run `npm --prefix examples/basic-vite ci` / `npm --prefix examples/api-backed-vite ci` then rebuild.
- **Release/publish issues from missing version updates:** follow mandatory Changesets guidance below.

## Mandatory Changesets instructions (for all release-impacting PRs)
For any PR that changes released package behavior, API, types, or output:
1. Run Changesets CLI: `npm run changeset` (or `npx changeset`).
2. Select the package and correct semver bump (`patch`/`minor`/`major`).
3. Commit the generated `.changeset/*.md` file with code changes.
4. Do **not** merge release-impacting PRs without a changeset.

When skipping is acceptable:
- Internal-only changes (for example CI/workflow-only, repo docs only, or tests-only with no package/release impact) may skip a version bump **only if** repository policy/checks allow it.
- Always verify current CI/release checks and expected release behavior before skipping.

Why this is mandatory:
- Changesets drives versioning/changelogs and release automation (`changesets/action` in workflows).
- Missing/incorrect changesets can break publish expectations and release flow.

## Project layout / architecture map
- Library source + tests: `src/`
  - Public entry point: `src/index.ts`
  - Tests: `src/**/*.test.ts`
- Examples: `examples/basic-vite/`, `examples/api-backed-vite/`
- TypeScript config: `tsconfig.json`
- Lint config: `eslint.config.js`
- Test config: `vitest.config.ts`
- Package/build scripts and publish metadata: `package.json`
- Changesets config: `.changeset/config.json` (+ release notes files in `.changeset/*.md`)
- CI/release workflows: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/workflows/publish.yml`

## CI and pre-merge checks
- PRs run **CI** workflow (`.github/workflows/ci.yml`), which executes:
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run build:examples`
  - `npm pack --dry-run`
- Recommended pre-PR checklist (same order):
  1. `npm ci`
  2. `npm run lint`
  3. `npm run typecheck`
  4. `npm test`
  5. `npm run build`
  6. `npm run build:examples`
  7. `npm pack --dry-run`
  8. `npm run changeset` for any release-impacting change

## Agent operating rule
Treat this file as the primary operating guide for this repository. Only search/explore further when instructions here are missing, ambiguous, or proven incorrect.
