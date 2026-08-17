---
type: Project Overview
title: react-incremental-funnel Project Overview
description: Purpose, architecture, examples, validation commands, and release path for the library.
tags: [project, react, typescript, maintenance]
status: stable
generated: { by: openai/codex, at: 2026-08-17T08:33:37Z }
verified: { by: openai/codex, at: 2026-08-17T08:33:37Z }
sources:
  - id: readme
    resource: ../README.md
    title: Repository README
  - id: package
    resource: ../package.json
    title: npm package manifest
  - id: ci
    resource: ../.github/workflows/ci.yml
    title: Continuous integration workflow
  - id: release
    resource: ../.github/workflows/release.yml
    title: Release pull request workflow
  - id: instructions
    resource: ../.github/copilot-instructions.md
    title: Repository operating instructions
---

# Purpose and Audience

`react-incremental-funnel` is a TypeScript-first React library providing a
small runtime API and exported types for incremental multi-step funnels. It is
a reusable package rather than a standalone application.[^readme] This page is
for maintainers and coding agents who need repository orientation before
changing implementation, documentation, examples, or release metadata.

# Architecture

* `src/index.ts` is the public entry point and contains funnel orchestration,
  hook options/results, lifecycle state, validation, remote sync, and submit
  behavior.
* `src/persistence.ts` implements safe nested paths, field policies, TTL-aware
  persisted entries, and hydration.
* `src/storage.ts` provides memory, local-storage, and session-storage adapters.
* `src/value-utils.ts` contains immutable selection, removal, and redaction
  helpers.
* `src/**/*.test.ts` is executable behavioral evidence.
* `examples/basic-vite/` demonstrates local funnel behavior;
  `examples/api-backed-vite/` demonstrates generic mock remote persistence.

See [Public API and contracts](public-api.md) for the exported surface and
[Persistence and privacy boundaries](decisions/persistence-and-privacy.md) for
the core data-handling decision.

# Development Loop

The package uses npm, TypeScript, Vitest, ESLint, tsdown, and Changesets. The
repository's CI-equivalent sequence is:[^instructions][^ci]

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`
6. `npm run build:examples`
7. `npm pack --dry-run`

Run checks in proportion to the change, but use the full sequence for PR parity
or release-sensitive work. Wiki-only changes require `okn validate "Wiki"`, not
a package changeset.

# Release Path

Any PR changing released behavior, APIs, types, or output requires a Changeset.
Pushes to `main` run the release workflow, which creates or updates a release
PR; merging the release PR drives npm publication through the configured
automation.[^instructions][^release] Developers should not normally publish
from a local machine.

# Source and Safety Boundary

The examples and wiki must use generic mock data only. Do not introduce Good
Life Sorted endpoints, schemas, field names, credentials, business logic, or
other private implementation details.[^readme] Treat local and session storage
as user-accessible, non-secret storage; never put secrets in funnel values.

[^readme]: Repository README.
[^package]: npm package manifest.
[^ci]: Continuous integration workflow.
[^release]: Release pull request workflow.
[^instructions]: Repository operating instructions.
