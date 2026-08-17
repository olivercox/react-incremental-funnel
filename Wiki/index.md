---
okf_version: "0.2"
---

# react-incremental-funnel Knowledge Base

Local, source-grounded project memory for maintainers and coding agents working
on the `react-incremental-funnel` TypeScript React library. Use it to understand
the project quickly, keep public API knowledge synchronized, preserve important
decisions, and follow the repository's documentation and release loop.

## Start Here

* [Project overview](project-overview.md) - purpose, architecture, examples,
  validation commands, and release path.
* [Public API and contracts](public-api.md) - source-linked map of exported
  funnel, persistence, validation, lifecycle, and storage interfaces.
* [Agent rules](AGENTS.md) - when agents must read or update this wiki and the
  privacy and publication boundaries they must preserve.

## Decisions

* [Decisions](decisions/) - durable technical choices and their tradeoffs.
* [Persistence and privacy boundaries](decisions/persistence-and-privacy.md) -
  why storage is field-scoped and sensitive values require stricter modes.

## Maintenance Workflows

* [Code and documentation sync](workflows/code-and-doc-sync.md) - maintain
  project, docs, schemas, and agent entrypoints after implementation changes.
* [Record a decision](workflows/record-decision.md) - preserve meaningful
  decisions without rewriting history.
* [Release-impacting change](workflows/release-change.md) - keep changesets,
  changelog memory, validation, and package verification aligned.

## Authoritative Source Material

* `README.md` - shipped behavior, examples, security guidance, and public API
  summary.
* `src/index.ts` - exported TypeScript API and runtime.
* `src/persistence.ts` and `src/storage.ts` - field policy and storage
  contracts.
* `src/**/*.test.ts` - executable behavioral evidence.
* `package.json` and `.github/workflows/ci.yml` - supported commands and
  validation sequence.
* `CHANGELOG.md` and `.changeset/` - release memory.

## Maintenance Rules and Boundaries

Enabled rules: `project`, `docs`, `decisions`, `changelog`, `schemas`, and
`agents`. Keep the wiki small, cite repository sources, update the
[log](log.md), and validate after meaningful edits. Content must remain generic
to the public library: do not add private Good Life Sorted details, credentials,
personal data, or secrets. Do not publish or expose the wiki without explicit
user authorization.

## Bundle Reference

* [Open Knowledge Format specification](SPEC.md) - pinned OKF 0.2 rules.
* [Update log](log.md) - chronological wiki changes.
