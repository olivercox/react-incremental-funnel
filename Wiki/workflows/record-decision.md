---
type: Maintenance Workflow
title: Record a Decision
description: Preserve the context, outcome, tradeoffs, and provenance of meaningful project decisions.
tags: [workflow, decisions]
status: stable
generated: { by: openai/codex, at: 2026-08-17T08:33:37Z }
sources:
  - resource: ../AGENTS.md
    title: Wiki agent rules
---

# Trigger

Use when a technical or product choice changes a durable contract, architecture,
privacy boundary, supported workflow, or future implementation constraints.

# Inspect

Read the affected implementation, tests, documentation, previous decisions,
and the discussion or requirement that establishes the choice. Verify that the
decision is implemented or label it clearly as draft.

# Update

Create a concise `Architecture Decision` under `decisions/` with context,
options considered when known, chosen path, tradeoffs, consequences, source
paths, and supersession guidance. Link it from `decisions/index.md`, affected
concepts, and the root log.

# Do Not Update

Do not invent rejected alternatives or rationale. Do not overwrite historical
context to match a later choice; create a superseding record and link both.
Skip routine implementation details without lasting consequences.

# Verify

Check that the recorded outcome matches source and current implementation, then
run `okn validate "Wiki"` and fix errors and avoidable warnings.
