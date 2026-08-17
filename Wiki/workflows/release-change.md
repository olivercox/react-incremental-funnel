---
type: Maintenance Workflow
title: Release-Impacting Change
description: Keep Changesets, changelog knowledge, documentation, validation, and package verification aligned.
tags: [workflow, changelog, release]
status: stable
generated: { by: openai/codex, at: 2026-08-17T08:33:37Z }
sources:
  - id: instructions
    resource: ../../.github/copilot-instructions.md
    title: Repository operating instructions
  - id: package
    resource: ../../package.json
    title: npm package manifest
  - id: ci
    resource: ../../.github/workflows/ci.yml
    title: Continuous integration workflow
  - id: release
    resource: ../../.github/workflows/release.yml
    title: Release pull request workflow
  - id: changelog
    resource: ../../CHANGELOG.md
    title: Package changelog
---

# Trigger

Use when a PR changes released behavior, APIs, types, output, packaging,
validation behavior, or the release process. Formatting-only, internal-only,
and test-only work with no user-visible effect normally does not trigger this
workflow.[^instructions]

# Inspect

Review the implementation and tests, public README/API docs, existing
`.changeset/*.md` files, `CHANGELOG.md`, `package.json`, and relevant CI or
release workflows. Determine the semver impact from the actual public change.

# Update

* Add a Changeset through the repository's Changesets workflow with the correct
  package and semver bump.
* Update README, examples, [Public API and contracts](../public-api.md), and any
  affected decision in the same task.
* Record durable user-facing change knowledge in the wiki log with source
  anchors; avoid copying the entire package changelog.

# Do Not Update

Do not manually publish from a developer machine, invent release status, expose
credentials, or edit historical decision rationale. Do not add a Changeset for
wiki-only maintenance.

# Verify

Run repository checks appropriate to the change. For full PR parity run the CI
sequence in [Project overview](../project-overview.md), including
`npm pack --dry-run`. Then run `okn validate "Wiki"` and fix errors and avoidable
warnings.

[^instructions]: Repository operating instructions.
[^package]: npm package manifest.
[^ci]: Continuous integration workflow.
[^release]: Release pull request workflow.
[^changelog]: Package changelog.
