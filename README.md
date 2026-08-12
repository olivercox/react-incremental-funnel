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
  createSession: async () => {
    return api.createDraftSession();
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
funnel.clearValues();
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
