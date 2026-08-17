---
type: Agent Rules
title: react-incremental-funnel Knowledge Base Agent Rules
description: Repository-specific rules for reading and maintaining the react-incremental-funnel wiki.
tags: [openknowledge, agents]
generated: { by: openai/codex, at: 2026-08-17T08:33:37Z }
sources:
  - resource: ../README.md
    title: Repository README
  - resource: ../.github/copilot-instructions.md
    title: Repository operating instructions
---

# Agent Rules

This local wiki is durable project memory for the `react-incremental-funnel`
TypeScript React library. Repository files remain authoritative; wiki pages
synthesize them and preserve source paths.

## Before relevant work

* Read [index.md](index.md), then follow only the links relevant to the task.
* For API, persistence, security, examples, build, or release work, inspect the
  linked repository source before relying on a wiki summary.
* If the wiki is stale, incomplete, or conflicts with source, say so and use
  the repository as truth.

## When to update the wiki

* `project`: update durable architecture, commands, ownership boundaries, or
  project conventions after they change.
* `docs`: keep the matching wiki concept synchronized when shipped behavior,
  public documentation, configuration, or examples change.
* `schemas`: update [Public API and contracts](public-api.md) when exported
  types, functions, callbacks, state, or persistence contracts change. Prefer
  pointers to source over copied declarations.
* `decisions`: record meaningful technical or product choices with context,
  options, outcome, tradeoffs, and affected sources. Append a superseding
  decision instead of rewriting history.
* `changelog`: capture user-visible behavior, API, packaging, validation, or
  release-process changes and link the changeset or changelog source. Skip
  formatting-only or test-only work with no user-visible effect.
* `agents`: keep entrypoint guidance brief and link to concepts or workflows
  instead of duplicating their content.

Follow the appropriate page in [workflows/](workflows/) for repeatable updates.
After adding, moving, or removing pages, update the nearest `index.md` and the
root [log](log.md).

## When not to update

Do not use the wiki for transient plans, raw debugging output, speculative
features, generated build artifacts, or facts already clear from source and
unlikely to help future work. Do not duplicate complete source files. Keep any
future raw imports separate from synthesized concepts.

## Boundaries

* Keep content generic to this public library. Never add Good Life Sorted
  endpoints, schemas, field names, credentials, business logic, or other
  private implementation details.
* Do not store secrets or personal data.
* This is a local knowledge base. Do not publish, export, connect, or expose it
  outside the workspace unless the user explicitly authorizes that action.
* Preserve provenance for implementation-derived claims using `sources` and
  direct repository links.

## Validation and delegation

Follow the pinned [OKF 0.2 specification](SPEC.md). Every non-reserved Markdown
document needs parseable frontmatter and a non-empty `type`. After every
meaningful wiki edit, run `okn validate "Wiki"` from the repository root and
fix errors and avoidable warnings.

When the runtime supports subagents, a focused lower-reasoning subagent may
handle a bounded maintenance task such as checking one API page against one
source file. The primary agent remains responsible for source boundaries,
provenance, integration, and final validation.
