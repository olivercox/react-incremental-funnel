# react-incremental-funnel

TypeScript-first React package for building incremental funnel flows with a small runtime API and exported types.

## Installation

```bash
npm install react-incremental-funnel
```

## Vite example applications

This repository includes runnable Vite + React examples:

```text
examples/
  basic-vite/
  api-backed-vite/
```

These examples use generic mock data only (no Good Life Sorted endpoints, schemas, field names, credentials, or business logic).

### Run `basic-vite`

```bash
cd examples/basic-vite
npm install
npm run dev
```

`basic-vite` demonstrates:

- `useIncrementalFunnel` initialization
- step navigation and step completion/incompletion
- field persistence policies (`local`, `session`, `memory`)
- per-field TTL expiry
- resume/start-again UX
- submit lifecycle with a mock client-side submit handler

### Run `api-backed-vite`

In terminal 1:

```bash
cd examples/api-backed-vite
npm install
npm run dev:api
```

In terminal 2:

```bash
cd examples/api-backed-vite
npm run dev
```

`api-backed-vite` demonstrates:

- remote session creation (`createSession`)
- debounced draft updates (`debounceMs` + `updateRemote`)
- remote submit behavior (`submitRemote`)
- sync status and error handling (`remoteSyncStatus`, retry)
- reset/start-again behavior
- local state clearing after submit
- `remoteOnly` fields sent to the mock API but not persisted in browser storage

### Mock API behavior (`api-backed-vite/mock-server.js`)

The mock API stores drafts in memory for demo purposes and exposes generic endpoints:

- `POST /api/drafts` create a draft session
- `PATCH /api/drafts/:draftId` update a draft
- `POST /api/drafts/:draftId/submit` submit a draft

It returns non-sensitive draft metadata only and blocks updates/submissions after a draft is submitted.

### Shared/public device behavior

Both examples include a visible resume/start-again prompt:

- “We found a saved request on this device.”
- “Continue saved request or start again.”

The prompt does not display sensitive values.

Use `startAgain()` to clear persisted local state and reset funnel values. In API-backed flows, this also starts a new mock draft session.

### Example builds in CI

CI builds both example apps (`npm run build:examples`) so changes that break example integration fail quickly.

## Basic hook usage

```tsx
import { useIncrementalFunnel } from 'react-incremental-funnel';

type FunnelValues = {
  fullName?: string;
  email?: string;
  consent?: boolean;
};

export function BasicFunnel() {
  const funnel = useIncrementalFunnel<FunnelValues>({
    storageKey: 'example-funnel',
    steps: ['start', 'details', 'review']
  });

  return (
    <button
      onClick={() => {
        funnel.updateValues({ consent: true });
        funnel.nextStep();
      }}
    >
      Continue
    </button>
  );
}
```

## Example integration (mock endpoints only)

```tsx
import { useIncrementalFunnel } from 'react-incremental-funnel';

type FunnelValues = {
  fullName?: string;
  email?: string;
  consent?: boolean;
};

const mockApi = {
  async createSession() {
    return { sessionId: 'mock-session-id' };
  },
  async saveProgress(values: Partial<FunnelValues>) {
    await fetch('/mock/funnel/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values)
    });
  },
  async submit(values: Partial<FunnelValues>) {
    await fetch('/mock/funnel/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values)
    });
  }
};

export function FunnelWithMockApi() {
  const funnel = useIncrementalFunnel<
    FunnelValues,
    'start' | 'details' | 'review'
  >({
    storageKey: 'example-funnel',
    steps: ['start', 'details', 'review'],
    createSession: () => mockApi.createSession(),
    updateRemote: values => mockApi.saveProgress(values),
    submitRemote: values => mockApi.submit(values)
  });

  return <button onClick={() => void funnel.submit()}>Submit</button>;
}
```

## Step orchestration

Use these APIs to control progress through your funnel:

- `nextStep()` / `previousStep()` to move through `steps`
- `goToStep(stepId)` to jump to a specific step
- `markStepComplete(stepId)` / `markStepIncomplete(stepId)` for explicit completion state
- `currentStepId`, `completedStepIds`, `canGoNext`, and `canGoBack` for UI guards
- `persistStepState: true` to persist step position across sessions
- `includeStepStateInRemoteUpdate: true` to include step state in remote updates

## Field-level persistence policies

Use `fieldPolicies` to control where each field can persist:

- `local`: persist in local storage
- `session`: persist in session storage
- `memory`: persist in memory only
- `remoteOnly`: never persist locally, include only in remote updates/submission

`ttlMs` can be added per field to expire persisted values automatically.

```ts
fieldPolicies: {
  fullName: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  email: { persist: 'session', ttlMs: 2 * 60 * 60 * 1000 },
  consent: { persist: 'memory' },
  temporaryInput: { persist: 'memory' },
  sensitiveDraft: { persist: 'remoteOnly' }
}
```

## Storage adapters

Built-in adapters:

- `createLocalStorageAdapter()`
- `createSessionStorageAdapter()`
- `createMemoryStorageAdapter()`

Override any adapter with `storageAdapters`:

```ts
storageAdapters: {
  memory: createMemoryStorageAdapter();
}
```

## Remote update callbacks

Use `updateRemote(values)` (or `remoteUpdate({ values, stepState })`) to receive debounced in-progress updates.

Pair with lifecycle callbacks:

- `onRemoteUpdateSucceeded`
- `onRemoteUpdateFailed`

Inspect `remoteSyncStatus` and `lastSuccessfulRemoteSyncAt` to drive UI status.

## Session creation callbacks

Use `createSession()` to create a server-side draft/session at funnel start.

Inspect session state with:

- `sessionCreationStatus`
- `sessionCreationError`
- `sessionMetadata`

## Submit callbacks

Use `submitRemote(values)` for final submission and call `submit()` from the hook result.

Inspect submit state with:

- `submitStatus`
- `submitError`

Lifecycle callbacks for submission:

- `onSubmitStarted`
- `onSubmitSucceeded`
- `onSubmitFailed`

## Resume / start-again handling

Use saved progress flags:

- `savedProgressExists`
- `savedProgressIsStale`
- `savedProgressMetadata`

Actions:

- `continueSavedProgress()`
- `startAgain()`
- `clearSavedProgress()` (removes persisted progress only)

## Validation callback usage

Provide per-step and full-submit validation callbacks:

```ts
validateStep: async (stepId, values) => {
  if (stepId === 'details' && !values.email) {
    return {
      stepErrors: ['Please complete this step'],
      fieldErrors: { email: 'Email is required' }
    };
  }
},
validateAll: async values => {
  if (!values.consent) {
    return {
      stepErrors: ['Please accept before submitting'],
      fieldErrors: { consent: 'Consent is required' }
    };
  }
}
```

Use `canContinueCurrentStep`, `currentStepValidationErrors`, and `fieldValidationErrors` in UI.

## Lifecycle event callbacks

You can subscribe to lifecycle events:

- `onFunnelStarted`
- `onStepStarted`
- `onStepCompleted`
- `onValuesChanged`
- `onRemoteUpdateSucceeded`
- `onRemoteUpdateFailed`
- `onSubmitStarted`
- `onSubmitSucceeded`
- `onSubmitFailed`
- `onFunnelReset`

Set `includeValuesInLifecycleCallbacks: true` only when you explicitly need values payloads.

## Shared/public device guidance

For shared/public devices:

- Prefer `session` or `memory` persistence over `local`
- Use short `ttlMs` values for persisted fields
- Mark sensitive fields as `memory` or `remoteOnly`
- Offer a visible “Start again” action that calls `startAgain()`
- Offer a visible “Clear saved progress” action that calls `clearSavedProgress()`

## Security and privacy guidance

- Do not store secrets in funnel values.
- Treat local/session storage as user-accessible and non-secret storage.
- Persist only what is required; default sensitive fields to `memory` or `remoteOnly`.
- Redact or minimize telemetry in lifecycle callbacks unless required.
- Validate and sanitize values server-side before trusting updates/submissions.

## Development

```bash
npm install
npm run lint
npm run test
npm run build
npm run build:examples
```

## Release workflow

This package uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs.

### Add a changeset in your PR

If your PR changes package behavior, add a changeset:

```bash
npm run changeset
```

Choose the bump type:

- `patch`: bug fixes and other backwards-compatible fixes.
- `minor`: backwards-compatible features.
- `major`: breaking changes.

### How releases happen

- Changes merge through pull requests into `main`.
- On pushes to `main`, the Release workflow runs `changesets/action`.
- If unreleased changesets exist, it creates or updates a release PR with:
  - `package.json` version updates
  - `CHANGELOG.md` updates
  - consumed changesets removed
- When that release PR is merged, the same workflow publishes to npm with:
  - `npm publish --provenance --access public`
  - GitHub OIDC Trusted Publishing (`id-token: write`) via GitHub Actions

Do not normally run `npm publish` from a developer machine.

### Stable and prerelease channels

- Stable releases are published from `main` to the default `latest` tag (for example `1.1.0`).
- If prereleases are needed, use Changesets prerelease mode and publish with a prerelease tag such as `next` (for example `1.2.0-next.0`).

### Local package verification

Before release, verify package contents locally:

```bash
npm pack --dry-run
```

## Public API

- `createFunnel`
- `advanceFunnel`
- `useIncrementalFunnel`
- `createLocalStorageAdapter`, `createSessionStorageAdapter`, `createMemoryStorageAdapter`
- `pickPersistableValues`, `removeBlockedFields`, `redactValues`
- `FunnelStep`, `FunnelState`, `UseIncrementalFunnelOptions`, `UseIncrementalFunnelResult`, `FunnelStepId`
