---
type: Architecture Decision
title: Field-scoped persistence and privacy boundaries
description: The library makes persistence an explicit per-field choice and keeps sensitive values out of durable browser storage.
tags: [decision, persistence, privacy, security]
status: stable
generated: { by: openai/codex, at: 2026-08-17T08:33:37Z }
verified: { by: openai/codex, at: 2026-08-17T08:33:37Z }
sources:
  - id: readme
    resource: ../../README.md
    title: Repository README and security guidance
  - id: persistence
    resource: ../../src/persistence.ts
    title: Field persistence implementation
  - id: storage
    resource: ../../src/storage.ts
    title: Storage adapter implementation
  - id: tests
    resource: ../../src/persistence.test.ts
    title: Persistence tests
---

# Context

Incremental funnels commonly need resumable progress, but fields differ in
sensitivity, retention needs, and whether browser storage is appropriate.
Shared or public devices make a single all-or-nothing persistence policy
especially risky.[^readme]

# Decision

Persistence is configured per dotted field path with one of four modes:
`local`, `session`, `memory`, or `remoteOnly`.[^persistence] Persisted fields
may have a TTL. Sensitive fields should use `memory` or `remoteOnly`; local and
session storage are considered user-accessible and non-secret. Resume UX must
avoid displaying saved sensitive values, and integrations should provide clear
start-again and clear-progress actions.[^readme]

Nested paths reject prototype-related segments. Browser storage adapters
degrade safely when storage is unavailable or throws.[^persistence][^storage]

# Tradeoffs

* Field-level policy adds configuration compared with persisting one object,
  but makes retention and exposure explicit.
* `remoteOnly` supports server-backed drafts without browser persistence, but
  makes integrations responsible for remote security and availability.
* TTLs reduce long-lived data but require callers to choose appropriate values
  and handle stale progress.
* Safe fallback from unavailable browser storage favors application continuity;
  callers must use readiness and saved-progress state instead of assuming data
  was persisted.

# Consequences

Public examples must stay generic and visibly support resume/start-again flows.
New persistence behavior requires tests, README updates, synchronization of
[Public API and contracts](../public-api.md), and a Changeset when released
behavior or types change.

# Supersession

Do not rewrite this record if the strategy changes. Add a new decision with its
own sources, link it here as the superseding decision, and mark this record
deprecated only when the replacement is implemented.

[^readme]: Repository README and security guidance.
[^persistence]: Field persistence implementation.
[^storage]: Storage adapter implementation.
[^tests]: Persistence tests.
