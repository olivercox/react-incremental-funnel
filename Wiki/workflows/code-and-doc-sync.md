---
type: Maintenance Workflow
title: Code and Documentation Sync
description: Keep project, documentation, schemas, examples, and agent guidance aligned with implementation changes.
tags: [workflow, project, docs, schemas, agents]
status: stable
generated: { by: openai/codex, at: 2026-08-17T08:33:37Z }
sources:
  - resource: ../../.github/copilot-instructions.md
    title: Repository operating instructions
  - resource: ../../.github/workflows/ci.yml
    title: Continuous integration workflow
---

# Trigger

Use after a change to shipped behavior, exported APIs or types, persistence,
validation, callbacks, commands, configuration, README guidance, examples, or a
repeated agent workflow.

# Inspect

1. Read the changed source and its tests; treat them as truth.
2. Check `README.md`, affected examples, `package.json`, and CI or release files
   when relevant.
3. Read the current [project overview](../project-overview.md),
   [public API map](../public-api.md), and any affected decision.

# Update

* Update only concepts whose durable claims changed.
* Preserve or add `sources` entries pointing to authoritative repository files.
* Update indexes for added, moved, or removed pages and append a concise entry
  to `log.md`.
* Keep agent entrypoints short; link to wiki concepts rather than copying them.
* If behavior or the public surface changed, continue with the
  [release-impacting workflow](release-change.md).

# Do Not Update

Do not record transient plans, debug logs, speculative features, generated
artifacts, formatting-only edits, or duplicated source declarations. Do not add
private Good Life Sorted details, credentials, secrets, or personal data.

# Verify

Confirm every changed claim against source, run code checks appropriate to the
implementation change, then run `okn validate "Wiki"`. Fix errors and avoidable
warnings before finishing.
