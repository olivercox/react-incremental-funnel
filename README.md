# react-incremental-funnel

TypeScript-first React package for building incremental funnel flows with a small runtime API and exported types.

## Installation

```bash
npm install react-incremental-funnel
```

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
```

## Public API

- `createFunnel`
- `advanceFunnel`
- `useIncrementalFunnel`
- `createLocalStorageAdapter`, `createSessionStorageAdapter`, `createMemoryStorageAdapter`
- `pickPersistableValues`, `removeBlockedFields`, `redactValues`
- `FunnelStep`, `FunnelState`, `UseIncrementalFunnelOptions`, `UseIncrementalFunnelResult`, `FunnelStepId`
