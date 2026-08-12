# react-incremental-funnel

TypeScript-first React package for building incremental funnel flows with a small public runtime API and exported types.

## Installation

```bash
npm install react-incremental-funnel
```

## Usage

```ts
import {
  createFunnel,
  advanceFunnel,
  createMemoryStorageAdapter,
  type FunnelStep
} from 'react-incremental-funnel';

const steps: FunnelStep<'welcome' | 'details' | 'confirm'>[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'details', label: 'Details' },
  { id: 'confirm', label: 'Confirm' }
];

const initial = createFunnel(steps);
const next = advanceFunnel(initial, 'details');

// in React components
import { useIncrementalFunnel } from 'react-incremental-funnel';

type CustomerFunnelValues = {
  funnelVariant?: string;
  services?: string[];
  customer?: {
    email?: string;
    address?: string;
  };
  dementiaQuestionnaire?: string;
};

const funnel = useIncrementalFunnel<CustomerFunnelValues>({
  storageKey: 'customer-funnel',
  validateStep: async (stepId, values) => {
    return validateCustomerStep(stepId, values);
  },
  validateAll: async values => {
    return validateCustomerSubmission(values);
  },
  createSession: async () => {
    return api.createDraftSession();
  },
  submitRemote: async values => {
    await api.submitFunnel(values);
  },
  storageAdapters: {
    // Optional: swap any built-in adapter with a custom one
    memory: createMemoryStorageAdapter()
  },
  steps: ['welcome', 'details', 'confirm'],
  fieldPolicies: {
    funnelVariant: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
    services: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
    'customer.email': { persist: 'session', ttlMs: 2 * 60 * 60 * 1000 },
    'customer.address': { persist: 'never' },
    dementiaQuestionnaire: { persist: 'remoteOnly' }
  },
  persistStepState: true,
  includeStepStateInRemoteUpdate: true
});

funnel.updateValues({ email: 'hello@example.com' });
funnel.nextStep();
funnel.markStepComplete('welcome');
funnel.markSubmitted();
await funnel.submit();
funnel.clearValues();

if (funnel.savedProgressExists) {
  if (funnel.savedProgressIsStale) {
    funnel.startAgain();
  } else {
    funnel.continueSavedProgress();
  }
}

if (funnel.submitStatus === 'failed') {
  console.error(funnel.submitError);
}

if (!funnel.canContinueCurrentStep) {
  console.error(funnel.currentStepValidationErrors, funnel.fieldValidationErrors);
}

// clears persisted progress only
funnel.clearSavedProgress();
```

### Lifecycle callbacks

`useIncrementalFunnel` exposes optional lifecycle callbacks for funnel analytics and attribution.
Callbacks receive safe metadata by default and only include full funnel values when
`includeValuesInLifecycleCallbacks` is enabled.

```ts
useIncrementalFunnel({
  storageKey: 'customer-funnel',
  onStepCompleted: ({ step }) => {
    analytics.track('Funnel Step Completed', { step });
  },
  includeValuesInLifecycleCallbacks: true
});
```

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
- `FunnelStep`, `FunnelState`, `UseIncrementalFunnelOptions`, `UseIncrementalFunnelResult`, `FunnelStepId`
