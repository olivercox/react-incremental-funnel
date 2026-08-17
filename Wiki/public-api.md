---
type: API Contract
title: Public API and Contracts
description: Source-linked map of the package's exported runtime, hook, persistence, validation, and storage contracts.
tags: [api, schema, typescript, react]
status: stable
generated: { by: openai/codex, at: 2026-08-17T08:33:37Z }
verified: { by: openai/codex, at: 2026-08-17T08:33:37Z }
sources:
  - id: entrypoint
    resource: ../src/index.ts
    title: Public TypeScript entry point
  - id: persistence
    resource: ../src/persistence.ts
    title: Persistence policies and helpers
  - id: storage
    resource: ../src/storage.ts
    title: Storage adapters
  - id: values
    resource: ../src/value-utils.ts
    title: Value filtering and redaction helpers
  - id: tests
    resource: ../src/index.test.ts
    title: Hook and funnel tests
  - id: readme
    resource: ../README.md
    title: Public package documentation
---

# Authority

The TypeScript exports in `src/index.ts` are authoritative. This page is a
navigation map, not a substitute for current declarations. Re-check source and
tests before implementing against a detailed signature.[^entrypoint][^tests]

# Funnel Primitives

* `createFunnel(steps, initialStepId?)` creates a state after requiring at least
  one step, unique identifiers, and a valid initial identifier.
* `advanceFunnel(state, nextStepId)` moves to an existing step and rejects an
  unknown identifier.
* Core types include `FunnelStepId`, `FunnelStep`, and `FunnelState`.

# React Hook

`useIncrementalFunnel<TValues, TStepId>(options)` is the main integration
surface. Its options group into:[^entrypoint]

* values and navigation: initial values, ordered step IDs, initial step,
  completion state, and optional persisted step state;
* field persistence: a storage key, per-path policies, TTLs, and adapter
  overrides;
* remote lifecycle: session creation, debounced draft updates, retry/flush,
  final submission, and optional step state in remote updates;
* validation: per-step and full-submit callbacks returning step or field
  errors;
* lifecycle observation: funnel, step, value, sync, submit, and reset callbacks,
  with value payloads excluded unless explicitly enabled.

The result exposes current values and readiness, navigation and completion,
saved-progress metadata/actions, validation errors, remote synchronization
state, session-creation state, submission state, and reset or retry actions.
Use the source types for the exact current field list.

# Persistence Contract

`FieldPersistenceMode` supports:[^persistence]

* `local`: browser local storage;
* `session`: browser session storage;
* `memory`: in-process memory only;
* `remoteOnly`: included in remote updates/submission but never written to
  local persistence.

Policies address nested fields by safe dotted paths and may include `ttlMs`.
Unsafe prototype-related segments are rejected. Expired entries are omitted or
pruned during persistence and hydration.

The package exports `createLocalStorageAdapter`,
`createSessionStorageAdapter`, and `createMemoryStorageAdapter`. Browser
adapters tolerate unavailable or throwing browser storage rather than exposing
storage exceptions to callers.[^storage]

# Value Safety Helpers

The public helpers `pickPersistableValues`, `removeBlockedFields`, and
`redactValues` operate on cloned values and support safe dotted paths.[^values]
They help integrations minimize or redact data but do not replace server-side
validation and sanitization.

# Maintenance Rule

When exports, public option/result types, persistence behavior, validation,
callbacks, or examples change, follow [Code and documentation sync](workflows/code-and-doc-sync.md).
Update this map in the same task, preserve source links, and add a Changeset if
the released package surface or behavior changes.

[^entrypoint]: Public TypeScript entry point.
[^persistence]: Persistence policies and helpers.
[^storage]: Storage adapters.
[^values]: Value filtering and redaction helpers.
[^tests]: Hook and funnel tests.
[^readme]: Public package documentation.
