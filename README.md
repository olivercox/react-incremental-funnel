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
  email?: string;
  firstName?: string;
};

const funnel = useIncrementalFunnel<CustomerFunnelValues>({
  storageKey: 'customer-funnel',
  steps: ['welcome', 'details', 'confirm'],
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
- `FunnelStep`, `FunnelState`, `UseIncrementalFunnelOptions`, `UseIncrementalFunnelResult`, `FunnelStepId`
